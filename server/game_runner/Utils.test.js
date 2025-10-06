const {isValidSequence, isValidDupes} = require('./Utils')
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

// test that if 3 jokers and 1 base card, not a sequence
test ('Joker, 3, Joker, Joker of same suit not to be a sequence', () => {
    handString = '[🃏][3♠][🃏][🃏]';
    const hand = Hand.fromString(handString);
    expect(isValidSequence(hand.cards)).toBe(false);
});

// test that starting with Ace and followed by 2 is sequence
test ('Ace, 2, 3, 4 of same suit to be a sequence', () => {
    handString = '[A♠][2♠][3♠][4♠]';
    const hand = Hand.fromString(handString);
    expect(isValidSequence(hand.cards)).toBe(true);
});

// Test taht ending with an ace preceeded by a king is a sequence
test ('Jack, Queen, King, Ace of same suit to be a sequence', () => {
    handString = '[J♠][Q♠][K♠][A♠]';
    const hand = Hand.fromString(handString);
    expect(isValidSequence(hand.cards)).toBe(true);
});

// Test that King Queen Ace 2 of same suit is NOT a sequence
test ('King, Queen, Ace, 2 of same suit not to be a sequence', () => {
    handString = '[K♠][Q♠][A♠][2♠]';
    const hand = Hand.fromString(handString);
    expect(isValidSequence(hand.cards)).toBe(false);
});

// How to check K, Joker, 2, 3 is NOT a sequence
test ('King, Joker, 2, 3 of same suit not to be a sequence', () => {
    handString = '[K♠][🃏][2♠][3♠]';
    const hand = Hand.fromString(handString);
    expect(isValidSequence(hand.cards)).toBe(false);
});

// Test that Jack, Queen, Joker, Joker, Joker, 3 is not a sequence
test ('Jack, Queen, Joker, Joker, Joker, 3 of same suit not to be a sequence', () => {
    handString = '[J♠][Q♠][🃏][🃏][🃏][3♠]';
    const hand = Hand.fromString(handString);
    expect(isValidSequence(hand.cards)).toBe(false);
});

// test that length 3 sequence is not a sequence
test ('2, 3, 4 of same suit not to be a sequence', () => {
    handString = '[2♠][3♠][4♠]';
    const hand = Hand.fromString(handString);
    expect(isValidSequence(hand.cards)).toBe(false);
});

// test that two cards won't be dupes
test ('3 of hearts, 3 of spades not dupes', () => {
    handString = '[3♥][3♠]';
    const hand = Hand.fromString(handString);
    expect(isValidDupes(hand.cards)).toBe(false);
});

// test that 2 jokers and a 4 is an invalid dupe
test ('Joker, Joker, 4 of hearts not dupes', () => {
    handString = '[🃏][🃏][4♥]';
    const hand = Hand.fromString(handString);
    expect(isValidDupes(hand.cards)).toBe(false);
}); 

// test that 3 7's is a dupe
test ('7 of hearts, 7 of spades, 7 of clubs is dupes', () => {
    handString = '[7♥][7♠][7♣]';
    const hand = Hand.fromString(handString);
    expect(isValidDupes(hand.cards)).toBe(true);
});

// test that 2 queens and a joker is a dupe
test ('Queen of hearts, Queen of spades, Joker is dupes', () => {
    handString = '[Q♥][Q♠][🃏]';
    const hand = Hand.fromString(handString);
    expect(isValidDupes(hand.cards)).toBe(true);
});

// test that 4 aces and a joker is a dupe
test ('Ace of hearts, Ace of spades, Ace of clubs, Ace of diamonds, Joker is dupes', () => {
    handString = '[A♥][A♠][A♣][A♦][🃏]';
    const hand = Hand.fromString(handString);
    expect(isValidDupes(hand.cards)).toBe(true);
});

// test that 1 king and 2 queens is not a dupe
test ('King of hearts, Queen of spades, Queen of clubs is not dupes', () => {   
    handString = '[K♥][Q♠][Q♣]';
    const hand = Hand.fromString(handString);
    expect(isValidDupes(hand.cards)).toBe(false);
}); 