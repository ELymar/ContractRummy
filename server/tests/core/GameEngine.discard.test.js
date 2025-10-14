const GameEngine = require('../../src/core/engine/GameEngine');
const { ActionType } = require('../../src/core/engine/actions');

describe('GameEngine DISCARD', () => {
  test('discard moves a card to burn pile and requires END_TURN to rotate', () => {
    const engine = new GameEngine();
    engine.apply({ type: ActionType.JOIN, playerId: 'p1', payload: { name: 'P1' } });
    engine.apply({ type: ActionType.JOIN, playerId: 'p2', payload: { name: 'P2' } });
    engine.apply({ type: ActionType.READY, playerId: 'p1' });

    // It's p2's turn first (non-dealer)
    const p2 = engine.state.players[1];
    const initialP2Hand = p2.hand.cards.length;

    // First turn allows discard without draw
    const cardToDiscard = p2.hand.cards[0];
    const evts = engine.apply({ type: ActionType.DISCARD, playerId: 'p2', payload: { cardUuid: cardToDiscard.uuid } });
    expect(evts.some(e => e.type === 'CARD_DISCARDED')).toBe(true);
    expect(engine.state.burnPile.cards.length).toBe(1);
    expect(p2.hand.cards.length).toBe(initialP2Hand - 1);

    // Turn should not auto-rotate on discard; requires END_TURN
    expect(engine.state.currentPlayerIndex).toBe(1);
    engine.apply({ type: ActionType.END_TURN, playerId: 'p2' });
    expect(engine.state.currentPlayerIndex).toBe(0);
  });
});
