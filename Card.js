const {
    VALUE_TO_EMOJI_MAP,
    SUIT_TO_EMOJI_MAP,
    EMOJI_TO_VALUE_MAP,
    EMOJI_TO_SUIT_MAP
} = require('./Constants.js');
class Card{
    constructor(suit, value){
        this.suit = suit || 'Joker';
        this.value = value || 'Joker'; 
    }

    toString = () => {
        return `[${VALUE_TO_EMOJI_MAP.get(this.value)}${SUIT_TO_EMOJI_MAP.get(this.suit)}]`;
    }

    static fromString = (str) => {
        if (str === '[🃏]') {
            return new Card();
        }else{
            // e.g. [K♥] or [10♠]
            if (str[0] != '[' || str.slice(-1) != ']') {
                throw new Error('Invalid card string');
            }
            const suit = EMOJI_TO_SUIT_MAP.get(str.slice(-2, -1));
            const value = EMOJI_TO_VALUE_MAP.get(str.slice(1, -2));
            return new Card(suit, value);
        }
    }
}



module.exports = Card;
