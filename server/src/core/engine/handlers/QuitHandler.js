const ActionHandler = require('./ActionHandler');
const {EventType} = require('../events');

/**
 * Handles QUIT actions - player quits the game
 */
class QuitHandler extends ActionHandler {
  handle(playerId, payload) {
    const turnCheck = this.validateTurn(playerId);
    if (turnCheck.error) {
      return this.createError(turnCheck.error);
    }

    const evts = [];
    const player = turnCheck.player;

    player.isOut = true;
    player.quit = true;

    evts.push(
      this.emit(EventType.PLAYER_QUIT, {
        playerId,
        playerName: player.name,
      })
    );

    // Check if only one player remains
    const activePlayers = this.state.players.filter((p) => !p.isOut);
    if (activePlayers.length <= 1) {
      const winner = activePlayers[0];
      evts.push(...this.engine.handleRoundEnd(winner?.id, 'opponent_quit'));
    } else {
      // Continue to next player
      this.advanceToNextActivePlayer(activePlayers, evts);
    }

    return evts;
  }

  advanceToNextActivePlayer(activePlayers, evts) {
    const nPlayers = this.state.players.length;
    if (nPlayers > 0) {
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % nPlayers;

      // Skip players who are out
      while (this.state.players[this.state.currentPlayerIndex].isOut && activePlayers.length > 1) {
        this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % nPlayers;
      }

      evts.push(
        this.emit(EventType.TURN_STARTED, {
          playerIndex: this.state.currentPlayerIndex,
        })
      );
    }
  }
}

module.exports = QuitHandler;
