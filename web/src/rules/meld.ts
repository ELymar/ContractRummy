// Client-side port of the engine's meld rules (server/src/core/utils/Utils.js
// and server/src/ai/handAnalysis.js). Used only for UX: enabling the Lay Down
// button and partitioning the selected cards into the contract's melds. The
// SERVER re-validates every LAY_DOWN, so this is a convenience, not authority.
import type { CardDTO, Contract, MeldType, Value } from '../net/protocol';

const VALUES: Value[] = [
  'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
  'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace',
];
const SUITS = ['Hearts', 'Spades', 'Clubs', 'Diamonds'] as const;

export const isJoker = (c: CardDTO): boolean => c.value === 'Joker' || c.suit === 'Joker';
const rankNum = (value: string): number => VALUES.indexOf(value as Value) + 2;
const successor = (value: Value): Value => VALUES[(VALUES.indexOf(value) + 1) % VALUES.length];

/** All k-sized combinations of arr (k small; jokers number <= 2 in practice). */
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  const out: T[][] = [];
  const rec = (start: number, combo: T[]): void => {
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

// --- validity oracles (mirror Utils.js) -----------------------------------

export function isValidDupes(cards: CardDTO[]): boolean {
  if (cards.length < 3) return false;
  const naturals = cards.filter((c) => !isJoker(c));
  if (naturals.length < 2) return false;
  const values = new Set(naturals.map((c) => c.value));
  return values.size === 1;
}

export function isValidSequence(cards: CardDTO[]): boolean {
  if (cards.length < 4) return false;

  let nonJoker = 0;
  while (nonJoker < cards.length && isJoker(cards[nonJoker])) nonJoker++;
  if (nonJoker >= cards.length) return false;

  const suit = cards[nonJoker].suit;
  for (const c of cards) {
    if (!isJoker(c) && c.suit !== suit) return false;
  }
  for (let i = 0; i < cards.length; i++) {
    if (cards[i].value === 'Ace' && i !== 0 && i !== cards.length - 1) return false;
  }
  if (cards.filter((c) => !isJoker(c)).length < 2) return false;

  let expected = cards[nonJoker].value as Value;
  let i = nonJoker;
  while (i < cards.length) {
    if (isJoker(cards[i])) {
      expected = successor(expected);
      i++;
      continue;
    }
    if (cards[i].value !== expected) return false;
    expected = successor(expected);
    i++;
  }
  return true;
}

// --- candidate generation + contract search (mirror handAnalysis.js) -------

interface Meld {
  cards: CardDTO[];
  cardUuids: string[];
  type: MeldType;
}

function candidateSets(hand: CardDTO[]): Meld[] {
  const jokers = hand.filter(isJoker);
  const byValue = new Map<string, CardDTO[]>();
  for (const c of hand) {
    if (isJoker(c)) continue;
    if (!byValue.has(c.value)) byValue.set(c.value, []);
    byValue.get(c.value)!.push(c);
  }
  const out: Meld[] = [];
  for (const naturals of byValue.values()) {
    if (naturals.length >= 3) {
      out.push(makeMeld(naturals.slice(0, 3), 'set'));
    } else if (naturals.length === 2 && jokers.length >= 1) {
      // One candidate per joker, so two joker-using melds can take distinct jokers.
      for (const joker of jokers) out.push(makeMeld([...naturals, joker], 'set'));
    }
  }
  return out.filter((m) => isValidDupes(m.cards));
}

function candidateRuns(hand: CardDTO[], lengths: number[]): Meld[] {
  const jokerUuids = hand.filter(isJoker).map((c) => c.uuid);
  const out: Meld[] = [];
  const seen = new Set<string>();

  for (const suit of SUITS) {
    const atRank = new Map<number, CardDTO>();
    for (const c of hand) {
      if (isJoker(c) || c.suit !== suit) continue;
      atRank.set(rankNum(c.value), c);
      if (c.value === 'Ace') atRank.set(1, c);
    }
    for (const len of lengths) {
      for (let start = 1; start + len - 1 <= 14; start++) {
        const slots: (CardDTO | null)[] = [];
        let naturals = 0;
        let gaps = 0;
        for (let pos = start; pos < start + len; pos++) {
          const nat = atRank.get(pos);
          if (nat) {
            slots.push(nat);
            naturals++;
          } else {
            slots.push(null);
            gaps++;
          }
        }
        if (naturals < 2 || gaps > jokerUuids.length) continue;
        // One candidate per choice of which jokers fill the gaps.
        for (const combo of combinations(jokerUuids, gaps)) {
          let j = 0;
          const built = slots.map((c) =>
            c ? c : ({ value: 'Joker', suit: 'Joker', uuid: combo[j++] } as CardDTO),
          );
          const meld = makeMeld(built, 'sequence');
          const key = `${suit}:${meld.cardUuids.join(',')}`;
          if (seen.has(key)) continue;
          seen.add(key);
          if (isValidSequence(meld.cards)) out.push(meld);
        }
      }
    }
  }
  return out;
}

function makeMeld(cards: CardDTO[], type: MeldType): Meld {
  return { cards, cardUuids: cards.map((c) => c.uuid), type };
}

export interface LayDownMelds {
  melds: { cardUuids: string[]; type: MeldType }[];
}

/** Partition `cards` into melds satisfying the contract, or null. */
export function findContract(cards: CardDTO[], contract: Contract): LayDownMelds | null {
  const reqs = contract.requirements;
  const sets = candidateSets(cards);
  const seqLens = [...new Set(reqs.filter((r) => r.type === 'sequence').map((r) => r.minCards))];
  const runs = candidateRuns(cards, seqLens);

  const assign = (i: number, used: Set<string>): { cardUuids: string[]; type: MeldType }[] | null => {
    if (i === reqs.length) return [];
    const req = reqs[i];
    const pool = req.type === 'set' ? sets : runs;
    for (const cand of pool) {
      if (cand.cards.length < req.minCards) continue;
      if (cand.cardUuids.some((u) => used.has(u))) continue;
      const rest = assign(i + 1, new Set([...used, ...cand.cardUuids]));
      if (rest) return [{ cardUuids: cand.cardUuids, type: req.type }, ...rest];
    }
    return null;
  };

  const melds = assign(0, new Set());
  return melds ? { melds } : null;
}
