const CardSorter = require('../../src/core/utils/CardSorter');
const Card = require('../../src/core/domain/Card');

describe('CardSorter', () => {
    let testCards;

    beforeEach(() => {
        // Create a mixed hand for testing
        testCards = [
            new Card('Hearts', 'King'),
            new Card('Spades', 'Ace'),
            new Card('Hearts', 'Two'),
            new Card('Clubs', 'Ace'),
            new Card('Diamonds', 'King'),
            new Card('Spades', 'Two'),
            new Card('Joker', 'Joker'),
            new Card('Hearts', 'Ace'),
            new Card('Clubs', 'Three')
        ];
    });

    describe('getValueOrder', () => {
        test('should return correct numeric values for card ranks', () => {
            expect(CardSorter.getValueOrder('Two')).toBe(2);
            expect(CardSorter.getValueOrder('Three')).toBe(3);
            expect(CardSorter.getValueOrder('Jack')).toBe(11);
            expect(CardSorter.getValueOrder('Queen')).toBe(12);
            expect(CardSorter.getValueOrder('King')).toBe(13);
            expect(CardSorter.getValueOrder('Ace')).toBe(14);
            expect(CardSorter.getValueOrder('Joker')).toBe(15);
        });

        test('should return 0 for unknown values', () => {
            expect(CardSorter.getValueOrder('Unknown')).toBe(0);
        });
    });

    describe('getSuitOrder', () => {
        test('should return correct numeric values for suits', () => {
            expect(CardSorter.getSuitOrder('Hearts')).toBe(1);
            expect(CardSorter.getSuitOrder('Diamonds')).toBe(2);
            expect(CardSorter.getSuitOrder('Clubs')).toBe(3);
            expect(CardSorter.getSuitOrder('Spades')).toBe(4);
            expect(CardSorter.getSuitOrder('Joker')).toBe(5);
        });

        test('should return 0 for unknown suits', () => {
            expect(CardSorter.getSuitOrder('Unknown')).toBe(0);
        });
    });

    describe('sortByRank', () => {
        test('should sort cards by rank with same ranks grouped together', () => {
            const sorted = CardSorter.sortByRank(testCards);
            
            // Should have all Twos first, then Threes, etc.
            expect(sorted[0].value).toBe('Two'); // Hearts Two
            expect(sorted[1].value).toBe('Two'); // Spades Two
            expect(sorted[2].value).toBe('Three'); // Clubs Three
            expect(sorted[3].value).toBe('King'); // Hearts King
            expect(sorted[4].value).toBe('King'); // Diamonds King
            expect(sorted[5].value).toBe('Ace'); // Hearts Ace
            expect(sorted[6].value).toBe('Ace'); // Clubs Ace
            expect(sorted[7].value).toBe('Ace'); // Spades Ace
            expect(sorted[8].value).toBe('Joker'); // Joker
        });

        test('should sort by suit within same rank', () => {
            const sorted = CardSorter.sortByRank(testCards);
            const aces = sorted.filter(card => card.value === 'Ace');
            
            // Aces should be sorted Hearts, Clubs, Spades
            expect(aces[0].suit).toBe('Hearts');
            expect(aces[1].suit).toBe('Clubs');
            expect(aces[2].suit).toBe('Spades');
        });

        test('should not modify original array', () => {
            const originalLength = testCards.length;
            const originalFirst = testCards[0];
            
            CardSorter.sortByRank(testCards);
            
            expect(testCards.length).toBe(originalLength);
            expect(testCards[0]).toBe(originalFirst);
        });
    });

    describe('sortBySuitThenRank', () => {
        test('should sort cards by suit first, then rank within suit', () => {
            const sorted = CardSorter.sortBySuitThenRank(testCards);
            
            // Should group by suit: Hearts, Diamonds, Clubs, Spades, Joker
            const hearts = sorted.filter(card => card.suit === 'Hearts');
            const diamonds = sorted.filter(card => card.suit === 'Diamonds');
            const clubs = sorted.filter(card => card.suit === 'Clubs');
            const spades = sorted.filter(card => card.suit === 'Spades');
            const jokers = sorted.filter(card => card.suit === 'Joker');
            
            expect(hearts.length).toBe(3);
            expect(diamonds.length).toBe(1);
            expect(clubs.length).toBe(2);
            expect(spades.length).toBe(2);
            expect(jokers.length).toBe(1);
        });

        test('should sort ranks within each suit', () => {
            const sorted = CardSorter.sortBySuitThenRank(testCards);
            const hearts = sorted.filter(card => card.suit === 'Hearts');
            
            // Hearts should be sorted: Two, King, Ace
            expect(hearts[0].value).toBe('Two');
            expect(hearts[1].value).toBe('King');
            expect(hearts[2].value).toBe('Ace');
        });

        test('should put jokers last', () => {
            const sorted = CardSorter.sortBySuitThenRank(testCards);
            expect(sorted[sorted.length - 1].suit).toBe('Joker');
        });

        test('should not modify original array', () => {
            const originalLength = testCards.length;
            const originalFirst = testCards[0];
            
            CardSorter.sortBySuitThenRank(testCards);
            
            expect(testCards.length).toBe(originalLength);
            expect(testCards[0]).toBe(originalFirst);
        });
    });

    describe('getSortingOptions', () => {
        test('should return array of sorting options', () => {
            const options = CardSorter.getSortingOptions();
            
            expect(Array.isArray(options)).toBe(true);
            expect(options.length).toBe(2);
            
            expect(options[0]).toHaveProperty('name');
            expect(options[0]).toHaveProperty('key');
            expect(options[0]).toHaveProperty('sorter');
            expect(typeof options[0].sorter).toBe('function');
            
            expect(options[1]).toHaveProperty('name');
            expect(options[1]).toHaveProperty('key');
            expect(options[1]).toHaveProperty('sorter');
            expect(typeof options[1].sorter).toBe('function');
        });

        test('should have rank and suit sorting options', () => {
            const options = CardSorter.getSortingOptions();
            const keys = options.map(opt => opt.key);
            
            expect(keys).toContain('rank');
            expect(keys).toContain('suit');
        });
    });
});