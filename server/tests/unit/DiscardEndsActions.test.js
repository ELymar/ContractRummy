const GameEngine = require('../../src/core/engine/GameEngine');
const {ActionType} = require('../../src/core/engine/actions');
const Card = require('../../src/core/domain/Card');
const DownPile = require('../../src/core/domain/DownPile');

/**
 * Regression tests: the discard ends a player's actions for the turn.
 * Previously LAY_DOWN, ADD_TO_MELD and even a second DISCARD were accepted
 * after discarding (a player could discard their whole hand in one turn).
 */
describe('Discard ends the turn actions', () => {
  let engine;
  let player;

  beforeEach(() => {
    engine = new GameEngine({rng: () => 0.5});
    engine.apply({type: ActionType.JOIN, playerId: 'p1', payload: {name: 'Player 1'}});
    engine.apply({type: ActionType.JOIN, playerId: 'p2', payload: {name: 'Player 2'}});
    engine.apply({type: ActionType.READY, playerId: 'p1'});

    player = engine.state.players.find((p) => p.id === 'p1');
    engine.state.currentPlayerIndex = engine.state.players.indexOf(player);
    engine.state.firstTurn = false;
    player.tookCard = true; // skip the draw phase
  });

  function discardFirstCard() {
    return engine.apply({
      type: ActionType.DISCARD,
      playerId: 'p1',
      payload: {cardUuid: player.hand.cards[0].uuid},
    });
  }

  function expectError(evts, pattern) {
    const error = evts.find((e) => e.type === 'ERROR');
    expect(error).toBeDefined();
    expect(error.payload.message).toMatch(pattern);
  }

  test('rejects a second discard in the same turn', () => {
    discardFirstCard();
    const handSizeAfterFirst = player.hand.cards.length;

    const evts = discardFirstCard();

    expectError(evts, /already discarded/i);
    expect(player.hand.cards.length).toBe(handSizeAfterFirst);
  });

  test('rejects LAY_DOWN after discarding', () => {
    // Give the player a valid round-1 contract (2 sets of 3) plus a discard card.
    const set1 = [new Card('Hearts', 'Seven'), new Card('Spades', 'Seven'), new Card('Clubs', 'Seven')];
    const set2 = [new Card('Hearts', 'King'), new Card('Spades', 'King'), new Card('Clubs', 'King')];
    player.hand.cards = [...set1, ...set2, new Card('Diamonds', 'Two')];

    engine.apply({
      type: ActionType.DISCARD,
      playerId: 'p1',
      payload: {cardUuid: player.hand.cards[6].uuid},
    });

    const evts = engine.apply({
      type: ActionType.LAY_DOWN,
      playerId: 'p1',
      payload: {
        melds: [
          {type: 'set', cardUuids: set1.map((c) => c.uuid)},
          {type: 'set', cardUuids: set2.map((c) => c.uuid)},
        ],
      },
    });

    expectError(evts, /after discarding/i);
    expect(player.isDown).toBe(false);
    expect(engine.state.downPiles.length).toBe(0);
  });

  test('rejects ADD_TO_MELD after discarding', () => {
    // Player is down with a meld of sevens on the table and a fourth seven in hand.
    player.isDown = true;
    engine.state.downPiles.push(
      new DownPile('dupes', 'Player 1', [
        new Card('Hearts', 'Seven'), new Card('Spades', 'Seven'), new Card('Clubs', 'Seven'),
      ])
    );
    const seven = new Card('Diamonds', 'Seven');
    player.hand.cards = [seven, new Card('Hearts', 'Two'), new Card('Spades', 'Three')];

    engine.apply({
      type: ActionType.DISCARD,
      playerId: 'p1',
      payload: {cardUuid: player.hand.cards[1].uuid},
    });

    const evts = engine.apply({
      type: ActionType.ADD_TO_MELD,
      playerId: 'p1',
      payload: {cardUuid: seven.uuid, meldIndex: 0},
    });

    expectError(evts, /after discarding/i);
    expect(engine.state.downPiles[0].cards.length).toBe(3);
  });

  test('valid actions after discarding are only END_TURN, SORT and QUIT', () => {
    discardFirstCard();

    const actions = engine.getValidActionsFor('p1');

    expect(actions).toContain('END_TURN');
    expect(actions).not.toContain('DISCARD');
    expect(actions).not.toContain('LAY_DOWN');
    expect(actions).not.toContain('ADD_TO_MELD');
    expect(actions).not.toContain('DRAW');
  });

  test('END_TURN is still rejected without a discard', () => {
    const evts = engine.apply({type: ActionType.END_TURN, playerId: 'p1'});
    expectError(evts, /must discard/i);
  });
});
