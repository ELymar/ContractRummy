class BurnPile {
    constructor() {
        this.cards = [];
        this.dead = true;
    }
    canTake = () => {
        return this.cards.length > 0 && !this.dead;
    }

    takeCard = () => {
        if (this.canTake()) {
            this.dead = true;
            return this.cards.pop();
        }
    }

    addCard = (card) => {
        this.cards.push(card);
        this.dead = false;
    }

    topCard = () => {
        return this.cards[this.cards.length - 1];
    }
}

module.exports = BurnPile;