const Hand = require('./Hand');
const { Menu } = require('./Menu');
const { isValidDupes, isValidSequence } = require('./Utils');
const DownPile = require('./DownPile');
class Player {
    constructor(name) {
        this.name = name;
        this.hand = new Hand();
        this.roundReset();

    }
    roundReset = () => {
        this.tookCard = false;
        this.isDown = false;
        this.discarded = false;
        this.isOut = false;
    }

    draw = (deck, nCards) => {
        this.hand.addCards(deck.draw(nCards));
    }

    toString = () => { return `${this.name}: ${this.hand.toString()}`; }

    canTakeFromDiscard = (gameState) => {
        return !this.isDown &&
            !this.tookCard &&
            !this.discarded &&
            !gameState.burnPile.dead;
    }

    takeFromDiscard = (gameState) => {
        if (this.canTakeFromDiscard(gameState)) {
            this.hand.addCard(gameState.burnPile.takeCard());
            this.tookCard = true;
        }
    }

    takeFromDeck = (gameState) => {
        if (!this.tookCard) {
            const drawnCards = gameState.deck.draw(1);
            this.hand.addCard(drawnCards[0]);
            this.tookCard = true;
        }
    }

    showDiscardOptions = (gameState) => {
        let menu = new Menu();
        this.hand.cards.forEach((card, idx) => {
            menu.addOption(`${card.toString()}`, () => { this.discard(gameState, idx) });
        });
        menu.showOptionsAndProcessResponse(); 
    }

    discard = (gameState, idx) => {
        if (idx > -1 && idx < this.hand.length()) {
            console.log(`Discarding ${this.hand.cards[idx].toString()}`);
            gameState.burnPile.addCard(this.hand.cards[idx]);
            this.hand.cards.splice(idx, 1);
            this.discarded = true;
            console.log(`Your hand: ${this.hand.toString()}`);
            if (gameState.burnPile.cards.length > 0) {
                console.log(`Burn pile top card: ${gameState.burnPile.topCard().toString()}`);
            }
        }
    }

    showDownOptions = (gameState) => {

    }



    goDown = (gameState, list_of_indices) => {
        // Hard coding 2 dupes for now (3, 3)
        if (!this.isDown && !this.discarded && this.tookCard) {
            let filteredCards = this.hand.cards.filter((card, idx) => { return list_of_indices.includes(idx) });
            if (!isValidDupes(filteredCards)) {
                console.log("Unable to go down with this sequence: " + filteredCards.map((card) => { return card.toString() }).join(', '));
                return false;
            }
            // remove the cards from hand and place in new down pile
            let downPile = new DownPile('dupes', this.name);
            // Sort indices in descending order to avoid index shifting issues
            let sortedIndices = list_of_indices.sort((a, b) => b - a);
            for (let i = 0; i < sortedIndices.length; i++) {
                downPile.addCard(this.hand.cards[sortedIndices[i]]);
                this.hand.cards.splice(sortedIndices[i], 1);
            }
            gameState.downPiles.push(downPile);
            this.isDown = true;
            console.log(`Successfully went down with: ${filteredCards.map(card => card.toString()).join(', ')}`);
            return true;
        }
        return false;
    }

    takeTurn = (gameState) => {
        let newGameState = { ...gameState }
        while (!this.discarded) {
            console.log('FIRST TURN: ' + newGameState.firstTurn);
            if (gameState.firstTurn === true) {
                const menu = new Menu();
                menu.addOption('Discard', () => {
                    this.showDiscardOptions(gameState);
                });
                menu.addOption('Go Down');

                menu.showOptionsAndProcessResponse();
                gameState.firstTurn = false;
                break;
            }
            else if (!this.tookCard) {
                // new menu to either take from deck or take from discard
                const menu = new Menu('Draw a card. What would you like to do?');
                menu.addOption('Take from deck', () => {
                    this.takeFromDeck(newGameState);
                });
                if (this.canTakeFromDiscard(newGameState)) {
                    menu.addOption('Take from discard', () => {
                        this.takeFromDiscard(newGameState);
                    });
                }
                menu.showOptionsAndProcessResponse();
                continue;
            }
            if (!this.isDown) {
                // new menu to either go down or discard
                const menu = new Menu();
                menu.addOption('Go down', () => {
                    this.goDown(newGameState);
                });
                menu.addOption('Discard', () => {
                    this.discard(newGameState);
                });
                menu.showOptionsAndProcessResponse();
            }

        }
        return newGameState;
    }
}

module.exports = Player;