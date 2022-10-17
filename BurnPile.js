class BurnPile {
    constructor() {
        this.cards = [];
        this.dead = true;
    }
    canTake = () => {
        return this.cards.length > 0 && !this.dead;
    }

    take = () => {
        if (this.canTake()) {
            this.dead = true;
            return this.cards.pop();
        }
    }

    add = (card) => {
        this.cards.push(card);
        this.dead = false;
    }
}

module.exports = BurnPile;