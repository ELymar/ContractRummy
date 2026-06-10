import Phaser from 'phaser';
import type { Session } from '../net/Session';
import { ActionType } from '../net/protocol';
import type { CardDTO, GameView, RoundSummary } from '../net/protocol';
import { SinglePlayerSession } from '../net/SinglePlayerSession';
import { CARD_BACK_KEY, cardKey } from '../render/cardArt';
import {
  COLORS, FONT, addCardGlow, addCardShadow, addTableBackground,
  buttonTexture, drawPanel, makePillButton,
} from '../render/theme';
import type { PillButton } from '../render/theme';
import { findContract } from '../rules/meld';

const W = 1280;
const CARD_W = 96;
const CARD_H = 134;
const MELD_CARD_SCALE = 0.62;

const SUIT_ORDER = ['Hearts', 'Spades', 'Clubs', 'Diamonds', 'Joker'];
const VALUE_ORDER = [
  'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
  'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King',
];

const LAYOUT = {
  info: { x: 40, y: 32, h: 36 },
  turnChip: { x: 1170, y: 100, w: 152, h: 36 },
  opponents: { plateY: 66, cardsY: 128, scale: 0.5 },
  stock: { x: 560, y: 250 },
  discard: { x: 700, y: 250 },
  pileLabelY: 334,
  rail: { y: 430, left: 40, right: 1110, top: 358, bottom: 504 },
  hand: { y: 636, selectedLift: 28, dockTop: 560 },
  buttons: { x: 1170, w: 152, h: 40, ys: [156, 206, 256, 306, 356] },
} as const;

type DropTarget = { kind: 'discard' } | { kind: 'meld'; meldIndex: number };

interface ButtonRef {
  pill: PillButton;
  enabled: (v: GameView) => boolean;
  primary: (v: GameView) => boolean;
  onClick: () => void;
  alwaysClickable: boolean; // fire onClick even when disabled (to explain why)
}

/**
 * Renders a GameView and turns gestures into Commands. Holds no game rules —
 * the server validates everything; the client-side meld check only drives the
 * Lay Down button's enabled state. Works against LocalSession and GameClient.
 */
export class TableScene extends Phaser.Scene {
  private session!: Session;
  private dynamic!: Phaser.GameObjects.Container;
  private infoPanel!: Phaser.GameObjects.Graphics;
  private roundText!: Phaser.GameObjects.Text;
  private contractText!: Phaser.GameObjects.Text;
  private turnChipImg!: Phaser.GameObjects.Image;
  private turnChipText!: Phaser.GameObjects.Text;
  private stockCaption!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private toastBg!: Phaser.GameObjects.Graphics;
  private toastText!: Phaser.GameObjects.Text;

  private selected = new Set<string>(); // hand card uuids chosen for lay-down
  private modal: Phaser.GameObjects.Container | null = null;
  private buttons: ButtonRef[] = [];
  private meldZones: Phaser.GameObjects.Zone[] = [];
  private pendingDrop: { target: DropTarget; card: CardDTO } | null = null;
  private unsubs: (() => void)[] = [];

  constructor() {
    super('Table');
  }

  create(): void {
    // Phaser reuses the scene instance across restarts — reset per-run state.
    this.buttons = [];
    this.meldZones = [];
    this.selected.clear();
    this.modal = null;
    this.pendingDrop = null;

    this.session = this.registry.get('session') as Session;
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__session = this.session;
    addTableBackground(this);
    this.input.dragDistanceThreshold = 8; // so a small click selects instead of dragging

    this.dynamic = this.add.container(0, 0).setDepth(10);
    this.buildStaticFurniture();

    // Slim one-line info bar, top-left; the panel is redrawn to fit its text.
    const info = LAYOUT.info;
    const infoCy = info.y + info.h / 2;
    this.infoPanel = this.add.graphics().setDepth(1);
    this.roundText = this.add.text(info.x + 18, infoCy, '', {
      fontFamily: FONT, color: COLORS.gold, fontSize: '15px', fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(50);
    this.contractText = this.add.text(info.x + 18, infoCy, '', {
      fontFamily: FONT, color: COLORS.cream, fontSize: '14px',
    }).setOrigin(0, 0.5).setDepth(50);
    this.hintText = this.add.text(640, 528, '', {
      fontFamily: FONT, color: COLORS.creamFaint, fontSize: '15px', fontStyle: 'italic',
    }).setOrigin(0.5).setDepth(50);

    const chip = LAYOUT.turnChip;
    this.turnChipImg = this.add
      .image(chip.x, chip.y, buttonTexture(this, chip.w, chip.h, 'disabled'))
      .setDepth(40);
    this.turnChipText = this.add.text(chip.x, chip.y - 1, '', {
      fontFamily: FONT, fontSize: '14px', color: COLORS.cream, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(41);

    this.toastBg = this.add.graphics().setDepth(60).setAlpha(0);
    this.toastText = this.add.text(640, 180, '', {
      fontFamily: FONT, color: COLORS.cream, fontSize: '18px', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(61).setAlpha(0);

    this.setupDragHandlers();

    // Track subscriptions so a restart doesn't leave the old session driving
    // a scene whose objects have been destroyed.
    this.unsubs.push(this.session.onView((view) => this.render(view)));
    const unError = this.session.onError?.((msg) => this.toast(msg));
    if (unError) this.unsubs.push(unError);
    const unRound = this.session.onRoundEnd?.((summary) => this.showScoreModal(summary));
    if (unRound) this.unsubs.push(unRound);
    this.events.once('shutdown', () => {
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
    });
    this.session.connect();
    if (this.session.view) this.render(this.session.view);
  }

  // ---- static furniture ----------------------------------------------------

  private buildStaticFurniture(): void {
    const panels = this.add.graphics().setDepth(1);

    const rail = LAYOUT.rail;
    drawPanel(panels, rail.left - 14, rail.top, rail.right - rail.left + 28,
      rail.bottom - rail.top, { fillAlpha: 0.22, radius: 18 });

    drawPanel(panels, 30, LAYOUT.hand.dockTop, W - 60, 706 - LAYOUT.hand.dockTop,
      { fillAlpha: 0.3, radius: 18 });

    const slots = this.add.graphics().setDepth(1);
    this.outlineSlot(slots, LAYOUT.stock.x, LAYOUT.stock.y);
    this.outlineSlot(slots, LAYOUT.discard.x, LAYOUT.discard.y);
    this.stockCaption = this.slotCaption(LAYOUT.stock.x, LAYOUT.pileLabelY, 'STOCK');
    this.slotCaption(LAYOUT.discard.x, LAYOUT.pileLabelY, 'DISCARD');

    // Discard drop zone (static).
    const dz = this.add
      .zone(LAYOUT.discard.x, LAYOUT.discard.y, CARD_W + 24, CARD_H + 24)
      .setRectangleDropZone(CARD_W + 24, CARD_H + 24);
    dz.setData('target', { kind: 'discard' } as DropTarget);

    const [yDraw, ySort, yLay, yDiscard, yEnd] = LAYOUT.buttons.ys;
    this.makeButton(yDraw, 'Draw',
      (v) => v.validActions.includes(ActionType.DRAW),
      (v) => v.validActions.includes(ActionType.DRAW),
      () => this.session.send({ type: ActionType.DRAW }));
    this.makeButton(ySort, 'Sort', () => true, () => false, () => this.toggleSort());
    this.makeButton(yLay, 'Lay Down',
      (v) => this.canLayDown(v),
      (v) => this.canLayDown(v),
      () => this.layDown(),
      true); // clickable while disabled so it can explain why
    this.makeButton(yDiscard, 'Discard',
      (v) => this.canDiscardSelected(v),
      (v) => this.canDiscardSelected(v),
      () => this.discardSelected(),
      true); // clickable while disabled so it can explain why
    this.makeButton(yEnd, 'End Turn',
      (v) => v.validActions.includes(ActionType.END_TURN),
      (v) => v.validActions.includes(ActionType.END_TURN),
      () => this.session.send({ type: ActionType.END_TURN }));
  }

  private outlineSlot(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0x04130b, 0.18);
    g.fillRoundedRect(x - CARD_W / 2 - 5, y - CARD_H / 2 - 5, CARD_W + 10, CARD_H + 10, 10);
    g.lineStyle(1.5, 0xd9a441, 0.28);
    g.strokeRoundedRect(x - CARD_W / 2 - 5, y - CARD_H / 2 - 5, CARD_W + 10, CARD_H + 10, 10);
  }

  private slotCaption(x: number, y: number, label: string): Phaser.GameObjects.Text {
    return this.add.text(x, y, label, {
      fontFamily: FONT, color: COLORS.gold, fontSize: '12px', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.7).setDepth(2);
  }

  private makeButton(
    y: number,
    label: string,
    enabled: ButtonRef['enabled'],
    primary: ButtonRef['primary'],
    onClick: () => void,
    alwaysClickable = false,
  ): void {
    const { x, w, h } = LAYOUT.buttons;
    const ref: ButtonRef = {
      pill: makePillButton(this, x, y, w, h, label, 15, () => {
        const v = this.session.view;
        if (v && (ref.alwaysClickable || ref.enabled(v))) ref.onClick();
      }),
      enabled, primary, onClick, alwaysClickable,
    };
    ref.pill.img.setDepth(40);
    ref.pill.label.setDepth(41);
    this.buttons.push(ref);
  }

  private refreshButtons(view: GameView): void {
    for (const b of this.buttons) {
      b.pill.setState(!b.enabled(view) ? 'disabled' : b.primary(view) ? 'primary' : 'default');
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

    this.roundText.setText(`ROUND ${view.round}`);
    const met = view.youAreDown ? '   ·   ✓ met' : '';
    this.contractText.setText(`·   ${this.contractLabel(view)}${met}`);
    this.contractText.setX(this.roundText.x + this.roundText.width + 12);
    const info = LAYOUT.info;
    this.infoPanel.clear();
    drawPanel(this.infoPanel, info.x, info.y,
      this.contractText.x + this.contractText.width + 18 - info.x, info.h);
    this.stockCaption.setText(`STOCK · ${view.deckCount}`);
    this.hintText.setText(this.hintFor(view));
    this.refreshTurnChip(view);
    this.refreshButtons(view);
  }

  /** Contract description without the redundant "Round N:" prefix. */
  private contractLabel(view: GameView): string {
    if (!view.contract) return '';
    return view.contract.description.replace(/^Round \d+:\s*/, '');
  }

  private refreshTurnChip(view: GameView): void {
    const { w, h } = LAYOUT.turnChip;
    if (view.isYourTurn) {
      this.turnChipImg.setTexture(buttonTexture(this, w, h, 'primary'));
      this.turnChipText.setText('YOUR TURN').setColor(COLORS.textOnGold);
    } else {
      const current = view.players[view.currentPlayerIndex];
      this.turnChipImg.setTexture(buttonTexture(this, w, h, 'disabled'));
      this.turnChipText.setText(`${current?.name ?? '…'} PLAYING`).setColor(COLORS.creamFaint);
    }
  }

  /** A one-line "what to do now" prompt under the table. */
  private hintFor(view: GameView): string {
    if (!view.isYourTurn) return 'AI is playing…';
    if (view.discarded) return 'You discarded — press End Turn to pass play.';
    if (view.youAreDown) return 'Drag a card onto any meld to lay it off, then discard.';
    if (!view.tookCard) {
      return view.firstTurn
        ? 'First turn — drag a card to the discard pile to start (no draw).'
        : 'Draw from the stock or take the discard to begin your turn.';
    }
    const sel = this.selected.size;
    if (sel === 1) return '1 selected — press Discard, or select more cards to build a lay-down.';
    if (sel > 1) return `${sel} selected — press Lay Down, or tap to deselect.`;
    return 'Tap a card to select it: 1 to Discard, or a full meld to Lay Down.';
  }

  /**
   * Opponent column centers. One opponent sits dead-center; two are spread
   * symmetrically but kept right of the info bar and left of the buttons.
   */
  private opponentXs(n: number): number[] {
    if (n <= 1) return [W / 2];
    if (n === 2) return [510, 890];
    return Array.from({ length: n }, (_, i) => 470 + (i * 580) / (n - 1));
  }

  private renderOpponents(view: GameView): void {
    const meId = view.you?.id ?? this.session.playerId;
    const currentId = view.players[view.currentPlayerIndex]?.id;
    const opponents = view.players.filter((p) => p.id !== meId);
    const xs = this.opponentXs(opponents.length);
    opponents.forEach((p, i) => {
      const cx = xs[i];
      const isTheirTurn = p.id === currentId;

      // Name plate, gold-rimmed while they play.
      const plateW = 210;
      const plateH = 34;
      const plate = this.add.graphics();
      drawPanel(plate, cx - plateW / 2, LAYOUT.opponents.plateY - plateH / 2, plateW, plateH,
        { fillAlpha: isTheirTurn ? 0.55 : 0.35, radius: plateH / 2, goldBorder: isTheirTurn });
      this.dynamic.add(plate);

      const down = p.isDown ? '  ·  DOWN' : '';
      this.dynamic.add(this.add.text(cx, LAYOUT.opponents.plateY - 1,
        `${p.name}  ·  ${p.handCount}${down}`, {
          fontFamily: FONT, fontSize: '15px', fontStyle: 'bold',
          color: isTheirTurn ? COLORS.goldBright : COLORS.cream,
        }).setOrigin(0.5));

      const fan = Math.min(p.handCount, 11);
      const step = 20;
      const scale = LAYOUT.opponents.scale;
      const fanW = (fan - 1) * step + CARD_W * scale;
      this.dynamic.add(addCardShadow(this, cx, LAYOUT.opponents.cardsY, fanW, CARD_H * scale, 0.3));
      for (let c = 0; c < fan; c++) {
        const img = this.add.image(cx - ((fan - 1) * step) / 2 + c * step, LAYOUT.opponents.cardsY, CARD_BACK_KEY);
        img.setDisplaySize(CARD_W * scale, CARD_H * scale);
        this.dynamic.add(img);
      }
    });
  }

  private renderStock(view: GameView): void {
    if (view.deckCount <= 0) return;
    this.dynamic.add(addCardShadow(this, LAYOUT.stock.x, LAYOUT.stock.y, CARD_W, CARD_H));
    const img = this.add.image(LAYOUT.stock.x, LAYOUT.stock.y, CARD_BACK_KEY);
    img.setDisplaySize(CARD_W, CARD_H).setInteractive({ useHandCursor: true });
    img.on('pointerup', () => {
      const v = this.session.view;
      if (v?.validActions.includes(ActionType.DRAW)) this.session.send({ type: ActionType.DRAW });
      else if (v?.firstTurn) this.toast('First turn — discard a card to start (no draw).');
      else this.toast("You can't draw right now.");
    });
    this.dynamic.add(img);
  }

  private renderDiscard(view: GameView): void {
    if (!view.burnTop) return;
    this.dynamic.add(addCardShadow(this, LAYOUT.discard.x, LAYOUT.discard.y, CARD_W, CARD_H));
    const img = this.add.image(LAYOUT.discard.x, LAYOUT.discard.y, cardKey(view.burnTop));
    img.setDisplaySize(CARD_W, CARD_H).setInteractive({ useHandCursor: true });
    img.on('pointerup', () => {
      const v = this.session.view;
      if (v?.validActions.includes(ActionType.TAKE_FROM_DISCARD)) {
        this.session.send({ type: ActionType.TAKE_FROM_DISCARD });
      } else if (v?.youAreDown) {
        this.toast('Once you are down you can only draw from the stock.');
      } else if (v?.tookCard) {
        this.toast("You've already drawn this turn.");
      }
    });
    this.dynamic.add(img);
  }

  /** Render every meld on the table (all owners) as a labeled, drop-targetable group. */
  private renderMeldsRail(view: GameView): void {
    const melds = view.downPiles;
    if (melds.length === 0) {
      this.dynamic.add(this.add.text((LAYOUT.rail.left + LAYOUT.rail.right) / 2, LAYOUT.rail.y,
        'No melds on the table yet', {
          fontFamily: FONT, color: COLORS.creamFaint, fontSize: '14px', fontStyle: 'italic',
        }).setOrigin(0.5).setAlpha(0.55));
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
      const ch = CARD_H * MELD_CARD_SCALE * scale;

      const ownerLabel = pile.owner === meName ? 'YOU' : pile.owner.toUpperCase();
      this.dynamic.add(this.add.text(cx, LAYOUT.rail.y - ch / 2 - 13, ownerLabel, {
        fontFamily: FONT, color: COLORS.gold, fontSize: '11px', fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(0.85));

      this.dynamic.add(addCardShadow(this, cx, LAYOUT.rail.y, gw, ch, 0.3));
      pile.cards.forEach((card, c) => {
        const img = this.add.image(x + sCw / 2 + c * sStep, LAYOUT.rail.y, cardKey(card));
        img.setDisplaySize(sCw, ch);
        this.dynamic.add(img);
      });

      // Drop zone over the whole group for lay-off (ADD_TO_MELD).
      const zone = this.add.zone(cx, LAYOUT.rail.y, gw + 12, ch + 16)
        .setRectangleDropZone(gw + 12, ch + 16);
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
      this.dynamic.add(addCardShadow(this, x, y, CARD_W, CARD_H));
      if (isSel) this.dynamic.add(addCardGlow(this, x, y, CARD_W, CARD_H));
      const img = this.add.image(x, y, cardKey(card));
      img.setDisplaySize(CARD_W, CARD_H);
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

    if (!view.isYourTurn) return this.toast('Wait for your turn.');
    if (view.youAreDown) return this.toast("You're already down — drag cards onto melds to lay off.");
    if (!view.validActions.includes(ActionType.LAY_DOWN)) {
      if (view.discarded) return this.toast('You already discarded — laying down ended with your turn.');
      return this.toast(
        view.tookCard ? "You can't lay down right now." : 'Draw a card first, then lay down.',
      );
    }

    const result = findContract(this.layDownSource(view), view.contract);
    if (!result) {
      return this.toast(
        this.selected.size > 0
          ? `Those cards don't complete: ${view.contract.description}`
          : `You don't have the full contract yet: ${view.contract.description}`,
      );
    }

    this.session.send({ type: ActionType.LAY_DOWN, payload: { melds: result.melds } });
    this.selected.clear();
  }

  /** Discard enabled only with exactly one card selected (more = a lay-down). */
  private canDiscardSelected(view: GameView): boolean {
    return (
      view.isYourTurn &&
      view.validActions.includes(ActionType.DISCARD) &&
      this.selected.size === 1
    );
  }

  private discardSelected(): void {
    const view = this.session.view;
    if (!view) return;
    if (!view.isYourTurn) return this.toast('Wait for your turn.');
    if (this.selected.size === 0) return this.toast('Select a card to discard.');
    if (this.selected.size > 1) {
      return this.toast('Select a single card to discard — multiple cards are for laying down.');
    }
    if (!view.validActions.includes(ActionType.DISCARD)) {
      return this.toast(
        view.discarded
          ? 'You already discarded this turn — press End Turn.'
          : 'Draw a card before discarding.',
      );
    }
    const cardUuid = [...this.selected][0];
    this.session.send({ type: ActionType.DISCARD, payload: { cardUuid } });
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

  // ---- round-end score modal -------------------------------------------------

  /**
   * Score table shown after every round: one column per round (dash until
   * played) plus totals. After the last round it becomes the final standings
   * with Play Again / Menu.
   */
  private showScoreModal(s: RoundSummary): void {
    this.closeModal();
    const modal = this.add.container(0, 0).setDepth(70);
    this.modal = modal;

    // Veil blocks interaction with the table beneath.
    const veil = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.55).setInteractive();
    modal.add(veil);

    const nameW = 150, colW = 56, totalW = 84;
    const tableW = nameW + s.totalRounds * colW + totalW;
    const panelW = tableW + 90;
    const rowH = 40;
    const panelH = 188 + (s.players.length + 1) * rowH;
    const px = 640 - panelW / 2;
    const py = 360 - panelH / 2;

    const g = this.add.graphics();
    drawPanel(g, px, py, panelW, panelH, { fillAlpha: 0.92, radius: 20, goldBorder: true });
    modal.add(g);

    const youName = this.session.view?.you?.name;
    const leader = [...s.players].sort((a, b) => a.total - b.total)[0];
    const title = s.gameComplete
      ? leader?.name === youName ? 'You win the game!' : `${leader?.name ?? '…'} wins the game!`
      : `Round ${s.roundNumber} complete`;
    const wentOut = s.winnerName === youName ? 'You went out' : `${s.winnerName} went out`;
    const subtitle = s.gameComplete ? `${wentOut} — lowest total wins` : wentOut;

    modal.add(this.add.text(640, py + 44, title, {
      fontFamily: FONT, fontSize: '30px', color: COLORS.goldBright, fontStyle: 'bold',
    }).setOrigin(0.5).setShadow(0, 3, 'rgba(0,0,0,0.5)', 4));
    modal.add(this.add.text(640, py + 78, subtitle, {
      fontFamily: FONT, fontSize: '15px', color: COLORS.creamFaint,
    }).setOrigin(0.5));

    this.drawScoreGrid(modal, s, px + 45, py + 108, nameW, colW, totalW, rowH, leader?.name);

    const btnY = py + panelH - 44;
    if (s.gameComplete) {
      const again = makePillButton(this, 640 - 100, btnY, 180, 44, 'Play Again', 16, () => {
        this.registry.set('session', new SinglePlayerSession(1));
        this.closeModal();
        this.scene.restart();
      });
      again.setState('primary');
      const menu = makePillButton(this, 640 + 100, btnY, 180, 44, 'Menu', 16, () => {
        this.closeModal();
        this.scene.start('Menu');
      });
      modal.add([again.img, again.label, menu.img, menu.label]);
    } else {
      const next = makePillButton(this, 640, btnY, 200, 44, 'Next Round', 16, () => {
        this.closeModal();
        this.session.nextRound?.();
      });
      next.setState('primary');
      modal.add([next.img, next.label]);
    }
  }

  private drawScoreGrid(
    modal: Phaser.GameObjects.Container,
    s: RoundSummary,
    left: number, top: number,
    nameW: number, colW: number, totalW: number, rowH: number,
    leaderName: string | undefined,
  ): void {
    const youName = this.session.view?.you?.name;
    const colX = (i: number): number => left + nameW + i * colW + colW / 2;
    const totalX = left + nameW + s.totalRounds * colW + totalW / 2;
    const small = { fontFamily: FONT, fontSize: '14px', color: COLORS.creamFaint };

    // Header row.
    for (let r = 0; r < s.totalRounds; r++) {
      const isJustPlayed = r + 1 === s.roundNumber;
      modal.add(this.add.text(colX(r), top, `R${r + 1}`, {
        ...small, fontStyle: 'bold',
        color: isJustPlayed ? COLORS.gold : COLORS.creamFaint,
      }).setOrigin(0.5));
    }
    modal.add(this.add.text(totalX, top, 'TOTAL', {
      ...small, fontStyle: 'bold', color: COLORS.gold,
    }).setOrigin(0.5));

    // Divider under the header.
    const g = this.add.graphics();
    g.lineStyle(1, 0xd9a441, 0.35);
    g.lineBetween(left, top + rowH / 2 + 4, left + nameW + s.totalRounds * colW + totalW, top + rowH / 2 + 4);
    modal.add(g);

    s.players.forEach((p, row) => {
      const y = top + (row + 1) * rowH;
      const isLeader = s.gameComplete && p.name === leaderName;
      const nameColor = isLeader ? COLORS.goldBright : COLORS.cream;
      const label = p.name === youName ? 'You' : p.name;
      modal.add(this.add.text(left, y, isLeader ? `★ ${label}` : label, {
        fontFamily: FONT, fontSize: '17px', color: nameColor, fontStyle: 'bold',
      }).setOrigin(0, 0.5));

      p.rounds.forEach((score, r) => {
        const isJustPlayed = r + 1 === s.roundNumber;
        modal.add(this.add.text(colX(r), y, score === null ? '–' : String(score), {
          fontFamily: FONT, fontSize: '16px',
          color: score === null ? '#5e7a6a' : isJustPlayed ? COLORS.goldBright : COLORS.cream,
          fontStyle: isJustPlayed && score !== null ? 'bold' : 'normal',
        }).setOrigin(0.5));
      });

      modal.add(this.add.text(totalX, y, String(p.total), {
        fontFamily: FONT, fontSize: '17px', color: nameColor, fontStyle: 'bold',
      }).setOrigin(0.5));
    });
  }

  private closeModal(): void {
    this.modal?.destroy(true);
    this.modal = null;
  }

  // ---- toast ---------------------------------------------------------------

  private toast(message: string): void {
    this.toastText.setText(message);
    const b = this.toastText.getBounds();
    this.toastBg.clear();
    drawPanel(this.toastBg, b.centerX - b.width / 2 - 22, b.centerY - b.height / 2 - 12,
      b.width + 44, b.height + 24, { fillAlpha: 0.85, radius: 14, goldBorder: true });
    this.toastBg.setAlpha(1);
    this.toastText.setAlpha(1);
    this.tweens.killTweensOf([this.toastText, this.toastBg]);
    this.tweens.add({ targets: [this.toastText, this.toastBg], alpha: 0, delay: 2200, duration: 600 });
  }
}
