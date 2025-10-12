const http = require('http');
const WebSocket = require('ws');
const GameEngine = require('../core/engine/GameEngine');
const { ActionType } = require('../core/engine/actions');
const GameLogger = require('./GameLogger');

class GameServer {
  constructor({ port = 8080, enableLogging = true, autoJoinReady = true } = {}) {
    this.port = port;
    this.engine = new GameEngine({});
    this.players = new Map(); // ws -> { playerId, name }
    this.enableLogging = enableLogging;
    this.logger = enableLogging ? new GameLogger(this.engine.gameId) : null;
    this.autoJoinReady = autoJoinReady;
    this.wss = null;
  }

  start() {
    return new Promise((resolve) => {
      const server = http.createServer();
      const wss = new WebSocket.Server({ server });
      this.wss = wss;
      this.httpServer = server;

    wss.on('connection', (ws) => {
      const playerId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      this.players.set(ws, { playerId });

      ws.send(JSON.stringify({ kind: 'welcome', gameId: this.engine.gameId, playerId }));

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw);
          if (msg.kind === 'command') {
            const action = { ...msg.command, playerId: msg.command.playerId || playerId };
            const evts = this.engine.apply(action);
            
            // Log the action and its results
            if (this.logger) {
              this.logger.logAction(action, evts, this.engine.state);
              
              // Log game state at key moments
              if (evts.some(e => e.type === 'TURN_STARTED')) {
                this.logger.logGameState('turn_started', this.engine.state);
              }
              
              if (evts.some(e => e.type === 'MELD_LAID')) {
                this.logger.logGameState('player_went_down', this.engine.state);
              }
              
              // Log game end when round ends
              if (evts.some(e => e.type === 'ROUND_ENDED')) {
                const winnerEvent = evts.find(e => e.type === 'ROUND_ENDED');
                this.logger.logGameState('round_ended', this.engine.state);
                this.logger.logGameEnd(winnerEvent?.payload);
              }
            }
            
            // Broadcast events and current per-player views
            wss.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                const pId = this.players.get(client)?.playerId;
                client.send(JSON.stringify({
                  kind: 'events',
                  events: evts,
                  snapshot: { view: this.engine.getViewFor(pId) }
                }));
              }
            });

            // If round ended, either end game on quit or auto-start next round if not complete
            if (evts.some(e => e.type === 'ROUND_ENDED')) {
              const roundEnded = evts.find(e => e.type === 'ROUND_ENDED');
              const gameComplete = roundEnded?.payload?.gameComplete;
              const reason = roundEnded?.payload?.reason;

              if (reason === 'opponent_quit') {
                // End the game session when someone quits
                const gameEndedEvent = { type: 'GAME_ENDED', payload: { reason: 'opponent_quit' } };
                wss.clients.forEach(client => {
                  if (client.readyState === WebSocket.OPEN) {
                    const pId = this.players.get(client)?.playerId;
                    client.send(JSON.stringify({
                      kind: 'events',
                      events: [gameEndedEvent],
                      snapshot: { view: this.engine.getViewFor(pId) }
                    }));
                  }
                });
              } else if (!gameComplete) {
                const nextRoundEvents = this.engine.startNextRound();
                // Log and broadcast next round start
                if (this.logger) {
                  this.logger.logEvent('next_round', { round: this.engine.state.currentRound });
                  this.logger.logGameState('round_started', this.engine.state);
                }
                wss.clients.forEach(client => {
                  if (client.readyState === WebSocket.OPEN) {
                    const pId = this.players.get(client)?.playerId;
                    client.send(JSON.stringify({
                      kind: 'events',
                      events: nextRoundEvents,
                      snapshot: { view: this.engine.getViewFor(pId) }
                    }));
                  }
                });
              }
            }
          }
        } catch (e) {
          ws.send(JSON.stringify({ kind: 'error', message: e.message }));
        }
      });

      ws.on('close', () => this.players.delete(ws));

      // Auto-join and optionally auto-ready for quick start
      const joinAction = { type: ActionType.JOIN, playerId, payload: { name: `Player ${this.players.size}` } };
      const joinEvts = this.engine.apply(joinAction);
      if (this.logger) {
        this.logger.logAction(joinAction, joinEvts, this.engine.state);
      }

      let evts = joinEvts;
      if (this.autoJoinReady) {
        const readyAction = { type: ActionType.READY, playerId };
        const readyEvts = this.engine.apply(readyAction);
        if (this.logger) {
          this.logger.logAction(readyAction, readyEvts, this.engine.state);
          if (readyEvts.some(e => e.type === 'GAME_STARTED')) {
            this.logger.logEvent('players_ready', { playerCount: this.players.size });
            this.logger.logGameState('game_started', this.engine.state);
          }
        }
        evts = [...evts, ...readyEvts];
      }

      const initialPayload = { kind: 'events', events: evts, snapshot: { view: this.engine.getViewFor(playerId) } };
      ws.send(JSON.stringify(initialPayload));

      // Also broadcast to all clients so existing players see the start of the game
      if (evts && evts.length > 0) {
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            const pId = this.players.get(client)?.playerId;
            client.send(JSON.stringify({
              kind: 'events',
              events: evts,
              snapshot: { view: this.engine.getViewFor(pId) }
            }));
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
      this.wss.clients.forEach(client => {
        try { client.terminate(); } catch (_) {}
      });
      await new Promise(res => this.wss.close(() => res()));
    }

    // Close HTTP server
    if (this.httpServer) {
      await new Promise(res => this.httpServer.close(() => res()));
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
    allPlayers.forEach(p => {
      const readyAction = { type: ActionType.READY, playerId: p.playerId };
      const evts = this.engine.apply(readyAction);
      if (this.logger) this.logger.logAction(readyAction, evts, this.engine.state);
    });

    // Broadcast updated views
    if (this.wss) {
      this.wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          const pId = this.players.get(client)?.playerId;
          client.send(JSON.stringify({
            kind: 'events',
            events: [],
            snapshot: { view: this.engine.getViewFor(pId) }
          }));
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
