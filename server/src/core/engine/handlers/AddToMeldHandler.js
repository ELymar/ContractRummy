const ActionHandler = require('./ActionHandler');
const { EventType } = require('../events');

/**
 * Handles ADD_TO_MELD actions - player adds a card to an existing meld
 */
class AddToMeldHandler extends ActionHandler {
  handle(playerId, payload) {
    // Validate turn
    const turnCheck = this.validateTurn(playerId);
    if (turnCheck.error) {
      return this.createError(turnCheck.error);
    }

    const player = turnCheck.player;
    if (!player.isDown) {
      return this.createError('Must be down before adding to melds');
    }

    // Validate and find card
    const { cardUuid, meldIndex, position } = payload;
    const cardLookup = this.findCardByUuid(player, cardUuid);
    if (cardLookup.error) {
      return this.createError(cardLookup.error);
    }

    // Validate meld index
    if (meldIndex < 0 || meldIndex >= this.state.downPiles.length) {
      return this.createError('Invalid meld index');
    }

    // Attempt to add card to meld
    const { cardIndex, card } = cardLookup;
    const meld = this.state.downPiles[meldIndex];
    
    const success = this.tryAddCardToMeld(meld, card, position);
    if (!success) {
      return this.createError('Cannot add that card to the selected meld');
    }

    // Execute successful addition
    return this.executeAddToMeld(player, card, cardIndex, meldIndex);
  }

  tryAddCardToMeld(meld, card, position) {
    if (position !== undefined && position !== null) {
      // Add at specific position
      return meld.addCard(card, position);
    } else {
      // Try adding at end first, then beginning
      return meld.addCard(card) || meld.addCard(card, 0);
    }
  }

  executeAddToMeld(player, card, cardIndex, meldIndex) {
    const evts = [];

    // Remove card from hand
    player.hand.cards.splice(cardIndex, 1);

    // Emit meld extension event
    evts.push(this.emit(EventType.MELD_EXTENDED, {
      playerId: player.id,
      meldIndex,
      cardId: card.toString?.() ?? String(card),
      remainingCards: player.hand.cards.length
    }));

    // Check for win condition
    if (player.hand.cards.length === 0) {
      player.isOut = true;
      evts.push(...this.engine.handleRoundEnd(player.id));
    }

    return evts;
  }
}

module.exports = AddToMeldHandler;