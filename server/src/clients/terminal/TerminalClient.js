const WebSocket = require('ws');
const SimpleMenu = require('./SimpleMenu');
const GameIO = require('../../shared/GameIO');
const {ActionType} = require('../../core/engine/actions');
const DisplayUtils = require('../../shared/DisplayUtils');

class TerminalClient {
  constructor(url = 'ws://localhost:8080') {
    this.url = url;
    this.playerId = null;
    this.ws = null;
    this.view = null;
    this.awaitingInput = false;
    this.pendingUpdateResolvers = [];
    this.gameEnded = false;
    this.roundEnded = false;
  }

  async connect() {
    this.ws = new WebSocket(this.url);

    this.ws.on('message', async (raw) => {
      const msg = JSON.parse(raw);
      if (msg.kind === 'welcome') {
        this.playerId = msg.playerId;
        console.log(`Connected. PlayerId: ${this.playerId}, GameId: ${msg.gameId}`);
      } else if (msg.kind === 'events') {
        // Process events for feedback
        if (msg.events) {
          for (const event of msg.events) {
            this.processEvent(event);
          }
        }

        this.view = msg.snapshot?.view;

        // Resolve any pending update promises
        this.pendingUpdateResolvers.forEach((resolve) => resolve());
        this.pendingUpdateResolvers = [];

        if (this.view && this.view.isYourTurn && !this.awaitingInput && !this.gameEnded) {
          await this.takeTurn();
        }
      } else if (msg.kind === 'error') {
        console.log(`Error: ${msg.message}`);

        // Resolve any pending update promises on error too
        this.pendingUpdateResolvers.forEach((resolve) => resolve());
        this.pendingUpdateResolvers = [];
      }
    });

    await new Promise((res) => this.ws.once('open', res));
  }

  processEvent(event) {
    switch (event.type) {
      case 'GAME_STARTED':
        console.log('\n🎮 Game Started! Contract Rummy begins...');
        break;
      case 'PLAYER_JOINED':
        console.log(`${event.payload.name} joined the game`);
        break;
      case 'TURN_STARTED':
        // Reset round ended flag when a new turn starts (indicates new round has begun)
        if (this.roundEnded) {
          this.roundEnded = false;
        }

        if (this.view && this.view.players) {
          const currentPlayerName = this.getPlayerName(
            this.view.players[event.payload.playerIndex]?.id
          );
          if (event.payload.playerIndex === this.view.yourPlayerIndex) {
            console.log(`\n🟢 Your turn!`);
          } else {
            console.log(`\n⏳ ${currentPlayerName}'s turn`);
          }
        } else {
          console.log(`\n🎯 Turn started (Player ${event.payload.playerIndex})`);
        }
        break;
      case 'CARD_DRAWN':
        if (event.payload.playerId === this.playerId) {
          const source = event.payload.source === 'discard' ? 'discard pile' : 'deck';
          // Always show what you drew (you can see your own cards)
          if (event.payload.cardIds?.[0]) {
            console.log(`Drew ${event.payload.cardIds[0]} from ${source}`);
          } else {
            console.log(`Drew card from ${source}`);
          }
        } else {
          const playerName = this.getPlayerName(event.payload.playerId);
          const source = event.payload.source === 'discard' ? 'discard pile' : 'deck';
          if (event.payload.source === 'discard' && event.payload.cardIds?.[0]) {
            // Show what other players drew from discard pile (it was face up)
            console.log(`${playerName} drew ${event.payload.cardIds[0]} from ${source}`);
          } else {
            // Don't show what other players drew from deck (it was face down)
            console.log(`${playerName} drew from ${source}`);
          }
        }
        break;
      case 'CARD_DISCARDED':
        if (event.payload.playerId === this.playerId) {
          console.log(`Discarded ${event.payload.cardId}`);
        } else {
          const playerName = this.getPlayerName(event.payload.playerId);
          console.log(`${playerName} discarded ${event.payload.cardId}`);
        }
        break;
      case 'MELD_LAID':
        const playerName = this.getPlayerName(event.payload.playerId);
        const melds = event.payload.melds || [];

        console.log(`🎉 ${playerName} went down with melds!`);
        melds.forEach((meld, index) => {
          const meldDisplay = DisplayUtils.formatPile(meld);
          console.log(`   ${index + 1}. ${meldDisplay}`);
        });
        break;
      case 'PLAYER_QUIT':
        if (event.payload.playerId === this.playerId) {
          console.log('\n👋 You have quit the game.');
          this.gameEnded = true;
        } else {
          const quitPlayerName = this.getPlayerName(event.payload.playerId);
          console.log(`\n👋 ${quitPlayerName} has quit the game.`);
        }
        break;
      case 'ROUND_ENDED':
        this.roundEnded = true; // Mark round as ended to prevent further commands
        const reason = event.payload.reason === 'opponent_quit' ? ' (opponent quit)' : '';
        console.log(
          `\n🏆 ${event.payload.winnerName} wins Round ${event.payload.roundNumber}${reason}!`
        );

        // Show round scores
        if (event.payload.scores) {
          console.log('\n📊 Round Scores:');
          Object.entries(event.payload.scores).forEach(([playerName, score]) => {
            console.log(`${playerName}: ${score} points`);
          });
        }

        // Show score table if available
        if (event.payload.scoreTable) {
          console.log(event.payload.scoreTable);
        }

        // Check if game is complete
        if (event.payload.gameComplete) {
          console.log('\n🎉 GAME COMPLETE! 🎉');
          this.gameEnded = true;
        } else {
          console.log('\n▶ Proceeding to next round...');
          // DO NOT reset roundEnded flag here - wait for TURN_STARTED to indicate new round
        }
        break;
      case 'MELD_EXTENDED':
        const extenderName = this.getPlayerName(event.payload.playerId);
        console.log(`${extenderName} added cards to an existing meld`);
        break;
      case 'DECK_RESHUFFLED':
        console.log(
          `🔄 Deck was reshuffled! ${event.payload.cardsReshuffled} cards were moved from discard pile to deck.`
        );
        break;
      case 'GAME_ENDED':
        console.log('\n🏁 Game has ended!');
        if (event.payload.reason === 'opponent_quit') {
          console.log('Game ended due to a player quitting.');
        }
        if (event.payload.scoreTable) {
          console.log(event.payload.scoreTable);
        }
        this.gameEnded = true;
        break;
      case 'ERROR':
        console.log(`❌ Server Error: ${event.payload.message}`);
        break;
      default:
        console.log(`Unhandled event: ${event.type}`);
        break;
    }
  }

  getPlayerName(playerId) {
    const player = this.view?.players?.find((p) => p.id === playerId);
    return player?.name || 'Unknown Player';
  }

  sendCommand(type, payload = {}) {
    if (this.gameEnded || this.roundEnded || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log(
        `Cannot send command ${type}: ${this.gameEnded ? 'game ended' : this.roundEnded ? 'round ended' : 'connection closed'}`
      );
      return false;
    }

    try {
      this.ws.send(
        JSON.stringify({kind: 'command', command: {type, playerId: this.playerId, payload}})
      );
      return true;
    } catch (error) {
      console.warn(`Failed to send command ${type}:`, error.message);
      return false;
    }
  }

  fmtCard(c) {
    if (typeof c === 'string') return c;
    if (!c) return '?';

    // Handle serialized card objects
    if (c.suit && c.value) {
      // Map full names to emojis
      const suitEmojis = {
        Hearts: '♥',
        Spades: '♠',
        Clubs: '♣',
        Diamonds: '♦',
        Joker: '🃏',
      };

      const valueShort = {
        Two: '2',
        Three: '3',
        Four: '4',
        Five: '5',
        Six: '6',
        Seven: '7',
        Eight: '8',
        Nine: '9',
        Ten: '10',
        Jack: 'J',
        Queen: 'Q',
        King: 'K',
        Ace: 'A',
        Joker: '',
      };

      const suit = suitEmojis[c.suit] || c.suit;
      const value = valueShort[c.value] || c.value;

      return c.value === 'Joker' ? '[🃏]' : `[${value}${suit}]`;
    }

    // Fallback
    return c?.toString?.() || '[?]';
  }

  displayGameState() {
    if (!this.view) return;

    console.log('\n' + '='.repeat(60));
    console.log(`GAME STATE (for ${this.getPlayerName(this.playerId)}):`);
    console.log('='.repeat(60));

    // Show current round contract
    console.log(`📋 Round ${this.view.round}`);
    if (this.view.round === 1) {
      console.log('Contract: 2 sets of 3 cards each');
    }
    console.log('─'.repeat(60));

    console.log(`Deck cards remaining: ${this.view.deckCount}`);

    // Show burn pile top card
    if (this.view.burnTop) {
      const status = this.view.burnPileAvailable ? '' : ' (dead)';
      console.log(`Burn pile top card: ${this.fmtCard(this.view.burnTop)}${status}`);
    } else {
      console.log('Burn pile: Empty');
    }

    // Show down piles (melds on table)
    console.log('\nDown Piles on table:');
    if (this.view.downPiles.length === 0) {
      console.log('  None');
    } else {
      this.view.downPiles.forEach((pile, idx) => {
        const ownerName = pile.owner || 'Unknown';
        const type = pile.type === 'dupes' ? 'set' : pile.type || 'meld';
        const pileDisplay = DisplayUtils.formatCards(pile.cards || []);
        console.log(`  ${idx + 1}: ${pileDisplay} — ${type} by ${ownerName}`);
      });
    }

    // Show opponent info
    this.view.players.forEach((p, i) => {
      if (p.id !== this.playerId) {
        console.log(`\n${p.name} has ${p.handCount} cards${p.isDown ? ' [DOWN]' : ''}`);
      }
    });

    // Show current player's hand
    const handStr = (this.view.yourHand || []).map(this.fmtCard.bind(this)).join(' ');
    console.log(`\nYour hand (${this.view.yourHand?.length || 0} cards): ${handStr}`);
    console.log('='.repeat(60));
  }

  async takeTurn() {
    if (!this.view?.isYourTurn || this.gameEnded) return;

    this.awaitingInput = true;

    try {
      console.log(`\n=== ${this.getPlayerName(this.playerId)}'s Turn ===`);
      this.displayGameState();

      // Step 1: Draw a card (if drawing actions are available)
      const validActions = this.view.validActions || [];
      if (validActions.includes('DRAW') || validActions.includes('TAKE_FROM_DISCARD')) {
        await this.drawPhase();

        // Show updated hand after drawing
        console.log(`\nYour hand after drawing (${this.view.yourHand?.length || 0} cards):`);
        const handStr = (this.view.yourHand || []).map(this.fmtCard.bind(this)).join(' ');
        console.log(handStr);
      }

      // Step 2: Main action phase - go down, add to melds, or discard
      while (!this.view.discarded) {
        // Special case: if only 1 card left, can only discard (to win)
        if (this.view.yourHand?.length === 1) {
          console.log('\nYou have only 1 card left! You must discard to win the game.');
          await this.selectCardsToDiscard();
          break;
        }

        const actionMenu = new SimpleMenu('Choose your action:');

        // Build menu from server-provided valid actions
        const validActions = this.view.validActions || [];

        if (validActions.includes('DISCARD')) {
          actionMenu.addOption('Discard and end turn', () => 'discard');
        }

        if (validActions.includes('LAY_DOWN')) {
          actionMenu.addOption('Go Down (lay down sets)', () => 'godown');
        }

        if (validActions.includes('ADD_TO_MELD')) {
          actionMenu.addOption('Add to existing melds', () => 'addtomeld');
        }

        if (validActions.includes('SORT')) {
          actionMenu.addOption('Sort hand', () => 'sort');
        }

        if (validActions.includes('QUIT')) {
          actionMenu.addOption('Quit game', () => 'quit');
        }

        const action = await actionMenu.showAndExecute();

        if (action === 'godown') {
          const wentDown = await this.selectCardsToGoDown();
          if (!wentDown) {
            continue; // Try again if going down failed
          }
        } else if (action === 'addtomeld') {
          const addedToMeld = await this.selectCardToAddToMeld();
          if (!addedToMeld) {
            continue; // Try again if adding to meld failed
          }
        } else if (action === 'sort') {
          await this.sortHand();
          continue; // Return to action menu after sorting
        } else if (action === 'quit') {
          const confirmed = await this.confirmQuit();
          if (confirmed) {
            this.sendCommand(ActionType.QUIT);
            this.gameEnded = true;
            return; // Exit the takeTurn method entirely
          }
          continue; // Return to action menu if cancelled
        } else if (action === 'discard') {
          const discarded = await this.selectCardsToDiscard();
          if (!discarded) {
            // If cancelled, continue to action menu
            continue;
          }
          break; // Successfully discarded, end turn
        }
      }

      // End turn (only if game/round hasn't ended)
      if (!this.gameEnded && !this.roundEnded) {
        this.sendCommand(ActionType.END_TURN);
      }
    } finally {
      this.awaitingInput = false;
    }
  }

  async drawPhase() {
    while (true) {
      const drawMenu = new SimpleMenu('Draw a card:');
      const validActions = this.view.validActions || [];

      if (validActions.includes('DRAW')) {
        drawMenu.addOption('Take from deck', () => 'deck');
      }

      if (validActions.includes('TAKE_FROM_DISCARD') && this.view.burnTop) {
        drawMenu.addOption(
          `Take from discard pile (${this.fmtCard(this.view.burnTop)})`,
          () => 'discard'
        );
      }

      if (validActions.includes('SORT')) {
        drawMenu.addOption('Sort hand', () => 'sort');
      }

      if (validActions.includes('QUIT')) {
        drawMenu.addOption('Quit game', () => 'quit');
      }

      const drawChoice = await drawMenu.showAndExecute();

      if (drawChoice === 'deck') {
        this.sendCommand(ActionType.DRAW, {nCards: 1});
        await this.waitForUpdate();
        break; // Exit the loop after drawing
      } else if (drawChoice === 'discard') {
        this.sendCommand(ActionType.TAKE_FROM_DISCARD);
        await this.waitForUpdate();
        break; // Exit the loop after drawing
      } else if (drawChoice === 'sort') {
        await this.sortHand();
        // Continue the loop to show the menu again after sorting
      } else if (drawChoice === 'quit') {
        const confirmed = await this.confirmQuit();
        if (confirmed) {
          this.sendCommand(ActionType.QUIT);
          this.gameEnded = true;
          return; // Exit the method entirely
        }
        // Continue the loop if quit was cancelled
      }
    }
  }

  async selectCardsToGoDown() {
    console.log('\n=== Going Down ===');
    console.log(
      'You need to form melds (sets of 3+ same rank OR sequences of 4+ consecutive same suit)'
    );
    console.log('For Round 1: 2 sets of 3 cards each\n');

    const selectedMelds = [];
    const usedCardIndices = new Set();
    const requiredMelds = 2; // Round 1

    // Select each required meld
    for (let meldNum = 1; meldNum <= requiredMelds; meldNum++) {
      const meld = await this.selectSingleMeld(meldNum, requiredMelds, usedCardIndices);
      if (!meld) {
        return false;
      }
      selectedMelds.push(meld);
    }

    // Show summary and get confirmation
    this.displayMeldSummary(selectedMelds);

    const confirmed = await this.confirmGoingDown();
    if (!confirmed) {
      return false;
    }

    // Send the lay down command with cardIndices and current hand order
    // This allows server to sync hand order and then use simple index-based operations
    const melds = selectedMelds.map((m) => ({
      type: m.type,
      cardUuids: m.indices.map((idx) => {
        const card = this.view.yourHand[idx];
        if (!card || !card.uuid) {
          throw new Error(`Card at index ${idx} does not have a UUID`);
        }
        return card.uuid;
      }),
    }));

    this.sendCommand(ActionType.LAY_DOWN, {
      melds,
    });
    await this.waitForUpdate();
    return true;
  }

  async selectSingleMeld(meldNum, totalMelds, usedCardIndices) {
    console.log(`\n--- Selecting Meld ${meldNum} of ${totalMelds} ---`);

    while (true) {
      // Show available cards
      this.displayCardList(usedCardIndices);

      const cancelNumber = this.view.yourHand.length + 1;
      const input = await GameIO.getUserInput(
        `\nEnter card numbers for meld ${meldNum} (comma-separated, e.g. 1,2,3) or '${cancelNumber}' to cancel: `
      );

      if (input.toLowerCase() === 'cancel') {
        return null;
      }

      const indices = this.parseCardIndices(input);

      if (indices === null) {
        return null; // Cancelled
      }

      if (indices === 'invalid') {
        console.log('Invalid input. Please enter valid card numbers.');
        continue;
      }

      // Check if any cards are already used
      const alreadyUsed = indices.some((idx) => usedCardIndices.has(idx));
      if (alreadyUsed) {
        console.log(
          'Some of those cards are already used in previous melds. Please select different cards.'
        );
        continue;
      }

      // Validate the meld locally first
      if (indices.length < 3) {
        console.log('Invalid meld: Need at least 3 cards for a meld');
        continue;
      }

      const cards = indices.map((idx) => this.view.yourHand[idx]);
      const validation = this.validateMeld(cards);

      if (!validation.valid) {
        console.log(`Invalid meld: ${validation.reason}`);
        console.log('Try again or type "cancel" to abort.');
        continue;
      }

      console.log(`✅ Valid ${validation.type}`);

      // Mark these cards as used
      indices.forEach((idx) => usedCardIndices.add(idx));

      return {
        indices,
        type: validation.type,
        cards: cards,
      };
    }
  }

  displayCardList(usedCardIndices) {
    console.log('\nAvailable cards:');
    this.view.yourHand.forEach((card, idx) => {
      const used = usedCardIndices.has(idx) ? ' (USED)' : '';
      console.log(`${idx + 1}. ${this.fmtCard(card)}${used}`);
    });
    console.log(`${this.view.yourHand.length + 1}. Cancel`);
  }

  parseCardIndices(input) {
    if (input.toLowerCase() === 'cancel') {
      return null;
    }

    // Check if it's the numeric cancel option
    const handSize = this.view.yourHand?.length || 0;
    const cancelNumber = handSize + 1;
    if (input.trim() === cancelNumber.toString()) {
      return null;
    }

    try {
      const indices = input.split(',').map((s) => parseInt(s.trim()) - 1);

      for (const idx of indices) {
        if (isNaN(idx) || idx < 0 || idx >= handSize) {
          return 'invalid';
        }
      }

      return indices;
    } catch {
      return 'invalid';
    }
  }

  displayMeldSummary(selectedMelds) {
    console.log('\n=== Meld Summary ===');
    selectedMelds.forEach((meld, idx) => {
      const cardStr = meld.cards.map((card) => this.fmtCard(card)).join(', ');
      console.log(`Meld ${idx + 1}: ${cardStr}`);
    });
  }

  async confirmGoingDown() {
    const confirmMenu = new SimpleMenu('\nConfirm going down with these melds?');
    confirmMenu.addOption('Yes, go down', () => true);
    confirmMenu.addOption('No, cancel', () => false);

    return await confirmMenu.showAndExecute();
  }

  async confirmQuit() {
    const confirmMenu = new SimpleMenu('\nAre you sure you want to quit the game?');
    confirmMenu.addOption('Yes, quit game', () => true);
    confirmMenu.addOption('No, continue playing', () => false);

    return await confirmMenu.showAndExecute();
  }

  async selectCardToAddToMeld() {
    console.log('\n=== Add to Existing Melds ===');

    // Show available melds and create meld selection menu
    console.log('Available melds on table:');
    this.view.downPiles.forEach((pile, idx) => {
      const owner = pile.getOwner?.() || pile.owner;
      console.log(DisplayUtils.formatMeldSummary(pile, idx, owner));
    });

    const meldMenu = new SimpleMenu('\nSelect meld number to add to:');
    this.view.downPiles.forEach((pile, idx) => {
      const owner = pile.getOwner?.() || pile.owner;
      const meldSummary = DisplayUtils.formatMeldSummary(pile, idx, owner);
      meldMenu.addOption(meldSummary, () => idx);
    });
    meldMenu.addOption('Cancel', () => 'cancel');

    const meldIndex = await meldMenu.showAndExecute();
    if (meldIndex === 'cancel') {
      return false;
    }

    // Show player's hand and create card selection menu
    console.log('\nYour hand:');
    this.view.yourHand.forEach((card, idx) => {
      console.log(`${idx + 1}. ${DisplayUtils.formatCard(card)}`);
    });

    const cardMenu = new SimpleMenu('\nSelect card number to add:');
    this.view.yourHand.forEach((card, idx) => {
      cardMenu.addOption(`${DisplayUtils.formatCard(card)}`, () => idx);
    });
    cardMenu.addOption('Cancel', () => 'cancel');

    const cardIndex = await cardMenu.showAndExecute();
    if (cardIndex === 'cancel') {
      return false;
    }

    // Get the UUID of the selected card
    const selectedCard = this.view.yourHand[cardIndex];
    if (!selectedCard || !selectedCard.uuid) {
      console.log('Error: Selected card does not have a UUID');
      return false;
    }

    this.sendCommand(ActionType.ADD_TO_MELD, {
      cardUuid: selectedCard.uuid,
      meldIndex,
    });
    await this.waitForUpdate();
    return true;
  }

  async selectCardsToDiscard() {
    const menu = new SimpleMenu('Select a card to discard:');
    this.view.yourHand.forEach((card, idx) => {
      menu.addOption(`${this.fmtCard(card)}`, () => idx);
    });
    menu.addOption('Cancel (return to main menu)', () => 'cancel');

    const cardIndex = await menu.showAndExecute();
    if (cardIndex === 'cancel') {
      return false; // Return false to indicate cancellation
    }

    // Get the UUID of the selected card
    const selectedCard = this.view.yourHand[cardIndex];
    if (!selectedCard || !selectedCard.uuid) {
      console.log('Error: Selected card does not have a UUID');
      return false;
    }

    this.sendCommand(ActionType.DISCARD, {
      cardUuid: selectedCard.uuid,
    });
    await this.waitForUpdate();
    return true; // Return true to indicate successful discard
  }

  async sortHand() {
    console.log('\n=== Sort Hand ===');

    const sortMenu = new SimpleMenu('How would you like to sort your hand?');
    sortMenu.addOption('By suit then rank', () => 'suit');
    sortMenu.addOption('By rank then suit', () => 'rank');
    sortMenu.addOption('Cancel (keep current order)', () => 'cancel');

    const choice = await sortMenu.showAndExecute();

    if (choice === 'cancel') {
      return;
    }

    // Sort cards locally (client-side presentation only)
    const sortedHand = this.sortCards([...this.view.yourHand], choice);
    this.view.yourHand = sortedHand;

    console.log('✅ Hand sorted!');
    console.log('New order:', sortedHand.map(this.fmtCard.bind(this)).join(' '));
  }

  sortCards(cards, sortType) {
    const getSuitPriority = (suit) => {
      const priorities = {Hearts: 0, Diamonds: 1, Clubs: 2, Spades: 3, Joker: 4};
      return priorities[suit] || 5;
    };

    const getRankPriority = (value) => {
      const priorities = {
        Two: 2,
        Three: 3,
        Four: 4,
        Five: 5,
        Six: 6,
        Seven: 7,
        Eight: 8,
        Nine: 9,
        Ten: 10,
        Jack: 11,
        Queen: 12,
        King: 13,
        Ace: 14,
        Joker: 15,
      };
      return priorities[value] || 0;
    };

    return cards.sort((a, b) => {
      if (sortType === 'suit') {
        // Sort by suit first, then rank
        const suitDiff = getSuitPriority(a.suit) - getSuitPriority(b.suit);
        if (suitDiff !== 0) return suitDiff;
        return getRankPriority(a.value) - getRankPriority(b.value);
      } else if (sortType === 'rank') {
        // Sort by rank first, then suit
        const rankDiff = getRankPriority(a.value) - getRankPriority(b.value);
        if (rankDiff !== 0) return rankDiff;
        return getSuitPriority(a.suit) - getSuitPriority(b.suit);
      }
      return 0;
    });
  }

  validateMeld(cards) {
    if (cards.length < 3) {
      return {valid: false, reason: 'Need at least 3 cards for a meld'};
    }

    // Check if it's a valid set (same rank)
    if (this.isValidSet(cards)) {
      return {valid: true, type: 'set'};
    }

    // Check if it's a valid sequence (consecutive same suit)
    if (this.isValidSequence(cards)) {
      return {valid: true, type: 'sequence'};
    }

    return {
      valid: false,
      reason: 'Cards do not form a valid set (same rank) or sequence (consecutive same suit)',
    };
  }

  isValidSet(cards) {
    // At least 2 non-joker cards
    let nonJokerCount = 0;
    const setOfValues = new Set();

    for (const card of cards) {
      if (card.value === 'Joker') {
        continue;
      }
      nonJokerCount += 1;
      setOfValues.add(card.value);
      if (setOfValues.size > 1) {
        return false;
      }
    }

    return nonJokerCount >= 2;
  }

  isValidSequence(cards) {
    if (cards.length < 4) return false;

    // Find first non-joker card to determine suit
    let nonJokerIndex = 0;
    while (nonJokerIndex < cards.length && cards[nonJokerIndex].value === 'Joker') {
      nonJokerIndex += 1;
    }

    if (nonJokerIndex >= cards.length) {
      return false; // All jokers
    }

    const suit = cards[nonJokerIndex].suit;

    // Check all cards are same suit (or joker)
    for (const card of cards) {
      if (card.suit !== suit && card.value !== 'Joker') {
        return false;
      }
    }

    // Check at least 2 non-jokers
    let nonJokerCount = 0;
    for (const card of cards) {
      if (card.value !== 'Joker') {
        nonJokerCount += 1;
      }
    }

    return nonJokerCount >= 2;
    // Note: Full sequence validation is complex with jokers,
    // so we rely on server validation for now
  }

  async waitForUpdate() {
    // Wait for the next server update
    return new Promise((resolve) => {
      this.pendingUpdateResolvers.push(resolve);

      // Fallback timeout in case something goes wrong
      setTimeout(() => {
        const index = this.pendingUpdateResolvers.indexOf(resolve);
        if (index !== -1) {
          this.pendingUpdateResolvers.splice(index, 1);
          resolve();
        }
      }, 5000); // 5 second timeout
    });
  }
}

if (require.main === module) {
  (async () => {
    const client = new TerminalClient();
    await client.connect();
  })();
}

module.exports = TerminalClient;
