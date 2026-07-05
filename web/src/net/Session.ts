import type { Command, GameEvent, GameView, RoundSummary } from './protocol';

/**
 * The seam between the renderer and "whatever produces the next view".
 *
 * Two implementations:
 *  - LocalSession: an in-browser mock with NO rules — used to build and tune
 *    rendering + drag/drop feel without a server.
 *  - GameClient: the real WebSocket client talking to the authoritative engine.
 *
 * The TableScene only ever talks to this interface, so swapping mock for server
 * is a one-line change and touches none of the rendering code.
 */
export interface Session {
  readonly playerId: string | null;
  readonly view: GameView | null;

  connect(): void;
  send(command: Command): void;

  /** Subscribe to view updates. Returns an unsubscribe fn. */
  onView(fn: (view: GameView) => void): () => void;

  /** Subscribe to rejected-action / error messages (optional; server only). */
  onError?(fn: (message: string) => void): () => void;

  /**
   * Subscribe to raw engine events (optional). The UI uses these to narrate
   * what other players just did (drew, discarded, laid down…).
   */
  onEvents?(fn: (events: GameEvent[]) => void): () => void;

  /**
   * Subscribe to end-of-round score summaries (optional). When provided, the
   * session pauses after each round until nextRound() is called, so the UI
   * can show the score table.
   */
  onRoundEnd?(fn: (summary: RoundSummary) => void): () => void;

  /** Resume play after a round-end pause (no-op once the game is complete). */
  nextRound?(): void;
}
