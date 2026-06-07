import Phaser from 'phaser';
import type { Session } from '../net/Session';
import { ActionType } from '../net/protocol';
import type { CardDTO, GameView } from '../net/protocol';
import { CARD_BACK_KEY, cardKey } from '../render/cardArt';
import { findContract } from '../rules/meld';

const W = 1280;
const CARD_W = 96;
const CARD_H = 134;
const FELT = 0x14532d;
const MELD_CARD_SCALE = 0.62;

const SUIT_ORDER = ['Hearts', 'Spades', 'Clubs', 'Diamonds', 'Joker'];
const VALUE_ORDER = [
  'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
  'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King',
];

const LAYOUT = {
  status: { x: 20, y: 14 },
  contract: { x: 20, y: 40 },
  opponents: { nameY: 70, cardsY: 122, scale: 0.5, xs: [430, 850] },
  stock: { x: 560, y: 250 },
  discard: { x: 700, y: 250 },
  pileLabelY: 330,
  rail: { y: 430, left: 40, right: 1110 },
  hand: { y: 636, selectedLift: 28 },
  buttons: { x: 1170, w: 150, h: 38, ys: [160, 212, 264, 316] },
} as const;

type DropTarget = { kind: 'discard' } | { kind: 'meld'; meldIndex: number };

interface ButtonRef {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  enabled: (v: GameView) => boolean;
  onClick: () => void;
}

/**
 * Renders a GameView and turns gestures into Commands. Holds no game rules —
 * the server validates everything; the client-side meld check only drives the
 * Lay Down button's enabled state. Works against LocalSession and GameClient.
 */
export class TableScene extends Phaser.Scene {
  private session!: Session;
  private dynamic!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;
  private contractText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;

  private selected = new Set<string>(); // hand card uuids chosen for lay-down
  private buttons: ButtonRef[] = [];
  private meldZones: Phaser.GameObjects.Zone[] = [];
  private pendingDrop: { target: DropTarget; card: CardDTO } | null = null;

  constructor() {
    super('Table');
  }

  create(): void {
    this.session = this.registry.get('session') as Session;
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__session = this.session;
    this.cameras.main.setBackgroundColor(FELT);
    this.input.dragDistanceThreshold = 8; // so a small click selects instead of dragging

    this.dynamic = this.add.container(0, 0).setDepth(10);
    this.buildStaticFurniture();

    this.statusText = this.add.text(LAYOUT.status.x, LAYOUT.status.y, '', {
      color: '#dcfce7', fontSize: '18px',
    }).setDepth(50);
    this.contractText = this.add.text(LAYOUT.contract.x, LAYOUT.contract.y, '', {
      color: '#fde68a', fontSize: '15px',
    }).setDepth(50);
    this.toastText = this.add.text(640, 180, '', {
      color: '#fecaca', fontSize: '20px', backgroundColor: '#7f1d1d', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(60).setAlpha(0);

    this.setupDragHandlers();

    this.session.onView((view) => this.render(view));
    this.session.onError?.((msg) => this.toast(msg));
    this.session.connect();
    if (this.session.view) this.render(this.session.view);
  }

  // ---- static furniture ----------------------------------------------------

  private buildStaticFurniture(): void {
    const g = this.add.graphics().setDepth(1);
    this.outlineSlot(g, LAYOUT.stock.x, LAYOUT.stock.y);
    this.outlineSlot(g, LAYOUT.discard.x, LAYOUT.discard.y);
    this.slotCaption(LAYOUT.stock.x, LAYOUT.pileLabelY, 'STOCK');
    this.slotCaption(LAYOUT.discard.x, LAYOUT.pileLabelY, 'DISCARD');

    // Discard drop zone (static).
    const dz = this.add
      .zone(LAYOUT.discard.x, LAYOUT.discard.y, CARD_W + 24, CARD_H + 24)
      .setRectangleDropZone(CARD_W + 24, CARD_H + 24);
    dz.setData('target', { kind: 'discard' } as DropTarget);

    const [a, b, c, d] = LAYOUT.buttons.ys;
    this.makeButton(a, 'Draw',
      (v) => v.validActions.includes(ActionType.DRAW),
      () => this.session.send({ type: ActionType.DRAW }));
    this.makeButton(b, 'Sort', () => true, () => this.toggleSort());
    this.makeButton(c, 'Lay Down',
      (v) => this.canLayDown(v),
      () => this.layDown());
    this.makeButton(d, 'End Turn',
      (v) => v.validActions.includes(ActionType.END_TURN),
      () => this.session.send({ type: ActionType.END_TURN }));
  }

  private outlineSlot(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.lineStyle(2, 0xffffff, 0.18);
    g.strokeRoundedRect(x - CARD_W / 2, y - CARD_H / 2, CARD_W, CARD_H, 8);
  }

  private slotCaption(x: number, y: number, label: string): void {
    this.add.text(x, y, label, { color: '#ffffff', fontSize: '12px', fontStyle: 'bold' })
      .setOrigin(0.5).setAlpha(0.5).setDepth(2);
  }

  private makeButton(y: number, label: string, enabled: ButtonRef['enabled'], onClick: () => void): void {
    const { x, w, h } = LAYOUT.buttons;
    const bg = this.add.rectangle(x, y, w, h, 0x166534).setStrokeStyle(2, 0x86efac)
      .setInteractive({ useHandCursor: true }).setDepth(40);
    const text = this.add.text(x, y, label, { color: '#ffffff', fontSize: '15px' })
      .setOrigin(0.5).setDepth(41);
    const ref: ButtonRef = { bg, label: text, enabled, onClick };
    bg.on('pointerup', () => {
      const v = this.session.view;
      if (v && ref.enabled(v)) ref.onClick();
    });
    this.buttons.push(ref);
  }

  private refreshButtons(view: GameView): void {
    for (const b of this.buttons) {
      const on = b.enabled(view);
      b.bg.setFillStyle(on ? 0x166534 : 0x0f3322);
      b.bg.setStrokeStyle(2, on ? 0x86efac : 0x3f6b50);
      b.label.setAlpha(on ? 1 : 0.4);
    }
  }

  private toggleSort(): void {
    this.sortHand = !this.sortHand;
    if (this.session.view) this.render(this.session.view);
  }
  private sortHand = false;

  // ---- per-view rendering --------------------------------------------------

  private render(view: GameView): void {
    this.dynamic.removeAll(true);
    this.meldZones.forEach((z) => z.destroy());
    this.meldZones = [];
    // Drop stale selections (cards no longer in hand).
    const handUuids = new Set(view.yourHand.map((c) => c.uuid));
    this.selected.forEach((u) => { if (!handUuids.has(u)) this.selected.delete(u); });

    this.renderOpponents(view);
    this.renderStock(view);
    this.renderDiscard(view);
    this.renderMeldsRail(view);
    this.renderHand(view);

    const turn = view.isYourTurn ? 'Your turn' : 'Waiting…';
    this.statusText.setText(`Round ${view.round}    Stock ${view.deckCount}    ${turn}`);
    const down = view.youAreDown ? "   ✓ you're down" : '';
    this.contractText.setText(view.contract ? `Contract: ${view.contract.description}${down}` : '');
    this.refreshButtons(view);
  }

  private renderOpponents(view: GameView): void {
    const meId = view.you?.id ?? this.session.playerId;
    const opponents = view.players.filter((p) => p.id !== meId);
    opponents.forEach((p, i) => {
      const cx = LAYOUT.opponents.xs[i] ?? 430 + i * 420;
      this.dynamic.add(this.add.text(cx, LAYOUT.opponents.nameY,
        `${p.name}  ·  ${p.handCount}${p.isDown ? '  (down)' : ''}`,
        { color: '#ffffff', fontSize: '16px' }).setOrigin(0.5));
      const fan = Math.min(p.handCount, 11);
      const step = 20;
      for (let c = 0; c < fan; c++) {
        const img = this.add.image(cx - ((fan - 1) * step) / 2 + c * step, LAYOUT.opponents.cardsY, CARD_BACK_KEY);
        img.setDisplaySize(CARD_W * LAYOUT.opponents.scale, CARD_H * LAYOUT.opponents.scale);
        this.dynamic.add(img);
      }
    });
  }

  private renderStock(view: GameView): void {
    if (view.deckCount <= 0) return;
    const img = this.add.image(LAYOUT.stock.x, LAYOUT.stock.y, CARD_BACK_KEY);
    img.setDisplaySize(CARD_W, CARD_H).setInteractive({ useHandCursor: true });
    img.on('pointerup', () => this.session.send({ type: ActionType.DRAW }));
    this.dynamic.add(img);
  }

  private renderDiscard(view: GameView): void {
    if (!view.burnTop) return;
    const img = this.add.image(LAYOUT.discard.x, LAYOUT.discard.y, cardKey(view.burnTop));
    img.setDisplaySize(CARD_W, CARD_H).setInteractive({ useHandCursor: true });
    img.on('pointerup', () => this.session.send({ type: ActionType.TAKE_FROM_DISCARD }));
    this.dynamic.add(img);
  }

  /** Render every meld on the table (all owners) as a labeled, drop-targetable group. */
  private renderMeldsRail(view: GameView): void {
    const melds = view.downPiles;
    if (melds.length === 0) {
      this.dynamic.add(this.add.text(LAYOUT.rail.left, LAYOUT.rail.y, 'No melds on the table yet',
        { color: '#ffffff', fontSize: '13px' }).setOrigin(0, 0.5).setAlpha(0.4));
      return;
    }

    const cw = CARD_W * MELD_CARD_SCALE;
    const step = cw * 0.55;
    const gap = 30;
    const widths = melds.map((m) => (Math.max(m.cards.length, 1) - 1) * step + cw);
    let total = widths.reduce((s, w) => s + w, 0) + gap * (melds.length - 1);

    const available = LAYOUT.rail.right - LAYOUT.rail.left;
    const scale = total > available ? available / total : 1;
    const sCw = cw * scale, sStep = step * scale, sGap = gap * scale;
    total *= scale;

    const meName = view.you?.name;
    let x = (LAYOUT.rail.left + LAYOUT.rail.right) / 2 - total / 2;

    melds.forEach((pile, meldIndex) => {
      const gw = (Math.max(pile.cards.length, 1) - 1) * sStep + sCw;
      const cx = x + gw / 2;

      const ownerLabel = pile.owner === meName ? 'You' : pile.owner;
      this.dynamic.add(this.add.text(cx, LAYOUT.rail.y - CARD_H * MELD_CARD_SCALE * scale / 2 - 12,
        ownerLabel, { color: '#a7f3d0', fontSize: '12px' }).setOrigin(0.5));

      pile.cards.forEach((card, c) => {
        const img = this.add.image(x + sCw / 2 + c * sStep, LAYOUT.rail.y, cardKey(card));
        img.setDisplaySize(sCw, CARD_H * MELD_CARD_SCALE * scale);
        this.dynamic.add(img);
      });

      // Drop zone over the whole group for lay-off (ADD_TO_MELD).
      const zone = this.add.zone(cx, LAYOUT.rail.y, gw + 12, CARD_H * MELD_CARD_SCALE * scale + 16)
        .setRectangleDropZone(gw + 12, CARD_H * MELD_CARD_SCALE * scale + 16);
      zone.setData('target', { kind: 'meld', meldIndex } as DropTarget);
      this.meldZones.push(zone);

      x += gw + sGap;
    });
  }

  private renderHand(view: GameView): void {
    const hand = this.sortHand ? this.sortedHand(view.yourHand) : view.yourHand;
    const n = hand.length;
    const spacing = Math.min(CARD_W + 12, (W - 60) / Math.max(n, 1));
    const startX = W / 2 - ((n - 1) * spacing) / 2;

    hand.forEach((card, i) => {
      const isSel = this.selected.has(card.uuid);
      const x = startX + i * spacing;
      const y = LAYOUT.hand.y - (isSel ? LAYOUT.hand.selectedLift : 0);
      const img = this.add.image(x, y, cardKey(card));
      img.setDisplaySize(CARD_W, CARD_H);
      if (isSel) img.setTint(0xffe066);
      img.setInteractive({ useHandCursor: true, draggable: true });
      img.setData('card', card);
      img.setData('home', { x, y });
      this.input.setDraggable(img);
      img.on('pointerup', (p: Phaser.Input.Pointer) => {
        if (p.getDistance() < 8) this.toggleSelect(card); // a click, not a drag
      });
      this.dynamic.add(img);
    });
  }

  private sortedHand(cards: CardDTO[]): CardDTO[] {
    return [...cards].sort((a, b) =>
      SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit) ||
      VALUE_ORDER.indexOf(a.value) - VALUE_ORDER.indexOf(b.value));
  }

  // ---- lay down ------------------------------------------------------------

  private toggleSelect(card: CardDTO): void {
    if (this.selected.has(card.uuid)) this.selected.delete(card.uuid);
    else this.selected.add(card.uuid);
    if (this.session.view) this.render(this.session.view);
  }

  private layDownSource(view: GameView): CardDTO[] {
    return this.selected.size > 0
      ? view.yourHand.filter((c) => this.selected.has(c.uuid))
      : view.yourHand;
  }

  private canLayDown(view: GameView): boolean {
    if (!view.isYourTurn || view.youAreDown || !view.contract) return false;
    if (!view.validActions.includes(ActionType.LAY_DOWN)) return false;
    return findContract(this.layDownSource(view), view.contract) != null;
  }

  private layDown(): void {
    const view = this.session.view;
    if (!view || !view.contract) return;
    const result = findContract(this.layDownSource(view), view.contract);
    if (!result) {
      this.toast('Selected cards do not form the contract');
      return;
    }
    this.session.send({ type: ActionType.LAY_DOWN, payload: { melds: result.melds } });
    this.selected.clear();
  }

  // ---- drag/drop -----------------------------------------------------------

  private setupDragHandlers(): void {
    this.input.on('dragstart', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      this.dynamic.bringToTop(obj);
      obj.setData('base', obj.scaleX);
      obj.setScale(obj.scaleX * 1.06);
    });
    this.input.on('drag', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image, dx: number, dy: number) => {
      obj.setPosition(dx, dy);
    });
    this.input.on('drop', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image, zone: Phaser.GameObjects.Zone) => {
      const target = zone.getData('target') as DropTarget | undefined;
      const card = obj.getData('card') as CardDTO | undefined;
      if (target && card) this.pendingDrop = { target, card };
    });
    this.input.on('dragend', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      const drop = this.pendingDrop;
      this.pendingDrop = null;
      if (drop) {
        if (drop.target.kind === 'discard') {
          this.session.send({ type: ActionType.DISCARD, payload: { cardUuid: drop.card.uuid } });
        } else {
          this.session.send({
            type: ActionType.ADD_TO_MELD,
            payload: { cardUuid: drop.card.uuid, meldIndex: drop.target.meldIndex },
          });
        }
        return; // re-render replaces obj
      }
      const home = obj.getData('home') as { x: number; y: number } | undefined;
      const base = (obj.getData('base') as number) ?? obj.scaleX;
      this.tweens.add({
        targets: obj, x: home?.x ?? obj.x, y: home?.y ?? obj.y,
        scaleX: base, scaleY: base, duration: 150, ease: 'Quad.out',
      });
    });
  }

  // ---- toast ---------------------------------------------------------------

  private toast(message: string): void {
    this.toastText.setText(message).setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 2200, duration: 600 });
  }
}
