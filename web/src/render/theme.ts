import Phaser from 'phaser';

// Casino-table look shared by every scene: canvas-generated felt + wood rim,
// soft shadows/glows, gold palette and pill buttons. All textures are built
// at runtime so the game stays a tiny offline bundle.

export const FONT = 'Nunito, "Trebuchet MS", Verdana, sans-serif';

export const COLORS = {
  gold: '#d9a441',
  goldBright: '#f2cd6e',
  cream: '#f3ead2',
  creamFaint: '#cfc6a8',
  textOnGold: '#3a2606',
  feltEdge: '#0b2e1c',
} as const;

const TABLE_BG_KEY = 'table-bg';
const RIM = 26; // wood rail thickness around the felt

/** Pad baked into shadow/glow textures so the blur isn't clipped. */
const SOFT_PAD = 24;
const SHADOW_KEY = 'card-shadow';
const GLOW_KEY = 'card-glow';
const CARD_TEX_W = 96;
const CARD_TEX_H = 134;

// ---- table background -------------------------------------------------------

/** Add the full-screen table background (wood rim, felt, vignette) to a scene. */
export function addTableBackground(scene: Phaser.Scene): void {
  const { width, height } = scene.scale;
  ensureTableTexture(scene, width, height);
  scene.add.image(width / 2, height / 2, TABLE_BG_KEY).setDepth(0);
}

function ensureTableTexture(scene: Phaser.Scene, w: number, h: number): void {
  if (scene.textures.exists(TABLE_BG_KEY)) return;
  const tex = scene.textures.createCanvas(TABLE_BG_KEY, w, h)!;
  const ctx = tex.getContext();

  // Wood rail: vertical walnut gradient with faint grain streaks.
  const wood = ctx.createLinearGradient(0, 0, 0, h);
  wood.addColorStop(0, '#56351b');
  wood.addColorStop(0.5, '#3c2412');
  wood.addColorStop(1, '#27160a');
  ctx.fillStyle = wood;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(0, 0, 0, ${0.04 + Math.random() * 0.05})`;
    ctx.fillRect(0, Math.random() * h, w, 1 + Math.random() * 2);
  }

  // Gold pinstripe on the rail, just outside the felt.
  ctx.strokeStyle = 'rgba(217, 164, 65, 0.55)';
  ctx.lineWidth = 2;
  roundRectPath(ctx, RIM - 8, RIM - 8, w - 2 * (RIM - 8), h - 2 * (RIM - 8), 30);
  ctx.stroke();

  // Felt: radial gradient, brightest just above center where the action is.
  ctx.save();
  roundRectPath(ctx, RIM, RIM, w - 2 * RIM, h - 2 * RIM, 24);
  ctx.clip();
  const felt = ctx.createRadialGradient(w / 2, h * 0.44, 60, w / 2, h * 0.5, w * 0.72);
  felt.addColorStop(0, '#2e7d51');
  felt.addColorStop(0.55, '#1e5c3a');
  felt.addColorStop(1, '#0b2e1c');
  ctx.fillStyle = felt;
  ctx.fillRect(0, 0, w, h);

  // Felt grain: thousands of barely-visible specks.
  for (let i = 0; i < 5000; i++) {
    const light = Math.random() > 0.5;
    ctx.fillStyle = light
      ? `rgba(255, 255, 255, ${Math.random() * 0.025})`
      : `rgba(0, 0, 0, ${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
  }

  // Inner shadow where the felt meets the rail.
  for (let i = 0; i < 14; i++) {
    ctx.strokeStyle = `rgba(0, 0, 0, ${0.05 * (1 - i / 14)})`;
    ctx.lineWidth = 2;
    roundRectPath(ctx, RIM + i, RIM + i, w - 2 * (RIM + i), h - 2 * (RIM + i), 24 - i);
    ctx.stroke();
  }
  ctx.restore();

  tex.refresh();
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// ---- soft shadows & glows ---------------------------------------------------

function ensureSoftTexture(
  scene: Phaser.Scene, key: string, color: string, blur: number,
): void {
  if (scene.textures.exists(key)) return;
  const w = CARD_TEX_W + SOFT_PAD * 2;
  const h = CARD_TEX_H + SOFT_PAD * 2;
  const tex = scene.textures.createCanvas(key, w, h)!;
  const ctx = tex.getContext();
  ctx.filter = `blur(${blur}px)`;
  ctx.fillStyle = color;
  roundRectPath(ctx, SOFT_PAD, SOFT_PAD, CARD_TEX_W, CARD_TEX_H, 10);
  ctx.fill();
  tex.refresh();
}

/** Drop shadow under a card-shaped object of display size w x h. */
export function addCardShadow(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number, alpha = 0.4,
): Phaser.GameObjects.Image {
  ensureSoftTexture(scene, SHADOW_KEY, '#000000', 9);
  const f = w / CARD_TEX_W;
  return scene.add
    .image(x + 2 * f, y + 5 * f, SHADOW_KEY)
    .setDisplaySize(w + SOFT_PAD * 2 * f, h + SOFT_PAD * 2 * (h / CARD_TEX_H))
    .setAlpha(alpha);
}

/** Gold glow behind a selected/highlighted card-shaped object. */
export function addCardGlow(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number, alpha = 0.9,
): Phaser.GameObjects.Image {
  ensureSoftTexture(scene, GLOW_KEY, '#f2cd6e', 7);
  const f = w / CARD_TEX_W;
  return scene.add
    .image(x, y, GLOW_KEY)
    .setDisplaySize(w + SOFT_PAD * 2 * f, h + SOFT_PAD * 2 * (h / CARD_TEX_H))
    .setAlpha(alpha);
}

// ---- panels -----------------------------------------------------------------

export interface PanelOptions {
  fillAlpha?: number;
  radius?: number;
  goldBorder?: boolean;
}

/** Dark translucent rounded panel (status areas, hand dock, toasts). */
export function drawPanel(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  { fillAlpha = 0.35, radius = 14, goldBorder = false }: PanelOptions = {},
): void {
  g.fillStyle(0x04130b, fillAlpha);
  g.fillRoundedRect(x, y, w, h, radius);
  if (goldBorder) {
    g.lineStyle(1.5, 0xd9a441, 0.6);
  } else {
    g.lineStyle(1, 0xffffff, 0.08);
  }
  g.strokeRoundedRect(x, y, w, h, radius);
}

export function addPanel(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number, opts?: PanelOptions,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  drawPanel(g, x - w / 2, y - h / 2, w, h, opts);
  return g;
}

// ---- pill buttons -----------------------------------------------------------

export type ButtonState = 'default' | 'primary' | 'disabled';
export type ButtonSkin = ButtonState | 'default-hover' | 'primary-hover';

export function buttonTexture(scene: Phaser.Scene, w: number, h: number, skin: ButtonSkin): string {
  const key = `btn-${skin}-${w}x${h}`;
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, w, h)!;
  const ctx = tex.getContext();
  const r = h / 2;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  let border = 'rgba(217, 164, 65, 0.5)';
  let topLight = 'rgba(255, 255, 255, 0.14)';
  switch (skin) {
    case 'primary':
      grad.addColorStop(0, '#f4d27c'); grad.addColorStop(1, '#c8923a');
      border = '#8a6420'; topLight = 'rgba(255, 255, 255, 0.55)';
      break;
    case 'primary-hover':
      grad.addColorStop(0, '#ffe49a'); grad.addColorStop(1, '#d8a249');
      border = '#8a6420'; topLight = 'rgba(255, 255, 255, 0.65)';
      break;
    case 'default-hover':
      grad.addColorStop(0, '#357a52'); grad.addColorStop(1, '#1f5237');
      break;
    case 'disabled':
      grad.addColorStop(0, '#13301f'); grad.addColorStop(1, '#0e2417');
      border = 'rgba(255, 255, 255, 0.08)'; topLight = 'rgba(255, 255, 255, 0.03)';
      break;
    default:
      grad.addColorStop(0, '#2a6445'); grad.addColorStop(1, '#173f2a');
  }

  // Soft drop shadow along the bottom edge.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  roundRectPath(ctx, 1, 3, w - 2, h - 4, r);
  ctx.fill();

  ctx.fillStyle = grad;
  roundRectPath(ctx, 1, 1, w - 2, h - 4, r);
  ctx.fill();

  ctx.strokeStyle = border;
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, 1.5, 1.5, w - 3, h - 5, r);
  ctx.stroke();

  // Inner highlight on the top half for a subtle bevel.
  ctx.strokeStyle = topLight;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(r * 0.8, 3.5);
  ctx.lineTo(w - r * 0.8, 3.5);
  ctx.stroke();

  tex.refresh();
  return key;
}

export interface PillButton {
  img: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  setState(state: ButtonState): void;
}

export function makePillButton(
  scene: Phaser.Scene,
  x: number, y: number, w: number, h: number,
  text: string, fontSize: number,
  onClick: () => void,
): PillButton {
  const img = scene.add.image(x, y, buttonTexture(scene, w, h, 'default'))
    .setInteractive({ useHandCursor: true });
  const label = scene.add.text(x, y - 1, text, {
    fontFamily: FONT, fontSize: `${fontSize}px`, color: COLORS.cream, fontStyle: 'bold',
  }).setOrigin(0.5);

  let state: ButtonState = 'default';
  let hover = false;
  const refresh = (): void => {
    const skin: ButtonSkin =
      state !== 'disabled' && hover ? (`${state}-hover` as ButtonSkin) : state;
    img.setTexture(buttonTexture(scene, w, h, skin));
    label.setColor(state === 'primary' ? COLORS.textOnGold : COLORS.cream);
    label.setAlpha(state === 'disabled' ? 0.35 : 1);
  };

  img.on('pointerover', () => { hover = true; refresh(); });
  img.on('pointerout', () => { hover = false; refresh(); });
  img.on('pointerup', onClick);
  refresh();

  return {
    img,
    label,
    setState(next: ButtonState): void {
      if (next === state) return;
      state = next;
      refresh();
    },
  };
}
