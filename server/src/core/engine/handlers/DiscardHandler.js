const ActionHandler = require('./ActionHandler');
const {EventType} = require('../events');

/**
 * Handles DISCARD actions - player discards a card from their hand
 */
class DiscardHandler extends ActionHandler {
  handle(playerId, payload) {
    const evts = [];

    // Validate turn
    const turnCheck = this.validateTurn(playerId);
    if (turnCheck.error) {
      return this.createError(turnCheck.error);
    }

    const player = turnCheck.player;

    // Validate drawing requirement (except on first turn)
    if (!player.tookCard && !this.state.firstTurn) {
      return this.createError('Must draw a card before discarding');
    }

    // The discard ends the player's actions — one per turn
    if (player.discarded) {
      return this.createError('Already discarded this turn — end your turn');
    }

    // Find and validate card
    const {cardUuid} = payload;
    const cardLookup = this.findCardByUuid(player, cardUuid);
    if (cardLookup.error) {
      return this.createError(cardLookup.error);
    }

    // Execute discard
    const {cardIndex, card: discardedCard} = cardLookup;
    player.hand.cards.splice(cardIndex, 1);
    this.state.burnPile.addCard(discardedCard);
    player.discarded = true;

    // Check for win condition
    if (player.hand.cards.length === 0) {
      player.isOut = true;
      evts.push(...this.engine.handleRoundEnd(playerId));
    }

    // Emit discard event
    evts.push(
      this.emit(EventType.CARD_DISCARDED, {
        playerId,
        cardId: discardedCard.toString?.() ?? String(discardedCard),
        remainingCards: player.hand.cards.length,
      })
    );

    // Validate state consistency (development only)
    this.validateStateConsistency(evts);

    return evts;
  }

  validateStateConsistency(evts) {
    const triggeredRoundEnd = evts.some((e) => e.type === 'ROUND_ENDED');
    if (process.env.NODE_ENV !== 'test' && !triggeredRoundEnd) {
      const stateCheck = this.engine.validateGameStateConsistency();
      if (stateCheck.error) {
        console.error('Game state inconsistency after discard:', stateCheck.error);
      }
    }
  }
}

module.exports = DiscardHandler;
