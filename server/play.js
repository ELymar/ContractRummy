#!/usr/bin/env node

const TerminalGame = require('./game_runner/TerminalGame');

async function main() {
    console.log('🃏 Welcome to Contract Rummy! 🃏');
    console.log('================================');
    
    try {
        const game = new TerminalGame();
        await game.playRound();
    } catch (error) {
        console.error('Game error:', error.message);
        process.exit(1);
    }
    
    console.log('\nThanks for playing!');
    process.exit(0);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n\nGame interrupted. Thanks for playing!');
    process.exit(0);
});

main();