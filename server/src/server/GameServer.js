const http = require('http');
const WebSocket = require('ws');
const GameEngine = require('../core/engine/GameEngine');
const {ActionType} = require('../core/engine/actions');
const GameLogger = require('./GameLogger');

class GameServer {
  constructor({port = 8080, enableLogging = true, autoJoinReady = true, pauseAtRoundEnd = false} = {}) {
    this.port = port;
    this.engine = new GameEngine({});
    this.players = new Map(); // ws -> { playerId, name }
    this.enableLogging = enableLogging;
    this.logger = enableLogging ? new GameLogger(this.engine.gameId) : null;
    this.autoJoinReady = autoJoinReady;
    // When true, the server waits for a {kind:'next_round'} message from any
    // player before dealing the next round (so clients can show scores).
    this.pauseAtRoundEnd = pauseAtRoundEnd;
    this.roundPending = false;
    this.wss = null;
  }

  // Send events + each client's own view snapshot to every open connection.
  broadcast(events) {
    if (!this.wss) return;
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          const pId = this.players.get(client)?.playerId;
          client.send(
            JSON.stringify({
              kind: 'events',
              events,
              snapshot: {view: this.engine.getViewFor(pId)},
            })
          );
        } catch (error) {
          console.warn('Failed to send to client:', error.message);
          this.players.delete(client);
        }
      }
    });
  }

  // Deal the next round and notify everyone (used by the auto path and by
  // the explicit {kind:'next_round'} request when pauseAtRoundEnd is on).
  startNextRoundAndBroadcast() {
    this.roundPending = false;
    const nextRoundEvents = this.engine.startNextRound();
    if (this.logger) {
      this.logger.logEvent('next_round', {round: this.engine.state.currentRound});
      this.logger.logGameState('round_started', this.engine.state);
    }
    this.broadcast(nextRoundEvents);
  }

  start() {
    return new Promise((resolve) => {
      const server = http.createServer();
      const wss = new WebSocket.Server({server});
      this.wss = wss;
      this.httpServer = server;

      wss.on('connection', (ws) => {
        const playerId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        this.players.set(ws, {playerId});

        ws.send(JSON.stringify({kind: 'welcome', gameId: this.engine.gameId, playerId}));

        ws.on('message', (raw) => {
          try {
            const msg = JSON.parse(raw);
            if (msg.kind === 'next_round') {
              // Any player may advance past the score screen.
              if (this.roundPending) {
                this.startNextRoundAndBroadcast();
              }
              return;
            }
            if (msg.kind === 'command') {
              // Identity comes from the connection, never from the message —
              // a client must not be able to act as another player.
              const action = {...msg.command, playerId};
              const evts = this.engine.apply(action);

              // Log the action and its results
              if (this.logger) {
                this.logger.logAction(action, evts, this.engine.state);

                // Log game state at key moments
                if (evts.some((e) => e.type === 'TURN_STARTED')) {
                  this.logger.logGameState('turn_started', this.engine.state);
                }

                if (evts.some((e) => e.type === 'MELD_LAID')) {
                  this.logger.logGameState('player_went_down', this.engine.state);
                }

                // Log game end when round ends
                if (evts.some((e) => e.type === 'ROUND_ENDED')) {
                  const winnerEvent = evts.find((e) => e.type === 'ROUND_ENDED');
                  this.logger.logGameState('round_ended', this.engine.state);
                  this.logger.logGameEnd(winnerEvent?.payload);
                }
              }

              // Broadcast events and current per-player views
              this.broadcast(evts);

              // If round ended, either end game on quit, pause for the score
              // screen (pauseAtRoundEnd), or auto-start the next round.
              if (evts.some((e) => e.type === 'ROUND_ENDED')) {
                const roundEnded = evts.find((e) => e.type === 'ROUND_ENDED');
                const gameComplete = roundEnded?.payload?.gameComplete;
                const reason = roundEnded?.payload?.reason;

                if (reason === 'opponent_quit') {
                  // End the game session when someone quits
                  this.broadcast([{type: 'GAME_ENDED', payload: {reason: 'opponent_quit'}}]);
                } else if (!gameComplete) {
                  if (this.pauseAtRoundEnd) {
                    this.roundPending = true;
                  } else {
                    try {
                      this.startNextRoundAndBroadcast();
                    } catch (error) {
                      console.error('Failed to start next round:', error);
                      this.broadcast([
                        {type: 'GAME_ENDED', payload: {reason: 'server_error', error: error.message}},
                      ]);
                    }
                  }
                }
              }
            }
          } catch (e) {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({kind: 'error', message: e.message}));
              } catch (sendError) {
                console.warn('Failed to send error to client:', sendError.message);
                this.players.delete(ws);
              }
            }
          }
        });

        ws.on('close', () => this.players.delete(ws));

        // Auto-join and optionally auto-ready for quick start
        const joinAction = {
          type: ActionType.JOIN,
          playerId,
          payload: {name: `Player ${this.players.size}`},
        };
        const joinEvts = this.engine.apply(joinAction);
        if (this.logger) {
          this.logger.logAction(joinAction, joinEvts, this.engine.state);
        }

        let evts = joinEvts;
        if (this.autoJoinReady) {
          const readyAction = {type: ActionType.READY, playerId};
          const readyEvts = this.engine.apply(readyAction);
          if (this.logger) {
            this.logger.logAction(readyAction, readyEvts, this.engine.state);
            if (readyEvts.some((e) => e.type === 'GAME_STARTED')) {
              this.logger.logEvent('players_ready', {playerCount: this.players.size});
              this.logger.logGameState('game_started', this.engine.state);
            }
          }
          evts = [...evts, ...readyEvts];
        }

        const initialPayload = {
          kind: 'events',
          events: evts,
          snapshot: {view: this.engine.getViewFor(playerId)},
        };
        ws.send(JSON.stringify(initialPayload));

        // Also broadcast to all clients so existing players see the start of the game
        if (evts && evts.length > 0) {
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              try {
                const pId = this.players.get(client)?.playerId;
                client.send(
                  JSON.stringify({
                    kind: 'events',
                    events: evts,
                    snapshot: {view: this.engine.getViewFor(pId)},
                  })
                );
              } catch (error) {
                console.warn('Failed to broadcast to existing client:', error.message);
                this.players.delete(client);
              }
            }
          });
        }
      });

      server.listen(this.port, () => {
        console.log(`GameServer listening on ws://localhost:${this.port}`);
        resolve();
      });
    });
  }

  // Gracefully stop the server (for tests)
  async stop() {
    // Close all websocket clients
    if (this.wss) {
      this.wss.clients.forEach((client) => {
        try {
          client.terminate();
        } catch {}
      });
      await new Promise((res) => this.wss.close(() => res()));
    }

    // Close HTTP server
    if (this.httpServer) {
      await new Promise((res) => this.httpServer.close(() => res()));
    }

    // Clear state
    this.players.clear();
    this.wss = null;
    this.httpServer = null;
  }

  // Test hook: deterministically set the deck order
  setDeck(cards) {
    if (this.engine?.state?.deck?.setCards) {
      this.engine.state.deck.setCards(cards);
    } else {
      throw new Error('Deck.setCards not available');
    }
  }

  // Test hook: start the game by readying all joined players
  startGame() {
    // Apply READY for all known players
    const allPlayers = Array.from(this.players.values());
    // Collect events from all READY actions so we can broadcast them to clients
    const aggregatedEvents = [];
    allPlayers.forEach((p) => {
      const readyAction = {type: ActionType.READY, playerId: p.playerId};
      const evts = this.engine.apply(readyAction);
      if (Array.isArray(evts) && evts.length > 0) aggregatedEvents.push(...evts);
      if (this.logger) this.logger.logAction(readyAction, evts, this.engine.state);
    });

    // Broadcast updated views and any events that resulted from READY
    if (this.wss) {
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          const pId = this.players.get(client)?.playerId;
          try {
            client.send(
              JSON.stringify({
                kind: 'events',
                events: aggregatedEvents,
                snapshot: {view: this.engine.getViewFor(pId)},
              })
            );
          } catch (error) {
            console.warn('Failed to send ready events to client:', error.message);
            this.players.delete(client);
          }
        }
      });
    }
  }

  /**
   * Properly close the server and ensure logs are flushed
   */
  async close() {
    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }

    // Close HTTP server
    if (this.httpServer) {
      this.httpServer.close();
    }

    // Close logger to flush files
    if (this.logger) {
      await this.logger.close();
    }
  }
}

module.exports = GameServer;
