const RoundDealing = require('../../src/core/rules/RoundDealing');

describe('RoundDealing', () => {
  describe('getCardsForRound', () => {
    test('should return correct cards for round 1 with dealer 0', () => {
      const config = RoundDealing.getCardsForRound(1, 0);
      expect(config.player1Cards).toBe(10);
      expect(config.player2Cards).toBe(11);
    });

    test('should return correct cards for round 1 with dealer 1', () => {
      const config = RoundDealing.getCardsForRound(1, 1);
      expect(config.player1Cards).toBe(11);
      expect(config.player2Cards).toBe(10);
    });

    test('should return correct cards for round 2 with dealer 0', () => {
      const config = RoundDealing.getCardsForRound(2, 0);
      expect(config.player1Cards).toBe(10);
      expect(config.player2Cards).toBe(11);
    });

    test('should return correct cards for round 4 with dealer 0', () => {
      const config = RoundDealing.getCardsForRound(4, 0);
      expect(config.player1Cards).toBe(12);
      expect(config.player2Cards).toBe(13);
    });

    test('should return correct cards for round 4 with dealer 1', () => {
      const config = RoundDealing.getCardsForRound(4, 1);
      expect(config.player1Cards).toBe(13);
      expect(config.player2Cards).toBe(12);
    });

    test('should return correct cards for round 7 with dealer 0', () => {
      const config = RoundDealing.getCardsForRound(7, 0);
      expect(config.player1Cards).toBe(14);
      expect(config.player2Cards).toBe(15);
    });

    test('should return correct cards for round 7 with dealer 1', () => {
      const config = RoundDealing.getCardsForRound(7, 1);
      expect(config.player1Cards).toBe(15);
      expect(config.player2Cards).toBe(14);
    });

    test('should throw error for invalid round numbers', () => {
      expect(() => RoundDealing.getCardsForRound(0)).toThrow(
        'Invalid round number: 0. Must be 1-7.'
      );
      expect(() => RoundDealing.getCardsForRound(8)).toThrow(
        'Invalid round number: 8. Must be 1-7.'
      );
      expect(() => RoundDealing.getCardsForRound(-1)).toThrow(
        'Invalid round number: -1. Must be 1-7.'
      );
    });
  });

  describe('getRoundPlan', () => {
    test('should provide detailed plan for round 1', () => {
      const plan = RoundDealing.getRoundPlan(1, 0, ['Alice', 'Bob']);

      expect(plan.dealer.name).toBe('Alice');
      expect(plan.dealer.cards).toBe(10);
      expect(plan.nonDealer.name).toBe('Bob');
      expect(plan.nonDealer.cards).toBe(11);
      expect(plan.cardsPerIndex).toEqual([10, 11]);
      expect(plan.totalCards).toBe(21);
      expect(plan.description.length).toBeGreaterThan(0);
    });

    test('should swap dealer and non-dealer when dealerIndex is 1', () => {
      const plan = RoundDealing.getRoundPlan(4, 1, ['Alice', 'Bob']);

      expect(plan.dealer.name).toBe('Bob');
      expect(plan.dealer.cards).toBe(12);
      expect(plan.nonDealer.name).toBe('Alice');
      expect(plan.nonDealer.cards).toBe(13);
      expect(plan.cardsPerIndex).toEqual([13, 12]);
    });

    test('should throw when dealer index is invalid', () => {
      expect(() => RoundDealing.getRoundPlan(1, 2)).toThrow(
        'Invalid dealer index: 2. Must be 0 or 1.'
      );
    });

    test('should throw when player names missing', () => {
      expect(() => RoundDealing.getRoundPlan(1, 0, ['Solo'])).toThrow(
        'playerNames must contain at least two entries.'
      );
    });
  });

  describe('getAllRoundConfigs', () => {
    test('should return all 7 round configurations with dealer 0', () => {
      const configs = RoundDealing.getAllRoundConfigs(0);

      expect(configs).toHaveLength(7);

      // Check first few rounds (non-dealer gets extra card)
      expect(configs[0]).toEqual({round: 1, player1Cards: 10, player2Cards: 11});
      expect(configs[1]).toEqual({round: 2, player1Cards: 10, player2Cards: 11});
      expect(configs[2]).toEqual({round: 3, player1Cards: 10, player2Cards: 11});
      expect(configs[3]).toEqual({round: 4, player1Cards: 12, player2Cards: 13});
      expect(configs[6]).toEqual({round: 7, player1Cards: 14, player2Cards: 15});
    });

    test('should return all 7 round configurations with dealer 1', () => {
      const configs = RoundDealing.getAllRoundConfigs(1);

      expect(configs).toHaveLength(7);

      // Check first few rounds (non-dealer gets extra card)
      expect(configs[0]).toEqual({round: 1, player1Cards: 11, player2Cards: 10});
      expect(configs[1]).toEqual({round: 2, player1Cards: 11, player2Cards: 10});
      expect(configs[3]).toEqual({round: 4, player1Cards: 13, player2Cards: 12});
    });
  });

  describe('getRoundDealingDescription', () => {
    test('should return correct description for round 1 with dealer 0', () => {
      const description = RoundDealing.getRoundDealingDescription(1, 0);
      expect(description).toBe('Round 1: Player 1 (dealer) gets 10 cards, Player 2 gets 11 cards');
    });

    test('should return correct description for round 1 with dealer 1', () => {
      const description = RoundDealing.getRoundDealingDescription(1, 1);
      expect(description).toBe('Round 1: Player 2 (dealer) gets 10 cards, Player 1 gets 11 cards');
    });

    test('should return correct description for round 4 with dealer 0', () => {
      const description = RoundDealing.getRoundDealingDescription(4, 0);
      expect(description).toBe('Round 4: Player 1 (dealer) gets 12 cards, Player 2 gets 13 cards');
    });
  });

  describe('getRoundSummary', () => {
    test('should include dealing description and notes', () => {
      const summary = RoundDealing.getRoundSummary(6, 1, ['Dealer Dan', 'Runner Rita']);
      expect(summary).toContain(
        'Round 6: Runner Rita (dealer) gets 14 cards, Dealer Dan gets 15 cards'
      );
      expect(summary).toContain('One set of 3, two straights');
    });
  });
});
