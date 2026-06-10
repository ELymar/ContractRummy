import Phaser from 'phaser';
import { allCardKeys } from '../render/cardArt';
import { COLORS, FONT } from '../render/theme';

/** Preloads all card art and the UI font, then hands off to the table. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    for (const key of allCardKeys()) {
      this.load.image(key, `/cards/${key}.png`);
    }

    const { width, height } = this.scale;
    const label = this.add
      .text(width / 2, height / 2, 'Loading…', {
        fontFamily: FONT, color: COLORS.cream, fontSize: '24px',
      })
      .setOrigin(0.5);
    this.load.on('complete', () => label.destroy());
  }

  create(): void {
    const start = (): void => {
      this.scene.start((this.registry.get('startScene') as string) || 'Menu');
    };
    // Wait for the bundled Nunito font so Phaser doesn't rasterize fallbacks.
    if (typeof document !== 'undefined' && document.fonts?.load) {
      Promise.all([
        document.fonts.load('400 16px Nunito'),
        document.fonts.load('700 16px Nunito'),
      ]).then(start, start);
    } else {
      start();
    }
  }
}
