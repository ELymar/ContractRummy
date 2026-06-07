const {
  findContract,
  findAddition,
  pickDiscardCard,
  discardHelps,
} = require('../../src/ai/handAnalysis');
const {getContractForRound} = require('../../src/core/rules/RoundContract');

let seq = 0;
const card = (value, suit) => ({value, suit, uuid: `${value}-${suit}-${seq++}`});
const joker = () => ({value: 'Joker', suit: 'Joker', uuid: `J-${seq++}`});

describe('findContract', () => {
  test('round 1: finds two sets of three', () => {
    const hand = [
      card('King', 'Hearts'), card('King', 'Spades'), card('King', 'Clubs'),
      card('Five', 'Hearts'), card('Five', 'Spades'), card('Five', 'Diamonds'),
      card('Two', 'Hearts'), card('Nine', 'Clubs'),
    ];
    const result = findContract(hand, getContractForRound(1));
    expect(result).not.toBeNull();
    expect(result.melds).toHaveLength(2);
    expect(result.melds.every((m) => m.type === 'set')).toBe(true);
    const used = result.melds.flatMap((m) => m.cardUuids);
    expect(new Set(used).size).toBe(6); // disjoint
  });

  test('round 2: finds a set of three and a run of four', () => {
    const hand = [
      card('Queen', 'Hearts'), card('Queen', 'Spades'), card('Queen', 'Clubs'),
      card('Five', 'Hearts'), card('Six', 'Hearts'), card('Seven', 'Hearts'), card('Eight', 'Hearts'),
      card('Two', 'Clubs'),
    ];
    const result = findContract(hand, getContractForRound(2));
    expect(result).not.toBeNull();
    const types = result.melds.map((m) => m.type).sort();
    expect(types).toEqual(['sequence', 'set'].sort());
  });

  test('uses two jokers for two sets that each need one', () => {
    // Regression: both joker-using sets must get DISTINCT jokers.
    const hand = [
      card('Seven', 'Diamonds'), card('Seven', 'Spades'), joker(),
      card('Nine', 'Spades'), card('Nine', 'Clubs'), joker(),
    ];
    const result = findContract(hand, getContractForRound(1));
    expect(result).not.toBeNull();
    expect(result.melds).toHaveLength(2);
    const used = result.melds.flatMap((m) => m.cardUuids);
    expect(new Set(used).size).toBe(6); // all six distinct, both jokers used
  });

  test('uses a joker to complete a run', () => {
    const hand = [
      card('Queen', 'Hearts'), card('Queen', 'Spades'), card('Queen', 'Clubs'),
      card('Five', 'Hearts'), card('Six', 'Hearts'), joker(), card('Eight', 'Hearts'),
    ];
    const result = findContract(hand, getContractForRound(2));
    expect(result).not.toBeNull();
  });

  test('returns null when the contract cannot be made', () => {
    const hand = [
      card('King', 'Hearts'), card('Two', 'Spades'), card('Five', 'Clubs'),
      card('Nine', 'Diamonds'), card('Jack', 'Hearts'), card('Three', 'Spades'),
    ];
    expect(findContract(hand, getContractForRound(1))).toBeNull();
  });
});

describe('findAddition', () => {
  const downPiles = [
    {type: 'sequence', owner: 'X', cards: [
      card('Five', 'Hearts'), card('Six', 'Hearts'), card('Seven', 'Hearts'), card('Eight', 'Hearts'),
    ]},
  ];

  test('appends the next card in a run', () => {
    const hand = [card('Nine', 'Hearts'), card('Two', 'Clubs')];
    const add = findAddition(hand, downPiles);
    expect(add).not.toBeNull();
    expect(add.meldIndex).toBe(0);
    expect(hand.find((c) => c.uuid === add.cardUuid).value).toBe('Nine');
  });

  test('returns null when nothing fits the end', () => {
    const hand = [card('Two', 'Clubs'), card('King', 'Diamonds')];
    expect(findAddition(hand, downPiles)).toBeNull();
  });
});

describe('pickDiscardCard / discardHelps', () => {
  test('discards the isolated card, not the pair', () => {
    const hand = [
      card('King', 'Hearts'), card('King', 'Spades'), // pair, keep
      card('Two', 'Diamonds'), // isolated low -> discard
    ];
    expect(pickDiscardCard(hand).value).toBe('Two');
  });

  test('never discards a joker when a natural exists', () => {
    const hand = [joker(), card('Two', 'Diamonds'), card('Nine', 'Clubs')];
    expect(pickDiscardCard(hand).value).not.toBe('Joker');
  });

  test('takes the discard when it pairs with the hand', () => {
    const hand = [card('King', 'Hearts'), card('Two', 'Clubs')];
    expect(discardHelps(card('King', 'Spades'), hand)).toBe(true);
    expect(discardHelps(card('Four', 'Diamonds'), hand)).toBe(false);
  });
});
