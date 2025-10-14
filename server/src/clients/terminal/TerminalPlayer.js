const Hand = require('../../core/domain/Hand');
const SimpleMenu = require('./SimpleMenu');
const GameIO = require('../../shared/GameIO');
const CardSorter = require('../../core/utils/CardSorter');
const { isValidDupes, isValidSequence } = require('../../core/utils/Utils');
const DownPile = require('../../core/domain/DownPile');
const { getContractForRound } = require('../../core/rules/RoundContract');

/**
 * Enhanced player class for terminal-based Contract Rummy gameplay
 * Supports interactive meld selection, adding to existing melds, and screen-based turns
 */
class TerminalPlayer {
    /**
     * Create a new terminal player
     * @param {string} name - Player's display name
     */
    constructor(name) {
        this.name = name;
        this.hand = new Hand();
        this.roundReset();
    }

    /**
     * Reset player state for a new round
     */
    roundReset = () => {
        this.hand.clear();
        this.tookCard = false;
        this.isDown = false;
        this.discarded = false;
        this.isOut = false;
    }

    /**
     * Draw initial cards from deck
     * @param {Deck} deck - The deck to draw from
     * @param {number} nCards - Number of cards to draw
     */
    draw = (deck, nCards) => {
        this.hand.addCards(deck.draw(nCards));
    }
    
    /**
     * Draw cards from game state deck with reshuffle support
     * @param {GameState} gameState - Game state containing deck and burn pile
     * @param {number} nCards - Number of cards to draw
     */
    drawFromGameState = (gameState, nCards) => {
        this.hand.addCards(gameState.drawFromDeck(nCards));
    }

    // String representation of player and their hand
    toString = () => { return `${this.name}: ${this.hand.toString()}`; }

    // Check if player can take from discard pile (not dead, hasn't drawn yet, not already down)
    canTakeFromDiscard = (gameState) => {
        return !this.tookCard &&
               !this.discarded &&
               !this.isDown &&
               !gameState.burnPile.dead &&
               gameState.burnPile.cards.length > 0;
    }

    // Take the top card from discard pile
    takeFromDiscard = (gameState) => {
        if (this.canTakeFromDiscard(gameState)) {
            this.hand.addCard(gameState.burnPile.takeCard());
            this.tookCard = true;
            console.log(`Drew ${this.hand.cards[this.hand.cards.length - 1].toString()} from discard pile`);
        }
    }

    // Draw a card from the deck
    takeFromDeck = (gameState) => {
        if (!this.tookCard) {
            const drawnCards = gameState.drawFromDeck(1);
            const drawnCard = drawnCards[0];
            this.hand.addCard(drawnCard);
            this.tookCard = true;
            console.log(`Drew ${drawnCard.toString()} from deck`);
        }
    }

    // Show menu to select which card to discard
    async selectCardsToDiscard(gameState) {
        const menu = new SimpleMenu('Select a card to discard:');
        this.hand.cards.forEach((card, idx) => {
            menu.addOption(`${card.toString()}`, () => idx);
        });
        menu.addOption('Cancel (return to main menu)', () => 'cancel');
        
        const cardIndex = await menu.showAndExecute();
        if (cardIndex === 'cancel') {
            return false; // Return false to indicate cancellation
        }
        
        this.discard(gameState, cardIndex);
        return true; // Return true to indicate successful discard
    }

    // Discard a card at the given index to the burn pile
    discard = (gameState, idx) => {
        if (idx >= 0 && idx < this.hand.length()) {
            const cardToDiscard = this.hand.cards[idx];
            console.log(`Discarding ${cardToDiscard.toString()}`);
            gameState.burnPile.addCard(cardToDiscard);
            this.hand.cards.splice(idx, 1);
            this.discarded = true;
            console.log(`Your hand: ${this.hand.toString()}`);
            if (gameState.burnPile.cards.length > 0) {
                console.log(`Burn pile top card: ${gameState.burnPile.topCard().toString()}`);
            }
        }
    }

    // Get user input (delegated to GameIO utility)
    async getUserInput(prompt) {
        return GameIO.getUserInput(prompt);
    }

    // Parse comma-separated input into card indices (delegated to GameIO utility)
    parseCardIndices(input) {
        return GameIO.parseCardIndices(input, this.hand.length());
    }

    // Validate a single meld (set or sequence)
    validateMeld(cardIndices) {
        if (cardIndices.length < 3) {
            return { valid: false, reason: 'Need at least 3 cards for a meld' };
        }
        
        const cards = cardIndices.map(idx => this.hand.cards[idx]);
        
        // Check for duplicates
        const uniqueIndices = new Set(cardIndices);
        if (uniqueIndices.size !== cardIndices.length) {
            return { valid: false, reason: 'Cannot use the same card twice' };
        }
        
        // Check if it's a valid set (same rank)
        if (isValidDupes(cards)) {
            return { valid: true, type: 'set', cards };
        }
        
        // Check if it's a valid sequence (consecutive same suit)
        if (isValidSequence(cards)) {
            return { valid: true, type: 'sequence', cards };
        }
        
        return { valid: false, reason: 'Cards do not form a valid set (same rank) or sequence (consecutive same suit)' };
    }

    // Interactive menu for selecting cards to go down (lay initial melds)
    async selectCardsToGoDown(gameState, currentRound = 1) {
        console.log('\n=== Going Down ===');
        console.log('You need to form melds (sets of 3+ same rank OR sequences of 4+ consecutive same suit)');
        
        // Get contract info for current round
        let contract;
        try {
            contract = getContractForRound(currentRound);
            console.log(`Contract: ${contract.toString()}\n`);
        } catch (error) {
            console.log('For this round, you need: 2 sets of 3 cards each\n');
            // Fallback contract for Round 1
            contract = { requirements: [{ type: 'set', minCards: 3 }, { type: 'set', minCards: 3 }] };
        }
        
        const selectedMelds = [];
        const usedCardIndices = new Set();
        const requiredMelds = contract.requirements.length;
        
        // Select each required meld
        for (let meldNum = 1; meldNum <= requiredMelds; meldNum++) {
            const meld = await this.selectSingleMeld(meldNum, requiredMelds, usedCardIndices);
            if (!meld) {
                console.log('Going down cancelled.');
                return false;
            }
            selectedMelds.push(meld);
        }
        
        // Show summary and get confirmation
        GameIO.displayMeldSummary(selectedMelds);
        
        // Validate contract requirements
        if (contract.isContractSatisfied && !contract.isContractSatisfied(selectedMelds)) {
            console.log('\n❌ Selected melds do not satisfy the contract requirements.');
            console.log('Please try again with melds that match the contract.');
            return false;
        }
        
        const confirmed = await this.confirmGoingDown();
        if (!confirmed) {
            console.log('Going down cancelled.');
            return false;
        }
        
        // Execute the go down
        return this.goDownWithMelds(gameState, selectedMelds);
    }

    // Select a single meld from available cards
    async selectSingleMeld(meldNum, totalMelds, usedCardIndices) {
        console.log(`\n--- Selecting Meld ${meldNum} of ${totalMelds} ---`);
        
        while (true) {
            // Show available cards
            GameIO.displayCardList(this.hand.cards, 'Available cards:', usedCardIndices);
            
            const input = await this.getUserInput(`\nEnter card numbers for meld ${meldNum} (comma-separated, e.g. 1,2,3) or 'cancel' to abort: `);
            
            const indices = this.parseCardIndices(input);
            
            if (indices === null) {
                return null; // Cancelled
            }
            
            if (indices === 'invalid') {
                console.log('Invalid input. Please enter valid card numbers.');
                continue;
            }
            
            // Check if any cards are already used
            const alreadyUsed = indices.some(idx => usedCardIndices.has(idx));
            if (alreadyUsed) {
                console.log('Some of those cards are already used in previous melds. Please select different cards.');
                continue;
            }
            
            // Validate the meld
            const validation = this.validateMeld(indices);
            
            if (!validation.valid) {
                console.log(`Invalid meld: ${validation.reason}`);
                console.log('Try again or type "cancel" to abort.');
                continue;
            }
            
            // Meld is valid!
            console.log(`✅ Valid ${validation.type}: ${validation.cards.map(card => card.toString()).join(', ')}`);
            
            // Mark these cards as used
            indices.forEach(idx => usedCardIndices.add(idx));
            
            return { indices, type: validation.type, cards: validation.cards };
        }
    }

    // Get confirmation for going down using numbered menu
    async confirmGoingDown() {
        const confirmMenu = new SimpleMenu('\nConfirm going down with these melds?');
        confirmMenu.addOption('Yes, go down', () => true);
        confirmMenu.addOption('No, cancel', () => false);
        
        return await confirmMenu.showAndExecute();
    }

    // Interactive interface for adding a card to an existing meld
    async selectCardToAddToMeld(gameState) {
        console.log('\n=== Add to Existing Melds ===');
        
        // Show available melds and create meld selection menu
        console.log('Available melds on table:');
        gameState.downPiles.forEach((pile, idx) => {
            console.log(`${idx + 1}. ${pile.toString()} (${pile.getOwner()})`);
        });
        
        const meldMenu = new SimpleMenu('\nSelect meld number to add to:');
        gameState.downPiles.forEach((pile, idx) => {
            meldMenu.addOption(`${pile.toString()} (${pile.getOwner()})`, () => idx);
        });
        meldMenu.addOption('Cancel', () => 'cancel');
        
        const meldIndex = await meldMenu.showAndExecute();
        if (meldIndex === 'cancel') {
            console.log('Adding to meld cancelled.');
            return false;
        }
        
        const selectedMeld = gameState.downPiles[meldIndex];
        
        // Show player's hand and create card selection menu
        console.log('\nYour hand:');
        this.hand.cards.forEach((card, idx) => {
            console.log(`${idx + 1}. ${card.toString()}`);
        });
        
        const cardMenu = new SimpleMenu('\nSelect card number to add:');
        this.hand.cards.forEach((card, idx) => {
            cardMenu.addOption(`${card.toString()}`, () => idx);
        });
        cardMenu.addOption('Cancel', () => 'cancel');
        
        const cardIndex = await cardMenu.showAndExecute();
        if (cardIndex === 'cancel') {
            console.log('Adding to meld cancelled.');
            return false;
        }
        
        const selectedCard = this.hand.cards[cardIndex];
        
        // Determine where to add the card (beginning, end, or replace joker)
        return await this.addCardToMeld(gameState, selectedMeld, selectedCard, cardIndex, meldIndex);
    }

    // Add a card to a specific meld (handles beginning/end placement and joker replacement)
    async addCardToMeld(gameState, meld, card, cardIndex, meldIndex) {
        console.log(`\nAttempting to add ${card.toString()} to meld: ${meld.toString()}`);
        
        // Check what options are available for this card
        const canAddToBeginning = this.canAddCardToMeld(meld, card, 0);
        const canAddToEnd = this.canAddCardToMeld(meld, card, null);
        
        // Check if we can replace a joker (only for sequences)
        const jokerIndex = meld.cards.findIndex(c => c.value === 'Joker');
        const canReplaceJoker = jokerIndex !== -1 && meld.type === 'sequence' && 
                               this.canReplaceJokerInMeld(meld, card, jokerIndex);
        
        // If multiple options are available, let player choose
        if ((canAddToBeginning || canAddToEnd) && canReplaceJoker) {
            const replaceMenu = new SimpleMenu(`\nThis sequence has a joker at position ${jokerIndex + 1}. What would you like to do?`);
            replaceMenu.addOption('Replace the joker', () => 'replace');
            replaceMenu.addOption('Add to beginning/end instead', () => 'add');
            
            const choice = await replaceMenu.showAndExecute();
            if (choice === 'replace') {
                return await this.replaceJokerInMeld(gameState, meld, card, cardIndex, meldIndex, jokerIndex);
            }
        } else if (canReplaceJoker && !canAddToBeginning && !canAddToEnd) {
            // Only joker replacement is possible
            return await this.replaceJokerInMeld(gameState, meld, card, cardIndex, meldIndex, jokerIndex);
        }
        
        // Try adding to beginning (index 0)
        if (canAddToBeginning) {
            meld.addCard(card, 0);
            this.hand.cards.splice(cardIndex, 1);
            console.log(`✅ Added ${card.toString()} to beginning of meld.`);
            console.log(`   Updated meld: ${meld.toString()}`);
            return true;
        }
        
        // Try adding to end
        if (canAddToEnd) {
            meld.addCard(card);
            this.hand.cards.splice(cardIndex, 1);
            console.log(`✅ Added ${card.toString()} to end of meld.`);
            console.log(`   Updated meld: ${meld.toString()}`);
            return true;
        }
        
        console.log(`❌ Cannot add ${card.toString()} to this meld. It doesn't form a valid sequence or set.`);
        return false;
    }

    // Check if a card can be added to a meld at a specific position without modifying the meld
    canAddCardToMeld(meld, card, idx) {
        let newCards = [...meld.cards];
        
        if (idx !== null) {
            // add card at specific index
            newCards.splice(idx, 0, card);
        } else {
            // add card at end
            newCards.push(card);
        }
        
        if (meld.type === 'dupes' && isValidDupes(newCards)) {
            return true;
        } else if (meld.type === 'sequence' && isValidSequence(newCards)) {
            return true;
        }
        return false;
    }

    // Check if a card can replace a joker in a meld without modifying the meld
    canReplaceJokerInMeld(meld, card, jokerIndex) {
        if (meld.cards[jokerIndex].value !== 'Joker') {
            return false;
        }
        
        // Try replacing joker and placing it at front
        let newCards = [...meld.cards];
        let joker = newCards[jokerIndex];
        newCards[jokerIndex] = card;
        newCards = [joker, ...newCards];
        
        if (meld.type === 'sequence' && isValidSequence(newCards)) {
            return true;
        }
        
        // Try replacing joker and placing it at back
        newCards = [...meld.cards];
        newCards[jokerIndex] = card;
        newCards = [...newCards, joker];
        
        if (meld.type === 'sequence' && isValidSequence(newCards)) {
            return true;
        }
        
        return false;
    }

    // Handle joker replacement in melds
    async replaceJokerInMeld(gameState, meld, card, cardIndex, meldIndex, jokerIndex) {
        const positionMenu = new SimpleMenu('\nWhere should the replaced joker be placed?');
        positionMenu.addOption('At the front of the sequence', () => true);
        positionMenu.addOption('At the back of the sequence', () => false);
        
        const front = await positionMenu.showAndExecute();
        
        if (meld.replaceJoker(card, jokerIndex, front)) {
            this.hand.cards.splice(cardIndex, 1);
            console.log(`✅ Replaced joker with ${card.toString()}.`);
            console.log(`   Updated meld: ${meld.toString()}`);
            return true;
        } else {
            console.log(`❌ Cannot replace joker with ${card.toString()} in this meld.`);
            return false;
        }
    }

    // Execute going down with multiple melds
    goDownWithMelds = (gameState, selectedMelds) => {
        if (!this.isDown && !this.discarded && this.tookCard) {
            // Create down piles for each meld (with cards included in constructor)
            selectedMelds.forEach(meld => {
                const meldType = meld.type === 'set' ? 'dupes' : 'sequence';
                const downPile = new DownPile(meldType, this.name, meld.cards);
                gameState.downPiles.push(downPile);
            });
            
            // Collect all indices to remove (sort descending to avoid index shifting)
            const allIndices = [];
            selectedMelds.forEach(meld => {
                allIndices.push(...meld.indices);
            });
            const sortedIndices = allIndices.sort((a, b) => b - a);
            
            // Remove cards from hand (in descending order to avoid index issues)
            sortedIndices.forEach(idx => {
                this.hand.cards.splice(idx, 1);
            });
            
            this.isDown = true;
            console.log(`\n🎉 Successfully went down with ${selectedMelds.length} melds!`);
            selectedMelds.forEach((meld, idx) => {
                console.log(`  Meld ${idx + 1}: ${meld.cards.map(card => card.toString()).join(', ')}`);
            });
            return true;
        }
        return false;
    }

    // Legacy method for backward compatibility
    goDown = (gameState, list_of_indices) => {
        // Convert old single-meld format to new multi-meld format
        const validation = this.validateMeld(list_of_indices);
        if (!validation.valid) {
            console.log(`Unable to go down: ${validation.reason}`);
            return false;
        }
        
        const selectedMelds = [{
            indices: list_of_indices,
            type: validation.type,
            cards: validation.cards
        }];
        
        return this.goDownWithMelds(gameState, selectedMelds);
    }

    /**
     * Execute a complete player turn with all possible actions
     * @param {GameState} gameState - Current game state
     * @returns {Promise<GameState>} Updated game state after turn
     */
    async takeTurn(gameState, currentRound = 1) {
        console.log(`\n=== ${this.name}'s Turn ===`);
        console.log(`Your hand: ${this.hand.toString()}`);
        
        this.tookCard = false;
        this.discarded = false;

        // Step 1: Draw a card (unless it's first turn and player already has 11 cards)
        if (!gameState.firstTurn) {
            const drawMenu = new SimpleMenu('Draw a card:');
            drawMenu.addOption('Take from deck', () => 'deck');
            
            if (this.canTakeFromDiscard(gameState)) {
                drawMenu.addOption(`Take from discard pile (${gameState.burnPile.topCard().toString()})`, () => 'discard');
            }

            const drawChoice = await drawMenu.showAndExecute();
            
            if (drawChoice === 'deck') {
                this.takeFromDeck(gameState);
            } else if (drawChoice === 'discard') {
                this.takeFromDiscard(gameState);
            }

            console.log(`Your hand after drawing: ${this.hand.toString()}`);
        }

        // Step 2: Main action phase - go down, add to melds, or discard
        while (!this.discarded) {
            // Special case: if only 1 card left, can only discard (to win)
            if (this.hand.length() === 1) {
                console.log('\nYou have only 1 card left! You must discard to win the game.');
                const discarded = await this.selectCardsToDiscard(gameState);
                if (discarded) {
                    break;
                }
                // If cancelled, continue the loop (though with 1 card, they must discard)
                continue;
            }
            
            const actionMenu = new SimpleMenu('Choose your action:');
            
            // Option 1: Always available - Discard and end turn
            actionMenu.addOption('Discard and end turn', () => 'discard');
            
            // Option 2: Go down if haven't gone down yet and have drawn a card
            if (!this.isDown && this.tookCard) {
                actionMenu.addOption('Go Down (lay down sets)', () => 'godown');
            }
            
            // Option 3: Add to existing melds if already down and there are melds on table
            if (this.isDown && gameState.downPiles.length > 0) {
                actionMenu.addOption('Add to existing melds', () => 'addtomeld');
            }
            
            // Option 4: Always available - Sort hand
            actionMenu.addOption('Sort hand', () => 'sort');

            const action = await actionMenu.showAndExecute();

            if (action === 'godown') {
                const wentDown = await this.selectCardsToGoDown(gameState, currentRound);
                if (!wentDown) {
                    continue; // Try again if going down failed
                }
            } else if (action === 'addtomeld') {
                const addedToMeld = await this.selectCardToAddToMeld(gameState);
                if (!addedToMeld) {
                    continue; // Try again if adding to meld failed
                }
            } else if (action === 'sort') {
                await this.sortHand();
                continue; // Return to action menu after sorting
            } else if (action === 'discard') {
                const discarded = await this.selectCardsToDiscard(gameState);
                if (!discarded) {
                    // If cancelled, continue to action menu
                    continue;
                }
            }
        }

        // Check if player has won (no cards left)
        if (this.hand.length() === 0) {
            this.isOut = true;
            console.log(`${this.name} is out! Game over!`);
        }

        return gameState;
    }

    /**
     * Interactive hand sorting with multiple options
     */
    async sortHand() {
        console.log('\n=== Sort Hand ===');
        console.log('Current hand:', this.hand.toString());
        
        const { menu: sortMenu, sortingOptions } = this.buildSortingMenu();
        const choice = await sortMenu.showAndExecute();
        
        if (choice === 'cancel') {
            console.log('Hand sorting cancelled.');
            return;
        }
        
        // Find the selected sorting option and apply it
        const selectedOption = sortingOptions.find(opt => opt.key === choice);
        if (selectedOption) {
            this.hand.cards = selectedOption.sorter(this.hand.cards);
            console.log('\n✅ Hand sorted!');
            console.log('New order:', this.hand.toString());
        }
    }

    // Build a sorting menu that can be reused across sorting actions
    buildSortingMenu(title = 'How would you like to sort your hand?') {
        const sortingOptions = CardSorter.getSortingOptions();
        const menu = new SimpleMenu(title);

        sortingOptions.forEach(option => {
            menu.addOption(option.name, () => option.key);
        });

        menu.addOption('Cancel (keep current order)', () => 'cancel');

        return { menu, sortingOptions };
    }
}

module.exports = TerminalPlayer;