const ActionHandler = require('./ActionHandler');
const { EventType } = require('../events');
const { getContractForRound } = require('../../rules/RoundContract');
const { isValidDupes, isValidSequence } = require('../../utils/Utils');
const DownPile = require('../../domain/DownPile');

/**
 * Handles LAY_DOWN actions - player lays down initial melds to go down
 */
class LayDownHandler extends ActionHandler {
  handle(playerId, payload) {
    // Validate turn and player state
    const turnCheck = this.validateTurn(playerId);
    if (turnCheck.error) {
      return this.createError(turnCheck.error);
    }

    const player = turnCheck.player;
    if (player.isDown) {
      return this.createError('Already down this round');
    }

    if (!player.tookCard) {
      return this.createError('Must draw a card before laying down');
    }

    // Validate melds payload
    const { melds } = payload;
    if (!melds || !Array.isArray(melds) || melds.length === 0) {
      return this.createError('Must provide melds to lay down');
    }

    // Validate contract and melds
    try {
      const contract = getContractForRound(this.state.currentRound);
      const validationResult = this.validateMelds(player, melds, contract);
      if (validationResult.error) {
        return this.createError(validationResult.error);
      }

      // Execute lay down
      return this.executeLayDown(player, validationResult.validatedMelds);

    } catch (error) {
      return this.createError(`Contract validation failed: ${error.message}`);
    }
  }

  validateMelds(player, melds, contract) {
    if (melds.length !== contract.requirements.length) {
      return { 
        error: `Contract requires ${contract.requirements.length} melds, got ${melds.length}` 
      };
    }

    const usedCardUuids = new Set();
    const validatedMelds = [];

    for (let i = 0; i < melds.length; i++) {
      const meld = melds[i];
      const { cardUuids, type } = meld;

      if (!cardUuids || !Array.isArray(cardUuids)) {
        return { error: 'Invalid meld cardUuids data' };
      }

      // Convert UUIDs to cards and validate
      const meldValidation = this.validateSingleMeld(player, cardUuids, type, usedCardUuids, i);
      if (meldValidation.error) {
        return { error: meldValidation.error };
      }

      validatedMelds.push(meldValidation.meld);
    }

    // Check contract satisfaction
    if (!contract.isContractSatisfied(validatedMelds.map(m => ({
      type: m.type === 'dupes' ? 'set' : 'sequence',
      cards: m.cards
    })))) {
      return { error: 'Melds do not satisfy contract requirements' };
    }

    return { validatedMelds };
  }

  validateSingleMeld(player, cardUuids, type, usedCardUuids, meldIndex) {
    const cards = [];
    const cardIndices = [];

    for (const uuid of cardUuids) {
      const cardLookup = this.findCardByUuid(player, uuid);
      if (cardLookup.error) {
        return { error: `Meld ${meldIndex + 1}: ${cardLookup.error}` };
      }

      if (usedCardUuids.has(uuid)) {
        return { error: 'Cannot use the same card in multiple melds' };
      }

      usedCardUuids.add(uuid);
      cards.push(player.hand.cards[cardLookup.cardIndex]);
      cardIndices.push(cardLookup.cardIndex);
    }

    // Validate meld type
    if (type === 'set' && !isValidDupes(cards)) {
      return { error: `Invalid set at meld ${meldIndex + 1}` };
    } else if (type === 'sequence' && !isValidSequence(cards)) {
      return { error: `Invalid sequence at meld ${meldIndex + 1}` };
    }

    return {
      meld: {
        cards,
        cardIndices,
        type: type === 'set' ? 'dupes' : 'sequence'
      }
    };
  }

  executeLayDown(player, validatedMelds) {
    const evts = [];

    // Create down piles
    for (const meld of validatedMelds) {
      const downPile = new DownPile(meld.type, player.name, meld.cards);
      this.state.downPiles.push(downPile);
    }

    // Remove cards from hand (in descending index order to avoid shifting)
    const allCardIndices = [];
    validatedMelds.forEach(meld => allCardIndices.push(...meld.cardIndices));
    const sortedIndices = allCardIndices.sort((a, b) => b - a);

    sortedIndices.forEach(idx => {
      player.hand.cards.splice(idx, 1);
    });

    player.isDown = true;

    // Emit lay down event
    evts.push(this.emit(EventType.MELD_LAID, {
      playerId: player.id,
      melds: validatedMelds.map(meld => ({
        cards: meld.cards.map(card => card.toString?.() ?? String(card)),
        type: meld.type
      }))
    }));

    return evts;
  }
}

module.exports = LayDownHandler;