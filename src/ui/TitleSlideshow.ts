// src/ui/TitleSlideshow.ts - Animated pixel-art slideshow of Totoro-inspired scenes for the title screen.
// Renders procedurally painted scenes (rain bus stop, moonlit grove, camphor tree, sunset meadow,
// night flight) at 320x180 and composites the game's own Totoro & Moon Walker sprite sheets on top.

const W = 320;
const H = 180;
/** Output canvas is 2x the 320x180 logical scene size so painted backgrounds stay crisp. */
const OUT_SCALE = 2;
const SCENE_MS = 7000;
const FADE_MS = 1400;

type Ctx = CanvasRenderingContext2D;

interface Scene {
  caption: string;
  /** Optional painted background (public/assets/backgrounds); procedural draw is the fallback. */
  image?: string;
  draw: (c: Ctx, t: number, s: Sprites) => void;
}

interface Sprites {
  totoro: HTMLImageElement | null;
  moon: HTMLImageElement | null;
}

// Deterministic pseudo-random so scenes don't flicker between frames
function rnd(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function bands(c: Ctx, stops: [number, string][], y0 = 0, y1 = H): void {
  const n = stops.length;
  const h = (y1 - y0) / (n - 1);
  for (let i = 0; i < n - 1; i++) {
    const g = c.createLinearGradient(0, y0 + i * h, 0, y0 + (i + 1) * h);
    g.addColorStop(0, stops[i][1]);
    g.addColorStop(1, stops[i + 1][1]);
    c.fillStyle = g;
    c.fillRect(0, Math.floor(y0 + i * h), W, Math.ceil(h) + 1);
  }
}

function stars(c: Ctx, t: number, count: number, maxY: number): void {
  for (let i = 0; i < count; i++) {
    const tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
    c.fillStyle = `rgba(255,248,220,${0.35 + 0.55 * tw})`;
    c.fillRect(Math.floor(rnd(i) * W), Math.floor(rnd(i + 99) * maxY), 1, 1);
  }
}

function disc(c: Ctx, x: number, y: number, r: number, color: string): void {
  c.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    c.fillRect(Math.floor(x - dx), Math.floor(y + dy), dx * 2 + 1, 1);
  }
}

function hills(c: Ctx, base: number, amp: number, freq: number, phase: number, color: string): void {
  c.fillStyle = color;
  for (let x = 0; x < W; x++) {
    const y = Math.floor(base + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.3 + phase * 1.7) * amp * 0.4);
    c.fillRect(x, y, 1, H - y);
  }
}

function cloud(c: Ctx, x: number, y: number, s: number, color: string): void {
  c.fillStyle = color;
  disc(c, x, y, 6 * s, color);
  disc(c, x + 8 * s, y - 3 * s, 8 * s, color);
  disc(c, x + 18 * s, y, 6 * s, color);
  c.fillRect(Math.floor(x - 2 * s), Math.floor(y), Math.floor(24 * s), Math.floor(5 * s));
}

function tree(c: Ctx, x: number, baseY: number, h: number, color: string): void {
  c.fillStyle = color;
  disc(c, x, baseY - h, h * 0.45, color);
  disc(c, x - h * 0.3, baseY - h * 0.7, h * 0.35, color);
  disc(c, x + h * 0.3, baseY - h * 0.7, h * 0.35, color);
  c.fillRect(Math.floor(x - 2), Math.floor(baseY - h * 0.6), 4, Math.floor(h * 0.6));
}

function sprite(
  c: Ctx,
  img: HTMLImageElement | null,
  fw: number,
  fh: number,
  col: number,
  row: number,
  x: number,
  footY: number,
  scale: number,
  shadow = true
): void {
  if (!img || !img.complete || !img.naturalWidth) return;
  const dw = fw * scale;
  const dh = fh * scale;
  if (shadow) {
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.fillRect(Math.floor(x - dw * 0.38), Math.floor(footY - 2), Math.floor(dw * 0.76), 3);
  }
  c.drawImage(img, col * fw, row * fh, fw, fh, Math.floor(x - dw / 2), Math.floor(footY - dh), dw, dh);
}

const totoroAt = (c: Ctx, s: Sprites, row: number, x: number, y: number, sc: number, col = 0) =>
  sprite(c, s.totoro, 68, 76, col, row, x, y, sc);
const moonAt = (c: Ctx, s: Sprites, row: number, x: number, y: number, sc: number, col = 0) =>
  sprite(c, s.moon, 32, 64, col, row, x, y, sc);

// ---------------------------------------------------------------- scenes
const SCENES: Scene[] = [
  {
    caption: 'THE RAINY BUS STOP',
    image: 'assets/backgrounds/totoro_scene_1.jpg',
    draw(c, t, s) {
      bands(c, [[0, '#33473f'], [0.5, '#587a6b'], [1, '#7b9a82']] as any, 0, 110);
      for (let i = 0; i < 3; i++) cloud(c, ((i * 130 + t * 6) % (W + 60)) - 30, 22 + i * 14, 1.6, 'rgba(60,78,72,0.8)');
      hills(c, 100, 8, 0.02, 1, '#35583f');
      hills(c, 112, 6, 0.03, 4, '#2c4a35');
      // road + ground
      c.fillStyle = '#4a4f4a';
      c.fillRect(0, 140, W, 40);
      c.fillStyle = '#c7b97a';
      for (let x = -((t * 10) % 24); x < W; x += 24) c.fillRect(x, 160, 12, 2);
      c.fillStyle = '#2a3f2c';
      c.fillRect(0, 128, W, 12);
      // bus stop sign
      c.fillStyle = '#5a4630';
      c.fillRect(214, 80, 3, 62);
      c.fillStyle = '#e8d9a8';
      c.fillRect(204, 70, 24, 14);
      c.fillStyle = '#7a4a2a';
      c.fillRect(204, 70, 24, 2);
      c.fillRect(208, 76, 16, 1);
      c.fillRect(208, 79, 12, 1);
      // puddle ripples
      c.strokeStyle = 'rgba(200,225,230,0.5)';
      for (let i = 0; i < 4; i++) {
        const p = (t * 0.8 + i * 0.25) % 1;
        c.beginPath();
        c.ellipse(110 + i * 38, 168 - (i % 2) * 6, 2 + p * 10, 1 + p * 3, 0, 0, Math.PI * 2);
        c.globalAlpha = 1 - p;
        c.stroke();
        c.globalAlpha = 1;
      }
      moonAt(c, s, 2, 120, 160, 2);
      totoroAt(c, s, 0, 178, 166, 2);
      // leaf umbrella held by Totoro
      c.fillStyle = '#3f7d3a';
      disc(c, 178, 20, 0, '#3f7d3a');
      c.beginPath();
      c.ellipse(178, 28, 22, 8, 0, Math.PI, 0);
      c.fill();
      c.fillStyle = '#2d5a2a';
      c.fillRect(177, 28, 2, 12);
      // rain
      c.fillStyle = 'rgba(210,230,240,0.55)';
      for (let i = 0; i < 120; i++) {
        const x = (rnd(i) * W + t * 40) % W;
        const y = (rnd(i + 7) * H + t * 220) % H;
        c.fillRect(Math.floor(x), Math.floor(y), 1, 5);
      }
    }
  },
  {
    caption: 'MOONLIT DANCE OF THE GROVE',
    image: 'assets/backgrounds/totoro_scene_2.jpg',
    draw(c, t, s) {
      bands(c, [[0, '#0a1230'], [0.6, '#1a2b5e'], [1, '#2f4a7a']] as any, 0, 120);
      stars(c, t, 80, 90);
      disc(c, 238, 48, 22, '#fdf3c8');
      disc(c, 232, 44, 20, '#fffbe2');
      c.fillStyle = 'rgba(253,243,200,0.08)';
      disc(c, 238, 48, 44, 'rgba(253,243,200,0.07)');
      hills(c, 118, 6, 0.025, 0.5, '#13302f');
      for (let i = 0; i < 7; i++) tree(c, 20 + i * 52 + rnd(i) * 14, 125, 40 + rnd(i + 3) * 20, '#0c2222');
      c.fillStyle = '#1d4a3a';
      c.fillRect(0, 130, W, 50);
      // grass shimmer
      c.fillStyle = '#2f6a4c';
      for (let i = 0; i < 80; i++) {
        const x = rnd(i + 50) * W;
        const y = 134 + rnd(i + 70) * 44;
        c.fillRect(Math.floor(x + Math.sin(t * 2 + i) * 1.5), Math.floor(y), 1, 3);
      }
      // acorn sprout
      c.fillStyle = '#6fd37a';
      const sy = 168 - Math.min(14, t * 3);
      c.fillRect(160, sy, 2, 168 - sy);
      c.fillRect(158, sy, 2, 2);
      c.fillRect(162, sy + 2, 2, 2);
      totoroAt(c, s, 0, 120, 168, 2);
      moonAt(c, s, 1, 200, 168, 2, Math.floor(t * 4) % 4);
      // fireflies / soot glow
      for (let i = 0; i < 26; i++) {
        const x = (rnd(i) * W + Math.sin(t + i) * 12 + W) % W;
        const y = 70 + rnd(i + 9) * 90 + Math.cos(t * 1.3 + i) * 8;
        const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i));
        c.fillStyle = `rgba(255,240,140,${a})`;
        c.fillRect(Math.floor(x), Math.floor(y), 2, 2);
        c.fillStyle = `rgba(255,240,140,${a * 0.2})`;
        c.fillRect(Math.floor(x) - 1, Math.floor(y) - 1, 4, 4);
      }
    }
  },
  {
    caption: 'THE GREAT CAMPHOR TREE',
    image: 'assets/backgrounds/totoro_scene_3.jpg',
    draw(c, t, s) {
      bands(c, [[0, '#1d4a35'], [0.5, '#3c7a4a'], [1, '#8fc274']] as any, 0, H);
      // canopy blobs
      for (let i = 0; i < 18; i++) {
        const x = rnd(i) * W;
        const y = rnd(i + 5) * 70;
        disc(c, x, y, 24 + rnd(i + 2) * 22, i % 2 ? '#1f5a35' : '#17482b');
      }
      for (let i = 0; i < 12; i++) disc(c, rnd(i + 20) * W, 20 + rnd(i + 30) * 50, 12 + rnd(i) * 10, '#2b7a43');
      // god rays
      for (let i = 0; i < 5; i++) {
        const x0 = 40 + i * 60 + Math.sin(t * 0.6 + i) * 8;
        const g = c.createLinearGradient(x0, 0, x0 + 40, H);
        g.addColorStop(0, 'rgba(255,248,190,0.35)');
        g.addColorStop(1, 'rgba(255,248,190,0)');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(x0, 0);
        c.lineTo(x0 + 18, 0);
        c.lineTo(x0 + 70, H);
        c.lineTo(x0 + 24, H);
        c.closePath();
        c.fill();
      }
      // trunk
      c.fillStyle = '#4a3322';
      c.beginPath();
      c.moveTo(120, H);
      c.quadraticCurveTo(140, 100, 132, 50);
      c.lineTo(190, 50);
      c.quadraticCurveTo(182, 100, 210, H);
      c.closePath();
      c.fill();
      c.fillStyle = '#3a281a';
      for (let i = 0; i < 14; i++) c.fillRect(138 + i * 5, 60 + (i % 3) * 20, 2, 70);
      // roots/ground
      c.fillStyle = '#4f8a3c';
      c.fillRect(0, 150, W, 30);
      c.fillStyle = '#6aa84a';
      for (let i = 0; i < 70; i++) c.fillRect(Math.floor(rnd(i + 40) * W), 152 + Math.floor(rnd(i + 80) * 26), 1, 2);
      totoroAt(c, s, 3, 100, 168, 1);
      moonAt(c, s, 3, 236, 170, 2);
      // drifting leaves
      c.fillStyle = '#c8e87a';
      for (let i = 0; i < 18; i++) {
        const x = (rnd(i) * W + t * 12 + Math.sin(t + i) * 10) % W;
        const y = (rnd(i + 11) * H + t * 14) % H;
        c.fillRect(Math.floor(x), Math.floor(y), 2, 1);
      }
    }
  },
  {
    caption: 'WINDY SUNSET MEADOW',
    image: 'assets/backgrounds/totoro_scene_4.jpg',
    draw(c, t, s) {
      bands(c, [[0, '#f6a15c'], [0.4, '#f8c17a'], [0.8, '#f4dfa0'], [1, '#bfe0b0']] as any, 0, 120);
      disc(c, 70, 100, 18, '#fff0b8');
      for (let i = 0; i < 5; i++) cloud(c, ((i * 90 + t * 8) % (W + 80)) - 40, 20 + (i % 3) * 18, 1.4 + (i % 2) * 0.5, 'rgba(255,230,200,0.85)');
      // birds
      c.fillStyle = '#5a3a2a';
      for (let i = 0; i < 4; i++) {
        const x = (i * 40 + t * 22) % (W + 20);
        const y = 40 + i * 6 + Math.sin(t * 3 + i) * 3;
        c.fillRect(Math.floor(x), Math.floor(y), 3, 1);
        c.fillRect(Math.floor(x) + 3, Math.floor(y) + 1, 2, 1);
      }
      hills(c, 118, 10, 0.018, 2, '#7ea854');
      hills(c, 138, 8, 0.022, 0.4, '#5f9645');
      c.fillStyle = '#4d8a3a';
      c.fillRect(0, 158, W, 22);
      // swaying grass
      for (let i = 0; i < 220; i++) {
        const x = rnd(i) * W;
        const y = 138 + rnd(i + 1) * 42;
        const sw = Math.sin(t * 2.4 + x * 0.05) * 2;
        c.fillStyle = i % 3 ? '#9ccc65' : '#6fb04f';
        c.fillRect(Math.floor(x + sw), Math.floor(y - 4), 1, 4);
        c.fillRect(Math.floor(x), Math.floor(y), 1, 1);
      }
      totoroAt(c, s, 0, 205, 166, 2);
      moonAt(c, s, 1, 150, 168, 2, Math.floor(t * 3) % 4);
    }
  },
  {
    caption: 'FLIGHT ABOVE THE NIGHT CLOUDS',
    image: 'assets/backgrounds/totoro_scene_5.jpg',
    draw(c, t, s) {
      bands(c, [[0, '#070b24'], [0.6, '#16275a'], [1, '#2c4b8c']] as any, 0, H);
      stars(c, t, 110, 120);
      disc(c, 70, 40, 16, '#fff6d0');
      // swirling cloud sea
      for (let layer = 0; layer < 3; layer++) {
        for (let i = 0; i < 9; i++) {
          const x = ((i * 48 + t * (6 + layer * 5) + layer * 20) % (W + 80)) - 40;
          cloud(c, x, 138 + layer * 14 + Math.sin(t + i) * 2, 2.4 + layer * 0.4, ['#3b5a96', '#5a7db4', '#8ea9d6'][layer]);
        }
      }
      // wind streaks
      c.fillStyle = 'rgba(200,220,255,0.35)';
      for (let i = 0; i < 20; i++) {
        const x = (rnd(i) * W - t * 90 + W * 3) % W;
        c.fillRect(Math.floor(x), Math.floor(30 + rnd(i + 5) * 100), 14, 1);
      }
      // spinning top
      const bob = Math.sin(t * 2) * 4;
      const cx = 170;
      const cy = 118 + bob;
      c.fillStyle = '#8a5a35';
      c.beginPath();
      c.ellipse(cx, cy + 4, 34, 7, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#b8824f';
      c.beginPath();
      c.ellipse(cx, cy, 34, 6, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#6a4425';
      c.beginPath();
      c.moveTo(cx - 12, cy + 6);
      c.lineTo(cx, cy + 22);
      c.lineTo(cx + 12, cy + 6);
      c.closePath();
      c.fill();
      c.fillStyle = '#e8c06a';
      const spin = Math.floor(t * 8) % 4;
      for (let i = 0; i < 4; i++) c.fillRect(cx - 28 + ((i + spin) % 4) * 15, cy - 1, 4, 2);
      totoroAt(c, s, 0, cx - 10, cy + 1, 1);
      moonAt(c, s, 3, cx + 22, cy + 1, 1);
    }
  }
];

// ---------------------------------------------------------------- driver
const imageCache = new Map<string, HTMLImageElement>();

function sceneImage(src?: string): HTMLImageElement | null {
  if (!src) return null;
  let img = imageCache.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    imageCache.set(src, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

/** Draws the painted background with a slow Ken Burns pan/zoom, else the procedural scene. */
function renderScene(c: Ctx, scene: Scene, t: number, localMs: number, s: Sprites): void {
  if (!scene) return;
  const img = sceneImage(scene.image);
  if (!img) {
    c.save();
    c.scale(OUT_SCALE, OUT_SCALE);
    c.imageSmoothingEnabled = false;
    scene.draw(c, t, s);
    c.restore();
    return;
  }
  const k = 1.05 + 0.06 * (localMs / SCENE_MS);
  const sw = img.naturalWidth / k;
  const sh = img.naturalHeight / k;
  const sx = (img.naturalWidth - sw) * (0.5 + 0.4 * Math.sin(t * 0.15));
  const sy = (img.naturalHeight - sh) * 0.5;
  c.imageSmoothingEnabled = true;
  c.drawImage(img, sx, sy, sw, sh, 0, 0, W * OUT_SCALE, H * OUT_SCALE);
}

export function initTitleSlideshow(): void {
  const overlay = document.getElementById('title-screen-overlay');
  const backdrop = overlay?.querySelector('.rpg-title-backdrop') as HTMLElement | null;
  if (!overlay || !backdrop || backdrop.querySelector('canvas')) return;

  const canvas = document.createElement('canvas');
  canvas.width = W * OUT_SCALE;
  canvas.height = H * OUT_SCALE;
  canvas.className = 'title-slideshow-canvas';
  backdrop.appendChild(canvas);

  const caption = document.createElement('div');
  caption.className = 'title-slideshow-caption';
  backdrop.appendChild(caption);

  // "View scene" toggle: fades the menu panel away so the full artwork is visible
  const peekBtn = document.getElementById('btn-title-peek');
  peekBtn?.addEventListener("click", () => {
    const on = overlay.classList.toggle('peek-scene');
    peekBtn.setAttribute('aria-pressed', String(on));
    peekBtn.textContent = on ? '👁 SHOW MENU' : '👁 VIEW SCENE';
  });

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;

  const load = (src: string): HTMLImageElement => {
    const i = new Image();
    i.src = src;
    return i;
  };
  const sprites: Sprites = {
    totoro: load('assets/sprites/characters/totoro.png'),
    moon: load('assets/sprites/characters/moon_walker.png')
  };

  SCENES.forEach(sc => sceneImage(sc.image));

  const buffer = document.createElement('canvas');
  buffer.width = W * OUT_SCALE;
  buffer.height = H * OUT_SCALE;
  const bctx = buffer.getContext('2d')!;
  bctx.imageSmoothingEnabled = false;

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const start = performance.now();
  let lastCaption = '';

  const frame = (now: number): void => {
    requestAnimationFrame(frame);
    if (overlay.hidden || overlay.style.display === 'none' || document.hidden) return;

    const elapsed = reduceMotion ? 0 : Math.max(0, now - start);
    const sceneCount = Math.max(1, SCENES.length);
    const idx = Math.floor(elapsed / SCENE_MS) % sceneCount;
    const local = elapsed % SCENE_MS;
    const t = elapsed / 1000;

    const currentScene = SCENES[idx] || SCENES[0];
    if (!currentScene) return;

    ctx.clearRect(0, 0, W * OUT_SCALE, H * OUT_SCALE);
    renderScene(ctx, currentScene, t, local, sprites);

    // crossfade into next scene during the final FADE_MS
    if (local > SCENE_MS - FADE_MS) {
      const nextIdx = (idx + 1) % sceneCount;
      const nextScene = SCENES[nextIdx] || currentScene;
      bctx.clearRect(0, 0, W * OUT_SCALE, H * OUT_SCALE);
      renderScene(bctx, nextScene, t, 0, sprites);
      ctx.globalAlpha = (local - (SCENE_MS - FADE_MS)) / FADE_MS;
      ctx.drawImage(buffer, 0, 0);
      ctx.globalAlpha = 1;
    }

    const text = currentScene.caption || '';
    if (text !== lastCaption) {
      lastCaption = text;
      caption.textContent = `❖ ${text} ❖`;
    }
  };
  requestAnimationFrame(frame);
}
