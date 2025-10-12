const Deck = require('./Deck');
const Player = require('./Player');
const BurnPile = require('./BurnPile');

class GameState {
    constructor(rng = Math.random) {
        this.rng = rng;
        this.initialize();
    }

    initialize = (players) => {
        // Use 1 deck with 4 jokers for 2-player game
        // Preserve RNG if it was set in constructor
        this.deck = new Deck(4, 1, this.rng);
        this.players = [];
        this.downPiles = [];
        this.burnPile = new BurnPile();
        this.firstTurn = true; 
    }

    setFirstTurn = (firstTurn) => {
        this.firstTurn = firstTurn;
    }
    
    /**
     * Draw cards from deck with automatic reshuffle if needed
     * @param {number} nCards - Number of cards to draw
     * @returns {Card[]} Drawn cards
     */
    drawFromDeck = (nCards) => {
        // Check if deck has enough cards
        if (!this.deck.canDraw(nCards)) {
            // Try to reshuffle burn pile into deck
            if (this.burnPile.hasCardsForReshuffle()) {
                console.log('🔄 Deck running low, reshuffling burn pile...');
                const cardsFromBurnPile = this.burnPile.getAllExceptTop();
                this.deck.addCards(cardsFromBurnPile);
                console.log(`✅ Reshuffled ${cardsFromBurnPile.length} cards from burn pile into deck`);
            }
            
            // Check again after potential reshuffle
            if (!this.deck.canDraw(nCards)) {
                throw new Error(`Cannot draw ${nCards} cards: deck has ${this.deck.length()} cards, burn pile has ${this.burnPile.cards.length - 1} available for reshuffle`);
            }
        }
        
        return this.deck.draw(nCards);
    }
}

module.exports = GameState;