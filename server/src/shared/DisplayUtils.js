/**
 * Shared utilities for formatting and displaying game elements
 */

class DisplayUtils {
  /**
   * Format a card for display
   * @param {Object|string} card - Card object or string representation
   * @returns {string} Formatted card string
   */
  static formatCard(card) {
    if (typeof card === 'string') {
      return card;
    }
    
    if (!card || !card.suit || !card.value) {
      return '[Unknown Card]';
    }
    
    // Handle jokers
    if (card.suit === 'Joker' || card.value === 'Joker') {
      return '🃏';
    }
    
    // Map suit names to symbols
    const suitSymbols = {
      'Hearts': '♥',
      'Diamonds': '♦', 
      'Clubs': '♣',
      'Spades': '♠'
    };
    
    // Map long value names to short forms
    const valueShortcuts = {
      'Two': '2', 'Three': '3', 'Four': '4', 'Five': '5', 'Six': '6',
      'Seven': '7', 'Eight': '8', 'Nine': '9', 'Ten': '10',
      'Jack': 'J', 'Queen': 'Q', 'King': 'K', 'Ace': 'A'
    };
    
    const symbol = suitSymbols[card.suit] || card.suit;
    const value = valueShortcuts[card.value] || card.value;
    
    return `[${value}${symbol}]`;
  }
  
  /**
   * Format a pile (meld) for display
   * @param {Object} pile - Pile object with cards array and type
   * @returns {string} Formatted pile string
   */
  static formatPile(pile) {
    if (!pile || !pile.cards || !Array.isArray(pile.cards)) {
      return '[Empty Pile]';
    }
    
    if (pile.cards.length === 0) {
      return '[Empty Pile]';
    }
    
    // Format each card and join them
    const cardStrings = pile.cards.map(card => DisplayUtils.formatCard(card));
    const cardsDisplay = cardStrings.join('');
    
    // Add type indicator if available
    const typeDisplay = pile.type ? ` (${pile.type})` : '';
    
    return `${cardsDisplay}${typeDisplay}`;
  }
  
  /**
   * Format a list of cards for display
   * @param {Array} cards - Array of card objects
   * @returns {string} Formatted cards string
   */
  static formatCards(cards) {
    if (!cards || !Array.isArray(cards)) {
      return '';
    }
    
    return cards.map(card => DisplayUtils.formatCard(card)).join('');
  }
  
  /**
   * Format a player name for display, with fallback for unknown players
   * @param {string} name - Player name
   * @returns {string} Formatted player name
   */
  static formatPlayerName(name) {
    return name || 'Unknown Player';
  }
  
  /**
   * Format a meld summary line for selection menus
   * @param {Object} pile - Pile object
   * @param {number} index - Index for numbering (0-based)
   * @param {string} owner - Owner name
   * @returns {string} Formatted meld line
   */
  static formatMeldSummary(pile, index, owner) {
    const pileDisplay = DisplayUtils.formatPile(pile);
    const ownerDisplay = DisplayUtils.formatPlayerName(owner);
    return `${index + 1}. ${pileDisplay} (${ownerDisplay})`;
  }
}

module.exports = DisplayUtils;