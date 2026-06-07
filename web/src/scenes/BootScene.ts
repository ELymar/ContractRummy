import Phaser from 'phaser';
import { allCardKeys } from '../render/cardArt';

/** Preloads all card art, then hands off to the table. */
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
      .text(width / 2, height / 2, 'Loading…', { color: '#ffffff', fontSize: '24px' })
      .setOrigin(0.5);
    this.load.on('complete', () => label.destroy());
  }

  create(): void {
    this.scene.start((this.registry.get('startScene') as string) || 'Menu');
  }
}
