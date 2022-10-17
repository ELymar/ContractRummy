const BurnPile = require('./BurnPile');
const Card = require('./Card');

// Test that burn pile is not dead, can take
test('burn pile is not dead, can take', () => {
    const burnPile = new BurnPile();
    burnPile.add(new Card('K', '♥'));
    expect(burnPile.canTake()).toBe(true);
});

// Test that after taking burn pile is dead and can't take
test('after taking burn pile is dead and can\'t take', () => {
    const burnPile = new BurnPile();
    burnPile.add(new Card('K', '♥'));
    burnPile.add(new Card('Q', '♥'));
    burnPile.take();
    expect(burnPile.canTake()).toBe(false);
});

