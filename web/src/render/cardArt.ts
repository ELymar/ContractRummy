import type { CardDTO, Suit, Value } from '../net/protocol';

// Card art lives in /public/cards as `${RANK}_${suit}.png`, e.g. "A_spades.png",
// "10_hearts.png", plus "back.png" and "joker.png" (copied from ui/assets/cards).

const VALUE_TO_RANK: Record<Value, string> = {
  Ace: 'A', King: 'K', Queen: 'Q', Jack: 'J', Ten: '10',
  Nine: '9', Eight: '8', Seven: '7', Six: '6', Five: '5',
  Four: '4', Three: '3', Two: '2',
};

const SUIT_TO_FILE: Record<Exclude<Suit, 'Joker'>, string> = {
  Hearts: 'hearts', Spades: 'spades', Clubs: 'clubs', Diamonds: 'diamonds',
};

export const CARD_BACK_KEY = 'back';

/** Phaser texture key for a card (also its filename without extension). */
export function cardKey(card: CardDTO): string {
  if (card.suit === 'Joker') return 'joker';
  return `${VALUE_TO_RANK[card.value]}_${SUIT_TO_FILE[card.suit as Exclude<Suit, 'Joker'>]}`;
}

/** Every texture key we need to preload, including back + joker. */
export function allCardKeys(): string[] {
  const keys: string[] = [CARD_BACK_KEY, 'joker'];
  for (const value of Object.keys(VALUE_TO_RANK) as Value[]) {
    for (const suit of Object.keys(SUIT_TO_FILE) as Exclude<Suit, 'Joker'>[]) {
      keys.push(`${VALUE_TO_RANK[value]}_${SUIT_TO_FILE[suit]}`);
    }
  }
  return keys;
}
