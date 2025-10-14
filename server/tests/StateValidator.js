/**
 * Validates game state consistency and matches expected states during test replay
 */
class StateValidator {
  /**
   * Compare actual game state with expected state snapshot
   * @param {Object} actualState - Current game engine state
   * @param {Object} expectedSnapshot - Expected state from log
   * @returns {Object} Validation result with success/failures
   */
  static validateState(actualState, expectedSnapshot) {
    const results = {
      success: true,
      errors: [],
      warnings: [],
    };

    if (!expectedSnapshot) {
      results.warnings.push('No expected state provided for validation');
      return results;
    }

    // Validate basic game state
    this.validateBasicState(actualState, expectedSnapshot, results);

    // Validate deck state
    this.validateDeckState(actualState, expectedSnapshot, results);

    // Validate burn pile state
    this.validateBurnPileState(actualState, expectedSnapshot, results);

    // Validate down piles
    this.validateDownPiles(actualState, expectedSnapshot, results);

    // Validate players
    this.validatePlayers(actualState, expectedSnapshot, results);

    return results;
  }

  /**
   * Validate basic game state properties
   */
  static validateBasicState(actualState, expectedSnapshot, results) {
    const checks = [
      ['currentPlayerIndex', 'Current player index'],
      ['currentRound', 'Current round'],
      ['dealerIndex', 'Dealer index'],
      ['firstTurn', 'First turn flag'],
    ];

    checks.forEach(([prop, desc]) => {
      if (expectedSnapshot[prop] !== undefined) {
        if (actualState[prop] !== expectedSnapshot[prop]) {
          results.success = false;
          results.errors.push(
            `${desc} mismatch: expected ${expectedSnapshot[prop]}, got ${actualState[prop]}`
          );
        }
      }
    });
  }

  /**
   * Validate deck state
   */
  static validateDeckState(actualState, expectedSnapshot, results) {
    if (expectedSnapshot.deckSize !== undefined) {
      const actualDeckSize = actualState.deck?.length?.() || 0;
      if (actualDeckSize !== expectedSnapshot.deckSize) {
        results.success = false;
        results.errors.push(
          `Deck size mismatch: expected ${expectedSnapshot.deckSize}, got ${actualDeckSize}`
        );
      }
    }
  }

  /**
   * Validate burn pile state
   */
  static validateBurnPileState(actualState, expectedSnapshot, results) {
    if (expectedSnapshot.burnPileSize !== undefined) {
      const actualBurnPileSize = actualState.burnPile?.cards?.length || 0;
      if (actualBurnPileSize !== expectedSnapshot.burnPileSize) {
        results.success = false;
        results.errors.push(
          `Burn pile size mismatch: expected ${expectedSnapshot.burnPileSize}, got ${actualBurnPileSize}`
        );
      }
    }

    if (expectedSnapshot.burnPileDead !== undefined) {
      const actualBurnPileDead = actualState.burnPile?.dead || false;
      if (actualBurnPileDead !== expectedSnapshot.burnPileDead) {
        results.success = false;
        results.errors.push(
          `Burn pile dead state mismatch: expected ${expectedSnapshot.burnPileDead}, got ${actualBurnPileDead}`
        );
      }
    }
  }

  /**
   * Validate down piles (melds on table)
   */
  static validateDownPiles(actualState, expectedSnapshot, results) {
    if (expectedSnapshot.downPilesCount !== undefined) {
      const actualDownPilesCount = actualState.downPiles?.length || 0;
      if (actualDownPilesCount !== expectedSnapshot.downPilesCount) {
        results.success = false;
        results.errors.push(
          `Down piles count mismatch: expected ${expectedSnapshot.downPilesCount}, got ${actualDownPilesCount}`
        );
      }
    }

    if (expectedSnapshot.downPiles && actualState.downPiles) {
      expectedSnapshot.downPiles.forEach((expectedPile, index) => {
        const actualPile = actualState.downPiles[index];
        if (!actualPile) {
          results.success = false;
          results.errors.push(`Missing down pile at index ${index}`);
          return;
        }

        if (expectedPile.type && actualPile.type !== expectedPile.type) {
          results.warnings.push(
            `Down pile ${index} type mismatch: expected ${expectedPile.type}, got ${actualPile.type}`
          );
        }

        if (expectedPile.owner) {
          const actualOwner = actualPile.owner || actualPile.getOwner?.();
          if (actualOwner !== expectedPile.owner) {
            results.warnings.push(
              `Down pile ${index} owner mismatch: expected ${expectedPile.owner}, got ${actualOwner}`
            );
          }
        }

        if (expectedPile.cards) {
          const actualCards = (actualPile.cards || []).map((c) => c.toString?.() || String(c));
          if (actualCards.length !== expectedPile.cards.length) {
            results.success = false;
            results.errors.push(
              `Down pile ${index} card count mismatch: expected ${expectedPile.cards.length}, got ${actualCards.length}`
            );
          }
        }
      });
    }
  }

  /**
   * Validate player states
   */
  static validatePlayers(actualState, expectedSnapshot, results) {
    if (!expectedSnapshot.players || !actualState.players) {
      return;
    }

    if (expectedSnapshot.players.length !== actualState.players.length) {
      results.success = false;
      results.errors.push(
        `Player count mismatch: expected ${expectedSnapshot.players.length}, got ${actualState.players.length}`
      );
      return;
    }

    expectedSnapshot.players.forEach((expectedPlayer, index) => {
      const actualPlayer = actualState.players[index];
      if (!actualPlayer) {
        results.success = false;
        results.errors.push(`Missing player at index ${index}`);
        return;
      }

      // Validate player properties
      const playerChecks = [
        ['id', 'Player ID'],
        ['name', 'Player name'],
        ['isDown', 'Player down status'],
        ['tookCard', 'Player took card status'],
        ['discarded', 'Player discarded status'],
        ['isOut', 'Player out status'],
      ];

      playerChecks.forEach(([prop, desc]) => {
        if (expectedPlayer[prop] !== undefined) {
          if (actualPlayer[prop] !== expectedPlayer[prop]) {
            results.success = false;
            results.errors.push(
              `${desc} mismatch for player ${index}: expected ${expectedPlayer[prop]}, got ${actualPlayer[prop]}`
            );
          }
        }
      });

      // Validate hand size
      if (expectedPlayer.handSize !== undefined) {
        const actualHandSize = actualPlayer.hand?.cards?.length || 0;
        if (actualHandSize !== expectedPlayer.handSize) {
          results.success = false;
          results.errors.push(
            `Hand size mismatch for player ${index}: expected ${expectedPlayer.handSize}, got ${actualHandSize}`
          );
        }
      }
    });
  }

  /**
   * Validate full game state including private information (for debugging)
   */
  static validateFullState(actualState, expectedFullSnapshot) {
    if (!expectedFullSnapshot) {
      return {success: true, warnings: ['No full state snapshot available for validation']};
    }

    const results = {
      success: true,
      errors: [],
      warnings: [],
    };

    // First run basic validation
    const basicResults = this.validateState(actualState, expectedFullSnapshot);
    results.success = basicResults.success;
    results.errors = [...basicResults.errors];
    results.warnings = [...basicResults.warnings];

    // Validate full deck contents if available
    if (expectedFullSnapshot.deck?.cards) {
      const actualDeckCards = (actualState.deck?.cards || []).map(
        (c) => c.toString?.() || String(c)
      );
      const expectedDeckCards = expectedFullSnapshot.deck.cards;

      if (actualDeckCards.length !== expectedDeckCards.length) {
        results.success = false;
        results.errors.push(
          `Full deck size mismatch: expected ${expectedDeckCards.length}, got ${actualDeckCards.length}`
        );
      } else {
        // Check for card order differences (may indicate RNG divergence)
        let differentCards = 0;
        for (let i = 0; i < actualDeckCards.length; i++) {
          if (actualDeckCards[i] !== expectedDeckCards[i]) {
            differentCards++;
          }
        }
        if (differentCards > 0) {
          results.warnings.push(
            `Deck order divergence: ${differentCards}/${actualDeckCards.length} cards in different positions`
          );
        }
      }
    }

    // Validate player hands if available
    if (expectedFullSnapshot.players) {
      expectedFullSnapshot.players.forEach((expectedPlayer, index) => {
        if (expectedPlayer.hand?.cards) {
          const actualPlayer = actualState.players[index];
          if (actualPlayer) {
            const actualHand = (actualPlayer.hand?.cards || []).map(
              (c) => c.toString?.() || String(c)
            );
            const expectedHand = expectedPlayer.hand.cards;

            if (actualHand.length !== expectedHand.length) {
              results.success = false;
              results.errors.push(
                `Player ${index} hand size mismatch: expected ${expectedHand.length}, got ${actualHand.length}`
              );
            } else {
              // Check for hand content differences
              const actualHandSet = new Set(actualHand);
              const expectedHandSet = new Set(expectedHand);
              const missing = expectedHand.filter((card) => !actualHandSet.has(card));
              const extra = actualHand.filter((card) => !expectedHandSet.has(card));

              if (missing.length > 0 || extra.length > 0) {
                results.warnings.push(
                  `Player ${index} hand content divergence: missing [${missing.join(', ')}], extra [${extra.join(', ')}]`
                );
              }
            }
          }
        }
      });
    }

    return results;
  }

  /**
   * Format validation results for test output
   */
  static formatResults(results, stepNumber) {
    if (results.success && results.warnings.length === 0) {
      return `// Step ${stepNumber}: State validation passed`;
    }

    const output = [];

    if (!results.success) {
      output.push(`// Step ${stepNumber}: State validation FAILED`);
      results.errors.forEach((error) => {
        output.push(`//   ERROR: ${error}`);
      });
    }

    if (results.warnings.length > 0) {
      output.push(`// Step ${stepNumber}: State validation warnings`);
      results.warnings.forEach((warning) => {
        output.push(`//   WARNING: ${warning}`);
      });
    }

    return output.join('\n');
  }
}

module.exports = StateValidator;
