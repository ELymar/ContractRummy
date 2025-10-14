const ActionHandler = require('./ActionHandler');
const { EventType } = require('../events');

/**
 * Handles END_TURN actions - ends current player's turn and advances to next player
 */
class EndTurnHandler extends ActionHandler {
  handle(playerId, payload) {
    const turnCheck = this.validateTurn(playerId);
    if (turnCheck.error) {
      return this.createError(turnCheck.error);
    }

    const player = turnCheck.player;
    if (!player.discarded) {
      return this.createError('Must discard before ending turn');
    }

    // Reset player state for next turn
    player.tookCard = false;
    player.discarded = false;
    this.state.firstTurn = false;

    // Advance to next player
    const nPlayers = this.state.players.length;
    if (nPlayers > 0) {
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % nPlayers;
      return [this.emit(EventType.TURN_STARTED, { 
        playerIndex: this.state.currentPlayerIndex 
      })];
    }

    return [];
  }
}

module.exports = EndTurnHandler;