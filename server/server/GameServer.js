const http = require('http');
const WebSocket = require('ws');
const GameEngine = require('../core/engine/GameEngine');
const { ActionType } = require('../core/engine/actions');
const GameLogger = require('./GameLogger');

class GameServer {
  constructor({ port = 8080, enableLogging = true } = {}) {
    this.port = port;
    this.engine = new GameEngine({});
    this.players = new Map(); // ws -> { playerId, name }
    this.enableLogging = enableLogging;
    this.logger = enableLogging ? new GameLogger(this.engine.gameId) : null;
  }

  start() {
    const server = http.createServer();
    const wss = new WebSocket.Server({ server });

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
          }
        } catch (e) {
          ws.send(JSON.stringify({ kind: 'error', message: e.message }));
        }
      });

      ws.on('close', () => this.players.delete(ws));

      // Auto-join and ready for quick start
      const joinAction = { type: ActionType.JOIN, playerId, payload: { name: `Player ${this.players.size}` } };
      this.engine.apply(joinAction);
      if (this.logger) {
        this.logger.logAction(joinAction, [], this.engine.state);
      }
      
      const readyAction = { type: ActionType.READY, playerId };
      const evts = this.engine.apply(readyAction);
      if (this.logger) {
        this.logger.logAction(readyAction, evts, this.engine.state);
        
        // Log when game starts
        if (evts.some(e => e.type === 'GAME_STARTED')) {
          this.logger.logEvent('players_ready', { playerCount: this.players.size });
          this.logger.logGameState('game_started', this.engine.state);
        }
      }
      
      ws.send(JSON.stringify({ kind: 'events', events: evts, snapshot: { view: this.engine.getViewFor(playerId) } }));
    });

    server.listen(this.port, () => {
      console.log(`GameServer listening on ws://localhost:${this.port}`);
    });
  }
}

module.exports = GameServer;
