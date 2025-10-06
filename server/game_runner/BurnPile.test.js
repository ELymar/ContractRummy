const BurnPile = require('./BurnPile');
const Card = require('./Card');

// Test that burn pile is not dead, can take
test('burn pile is not dead, can take', () => {
    const burnPile = new BurnPile();
    burnPile.addCard(new Card('K', '♥'));
    expect(burnPile.canTake()).toBe(true);
});

// Test that after taking burn pile is dead and can't take
test('after taking burn pile is dead and can\'t take', () => {
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