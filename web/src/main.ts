import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { TableScene } from './scenes/TableScene';
import { LocalSession } from './net/LocalSession';
import { GameClient } from './net/GameClient';
import type { Session } from './net/Session';

// Routing:
//   default                              -> Menu (offline single-player)
//   ?ws=ws://host:port (or VITE_WS_URL)  -> multiplayer via GameClient
//   ?mock                                -> rules-free LocalSession (UI dev)
const params = new URLSearchParams(location.search);
const wsUrl = params.get('ws') ?? (import.meta.env.VITE_WS_URL as string | undefined);

let session: Session | null = null;
let startScene = 'Menu';
if (wsUrl) {
  session = new GameClient(wsUrl);
  startScene = 'Table';
} else if (params.has('mock')) {
  session = new LocalSession();
  startScene = 'Table';
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1d1007',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  scene: [BootScene, MenuScene, TableScene],
});

if (session) game.registry.set('session', session);
game.registry.set('startScene', startScene);

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__game = game;
}
