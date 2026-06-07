/**
 * The AI brain: a pure (view) -> command function.
 *
 * `view` is exactly the per-player view the server sends clients
 * (GameEngine.getViewFor). `command` is one action in the server's wire shape
 * ({ type, payload? }); the caller attaches playerId and applies it. Returning
 * one action per call mirrors how a real client plays, so the same brain drives
 * the headless sim, the dev bot, and (later) in-browser single-player.
 *
 * Strategy (v1, heuristic):
 *   draw: take the discard only if it helps a meld, else draw the deck
 *   meld: lay down as soon as the hand contains the round's full contract
 *   go out: once down, offload cards onto melds, keeping one to discard
 *   discard: shed the least useful (deadwood) card
 */
const {getContractForRound} = require('../core/rules/RoundContract');
const {
  findContract,
  findAddition,
  discardHelps,
  pickDiscardCard,
} = require('./handAnalysis');

function decideAction(view) {
  const can = (a) => (view.validActions || []).includes(a);
  const hand = view.yourHand || [];
  const contract = safeContract(view.round);

  // --- Draw phase ---------------------------------------------------------
  if (!view.tookCard) {
    if (can('TAKE_FROM_DISCARD') && discardHelps(view.burnTop, hand, contract)) {
      return {type: 'TAKE_FROM_DISCARD'};
    }
    if (can('DRAW')) return {type: 'DRAW'};
    // First turn: neither draw is allowed; fall through to discard.
  }

  // --- Lay down the contract ---------------------------------------------
  if (!view.youAreDown && can('LAY_DOWN') && contract) {
    const grouping = findContract(hand, contract);
    if (grouping) return {type: 'LAY_DOWN', payload: grouping};
  }

  // --- Offload onto melds once down (keep >= 1 card to discard) -----------
  if (view.youAreDown && can('ADD_TO_MELD') && hand.length > 1) {
    const add = findAddition(hand, view.downPiles || []);
    if (add) return {type: 'ADD_TO_MELD', payload: add};
  }

  // --- Discard deadwood (exactly once per turn, then end) -----------------
  // The engine leaves DISCARD legal after a discard and relies on the client to
  // end its turn; without this guard the bot would dump its whole hand.
  if (!view.discarded && can('DISCARD') && hand.length > 0) {
    const card = pickDiscardCard(hand, contract);
    if (card) return {type: 'DISCARD', payload: {cardUuid: card.uuid}};
  }

  // --- End turn -----------------------------------------------------------
  if (can('END_TURN')) return {type: 'END_TURN'};

  return null;
}

function safeContract(round) {
  try {
    return getContractForRound(round);
  } catch {
    return null;
  }
}

module.exports = {decideAction};
