import type { Command, GameEvent, GameView, ServerMessage } from './protocol';

type ViewListener = (view: GameView) => void;
type EventsListener = (events: GameEvent[]) => void;
type StatusListener = (status: ConnectionStatus) => void;

export type ConnectionStatus = 'connecting' | 'open' | 'closed' | 'error';

/**
 * Thin WebSocket client for the authoritative game server.
 *
 * Responsibilities are deliberately narrow: connect, parse the server
 * envelopes, surface the latest per-player view, and send commands. It holds
 * NO game rules — the server is the source of truth.
 */
export class GameClient {
  private ws: WebSocket | null = null;
  private readonly url: string;

  playerId: string | null = null;
  gameId: string | null = null;
  view: GameView | null = null;

  private viewListeners = new Set<ViewListener>();
  private eventsListeners = new Set<EventsListener>();
  private statusListeners = new Set<StatusListener>();
  private errorListeners = new Set<(message: string) => void>();

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    this.setStatus('connecting');
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.addEventListener('open', () => this.setStatus('open'));
    ws.addEventListener('close', () => this.setStatus('closed'));
    ws.addEventListener('error', () => this.setStatus('error'));
    ws.addEventListener('message', (ev) => this.handleMessage(ev.data));
  }

  private handleMessage(raw: unknown): void {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(String(raw)) as ServerMessage;
    } catch {
      console.warn('[GameClient] could not parse message:', raw);
      return;
    }

    switch (msg.kind) {
      case 'welcome':
        this.playerId = msg.playerId;
        this.gameId = msg.gameId;
        break;
      case 'events':
        this.view = msg.snapshot?.view ?? this.view;
        // Surface rejected-action ERROR events (e.g. an illegal lay-down).
        for (const ev of msg.events ?? []) {
          if (ev.type === 'ERROR') {
            const m = (ev.payload?.message as string) ?? 'Action rejected';
            this.errorListeners.forEach((fn) => fn(m));
          }
        }
        this.eventsListeners.forEach((fn) => fn(msg.events ?? []));
        if (this.view) {
          const v = this.view;
          this.viewListeners.forEach((fn) => fn(v));
        }
        break;
      case 'error':
        this.errorListeners.forEach((fn) => fn(msg.message ?? 'Server error'));
        break;
    }
  }

  /** Send a command to the server. playerId is filled in automatically. */
  send(command: Command): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[GameClient] send while socket not open:', command);
      return;
    }
    const withPlayer: Command = { playerId: this.playerId ?? undefined, ...command };
    this.ws.send(JSON.stringify({ kind: 'command', command: withPlayer }));
  }

  onView(fn: ViewListener): () => void {
    this.viewListeners.add(fn);
    return () => this.viewListeners.delete(fn);
  }

  onEvents(fn: EventsListener): () => void {
    this.eventsListeners.add(fn);
    return () => this.eventsListeners.delete(fn);
  }

  onStatus(fn: StatusListener): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  onError(fn: (message: string) => void): () => void {
    this.errorListeners.add(fn);
    return () => this.errorListeners.delete(fn);
  }

  private setStatus(status: ConnectionStatus): void {
    this.statusListeners.forEach((fn) => fn(status));
  }
}
