const Card = require('./Card'); 

class Hand{
    constructor(){
        this.cards = [];
    }
    length = () => {
        return this.cards.length;
    }

    addCard(card){
        this.cards.push(card);
    }

    addCards(cards){
        this.cards.push(...cards);
    }

    clear(){
        this.cards = [];
    }

    swap(idx1, idx2){
        [this.cards[idx1], this.cards[idx2]] = [this.cards[idx2], this.cards[idx1]];
    }

    toString(colors=false){
        return this.cards.map(card => card.toString(colors)).join('');
    }
    static fromString(str){
        // Each card starts with [ and ends with ]
        // get each card substring
        let cards = [];
        let startIdx = 0;
        let endIdx = 0;
        while (endIdx < str.length) {
            if (str[endIdx] === '[') {
                startIdx = endIdx;
            } else if (str[endIdx] === ']') {
                cards.push(Card.fromString(str.slice(startIdx, endIdx + 1)));
            }
            endIdx++;
        }
        let hand = new Hand();
        hand.addCards(cards);
        return hand;
    }
}

module.exports = Hand; 