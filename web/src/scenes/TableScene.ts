import Phaser from 'phaser';
import type { Session } from '../net/Session';
import { ActionType } from '../net/protocol';
import type { CardDTO, GameView } from '../net/protocol';
import { CARD_BACK_KEY, cardKey } from '../render/cardArt';

const W = 1280;
const CARD_W = 96;
const CARD_H = 134;
const FELT = 0x14532d;

// Spacing between cards laid in a meld. During a drag-to-insert the meld opens a
// one-slot gap of this width to show where the card will land.
const MELD_STEP = 40;
const MELD_CARD_SCALE = 0.82;

// One place that owns the screen layout. The table reads down in clean bands:
//   status → opponents → stock/discard → melds → hand,  with the action
// buttons parked in a column on the right so they never collide with play.
const LAYOUT = {
  status: { x: 20, y: 18 },
  opponents: { nameY: 58, cardsY: 118, scale: 0.5, xs: [430, 850] },
  stock: { x: 580, y: 250 },
  discard: { x: 700, y: 250 },
  pileLabelY: 330,
  melds: { y: 470, w: 340, h: 156, centers: [430, 850] },
  hand: { y: 636 },
  buttons: { x: 1170, w: 150, h: 40, ys: [180, 240, 300] },
} as const;

interface DropTarget {
  kind: 'discard' | 'meld';
  index?: number;
}

/**
 * Renders a GameView and turns drag/drop gestures into Commands. It holds no
 * game rules — it draws whatever view the Session hands it and emits intents
 * back. Works identically against LocalSession (mock) and GameClient (server).
 */
export class TableScene extends Phaser.Scene {
  private session!: Session;
  private dynamic!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;

  // Set on 'drop', consumed on 'dragend' so we never mutate/destroy the dragged
  // sprite mid-handler (drop fires before dragend).
  private pendingDrop: { target: DropTarget; card: CardDTO; insertIndex: number } | null = null;

  // Live references to the card sprites in each meld, so a drag can animate them
  // apart to preview an insertion point. Rebuilt on every render().
  private meldSprites: Phaser.GameObjects.Image[][] = [];
  // The meld currently showing an opened gap (so we can restore it on leave).
  private hover: { pileIndex: number; gapIndex: number } | null = null;
  // The card currently being dragged, plus how it's scaled, so we can shrink it
  // to meld size while hovering a meld and lift it again on the way out.
  private draggingObj: Phaser.GameObjects.Image | null = null;
  private dragScaleState: 'lift' | 'meld' = 'lift';

  constructor() {
    super('Table');
  }

  create(): void {
    this.session = this.registry.get('session') as Session;
    this.cameras.main.setBackgroundColor(FELT);

    this.buildStaticFurniture();
    this.dynamic = this.add.container(0, 0).setDepth(10);

    this.statusText = this.add
      .text(LAYOUT.status.x, LAYOUT.status.y, '', { color: '#dcfce7', fontSize: '18px' })
      .setDepth(50);

    this.setupDragHandlers();

    this.session.onView((view) => this.render(view));
    this.session.connect();
    if (this.session.view) this.render(this.session.view);
  }

  // ---- static furniture: pile outlines, meld zones, buttons (created once) --

  private buildStaticFurniture(): void {
    const g = this.add.graphics().setDepth(1);

    // Stock + discard slot outlines (so empty piles still read as slots).
    this.outlineSlot(g, LAYOUT.stock.x, LAYOUT.stock.y, CARD_W, CARD_H);
    this.outlineSlot(g, LAYOUT.discard.x, LAYOUT.discard.y, CARD_W, CARD_H);
    this.slotCaption(LAYOUT.stock.x, LAYOUT.pileLabelY, 'STOCK');
    this.slotCaption(LAYOUT.discard.x, LAYOUT.pileLabelY, 'DISCARD');

    // Meld drop zones: filled, rounded, captioned, with a real Phaser drop zone.
    LAYOUT.melds.centers.forEach((cx, i) => {
      const { y, w, h } = LAYOUT.melds;
      g.fillStyle(0xffffff, 0.05);
      g.fillRoundedRect(cx - w / 2, y - h / 2, w, h, 12);
      g.lineStyle(2, 0xffffff, 0.22);
      g.strokeRoundedRect(cx - w / 2, y - h / 2, w, h, 12);
      this.add
        .text(cx - w / 2 + 12, y - h / 2 + 10, `MELD ${i + 1}`, {
          color: '#ffffff', fontSize: '12px', fontStyle: 'bold',
        })
        .setAlpha(0.45)
        .setDepth(2);

      const zone = this.add.zone(cx, y, w, h).setRectangleDropZone(w, h);
      zone.setData('target', { kind: 'meld', index: i } as DropTarget);
    });

    // Discard is also a drop target (to discard a card).
    const dz = this.add
      .zone(LAYOUT.discard.x, LAYOUT.discard.y, CARD_W + 24, CARD_H + 24)
      .setRectangleDropZone(CARD_W + 24, CARD_H + 24);
    dz.setData('target', { kind: 'discard' } as DropTarget);

    // Action buttons, parked in a right-hand column clear of all play areas.
    this.makeButton(LAYOUT.buttons.ys[0], 'Draw', () => this.session.send({ type: ActionType.DRAW }));
    this.makeButton(LAYOUT.buttons.ys[1], 'Sort', () => this.session.send({ type: ActionType.SORT }));
    this.makeButton(LAYOUT.buttons.ys[2], 'End Turn', () =>
      this.session.send({ type: ActionType.END_TURN }),
    );
  }

  private outlineSlot(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
    g.lineStyle(2, 0xffffff, 0.18);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
  }

  private slotCaption(x: number, y: number, label: string): void {
    this.add
      .text(x, y, label, { color: '#ffffff', fontSize: '12px', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setAlpha(0.5)
      .setDepth(2);
  }

  private makeButton(y: number, label: string, onClick: () => void): void {
    const { x, w, h } = LAYOUT.buttons;
    const bg = this.add
      .rectangle(x, y, w, h, 0x166534)
      .setStrokeStyle(2, 0x86efac)
      .setInteractive({ useHandCursor: true })
      .setDepth(40);
    this.add.text(x, y, label, { color: '#ffffff', fontSize: '16px' }).setOrigin(0.5).setDepth(41);
    bg.on('pointerover', () => bg.setFillStyle(0x15803d));
    bg.on('pointerout', () => bg.setFillStyle(0x166534));
    bg.on('pointerup', onClick);
  }

  // ---- per-view rendering --------------------------------------------------

  private render(view: GameView): void {
    this.dynamic.removeAll(true);
    this.hover = null;
    this.meldSprites = [];

    this.renderOpponents(view);
    this.renderStock(view);
    this.renderDiscard(view);
    this.renderMelds(view);
    this.renderHand(view);

    const turn = view.isYourTurn ? 'Your turn' : 'Waiting…';
    this.statusText.setText(`Round ${view.round}    Stock ${view.deckCount}    ${turn}`);
  }

  private add2dynamic(obj: Phaser.GameObjects.GameObject): void {
    this.dynamic.add(obj);
  }

  private renderOpponents(view: GameView): void {
    const opponents = view.players.filter((p) => p.id !== this.session.playerId);
    opponents.forEach((p, i) => {
      const cx = LAYOUT.opponents.xs[i] ?? 430 + i * 420;
      this.add2dynamic(
        this.add
          .text(cx, LAYOUT.opponents.nameY, `${p.name}  ·  ${p.handCount}`, {
            color: '#ffffff', fontSize: '17px',
          })
          .setOrigin(0.5),
      );

      const fan = Math.min(p.handCount, 11);
      const step = 20;
      const w0 = (fan - 1) * step;
      for (let c = 0; c < fan; c++) {
        const img = this.add.image(cx - w0 / 2 + c * step, LAYOUT.opponents.cardsY, CARD_BACK_KEY);
        img.setDisplaySize(CARD_W * LAYOUT.opponents.scale, CARD_H * LAYOUT.opponents.scale);
        this.add2dynamic(img);
      }
    });
  }

  private renderStock(view: GameView): void {
    if (view.deckCount > 0) {
      const img = this.add.image(LAYOUT.stock.x, LAYOUT.stock.y, CARD_BACK_KEY);
      img.setDisplaySize(CARD_W, CARD_H);
      img.setInteractive({ useHandCursor: true });
      img.on('pointerup', () => this.session.send({ type: ActionType.DRAW }));
      this.add2dynamic(img);
    }
  }

  private renderDiscard(view: GameView): void {
    if (!view.burnTop) return;
    const img = this.add.image(LAYOUT.discard.x, LAYOUT.discard.y, cardKey(view.burnTop));
    img.setDisplaySize(CARD_W, CARD_H);
    img.setInteractive({ useHandCursor: true });
    img.on('pointerup', () => this.session.send({ type: ActionType.TAKE_FROM_DISCARD }));
    this.add2dynamic(img);
  }

  private renderMelds(view: GameView): void {
    view.downPiles.slice(0, LAYOUT.melds.centers.length).forEach((pile, i) => {
      this.meldSprites[i] = [];
      pile.cards.forEach((card) => {
        const img = this.add.image(0, LAYOUT.melds.y, cardKey(card));
        img.setDisplaySize(CARD_W * MELD_CARD_SCALE, CARD_H * MELD_CARD_SCALE);
        this.add2dynamic(img);
        this.meldSprites[i].push(img);
      });
      this.layoutMeld(i, null, false); // place at resting positions (no tween)
    });
  }

  /**
   * Position a meld's cards. With gapIndex null they sit at their resting
   * layout; with a gapIndex set, the cards spread into (n+1) slots leaving that
   * slot empty — the live preview of where a dragged card will be inserted.
   */
  private layoutMeld(pileIndex: number, gapIndex: number | null, animate = true): void {
    const sprites = this.meldSprites[pileIndex] ?? [];
    const cx = LAYOUT.melds.centers[pileIndex];
    const slots = gapIndex == null ? sprites.length : sprites.length + 1;
    const startX = cx - ((slots - 1) * MELD_STEP) / 2;

    sprites.forEach((img, j) => {
      const slot = gapIndex == null || j < gapIndex ? j : j + 1;
      const x = startX + slot * MELD_STEP;
      if (animate) {
        this.tweens.add({ targets: img, x, duration: 120, ease: 'Quad.out' });
      } else {
        img.x = x;
      }
    });
  }

  /** Which meld zone (if any) contains a game-space point. */
  private meldZoneAt(x: number, y: number): number | null {
    const { w, h, y: cy, centers } = LAYOUT.melds;
    for (let i = 0; i < centers.length; i++) {
      if (Math.abs(x - centers[i]) <= w / 2 && Math.abs(y - cy) <= h / 2) return i;
    }
    return null;
  }

  /** Insertion index within a meld for a given x (0..n). */
  private gapIndexFor(pileIndex: number, x: number): number {
    const n = this.meldSprites[pileIndex]?.length ?? 0;
    const cx = LAYOUT.melds.centers[pileIndex];
    const startX = cx - (n * MELD_STEP) / 2; // (n+1) slots
    return Phaser.Math.Clamp(Math.round((x - startX) / MELD_STEP), 0, n);
  }

  /** Update the meld gap preview as a card is dragged around. */
  private updateMeldPreview(x: number, y: number): void {
    const pileIndex = this.meldZoneAt(x, y);

    // Shrink the dragged card to meld size over a meld, lift it again outside —
    // so the previewed gap matches the card that will fill it.
    const desired = pileIndex == null ? 'lift' : 'meld';
    if (this.draggingObj && desired !== this.dragScaleState) {
      const base = this.draggingObj.getData('base') as number;
      const target = base * (desired === 'meld' ? MELD_CARD_SCALE : 1.08);
      this.tweens.add({
        targets: this.draggingObj,
        scaleX: target,
        scaleY: target,
        duration: 120,
        ease: 'Quad.out',
      });
      this.dragScaleState = desired;
    }

    if (pileIndex == null) {
      if (this.hover) {
        this.layoutMeld(this.hover.pileIndex, null);
        this.hover = null;
      }
      return;
    }

    const gapIndex = this.gapIndexFor(pileIndex, x);
    if (this.hover && this.hover.pileIndex === pileIndex && this.hover.gapIndex === gapIndex) {
      return; // nothing changed
    }
    if (this.hover && this.hover.pileIndex !== pileIndex) {
      this.layoutMeld(this.hover.pileIndex, null); // left the previous meld
    }
    this.hover = { pileIndex, gapIndex };
    this.layoutMeld(pileIndex, gapIndex);
  }

  private renderHand(view: GameView): void {
    const n = view.yourHand.length;
    // Centered on the table; the button column sits in a higher band so the
    // hand is free to use the full width. Cards overlap as the hand grows.
    const maxWidth = W - 60;
    const spacing = Math.min(CARD_W + 12, maxWidth / Math.max(n, 1));
    const totalW = (n - 1) * spacing;
    const startX = W / 2 - totalW / 2;

    view.yourHand.forEach((card, i) => {
      const x = startX + i * spacing;
      const img = this.add.image(x, LAYOUT.hand.y, cardKey(card));
      img.setDisplaySize(CARD_W, CARD_H);
      img.setInteractive({ useHandCursor: true, draggable: true });
      img.setData('card', card);
      img.setData('home', { x, y: LAYOUT.hand.y });
      this.input.setDraggable(img);
      this.add2dynamic(img);
    });
  }

  // ---- drag/drop -----------------------------------------------------------

  private setupDragHandlers(): void {
    this.input.on('dragstart', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      this.dynamic.bringToTop(obj);
      this.draggingObj = obj;
      this.dragScaleState = 'lift';
      const base = obj.scaleX; // resting hand-card scale (from setDisplaySize)
      obj.setData('base', base);
      obj.setScale(base * 1.08);
    });

    this.input.on(
      'drag',
      (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image, dx: number, dy: number) => {
        obj.setPosition(dx, dy);
        this.updateMeldPreview(dx, dy); // open/close the insertion gap live
      },
    );

    this.input.on(
      'drop',
      (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image, zone: Phaser.GameObjects.Zone) => {
        const target = zone.getData('target') as DropTarget | undefined;
        const card = obj.getData('card') as CardDTO | undefined;
        if (!target || !card) return;
        const insertIndex =
          target.kind === 'meld' ? this.gapIndexFor(target.index ?? 0, obj.x) : 0;
        this.pendingDrop = { target, card, insertIndex };
      },
    );

    this.input.on('dragend', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      const drop = this.pendingDrop;
      this.pendingDrop = null;

      this.draggingObj = null;

      if (drop) {
        if (drop.target.kind === 'discard') {
          this.session.send({ type: ActionType.DISCARD, card: drop.card });
        } else {
          this.session.send({
            type: ActionType.ADD_TO_MELD,
            card: drop.card,
            pileIndex: drop.target.index ?? 0,
            insertIndex: drop.insertIndex,
          });
        }
        // send() triggers a view update -> full re-render, so `obj` is replaced.
        return;
      }

      // No valid drop: close any open meld gap, then snap the card back.
      if (this.hover) {
        this.layoutMeld(this.hover.pileIndex, null);
        this.hover = null;
      }
      const home = obj.getData('home') as { x: number; y: number } | undefined;
      const base = (obj.getData('base') as number) ?? obj.scaleX;
      this.tweens.add({
        targets: obj,
        x: home?.x ?? obj.x,
        y: home?.y ?? obj.y,
        scaleX: base,
        scaleY: base,
        duration: 150,
        ease: 'Quad.out',
      });
    });
  }
}
