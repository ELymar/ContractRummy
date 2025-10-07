/**
 * Round dealing configuration for Contract Rummy
 * Defines how many cards each player gets in each round
 */

class RoundDealing {
    /**
     * Get the number of cards to deal to each player for a specific round
     * @param {number} roundNumber - Round number (1-7)
     * @param {number} dealerIndex - Index of the dealer (0 or 1)
     * @returns {Object} Object with player1Cards and player2Cards
     */
    static getCardsForRound(roundNumber, dealerIndex = 0) {
        // Base cards for each round (minimum cards)
        const baseCardsPerRound = {
            1: 10, // 11, 33
            2: 10, // 11, 34  
            3: 10, // 11, 44
            4: 12, // 13, 333
            5: 12, // 13, 334
            6: 14, // 15, 344
            7: 14  // 15, 444
        };

        if (roundNumber < 1 || roundNumber > 7) {
            throw new Error(`Invalid round number: ${roundNumber}. Must be 1-7.`);
        }

        const baseCards = baseCardsPerRound[roundNumber];
        
        // Non-dealer gets the extra card
        const player1Cards = dealerIndex === 0 ? baseCards : baseCards + 1;
        const player2Cards = dealerIndex === 1 ? baseCards : baseCards + 1;

        return { player1Cards, player2Cards };
    }

    /**
     * Get all round dealing configurations
     * @param {number} dealerIndex - Index of the dealer (0 or 1)
     * @returns {Array} Array of dealing configs for each round
     */
    static getAllRoundConfigs(dealerIndex = 0) {
        const configs = [];
        for (let round = 1; round <= 7; round++) {
            configs.push({
                round,
                ...RoundDealing.getCardsForRound(round, dealerIndex)
            });
        }
        return configs;
    }

    /**
     * Get a description of the dealing pattern for a round
     * @param {number} roundNumber - Round number (1-7)
     * @param {number} dealerIndex - Index of the dealer (0 or 1)
     * @returns {string} Description of the dealing pattern
     */
    static getRoundDealingDescription(roundNumber, dealerIndex = 0) {
        const config = RoundDealing.getCardsForRound(roundNumber, dealerIndex);
        const dealerName = dealerIndex === 0 ? 'Player 1' : 'Player 2';
        const nonDealerName = dealerIndex === 0 ? 'Player 2' : 'Player 1';
        return `Round ${roundNumber}: ${dealerName} (dealer) gets ${dealerIndex === 0 ? config.player1Cards : config.player2Cards} cards, ${nonDealerName} gets ${dealerIndex === 0 ? config.player2Cards : config.player1Cards} cards`;
    }
}

module.exports = RoundDealing;