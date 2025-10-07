const Deck = require('./Deck');
const Player = require('./Player');
const BurnPile = require('./BurnPile');

class GameState {
    constructor() {
        this.initialize();
    }

    initialize = (players) => {
        // Use 2 decks with 6 jokers each for 2-player game
        this.deck = new Deck(12, 2);
        this.players = [];
        this.downPiles = [];
        this.burnPile = new BurnPile();
        this.firstTurn = true; 
    }

    setFirstTurn = (firstTurn) => {
        this.firstTurn = firstTurn;
    }
}

module.exports = GameState;