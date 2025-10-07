#!/usr/bin/env node

/**
 * Contract Rummy - Terminal Game
 * 
 * A fully playable terminal-based implementation of Contract Rummy
 * featuring interactive meld selection, screen clearing for turn passing,
 * and complete game flow management.
 * 
 * Usage: npm start
 */

const TerminalGame = require('./game_runner/TerminalGame');
const readline = require('readline');

async function getPlayerNames() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('Enter name for Player 1 (or press Enter for "Player 1"): ', (name1) => {
            rl.question('Enter name for Player 2 (or press Enter for "Player 2"): ', (name2) => {
                rl.close();
                resolve({
                    player1Name: name1.trim() || 'Player 1',
                    player2Name: name2.trim() || 'Player 2'
                });
            });
        });
    });
}

async function main() {
    console.log('🃏 Welcome to Contract Rummy! 🃏');
    console.log('='.repeat(50));
    console.log('A terminal-based card game for 2 players');
    console.log('Pass the laptop between turns for multiplayer fun!');
    console.log('='.repeat(50));
    
    try {
        // Get player names
        const { player1Name, player2Name } = await getPlayerNames();
        console.log(`\n👥 Players: ${player1Name} vs ${player2Name}\n`);
        
        const game = new TerminalGame(player1Name, player2Name);
        await game.playGame();
    } catch (error) {
        console.error('\n❌ Game Error:', error.message);
        console.error('Please check your terminal supports interactive input.');
        process.exit(1);
    }
    
    console.log('\n🎮 Thanks for playing Contract Rummy!');
    console.log('Report issues: https://github.com/anthropics/claude-code/issues');
    process.exit(0);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n\n👋 Game interrupted. Thanks for playing!');
    process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('\n💥 Unexpected error:', error.message);
    console.error('The game will now exit.');
    process.exit(1);
});

// Start the game
if (require.main === module) {
    main();
}

module.exports = { main };