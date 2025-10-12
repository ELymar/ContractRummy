const GameEngine = require('../../core/engine/GameEngine');
const { ActionType } = require('../../core/engine/actions');
const seedrandom = require('seedrandom');

// Regression test: basic-game-start (engine)
// Original log: 84c95dd3-86e7-4097-8efb-4d2e00ae5ecd.json
// Recorded: 2025-10-12T15:43:15.160Z

describe('regression-basic-game-start-engine', () => {
  let engine;
  
  beforeEach(() => {
    // Initialize with deterministic seed for reproducibility
    engine = new GameEngine({ rng: seedrandom('84c95dd3') });
  });

  test('should replay recorded game successfully', async () => {
    // Step 1: Player Player 1 joins the game
    {
      const events = engine.apply({
      "payload": {
            "name": "Player 1"
      },
      "playerId": "1760283796180-735741cac5494",
      "type": "JOIN"
});
      
      // Verify expected events were emitted
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toEqual(expect.arrayContaining(['PLAYER_JOINED']));
      
      // Verify game state assertions
            expect(engine.state.deck.length()).toBe(56);
      expect(engine.state.burnPile.cards.length).toBe(0);
      expect(engine.state.downPiles.length).toBe(0);
      expect(engine.state.players).toHaveLength(1);
      expect(engine.state.players[0].id).toBe('1760283796180-735741cac5494');
      expect(engine.state.players[0].hand.cards.length).toBe(0);
      expect(engine.state.players[0].isDown).toBe(false);
      expect(engine.state.players[0].tookCard).toBe(false);
      expect(engine.state.players[0].discarded).toBe(false);
      expect(engine.state.players[0].isOut).toBe(false);
    }
    // Step 2: Player 1760283796180-735741cac5494 readies up
    {
      const events = engine.apply({
      "payload": {},
      "playerId": "1760283796180-735741cac5494",
      "type": "READY"
});
      
      // Verify expected events were emitted
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toEqual(expect.arrayContaining([]));
      
      // Verify game state assertions
            expect(engine.state.deck.length()).toBe(56);
      expect(engine.state.burnPile.cards.length).toBe(0);
      expect(engine.state.downPiles.length).toBe(0);
      expect(engine.state.players).toHaveLength(1);
      expect(engine.state.players[0].id).toBe('1760283796180-735741cac5494');
      expect(engine.state.players[0].hand.cards.length).toBe(0);
      expect(engine.state.players[0].isDown).toBe(false);
      expect(engine.state.players[0].tookCard).toBe(false);
      expect(engine.state.players[0].discarded).toBe(false);
      expect(engine.state.players[0].isOut).toBe(false);
    }
    // Step 3: Player Player 2 joins the game
    {
      const events = engine.apply({
      "payload": {
            "name": "Player 2"
      },
      "playerId": "1760283796184-f202401d1261f",
      "type": "JOIN"
});
      
      // Verify expected events were emitted
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toEqual(expect.arrayContaining(['PLAYER_JOINED']));
      
      // Verify game state assertions
            expect(engine.state.deck.length()).toBe(56);
      expect(engine.state.burnPile.cards.length).toBe(0);
      expect(engine.state.downPiles.length).toBe(0);
      expect(engine.state.players).toHaveLength(2);
      expect(engine.state.players[0].id).toBe('1760283796180-735741cac5494');
      expect(engine.state.players[0].hand.cards.length).toBe(0);
      expect(engine.state.players[0].isDown).toBe(false);
      expect(engine.state.players[0].tookCard).toBe(false);
      expect(engine.state.players[0].discarded).toBe(false);
      expect(engine.state.players[0].isOut).toBe(false);
      expect(engine.state.players[1].id).toBe('1760283796184-f202401d1261f');
      expect(engine.state.players[1].hand.cards.length).toBe(0);
      expect(engine.state.players[1].isDown).toBe(false);
      expect(engine.state.players[1].tookCard).toBe(false);
      expect(engine.state.players[1].discarded).toBe(false);
      expect(engine.state.players[1].isOut).toBe(false);
    }
    // Step 4: Player 1760283796184-f202401d1261f readies up
    {
      const events = engine.apply({
      "payload": {},
      "playerId": "1760283796184-f202401d1261f",
      "type": "READY"
});
      
      // Verify expected events were emitted
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toEqual(expect.arrayContaining(['GAME_STARTED', 'TURN_STARTED']));
      
      // Verify game state assertions
            expect(engine.state.currentPlayerIndex).toBe(1);
      expect(engine.state.currentRound).toBe(1);
      expect(engine.state.deck.length()).toBe(35);
      expect(engine.state.burnPile.cards.length).toBe(0);
      expect(engine.state.downPiles.length).toBe(0);
      expect(engine.state.players).toHaveLength(2);
      expect(engine.state.players[0].id).toBe('1760283796180-735741cac5494');
      expect(engine.state.players[0].hand.cards.length).toBe(10);
      expect(engine.state.players[0].isDown).toBe(false);
      expect(engine.state.players[0].tookCard).toBe(false);
      expect(engine.state.players[0].discarded).toBe(false);
      expect(engine.state.players[0].isOut).toBe(false);
      expect(engine.state.players[1].id).toBe('1760283796184-f202401d1261f');
      expect(engine.state.players[1].hand.cards.length).toBe(11);
      expect(engine.state.players[1].isDown).toBe(false);
      expect(engine.state.players[1].tookCard).toBe(false);
      expect(engine.state.players[1].discarded).toBe(false);
      expect(engine.state.players[1].isOut).toBe(false);
    }
  });
});