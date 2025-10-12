const { isValidDupes, isValidSequence } = require('./Utils.js');
class DownPile {
    constructor(type, player, cards = []) {
        this.type = type;
        this.owner = player;
        this.cards = cards;
        
        // If cards are provided, validate them
        if (cards.length > 0) {
            if (type === 'dupes' && !isValidDupes(cards)) {
                throw new Error('Invalid cards for dupes downpile');
            } else if (type === 'sequence' && !isValidSequence(cards)) {
                throw new Error('Invalid cards for sequence downpile');
            }
        }
    }

    getCards = () => {
        const CardSerializer = require('../shared/CardSerializer');
        return this.cards.map(card => CardSerializer.serializeForLog(card)).join('');
    }
    
    toString = () => {
        const CardSerializer = require('../shared/CardSerializer');
        const cardStrings = this.cards.map(card => CardSerializer.serializeForLog(card)).join('');
        return `${cardStrings} (${this.type})`;
    }

    getOwner = () => {
        return this.owner;
    }

    addCard = (card, idx = null) => {
        let newCards = [...this.cards];
        
        if (idx !== null) {
            // add card at specific index
            newCards.splice(idx, 0, card);
        } else {
            // add card at end
            newCards.push(card);
        }
        
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