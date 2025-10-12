const fs = require('fs');
const path = require('path');

/**
 * Converts recorded game logs into executable test cases
 */
class GameTestConverter {
  /**
   * Convert a recorded game log to test format
   * @param {string} logFilePath - Path to the recorded game log
   * @returns {Object} Test specification object
   */
  static convertLogToTest(logFilePath) {
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    
    // Winston logs are newline-delimited JSON, parse each line
    const logLines = logContent.trim().split('\n').map(line => JSON.parse(line));
    
    // Find game_started and game_ended events for metadata
    const gameStartEvent = logLines.find(log => log.event === 'game_started');
    const gameEndEvent = logLines.find(log => log.event === 'game_ended');
    
    // Extract game actions
    const actionLogs = logLines.filter(log => log.event === 'game_action');
    
    if (!gameStartEvent || actionLogs.length === 0) {
      throw new Error('Invalid log file: missing game start or actions');
    }
    
    const gameId = gameStartEvent.gameId;
    const testName = `recorded-game-${gameId}`;
    
    // Extract seed from gameId
    const seed = this.extractSeedFromLog({ gameId });
    
    // Convert log entries to test steps
    const steps = actionLogs.map((logEntry, index) => {
      // Clone the action to avoid mutating original log data
      const action = JSON.parse(JSON.stringify(logEntry.action || {}));

      // Keep handOrder for LAY_DOWN actions as they need it for card index resolution
      // Remove handOrder for other actions to prevent server-side hand sync validation issues
      if (action.payload && action.payload.handOrder && action.type !== 'LAY_DOWN') {
        delete action.payload.handOrder;
      }

      return {
        step: index + 1,
        description: this.generateStepDescription(action),
        action: action,
        expectedEvents: logEntry.events.map(e => e.type),
        expectedState: this.extractStateAssertions(logEntry.gameSnapshot),
        // Categorize expectations as success or failure
        expectation: this.categorizeExpectation(logEntry.events),
        // Include full state for debugging if available
        fullState: logEntry.fullGameSnapshot || null
      };
    });

    return {
      name: testName,
      gameId: gameId,
      seed: seed,
      metadata: {
        originalLogFile: path.basename(logFilePath),
        recordedAt: gameStartEvent.startTime,
        duration: gameEndEvent ? gameEndEvent.duration : 'unknown',
        totalSteps: actionLogs.length
      },
      steps: steps
    };
  }

  /**
   * Generate human-readable description for test step
   */
  static generateStepDescription(action) {
    const { type, playerId, payload } = action;
    
    switch (type) {
      case 'JOIN':
        return `Player ${payload.name} joins the game`;
      case 'READY':
        return `Player ${playerId} readies up`;
      case 'DRAW':
        return `Player ${playerId} draws ${payload.nCards || 1} card(s) from deck`;
      case 'TAKE_FROM_DISCARD':
        return `Player ${playerId} takes from discard pile`;
      case 'DISCARD':
        return `Player ${playerId} discards card at index ${payload.cardIndex}`;
      case 'LAY_DOWN':
        return `Player ${playerId} lays down ${payload.melds?.length || 0} meld(s)`;
      case 'ADD_TO_MELD':
        return `Player ${playerId} adds card ${payload.cardIndex} to meld ${payload.meldIndex}`;
      case 'END_TURN':
        return `Player ${playerId} ends their turn`;
      default:
        return `Player ${playerId} performs ${type}`;
    }
  }

  /**
   * Extract state assertions for game state  
   */
  static extractStateAssertions(gameSnapshot) {
    const assertions = {};
    
    if (gameSnapshot.currentPlayerIndex !== undefined) {
      assertions.currentPlayerIndex = gameSnapshot.currentPlayerIndex;
    }
    
    if (gameSnapshot.currentRound !== undefined) {
      assertions.currentRound = gameSnapshot.currentRound;
    }
    
    if (gameSnapshot.deckSize !== undefined) {
      assertions.deckSize = gameSnapshot.deckSize;
    }
    
    if (gameSnapshot.burnPileSize !== undefined) {
      assertions.burnPileSize = gameSnapshot.burnPileSize;
    }
    
    if (gameSnapshot.downPilesCount !== undefined) {
      assertions.downPilesCount = gameSnapshot.downPilesCount;
    }
    
    // Player-specific assertions
    if (gameSnapshot.players && gameSnapshot.players.length > 0) {
      assertions.players = gameSnapshot.players.map(p => ({
        id: p.id,
        handSize: p.handSize,
        isDown: p.isDown,
        tookCard: p.tookCard,
        discarded: p.discarded,
        isOut: p.isOut
      }));
    }
    
    return assertions;
  }

  /**
   * Categorize the expectation as success or failure based on events
   */
  static categorizeExpectation(events) {
    const hasError = events.some(e => e.type === 'ERROR');
    const hasSuccess = events.some(e => 
      ['CARD_DRAWN', 'CARD_DISCARDED', 'MELD_LAID', 'MELD_EXTENDED', 'TURN_STARTED', 'ROUND_ENDED'].includes(e.type)
    );
    
    if (hasError) {
      return {
        type: 'failure',
        events: events.map(e => e.type),
        errorMessage: events.find(e => e.type === 'ERROR')?.payload?.message || 'Unknown error'
      };
    } else if (hasSuccess) {
      return {
        type: 'success',
        events: events.map(e => e.type)
      };
    } else {
      return {
        type: 'neutral',
        events: events.map(e => e.type)
      };
    }
  }

  /**
   * Extract seed for deterministic replay (if available in log)
   */
  static extractSeedFromLog(logData) {
    // For now, use gameId as seed - in future could capture actual RNG seed
    return logData.gameId.replace(/-/g, '').slice(0, 8);
  }

  /**
   * Convert recorded log file to executable test file
   * @param {string} logFilePath - Path to recorded game log
   * @param {string} testOutputPath - Where to save the test file
   */
  static generateTestFile(logFilePath, testOutputPath) {
    const testSpec = this.convertLogToTest(logFilePath);
    
    const testCode = `const GameEngine = require('../../core/engine/GameEngine');
const { ActionType } = require('../../core/engine/actions');
const StateValidator = require('../StateValidator');
const seedrandom = require('seedrandom');

// Auto-generated test from recorded game: ${testSpec.gameId}
// Original log: ${testSpec.metadata.originalLogFile}
// Recorded: ${new Date(testSpec.metadata.recordedAt).toISOString()}

describe('${testSpec.name}', () => {
  let engine;
  
  beforeEach(() => {
    // Initialize with deterministic seed for reproducibility
    engine = new GameEngine({ rng: seedrandom('${testSpec.seed}') });
  });

  test('should replay recorded game successfully', async () => {
${testSpec.steps.map(step => this.generateTestStep(step)).join('\n')}
  });
});`;

    fs.writeFileSync(testOutputPath, testCode);
    console.log(`Generated test file: ${testOutputPath}`);
    return testOutputPath;
  }

  /**
   * Generate Jest test code for a single step
   */
  static generateTestStep(step) {
    const actionStr = JSON.stringify(step.action, null, 6);
    const expectedEvents = step.expectedEvents.map(e => `'${e}'`).join(', ');
    
    let eventVerification;
    if (step.expectation.type === 'failure') {
      eventVerification = `      // Verify expected failure
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toContain('ERROR');
      const errorEvent = events.find(e => e.type === 'ERROR');
      expect(errorEvent.payload.message).toBe('${step.expectation.errorMessage}');`;
    } else {
      eventVerification = `      // Verify expected events were emitted
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toEqual(expect.arrayContaining([${expectedEvents}]));`;
    }
    
    let stateVerification = '';
    if (step.expectation.type === 'success') {
      stateVerification = `
      // Verify game state assertions
      ${this.generateStateAssertions(step.expectedState)}
      
      // Validate state consistency
      const stateValidation = StateValidator.validateState(engine.state, ${JSON.stringify(step.expectedState, null, 8)});
      if (!stateValidation.success) {
        console.warn('State validation warnings for step ${step.step}:', stateValidation.warnings);
        throw new Error('State validation failed: ' + stateValidation.errors.join(', '));
      }`;
    } else if (step.expectation.type === 'failure') {
      stateVerification = `
      // Game state should remain unchanged on failure (most validation errors)
      // Only verify basic state consistency
      const stateValidation = StateValidator.validateState(engine.state, ${JSON.stringify(step.expectedState, null, 8)});
      if (!stateValidation.success) {
        console.warn('Post-failure state validation warnings for step ${step.step}:', stateValidation.warnings);
      }`;
    }
    
    return `    // Step ${step.step}: ${step.description} (${step.expectation.type})
    {
      const events = engine.apply(${actionStr});
      
${eventVerification}${stateVerification}
    }`;
  }

  /**
   * Generate Jest assertions for game state
   */
  static generateStateAssertions(expectedState) {
    const assertions = [];
    
    // Ensure expectedState is an object
    if (!expectedState || typeof expectedState !== 'object') {
      return '';
    }
    
    Object.entries(expectedState).forEach(([key, value]) => {
      if (key === 'players' && Array.isArray(value)) {
        assertions.push(`      expect(engine.state.players).toHaveLength(${value.length});`);
        value.forEach((player, index) => {
          Object.entries(player).forEach(([prop, val]) => {
            if (prop === 'handSize') {
              assertions.push(`      expect(engine.state.players[${index}].hand.cards.length).toBe(${val});`);
            } else if (typeof val === 'string') {
              assertions.push(`      expect(engine.state.players[${index}].${prop}).toBe('${val}');`);
            } else {
              assertions.push(`      expect(engine.state.players[${index}].${prop}).toBe(${val});`);
            }
          });
        });
      } else if (key === 'deckSize') {
        assertions.push(`      expect(engine.state.deck.length()).toBe(${value});`);
      } else if (key === 'burnPileSize') {
        assertions.push(`      expect(engine.state.burnPile.cards.length).toBe(${value});`);
      } else if (key === 'downPilesCount') {
        assertions.push(`      expect(engine.state.downPiles.length).toBe(${value});`);
      } else if (typeof value === 'string') {
        assertions.push(`      expect(engine.state.${key}).toBe('${value}');`);
      } else {
        assertions.push(`      expect(engine.state.${key}).toBe(${value});`);
      }
    });
    
    return assertions.join('\n');
  }

  /**
   * Batch convert all recorded games in directory to tests
   */
  static convertAllLogsToTests(logDir = '../tests/recorded-games', testDir = '../tests/generated') {
    if (!fs.existsSync(logDir)) {
      console.log(`Log directory ${logDir} does not exist`);
      return;
    }

    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const logFiles = fs.readdirSync(logDir).filter(file => file.endsWith('.json'));
    
    console.log(`Converting ${logFiles.length} recorded games to tests...`);
    
    logFiles.forEach(logFile => {
      const logPath = path.join(logDir, logFile);
      const testFileName = `${path.basename(logFile, '.json')}.test.js`;
      const testPath = path.join(testDir, testFileName);
      
      try {
        this.generateTestFile(logPath, testPath);
        console.log(`✅ Converted ${logFile} → ${testFileName}`);
      } catch (error) {
        console.error(`❌ Failed to convert ${logFile}:`, error.message);
      }
    });
  }
}

module.exports = GameTestConverter;