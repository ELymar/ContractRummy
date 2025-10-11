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

// test roundReset clears hand and resets flags
test('roundReset clears hand and resets flags', () => {
    const deck = new Deck(0);
    const player = new Player('test');
    
    // Give player some cards and set some flags
    player.draw(deck, 5);
    player.tookCard = true;
    player.isDown = true;
    player.discarded = true;
    player.isOut = true;
    
    expect(player.hand.cards.length).toBe(5);
    expect(player.tookCard).toBe(true);
    expect(player.isDown).toBe(true);
    expect(player.discarded).toBe(true);
    expect(player.isOut).toBe(true);
    
    // Reset for new round
    player.roundReset();
    
    expect(player.hand.cards.length).toBe(0);
    expect(player.tookCard).toBe(false);
    expect(player.isDown).toBe(false);
    expect(player.discarded).toBe(false);
    expect(player.isOut).toBe(false);
});

/*
// Give a new game state, test that player has 11 cards. Then after player discards they have 10 cards.
test('first discard test', () => {
    const gameState = generateNewGameState(); 

 */
