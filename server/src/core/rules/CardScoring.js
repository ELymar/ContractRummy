/**
 * Card scoring system for Contract Rummy
 * Calculates point values for cards remaining in hands at round end
 */

class CardScoring {
    /**
     * Get the point value for a single card
     * @param {Card} card - The card to score
     * @returns {number} Point value of the card
     */
    static getCardValue(card) {
        if (card.value === 'Joker') {
            return 20;
        }
        
        if (card.value === 'Ace') {
            return 15;
        }
        
        // Face cards (Jack, Queen, King)
        if (['Jack', 'Queen', 'King'].includes(card.value)) {
            return 10;
        }
        
        // Number cards (Two through Ten) = 5 points each
        const numberCards = ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
        if (numberCards.includes(card.value)) {
            return 5;
        }
        
        // Default case (shouldn't happen with valid cards)
        return 0;
    }
    
    /**
     * Calculate the total point value for a hand of cards
     * @param {Array} cards - Array of card objects
     * @returns {number} Total point value
     */
    static scoreHand(cards) {
        return cards.reduce((total, card) => total + CardScoring.getCardValue(card), 0);
    }
    
    /**
     * Get point values for display/reference
     * @returns {Object} Point value reference
     */
    static getPointValues() {
        return {
            'Number cards (2-10)': 5,
            'Face cards (J, Q, K)': 10,
            'Ace': 15,
            'Joker': 20
        };
    }
    
    /**
     * Display point values as a formatted reference
     * @returns {string} Formatted point values
     */
    static getPointValuesDisplay() {
        const values = CardScoring.getPointValues();
        let display = 'Card Point Values:\n';
        display += '─'.repeat(25) + '\n';
        
        Object.entries(values).forEach(([cardType, points]) => {
            display += `${cardType.padEnd(20)} ${points} pts\n`;
        });
        
        return display;
    }
}

module.exports = CardScoring;