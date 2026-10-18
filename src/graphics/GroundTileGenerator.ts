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

    makeTex('tile-water', 64, 64, ctx => {
      ctx.fillStyle = '#25648a'; ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#2f76a1'; ctx.fillRect(0, 8, 64, 14); ctx.fillRect(0, 38, 64, 14);
      ctx.fillStyle = '#7ec8eb';
      [[8, 12, 16], [36, 26, 18], [14, 44, 20], [42, 56, 14]].forEach(([x, y, w]) => ctx.fillRect(x, y, w, 2));
    });

    makeTex('tile-lava', 64, 64, ctx => {
      ctx.fillStyle = '#8c2211'; ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#ff6b1a'; ctx.fillRect(0, 10, 64, 12); ctx.fillRect(0, 40, 64, 12);
      ctx.fillStyle = '#ffdf4d'; ctx.fillRect(12, 14, 18, 4); ctx.fillRect(36, 44, 20, 4);
    });

    makeTex('tile-bank', 48, 48, ctx => {
      ctx.fillStyle = '#6e655f'; ctx.fillRect(0, 0, 48, 48);
      for (let y = 2; y < 46; y += 12) {
        ctx.fillStyle = '#998e86'; ctx.fillRect(3, y, 42, 9);
      }
    });

    makeTex('tile-pier', 48, 72, ctx => {
      ctx.fillStyle = '#5c3822'; ctx.fillRect(0, 0, 48, 72);
      for (let x = 2; x < 48; x += 12) {
        ctx.fillStyle = '#8f5b3c'; ctx.fillRect(x, 6, 10, 60);
      }
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

