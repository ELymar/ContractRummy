const CardScoring = require('./CardScoring');
const Card = require('./Card');

describe('CardScoring', () => {
    describe('getCardValue', () => {
        test('should return 20 for Joker', () => {
            const joker = new Card('Hearts', 'Joker');
            expect(CardScoring.getCardValue(joker)).toBe(20);
        });

        test('should return 15 for Ace', () => {
            const ace = new Card('Spades', 'Ace');
            expect(CardScoring.getCardValue(ace)).toBe(15);
        });

        test('should return 10 for face cards', () => {
            const jack = new Card('Hearts', 'Jack');
            const queen = new Card('Diamonds', 'Queen');
            const king = new Card('Clubs', 'King');
            
            expect(CardScoring.getCardValue(jack)).toBe(10);
            expect(CardScoring.getCardValue(queen)).toBe(10);
            expect(CardScoring.getCardValue(king)).toBe(10);
        });

        test('should return 5 for number cards', () => {
            const two = new Card('Hearts', 'Two');
            const five = new Card('Spades', 'Five');
            const ten = new Card('Diamonds', 'Ten');
            
            expect(CardScoring.getCardValue(two)).toBe(5);
            expect(CardScoring.getCardValue(five)).toBe(5);
            expect(CardScoring.getCardValue(ten)).toBe(5);
        });

        test('should handle all number cards correctly', () => {
            const numberCards = ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
            
            numberCards.forEach(value => {
                const card = new Card('Hearts', value);
                expect(CardScoring.getCardValue(card)).toBe(5);
            });
        });
    });

    describe('scoreHand', () => {
        test('should calculate score for empty hand', () => {
            expect(CardScoring.scoreHand([])).toBe(0);
        });

        test('should calculate score for single card', () => {
            const cards = [new Card('Hearts', 'Ace')];
            expect(CardScoring.scoreHand(cards)).toBe(15);
        });

        test('should calculate score for multiple cards', () => {
            const cards = [
                new Card('Hearts', 'Ace'),      // 15
                new Card('Spades', 'King'),     // 10
                new Card('Diamonds', 'Five'),   // 5
                new Card('Clubs', 'Joker')      // 20
            ];
            expect(CardScoring.scoreHand(cards)).toBe(50);
        });

        test('should calculate score for hand with only number cards', () => {
            const cards = [
                new Card('Hearts', 'Two'),      // 5
                new Card('Spades', 'Seven'),    // 5
                new Card('Diamonds', 'Ten')     // 5
            ];
            expect(CardScoring.scoreHand(cards)).toBe(15);
        });

        test('should calculate score for hand with all card types', () => {
            const cards = [
                new Card('Hearts', 'Two'),      // 5
                new Card('Spades', 'Jack'),     // 10
                new Card('Diamonds', 'Ace'),    // 15
                new Card('Clubs', 'Joker')      // 20
            ];
            expect(CardScoring.scoreHand(cards)).toBe(50);
        });
    });

    describe('getPointValues', () => {
        test('should return correct point values reference', () => {
            const values = CardScoring.getPointValues();
            
            expect(values['Number cards (2-10)']).toBe(5);
            expect(values['Face cards (J, Q, K)']).toBe(10);
            expect(values['Ace']).toBe(15);
            expect(values['Joker']).toBe(20);
        });
    });

    describe('getPointValuesDisplay', () => {
        test('should return formatted display string', () => {
            const display = CardScoring.getPointValuesDisplay();
            
            expect(display).toContain('Card Point Values:');
            expect(display).toContain('Number cards (2-10)');
            expect(display).toContain('5 pts');
            expect(display).toContain('Face cards (J, Q, K)');
            expect(display).toContain('10 pts');
            expect(display).toContain('Ace');
            expect(display).toContain('15 pts');
            expect(display).toContain('Joker');
            expect(display).toContain('20 pts');
        });
    });
});