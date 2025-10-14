#!/usr/bin/env node

const TerminalGame = require('./game_runner/TerminalGame');

/**
 * Test script to demonstrate the resume functionality
 */
async function testResume() {
  console.log('🧪 Testing Resume Functionality\n');

  // Test 1: Resume from Round 4
  console.log('=== Test 1: Resume from Round 4 ===');
  const previousScores1 = [
    [25, 15], // Round 1: Player 1 = 25, Player 2 = 15
    [30, 20], // Round 2: Player 1 = 30, Player 2 = 20
    [10, 35], // Round 3: Player 1 = 10, Player 2 = 35
  ];

  const game1 = new TerminalGame('Alice', 'Bob', previousScores1);
  console.log(`Current round should be: 4 (actual: ${game1.currentRound})`);
  console.log(
    `Dealer should be: ${game1.dealerIndex === 1 ? 'Bob' : 'Alice'} (index: ${game1.dealerIndex})`
  );
  console.log(`Next round from ScoreKeeper: ${game1.scoreKeeper.getNextRoundNumber()}`);

  // Test 2: Resume from Round 6
  console.log('\n=== Test 2: Resume from Round 6 ===');
  const previousScores2 = [
    [20, 25], // Round 1
    [15, 30], // Round 2
    [35, 10], // Round 3
    [40, 25], // Round 4
    [15, 20], // Round 5
  ];

  const game2 = new TerminalGame('Charlie', 'Diana', previousScores2);
  console.log(`Current round should be: 6 (actual: ${game2.currentRound})`);
  console.log(
    `Dealer should be: ${game2.dealerIndex === 1 ? 'Diana' : 'Charlie'} (index: ${game2.dealerIndex})`
  );
  console.log(`Next round from ScoreKeeper: ${game2.scoreKeeper.getNextRoundNumber()}`);

  // Test 3: Edge case - Resume from Round 7 (last round)
  console.log('\n=== Test 3: Resume from Round 7 (Last Round) ===');
  const previousScores3 = [
    [20, 25],
    [15, 30],
    [35, 10],
    [40, 25],
    [15, 20],
    [30, 15], // 6 rounds completed
  ];

  const game3 = new TerminalGame('Eve', 'Frank', previousScores3);
  console.log(`Current round should be: 7 (actual: ${game3.currentRound})`);
  console.log(
    `Dealer should be: ${game3.dealerIndex === 0 ? 'Eve' : 'Frank'} (index: ${game3.dealerIndex})`
  );
  console.log(`Next round from ScoreKeeper: ${game3.scoreKeeper.getNextRoundNumber()}`);

  console.log('\n✅ All resume tests completed!');
  console.log('\nTo use resume functionality in your game:');
  console.log(
    'const game = new TerminalGame("Player1", "Player2", [[p1_r1, p2_r1], [p1_r2, p2_r2], ...]);'
  );
}

testResume().catch(console.error);
