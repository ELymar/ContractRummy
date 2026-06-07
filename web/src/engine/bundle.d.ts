// Types for the generated engine bundle (scripts/build-engine.mjs).
import type { Command, GameView } from '../net/protocol';

export interface EngineEvent {
  type: string;
  payload?: Record<string, unknown>;
  seq?: number;
  ts?: number;
}

export interface EnginePlayer {
  id: string;
  name: string;
  isDown: boolean;
}

export interface EngineState {
  players: EnginePlayer[];
  currentPlayerIndex: number;
  currentRound: number;
  started: boolean;
}

export class GameEngine {
  constructor(opts?: { rng?: () => number });
  state: EngineState;
  scoreKeeper: { getScoreTable?: () => unknown; isGameComplete?: () => boolean } | null;
  apply(command: Command & { playerId: string }): EngineEvent[];
  getViewFor(playerId: string): GameView;
  startNextRound(): EngineEvent[];
}

export function decideAction(view: GameView): Command | null;
