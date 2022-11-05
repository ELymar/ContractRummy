const Deck = require('./Deck.js');
const Player = require('./Player.js'); 
const GameState= require('./GameState');

const generateNewGameState = () => {
    const gameState = new GameState();
    gameState.initialize();
    return gameState;
}

// test draw 5 cards
test('draw 5 cards', () => {
    const deck = new Deck(0);
    const player = new Player('test');
    player.draw(deck, 5);
    expect(player.hand.cards.length).toBe(5);
    expect(deck.cards.length).toBe(47);
});

/*
// Give a new game state, test that player has 11 cards. Then after player discards they have 10 cards.
test('first discard test', () => {
    const gameState = generateNewGameState(); 

 */
