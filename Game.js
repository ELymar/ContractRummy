const Deck = require('./Deck');
const Constants = require('./Constants');
const Card = require('./Card');
const Player = require('./Player');
const BurnPile = require('./BurnPile');

class Game{
    constructor(){
        this.deck = new Deck(6);
        this.players = [];
        this.players.push(new Player('Player 1')); 
        this.players.push(new Player('Player 2')); 
    }

    playRound = () => {
        // 2 3's
        this.deck.shuffle()
        this.players[0].draw(this.deck, 11); 
        this.players[1].draw(this.deck, 10); 
        console.log(this.players[0].hand.toString());
        console.log(this.players[1].hand.toString());
        console.log(this.deck.length); 

        const burnPile = new BurnPile(); 
        const downPiles = []; 

        while(this.players[0].hand.cards.length > 0 && this.players[1].hand.cards.length > 0){
            player[0].turn(); 
            if(player[0].hand.cards.length == 0){
                break;
            }
            player[1].turn();
        }
        if (player[0].hand.cards.length == 0){
            console.log('Player 1 wins');
        }else{
            console.log('Player 2 wins');
        }
    }
}

const game = new Game();
game.playRound(); 