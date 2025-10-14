const PlayerInterface = require('../PlayerInterface');
const SimpleMenu = require('./SimpleMenu');
const GameIO = require('../../shared/GameIO');
const CardSorter = require('../../core/utils/CardSorter');
const {isValidDupes, isValidSequence} = require('../../core/utils/Utils');
const DownPile = require('../../core/domain/DownPile');
const {getContractForRound} = require('../../core/rules/RoundContract');

/**
 * Terminal-based player interface for Contract Rummy gameplay
 * Provides CLI menus, prompts, and interactive card selection
 */
class TerminalPlayerInterface extends PlayerInterface {
  /**
   * Handle drawing a card with terminal menu interface
   * @param {GameState} gameState - Current game state
   * @param {Object} options - Drawing options
   * @returns {Promise<void>}
   */
  async drawCard(gameState, options = {}) {
    console.log(`\n=== ${this.name}'s Turn ===`);
    console.log(`Your hand: ${this.hand.toString()}`);

    const drawMenu = new SimpleMenu('Draw a card:');
    drawMenu.addOption('Take from deck', () => 'deck');

    if (options.canTakeFromDiscard) {
      drawMenu.addOption(
        `Take from discard pile (${gameState.burnPile.topCard().toString()})`,
        () => 'discard'
      );
    }

    const drawChoice = await drawMenu.showAndExecute();

    if (drawChoice === 'deck') {
      const drawnCard = this.takeFromDeck(gameState);
      console.log(`Drew ${drawnCard.toString()} from deck`);
    } else if (drawChoice === 'discard') {
      const success = this.takeFromDiscard(gameState);
      if (success) {
        console.log(
          `Drew ${this.hand.cards[this.hand.cards.length - 1].toString()} from discard pile`
        );
      }
    }

    console.log(`Your hand after drawing: ${this.hand.toString()}`);
  }

  /**
   * Present action menu and get player's choice
   * @param {GameState} gameState - Current game state
   * @param {Array} availableActions - Available actions
   * @returns {Promise<string>} Selected action
   */
  async selectAction(gameState, availableActions) {
    const actionMenu = new SimpleMenu('Choose your action:');

    if (availableActions.includes('discard')) {
      actionMenu.addOption('Discard and end turn', () => 'discard');
    }

    if (availableActions.includes('godown')) {
      actionMenu.addOption('Go Down (lay down sets)', () => 'godown');
    }

    if (availableActions.includes('addtomeld')) {
      actionMenu.addOption('Add to existing melds', () => 'addtomeld');
    }

    if (availableActions.includes('sort')) {
      actionMenu.addOption('Sort hand', () => 'sort');
    }

    return await actionMenu.showAndExecute();
  }

  /**
   * Handle card selection for discarding with terminal menu
   * @param {GameState} gameState - Current game state
   * @returns {Promise<boolean>} True if discard completed
   */
  async selectCardsToDiscard(gameState) {
    const menu = new SimpleMenu('Select a card to discard:');
    this.hand.cards.forEach((card, idx) => {
      menu.addOption(`${card.toString()}`, () => idx);
    });
    menu.addOption('Cancel (return to main menu)', () => 'cancel');

    const cardIndex = await menu.showAndExecute();
    if (cardIndex === 'cancel') {
      return false;
    }

    const discardedCard = this.discard(gameState, cardIndex);
    if (discardedCard) {
      console.log(`Discarding ${discardedCard.toString()}`);
      console.log(`Your hand: ${this.hand.toString()}`);
      if (gameState.burnPile.cards.length > 0) {
        console.log(`Burn pile top card: ${gameState.burnPile.topCard().toString()}`);
      }
      return true;
    }

    return false;
  }

  /**
   * Interactive menu for selecting cards to go down (lay initial melds)
   * @param {GameState} gameState - Current game state
   * @param {number} currentRound - Current round number
   * @returns {Promise<boolean>} True if went down successfully
   */
  async selectCardsToGoDown(gameState, currentRound = 1) {
    console.log('\n=== Going Down ===');
    console.log(
      'You need to form melds (sets of 3+ same rank OR sequences of 4+ consecutive same suit)'
    );

    // Get contract info for current round
    let contract;
    try {
      contract = getContractForRound(currentRound);
      console.log(`Contract: ${contract.toString()}\n`);
    } catch (error) {
      console.log('For this round, you need: 2 sets of 3 cards each\n');
      contract = {
        requirements: [
          {type: 'set', minCards: 3},
          {type: 'set', minCards: 3},
        ],
      };
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

  /**
   * Interactive interface for adding a card to an existing meld
   * @param {GameState} gameState - Current game state
   * @returns {Promise<boolean>} True if added to meld successfully
   */
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

    // Determine where to add the card
    return await this.addCardToMeld(gameState, selectedMeld, selectedCard, cardIndex, meldIndex);
  }

  /**
   * Interactive hand sorting with multiple options
   * @returns {Promise<void>}
   */
  async sortHand() {
    console.log('\n=== Sort Hand ===');
    console.log('Current hand:', this.hand.toString());

    const {menu: sortMenu, sortingOptions} = this.buildSortingMenu();
    const choice = await sortMenu.showAndExecute();

    if (choice === 'cancel') {
      console.log('Hand sorting cancelled.');
      return;
    }

    const selectedOption = sortingOptions.find((opt) => opt.key === choice);
    if (selectedOption) {
      this.hand.cards = selectedOption.sorter(this.hand.cards);
      console.log('\n✅ Hand sorted!');
      console.log('New order:', this.hand.toString());
    }
  }

  // Helper methods for terminal-specific UI logic

  async selectSingleMeld(meldNum, totalMelds, usedCardIndices) {
    console.log(`\n--- Selecting Meld ${meldNum} of ${totalMelds} ---`);

    while (true) {
      GameIO.displayCardList(this.hand.cards, 'Available cards:', usedCardIndices);

      const input = await this.getUserInput(
        `\nEnter card numbers for meld ${meldNum} (comma-separated, e.g. 1,2,3) or 'cancel' to abort: `
      );

      const indices = this.parseCardIndices(input);

      if (indices === null) {
        return null;
      }

      if (indices === 'invalid') {
        console.log('Invalid input. Please enter valid card numbers.');
        continue;
      }

      const alreadyUsed = indices.some((idx) => usedCardIndices.has(idx));
      if (alreadyUsed) {
        console.log(
          'Some of those cards are already used in previous melds. Please select different cards.'
        );
        continue;
      }

      const validation = this.validateMeld(indices);

      if (!validation.valid) {
        console.log(`Invalid meld: ${validation.reason}`);
        console.log('Try again or type "cancel" to abort.');
        continue;
      }

      console.log(
        `✅ Valid ${validation.type}: ${validation.cards.map((card) => card.toString()).join(', ')}`
      );

      indices.forEach((idx) => usedCardIndices.add(idx));

      return {indices, type: validation.type, cards: validation.cards};
    }
  }

  async confirmGoingDown() {
    const confirmMenu = new SimpleMenu('\nConfirm going down with these melds?');
    confirmMenu.addOption('Yes, go down', () => true);
    confirmMenu.addOption('No, cancel', () => false);

    return await confirmMenu.showAndExecute();
  }

  async addCardToMeld(gameState, meld, card, cardIndex, meldIndex) {
    console.log(`\nAttempting to add ${card.toString()} to meld: ${meld.toString()}`);

    const canAddToBeginning = this.canAddCardToMeld(meld, card, 0);
    const canAddToEnd = this.canAddCardToMeld(meld, card, null);

    const jokerIndex = meld.cards.findIndex((c) => c.value === 'Joker');
    const canReplaceJoker =
      jokerIndex !== -1 &&
      meld.type === 'sequence' &&
      this.canReplaceJokerInMeld(meld, card, jokerIndex);

    if ((canAddToBeginning || canAddToEnd) && canReplaceJoker) {
      const replaceMenu = new SimpleMenu(
        `\nThis sequence has a joker at position ${jokerIndex + 1}. What would you like to do?`
      );
      replaceMenu.addOption('Replace the joker', () => 'replace');
      replaceMenu.addOption('Add to beginning/end instead', () => 'add');

      const choice = await replaceMenu.showAndExecute();
      if (choice === 'replace') {
        return await this.replaceJokerInMeld(
          gameState,
          meld,
          card,
          cardIndex,
          meldIndex,
          jokerIndex
        );
      }
    } else if (canReplaceJoker && !canAddToBeginning && !canAddToEnd) {
      return await this.replaceJokerInMeld(gameState, meld, card, cardIndex, meldIndex, jokerIndex);
    }

    if (canAddToBeginning) {
      meld.addCard(card, 0);
      this.hand.cards.splice(cardIndex, 1);
      console.log(`✅ Added ${card.toString()} to beginning of meld.`);
      console.log(`   Updated meld: ${meld.toString()}`);
      return true;
    }

    if (canAddToEnd) {
      meld.addCard(card);
      this.hand.cards.splice(cardIndex, 1);
      console.log(`✅ Added ${card.toString()} to end of meld.`);
      console.log(`   Updated meld: ${meld.toString()}`);
      return true;
    }

    console.log(
      `❌ Cannot add ${card.toString()} to this meld. It doesn't form a valid sequence or set.`
    );
    return false;
  }

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

  buildSortingMenu(title = 'How would you like to sort your hand?') {
    const sortingOptions = CardSorter.getSortingOptions();
    const menu = new SimpleMenu(title);

    sortingOptions.forEach((option) => {
      menu.addOption(option.name, () => option.key);
    });

    menu.addOption('Cancel (keep current order)', () => 'cancel');

    return {menu, sortingOptions};
  }

  // Utility methods
  async getUserInput(prompt) {
    return GameIO.getUserInput(prompt);
  }

  parseCardIndices(input) {
    return GameIO.parseCardIndices(input, this.hand.length());
  }

  validateMeld(cardIndices) {
    if (cardIndices.length < 3) {
      return {valid: false, reason: 'Need at least 3 cards for a meld'};
    }

    const cards = cardIndices.map((idx) => this.hand.cards[idx]);

    const uniqueIndices = new Set(cardIndices);
    if (uniqueIndices.size !== cardIndices.length) {
      return {valid: false, reason: 'Cannot use the same card twice'};
    }

    if (isValidDupes(cards)) {
      return {valid: true, type: 'set', cards};
    }

    if (isValidSequence(cards)) {
      return {valid: true, type: 'sequence', cards};
    }

    return {
      valid: false,
      reason: 'Cards do not form a valid set (same rank) or sequence (consecutive same suit)',
    };
  }

  canAddCardToMeld(meld, card, idx) {
    const newCards = [...meld.cards];

    if (idx !== null) {
      newCards.splice(idx, 0, card);
    } else {
      newCards.push(card);
    }

    if (meld.type === 'dupes' && isValidDupes(newCards)) {
      return true;
    } else if (meld.type === 'sequence' && isValidSequence(newCards)) {
      return true;
    }
    return false;
  }

  canReplaceJokerInMeld(meld, card, jokerIndex) {
    if (meld.cards[jokerIndex].value !== 'Joker') {
      return false;
    }

    let newCards = [...meld.cards];
    const joker = newCards[jokerIndex];
    newCards[jokerIndex] = card;
    newCards = [joker, ...newCards];

    if (meld.type === 'sequence' && isValidSequence(newCards)) {
      return true;
    }

    newCards = [...meld.cards];
    newCards[jokerIndex] = card;
    newCards = [...newCards, joker];

    if (meld.type === 'sequence' && isValidSequence(newCards)) {
      return true;
    }

    return false;
  }

  goDownWithMelds(gameState, selectedMelds) {
    if (!this.isDown && !this.discarded && this.tookCard) {
      selectedMelds.forEach((meld) => {
        const meldType = meld.type === 'set' ? 'dupes' : 'sequence';
        const downPile = new DownPile(meldType, this.name, meld.cards);
        gameState.downPiles.push(downPile);
      });

      const allIndices = [];
      selectedMelds.forEach((meld) => {
        allIndices.push(...meld.indices);
      });
      const sortedIndices = allIndices.sort((a, b) => b - a);

      sortedIndices.forEach((idx) => {
        this.hand.cards.splice(idx, 1);
      });

      this.isDown = true;
      console.log(`\n🎉 Successfully went down with ${selectedMelds.length} melds!`);
      selectedMelds.forEach((meld, idx) => {
        console.log(`  Meld ${idx + 1}: ${meld.cards.map((card) => card.toString()).join(', ')}`);
      });
      return true;
    }
    return false;
  }

  // Legacy method for backward compatibility
  goDown(gameState, list_of_indices) {
    const validation = this.validateMeld(list_of_indices);
    if (!validation.valid) {
      console.log(`Unable to go down: ${validation.reason}`);
      return false;
    }

    const selectedMelds = [
      {
        indices: list_of_indices,
        type: validation.type,
        cards: validation.cards,
      },
    ];

    return this.goDownWithMelds(gameState, selectedMelds);
  }
}

module.exports = TerminalPlayerInterface;
