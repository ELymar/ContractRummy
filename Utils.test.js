const {isValidSequence, isValidStraight} = require('./Utils')
const Hand = require('./Hand');

// Check that 2-5 of same suit is a sequence
test('2-5 of same suit is a sequence', () => {
    handString = '[2♠][3♠][4♠][5♠]'; 
    const hand = Hand.fromString(handString);
    expect(isValidSequence(hand.cards)).toBe(true);
});

test ('2, 3, 4, 6 of same suit not to be a sequence', () => {
    handString = '[2♠][3♠][4♠][6♠]';
    const hand = Hand.fromString(handString);
    expect(isValidSequence(hand.cards)).toBe(false);
});

test ('2, 3, 4, 5 of different suits not to be a sequence', () => {
    handString = '[2♠][3♠][4♠][5♥]';
    const hand = Hand.fromString(handString);
    expect(isValidSequence(hand.cards)).toBe(false);
});

test ('2, 3, 4, 5, 6 of same suit to be a sequence', () => {
    handString = '[2♠][3♠][4♠][5♠][6♠]';
    const hand = Hand.fromString(handString);
    expect(isValidSequence(hand.cards)).toBe(true);
});


// test that joker acts as wildcard to fill in sequence
test ('2, 3, Joker, 5 of same suit to be a sequence', () => {
    handString = '[2♠][3♠][🃏][5♠]';
    const hand = Hand.fromString(handString);
    expect(isValidSequence(hand.cards)).toBe(true);
});

// test that two jokers act as wildcard to fill in sequence
test ('2, 3, Joker, Joker, 6 of same suit to be a sequence', () => {
    handString = '[2♠][3♠][🃏][🃏][6♠]';
    const hand = Hand.fromString(handString);
    expect(isValidSequence(hand.cards)).toBe(true);
});

// test that starting and ending with joker sequence works
test ('Joker, 3, 4, 5, Joker of same suit to be a sequence', () => {
    handString = '[🃏][3♠][4♠][5♠][🃏]';
    const hand = Hand.fromString(handString);
    expect(isValidSequence(hand.cards)).toBe(true);
});

