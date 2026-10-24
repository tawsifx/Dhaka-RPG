// src/graphics/GroundTileGenerator.ts - Terrain noise, Bayer dithering, grass/forest/sunken/ember/frost/astral tiles
// Migrated 100% intact from game.js

export class GroundTileGenerator {
  static generate(
    makeTex: (key: string, w: number, h: number, drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => void,
    scene?: any
  ) {
    // --- World Ground & Path Tiles ---
    // --- World Ground & Path Tiles (PRO TILESET: seamless, dithered, multi-layer pixel art) ---
    const tk = (() => {
      const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
      const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };
      const mix = (a, b, t) => {
        const A = hex(a), B = hex(b);
        return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
      };
      const rng = seed => {
        let s = seed >>> 0;
        return () => {
          s = (s + 0x6D2B79F5) >>> 0;
          let t = s;
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      };
      // Seamlessly tileable value noise (lattice wraps around the tile)
      const noise = (size, cells, seed) => {
        const r = rng(seed), g = [];
        for (let i = 0; i < cells * cells; i++) g.push(r());
        const wrap = i => ((i % cells) + cells) % cells;
        const sm = t => t * t * (3 - 2 * t);
        return (x, y) => {
          const fx = (x / size) * cells, fy = (y / size) * cells;
          const x0 = Math.floor(fx), y0 = Math.floor(fy);
          const tx = sm(fx - x0), ty = sm(fy - y0);
          const a = g[wrap(y0) * cells + wrap(x0)], b = g[wrap(y0) * cells + wrap(x0 + 1)];
          const c = g[wrap(y0 + 1) * cells + wrap(x0)], d = g[wrap(y0 + 1) * cells + wrap(x0 + 1)];
          const top = a + (b - a) * tx, bot = c + (d - c) * tx;
          return top + (bot - top) * ty;
        };
      };
      const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
      // Wrap-around rectangle: anything crossing an edge re-appears on the opposite side (keeps tiles seamless)
      const px = (ctx, S, x, y, w, h, c) => {
        ctx.fillStyle = c;
        for (let ox = -S; ox <= S; ox += S) for (let oy = -S; oy <= S; oy += S) ctx.fillRect(x + ox, y + oy, w, h);
      };
      // Dithered colour-ramp ground base driven by 2 octaves of tileable noise
      const paintBase = (ctx, S, ramp, seed, cells, contrast) => {
        const n1 = noise(S, cells, seed), n2 = noise(S, cells * 2, seed + 11), n3 = noise(S, cells * 4, seed + 23);
        const img = ctx.createImageData(S, S), L = ramp.length, rgb = ramp.map(hex);
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
          let v = n1(x + .5, y + .5) * 0.55 + n2(x + .5, y + .5) * 0.3 + n3(x + .5, y + .5) * 0.15;
          v = (v - 0.5) * contrast + 0.5 + (bayer[y & 3][x & 3] / 16 - 0.5) * 0.11;
          const c = rgb[Math.max(0, Math.min(L - 1, Math.floor(v * L)))], i = (y * S + x) * 4;
          img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
      };
      // Draw a thin band where a noise field crosses `level` -> organic, seamless cracks / caustics / veins
      const iso = (ctx, S, fn, level, width, color) => {
        ctx.fillStyle = color;
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
          if (Math.abs(fn(x + .5, y + .5) - level) < width) ctx.fillRect(x, y, 1, 1);
        }
      };
      // Colour wash where a noise field is above a threshold (nebula, sand patches, moss...)
      const wash = (ctx, S, fn, thresh, color, maxA, dither) => {
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
          let v = fn(x + .5, y + .5);
          if (dither) v += (bayer[y & 3][x & 3] / 16 - 0.5) * 0.07;
          if (v > thresh) {
            ctx.fillStyle = rgba(color, Math.min(maxA, (v - thresh) * 3.2));
            ctx.fillRect(x, y, 1, 1);
          }
        }
      };
      return { hex, rgba, mix, rng, noise, bayer, px, paintBase, iso, wash };
    })();

    const GS = 128; // ground tile size: big enough that repetition isn't noticeable

    /**
     * @asset-spec
     * @id dhaka-tileset-32
     * @external-png assets/tilesets/dhaka_valley_tileset.png
     * @fallback-procedural dhaka-tileset-32 (128x96)
     * @grid-footprint 4x3 tiles (32x32px unit)
     * @visual-size 128x96px (12 distinct 32x32 tiles)
     * @origin 0, 0
     * @frames 12 tiles (Row 0=Grass, Row 1=Flowers, Row 2=Dirt/Pebbles)
     */
    makeTex('dhaka-tileset-32', 128, 96, (ctx, W, H) => {
      const TS = 32;
      const drawBase = (ox, oy, ramp, seedVal) => {
        const r = tk.rng(seedVal);
        const rgb = ramp.map(tk.hex);
        const n1 = tk.noise(TS, 4, seedVal);
        const n2 = tk.noise(TS, 8, seedVal + 17);
        const img = ctx.createImageData(TS, TS);
        for (let y = 0; y < TS; y++) {
          for (let x = 0; x < TS; x++) {
            let v = n1(x + 0.5, y + 0.5) * 0.65 + n2(x + 0.5, y + 0.5) * 0.35;
            v += (tk.bayer[y & 3][x & 3] / 16 - 0.5) * 0.12;
            const c = rgb[Math.max(0, Math.min(rgb.length - 1, Math.floor(v * rgb.length)))];
            const i = (y * TS + x) * 4;
            img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
          }
        }
        ctx.putImageData(img, ox, oy);
      };

      const grassRamp = ['#4a8944', '#56974b', '#62a053', '#6eab5e', '#7bb96b'];
      const dirtRamp = ['#ba9b6d', '#c7a979', '#d4b786', '#e0c494'];

      // Tile 0: Plain seamless grass
      drawBase(0, 0, grassRamp, 101);

      // Tile 1: Soft mottled grass with micro blades
      drawBase(32, 0, grassRamp, 202);
      ctx.fillStyle = '#3a7439';
      ctx.fillRect(32 + 6, 8, 1, 3); ctx.fillRect(32 + 7, 7, 1, 4); ctx.fillRect(32 + 8, 8, 1, 3);
      ctx.fillStyle = '#8ce070'; ctx.fillRect(32 + 7, 7, 1, 1);
      ctx.fillStyle = '#3a7439';
      ctx.fillRect(32 + 20, 22, 1, 3); ctx.fillRect(32 + 21, 21, 1, 4); ctx.fillRect(32 + 22, 22, 1, 3);
      ctx.fillStyle = '#8ce070'; ctx.fillRect(32 + 21, 21, 1, 1);

      // Tile 2: Grass with fresh tufts
      drawBase(64, 0, grassRamp, 303);
      ctx.fillStyle = '#346b33';
      ctx.fillRect(64 + 12, 14, 1, 4); ctx.fillRect(64 + 13, 13, 1, 5); ctx.fillRect(64 + 14, 14, 1, 4);
      ctx.fillStyle = '#9ae87d'; ctx.fillRect(64 + 13, 13, 1, 1);
      ctx.fillStyle = '#346b33';
      ctx.fillRect(64 + 22, 6, 1, 3); ctx.fillRect(64 + 23, 5, 1, 4);
      ctx.fillStyle = '#9ae87d'; ctx.fillRect(64 + 23, 5, 1, 1);

      // Tile 3: Grass with tiny 4-leaf clovers
      drawBase(96, 0, grassRamp, 404);
      const drawClover = (cx, cy) => {
        ctx.fillStyle = '#2c5e2b';
        ctx.fillRect(cx - 1, cy, 3, 3);
        ctx.fillStyle = '#68c460';
        ctx.fillRect(cx - 1, cy - 1, 1, 1); ctx.fillRect(cx + 1, cy - 1, 1, 1);
        ctx.fillRect(cx - 1, cy + 1, 1, 1); ctx.fillRect(cx + 1, cy + 1, 1, 1);
      };
      drawClover(96 + 8, 10);
      drawClover(96 + 22, 22);

      // Tile 4: Red Krishnachura wild blossom
      drawBase(0, 32, grassRamp, 505);
      // Stem & leaf
      ctx.fillStyle = '#2f6930';
      ctx.fillRect(14, 32 + 16, 2, 4);
      ctx.fillRect(12, 32 + 17, 2, 1); ctx.fillRect(16, 32 + 18, 2, 1);
      // Red Petals
      ctx.fillStyle = '#e84558';
      ctx.fillRect(13, 32 + 12, 4, 4);
      ctx.fillRect(12, 32 + 13, 6, 2);
      ctx.fillStyle = '#ffa4b0';
      ctx.fillRect(14, 32 + 13, 1, 1);
      ctx.fillStyle = '#ffd659';
      ctx.fillRect(15, 32 + 14, 1, 1);

      // Tile 5: Bluebell / Aparajita wild flower
      drawBase(32, 32, grassRamp, 606);
      ctx.fillStyle = '#2f6930';
      ctx.fillRect(32 + 15, 32 + 17, 2, 4);
      ctx.fillRect(32 + 13, 32 + 18, 2, 1);
      // Blue petals
      ctx.fillStyle = '#3d7beb';
      ctx.fillRect(32 + 14, 32 + 13, 4, 4);
      ctx.fillRect(32 + 13, 32 + 14, 6, 2);
      ctx.fillStyle = '#9ec3ff';
      ctx.fillRect(32 + 15, 32 + 14, 1, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(32 + 16, 32 + 15, 1, 1);

      // Tile 6: Jasmine / Golden Yellow Beli blossom
      drawBase(64, 32, grassRamp, 707);
      ctx.fillStyle = '#2f6930';
      ctx.fillRect(64 + 15, 32 + 18, 2, 3);
      // Golden yellow petals
      ctx.fillStyle = '#f5b82e';
      ctx.fillRect(64 + 14, 32 + 14, 4, 4);
      ctx.fillRect(64 + 13, 32 + 15, 6, 2);
      ctx.fillStyle = '#fff4a3';
      ctx.fillRect(64 + 15, 32 + 15, 1, 1);

      // Tile 7: White Jasmine / Daisy duo
      drawBase(96, 32, grassRamp, 808);
      // Flower 1
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(96 + 9, 32 + 10, 3, 3);
      ctx.fillRect(96 + 8, 32 + 11, 5, 1);
      ctx.fillStyle = '#ffbe3b';
      ctx.fillRect(96 + 10, 32 + 11, 1, 1);
      // Flower 2
      ctx.fillStyle = '#fce4ec';
      ctx.fillRect(96 + 21, 32 + 20, 3, 3);
      ctx.fillRect(96 + 20, 32 + 21, 5, 1);
      ctx.fillStyle = '#e91e63';
      ctx.fillRect(96 + 22, 32 + 21, 1, 1);

      // Tile 8: Clean warm dirt & sandy earth (for path borders and busy areas)
      drawBase(0, 64, dirtRamp, 909);

      // Tile 9: Dirt with pebble speckles
      drawBase(32, 64, dirtRamp, 1010);
      ctx.fillStyle = '#8f7754';
      ctx.fillRect(32 + 8, 64 + 12, 3, 2); ctx.fillRect(32 + 22, 64 + 20, 2, 2);
      ctx.fillStyle = '#e8d5b7';
      ctx.fillRect(32 + 9, 64 + 12, 1, 1); ctx.fillRect(32 + 23, 64 + 20, 1, 1);

      // Tile 10: Sandy grass blend (smooth natural fringe)
      drawBase(64, 64, grassRamp, 1111);
      // Soft sand mottling
      ctx.fillStyle = 'rgba(212, 183, 134, 0.45)';
      ctx.fillRect(64 + 4, 64 + 6, 8, 6);
      ctx.fillRect(64 + 18, 64 + 16, 9, 8);
      ctx.fillStyle = 'rgba(168, 140, 98, 0.35)';
      ctx.fillRect(64 + 6, 64 + 8, 4, 2);

      // Tile 11: Lush deep clover grove
      drawBase(96, 64, grassRamp, 1212);
      drawClover(96 + 7, 64 + 8);
      drawClover(96 + 18, 64 + 12);
      drawClover(96 + 12, 64 + 23);
    });

    /**
     * @asset-spec
     * @id tile-grass
     * @external-png assets/tilesets/past_the_future_grass.png
     * @fallback-procedural tile-grass (128x128 seamless)
     * @grid-footprint 1x1 tile (32x32px unit)
     * @visual-size 128x128px
     * @origin 0, 0
     * @frames 1 seamless repeating texture
     */
    makeTex('tile-grass', GS, GS, ctx => {
      const r = tk.rng(101);
      tk.paintBase(ctx, GS, ['#4a8944', '#56974b', '#62a053', '#6eab5e', '#7bb96b'], 7, 8, 2.0);
      // dry-grass / soil mottling
      tk.wash(ctx, GS, tk.noise(GS, 6, 55), 0.62, '#a39a55', 0.30, true);
      // pebbles
      for (let i = 0; i < 5; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        tk.px(ctx, GS, x, y + 2, 4, 1, 'rgba(30,60,30,0.45)');
        tk.px(ctx, GS, x, y, 3, 2, '#8d9488'); tk.px(ctx, GS, x, y, 2, 1, '#c3c9bd'); tk.px(ctx, GS, x + 2, y + 1, 1, 1, '#656c64');
      }
      // grass tufts (3-blade clumps with soft shadow + lit tip)
      for (let i = 0; i < 46; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0, dark = r() < 0.5;
        const b = dark ? '#3a7439' : '#4d9a47', t = dark ? '#6fb35f' : '#9ad884';
        tk.px(ctx, GS, x - 1, y + 4, 5, 1, 'rgba(24,60,28,0.28)');
        tk.px(ctx, GS, x, y + 2, 1, 2, b); tk.px(ctx, GS, x + 1, y, 1, 4, b); tk.px(ctx, GS, x + 2, y + 1, 1, 3, b);
        tk.px(ctx, GS, x + 1, y, 1, 1, t); tk.px(ctx, GS, x + 2, y + 1, 1, 1, t);
      }
      // clover leaves
      for (let i = 0; i < 9; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        tk.px(ctx, GS, x, y, 2, 2, '#3f8a45'); tk.px(ctx, GS, x + 2, y + 1, 2, 2, '#3f8a45'); tk.px(ctx, GS, x - 1, y + 2, 2, 2, '#4a9a50');
        tk.px(ctx, GS, x, y, 1, 1, '#7ed17c');
      }
      // wild flowers
      const petals = ['#fdf6e3', '#f4a6bd', '#ffe27a', '#a9c9f5'];
      for (let i = 0; i < 8; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0, c = petals[i % 4];
        tk.px(ctx, GS, x + 1, y + 3, 1, 2, '#3a7a3c');
        tk.px(ctx, GS, x + 1, y, 1, 3, c); tk.px(ctx, GS, x, y + 1, 3, 1, c); tk.px(ctx, GS, x + 1, y + 1, 1, 1, '#e8a21a');
      }
    });

    /**
     * @asset-spec
     * @id tile-forest
     * @external-png assets/tilesets/realm_forest_tileset.png
     * @fallback-procedural tile-forest (128x128 seamless)
     * @grid-footprint 1x1 tile (32x32px unit)
     * @visual-size 128x128px
     * @origin 0, 0
     * @frames 1 seamless repeating texture
     */
    makeTex('tile-forest', GS, GS, ctx => {
      const r = tk.rng(202);
      tk.paintBase(ctx, GS, ['#15301f', '#1b3a28', '#224731', '#2b553b', '#356346'], 19, 8, 2.0);
      // damp moss mats
      tk.wash(ctx, GS, tk.noise(GS, 6, 81), 0.6, '#4f9a5a', 0.30, true);
      // fallen leaf litter
      const leaves = ['#7a4a2a', '#9c602b', '#bf8438', '#8a5a2e'];
      for (let i = 0; i < 20; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0, c = leaves[i % 4];
        tk.px(ctx, GS, x + 1, y + 2, 4, 1, 'rgba(8,20,14,0.4)');
        tk.px(ctx, GS, x, y, 4, 2, c); tk.px(ctx, GS, x + 1, y - 1, 2, 1, c);
        tk.px(ctx, GS, x + 1, y, 3, 1, tk.mix(c, '#ffffff', 0.25));
      }
      // fern fronds
      for (let i = 0; i < 7; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        [[-4, -3], [-3, -5], [0, -6], [3, -5], [4, -3]].forEach(([dx, dy]) => {
          const n = 5;
          for (let k = 1; k <= n; k++) tk.px(ctx, GS, x + Math.round(dx * k / n * 1.0), y + Math.round(dy * k / n), 1, 1, k > 3 ? '#58b072' : '#2f7a4c');
        });
        tk.px(ctx, GS, x, y, 1, 1, '#1a4a30');
      }
      // twigs
      for (let i = 0; i < 6; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0, d = r() < 0.5 ? 1 : -1;
        for (let k = 0; k < 7; k++) { tk.px(ctx, GS, x + k * d, y + (k >> 1), 1, 1, '#4a3320'); }
        tk.px(ctx, GS, x, y, 1, 1, '#6e4e30');
      }
      // glowing spore flora with halo
      for (let i = 0; i < 9; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        tk.px(ctx, GS, x - 3, y - 1, 8, 4, 'rgba(100,223,150,0.10)');
        tk.px(ctx, GS, x - 1, y - 2, 4, 6, 'rgba(100,223,150,0.12)');
        tk.px(ctx, GS, x, y, 2, 2, '#64df96'); tk.px(ctx, GS, x, y, 1, 1, '#d8ffe8');
      }
    });

    /**
     * @asset-spec
     * @id tile-sunken
     * @external-png assets/tilesets/realm_sunken_tileset.png
     * @fallback-procedural tile-sunken (128x128 seamless)
     * @grid-footprint 1x1 tile (32x32px unit)
     * @visual-size 128x128px
     * @origin 0, 0
     * @frames 1 seamless repeating texture
     */
    makeTex('tile-sunken', GS, GS, ctx => {
      const r = tk.rng(303);
      tk.paintBase(ctx, GS, ['#1b4d69', '#225b78', '#296a87', '#317a96', '#3b8aa3'], 29, 6, 2.0);
      // sandy seabed patches
      tk.wash(ctx, GS, tk.noise(GS, 5, 91), 0.6, '#cdb685', 0.7, true);
      // sand ripples
      for (let i = 0; i < 14; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0, w = 8 + ((r() * 10) | 0);
        for (let k = 0; k < w; k++) {
          const yy = y + Math.round(Math.sin(k / w * Math.PI) * -1.5);
          tk.px(ctx, GS, x + k, yy, 1, 1, 'rgba(255,240,200,0.22)'); tk.px(ctx, GS, x + k, yy + 1, 1, 1, 'rgba(20,60,80,0.22)');
        }
      }
      // animated-looking caustic light web
      const c1 = tk.noise(GS, 4, 301), c2 = tk.noise(GS, 8, 302);
      const cf = (x, y) => c1(x, y) * 0.6 + c2(x, y) * 0.4;
      tk.iso(ctx, GS, cf, 0.5, 0.016, 'rgba(160,240,250,0.16)');
      tk.iso(ctx, GS, cf, 0.5, 0.006, 'rgba(230,255,255,0.32)');
      // seagrass
      for (let i = 0; i < 12; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        for (let k = 0; k < 3; k++) {
          tk.px(ctx, GS, x + k * 2, y + (k === 1 ? -1 : 0), 1, 5 + (k === 1 ? 1 : 0), k === 1 ? '#4fc08a' : '#2f9a72');
        }
        tk.px(ctx, GS, x - 1, y + 5, 7, 1, 'rgba(10,40,60,0.35)');
      }
      // shells + pebbles + coral specks
      for (let i = 0; i < 7; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        tk.px(ctx, GS, x, y + 3, 5, 1, 'rgba(10,40,60,0.35)');
        tk.px(ctx, GS, x, y + 1, 5, 2, '#efe3cc'); tk.px(ctx, GS, x + 1, y, 3, 1, '#f9f2e2');
        tk.px(ctx, GS, x + 2, y + 1, 1, 2, '#d3bfa0');
      }
      const coral = ['#ff8fb0', '#b57af0', '#ffa86b'];
      for (let i = 0; i < 12; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0, c = coral[i % 3];
        tk.px(ctx, GS, x, y, 1, 3, c); tk.px(ctx, GS, x + 1, y + 1, 1, 2, tk.mix(c, '#000000', 0.25)); tk.px(ctx, GS, x - 1, y, 1, 1, c);
      }
      // tiny sparkle bubbles
      for (let i = 0; i < 10; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        tk.px(ctx, GS, x, y, 2, 2, 'rgba(210,245,255,0.55)'); tk.px(ctx, GS, x, y, 1, 1, '#ffffff');
      }
    });

    /**
     * @asset-spec
     * @id tile-ember
     * @external-png assets/tilesets/realm_ember_tileset.png
     * @fallback-procedural tile-ember (128x128 seamless)
     * @grid-footprint 1x1 tile (32x32px unit)
     * @visual-size 128x128px
     * @origin 0, 0
     * @frames 1 seamless repeating texture
     */
    makeTex('tile-ember', GS, GS, ctx => {
      const r = tk.rng(404);
      tk.paintBase(ctx, GS, ['#1b0e0c', '#26140f', '#321c16', '#42271e', '#553429'], 37, 6, 2.0);
      // ash drifts
      tk.wash(ctx, GS, tk.noise(GS, 6, 71), 0.62, '#7a625a', 0.26, true);
      // basalt plate seams (dark) + glowing magma fissures
      const m1 = tk.noise(GS, 4, 401), m2 = tk.noise(GS, 8, 402);
      const mf = (x, y) => m1(x, y) * 0.65 + m2(x, y) * 0.35;
      tk.iso(ctx, GS, mf, 0.5, 0.026, 'rgba(10,4,3,0.7)');
      tk.iso(ctx, GS, mf, 0.5, 0.018, 'rgba(255,110,30,0.20)');
      tk.iso(ctx, GS, mf, 0.5, 0.010, '#ff6a1f');
      tk.iso(ctx, GS, mf, 0.5, 0.0042, '#ffd24d');
      // rock chunks (lit from top-left)
      for (let i = 0; i < 9; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        tk.px(ctx, GS, x + 1, y + 4, 7, 1, 'rgba(0,0,0,0.4)');
        tk.px(ctx, GS, x, y + 1, 7, 3, '#4a2d25'); tk.px(ctx, GS, x + 1, y, 5, 1, '#5e3c31');
        tk.px(ctx, GS, x + 1, y + 1, 3, 1, '#7a5043'); tk.px(ctx, GS, x + 4, y + 3, 3, 1, '#2c1813');
      }
      // flying embers
      const em = ['#ff7b29', '#ffb347', '#ffe08a'];
      for (let i = 0; i < 26; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        if (r() < 0.3) tk.px(ctx, GS, x - 1, y - 1, 3, 3, 'rgba(255,120,40,0.16)');
        tk.px(ctx, GS, x, y, 1, 1, em[(r() * 3) | 0]);
      }
    });

    /**
     * @asset-spec
     * @id tile-frost
     * @external-png assets/tilesets/realm_frost_tileset.png
     * @fallback-procedural tile-frost (128x128 seamless)
     * @grid-footprint 1x1 tile (32x32px unit)
     * @visual-size 128x128px
     * @origin 0, 0
     * @frames 1 seamless repeating texture
     */
    makeTex('tile-frost', GS, GS, ctx => {
      const r = tk.rng(505);
      tk.paintBase(ctx, GS, ['#a3c6e2', '#b3d2ea', '#c3dcf0', '#d3e8f7', '#e5f3fc'], 43, 6, 2.0);
      // wind-packed snow drifts
      tk.wash(ctx, GS, tk.noise(GS, 6, 61), 0.6, '#ffffff', 0.45, true);
      // ice fracture network: dark crack, lit edge
      const f1 = tk.noise(GS, 4, 501), f2 = tk.noise(GS, 8, 502);
      const ff = (x, y) => f1(x, y) * 0.65 + f2(x, y) * 0.35;
      tk.iso(ctx, GS, ff, 0.5, 0.007, 'rgba(98,138,182,0.8)');
      tk.iso(ctx, GS, (x, y) => ff(x - 1, y - 1), 0.5, 0.006, 'rgba(255,255,255,0.6)');
      // snow mounds
      for (let i = 0; i < 12; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0, w = 6 + ((r() * 6) | 0);
        tk.px(ctx, GS, x + 1, y + 3, w, 1, 'rgba(120,160,205,0.45)');
        tk.px(ctx, GS, x, y + 1, w, 2, '#f4fbff'); tk.px(ctx, GS, x + 2, y, w - 4, 1, '#ffffff');
        tk.px(ctx, GS, x + w - 2, y + 2, 2, 1, '#cfe3f3');
      }
      // frozen pebbles
      for (let i = 0; i < 5; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        tk.px(ctx, GS, x, y + 2, 4, 1, 'rgba(90,130,175,0.5)');
        tk.px(ctx, GS, x, y, 3, 2, '#7f9db8'); tk.px(ctx, GS, x, y, 2, 1, '#b4cde0');
      }
      // ice glints
      for (let i = 0; i < 10; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        tk.px(ctx, GS, x - 1, y, 3, 1, 'rgba(255,255,255,0.7)'); tk.px(ctx, GS, x, y - 1, 1, 3, 'rgba(255,255,255,0.7)');
        tk.px(ctx, GS, x, y, 1, 1, '#ffffff');
      }
    });

    /**
     * @asset-spec
     * @id tile-astral
     * @external-png assets/tilesets/realm_astral_tileset.png
     * @fallback-procedural tile-astral (128x128 seamless)
     * @grid-footprint 1x1 tile (32x32px unit)
     * @visual-size 128x128px
     * @origin 0, 0
     * @frames 1 seamless repeating texture
     */
    makeTex('tile-astral', GS, GS, ctx => {
      const r = tk.rng(606);
      tk.paintBase(ctx, GS, ['#0d0820', '#130c2b', '#1a1235', '#221842', '#2b1f54'], 53, 5, 2.0);
      // nebula clouds
      tk.wash(ctx, GS, tk.noise(GS, 3, 601), 0.55, '#b4379a', 0.16, true);
      tk.wash(ctx, GS, tk.noise(GS, 5, 602), 0.58, '#3a7bd5', 0.14, true);
      // celestial floor plates (bevelled seams every 64px, wraps perfectly)
      const half = GS / 2;
      for (let g = 0; g < 2; g++) {
        const o = g * half;
        tk.px(ctx, GS, o, 0, 1, GS, 'rgba(6,3,16,0.55)'); tk.px(ctx, GS, o + 1, 0, 1, GS, 'rgba(120,90,220,0.32)');
        tk.px(ctx, GS, 0, o, GS, 1, 'rgba(6,3,16,0.55)'); tk.px(ctx, GS, 0, o + 1, GS, 1, 'rgba(120,90,220,0.32)');
      }
      // rune nodes at plate corners
      for (let gx = 0; gx < 2; gx++) for (let gy = 0; gy < 2; gy++) {
        const x = gx * half, y = gy * half;
        tk.px(ctx, GS, x - 3, y - 3, 7, 7, 'rgba(247,203,69,0.10)');
        tk.px(ctx, GS, x - 1, y, 3, 1, '#f7cb45'); tk.px(ctx, GS, x, y - 1, 1, 3, '#f7cb45');
        tk.px(ctx, GS, x, y, 1, 1, '#fff3b8');
      }
      // star dust
      const sc = ['#ffffff', '#f7cb45', '#9fd0ff', '#e2b5ff'];
      for (let i = 0; i < 70; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0;
        tk.px(ctx, GS, x, y, 1, 1, tk.rgba(sc[(r() * 4) | 0], 0.45 + r() * 0.55));
      }
      // 4-point twinkle stars
      for (let i = 0; i < 7; i++) {
        const x = (r() * GS) | 0, y = (r() * GS) | 0, c = sc[i % 4];
        tk.px(ctx, GS, x - 3, y - 3, 7, 7, tk.rgba(c, 0.07));
        tk.px(ctx, GS, x - 2, y, 5, 1, tk.rgba(c, 0.45)); tk.px(ctx, GS, x, y - 2, 1, 5, tk.rgba(c, 0.45));
        tk.px(ctx, GS, x - 1, y, 3, 1, c); tk.px(ctx, GS, x, y - 1, 1, 3, c);
      }
    });

    // Cobble & Flagstone path: irregular bevelled stones, mortar gaps, per-world decoration
    const makePathVariant = (key: string, mortar: string, stoneA: string, stoneB: string, deco: any = null) => {
      makeTex(key, 48, 48, ctx => {
        const S = 48, r = tk.rng(key.length * 977 + stoneA.charCodeAt(2) * 31 + stoneB.charCodeAt(4));
        // Deep rich earth / mortar base with fine gravel speckles
        ctx.fillStyle = tk.mix(mortar, '#1b120c', 0.45); ctx.fillRect(0, 0, S, S);
        for (let g = 0; g < 18; g++) {
          ctx.fillStyle = tk.mix(mortar, '#000000', 0.2 + r() * 0.3);
          ctx.fillRect((r() * S) | 0, (r() * S) | 0, 1.5, 1.5);
        }

        // Varied Interlocking Flagstones Pattern
        const rows = [
          [{ w: 15, h: 11, ox: 0 }, { w: 19, h: 11, ox: 1 }, { w: 12, h: 11, ox: 1 }],
          [{ w: 22, h: 11, ox: 1 }, { w: 13, h: 11, ox: 1 }, { w: 11, h: 11, ox: 1 }],
          [{ w: 12, h: 11, ox: 0 }, { w: 18, h: 11, ox: 1 }, { w: 16, h: 11, ox: 1 }],
          [{ w: 17, h: 11, ox: 1 }, { w: 15, h: 11, ox: 1 }, { w: 14, h: 11, ox: 1 }]
        ];

        rows.forEach((rowStones, ri) => {
          let x0 = 1; const y0 = ri * 12 + 1;
          rowStones.forEach(st => {
            const sx = x0, sy = y0, sw = st.w - 2, sh = st.h - 2;
            let c = tk.mix(stoneA, stoneB, r());
            c = tk.mix(c, r() < 0.5 ? '#ffffff' : '#000000', 0.04 + r() * 0.08);

            const lit = tk.mix(c, '#ffffff', 0.38);
            const lit2 = tk.mix(c, '#ffffff', 0.18);
            const shd = tk.mix(c, '#000000', 0.36);
            const shd2 = tk.mix(c, '#000000', 0.18);

            // Main stone face
            tk.px(ctx, S, sx, sy, sw, sh, c);

            // Double bevel 3D relief
            tk.px(ctx, S, sx, sy, sw, 1, lit);                     // Top sunlit edge
            tk.px(ctx, S, sx, sy + 1, 1, sh - 2, lit2);             // Left edge
            tk.px(ctx, S, sx + sw - 1, sy + 1, 1, sh - 2, shd2);    // Right shade
            tk.px(ctx, S, sx, sy + sh - 1, sw, 1, shd);             // Bottom cast shadow

            // Rounded corners for natural dressed stone
            tk.px(ctx, S, sx, sy, 1, 1, tk.mix(mortar, '#1b120c', 0.45));
            tk.px(ctx, S, sx + sw - 1, sy, 1, 1, tk.mix(mortar, '#1b120c', 0.45));
            tk.px(ctx, S, sx, sy + sh - 1, 1, 1, tk.mix(mortar, '#1b120c', 0.45));
            tk.px(ctx, S, sx + sw - 1, sy + sh - 1, 1, 1, tk.mix(mortar, '#1b120c', 0.45));

            // Surface chisel grain & mineral flecks
            for (let k = 0; k < 5; k++) {
              const gx = sx + 2 + ((r() * (sw - 4)) | 0);
              const gy = sy + 2 + ((r() * (sh - 4)) | 0);
              tk.px(ctx, S, gx, gy, 1, 1, r() < 0.5 ? lit2 : shd2);
            }

            // Occasional natural weathered hairline crack
            if (r() < 0.35) {
              const cx = sx + 3 + ((r() * (sw - 6)) | 0);
              const cy = sy + 2;
              for (let k = 0; k < 3; k++) tk.px(ctx, S, cx + (k % 2), cy + k, 1, 1, shd);
            }

            // Mortar moss & fallen flower sprinkle
            if (deco === 'moss' || (key === 'tile-path' && r() < 0.28)) {
              tk.px(ctx, S, sx + 1, sy, 3, 1, '#4d8038');
              tk.px(ctx, S, sx + 2, sy + 1, 2, 1, '#3b6b28');
            } else if (deco === 'coral') {
              if (r() < 0.5) { tk.px(ctx, S, sx + 3, sy + 4, 1, 2, '#ff8fb0'); tk.px(ctx, S, sx + 4, sy + 5, 1, 1, '#b57af0'); }
            } else if (deco === 'ember') {
              tk.px(ctx, S, x0, sy + 2, 1, 5, 'rgba(255,110,30,0.75)'); tk.px(ctx, S, x0, sy + 3, 1, 2, '#ffd24d');
            } else if (deco === 'ice') {
              tk.px(ctx, S, sx + 1, sy, sw - 2, 1, '#ffffff');
            } else if (deco === 'star') {
              if (r() < 0.55) { tk.px(ctx, S, sx + 4, sy + 4, 1, 1, '#f7cb45'); }
            }

            x0 += st.w;
          });
        });
      });
    };
    makePathVariant('tile-path', '#785338', '#ebd8be', '#cfb495');
    makePathVariant('tile-path-moss', '#3d5e3a', '#688f5e', '#52774a', 'moss');
    makePathVariant('tile-path-coral', '#488aa3', '#8fd3e8', '#6db6cf', 'coral');
    makePathVariant('tile-path-stone', '#2e1d1a', '#6e473b', '#52332a', 'ember');
    makePathVariant('tile-path-ice', '#7fa6c4', '#e1f2ff', '#bcdcf3', 'ice');
    makePathVariant('tile-path-star', '#342461', '#7d5cc4', '#5a3fa0', 'star');

    // --- NEW PATHWAY TYPE 2: Mughal Heritage Red-Brick Herringbone (Lal-Eet / Curzon & DU Academic Walks) ---
    makeTex('tile-path-brick', 48, 48, ctx => {
      const S = 48, r = tk.rng(7711);
      // Lime-sand mortar bed
      ctx.fillStyle = '#593628'; ctx.fillRect(0, 0, S, S);
      const brickPal = ['#a8382b', '#bf4636', '#942c20', '#c9533c', '#87261b'];
      // Interlocking running & herringbone brick courses (8 rows of 6px)
      for (let row = 0; row < 8; row++) {
        const y = row * 6;
        const offset = (row % 2) * 6 + ((row >> 1) % 2) * 3;
        for (let col = 0; col < 4; col++) {
          const x = (col * 12 + offset) % S;
          const bw = 11, bh = 5;
          const c = brickPal[(row * 3 + col + ((r() * 3) | 0)) % brickPal.length];
          const lit = tk.mix(c, '#ffd6b8', 0.28);
          const shd = tk.mix(c, '#1f0a06', 0.36);
          tk.px(ctx, S, x, y, bw, bh, c);
          tk.px(ctx, S, x, y, bw, 1, lit);
          tk.px(ctx, S, x, y + 1, 1, bh - 2, lit);
          tk.px(ctx, S, x, y + bh - 1, bw, 1, shd);
          tk.px(ctx, S, x + bw - 1, y + 1, 1, bh - 2, shd);
          // Kiln-fired clay speckles
          if (r() < 0.45) {
            tk.px(ctx, S, x + 2 + ((r() * 6) | 0), y + 2, 2, 1, r() < 0.5 ? lit : shd);
          }
          // Subtle monsoon moss in mortar joints
          if (r() < 0.18) {
            tk.px(ctx, S, x + 1, y + bh, 3, 1, '#4a7c36');
          }
        }
      }
      // Occasional fallen crimson Krishnachura petal on the warm bricks
      for (let p = 0; p < 2; p++) {
        const px = (r() * 40 + 4) | 0, py = (r() * 40 + 4) | 0;
        ctx.fillStyle = '#e11d48'; ctx.fillRect(px, py, 2, 2);
        ctx.fillStyle = '#fda4af'; ctx.fillRect(px, py, 1, 1);
      }
    });

    // --- NEW PATHWAY TYPE 3: Chini-Tikri Mosaic & Cobblestone Courtyard Plaza ---
    makeTex('tile-path-plaza', 64, 64, ctx => {
      const S = 64, r = tk.rng(8823);
      ctx.fillStyle = '#473c35'; ctx.fillRect(0, 0, S, S);
      // 4x4 grid of 16x16 ornamental octagonal sandstone & Chini-tikri ceramic diamond inlays
      for (let gy = 0; gy < 4; gy++) {
        for (let gx = 0; gx < 4; gx++) {
          const ox = gx * 16, oy = gy * 16;
          const isAlt = (gx + gy) % 2 === 0;
          const base = isAlt ? '#efe2cc' : '#dfd0b8';
          const lit = '#fbf5ea';
          const shd = '#9e8c74';
          // Octagonal slab
          ctx.fillStyle = base;
          ctx.fillRect(ox + 2, oy + 1, 12, 14);
          ctx.fillRect(ox + 1, oy + 2, 14, 12);
          ctx.fillStyle = lit;
          ctx.fillRect(ox + 2, oy + 1, 12, 1);
          ctx.fillRect(ox + 1, oy + 2, 1, 12);
          ctx.fillStyle = shd;
          ctx.fillRect(ox + 2, oy + 14, 12, 1);
          ctx.fillRect(ox + 14, oy + 2, 1, 12);
          // Center Chini-tikri glazed ceramic motif
          ctx.fillStyle = isAlt ? '#c2410c' : '#0284c7';
          ctx.fillRect(ox + 7, oy + 6, 2, 4);
          ctx.fillRect(ox + 6, oy + 7, 4, 2);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(ox + 7, oy + 7, 2, 2);
          // Corner diamond keystones at intersections
          ctx.fillStyle = '#8c2d19';
          ctx.fillRect(ox, oy, 2, 2);
          ctx.fillRect(ox + 14, oy + 14, 2, 2);
        }
      }
      // Subtle surface texture
      for (let i = 0; i < 24; i++) {
        ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)';
        ctx.fillRect((r() * S) | 0, (r() * S) | 0, 1, 1);
      }
    });

    // --- NEW PATHWAY TYPE 4: Ramna Garden Stepping Stones & Laterite Pebble Trail ---
    makeTex('tile-path-stepping', 64, 64, ctx => {
      const S = 64, r = tk.rng(9941);
      // Lush meadow grass base so stepping stones blend seamlessly with the park lawn
      tk.paintBase(ctx, S, ['#4a8944', '#56974b', '#62a053', '#6eab5e'], 7, 4, 1.8);
      // Warm laterite (Lal Mati) & pea-gravel organic trail bed down the middle
      const gravelCols = ['#b88a5e', '#c99b6e', '#9c7148', '#d9b289'];
      for (let i = 0; i < 110; i++) {
        const gx = (r() * S) | 0, gy = (r() * S) | 0;
        ctx.fillStyle = gravelCols[(i + ((r() * 4) | 0)) % 4];
        ctx.fillRect(gx, gy, r() < 0.4 ? 3 : 2, 2);
      }
      // Natural rounded river-slate & sandstone stepping slabs
      const slabs = [
        { x: 6, y: 5, w: 20, h: 14, c: '#d8ccb8' },
        { x: 34, y: 7, w: 22, h: 15, c: '#c4b59f' },
        { x: 14, y: 24, w: 22, h: 14, c: '#cbbba4' },
        { x: 42, y: 26, w: 17, h: 13, c: '#dfd3c0' },
        { x: 5, y: 44, w: 23, h: 14, c: '#c7b8a1' },
        { x: 33, y: 45, w: 22, h: 15, c: '#d6c8b4' }
      ];
      slabs.forEach(s => {
        // Drop shadow
        ctx.fillStyle = 'rgba(22, 48, 22, 0.55)';
        ctx.fillRect(s.x + 1, s.y + 2, s.w - 2, s.h - 1);
        // Rounded stone body
        ctx.fillStyle = s.c;
        ctx.fillRect(s.x + 2, s.y, s.w - 4, s.h);
        ctx.fillRect(s.x, s.y + 2, s.w, s.h - 4);
        ctx.fillRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
        // Top sunlit bevel
        ctx.fillStyle = tk.mix(s.c, '#ffffff', 0.35);
        ctx.fillRect(s.x + 2, s.y, s.w - 4, 1);
        ctx.fillRect(s.x + 1, s.y + 1, s.w - 3, 1);
        // Bottom shade bevel
        ctx.fillStyle = tk.mix(s.c, '#000000', 0.32);
        ctx.fillRect(s.x + 2, s.y + s.h - 1, s.w - 4, 1);
        // Tiny clover / grass blade overlapping stone corner
        ctx.fillStyle = '#3a7439';
        ctx.fillRect(s.x + s.w - 3, s.y + s.h - 3, 2, 3);
        ctx.fillStyle = '#8ce070';
        ctx.fillRect(s.x + s.w - 3, s.y + s.h - 4, 1, 1);
      });
    });

    // --- NEW PATHWAY TYPE 5: Pastoral Country Loam & Cobble Wheel-Track Lane (Farmhouse Road) ---
    makeTex('tile-path-dirt', 48, 48, ctx => {
      const S = 48, r = tk.rng(5519);
      tk.paintBase(ctx, S, ['#8c643e', '#9c7248', '#ab8054', '#b88e62'], 31, 4, 1.7);
      // Subtle compacted cart/rickshaw wheel ruts & embedded fieldstone cobbles
      for (let y = 0; y < S; y += 8) {
        // Left & right rustic fieldstone cobble border stones
        const cL = r() < 0.5 ? '#b5a28c' : '#9e8b76';
        const cR = r() < 0.5 ? '#ad9a84' : '#c2b09b';
        ctx.fillStyle = 'rgba(35,20,10,0.45)';
        ctx.fillRect(3, y + 2, 8, 6);
        ctx.fillRect(S - 11, y + 2, 8, 6);
        ctx.fillStyle = cL; ctx.fillRect(3, y + 1, 7, 5);
        ctx.fillStyle = '#dfd3c3'; ctx.fillRect(4, y + 1, 5, 1);
        ctx.fillStyle = cR; ctx.fillRect(S - 11, y + 1, 7, 5);
        ctx.fillStyle = '#dfd3c3'; ctx.fillRect(S - 10, y + 1, 5, 1);
      }
      //Scattered pebbles & clover tufts
      for (let i = 0; i < 14; i++) {
        const px = 12 + ((r() * 24) | 0), py = (r() * S) | 0;
        ctx.fillStyle = r() < 0.5 ? '#735030' : '#cfa87e';
        ctx.fillRect(px, py, 2, 2);
      }
      for (let i = 0; i < 5; i++) {
        const gx = (r() < 0.5 ? 1 : S - 4), gy = (r() * S) | 0;
        ctx.fillStyle = '#4a8944'; ctx.fillRect(gx, gy, 3, 3);
        ctx.fillStyle = '#8ce070'; ctx.fillRect(gx + 1, gy, 1, 1);
      }
    });

    // --- NEW PATHWAY TYPE 6: Weathered Teakwood Boardwalk & Bridge Decking ---
    makeTex('tile-path-boardwalk', 48, 48, ctx => {
      const S = 48, r = tk.rng(6637);
      ctx.fillStyle = '#2b180d'; ctx.fillRect(0, 0, S, S);
      // 6 horizontal weathered teak planks (8px each)
      const woods = ['#73482b', '#825334', '#694025', '#7a4d2f'];
      for (let i = 0; i < 6; i++) {
        const y = i * 8;
        const c = woods[i % woods.length];
        ctx.fillStyle = c; ctx.fillRect(0, y, S, 7);
        ctx.fillStyle = tk.mix(c, '#ffd6b0', 0.22); ctx.fillRect(0, y, S, 1);
        ctx.fillStyle = tk.mix(c, '#1a0d06', 0.35); ctx.fillRect(0, y + 6, S, 1);
        // Wood grain streaks
        ctx.fillStyle = tk.mix(c, '#3d2212', 0.25);
        ctx.fillRect(6 + ((i * 11) % 18), y + 3, 14, 1);
        ctx.fillRect(28 + ((i * 7) % 12), y + 4, 10, 1);
        // Side rail beam & brass nail heads
        ctx.fillStyle = '#52301b';
        ctx.fillRect(0, y, 3, 7); ctx.fillRect(S - 3, y, 3, 7);
        ctx.fillStyle = '#d4a359';
        ctx.fillRect(4, y + 2, 2, 2); ctx.fillRect(S - 6, y + 2, 2, 2);
      }
    });

    // --- NATURAL PATHWAY END-CAPS, CURBS, STEPPING TRAILS & PLAZA MEDALLIONS ---
    // Generates rounded, feathered stone/brick/dirt pathway end-caps so pathways never terminate with a harsh cut
    const makePathCap = (key: string, dir: 'n' | 's' | 'e' | 'w', style: 'stone' | 'brick' | 'dirt') => {
      const isHoriz = dir === 'e' || dir === 'w';
      const W = isHoriz ? 56 : 96;
      const H = isHoriz ? 96 : 56;
      makeTex(key, W, H, ctx => {
        const r = tk.rng(key.length * 419 + dir.charCodeAt(0) * 73);
        const pal = style === 'brick'
          ? { mortar: '#593628', a: '#a8382b', b: '#c9533c', curb: '#d4bfa0' }
          : style === 'dirt'
            ? { mortar: '#6e4e30', a: '#9c7248', b: '#b88e62', curb: '#b5a28c' }
            : { mortar: '#65462e', a: '#ebd8be', b: '#cfb495', curb: '#f5e8d3' };

        // Semi-elliptical arch mask anchored at the connected edge
        const cx = dir === 'w' ? W : dir === 'e' ? 0 : W / 2;
        const cy = dir === 'n' ? H : dir === 's' ? 0 : H / 2;
        const rx = isHoriz ? 38 : 46;
        const ry = isHoriz ? 46 : 38;

        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const dx = (x - cx) / rx;
            const dy = (y - cy) / ry;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d <= 0.88) {
              // Inner paved arch
              const isJoint = ((x + (y >> 3) * 5) % 11 === 0) || (y % 9 === 0);
              ctx.fillStyle = isJoint ? pal.mortar : ( ((x >> 3) + (y >> 3)) % 2 === 0 ? pal.a : pal.b );
              ctx.fillRect(x, y, 1, 1);
            } else if (d <= 1.0) {
              // Dressed bevelled arch curb ring
              ctx.fillStyle = d < 0.94 ? pal.curb : tk.mix(pal.mortar, '#1f381e', 0.5);
              ctx.fillRect(x, y, 1, 1);
            }
          }
        }

        // Tapered outer stepping stones & pebbles beyond the arch (dissolving naturally into the lawn)
        const numStones = 9;
        for (let i = 0; i < numStones; i++) {
          const angle = -Math.PI * 0.42 + (i / (numStones - 1)) * Math.PI * 0.84;
          const dist = 1.04 + (i % 2) * 0.16 + r() * 0.08;
          let sx = cx, sy = cy;
          if (dir === 'n') { sx = cx + Math.sin(angle) * rx * 0.9; sy = cy - Math.cos(angle) * ry * dist; }
          if (dir === 's') { sx = cx + Math.sin(angle) * rx * 0.9; sy = cy + Math.cos(angle) * ry * dist; }
          if (dir === 'w') { sx = cx - Math.cos(angle) * rx * dist; sy = cy + Math.sin(angle) * ry * 0.9; }
          if (dir === 'e') { sx = cx + Math.cos(angle) * rx * dist; sy = cy + Math.sin(angle) * ry * 0.9; }
          const sw = (i % 2 === 0) ? 7 : 5;
          const sh = (i % 2 === 0) ? 5 : 4;
          const ix = Math.round(sx - sw / 2), iy = Math.round(sy - sh / 2);
          ctx.fillStyle = 'rgba(24, 52, 24, 0.45)';
          ctx.fillRect(ix + 1, iy + 2, sw, sh);
          ctx.fillStyle = i % 2 === 0 ? pal.a : pal.curb;
          ctx.fillRect(ix, iy, sw, sh);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(ix + 1, iy, sw - 2, 1);
        }

        // Soft grass blades & clover tufts overlapping the curb border
        for (let i = 0; i < 14; i++) {
          const angle = -Math.PI * 0.46 + (i / 13) * Math.PI * 0.92;
          let gx = cx, gy = cy;
          if (dir === 'n') { gx = cx + Math.sin(angle) * rx * 0.95; gy = cy - Math.cos(angle) * ry * 0.96; }
          if (dir === 's') { gx = cx + Math.sin(angle) * rx * 0.95; gy = cy + Math.cos(angle) * ry * 0.96; }
          if (dir === 'w') { gx = cx - Math.cos(angle) * rx * 0.96; gy = cy + Math.sin(angle) * ry * 0.95; }
          if (dir === 'e') { gx = cx + Math.cos(angle) * rx * 0.96; gy = cy + Math.sin(angle) * ry * 0.95; }
          ctx.fillStyle = '#3a7439';
          ctx.fillRect(Math.round(gx), Math.round(gy), 2, 3);
          ctx.fillStyle = '#8ce070';
          ctx.fillRect(Math.round(gx), Math.round(gy) - 1, 1, 2);
        }
      });
    };

    (['n', 's', 'e', 'w'] as const).forEach(d => {
      makePathCap(`path-cap-stone-${d}`, d, 'stone');
      makePathCap(`path-cap-brick-${d}`, d, 'brick');
      makePathCap(`path-cap-dirt-${d}`, d, 'dirt');
    });

    // Roadside Dressed Curb Edging (Horizontal & Vertical) with grass tuft overhang
    makeTex('tile-curb-h', 64, 12, ctx => {
      ctx.fillStyle = 'rgba(25, 50, 25, 0.42)'; ctx.fillRect(0, 0, 64, 12);
      for (let x = 0; x < 64; x += 16) {
        ctx.fillStyle = '#e5d3b8'; ctx.fillRect(x + 1, 2, 14, 8);
        ctx.fillStyle = '#fff5e4'; ctx.fillRect(x + 1, 2, 14, 2);
        ctx.fillStyle = '#9c8468'; ctx.fillRect(x + 1, 8, 14, 2);
        // Grass tuft overlapping outer edge
        ctx.fillStyle = '#4a8944'; ctx.fillRect(x + 5, 0, 3, 3); ctx.fillRect(x + 11, 9, 3, 3);
        ctx.fillStyle = '#8ce070'; ctx.fillRect(x + 6, 0, 1, 1);
      }
    });

    makeTex('tile-curb-v', 12, 64, ctx => {
      ctx.fillStyle = 'rgba(25, 50, 25, 0.42)'; ctx.fillRect(0, 0, 12, 64);
      for (let y = 0; y < 64; y += 16) {
        ctx.fillStyle = '#e5d3b8'; ctx.fillRect(2, y + 1, 8, 14);
        ctx.fillStyle = '#fff5e4'; ctx.fillRect(2, y + 1, 2, 14);
        ctx.fillStyle = '#9c8468'; ctx.fillRect(8, y + 1, 2, 14);
        ctx.fillStyle = '#4a8944'; ctx.fillRect(0, y + 5, 3, 3); ctx.fillRect(9, y + 11, 3, 3);
        ctx.fillStyle = '#8ce070'; ctx.fillRect(0, y + 6, 1, 1);
      }
    });

    // Organic Stepping-Stone Dissipation Trail (Transparent overlay for natural path endings & garden entries)
    makeTex('prop-stepping-trail-h', 96, 48, ctx => {
      const stones = [
        { x: 6, y: 12, w: 18, h: 12, c: '#dfd1bc' },
        { x: 10, y: 27, w: 15, h: 10, c: '#cbb99e' },
        { x: 30, y: 16, w: 16, h: 12, c: '#e6d9c6' },
        { x: 48, y: 24, w: 13, h: 10, c: '#d1bfa6' },
        { x: 54, y: 11, w: 11, h: 8, c: '#dfd1bc' },
        { x: 68, y: 19, w: 10, h: 8, c: '#c9b79c' },
        { x: 82, y: 22, w: 7, h: 5, c: '#dfd1bc' },
        { x: 88, y: 15, w: 5, h: 4, c: '#cbb99e' }
      ];
      stones.forEach(s => {
        ctx.fillStyle = 'rgba(20, 45, 20, 0.45)';
        ctx.fillRect(s.x + 1, s.y + 2, s.w, s.h);
        ctx.fillStyle = s.c;
        ctx.fillRect(s.x + 1, s.y, s.w - 2, s.h);
        ctx.fillRect(s.x, s.y + 1, s.w, s.h - 2);
        ctx.fillStyle = '#fff8eb';
        ctx.fillRect(s.x + 1, s.y, s.w - 2, 1);
        ctx.fillStyle = '#8c775c';
        ctx.fillRect(s.x + 1, s.y + s.h - 1, s.w - 2, 1);
      });
    });

    makeTex('prop-stepping-trail-v', 48, 96, ctx => {
      const stones = [
        { x: 12, y: 6, w: 14, h: 16, c: '#dfd1bc' },
        { x: 27, y: 10, w: 11, h: 14, c: '#cbb99e' },
        { x: 15, y: 28, w: 15, h: 14, c: '#e6d9c6' },
        { x: 24, y: 46, w: 12, h: 12, c: '#d1bfa6' },
        { x: 10, y: 52, w: 10, h: 9, c: '#dfd1bc' },
        { x: 18, y: 66, w: 10, h: 9, c: '#c9b79c' },
        { x: 22, y: 80, w: 7, h: 6, c: '#dfd1bc' },
        { x: 14, y: 88, w: 5, h: 4, c: '#cbb99e' }
      ];
      stones.forEach(s => {
        ctx.fillStyle = 'rgba(20, 45, 20, 0.45)';
        ctx.fillRect(s.x + 1, s.y + 2, s.w, s.h);
        ctx.fillStyle = s.c;
        ctx.fillRect(s.x + 1, s.y, s.w - 2, s.h);
        ctx.fillRect(s.x, s.y + 1, s.w, s.h - 2);
        ctx.fillStyle = '#fff8eb';
        ctx.fillRect(s.x + 1, s.y, s.w - 2, 1);
        ctx.fillStyle = '#8c775c';
        ctx.fillRect(s.x + 1, s.y + s.h - 1, s.w - 2, 1);
      });
    });

    // Circular Chini-Tikri & Sandstone Plaza Medallions (For Road Junctions, Fountains & Landmarks)
    const makePlazaCircle = (key: string, S: number, accentCol: string) => {
      makeTex(key, S, S, ctx => {
        const cx = S / 2, cy = S / 2, R = S / 2 - 4;
        for (let y = 0; y < S; y++) {
          for (let x = 0; x < S; x++) {
            const dx = x - cx + 0.5, dy = y - cy + 0.5;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > R) continue;
            const ratio = d / R;
            const angle = Math.atan2(dy, dx);
            const spoke = Math.abs(Math.sin(angle * 8)) < 0.08;
            const ringJoint = Math.abs((d % 12) - 6) < 0.9;
            if (ratio > 0.90) {
              // Outer dressed sandstone curb ring
              ctx.fillStyle = ratio > 0.96 ? '#594230' : '#f2e3cb';
            } else if (ratio > 0.78) {
              // Mughal terracotta brick accent band
              ctx.fillStyle = (spoke || ringJoint) ? '#593628' : accentCol;
            } else if (ratio < 0.22) {
              // Center lotus star medallion
              ctx.fillStyle = ratio < 0.09 ? '#fef08a' : accentCol;
            } else {
              // Concentric fan cobblestone paving
              ctx.fillStyle = (spoke || ringJoint) ? '#6e5239' : (((Math.floor(d / 12) + Math.floor((angle + Math.PI) * 5)) % 2 === 0) ? '#ead7bd' : '#d6be9f');
            }
            ctx.fillRect(x, y, 1, 1);
          }
        }
      });
    };
    makePlazaCircle('prop-plaza-medallion', 136, '#b43e2b');
    makePlazaCircle('prop-plaza-ring', 192, '#9e2f24');

    // --- UPGRADED WATER, SHALLOW COVES, STEPPED BENGALI GHATS & ARCHED BRIDGE ---
    makeTex('tile-water', 64, 64, ctx => {
      const S = 64;
      tk.paintBase(ctx, S, ['#174969', '#1d587d', '#246891', '#2c78a4', '#3588b5'], 901, 4, 1.8);
      // Shimmering caustic wave bands
      const w1 = tk.noise(S, 4, 911), w2 = tk.noise(S, 8, 922);
      const wf = (x: number, y: number) => w1(x, y) * 0.6 + w2(x, y) * 0.4;
      tk.iso(ctx, S, wf, 0.52, 0.022, 'rgba(126, 208, 242, 0.28)');
      tk.iso(ctx, S, wf, 0.52, 0.008, 'rgba(224, 247, 255, 0.55)');
      // Crisp horizontal surface wave glints
      ctx.fillStyle = 'rgba(186, 235, 255, 0.65)';
      [[6, 10, 14], [34, 22, 18], [16, 38, 16], [40, 52, 14]].forEach(([x, y, w]) => {
        ctx.fillRect(x, y, w, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 3, y, Math.max(4, w - 8), 1);
        ctx.fillStyle = 'rgba(186, 235, 255, 0.65)';
      });
    });

    makeTex('tile-water-shallow', 64, 64, ctx => {
      const S = 64;
      tk.paintBase(ctx, S, ['#24708f', '#2b82a1', '#3494b2', '#41a6c2', '#52b7d1'], 955, 4, 1.7);
      // Warm submerged sandy-pebble shimmer & gentle ripples
      tk.wash(ctx, S, tk.noise(S, 4, 961), 0.58, '#a7e8f2', 0.25, true);
      ctx.fillStyle = 'rgba(230, 252, 255, 0.7)';
      [[8, 14, 12], [36, 30, 14], [18, 48, 15]].forEach(([x, y, w]) => ctx.fillRect(x, y, w, 1.5));
    });

    makeTex('tile-lava', 64, 64, ctx => {
      ctx.fillStyle = '#8c2211'; ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#ff6b1a'; ctx.fillRect(0, 10, 64, 12); ctx.fillRect(0, 40, 64, 12);
      ctx.fillStyle = '#ffdf4d'; ctx.fillRect(12, 14, 18, 4); ctx.fillRect(36, 44, 20, 4);
    });

    // Dressed Stone & Brick Lake Embankment (with coping stones, moss & shoreline foam)
    makeTex('tile-bank', 48, 48, ctx => {
      ctx.fillStyle = '#4a3f39'; ctx.fillRect(0, 0, 48, 48);
      for (let y = 1; y < 47; y += 12) {
        const isBrick = (y / 12) % 2 === 1;
        ctx.fillStyle = isBrick ? '#9e4738' : '#b5a89a';
        ctx.fillRect(2, y, 20, 10);
        ctx.fillRect(25, y, 21, 10);
        // Sunlit top bevel
        ctx.fillStyle = isBrick ? '#c76554' : '#ded4c8';
        ctx.fillRect(2, y, 20, 2);
        ctx.fillRect(25, y, 21, 2);
        // Bottom shadow & moss
        ctx.fillStyle = '#2e2622';
        ctx.fillRect(2, y + 9, 20, 1);
        ctx.fillRect(25, y + 9, 21, 1);
        ctx.fillStyle = '#4d7c38';
        ctx.fillRect(6, y + 8, 5, 2);
      }
    });

    // Traditional Bengali Stepped Ghat (Shiri Ghat - Horizontal & Vertical)
    makeTex('tile-ghat-steps', 64, 48, ctx => {
      // 4 descending red-brick & sandstone steps leading into shallow water
      const stepCols = ['#d9c7b0', '#c4513d', '#ba9f84', '#8c3b2b'];
      for (let s = 0; s < 4; s++) {
        const y = s * 12;
        ctx.fillStyle = stepCols[s];
        ctx.fillRect(0, y, 64, 10);
        // Sunlit step nosing
        ctx.fillStyle = tk.mix(stepCols[s], '#ffffff', 0.32);
        ctx.fillRect(0, y, 64, 2);
        // Step riser shadow
        ctx.fillStyle = '#382218';
        ctx.fillRect(0, y + 10, 64, 2);
        // Vertical masonry joints
        for (let x = (s % 2) * 8; x < 64; x += 16) {
          ctx.fillRect(x, y, 1, 10);
        }
      }
      // Subtle lapping water wash on the lowest step
      ctx.fillStyle = 'rgba(56, 189, 248, 0.38)';
      ctx.fillRect(0, 36, 64, 12);
      ctx.fillStyle = 'rgba(224, 247, 255, 0.75)';
      ctx.fillRect(4, 37, 22, 2); ctx.fillRect(36, 38, 20, 2);
    });

    makeTex('tile-ghat-steps-v', 48, 64, ctx => {
      const stepCols = ['#d9c7b0', '#c4513d', '#ba9f84', '#8c3b2b'];
      for (let s = 0; s < 4; s++) {
        const x = s * 12;
        ctx.fillStyle = stepCols[s];
        ctx.fillRect(x, 0, 10, 64);
        ctx.fillStyle = tk.mix(stepCols[s], '#ffffff', 0.32);
        ctx.fillRect(x, 0, 2, 64);
        ctx.fillStyle = '#382218';
        ctx.fillRect(x + 10, 0, 2, 64);
        for (let y = (s % 2) * 8; y < 64; y += 16) {
          ctx.fillRect(x, y, 10, 1);
        }
      }
      ctx.fillStyle = 'rgba(56, 189, 248, 0.38)';
      ctx.fillRect(36, 0, 12, 64);
      ctx.fillStyle = 'rgba(224, 247, 255, 0.75)';
      ctx.fillRect(37, 6, 2, 20); ctx.fillRect(38, 36, 2, 20);
    });

    // Arched Mughal Stone & Teakwood Footbridge (Spans over canals & streams)
    makeTex('prop-stone-bridge', 160, 104, ctx => {
      // Water shadow beneath bridge arch
      ctx.fillStyle = 'rgba(10, 32, 48, 0.45)';
      ctx.fillRect(16, 14, 128, 84);
      // Stone abutment piers on left & right banks
      const drawPier = (px: number) => {
        ctx.fillStyle = '#594233'; ctx.fillRect(px, 6, 22, 92);
        ctx.fillStyle = '#d9c5ab'; ctx.fillRect(px + 2, 8, 18, 88);
        ctx.fillStyle = '#a8382b'; ctx.fillRect(px + 4, 14, 14, 76);
        ctx.fillStyle = '#fff5e4'; ctx.fillRect(px + 2, 8, 18, 3);
      };
      drawPier(4);
      drawPier(134);

      // Teakwood & Flagstone Bridge Deck (y: 16..88)
      ctx.fillStyle = '#3b2313';
      ctx.fillRect(0, 14, 160, 76);
      for (let x = 4; x < 156; x += 10) {
        ctx.fillStyle = (x / 10) % 2 === 0 ? '#855534' : '#754829';
        ctx.fillRect(x, 18, 9, 68);
        ctx.fillStyle = '#a36e49';
        ctx.fillRect(x, 18, 9, 3);
        ctx.fillStyle = '#d4a359';
        ctx.fillRect(x + 3, 22, 2, 2);
        ctx.fillRect(x + 3, 80, 2, 2);
      }
      // Center sandstone runner strip
      ctx.fillStyle = '#e5d2b8';
      ctx.fillRect(0, 36, 160, 32);
      for (let x = 2; x < 158; x += 16) {
        ctx.fillStyle = '#cfb495';
        ctx.fillRect(x, 38, 14, 28);
        ctx.fillStyle = '#fff7e8';
        ctx.fillRect(x, 38, 14, 2);
      }

      // Carved Top & Bottom Stone Balustrades / Railings with Lantern Pillars
      const drawRail = (ry: number) => {
        ctx.fillStyle = '#422d20'; ctx.fillRect(2, ry, 156, 12);
        ctx.fillStyle = '#a8382b'; ctx.fillRect(4, ry + 2, 152, 8);
        ctx.fillStyle = '#f0dfc8'; ctx.fillRect(2, ry, 156, 3);
        // Baluster posts & gold finials
        for (let bx = 8; bx <= 148; bx += 28) {
          ctx.fillStyle = '#f5e8d3';
          ctx.fillRect(bx - 3, ry - 2, 8, 14);
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(bx - 1, ry - 3, 4, 3);
        }
      };
      drawRail(8);
      drawRail(84);
    });

    // Aquatic Flora Props: Lily Pads, National Flower Shapla (Water Lily) & Shoreline Reeds
    makeTex('prop-lilypad', 32, 24, ctx => {
      ctx.fillStyle = 'rgba(12, 45, 64, 0.4)';
      ctx.beginPath(); ctx.ellipse(16, 14, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2d8a4e';
      ctx.beginPath(); ctx.ellipse(16, 12, 11, 7, 0, 0.25, Math.PI * 1.85); ctx.lineTo(16, 12); ctx.fill();
      ctx.fillStyle = '#52b788';
      ctx.beginPath(); ctx.ellipse(15, 11, 8, 4.5, 0, 0.3, Math.PI * 1.8); ctx.lineTo(15, 11); ctx.fill();
      ctx.fillStyle = '#1b5e36';
      ctx.fillRect(15, 11, 4, 1);
    });

    makeTex('prop-lotus', 32, 28, ctx => {
      // Lily pad base
      ctx.fillStyle = 'rgba(12, 45, 64, 0.42)';
      ctx.beginPath(); ctx.ellipse(16, 18, 12, 7.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#247542';
      ctx.beginPath(); ctx.ellipse(16, 16, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#40916c';
      ctx.beginPath(); ctx.ellipse(15, 15, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
      // Blooming Pink & White Shapla (Water Lily) Petals
      ctx.fillStyle = '#db2777';
      ctx.fillRect(10, 9, 12, 7);
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(8, 10, 4, 5); ctx.fillRect(20, 10, 4, 5);
      ctx.fillRect(11, 6, 10, 8);
      ctx.fillStyle = '#fbcfe8';
      ctx.fillRect(13, 5, 6, 7);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(14, 6, 4, 4);
      // Golden stamen heart
      ctx.fillStyle = '#facc15';
      ctx.fillRect(15, 9, 2, 2);
    });

    makeTex('prop-reeds', 32, 44, ctx => {
      // Water ripple shadow
      ctx.fillStyle = 'rgba(15, 50, 70, 0.45)';
      ctx.fillRect(6, 38, 20, 4);
      ctx.fillStyle = 'rgba(186, 235, 255, 0.55)';
      ctx.fillRect(8, 40, 16, 1);
      // Tall green reed stalks & brown cattail heads
      const stalks = [
        { x: 9, h: 26, c: '#2d6a4f', cattail: true },
        { x: 13, h: 32, c: '#40916c', cattail: false },
        { x: 16, h: 35, c: '#2d6a4f', cattail: true },
        { x: 20, h: 28, c: '#52b788', cattail: false },
        { x: 23, h: 22, c: '#1b4332', cattail: false }
      ];
      stalks.forEach(st => {
        ctx.fillStyle = st.c;
        ctx.fillRect(st.x, 40 - st.h, 2, st.h);
        if (st.cattail) {
          ctx.fillStyle = '#5c3317';
          ctx.fillRect(st.x - 1, 40 - st.h + 3, 4, 9);
          ctx.fillStyle = '#854d27';
          ctx.fillRect(st.x, 40 - st.h + 4, 1, 7);
          ctx.fillStyle = '#d4a373';
          ctx.fillRect(st.x, 40 - st.h, 2, 3);
        }
      });
    });

    makeTex('tile-pier', 48, 72, ctx => {
      ctx.fillStyle = '#422514'; ctx.fillRect(0, 0, 48, 72);
      // Support pilings & crossbeams
      ctx.fillStyle = '#2b160a';
      ctx.fillRect(0, 2, 48, 5); ctx.fillRect(0, 65, 48, 5);
      for (let x = 2; x < 48; x += 12) {
        ctx.fillStyle = '#8f5b3c'; ctx.fillRect(x, 6, 10, 60);
        ctx.fillStyle = '#a86f4c'; ctx.fillRect(x, 6, 10, 3);
        ctx.fillStyle = '#6e4228'; ctx.fillRect(x, 63, 10, 3);
        // Brass bolts
        ctx.fillStyle = '#eab308';
        ctx.fillRect(x + 4, 9, 2, 2); ctx.fillRect(x + 4, 60, 2, 2);
      }
    });

    // --- Layer 3 Interactive Ground Foliage Sprites (16x16 pixel art) ---
    makeTex('tile-flower-red', 16, 16, ctx => {
      // Crimson Krishnachura Blossom
      ctx.fillStyle = '#1b4332'; ctx.fillRect(7, 8, 2, 7);
      ctx.fillStyle = '#2d6a4f'; ctx.fillRect(5, 11, 2, 2); ctx.fillRect(9, 10, 2, 2);
      ctx.fillStyle = '#e11d48'; ctx.fillRect(6, 3, 4, 5); ctx.fillRect(4, 5, 8, 3);
      ctx.fillStyle = '#f43f5e'; ctx.fillRect(7, 4, 2, 2);
      ctx.fillStyle = '#facc15'; ctx.fillRect(7, 5, 2, 2);
    });

    makeTex('tile-flower-blue', 16, 16, ctx => {
      // Aparajita Indigo Flower
      ctx.fillStyle = '#1b4332'; ctx.fillRect(7, 8, 2, 7);
      ctx.fillStyle = '#2563eb'; ctx.fillRect(6, 3, 4, 5); ctx.fillRect(4, 5, 8, 3);
      ctx.fillStyle = '#60a5fa'; ctx.fillRect(7, 4, 2, 2);
      ctx.fillStyle = '#fef08a'; ctx.fillRect(7, 5, 2, 2);
    });

    makeTex('tile-flower-yellow', 16, 16, ctx => {
      // Golden Beli Garland Flower
      ctx.fillStyle = '#1b4332'; ctx.fillRect(7, 8, 2, 7);
      ctx.fillStyle = '#eab308'; ctx.fillRect(6, 3, 4, 5); ctx.fillRect(4, 5, 8, 3);
      ctx.fillStyle = '#fef08a'; ctx.fillRect(7, 4, 2, 2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(7, 5, 2, 2);
    });

    makeTex('tile-clover', 16, 16, ctx => {
      // 4-Leaf Lucky Bengal Clover
      ctx.fillStyle = '#14532d'; ctx.fillRect(7, 9, 2, 6);
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(5, 3, 3, 3); ctx.fillRect(8, 3, 3, 3);
      ctx.fillRect(3, 6, 3, 3); ctx.fillRect(10, 6, 3, 3);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(6, 4, 1, 1); ctx.fillRect(9, 4, 1, 1);
      ctx.fillRect(4, 7, 1, 1); ctx.fillRect(11, 7, 1, 1);
    });

    makeTex('tile-petals', 16, 16, ctx => {
      // Fallen Krishnachura Petal Cluster
      ctx.fillStyle = 'rgba(20, 30, 20, 0.35)';
      ctx.fillRect(3, 8, 4, 2); ctx.fillRect(9, 12, 4, 2); ctx.fillRect(7, 5, 4, 2);
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(3, 7, 3, 2); ctx.fillRect(10, 11, 3, 2); ctx.fillRect(7, 4, 3, 2);
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(4, 7, 1, 1); ctx.fillRect(11, 11, 1, 1); ctx.fillRect(8, 4, 1, 1);
    });

    // --- 16-Tile 4-Bit Wang Autotiles (32x32 Grid Standard) ---
    /**
     * @asset-spec
     * @id autotile-stone-path
     * @external-png assets/tilesets/autotile_stone_path.png
     * @fallback-procedural tile-path (48x48)
     * @grid-footprint 4x4 tiles (32x32px unit)
     * @visual-size 128x128px (16 connected tiles)
     * @origin 0, 0
     * @frames 16 tiles (4-bit Wang blob autotile: N=1, E=2, S=4, W=8)
     */
    makeTex('autotile-stone-path', 128, 128, (ctx) => {
      for (let mask = 0; mask < 16; mask++) {
        const col = mask % 4;
        const row = Math.floor(mask / 4);
        const ox = col * 32;
        const oy = row * 32;

        // Base flagstone earth
        ctx.fillStyle = '#654321';
        ctx.fillRect(ox, oy, 32, 32);

        // Cobblestones
        ctx.fillStyle = '#d4bfa0';
        ctx.fillRect(ox + 2, oy + 2, 28, 28);
        ctx.fillStyle = '#ebd8be';
        ctx.fillRect(ox + 3, oy + 3, 26, 12);
        ctx.fillStyle = '#a89070';
        ctx.fillRect(ox + 3, oy + 17, 26, 12);

        // Chisel grooves
        ctx.fillStyle = '#5c3d1f';
        ctx.fillRect(ox + 2, oy + 15, 28, 2);
        ctx.fillRect(ox + 15, oy + 2, 2, 28);

        // Borders where neighbor is missing (4-bit mask: N=1, E=2, S=4, W=8)
        ctx.fillStyle = '#3a6632'; // Grass fringe
        if (!(mask & 1)) { // North border
          ctx.fillRect(ox, oy, 32, 3);
          ctx.fillStyle = '#2d5027'; ctx.fillRect(ox, oy + 3, 32, 1);
        }
        if (!(mask & 2)) { // East border
          ctx.fillStyle = '#3a6632'; ctx.fillRect(ox + 29, oy, 3, 32);
          ctx.fillStyle = '#2d5027'; ctx.fillRect(ox + 28, oy, 1, 32);
        }
        if (!(mask & 4)) { // South border
          ctx.fillStyle = '#3a6632'; ctx.fillRect(ox, oy + 29, 32, 3);
          ctx.fillStyle = '#2d5027'; ctx.fillRect(ox, oy + 28, 32, 1);
        }
        if (!(mask & 8)) { // West border
          ctx.fillStyle = '#3a6632'; ctx.fillRect(ox, oy, 3, 32);
          ctx.fillStyle = '#2d5027'; ctx.fillRect(ox + 3, oy, 1, 32);
        }
      }
    });

    /**
     * @asset-spec
     * @id autotile-farm-soil
     * @external-png assets/tilesets/autotile_farm_soil.png
     * @fallback-procedural tile-grass (128x128)
     * @grid-footprint 4x4 tiles (32x32px unit)
     * @visual-size 128x128px (16 connected tiles)
     * @origin 0, 0
     * @frames 16 tiles (4-bit Wang autotile for untilled/tilled/watered soil)
     */
    makeTex('autotile-farm-soil', 128, 128, (ctx) => {
      for (let mask = 0; mask < 16; mask++) {
        const col = mask % 4;
        const row = Math.floor(mask / 4);
        const ox = col * 32;
        const oy = row * 32;

        // Rich Bengali tilled loam
        ctx.fillStyle = '#4a2d18';
        ctx.fillRect(ox, oy, 32, 32);

        // Furrows
        ctx.fillStyle = '#663e21';
        for (let fy = 3; fy < 30; fy += 6) {
          ctx.fillRect(ox + 2, oy + fy, 28, 3);
          ctx.fillStyle = '#2b190d';
          ctx.fillRect(ox + 2, oy + fy + 3, 28, 1);
          ctx.fillStyle = '#663e21';
        }

        // Borders where neighbor is not tilled
        ctx.fillStyle = '#4a8944'; // Grass edge
        if (!(mask & 1)) ctx.fillRect(ox, oy, 32, 2);
        if (!(mask & 2)) ctx.fillRect(ox + 30, oy, 2, 32);
        if (!(mask & 4)) ctx.fillRect(ox, oy + 30, 32, 2);
        if (!(mask & 8)) ctx.fillRect(ox, oy, 2, 32);
      }
    });

    // --- Stardew Valley Crop Growth Stages (192x48 px = 6 stages of 32x48 px) ---
    const makeCropStages = (key: string, name: string, matureColor: string, fruitColor: string, isTall = false) => {
      makeTex(key, 192, 48, (ctx) => {
        for (let stage = 0; stage < 6; stage++) {
          const ox = stage * 32;
          const cx = ox + 16;
          const baseY = 44;

          // Stage 0: Seed / soil mound
          ctx.fillStyle = '#3e2415';
          ctx.beginPath(); ctx.ellipse(cx, baseY, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
          if (stage === 0) {
            ctx.fillStyle = '#d4a373';
            ctx.fillRect(cx - 1, baseY - 2, 2, 2);
            continue;
          }

          // Stage 1: Tiny Sprout
          if (stage === 1) {
            ctx.fillStyle = '#52b788';
            ctx.fillRect(cx - 0.5, baseY - 7, 2, 7);
            ctx.fillRect(cx - 4, baseY - 8, 3, 2);
            ctx.fillRect(cx + 2, baseY - 8, 3, 2);
            continue;
          }

          // Stage 2: Young Vegetative Plant
          if (stage === 2) {
            ctx.fillStyle = '#2d6a4f';
            ctx.fillRect(cx - 1, baseY - 14, 2.5, 14);
            ctx.fillStyle = '#40916c';
            ctx.beginPath();
            ctx.ellipse(cx - 5, baseY - 8, 5, 3, -0.3, 0, Math.PI * 2);
            ctx.ellipse(cx + 5, baseY - 10, 5, 3, 0.3, 0, Math.PI * 2);
            ctx.fill();
            continue;
          }

          // Stage 3: Budding / Flowering
          if (stage === 3) {
            ctx.fillStyle = '#1b4332';
            ctx.fillRect(cx - 1, baseY - 22, 3, 22);
            ctx.fillStyle = '#2d6a4f';
            ctx.beginPath();
            ctx.ellipse(cx - 7, baseY - 14, 6, 4, -0.25, 0, Math.PI * 2);
            ctx.ellipse(cx + 7, baseY - 16, 6, 4, 0.25, 0, Math.PI * 2);
            ctx.fill();
            // Tiny Flower Buds
            ctx.fillStyle = '#fde047';
            ctx.fillRect(cx - 3, baseY - 24, 2, 2);
            ctx.fillRect(cx + 2, baseY - 24, 2, 2);
            continue;
          }

          // Stage 4: Mature Harvestable Crop
          if (stage === 4) {
            const h = isTall ? 36 : 28;
            ctx.fillStyle = '#1b4332';
            ctx.fillRect(cx - 1.5, baseY - h, 3, h);
            ctx.fillStyle = matureColor;
            ctx.beginPath();
            ctx.ellipse(cx, baseY - h * 0.6, 12, h * 0.45, 0, 0, Math.PI * 2);
            ctx.fill();
            // Hanging Fruits / Blossoms
            ctx.fillStyle = fruitColor;
            ctx.beginPath();
            ctx.arc(cx - 4, baseY - h * 0.7, 3.5, 0, Math.PI * 2);
            ctx.arc(cx + 5, baseY - h * 0.5, 3.5, 0, Math.PI * 2);
            ctx.arc(cx, baseY - h * 0.3, 3, 0, Math.PI * 2);
            ctx.fill();
            continue;
          }

          // Stage 5: Regrow / Harvested Stubble
          if (stage === 5) {
            ctx.fillStyle = '#2d6a4f';
            ctx.fillRect(cx - 1, baseY - 10, 2, 10);
            ctx.fillStyle = '#52b788';
            ctx.fillRect(cx - 4, baseY - 7, 3, 2);
            ctx.fillRect(cx + 2, baseY - 7, 3, 2);
          }
        }
      });
    };

    /**
     * @asset-spec
     * @id crop-mango
     * @external-png assets/sprites/crops/crop_mango.png
     * @fallback-procedural crop-mango (192x48)
     * @grid-footprint 1x1 tile (32x32px unit)
     * @visual-size 32x48px (6 stages: 192x48px sheet)
     * @origin 0.5, 0.9
     * @frames 6 stages (Seed, Sprout, Young, Flowering, Ripe Mango, Regrow)
     */
    makeCropStages('crop-mango', 'Rajshahi Fazli Mango', '#2d6a4f', '#f59e0b', true);

    /**
     * @asset-spec
     * @id crop-tea
     * @external-png assets/sprites/crops/crop_tea.png
     * @fallback-procedural crop-tea (192x48)
     * @grid-footprint 1x1 tile (32x32px unit)
     * @visual-size 32x48px (6 stages: 192x48px sheet)
     * @origin 0.5, 0.9
     * @frames 6 stages (Seed, Sprout, Young, Flush, Prime Harvest, Pruned)
     */
    makeCropStages('crop-tea', 'Sylhet Camellia Tea Bush', '#1b4332', '#86efac', false);

    /**
     * @asset-spec
     * @id crop-jute
     * @external-png assets/sprites/crops/crop_jute.png
     * @fallback-procedural crop-jute (192x48)
     * @grid-footprint 1x1 tile (32x32px unit)
     * @visual-size 32x48px (6 stages: 192x48px sheet)
     * @origin 0.5, 0.9
     * @frames 6 stages (Seed, Shoot, Mid Cane, Tall Stalk, Golden Mature, Stubble)
     */
    makeCropStages('crop-jute', 'Golden Valley Jute', '#4d7c0f', '#ca8a04', true);

    /**
     * @asset-spec
     * @id crop-beli
     * @external-png assets/sprites/crops/crop_beli.png
     * @fallback-procedural crop-beli (192x48)
     * @grid-footprint 1x1 tile (32x32px unit)
     * @visual-size 32x48px (6 stages: 192x48px sheet)
     * @origin 0.5, 0.9
     * @frames 6 stages (Seed, Sprout, Budding, White Flower, Full Blossom, Harvested)
     */
    makeCropStages('crop-beli', 'Curzon Beli Garland Bloom', '#15803d', '#ffffff', false);

    /**
     * @asset-spec
     * @id crop-naga
     * @external-png assets/sprites/crops/crop_naga.png
     * @fallback-procedural crop-naga (192x48)
     * @grid-footprint 1x1 tile (32x32px unit)
     * @visual-size 32x48px (6 stages: 192x48px sheet)
     * @origin 0.5, 0.9
     * @frames 6 stages (Seed, Sprout, Green Plant, White Flower, Crimson Chili, Regrow)
     */
    makeCropStages('crop-naga', 'Sreemangal Naga Fire Chili', '#166534', '#ef4444', false);

    /**
     * @asset-spec
     * @id crop-spirit-melon
     * @external-png assets/sprites/crops/crop_spirit_melon.png
     * @fallback-procedural crop-spirit-melon (192x48)
     * @grid-footprint 1x1 tile (32x32px unit)
     * @visual-size 32x48px (6 stages: 192x48px sheet)
     * @origin 0.5, 0.9
     * @frames 6 stages (Spore, Sprout, Glowing Vine, Young Gourd, Ripe Spirit Melon, Harvested)
     */
    makeCropStages('crop-spirit-melon', 'Whispering Spirit Melon', '#0f766e', '#2dd4bf', false);

    /**
     * @asset-spec
     * @id crop-star-berry
     * @external-png assets/sprites/crops/crop_star_berry.png
     * @fallback-procedural crop-star-berry (192x48)
     * @grid-footprint 1x1 tile (32x32px unit)
     * @visual-size 32x48px (6 stages: 192x48px sheet)
     * @origin 0.5, 0.9
     * @frames 6 stages (Seed, Ice Shoot, Frost Vine, Blue Blossom, Luminous Star Berry, Regrow)
     */
    makeCropStages('crop-star-berry', 'Cryo Star Berry', '#1e40af', '#60a5fa', false);

    // Slice 16 frames for autotile sheets and crops if scene is available
    if (scene && scene.textures) {
      const slice16Frames = (key: string) => {
        const tex = scene.textures.get(key);
        if (!tex) return;
        for (let mask = 0; mask < 16; mask++) {
          const col = mask % 4;
          const row = Math.floor(mask / 4);
          const frameKey = `${key}-${mask}`;
          if (!tex.has(frameKey)) {
            tex.add(frameKey, 0, col * 32, row * 32, 32, 32);
          }
        }
      };
      slice16Frames('autotile-stone-path');
      slice16Frames('autotile-farm-soil');

      // Slice 6 growth stage frames for each crop
      const crops = ['crop-mango', 'crop-tea', 'crop-jute', 'crop-beli', 'crop-naga', 'crop-spirit-melon', 'crop-star-berry'];
      crops.forEach(ck => {
        const tex = scene.textures.get(ck);
        if (!tex) return;
        for (let st = 0; st < 6; st++) {
          const frameKey = `${ck}-${st}`;
          if (!tex.has(frameKey)) {
            tex.add(frameKey, 0, st * 32, 0, 32, 48);
          }
        }
      });
    }

  }
}

