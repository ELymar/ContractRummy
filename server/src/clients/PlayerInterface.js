const Player = require('../core/domain/Player');

/**
 * Abstract base class for all player client implementations
 * Defines the contract that Terminal, Web, and Bot clients must implement
 *
 * Each implementation handles user interaction for their specific platform:
 * - TerminalPlayerInterface: CLI menus and prompts
 * - WebPlayerInterface: Browser-based drag/drop and forms
 * - BotPlayerInterface: AI decision-making algorithms
 */
class PlayerInterface {
  /**
   * Create a player interface wrapping a core Player domain object
   * @param {string} name - Player's display name
   */
  constructor(name) {
    this.player = new Player(name);
  }

  // Delegate core domain properties and methods to wrapped Player
  get name() {
    return this.player.name;
  }
  get hand() {
    return this.player.hand;
  }
  get isDown() {
    return this.player.isDown;
  }
  set isDown(value) {
    this.player.isDown = value;
  }
  get tookCard() {
    return this.player.tookCard;
  }
  set tookCard(value) {
    this.player.tookCard = value;
  }
  get discarded() {
    return this.player.discarded;
  }
  set discarded(value) {
    this.player.discarded = value;
  }
  get isOut() {
    return this.player.isOut;
  }
  set isOut(value) {
    this.player.isOut = value;
  }

  roundReset() {
    return this.player.roundReset();
  }
  downPlaysForOneRound(gameState) {
    return this.player.downPlaysForOneRound(gameState);
  }
  toString() {
    return this.player.toString();
  }

  // Abstract methods that each client implementation must provide

  /**
   * Handle the drawing phase of a turn
   * @param {GameState} gameState - Current game state
   * @param {Object} options - Drawing options (canTakeFromDiscard, etc.)
   * @returns {Promise<void>}
   */
  async drawCard(gameState, options = {}) {
    throw new Error('drawCard must be implemented by client interface');
  }

  /**
   * Allow player to select their main action for the turn
   * @param {GameState} gameState - Current game state
   * @param {Array} availableActions - List of available actions
   * @returns {Promise<string>} Selected action ('discard', 'godown', 'addtomeld', 'sort')
   */
  async selectAction(gameState, availableActions) {
    throw new Error('selectAction must be implemented by client interface');
  }

  /**
   * Handle card selection for discarding
   * @param {GameState} gameState - Current game state
   * @returns {Promise<boolean>} True if discard completed, false if cancelled
   */
  async selectCardsToDiscard(gameState) {
    throw new Error('selectCardsToDiscard must be implemented by client interface');
  }

  /**
   * Handle going down (laying initial melds)
   * @param {GameState} gameState - Current game state
   * @param {Object} contract - Round contract requirements
   * @returns {Promise<boolean>} True if went down successfully, false if cancelled
   */
  async selectCardsToGoDown(gameState, contract) {
    throw new Error('selectCardsToGoDown must be implemented by client interface');
  }

  /**
   * Handle adding cards to existing melds
   * @param {GameState} gameState - Current game state
   * @returns {Promise<boolean>} True if added to meld, false if cancelled
   */
  async selectCardToAddToMeld(gameState) {
    throw new Error('selectCardToAddToMeld must be implemented by client interface');
  }

  /**
   * Handle hand sorting/reordering
   * @returns {Promise<void>}
   */
  async sortHand() {
    throw new Error('sortHand must be implemented by client interface');
  }

  /**
   * Execute a complete player turn
   * Default implementation using the abstract methods above
   * @param {GameState} gameState - Current game state
   * @param {number} currentRound - Current round number
   * @returns {Promise<GameState>} Updated game state
   */
  async takeTurn(gameState, currentRound = 1) {
    this.tookCard = false;
    this.discarded = false;

    // Step 1: Draw a card (unless it's first turn)
    if (!gameState.firstTurn) {
      const drawOptions = {
        canTakeFromDiscard: this.canTakeFromDiscard(gameState),
      };
      await this.drawCard(gameState, drawOptions);
    }

    // Step 2: Main action phase
    while (!this.discarded) {
      // Special case: only 1 card left, must discard to win
      if (this.hand.length() === 1) {
        const discarded = await this.selectCardsToDiscard(gameState);
        if (discarded) break;
        continue;
      }

      // Determine available actions
      const availableActions = ['discard', 'sort'];
      if (!this.isDown && this.tookCard) {
        availableActions.push('godown');
      }
      if (this.isDown && gameState.downPiles.length > 0) {
        availableActions.push('addtomeld');
      }

      const action = await this.selectAction(gameState, availableActions);

      if (action === 'discard') {
        const discarded = await this.selectCardsToDiscard(gameState);
        if (!discarded) continue;
      } else if (action === 'godown') {
        const wentDown = await this.selectCardsToGoDown(gameState, currentRound);
        if (!wentDown) continue;
      } else if (action === 'addtomeld') {
        const addedToMeld = await this.selectCardToAddToMeld(gameState);
        if (!addedToMeld) continue;
      } else if (action === 'sort') {
        await this.sortHand();
        continue;
      }
    }

    // Check for win condition
    if (this.hand.length() === 0) {
      this.isOut = true;
    }

    return gameState;
  }

  // Helper methods that can be shared across implementations

  canTakeFromDiscard(gameState) {
    return (
      !this.tookCard &&
      !this.discarded &&
      !this.isDown &&
      !gameState.burnPile.dead &&
      gameState.burnPile.cards.length > 0
    );
  }

  takeFromDiscard(gameState) {
    if (this.canTakeFromDiscard(gameState)) {
      this.hand.addCard(gameState.burnPile.takeCard());
      this.tookCard = true;
      return true;
    }
    return false;
  }

  takeFromDeck(gameState) {
    if (!this.tookCard) {
      const drawnCards = gameState.drawFromDeck(1);
      const drawnCard = drawnCards[0];
      this.hand.addCard(drawnCard);
      this.tookCard = true;
      return drawnCard;
    }
    return null;
  }

  discard(gameState, cardIndex) {
    if (cardIndex >= 0 && cardIndex < this.hand.length()) {
      const cardToDiscard = this.hand.cards[cardIndex];
      gameState.burnPile.addCard(cardToDiscard);
      this.hand.cards.splice(cardIndex, 1);
      this.discarded = true;
      return cardToDiscard;
    }
    return null;
  }
}

module.exports = PlayerInterface;
