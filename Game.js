const Deck = require('./Deck');
const Constants = require('./Constants');
const Card = require('./Card');

class Game{
    constructor(){
        this.deck = new Deck(6);
        this.players = []; 
    }
}

// Round
f = () => {
    for (let suit of Constants.SUITS.slice(0, 4)) {
        for (let value of Constants.VALUES) {
            let emojiString = `[${Constants.VALUE_TO_EMOJI_MAP.get(value)}${Constants.SUIT_TO_EMOJI_MAP.get(suit)}]`
            console.log(emojiString);

        }
    }
    console.log(new Card().toString());
}
f(); 
