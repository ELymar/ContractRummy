const DownPile = require('../../src/core/domain/DownPile');
const Card = require('../../src/core/domain/Card');
const Player = require('../../src/core/domain/Player');

const buildDupes  = () => {
    const cards = [
        Card.fromString('[K♥]'),
        Card.fromString('[K♠]'),
        Card.fromString('[K♦]')
    ];
    const player = new Player('Player 1');
    const downPile = new DownPile('dupes', player.name, cards);
    return downPile
}

const buildSequence = () => {
    const cards = [
        Card.fromString('[6♥]'),
        Card.fromString('[7♥]'),
        Card.fromString('[8♥]'),
        Card.fromString('[9♥]')
    ]
    const player = new Player('Player 1');
    const downPile = new DownPile('sequence', player.name, cards);
    return downPile;
}

// Test that downpile can be created with dupes
test('downpile can be created with dupes', () => {
    // three kings
    const cards = [
        Card.fromString('[K♥]'),
        Card.fromString('[K♠]'),
        Card.fromString('[K♦]')
    ];
    const player = new Player('Player 1');
    const downPile = new DownPile('dupes', player.name, cards);
    expect(downPile.getCards()).toBe('[K♥][K♠][K♦]');
});

// test that downpile can add fourth king
test('downpile can add fourth king', () => {
    const downPile = buildDupes();
    downPile.addCard(Card.fromString('[K♣]'), 0);
    expect(downPile.getCards()).toBe('[K♣][K♥][K♠][K♦]');
});

// test downpile can add fourth king in middle
test('downpile can add fourth king in middle', () => {
    const downPile = buildDupes();
    downPile.addCard(Card.fromString('[K♣]'), 1);
    expect(downPile.getCards()).toBe('[K♥][K♣][K♠][K♦]');
});

// test downpile can add fourth king at the end
test('downpile can add fourth king at the end', () => {
    const downPile = buildDupes();
    downPile.addCard(Card.fromString('[K♣]'), 3);
    expect(downPile.getCards()).toBe('[K♥][K♠][K♦][K♣]');
});

// test that adding a 10 to king dupes returns false
test('adding a 10 to king dupes returns false', () => {
    const downPile = buildDupes();
    expect(downPile.addCard(Card.fromString('[10♥]'), 0)).toBe(false);
});

// test that adding a joker to king dupes works
test('adding a joker to king dupes works', () => {
    const downPile = buildDupes();
    downPile.addCard(Card.fromString('[🃏]'), 0); 
    expect(downPile.getCards()).toBe('[🃏][K♥][K♠][K♦]');
});

// test that adding a joker to king dupes works
test('adding a joker to king dupes works', () => {
    const downPile = buildDupes();
    downPile.addCard(Card.fromString('[🃏]'), 2); 
    expect(downPile.getCards()).toBe('[K♥][K♠][🃏][K♦]');
});

// Test that sequence constructor doesn't throw error
test('sequence constructor doesn\'t throw error', () => {
    const cards = [
        Card.fromString('[6♥]'),
        Card.fromString('[7♥]'),
        Card.fromString('[8♥]'),
        Card.fromString('[9♥]')
    ];
    const player = new Player('Player 1');
    const downPile = new DownPile('sequence', player.name, cards);
    expect(downPile.getCards()).toBe('[6♥][7♥][8♥][9♥]');
});

// Test that adding a 10 to end of sequence works
test('adding a 10 to end of sequence works', () => {
    const downPile = buildSequence();
    expect(downPile.addCard(Card.fromString('[10♥]'), 4)).toBe(true); 
    expect(downPile.getCards()).toBe('[6♥][7♥][8♥][9♥][10♥]');
});

// Test that adding a 5 at the beginning works
test('adding a 5 at the beginning works', () => {
    const downPile = buildSequence();
    expect(downPile.addCard(Card.fromString('[5♥]'), 0)).toBe(true); 
    expect(downPile.getCards()).toBe('[5♥][6♥][7♥][8♥][9♥]');
});

// Test that adding a 4 at beginning doesn't work
test('adding a 4 at beginning doesn\'t work', () => {
    const downPile = buildSequence();
    expect(downPile.addCard(Card.fromString('[4♥]'), 0)).toBe(false); 
});

// test that adding a joker to the end works
test('adding a joker to the end works', () => {
    const downPile = buildSequence();
    downPile.addCard(Card.fromString('[🃏]'), 4); 
    expect(downPile.getCards()).toBe('[6♥][7♥][8♥][9♥][🃏]');
}); 

// given 2, 3, joker, 5, check that replaceJoker with suited 4 works (move joker to front after)
test('replaceJoker with suited 4 works', () => {
    const cards = [
        Card.fromString('[2♥]'),
        Card.fromString('[3♥]'),
        Card.fromString('[🃏]'),
        Card.fromString('[5♥]')
    ];
    const player = new Player('Player 1');
    const downPile = new DownPile('sequence', player.name, cards);
    expect(downPile.replaceJoker(Card.fromString('[4♥]'), 2, true)).toBe(true);
    expect(downPile.getCards()).toBe('[🃏][2♥][3♥][4♥][5♥]');
});

// given 2, 3, joker, 5, check that replaceJoker with suited 4 works (move joker to back after)
test('replaceJoker with suited 4 works', () => {
    const cards = [
        Card.fromString('[2♥]'),
        Card.fromString('[3♥]'),
        Card.fromString('[🃏]'),
        Card.fromString('[5♥]')
    ];
    const player = new Player('Player 1');
    const downPile = new DownPile('sequence', player.name, cards);
    expect(downPile.replaceJoker(Card.fromString('[4♥]'), 2, false)).toBe(true);
    expect(downPile.getCards()).toBe('[2♥][3♥][4♥][5♥][🃏]');
});