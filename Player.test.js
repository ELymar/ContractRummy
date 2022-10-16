const Deck = require('./Deck.js');
const Player = require('./Player.js'); 

// test draw 5 cards
test('draw 5 cards', () => {
    const deck = new Deck(0);
    const player = new Player('test');
    player.draw(deck, 5);
    expect(player.hand.cards.length).toBe(5);
    expect(deck.cards.length).toBe(47);
});

