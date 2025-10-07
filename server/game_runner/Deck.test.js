// import deck
const Deck = require('./Deck');

describe('Deck', () => {
    describe('single deck', () => {
        test('new deck with 2 jokers has 54 cards', () => {
            const deck = new Deck(2);
            expect(deck.cards.length).toBe(54);
        });

        test('new deck with 0 jokers has 52 cards', () => {
            const deck = new Deck(0);
            expect(deck.cards.length).toBe(52);
        });
    });

    describe('multiple decks', () => {
        test('2 decks with 12 jokers has 116 cards', () => {
            const deck = new Deck(12, 2);
            expect(deck.cards.length).toBe(116); // 52 * 2 + 12
        });

        test('2 decks with 0 jokers has 104 cards', () => {
            const deck = new Deck(0, 2);
            expect(deck.cards.length).toBe(104); // 52 * 2
        });

        test('3 decks with 6 jokers has 162 cards', () => {
            const deck = new Deck(6, 3);
            expect(deck.cards.length).toBe(162); // 52 * 3 + 6
        });
    });

    describe('draw functionality', () => {
        test('should draw correct number of cards', () => {
            const deck = new Deck(2);
            const initialLength = deck.cards.length;
            const drawnCards = deck.draw(5);
            
            expect(drawnCards.length).toBe(5);
            expect(deck.cards.length).toBe(initialLength - 5);
        });
    });

    describe('shuffle functionality', () => {
        test('should shuffle cards', () => {
            const deck1 = new Deck(0);
            const deck2 = new Deck(0);
            
            // Create identical ordered decks
            deck1.cards = [...deck2.cards];
            
            // Shuffle one deck
            deck1.shuffle();
            
            // They should be different (with very high probability)
            expect(deck1.cards).not.toEqual(deck2.cards);
        });
    });
});

