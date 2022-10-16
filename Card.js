const {SUIT_EMOJI, VALUE_EMOJI} = require('./Constants'); 

class Card{
    constructor(suit, value){
        this.suit = suit || 'Joker';
        this.value = value || 'Joker'; 
    }

    toString = () => {
        return `[${VALUE_EMOJI.get(this.value)}${SUIT_EMOJI.get(this.suit)}]`;
    }
}

module.exports = Card;
