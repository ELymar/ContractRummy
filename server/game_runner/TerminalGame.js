const GameState = require('./GameState');
const TerminalPlayer = require('./TerminalPlayer');

/**
 * Terminal-based Contract Rummy game orchestrator
 * Manages game flow, player turns, screen clearing, and results display
 */
class TerminalGame {
    /**
     * Create a new terminal game with two players
     */
    constructor() {
        this.gameState = new GameState();
        this.players = [];
        this.currentPlayerIndex = 0;
        
        // Initialize two players for terminal gameplay
        this.players.push(new TerminalPlayer('Player 1'));
        this.players.push(new TerminalPlayer('Player 2'));
    }

    // Check if the game has ended (one player has no cards)
    ended = () => {
        return this.players[0].hand.length() === 0 || this.players[1].hand.length() === 0;
    }

    // Display current game state for the specified player
    displayGameState = (forPlayerIndex) => {
        console.log('\n' + '='.repeat(60));
        console.log(`GAME STATE (for ${this.players[forPlayerIndex].name}):`);
        console.log('='.repeat(60));
        console.log(`Deck cards remaining: ${this.gameState.deck.length()}`);
        
        // Show burn pile top card
        if (this.gameState.burnPile.cards.length > 0) {
            console.log(`Burn pile top card: ${this.gameState.burnPile.topCard().toString()}${this.gameState.burnPile.dead ? ' (dead)' : ''}`);
        } else {
            console.log('Burn pile: Empty');
        }
        
        // Show down piles (melds on table)
        console.log('\nDown Piles on table:');
        if (this.gameState.downPiles.length === 0) {
            console.log('  None');
        } else {
            this.gameState.downPiles.forEach((pile, idx) => {
                console.log(`  ${idx + 1}: ${pile.toString()} (${pile.getOwner()})`);
            });
        }
        
        // Show opponent card count
        const opponentIndex = forPlayerIndex === 0 ? 1 : 0;
        console.log(`\n${this.players[opponentIndex].name} has ${this.players[opponentIndex].hand.length()} cards`);
        
        // Show current player's hand
        console.log(`Your hand (${this.players[forPlayerIndex].hand.length()} cards): ${this.players[forPlayerIndex].hand.toString()}`);
        console.log('='.repeat(60));
    }

    // Set up initial game state and deal cards
    setupRound = () => {
        console.log('\n🎮 Starting New Round of Contract Rummy! 🎮');
        console.log('Each player needs to form sets of 3+ cards of the same rank to go down.');
        console.log('First player to empty their hand wins!\n');
        
        // Reset game state
        this.gameState.initialize();
        this.players.forEach(player => player.roundReset());
        
        // Deal initial cards (Player 1 gets 11, Player 2 gets 10)
        this.players[0].draw(this.gameState.deck, 11);
        this.players[1].draw(this.gameState.deck, 10);
        
        // Player 1 starts first
        this.currentPlayerIndex = 0;
        this.gameState.setFirstTurn(true);
        
        console.log('Initial hands dealt!');
        console.log(`${this.players[0].name}: ${this.players[0].hand.length()} cards`);
        console.log(`${this.players[1].name}: ${this.players[1].hand.length()} cards`);
    }

    // Switch to the next player's turn
    switchPlayer = () => {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 2;
        this.gameState.setFirstTurn(false); // Only first turn of game is marked as firstTurn
    }

    // Display final game results
    displayResults = () => {
        this.clearScreen();
        console.log('\n' + '🎉'.repeat(20));
        console.log('           GAME OVER!');
        console.log('🎉'.repeat(20));
        
        if (this.players[0].hand.length() === 0) {
            console.log(`\n🏆 ${this.players[0].name} WINS! 🏆`);
            console.log(`${this.players[1].name} finished with ${this.players[1].hand.length()} cards remaining.`);
        } else if (this.players[1].hand.length() === 0) {
            console.log(`\n🏆 ${this.players[1].name} WINS! 🏆`);
            console.log(`${this.players[0].name} finished with ${this.players[0].hand.length()} cards remaining.`);
        }
        
        // Show final hands
        console.log('\nFinal hands:');
        this.players.forEach(player => {
            if (player.hand.length() > 0) {
                console.log(`${player.name}: ${player.hand.toString()}`);
            } else {
                console.log(`${player.name}: No cards (Winner!)`);
            }
        });
        
        // Show down piles that were created
        if (this.gameState.downPiles.length > 0) {
            console.log('\nMelds that were played:');
            this.gameState.downPiles.forEach((pile, idx) => {
                console.log(`  ${pile.toString()} (by ${pile.getOwner()})`);
            });
        }
    }

    /**
     * Play one complete round of Contract Rummy
     * Handles setup, turn management, and final results
     * @returns {Promise<void>}
     */
    async playRound() {
        this.setupRound();
        
        let turnCount = 0;
        const maxTurns = 100; // Safety limit to prevent infinite games
        
        // Game loop continues until someone wins or max turns reached
        while (!this.ended() && turnCount < maxTurns) {
            const currentPlayer = this.players[this.currentPlayerIndex];
            
            // Show player transition screen
            await this.showPlayerTransition(currentPlayer.name);
            
            // Show game state to current player
            this.displayGameState(this.currentPlayerIndex);
            
            // Execute player's turn
            try {
                await currentPlayer.takeTurn(this.gameState);
                
                // Check if game ended after this turn
                if (this.ended()) {
                    break;
                }
                
                // Show turn end message and wait briefly
                console.log(`\n${currentPlayer.name}'s turn complete! Switching players...`);
                await new Promise(resolve => setTimeout(resolve, 1500)); // Brief pause
                
                // Switch to next player
                this.switchPlayer();
                turnCount++;
                
            } catch (error) {
                console.log(`Error during ${currentPlayer.name}'s turn:`, error.message);
                // Continue game despite error
                this.switchPlayer();
                turnCount++;
            }
        }
        
        // Display final results
        this.displayResults();
        
        if (turnCount >= maxTurns) {
            console.log('\n⚠️  Game ended due to turn limit reached.');
        }
    }

    /**
     * Clear the terminal screen using ANSI escape sequences
     */
    clearScreen() {
        // ANSI escape sequence to clear screen and move cursor to top
        process.stdout.write('\u001b[2J\u001b[0;0H');
    }

    /**
     * Display player transition screen for laptop passing
     * @param {string} playerName - Name of the player taking their turn
     * @returns {Promise<void>}
     */
    async showPlayerTransition(playerName) {
        this.clearScreen();
        console.log('\n' + '='.repeat(60));
        console.log(`🎮 ${playerName}'s Turn - Pass the laptop! 🎮`);
        console.log('='.repeat(60));
        console.log(`\n${playerName}, when you're ready to take your turn, press Enter...`);
        console.log('(Other player should look away!)\n');
        
        await this.waitForEnter();
        this.clearScreen();
    }

    // Utility function to wait for user input (for turn pacing)
    async waitForEnter() {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question('', () => {
                rl.close();
                resolve();
            });
        });
    }
}

module.exports = TerminalGame;