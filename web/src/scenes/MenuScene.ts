import Phaser from 'phaser';
import { GameClient } from '../net/GameClient';
import { SinglePlayerSession } from '../net/SinglePlayerSession';
import {
  COLORS, FONT, addCardShadow, addTableBackground, makePillButton,
} from '../render/theme';

/** Multiplayer server URL: ?ws=… beats VITE_WS_URL beats same-host default. */
function wsUrl(): string {
  const param = new URLSearchParams(location.search).get('ws');
  if (param) return param;
  const env = import.meta.env.VITE_WS_URL as string | undefined;
  if (env) return env;
  return `ws://${location.hostname}:8080`;
}

/** Start screen. For now: a single button that begins an offline game vs the AI. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    const { width, height } = this.scale;
    addTableBackground(this);

    this.decorativeFan(width / 2, height / 2 - 218);

    this.add.text(width / 2, height / 2 - 90, 'Contract Rummy', {
      fontFamily: FONT, fontSize: '60px', color: COLORS.goldBright, fontStyle: 'bold',
    }).setOrigin(0.5).setShadow(0, 4, 'rgba(0,0,0,0.45)', 6);
    this.add.text(width / 2, height / 2 - 38, 'F A M I L Y   E D I T I O N', {
      fontFamily: FONT, fontSize: '17px', color: COLORS.creamFaint,
    }).setOrigin(0.5);

    const btn = makePillButton(this, width / 2, height / 2 + 52, 360, 60,
      'New Single-Player Game', 21, () => {
        this.registry.set('session', new SinglePlayerSession(1));
        this.scene.start('Table');
      });
    btn.setState('primary');
    this.add.text(width / 2, height / 2 + 96, 'Play a full game against the AI', {
      fontFamily: FONT, fontSize: '14px', color: COLORS.creamFaint,
    }).setOrigin(0.5);

    makePillButton(this, width / 2, height / 2 + 152, 360, 52,
      'Multiplayer (local server)', 18, () => {
        this.registry.set('session', new GameClient(wsUrl()));
        this.scene.start('Table');
      });
    this.add.text(width / 2, height / 2 + 192, `Connects to ${wsUrl()}`, {
      fontFamily: FONT, fontSize: '12px', color: COLORS.creamFaint,
    }).setOrigin(0.5).setAlpha(0.7);

    this.add.text(width / 2, height - 46, 'Offline · runs entirely in your browser', {
      fontFamily: FONT, fontSize: '13px', color: COLORS.creamFaint,
    }).setOrigin(0.5).setAlpha(0.7);
  }

  /** A small arc of face-up cards above the title, like an app-store banner. */
  private decorativeFan(cx: number, cy: number): void {
    const keys = ['A_spades', 'K_hearts', 'Q_diamonds', 'J_clubs'];
    const cardW = 96;
    const cardH = 134;
    keys.forEach((key, i) => {
      const t = i - (keys.length - 1) / 2; // -1.5 .. 1.5
      const x = cx + t * 64;
      const y = cy + Math.abs(t) * 14;
      const angle = t * 11;
      addCardShadow(this, x, y, cardW, cardH, 0.35).setAngle(angle);
      this.add.image(x, y, key).setDisplaySize(cardW, cardH).setAngle(angle);
    });
  }
}
