const seedrandom = require('seedrandom');
const GameEngine = require('./core/engine/GameEngine');

console.log('=== Testing RNG Determinism ===');

// Test 1: Direct seedrandom calls
console.log('\n--- Test 1: Direct seedrandom calls ---');
for (let run = 1; run <= 3; run++) {
  const rng = seedrandom('ba3bbada');
  console.log(`Run ${run}: ${rng()}, ${rng()}, ${rng()}`);
}

// Test 2: Multiple engine instances with same seed
console.log('\n--- Test 2: Multiple engine instances ---');
for (let run = 1; run <= 2; run++) {
  console.log(`\nEngine Run ${run}:`);
  const engine = new GameEngine({ rng: seedrandom('ba3bbada') });
  
  // Execute the same sequence of actions
  engine.apply({ "payload": { "name": "Player 1" }, "playerId": "p1", "type": "JOIN" });
  engine.apply({ "payload": {}, "playerId": "p1", "type": "READY" });
  engine.apply({ "payload": { "name": "Player 2" }, "playerId": "p2", "type": "JOIN" });
  engine.apply({ "payload": {}, "playerId": "p2", "type": "READY" });
  
  // Show first 5 cards of each player
  console.log('  Player 1 first 5 cards:', 
    engine.state.players[0].hand.cards.slice(0, 5).map(c => c.toString()));
  console.log('  Player 2 first 5 cards:', 
    engine.state.players[1].hand.cards.slice(0, 5).map(c => c.toString()));
}

// Test 3: Check if RNG state is being preserved
console.log('\n--- Test 3: RNG state preservation ---');
const sharedRng = seedrandom('ba3bbada');
console.log('Shared RNG calls:', sharedRng(), sharedRng(), sharedRng());

const engine3 = new GameEngine({ rng: sharedRng });
console.log('After engine creation, shared RNG:', sharedRng(), sharedRng());

// Test 4: Check deck creation directly
console.log('\n--- Test 4: Direct deck creation ---');
const Deck = require('./game_runner/Deck');
for (let run = 1; run <= 2; run++) {
  const deck = new Deck(4, 1, seedrandom('ba3bbada'));
  console.log(`Deck Run ${run} first 5 cards:`, 
    deck.cards.slice(-5).map(c => c.toString())); // Last 5 cards (top of deck)
}