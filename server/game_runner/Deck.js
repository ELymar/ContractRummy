const Card = require('./Card');
const { SUITS, VALUES } = require('./constants');

class Deck {
    constructor(nJokers) {
        this.reset(nJokers);
    }

    shuffle = () => {
        const { cards } = this;
        let m = cards.length, i;

        while (m) {
            i = Math.floor(Math.random() * m--);
            [cards[m], cards[i]] = [cards[i], cards[m]];
        }
    }

    draw = (nCards) => {
        const { cards } = this;
        return cards.splice(cards.length - nCards, nCards);
    }

    reset = (nJokers) => {
        this.cards = [];
        for (let suit of SUITS.slice(0, 4)) {
            for (let value of VALUES) {
                this.cards.push(new Card(suit, value));
            }
        }
        for (let i = 0; i < nJokers; i++) {
            this.cards.push(new Card());
        }
    }

    length = () => {
        return this.cards.length;
    }
}

module.exports = Deck; 