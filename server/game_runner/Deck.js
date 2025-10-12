const Card = require('./Card');
const { SUITS, VALUES } = require('./Constants');

class Deck {
    constructor(nJokers, nDecks = 1, rng = Math.random) {
        this.rng = rng;
        this.reset(nJokers, nDecks);
    }

    shuffle = () => {
        const { cards } = this;
        let m = cards.length, i;

        while (m) {
            i = Math.floor(this.rng() * m--);
            [cards[m], cards[i]] = [cards[i], cards[m]];
        }
    }

    draw = (nCards) => {
        const { cards } = this;
        if (cards.length < nCards) {
            throw new Error(`Cannot draw ${nCards} cards, only ${cards.length} cards remaining in deck`);
        }
        return cards.splice(cards.length - nCards, nCards);
    }
    
    /**
     * Add cards to the deck and shuffle
     * @param {Card[]} newCards - Cards to add to deck
     */
    addCards = (newCards) => {
        this.cards.push(...newCards);
        this.shuffle();
    }
    
    /**
     * Check if deck has enough cards for a draw
     * @param {number} nCards - Number of cards needed
     * @returns {boolean} True if deck has enough cards
     */
    canDraw = (nCards) => {
        return this.cards.length >= nCards;
    }

    reset = (nJokers, nDecks = 1) => {
        this.cards = [];
        
        // Create the specified number of decks
        for (let deckNum = 0; deckNum < nDecks; deckNum++) {
            for (let suit of SUITS.slice(0, 4)) {
                for (let value of VALUES) {
                    this.cards.push(new Card(suit, value));
                }
            }
        }
        
        // Add jokers (distributed across decks)
        for (let i = 0; i < nJokers; i++) {
            this.cards.push(new Card());
        }
        
        // Shuffle after creating all cards
        this.shuffle();
    }

    length = () => {
        return this.cards.length;
    }

    /**
     * Deterministically set the deck order for tests.
     * The top of the deck is the end of the array (draw() pops from the end).
     * Accepts an array of either Card instances or plain objects { suit, value }.
     */
    setCards = (cards) => {
        if (!Array.isArray(cards)) {
            throw new Error('setCards expects an array');
        }
        this.cards = cards.map(c => {
            if (c instanceof Card) return c;
            if (typeof c === 'string') {
                try { return Card.fromString(c); } catch (_) { return new Card(); }
            }
            return new Card(c.suit, c.value);
        });
    }
}

module.exports = Deck; 