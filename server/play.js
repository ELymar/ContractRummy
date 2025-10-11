#!/usr/bin/env node

const TerminalGame = require('./game_runner/TerminalGame');

function parseArgs() {
    const args = process.argv.slice(2);
    
    // Default values
    let player1 = 'Player 1';
    let player2 = 'Player 2';
    let previousScores = [];
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '--player1' || arg === '-p1') {
            player1 = args[++i];
        } else if (arg === '--player2' || arg === '-p2') {
            player2 = args[++i];
        } else if (arg === '--scores' || arg === '-s') {
            const scoresStr = args[++i];
            try {
                previousScores = JSON.parse(scoresStr);
                if (!Array.isArray(previousScores) || 
                    !previousScores.every(round => Array.isArray(round) && round.length === 2)) {
                    throw new Error('Invalid format');
                }
            } catch (error) {
                console.error('❌ Invalid scores format. Use: [[p1_r1,p2_r1],[p1_r2,p2_r2],...]');
                console.error('Example: [[5,0],[10,0],[0,5]]');
                process.exit(1);
            }
        } else if (arg === '--help' || arg === '-h') {
            showHelp();
            process.exit(0);
        } else {
            console.error(`Unknown argument: ${arg}`);
            showHelp();
            process.exit(1);
        }
    }
    
    return { player1, player2, previousScores };
}

function showHelp() {
    console.log(`
🃏 Contract Rummy Game

Usage: node play.js [options]

Options:
  -p1, --player1 <name>    Name for player 1 (default: "Player 1")
  -p2, --player2 <name>    Name for player 2 (default: "Player 2")
  -s,  --scores <json>     Previous scores to resume game (JSON array)
  -h,  --help              Show this help message

Examples:
  # Start new game
  node play.js

  # Start with custom player names
  node play.js -p1 Eugene -p2 Kristen

  # Resume from Round 4 with previous scores
  node play.js -p1 Eugene -p2 Kristen -s "[[5,0],[10,0],[0,5]]"

Score format: [[p1_round1, p2_round1], [p1_round2, p2_round2], ...]
`);
}

async function main() {
    const { player1, player2, previousScores } = parseArgs();
    
    console.log('🃏 Welcome to Contract Rummy! 🃏');
    console.log('================================');
    
    try {
        const game = new TerminalGame(player1, player2, previousScores);
        await game.playGame();
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