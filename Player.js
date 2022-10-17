const Hand = require('./Hand');

class Player {
    constructor(name) {
        this.name = name;
        this.hand = new Hand();
    }

    draw = (deck, nCards) => {
        this.hand.addCards(deck.draw(nCards));
    }

    toString = () => { return `${this.name}: ${this.hand.toString()}`; }

    turn = (first) => {  
        if(first){
            // Can only put one down
            
        }
    }
}
module.exports = Player;