class BurnPile {
  constructor() {
    this.cards = [];
    this.dead = true;
  }
  canTake = () => {
    return this.cards.length > 0 && !this.dead;
  };

  takeCard = () => {
    if (this.canTake()) {
      this.dead = true;
      return this.cards.pop();
    }
  };

  addCard = (card) => {
    this.cards.push(card);
    this.dead = false;
  };

  topCard = () => {
    return this.cards[this.cards.length - 1];
  };

  /**
   * Get all cards except the top card for deck reconstruction
   * @returns {Card[]} All cards except the top card
   */
  getAllExceptTop = () => {
    if (this.cards.length <= 1) {
      return [];
    }
    // Return all cards except the last one (top card)
    const cardsToTake = this.cards.slice(0, -1);
    // Keep only the top card in the burn pile
    this.cards = this.cards.slice(-1);
    return cardsToTake;
  };

  /**
   * Check if burn pile has cards available for deck reconstruction
   * @returns {boolean} True if there are cards besides the top card
   */
  hasCardsForReshuffle = () => {
    return this.cards.length > 1;
  };
}

module.exports = BurnPile;
