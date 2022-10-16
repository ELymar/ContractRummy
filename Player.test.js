const Deck = require('./Deck.js');
const Player = require('./Player.js'); 

// Test that player drawing 5 cards has 5 unique cards
test('player drawing 5 cards has 5 unique cards', () => {
    const player = new Player('John'); 
    const deck = new Deck(2);
    player.draw(deck, 5);
    expect(player.hand.length).toBe(5);
    expect(new Set(player.hand).size).toBe(5);
    player.hand.forEach(card => {
        expect(deck.cards).not.toContain(card);
        console.log(card.toString())
    }); 
});

// Test that handToString returns a string of 4 cards when drawing 4
test('handToString returns a string of 4 cards when drawing 4', () => {
    const player = new Player('John'); 
    const deck = new Deck(2);
    player.draw(deck, 4);
    expect(player.handToString()).toBe('[3♦][2♦][🃏][🃏]');
}); 

// Test that after swapping first and last card handString returns correct order
test('after swapping first and last card handString returns correct order', () => {
    const player = new Player('John'); 
    const deck = new Deck(2);
    player.draw(deck, 4);
    player.swap(0, 3);
    expect(player.handToString()).toBe('[🃏][2♦][🃏][3♦]');
});