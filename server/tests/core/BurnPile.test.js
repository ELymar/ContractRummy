const BurnPile = require('../../src/core/domain/BurnPile');
const Card = require('../../src/core/domain/Card');

// Test that burn pile is not dead, can take
test('burn pile is not dead, can take', () => {
  const burnPile = new BurnPile();
  burnPile.addCard(new Card('K', '♥'));
  expect(burnPile.canTake()).toBe(true);
});

// Test that after taking burn pile is dead and can't take
test("after taking burn pile is dead and can't take", () => {
  const burnPile = new BurnPile();
  burnPile.addCard(new Card('K', '♥'));
  burnPile.addCard(new Card('Q', '♥'));
  burnPile.takeCard();
  expect(burnPile.canTake()).toBe(false);
});

// Test that addCard to burn card to pile makes card accessible
test('addCarding burn card to pile makes card accessible', () => {
  const burnPile = new BurnPile();
  burnPile.addCard(new Card('K', '♥'));
  expect(burnPile.cards.length).toBe(1);
  console.log(burnPile.topCard());
});

describe('Deck reshuffle functionality', () => {
  test('getAllExceptTop returns all cards except the top card', () => {
    const burnPile = new BurnPile();
    burnPile.addCard(new Card('Hearts', 'King'));
    burnPile.addCard(new Card('Hearts', 'Queen'));
    burnPile.addCard(new Card('Hearts', 'Jack'));

    const cardsForReshuffle = burnPile.getAllExceptTop();

    expect(cardsForReshuffle.length).toBe(2);
    expect(burnPile.cards.length).toBe(1);
    expect(burnPile.topCard().toString()).toBe('[J♥]');
  });

  test('getAllExceptTop returns empty array when only one card', () => {
    const burnPile = new BurnPile();
    burnPile.addCard(new Card('Hearts', 'King'));

    const cardsForReshuffle = burnPile.getAllExceptTop();

    expect(cardsForReshuffle.length).toBe(0);
    expect(burnPile.cards.length).toBe(1);
    expect(burnPile.topCard().toString()).toBe('[K♥]');
  });

  test('getAllExceptTop returns empty array when no cards', () => {
    const burnPile = new BurnPile();

    const cardsForReshuffle = burnPile.getAllExceptTop();

    expect(cardsForReshuffle.length).toBe(0);
    expect(burnPile.cards.length).toBe(0);
  });

  test('hasCardsForReshuffle returns true when more than one card', () => {
    const burnPile = new BurnPile();
    burnPile.addCard(new Card('Hearts', 'King'));
    burnPile.addCard(new Card('Hearts', 'Queen'));

    expect(burnPile.hasCardsForReshuffle()).toBe(true);
  });

  test('hasCardsForReshuffle returns false when only one card', () => {
    const burnPile = new BurnPile();
    burnPile.addCard(new Card('Hearts', 'King'));

    expect(burnPile.hasCardsForReshuffle()).toBe(false);
  });

  test('hasCardsForReshuffle returns false when no cards', () => {
    const burnPile = new BurnPile();

    expect(burnPile.hasCardsForReshuffle()).toBe(false);
  });
});
