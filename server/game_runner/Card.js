const chalk = require('chalk');
const crypto = require('crypto');
const {
    VALUE_TO_EMOJI_MAP,
    SUIT_TO_EMOJI_MAP,
    EMOJI_TO_VALUE_MAP,
    EMOJI_TO_SUIT_MAP,
    SUITS,
    VALUES
} = require('./Constants.js');

class Card{
    constructor(suit, value, uuid = null){
        this.suit = suit || SUITS[4]; // 'Joker' is at index 4 in SUITS
        this.value = value || SUITS[4]; // Use 'Joker' from SUITS for both suit and value
        this.uuid = uuid || crypto.randomUUID();
    }

    toString = (colors=false) => {
        let str = `[${VALUE_TO_EMOJI_MAP.get(this.value)}${SUIT_TO_EMOJI_MAP.get(this.suit)}]`;
        if (colors && (this.suit === 'Hearts' || this.suit === 'Diamonds')) {
            str = chalk.red(str);
        }
        return str; 
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
