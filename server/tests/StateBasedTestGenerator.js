const fs = require('fs');

/**
 * Generates tests that set up exact game state before each action
 * instead of relying on RNG replay from the beginning
 */
class StateBasedTestGenerator {
  /**
   * Generate a test that reconstructs exact game state for critical actions
   */
  static generateStateBasedTest(logFilePath, testOutputPath) {
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    const logLines = logContent
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));

    // Find game actions with full game snapshots (our enhanced logging)
    const actionsWithFullState = logLines.filter(
      (log) =>
        log.event === 'game_action' &&
        log.fullGameSnapshot &&
        ['LAY_DOWN', 'ADD_TO_MELD'].includes(log.actionType)
    );

    if (actionsWithFullState.length === 0) {
      throw new Error('No actions with full game snapshots found in log');
    }

    const gameId = logLines[0].gameId;

    const testCode = `const GameEngine = require('../../core/engine/GameEngine');
const { ActionType } = require('../../core/engine/actions');
const Card = require('../../game_runner/Card');

describe('State-based replay: ${gameId}', () => {
  test('should replay critical actions with exact state reconstruction', () => {
${actionsWithFullState.map((log, index) => this.generateStateTest(log, index)).join('\n')}
  });
});`;

    fs.writeFileSync(testOutputPath, testCode);
    console.log(`Generated state-based test: ${testOutputPath}`);
    return testOutputPath;
  }

  /**
   * Generate a test for a single action with full state setup
   */
  static generateStateTest(logEntry, index) {
    const {action, fullGameSnapshot, events} = logEntry;
    const expectedEvents = events.map((e) => e.type);

    return `
    // Test ${index + 1}: ${action.type} by ${action.playerId}
    {
      const engine = new GameEngine();
      
      // Reconstruct exact game state
      ${this.generateStateReconstruction(fullGameSnapshot, action)}
      
      // Apply the recorded action
      const events = engine.apply(${JSON.stringify(action, null, 6)});
      
      // Verify expected events
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toEqual([${expectedEvents.map((e) => `'${e}'`).join(', ')}]);
      
      // Verify no errors occurred
      expect(eventTypes).not.toContain('ERROR');
    }`;
  }

  /**
   * Generate code to reconstruct the exact game state
   */
  static generateStateReconstruction(fullState, action) {
    const lines = [];

    // For LAY_DOWN actions, we need to reconstruct the hand BEFORE the lay down
    // by adding back the cards that were laid down
    const reconstructedState = this.reconstructPreActionState(fullState, action);

    // Set basic game state
    lines.push(`      engine.state.currentPlayerIndex = ${reconstructedState.currentPlayerIndex};`);
    lines.push(`      engine.state.currentRound = ${reconstructedState.currentRound};`);
    lines.push(`      engine.state.dealerIndex = ${fullState.dealerIndex};`);
    lines.push(`      engine.state.firstTurn = ${fullState.firstTurn};`);
    lines.push(`      engine.state.started = true;`);

    // Initialize ScoreKeeper (needed for game validation)
    lines.push(`      const ScoreKeeper = require('../../game_runner/ScoreKeeper');`);
    lines.push(
      `      engine.scoreKeeper = new ScoreKeeper([${reconstructedState.players.map((p) => `'${p.name}'`).join(', ')}]);`
    );

    // Create players with proper Player objects
    lines.push(`      const Player = require('../../game_runner/Player');`);
    lines.push(`      engine.state.players = [];`);
    reconstructedState.players.forEach((player, index) => {
      lines.push(`      const player${index} = new Player('${player.name}');`);
      lines.push(`      player${index}.id = '${player.id}';`);
      lines.push(
        `      player${index}.hand.cards = [${player.hand.cards.map((c) => `'${c}'`).join(', ')}].map(c => Card.fromString(c));`
      );
      lines.push(`      player${index}.isDown = ${player.isDown};`);
      lines.push(`      player${index}.isOut = ${player.isOut};`);
      lines.push(`      player${index}.tookCard = ${player.tookCard};`);
      lines.push(`      player${index}.discarded = ${player.discarded};`);
      lines.push(`      engine.state.players[${index}] = player${index};`);
    });

    // Set deck state
    lines.push(
      `      engine.state.deck.cards = [${fullState.deck.cards.map((c) => `'${c}'`).join(', ')}].map(c => Card.fromString(c));`
    );

    // Set burn pile state
    lines.push(
      `      engine.state.burnPile.cards = [${fullState.burnPile.cards.map((c) => `'${c}'`).join(', ')}].map(c => Card.fromString(c));`
    );
    lines.push(`      engine.state.burnPile.dead = ${fullState.burnPile.dead};`);

    // Set down piles with proper DownPile objects
    lines.push(`      const DownPile = require('../../game_runner/DownPile');`);
    lines.push(`      engine.state.downPiles = [];`);
    reconstructedState.downPiles.forEach((pile, index) => {
      lines.push(`      const downPile${index} = new DownPile('${pile.type}', '${pile.owner}');`);
      lines.push(
        `      downPile${index}.cards = [${pile.cards.map((c) => `'${c}'`).join(', ')}].map(c => Card.fromString(c));`
      );
      lines.push(`      engine.state.downPiles[${index}] = downPile${index};`);
    });

    return lines.join('\n');
  }

  /**
   * For LAY_DOWN actions, reconstruct the state before the action was executed
   * by adding back the cards that were laid down
   */
  static reconstructPreActionState(fullState, action) {
    if (action.type !== 'LAY_DOWN') {
      return fullState; // No reconstruction needed for non-LAY_DOWN actions
    }

    const reconstructed = JSON.parse(JSON.stringify(fullState)); // Deep copy

    // Find the player who performed the LAY_DOWN
    const playerIndex = reconstructed.players.findIndex((p) => p.id === action.playerId);
    if (playerIndex === -1) {
      console.warn(`Player ${action.playerId} not found for LAY_DOWN reconstruction`);
      return fullState;
    }

    const player = reconstructed.players[playerIndex];

    // Use handOrder from action if available, otherwise reconstruct from melds
    if (action.payload && action.payload.handOrder) {
      // The handOrder represents the complete hand before the lay down
      player.hand.cards = action.payload.handOrder.map(
        (card) =>
          `[${card.value === 'Joker' ? '🃏' : this.convertValue(card.value)}${card.suit === 'Joker' ? '' : this.getSuitSymbol(card.suit)}]`
      );
    } else {
      // Fallback: reconstruct hand by adding back the meld cards
      const meldCards = this.extractMeldCards(action.payload.melds, action.payload.handOrder);
      player.hand.cards = [...player.hand.cards, ...meldCards];
    }

    // Player should not be down yet (this happens during the action)
    player.isDown = false;

    // Remove the down piles that would be created by this action
    // Find piles owned by this player that were just created
    if (action.payload && action.payload.melds) {
      // Remove the last N piles where N is the number of melds in this action
      const numMeldsToRemove = action.payload.melds.length;
      for (let i = 0; i < numMeldsToRemove; i++) {
        // Find last owned pile manually
        let lastOwnedPileIndex = -1;
        for (let j = reconstructed.downPiles.length - 1; j >= 0; j--) {
          if (reconstructed.downPiles[j].owner === player.name) {
            lastOwnedPileIndex = j;
            break;
          }
        }
        if (lastOwnedPileIndex !== -1) {
          reconstructed.downPiles.splice(lastOwnedPileIndex, 1);
        }
      }
    }

    return reconstructed;
  }

  /**
   * Get suit symbol for display
   */
  static getSuitSymbol(suit) {
    const symbols = {
      Hearts: '♥',
      Diamonds: '♦',
      Clubs: '♣',
      Spades: '♠',
    };
    return symbols[suit] || suit;
  }

  /**
   * Convert long-form value names to short form
   */
  static convertValue(value) {
    const valueMap = {
      Two: '2',
      Three: '3',
      Four: '4',
      Five: '5',
      Six: '6',
      Seven: '7',
      Eight: '8',
      Nine: '9',
      Ten: '10',
      Jack: 'J',
      Queen: 'Q',
      King: 'K',
      Ace: 'A',
    };
    return valueMap[value] || value;
  }

  /**
   * Extract cards from meld definitions (fallback method)
   */
  static extractMeldCards(melds, handOrder) {
    if (!melds || !handOrder) return [];

    const meldCards = [];
    melds.forEach((meld) => {
      meld.cardIndices.forEach((index) => {
        if (handOrder[index]) {
          const card = handOrder[index];
          meldCards.push(
            `[${card.value === 'Joker' ? '🃏' : this.convertValue(card.value)}${card.suit === 'Joker' ? '' : this.getSuitSymbol(card.suit)}]`
          );
        }
      });
    });
    return meldCards;
  }
}

module.exports = StateBasedTestGenerator;
