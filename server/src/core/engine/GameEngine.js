const {ActionType} = require('./actions');
const {EventType} = require('./events');
const GameState = require('../domain/GameState');
const Hand = require('../domain/Hand');
const RoundDealing = require('../rules/RoundDealing');
const CardScoring = require('../rules/CardScoring');
const {getContractForRound} = require('../rules/RoundContract');
const {v4: uuid} = require('uuid');

// Action Handlers
const JoinHandler = require('./handlers/JoinHandler');
const ReadyHandler = require('./handlers/ReadyHandler');
const DrawHandler = require('./handlers/DrawHandler');
const TakeFromDiscardHandler = require('./handlers/TakeFromDiscardHandler');
const DiscardHandler = require('./handlers/DiscardHandler');
const LayDownHandler = require('./handlers/LayDownHandler');
const AddToMeldHandler = require('./handlers/AddToMeldHandler');
const EndTurnHandler = require('./handlers/EndTurnHandler');
const QuitHandler = require('./handlers/QuitHandler');

class GameEngine {
  constructor({rng = Math.random} = {}) {
    this.rng = rng;
    this.state = new GameState(rng);
    this.gameId = uuid();
    this.seq = 0;
    this.state.started = false;
    this.scoreKeeper = null; // Will be initialized when game starts
    this.pendingStateEvents = []; // Collect events from GameState during action processing

    // Initialize action handlers
    this.handlers = new Map([
      [ActionType.JOIN, new JoinHandler(this)],
      [ActionType.READY, new ReadyHandler(this)],
      [ActionType.DRAW, new DrawHandler(this)],
      [ActionType.TAKE_FROM_DISCARD, new TakeFromDiscardHandler(this)],
      [ActionType.DISCARD, new DiscardHandler(this)],
      [ActionType.LAY_DOWN, new LayDownHandler(this)],
      [ActionType.ADD_TO_MELD, new AddToMeldHandler(this)],
      [ActionType.END_TURN, new EndTurnHandler(this)],
      [ActionType.QUIT, new QuitHandler(this)],
    ]);

    // Listen to GameState events and collect them
    this.state.on('deck-reshuffled', (data) => {
      this.pendingStateEvents.push(this.emit(EventType.DECK_RESHUFFLED, data));
    });
  }

  emit(type, payload = {}) {
    const evt = {type, payload, seq: ++this.seq, ts: Date.now()};
    return evt;
  }

  // Helper to collect all events including pendingStateEvents
  collectEvents(events) {
    const allEvents = [...events, ...this.pendingStateEvents];
    this.pendingStateEvents = []; // Clear for next action
    return allEvents;
  }

  getViewFor(playerId) {
    const s = this.state;
    const players = (s.players || []).map((p, i) => ({
      id: p.id ?? i,
      name: p.name,
      handCount: p.hand?.cards?.length ?? 0,
      isDown: p.isDown ?? false,
    }));
    const you = (s.players || []).find((p) => p.id === playerId) || null;
    const isYourTurn = s.players[s.currentPlayerIndex]?.id === playerId;

    let contract = null;
    try {
      const c = getContractForRound(s.currentRound ?? 1);
      contract = {description: c.description, requirements: c.requirements};
    } catch {
      contract = null;
    }

    return {
      gameId: this.gameId,
      players,
      you: you ? {id: you.id, name: you.name} : null,
      contract,
      yourHand: you?.hand?.cards ?? [],
      burnTop: s.burnPile?.topCard?.() ?? null,
      burnPileAvailable: s.burnPile?.cards?.length > 0 && !s.burnPile?.dead,
      downPiles: (s.downPiles ?? []).map((pile) => ({
        type: pile.type,
        owner: pile.getOwner?.() || pile.owner || 'Unknown',
        cards: pile.cards || [],
      })),
      currentPlayerIndex: s.currentPlayerIndex ?? 0,
      dealerIndex: s.dealerIndex ?? 0,
      round: s.currentRound ?? 1,
      firstTurn: s.firstTurn ?? true,
      deckCount: s.deck?.length?.() ?? 0,
      isYourTurn: isYourTurn,
      youAreDown: you?.isDown ?? false,
      tookCard: you?.tookCard ?? false,
      discarded: you?.discarded ?? false,
      validActions: isYourTurn ? this.getValidActionsFor(playerId) : [],
    };
  }

  // Get valid actions for a specific player
  getValidActionsFor(playerId) {
    const turnCheck = this.validateTurn(playerId);
    if (turnCheck.error) {
      return []; // Not their turn, no valid actions
    }

    const player = turnCheck.player;
    const validActions = [];

    // Drawing phase actions (if haven't drawn and not first turn)
    if (!player.tookCard && !this.state.firstTurn) {
      validActions.push('DRAW');

      // Can take from discard if available AND player is not already down
      // Once a player is down, they can only draw from deck
      if (this.state.burnPile?.cards?.length > 0 && !this.state.burnPile?.dead && !player.isDown) {
        validActions.push('TAKE_FROM_DISCARD');
      }
    }

    // Action phase actions (after drawing or on first turn). The discard ends
    // the player's actions, so none of these remain valid once discarded.
    if ((player.tookCard || this.state.firstTurn) && !player.discarded) {
      // Can discard (to end turn)
      validActions.push('DISCARD');

      // Can lay down if not already down and have drawn
      if (!player.isDown && player.tookCard) {
        validActions.push('LAY_DOWN');
      }

      // Can add to melds if already down and there are melds on table
      if (player.isDown && this.state.downPiles?.length > 0) {
        validActions.push('ADD_TO_MELD');
      }
    }

    // Can always sort hand during your turn (regardless of phase)
    validActions.push('SORT');

    // Can always quit during your turn
    validActions.push('QUIT');

    // Can end turn if discarded
    if (player.discarded) {
      validActions.push('END_TURN');
    }

    return validActions;
  }

  // Start the next round: reset deck/piles, rotate dealer, deal new hands, and begin next turn
  startNextRound() {
    const evts = [];
    // If scoreKeeper says game complete, do not start next round
    if (this.scoreKeeper && this.scoreKeeper.isGameComplete()) {
      evts.push(this.emit(EventType.GAME_ENDED, {scoreTable: this.scoreKeeper.getScoreTable?.()}));
      return evts;
    }

    // Preserve player list (ids/names)
    const joinedPlayers = this.state.players;
    // Reinitialize state (resets deck, burn, down piles, etc.)
    this.state.initialize();
    // Increment round and rotate dealer
    this.state.currentRound = (this.state.currentRound ?? 1) + 1;
    this.state.dealerIndex = ((this.state.dealerIndex ?? 0) + 1) % joinedPlayers.length;
    this.state.currentPlayerIndex = (this.state.dealerIndex + 1) % joinedPlayers.length;
    this.state.firstTurn = true;
    this.state.started = true;

    // Reattach players with fresh hands/flags
    this.state.players = joinedPlayers.map((p) => ({
      id: p.id,
      name: p.name,
      hand: new Hand(),
      isDown: false,
      tookCard: false,
      discarded: false,
      isOut: false,
      quit: false,
    }));

    // Deal for new round
    try {
      const deal = RoundDealing.getCardsForRound(this.state.currentRound, this.state.dealerIndex);
      // Assuming two players for now; extend as needed for more players
      if (this.state.players[0]) {
        this.state.players[0].hand.addCards(this.state.drawFromDeck(deal.player1Cards));
      }
      if (this.state.players[1]) {
        this.state.players[1].hand.addCards(this.state.drawFromDeck(deal.player2Cards));
      }
    } catch {
      // Fallback: deal 10/11 alternating depending on dealer
      if (this.state.players.length >= 2) {
        const nonDealer = (this.state.dealerIndex + 1) % this.state.players.length;
        this.state.players[this.state.dealerIndex].hand.addCards(this.state.drawFromDeck(10));
        this.state.players[nonDealer].hand.addCards(this.state.drawFromDeck(11));
      }
    }

    evts.push(this.emit(EventType.GAME_STARTED, {round: this.state.currentRound}));
    evts.push(this.emit(EventType.TURN_STARTED, {playerIndex: this.state.currentPlayerIndex}));
    return evts;
  }

  // Helper method to validate turn and get current player
  validateTurn(playerId) {
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) {
      return {error: 'Not your turn'};
    }
    return {player: currentPlayer};
  }

  // Helper method to find player by ID
  findPlayer(playerId) {
    return this.state.players.find((p) => p.id === playerId);
  }

  // Validate that player owns the specified cards
  validatePlayerOwnsCards(player, cardIndices) {
    if (!player.hand || !player.hand.cards) {
      return {error: 'Player has no cards'};
    }

    for (const idx of cardIndices) {
      if (idx < 0 || idx >= player.hand.cards.length) {
        return {error: `Invalid card index: ${idx}`};
      }
    }

    // Check for duplicate indices
    const uniqueIndices = new Set(cardIndices);
    if (uniqueIndices.size !== cardIndices.length) {
      return {error: 'Cannot use the same card twice'};
    }

    return {valid: true};
  }

  // Find card by UUID and return its index in player's hand
  findCardByUuid(player, cardUuid) {
    if (!player.hand || !player.hand.cards) {
      return {error: 'Player has no cards'};
    }

    if (!cardUuid) {
      return {error: 'No card UUID provided'};
    }

    const cardIndex = player.hand.cards.findIndex((card) => card.uuid === cardUuid);
    if (cardIndex === -1) {
      return {error: 'Player does not own that card'};
    }

    return {cardIndex, card: player.hand.cards[cardIndex]};
  }

  // Handle round end with scoring and progression
  handleRoundEnd(winnerPlayerId, reason = null) {
    const winner = this.findPlayer(winnerPlayerId);
    const evts = [];

    // Calculate scores for all players
    const playerHands = {};
    this.state.players.forEach((player) => {
      playerHands[player.name] = player.hand.cards;
    });

    // Record scores in ScoreKeeper
    if (this.scoreKeeper) {
      this.scoreKeeper.recordRoundScore(this.state.currentRound, playerHands, winner.name);
    }

    // Emit round ended event with scoring
    const roundScores = {};
    this.state.players.forEach((player) => {
      roundScores[player.name] = CardScoring.scoreHand(player.hand.cards);
    });

    evts.push(
      this.emit(EventType.ROUND_ENDED, {
        winner: winnerPlayerId,
        winnerName: winner.name,
        reason: reason,
        roundNumber: this.state.currentRound,
        scores: roundScores,
        scoreTable: this.scoreKeeper ? this.scoreKeeper.getScoreTable() : null,
        gameComplete: this.scoreKeeper ? this.scoreKeeper.isGameComplete() : false,
      })
    );

    return evts;
  }

  // Validate overall game state consistency
  validateGameStateConsistency() {
    try {
      let totalCards = this.state.deck.length();
      totalCards += this.state.burnPile.cards.length;

      // Count cards in player hands
      for (const player of this.state.players) {
        if (player.hand && player.hand.cards) {
          totalCards += player.hand.cards.length;
        }
      }

      // Count cards in down piles
      for (const pile of this.state.downPiles) {
        if (pile.cards) {
          totalCards += pile.cards.length;
        }
      }

      // Should equal 56 for single deck + 4 jokers
      const expectedTotal = 56;
      if (totalCards !== expectedTotal) {
        console.warn(`Game state inconsistency: ${totalCards} cards, expected ${expectedTotal}`);
        return {error: `Card count mismatch: ${totalCards}/${expectedTotal}`};
      }

      return {valid: true};
    } catch (error) {
      return {error: `State validation failed: ${error.message}`};
    }
  }

  apply(command) {
    const {type, playerId, payload = {}} = command;

    // Get handler for action type
    const handler = this.handlers.get(type);
    if (!handler) {
      return this.collectEvents([
        this.emit(EventType.ERROR, {message: `Unknown action type: ${type}`}),
      ]);
    }

    // Execute handler
    const evts = handler.handle(playerId, payload);
    return this.collectEvents(evts);
  }
}

module.exports = GameEngine;
