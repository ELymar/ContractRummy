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
  | 'Nine' | 'Ten' | 'Jack' | 'Queen' | 'King' | 'Ace'
  | 'Joker';

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
  type: string; // 'dupes' (set) or 'sequence' (run)
  owner: string;
  cards: CardDTO[];
}

export type MeldType = 'set' | 'sequence';

export interface Requirement {
  type: MeldType;
  minCards: number;
}

export interface Contract {
  description: string;
  requirements: Requirement[];
}

// Shape returned by GameEngine.getViewFor(playerId).
export interface GameView {
  gameId: string;
  players: PlayerView[];
  you: { id: string | number; name: string } | null;
  contract: Contract | null;
  yourHand: CardDTO[];
  burnTop: CardDTO | null;
  burnPileAvailable: boolean;
  downPiles: DownPileView[];
  currentPlayerIndex: number;
  dealerIndex: number;
  started: boolean;
  round: number;
  firstTurn: boolean;
  deckCount: number;
  isYourTurn: boolean;
  youAreDown: boolean;
  tookCard: boolean;
  discarded: boolean;
  validActions: ActionType[];
}

/** Scores shown between rounds. `rounds[i]` is null until round i+1 is played. */
export interface RoundSummary {
  roundNumber: number;
  totalRounds: number;
  winnerName: string;
  gameComplete: boolean;
  players: { name: string; rounds: (number | null)[]; total: number }[];
}

/** Structured score table in the ROUND_ENDED payload (GameEngine.getScoreboard). */
export interface Scoreboard {
  totalRounds: number;
  players: { name: string; rounds: (number | null)[]; total: number }[];
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

// Client -> server envelopes. For 'command', `command.type` is an ActionType;
// action arguments ride in `payload` (the server's GameEngine.apply reads
// {type, playerId, payload}).
//   DISCARD       -> payload: { cardUuid }
//   ADD_TO_MELD   -> payload: { cardUuid, meldIndex, position }
//   DRAW / TAKE_FROM_DISCARD / END_TURN -> no payload
// 'next_round' advances past the score screen (server pauseAtRoundEnd mode).
export interface Command {
  type: ActionType;
  playerId?: string;
  payload?: Record<string, unknown>;
}

export type ClientMessage =
  | { kind: 'command'; command: Command }
  | { kind: 'next_round' };
