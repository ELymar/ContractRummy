const Hand = require('./Hand'); 

// Test new hand is empty
test('new hand is empty', () => {
    const hand = new Hand();
    expect(hand.cards.length).toBe(0);
}); 


// Test fromString for 3 cards
test('fromString for 3 cards', () => {
    const hand = Hand.fromString('[K♥][10♠][🃏]');
    expect(hand.cards.length).toBe(3);
    expect(hand.cards[0].toString()).toBe('[K♥]');
    expect(hand.cards[1].toString()).toBe('[10♠]');
    expect(hand.cards[2].toString()).toBe('[🃏]');
});

test('fromString for 11 cards', () => {
    const hand = Hand.fromString('[K♥][10♠][🃏][K♥][10♠][🃏][K♥][10♠][🃏][K♥][10♠]');
    expect(hand.cards.length).toBe(11);
    expect(hand.cards[0].toString()).toBe('[K♥]');
    expect(hand.cards[1].toString()).toBe('[10♠]');
    expect(hand.cards[2].toString()).toBe('[🃏]');
    expect(hand.cards[3].toString()).toBe('[K♥]');
    expect(hand.cards[4].toString()).toBe('[10♠]');
    expect(hand.cards[5].toString()).toBe('[🃏]');
    expect(hand.cards[6].toString()).toBe('[K♥]');
    expect(hand.cards[7].toString()).toBe('[10♠]');
    expect(hand.cards[8].toString()).toBe('[🃏]');
    expect(hand.cards[9].toString()).toBe('[K♥]');
    expect(hand.cards[10].toString()).toBe('[10♠]');
});

test('clear() empties the hand', () => {
    const hand = Hand.fromString('[K♥][10♠][🃏]');
    expect(hand.cards.length).toBe(3);
    
    hand.clear();
    expect(hand.cards.length).toBe(0);
});