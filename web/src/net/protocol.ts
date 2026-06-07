// Wire protocol shared with the Node server (server/src/core/engine/actions.js,
// events.js and GameEngine.getViewFor). Keep these in sync with the server.

export const ActionType = {
  JOIN: 'JOIN',
  READY: 'READY',
  DRAW: 'DRAW',
  TAKE_FROM_DISCARD: 'TAKE_FROM_DISCARD',
  DISCARD: 'DISCARD',
  LAY_DOWN: 'LAY_DOWN',
  ADD_TO_MELD: 'ADD_TO_MELD',
  END_TURN: 'END_TURN',
  SORT: 'SORT',
  QUIT: 'QUIT',
} as const;
export type ActionType = (typeof ActionType)[keyof typeof ActionType];

export type Suit = 'Hearts' | 'Spades' | 'Clubs' | 'Diamonds' | 'Joker';
export type Value =
  | 'Two' | 'Three' | 'Four' | 'Five' | 'Six' | 'Seven' | 'Eight'
  | 'Nine' | 'Ten' | 'Jack' | 'Queen' | 'King' | 'Ace';

// A card as serialized over the wire (Card.js -> JSON drops its methods).
export interface CardDTO {
  suit: Suit;
  value: Value;
  uuid: string;
}

export interface PlayerView {
  id: string | number;
  name: string;
  handCount: number;
  isDown: boolean;
}

export interface DownPileView {
  type: string;
  owner: string;
  cards: CardDTO[];
}

// Shape returned by GameEngine.getViewFor(playerId).
export interface GameView {
  gameId: string;
  players: PlayerView[];
  yourHand: CardDTO[];
  burnTop: CardDTO | null;
  burnPileAvailable: boolean;
  downPiles: DownPileView[];
  currentPlayerIndex: number;
  dealerIndex: number;
  round: number;
  firstTurn: boolean;
  deckCount: number;
  isYourTurn: boolean;
  youAreDown: boolean;
  tookCard: boolean;
  discarded: boolean;
  validActions: ActionType[];
}

export interface GameEvent {
  type: string;
  payload?: Record<string, unknown>;
  seq?: number;
  ts?: number;
}

// Server -> client envelopes.
export type ServerMessage =
  | { kind: 'welcome'; gameId: string; playerId: string }
  | { kind: 'events'; events: GameEvent[]; snapshot: { view: GameView } }
  | { kind: 'error'; message?: string };

// Client -> server envelope. `command.type` is an ActionType; action arguments
// ride in `payload` (the server's GameEngine.apply reads {type, playerId, payload}).
//   DISCARD       -> payload: { cardUuid }
//   ADD_TO_MELD   -> payload: { cardUuid, meldIndex, position }
//   DRAW / TAKE_FROM_DISCARD / END_TURN -> no payload
export interface Command {
  type: ActionType;
  playerId?: string;
  payload?: Record<string, unknown>;
}
