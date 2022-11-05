const Deck = require('./Deck');
const Player = require('./Player');
const BurnPile = require('./BurnPile');

class GameState {
    constructor() {
        this.initialize();
    }

    initialize = (players) => {
        this.deck = new Deck(6);
        this.deck.shuffle();
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