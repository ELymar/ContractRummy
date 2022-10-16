// Test card
const Card = require('./Card');

test('King of hearts toString is [K♥]', () => {
    const card = new Card('Hearts', 'King');
    expect(card.toString()).toBe('[K♥]');
});

test('Joker toString is [🃏]', () => {
    const card = new Card();
    expect(card.toString()).toBe('[🃏]');
});