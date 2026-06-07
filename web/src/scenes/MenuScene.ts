import Phaser from 'phaser';
import { SinglePlayerSession } from '../net/SinglePlayerSession';

const FELT = 0x14532d;

/** Start screen. For now: a single button that begins an offline game vs the AI. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(FELT);

    this.add.text(width / 2, height / 2 - 150, 'Contract Rummy', {
      fontSize: '56px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 - 95, 'Family Edition', {
      fontSize: '20px', color: '#a7f3d0',
    }).setOrigin(0.5);

    this.menuButton(height / 2 + 20, 'New Single-Player Game', 'Play a full game against the AI', () => {
      this.registry.set('session', new SinglePlayerSession(1));
      this.scene.start('Table');
    });

    this.add.text(width / 2, height - 40, 'Offline · runs entirely in your browser', {
      fontSize: '14px', color: '#86efac',
    }).setOrigin(0.5).setAlpha(0.7);
  }

  private menuButton(y: number, label: string, sub: string, onClick: () => void): void {
    const { width } = this.scale;
    const bg = this.add.rectangle(width / 2, y, 360, 64, 0x166534)
      .setStrokeStyle(2, 0x86efac)
      .setInteractive({ useHandCursor: true });
    this.add.text(width / 2, y - 8, label, { fontSize: '22px', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(width / 2, y + 18, sub, { fontSize: '13px', color: '#bbf7d0' }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x15803d));
    bg.on('pointerout', () => bg.setFillStyle(0x166534));
    bg.on('pointerup', onClick);
  }
}
