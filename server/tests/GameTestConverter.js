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
    const steps = actionLogs.map((logEntry, index) => ({
      step: index + 1,
      description: this.generateStepDescription(logEntry.action),
      action: logEntry.action,
      expectedEvents: logEntry.events.map(e => e.type),
      expectedState: this.generateStateAssertions(logEntry.gameSnapshot)
    }));

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
   * Generate assertions for game state
   */
  static generateStateAssertions(gameSnapshot) {
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
    
    const testCode = `const GameEngine = require('../core/engine/GameEngine');
const { ActionType } = require('../core/engine/actions');

// Auto-generated test from recorded game: ${testSpec.gameId}
// Original log: ${testSpec.metadata.originalLogFile}
// Recorded: ${new Date(testSpec.metadata.recordedAt).toISOString()}

describe('${testSpec.name}', () => {
  let engine;
  
  beforeEach(() => {
    // Initialize with deterministic seed for reproducibility
    engine = new GameEngine({ rng: seedRandom('${testSpec.seed}') });
  });

  test('should replay recorded game successfully', async () => {
${testSpec.steps.map(step => this.generateTestStep(step)).join('\n')}
  });
});

// Simple seeded random function for test reproducibility
function seedRandom(seed) {
  let x = parseInt(seed, 16) || 1;
  return function() {
    x = Math.imul(16807, x) % 2147483647;
    return (x - 1) / 2147483646;
  };
}`;

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
    
    return `    // Step ${step.step}: ${step.description}
    {
      const events = engine.apply(${actionStr});
      
      // Verify expected events were emitted
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toEqual(expect.arrayContaining([${expectedEvents}]));
      
      // Verify game state assertions
      ${this.generateStateAssertions(step.expectedState)}
    }`;
  }

  /**
   * Generate Jest assertions for game state
   */
  static generateStateAssertions(expectedState) {
    const assertions = [];
    
    Object.entries(expectedState).forEach(([key, value]) => {
      if (key === 'players' && Array.isArray(value)) {
        assertions.push(`      expect(engine.state.players).toHaveLength(${value.length});`);
        value.forEach((player, index) => {
          Object.entries(player).forEach(([prop, val]) => {
            if (typeof val === 'string') {
              assertions.push(`      expect(engine.state.players[${index}].${prop}).toBe('${val}');`);
            } else {
              assertions.push(`      expect(engine.state.players[${index}].${prop}).toBe(${val});`);
            }
          });
        });
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