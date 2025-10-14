const ActionHandler = require('./ActionHandler');
const { EventType } = require('../events');
const Hand = require('../../domain/Hand');

/**
 * Handles JOIN actions - player joins the game
 */
class JoinHandler extends ActionHandler {
  handle(playerId, payload) {
    const name = payload.name || 'Player';
    
    if (!this.state.players.find(p => p.id === playerId)) {
      this.state.players.push({
        id: playerId,
        name,
        hand: new Hand(),
        isDown: false,
        tookCard: false,
        discarded: false,
        isOut: false
      });
      
      return [this.emit(EventType.PLAYER_JOINED, { playerId, name })];
    }
    
    return [];
  }
}

module.exports = JoinHandler;