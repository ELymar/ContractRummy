/**
 * Hand analysis for the AI opponent.
 *
 * The engine already owns the *rules* (which melds are legal, what each round's
 * contract is). This module owns the *search*: given a hand, find the best sets
 * and runs, decide what's worth keeping, and which card is deadwood. It returns
 * plain data (card uuids) that maps directly onto the engine's LAY_DOWN /
 * ADD_TO_MELD / DISCARD payloads.
 *
 * Jokers are wild; the engine requires >= 2 natural cards per meld.
 */
const {VALUES} = require('../shared/Constants');
const {isValidSequence, isValidDupes} = require('../core/utils/Utils');

const SUITS = ['Hearts', 'Spades', 'Clubs', 'Diamonds'];

const isJoker = (c) => c.value === 'Joker' || c.suit === 'Joker';

/** All k-sized combinations of arr (k small; jokers number <= 2 in practice). */
function combinations(arr, k) {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  const out = [];
  const rec = (start, combo) => {
    if (combo.length === k) {
      out.push(combo.slice());
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      rec(i + 1, combo);
      combo.pop();
    }
  };
  rec(0, []);
  return out;
}

// Two=2 .. Ten=10, Jack=11, Queen=12, King=13, Ace=14 (high). Ace can also be
// low (1) for A-2-3-4 runs; callers handle that by also mapping Ace at rank 1.
const rankNum = (value) => VALUES.indexOf(value) + 2;

/**
 * Candidate sets: same-rank groups of >= 3 (jokers filling to reach 3).
 * Prefers natural-only sets; only spends a joker when a rank has exactly 2.
 */
function candidateSets(hand) {
  const jokers = hand.filter(isJoker);
  const byValue = new Map();
  for (const c of hand) {
    if (isJoker(c)) continue;
    if (!byValue.has(c.value)) byValue.set(c.value, []);
    byValue.get(c.value).push(c);
  }

  const candidates = [];
  for (const [, naturals] of byValue) {
    if (naturals.length >= 3) {
      const cards = naturals.slice(0, 3);
      candidates.push(makeMeld(cards, 'set'));
    } else if (naturals.length === 2 && jokers.length >= 1) {
      // One candidate per joker, so two joker-using melds can take distinct jokers.
      for (const joker of jokers) {
        candidates.push(makeMeld([...naturals, joker], 'set'));
      }
    }
  }
  return candidates.filter((m) => isValidDupes(m.cards));
}

/**
 * Candidate runs of the requested lengths: same-suit consecutive cards, with
 * jokers filling interior gaps. Cards are returned in sequence order.
 */
function candidateRuns(hand, lengths) {
  const jokerUuids = hand.filter(isJoker).map((c) => c.uuid);
  const candidates = [];
  const seen = new Set();

  for (const suit of SUITS) {
    // rank position -> natural card of this suit (Ace mapped both high and low)
    const atRank = new Map();
    for (const c of hand) {
      if (isJoker(c) || c.suit !== suit) continue;
      atRank.set(rankNum(c.value), c);
      if (c.value === 'Ace') atRank.set(1, c);
    }

    for (const len of lengths) {
      for (let start = 1; start + len - 1 <= 14; start++) {
        const cards = [];
        let naturals = 0;
        let jokersNeeded = 0;
        for (let pos = start; pos < start + len; pos++) {
          const nat = atRank.get(pos);
          if (nat) {
            cards.push(nat);
            naturals++;
          } else {
            jokersNeeded++;
            cards.push(null); // placeholder, filled below
          }
        }
        if (naturals < 2 || jokersNeeded > jokerUuids.length) continue;

        // Emit one candidate per choice of which jokers fill the gaps, so
        // multiple joker-using melds can each take distinct jokers.
        for (const combo of combinations(jokerUuids, jokersNeeded)) {
          let j = 0;
          const built = cards.map((c) =>
            c ? c : {value: 'Joker', suit: 'Joker', uuid: combo[j++]},
          );
          const meld = makeMeld(built, 'sequence');
          const key = `${suit}:${meld.cardUuids.join(',')}`;
          if (seen.has(key)) continue;
          seen.add(key);
          if (isValidSequence(meld.cards)) candidates.push(meld);
        }
      }
    }
  }
  return candidates;
}

function makeMeld(cards, type) {
  return {cards, cardUuids: cards.map((c) => c.uuid), type};
}

/**
 * Find a grouping of the hand that satisfies the round contract, or null.
 * Returns { melds: [{ cardUuids, type }] } ready for a LAY_DOWN payload.
 */
function findContract(hand, contract) {
  const reqs = contract.requirements;
  const sets = candidateSets(hand);
  const seqLengths = [...new Set(reqs.filter((r) => r.type === 'sequence').map((r) => r.minCards))];
  const runs = candidateRuns(hand, seqLengths.length ? seqLengths : []);

  const assign = (i, used) => {
    if (i === reqs.length) return [];
    const req = reqs[i];
    const pool = req.type === 'set' ? sets : runs;
    for (const cand of pool) {
      if (cand.cards.length < req.minCards) continue;
      if (cand.cardUuids.some((u) => used.has(u))) continue;
      const rest = assign(i + 1, new Set([...used, ...cand.cardUuids]));
      if (rest) return [{cardUuids: cand.cardUuids, type: req.type}, ...rest];
    }
    return null;
  };

  const melds = assign(0, new Set());
  if (!melds) return null;

  // Defensive: confirm the engine would accept this grouping.
  if (!contract.isContractSatisfied(melds.map((m, i) => ({type: reqs[i].type, cards: m.cardUuids})))) {
    return null;
  }
  return {melds};
}

/**
 * Find a hand card that legally extends an existing meld (own or opponent's),
 * at either end. The server tries end-then-begin when no position is given, so
 * we return { cardUuid, meldIndex } with no position and let it place the card.
 */
function findAddition(hand, downPiles) {
  for (const card of hand) {
    for (let m = 0; m < downPiles.length; m++) {
      const pile = downPiles[m];
      let ok;
      if (pile.type === 'dupes') {
        ok = isValidDupes([...pile.cards, card]);
      } else {
        // sequence: card may fit at the front or the back
        ok = isValidSequence([...pile.cards, card]) || isValidSequence([card, ...pile.cards]);
      }
      if (ok) return {cardUuid: card.uuid, meldIndex: m};
    }
  }
  return null;
}

/** Largest same-rank group in a card list (a set in progress). */
function bestSetGroup(cards) {
  const byValue = new Map();
  for (const c of cards) {
    if (!byValue.has(c.value)) byValue.set(c.value, []);
    byValue.get(c.value).push(c);
  }
  let best = [];
  for (const [, group] of byValue) {
    if (group.length > best.length) best = group;
  }
  return best.length >= 2 ? best : best.slice(0, 1); // keep a seed even if no pair yet
}

/** Longest same-suit consecutive group (a run in progress); allows one-rank gaps. */
function bestRunGroup(cards) {
  let best = [];
  for (const suit of SUITS) {
    const suited = cards
      .filter((c) => c.suit === suit)
      .sort((a, b) => rankNum(a.value) - rankNum(b.value));
    let i = 0;
    while (i < suited.length) {
      const run = [suited[i]];
      let j = i + 1;
      while (j < suited.length) {
        const prev = rankNum(run[run.length - 1].value);
        const cur = rankNum(suited[j].value);
        if (cur === prev) {
          j++; // duplicate rank, same suit (double deck) — skip
        } else if (cur - prev === 1) {
          run.push(suited[j]);
          j++;
        } else {
          break;
        }
      }
      if (run.length > best.length) best = run;
      i = Math.max(i + 1, j);
    }
  }
  return best.length >= 2 ? best : best.slice(0, 1);
}

/**
 * The cards worth keeping toward the round contract: greedily reserve the best
 * partial meld for each requirement, plus all jokers. Everything else is
 * deadwood and is the first thing to discard.
 */
function planKeepers(hand, contract) {
  const keepers = new Set();
  hand.filter(isJoker).forEach((c) => keepers.add(c.uuid));
  if (!contract) return keepers;

  const used = new Set();
  const available = () => hand.filter((c) => !isJoker(c) && !used.has(c.uuid));

  for (const req of contract.requirements) {
    const group = req.type === 'set' ? bestSetGroup(available()) : bestRunGroup(available());
    group.forEach((c) => {
      keepers.add(c.uuid);
      used.add(c.uuid);
    });
  }
  return keepers;
}

/** Should we take burnTop instead of drawing blind? Take if it helps the plan. */
function discardHelps(burnTop, hand, contract) {
  if (!burnTop) return false;
  if (isJoker(burnTop)) return true; // always grab a wild card
  if (contract) {
    // Take it if it would be reserved toward the contract.
    return planKeepers([...hand, burnTop], contract).has(burnTop.uuid);
  }
  const naturals = hand.filter((c) => !isJoker(c));
  const rankPartners = naturals.filter((c) => c.value === burnTop.value).length;
  const suitNeighbors = naturals.filter(
    (c) => c.suit === burnTop.suit && Math.abs(rankNum(c.value) - rankNum(burnTop.value)) <= 2,
  ).length;
  return rankPartners >= 1 || suitNeighbors >= 2;
}

/**
 * Choose the least useful card to discard: prefer deadwood (not reserved toward
 * the contract), then the least-connected, highest-rank card. Never a joker.
 */
function pickDiscardCard(hand, contract) {
  const keepers = planKeepers(hand, contract);
  const naturals = hand.filter((c) => !isJoker(c));
  const deadwood = naturals.filter((c) => !keepers.has(c.uuid));
  const pool = deadwood.length > 0 ? deadwood : naturals.length > 0 ? naturals : hand;

  let worst = null;
  let worstScore = Infinity;
  for (const c of pool) {
    const rankPartners = naturals.filter((x) => x.uuid !== c.uuid && x.value === c.value).length;
    const suitNeighbors = naturals.filter(
      (x) => x.uuid !== c.uuid && x.suit === c.suit && Math.abs(rankNum(x.value) - rankNum(c.value)) <= 2,
    ).length;
    const useful = rankPartners * 2 + suitNeighbors;
    const score = useful * 100 - rankNum(c.value); // low useful first; shed higher ranks
    if (score < worstScore) {
      worstScore = score;
      worst = c;
    }
  }
  return worst;
}

module.exports = {
  isJoker,
  rankNum,
  candidateSets,
  candidateRuns,
  findContract,
  findAddition,
  discardHelps,
  pickDiscardCard,
};
