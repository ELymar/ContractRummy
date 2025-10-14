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
        this.isDown = false;
        this.tookCard = false;
        this.discarded = false;
        this.isOut = false;
    }

    downPlaysForOneRound = (gameState) => {
        // Returns the down piles that this player owns
        return gameState.downPiles.filter(pile => pile.getOwner() === this.name);
    }

    toString = () => {
        return `${this.name}: ${this.hand.length()} cards`;
    }
}

module.exports = Player;