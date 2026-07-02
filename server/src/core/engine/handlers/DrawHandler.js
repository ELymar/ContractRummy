const ActionHandler = require('./ActionHandler');
const {EventType} = require('../events');
const Hand = require('../../domain/Hand');

/**
 * Handles DRAW actions - player draws cards from the deck
 */
class DrawHandler extends ActionHandler {
  handle(playerId, payload) {
    const turnCheck = this.validateTurn(playerId);
    if (turnCheck.error) {
      return this.createError(turnCheck.error);
    }

    const player = turnCheck.player;
    if (player.tookCard) {
      return this.createError('Already drew a card this turn');
    }

    const n = payload.nCards ?? 1;
    const cards = this.state.drawFromDeck(n);

    if (!(player.hand instanceof Hand)) {
      player.hand = new Hand();
    }

    player.hand.addCards(cards);
    player.tookCard = true;

    // Deck draws are private: events are broadcast to every client, so the
    // drawn card identity must not ride on them. The drawer sees the card in
    // their own view snapshot. (Discard takes stay public — the card was face
    // up — so TakeFromDiscardHandler does include cardIds.)
    return [
      this.emit(EventType.CARD_DRAWN, {
        playerId,
        n,
      }),
    ];
  }
}

module.exports = DrawHandler;
