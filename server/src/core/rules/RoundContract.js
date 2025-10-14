/**
 * Contract Rummy round definitions
 * Defines the requirements for each round of Contract Rummy
 */

class RoundContract {
  /**
   * Create a round contract
   * @param {number} roundNumber - The round number (1-based)
   * @param {string} description - Human-readable description
   * @param {Array} requirements - Array of meld requirements
   */
  constructor(roundNumber, description, requirements) {
    this.roundNumber = roundNumber;
    this.description = description;
    this.requirements = requirements;
  }

  /**
   * Get the total number of cards needed for this contract
   * @returns {number} Total cards needed
   */
  getTotalCardsNeeded() {
    return this.requirements.reduce((total, req) => total + req.minCards, 0);
  }

  /**
   * Check if the given melds satisfy this contract
   * @param {Array} melds - Array of meld objects
   * @returns {boolean} True if contract is satisfied
   */
  isContractSatisfied(melds) {
    if (melds.length !== this.requirements.length) {
      return false;
    }

    // Check each requirement against corresponding meld
    for (let i = 0; i < this.requirements.length; i++) {
      const req = this.requirements[i];
      const meld = melds[i];

      if (req.type !== 'any' && meld.type !== req.type) {
        return false;
      }

      if (meld.cards.length < req.minCards) {
        return false;
      }
    }

    return true;
  }

  toString() {
    return this.description;
  }
}

/**
 * Contract Rummy round definitions
 * Standard Contract Rummy progression
 */
const ROUND_CONTRACTS = [
  new RoundContract(1, 'Round 1: 2 sets of 3 cards each', [
    {type: 'set', minCards: 3},
    {type: 'set', minCards: 3},
  ]),
  new RoundContract(2, 'Round 2: 1 set of 3 + 1 sequence of 4', [
    {type: 'set', minCards: 3},
    {type: 'sequence', minCards: 4},
  ]),
  new RoundContract(3, 'Round 3: 2 sequences of 4 cards each', [
    {type: 'sequence', minCards: 4},
    {type: 'sequence', minCards: 4},
  ]),
  new RoundContract(4, 'Round 4: 3 sets of 3 cards each', [
    {type: 'set', minCards: 3},
    {type: 'set', minCards: 3},
    {type: 'set', minCards: 3},
  ]),
  new RoundContract(5, 'Round 5: 2 sets of 3 + 1 sequence of 4', [
    {type: 'set', minCards: 3},
    {type: 'set', minCards: 3},
    {type: 'sequence', minCards: 4},
  ]),
  new RoundContract(6, 'Round 6: 1 set of 3 + 2 sequences of 4', [
    {type: 'set', minCards: 3},
    {type: 'sequence', minCards: 4},
    {type: 'sequence', minCards: 4},
  ]),
  new RoundContract(7, 'Round 7: 3 sequences of 4 cards each', [
    {type: 'sequence', minCards: 4},
    {type: 'sequence', minCards: 4},
    {type: 'sequence', minCards: 4},
  ]),
];

/**
 * Get contract for a specific round
 * @param {number} roundNumber - Round number (1-based)
 * @returns {RoundContract} The contract for that round
 */
function getContractForRound(roundNumber) {
  if (roundNumber < 1 || roundNumber > ROUND_CONTRACTS.length) {
    throw new Error(`Invalid round number: ${roundNumber}. Must be 1-${ROUND_CONTRACTS.length}`);
  }
  return ROUND_CONTRACTS[roundNumber - 1];
}

/**
 * Get the total number of rounds available
 * @returns {number} Total number of rounds
 */
function getTotalRounds() {
  return ROUND_CONTRACTS.length;
}

module.exports = {
  RoundContract,
  ROUND_CONTRACTS,
  getContractForRound,
  getTotalRounds,
};
