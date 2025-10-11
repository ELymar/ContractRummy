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
        // Base cards for each round (dealer gets these, non-dealer gets +1)
        const dealerCardsPerRound = {
            1: 10, // dealer: 10, non-dealer: 11
            2: 10, // dealer: 10, non-dealer: 11  
            3: 10, // dealer: 10, non-dealer: 11
            4: 12, // dealer: 12, non-dealer: 13
            5: 12, // dealer: 12, non-dealer: 13
            6: 14, // dealer: 14, non-dealer: 15
            7: 14  // dealer: 14, non-dealer: 15
        };

        if (roundNumber < 1 || roundNumber > 7) {
            throw new Error(`Invalid round number: ${roundNumber}. Must be 1-7.`);
        }

        const dealerCards = dealerCardsPerRound[roundNumber];
        
        // Dealer gets base cards, non-dealer gets one extra
        const player1Cards = dealerIndex === 0 ? dealerCards : dealerCards + 1;
        const player2Cards = dealerIndex === 1 ? dealerCards : dealerCards + 1;

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