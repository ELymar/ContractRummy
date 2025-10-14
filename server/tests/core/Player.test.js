const Player = require('../../src/core/domain/Player.js');
const Card = require('../../src/core/domain/Card.js');

// Test basic player construction and properties
test('player creation and basic properties', () => {
  const player = new Player('test');
  expect(player.name).toBe('test');
  expect(player.hand.cards.length).toBe(0);
  expect(player.isDown).toBe(false);
  expect(player.tookCard).toBe(false);
  expect(player.discarded).toBe(false);
  expect(player.isOut).toBe(false);
});

// Test adding cards to hand manually (since draw method was moved to UI layer)
test('add cards to hand', () => {
  const player = new Player('test');
  const card1 = new Card('Hearts', 'King');
  const card2 = new Card('Spades', 'Ace');

  player.hand.addCard(card1);
  player.hand.addCard(card2);

  expect(player.hand.cards.length).toBe(2);
  expect(player.hand.cards[0]).toBe(card1);
  expect(player.hand.cards[1]).toBe(card2);
});

// Test roundReset clears flags and hand
test('roundReset clears flags and hand', () => {
  const player = new Player('test');

  // Add a card and set some flags
  const card = new Card('Hearts', 'King');
  player.hand.addCard(card);
  player.tookCard = true;
  player.isDown = true;
  player.discarded = true;
  player.isOut = true;

  expect(player.hand.cards.length).toBe(1);
  expect(player.tookCard).toBe(true);
  expect(player.isDown).toBe(true);
  expect(player.discarded).toBe(true);
  expect(player.isOut).toBe(true);

  // Reset for new round
  player.roundReset();

  expect(player.name).toBe('test'); // Name should remain
  expect(player.hand.cards.length).toBe(0); // Hand should be cleared
  expect(player.tookCard).toBe(false);
  expect(player.isDown).toBe(false);
  expect(player.discarded).toBe(false);
  expect(player.isOut).toBe(false);
});

// Test toString method
test('toString returns player info', () => {
  const player = new Player('Alice');
  const card = new Card('Hearts', 'King');
  player.hand.addCard(card);

  expect(player.toString()).toBe('Alice: [K♥]');
});
