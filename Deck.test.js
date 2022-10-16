// import deck
const Deck = require('./Deck');

// test that new deck with 2 jokers has 52 cards
test('new deck with 2 jokers has 54 cards', () => {
    const deck = new Deck(2);
    expect(deck.cards.length).toBe(54);
});

// test that new deck with 0 jokers has 52 cards
test('new deck with 0 jokers has 52 cards', () => {
    const deck = new Deck(0);
    expect(deck.cards.length).toBe(52);
});

