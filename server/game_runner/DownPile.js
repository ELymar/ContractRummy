const { isValidDupes, isValidSequence } = require('./Utils.js');
class DownPile {
    constructor(cards, player) {
        if (isValidDupes(cards)) {
            this.type = 'dupes';
        } else if (isValidSequence(cards)) {
            this.type = 'sequence';
        }
        else {
            throw new Error('Invalid cards for downpile');
        }
        this.cards = cards; 
        this.owner = player;
    }

    getCards = () => {
        //join tostrings
        return this.cards.map(card => card.toString()).join('');
    }

    getOwner = () => {
        return this.owner;
    }

    addCard = (card, idx) => {
        // add card at idx and move others
        let newCards = [...this.cards];
        newCards.splice(idx, 0, card);
        if (this.type === 'dupes' && isValidDupes(newCards)) {
            this.cards = newCards;
            return true;
        } else if (this.type === 'sequence' && isValidSequence(newCards)) {
            this.cards = newCards;
            return true;
        } else {
            return false;
        }
    }

    replaceJoker = (card, idx, front) => {
        // fail fast if not joker
        if (this.cards[idx].value !== 'Joker') {
            return false;
        }
        let newCards = [...this.cards];
        let joker = newCards[idx]
        newCards[idx] = card;
        if (front) {
            // place joker in front
            newCards = [joker, ...newCards];
        } else {
            // place joker in back
            newCards = [...newCards, joker];
        }
        if (this.type === 'dupes' && isValidDupes(newCards)) {
            this.cards = newCards;
            return true;
        }
        else if (this.type === 'sequence' && isValidSequence(newCards)) {
            this.cards = newCards;
            return true;
        }
        return false;
    }
}

module.exports = DownPile;