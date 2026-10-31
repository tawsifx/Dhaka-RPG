// src/graphics/LandmarkGenerator.ts - Curzon Hall, Rickshaw, Rowboat, Tea Stall, Fuchka Cart, Bookstall, Monuments
// Migrated 100% intact from game.js
import { CURZON_K } from '../config/constants';

export class LandmarkGenerator {
  static generate(makeTex: (key: string, w: number, h: number, drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => void) {
    // --- World Trees & Pillars ---
    // --- World Trees & Pillars (Pro Multi-Layered RPG Biome Art) ---
    const drawAmbientShadow = (ctx, cx, cy, rx, ry) => {
      ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(12, 8, 20, 0.34)';
      ctx.beginPath(); ctx.ellipse(cx, cy, rx * 0.68, ry * 0.68, 0, 0, Math.PI * 2); ctx.fill();
    };

    const drawOrganicTrunk = (ctx, cx, baseY, topY, baseW, Colors, forked = true) => {
      const [dark, mid, light] = Colors;
      // Flared Roots & Trunk Silhouette
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(cx - baseW * 1.15, baseY);
      ctx.quadraticCurveTo(cx - baseW * 0.55, baseY - 16, cx - baseW * 0.48, topY);
      ctx.lineTo(cx + baseW * 0.48, topY);
      ctx.quadraticCurveTo(cx + baseW * 0.55, baseY - 16, cx + baseW * 1.15, baseY);
      ctx.closePath();
      ctx.fill();

      // Root Tendrils
      ctx.beginPath();
      ctx.ellipse(cx - baseW * 0.7, baseY + 1, 7, 3, -0.25, 0, Math.PI * 2);
      ctx.ellipse(cx + baseW * 0.7, baseY + 1, 7, 3, 0.25, 0, Math.PI * 2);
      ctx.ellipse(cx, baseY + 2, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Main Bark Midtone
      ctx.fillStyle = mid;
      ctx.beginPath();
      ctx.moveTo(cx - baseW * 0.8, baseY - 1);
      ctx.quadraticCurveTo(cx - baseW * 0.4, baseY - 18, cx - baseW * 0.34, topY);
      ctx.lineTo(cx + baseW * 0.22, topY);
      ctx.quadraticCurveTo(cx + baseW * 0.3, baseY - 18, cx + baseW * 0.55, baseY - 1);
      ctx.closePath();
      ctx.fill();

      // Sunlit Bark Striations
      ctx.fillStyle = light;
      ctx.fillRect(cx - baseW * 0.26, topY + 6, 3, (baseY - topY) * 0.68);
      ctx.fillRect(cx - baseW * 0.04, topY + 14, 2, (baseY - topY) * 0.52);

      // Upper Canopy Boughs
      if (forked) {
        ctx.strokeStyle = dark;
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 2, topY + 12); ctx.quadraticCurveTo(cx - 18, topY - 2, cx - 30, topY - 12);
        ctx.moveTo(cx + 2, topY + 10); ctx.quadraticCurveTo(cx + 18, topY - 4, cx + 30, topY - 14);
        ctx.stroke();

        ctx.strokeStyle = mid;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx - 2, topY + 11); ctx.quadraticCurveTo(cx - 16, topY - 2, cx - 28, topY - 11);
        ctx.moveTo(cx + 2, topY + 9); ctx.quadraticCurveTo(cx + 16, topY - 4, cx + 28, topY - 13);
        ctx.stroke();
      }
    };

    const drawLeafCluster = (ctx, x, y, r, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.arc(x - r * 0.58, y + r * 0.22, r * 0.72, 0, Math.PI * 2);
      ctx.arc(x + r * 0.58, y + r * 0.22, r * 0.72, 0, Math.PI * 2);
      ctx.arc(x, y - r * 0.52, r * 0.76, 0, Math.PI * 2);
      ctx.fill();
    };

    // 1. World 1 (Dhaka Valley): Spreading Royal Krishnachura (Delonix regia)
    /**
     * @asset-spec
     * @id prop-tree-krishna
     * @external-png assets/sprites/trees/tree_krishnachura.png
     * @fallback-procedural prop-tree-krishna (120x128)
     * @grid-footprint 4x4 tiles (64x32px trunk collision base)
     * @visual-size 128x128px (or 64x64px native upscaled 2x)
     * @origin 0.5, 0.92
     * @frames 1 static frame
     */
    makeTex('prop-tree-krishna', 120, 128, ctx => {
      drawAmbientShadow(ctx, 60, 116, 42, 12);
      drawOrganicTrunk(ctx, 60, 114, 62, 14, ['#3a1f10', '#5e361e', '#855132'], true);

      // Fern-like compound green under-foliage
      [[30, 68, 16], [90, 68, 16], [46, 72, 18], [74, 72, 18], [60, 64, 22]].forEach(([x, y, r]) => {
        drawLeafCluster(ctx, x, y, r, '#244d29');
      });
      [[34, 65, 13], [86, 65, 13], [60, 60, 17]].forEach(([x, y, r]) => {
        drawLeafCluster(ctx, x, y, r, '#3b7a3e');
      });

      // Tiered Umbrella Canopy: Deep Crimson -> Scarlet -> Vermilion -> Flame Orange
      const backBoughs = [[24, 56, 17], [96, 56, 17], [40, 44, 21], [80, 44, 21], [60, 38, 25], [60, 56, 23]];
      backBoughs.forEach(([x, y, r]) => drawLeafCluster(ctx, x, y, r, '#6e1414'));

      const midBoughs = [[26, 52, 15], [94, 52, 15], [42, 40, 19], [78, 40, 19], [60, 34, 22], [50, 52, 17], [70, 52, 17]];
      midBoughs.forEach(([x, y, r]) => drawLeafCluster(ctx, x, y, r, '#b0251a'));

      const litBoughs = [[30, 48, 12], [90, 48, 12], [44, 36, 15], [76, 36, 15], [60, 29, 18], [58, 46, 15]];
      litBoughs.forEach(([x, y, r]) => drawLeafCluster(ctx, x, y, r, '#e64825'));

      const crownHighlights = [[44, 31, 9], [74, 31, 9], [60, 24, 11], [32, 44, 8], [88, 44, 8], [56, 41, 10]];
      crownHighlights.forEach(([x, y, r]) => drawLeafCluster(ctx, x, y, r, '#ff7b33'));

      // Individual 4-petal Krishnachura flower sprigs & golden stamens
      const sprigs = [
        [24, 50], [34, 38], [46, 27], [60, 21], [74, 27], [86, 38], [96, 50],
        [38, 52], [52, 42], [68, 42], [82, 52], [58, 33], [48, 56], [72, 56]
      ];
      sprigs.forEach(([sx, sy], i) => {
        ctx.fillStyle = i % 2 === 0 ? '#ffaa47' : '#ffe478';
        ctx.fillRect(sx - 3, sy - 1, 2, 2);
        ctx.fillRect(sx + 2, sy - 1, 2, 2);
        ctx.fillRect(sx - 1, sy - 3, 2, 2);
        ctx.fillRect(sx - 1, sy + 2, 2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx, sy, 1, 1);
      });

      // Scattered fallen crimson petals around the roots
      ctx.fillStyle = '#e64825';
      [[38, 115], [46, 119], [75, 117], [83, 113], [52, 121], [67, 120]].forEach(([px, py]) => {
        ctx.fillRect(px, py, 3, 2);
      });
    });

    // 2. World 2 (Whispering Emerald Forest): Ancient Bioluminescent Spirit Banyan
    /**
     * @asset-spec
     * @id prop-tree-emerald
     * @external-png assets/sprites/trees/tree_emerald_banyan.png
     * @fallback-procedural prop-tree-emerald (120x128)
     * @grid-footprint 4x4 tiles (64x32px trunk collision base)
     * @visual-size 128x128px (or 64x64px native upscaled 2x)
     * @origin 0.5, 0.92
     * @frames 1 static frame with spirit hollow
     */
    makeTex('prop-tree-emerald', 120, 128, ctx => {
      drawAmbientShadow(ctx, 60, 116, 40, 12);
      drawOrganicTrunk(ctx, 60, 114, 56, 16, ['#1e1612', '#36271e', '#523c2e'], true);

      // Glowing Spirit Hollow in the Trunk
      ctx.fillStyle = '#0d2b24';
      ctx.beginPath(); ctx.ellipse(60, 88, 5, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#64dfdf';
      ctx.beginPath(); ctx.ellipse(60, 88, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(59, 86, 2, 3);

      // Hanging Aerial Banyan Vines
      ctx.fillStyle = '#1b4332';
      [[32, 58, 30], [40, 62, 24], [80, 62, 26], [88, 58, 32]].forEach(([vx, vy, vh]) => {
        ctx.fillRect(vx, vy, 2, vh);
        ctx.fillStyle = '#52b788';
        ctx.fillRect(vx, vy + vh - 4, 2, 4);
        ctx.fillStyle = '#1b4332';
      });

      // Layered Emerald Canopy
      [[28, 56, 18], [92, 56, 18], [44, 42, 22], [76, 42, 22], [60, 34, 26], [60, 56, 22]].forEach(([x, y, r]) => {
        drawLeafCluster(ctx, x, y, r, '#0f2e24');
      });
      [[30, 52, 15], [90, 52, 15], [44, 38, 19], [76, 38, 19], [60, 30, 22], [52, 50, 17], [68, 50, 17]].forEach(([x, y, r]) => {
        drawLeafCluster(ctx, x, y, r, '#1b5741');
      });
      [[34, 47, 12], [86, 47, 12], [46, 34, 15], [74, 34, 15], [60, 25, 17], [60, 44, 14]].forEach(([x, y, r]) => {
        drawLeafCluster(ctx, x, y, r, '#2d8a61');
      });
      [[48, 29, 9], [72, 29, 9], [60, 21, 11], [36, 43, 8], [84, 43, 8]].forEach(([x, y, r]) => {
        drawLeafCluster(ctx, x, y, r, '#52b788');
      });

      // Bioluminescent Spirit Dew Orbs
      [[34, 42], [50, 26], [62, 19], [74, 28], [86, 44], [44, 52], [76, 52], [60, 38]].forEach(([gx, gy]) => {
        ctx.fillStyle = 'rgba(128, 255, 219, 0.35)';
        ctx.beginPath(); ctx.arc(gx, gy, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#80ffdb';
        ctx.beginPath(); ctx.arc(gx, gy, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(gx - 1, gy - 1, 2, 2);
      });
    });

    // 3. World 3 (Sunken Kingdom): Luminous Abyssal Reef & Pearl Pillar
    makeTex('prop-pillar-coral', 120, 128, ctx => {
      drawAmbientShadow(ctx, 60, 116, 38, 11);

      // Sunken Temple Pedestal Base
      ctx.fillStyle = '#1d3c4d';
      ctx.beginPath();
      ctx.moveTo(32, 115); ctx.lineTo(40, 74); ctx.lineTo(80, 74); ctx.lineTo(88, 115);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2e596e';
      ctx.fillRect(42, 76, 32, 37);
      ctx.fillStyle = '#488aa3';
      ctx.fillRect(45, 78, 10, 33);

      // Branching Staghorn Coral Arms
      const drawCoralArm = (pts, width, col) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
      };

      const arms = [
        [[60, 82], [60, 48], [46, 26]],
        [[60, 56], [76, 30]],
        [[52, 76], [34, 56], [26, 36]],
        [[34, 56], [42, 38]],
        [[68, 76], [86, 56], [94, 36]],
        [[86, 56], [78, 38]]
      ];
      arms.forEach(pts => drawCoralArm(pts, 13, '#8a284e'));
      arms.forEach(pts => drawCoralArm(pts, 9, '#c94b78'));
      arms.forEach(pts => drawCoralArm(pts, 4, '#ff8fab'));

      // Luminous Anemone Crowns & Floating Sea Pearls
      [[46, 26], [76, 30], [26, 36], [42, 38], [94, 36], [78, 38], [60, 48]].forEach(([px, py]) => {
        ctx.fillStyle = 'rgba(127, 212, 230, 0.35)';
        ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#7fd4e6';
        ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(px - 1.5, py - 1.5, 2, 0, Math.PI * 2); ctx.fill();
      });
    });

    // 4. World 4 (Emberfall Highlands): Fractured Obsidian Magma Monolith
    makeTex('prop-spire-obsidian', 120, 128, ctx => {
      drawAmbientShadow(ctx, 60, 116, 40, 12);

      // Lava Pool Glow at Base
      ctx.fillStyle = 'rgba(255, 107, 26, 0.35)';
      ctx.beginPath(); ctx.ellipse(60, 114, 34, 9, 0, 0, Math.PI * 2); ctx.fill();

      const drawShard = (pts, dark, mid, rim) => {
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath(); ctx.fill();

        // Lit Left Facet
        ctx.fillStyle = mid;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        ctx.lineTo(pts[1][0], pts[1][1]);
        ctx.lineTo(pts[0][0] + 4, pts[2][1]);
        ctx.closePath(); ctx.fill();

        // Specular Rim
        ctx.strokeStyle = rim;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pts[1][0], pts[1][1]);
        ctx.lineTo(pts[0][0], pts[0][1]);
        ctx.lineTo(pts[3][0], pts[3][1]);
        ctx.stroke();
      };

      // Side Shards & Central Spire
      drawShard([[34, 42], [22, 114], [46, 114], [44, 66]], '#1c0f0d', '#381d19', '#ff7b29');
      drawShard([[86, 46], [74, 68], [74, 114], [98, 114]], '#1c0f0d', '#381d19', '#ff7b29');
      drawShard([[60, 14], [40, 116], [80, 116], [76, 54]], '#24120f', '#4a241e', '#ffaa47');

      // Glowing Magma Fissure Veins
      ctx.strokeStyle = '#ff5400';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(60, 34); ctx.lineTo(54, 58); ctx.lineTo(64, 82); ctx.lineTo(56, 110);
      ctx.moveTo(54, 58); ctx.lineTo(44, 76);
      ctx.moveTo(64, 82); ctx.lineTo(74, 98);
      ctx.stroke();

      ctx.strokeStyle = '#ffea79';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(60, 34); ctx.lineTo(54, 58); ctx.lineTo(64, 82); ctx.lineTo(56, 110);
      ctx.stroke();

      // Rising Ember Sparks
      [[42, 30], [76, 34], [52, 20], [68, 24], [30, 56], [90, 58]].forEach(([ex, ey]) => {
        ctx.fillStyle = '#ff9248';
        ctx.fillRect(ex, ey, 3, 3);
        ctx.fillStyle = '#fff3a1';
        ctx.fillRect(ex + 1, ey + 1, 1, 1);
      });
    });

    // 5. World 5 (Kingdom of Eternal Frost): Snow-Laden Boreal Pine & Icicles
    makeTex('prop-tree-pine', 120, 128, ctx => {
      drawAmbientShadow(ctx, 60, 116, 38, 11);
      drawOrganicTrunk(ctx, 60, 115, 82, 12, ['#2b1d16', '#4a3222', '#6e4c36'], false);

      // 4 Tiered Boreal Pine Skirts (Bottom to Top)
      const tiers = [
        { yTop: 54, yBot: 96, halfW: 44 },
        { yTop: 38, yBot: 76, halfW: 36 },
        { yTop: 22, yBot: 56, halfW: 27 },
        { yTop: 8,  yBot: 38, halfW: 18 }
      ];

      tiers.forEach(t => {
        // Deep Shadow Needles
        ctx.fillStyle = '#1b3b52';
        ctx.beginPath();
        ctx.moveTo(60, t.yTop);
        ctx.lineTo(60 - t.halfW, t.yBot);
        ctx.quadraticCurveTo(60, t.yBot + 10, 60 + t.halfW, t.yBot);
        ctx.closePath(); ctx.fill();

        // Midtone Teal-Pine Needles
        ctx.fillStyle = '#2d5d7b';
        ctx.beginPath();
        ctx.moveTo(60, t.yTop);
        ctx.lineTo(60 - t.halfW * 0.88, t.yBot - 3);
        ctx.quadraticCurveTo(60, t.yBot + 6, 60 + t.halfW * 0.88, t.yBot - 3);
        ctx.closePath(); ctx.fill();

        // Thick Snowpack Cap
        ctx.fillStyle = '#cbe4f7';
        ctx.beginPath();
        ctx.moveTo(60, t.yTop);
        ctx.lineTo(60 - t.halfW * 0.76, t.yBot - 9);
        ctx.quadraticCurveTo(60 - t.halfW * 0.35, t.yBot - 2, 60, t.yBot - 7);
        ctx.quadraticCurveTo(60 + t.halfW * 0.35, t.yBot - 2, 60 + t.halfW * 0.76, t.yBot - 9);
        ctx.closePath(); ctx.fill();

        // Pure White Sunlit Snow Crest
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(60, t.yTop);
        ctx.lineTo(60 - t.halfW * 0.62, t.yBot - 12);
        ctx.quadraticCurveTo(60, t.yBot - 6, 60 + t.halfW * 0.45, t.yBot - 13);
        ctx.closePath(); ctx.fill();

        // Hanging Crystalline Icicles
        ctx.fillStyle = '#90e0ef';
        [-0.72, -0.4, 0.4, 0.72].forEach( ratio => {
          const ix = 60 + t.halfW * ratio;
          const iy = t.yBot - 4;
          ctx.beginPath();
          ctx.moveTo(ix - 2, iy); ctx.lineTo(ix + 2, iy); ctx.lineTo(ix, iy + 8);
          ctx.closePath(); ctx.fill();
        });
      });
    });

    // 6. World 6 (The Astral Realm): Celestial Star-Crystal Obelisk & Orbiting Rings
    makeTex('prop-pillar-astral', 120, 128, ctx => {
      drawAmbientShadow(ctx, 60, 116, 38, 11);

      // Tiered Star-Stone Pedestal
      ctx.fillStyle = '#22163d';
      ctx.fillRect(34, 102, 52, 12);
      ctx.fillStyle = '#382463';
      ctx.fillRect(40, 92, 40, 12);
      ctx.fillStyle = '#f7cb45';
      ctx.fillRect(34, 102, 52, 2);
      ctx.fillRect(40, 92, 40, 2);

      // Back Golden Orbit Halo
      ctx.strokeStyle = 'rgba(247, 203, 69, 0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(60, 54, 42, 13, -0.22, Math.PI, Math.PI * 2);
      ctx.stroke();

      // Levitating Faceted Crystal Obelisk
      ctx.fillStyle = '#3c2373';
      ctx.beginPath();
      ctx.moveTo(60, 14); ctx.lineTo(78, 38); ctx.lineTo(72, 82);
      ctx.lineTo(60, 90); ctx.lineTo(48, 82); ctx.lineTo(42, 38);
      ctx.closePath(); ctx.fill();

      // Left Illuminated Crystal Facet
      ctx.fillStyle = '#6b42bd';
      ctx.beginPath();
      ctx.moveTo(60, 14); ctx.lineTo(60, 90); ctx.lineTo(48, 82); ctx.lineTo(42, 38);
      ctx.closePath(); ctx.fill();

      // Inner Astral Core Glow
      ctx.fillStyle = '#9d6bff';
      ctx.beginPath();
      ctx.moveTo(60, 22); ctx.lineTo(68, 42); ctx.lineTo(60, 78); ctx.lineTo(52, 42);
      ctx.closePath(); ctx.fill();

      // Glowing Constellation Runes along the Crystal
      ctx.strokeStyle = '#fff3a1';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(60, 30); ctx.lineTo(55, 44); ctx.lineTo(63, 56); ctx.lineTo(58, 70);
      ctx.stroke();
      [[60, 30], [55, 44], [63, 56], [58, 70]].forEach(([rx, ry]) => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(rx, ry, 2.5, 0, Math.PI * 2); ctx.fill();
      });

      // Front Golden Orbit Ring & Satellite Star-Motes
      ctx.strokeStyle = '#f7cb45';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(60, 54, 42, 13, -0.22, 0, Math.PI);
      ctx.stroke();

      [[20, 62], [100, 46], [34, 24], [86, 26]].forEach(([sx, sy]) => {
        ctx.fillStyle = '#f7cb45';
        ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - 1, sy - 1, 2, 2);
      });
    });

    // --- Dhaka Landmarks ---
    /**
     * @asset-spec
     * @id prop-curzon
     * @external-png assets/sprites/landmarks/curzon_hall_facade.png
     * @fallback-procedural prop-curzon (428x261)
     * @grid-footprint 14x4 tiles (448x128px solid collision base with 2x2 entrance arch trigger)
     * @visual-size 448x256px (or 224x128px native pixel art upscaled 2x)
     * @origin 0.5, 0.95
     * @frames 1 monumental static facade
     */
    makeTex('prop-curzon', 190 * CURZON_K, 116 * CURZON_K, ctx => {
      // ===== Curzon Hall — Indo-Saracenic red-brick facade (matches the reference photo) =====
      // Drawn in a fixed 190x116 design grid, then scaled up by CURZON_K so the canvas size is never a limit.
      const K = CURZON_K, u = 1 / K;               // u = one real (device) pixel in design units
      ctx.scale(K, K);
      ctx.imageSmoothingEnabled = false;
      const P = {
        brick: '#a23d2d', brickL: '#c25643', brickD: '#7b2a20', brickDD: '#541b15',
        cream: '#ecdfc5', creamM: '#cdbd9f', creamD: '#9d8f76',
        dome: '#b04a39', domeL: '#e0806a', domeD: '#74281f', gold: '#e6c25a',
        glass: '#1b120f', glassL: '#4a5d6b',
        stone: '#928779', stoneL: '#b3a99b', stoneD: '#6b6157',
        hedge: '#2c6a33', hedgeL: '#4f9a48', hedgeD: '#1c4a26'
      };
      let seed = 20240;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
      const BASE = 104; // ground line of the walls

      // --- red brick wall: tonal mottling + staggered courses + mortar joints
      const brickWall = (x, y, w, h) => {
        R(x, y, w, h, P.brick);
        ctx.globalAlpha = 0.55;
        for (let i = 0; i < (w * h * K * K) / 9; i++) {                 // tonal mottling, 1 device px tall
          const bw = (2 + ((rnd() * 3) | 0)) * u;
          const bx = x + Math.floor((rnd() * (w - bw)) / u) * u, by = y + Math.floor((rnd() * h) / u) * u;
          R(bx, by, bw, u, rnd() < 0.5 ? P.brickL : P.brickD);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(58,16,10,0.20)';                          // brick courses
        for (let yy = y + 2 * u; yy < y + h; yy += 3 * u) ctx.fillRect(x, yy, w, u);
        ctx.fillStyle = 'rgba(58,16,10,0.13)';                          // staggered mortar joints
        for (let yy = y, row = 0; yy < y + h; yy += 3 * u, row++) for (let xx = x + (row % 2 ? 3 * u : 0); xx < x + w; xx += 6 * u) ctx.fillRect(xx, yy, u, 2 * u);
      };

      // --- rounded-arch path (x,y = top-left, w wide, h tall)
      const archPath = (x, y, w, h) => {
        ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + w / 2);
        ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath();
      };
      // cream-framed arched window with reflective glass, mullion and sill
      const archWindow = (x, y, w, h, mullion) => {
        ctx.fillStyle = P.cream; archPath(x - 1, y - 1, w + 2, h + 1); ctx.fill();
        ctx.fillStyle = P.creamD; ctx.fillRect(x + w, y + w / 2, 1, h - w / 2);      // shaded right jamb
        ctx.save(); archPath(x, y, w, h); ctx.clip();
        const g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, P.glassL); g.addColorStop(0.45, '#2a2a2d'); g.addColorStop(1, P.glass);
        ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x, y, 1, h);               // inner shadow
        if (mullion) { ctx.fillStyle = P.creamM; ctx.fillRect(x + (w >> 1), y + 2, 1, h); }
        ctx.restore();
        R(x - 1, y + h, w + 2, 1, P.cream); R(x - 2, y + h + 1, w + 4, 1, P.creamM); R(x - 1, y + h + 2, w + 2, 1, 'rgba(40,10,8,0.5)');
      };

      // --- domed chhatri (octagonal drum + onion dome + finial)
      const chhatri = (cx, baseY, r) => {
        R(cx - r, baseY - 5, 2 * r, 5, P.brickL);
        R(cx + r - 2, baseY - 5, 2, 5, P.brickD);                                     // shaded side
        for (let i = -r + 1; i < r - 1; i += 3) R(cx + i, baseY - 4, 2, 3, P.glass);  // arcade openings
        R(cx - r - 1, baseY - 6, 2 * r + 2, 1, P.cream); R(cx - r - 1, baseY - 1, 2 * r + 2, 1, P.creamM);
        const top = baseY - 6 - Math.round(r * 2.0);
        const dome = () => {
          ctx.beginPath(); ctx.moveTo(cx - r - 1, baseY - 6);
          ctx.bezierCurveTo(cx - r - 2, baseY - 6 - r * 1.1, cx - 1, baseY - 6 - r * 1.5, cx, top);
          ctx.bezierCurveTo(cx + 1, baseY - 6 - r * 1.5, cx + r + 2, baseY - 6 - r * 1.1, cx + r + 1, baseY - 6); ctx.closePath();
        };
        ctx.fillStyle = P.dome; dome(); ctx.fill();
        ctx.save(); dome(); ctx.clip();
        ctx.fillStyle = P.domeD; ctx.fillRect(cx + 1, top, r + 3, r * 2 + 2);          // shadow half
        ctx.fillStyle = P.domeL; ctx.fillRect(cx - r, top + 2, 2, r * 2);              // specular streak
        ctx.restore();
        R(cx, top - 4, 1, 4, P.cream); R(cx - 1, top - 6, 3, 2, P.gold); R(cx, top - 7, 1, 1, P.gold);
      };

      // --- crenellated parapet (cream)
      const parapet = (x, y, w) => {
        R(x - 1, y, w + 2, 2, P.cream); R(x - 1, y + 2, w + 2, 1, P.creamD);
        for (let i = 0; i < w; i += 4) { R(x + i, y - 3, 2, 3, P.cream); R(x + i + 1, y - 3, 1, 3, P.creamM); }
      };

      // ===== 1. LOW WINGS =====
      brickWall(2, 68, 186, BASE - 68);
      parapet(2, 66, 186);
      R(2, 69, 186, 2, 'rgba(40,10,8,0.38)');                                           // cornice shadow
      R(2, 83, 186, 1, 'rgba(236,223,197,0.35)'); R(2, 84, 186, 1, 'rgba(40,10,8,0.25)'); // string course

      // ===== 2. SIDE PAVILIONS + DOMED TURRETS (drawn symmetrically) =====
      const pavilion = (x, top, w) => {
        brickWall(x, top, w, BASE - top);
        R(x + w - 3, top, 3, BASE - top, 'rgba(45,12,8,0.38)');                         // right side in shade
        R(x, top, 1, BASE - top, 'rgba(255,205,170,0.20)');                             // sunlit left edge
        R(x - 1, 83, w + 2, 1, P.cream); R(x - 1, 84, w + 2, 1, 'rgba(40,10,8,0.4)');
        parapet(x, top - 2, w);
        R(x, top + 1, w, 2, 'rgba(40,10,8,0.35)');
        chhatri(x + (w >> 1), top - 5, w > 14 ? 5 : 4);
      };
      pavilion(56, 51, 22);   pavilion(112, 51, 22);        // inner pavilions
      pavilion(30, 56, 12);   pavilion(148, 56, 12);       // outer end pavilions
      chhatri(8, 66, 3); chhatri(182, 66, 3);             // little end domes

      // ===== 3. CENTRAL TOWER =====
      const TX = 78, TW = 34, TT = 17;
      brickWall(TX, TT, TW, BASE - TT);
      R(TX + TW - 4, TT, 4, BASE - TT, 'rgba(45,12,8,0.40)');                           // shaded right flank
      R(TX, TT, 1, BASE - TT, 'rgba(255,205,170,0.22)');
      R(TX - 1, TT, 1, BASE - TT, 'rgba(40,10,8,0.5)');                                 // edge against pavilion
      parapet(TX, TT, TW);
      R(TX, TT + 3, TW, 2, 'rgba(40,10,8,0.35)');
      chhatri(TX + 3, TT - 3, 4); chhatri(TX + TW - 3, TT - 3, 4);                     // corner turrets
      // blind arcade under the parapet
      for (let i = 0; i < 6; i++) { ctx.fillStyle = P.brickDD; archPath(TX + 3 + i * 5, TT + 8, 4, 8); ctx.fill(); R(TX + 3 + i * 5 + 3, TT + 12, 1, 4, 'rgba(0,0,0,0.25)'); }
      R(TX, 36, TW, 2, P.cream); R(TX, 38, TW, 1, P.creamD);                            // string course
      // second stage: slender paired windows
      archWindow(84, 41, 5, 14, false); archWindow(101, 41, 5, 14, false);
      R(TX, 58, TW, 2, P.cream); R(TX, 60, TW, 1, P.creamD);
      // third stage: big cream-framed recess with twin windows
      ctx.fillStyle = P.cream; archPath(83, 61, 24, 25); ctx.fill();
      ctx.fillStyle = P.brickDD; archPath(85, 63, 20, 23); ctx.fill();
      archWindow(87, 67, 7, 16, true); archWindow(96, 67, 7, 16, true);
      R(TX, 86, TW, 1, P.creamD);
      // grand entrance arch
      ctx.fillStyle = P.cream; archPath(85, 87, 20, 17); ctx.fill();
      ctx.fillStyle = P.creamD; ctx.fillRect(104, 96, 1, 8);
      ctx.fillStyle = '#25140f'; archPath(87, 89, 16, 15); ctx.fill();
      ctx.fillStyle = 'rgba(255,200,120,0.28)'; ctx.fillRect(89, 93, 12, 11);            // warm lobby light
      R(94, 95, 1, 9, '#3d2519'); R(95, 95, 1, 9, '#150a07');                           // door seam
      // Faculty of Science Signboard
      R(86, 84, 18, 3, '#241610'); R(87, 85, 16, 1, P.gold);
      // Flanking Brass Wall Lanterns
      R(82, 95, 2, 4, '#241a12'); R(81, 96, 4, 3, P.gold);
      R(106, 95, 2, 4, '#241a12'); R(105, 96, 4, 3, P.gold);
      // tower buttress shadows
      R(TX + 1, 36, 2, BASE - 36, 'rgba(236,223,197,0.12)');

      // ===== 4. WING WINDOWS (left list, mirrored to the right) =====
      const wins = [[5, 76, 7, 20], [16, 76, 7, 20], [46, 76, 7, 20], [33, 76, 6, 20], [59, 76, 6, 20], [69, 76, 6, 20]];
      wins.forEach(([x, y, w, h]) => {
        archWindow(x, y, w, h, w > 6);
        archWindow(190 - x - w, y, w, h, w > 6);
      });
      // rain-weathering streaks under the sills
      wins.forEach(([x, y, w, h]) => [x, 190 - x - w].forEach(wx => {
        for (let i = 0; i < 3; i++) R(wx + 1 + ((rnd() * (w - 2)) / u | 0) * u, y + h + 3, u, (5 + rnd() * 8), 'rgba(40,12,8,0.14)');
      }));
      // small upper windows on pavilions
      [[60, 58, 5, 10], [69, 58, 5, 10], [33, 62, 4, 8]].forEach(([x, y, w, h]) => {
        archWindow(x, y, w, h, false); archWindow(190 - x - w, y, w, h, false);
      });

      // ===== 5. AMBIENT OCCLUSION, PLINTH, STEPS =====
      const ao = ctx.createLinearGradient(0, 88, 0, BASE);
      ao.addColorStop(0, 'rgba(30,8,5,0)'); ao.addColorStop(1, 'rgba(30,8,5,0.38)');
      ctx.fillStyle = ao; ctx.fillRect(2, 88, 186, BASE - 88);
      R(1, BASE, 188, 3, P.stoneL); R(1, BASE + 3, 188, 3, P.stone); R(1, BASE + 5, 188, 1, P.stoneD);
      for (let x = 6; x < 188; x += 14) R(x, BASE + 3, 1, 3, P.stoneD);
      R(82, 110, 26, 3, P.stoneL); R(82, 112, 26, 1, P.stoneD);
      R(77, 113, 36, 3, P.stone); R(77, 113, 36, 1, P.stoneL); R(77, 115, 36, 1, P.stoneD);
      R(1, 109, 188, 1, 'rgba(0,0,0,0.25)');

      // Grand Crimson Red Carpet Runner down entrance steps
      R(91, 104, 8, 12, '#8f1721');
      R(91, 104, 1, 12, P.gold); R(98, 104, 1, 12, P.gold);
      for (let crY = 106; crY < 116; crY += 3) R(92, crY, 6, 1, '#aa212c');

      // ===== 6. TRIMMED HEDGES =====
      [[52, 24], [114, 24]].forEach(([hx, hw]) => {
        R(hx + 1, 107, hw - 2, 1, P.hedgeL); R(hx, 108, hw, 6, P.hedge); R(hx, 108, hw, 1, P.hedgeL); R(hx, 112, hw, 2, P.hedgeD);
        for (let i = 0; i < hw * 2 * K * K; i++) R(hx + Math.floor((rnd() * hw) / u) * u, 108 + Math.floor((rnd() * 6) / u) * u, u, u, rnd() < 0.5 ? P.hedgeL : P.hedgeD);
      });
    });
    makeTex('prop-fountain', 136, 124, ctx => {
      const cx = 68;

      // 1. Ambient Ground Shadow
      ctx.fillStyle = 'rgba(12, 8, 20, 0.30)';
      ctx.beginPath(); ctx.ellipse(cx, 99, 62, 22, 0, 0, Math.PI * 2); ctx.fill();

      // 2. Stepped Stone Plaza Base
      ctx.fillStyle = '#5a534a';
      ctx.beginPath(); ctx.ellipse(cx, 95, 58, 20, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#787066';
      ctx.beginPath(); ctx.ellipse(cx, 92, 56, 19, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9c9387';
      ctx.beginPath(); ctx.ellipse(cx, 90, 54, 18, 0, 0, Math.PI * 2); ctx.fill();

      // 3. Lower Pool Outer Stone Wall (3D Cylinder Basin + Carved Fluting)
      ctx.fillStyle = '#665e54';
      ctx.fillRect(cx - 50, 72, 100, 16);
      ctx.beginPath(); ctx.ellipse(cx, 88, 50, 17, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#877e72';
      ctx.fillRect(cx - 48, 72, 84, 15);
      ctx.beginPath(); ctx.ellipse(cx - 3, 87, 45, 15.5, 0, 0, Math.PI * 2); ctx.fill();

      for (let ox = -42; ox <= 42; ox += 12) {
        ctx.fillStyle = '#524b42';
        ctx.fillRect(cx + ox, 75, 4, 11);
        ctx.fillStyle = '#a89f92';
        ctx.fillRect(cx + ox + 4, 75, 2, 11);
      }

      // 4. Lower Basin Rim & Deep Turquoise Water
      ctx.fillStyle = '#b5aba0';
      ctx.beginPath(); ctx.ellipse(cx, 72, 51, 17.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ded6cb';
      ctx.beginPath(); ctx.ellipse(cx, 71, 49, 16.5, 0, 0, Math.PI * 2); ctx.fill();

      // Inner Rim Shadow Wall
      ctx.fillStyle = '#4f4840';
      ctx.beginPath(); ctx.ellipse(cx, 72, 43, 14, 0, 0, Math.PI * 2); ctx.fill();

      // Deep Water -> Mid Teal -> Shallow Caustics
      ctx.fillStyle = '#1b5b75';
      ctx.beginPath(); ctx.ellipse(cx, 73, 42, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2b82a3';
      ctx.beginPath(); ctx.ellipse(cx, 73.5, 38, 11.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4cb3d4';
      ctx.beginPath(); ctx.ellipse(cx - 4, 73, 28, 8.5, 0, 0, Math.PI * 2); ctx.fill();

      // Concentric Water Ripples
      ctx.strokeStyle = 'rgba(205, 248, 255, 0.65)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(cx, 73, 33, 9.5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, 73, 21, 6, 0, 0, Math.PI * 2); ctx.stroke();

      // Floating Krishnachura Petals & Water Lily Pads in the Pool
      [[-28, 74], [25, 76], [-16, 79]].forEach(([lx, ly]) => {
        ctx.fillStyle = '#2d7a4c';
        ctx.beginPath(); ctx.ellipse(cx + lx, ly, 4.2, 2.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#52b788';
        ctx.fillRect(cx + lx - 2, ly - 1, 2, 1.2);
      });
      ctx.fillStyle = '#ff5c77';
      [[-27, 73], [26, 75], [14, 71], [-10, 78]].forEach(([px, py]) => {
        ctx.fillRect(cx + px, py, 2.2, 1.6);
      });

      // 5. Lower Pillar Pedestal & Frothy Splash Ring
      ctx.fillStyle = 'rgba(225, 252, 255, 0.85)';
      ctx.beginPath(); ctx.ellipse(cx, 73, 14, 4.8, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#665e54';
      ctx.fillRect(cx - 10, 48, 20, 25);
      ctx.fillStyle = '#8c8377';
      ctx.fillRect(cx - 8, 48, 13, 25);
      ctx.fillStyle = '#bfb6aa';
      ctx.fillRect(cx - 6, 48, 5, 25);

      // Molded Stone Collar Rings on Lower Column
      ctx.fillStyle = '#aba195';
      ctx.beginPath(); ctx.ellipse(cx, 71, 11.5, 3.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx, 58, 10.5, 3.2, 0, 0, Math.PI * 2); ctx.fill();

      // 6. Middle Scalloped Stone Bowl (Tier 2)
      ctx.fillStyle = '#5c544b';
      ctx.beginPath();
      ctx.moveTo(cx - 26, 45);
      ctx.quadraticCurveTo(cx, 59, cx + 26, 45);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#8c8377';
      ctx.beginPath();
      ctx.moveTo(cx - 24, 45);
      ctx.quadraticCurveTo(cx - 4, 56, cx + 18, 45);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#cfc7bc';
      ctx.beginPath(); ctx.ellipse(cx, 45, 27, 8.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#297ea0';
      ctx.beginPath(); ctx.ellipse(cx, 45, 22, 6.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6bd4f0';
      ctx.beginPath(); ctx.ellipse(cx - 2, 45, 16, 4.5, 0, 0, Math.PI * 2); ctx.fill();

      // 7. Upper Baluster Column & Crown Bowl (Tier 3)
      ctx.fillStyle = '#665e54';
      ctx.fillRect(cx - 6, 25, 12, 20);
      ctx.fillStyle = '#9e9589';
      ctx.fillRect(cx - 5, 25, 8, 20);
      ctx.fillStyle = '#cfc7bc';
      ctx.fillRect(cx - 3.5, 25, 3, 20);

      // Top Crown Bowl
      ctx.fillStyle = '#5c544b';
      ctx.beginPath();
      ctx.moveTo(cx - 14, 24);
      ctx.quadraticCurveTo(cx, 32, cx + 14, 24);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#dfd8ce';
      ctx.beginPath(); ctx.ellipse(cx, 24, 15, 4.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#48b8d9';
      ctx.beginPath(); ctx.ellipse(cx, 24, 11.5, 3.3, 0, 0, Math.PI * 2); ctx.fill();

      // 8. Sculpted Brass Lotus Finial Nozzle at Peak
      ctx.fillStyle = '#b88628';
      ctx.beginPath();
      ctx.moveTo(cx, 12); ctx.lineTo(cx - 5, 24); ctx.lineTo(cx + 5, 24);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f7cb45';
      ctx.beginPath(); ctx.arc(cx, 15, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff5c0';
      ctx.fillRect(cx - 1, 13, 1.5, 2);

      // 9. Cascading Water Plumes, Parabolic Jets & Foam Droplets
      // Top Geyser Plume
      ctx.fillStyle = 'rgba(230, 252, 255, 0.92)';
      ctx.beginPath();
      ctx.ellipse(cx, 9, 4.5, 6.5, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 4, 11, 3.2, 4.2, -0.35, 0, Math.PI * 2);
      ctx.ellipse(cx + 4, 11, 3.2, 4.2, 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Parabolic Water Arcs from Top Spout to Middle Bowl
      ctx.strokeStyle = 'rgba(195, 246, 255, 0.85)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      [[-18, 44, -10, 4], [-11, 45, -6, 6], [11, 45, 6, 6], [18, 44, 10, 4]].forEach(([tx, ty, cpx, cpy]) => {
        ctx.beginPath();
        ctx.moveTo(cx, 10);
        ctx.quadraticCurveTo(cx + cpx, cpy, cx + tx, ty);
        ctx.stroke();
      });

      // Translucent Waterfall Curtains Spilling from Middle Bowl into Lower Pool
      [-21, -15, -9, -3, 3, 9, 15, 21].forEach((ox, i) => {
        ctx.strokeStyle = i % 2 === 0 ? 'rgba(165, 238, 255, 0.78)' : 'rgba(235, 253, 255, 0.88)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx + ox, 47);
        ctx.quadraticCurveTo(cx + ox * 1.18, 59, cx + ox * 1.25, 72);
        ctx.stroke();

        // White Foam Impact Bubbles on Lower Water Surface
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx + ox * 1.25, 72.5 + (i % 2), 1.8, 0, Math.PI * 2);
        ctx.fill();
      });

      // Sparkle Mist Droplets in the Air
      ctx.fillStyle = '#ffffff';
      [[-14, 16], [15, 15], [-24, 34], [25, 33], [-31, 61], [32, 60], [0, 3]].forEach(([dx, dy]) => {
        ctx.fillRect(cx + dx, dy, 1.8, 1.8);
      });
    });
    makeTex('prop-monument', 148, 156, ctx => {
      // --- 1. Ground Shadow & Stepped Architectural Plinth ---
      ctx.fillStyle = 'rgba(12, 8, 20, 0.28)';
      ctx.beginPath(); ctx.ellipse(74, 148, 62, 10, 0, 0, Math.PI * 2); ctx.fill();

      // Base steps
      ctx.fillStyle = '#5c5549'; ctx.fillRect(16, 138, 116, 10);
      ctx.fillStyle = '#756d5e'; ctx.fillRect(22, 130, 104, 9);
      ctx.fillStyle = '#918876'; ctx.fillRect(22, 130, 104, 2);

      // Main Sculpted Pedestal Block
      ctx.fillStyle = '#6b6355'; ctx.fillRect(30, 106, 88, 25);
      ctx.fillStyle = '#877e6c'; ctx.fillRect(34, 106, 80, 23);
      ctx.fillStyle = '#a89f8c'; ctx.fillRect(30, 103, 88, 4); // Pedestal top lip

      // Commemorative Plaque on Pedestal
      ctx.fillStyle = '#3d372e'; ctx.fillRect(56, 113, 36, 11);
      ctx.fillStyle = '#c7bc9d';
      ctx.fillRect(60, 116, 28, 2);
      ctx.fillRect(64, 120, 20, 2);

      // Sandstone Palette (Matching the sun-weathered concrete in the photo)
      const cShadow  = '#6e6552'; // Deep chiseled crevices & moss-tinted shadows
      const cMid     = '#9c927a'; // Weathered warm stone midtone
      const cLight   = '#c7be9f'; // Sunlit stone planes
      const cSpec    = '#e6dfc5'; // Bright top/left chiseled highlights

      // Helper for chiseled heads with upward heroic gaze
      const drawSculptedHead = (hx, hy, facingRight = true) => {
        // Hair / Back of head shadow
        ctx.fillStyle = cShadow;
        ctx.beginPath(); ctx.arc(hx, hy, 8.5, 0, Math.PI * 2); ctx.fill();
        // Face block
        ctx.fillStyle = cMid;
        ctx.fillRect(hx - 6, hy - 5, 12, 12);
        // Sunlit forehead, nose bridge & cheekbones
        ctx.fillStyle = cLight;
        ctx.fillRect(hx - 5, hy - 5, 9, 9);
        ctx.fillStyle = cSpec;
        ctx.fillRect(hx - 4, hy - 5, 6, 3); // Brow highlight
        ctx.fillRect(hx + (facingRight ? 0 : -2), hy - 2, 2, 4); // Nose bridge
        // Chiseled eye sockets & jaw shadow
        ctx.fillStyle = cShadow;
        ctx.fillRect(hx - 4, hy - 2, 3, 2);
        ctx.fillRect(hx + 1, hy - 2, 3, 2);
        ctx.fillRect(hx - 2, hy + 4, 5, 1.5); // Stern mouth
        // Neck column
        ctx.fillStyle = cMid;
        ctx.fillRect(hx - 4, hy + 7, 8, 6);
        ctx.fillStyle = cLight;
        ctx.fillRect(hx - 3, hy + 7, 4, 5);
      };

      // --- 2. RIGHT FIGURE: Student Freedom Fighter (Turned slightly right, gripping rifle) ---
      // Legs & Trousers merging into pedestal
      ctx.fillStyle = cShadow;
      ctx.beginPath();
      ctx.moveTo(86, 104); ctx.lineTo(88, 66); ctx.lineTo(108, 66); ctx.lineTo(112, 104);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = cMid;
      ctx.fillRect(90, 68, 18, 35);
      ctx.fillStyle = cLight;
      ctx.fillRect(92, 70, 7, 32); // Sunlit thigh plane
      ctx.fillRect(101, 72, 6, 30);

      // Torso & Chest (turned 3/4 right)
      ctx.fillStyle = cShadow;
      ctx.beginPath();
      ctx.moveTo(85, 38); ctx.lineTo(106, 40); ctx.lineTo(107, 68); ctx.lineTo(87, 68);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = cMid;
      ctx.fillRect(87, 40, 17, 27);
      ctx.fillStyle = cLight;
      ctx.fillRect(89, 41, 11, 13); // Pectoral/shoulder plane

      // Head (Right Fighter)
      drawSculptedHead(95, 28, true);

      // Rifle held diagonally across chest/hip (wooden stock down, barrel pointing up-right)
      ctx.strokeStyle = cShadow; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(92, 76); ctx.lineTo(122, 50); ctx.stroke();
      ctx.strokeStyle = cSpec; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(92, 75); ctx.lineTo(122, 49); ctx.stroke();
      // Rifle wooden stock (bottom-left of rifle)
      ctx.fillStyle = cShadow;
      ctx.beginPath();
      ctx.moveTo(96, 68); ctx.lineTo(89, 79); ctx.lineTo(96, 82); ctx.lineTo(101, 71);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = cLight;
      ctx.fillRect(92, 72, 5, 7);

      // Right Fighter's Arms gripping the rifle
      ctx.fillStyle = cMid;
      ctx.fillRect(88, 44, 7, 16); // Upper arm
      ctx.fillStyle = cLight;
      ctx.fillRect(92, 55, 14, 6); // Forearm reaching to rifle barrel
      ctx.fillStyle = cSpec;
      ctx.fillRect(105, 53, 5, 5); // Hand gripping barrel

      // --- 3. LEFT FIGURE: Dedicated Woman / Nurse with First-Aid Shoulder Bag ---
      // Draped Saree Skirt & Folds (flowing down to plinth)
      ctx.fillStyle = cShadow;
      ctx.beginPath();
      ctx.moveTo(36, 104); ctx.lineTo(40, 62); ctx.lineTo(64, 62); ctx.lineTo(64, 104);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = cMid;
      ctx.beginPath();
      ctx.moveTo(38, 103); ctx.lineTo(41, 64); ctx.lineTo(62, 64); ctx.lineTo(62, 103);
      ctx.closePath(); ctx.fill();

      // Chiseled Diagonal Saree Pleats
      ctx.strokeStyle = cLight; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(44, 66); ctx.lineTo(40, 102);
      ctx.moveTo(50, 66); ctx.lineTo(46, 102);
      ctx.moveTo(56, 66); ctx.lineTo(53, 102);
      ctx.stroke();
      ctx.strokeStyle = cSpec; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(45, 68); ctx.lineTo(41, 100);
      ctx.moveTo(51, 68); ctx.lineTo(47, 100);
      ctx.stroke();

      // Upper Body & Draped Saree Anchors (Achla across chest)
      ctx.fillStyle = cShadow;
      ctx.fillRect(39, 38, 24, 26);
      ctx.fillStyle = cMid;
      ctx.fillRect(41, 39, 21, 24);
      ctx.fillStyle = cLight;
      ctx.beginPath();
      ctx.moveTo(42, 40); ctx.lineTo(60, 40); ctx.lineTo(54, 62); ctx.lineTo(42, 62);
      ctx.closePath(); ctx.fill();

      // Head & Draped Hair/Headscarf (Left Nurse)
      drawSculptedHead(51, 27, true);
      ctx.fillStyle = cLight;
      ctx.beginPath(); ctx.arc(51, 23, 8, Math.PI, 0); ctx.fill(); // Hair/head-covering crest

      // Nurse's Iconic First-Aid Box Bag hanging on Left Hip (Exact match to photo)
      // Shoulder strap running diagonally from right shoulder to left hip bag
      ctx.strokeStyle = cSpec; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(57, 40); ctx.lineTo(36, 66); ctx.stroke();
      // Boxy Medical Bag on left hip
      ctx.fillStyle = cShadow;
      ctx.fillRect(26, 65, 16, 13);
      ctx.fillStyle = cLight;
      ctx.fillRect(27, 66, 13, 10);
      ctx.fillStyle = cSpec;
      ctx.fillRect(26, 65, 15, 4); // Top flap of first-aid bag
      ctx.fillStyle = cShadow;
      ctx.fillRect(32, 69, 3, 3); // Clasp detail

      // Nurse's Arms (Right hand resting on strap, left arm holding bag strap)
      ctx.fillStyle = cLight;
      ctx.fillRect(39, 42, 6, 16); // Left arm
      ctx.fillRect(55, 42, 6, 15); // Right arm
      ctx.fillStyle = cSpec;
      ctx.fillRect(43, 53, 14, 5); // Forearms folded across waist

      // --- 4. CENTER FIGURE: Tallest Muscular Farmer / Freedom Fighter (Rifle & Grenade) ---
      // Vertical Rifle Barrel Rising Behind Right Shoulder (Left side of viewer)
      ctx.fillStyle = cShadow;
      ctx.fillRect(62, 6, 5, 34);
      ctx.fillStyle = cSpec;
      ctx.fillRect(63, 7, 2.5, 30);
      // Rifle Buttstock hanging behind left hip
      ctx.fillStyle = cShadow;
      ctx.fillRect(58, 62, 6, 15);
      ctx.fillStyle = cMid;
      ctx.fillRect(59, 63, 4, 12);

      // Powerful Sculpted Legs & Folded Lungi / Dhoti at Waist
      ctx.fillStyle = cShadow;
      ctx.fillRect(61, 64, 26, 40);
      // Left & Right Muscular Legs
      ctx.fillStyle = cMid;
      ctx.fillRect(62, 68, 11, 35); // Viewer-left leg
      ctx.fillRect(75, 68, 11, 35); // Viewer-right leg
      // Sunlit Quadriceps & Knee Highlights
      ctx.fillStyle = cLight;
      ctx.fillRect(63, 70, 7, 32);
      ctx.fillRect(76, 68, 8, 34);
      ctx.fillStyle = cSpec;
      ctx.fillRect(64, 72, 4, 14);
      ctx.fillRect(77, 70, 5, 16);

      // Ammunition Pouch Belt & Draped Cloth Briefs
      ctx.fillStyle = cShadow;
      ctx.fillRect(61, 53, 26, 16);
      ctx.fillStyle = cLight;
      ctx.fillRect(62, 54, 24, 6); // Ammo belt waist
      // Individual ammo pouches around waist
      ctx.fillStyle = cSpec;
      [63, 68, 73, 78, 82].forEach(px => ctx.fillRect(px, 55, 3, 4));
      // Lungi cloth triangle
      ctx.fillStyle = cLight;
      ctx.beginPath();
      ctx.moveTo(62, 60); ctx.lineTo(86, 60); ctx.lineTo(74, 72);
      ctx.closePath(); ctx.fill();

      // Bare Muscular Torso (Broad shoulders, chiseled pectorals & abs)
      ctx.fillStyle = cShadow;
      ctx.beginPath();
      ctx.moveTo(57, 31); ctx.lineTo(91, 31); ctx.lineTo(86, 55); ctx.lineTo(62, 55);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = cMid;
      ctx.fillRect(60, 32, 28, 22);
      // Chiseled Pectoral Plates
      ctx.fillStyle = cLight;
      ctx.fillRect(62, 33, 11, 9);
      ctx.fillRect(75, 33, 11, 9);
      ctx.fillStyle = cSpec;
      ctx.fillRect(63, 34, 8, 4);
      ctx.fillRect(76, 34, 8, 4);
      // Abdominal definition
      ctx.fillStyle = cLight;
      ctx.fillRect(66, 44, 7, 9);
      ctx.fillRect(75, 44, 7, 9);

      // Iconic Rifle Sling Strap across bare chest + Hand gripping strap
      ctx.strokeStyle = cShadow; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(64, 31); ctx.lineTo(72, 53); ctx.stroke();
      ctx.strokeStyle = cSpec; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(64, 31); ctx.lineTo(72, 53); ctx.stroke();

      // Central Hero's Arms
      // Viewer-Left Arm (Bent, hand gripping the rifle sling on chest)
      ctx.fillStyle = cMid;
      ctx.fillRect(56, 33, 6, 17);
      ctx.fillStyle = cLight;
      ctx.fillRect(57, 34, 4, 14);
      ctx.fillStyle = cSpec;
      ctx.fillRect(58, 45, 13, 5); // Forearm & fist clutching sling
      // Viewer-Right Arm (Muscular arm curving down, clutching grenade at hip)
      ctx.fillStyle = cMid;
      ctx.fillRect(86, 33, 6, 22);
      ctx.fillStyle = cLight;
      ctx.fillRect(87, 34, 4, 18);
      // Hand & Grenade on left hip (viewer-right)
      ctx.fillStyle = cShadow;
      ctx.beginPath(); ctx.arc(84, 58, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = cSpec;
      ctx.beginPath(); ctx.arc(84, 58, 3, 0, Math.PI * 2); ctx.fill();

      // Central Hero's Head (Tallest, commanding upward gaze)
      drawSculptedHead(74, 19, true);
      // Sculpted wavy hair locks
      ctx.fillStyle = cSpec;
      ctx.fillRect(68, 12, 12, 3);
    });
    makeTex('prop-bench', 84, 46, (ctx, W, H) => {
      // Ground Shadow
      ctx.fillStyle = 'rgba(12, 18, 10, 0.28)';
      ctx.beginPath(); ctx.ellipse(42, 42, 38, 4.5, 0, 0, Math.PI * 2); ctx.fill();

      // Wrought Iron Legs & Framework (Victorian Curved Iron)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(10, 20, 5, 23); ctx.fillRect(69, 20, 5, 23);
      ctx.fillRect(8, 41, 9, 2.5); ctx.fillRect(67, 41, 9, 2.5);
      // Armrest Curvatures
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(9, 23); ctx.quadraticCurveTo(12, 14, 17, 23); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(67, 23); ctx.quadraticCurveTo(71, 14, 75, 23); ctx.stroke();

      // Polished Teak / Mahogany Backrest Slats
      const woodMain = '#b45309', woodLight = '#d97706', woodDark = '#78350f';
      [6, 12, 18].forEach(sy => {
        ctx.fillStyle = woodMain; ctx.fillRect(6, sy, 72, 4.5);
        ctx.fillStyle = woodLight; ctx.fillRect(6, sy, 72, 1.2);
        ctx.fillStyle = woodDark; ctx.fillRect(6, sy + 3.5, 72, 1);
        // Brass Screws
        ctx.fillStyle = '#fde047'; ctx.fillRect(11, sy + 1.5, 1.5, 1.5); ctx.fillRect(71, sy + 1.5, 1.5, 1.5);
      });

      // Bench Seat Planks
      [25, 30].forEach(sy => {
        ctx.fillStyle = woodMain; ctx.fillRect(4, sy, 76, 4.5);
        ctx.fillStyle = woodLight; ctx.fillRect(4, sy, 76, 1.2);
        ctx.fillStyle = woodDark; ctx.fillRect(4, sy + 3.5, 76, 1);
        ctx.fillStyle = '#fde047'; ctx.fillRect(11, sy + 1.5, 1.5, 1.5); ctx.fillRect(71, sy + 1.5, 1.5, 1.5);
      });
    });
    // --- Animated Ramna Flower Cart (2-Frame Sprites: -0 and -1 with Gentle Petal Sway) ---
    [0, 1].forEach(frame => {
      makeTex(`prop-flowercart-${frame}`, 216, 152, (ctx, cw, ch) => {
        const W = 216, H = 152;
        const sway = frame === 1 ? 1.5 : -1.5;
        let seed = 334455;
        const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

        // 1. Ambient Ground Shadow & Fallen Petal Carpet
        ctx.fillStyle = 'rgba(12, 8, 20, 0.32)';
        ctx.beginPath(); ctx.ellipse(W / 2, 142, 98, 11, 0, 0, Math.PI * 2); ctx.fill();

        // Fallen flower petals scattered on the ground around the cart
        ['#e63946', '#ffb703', '#ffffff', '#f4a9c0'].forEach((pc, idx) => {
          ctx.fillStyle = pc;
          ctx.fillRect(40 + idx * 32 + sway, 137 + (idx % 2) * 3, 3, 2);
          ctx.fillRect(60 + idx * 24 - sway, 139 - (idx % 2) * 2, 2.5, 2);
        });

        // 2. Wooden Pushcart Chassis, Legs & Spoked Wheels
        R(8, 96, 22, 4, '#5c3822');
        R(8, 96, 22, 1.5, '#8f5b3c');
        R(6, 95, 5, 6, '#d45779'); // Floral pink handle grip

        R(32, 124, 136, 4, '#3b2010');
        R(38, 124, 5, 16, '#5c3822');
        R(156, 124, 5, 16, '#5c3822');

        const drawCartWheel = (wx, wy, r) => {
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.beginPath(); ctx.ellipse(wx, wy + r, r * 0.9, 3.5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#6e472b'; ctx.lineWidth = 2;
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
            ctx.beginPath();
            ctx.moveTo(wx, wy);
            ctx.lineTo(wx + Math.cos(a) * (r - 2), wy + Math.sin(a) * (r - 2));
            ctx.stroke();
          }
          ctx.strokeStyle = '#1f191a'; ctx.lineWidth = 3.5;
          ctx.beginPath(); ctx.arc(wx, wy, r, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = '#8c583a'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(wx, wy, r - 2.2, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = '#f7cb45';
          ctx.beginPath(); ctx.arc(wx, wy, 3.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#2b1d14';
          ctx.beginPath(); ctx.arc(wx, wy, 1.5, 0, Math.PI * 2); ctx.fill();
        };

        // 3. Wicker & Teak Flower Cart Body
        R(24, 88, 152, 38, '#5c3822'); // Deep teak border
        R(27, 90, 146, 33, '#7c4d2b'); // Woven wooden cart bed
        R(27, 90, 146, 2, '#9c623e');  // Sunlit top bevel

        // Cross-hatch wicker texture pattern on cart side
        ctx.strokeStyle = '#4a2e1b'; ctx.lineWidth = 1;
        for (let wx = 32; wx < 170; wx += 8) {
          ctx.beginPath(); ctx.moveTo(wx, 94); ctx.lineTo(wx + 6, 118); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(wx + 6, 94); ctx.lineTo(wx, 118); ctx.stroke();
        }

        drawCartWheel(56, 128, 13);
        drawCartWheel(144, 128, 13);

        // 4. Stainless Steel / Zinc Countertop Bed
        R(20, 83, 160, 6, '#adb5bd');
        R(20, 83, 160, 2, '#ffffff');
        R(20, 88, 160, 1.5, '#495057');

        // Four Corner Bamboo Canopy Poles
        [26, 78, 128, 170].forEach(px => {
          R(px, 32, 4, 52, '#d4a373');
          R(px, 32, 1.5, 52, '#fefae0');
        });

        // 5. Overflowing Wicker Baskets & Mountainous Heaps of Fresh Ramna Flowers!
        // Wicker Basket 1 (Left - Marigold Heap)
        ctx.fillStyle = '#9c6644';
        ctx.beginPath(); ctx.ellipse(46, 82, 18, 9, 0, 0, Math.PI * 2); ctx.fill();
        // Yellow & Orange Marigold Mound (Genda Phul)
        for (let my = 80; my >= 62; my -= 4) {
          for (let mx = 34; mx <= 58; mx += 4.5) {
            ctx.fillStyle = (mx + my) % 2 === 0 ? '#ffb703' : '#fb8500';
            ctx.beginPath(); ctx.arc(mx + (rnd() - 0.5), my + (rnd() - 0.5) + sway * 0.3, 3, 0, Math.PI * 2); ctx.fill();
          }
        }

        // Wicker Basket 2 (Center - White Beli & Bokul Flower Garland Coils)
        ctx.fillStyle = '#8c583a';
        ctx.beginPath(); ctx.ellipse(100, 83, 22, 10, 0, 0, Math.PI * 2); ctx.fill();
        // Coiled Beli flower wrist gajras and strands overflowing the basket
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(82, 80 + sway); ctx.quadraticCurveTo(100, 66, 118, 80 - sway);
        ctx.moveTo(85, 84); ctx.quadraticCurveTo(100, 72, 115, 84);
        ctx.stroke();
        // Individual white Beli buds along garland strands
        ctx.fillStyle = '#fffdf0';
        [86, 92, 98, 104, 110].forEach((bx, i) => {
          ctx.beginPath(); ctx.arc(bx, 74 + (i % 2) * 4 + sway, 2.2, 0, Math.PI * 2); ctx.fill();
        });

        // Wicker Basket 3 (Right - Crimson Krishnachura & Pink Rose Heap)
        ctx.fillStyle = '#9c6644';
        ctx.beginPath(); ctx.ellipse(154, 82, 18, 9, 0, 0, Math.PI * 2); ctx.fill();
        // Crimson Krishnachura & Pink Rose Mound
        for (let ry = 80; ry >= 60; ry -= 4) {
          for (let rx = 142; rx <= 166; rx += 4.5) {
            ctx.fillStyle = (rx + ry) % 2 === 0 ? '#e63946' : '#f4a9c0';
            ctx.beginPath(); ctx.arc(rx + sway * 0.5, ry, 3.2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffe599'; // Flower centers
            ctx.fillRect(rx - 0.5 + sway * 0.5, ry - 0.5, 1.2, 1.2);
          }
        }

        // 6. Hanging Bamboo Parasol & Flower String Curtains Across Top
        // Center Bamboo Parasol Mounted on Cart
        ctx.strokeStyle = '#5c3822'; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(100, 84); ctx.lineTo(100, 36); ctx.stroke();
        ctx.fillStyle = '#fefae0'; // Open parasol cone
        ctx.beginPath();
        ctx.moveTo(100, 24); ctx.lineTo(62, 38); ctx.lineTo(138, 38);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#d4a373'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(100, 24); ctx.lineTo(62, 38);
        ctx.moveTo(100, 24); ctx.lineTo(138, 38);
        ctx.stroke();

        // Hanging strings of marigold and beli flowers draped across the canopy poles
        ctx.strokeStyle = '#d4a373'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(26, 38); ctx.quadraticCurveTo(63, 50 + sway, 100, 38);
        ctx.quadraticCurveTo(135, 50 - sway, 170, 38);
        ctx.stroke();

        // Flowers strung along the hanging cord
        for (let hx = 34; hx <= 162; hx += 12) {
          ctx.fillStyle = hx % 24 === 0 ? '#ffb703' : '#ffffff';
          ctx.beginPath(); ctx.arc(hx, 44 + Math.sin(hx) * 3 + sway, 2.5, 0, Math.PI * 2); ctx.fill();
        }

        // 7. Bold Rooftop Signboard ("রমনা ফুল মার্কেট • RAMNA FLOWER MARKET")
        R(26, 2, 148, 15, '#5c2814');
        R(28, 3.5, 144, 12, '#f7cb45');
        R(29, 4.5, 142, 10, '#b8335a'); // Deep Pinkish-Red Floral Banner

        // Flower icons on signboard
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(35, 9.5, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(165, 9.5, 3, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#fff8eb';
        ctx.font = 'bold 7.5px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('RAMNA FLOWERS', 100, 12.5);
      });
    });

    makeTex('prop-telescope', 120, 132, ctx => {
      const W = 120, H = 132;
      const cx = 60;
      const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

      // 1. Ground Shadow & Wooden Observatory Deck Platform
      ctx.fillStyle = 'rgba(12, 8, 20, 0.35)';
      ctx.beginPath(); ctx.ellipse(cx, 122, 48, 8.5, 0, 0, Math.PI * 2); ctx.fill();

      // Circular wooden viewing deck platform
      R(24, 114, 72, 12, '#3b2010');
      R(26, 112, 68, 5, '#5c3822');
      R(26, 112, 68, 1.5, '#8f5b3c');
      for (let px = 32; px < 88; px += 10) R(px, 113, 2, 10, '#2b150a');

      // 2. Heavy Adjustable Brass Tripod Legs (Three-point stance)
      const drawTripodLeg = (x0, y0, x1, y1) => {
        ctx.strokeStyle = '#8c6239'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.strokeStyle = '#d4a338'; ctx.lineWidth = 1.8; // Inner brass highlight
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      };
      drawTripodLeg(cx, 68, 32, 116); // Left leg
      drawTripodLeg(cx, 68, 88, 116); // Right leg
      drawTripodLeg(cx, 68, 60, 118); // Center-back leg

      // Heavy Iron/Brass spreader bracket & central locking knob
      R(cx - 10, 92, 20, 4, '#3b2e25');
      R(cx - 3, 91, 6, 6, '#d4a338');

      // 3. Altazimuth Fork Mount & Polished Brass Rotation Ring
      R(cx - 8, 58, 16, 12, '#4a382b');
      // Polished brass yoke fork arms holding the main tube
      ctx.strokeStyle = '#d4a338'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 7, 62); ctx.lineTo(cx - 14, 46);
      ctx.moveTo(cx + 7, 62); ctx.lineTo(cx + 14, 46);
      ctx.stroke();
      // Tension adjustment knobs on fork sides
      R(cx - 16, 44, 4, 4, '#b88628');
      R(cx + 12, 44, 4, 4, '#b88628');

      // 4. Main Optical Brass Refractor Tube (Angled upward toward the stars!)
      ctx.save();
      ctx.translate(cx, 44);
      ctx.rotate(-0.38); // Pointed upward at ~22 degrees

      // Main Brass OTA (Optical Tube Assembly) body
      R(-42, -11, 84, 22, '#9c7238'); // Deep brass shadow
      R(-40, -10, 80, 20, '#d4a338'); // Polished golden-brass main tube
      R(-38, -9, 76, 5, '#f7cb45');   // Sunlit top barrel gleam
      R(-40, -10, 2, 20, '#b88628');  // Retaining ring near objective
      R(34, -10, 6, 20, '#b88628');   // Focuser housing ring

      // Dual-Speed Rack & Pinion Focuser & Eyepiece Diagonal
      R(38, -6, 10, 12, '#3b414d'); // Dark metallic focuser box
      R(44, -12, 4, 8, '#212529');  // 90-degree star diagonal prism
      R(46, -17, 7, 6, '#e9ecef');  // Plössl Eyepiece lens barrel
      R(46, -18, 7, 2, '#4cc9f0');  // Glass lens coating reflection

      // Smaller Finder Scope Mounted on Top of Main Tube
      R(-20, -15, 26, 5, '#b88628');
      R(-18, -17, 3, 3, '#1f2421');

      ctx.restore();

      // 5. Mounted Wooden Stargazing Accessory Stand & Star Chart Scroll
      // Wooden folding stool beside the telescope
      R(92, 98, 20, 14, '#4a2e1b');
      R(90, 96, 24, 4, '#7c4d2b');
      R(94, 112, 3, 4, '#2b150a');
      R(109, 112, 3, 4, '#2b150a');

      // Unrolled Star Chart / Celestial Map on Stool
      R(94, 94, 16, 5, '#fdf5e6');
      ctx.strokeStyle = '#1d3557'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(102, 96.5, 2, 0, Math.PI * 2); ctx.stroke(); // Constellation circle
      ctx.fillStyle = '#e63946'; ctx.fillRect(101.5, 96, 1, 1); // Alpha star mark
    });

    /**
     * @asset-spec
     * @id prop-teastall
     * @external-png assets/sprites/stalls/tsc_teastall.png
     * @fallback-procedural prop-teastall (216x152)
     * @grid-footprint 6x3 tiles (192x96px solid collision base)
     * @visual-size 224x160px (or 112x80px native pixel art upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 1 static frame (or 2-4 horizontal frames animated)
     */
    makeTex('prop-teastall', 216, 152, ctx => {
      const W = 216, H = 152;
      const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

      // 1. Ambient Ground Shadow & Brick-Edged Earth Plinth
      ctx.fillStyle = 'rgba(12, 8, 20, 0.32)';
      ctx.beginPath(); ctx.ellipse(W / 2, 143, 102, 11, 0, 0, Math.PI * 2); ctx.fill();

      R(16, 134, 184, 8, '#543d2c');
      R(18, 132, 180, 3, '#785942');
      // Red brick border along the ground base
      for (let bx = 18; bx < 194; bx += 12) {
        R(bx, 136, 10, 5, '#9e3b2b');
        R(bx + 1, 136, 8, 1.5, '#c45541');
      }

      // 2. Bamboo & Timber Stall Structure + Deep Shaded Interior
      R(24, 34, 152, 100, '#24150c'); // Dark interior backdrop
      // Back slatted wooden wall planks
      for (let py = 38; py < 96; py += 8) {
        R(28, py, 144, 6, '#382214');
        R(28, py, 144, 1, '#4d301d');
      }

      // 4 Sturdy Bamboo/Timber Corner & Center Posts
      [24, 76, 128, 172].forEach(px => {
        R(px, 32, 5, 102, '#5c3a21');
        R(px + 1, 32, 2, 102, '#855836'); // Sunlit bamboo highlight
        // Bamboo node rings
        for (let ny = 42; ny < 130; ny += 16) R(px, ny, 5, 1.5, '#3b2313');
      });

      // 3. Back Shelves: Condensed Milk Tins, Horlicks Jars & Biscuit Jars
      R(28, 56, 144, 3, '#6e4528'); // Upper shelf plank
      R(28, 76, 144, 3, '#6e4528'); // Lower shelf plank

      // Upper Shelf: Stacked Condensed Milk Tins (Left) & Spice Tins (Center)
      for (let i = 0; i < 5; i++) {
        const tx = 34 + i * 8;
        R(tx, 47, 6, 9, '#e0e6ed');
        R(tx, 49, 6, 4, '#1d4e89'); // Blue & white condensed milk label
        R(tx + 1, 47, 2, 9, 'rgba(255,255,255,0.4)');
      }
      // Big Malai / Horlicks Glass Jars (Center-Right)
      [[86, '#d97724', '#3b2010'], [98, '#e6b333', '#1d4e89'], [110, '#c94038', '#8c1d1d']].forEach(([jx, bodyC, lidC]) => {
        R(jx, 43, 9, 13, 'rgba(220, 240, 250, 0.45)'); // Glass jar
        R(Number(jx) + 1, 46, 7, 9, bodyC);                     // Powder/contents inside
        R(Number(jx) + 1, 41, 7, 2.5, lidC);                    // Screw lid
        R(Number(jx) + 1.5, 44, 1.5, 10, 'rgba(255,255,255,0.6)'); // Glass reflection
      });

      // Lower Shelf: Iconic Tong Glass Jars Filled with Toast Biscuits & Cake Rusk
      [34, 48, 62, 84, 98, 112].forEach((jx, idx) => {
        R(jx, 62, 11, 14, 'rgba(215, 242, 255, 0.38)'); // Clear glass jar
        R(Number(jx) + 1.5, 60, 8, 2.5, idx % 2 === 0 ? '#d62828' : '#2a9d8f'); // Red/Teal plastic lid
        // Stacked golden biscuits inside jar
        for (let by = 66; by < 75; by += 3) {
          R(jx + 2, by, 7, 2, idx % 2 === 0 ? '#d48b3b' : '#e6a856');
        }
        R(Number(jx) + 1, 63, 1.5, 11, 'rgba(255,255,255,0.65)'); // Specular highlight
      });

      // 4. Hanging Banana Bunch (Shagor Kola) & Biscuit Packets on Left Post
      // Hanging green-yellow banana bunch on left bamboo pole
      R(31, 36, 1.5, 8, '#5c3c24'); // Rope
      [[29, 43], [32, 44], [35, 43], [30, 48], [33, 49], [36, 48]].forEach(([kx, ky]) => {
        ctx.fillStyle = '#f4d35e';
        ctx.beginPath(); ctx.ellipse(kx, ky, 2, 4.2, 0.25, 0, Math.PI * 2); ctx.fill();
        R(kx - 0.5, ky - 3.5, 1, 1.5, '#4f772d'); // Green tip
      });

      // Hanging strip of colourful tea-time snack packets on center post
      for (let sy = 40; sy < 74; sy += 7) {
        R(77, sy, 5, 6, sy % 14 === 0 ? '#e63946' : '#f7cb45');
        R(78, sy + 1, 3, 2, '#ffffff');
      }

      // 5. Warm Hanging Tong Lightbulb & Framed TSC Poster
      R(102, 34, 1.5, 7, '#1f1614');
      const glow = ctx.createRadialGradient(103, 43, 1, 103, 43, 26);
      glow.addColorStop(0, 'rgba(255, 232, 135, 0.65)');
      glow.addColorStop(1, 'rgba(255, 190, 80, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(103, 43, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3a1';
      ctx.beginPath(); ctx.arc(102.8, 43, 3.2, 0, Math.PI * 2); ctx.fill();

      // 6. Front Wooden Counter, Blue Sheet-Metal Cladding & Bamboo Lattice
      R(22, 96, 156, 38, '#2b190e'); // Counter body shadow
      // Distressed TSC Blue-Teal painted tin front panel (Left & Center)
      R(26, 100, 98, 31, '#1d4e6e');
      R(26, 100, 98, 2, '#3b7ea5');
      for (let cx = 32; cx < 122; cx += 8) {
        R(cx, 102, 2, 27, '#153952'); // Corrugated vertical ridges
        R(cx + 2, 102, 1, 27, '#2b6a94');
      }
      // Hand-painted folk floral motif on counter front
      R(54, 108, 42, 15, '#fdf5e6');
      R(56, 110, 38, 11, '#c94038');
      ctx.fillStyle = '#f7cb45';
      ctx.beginPath(); ctx.arc(75, 115.5, 4, 0, Math.PI * 2); ctx.fill();

      // Right Counter Section: Traditional Brick Clay Chula (Stove) Housing
      R(128, 98, 48, 34, '#7a3424');
      R(130, 100, 44, 30, '#9c432e');
      // Glowing Firebox Mouth at Bottom of Stove
      ctx.fillStyle = '#1f0c07';
      ctx.beginPath(); ctx.arc(152, 124, 9, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#ff6b1a';
      ctx.beginPath(); ctx.arc(152, 124, 6.5, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#ffea79';
      ctx.beginPath(); ctx.arc(152, 124, 3.5, Math.PI, 0); ctx.fill();

      // Thick Teakwood Countertop Slab
      R(20, 92, 160, 5, '#7c4d2b');
      R(20, 92, 160, 1.5, '#a86e44');

      // 7. Countertop Props: Steaming Aluminum Kettle, Pyramids of Clay Cups & Singara Tray!
      // Large Aluminum Cha Kettle (Degchi/Kettle) on the Right Stove
      ctx.fillStyle = '#8d99ae';
      ctx.beginPath(); ctx.ellipse(152, 86, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ced4da';
      ctx.beginPath(); ctx.ellipse(150, 85, 8.5, 6, 0, 0, Math.PI * 2); ctx.fill();
      R(146, 76, 12, 3, '#6c757d'); // Kettle lid
      R(150, 74, 4, 2, '#2b2d42');  // Lid knob
      // Kettle Spout facing left
      ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(142, 87); ctx.lineTo(135, 80); ctx.stroke();
      // Curling White Tea Steam Plumes
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      [[134, 75, 2.5], [132, 70, 3.2], [135, 64, 3.8], [151, 70, 2.8]].forEach(([sx, sy, sr]) => {
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
      });

      // Pyramid Stack of Terracotta Clay Cups (Matir Bhaar) on Left Counter
      const drawClayCup = (cx, cy) => {
        ctx.fillStyle = '#b55435';
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy); ctx.lineTo(cx + 3, cy);
        ctx.lineTo(cx + 2.2, cy + 5); ctx.lineTo(cx - 2.2, cy + 5);
        ctx.closePath(); ctx.fill();
        R(cx - 3, cy, 6, 1.2, '#d97757'); // Cup rim
      };
      // Bottom row (4 cups), Middle row (3 cups), Top row (2 cups)
      [30, 37, 44, 51].forEach(cx => drawClayCup(cx, 87));
      [33.5, 40.5, 47.5].forEach(cx => drawClayCup(cx, 82));
      [37, 44].forEach(cx => drawClayCup(cx, 77));

      // Silver Tray of Golden Triangular Singaras & Samosas (Center Counter)
      R(64, 89, 28, 3, '#adb5bd');
      R(66, 89, 24, 1.5, '#ffffff');
      [[69, 86], [75, 85], [81, 86], [86, 87], [72, 83], [78, 83]].forEach(([sx, sy]) => {
        ctx.fillStyle = '#d48b28';
        ctx.beginPath();
        ctx.moveTo(sx, sy - 4); ctx.lineTo(sx - 4, sy + 3); ctx.lineTo(sx + 4, sy + 3);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f2b84b';
        ctx.fillRect(sx - 1.5, sy - 2, 2, 3);
      });

      // Two Freshly Poured Steaming Matir Bhaar Cups Ready on Counter
      [104, 114].forEach(cx => {
        drawClayCup(cx, 87);
        R(cx - 2, 87, 4, 1, '#f5d6a7'); // Creamy Malai foam top
        R(cx - 0.5, 83, 1.2, 3, 'rgba(255,255,255,0.65)'); // Steam wisp
      });

      // 8. Side Wooden Adda Bench & TerracottaTrash Bin for Used Clay Cups (Right Side)
      // Red-brown terracotta basket filled with discarded clay bhaar cups (Left foreground)
      R(6, 122, 14, 16, '#6e3520');
      R(5, 121, 16, 2.5, '#8c462b');
      R(8, 119, 4, 3, '#c96551');
      R(13, 118, 4, 3, '#b55435');

      // Classic TSC Wooden Adda Stool/Bench on the Right Side
      R(180, 116, 30, 4, '#8c583a');
      R(180, 116, 30, 1.5, '#b57853');
      R(183, 120, 4, 16, '#4a2e1b');
      R(203, 120, 4, 16, '#4a2e1b');
      drawClayCup(194, 111); // A lone clay cup resting on the bench

      // 9. Iconic Striped Red-and-Cream Tarpaulin Awning & Corrugated Tin Roof
      // Slanted corrugated tin sub-roof
      R(14, 18, 172, 16, '#4a4e54');
      const stripes = 10;
      const sw = 170 / stripes;
      for (let i = 0; i < stripes; i++) {
        const ax = 15 + i * sw;
        const isRed = i % 2 === 0;
        ctx.fillStyle = isRed ? '#c93b2b' : '#fdf5e6';
        ctx.beginPath();
        ctx.moveTo(ax + 2, 16);
        ctx.lineTo(ax + sw + 2, 16);
        ctx.lineTo(ax + sw, 34);
        ctx.lineTo(ax, 34);
        ctx.closePath(); ctx.fill();

        // Sunlit upper ridge highlight
        ctx.fillStyle = isRed ? '#e05343' : '#ffffff';
        ctx.fillRect(ax + 2, 18, sw - 1, 6);

        // Scalloped flap valance along front edge
        ctx.fillStyle = isRed ? '#96281b' : '#d9cebe';
        ctx.beginPath();
        ctx.arc(ax + sw / 2, 34, sw / 2, 0, Math.PI);
        ctx.fill();
      }
      R(15, 33, 170, 1.5, '#f7cb45'); // Gold rope trim

      // 10. Hand-Painted TSC Tong Signboard on Roof ("টিএসসি মালাই চা • TSC MALAI CHA")
      R(32, 2, 136, 15, '#3b2010');
      R(34, 3.5, 132, 12, '#f7cb45');
      R(35, 4.5, 130, 10, '#7a1c1c'); // Deep Maroon Tea Signboard

      ctx.fillStyle = '#fff8eb';
      ctx.font = 'bold 8px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TSC MALAI CHA', 100, 12.5);
    });
    // --- Animated Mama's Fuchka Cart (2 Frames: -0, -1 with Bubbling Chotpoti Steam) ---
    const drawFuchkaCartTexture = (ctx, frame = 0) => {
      const W = 216, H = 152;
      let seed = 445566;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

      ctx.fillStyle = 'rgba(12, 8, 20, 0.32)';
      ctx.beginPath(); ctx.ellipse(W / 2, 142, 98, 11, 0, 0, Math.PI * 2); ctx.fill();

      R(8, 96, 22, 4, '#4a2e1b'); R(8, 96, 22, 1.5, '#7c4d2b'); R(6, 95, 5, 6, '#d62828');
      R(32, 124, 136, 4, '#2b1d14'); R(38, 124, 5, 16, '#3d271d'); R(156, 124, 5, 16, '#3d271d');

      const drawCartWheel = (wx, wy, r) => {
        ctx.strokeStyle = '#6e472b'; ctx.lineWidth = 2;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * (r - 2), wy + Math.sin(a) * (r - 2)); ctx.stroke();
        }
        ctx.strokeStyle = '#1f191a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(wx, wy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#f7cb45'; ctx.beginPath(); ctx.arc(wx, wy, 3.5, 0, Math.PI * 2); ctx.fill();
      };
      drawCartWheel(56, 128, 13); drawCartWheel(144, 128, 13);

      R(24, 88, 152, 38, '#134e32'); R(27, 90, 146, 33, '#1f7a4c'); R(24, 102, 152, 4, '#f7cb45');
      R(20, 83, 160, 6, '#adb5bd'); R(20, 83, 160, 2, '#f8f9fa');

      [26, 78, 128, 170].forEach(px => {
        R(px, 32, 4, 52, '#ced4da');
        for (let ry = 36; ry < 80; ry += 8) R(px, ry, 4, 3, ry % 16 === 0 ? '#e63946' : '#ffb703');
      });

      R(30, 46, 50, 37, 'rgba(210, 245, 255, 0.28)');
      R(29, 44, 52, 3, '#d62828'); R(29, 81, 52, 2.5, '#d62828');
      for (let fy = 78; fy >= 54; fy -= 4) {
        for (let fx = 35; fx <= 75; fx += 5) {
          ctx.fillStyle = '#d99338'; ctx.beginPath(); ctx.arc(fx, fy, 2.6, 0, Math.PI * 2); ctx.fill();
        }
      }

      ctx.fillStyle = '#b88628'; ctx.beginPath(); ctx.ellipse(149, 72, 13, 9, 0, 0, Math.PI * 2); ctx.fill();

      // Steam wisps rising from the warm tamarind & chotpoti bowl
      ctx.strokeStyle = frame === 1 ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 255, 255, 0.30)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const steamShift = frame * 2;
      ctx.moveTo(145, 62 - steamShift);
      ctx.bezierCurveTo(142, 54 - steamShift, 148, 50 - steamShift, 145, 42 - steamShift);
      ctx.moveTo(152, 60 - steamShift);
      ctx.bezierCurveTo(156, 52 - steamShift, 150, 48 - steamShift, 154, 40 - steamShift);
      ctx.stroke();

      for (let i = 0; i < 10; i++) {
        const ax = 18 + i * 16.4;
        ctx.fillStyle = i % 2 === 0 ? '#1f7a4c' : '#f7cb45';
        ctx.beginPath(); ctx.moveTo(ax, 17); ctx.lineTo(ax + 16.4, 17); ctx.lineTo(ax + 15, 33); ctx.lineTo(ax - 1.4, 33); ctx.closePath(); ctx.fill();
      }
      R(26, 2, 148, 15, '#134e32'); R(28, 3.5, 144, 12, '#f7cb45'); R(29, 4.5, 142, 10, '#b81d24');
      ctx.fillStyle = '#fff8eb'; ctx.font = 'bold 7.5px "Press Start 2P", monospace'; ctx.textAlign = 'center';
      ctx.fillText("MAMA'S FUCHKA", 100, 12.5);
    };

    /**
     * @asset-spec
     * @id prop-fuchkacart
     * @external-png assets/sprites/stalls/fuchka_cart.png
     * @fallback-procedural prop-fuchkacart (216x152)
     * @grid-footprint 6x3 tiles (192x96px solid collision base)
     * @visual-size 224x160px (or 112x80px native pixel art upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 2 horizontal frames (striped canopy & steam)
     */
    makeTex('prop-fuchkacart', 216, 152, ctx => drawFuchkaCartTexture(ctx, 0));
    [0, 1].forEach(frame => {
      makeTex(`prop-fuchkacart-${frame}`, 216, 152, ctx => drawFuchkaCartTexture(ctx, frame));
    });

    // --- Animated Charukola Clay Art Studio (4-Frame Rotating Pottery Wheel: -0, -1, -2, -3) ---
    /**
     * @asset-spec
     * @id prop-charukola
     * @external-png assets/sprites/stalls/charukola_exhibit.png
     * @fallback-procedural prop-charukola-0 (216x152)
     * @grid-footprint 6x3 tiles (192x96px solid collision base)
     * @visual-size 224x160px (or 112x80px native pixel art upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 4 horizontal frames (rotating pottery wheel & fluttering art banners)
     */
    [0, 1, 2, 3].forEach(frame => {
      makeTex(`prop-charukola-${frame}`, 216, 152, (ctx, cw, ch) => {
        const W = 216, H = 152;
        const spin = frame; // 0, 1, 2, 3 rotation offset for the pottery wheel
        let seed = 556677;
        const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

        // 1. Ambient Ground Shadow & Clay Dust Floor
        ctx.fillStyle = 'rgba(12, 8, 20, 0.32)';
        ctx.beginPath(); ctx.ellipse(W / 2, 142, 98, 11, 0, 0, Math.PI * 2); ctx.fill();

        // Terracotta clay dust splatters on the sidewalk
        ['#c28b38', '#9c623e', '#d4a373'].forEach((dc, idx) => {
          ctx.fillStyle = dc;
          ctx.fillRect(45 + idx * 40, 137 + (idx % 2) * 3, 5, 2);
          ctx.fillRect(75 + idx * 28, 139 - (idx % 2) * 2, 3, 2);
        });

        // 2. Open-Air Brick & Bamboo Pottery Studio Pavilion Structure
        R(18, 26, 180, 108, '#3b2010'); // Dark studio backdrop
        // Stacked red terracotta bricks along back wall
        for (let by = 30; by < 96; by += 8) {
          for (let bx = 22; bx < 190; bx += 16) {
            R(bx + ((by % 16 === 0) ? 0 : 8), by, 14, 6, '#8c3f2b');
            R(bx + ((by % 16 === 0) ? 0 : 8) + 1, by + 1, 12, 4, '#a8513b');
          }
        }

        // Sturdy Timber Posts
        [18, 76, 134, 192].forEach(px => {
          R(px, 24, 7, 112, '#4a2e1b');
          R(px + 1.5, 24, 3, 112, '#7c4d2b');
        });

        // 3. Left Shelf: Drying Terracotta Mugs, Kulhar Cups & Painted Pots
        R(24, 52, 54, 4, '#5c3822');
        R(24, 78, 54, 4, '#5c3822');

        // Mugs & Clay Pots on Shelves (with the lopsided heart mugs from date!)
        const drawMiniMug = (mx, my, painted = false) => {
          ctx.fillStyle = '#b55435';
          ctx.fillRect(mx, my, 8, 9);
          ctx.fillStyle = '#d97757';
          ctx.fillRect(mx + 1, my + 1, 6, 7);
          ctx.strokeStyle = '#8c3f2b'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(mx - 1, my + 4, 2.5, 0.5, Math.PI * 1.5); ctx.stroke();
          if (painted) {
            ctx.fillStyle = '#e63946'; // Painted lopsided heart on mug
            ctx.fillRect(mx + 3, my + 3, 2, 2);
          }
        };
        [30, 41, 52, 63].forEach((mx, i) => drawMiniMug(mx, 42, i === 1));
        [34, 46, 58].forEach((mx, i) => drawMiniMug(mx, 68, i === 0));

        // 4. Center Stage: Spinning Potter’s Wheel (Chaka) with Wet Clay Lump Answering Frames 0–3!
        // Wooden base of potter's wheel
        R(88, 102, 40, 26, '#4a2e1b');
        R(84, 98, 48, 6, '#7c4d2b');

        // Heavy Iron Flywheel & Spinning Chaka Head
        ctx.fillStyle = '#212529';
        ctx.beginPath(); ctx.ellipse(108, 98, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#adb5bd';
        ctx.beginPath(); ctx.ellipse(108, 97, 17, 5.5, 0, 0, Math.PI * 2); ctx.fill();

        // Rotating Wet Clay Lump on Wheel (Changes shape/spin offset across frames 0, 1, 2, 3!)
        ctx.fillStyle = '#b5653d'; // Wet soft clay
        ctx.beginPath();
        const cwW = 8 + (spin % 2 === 0 ? 3 : 0);
        const cwH = 12 - (spin % 2 === 0 ? 0 : 2);
        ctx.ellipse(108 + (spin === 1 ? 1 : spin === 3 ? -1 : 0), 91, cwW, cwH, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d49065'; // Wet clay wet-gleam highlight
        ctx.fillRect(106 + (spin % 2), 88, 3, 4);

        // 5. Right Station: Art Easel with Pohela Boishakh Canvas & Palette Table
        // Wooden Easel Legs
        ctx.strokeStyle = '#5c3822'; ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(156, 124); ctx.lineTo(142, 54);
        ctx.moveTo(178, 124); ctx.lineTo(192, 54);
        ctx.moveTo(167, 124); ctx.lineTo(167, 50);
        ctx.stroke();

        // Canvas Board on Easel (Featuring colorful Dhaka rickshaw motifs)
        R(144, 46, 46, 36, '#fff8eb');
        R(142, 44, 50, 3, '#4a2e1b'); // Canvas wooden frame
        // Rickshaw art sun & flowers on canvas
        ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.arc(167, 60, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f7cb45'; ctx.beginPath(); ctx.arc(167, 60, 4, 0, Math.PI * 2); ctx.fill();
        R(150, 72, 34, 3, '#2a9d8f');

        // Wooden Artist Palette & Jars of Brushes on Table below Easel
        R(138, 98, 44, 6, '#7c4d2b');
        ctx.fillStyle = '#deb887'; // Wooden oval palette
        ctx.beginPath(); ctx.ellipse(150, 94, 9, 6, 0.2, 0, Math.PI * 2); ctx.fill();
        ['#e63946', '#ffb703', '#457b9d', '#2a9d8f'].forEach((pc, pi) => {
          ctx.fillStyle = pc;
          ctx.beginPath(); ctx.arc(146 + pi * 3, 93, 1.5, 0, Math.PI * 2); ctx.fill();
        });
        // Jar of paintbrushes
        R(174, 88, 7, 10, 'rgba(210,245,255,0.45)');
        [[175, 84], [177, 83], [179, 85]].forEach(([bx, by]) => {
          ctx.strokeStyle = '#5c3822'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(bx, 88); ctx.lineTo(bx + 1, by); ctx.stroke();
          ctx.fillStyle = '#e63946'; ctx.fillRect(bx, by, 1.2, 2);
        });

        // 6. Corrugated Tin Roof & Colorful Art Banner
        R(14, 18, 188, 12, '#3b414d');
        R(14, 28, 188, 3, '#212529');

        // Hand-Painted Signboard ("চারুকলা ফাইন আর্টস • CHARUKOLA ART")
        R(36, 2, 144, 15, '#4a2e1b');
        R(38, 3.5, 140, 12, '#f7cb45');
        R(39, 4.5, 138, 10, '#9e2a2b'); // Crimson Art Banner

        ctx.fillStyle = '#fff8eb';
        ctx.font = 'bold 7.5px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CHARUKOLA ART', 108, 12.5);
      });
    });

    /**
     * @asset-spec
     * @id prop-doicart
     * @external-png assets/sprites/stalls/pabna_doi_cart.png
     * @fallback-procedural prop-doicart (216x152)
     * @grid-footprint 6x3 tiles (192x96px solid collision base)
     * @visual-size 224x160px (or 112x80px native pixel art upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 4 horizontal frames (earthen pots display, rising vapor & gentle awning flutter)
     */
    const drawDoiCartTexture = (ctx: CanvasRenderingContext2D, frame = 0) => {
      const W = 216, H = 152;
      let seed = 778899;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const R = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

      // 1. Ambient Ground Shadow
      ctx.fillStyle = 'rgba(12, 8, 20, 0.32)';
      ctx.beginPath(); ctx.ellipse(W / 2, 142, 98, 11, 0, 0, Math.PI * 2); ctx.fill();

      // 2. Wooden Pushcart Handles, Chassis & Spoked Wheels
      R(8, 96, 22, 4, '#5c3822');
      R(8, 96, 22, 1.5, '#8f5b3c');
      R(6, 95, 5, 6, '#d97757');

      R(32, 124, 136, 4, '#3b2010');
      R(38, 124, 5, 16, '#5c3822');
      R(156, 124, 5, 16, '#5c3822');

      const drawCartWheel = (wx: number, wy: number, r: number) => {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(wx, wy + r, r * 0.9, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#6e472b'; ctx.lineWidth = 2;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          ctx.beginPath();
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx + Math.cos(a) * (r - 2), wy + Math.sin(a) * (r - 2));
          ctx.stroke();
        }
        ctx.strokeStyle = '#1f191a'; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(wx, wy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#8c583a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(wx, wy, r - 2.2, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#f7cb45';
        ctx.beginPath(); ctx.arc(wx, wy, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2b1d14';
        ctx.beginPath(); ctx.arc(wx, wy, 1.5, 0, Math.PI * 2); ctx.fill();
      };

      // 3. Terracotta & Warm Ochre Sweet-Cart Body
      R(24, 88, 152, 38, '#78351f'); // Deep terracotta outer frame
      R(27, 90, 146, 33, '#9c4221'); // Main ochre-terracotta panel
      R(27, 90, 146, 2, '#b5542c');  // Top sunlit bevel

      // Traditional Old Dhaka Folk Swirl Panels
      R(24, 102, 152, 4, '#f7cb45');
      R(24, 103, 152, 2, '#c28b38');
      R(24, 122, 152, 3, '#f7cb45');

      [34, 82, 130].forEach(px => {
        R(px, 92, 36, 9, '#5c2814');
        R(px + 1, 93, 34, 7, '#fff5de');
        // Sweetmeat motif inside panel
        ctx.fillStyle = '#b5542c';
        ctx.beginPath(); ctx.arc(px + 18, 96.5, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f7cb45';
        ctx.fillRect(px + 16.5, 95, 3, 3);

        R(px, 108, 36, 12, '#6e3019');
        R(px + 2, 110, 32, 8, '#f7cb45');
        R(px + 4, 111, 28, 6, '#8c4f2b');
      });

      drawCartWheel(56, 128, 13);
      drawCartWheel(144, 128, 13);

      // 4. Stainless Steel & Glass Countertop for Chilled Sweets
      R(20, 83, 160, 6, '#adb5bd');
      R(20, 83, 160, 2, '#ffffff');
      R(20, 88, 160, 1.5, '#495057');

      // 4 Sturdy Support Pillars (Never removed or flickering across animation!)
      [26, 78, 128, 170].forEach(px => {
        R(px, 32, 4, 52, '#ced4da');
        R(px, 32, 1.5, 52, '#ffffff');
        for (let ry = 36; ry < 80; ry += 8) {
          R(px, ry, 4, 3, ry % 16 === 0 ? '#c28b38' : '#fff5de');
        }
      });

      // 5. Left Station: Stacked Earthen Pots (Matir Paan / Matir Haari) of Bogurar Mishti Doi
      const drawDoiPot = (px: number, py: number, isTop = false) => {
        ctx.fillStyle = '#b5542c';
        ctx.beginPath(); ctx.ellipse(px, py, 6.5, 5.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d97757';
        ctx.beginPath(); ctx.ellipse(px, py - 1, 5.5, 4.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff3d1'; // Caramelized golden yogurt skin on top
        ctx.beginPath(); ctx.ellipse(px, py - 1, 4.5, 2, 0, 0, Math.PI * 2); ctx.fill();
        if (isTop) {
          // Subtle appetizing golden glint on the top yogurt pot
          const glintShift = (frame % 2 === 0) ? 0 : 0.5;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.fillRect(px - 2 + glintShift, py - 2, 1.5, 1);
        }
      };
      // Pyramid of mishti doi pots
      [36, 44, 52].forEach(px => drawDoiPot(px, 78));
      [40, 48].forEach(px => drawDoiPot(px, 69));
      drawDoiPot(44, 60, true);

      // Cool gentle condensation mist rising from chilled clay pots
      const mistShiftDoi = (frame % 4) * 1.5;
      ctx.strokeStyle = (frame % 2 === 0) ? 'rgba(230, 245, 255, 0.40)' : 'rgba(230, 245, 255, 0.20)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(42, 57 - mistShiftDoi);
      ctx.bezierCurveTo(40, 52 - mistShiftDoi, 46, 48 - mistShiftDoi, 43, 42 - mistShiftDoi);
      ctx.stroke();

      // 6. Center Station: Glass Showcase with Rosogolla, Sandesh & Chomchom
      R(66, 48, 56, 35, 'rgba(210, 245, 255, 0.30)');
      R(65, 46, 58, 3, '#c28b38');
      R(65, 83, 58, 2.5, '#c28b38');

      // Colorful Sweetmeats inside glass showcase (deterministic coordinates!)
      const sweetCols = ['#fff5de', '#f7cb45', '#d97757', '#b5542c', '#e63946'];
      for (let sy = 78; sy >= 56; sy -= 5) {
        for (let sx = 72; sx <= 114; sx += 6) {
          const sc = sweetCols[((sx + sy) | 0) % sweetCols.length];
          ctx.fillStyle = sc;
          ctx.beginPath();
          ctx.arc(sx + (rnd() - 0.5) * 1.5, sy + (rnd() - 0.5) * 1.2, 2.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(sx - 0.8, sy - 1.2, 1, 1);
        }
      }

      // Smooth diagonal glass showcase reflection gleam
      const glassGleamX = 70 + ((frame * 12) % 48);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(glassGleamX, 50);
      ctx.lineTo(glassGleamX - 8, 80);
      ctx.stroke();

      // 7. Right Station: Big Stainless Steel Pot of Chilled Rose-Water Lassi & Wooden Churner
      ctx.fillStyle = '#ced4da';
      ctx.beginPath(); ctx.ellipse(152, 75, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e9ecef';
      ctx.beginPath(); ctx.ellipse(150, 74, 9, 7.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fceade'; // Chilled pinkish-white rose lassi surface
      ctx.beginPath(); ctx.ellipse(150, 68, 8, 3, 0, 0, Math.PI * 2); ctx.fill();

      // Wooden lassi churner (mathani) resting in the pot with subtle realistic hand-churn rocking
      const churnAngle = Math.sin((frame * Math.PI) / 2) * 1.8;
      ctx.strokeStyle = '#8c583a'; ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(150, 68);
      ctx.lineTo(154 + churnAngle, 54);
      ctx.stroke();
      ctx.fillStyle = '#6e3f23';
      ctx.fillRect(151 + churnAngle, 52, 6, 3);

      // Refreshing cool chilled lassi vapor wisps rising smoothly
      const lassiVaporShift = (frame % 4) * 2;
      ctx.strokeStyle = (frame % 2 === 0) ? 'rgba(224, 242, 254, 0.55)' : 'rgba(224, 242, 254, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(148, 65 - lassiVaporShift);
      ctx.bezierCurveTo(145, 57 - lassiVaporShift, 151, 52 - lassiVaporShift, 147, 44 - lassiVaporShift);
      ctx.moveTo(154, 63 - lassiVaporShift);
      ctx.bezierCurveTo(158, 55 - lassiVaporShift, 152, 50 - lassiVaporShift, 156, 42 - lassiVaporShift);
      ctx.stroke();

      // Two Ready-to-Serve Tall Glass Tumblers of Lassi with Pistachio Garnish
      [174, 184].forEach((gx) => {
        R(gx, 68, 5, 13, 'rgba(255, 240, 245, 0.65)');
        R(gx, 77, 5, 4, '#fceade'); // Lassi liquid
        R(gx + 1, 67, 3, 1, '#2d6a4f'); // Crushed pistachios on top
      });

      // 8. Hanging Sweetmeat Nameboard & Festive Awning Canopy
      const stripes = 10;
      const sw = 164 / stripes;
      for (let i = 0; i < stripes; i++) {
        const ax = 18 + i * sw;
        const isYellow = i % 2 === 0;
        // Subtle breeze flutter on alternate awning scallops
        const flutter = (i % 2 === 0 && frame % 2 === 1) ? 0.8 : 0;
        ctx.fillStyle = isYellow ? '#f7cb45' : '#c28b38';
        ctx.beginPath();
        ctx.moveTo(ax + 2, 17);
        ctx.lineTo(ax + sw + 2, 17);
        ctx.lineTo(ax + sw, 33 + flutter);
        ctx.lineTo(ax, 33 + flutter);
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = isYellow ? '#ffe680' : '#d99e48';
        ctx.fillRect(ax + 2, 19, sw - 1, 5);

        ctx.fillStyle = isYellow ? '#a67220' : '#8c583a';
        ctx.beginPath();
        ctx.arc(ax + sw / 2, 33 + flutter, sw / 2, 0, Math.PI);
        ctx.fill();
      }
      R(18, 32, 164, 1.5, '#78351f');

      // 9. Bold Rooftop Signboard ("বগুড়ার মিষ্টি দই • BOGURAR MISHTI DOI")
      R(26, 2, 148, 15, '#5c2814');
      R(28, 3.5, 144, 12, '#f7cb45');
      R(29, 4.5, 142, 10, '#b5542c'); // Rich Caramel-Brown Banner

      ctx.fillStyle = '#fff8eb';
      ctx.font = 'bold 7.5px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('MISHTI DOI & LASSI', 100, 12.5);
    };

    makeTex('prop-doicart', 216, 152, ctx => drawDoiCartTexture(ctx, 0));
    [0, 1, 2, 3].forEach(frame => {
      makeTex(`prop-doicart-${frame}`, 216, 152, ctx => drawDoiCartTexture(ctx, frame));
    });

    /**
     * @asset-spec
     * @id prop-rickshaw
     * @external-png assets/sprites/vehicles/dhaka_rickshaw.png
     * @fallback-procedural prop-rickshaw (96x76)
     * @grid-footprint 3x2 tiles (96x64px solid collision base)
     * @visual-size 96x76px (or 48x38px native pixel art upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 1 static side-view vehicle
     */
    makeTex('prop-rickshaw', 96, 76, ctx => {
      // ===== Dhaka cycle-rickshaw (side view, facing right): folded painted hood, floral body, bicycle front =====
      const C = {
        out: '#1b0f16', pink: '#d9386a', pinkL: '#f06a92', pinkD: '#8f1f47', gold: '#f7cb45', goldD: '#c8962a',
        teal: '#1b8f89', tealL: '#52d3c8', tealD: '#0f5a56', red: '#b8202f', redL: '#e2465a', redD: '#7e1421',
        steel: '#d5dbe1', steelD: '#8e96a1', tire: '#17151a', frame: '#232a3d', frameL: '#4b5a85', cream: '#fff3c4'
      };
      const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
      const rad = d => d * Math.PI / 180;
      const arc = (cx, cy, r, a0, a1, w, c) => {
        ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.arc(cx, cy, r, rad(a0), rad(a1)); ctx.stroke();
      };
      const line = (x0, y0, x1, y1, w, c) => {
        ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      };
      const dot = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };

      // --- 1. ground shadow
      ctx.fillStyle = 'rgba(15,10,22,0.30)';
      ctx.beginPath(); ctx.ellipse(48, 73.5, 45, 3.4, 0, 0, Math.PI * 2); ctx.fill();

      // --- 2. bicycle frame (drawn first: sits behind the body / wheels)
      const tube = (x0, y0, x1, y1) => { line(x0, y0, x1, y1, 3.4, C.out); line(x0, y0, x1, y1, 1.8, C.frame); line(x0 - 0.4, y0 - 0.4, x1 - 0.4, y1 - 0.4, 0.6, C.frameL); };
      tube(27, 61, 63, 62);          // chassis rail from rear axle to crank
      tube(63, 62, 63, 43);          // seat tube
      tube(63, 44, 76, 41);          // top tube
      tube(63, 62, 77, 43);          // down tube
      tube(76, 40, 80, 63);          // steering fork

      // --- 3. passenger body: painted floral side panel, floor and seat
      R(9, 49, 52, 3, C.out); R(10, 49, 50, 2, '#2d3550');                                  // floor / chassis plate
      ctx.fillStyle = C.out; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(8, 36, 53, 14, 3) : ctx.rect(8, 36, 53, 14); ctx.fill();
      ctx.fillStyle = C.teal; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(9, 37, 51, 12, 2.5) : ctx.rect(9, 37, 51, 12); ctx.fill();
      R(10, 37, 49, 1, C.tealL);                                                             // lit top edge
      R(10, 48, 49, 1, C.tealD);                                                             // shaded bottom edge
      R(9, 40, 51, 1, C.gold); R(9, 46, 51, 1, C.gold);                                      // gold pin-stripes
      R(9, 41, 51, 1, C.goldD); R(9, 47, 51, 1, C.goldD);
      for (let i = 0; i < 6; i++) {                                                          // painted lotus flowers
        const fx = 15 + i * 8.6;
        dot(fx - 1.6, 43.3, 1.5, C.pinkL); dot(fx + 1.6, 43.3, 1.5, C.pinkL); dot(fx, 42, 1.5, C.pink); dot(fx, 44.6, 1.5, C.pink);
        dot(fx, 43.3, 1.1, C.gold);
        R(fx - 4.2, 43, 1.4, 1, '#7be0a0'); R(fx + 3, 43, 1.4, 1, '#7be0a0');                // leaves
      }
      // seat back (padded) + cushion
      ctx.fillStyle = C.out; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(8, 17, 11, 21, 3) : ctx.rect(8, 17, 11, 21); ctx.fill();
      ctx.fillStyle = C.red; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(9, 18, 9, 19, 2.5) : ctx.rect(9, 18, 9, 19); ctx.fill();
      R(10, 19, 2, 16, C.redL); R(16, 19, 2, 16, C.redD);
      [[13, 23], [13, 29], [13, 35]].forEach(([bx, by]) => { dot(bx, by, 1, C.gold); });  // gold tufting buttons
      ctx.fillStyle = C.out; ctx.fillRect(18, 31, 38, 7);
      R(19, 32, 36, 5, C.red); R(19, 32, 36, 1, C.redL); R(19, 36, 36, 1, C.redD);
      for (let x = 24; x < 54; x += 8) R(x, 34, 2, 1, C.redD);

      // --- 4. folded painted hood: layered colour bands, ribs, bead trim, tassels
      const HX = 35, HY = 37, A0 = 191, A1 = 349;
      ctx.fillStyle = 'rgba(60,20,40,0.55)';                                                 // dark interior
      ctx.beginPath(); ctx.moveTo(HX, HY); ctx.arc(HX, HY, 22, rad(A0), rad(A1)); ctx.closePath(); ctx.fill();
      arc(HX, HY, 26.5, A0, A1, 10.5, C.out);                                                // outline
      arc(HX, HY, 26.5, A0, A1, 8.6, C.pink);                                                // main fabric
      arc(HX, HY, 30.2, A0 + 1, A1 - 1, 1.6, C.gold);                                        // gold outer binding
      arc(HX, HY, 22.8, A0 + 1, A1 - 1, 1.6, C.teal);                                        // teal inner binding
      arc(HX, HY, 28.6, 222, 292, 2, C.pinkL);                                               // sun-lit fold highlight
      arc(HX, HY, 24.2, 262, 346, 2, C.pinkD);                                               // shaded underside
      for (let a = A0 + 8; a < A1 - 4; a += 13) {                                            // ribs
        line(HX + 22.5 * Math.cos(rad(a)), HY + 22.5 * Math.sin(rad(a)), HX + 30.6 * Math.cos(rad(a)), HY + 30.6 * Math.sin(rad(a)), 1, C.pinkD);
      }
      for (let a = A0 + 4; a < A1 - 2; a += 9) {                                             // cream bead trim
        dot(HX + 26.5 * Math.cos(rad(a)), HY + 26.5 * Math.sin(rad(a)), 0.8, C.cream);
      }
      // hood hinges / support struts
      line(12, 33, 12, 37, 1.6, C.steelD); line(12, 33, 12, 36, 0.8, C.steel);
      line(58, 33, 59, 37, 1.6, C.steelD); line(58, 33, 59, 36, 0.8, C.steel);
      // hanging tassels at hood front
      [57, 60, 63].forEach((tx, i) => {
        line(tx - 0.5, 34, tx - 0.5, 37 + (i % 2) * 2, 0.8, C.goldD);
        dot(tx - 0.5, 38.4 + (i % 2) * 2, 1.2, i === 1 ? C.red : C.gold);
      });

      // --- 5. wheels (tyre, rim, 20 spokes, hub, tyre highlight) + mudguards
      const wheel = (cx, cy, r) => {
        ctx.fillStyle = 'rgba(20,20,30,0.16)'; ctx.beginPath(); ctx.arc(cx, cy, r - 2.5, 0, Math.PI * 2); ctx.fill();
        for (let a = 0; a < 360; a += 18) {
          line(cx + 2 * Math.cos(rad(a)), cy + 2 * Math.sin(rad(a)), cx + (r - 3) * Math.cos(rad(a + 6)), cy + (r - 3) * Math.sin(rad(a + 6)), 0.6, 'rgba(213,219,225,0.85)');
        }
        arc(cx, cy, r - 1.2, 0, 360, 2.6, C.tire);                                           // tyre
        arc(cx, cy, r - 3.1, 0, 360, 1, C.steel);                                            // rim
        arc(cx, cy, r - 1.2, 200, 260, 0.9, 'rgba(255,255,255,0.35)');                       // tyre highlight
        dot(cx, cy, 2.2, C.steelD); dot(cx, cy, 1.2, C.out); dot(cx - 0.4, cy - 0.4, 0.5, C.steel);
      };
      wheel(27, 61, 13);
      wheel(80, 63, 11);
      arc(27, 61, 14.8, 196, 344, 2.4, C.out); arc(27, 61, 14.8, 197, 343, 1.4, C.teal);     // rear fender
      arc(27, 61, 14.1, 205, 270, 0.7, C.tealL);
      arc(80, 63, 12.8, 205, 335, 2.2, C.out); arc(80, 63, 12.8, 206, 334, 1.2, C.pink);     // front fender
      arc(80, 63, 12.2, 215, 270, 0.7, C.pinkL);

      // --- 6. pedals, chain-ring, saddle, handlebars, bell, lamp
      dot(63, 62, 3.6, C.out); dot(63, 62, 2.7, C.steelD); dot(63, 62, 1.2, C.out);        // chain-ring
      line(63, 62, 60, 68, 1.6, C.out); R(57, 68, 5, 2, C.out); R(58, 68, 3, 1, C.steelD); // crank + pedal
      R(58, 40, 10, 3, C.out); R(59, 40, 8, 2, '#3a2a22'); R(59, 40, 5, 1, '#6e5242');     // leather saddle
      line(76, 40, 75, 32, 2.6, C.out); line(76, 40, 75, 32, 1.2, C.steel);                // stem
      line(70, 31, 81, 30, 2.6, C.out); line(70, 31, 81, 30, 1.2, C.steel);                // handlebar
      R(80, 28, 3, 4, C.out); R(80, 29, 2, 2, C.red);                                      // grip
      dot(72, 28.5, 2.6, C.out); dot(72, 28.5, 1.9, C.gold); R(71, 27, 1, 1, C.cream);     // brass bell
      dot(78, 38, 2.4, C.out); dot(78, 38, 1.7, '#ffe98a'); R(77, 37, 1, 1, '#ffffff');    // head-lamp

      // --- 7. rear reflector + number plate + tin trim
      R(6, 41, 3, 3, C.out); R(6, 42, 2, 2, '#ff3b3b');
      R(8, 45, 3, 3, C.out); R(8, 46, 2, 2, C.gold);
    });
    // ===== Lantern Rowboat: layered pixel-art parts (hull interior, hull front/gunwale, oar, sky lantern) =====
    const boatKit = (() => {
      const W = {
        out: '#2a170b', wallD: '#4f2c16', wall: '#6e4226', wallL: '#8a5a34',
        floor: '#a9743f', floorL: '#c08a52', floorD: '#7a4e2a',
        thwart: '#c79a5e', thwartL: '#e6c088', thwartD: '#8a5e32',
        rim: '#ecd9ab', rimL: '#fff4d0', rimD: '#9c855a',
        hull: '#8a5230', hullL: '#a8683c', hullD: '#5e3720',
        red: '#c43a3a', redD: '#8f2424', brass: '#e6c25a', brassD: '#b8902a', steel: '#9aa3ad', steelD: '#5d6670'
      };
      // cubic bezier helpers: far gunwale F, near gunwale N, waterline Wl (texture is 156x72, bow points right)
      const F = [[14, 21], [46, 11], [104, 12], [148, 36]];
      const N = [[14, 51], [46, 60], [104, 59], [148, 36]];
      const WL = [[16, 60], [46, 69], [104, 68], [145, 39]];
      const pt = (c, t) => {
        const u = 1 - t;
        return [u * u * u * c[0][0] + 3 * u * u * t * c[1][0] + 3 * u * t * t * c[2][0] + t * t * t * c[3][0],
                u * u * u * c[0][1] + 3 * u * u * t * c[1][1] + 3 * u * t * t * c[2][1] + t * t * t * c[3][1]];
      };
      const yAt = (c, x) => { let best = c[0][1], bd = 1e9; for (let t = 0; t <= 1; t += 0.005) { const p = pt(c, t); const d = Math.abs(p[0] - x); if (d < bd) { bd = d; best = p[1]; } } return best; };
      const path = (ctx, c, move) => { if (move) ctx.moveTo(c[0][0], c[0][1]); ctx.bezierCurveTo(c[1][0], c[1][1], c[2][0], c[2][1], c[3][0], c[3][1]); };
      const rev = (ctx, c) => ctx.bezierCurveTo(c[2][0], c[2][1], c[1][0], c[1][1], c[0][0], c[0][1]);
      const shift = (c, dy, dx = 0) => c.map(p => [p[0] + dx, p[1] + dy]);
      const stroke = (ctx, c, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); path(ctx, c, true); ctx.stroke(); };
      const R = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
      return { W, F, N, WL, pt, yAt, path, rev, shift, stroke, R };
    })();

    /**
     * @asset-spec
     * @id prop-boat
     * @external-png assets/sprites/vehicles/dhanmondi_rowboat.png
     * @fallback-procedural prop-boat (156x72)
     * @grid-footprint 5x2 tiles (160x64px solid collision base)
     * @visual-size 160x72px (or 80x36px native pixel art upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 1 static watercraft with oars and lanterns
     */
    makeTex('prop-boat', 156, 72, ctx => {
      const { W, F, N, pt, yAt, path, rev, shift, stroke, R } = boatKit;
      // hull cavity: dark inner walls
      ctx.fillStyle = W.wallD; ctx.beginPath(); path(ctx, F, true); ctx.lineTo(148, 36); rev(ctx, N); ctx.closePath(); ctx.fill();
      // far inner wall (lit planks + ribs), seen from above
      ctx.save(); ctx.beginPath(); path(ctx, F, true); ctx.lineTo(148, 36); rev(ctx, shift(F, 8, 0)); ctx.closePath(); ctx.clip();
      ctx.fillStyle = W.wall; ctx.fillRect(0, 0, 156, 72);
      ctx.fillStyle = W.wallL; ctx.fillRect(0, 0, 156, 3);
      for (let x = 18; x < 146; x += 9) { ctx.fillStyle = 'rgba(40,20,8,0.55)'; ctx.fillRect(x, 8, 2, 14); ctx.fillStyle = 'rgba(255,220,160,0.14)'; ctx.fillRect(x + 2, 8, 1, 14); }
      ctx.restore();
      // floor boards
      const FI = [[24, 29], [54, 21], [100, 22], [132, 36]], NI = [[24, 46], [54, 53], [100, 52], [132, 36]];
      ctx.save(); ctx.beginPath(); path(ctx, FI, true); ctx.lineTo(132, 36); rev(ctx, NI); ctx.closePath(); ctx.clip();
      ctx.fillStyle = W.floor; ctx.fillRect(0, 0, 156, 72);
      for (let y = 22; y < 56; y += 5) { ctx.fillStyle = W.floorD; ctx.fillRect(0, y, 156, 1); ctx.fillStyle = 'rgba(255,225,170,0.18)'; ctx.fillRect(0, y + 1, 156, 1); }
      for (let i = 0; i < 26; i++) { ctx.fillStyle = 'rgba(70,40,18,0.35)'; ctx.fillRect(26 + ((i * 37) % 100), 23 + ((i * 11) % 30), 3, 1); }  // wood grain
      const g = ctx.createLinearGradient(0, 18, 0, 56); g.addColorStop(0, 'rgba(20,8,2,0.42)'); g.addColorStop(0.5, 'rgba(20,8,2,0.0)'); g.addColorStop(1, 'rgba(20,8,2,0.18)');
      ctx.fillStyle = g; ctx.fillRect(0, 18, 156, 40);
      ctx.restore();
      // thwarts (cross benches)
      [44, 98].forEach(tx => {
        const y0 = Math.round(yAt(FI, tx)) - 2, y1 = Math.round(yAt(NI, tx)) + 2;
        R(ctx, tx, y0, 11, y1 - y0, W.out); R(ctx, tx + 1, y0 + 1, 9, y1 - y0 - 2, W.thwart);
        R(ctx, tx + 1, y0 + 1, 3, y1 - y0 - 2, W.thwartL); R(ctx, tx + 8, y0 + 1, 2, y1 - y0 - 2, W.thwartD);
        R(ctx, tx - 1, y0 - 2, 13, 3, W.wallD);                                          // knee bracket on far wall
      });
      // coiled rope on the floor
      ctx.strokeStyle = '#d9c08a'; ctx.lineWidth = 1.4;
      [5, 3.4, 1.8].forEach(r => { ctx.beginPath(); ctx.ellipse(31, 38, r * 1.5, r, 0, 0, Math.PI * 2); ctx.stroke(); });
      // far gunwale rim
      stroke(ctx, shift(F, 2.4), 1.6, W.out); stroke(ctx, F, 3.6, W.rim); stroke(ctx, shift(F, -1.2), 1, W.rimL);
      // transom (stern) cap
      ctx.strokeStyle = W.out; ctx.lineWidth = 5.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(14, 21); ctx.lineTo(14, 51); ctx.stroke();
      ctx.strokeStyle = W.rim; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(14, 21); ctx.lineTo(14, 51); ctx.stroke();
      ctx.strokeStyle = W.rimL; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(13, 23); ctx.lineTo(13, 49); ctx.stroke();
      // far oarlock
      const ofy = yAt(F, 66);
      ctx.fillStyle = W.out; ctx.beginPath(); ctx.arc(66, ofy, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = W.steel; ctx.beginPath(); ctx.arc(66, ofy, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = W.steelD; ctx.beginPath(); ctx.arc(66, ofy, 1.1, 0, Math.PI * 2); ctx.fill();
      // bow stem cap
      ctx.fillStyle = W.out; ctx.beginPath(); ctx.arc(147, 36, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = W.brass; ctx.beginPath(); ctx.arc(147, 36, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff1b0'; ctx.fillRect(146, 34, 1, 1);
      // lantern posts with hooks + paper lanterns (stern left, bow right)
      const lantern = (cx, cy) => {
        ctx.fillStyle = W.out; ctx.fillRect(cx - 1, cy - 8, 2, 3);
        R(ctx, cx - 4, cy - 6, 9, 3, W.out); R(ctx, cx - 3, cy - 6, 7, 2, W.brass);
        ctx.fillStyle = W.out; ctx.beginPath(); ctx.ellipse(cx, cy + 2, 7.4, 8.4, 0, 0, Math.PI * 2); ctx.fill();
        const lg = ctx.createRadialGradient(cx, cy + 2, 1, cx, cy + 2, 7.4); lg.addColorStop(0, '#ffe08a'); lg.addColorStop(0.45, '#ff9a3a'); lg.addColorStop(1, '#c42f2f');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(cx, cy + 2, 6.4, 7.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(120,20,20,0.7)'; ctx.lineWidth = 0.8;
        [-3.6, 0, 3.6].forEach(o => { ctx.beginPath(); ctx.ellipse(cx, cy + 2, Math.abs(o) < 1 ? 0.6 : 3.6 - Math.abs(o) * 0.1, 7.2, 0, 0, Math.PI * 2); if (o === 0) { ctx.moveTo(cx, cy - 5); ctx.lineTo(cx, cy + 9); } ctx.stroke(); });
        R(ctx, cx - 3, cy + 8, 7, 2, W.out); R(ctx, cx - 2, cy + 8, 5, 1, W.brass);
        ctx.strokeStyle = W.brassD; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(cx, cy + 10); ctx.lineTo(cx, cy + 14); ctx.stroke();
        ctx.fillStyle = W.red; ctx.beginPath(); ctx.arc(cx, cy + 15, 1.3, 0, Math.PI * 2); ctx.fill();
        R(ctx, cx - 3, cy - 3, 1, 3, 'rgba(255,200,170,0.55)');
      };
      const post = (px, py, ax) => {                                               // wooden pole + hooked arm
        ctx.strokeStyle = W.out; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, 7); ctx.lineTo(ax, 7); ctx.stroke();
        ctx.strokeStyle = W.wallL; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, 7); ctx.lineTo(ax, 7); ctx.stroke();
        R(ctx, px - 3, py - 1, 7, 3, W.out); R(ctx, px - 2, py - 1, 5, 2, W.thwart);
      };
      post(20, 44, 27); lantern(27, 17);
      post(136, 40, 141); lantern(141, 17);
    });

    makeTex('prop-boat-front', 156, 72, ctx => {
      const { W, N, WL, path, rev, shift, stroke, R } = boatKit;
      // outer hull strip below the near gunwale (clinker planks, painted sheer stripe)
      ctx.save(); ctx.beginPath(); path(ctx, N, true); ctx.lineTo(145, 39); rev(ctx, WL); ctx.closePath(); ctx.clip();
      ctx.fillStyle = W.hull; ctx.fillRect(0, 0, 156, 72);
      const hg = ctx.createLinearGradient(0, 52, 0, 70); hg.addColorStop(0, 'rgba(255,220,170,0.16)'); hg.addColorStop(1, 'rgba(15,6,2,0.55)');
      ctx.fillStyle = hg; ctx.fillRect(0, 50, 156, 22);
      stroke(ctx, shift(N, 3.4), 2.8, W.red); stroke(ctx, shift(N, 5.6), 1, W.rim);
      stroke(ctx, shift(N, 8.2), 0.9, 'rgba(30,14,6,0.7)'); stroke(ctx, shift(N, 10.6), 0.9, 'rgba(30,14,6,0.6)');
      stroke(ctx, shift(N, 9.1), 0.7, 'rgba(255,215,160,0.25)');
      for (let x = 18; x < 144; x += 17) R(ctx, x, 54, 1, 14, 'rgba(25,10,4,0.28)');          // plank butts
      ctx.restore();
      stroke(ctx, WL, 1.8, W.out);                                                           // waterline outline
      stroke(ctx, shift(WL, -0.6), 1, 'rgba(255,255,255,0.14)');
      // near gunwale rim
      stroke(ctx, shift(N, 2.4), 1.6, W.out); stroke(ctx, N, 3.6, W.rim); stroke(ctx, shift(N, -1.2), 1, W.rimL); stroke(ctx, shift(N, 1.3), 0.8, W.rimD);
      // transom corner + near oarlock bracket
      ctx.fillStyle = W.out; ctx.beginPath(); ctx.arc(14, 52, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = W.rim; ctx.beginPath(); ctx.arc(14, 52, 2.2, 0, Math.PI * 2); ctx.fill();
      const ny = (() => { let best = 0, bd = 1e9; for (let t = 0; t <= 1; t += 0.005) { const u = 1 - t; const x = u * u * u * N[0][0] + 3 * u * u * t * N[1][0] + 3 * u * t * t * N[2][0] + t * t * t * N[3][0]; const y = u * u * u * N[0][1] + 3 * u * u * t * N[1][1] + 3 * u * t * t * N[2][1] + t * t * t * N[3][1]; if (Math.abs(x - 66) < bd) { bd = Math.abs(x - 66); best = y; } } return best; })();
      R(ctx, 63, ny - 3, 7, 6, W.out); R(ctx, 64, ny - 2, 5, 4, W.steel); R(ctx, 64, ny - 2, 5, 1, '#d9dee3'); R(ctx, 66, ny - 1, 1, 2, W.steelD);
    });

    makeTex('prop-oar', 72, 12, ctx => {
      const { W, R } = boatKit;
      R(ctx, 0, 4, 12, 4, W.out); R(ctx, 1, 5, 10, 2, '#d9b57a'); R(ctx, 3, 5, 1, 2, '#8a5e32'); R(ctx, 8, 5, 1, 2, '#8a5e32'); // grip
      R(ctx, 11, 4, 38, 4, W.out); R(ctx, 12, 5, 36, 2, '#c79a5e'); R(ctx, 12, 5, 36, 1, '#e6c088');                 // shaft
      ctx.fillStyle = W.out; ctx.beginPath(); ctx.moveTo(46, 5); ctx.quadraticCurveTo(52, 0, 66, 1); ctx.lineTo(71, 6); ctx.lineTo(66, 11); ctx.quadraticCurveTo(52, 12, 46, 7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e2bd7e'; ctx.beginPath(); ctx.moveTo(47, 5.4); ctx.quadraticCurveTo(52, 1.6, 65, 2.4); ctx.lineTo(69, 6); ctx.lineTo(65, 9.6); ctx.quadraticCurveTo(52, 10.4, 47, 6.6); ctx.closePath(); ctx.fill();
      R(ctx, 56, 2, 2, 8, W.red); R(ctx, 60, 2, 1, 8, '#fff3c4'); R(ctx, 48, 3, 6, 1, '#f6dca6');                      // painted blade tip
    });

    makeTex('prop-skylantern', 16, 22, ctx => {
      ctx.fillStyle = '#7a2a12'; ctx.beginPath(); ctx.moveTo(3, 19); ctx.lineTo(1.5, 8); ctx.quadraticCurveTo(8, -1, 14.5, 8); ctx.lineTo(13, 19); ctx.closePath(); ctx.fill();
      const g = ctx.createLinearGradient(0, 2, 0, 19); g.addColorStop(0, '#ffe9a0'); g.addColorStop(0.55, '#ffb347'); g.addColorStop(1, '#e8742c');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(4, 18); ctx.lineTo(2.6, 8.4); ctx.quadraticCurveTo(8, 1, 13.4, 8.4); ctx.lineTo(12, 18); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,230,0.75)'; ctx.fillRect(7, 8, 2, 8);
      ctx.fillStyle = '#7a2a12'; ctx.fillRect(3, 18, 10, 2); ctx.fillStyle = '#ffd36a'; ctx.fillRect(5, 20, 6, 1);
    });
    makeTex('prop-lamp', 36, 84, ctx => {
      ctx.fillStyle = '#3c414d'; ctx.fillRect(16, 18, 4, 62);
      ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(18, 14, 9, 0, Math.PI * 2); ctx.fill();
    });

    // --- Reflective Rain Puddle Texture ---
    makeTex('prop-puddle', 48, 28, ctx => {
      ctx.fillStyle = 'rgba(28, 55, 82, 0.55)';
      ctx.beginPath(); ctx.ellipse(24, 14, 22, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(127, 212, 230, 0.65)';
      ctx.beginPath(); ctx.ellipse(23, 13, 18, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(14, 11, 6, 1.5);
      ctx.fillRect(28, 14, 4, 1.2);
    });

    // --- Totoro's Giant Green Ghibli Taro Umbrella Leaf ---
    makeTex('prop-taro-leaf', 64, 48, ctx => {
      // Leaf Stem
      ctx.strokeStyle = '#2d6a4f'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(32, 44); ctx.quadraticCurveTo(34, 26, 32, 14); ctx.stroke();
      // Giant Heart-Shaped Taro Leaf Blade
      ctx.fillStyle = '#1b4332';
      ctx.beginPath();
      ctx.moveTo(32, 6);
      ctx.bezierCurveTo(12, 2, 4, 18, 18, 30);
      ctx.bezierCurveTo(24, 35, 32, 38, 32, 38);
      ctx.bezierCurveTo(32, 38, 40, 35, 46, 30);
      ctx.bezierCurveTo(60, 18, 52, 2, 32, 6);
      ctx.closePath(); ctx.fill();
      // Vibrant Leaf Surface
      ctx.fillStyle = '#40916c';
      ctx.beginPath();
      ctx.moveTo(32, 8);
      ctx.bezierCurveTo(14, 4, 7, 18, 20, 28);
      ctx.bezierCurveTo(25, 33, 32, 36, 32, 36);
      ctx.bezierCurveTo(32, 36, 39, 33, 44, 28);
      ctx.bezierCurveTo(57, 18, 50, 4, 32, 8);
      ctx.closePath(); ctx.fill();
      // Veins & Dewdrop
      ctx.strokeStyle = '#95d5b2'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(32, 9); ctx.lineTo(32, 34);
      ctx.moveTo(32, 18); ctx.lineTo(20, 14); ctx.moveTo(32, 18); ctx.lineTo(44, 14);
      ctx.moveTo(32, 25); ctx.lineTo(22, 23); ctx.moveTo(32, 25); ctx.lineTo(42, 23);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(28, 14, 2, 0, Math.PI * 2); ctx.fill();
    });

    // =========================================================================
    // DHAKA CYBER ARCADE EXTERIOR BUILDING (216x152) — 4-Frame Animated Neon Marquee
    // =========================================================================
    const drawArcadeBuilding = (ctx: CanvasRenderingContext2D, frame: number) => {
      const W = 216, H = 152;
      const R = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

      // 1. Ambient Ground Shadow & Neon Light Spill
      ctx.fillStyle = 'rgba(10, 8, 24, 0.45)';
      ctx.beginPath(); ctx.ellipse(W / 2, 142, 102, 11, 0, 0, Math.PI * 2); ctx.fill();

      // Neon sidewalk light reflection pool
      const glowCyan = frame % 2 === 0 ? 'rgba(0, 240, 255, 0.18)' : 'rgba(0, 240, 255, 0.12)';
      const glowMagenta = frame % 2 === 1 ? 'rgba(255, 0, 128, 0.18)' : 'rgba(255, 0, 128, 0.12)';
      ctx.fillStyle = glowCyan;
      ctx.beginPath(); ctx.ellipse(W / 2 - 36, 143, 40, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = glowMagenta;
      ctx.beginPath(); ctx.ellipse(W / 2 + 36, 143, 40, 6, 0, 0, Math.PI * 2); ctx.fill();

      // 2. Main Cyberpunk Arcade Building Facade (Deep Slate Indigo & Steel Trim)
      R(16, 32, 184, 108, '#120f24'); // Outer main wall
      R(18, 34, 180, 104, '#1b1735'); // Inner facade panel

      // Cyber Grid / Circuit Line Accents on Facade
      ctx.strokeStyle = '#2d2454'; ctx.lineWidth = 1;
      for (let gx = 24; gx < 192; gx += 16) {
        ctx.beginPath(); ctx.moveTo(gx, 36); ctx.lineTo(gx, 136); ctx.stroke();
      }
      for (let gy = 44; gy < 136; gy += 16) {
        ctx.beginPath(); ctx.moveTo(20, gy); ctx.lineTo(196, gy); ctx.stroke();
      }

      // 3. Sturdy Chrome & Metallic Corner Pillars
      [16, 192].forEach(px => {
        R(px, 30, 8, 112, '#33295c');
        R(px + 2, 30, 4, 112, '#4d3f8a');
        R(px + 3, 30, 2, 112, '#7967cb');
      });

      // 4. Left & Right Showroom Glass Windows (Glowing Arcade Interior Silhouettes)
      // Left Display Window (Retro Platformer & CRT glow)
      R(28, 62, 54, 66, '#0a0814');
      ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 1.5; ctx.strokeRect(28, 62, 54, 66);
      R(32, 66, 46, 58, '#141b38');
      // Silhouette of mini arcade machine inside window
      R(40, 78, 22, 38, '#080c1e');
      R(43, 82, 16, 16, frame % 2 === 0 ? '#00f0ff' : '#00a8cc'); // CRT scan glow
      R(44, 102, 14, 4, '#ff007f'); // Joystick panel

      // Right Display Window (Versus Fighter & Neon Totoro plushies)
      R(134, 62, 54, 66, '#0a0814');
      ctx.strokeStyle = '#ff007f'; ctx.lineWidth = 1.5; ctx.strokeRect(134, 62, 54, 66);
      R(138, 66, 46, 58, '#26112d');
      // Silhouette of twin cabinet inside window
      R(146, 78, 22, 38, '#180720');
      R(149, 82, 16, 16, frame % 2 === 1 ? '#ff0099' : '#b3006b');
      R(150, 102, 14, 4, '#00ffff');

      // 5. Central Double Glass Entrance Door
      R(88, 70, 40, 70, '#090812');
      // Door frame & header
      ctx.strokeStyle = '#6851a8'; ctx.lineWidth = 2; ctx.strokeRect(88, 70, 40, 70);
      // Double door seam
      R(107, 70, 2, 70, '#2e234d');
      // Door Glass Panes
      R(92, 74, 14, 44, 'rgba(0, 240, 255, 0.25)');
      R(110, 74, 14, 44, 'rgba(255, 0, 128, 0.25)');
      // Brass Kickplates & Door Handles
      R(91, 124, 16, 12, '#7a5a22');
      R(109, 124, 16, 12, '#7a5a22');
      R(104, 94, 2, 14, '#e6c35c');
      R(110, 94, 2, 14, '#e6c35c');
      // "PUSH / PULL" decals
      R(96, 92, 6, 2, '#ffffff');
      R(114, 92, 6, 2, '#ffffff');

      // 6. Rooftop Neon Marquee Structure & Signboard
      // Steel truss frame mounts
      [36, 172].forEach(tx => {
        ctx.strokeStyle = '#3e3466'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(tx, 32); ctx.lineTo(tx + 4, 12); ctx.stroke();
      });
      // Giant Marquee Box
      R(20, 6, 176, 30, '#0b0817');
      R(22, 8, 172, 26, '#181230');

      // Animated Chasing Perimeter Bulbs (frames 0, 1, 2, 3)
      const bulbColors = ['#ff0055', '#00ffff', '#ffff00', '#00ff66'];
      let bulbIdx = frame;
      for (let bx = 24; bx <= 190; bx += 8) {
        ctx.fillStyle = bulbColors[(bulbIdx++) % 4];
        ctx.fillRect(bx, 7, 3, 2);
        ctx.fillRect(bx, 33, 3, 2);
      }
      for (let by = 9; by <= 31; by += 7) {
        ctx.fillStyle = bulbColors[(bulbIdx++) % 4];
        ctx.fillRect(21, by, 2, 3);
        ctx.fillRect(193, by, 2, 3);
      }

      // Marquee Text: "DHAKA CYBER ARCADE"
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8.5px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DHAKA CYBER ARCADE', 108, 22);

      // 7. Flashing 8-bit Neon Joystick & Totoro Emblem
      const joyColors = ['#00ffff', '#ff007f', '#ffff00', '#00ff88'];
      const currentJoyColor = joyColors[frame % 4];
      // Joystick stick & ball
      R(106, 52, 4, 12, '#71717a');
      ctx.fillStyle = currentJoyColor;
      ctx.beginPath(); ctx.arc(108, 48, 6, 0, Math.PI * 2); ctx.fill();
      // Neon "INSERT COIN" banner above doorway
      R(90, 58, 36, 9, '#000000');
      ctx.fillStyle = frame % 2 === 0 ? '#ffff00' : '#ffffff';
      ctx.font = '6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('★ INSERT COIN ★', 108, 65);
    };

    [0, 1, 2, 3].forEach(frame => {
      makeTex(`prop-arcade-${frame}`, 216, 152, (ctx) => {
        drawArcadeBuilding(ctx, frame);
      });
    });
    makeTex('prop-arcade', 216, 152, (ctx) => {
      drawArcadeBuilding(ctx, 0);
    });


  }
}
