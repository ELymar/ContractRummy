import type { Session } from './Session';
import type { Command, GameView } from './protocol';
import { GameEngine, decideAction } from '../engine/bundle';
import type { EngineEvent } from '../engine/bundle';

const HUMAN_ID = 'human';
const AI_STEP_MS = 700; // pace AI actions so the human can watch them play

/**
 * Single-player session: runs the authoritative engine + AI entirely in the
 * browser, no server. You are HUMAN_ID; your commands are applied locally, and
 * each AI opponent's turn is played by decideAction on a timer. Implements the
 * same Session interface as GameClient, so the table UI is identical.
 */
export class SinglePlayerSession implements Session {
  readonly playerId = HUMAN_ID;
  view: GameView | null = null;

  private engine!: GameEngine;
  private aiIds: string[] = [];
  private aiTimer: ReturnType<typeof setTimeout> | null = null;
  private gameOver = false;

  private viewListeners = new Set<(v: GameView) => void>();
  private errorListeners = new Set<(m: string) => void>();

  constructor(private opponents = 1) {}

  connect(): void {
    this.engine = new GameEngine({});
    this.engine.apply({ type: 'JOIN', playerId: HUMAN_ID, payload: { name: 'You' } } as never);
    for (let i = 0; i < this.opponents; i++) {
      const id = `ai${i}`;
      this.aiIds.push(id);
      this.engine.apply({ type: 'JOIN', playerId: id, payload: { name: `AI ${i + 1}` } } as never);
    }
    this.engine.apply({ type: 'READY', playerId: HUMAN_ID } as never);
    this.aiIds.forEach((id) => this.engine.apply({ type: 'READY', playerId: id } as never));

    this.emit();
    this.maybeRunAI(); // the player after the dealer (an AI) opens the round
  }

  send(command: Command): void {
    if (this.gameOver) return;
    this.applyFor(command, HUMAN_ID);
    this.emit();
    this.maybeRunAI();
  }

  onView(fn: (view: GameView) => void): () => void {
    this.viewListeners.add(fn);
    return () => this.viewListeners.delete(fn);
  }

  onError(fn: (message: string) => void): () => void {
    this.errorListeners.add(fn);
    return () => this.errorListeners.delete(fn);
  }

  // ---- internals -----------------------------------------------------------

  private applyFor(command: Command, playerId: string): void {
    const evts = this.engine.apply({ ...command, playerId } as Command & { playerId: string });
    this.processEvents(evts);
  }

  private processEvents(evts: EngineEvent[]): void {
    const error = evts.find((e) => e.type === 'ERROR');
    if (error) this.fail((error.payload?.message as string) ?? 'Action rejected');

    const roundEnded = evts.find((e) => e.type === 'ROUND_ENDED');
    if (roundEnded) {
      if (roundEnded.payload?.gameComplete) {
        this.gameOver = true;
        const winner = (roundEnded.payload?.winnerName as string) ?? 'Someone';
        this.fail(`Game over — ${winner} wins!`);
      } else {
        this.engine.startNextRound();
      }
    }
  }

  /** Drive AI turns until it's the human's turn (or the game ends). */
  private maybeRunAI(): void {
    if (this.aiTimer || this.gameOver) return;

    const step = (): void => {
      this.aiTimer = null;
      if (this.gameOver) return;

      const current = this.engine.state.players[this.engine.state.currentPlayerIndex];
      if (!current || !this.aiIds.includes(current.id)) return; // human's turn — stop

      const command = decideAction(this.engine.getViewFor(current.id));
      if (!command) return;

      this.applyFor(command, current.id);
      this.emit();
      this.aiTimer = setTimeout(step, AI_STEP_MS);
    };

    this.aiTimer = setTimeout(step, AI_STEP_MS);
  }

  private emit(): void {
    this.view = this.engine.getViewFor(HUMAN_ID);
    const v = this.view;
    this.viewListeners.forEach((fn) => fn(v));
  }

  private fail(message: string): void {
    this.errorListeners.forEach((fn) => fn(message));
  }
}
