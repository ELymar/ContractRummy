const { throwStatement } = require('@babel/types');
const Card = require('./Card'); 

// Sequence test, at least length 4, cards are same suit and in sequence. Joker is a wildcard
const isValidSequence = (cards) => {
    // Check length is greater than or equal to four
    if (cards.length < 4)
        return false; 
    
    // need at least 2 base cards
    let realCardCount = 0

    let i = 0; 
    let prev = null; 
    while (i < cards.length) {
        if (cards[i].value === 'Joker') {
            i++;
            continue;  
        }

    }

    
}

const isValidStraight = (cards) => {
    return false; 
}

// Four (straight flush length four)

module.exports = {isValidSequence, isValidStraight}