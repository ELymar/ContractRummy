class Player {
  constructor(name) {
    this.name = name;
    this.hand = [];
  }

    draw = (deck, nCards) => {
        this.hand = this.hand.concat(deck.draw(nCards));
    }

    swap = (first, second) => {
        [this.hand[first], this.hand[second]] = [this.hand[second], this.hand[first]];
    }

    handToString = () => { 
        return this.hand.map(card => card.toString()).join('');
    }
}

module.exports = Player;