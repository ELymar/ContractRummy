const fs = require('fs');
const path = require('path');
const winston = require('winston');

/**
 * Structured logging for game sessions to enable test generation
 * Records all actions, events, and relevant game state changes using Winston
 */
class GameLogger {
  constructor(gameId) {
    this.gameId = gameId;
    this.startTime = Date.now();
    this.stepCounter = 0;
    this.setupLogger();
    this.playersLogged = false;
  }

  setupLogger() {
    const logDir = path.join(__dirname, '../tests/recorded-games');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, `${this.gameId}.json`);

    console.log(`📝 Creating log file: ${logFile}`);
    
    // Create Winston logger with multiple transports
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { 
        gameId: this.gameId,
        gameStartTime: this.startTime
      },
      transports: [
        // File transport - JSON format for test generation
        new winston.transports.File({ 
          filename: logFile,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        }),
        
        // Console transport - Human readable format
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, gameId, step, actionType, playerId, gameTime }) => {
              if (actionType && playerId) {
                return `${timestamp} [${level}] [Game ${gameId}] Step ${step} (${gameTime}ms): ${actionType} by ${playerId}`;
              }
              return `${timestamp} [${level}] [Game ${gameId}] ${message}`;
            })
          )
        })
      ]
    });

    // Log game start
    this.logger.info('Game started', {
      event: 'game_started',
      gameId: this.gameId,
      startTime: this.startTime
    });
  }

  /**
   * Log an action and its resulting events/state
   * @param {Object} action - The action that was executed
   * @param {Array} events - Events that resulted from the action
   * @param {Object} gameState - Current game state after action
   */
  logAction(action, events, gameState, stepNumber) {
    const now = Date.now();
    const gameTime = now - this.startTime;
    this.stepCounter++;
    
    // Resolve player index (if possible)
    let playerIndex = undefined;
    try {
      const idx = gameState?.players?.findIndex(p => p.id === action.playerId);
      playerIndex = idx >= 0 ? idx : undefined;
    } catch (_) {}

    const logData = {
      event: 'game_action',
      step: stepNumber || this.stepCounter,
      gameTime: gameTime,
      actionType: action.type,
      playerId: action.playerId,
      playerIndex,
      turnOwnerIndex: gameState?.currentPlayerIndex,
      action: this.sanitizeAction(action),
      events: events.map(e => this.sanitizeEvent(e)),
      gameSnapshot: this.captureRelevantState(gameState),
      absoluteTimestamp: now,
      isoTimestamp: new Date(now).toISOString()
    };

    // Log to both console and file via Winston
    this.logger.info('Game action executed', logData);

    // Log players mapping once when enough players have joined
    if (!this.playersLogged && gameState?.players?.length >= 2) {
      this.logPlayersJoined(gameState);
      this.playersLogged = true;
    }

    // If this action produced GAME_STARTED, also log an initial snapshot for deterministic replay
    if (events?.some(e => e.type === 'GAME_STARTED')) {
      try {
        this.logInitialSnapshot(gameState);
      } catch (_) {
        // best-effort; ignore logging failures
      }
    }
  }

  /**
   * Remove sensitive or non-deterministic data from actions
   */
  sanitizeAction(action) {
    return {
      type: action.type,
      playerId: action.playerId,
      payload: action.payload || {}
    };
  }

  /**
   * Remove non-deterministic data from events
   */
  sanitizeEvent(event) {
    const sanitized = {
      type: event.type,
      payload: event.payload || {}
    };
    
    // Remove timestamps and sequence numbers for test reproducibility
    delete sanitized.ts;
    delete sanitized.seq;
    
    return sanitized;
  }

  /**
   * Capture relevant game state for assertions
   */
  captureRelevantState(gameState) {
    return {
      currentPlayerIndex: gameState.currentPlayerIndex,
      dealerIndex: gameState.dealerIndex,
      currentRound: gameState.currentRound,
      firstTurn: gameState.firstTurn,
      deckSize: gameState.deck?.length?.() || 0,
      burnPileSize: gameState.burnPile?.cards?.length || 0,
      burnPileDead: gameState.burnPile?.dead || false,
      downPilesCount: gameState.downPiles?.length || 0,
      downPiles: (gameState.downPiles || []).map(p => ({
        type: p.type,
        owner: p.owner || p.getOwner?.(),
        cards: (p.cards || []).map(c => c.toString?.() || String(c))
      })),
      players: gameState.players?.map(p => ({
        id: p.id,
        name: p.name,
        handSize: p.hand?.cards?.length || 0,
        isDown: p.isDown || false,
        tookCard: p.tookCard || false,
        discarded: p.discarded || false,
        isOut: p.isOut || false
      })) || []
    };
  }

  /**
   * Log game completion
   */
  logGameEnd(winnerInfo = null) {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    this.logger.info('Game ended', {
      event: 'game_ended',
      endTime: endTime,
      duration: duration,
      winner: winnerInfo,
      isoEndTime: new Date(endTime).toISOString()
    });
    
    // Close the logger to ensure all logs are flushed
    this.logger.end();
  }

  /**
   * Log general game events (not actions)
   */
  logEvent(eventType, data = {}) {
    this.logger.info(`Game event: ${eventType}`, {
      event: 'game_event',
      eventType: eventType,
      gameTime: Date.now() - this.startTime,
      data: data
    });
  }

  /**
   * Log standalone game state snapshot
   */
  logGameState(reason, gameState) {
    const now = Date.now();
    const gameTime = now - this.startTime;
    
    const logData = {
      event: 'game_state',
      reason: reason,
      gameTime: gameTime,
      gameSnapshot: this.captureRelevantState(gameState),
      absoluteTimestamp: now,
      isoTimestamp: new Date(now).toISOString()
    };

    // Log to both console and file via Winston
    this.logger.info(`Game state: ${reason}`, logData);
  }

  /**
   * Log a full initial snapshot including full deck and starting hands
   * to enable deterministic integration test generation from logs.
   */
  logInitialSnapshot(gameState) {
    const now = Date.now();
    const gameTime = now - this.startTime;
    const serializeCard = (c) => c?.toString?.() || String(c);

    const snapshot = {
      event: 'game_initial_snapshot',
      gameTime,
      dealerIndex: gameState.dealerIndex,
      currentPlayerIndex: gameState.currentPlayerIndex,
      currentRound: gameState.currentRound,
      // Deck order from bottom [0] to top [end]; draw() pops from end
      deck: gameState.deck?.cards?.map(serializeCard) || [],
      players: gameState.players?.map(p => ({
        id: p.id,
        name: p.name,
        startingHand: p.hand?.cards?.map(serializeCard) || []
      })) || []
    };

    this.logger.info('Initial snapshot after dealing', snapshot);
  }

  /**
   * Log the order and identities of players as they have joined.
   */
  logPlayersJoined(gameState) {
    const now = Date.now();
    const gameTime = now - this.startTime;
    const players = (gameState.players || []).map((p, index) => ({ index, id: p.id, name: p.name }));
    this.logger.info('Players joined', {
      event: 'players_joined',
      gameTime,
      players
    });
  }

  /**
   * Properly close the logger and ensure all logs are flushed to disk
   */
  async close() {
    return new Promise((resolve) => {
      if (this.logger) {
        // Close all transports to ensure file writing is complete
        this.logger.end(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = GameLogger;