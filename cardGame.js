class Card{
    constructor(suit, value){
        this.suit = suit;
        this.value = value;
    }

    constructor(){
        this.suit = 'Joker';
        this.value = 'Joker';
    }
}

const SUITS = [
    'Hearts',
    'Spades',
    'Clubs',
    'Diamonds',
    'Joker'
]

const VALUES = [
    'Ace',
    'King',
    'Queen',
    'Jack',
    'Ten',
    'Nine',
    'Eight',
    'Seven',
    'Six',
    'Five',
    'Four',
    'Three',
    'Two'
]

class Deck{
    constructor(nJokers){
        this.reset(nJokers);
    }

    shuffle = () => {
        const { cards } = this;
        let m = cards.length, i;

        while(m){
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
        for(let suit of SUITS.slice(0,4)){
            for(let value of VALUES){
                this.cards.push(new Card(suit, value));
            }
        }
        for (let i = 0; i < nJokers; i++){
            this.cards.push(new Card());
        }
    }
}



// Round of the game. Shuffle deck, deal 5 cards to each player, 
// take turns putting down one card until no cards are left
