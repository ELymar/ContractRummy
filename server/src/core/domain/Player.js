const Hand = require('./Hand');

/**
 * Core Player domain object - contains only game state, no UI logic
 */
class Player {
    constructor(name) {
        this.name = name;
        this.hand = new Hand();
        this.roundReset();
    }

    roundReset = () => {
        this.hand.clear();
        this.isDown = false;
        this.tookCard = false;
        this.discarded = false;
        this.isOut = false;
    }

    downPlaysForOneRound = (gameState) => {
        // Returns the down piles that this player owns
        return gameState.downPiles.filter(pile => pile.getOwner() === this.name);
    }

    /**
     * Draw initial cards from deck
     * @param {Deck} deck - The deck to draw from
     * @param {number} nCards - Number of cards to draw
     */
    draw = (deck, nCards) => {
        this.hand.addCards(deck.draw(nCards));
    }
    
    /**
     * Draw cards from game state deck with reshuffle support
     * @param {GameState} gameState - Game state containing deck and burn pile
     * @param {number} nCards - Number of cards to draw
     */
    drawFromGameState = (gameState, nCards) => {
        this.hand.addCards(gameState.drawFromDeck(nCards));
    }

    toString = () => {
        return `${this.name}: ${this.hand.toString()}`;
    }
}

module.exports = Player;