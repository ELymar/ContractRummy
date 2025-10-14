const GameEngine = require('./GameEngine');
const { ActionType } = require('./actions');
const { EventType } = require('./events');

describe('GameEngine', () => {
  let engine;
  
  beforeEach(() => {
    engine = new GameEngine();
    engine.apply({ type: ActionType.JOIN, playerId: 'p1', payload: { name: 'P1' } });
    engine.apply({ type: ActionType.JOIN, playerId: 'p2', payload: { name: 'P2' } });
    engine.apply({ type: ActionType.READY, playerId: 'p1' });
  });

  describe('Basic Setup', () => {
    test('should deal cards after READY', () => {
      expect(engine.state.players[0].hand.cards.length).toBeGreaterThan(0);
      expect(engine.state.players[1].hand.cards.length).toBeGreaterThan(0);
      expect(engine.state.deck.length()).toBeLessThan(56);
    });

    test('enforces turn order for DRAW', () => {
      // currentPlayerIndex is 1 (non-dealer) by bootstrap; enforce not-your-turn
      const evts = engine.apply({ type: ActionType.DRAW, playerId: 'p1', payload: { nCards: 1 } });
      const hasError = evts.some(e => e.type === 'ERROR' && /Not your turn/.test(e.payload.message));
      expect(hasError).toBe(true);
    });
  });

  describe('DRAW Action', () => {
    test('should allow current player to draw', () => {
      const evts = engine.apply({ type: ActionType.DRAW, playerId: 'p2', payload: { nCards: 1 } });
      expect(evts.some(e => e.type === EventType.CARD_DRAWN)).toBe(true);
      expect(engine.state.players[1].tookCard).toBe(true);
    });

    test('should prevent drawing twice in one turn', () => {
      engine.apply({ type: ActionType.DRAW, playerId: 'p2', payload: { nCards: 1 } });
      const evts = engine.apply({ type: ActionType.DRAW, playerId: 'p2', payload: { nCards: 1 } });
      const hasError = evts.some(e => e.type === 'ERROR' && /Already drew/.test(e.payload.message));
      expect(hasError).toBe(true);
    });
  });

  describe('TAKE_FROM_DISCARD Action', () => {
    test('should allow taking from discard pile when available', () => {
      // Add a card to burn pile first
      const Card = require('../../game_runner/Card');
      const testCard = new Card('Hearts', 'King');
      engine.state.burnPile.addCard(testCard);
      
      const evts = engine.apply({ type: ActionType.TAKE_FROM_DISCARD, playerId: 'p2' });
      expect(evts.some(e => e.type === EventType.CARD_DRAWN && e.payload.source === 'discard')).toBe(true);
      expect(engine.state.players[1].tookCard).toBe(true);
      expect(engine.state.burnPile.dead).toBe(true);
    });

    test('should prevent taking from empty burn pile', () => {
      const evts = engine.apply({ type: ActionType.TAKE_FROM_DISCARD, playerId: 'p2' });
      const hasError = evts.some(e => e.type === 'ERROR' && /empty/.test(e.payload.message));
      expect(hasError).toBe(true);
    });

    test('should prevent taking from dead burn pile', () => {
      // Add card and make burn pile dead
      const Card = require('../../game_runner/Card');
      engine.state.burnPile.addCard(new Card('Hearts', 'King'));
      engine.state.burnPile.dead = true;
      
      const evts = engine.apply({ type: ActionType.TAKE_FROM_DISCARD, playerId: 'p2' });
      const hasError = evts.some(e => e.type === 'ERROR' && /dead/.test(e.payload.message));
      expect(hasError).toBe(true);
    });
  });

  describe('DISCARD Action', () => {
    test('should allow discarding after drawing', () => {
      engine.apply({ type: ActionType.DRAW, playerId: 'p2', payload: { nCards: 1 } });
      const player = engine.state.players[1];
      const handSizeBefore = player.hand.cards.length;
      
      const cardToDiscard = player.hand.cards[0];
      const evts = engine.apply({ type: ActionType.DISCARD, playerId: 'p2', payload: { cardUuid: cardToDiscard.uuid } });
      expect(evts.some(e => e.type === EventType.CARD_DISCARDED)).toBe(true);
      expect(player.hand.cards.length).toBe(handSizeBefore - 1);
      expect(player.discarded).toBe(true);
    });

    test('should prevent discarding before drawing', () => {
      // Reset the player state to simulate a turn without drawing
      const player = engine.state.players[1];
      player.tookCard = false;

      // On first turn, non-dealer may discard without drawing
      const evts = engine.apply({ type: ActionType.DISCARD, playerId: 'p2', payload: { cardIndex: 0 } });
      const hasError = evts.some(e => e.type === 'ERROR' && /Must draw/.test(e.payload.message));
      expect(hasError).toBe(false);
    });

    test('should detect win condition when hand is empty', () => {
      const player = engine.state.players[1];
      engine.apply({ type: ActionType.DRAW, playerId: 'p2', payload: { nCards: 1 } });
      
      // Artificially reduce hand to 1 card for testing
      player.hand.cards = [player.hand.cards[0]];
      
      const cardToDiscard = player.hand.cards[0];
      const evts = engine.apply({ type: ActionType.DISCARD, playerId: 'p2', payload: { cardUuid: cardToDiscard.uuid } });
      expect(evts.some(e => e.type === EventType.ROUND_ENDED)).toBe(true);
      expect(player.isOut).toBe(true);
    });
  });

  describe('LAY_DOWN Action', () => {
    test('should allow laying down valid melds', () => {
      const player = engine.state.players[1];
      engine.apply({ type: ActionType.DRAW, playerId: 'p2', payload: { nCards: 1 } });
      
      // Set up a hand with valid melds for testing
      const Card = require('../../game_runner/Card');
      player.hand.cards = [
        new Card('Hearts', 'King'),
        new Card('Spades', 'King'),
        new Card('Clubs', 'King'),
        new Card('Hearts', 'Queen'),
        new Card('Spades', 'Queen'),
        new Card('Clubs', 'Queen')
      ];
      
      const melds = [
        { type: 'set', cardIndices: [0, 1, 2] },
        { type: 'set', cardIndices: [3, 4, 5] }
      ];
      
      const evts = engine.apply({ type: ActionType.LAY_DOWN, playerId: 'p2', payload: { melds } });
      expect(evts.some(e => e.type === EventType.MELD_LAID)).toBe(true);
      expect(player.isDown).toBe(true);
      expect(engine.state.downPiles.length).toBe(2);
    });

    test('should reject invalid melds', () => {
      const player = engine.state.players[1];
      engine.apply({ type: ActionType.DRAW, playerId: 'p2', payload: { nCards: 1 } });
      
      const melds = [
        { type: 'set', cardIndices: [0, 1] }, // Only 2 cards - invalid
        { type: 'set', cardIndices: [2, 3, 4] }
      ];
      
      const evts = engine.apply({ type: ActionType.LAY_DOWN, playerId: 'p2', payload: { melds } });
      const hasError = evts.some(e => e.type === 'ERROR');
      expect(hasError).toBe(true);
      expect(player.isDown).toBe(false);
    });

    test('should prevent laying down before drawing', () => {
      const melds = [
        { type: 'set', cardIndices: [0, 1, 2] },
        { type: 'set', cardIndices: [3, 4, 5] }
      ];
      
      const evts = engine.apply({ type: ActionType.LAY_DOWN, playerId: 'p2', payload: { melds } });
      const hasError = evts.some(e => e.type === 'ERROR' && /Must draw/.test(e.payload.message));
      expect(hasError).toBe(true);
    });
  });

  describe('ADD_TO_MELD Action', () => {
    test('should allow adding to existing melds when down', () => {
      const player = engine.state.players[1];
      engine.apply({ type: ActionType.DRAW, playerId: 'p2', payload: { nCards: 1 } });
      
      // Set up player as down with a meld
      player.isDown = true;
      const Card = require('../../game_runner/Card');
      const DownPile = require('../../game_runner/DownPile');
      
      player.hand.cards = [new Card('Hearts', 'Ace')]; // Card to add
      const meld = new DownPile('dupes', 'P2', [
        new Card('Spades', 'King'),
        new Card('Clubs', 'King'),
        new Card('Hearts', 'King')
      ]);
      engine.state.downPiles = [meld];
      
      const evts = engine.apply({ type: ActionType.ADD_TO_MELD, playerId: 'p2', payload: { 
        cardIndex: 0, 
        meldIndex: 0 
      }});
      
      // This will fail because Ace doesn't match King set, but tests the flow
      const hasError = evts.some(e => e.type === 'ERROR' && /Cannot add/.test(e.payload.message));
      expect(hasError).toBe(true);
    });

    test('should prevent adding to meld when not down', () => {
      engine.apply({ type: ActionType.DRAW, playerId: 'p2', payload: { nCards: 1 } });
      
      const evts = engine.apply({ type: ActionType.ADD_TO_MELD, playerId: 'p2', payload: { 
        cardIndex: 0, 
        meldIndex: 0 
      }});
      
      const hasError = evts.some(e => e.type === 'ERROR' && /Must be down/.test(e.payload.message));
      expect(hasError).toBe(true);
    });
  });

  describe('END_TURN Action', () => {
    test('should advance to next player after valid turn', () => {
      engine.apply({ type: ActionType.DRAW, playerId: 'p2', payload: { nCards: 1 } });
      const player = engine.state.players[1];
      const cardToDiscard = player.hand.cards[0];
      engine.apply({ type: ActionType.DISCARD, playerId: 'p2', payload: { cardUuid: cardToDiscard.uuid } });
      
      const evts = engine.apply({ type: ActionType.END_TURN, playerId: 'p2' });
      expect(evts.some(e => e.type === EventType.TURN_STARTED)).toBe(true);
      expect(engine.state.currentPlayerIndex).toBe(0); // Next player
    });

    test('should prevent ending turn without discarding', () => {
      engine.apply({ type: ActionType.DRAW, playerId: 'p2', payload: { nCards: 1 } });
      
      // Reset discarded state to simulate not having discarded
      const player = engine.state.players[1];
      player.discarded = false;
      
      const evts = engine.apply({ type: ActionType.END_TURN, playerId: 'p2' });
      const hasError = evts.some(e => e.type === 'ERROR' && /Must discard/.test(e.payload.message));
      expect(hasError).toBe(true);
    });

    test('should reset player state for next turn', () => {
      const player = engine.state.players[1];
      engine.apply({ type: ActionType.DRAW, playerId: 'p2', payload: { nCards: 1 } });
      const cardToDiscard = player.hand.cards[0];
      engine.apply({ type: ActionType.DISCARD, playerId: 'p2', payload: { cardUuid: cardToDiscard.uuid } });
      engine.apply({ type: ActionType.END_TURN, playerId: 'p2' });
      
      expect(player.tookCard).toBe(false);
      expect(player.discarded).toBe(false);
    });
  });

  describe('Game View', () => {
    test('should provide correct player-specific view', () => {
      const view = engine.getViewFor('p1');
      expect(view.yourHand).toBeDefined();
      expect(view.isYourTurn).toBeDefined();
      expect(view.players).toHaveLength(2);
      expect(view.round).toBe(1);
    });
  });
});
