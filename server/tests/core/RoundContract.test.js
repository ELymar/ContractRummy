const {
  RoundContract,
  getContractForRound,
  getTotalRounds,
  ROUND_CONTRACTS,
} = require('../../src/core/rules/RoundContract');

describe('RoundContract', () => {
  describe('constructor', () => {
    test('should create a round contract with correct properties', () => {
      const requirements = [
        {type: 'set', minCards: 3},
        {type: 'set', minCards: 3},
      ];
      const contract = new RoundContract(1, 'Test round', requirements);

      expect(contract.roundNumber).toBe(1);
      expect(contract.description).toBe('Test round');
      expect(contract.requirements).toEqual(requirements);
    });
  });

  describe('getTotalCardsNeeded', () => {
    test('should calculate total cards needed correctly', () => {
      const requirements = [
        {type: 'set', minCards: 3},
        {type: 'set', minCards: 3},
        {type: 'sequence', minCards: 4},
      ];
      const contract = new RoundContract(1, 'Test', requirements);

      expect(contract.getTotalCardsNeeded()).toBe(10);
    });
  });

  describe('isContractSatisfied', () => {
    let contract;

    beforeEach(() => {
      const requirements = [
        {type: 'set', minCards: 3},
        {type: 'sequence', minCards: 4},
      ];
      contract = new RoundContract(1, 'Test', requirements);
    });

    test('should return true for valid contract fulfillment', () => {
      const melds = [
        {type: 'set', cards: ['A', 'A', 'A']},
        {type: 'sequence', cards: ['2', '3', '4', '5']},
      ];

      expect(contract.isContractSatisfied(melds)).toBe(true);
    });

    test('should return false for wrong number of melds', () => {
      const melds = [{type: 'set', cards: ['A', 'A', 'A']}];

      expect(contract.isContractSatisfied(melds)).toBe(false);
    });

    test('should return false for wrong meld type', () => {
      const melds = [
        {type: 'sequence', cards: ['A', 'A', 'A']}, // Wrong type
        {type: 'sequence', cards: ['2', '3', '4', '5']},
      ];

      expect(contract.isContractSatisfied(melds)).toBe(false);
    });

    test('should return false for insufficient cards in meld', () => {
      const melds = [
        {type: 'set', cards: ['A', 'A']}, // Too few cards
        {type: 'sequence', cards: ['2', '3', '4', '5']},
      ];

      expect(contract.isContractSatisfied(melds)).toBe(false);
    });

    test('should allow extra cards in melds', () => {
      const melds = [
        {type: 'set', cards: ['A', 'A', 'A', 'A']}, // Extra card is fine
        {type: 'sequence', cards: ['2', '3', '4', '5', '6']}, // Extra card is fine
      ];

      expect(contract.isContractSatisfied(melds)).toBe(true);
    });
  });

  describe('toString', () => {
    test('should return the description', () => {
      const contract = new RoundContract(1, 'Test Description', []);
      expect(contract.toString()).toBe('Test Description');
    });
  });
});

describe('Module functions', () => {
  describe('getContractForRound', () => {
    test('should return correct contract for round 1', () => {
      const contract = getContractForRound(1);
      expect(contract.roundNumber).toBe(1);
      expect(contract.description).toContain('2 sets of 3');
    });

    test('should return correct contract for round 7', () => {
      const contract = getContractForRound(7);
      expect(contract.roundNumber).toBe(7);
      expect(contract.description).toContain('3 sequences of 4');
    });

    test('should throw error for invalid round numbers', () => {
      expect(() => getContractForRound(0)).toThrow('Invalid round number');
      expect(() => getContractForRound(8)).toThrow('Invalid round number');
      expect(() => getContractForRound(-1)).toThrow('Invalid round number');
    });
  });

  describe('getTotalRounds', () => {
    test('should return the correct number of rounds', () => {
      expect(getTotalRounds()).toBe(7);
    });
  });

  describe('All round requirements', () => {
    test('should require 2 melds for Round 1', () => {
      const contract = getContractForRound(1);
      expect(contract.requirements.length).toBe(2);
      expect(contract.requirements[0].type).toBe('set');
      expect(contract.requirements[1].type).toBe('set');
    });

    test('should require 2 melds for Round 2', () => {
      const contract = getContractForRound(2);
      expect(contract.requirements.length).toBe(2);
      expect(contract.requirements[0].type).toBe('set');
      expect(contract.requirements[1].type).toBe('sequence');
    });

    test('should require 2 melds for Round 3', () => {
      const contract = getContractForRound(3);
      expect(contract.requirements.length).toBe(2);
      expect(contract.requirements[0].type).toBe('sequence');
      expect(contract.requirements[1].type).toBe('sequence');
    });

    test('should require 3 melds for Round 4', () => {
      const contract = getContractForRound(4);
      expect(contract.requirements.length).toBe(3);
      expect(contract.requirements[0].type).toBe('set');
      expect(contract.requirements[1].type).toBe('set');
      expect(contract.requirements[2].type).toBe('set');
    });

    test('should require 3 melds for Round 5', () => {
      const contract = getContractForRound(5);
      expect(contract.requirements.length).toBe(3);
      expect(contract.requirements[0].type).toBe('set');
      expect(contract.requirements[1].type).toBe('set');
      expect(contract.requirements[2].type).toBe('sequence');
    });

    test('should require 3 melds for Round 6', () => {
      const contract = getContractForRound(6);
      expect(contract.requirements.length).toBe(3);
      expect(contract.requirements[0].type).toBe('set');
      expect(contract.requirements[1].type).toBe('sequence');
      expect(contract.requirements[2].type).toBe('sequence');
    });

    test('should require 3 melds for Round 7', () => {
      const contract = getContractForRound(7);
      expect(contract.requirements.length).toBe(3);
      expect(contract.requirements[0].type).toBe('sequence');
      expect(contract.requirements[1].type).toBe('sequence');
      expect(contract.requirements[2].type).toBe('sequence');
    });
  });

  describe('ROUND_CONTRACTS', () => {
    test('should have 7 rounds defined', () => {
      expect(ROUND_CONTRACTS.length).toBe(7);
    });

    test('should have round numbers 1-7', () => {
      for (let i = 0; i < 7; i++) {
        expect(ROUND_CONTRACTS[i].roundNumber).toBe(i + 1);
      }
    });

    test('should have proper round 1 contract', () => {
      const round1 = ROUND_CONTRACTS[0];
      expect(round1.requirements).toEqual([
        {type: 'set', minCards: 3},
        {type: 'set', minCards: 3},
      ]);
    });

    test('should have proper round 2 contract', () => {
      const round2 = ROUND_CONTRACTS[1];
      expect(round2.requirements).toEqual([
        {type: 'set', minCards: 3},
        {type: 'sequence', minCards: 4},
      ]);
    });
  });
});
