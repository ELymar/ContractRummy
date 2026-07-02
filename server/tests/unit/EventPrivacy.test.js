const GameEngine = require('../../src/core/engine/GameEngine');
const {ActionType} = require('../../src/core/engine/actions');
const Card = require('../../src/core/domain/Card');

/**
 * Regression: engine events are broadcast to every client, so a deck draw
 * must not carry the drawn card's identity. Discard-pile takes stay public
 * (the card was face up for everyone).
 */
describe('Event privacy', () => {
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
  });

  test('deck draw event does not reveal the drawn card', () => {
    const evts = engine.apply({type: ActionType.DRAW, playerId: 'p1', payload: {}});

    const drawn = evts.find((e) => e.type === 'CARD_DRAWN');
    expect(drawn).toBeDefined();
    expect(drawn.payload.playerId).toBe('p1');
    expect(drawn.payload.cardIds).toBeUndefined();
  });

  test('discard-pile take still reveals the (already public) card', () => {
    engine.state.burnPile.addCard(new Card('Hearts', 'Nine'));

    const evts = engine.apply({type: ActionType.TAKE_FROM_DISCARD, playerId: 'p1', payload: {}});

    const drawn = evts.find((e) => e.type === 'CARD_DRAWN');
    expect(drawn).toBeDefined();
    expect(drawn.payload.source).toBe('discard');
    expect(drawn.payload.cardIds).toHaveLength(1);
  });
});
