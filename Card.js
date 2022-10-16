class Card{
    constructor(suit, value){
        if (!suit) this.suit = 'Joker';
        if (!value) this.value = 'Joker';
        this.suit = suit;
        this.value = value;
    }
}

module.exports = Card;
