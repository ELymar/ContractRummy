const ActionHandler = require('./ActionHandler');
const { EventType } = require('../events');
const Hand = require('../../domain/Hand');

/**
 * Handles READY actions - starts the game when enough players are ready
 */
class ReadyHandler extends ActionHandler {
  handle(playerId, payload) {
    if ((this.state.players?.length ?? 0) < 2 || this.state.started) {
      return [];
    }

    const evts = [];
    
    // Initialize game state
    const joinedPlayers = this.state.players;
    this.state.initialize();
    
    // Restore players with proper state
    this.state.players = joinedPlayers.map(p => ({
      ...p,
      hand: p.hand instanceof Hand ? p.hand : new Hand(),
      isDown: false,
      tookCard: false,
      discarded: false,
      isOut: false
    }));

    // Initialize game settings
    this.state.currentRound = 1;
    this.state.dealerIndex = 0;
    this.state.currentPlayerIndex = (this.state.dealerIndex + 1) % this.state.players.length;
    this.state.firstTurn = true;
    this.state.started = true;

    // Deal opening hands
    this.dealOpeningHands();

    // Initialize score keeping
    const ScoreKeeper = require('../../../shared/ScoreKeeper');
    const playerNames = this.state.players.map(p => p.name);
    this.engine.scoreKeeper = new ScoreKeeper(playerNames, 7); // 7 rounds in Contract Rummy

    // Emit game start events
    evts.push(this.emit(EventType.GAME_STARTED, { round: this.state.currentRound }));
    evts.push(this.emit(EventType.TURN_STARTED, { 
      playerIndex: this.state.currentPlayerIndex 
    }));

    return evts;
  }

  dealOpeningHands() {
    try {
      const RoundDealing = require('../../rules/RoundDealing');
      const deal = RoundDealing.getCardsForRound(this.state.currentRound, this.state.dealerIndex);
      
      const p0 = this.state.players[0];
      const p1 = this.state.players[1];
      p0.hand.addCards(this.state.drawFromDeck(deal.player1Cards));
      p1.hand.addCards(this.state.drawFromDeck(deal.player2Cards));
    } catch (e) {
      // Fallback: deal 10/11 cards
      const p0 = this.state.players[0];
      const p1 = this.state.players[1];
      p0.hand.addCards(this.state.drawFromDeck(10));
      p1.hand.addCards(this.state.drawFromDeck(11));
    }
  }
}

module.exports = ReadyHandler;