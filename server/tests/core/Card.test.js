// Test card
const Card = require('../../src/core/domain/Card');
const Constants = require('../../src/shared/Constants');

test('King of hearts toString is [K♥]', () => {
  const card = new Card('Hearts', 'King');
  expect(card.toString()).toBe('[K♥]');
});

test('Joker toString is [🃏]', () => {
  const card = new Card();
  expect(card.toString()).toBe('[🃏]');
});

// Test static fromString
test('fromString [K♥] returns King of Hearts', () => {
  const card = Card.fromString('[K♥]');
  expect(card.suit).toBe('Hearts');
  expect(card.value).toBe('King');
});

// 10 of spades
test('fromString [10♠] returns 10 of Spades', () => {
  const card = Card.fromString('[10♠]');
  expect(card.suit).toBe('Spades');
  expect(card.value).toBe('Ten');
});

// Joker
test('fromString [🃏] returns Joker', () => {
  const card = Card.fromString('[🃏]');
  expect(card.suit).toBe('Joker');
  expect(card.value).toBe('Joker');
});

// Test all 52 cards
test('fromString for all 52 cards', () => {
  let count = 0;
  for (const suit of Constants.SUITS.slice(0, 4)) {
    for (const value of Constants.VALUES) {
      count += 1;
      const emojiString = `[${Constants.VALUE_TO_EMOJI_MAP.get(value)}${Constants.SUIT_TO_EMOJI_MAP.get(suit)}]`;
      const card = Card.fromString(emojiString);
      expect(card.suit).toBe(suit);
      expect(card.value).toBe(value);
    }
  }
  expect(count).toBe(52);
});
