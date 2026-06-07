import type { Session } from './Session';
import { ActionType } from './protocol';
import type { CardDTO, Command, GameView, Suit, Value } from './protocol';

const SUITS: Exclude<Suit, 'Joker'>[] = ['Hearts', 'Spades', 'Clubs', 'Diamonds'];
const VALUES: Value[] = [
  'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
  'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King',
];

function buildDeck(): CardDTO[] {
  const deck: CardDTO[] = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value, uuid: crypto.randomUUID() });
    }
  }
  // Two jokers, like the family deck.
  deck.push({ suit: 'Joker', value: 'Joker' as Value, uuid: crypto.randomUUID() });
  deck.push({ suit: 'Joker', value: 'Joker' as Value, uuid: crypto.randomUUID() });
  // Fisher–Yates shuffle.
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * A rules-free, in-browser stand-in for the game server. It exists ONLY to let
 * us build and tune rendering + drag/drop without a server. It performs no
 * validation: any command that arrives is reflected into the view optimistically.
 * When real logic is wanted, swap this for GameClient — same Session interface.
 */
export class LocalSession implements Session {
  readonly playerId = 'you';
  view: GameView | null = null;

  private deck: CardDTO[] = [];
  private listeners = new Set<(view: GameView) => void>();

  connect(): void {
    this.deck = buildDeck();
    const yourHand = this.deck.splice(0, 11);
    const burnTop = this.deck.splice(0, 1)[0] ?? null;

    this.view = {
      gameId: 'local',
      playerId: this.playerId,
      players: [
        { id: 'you', name: 'You', handCount: yourHand.length, isDown: false },
        { id: 'p2', name: 'Robin', handCount: 11, isDown: false },
        { id: 'p3', name: 'Sam', handCount: 11, isDown: false },
      ],
      yourHand,
      burnTop,
      burnPileAvailable: burnTop != null,
      // Two empty meld zones to drag into.
      downPiles: [
        { type: 'meld', owner: 'You', cards: [] },
        { type: 'meld', owner: 'You', cards: [] },
      ],
      currentPlayerIndex: 0,
      dealerIndex: 0,
      round: 1,
      firstTurn: false,
      deckCount: this.deck.length,
      isYourTurn: true,
      youAreDown: false,
      tookCard: false,
      discarded: false,
      // Mock: everything is allowed.
      validActions: [
        ActionType.DRAW, ActionType.TAKE_FROM_DISCARD, ActionType.DISCARD,
        ActionType.LAY_DOWN, ActionType.ADD_TO_MELD, ActionType.END_TURN, ActionType.SORT,
      ],
    } as GameView & { playerId: string };

    this.emit();
  }

  send(command: Command): void {
    const v = this.view;
    if (!v) return;

    switch (command.type) {
      case ActionType.DRAW: {
        const card = this.deck.shift();
        if (card) {
          v.yourHand.push(card);
          v.deckCount = this.deck.length;
          v.tookCard = true;
        }
        break;
      }
      case ActionType.TAKE_FROM_DISCARD: {
        if (v.burnTop) {
          v.yourHand.push(v.burnTop);
          v.burnTop = null;
          v.burnPileAvailable = false;
          v.tookCard = true;
        }
        break;
      }
      case ActionType.DISCARD: {
        // Server shape: payload.cardUuid
        const cardUuid = command.payload?.cardUuid as string | undefined;
        const card = cardUuid ? v.yourHand.find((c) => c.uuid === cardUuid) : undefined;
        if (card) {
          this.removeFromHand(v, card.uuid);
          v.burnTop = card;
          v.burnPileAvailable = true;
          v.discarded = true;
        }
        break;
      }
      case ActionType.ADD_TO_MELD: {
        // Server shape: payload.{cardUuid, meldIndex, position}
        const cardUuid = command.payload?.cardUuid as string | undefined;
        const meldIndex = (command.payload?.meldIndex as number) ?? 0;
        const position = command.payload?.position as number | undefined;
        const pile = v.downPiles[meldIndex];
        const card = cardUuid ? v.yourHand.find((c) => c.uuid === cardUuid) : undefined;
        if (card && pile) {
          this.removeFromHand(v, card.uuid);
          const at = position ?? pile.cards.length;
          pile.cards.splice(Math.max(0, Math.min(at, pile.cards.length)), 0, card);
        }
        break;
      }
    }

    this.syncHandCount(v);
    this.emit();
  }

  onView(fn: (view: GameView) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private removeFromHand(v: GameView, uuid: string): void {
    const i = v.yourHand.findIndex((c) => c.uuid === uuid);
    if (i >= 0) v.yourHand.splice(i, 1);
  }

  private syncHandCount(v: GameView): void {
    const me = v.players.find((p) => p.id === this.playerId);
    if (me) me.handCount = v.yourHand.length;
  }

  private emit(): void {
    if (this.view) this.listeners.forEach((fn) => fn(this.view as GameView));
  }
}
