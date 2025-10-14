const ActionHandler = require('./ActionHandler');
const {EventType} = require('../events');
const Hand = require('../../domain/Hand');

/**
 * Handles TAKE_FROM_DISCARD actions - player takes the top card from discard pile
 */
class TakeFromDiscardHandler extends ActionHandler {
  handle(playerId, payload) {
    const turnCheck = this.validateTurn(playerId);
    if (turnCheck.error) {
      return this.createError(turnCheck.error);
    }

    const player = turnCheck.player;
    if (player.tookCard) {
      return this.createError('Already drew a card this turn');
    }

    // Validate burn pile state
    if (this.state.burnPile.cards.length === 0) {
      return this.createError('Burn pile is empty');
    }

    if (this.state.burnPile.dead) {
      return this.createError('Cannot take from discard pile - it is dead');
    }

    // Take the card
    const takenCard = this.state.burnPile.takeCard();

    if (!(player.hand instanceof Hand)) {
      player.hand = new Hand();
    }

    player.hand.addCard(takenCard);
    player.tookCard = true;

    return [
      this.emit(EventType.CARD_DRAWN, {
        playerId,
        n: 1,
        cardIds: [takenCard.toString?.() ?? String(takenCard)],
        source: 'discard',
      }),
    ];
  }
}

module.exports = TakeFromDiscardHandler;
