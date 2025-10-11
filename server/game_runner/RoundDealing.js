/**
 * Round dealing configuration for Contract Rummy
 * Defines how many cards each player gets in each round
 */

const ROUND_RULES = {
    1: { dealerCards: 10, description: 'Two sets of 3' },
    2: { dealerCards: 10, description: 'One set of 3, one straight' },
    3: { dealerCards: 10, description: 'Two straights' },
    4: { dealerCards: 12, description: 'Three threes' },
    5: { dealerCards: 12, description: 'Two threes and a straight' },
    6: { dealerCards: 14, description: 'One set of 3, two straights' },
    7: { dealerCards: 14, description: 'Four straights' }
};

class RoundDealing {
    /**
     * Get the number of cards to deal to each player for a specific round
     * @param {number} roundNumber - Round number (1-7)
     * @param {number} dealerIndex - Index of the dealer (0 or 1)
     * @returns {{player1Cards:number, player2Cards:number}}
     */
    static getCardsForRound(roundNumber, dealerIndex = 0) {
        const plan = RoundDealing.getRoundPlan(roundNumber, dealerIndex);
        return {
            player1Cards: plan.cardsPerIndex[0],
            player2Cards: plan.cardsPerIndex[1]
        };
    }

    /**
     * Build a detailed plan for how many cards each player receives in a round
     * @param {number} roundNumber - Round number (1-7)
     * @param {number} dealerIndex - Index of the dealer (0 or 1)
     * @param {string[]} playerNames - Optional array of player names (length 2)
     * @returns {{roundNumber:number,dealerIndex:number,nonDealerIndex:number,dealer:{name:string,cards:number},nonDealer:{name:string,cards:number},cardsPerIndex:number[],totalCards:number,description:string}}
     */
    static getRoundPlan(roundNumber, dealerIndex = 0, playerNames = ['Player 1', 'Player 2']) {
        if (!ROUND_RULES[roundNumber]) {
            throw new Error(`Invalid round number: ${roundNumber}. Must be 1-7.`);
        }

        if (dealerIndex !== 0 && dealerIndex !== 1) {
            throw new Error(`Invalid dealer index: ${dealerIndex}. Must be 0 or 1.`);
        }

        if (!Array.isArray(playerNames) || playerNames.length < 2) {
            throw new Error('playerNames must contain at least two entries.');
        }

        const dealerCards = ROUND_RULES[roundNumber].dealerCards;
        const nonDealerCards = dealerCards + 1;
        const nonDealerIndex = dealerIndex === 0 ? 1 : 0;
        const cardsPerIndex = [0, 0];
        cardsPerIndex[dealerIndex] = dealerCards;
        cardsPerIndex[nonDealerIndex] = nonDealerCards;

        return {
            roundNumber,
            dealerIndex,
            nonDealerIndex,
            dealer: {
                index: dealerIndex,
                name: playerNames[dealerIndex],
                cards: dealerCards
            },
            nonDealer: {
                index: nonDealerIndex,
                name: playerNames[nonDealerIndex],
                cards: nonDealerCards
            },
            cardsPerIndex,
            totalCards: dealerCards + nonDealerCards,
            description: ROUND_RULES[roundNumber].description
        };
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
     * @param {string[]} playerNames - Optional player names for readability
     * @returns {string} Description of the dealing pattern
     */
    static getRoundDealingDescription(roundNumber, dealerIndex = 0, playerNames = ['Player 1', 'Player 2']) {
        const plan = RoundDealing.getRoundPlan(roundNumber, dealerIndex, playerNames);
        return `Round ${roundNumber}: ${plan.dealer.name} (dealer) gets ${plan.dealer.cards} cards, ${plan.nonDealer.name} gets ${plan.nonDealer.cards} cards`;
    }

    /**
     * Get an expanded summary highlighting the round-specific dealing notes
     * @param {number} roundNumber - Round number (1-7)
     * @param {number} dealerIndex - Index of the dealer (0 or 1)
     * @param {string[]} playerNames - Optional player names
     * @returns {string} User-facing summary string
     */
    static getRoundSummary(roundNumber, dealerIndex = 0, playerNames = ['Player 1', 'Player 2']) {
        const plan = RoundDealing.getRoundPlan(roundNumber, dealerIndex, playerNames);
        return `${RoundDealing.getRoundDealingDescription(roundNumber, dealerIndex, playerNames)} — ${plan.description}`;
    }
}

module.exports = RoundDealing;