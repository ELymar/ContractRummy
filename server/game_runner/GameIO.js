/**
 * Game Input/Output utility class
 * Handles user input and display formatting for the terminal game
 */

const readline = require('readline');

class GameIO {
    /**
     * Get user input with a prompt
     * @param {string} prompt - The prompt to display to the user
     * @returns {Promise<string>} The user's input
     */
    static async getUserInput(prompt) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            const askForInput = () => {
                rl.question(prompt, (answer) => {
                    rl.close();
                    resolve(answer.trim());
                });
            };
            askForInput();
        });
    }

    /**
     * Parse comma-separated input into card indices
     * @param {string} input - User input string
     * @param {number} maxIndex - Maximum valid index
     * @returns {number[]|string|null} Array of indices, 'invalid', or null for cancel
     */
    static parseCardIndices(input, maxIndex) {
        if (!input || input === '0' || input.toLowerCase() === 'cancel') {
            return null; // Cancel
        }
        
        const indices = input.split(',').map(num => {
            const parsed = parseInt(num.trim());
            return isNaN(parsed) ? null : parsed - 1; // Convert to 0-based index
        });
        
        // Check for invalid input
        if (indices.some(idx => idx === null || idx < 0 || idx >= maxIndex)) {
            return 'invalid';
        }
        
        return indices;
    }

    /**
     * Display a numbered list of cards
     * @param {Array} cards - Array of card objects
     * @param {string} title - Title for the list
     * @param {Set} usedIndices - Optional set of indices to mark as used
     */
    static displayCardList(cards, title, usedIndices = new Set()) {
        console.log(title);
        cards.forEach((card, idx) => {
            const usedText = usedIndices.has(idx) ? ' (already used)' : '';
            console.log(`${idx + 1}. ${card.toString()}${usedText}`);
        });
    }

    /**
     * Display available melds on the table
     * @param {Array} downPiles - Array of DownPile objects
     */
    static displayAvailableMelds(downPiles) {
        console.log('Available melds on table:');
        downPiles.forEach((pile, idx) => {
            console.log(`${idx + 1}. ${pile.toString()} (${pile.getOwner()})`);
        });
    }

    /**
     * Display meld summary
     * @param {Array} melds - Array of meld objects
     */
    static displayMeldSummary(melds) {
        console.log('\n=== Meld Summary ===');
        melds.forEach((meld, idx) => {
            console.log(`Meld ${idx + 1} (${meld.type}): ${meld.cards.map(card => card.toString()).join(', ')}`);
        });
    }
}

module.exports = GameIO;