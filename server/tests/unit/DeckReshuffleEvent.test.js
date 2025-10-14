const GameEngine = require('../../src/core/engine/GameEngine');
const {ActionType} = require('../../src/core/engine/actions');
const {EventType} = require('../../src/core/engine/events');
const Card = require('../../src/core/domain/Card');

describe('Deck Reshuffle Event Tests', () => {
  let engine;

  beforeEach(() => {
    // Use a deterministic RNG for consistent tests
    const deterministicRng = () => 0.5;
    engine = new GameEngine({rng: deterministicRng});

    // Set up a basic game with two players
    engine.apply({type: ActionType.JOIN, playerId: 'player1', payload: {name: 'Player 1'}});
    engine.apply({type: ActionType.JOIN, playerId: 'player2', payload: {name: 'Player 2'}});
    engine.apply({type: ActionType.READY, playerId: 'player1'});
    engine.apply({type: ActionType.READY, playerId: 'player2'});
  });

  test('should emit DECK_RESHUFFLED event when deck runs out and burn pile is reshuffled', () => {
    // Simulate a nearly empty deck - draw most cards
    const deckSize = engine.state.deck.length();
    engine.state.deck.draw(deckSize - 2); // Leave only 2 cards in deck

    // Add cards to burn pile to enable reshuffle
    engine.state.burnPile.addCard(new Card('Hearts', 'Ace'));
    engine.state.burnPile.addCard(new Card('Spades', 'King'));
    engine.state.burnPile.addCard(new Card('Diamonds', 'Queen'));
    engine.state.burnPile.addCard(new Card('Clubs', 'Jack')); // This becomes the top card

    // Use the current player (player2 based on currentPlayerIndex: 1)
    const currentPlayerId = engine.state.players[engine.state.currentPlayerIndex].id;

    // Draw cards that will trigger reshuffle (more than available in deck)
    const events = engine.apply({
      type: ActionType.DRAW,
      playerId: currentPlayerId,
      payload: {nCards: 5},
    });

    // Check that a DECK_RESHUFFLED event was emitted
    const reshuffleEvent = events.find((evt) => evt.type === EventType.DECK_RESHUFFLED);
    expect(reshuffleEvent).toBeDefined();
    expect(reshuffleEvent.payload.cardsReshuffled).toBe(3); // 3 cards were moved from burn pile

    // Also check that CARD_DRAWN event was emitted
    const cardDrawnEvent = events.find((evt) => evt.type === EventType.CARD_DRAWN);
    expect(cardDrawnEvent).toBeDefined();
    expect(cardDrawnEvent.payload.playerId).toBe(currentPlayerId);
    expect(cardDrawnEvent.payload.n).toBe(5);
  });

  test('should not emit DECK_RESHUFFLED event when deck has enough cards', () => {
    // Draw just one card when deck has plenty
    const currentPlayerId = engine.state.players[engine.state.currentPlayerIndex].id;
    const events = engine.apply({
      type: ActionType.DRAW,
      playerId: currentPlayerId,
      payload: {nCards: 1},
    });

    // Should not have a reshuffle event
    const reshuffleEvent = events.find((evt) => evt.type === EventType.DECK_RESHUFFLED);
    expect(reshuffleEvent).toBeUndefined();

    // But should still have the card drawn event
    const cardDrawnEvent = events.find((evt) => evt.type === EventType.CARD_DRAWN);
    expect(cardDrawnEvent).toBeDefined();
  });

  test('should not emit DECK_RESHUFFLED event when burn pile has insufficient cards for reshuffle', () => {
    // Empty the deck almost completely
    const deckSize = engine.state.deck.length();
    engine.state.deck.draw(deckSize - 1); // Leave only 1 card

    // Add only one card to burn pile (not enough for reshuffle since top card must stay)
    engine.state.burnPile.addCard(new Card('Hearts', 'Ace')); // Only card, becomes top card

    // Try to draw 2 cards - should fail due to insufficient cards even after checking reshuffle
    const currentPlayerId = engine.state.players[engine.state.currentPlayerIndex].id;
    expect(() => {
      engine.apply({
        type: ActionType.DRAW,
        playerId: currentPlayerId,
        payload: {nCards: 2},
      });
    }).toThrow();
  });

  test('should emit reshuffle event with correct card count', () => {
    // Set up specific scenario
    engine.state.deck.draw(engine.state.deck.length() - 1); // Leave 1 card

    // Add exactly 5 cards to burn pile
    engine.state.burnPile.addCard(new Card('Hearts', 'Ace'));
    engine.state.burnPile.addCard(new Card('Hearts', '2'));
    engine.state.burnPile.addCard(new Card('Hearts', '3'));
    engine.state.burnPile.addCard(new Card('Hearts', '4'));
    engine.state.burnPile.addCard(new Card('Hearts', '5')); // Top card

    const currentPlayerId = engine.state.players[engine.state.currentPlayerIndex].id;
    const events = engine.apply({
      type: ActionType.DRAW,
      playerId: currentPlayerId,
      payload: {nCards: 3},
    });

    const reshuffleEvent = events.find((evt) => evt.type === EventType.DECK_RESHUFFLED);
    expect(reshuffleEvent).toBeDefined();
    expect(reshuffleEvent.payload.cardsReshuffled).toBe(4); // 4 cards reshuffled (top card stays)
  });
});
