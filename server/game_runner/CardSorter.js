/**
 * Card sorting utilities for organizing hands
 */

const { VALUES, SUITS } = require('./Constants');

class CardSorter {
    /**
     * Get numeric value for a card rank for sorting
     * @param {string} value - Card value (e.g., 'Ace', 'King', 'Two')
     * @returns {number} Numeric value for sorting
     */
    static getValueOrder(value) {
        const valueOrder = {
            'Two': 2,
            'Three': 3,
            'Four': 4,
            'Five': 5,
            'Six': 6,
            'Seven': 7,
            'Eight': 8,
            'Nine': 9,
            'Ten': 10,
            'Jack': 11,
            'Queen': 12,
            'King': 13,
            'Ace': 14,
            'Joker': 15  // Jokers sort last
        };
        return valueOrder[value] || 0;
    }

    /**
     * Get numeric value for a card suit for sorting
     * @param {string} suit - Card suit (e.g., 'Hearts', 'Spades')
     * @returns {number} Numeric value for sorting
     */
    static getSuitOrder(suit) {
        const suitOrder = {
            'Hearts': 1,
            'Diamonds': 2,
            'Clubs': 3,
            'Spades': 4,
            'Joker': 5  // Jokers sort last
        };
        return suitOrder[suit] || 0;
    }

    /**
     * Sort cards by rank only (all Aces together, all Kings together, etc.)
     * @param {Array} cards - Array of card objects
     * @returns {Array} Sorted array of cards
     */
    static sortByRank(cards) {
        return [...cards].sort((a, b) => {
            const valueA = CardSorter.getValueOrder(a.value);
            const valueB = CardSorter.getValueOrder(b.value);
            
            if (valueA !== valueB) {
                return valueA - valueB;
            }
            
            // If same rank, sort by suit
            return CardSorter.getSuitOrder(a.suit) - CardSorter.getSuitOrder(b.suit);
        });
    }

    /**
     * Sort cards by suit first, then by rank within each suit
     * @param {Array} cards - Array of card objects
     * @returns {Array} Sorted array of cards
     */
    static sortBySuitThenRank(cards) {
        return [...cards].sort((a, b) => {
            const suitA = CardSorter.getSuitOrder(a.suit);
            const suitB = CardSorter.getSuitOrder(b.suit);
            
            if (suitA !== suitB) {
                return suitA - suitB;
            }
            
            // If same suit, sort by rank
            return CardSorter.getValueOrder(a.value) - CardSorter.getValueOrder(b.value);
        });
    }

    /**
     * Get available sorting options for display
     * @returns {Array} Array of sorting option objects
     */
    static getSortingOptions() {
        return [
            {
                name: 'Sort by rank (all Aces together, all Kings together, etc.)',
                key: 'rank',
                sorter: CardSorter.sortByRank
            },
            {
                name: 'Sort by suit then rank (Hearts: A,2,3... Diamonds: A,2,3...)',
                key: 'suit',
                sorter: CardSorter.sortBySuitThenRank
            }
        ];
    }
}

module.exports = CardSorter;