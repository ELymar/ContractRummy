import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TableScene } from './scenes/TableScene';
import { LocalSession } from './net/LocalSession';
import { GameClient } from './net/GameClient';
import type { Session } from './net/Session';

// The renderer is server-shaped but server-agnostic. With VITE_WS_URL set it
// talks to the authoritative engine; without it, an in-browser mock with no
// rules lets us build and tune rendering + drag/drop offline.
const wsUrl = import.meta.env.VITE_WS_URL as string | undefined;
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
