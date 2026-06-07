import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TableScene } from './scenes/TableScene';
import { LocalSession } from './net/LocalSession';
import { GameClient } from './net/GameClient';
import type { Session } from './net/Session';

// The renderer is server-shaped but server-agnostic. Point it at the authoritative
// engine with a `?ws=ws://host:port` query param or the VITE_WS_URL env var;
// with neither, an in-browser mock with no rules lets us build/tune UI offline.
//   mock:   http://localhost:5173/
//   server: http://localhost:5173/?ws=ws://localhost:8080
const wsUrl =
  new URLSearchParams(location.search).get('ws') ??
  (import.meta.env.VITE_WS_URL as string | undefined);
const session: Session = wsUrl ? new GameClient(wsUrl) : new LocalSession();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#14532d',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  scene: [BootScene, TableScene],
});

game.registry.set('session', session);

// Dev-only hooks so automated tests can inspect state and map game<->page coords.
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__game = game;
  (window as unknown as Record<string, unknown>).__session = session;
}
