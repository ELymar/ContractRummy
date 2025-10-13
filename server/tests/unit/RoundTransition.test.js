const GameEngine = require('../../core/engine/GameEngine');
const { ActionType } = require('../../core/engine/actions');
const ScoreKeeper = require('../../game_runner/ScoreKeeper');

describe('Round Transition', () => {
  let engine;
  
  beforeEach(() => {
    // Set up a fixed RNG for deterministic testing
    const rng = () => 0.5; // This will produce predictable card shuffling
    engine = new GameEngine({ rng });
  });

  test('should proceed to round 2 after round 1 ends', () => {
    // Join two players
    const player1Events = engine.apply({ type: ActionType.JOIN, playerId: 'p1', payload: { name: 'Player 1' } });
    const player2Events = engine.apply({ type: ActionType.JOIN, playerId: 'p2', payload: { name: 'Player 2' } });
    
    // Mark players as ready and start game - the first READY will start the game
    const startEvents = engine.apply({ type: ActionType.READY, playerId: 'p1' });
    
    // The game should start after both players are ready
    expect(startEvents.some(e => e.type === 'GAME_STARTED')).toBe(true);
    expect(engine.state.currentRound).toBe(1);
    
    // Manually set up a scenario where Player 1 can win quickly
    // For simplicity, let's set Player 1 to have only 1 card and be down
    const player1 = engine.state.players[0];
    const player2 = engine.state.players[1];
    
    player1.isDown = true;
    player1.hand.cards = [{ suit: 'Hearts', value: 'Five' }]; // One card to discard
    player2.isDown = true;
    player2.hand.cards = [
      { suit: 'Spades', value: 'Seven' },
      { suit: 'Hearts', value: 'Seven' },
      { suit: 'Clubs', value: 'Seven' },
      { suit: 'Diamonds', value: 'Seven' }
    ];
    
    // Set up the turn to be Player 1's
    engine.state.currentPlayerIndex = 0;
    player1.tookCard = true; // Skip drawing phase
    
    // Player 1 discards their last card to win
    const discardEvents = engine.apply({ 
      type: ActionType.DISCARD, 
      playerId: 'p1', 
      payload: { 
        cardIndex: 0,
        handOrder: [{ suit: 'Hearts', value: 'Five' }]
      } 
    });
    
    // Should emit ROUND_ENDED with gameComplete: false
    const roundEndedEvent = discardEvents.find(e => e.type === 'ROUND_ENDED');
    expect(roundEndedEvent).toBeTruthy();
    expect(roundEndedEvent.payload.gameComplete).toBe(false);
    expect(roundEndedEvent.payload.roundNumber).toBe(1);
    expect(roundEndedEvent.payload.winnerName).toBe('Player 1');
    
    // Check that scorekeeper is correctly set up
    expect(engine.scoreKeeper).toBeTruthy();
    expect(engine.scoreKeeper.isGameComplete()).toBe(false);
    
    // Now start the next round
    const nextRoundEvents = engine.startNextRound();
    
    // Should emit GAME_STARTED and TURN_STARTED for round 2
    expect(nextRoundEvents.some(e => e.type === 'GAME_STARTED')).toBe(true);
    expect(nextRoundEvents.some(e => e.type === 'TURN_STARTED')).toBe(true);
    
    // Check that we're now in round 2
    expect(engine.state.currentRound).toBe(2);
    
    // Check that dealer has rotated
    expect(engine.state.dealerIndex).toBe(1); // Should have rotated from 0 to 1
    
    // Check that players have new hands
    expect(engine.state.players[0].hand.cards.length).toBeGreaterThan(0);
    expect(engine.state.players[1].hand.cards.length).toBeGreaterThan(0);
    
    // Check that player flags are reset
    expect(engine.state.players[0].isDown).toBe(false);
    expect(engine.state.players[0].tookCard).toBe(false);
    expect(engine.state.players[0].discarded).toBe(false);
    expect(engine.state.players[0].isOut).toBe(false);
    
    expect(engine.state.players[1].isDown).toBe(false);
    expect(engine.state.players[1].tookCard).toBe(false);
    expect(engine.state.players[1].discarded).toBe(false);
    expect(engine.state.players[1].isOut).toBe(false);
  });

  test('should end game after all 7 rounds completed', () => {
    // Set up game with score keeper showing 7 completed rounds
    engine.scoreKeeper = new ScoreKeeper(['Player 1', 'Player 2'], 7);
    
    // Simulate all rounds completed
    for (let round = 1; round <= 7; round++) {
      engine.scoreKeeper.recordRoundScore(round, {
        'Player 1': [],
        'Player 2': [{ suit: 'Hearts', value: 'Ace' }]
      }, 'Player 1');
    }
    
    expect(engine.scoreKeeper.isGameComplete()).toBe(true);
    
    // Trying to start next round should emit GAME_ENDED
    const events = engine.startNextRound();
    
    expect(events.some(e => e.type === 'GAME_ENDED')).toBe(true);
    expect(events.some(e => e.type === 'GAME_STARTED')).toBe(false);
  });
});