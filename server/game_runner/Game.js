const GameState = require('./GameState');
const Player = require('./Player');

class Game {
    constructor() {
        this.gameState = new GameState();
        this.players = [];
        this.players.push(new Player('Player 1'));
        this.players.push(new Player('Player 2'));    }

    // Turn options
    /*
    1. Draw from deck or draw from burn pile (if not dead)
    2. Re-arrange cards in hand
    3. Go down (if not down and if possible)
    4. Add to other's down piles (if possible)
    5. Add to burn pile
    
    DAG

     +----[5] 
     |        
    [1]---[3]---[4]
          
    
    [2] 
    
    
    
    */
    ended = () => {
        return this.players[0].hand.length == 0 || this.players[1].hand.length == 0;
    }

    toString = (forPlayer) => {
        let str = '';
        str += "Current Game State (for " + this.players[forPlayer] + "):\n";
        str += "Deck cards left: " + this.gameState.deck.length() + "\n";
        str += "Top card of burn pile: "
            + (this.gameState.burnPile.cards.length > 0 ? this.gameState.burnPile.topCard().toString() : 'None');
        + (this.gameState.burnPile.dead) ? ' (dead)' : '';
        str += "\n";
        str += "Down Piles: " + "\n";
        this.gameState.downPiles.forEach((pile, idx) => {
            str += idx + ": " + pile.toString() + " (" + pile.getOwner() +")\n";
        });
        str += "Opponent has " + this.players[forPlayer == 0 ? 1 : 0].hand.length() + " cards\n";
        str += "Your hand: " + this.players[forPlayer == 0 ? 0 : 1].hand.toString() + "\n";
        return str;
    }
    
    playRound = () => {
        this.gameState.setFirstTurn(true); 
        this.players[0].draw(this.gameState.deck, 11);
        this.players[1].draw(this.gameState.deck, 10);
        // 2 3's
        this.gameState.initialize(); // reset game board
        console.log(this.toString(0));
        while (!this.ended()) {
        
            console.log(`Player ${this.players[0].name}'s turn`);
            let newGameState = this.players[0].takeTurn(this.gameState);
            console.log(`Player ${this.players[0].name}'s turn ended`);
        
            // TODO Validate newGameState
            this.gameState = newGameState;
            if (this.ended()) {
                break;
            }
            console.log(this.toString(1));
            console.log(`Player ${this.players[1].name}'s turn`);
            this.gameState.firstTurn = false;
            newGameState = this.players[1].takeTurn(this.gameState);
            console.log(`Player ${this.players[1].name}'s turn ended`);

            // TODO Validate newGameState
            this.gameState = newGameState;
        }
        if (this.ended()) { 
            console.log("Game ended!");
        }
    }
}

const game = new Game();
game.playRound(); 