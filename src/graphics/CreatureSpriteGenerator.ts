// src/graphics/CreatureSpriteGenerator.ts - Biome enemies & all 5 animated Guardian Bosses
// Migrated 100% intact from game.js

export class CreatureSpriteGenerator {
  static generate(makeTex: (key: string, w: number, h: number, drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => void) {
    // --- Portals, Enemies & Guardian Bosses ---
    // --- Animated Interdimensional Realm Fracture Portals (3 Frames: -0, -1, -2 for Swirling Vortex) ---
    /**
     * @asset-spec
     * @id prop-portal
     * @external-png assets/sprites/landmarks/realm_portal.png
     * @fallback-procedural prop-portal-0 (112x128)
     * @grid-footprint 4x4 tiles (64x32px base threshold)
     * @visual-size 112x128px (or 56x64px native pixel art upscaled 2x)
     * @origin 0.5, 0.9
     * @frames 3 horizontal frames (swirling interdimensional vortex)
     */
    [0, 1, 2].forEach(frame => {
      makeTex(`prop-portal-${frame}`, 112, 128, (ctx, cw, ch) => {
        const W = 112, H = 128;
        const cx = 56, cy = 64;
        const rot = frame * 1.047; // Rotation offset per frame for the vortex spiral

        // 1. Radiant Ethereal Aura Glow behind the Portal
        const aura = ctx.createRadialGradient(cx, cy, 10, cx, cy, 52);
        aura.addColorStop(0, 'rgba(128, 255, 219, 0.45)');
        aura.addColorStop(0.5, 'rgba(114, 9, 183, 0.30)');
        aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath(); ctx.arc(cx, cy, 52, 0, Math.PI * 2); ctx.fill();

        // 2. Ornate Ancient Stone / Obsidian Archway Frame
        // Outer carved stone arch border
        ctx.fillStyle = '#22163d';
        ctx.beginPath(); ctx.ellipse(cx, cy, 44, 56, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4c2885';
        ctx.beginPath(); ctx.ellipse(cx, cy, 40, 52, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#160f2b'; // Inner threshold void
        ctx.beginPath(); ctx.ellipse(cx, cy, 33, 45, 0, 0, Math.PI * 2); ctx.fill();

        // Glowing Gold Rune Glyphs on Stone Frame
        ctx.strokeStyle = '#f7cb45'; ctx.lineWidth = 1.8;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          const rx = cx + Math.cos(a + rot * 0.5) * 37;
          const ry = cy + Math.sin(a + rot * 0.5) * 47;
          ctx.beginPath(); ctx.arc(rx, ry, 2.2, 0, Math.PI * 2); ctx.stroke();
        }

        // 3. Multi-Layered Swirling Dimensional Vortex Spire
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);

        // Deep Purple/Indigo Outer Spiral Arms
        ctx.fillStyle = '#7209b7';
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(18, -18, 28, 0);
          ctx.quadraticCurveTo(18, 18, 0, 0);
          ctx.closePath();
          ctx.fill();
        }

        // Bright Cyan / Turquoise Inner Swirl
        ctx.fillStyle = '#4cc9f0';
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 2 + 0.3);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(12, -12, 19, 0);
          ctx.quadraticCurveTo(12, 12, 0, 0);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        // 4. Pure White Singularity Core & Floating Stardust Sparks
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(cx, cy, 9, 13, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#80ffdb';
        ctx.beginPath(); ctx.ellipse(cx, cy, 4.5, 6.5, 0, 0, Math.PI * 2); ctx.fill();

        // Energy Spark Motes swirling around the event horizon
        const sparkAngles = [0.2 + rot, 1.5 + rot, 2.8 + rot, 4.1 + rot, 5.4 + rot];
        sparkAngles.forEach((sa, idx) => {
          const dist = 18 + (idx % 2) * 8;
          const spkX = cx + Math.cos(sa) * dist;
          const spkY = cy + Math.sin(sa) * (dist * 1.3);
          ctx.fillStyle = idx % 2 === 0 ? '#fff3a1' : '#80ffdb';
          ctx.beginPath(); ctx.arc(spkX, spkY, 2.2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(spkX - 0.7, spkY - 0.7, 1.4, 1.4);
        });
      });
    });

    // --- Animated Biome Enemies & Guardian Bosses (2-Frame Sprites: -0 and -1) ---
    const makeAnimCreature = (baseKey, w, h, drawFn) => {
      [0, 1].forEach(frame => {
        const key = `${baseKey}-${frame}`;
        makeTex(key, w, h, (ctx, cw, ch) => drawFn(ctx, cw, ch, frame));
        if (frame === 0) {
          makeTex(baseKey, w, h, (ctx, cw, ch) => drawFn(ctx, cw, ch, 0));
        }
      });
    };

    // 1. World 2 Enemy: Briar Bogling (Mossy Forest Imp with Sprouting Mushroom Cap & Thorny Vines)
    /**
     * @asset-spec
     * @id enemy-slime
     * @external-png assets/sprites/enemies/briar_bogling.png
     * @fallback-procedural enemy-slime (54x54)
     * @grid-footprint 2x2 tiles (48x38px base collision)
     * @visual-size 64x64px (or 32x32px native upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 2 horizontal frames (squash-and-stretch hopping)
     */
    makeAnimCreature('enemy-slime', 54, 54, (ctx, w, h, f) => {
      const cx = 27, squash = f === 1 ? 2.5 : 0;
      ctx.fillStyle = 'rgba(10, 18, 12, 0.32)';
      ctx.beginPath(); ctx.ellipse(cx, 48, 17 + squash, 5, 0, 0, Math.PI * 2); ctx.fill();

      // Thorny root-tendril feet
      ctx.fillStyle = '#3b2618';
      ctx.fillRect(cx - 12 - squash, 42, 6, 6);
      ctx.fillRect(cx + 6 + squash, 42, 6, 6);

      // Leafy Moss Body (squashes & stretches when hopping)
      ctx.fillStyle = '#1b4332';
      ctx.beginPath(); ctx.ellipse(cx, 33 + squash * 0.5, 16 + squash, 14 - squash * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2d6a4f';
      ctx.beginPath(); ctx.ellipse(cx, 32 + squash * 0.5, 14 + squash, 12 - squash * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#52b788';
      ctx.beginPath(); ctx.ellipse(cx - 3, 28 + squash * 0.5, 8, 5, -0.2, 0, Math.PI * 2); ctx.fill();

      // Spotted Bioluminescent Toadstool Cap on Head
      const capY = 18 + squash;
      ctx.fillStyle = '#6e1423';
      ctx.beginPath(); ctx.ellipse(cx, capY, 15, 7.5, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#b51736';
      ctx.beginPath(); ctx.ellipse(cx, capY - 1, 13, 6.5, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#80ffdb'; // Glowing cyan mushroom spots
      [[-7, -4], [0, -6], [7, -4], [-3, -2], [4, -2]].forEach(([sx, sy]) => {
        ctx.beginPath(); ctx.arc(cx + sx, capY + sy, 1.8, 0, Math.PI * 2); ctx.fill();
      });

      // Glowing Amber Forest Eyes & Jagged Briarmouth
      ctx.fillStyle = '#ffea79';
      ctx.beginPath();
      ctx.arc(cx - 5.5, 32 + squash * 0.5, 2.8, 0, Math.PI * 2);
      ctx.arc(cx + 5.5, 32 + squash * 0.5, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1b4332';
      ctx.fillRect(cx - 6, 31.5 + squash * 0.5, 1.5, 2);
      ctx.fillRect(cx + 5, 31.5 + squash * 0.5, 1.5, 2);
    });

    // 2. World 3 Enemy: Tidepool Crabler (Armored Hermit-Carapace Crab with Snapping Pincers)
    /**
     * @asset-spec
     * @id enemy-crab
     * @external-png assets/sprites/enemies/tidepool_crabler.png
     * @fallback-procedural enemy-crab (58x52)
     * @grid-footprint 2x2 tiles (48x38px base collision)
     * @visual-size 64x64px (or 32x32px native upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 2 horizontal frames (side scuttle with pincers)
     */
    makeAnimCreature('enemy-crab', 58, 52, (ctx, w, h, f) => {
      const cx = 29, scuttle = f === 1 ? 2.5 : -2.5;
      const pinch = f === 1 ? 3 : 0;

      ctx.fillStyle = 'rgba(8, 24, 38, 0.32)';
      ctx.beginPath(); ctx.ellipse(cx, 46, 20, 5, 0, 0, Math.PI * 2); ctx.fill();

      // 6 Segmented Chitin Legs (alternating stride)
      ctx.strokeStyle = '#9e2a2b'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      [-1, 0, 1].forEach(i => {
        const ly = 34 + i * 3.5;
        ctx.beginPath();
        ctx.moveTo(cx - 12, ly); ctx.lineTo(cx - 22, ly + 4 + (i % 2 ? scuttle : -scuttle));
        ctx.moveTo(cx + 12, ly); ctx.lineTo(cx + 22, ly + 4 + (i % 2 ? -scuttle : scuttle));
        ctx.stroke();
      });

      // Spiny Coral Shell Carapace
      ctx.fillStyle = '#801b1b';
      ctx.beginPath(); ctx.ellipse(cx, 31, 17, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d64032';
      ctx.beginPath(); ctx.ellipse(cx, 30, 15, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff8fa3'; // Coral ridges & barnacles
      ctx.beginPath(); ctx.ellipse(cx - 3, 26, 9, 4.5, -0.15, 0, Math.PI * 2); ctx.fill();

      // Luminous Barnacle Spikes on Shell
      ctx.fillStyle = '#7fd4e6';
      [[-8, 20], [0, 17], [8, 20]].forEach(([bx, by]) => {
        ctx.beginPath();
        ctx.moveTo(cx + bx - 3, by + 4); ctx.lineTo(cx + bx, by - 2); ctx.lineTo(cx + bx + 3, by + 4);
        ctx.closePath(); ctx.fill();
      });

      // Snapping Coral Pincers (Left & Right Claws open/close per frame)
      [-1, 1].forEach(dir => {
        const px = cx + dir * 18, py = 23;
        ctx.fillStyle = '#e0533c';
        ctx.beginPath(); ctx.arc(px, py, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#184b5e'; // Open claw gap
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + dir * 7, py - 2 - pinch);
        ctx.lineTo(px + dir * 7, py + 2 + pinch);
        ctx.closePath(); ctx.fill();
      });

      // Stalked Eyes
      ctx.fillStyle = '#9e2a2b';
      ctx.fillRect(cx - 6, 22, 2.5, 6);
      ctx.fillRect(cx + 3.5, 22, 2.5, 6);
      ctx.fillStyle = '#fff3a1';
      ctx.beginPath();
      ctx.arc(cx - 4.8, 22, 2.6, 0, Math.PI * 2);
      ctx.arc(cx + 4.8, 22, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111111';
      ctx.fillRect(cx - 5.3, 21.5, 1.4, 1.4);
      ctx.fillRect(cx + 4.3, 21.5, 1.4, 1.4);
    });

    // 3. World 4 Enemy: Cinder Hound (Armored Magma Wolf with Flaming Mane & Tail)
    /**
     * @asset-spec
     * @id enemy-wisp
     * @external-png assets/sprites/enemies/cinder_hound.png
     * @fallback-procedural enemy-wisp (58x54)
     * @grid-footprint 2x2 tiles (48x38px base collision)
     * @visual-size 64x64px (or 32x32px native upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 2 horizontal frames (magma hound prowling stride)
     */
    makeAnimCreature('enemy-wisp', 58, 54, (ctx, w, h, f) => {
      const cx = 29, bound = f === 1 ? -2.5 : 1.5;
      const stride = f === 1 ? 4 : -2;

      ctx.fillStyle = 'rgba(255, 90, 0, 0.28)';
      ctx.beginPath(); ctx.ellipse(cx, 48, 20, 5, 0, 0, Math.PI * 2); ctx.fill();

      // Flaming Tail Whip
      ctx.fillStyle = '#ff5400';
      ctx.beginPath();
      ctx.moveTo(cx - 12, 30 + bound);
      ctx.quadraticCurveTo(cx - 25, 18 - bound, cx - 22, 11 + bound);
      ctx.quadraticCurveTo(cx - 15, 22, cx - 10, 33 + bound);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffea79';
      ctx.beginPath(); ctx.arc(cx - 19, 17 + bound, 3, 0, Math.PI * 2); ctx.fill();

      // Four Obsidian Legs (Galloping stride)
      ctx.fillStyle = '#24110e';
      ctx.fillRect(cx - 12 - stride * 0.5, 35 + bound, 4.5, 11);
      ctx.fillRect(cx - 5 + stride * 0.5, 36 + bound, 4.5, 10);
      ctx.fillRect(cx + 4 - stride * 0.5, 36 + bound, 4.5, 10);
      ctx.fillRect(cx + 10 + stride * 0.5, 35 + bound, 4.5, 11);
      // Molten paws
      ctx.fillStyle = '#ff7b00';
      ctx.fillRect(cx - 12 - stride * 0.5, 44 + bound, 4.5, 2.5);
      ctx.fillRect(cx + 10 + stride * 0.5, 44 + bound, 4.5, 2.5);

      // Muscular Charcoal-Obsidian Wolf Torso with Lava Cracks
      ctx.fillStyle = '#2b1511';
      ctx.beginPath(); ctx.ellipse(cx, 31 + bound, 15, 8.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ff6b00'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx - 6, 26 + bound); ctx.lineTo(cx - 2, 33 + bound); ctx.lineTo(cx + 5, 29 + bound);
      ctx.stroke();

      // Blazing Fire Mane around Neck/Shoulders
      ctx.fillStyle = '#ff5400';
      ctx.beginPath();
      ctx.moveTo(cx + 2, 23 + bound);
      ctx.lineTo(cx + 7, 14 + bound - (f ? 2 : 0));
      ctx.lineTo(cx + 12, 18 + bound);
      ctx.lineTo(cx + 16, 13 + bound + (f ? 2 : 0));
      ctx.lineTo(cx + 15, 27 + bound);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd000';
      ctx.beginPath(); ctx.arc(cx + 10, 21 + bound, 4, 0, Math.PI * 2); ctx.fill();

      // Wolf Snout, Pointed Ears & Glowing Magma Jaw
      ctx.fillStyle = '#381b16';
      ctx.beginPath();
      ctx.moveTo(cx + 8, 19 + bound);
      ctx.lineTo(cx + 24, 23 + bound);
      ctx.lineTo(cx + 22, 29 + bound);
      ctx.lineTo(cx + 8, 29 + bound);
      ctx.closePath(); ctx.fill();
      // Pointed ears
      ctx.beginPath();
      ctx.moveTo(cx + 8, 20 + bound); ctx.lineTo(cx + 10, 12 + bound); ctx.lineTo(cx + 14, 19 + bound);
      ctx.fill();

      // Glowing yellow predator eye & fiery fangs
      ctx.fillStyle = '#ffea79';
      ctx.fillRect(cx + 14, 21 + bound, 3, 2);
      ctx.fillStyle = '#ff5400';
      ctx.fillRect(cx + 15, 27 + bound, 6, 2);
    });

    // 4. World 5 & 6 Enemy: Glacier / Void Wraith (Cloaked Spectral Phantom with Scythe Claws & Lantern)
    /**
     * @asset-spec
     * @id enemy-wraith
     * @external-png assets/sprites/enemies/glacier_wraith.png
     * @fallback-procedural enemy-wraith (56x60)
     * @grid-footprint 2x2 tiles (48x38px base collision)
     * @visual-size 64x64px (or 32x32px native upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 2 horizontal frames (spectral hovering with scythe claws)
     */
    makeAnimCreature('enemy-wraith', 56, 60, (ctx, w, h, f) => {
      const cx = 28, hover = f === 1 ? -3 : 1;
      const sway = f === 1 ? 2.5 : -2.5;

      // Arcane shadow sigil on ground
      ctx.fillStyle = 'rgba(94, 96, 206, 0.28)';
      ctx.beginPath(); ctx.ellipse(cx, 54, 15 - (f ? 2 : 0), 4.5, 0, 0, Math.PI * 2); ctx.fill();

      // Tattered Billowing Spectral Cloak Tails
      ctx.fillStyle = '#31226b';
      ctx.beginPath();
      ctx.moveTo(cx, 12 + hover);
      ctx.quadraticCurveTo(cx - 19, 26 + hover, cx - 16 + sway, 49 + hover);
      ctx.lineTo(cx - 7 + sway, 43 + hover);
      ctx.lineTo(cx + sway * 0.5, 51 + hover);
      ctx.lineTo(cx + 7 + sway, 43 + hover);
      ctx.lineTo(cx + 16 + sway, 49 + hover);
      ctx.quadraticCurveTo(cx + 19, 26 + hover, cx, 12 + hover);
      ctx.closePath(); ctx.fill();

      // Inner Indigo Shroud & Ribcage Armor
      ctx.fillStyle = '#4ea8de';
      ctx.beginPath(); ctx.ellipse(cx, 28 + hover, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1d1438';
      ctx.beginPath(); ctx.arc(cx, 22 + hover, 7.5, 0, Math.PI * 2); ctx.fill(); // Deep hood void

      // Pointed Cowl Hood Crest
      ctx.fillStyle = '#5e60ce';
      ctx.beginPath();
      ctx.moveTo(cx, 7 + hover);
      ctx.lineTo(cx - 11, 19 + hover);
      ctx.lineTo(cx - 8, 25 + hover);
      ctx.lineTo(cx, 15 + hover);
      ctx.lineTo(cx + 8, 25 + hover);
      ctx.lineTo(cx + 11, 19 + hover);
      ctx.closePath(); ctx.fill();

      // Glowing Cyan Eyes inside Hood
      ctx.fillStyle = '#80ffdb';
      ctx.fillRect(cx - 4.5, 20 + hover, 3, 2.2);
      ctx.fillRect(cx + 1.5, 20 + hover, 3, 2.2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 3.5, 20.5 + hover, 1.2, 1.2);
      ctx.fillRect(cx + 2.5, 20.5 + hover, 1.2, 1.2);

      // Floating Ice-Crystal / Soul-Scythe Claws on Left & Right
      ctx.strokeStyle = '#80ffdb'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 13, 27 + hover - sway * 0.5); ctx.lineTo(cx - 22, 22 + hover); ctx.lineTo(cx - 19, 33 + hover);
      ctx.moveTo(cx + 13, 27 + hover + sway * 0.5); ctx.lineTo(cx + 22, 22 + hover); ctx.lineTo(cx + 19, 33 + hover);
      ctx.stroke();
    });

    // ================= 5 GUARDIAN BOSSES (Detailed 2-Frame Animated Boss Sprites) =================

    // BOSS 1 (World 2): Sylvan Briar Stag (Majestic Emerald-Antlered Forest Guardian)
    /**
     * @asset-spec
     * @id boss-stag
     * @external-png assets/sprites/bosses/sylvan_briar_stag.png
     * @fallback-procedural boss-stag (112x112)
     * @grid-footprint 4x4 tiles (112x80px solid collision base)
     * @visual-size 128x128px (or 64x64px native upscaled 2x)
     * @origin 0.5, 0.9
     * @frames 2 horizontal frames (regal guardian breathing & hoof stomping)
     */
    makeAnimCreature('boss-stag', 112, 112, (ctx, w, h, f) => {
      const cx = 56, bob = f === 1 ? -2.5 : 0;
      const legShift = f === 1 ? 3.5 : -2.5;

      ctx.fillStyle = 'rgba(10, 24, 16, 0.36)';
      ctx.beginPath(); ctx.ellipse(cx, 102, 38, 9, 0, 0, Math.PI * 2); ctx.fill();

      // Four Tall Heartwood Legs & Glowing Emerald Hooves
      [[-20, legShift], [-8, -legShift], [10, legShift], [22, -legShift]].forEach(([lx, off]) => {
        ctx.fillStyle = '#2b1d14';
        ctx.fillRect(cx + lx, 66 + bob, 6, 32 + off * 0.5);
        ctx.fillStyle = '#80ffdb'; // Glowing spirit hooves
        ctx.fillRect(cx + lx - 0.5, 95 + bob + off * 0.5, 7, 4);
      });

      // Powerful Bark-Armored Stag Torso & Mossy Mantle
      ctx.fillStyle = '#1b4332';
      ctx.beginPath(); ctx.ellipse(cx, 64 + bob, 28, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2d6a4f';
      ctx.beginPath(); ctx.ellipse(cx + 2, 62 + bob, 24, 13, 0, 0, Math.PI * 2); ctx.fill();

      // Glowing Sylvan Rune on Stag's Flank
      ctx.strokeStyle = '#80ffdb'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx - 4, 62 + bob, 6, 0, Math.PI * 2); ctx.stroke();

      // Proud Arched Neck & Leafy Mane
      ctx.fillStyle = '#1b4332';
      ctx.beginPath();
      ctx.moveTo(cx + 10, 56 + bob); ctx.lineTo(cx + 20, 32 + bob);
      ctx.lineTo(cx + 32, 36 + bob); ctx.lineTo(cx + 26, 62 + bob);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#52b788'; // Leafy chest ruff
      ctx.beginPath(); ctx.ellipse(cx + 22, 52 + bob, 9, 12, 0.2, 0, Math.PI * 2); ctx.fill();

      // Sculpted Stag Head & Glowing Cyan Eyes
      ctx.fillStyle = '#2d6a4f';
      ctx.beginPath(); ctx.ellipse(cx + 27, 32 + bob, 11, 7, 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#80ffdb';
      ctx.fillRect(cx + 26, 29 + bob, 4, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + 27, 29.5 + bob, 1.8, 1.8);

      // Massive Crown of Branching Heartwood Antlers with Glowing Spirit Lanterns!
      ctx.strokeStyle = '#5c3a21'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      ctx.beginPath();
      // Left-sweeping antler bough
      ctx.moveTo(cx + 22, 26 + bob); ctx.quadraticCurveTo(cx + 4, 14 + bob, cx - 12, 8 + bob);
      ctx.moveTo(cx + 8, 17 + bob);  ctx.lineTo(cx + 6, 6 + bob);
      ctx.moveTo(cx - 2, 12 + bob);  ctx.lineTo(cx - 6, 3 + bob);
      // Right-sweeping antler bough
      ctx.moveTo(cx + 26, 26 + bob); ctx.quadraticCurveTo(cx + 38, 14 + bob, cx + 46, 7 + bob);
      ctx.moveTo(cx + 35, 17 + bob); ctx.lineTo(cx + 34, 6 + bob);
      ctx.stroke();

      // Glowing Spirit Dew Orbs Hanging from Antler Tips
      [[cx - 12, 8], [cx + 6, 6], [cx - 6, 3], [cx + 46, 7], [cx + 34, 6]].forEach(([ax, ay]) => {
        ctx.fillStyle = 'rgba(128, 255, 219, 0.4)';
        ctx.beginPath(); ctx.arc(ax, ay + bob, 6 + (f ? 1.5 : 0), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#80ffdb';
        ctx.beginPath(); ctx.arc(ax, ay + bob, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ax - 1, ay - 1 + bob, 2, 2);
      });
    });

    // BOSS 2 (World 3): Abyssal Coral Leviathan (Coiled Sea-Serpent with Bioluminescent Fin-Frills)
    /**
     * @asset-spec
     * @id boss-leviathan
     * @external-png assets/sprites/bosses/abyssal_coral_leviathan.png
     * @fallback-procedural boss-leviathan (112x112)
     * @grid-footprint 4x4 tiles (112x80px solid collision base)
     * @visual-size 128x128px (or 64x64px native upscaled 2x)
     * @origin 0.5, 0.9
     * @frames 2 horizontal frames (undulating aquatic coils & fin ripple)
     */
    makeAnimCreature('boss-leviathan', 112, 112, (ctx, w, h, f) => {
      const cx = 56, wave = f === 1 ? 3 : -3;

      // Swirling Whirlpool Foam Base
      ctx.fillStyle = 'rgba(0, 119, 182, 0.38)';
      ctx.beginPath(); ctx.ellipse(cx, 98, 44, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#90e0ef'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, 98, 36 + (f ? 3 : 0), 8, 0, 0, Math.PI * 2); ctx.stroke();

      // Coiled Serpent Tail & Mid-Body Loops
      ctx.fillStyle = '#03045e';
      ctx.beginPath(); ctx.ellipse(cx - 14, 84, 22, 13, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0077b6';
      ctx.beginPath(); ctx.ellipse(cx - 14, 82, 19, 10, -0.2, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#023e8a';
      ctx.beginPath(); ctx.ellipse(cx + 12, 74 - wave * 0.5, 20, 14, 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0096c7';
      ctx.beginPath(); ctx.ellipse(cx + 11, 72 - wave * 0.5, 17, 11, 0.25, 0, Math.PI * 2); ctx.fill();

      // Towering S-Curved Leviathan Neck & Coral Dorsal Spines
      ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 4;
      [30, 42, 54, 66].forEach(sy => {
        ctx.beginPath(); ctx.moveTo(cx + 4, sy); ctx.lineTo(cx + 18 + (f ? 2 : 0), sy - 5); ctx.stroke();
      });

      ctx.fillStyle = '#0077b6';
      ctx.beginPath();
      ctx.moveTo(cx - 6, 78);
      ctx.quadraticCurveTo(cx + 18, 52, cx - 2, 24 + wave * 0.5);
      ctx.lineTo(cx + 12, 24 + wave * 0.5);
      ctx.quadraticCurveTo(cx + 28, 52, cx + 10, 78);
      ctx.closePath(); ctx.fill();

      // Segmented Cyan Belly Plates
      ctx.fillStyle = '#90e0ef';
      for (let py = 32; py < 72; py += 7) {
        ctx.fillRect(cx - 2, py + wave * 0.3, 9, 4);
      }

      // Flared Bioluminescent Coral Head-Frills & Fanged Maw
      const hy = 24 + wave * 0.5;
      ctx.fillStyle = '#f72585';
      ctx.beginPath();
      ctx.moveTo(cx, hy); ctx.lineTo(cx - 24, hy - 12 - (f ? 3 : 0)); ctx.lineTo(cx - 18, hy + 8);
      ctx.moveTo(cx + 8, hy); ctx.lineTo(cx + 30, hy - 10 - (f ? 3 : 0)); ctx.lineTo(cx + 22, hy + 8);
      ctx.closePath(); ctx.fill();

      // Leviathan Head & Glowing Abyssal Eyes
      ctx.fillStyle = '#023e8a';
      ctx.beginPath(); ctx.ellipse(cx + 2, hy, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffea79';
      ctx.beginPath();
      ctx.arc(cx - 4, hy - 2, 3, 0, Math.PI * 2);
      ctx.arc(cx + 8, hy - 2, 3, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Angler-Lure Pearl on Forehead
      ctx.strokeStyle = '#90e0ef'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(cx + 2, hy - 9); ctx.quadraticCurveTo(cx - 8, hy - 20, cx - 12, hy - 14); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(cx - 12, hy - 14, 4, 0, Math.PI * 2); ctx.fill();
    });

    // BOSS 3 (World 4): Ignis, the Magma Drake (Winged Volcanic Dragon with Molten Chest Core)
    /**
     * @asset-spec
     * @id boss-drake
     * @external-png assets/sprites/bosses/ignis_magma_drake.png
     * @fallback-procedural boss-drake (118x114)
     * @grid-footprint 4x4 tiles (112x80px solid collision base)
     * @visual-size 128x128px (or 64x64px native upscaled 2x)
     * @origin 0.5, 0.9
     * @frames 2 horizontal frames (heavy wing beat & magma flare)
     */
    makeAnimCreature('boss-drake', 118, 114, (ctx, w, h, f) => {
      const cx = 59, hover = f === 1 ? -4 : 1;
      const wingY = f === 1 ? 12 : 34;

      ctx.fillStyle = 'rgba(255, 84, 0, 0.35)';
      ctx.beginPath(); ctx.ellipse(cx, 102, 42, 10, 0, 0, Math.PI * 2); ctx.fill();

      // Massive Bat-Like Volcanic Wings (Flapping Up/Down between Frame 0 and 1!)
      [-1, 1].forEach(dir => {
        ctx.fillStyle = '#370617'; // Wing bone frame
        ctx.beginPath();
        ctx.moveTo(cx + dir * 10, 48 + hover);
        ctx.lineTo(cx + dir * 52, wingY + hover);
        ctx.lineTo(cx + dir * 46, wingY + 34 + hover);
        ctx.lineTo(cx + dir * 26, 62 + hover);
        ctx.lineTo(cx + dir * 12, 68 + hover);
        ctx.closePath(); ctx.fill();

        // Glowing Magma Wing Membrane
        ctx.fillStyle = '#9d0208';
        ctx.beginPath();
        ctx.moveTo(cx + dir * 12, 50 + hover);
        ctx.lineTo(cx + dir * 48, wingY + 5 + hover);
        ctx.lineTo(cx + dir * 42, wingY + 30 + hover);
        ctx.lineTo(cx + dir * 14, 65 + hover);
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = '#f48c06';
        ctx.beginPath();
        ctx.moveTo(cx + dir * 14, 52 + hover);
        ctx.lineTo(cx + dir * 38, wingY + 12 + hover);
        ctx.lineTo(cx + dir * 34, wingY + 26 + hover);
        ctx.closePath(); ctx.fill();
      });

      // Spiked Dragon Tail & Heavy Taloned Legs
      ctx.fillStyle = '#6a040f';
      ctx.fillRect(cx - 20, 74 + hover, 10, 22);
      ctx.fillRect(cx + 10, 74 + hover, 10, 22);
      ctx.fillStyle = '#ffba08'; // Claws
      [-21, -17, -13, 9, 13, 17].forEach(ox => ctx.fillRect(cx + ox, 94 + hover, 2.5, 4));

      // Armored Dragon Torso & Incandescent Molten Chest Plates
      ctx.fillStyle = '#370617';
      ctx.beginPath(); ctx.ellipse(cx, 62 + hover, 22, 24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9d0208';
      ctx.beginPath(); ctx.ellipse(cx, 61 + hover, 19, 21, 0, 0, Math.PI * 2); ctx.fill();

      // Glowing Yellow-Orange Magma Belly Scales
      for (let py = 46; py < 76; py += 6) {
        ctx.fillStyle = py % 12 === 0 ? '#ffba08' : '#f48c06';
        ctx.fillRect(cx - 9, py + hover, 18, 4);
      }

      // Horned Dragon Head & Breath of Fire
      const hy = 30 + hover;
      // Swept-back obsidian horns
      ctx.fillStyle = '#240008';
      ctx.beginPath();
      ctx.moveTo(cx - 6, hy - 4); ctx.lineTo(cx - 18, hy - 18); ctx.lineTo(cx - 2, hy - 8);
      ctx.moveTo(cx + 6, hy - 4); ctx.lineTo(cx + 18, hy - 18); ctx.lineTo(cx + 2, hy - 8);
      ctx.fill();

      ctx.fillStyle = '#6a040f';
      ctx.beginPath(); ctx.ellipse(cx, hy, 13, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffea79'; // Glowing dragon eyes
      ctx.fillRect(cx - 7, hy - 3, 4, 2.5);
      ctx.fillRect(cx + 3, hy - 3, 4, 2.5);

      // Flame jet flaring from nostrils on Frame 1
      if (f === 1) {
        ctx.fillStyle = '#ffba08';
        ctx.beginPath(); ctx.arc(cx - 10, hy + 6, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 10, hy + 6, 4.5, 0, Math.PI * 2); ctx.fill();
      }
    });

    // BOSS 4 (World 5): Cryon, Warden of Eternal Frost (Colossal Permafrost Ice Golem with Floating Pauldrons)
    /**
     * @asset-spec
     * @id boss-warden
     * @external-png assets/sprites/bosses/cryon_frost_warden.png
     * @fallback-procedural boss-warden (114x114)
     * @grid-footprint 4x4 tiles (112x80px solid collision base)
     * @visual-size 128x128px (or 64x64px native upscaled 2x)
     * @origin 0.5, 0.9
     * @frames 2 horizontal frames (glacial stomp & shield slam)
     */
    makeAnimCreature('boss-warden', 114, 114, (ctx, w, h, f) => {
      const cx = 57, pulse = f === 1 ? -3 : 1;
      const armBob = f === 1 ? -4 : 3;

      ctx.fillStyle = 'rgba(72, 202, 228, 0.35)';
      ctx.beginPath(); ctx.ellipse(cx, 102, 40, 10, 0, 0, Math.PI * 2); ctx.fill();

      // Pillar-like Glacier Legs
      ctx.fillStyle = '#0077b6';
      ctx.fillRect(cx - 22, 70, 15, 28);
      ctx.fillRect(cx + 7, 70, 15, 28);
      ctx.fillStyle = '#90e0ef';
      ctx.fillRect(cx - 20, 72, 7, 24);
      ctx.fillRect(cx + 9, 72, 7, 24);

      // Faceted Crystalline Ice Torso
      ctx.fillStyle = '#023e8a';
      ctx.beginPath();
      ctx.moveTo(cx, 24 + pulse); ctx.lineTo(cx + 28, 42 + pulse);
      ctx.lineTo(cx + 20, 76 + pulse); ctx.lineTo(cx - 20, 76 + pulse);
      ctx.lineTo(cx - 28, 42 + pulse);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#0096c7';
      ctx.beginPath();
      ctx.moveTo(cx, 27 + pulse); ctx.lineTo(cx + 23, 43 + pulse);
      ctx.lineTo(cx, 73 + pulse); ctx.lineTo(cx - 23, 43 + pulse);
      ctx.closePath(); ctx.fill();

      // Glowing Star-Crystal Core in Chest
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(cx, 40 + pulse); ctx.lineTo(cx + 8, 50 + pulse);
      ctx.lineTo(cx, 60 + pulse); ctx.lineTo(cx - 8, 50 + pulse);
      ctx.closePath(); ctx.fill();

      // Levitating Permafrost Shoulder Pauldrons & Giant Ice-Gauntlet Fists
      [-1, 1].forEach(dir => {
        const px = cx + dir * 36;
        // Pauldron crystal
        ctx.fillStyle = '#48cae4';
        ctx.beginPath();
        ctx.moveTo(px, 24 + armBob); ctx.lineTo(px + dir * 14, 38 + armBob);
        ctx.lineTo(px, 48 + armBob); ctx.lineTo(px - dir * 8, 38 + armBob);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#caf0f8';
        ctx.fillRect(px - 2, 28 + armBob, 4, 14);

        // Floating Ice-Hammer Fist
        ctx.fillStyle = '#0077b6';
        ctx.fillRect(px - 8, 54 - armBob, 16, 18);
        ctx.fillStyle = '#90e0ef';
        ctx.fillRect(px - 6, 56 - armBob, 10, 12);
      });

      // Crowned Ice-Helm Head & Glowing Visor
      ctx.fillStyle = '#caf0f8';
      ctx.beginPath();
      ctx.moveTo(cx - 12, 28 + pulse); ctx.lineTo(cx - 8, 12 + pulse);
      ctx.lineTo(cx, 19 + pulse); ctx.lineTo(cx + 8, 12 + pulse);
      ctx.lineTo(cx + 12, 28 + pulse);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#03045e';
      ctx.fillRect(cx - 8, 22 + pulse, 16, 5);
      ctx.fillStyle = '#80ffdb'; // Glowing visor eyes
      ctx.fillRect(cx - 6, 23 + pulse, 4, 3);
      ctx.fillRect(cx + 2, 23 + pulse, 4, 3);
    });

    // BOSS 5 (World 6 Final Boss): Chrono-Fracture Archon (6-Winged Celestial Seraph & Clockwork Halo)
    /**
     * @asset-spec
     * @id boss-archon
     * @external-png assets/sprites/bosses/chrono_fracture_archon.png
     * @fallback-procedural boss-archon (124x120)
     * @grid-footprint 4x4 tiles (112x80px solid collision base)
     * @visual-size 128x128px (or 64x64px native upscaled 2x)
     * @origin 0.5, 0.9
     * @frames 2 horizontal frames (astral ring rotation & seraph wing spread)
     */
    makeAnimCreature('boss-archon', 124, 120, (ctx, w, h, f) => {
      const cx = 62, floatY = f === 1 ? -4 : 1;
      const wingSpread = f === 1 ? 5 : 0;

      // Cosmic Singularity Shadow
      ctx.fillStyle = 'rgba(114, 9, 183, 0.42)';
      ctx.beginPath(); ctx.ellipse(cx, 108, 44, 10, 0, 0, Math.PI * 2); ctx.fill();

      // Rotating Golden Clockwork / Astrolabe Halo Behind Archon
      ctx.strokeStyle = '#f7cb45'; ctx.lineWidth = 2.8;
      ctx.beginPath(); ctx.arc(cx, 48 + floatY, 34, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(247, 203, 69, 0.45)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, 48 + floatY, 40, 0, Math.PI * 2); ctx.stroke();

      // 8 Clockwork Roman-Dial Spokes on Halo (rotates between Frame 0 and 1!)
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI / 4) + (f ? 0.2 : 0);
        ctx.strokeStyle = '#f7cb45'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * 28, 48 + floatY + Math.sin(ang) * 28);
        ctx.lineTo(cx + Math.cos(ang) * 39, 48 + floatY + Math.sin(ang) * 39);
        ctx.stroke();
      }

      // Six Levitating Astral Light-Blade Wings (3 Left, 3 Right)
      [-1, 1].forEach(dir => {
        [
          { yOff: -16, len: 52 + wingSpread, col: '#f72585' },
          { yOff: 2,   len: 56 + wingSpread, col: '#7209b7' },
          { yOff: 20,  len: 48 + wingSpread, col: '#4cc9f0' }
        ].forEach(wSpec => {
          ctx.fillStyle = wSpec.col;
          ctx.beginPath();
          ctx.moveTo(cx + dir * 14, 48 + floatY + wSpec.yOff * 0.4);
          ctx.lineTo(cx + dir * wSpec.len, 38 + floatY + wSpec.yOff);
          ctx.lineTo(cx + dir * (wSpec.len - 8), 49 + floatY + wSpec.yOff);
          ctx.closePath(); ctx.fill();

          ctx.fillStyle = '#fff3a1';
          ctx.fillRect(cx + dir * (wSpec.len - 12), 42 + floatY + wSpec.yOff, 4, 2);
        });
      });

      // Flowing Nebula Robes & Armored Celestial Torso
      ctx.fillStyle = '#240046';
      ctx.beginPath();
      ctx.moveTo(cx - 16, 36 + floatY);
      ctx.lineTo(cx + 16, 36 + floatY);
      ctx.lineTo(cx + 22, 96 + floatY);
      ctx.lineTo(cx, 88 + floatY);
      ctx.lineTo(cx - 22, 96 + floatY);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#5a189a';
      ctx.beginPath();
      ctx.moveTo(cx - 12, 38 + floatY);
      ctx.lineTo(cx + 12, 38 + floatY);
      ctx.lineTo(cx + 14, 86 + floatY);
      ctx.lineTo(cx - 14, 86 + floatY);
      ctx.closePath(); ctx.fill();

      // Golden Astral Breastplate & Chrono-Hourglass Emblem on Chest
      ctx.fillStyle = '#f7cb45';
      ctx.beginPath();
      ctx.moveTo(cx - 7, 44 + floatY); ctx.lineTo(cx + 7, 44 + floatY);
      ctx.lineTo(cx, 54 + floatY);
      ctx.lineTo(cx + 7, 64 + floatY); ctx.lineTo(cx - 7, 64 + floatY);
      ctx.lineTo(cx, 54 + floatY);
      ctx.closePath(); ctx.fill();

      // Crowned Archon Mask & Radiant Star-Eyes
      ctx.fillStyle = '#3c096c';
      ctx.beginPath(); ctx.arc(cx, 27 + floatY, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f7cb45'; // 3-spire celestial crown
      ctx.beginPath();
      ctx.moveTo(cx - 9, 22 + floatY); ctx.lineTo(cx - 7, 10 + floatY);
      ctx.lineTo(cx, 18 + floatY);     ctx.lineTo(cx, 7 + floatY);
      ctx.lineTo(cx, 18 + floatY);     ctx.lineTo(cx + 7, 10 + floatY);
      ctx.lineTo(cx + 9, 22 + floatY);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 5, 26 + floatY, 3.5, 2.5);
      ctx.fillRect(cx + 1.5, 26 + floatY, 3.5, 2.5);
    });

    // =========================================================================
    // CURZON HALL INTERIOR — TILES, ARCHITECTURE, PROPS & FACULTY SPRITES
    // =========================================================================

    // 1. Polished Teak Parquet Floor Tile (32x32)
    makeTex('tile-curzon-floor', 32, 32, (ctx, w, h) => {
      ctx.fillStyle = '#452615';
      ctx.fillRect(0, 0, w, h);
      // Parquet herringbone blocks
      const colors = ['#522f1a', '#5c351e', '#4a2817', '#3d2011', '#663b22'];
      // Horizontal block top-left
      ctx.fillStyle = colors[0]; ctx.fillRect(0, 0, 16, 8);
      ctx.fillStyle = colors[1]; ctx.fillRect(0, 8, 16, 8);
      // Vertical block top-right
      ctx.fillStyle = colors[2]; ctx.fillRect(16, 0, 8, 16);
      ctx.fillStyle = colors[3]; ctx.fillRect(24, 0, 8, 16);
      // Vertical block bottom-left
      ctx.fillStyle = colors[2]; ctx.fillRect(0, 16, 8, 16);
      ctx.fillStyle = colors[3]; ctx.fillRect(8, 16, 8, 16);
      // Horizontal block bottom-right
      ctx.fillStyle = colors[4]; ctx.fillRect(16, 16, 16, 8);
      ctx.fillStyle = colors[1]; ctx.fillRect(16, 24, 16, 8);
      // Subtle wood grain lines & bevel grooves
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(0, 15, 32, 1);
      ctx.fillRect(15, 0, 1, 32);
      ctx.fillRect(0, 7, 16, 1); ctx.fillRect(23, 0, 1, 16);
      ctx.fillRect(7, 16, 1, 16); ctx.fillRect(16, 23, 16, 1);
      // Polished sheen highlights
      ctx.fillStyle = 'rgba(255,220,180,0.07)';
      ctx.fillRect(1, 1, 14, 2);
      ctx.fillRect(17, 1, 2, 14);
      ctx.fillRect(1, 17, 2, 14);
      ctx.fillRect(17, 17, 14, 2);
    });

    // 2. Curzon Crimson Velvet Runner Carpet (32x32)
    makeTex('tile-curzon-carpet', 32, 32, (ctx, w, h) => {
      // Deep crimson velvet field
      ctx.fillStyle = '#831620';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#9b1b26';
      ctx.fillRect(4, 0, 24, 32);
      ctx.fillStyle = '#ad202c';
      ctx.fillRect(7, 0, 18, 32);
      // Velvet pile texture mottling
      ctx.fillStyle = 'rgba(60,6,12,0.25)';
      for (let y = 0; y < 32; y += 4) {
        ctx.fillRect(6, y + (y % 8 === 0 ? 0 : 2), 20, 1);
      }
      // Golden Brocade Borders (Left & Right)
      const gold = '#d4af37', goldL = '#f7d770', goldD = '#917118';
      // Left border
      ctx.fillStyle = goldD; ctx.fillRect(0, 0, 4, 32);
      ctx.fillStyle = gold;  ctx.fillRect(1, 0, 2, 32);
      ctx.fillStyle = goldL; ctx.fillRect(1, 0, 1, 32);
      // Right border
      ctx.fillStyle = goldD; ctx.fillRect(28, 0, 4, 32);
      ctx.fillStyle = gold;  ctx.fillRect(29, 0, 2, 32);
      ctx.fillStyle = goldL; ctx.fillRect(29, 0, 1, 32);
      // Embroidered gold diamonds along edges
      ctx.fillStyle = goldL;
      for (let y = 2; y < 32; y += 8) {
        ctx.fillRect(2, y, 1, 2);
        ctx.fillRect(29, y, 1, 2);
      }
    });

    // 3. Victorian Red-Brick & Polished Oak Wainscoting Wall (32x64)
    makeTex('tile-curzon-wall', 32, 64, (ctx, w, h) => {
      // Upper 38px: Red Brickwork
      ctx.fillStyle = '#8e2f23';
      ctx.fillRect(0, 0, 32, 38);
      // Top Stone Moulding / Cornice
      ctx.fillStyle = '#ecdfc5'; ctx.fillRect(0, 0, 32, 3);
      ctx.fillStyle = '#cdbd9f'; ctx.fillRect(0, 3, 32, 2);
      ctx.fillStyle = '#541b15'; ctx.fillRect(0, 5, 32, 1);
      // Staggered brick rows
      ctx.fillStyle = 'rgba(50,14,10,0.35)';
      for (let y = 8; y < 38; y += 5) ctx.fillRect(0, y, 32, 1);
      for (let y = 6, row = 0; y < 38; y += 5, row++) {
        const offset = (row % 2) * 8;
        for (let x = offset; x < 32; x += 16) ctx.fillRect(x, y, 1, 5);
      }
      // Brick tonal highlights
      ctx.fillStyle = 'rgba(235,110,90,0.22)';
      ctx.fillRect(2, 6, 6, 2); ctx.fillRect(18, 11, 7, 2);
      ctx.fillRect(4, 21, 8, 2); ctx.fillRect(20, 26, 6, 2);

      // Wainscoting Dado Rail (Separating Brick & Wood)
      ctx.fillStyle = '#ecdfc5'; ctx.fillRect(0, 38, 32, 2);
      ctx.fillStyle = '#cda23d'; ctx.fillRect(0, 40, 32, 1); // brass strip
      ctx.fillStyle = '#221109'; ctx.fillRect(0, 41, 32, 2);

      // Lower 23px: Dark Polished Oak Wainscoting
      ctx.fillStyle = '#3a1e12';
      ctx.fillRect(0, 43, 32, 21);
      // Recessed bevelled wood panels
      ctx.fillStyle = '#28130a'; ctx.fillRect(2, 45, 12, 14);
      ctx.fillStyle = '#482717'; ctx.fillRect(3, 46, 10, 12);
      ctx.fillStyle = '#28130a'; ctx.fillRect(18, 45, 12, 14);
      ctx.fillStyle = '#482717'; ctx.fillRect(19, 46, 10, 12);
      // Baseboard Plinth
      ctx.fillStyle = '#1c0c06'; ctx.fillRect(0, 60, 32, 4);
      ctx.fillStyle = '#d4af37'; ctx.fillRect(0, 60, 32, 1); // brass base runner
    });

    // 4. Grand Faculty Lecture Podium (44x56)
    makeTex('prop-podium', 44, 56, (ctx, w, h) => {
      // Ground shadow
      ctx.fillStyle = 'rgba(10,5,5,0.35)';
      ctx.beginPath(); ctx.ellipse(22, 53, 20, 4, 0, 0, Math.PI * 2); ctx.fill();
      // Stepped base
      ctx.fillStyle = '#221008'; ctx.fillRect(6, 48, 32, 5);
      ctx.fillStyle = '#3a1d10'; ctx.fillRect(8, 45, 28, 4);
      // Main podium shaft
      ctx.fillStyle = '#4a2514'; ctx.fillRect(10, 16, 24, 30);
      ctx.fillStyle = '#32180c'; ctx.fillRect(10, 16, 3, 30); // left shadow
      ctx.fillStyle = '#5c301c'; ctx.fillRect(31, 16, 3, 30); // right highlight
      // Recessed front panel with DU Gold Crest
      ctx.fillStyle = '#2c1409'; ctx.fillRect(15, 22, 14, 20);
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(22, 31, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(21, 29, 2, 4); ctx.fillRect(20, 31, 4, 1); // open book icon
      // Slanted lectern top
      ctx.fillStyle = '#5c301c'; ctx.fillRect(5, 10, 34, 7);
      ctx.fillStyle = '#7a4229'; ctx.fillRect(6, 8, 32, 4);
      // Academic lecture notes / manuscript
      ctx.fillStyle = '#f8f4e6'; ctx.fillRect(12, 7, 10, 5);
      ctx.fillStyle = '#475569'; ctx.fillRect(14, 9, 6, 1); ctx.fillRect(14, 10, 5, 1);
      // Brass Gooseneck Microphone
      ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(27, 9); ctx.quadraticCurveTo(28, 3, 25, 2); ctx.stroke();
      ctx.fillStyle = '#1e293b'; ctx.fillRect(23, 1, 3, 3);
    });

    // 5. Prof. S.N. Bose Quantum Physics Slate (104x62)
    makeTex('prop-blackboard-bose', 104, 62, (ctx, w, h) => {
      // Wood frame
      ctx.fillStyle = '#3a1f12'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#56301d'; ctx.fillRect(2, 2, w - 4, h - 4);
      // Slate chalkboard surface
      ctx.fillStyle = '#1e3328'; ctx.fillRect(4, 4, w - 8, h - 10);
      // Chalk dust smudge
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(8, 8, w - 16, h - 18);
      // Chalk tray & chalk pieces
      ctx.fillStyle = '#2b160b'; ctx.fillRect(2, h - 6, w - 4, 5);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(16, h - 5, 4, 2);
      ctx.fillStyle = '#fde047'; ctx.fillRect(24, h - 5, 4, 2);
      ctx.fillStyle = '#67e8f9'; ctx.fillRect(32, h - 5, 3, 2);

      // Formulas & Diagrams (S.N. Bose 1924 Quantum Statistics)
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('S.N. BOSE (1924) - DU PHYSICS', 8, 14);

      ctx.fillStyle = '#fef08a';
      ctx.font = '7px monospace';
      ctx.fillText('n_i = g_i / (e^(e_i/kT) - 1)', 8, 26);

      ctx.fillStyle = '#93c5fd';
      ctx.fillText('Phase Cells: h^3 = dp.dq', 8, 37);

      ctx.fillStyle = '#86efac';
      ctx.fillText('Photons: mu = 0 | B-E Condensate', 8, 47);

      // Quantum harmonic oscillator graph
      ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 74; x < 98; x++) {
        const val = Math.sin((x - 74) * 0.35) * 6;
        if (x === 74) ctx.moveTo(x, 32 - val);
        else ctx.lineTo(x, 32 - val);
      }
      ctx.stroke();
      ctx.strokeStyle = '#94a3b8'; ctx.beginPath();
      ctx.moveTo(74, 32); ctx.lineTo(98, 32); ctx.stroke();
    });

    // 6. Organic Chemistry Blackboard (92x56)
    makeTex('prop-blackboard-chem', 92, 56, (ctx, w, h) => {
      ctx.fillStyle = '#3a1f12'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1a2e26'; ctx.fillRect(4, 4, w - 8, h - 10);
      ctx.fillStyle = '#2b160b'; ctx.fillRect(2, h - 6, w - 4, 5);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(20, h - 5, 5, 2);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('CURZON CHEM: SYNTHESIS', 8, 14);

      // Benzene Ring
      ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 1.2;
      const bx = 22, by = 31, r = 10;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        const px = bx + r * Math.cos(ang), py = by + r * Math.sin(ang);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.stroke();
      // Inner aromatic circle
      ctx.beginPath(); ctx.arc(Number(bx), Number(by), 5, 0, Math.PI * 2); ctx.stroke();

      // Side chain & arrow
      ctx.strokeStyle = '#fde047';
      ctx.beginPath(); ctx.moveTo(bx + r, by); ctx.lineTo(bx + r + 8, by); ctx.stroke();
      ctx.fillStyle = '#fde047'; ctx.font = '6px monospace';
      ctx.fillText('-OCH3', bx + r + 9, by + 3);

      ctx.fillStyle = '#fbbf24';
      ctx.fillText('Capsaicin + Delta-H', 44, 28);
      ctx.fillStyle = '#86efac';
      ctx.fillText('pH = pKa + log([A-]/[HA])', 38, 42);
    });

    // 7. Mathematics & Chess Blackboard (92x56)
    makeTex('prop-blackboard-math', 92, 56, (ctx, w, h) => {
      ctx.fillStyle = '#3a1f12'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1e293b'; ctx.fillRect(4, 4, w - 8, h - 10);
      ctx.fillStyle = '#2b160b'; ctx.fillRect(2, h - 6, w - 4, 5);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(14, h - 5, 5, 2);

      ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 7px monospace';
      ctx.fillText('MATH & CHESS ACADEMY', 8, 14);

      ctx.fillStyle = '#fde047'; ctx.font = '6.5px monospace';
      ctx.fillText('1. e4 e5 | 2. Nf3 Nc6', 8, 25);
      ctx.fillText('3. Bb5 a6 (Ruy Lopez)', 8, 34);

      // Bell Curve (Normal Distribution)
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let x = 56; x < 86; x++) {
        const dx = (x - 71) / 4.5;
        const y = 46 - Math.exp(-0.5 * dx * dx) * 16;
        if (x === 56) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = '#94a3b8'; ctx.font = '5.5px monospace';
      ctx.fillText('f(x)=e^(-x^2)', 52, 46);
    });

    // 8. Chemistry Lab Workbench with Flasks & Burner (96x54)
    makeTex('prop-labdesk', 96, 54, (ctx, w, h) => {
      // Ground shadow
      ctx.fillStyle = 'rgba(10,5,5,0.30)';
      ctx.beginPath(); ctx.ellipse(48, 51, 44, 4, 0, 0, Math.PI * 2); ctx.fill();
      // Counter body
      ctx.fillStyle = '#2c170d'; ctx.fillRect(4, 18, 88, 32);
      ctx.fillStyle = '#422416'; ctx.fillRect(6, 20, 84, 28);
      // Slate Countertop
      ctx.fillStyle = '#1e293b'; ctx.fillRect(2, 14, 92, 5);
      ctx.fillStyle = '#334155'; ctx.fillRect(2, 14, 92, 1.5);
      // Drawers & Brass Knobs
      ctx.fillStyle = '#25130a';
      ctx.fillRect(10, 24, 22, 10); ctx.fillRect(10, 36, 22, 10);
      ctx.fillRect(37, 24, 22, 10); ctx.fillRect(37, 36, 22, 10);
      ctx.fillRect(64, 24, 22, 22);
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(20, 28, 2, 2); ctx.fillRect(20, 40, 2, 2);
      ctx.fillRect(47, 28, 2, 2); ctx.fillRect(47, 40, 2, 2);
      ctx.fillRect(74, 34, 2, 2);

      // Lab Apparatus on Desk:
      // 1. Erlenmeyer Flask with Cyan Liquid
      ctx.fillStyle = 'rgba(56,189,248,0.75)';
      ctx.beginPath();
      ctx.moveTo(14, 14); ctx.lineTo(20, 14); ctx.lineTo(23, 7); ctx.lineTo(11, 7);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#38bdf8'; ctx.fillRect(13, 9, 8, 5);
      ctx.fillStyle = '#e0f2fe'; ctx.fillRect(15, 5, 4, 2); // neck

      // 2. Bunsen Burner with Flame
      ctx.fillStyle = '#64748b'; ctx.fillRect(30, 9, 6, 5);
      ctx.fillStyle = '#334155'; ctx.fillRect(28, 13, 10, 2);
      // Blue core flame & orange tip
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath(); ctx.moveTo(31, 9); ctx.lineTo(35, 9); ctx.lineTo(33, 4); ctx.fill();
      ctx.fillStyle = '#fb923c';
      ctx.beginPath(); ctx.moveTo(32, 5); ctx.lineTo(34, 5); ctx.lineTo(33, 2); ctx.fill();

      // 3. Test Tube Rack with 4 tubes
      ctx.fillStyle = '#5c3822'; ctx.fillRect(46, 7, 20, 7);
      const tubeCols = ['#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
      tubeCols.forEach((col, i) => {
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(48 + i * 4.5, 3, 3, 9);
        ctx.fillStyle = col as any; ctx.fillRect(48.5 + i * 4.5, 6, 2, 5);
      });

      // 4. Round Florence Flask with Magenta Liquid
      ctx.fillStyle = '#a855f7';
      ctx.beginPath(); ctx.arc(76, 10, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e9d5ff'; ctx.fillRect(75, 3, 2, 4);
    });

    // 9. Botanical Specimen Table (88x52)
    makeTex('prop-botany-table', 88, 52, (ctx, w, h) => {
      // Ground shadow
      ctx.fillStyle = 'rgba(10,5,5,0.30)';
      ctx.beginPath(); ctx.ellipse(44, 49, 40, 4, 0, 0, Math.PI * 2); ctx.fill();
      // Table frame
      ctx.fillStyle = '#351c10'; ctx.fillRect(6, 16, 76, 32);
      ctx.fillStyle = '#4e2a18'; ctx.fillRect(8, 14, 72, 4);
      // Table legs
      ctx.fillStyle = '#241209';
      ctx.fillRect(8, 18, 5, 30); ctx.fillRect(75, 18, 5, 30);
      // Glass Specimen Cases with Krishnachura Flowers
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(14, 7, 24, 8);
      ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 1; ctx.strokeRect(14, 7, 24, 8);
      // Pressed crimson flower inside
      ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(22, 11, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#16a34a'; ctx.fillRect(25, 11, 4, 1.5); // stem

      // Brass Binocular Microscope
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(48, 10, 6, 4); // stage
      ctx.fillRect(50, 4, 3, 7);  // column
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(49, 2, 4, 3);  // eyepiece
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(50, 11, 2, 1); // mirror reflection

      // Botanical Folio with leaf sketch
      ctx.fillStyle = '#f8f4e6'; ctx.fillRect(64, 8, 14, 7);
      ctx.fillStyle = '#15803d'; ctx.fillRect(68, 10, 6, 2);
      ctx.fillRect(70, 11, 2, 3);
    });

    // 10. Heritage Chess Table with Carved Pieces (56x54)
    makeTex('prop-chess-table', 56, 54, (ctx, w, h) => {
      // Ground shadow
      ctx.fillStyle = 'rgba(10,5,5,0.32)';
      ctx.beginPath(); ctx.ellipse(28, 51, 24, 4, 0, 0, Math.PI * 2); ctx.fill();
      // Round Table Top (isometric ellipse)
      ctx.fillStyle = '#2c1409';
      ctx.beginPath(); ctx.ellipse(28, 22, 22, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a2512';
      ctx.beginPath(); ctx.ellipse(28, 20, 22, 11, 0, 0, Math.PI * 2); ctx.fill();
      // Pedestal Base
      ctx.fillStyle = '#32180b'; ctx.fillRect(26, 26, 4, 22);
      ctx.fillStyle = '#221006'; ctx.fillRect(18, 46, 20, 4);
      // Inlaid Chessboard (8x8 grid scaled to fit)
      const bx = 18, by = 14, bw = 20, bh = 12;
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#1e293b';
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if ((r + c) % 2 === 1) {
            ctx.fillRect(bx + c * (bw / 4), by + r * (bh / 4), bw / 4, bh / 4);
          }
        }
      }
      // Miniature Chess Pieces
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(21, 15, 2, 3); // White Pawn
      ctx.fillRect(26, 17, 2, 4); // White Knight
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(32, 16, 2, 3); // Black Pawn
      ctx.fillRect(28, 21, 2, 4); // Black King

      // Left Victorian Chair
      ctx.fillStyle = '#5c2d16'; ctx.fillRect(4, 24, 7, 18);
      ctx.fillStyle = '#831620'; ctx.fillRect(5, 26, 5, 8); // velvet upholstery
      // Right Victorian Chair
      ctx.fillStyle = '#5c2d16'; ctx.fillRect(45, 24, 7, 18);
      ctx.fillStyle = '#831620'; ctx.fillRect(46, 26, 5, 8);
    });

    // 11. Curzon Double-Height Library Bookshelf (76x96)
    makeTex('prop-curzon-bookshelf', 76, 96, (ctx, w, h) => {
      // Mahogany frame
      ctx.fillStyle = '#2b150c'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#422214'; ctx.fillRect(3, 3, w - 6, h - 6);
      // Top Arched Pediment
      ctx.fillStyle = '#5a301d';
      ctx.beginPath(); ctx.arc(w / 2, 10, 18, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(w / 2, 10, 4, 0, Math.PI * 2); ctx.fill();

      // 4 Shelf Rows packed with leather books
      const shelfY = [22, 42, 62, 82];
      const bookColors = ['#831620', '#166534', '#1e40af', '#b45309', '#4c1d95', '#334155'];
      shelfY.forEach((sy, rowIdx) => {
        // Shelf Plank
        ctx.fillStyle = '#241108'; ctx.fillRect(4, sy + 15, w - 8, 4);
        ctx.fillStyle = '#5a301d'; ctx.fillRect(4, sy + 15, w - 8, 1.5);
        // Books
        let bx = 6;
        while (bx < w - 10) {
          const bw = 3 + ((bx * 7 + rowIdx * 13) % 4);
          const bh = 11 + ((bx * 11) % 4);
          const col = bookColors[(bx + rowIdx * 3) % bookColors.length];
          ctx.fillStyle = col as any;
          ctx.fillRect(bx, sy + 15 - bh, bw, bh);
          // Gold title embossing on spine
          ctx.fillStyle = '#fde68a';
          ctx.fillRect(bx + 1, sy + 15 - bh + 3, bw - 2, 1);
          bx += bw + 1;
        }
      });
      // Brass Rolling Ladder Rail
      ctx.fillStyle = '#d4af37'; ctx.fillRect(2, 50, w - 4, 2);
      ctx.fillStyle = '#917118'; ctx.fillRect(2, 51, w - 4, 1);
    });

    // 12. Framed Oil Portrait of Prof. Satyendra Nath Bose (48x62)
    makeTex('prop-portrait-bose', 48, 62, (ctx, w, h) => {
      // Baroque Gold Frame with Carved Corners
      ctx.fillStyle = '#917118'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#d4af37'; ctx.fillRect(2, 2, w - 4, h - 4);
      ctx.fillStyle = '#f5d469'; ctx.fillRect(3, 3, w - 6, 2);
      ctx.fillStyle = '#7a5a0f'; ctx.fillRect(3, h - 5, w - 6, 2);
      // Burgundy Velvet Oval Matting
      ctx.fillStyle = '#4c0519'; ctx.fillRect(5, 5, w - 10, h - 10);
      // Portrait Canvas
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.ellipse(24, 29, 17, 21, 0, 0, Math.PI * 2); ctx.fill();
      // Prof. S.N. Bose Silhouette / Portrait
      // Ivory Panjabi & Shawl
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath(); ctx.ellipse(24, 45, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#451a03'; // brown vest
      ctx.fillRect(19, 38, 10, 11);
      // Head & Face
      ctx.fillStyle = '#dfaa78';
      ctx.beginPath(); ctx.arc(24, 24, 7.5, 0, Math.PI * 2); ctx.fill();
      // Silver-Black Hair
      ctx.fillStyle = '#475569';
      ctx.beginPath(); ctx.arc(24, 20, 8, Math.PI, 0); ctx.fill();
      // Circular Spectacles
      ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(21.5, 24, 2.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(26.5, 24, 2.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(24, 24); ctx.lineTo(24, 24); ctx.stroke();
      // Brass Nameplate
      ctx.fillStyle = '#d4af37'; ctx.fillRect(10, 52, 28, 5);
      ctx.fillStyle = '#1c1917'; ctx.font = 'bold 4px sans-serif';
      ctx.fillText('S.N. BOSE', 13, 56);
    });

    // 13. University of Dhaka Centennial Seal Plaque (48x48)
    makeTex('prop-portrait-du', 48, 48, (ctx, w, h) => {
      // Circular Wood Plaque
      ctx.fillStyle = '#2b150c';
      ctx.beginPath(); ctx.arc(24, 24, 23, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(24, 24, 21, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1e3a5f'; // DU Navy Blue center
      ctx.beginPath(); ctx.arc(24, 24, 18, 0, Math.PI * 2); ctx.fill();

      // DU Crest: Rising Sun, Open Book, River Waves
      // Rising Sun
      ctx.fillStyle = '#fde047';
      ctx.beginPath(); ctx.arc(24, 18, 5, Math.PI, 0); ctx.fill();
      // Open Book
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(18, 22); ctx.lineTo(24, 24); ctx.lineTo(30, 22);
      ctx.lineTo(30, 27); ctx.lineTo(24, 29); ctx.lineTo(18, 27);
      ctx.closePath(); ctx.fill();
      // Waves
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(17, 33); ctx.quadraticCurveTo(24, 31, 31, 33); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(19, 36); ctx.quadraticCurveTo(24, 34, 29, 36); ctx.stroke();
    });

    // 14. Victorian Brass Multi-Arm Chandelier (44x50)
    makeTex('prop-curzon-chandelier', 44, 50, (ctx, w, h) => {
      // Brass Hanging Chain
      ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(22, 16); ctx.stroke();
      // Central brass orb
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(22, 20, 5, 0, Math.PI * 2); ctx.fill();
      // Curved Arms (4 lanterns)
      const lx = [6, 15, 29, 38];
      const ly = [27, 31, 31, 27];
      ctx.strokeStyle = '#b89320'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(22, 20); ctx.quadraticCurveTo(lx[i], 22, lx[i], ly[i]); ctx.stroke();
        // Glass lantern
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(lx[i] - 3, ly[i], 6, 8);
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(lx[i] - 1.5, ly[i] + 2, 3, 4); // candle flame
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(lx[i] - 4, ly[i] - 2, 8, 2); // lantern cap
        ctx.fillRect(lx[i] - 3, ly[i] + 8, 6, 2); // lantern base
      }
    });

    // 15. Indoor Brass Potted Dhaka Fern (36x44)
    makeTex('prop-indoor-fern', 36, 44, (ctx, w, h) => {
      // Ground shadow
      ctx.fillStyle = 'rgba(10,5,5,0.30)';
      ctx.beginPath(); ctx.ellipse(18, 41, 14, 3, 0, 0, Math.PI * 2); ctx.fill();
      // Fluted Brass Planter Pot
      ctx.fillStyle = '#917118'; ctx.fillRect(10, 27, 16, 14);
      ctx.fillStyle = '#d4af37'; ctx.fillRect(9, 25, 18, 4);
      ctx.fillStyle = '#f5d469'; ctx.fillRect(10, 26, 16, 1.5);
      ctx.fillStyle = '#654f0e'; ctx.fillRect(11, 40, 14, 2);
      // Lush Fern Fronds (multiple arching curves)
      const greens = ['#15803d', '#16a34a', '#22c55e', '#4ade80'];
      const fronds = [
        [18, 25, 6, 8, 2, 14], [18, 25, 30, 8, 34, 14],
        [18, 25, 10, 4, 5, 2],  [18, 25, 26, 4, 31, 2],
        [18, 25, 18, 2, 18, 0]
      ];
      fronds.forEach(([x1, y1, cx, cy, x2, y2], idx) => {
        ctx.strokeStyle = greens[idx % greens.length];
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2); ctx.stroke();
      });
    });

    // 16. Grand Victorian Double Exit Doors (76x84)
    makeTex('prop-exit-door', 76, 84, (ctx, w, h) => {
      // Indo-Saracenic Red-Brick Arch Surround
      ctx.fillStyle = '#8e2f23'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ecdfc5'; // cream arch trim
      ctx.beginPath();
      ctx.arc(38, 36, 32, Math.PI, 0); ctx.lineTo(70, 84); ctx.lineTo(6, 84);
      ctx.closePath(); ctx.fill();

      // Arched Fanlight Transom Window (view to sunny outdoor lawn)
      ctx.fillStyle = '#86efac'; // lush lawn sunlight outside
      ctx.beginPath(); ctx.arc(38, 36, 27, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = '#2c1409'; ctx.lineWidth = 1.5;
      // Transom window spokes
      for (let a = 0; a <= 4; a++) {
        const ang = Math.PI + (a * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(38, 36);
        ctx.lineTo(38 + 27 * Math.cos(ang), 36 + 27 * Math.sin(ang));
        ctx.stroke();
      }

      // Teak Double Doors
      ctx.fillStyle = '#2c1409'; ctx.fillRect(11, 36, 54, 48);
      ctx.fillStyle = '#4a2512'; ctx.fillRect(13, 38, 24, 44); // Left door
      ctx.fillStyle = '#3e1e0d'; ctx.fillRect(39, 38, 24, 44); // Right door
      // Door Panels (recessed wood)
      ctx.fillStyle = '#241006';
      ctx.fillRect(16, 42, 18, 16); ctx.fillRect(16, 62, 18, 16);
      ctx.fillRect(42, 42, 18, 16); ctx.fillRect(42, 62, 18, 16);
      // Brass Handles & Lock
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(34, 56, 3, 8); ctx.fillRect(39, 56, 3, 8);
      // Floor threshold
      ctx.fillStyle = '#94a3b8'; ctx.fillRect(6, 81, 64, 3);
    });

    // 17. FACULTY & STUDENT ANIMATED SPRITES (-0 and -1 frames)
    // Prof. Satyendra (Physics Chair - S.N. Bose Homage)
    [0, 1].forEach(frame => {
      makeTex(`npc-prof-satyendra-${frame}`, 32, 56, (ctx, w, h) => {
        const bob = frame === 1 ? -1 : 0;
        // Ground shadow
        ctx.fillStyle = 'rgba(10,5,5,0.30)';
        ctx.beginPath(); ctx.ellipse(16, 54, 11, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        // Legs / Pajama
        ctx.fillStyle = '#f1f5f9'; ctx.fillRect(11, 40, 4, 12); ctx.fillRect(17, 40, 4, 12);
        // Leather Loafers
        ctx.fillStyle = '#29180d'; ctx.fillRect(10, 51, 5, 3); ctx.fillRect(17, 51, 5, 3);
        // Ivory Silk Punjabi
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(9, 22 + bob, 14, 20);
        // Brown Tweed Waistcoat
        ctx.fillStyle = '#451a03'; ctx.fillRect(9, 23 + bob, 14, 14);
        ctx.fillStyle = '#270e02'; ctx.fillRect(14, 23 + bob, 4, 14); // open front
        // Gold Pocket Watch Chain
        ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(11, 31 + bob); ctx.quadraticCurveTo(14, 34 + bob, 15, 31 + bob); ctx.stroke();
        // Neck & Head
        ctx.fillStyle = '#dfaa78'; ctx.fillRect(14, 17 + bob, 4, 5);
        ctx.beginPath(); ctx.arc(16, 14 + bob, 6.5, 0, Math.PI * 2); ctx.fill();
        // Silver-Grey Hair
        ctx.fillStyle = '#64748b';
        ctx.beginPath(); ctx.arc(16, 11 + bob, 7, Math.PI, 0); ctx.fill();
        ctx.fillRect(9.5, 11 + bob, 2, 4); ctx.fillRect(20.5, 11 + bob, 2, 4);
        // Gold Wire Spectacles
        ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(14, 14 + bob, 2, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(18, 14 + bob, 2, 0, Math.PI * 2); ctx.stroke();
        // Fountain Pen in Hand
        ctx.fillStyle = '#dfaa78'; ctx.fillRect(22, 28 + bob, 3, 3);
        ctx.fillStyle = '#1e293b'; ctx.fillRect(23, 26 + bob, 1.5, 7);
        ctx.fillStyle = '#d4af37'; ctx.fillRect(23, 25 + bob, 1.5, 1.5);
      });
    });

    // Prof. Sultana (Botany Chair)
    [0, 1].forEach(frame => {
      makeTex(`npc-prof-sultana-${frame}`, 32, 56, (ctx, w, h) => {
        const bob = frame === 1 ? -1 : 0;
        ctx.fillStyle = 'rgba(10,5,5,0.30)';
        ctx.beginPath(); ctx.ellipse(16, 54, 11, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        // Forest Green & Crimson Jamdani Saree
        ctx.fillStyle = '#14532d'; ctx.fillRect(9, 36, 14, 16);
        ctx.fillStyle = '#b91c1c'; ctx.fillRect(9, 48, 14, 4); // saree border
        // White Lab Coat draped over saree
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(8, 22 + bob, 16, 18);
        ctx.fillStyle = '#14532d'; ctx.fillRect(13, 22 + bob, 6, 14); // saree blouse visible
        // Head & Neck
        ctx.fillStyle = '#d49b6a'; ctx.fillRect(14, 17 + bob, 4, 5);
        ctx.beginPath(); ctx.arc(16, 14 + bob, 6.5, 0, Math.PI * 2); ctx.fill();
        // Dark Hair in Elegant Bun with Jasmine Garland
        ctx.fillStyle = '#1e1b18';
        ctx.beginPath(); ctx.arc(16, 11 + bob, 7, Math.PI, 0); ctx.fill();
        ctx.beginPath(); ctx.arc(16, 8 + bob, 3.5, 0, Math.PI * 2); ctx.fill(); // hair bun
        ctx.fillStyle = '#ffffff'; // jasmine flowers around bun
        ctx.fillRect(14, 7 + bob, 1.5, 1.5); ctx.fillRect(17, 7 + bob, 1.5, 1.5);
        // Red Bindi & Glasses
        ctx.fillStyle = '#dc2626'; ctx.fillRect(15.5, 12 + bob, 1.5, 1.5);
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 0.8;
        ctx.strokeRect(12, 13 + bob, 3, 2.5); ctx.strokeRect(17, 13 + bob, 3, 2.5);
        // Herbarium Portfolio in hand
        ctx.fillStyle = '#854d0e'; ctx.fillRect(5, 27 + bob, 5, 8);
        ctx.fillStyle = '#fef08a'; ctx.fillRect(6, 28 + bob, 3, 6);
      });
    });

    // Dr. Kabir (Chemistry Lab Master)
    [0, 1].forEach(frame => {
      makeTex(`npc-dr-kabir-${frame}`, 32, 56, (ctx, w, h) => {
        const bob = frame === 1 ? -1 : 0;
        ctx.fillStyle = 'rgba(10,5,5,0.30)';
        ctx.beginPath(); ctx.ellipse(16, 54, 11, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        // Dark Trousers & Shoes
        ctx.fillStyle = '#1e293b'; ctx.fillRect(11, 42, 4, 10); ctx.fillRect(17, 42, 4, 10);
        ctx.fillStyle = '#0f172a'; ctx.fillRect(10, 51, 5, 3); ctx.fillRect(17, 51, 5, 3);
        // White Lab Coat with Pens in Pocket
        ctx.fillStyle = '#ffffff'; ctx.fillRect(8, 22 + bob, 16, 21);
        ctx.fillStyle = '#cbd5e1'; ctx.fillRect(15, 22 + bob, 2, 21); // coat seam
        // Pocket with red and blue pens
        ctx.fillStyle = '#ef4444'; ctx.fillRect(10, 26 + bob, 1, 3);
        ctx.fillStyle = '#3b82f6'; ctx.fillRect(11.5, 26 + bob, 1, 3);
        // Head & Dark Hair
        ctx.fillStyle = '#d49b6a'; ctx.fillRect(14, 17 + bob, 4, 5);
        ctx.beginPath(); ctx.arc(16, 14 + bob, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1e1e24';
        ctx.beginPath(); ctx.arc(16, 11 + bob, 7, Math.PI, 0); ctx.fill();
        // Safety Goggles on Forehead
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(11, 10 + bob, 10, 2.5);
        ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 1; ctx.strokeRect(11, 10 + bob, 10, 2.5);
        // Holding Conical Flask with Glowing Cyan Liquid
        ctx.fillStyle = '#d49b6a'; ctx.fillRect(23, 27 + bob, 3, 3);
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.moveTo(22, 34 + bob); ctx.lineTo(27, 34 + bob);
        ctx.lineTo(25.5, 29 + bob); ctx.lineTo(23.5, 29 + bob);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(23, 31 + bob, 3, 3);
      });
    });

    // Prof. Motahar (Math & Chess Chair - Qazi Motahar Hossain Homage)
    [0, 1].forEach(frame => {
      makeTex(`npc-prof-motahar-${frame}`, 32, 56, (ctx, w, h) => {
        const bob = frame === 1 ? -1 : 0;
        ctx.fillStyle = 'rgba(10,5,5,0.30)';
        ctx.beginPath(); ctx.ellipse(16, 54, 11, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        // White Pajama & Traditional Nagra Shoes
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(11, 40, 4, 12); ctx.fillRect(17, 40, 4, 12);
        ctx.fillStyle = '#78350f'; ctx.fillRect(10, 51, 5, 3); ctx.fillRect(17, 51, 5, 3);
        // Cream Silk Punjabi
        ctx.fillStyle = '#fef3c7'; ctx.fillRect(9, 22 + bob, 14, 20);
        // Rich Burgundy Kashmiri Wool Shawl draped across shoulder
        ctx.fillStyle = '#831620';
        ctx.beginPath();
        ctx.moveTo(8, 22 + bob); ctx.lineTo(23, 26 + bob); ctx.lineTo(21, 38 + bob); ctx.lineTo(8, 35 + bob);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#d4af37'; ctx.fillRect(8, 34 + bob, 13, 1.5); // gold border on shawl
        // Head & Silver Beard
        ctx.fillStyle = '#dfaa78'; ctx.fillRect(14, 17 + bob, 4, 5);
        ctx.beginPath(); ctx.arc(16, 14 + bob, 6.5, 0, Math.PI * 2); ctx.fill();
        // Silver Hair & Dignified Silver Beard
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath(); ctx.arc(16, 11 + bob, 7, Math.PI, 0); ctx.fill();
        ctx.beginPath(); ctx.arc(16, 17 + bob, 4, 0, Math.PI); ctx.fill(); // neat beard
        // Holding Carved White Chess Knight in Hand
        ctx.fillStyle = '#dfaa78'; ctx.fillRect(23, 28 + bob, 3, 3);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(24, 24 + bob, 3, 5);
        ctx.fillStyle = '#f1f5f9'; ctx.fillRect(23, 25 + bob, 2, 2); // horse muzzle
      });
    });

    // Student Faiza (3rd Year Physics)
    [0, 1].forEach(frame => {
      makeTex(`npc-student-faiza-${frame}`, 32, 54, (ctx, w, h) => {
        const bob = frame === 1 ? -1 : 0;
        ctx.fillStyle = 'rgba(10,5,5,0.30)';
        ctx.beginPath(); ctx.ellipse(16, 52, 10, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        // Dark Blue Jeans & Sneakers
        ctx.fillStyle = '#1e3a5f'; ctx.fillRect(11, 38, 4, 12); ctx.fillRect(17, 38, 4, 12);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(10, 49, 5, 3); ctx.fillRect(17, 49, 5, 3);
        // Teal Blue Kurti
        ctx.fillStyle = '#0d9488'; ctx.fillRect(9, 22 + bob, 14, 18);
        ctx.fillStyle = '#f59e0b'; ctx.fillRect(9, 38 + bob, 14, 2); // yellow trim
        // Head & Ponytail
        ctx.fillStyle = '#d49b6a'; ctx.fillRect(14, 17 + bob, 4, 5);
        ctx.beginPath(); ctx.arc(16, 14 + bob, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1e1b18';
        ctx.beginPath(); ctx.arc(16, 11 + bob, 6.5, Math.PI, 0); ctx.fill();
        ctx.fillRect(8.5, 12 + bob, 3, 6); // bouncy side ponytail
        // Red Glasses
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1;
        ctx.strokeRect(12, 13 + bob, 3, 2.5); ctx.strokeRect(17, 13 + bob, 3, 2.5);
        // Wooden Clipboard with Graph Paper
        ctx.fillStyle = '#78350f'; ctx.fillRect(4, 25 + bob, 6, 9);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(5, 26 + bob, 4, 7);
      });
    });

    // Student Tanvir (Biochemistry Masters)
    [0, 1].forEach(frame => {
      makeTex(`npc-student-tanvir-${frame}`, 32, 54, (ctx, w, h) => {
        const bob = frame === 1 ? -1 : 0;
        ctx.fillStyle = 'rgba(10,5,5,0.30)';
        ctx.beginPath(); ctx.ellipse(16, 52, 10, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        // Khaki Trousers & Brown Shoes
        ctx.fillStyle = '#78716c'; ctx.fillRect(11, 38, 4, 12); ctx.fillRect(17, 38, 4, 12);
        ctx.fillStyle = '#451a03'; ctx.fillRect(10, 49, 5, 3); ctx.fillRect(17, 49, 5, 3);
        // Burgundy Hoodie & Messenger Bag Strap
        ctx.fillStyle = '#991b1b'; ctx.fillRect(9, 22 + bob, 14, 18);
        ctx.strokeStyle = '#451a03'; ctx.lineWidth = 2; // leather strap
        ctx.beginPath(); ctx.moveTo(9, 23 + bob); ctx.lineTo(23, 37 + bob); ctx.stroke();
        // Head & Dark Hair
        ctx.fillStyle = '#d49b6a'; ctx.fillRect(14, 17 + bob, 4, 5);
        ctx.beginPath(); ctx.arc(16, 14 + bob, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1c1917';
        ctx.beginPath(); ctx.arc(16, 11 + bob, 6.5, Math.PI, 0); ctx.fill();
        // Holding Thick Textbook
        ctx.fillStyle = '#1e40af'; ctx.fillRect(21, 26 + bob, 6, 9);
        ctx.fillStyle = '#fde047'; ctx.fillRect(22, 28 + bob, 4, 1.5); // gold title
      });
    });

    // 18. Iman (formerly Enan) — Tall, Handsome Bengali Man in Tailored Silk Panjabi (36x62)
    [0, 1].forEach(frame => {
      const renderIman = (ctx: any, w: number, h: number) => {
        const bob = frame === 1 ? -1 : 0;
        const cx = 18;

        // Ground shadow
        ctx.fillStyle = 'rgba(12, 8, 20, 0.28)';
        ctx.beginPath(); ctx.ellipse(cx, 60, 13, 3, 0, 0, Math.PI * 2); ctx.fill();

        // 1. Legs: Crisp White Churidar Pajama & Leather Nagra Shoes
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(cx - 5.5, 42, 4.5, 15);
        ctx.fillRect(cx + 1, 42, 4.5, 15);
        // Churidar fabric creases
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(cx - 5.5, 48, 4.5, 1); ctx.fillRect(cx - 5.5, 53, 4.5, 1);
        ctx.fillRect(cx + 1, 47, 4.5, 1); ctx.fillRect(cx + 1, 52, 4.5, 1);

        // Chestnut Leather Nagra Shoes with slight curl
        ctx.fillStyle = '#451a03';
        ctx.fillRect(cx - 6.5, 57, 5.5, 3.5);
        ctx.fillRect(cx + 1, 57, 5.5, 3.5);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(cx - 7, 58, 2, 2); ctx.fillRect(cx + 5, 58, 2, 2);

        // 2. Torso: Tailored Royal Emerald-Navy Silk Panjabi
        const panjabiDark = '#0f2b38', panjabiMain = '#164e63', panjabiLight = '#0891b2', goldThread = '#d4af37';
        ctx.fillStyle = panjabiMain;
        ctx.beginPath();
        ctx.roundRect(cx - 8, 21 + bob, 16, 24, 2);
        ctx.fill();

        // Side Slits & Hem Shading
        ctx.fillStyle = panjabiDark;
        ctx.fillRect(cx - 8, 36 + bob, 2.5, 9);
        ctx.fillRect(cx + 5.5, 36 + bob, 2.5, 9);
        ctx.fillStyle = goldThread;
        ctx.fillRect(cx - 8, 44 + bob, 16, 1.5); // gold border on panjabi hem

        // Placket & Mandarin Collar with Golden Buttons
        ctx.fillStyle = panjabiDark;
        ctx.fillRect(cx - 1.5, 20 + bob, 3, 14);
        ctx.fillStyle = goldThread;
        ctx.fillRect(cx - 0.75, 23 + bob, 1.5, 1.5);
        ctx.fillRect(cx - 0.75, 26 + bob, 1.5, 1.5);
        ctx.fillRect(cx - 0.75, 29 + bob, 1.5, 1.5);
        ctx.fillRect(cx - 0.75, 32 + bob, 1.5, 1.5);

        // Mandarin Collar
        ctx.fillStyle = panjabiDark;
        ctx.fillRect(cx - 3.5, 18.5 + bob, 7, 3);
        ctx.fillStyle = goldThread;
        ctx.fillRect(cx - 3.5, 18.5 + bob, 7, 0.8);

        // 3. Neck & Handsome Face
        ctx.fillStyle = '#dfaa78';
        ctx.fillRect(cx - 2.5, 16 + bob, 5, 4);
        // Head / Jawline
        ctx.beginPath();
        ctx.arc(cx, 13 + bob, 6.8, 0, Math.PI * 2);
        ctx.fill();

        // Sharp Eyebrows & Expressive Eyes
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(cx - 4.5, 11 + bob, 3, 1); ctx.fillRect(cx + 1.5, 11 + bob, 3, 1);
        ctx.fillRect(cx - 4, 12.5 + bob, 2.2, 2); ctx.fillRect(cx + 1.8, 12.5 + bob, 2.2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 3.5, 12.8 + bob, 1, 1); ctx.fillRect(cx + 2.3, 12.8 + bob, 1, 1);

        // 4. Stylish Modern Tapered Hair
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.arc(cx, 9.5 + bob, 7.2, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(cx - 7.2, 9.5 + bob, 2, 4);
        ctx.fillRect(cx + 5.2, 9.5 + bob, 2, 4);
        // Styled Pompadour / Texture on top
        ctx.fillStyle = '#27272a';
        ctx.beginPath();
        ctx.ellipse(cx + 1, 7.5 + bob, 5, 2.5, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // 5. Left Arm: Silver Wristwatch
        ctx.fillStyle = panjabiMain;
        ctx.fillRect(cx - 10, 22 + bob, 3, 13);
        ctx.fillStyle = '#dfaa78'; // Hand
        ctx.fillRect(cx - 10, 35 + bob, 3, 3);
        ctx.fillStyle = '#94a3b8'; // Silver watch
        ctx.fillRect(cx - 10, 34 + bob, 3, 1.5);

        // 6. Right Arm & Smartphone (Busy workaholic stance)
        ctx.fillStyle = panjabiMain;
        ctx.fillRect(cx + 7, 22 + bob, 3, 10);
        ctx.fillStyle = '#dfaa78';
        ctx.fillRect(cx + 7, 32 + bob, 4, 4);
        // Smartphone with glowing screen
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(cx + 8, 28 + bob, 4, 8);
        ctx.fillStyle = frame === 1 ? '#38bdf8' : '#7dd3fc';
        ctx.fillRect(cx + 8.5, 29 + bob, 3, 6);
      };
      makeTex(`npc-iman-${frame}`, 36, 62, renderIman);
      makeTex(`npc-enan-${frame}`, 36, 62, renderIman);
    });

    // 19. Mehjabin (formerly Salat) — Graceful Bengali Girl in Embroidered Salwar Kameez & Dupatta (34x56)
    [0, 1].forEach(frame => {
      const renderMehjabin = (ctx: any, w: number, h: number) => {
        const bob = frame === 1 ? -1 : 0;
        const flutter = frame === 1 ? 1 : 0;
        const cx = 17;

        // Ground shadow
        ctx.fillStyle = 'rgba(12, 8, 20, 0.26)';
        ctx.beginPath(); ctx.ellipse(cx, 54, 11, 2.8, 0, 0, Math.PI * 2); ctx.fill();

        // 1. Lower Body: Cream Salwar & Elegant Heeled Sandals
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(cx - 5.5, 38, 4.5, 13);
        ctx.fillRect(cx + 1, 38, 4.5, 13);
        ctx.fillStyle = '#d4af37'; // gold embroidered cuffs
        ctx.fillRect(cx - 5.5, 49, 4.5, 1.5);
        ctx.fillRect(cx + 1, 49, 4.5, 1.5);

        // Open-toe sandals & delicate feet
        ctx.fillStyle = '#fff1e8';
        ctx.fillRect(cx - 5, 51, 3.5, 3); ctx.fillRect(cx + 1.5, 51, 3.5, 3);
        ctx.fillStyle = '#991b1b'; // Red sandal straps
        ctx.fillRect(cx - 5.5, 51.5, 4.5, 1.5); ctx.fillRect(cx + 1, 51.5, 4.5, 1.5);

        // 2. Back Hair (Lustrous dark wavy locks falling over shoulders)
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.ellipse(cx, 16 + bob, 9, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        // Hair cascading down left side
        ctx.beginPath();
        ctx.ellipse(cx - 7, 24 + bob, 3.5, 9, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // 3. Kameez: Warm Sunshine-Yellow & Peach-Rose Accent
        const kameezMain = '#f59e0b', kameezLight = '#fbbf24', kameezDark = '#d97706', goldTrim = '#fef08a';
        ctx.fillStyle = kameezMain;
        ctx.beginPath();
        ctx.roundRect(cx - 7.5, 21 + bob, 15, 20, 2);
        ctx.fill();
        // Side Slits & Hem Detail
        ctx.fillStyle = kameezDark;
        ctx.fillRect(cx - 7.5, 34 + bob, 2, 7);
        ctx.fillRect(cx + 5.5, 34 + bob, 2, 7);
        ctx.fillStyle = goldTrim;
        ctx.fillRect(cx - 7.5, 39 + bob, 15, 2); // embroidered hem

        // 4. Flowing Chiffon Dupatta (Orna) draped across shoulder and chest
        const ornaMain = 'rgba(244, 114, 182, 0.88)', ornaBorder = '#ec4899';
        ctx.fillStyle = ornaMain;
        ctx.beginPath();
        ctx.moveTo(cx - 8, 20 + bob);
        ctx.quadraticCurveTo(cx - 2, 27 + bob, cx + 7.5, 34 + bob);
        ctx.lineTo(cx + 6, 37 + bob);
        ctx.quadraticCurveTo(cx - 4, 30 + bob, cx - 8.5, 23 + bob);
        ctx.closePath();
        ctx.fill();
        // Dupatta trail falling behind
        ctx.fillStyle = ornaMain;
        ctx.fillRect(cx - 9.5, 22 + bob, 3, 18 + flutter);
        ctx.fillStyle = ornaBorder;
        ctx.fillRect(cx - 9.5, 39 + bob + flutter, 3, 1.5);

        // 5. Neck, Face & Golden Jhumkas (Fair radiant complexion)
        ctx.fillStyle = '#fae1d4'; // Soft neck shadow
        ctx.fillRect(cx - 2, 16 + bob, 4, 5);
        // Face - Fair porcelain base & luminous highlight
        ctx.fillStyle = '#fff1e8';
        ctx.beginPath();
        ctx.arc(cx, 13.5 + bob, 6.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fffaf5'; // gentle forehead highlight
        ctx.beginPath();
        ctx.ellipse(cx, 12 + bob, 3.8, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Delicate Golden Jhumka Earrings
        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.arc(cx - 6.8, 15 + bob, 1.5, 0, Math.PI * 2);
        ctx.arc(cx + 6.8, 15 + bob, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - 7.5, 16.5 + bob, 1.8, 2);
        ctx.fillRect(cx + 6, 16.5 + bob, 1.8, 2);

        // Kohl-rimmed eyes, sweet smile & rosy cheeks
        ctx.fillStyle = 'rgba(255, 120, 145, 0.40)'; // soft petal pink blush
        ctx.beginPath();
        ctx.arc(cx - 3.5, 15 + bob, 1.6, 0, Math.PI * 2);
        ctx.arc(cx + 3.5, 15 + bob, 1.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1c1917'; // Kohl eyes
        ctx.fillRect(cx - 4.2, 12 + bob, 2.5, 1.8);
        ctx.fillRect(cx + 1.7, 12 + bob, 2.5, 1.8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 3.5, 12.2 + bob, 1, 1);
        ctx.fillRect(cx + 2.3, 12.2 + bob, 1, 1);

        ctx.fillStyle = '#e11d48'; // Rosy lips
        ctx.fillRect(cx - 1.5, 16.5 + bob, 3, 1.2);

        // 6. Styled Front Hair Bangs
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(cx, 10 + bob, 6.5, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(cx - 6.5, 10 + bob, 2, 3);
        ctx.fillRect(cx + 4.5, 10 + bob, 2, 3);

        // 7. Arms & Bangles (Hands gently folded)
        ctx.fillStyle = kameezMain;
        ctx.fillRect(cx - 8.5, 22 + bob, 2.5, 9);
        ctx.fillRect(cx + 6, 22 + bob, 2.5, 9);
        // Glass bangles
        ctx.fillStyle = '#fde047'; ctx.fillRect(cx - 8.5, 30 + bob, 2.5, 1);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(cx - 8.5, 31 + bob, 2.5, 1);
        ctx.fillStyle = '#fde047'; ctx.fillRect(cx + 6, 30 + bob, 2.5, 1);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(cx + 6, 31 + bob, 2.5, 1);
        // Fair hands
        ctx.fillStyle = '#fff1e8';
        ctx.fillRect(cx - 3, 31 + bob, 6, 3.5);
      };
      makeTex(`npc-mehjabin-${frame}`, 34, 56, renderMehjabin);
      makeTex(`npc-salat-${frame}`, 34, 56, renderMehjabin);
    });

    // =========================================================================
    // GREEN MEADOWS FARMHOUSE & ANIMALS PROCEDURAL SPRITES & TEXTURES
    // =========================================================================

    // 1. Traditional Red Timber Barn (prop-farm-barn: 196 x 140 px)
    /**
     * @asset-spec
     * @id prop-farm-barn
     * @external-png assets/sprites/landmarks/farm_barn.png
     * @fallback-procedural prop-farm-barn (196x140)
     * @grid-footprint 6x5 tiles (192x80px solid collision base)
     * @visual-size 196x140px (or 98x70px native pixel art upscaled 2x)
     * @origin 0.5, 0.9
     * @frames 1 static timber barn with sliding hay door
     */
    makeTex('prop-farm-barn', 196, 140, (ctx, W, H) => {
      // Ground Shadow
      ctx.fillStyle = 'rgba(12, 18, 10, 0.32)';
      ctx.beginPath(); ctx.ellipse(98, 134, 94, 9, 0, 0, Math.PI * 2); ctx.fill();

      // Stone Foundation Plinth
      ctx.fillStyle = '#475569'; ctx.fillRect(16, 122, 164, 14);
      ctx.fillStyle = '#64748b'; ctx.fillRect(16, 122, 164, 3);
      for (let sx = 20; sx < 176; sx += 14) {
        ctx.fillStyle = '#334155'; ctx.fillRect(sx, 125, 1, 10);
      }

      // Barn Body (Crimson Country Red)
      ctx.fillStyle = '#881337'; ctx.fillRect(20, 52, 156, 72);
      ctx.fillStyle = '#9f1239'; ctx.fillRect(24, 52, 148, 70);

      // Vertical Wood Planking
      ctx.fillStyle = '#4c0519';
      for (let px = 24; px < 172; px += 8) {
        ctx.fillRect(px, 52, 1, 70);
      }

      // Gambrel Roof / Loft Pitch (Warm Cedar Shingles)
      ctx.fillStyle = '#5c1d11';
      ctx.beginPath();
      ctx.moveTo(98, 6);
      ctx.lineTo(184, 54);
      ctx.lineTo(12, 54);
      ctx.closePath();
      ctx.fill();

      // Roof Highlights and Ridge Trim
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.moveTo(98, 8);
      ctx.lineTo(178, 52);
      ctx.lineTo(18, 52);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fef3c7'; // Roof ridge crest
      ctx.fillRect(94, 3, 8, 4);

      // Loft Hay Window & Door with White Cross-braces
      ctx.fillStyle = '#1c1917'; ctx.fillRect(80, 24, 36, 26);
      ctx.fillStyle = '#fbbf24'; // Golden Hay poking out
      ctx.beginPath(); ctx.ellipse(98, 48, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; // White Arch Trim
      ctx.fillRect(80, 24, 36, 2); ctx.fillRect(80, 24, 2, 26); ctx.fillRect(114, 24, 2, 26);

      // Ground Barn Double Sliding Doors (Teak with White X-Braces)
      ctx.fillStyle = '#1c1917'; ctx.fillRect(66, 68, 64, 56);
      ctx.fillStyle = '#b91c1c'; ctx.fillRect(68, 70, 29, 52); ctx.fillRect(99, 70, 29, 52);
      ctx.fillStyle = '#ffffff';
      // Left Door X-Brace
      ctx.fillRect(68, 70, 29, 2); ctx.fillRect(68, 120, 29, 2); ctx.fillRect(68, 70, 2, 52); ctx.fillRect(95, 70, 2, 52);
      ctx.beginPath(); ctx.moveTo(70, 72); ctx.lineTo(95, 120); ctx.lineTo(93, 120); ctx.lineTo(68, 74); ctx.fill();
      ctx.beginPath(); ctx.moveTo(95, 72); ctx.lineTo(70, 120); ctx.lineTo(72, 120); ctx.lineTo(97, 74); ctx.fill();
      // Right Door X-Brace
      ctx.fillRect(99, 70, 29, 2); ctx.fillRect(99, 120, 29, 2); ctx.fillRect(99, 70, 2, 52); ctx.fillRect(126, 70, 2, 52);
      ctx.beginPath(); ctx.moveTo(101, 72); ctx.lineTo(126, 120); ctx.lineTo(124, 120); ctx.lineTo(99, 74); ctx.fill();
      ctx.beginPath(); ctx.moveTo(126, 72); ctx.lineTo(101, 120); ctx.lineTo(103, 120); ctx.lineTo(128, 74); ctx.fill();

      // Brass Lantern beside door
      ctx.fillStyle = '#d4af37'; ctx.fillRect(56, 78, 5, 8);
      ctx.fillStyle = '#fef08a'; ctx.fillRect(57, 80, 3, 4);

      // Weather Vane Rooster on Roof Peak
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(97, 0, 2, 8);
      ctx.beginPath(); ctx.arc(98, 1, 3, 0, Math.PI * 2); ctx.fill();
    });

    // 2. Grain Silo (prop-farm-silo: 64 x 130 px)
    /**
     * @asset-spec
     * @id prop-farm-silo
     * @external-png assets/sprites/landmarks/farm_silo.png
     * @fallback-procedural prop-farm-silo (64x130)
     * @grid-footprint 2x4 tiles (64x48px solid collision base)
     * @visual-size 64x130px (or 32x65px native pixel art upscaled 2x)
     * @origin 0.5, 0.9
     * @frames 1 static grain storage silo
     */
    makeTex('prop-farm-silo', 64, 130, (ctx, W, H) => {
      // Shadow
      ctx.fillStyle = 'rgba(12, 18, 10, 0.28)';
      ctx.beginPath(); ctx.ellipse(32, 124, 28, 7, 0, 0, Math.PI * 2); ctx.fill();

      // Metal Cylindrical Base
      const grad = ctx.createLinearGradient(8, 0, 56, 0);
      grad.addColorStop(0, '#64748b');
      grad.addColorStop(0.3, '#cbd5e1');
      grad.addColorStop(0.7, '#f8fafc');
      grad.addColorStop(1, '#475569');
      ctx.fillStyle = grad;
      ctx.fillRect(10, 36, 44, 88);

      // Silo Metal Rings
      ctx.fillStyle = '#334155';
      for (let ry = 48; ry < 120; ry += 16) {
        ctx.fillRect(10, ry, 44, 2);
      }

      // Dome Roof
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(32, 38, 22, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#93c5fd';
      ctx.beginPath();
      ctx.arc(30, 36, 17, Math.PI, 0);
      ctx.closePath();
      ctx.fill();

      // Ladder on Silo Side
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(44, 38, 2, 84);
      ctx.fillRect(50, 38, 2, 84);
      for (let ly = 42; ly < 120; ly += 7) {
        ctx.fillRect(44, ly, 8, 1.5);
      }
    });

    // 3. Wooden Pasture Fence (prop-farm-fence: 96 x 36 px)
    makeTex('prop-farm-fence', 96, 36, (ctx, W, H) => {
      ctx.fillStyle = 'rgba(12, 18, 10, 0.2)';
      ctx.fillRect(0, 32, 96, 3);
      // Posts
      [6, 48, 90].forEach(px => {
        ctx.fillStyle = '#5c3a21'; ctx.fillRect(px, 6, 6, 28);
        ctx.fillStyle = '#855836'; ctx.fillRect(px + 1, 6, 2, 28);
        // Post point
        ctx.fillStyle = '#855836';
        ctx.beginPath(); ctx.moveTo(px, 6); ctx.lineTo(px + 3, 1); ctx.lineTo(px + 6, 6); ctx.fill();
      });
      // Horizontal Rails
      ctx.fillStyle = '#784d29'; ctx.fillRect(0, 11, 96, 5); ctx.fillRect(0, 22, 96, 5);
      ctx.fillStyle = '#9c663b'; ctx.fillRect(0, 11, 96, 1.5); ctx.fillRect(0, 22, 96, 1.5);
    });

    // 3A. Grand Rustic Farmhouse Timber Archway & Gateway (prop-farm-arch: 192 x 128 px)
    /**
     * @asset-spec
     * @id prop-farm-arch
     * @external-png assets/sprites/landmarks/farm_archway.png
     * @fallback-procedural prop-farm-arch (192x128)
     * @grid-footprint 6x4 tiles (192x32px base threshold with center road opening)
     * @visual-size 192x128px (or 96x64px native pixel art upscaled 2x)
     * @origin 0.5, 0.95
     * @frames 1 spanning entrance arch with hanging lanterns
     */
    makeTex('prop-farm-arch', 192, 128, (ctx, W, H) => {
      // 1. Soft Ground Shadows under Stone Bases and Swing Gates
      ctx.fillStyle = 'rgba(12, 18, 10, 0.32)';
      ctx.beginPath(); ctx.ellipse(34, 122, 28, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(158, 122, 28, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(54, 116, 16, 4, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(138, 116, 16, 4, 0.2, 0, Math.PI * 2); ctx.fill();

      // 2. Fieldstone / Cobblestone Pillar Plinths
      const drawPlinth = (x, y, w, h) => {
        ctx.fillStyle = '#334155';
        ctx.fillRect(x, y, w, h);
        const stones = [
          [x + 2, y + 2, w / 2 - 3, h / 3 - 2, '#64748b'],
          [x + w / 2 + 1, y + 2, w / 2 - 3, h / 3 - 2, '#475569'],
          [x + 3, y + h / 3 + 2, w / 3, h / 3 - 2, '#475569'],
          [x + w / 3 + 4, y + h / 3 + 2, w * 2 / 3 - 6, h / 3 - 2, '#64748b'],
          [x + 2, y + h * 2 / 3 + 2, w / 2 - 2, h / 3 - 4, '#475569'],
          [x + w / 2 + 2, y + h * 2 / 3 + 2, w / 2 - 4, h / 3 - 4, '#64748b'],
        ];
        stones.forEach(([sx, sy, sw, sh, col]) => {
          ctx.fillStyle = col as any;
          ctx.fillRect(sx, sy, sw, sh);
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(sx, sy, sw, 1);
        });
        ctx.fillStyle = '#65a30d';
        ctx.fillRect(x + 4, y + h - 5, 5, 2);
        ctx.fillRect(x + w - 8, y + h - 8, 4, 2);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x - 2, y - 4, w + 4, 4);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(x - 2, y - 4, w + 4, 1);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x - 2, y, w + 4, 1);
      };
      drawPlinth(20, 94, 28, 28);
      drawPlinth(144, 94, 28, 28);

      // 3. Sturdy Vertical Timber Posts (Warm Cedar & Dark Teak)
      const drawPost = (px) => {
        ctx.fillStyle = '#451a03';
        ctx.fillRect(px, 16, 16, 76);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(px + 2, 16, 12, 76);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(px + 4, 16, 2, 76);
        ctx.fillRect(px + 9, 16, 2, 76);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(px + 2, 16, 1, 76);

        [28, 82].forEach(by => {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(px - 1, by, 18, 5);
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(px + 2, by + 1, 2, 2);
          ctx.fillRect(px + 12, by + 1, 2, 2);
        });

        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.moveTo(px, 16);
        ctx.lineTo(px + 8, 8);
        ctx.lineTo(px + 16, 16);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.moveTo(px + 4, 16);
        ctx.lineTo(px + 8, 9);
        ctx.lineTo(px + 12, 16);
        ctx.closePath();
        ctx.fill();
      };
      drawPost(26);
      drawPost(150);

      // 4. Arched Wooden Knee Brackets
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(42, 48);
      ctx.quadraticCurveTo(46, 28, 68, 26);
      ctx.lineTo(68, 32);
      ctx.quadraticCurveTo(50, 34, 42, 54);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(150, 48);
      ctx.quadraticCurveTo(146, 28, 124, 26);
      ctx.lineTo(124, 32);
      ctx.quadraticCurveTo(142, 34, 150, 54);
      ctx.closePath();
      ctx.fill();

      // 5. Massive Horizontal Timber Crossbeam / Lintel
      ctx.fillStyle = '#451a03';
      ctx.fillRect(14, 18, 164, 14);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(16, 20, 160, 10);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(16, 20, 160, 2);
      ctx.fillStyle = '#291003';
      ctx.fillRect(14, 18, 3, 14);
      ctx.fillRect(175, 18, 3, 14);

      // 6. Charming Cedar Shingle Roof Canopy
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(96, 2);
      ctx.lineTo(182, 18);
      ctx.lineTo(10, 18);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#9a3412';
      ctx.beginPath();
      ctx.moveTo(96, 4);
      ctx.lineTo(178, 17);
      ctx.lineTo(14, 17);
      ctx.closePath();
      ctx.fill();

      for (let rx = 20; rx < 172; rx += 10) {
        ctx.fillStyle = (rx % 20 === 0) ? '#b45309' : '#d97706';
        ctx.fillRect(rx, 13, 8, 4);
        ctx.fillStyle = '#451a03';
        ctx.fillRect(rx + 8, 13, 1, 4);
      }
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(94, 0, 4, 3);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(92, 2, 8, 2);

      // 7. Hanging Carved Wooden Welcome Plaque ("GREEN MEADOWS")
      ctx.fillStyle = '#1e293b';
      [60, 132].forEach(cx => {
        ctx.fillRect(cx, 32, 2, 7);
        ctx.fillRect(cx - 1, 34, 4, 1.5);
      });
      const bx = 46, by = 38, bw = 100, bh = 22;
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 3);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.roundRect(bx + 1.5, by + 1.5, bw - 3, bh - 3, 2);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.fillRect(bx + 3, by + 3, bw - 6, bh - 6);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(bx + 3, by + 11, bw - 6, 1);

      ctx.fillStyle = '#451a03';
      ctx.font = 'bold 7.5px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GREEN MEADOWS', 96, by + 7.5);

      ctx.fillStyle = '#991b1b';
      ctx.fillRect(93, by + 13, 6, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(95, by + 14, 2, 3);
      ctx.fillStyle = '#ca8a04';
      ctx.fillText('🌾        🌾', 96, by + 15.5);

      // 8. Open Welcoming Country Picket Gates (Ajar in perspective)
      const drawGate = (gx, dir) => {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(gx, 66, dir * 8, 3);
        ctx.fillRect(gx, 88, dir * 8, 3);
        for (let i = 0; i < 3; i++) {
          const px = gx + dir * (6 + i * 8);
          const py = 62 + i * 2;
          const ph = 36 - i * 2;
          ctx.fillStyle = '#451a03';
          ctx.fillRect(px, py, 6, ph);
          ctx.fillStyle = '#855836';
          ctx.fillRect(px + 1, py + 1, 4, ph - 2);
          ctx.fillStyle = '#a16207';
          ctx.fillRect(px + 1, py + 1, 2, ph - 2);
          ctx.fillStyle = '#a16207';
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + 3, py - 3);
          ctx.lineTo(px + 6, py);
          ctx.closePath();
          ctx.fill();
        }
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(gx + dir * 6, 92);
        ctx.lineTo(gx + dir * 24, 66);
        ctx.stroke();
        ctx.strokeStyle = '#a16207';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      };
      drawGate(42, 1);
      drawGate(150, -1);

      // 9. Antique Brass & Forged Iron Hanging Barn Lanterns with Warm Corona
      const drawLantern = (lx, ly) => {
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lx < 96 ? lx + 12 : lx - 12, ly - 4);
        ctx.lineTo(lx, ly - 4);
        ctx.lineTo(lx, ly);
        ctx.stroke();

        const glow = ctx.createRadialGradient(lx, ly + 6, 2, lx, ly + 6, 16);
        glow.addColorStop(0, 'rgba(254, 240, 138, 0.65)');
        glow.addColorStop(0.5, 'rgba(245, 158, 11, 0.3)');
        glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(lx, ly + 6, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.moveTo(lx - 5, ly);
        ctx.lineTo(lx, ly - 4);
        ctx.lineTo(lx + 5, ly);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(lx - 4, ly, 8, 10);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(lx - 2, ly + 2, 4, 6);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(lx - 4, ly, 1.5, 10);
        ctx.fillRect(lx + 2.5, ly, 1.5, 10);
        ctx.fillRect(lx - 4, ly + 9, 8, 2);
      };
      drawLantern(16, 52);
      drawLantern(176, 52);

      // 10. Climbing Flowering Vines (Bougainvillea & Jasmine)
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(22, 112);
      ctx.quadraticCurveTo(18, 80, 26, 60);
      ctx.quadraticCurveTo(34, 40, 44, 28);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(170, 112);
      ctx.quadraticCurveTo(174, 80, 166, 60);
      ctx.quadraticCurveTo(158, 40, 148, 28);
      ctx.stroke();

      const leaves = [
        [20, 95], [26, 85], [22, 70], [30, 50], [40, 32], [54, 22], [70, 20],
        [172, 95], [166, 85], [170, 70], [162, 50], [152, 32], [138, 22], [122, 20]
      ];
      leaves.forEach(([lx, ly]) => {
        ctx.fillStyle = '#16a34a';
        ctx.beginPath(); ctx.ellipse(lx, ly, 3, 2, 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4ade80';
        ctx.beginPath(); ctx.arc(lx, ly, 1.2, 0, Math.PI * 2); ctx.fill();
      });

      const blossoms = [
        [18, 92, '#f43f5e'], [28, 82, '#ffffff'], [20, 68, '#fb7185'], [32, 48, '#ffffff'],
        [44, 30, '#f43f5e'], [62, 20, '#ffffff'],
        [174, 92, '#f43f5e'], [164, 82, '#ffffff'], [172, 68, '#fb7185'], [160, 48, '#ffffff'],
        [146, 30, '#f43f5e'], [130, 20, '#ffffff']
      ];
      blossoms.forEach(([bx, by, col]) => {
        ctx.fillStyle = col as any;
        ctx.beginPath(); ctx.arc(Number(bx), Number(by), 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.fillRect(Number(bx) - 0.6, Number(by) - 0.6, 1.2, 1.2);
      });

      // 11. Rustic Side Accents
      const wx = 12, wy = 104, wr = 11;
      ctx.fillStyle = 'rgba(12, 18, 10, 0.28)';
      ctx.beginPath(); ctx.ellipse(wx, wy + 8, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.beginPath(); ctx.arc(wx, wy, wr - 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2b5329';
      ctx.beginPath(); ctx.arc(wx, wy, wr - 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.5;
      for (let a = 0; a < Math.PI; a += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(wx + Math.cos(a) * (wr - 3), wy + Math.sin(a) * (wr - 3));
        ctx.lineTo(wx - Math.cos(a) * (wr - 3), wy - Math.sin(a) * (wr - 3));
        ctx.stroke();
      }
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.arc(wx, wy, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.arc(wx, wy, 1.2, 0, Math.PI * 2); ctx.fill();

      const drawMilkCan = (mx, my, scale) => {
        ctx.fillStyle = 'rgba(12, 18, 10, 0.25)';
        ctx.beginPath(); ctx.ellipse(mx + 4 * scale, my + 14 * scale, 5 * scale, 2 * scale, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(mx, my + 4 * scale, 8 * scale, 10 * scale);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(mx + 1 * scale, my + 4 * scale, 3 * scale, 10 * scale);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(mx + 1.5 * scale, my + 1.5 * scale, 5 * scale, 3 * scale);
        ctx.fillStyle = '#d4af37';
        ctx.fillRect(mx + 1 * scale, my, 6 * scale, 2 * scale);
        ctx.fillRect(mx + 3 * scale, my - 1.5 * scale, 2 * scale, 1.5 * scale);
      };
      drawMilkCan(174, 102, 1.1);
      drawMilkCan(182, 106, 0.9);

      [ [18, 122], [38, 123], [146, 122], [168, 123] ].forEach(([fx, fy]) => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(fx, fy, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.fillRect(fx - 0.5, fy - 0.5, 1, 1);
      });
    });

    // 3B. Rustic Directional Farm Milestone / Signpost (prop-farm-sign: 48 x 64 px)
    makeTex('prop-farm-sign', 48, 64, (ctx, W, H) => {
      ctx.fillStyle = 'rgba(12, 18, 10, 0.28)';
      ctx.beginPath(); ctx.ellipse(24, 60, 16, 4, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#451a03'; ctx.fillRect(21, 6, 6, 54);
      ctx.fillStyle = '#78350f'; ctx.fillRect(22, 6, 4, 54);
      ctx.fillStyle = '#92400e'; ctx.fillRect(23, 6, 1.5, 54);
      ctx.fillStyle = '#b45309';
      ctx.beginPath(); ctx.moveTo(21, 6); ctx.lineTo(24, 1); ctx.lineTo(27, 6); ctx.fill();

      const drawArrow = (ay, text, pointsRight) => {
        const ax = pointsRight ? 14 : 2;
        const aw = 30;
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        if (pointsRight) {
          ctx.moveTo(ax, ay); ctx.lineTo(ax + aw - 5, ay); ctx.lineTo(ax + aw, ay + 6);
          ctx.lineTo(ax + aw - 5, ay + 12); ctx.lineTo(ax, ay + 12);
        } else {
          ctx.moveTo(ax + 5, ay); ctx.lineTo(ax + aw, ay); ctx.lineTo(ax + aw, ay + 12);
          ctx.lineTo(ax + 5, ay + 12); ctx.lineTo(ax, ay + 6);
        }
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        if (pointsRight) {
          ctx.moveTo(ax + 1, ay + 1); ctx.lineTo(ax + aw - 5, ay + 1); ctx.lineTo(ax + aw - 1, ay + 6);
          ctx.lineTo(ax + aw - 5, ay + 11); ctx.lineTo(ax + 1, ay + 11);
        } else {
          ctx.moveTo(ax + 5, ay + 1); ctx.lineTo(ax + aw - 1, ay + 1); ctx.lineTo(ax + aw - 1, ay + 11);
          ctx.lineTo(ax + 5, ay + 11); ctx.lineTo(ax + 1, ay + 6);
        }
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = '#78350f';
        ctx.font = 'bold 5px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, ax + aw / 2, ay + 6.5);
      };

      drawArrow(8, 'FARM 🏡', true);
      drawArrow(22, 'COWS 🐄', true);
      drawArrow(36, 'POND 🦆', false);

      ctx.fillStyle = '#1e293b'; ctx.fillRect(17, 18, 4, 1.5);
      ctx.fillStyle = '#d4af37';
      ctx.beginPath(); ctx.moveTo(17, 20); ctx.lineTo(14, 26); ctx.lineTo(20, 26); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fef08a'; ctx.fillRect(16.5, 26, 1, 1.5);

      ctx.fillStyle = '#16a34a';
      ctx.fillRect(18, 56, 2, 4); ctx.fillRect(26, 55, 2, 5); ctx.fillRect(29, 57, 2, 3);
      ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(17, 56, 1.5, 0, Math.PI * 2); ctx.fill();
    });

    // 3C. Vibrant Golden Country Sunflowers (prop-sunflowers: 56 x 48 px)
    makeTex('prop-sunflowers', 56, 48, (ctx, W, H) => {
      ctx.fillStyle = 'rgba(12, 18, 10, 0.28)';
      ctx.beginPath(); ctx.ellipse(28, 44, 24, 4, 0, 0, Math.PI * 2); ctx.fill();

      const stems = [
        [16, 44, 14, 20], [26, 44, 28, 14], [38, 44, 40, 18], [46, 44, 44, 26]
      ];
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 2.5;
      stems.forEach(([bx, by, tx, ty]) => {
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo((bx + tx) / 2 - 3, (by + ty) / 2, tx, ty); ctx.stroke();
      });

      const leaves = [ [12, 32, -0.4], [22, 30, 0.3], [32, 28, -0.3], [44, 34, 0.4] ];
      leaves.forEach(([lx, ly, rot]) => {
        ctx.fillStyle = '#16a34a';
        ctx.beginPath(); ctx.ellipse(lx, ly, 6, 3, rot, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4ade80';
        ctx.beginPath(); ctx.ellipse(lx, ly, 4, 1.5, rot, 0, Math.PI * 2); ctx.fill();
      });

      const heads = [
        [14, 18, 9], [28, 12, 11], [40, 16, 10], [45, 25, 8]
      ];
      heads.forEach(([hx, hy, r]) => {
        ctx.fillStyle = '#facc15';
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
          const px = hx + Math.cos(a) * (r - 1);
          const py = hy + Math.sin(a) * (r - 1);
          ctx.beginPath(); ctx.arc(px, py, 2.8, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#fef08a';
        for (let a = Math.PI / 12; a < Math.PI * 2; a += Math.PI / 6) {
          const px = hx + Math.cos(a) * (r - 1.5);
          const py = hy + Math.sin(a) * (r - 1.5);
          ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#451a03';
        ctx.beginPath(); ctx.arc(hx, hy, r * 0.48, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#78350f';
        ctx.beginPath(); ctx.arc(hx, hy, r * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath(); ctx.arc(hx, hy, r * 0.16, 0, Math.PI * 2); ctx.fill();
      });
    });

    // 3D. Golden Pastoral Hay Bale (prop-farm-haybale: 44 x 32 px)
    makeTex('prop-farm-haybale', 44, 32, (ctx, W, H) => {
      ctx.fillStyle = 'rgba(12, 18, 10, 0.3)';
      ctx.beginPath(); ctx.ellipse(22, 28, 20, 4, 0, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(4, 10, 36, 18);
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(4, 10); ctx.lineTo(10, 4); ctx.lineTo(42, 4); ctx.lineTo(40, 10);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#a16207';
      ctx.beginPath();
      ctx.moveTo(40, 10); ctx.lineTo(42, 4); ctx.lineTo(42, 22); ctx.lineTo(40, 28);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#fef08a';
      for (let i = 0; i < 20; i++) {
        const sx = 6 + (i * 7) % 30;
        const sy = 12 + (i * 3) % 14;
        ctx.fillRect(sx, sy, 3, 1);
      }
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 1;
      [ [3, 14], [2, 22], [41, 12], [42, 24], [12, 3], [34, 3] ].forEach(([wx, wy]) => {
        ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + (wx < 20 ? -3 : 3), wy - 2); ctx.stroke();
      });

      ctx.fillStyle = '#451a03';
      ctx.fillRect(14, 10, 2, 18);
      ctx.fillRect(30, 10, 2, 18);
      ctx.beginPath();
      ctx.moveTo(14, 10); ctx.lineTo(19, 4);
      ctx.moveTo(30, 10); ctx.lineTo(34, 4);
      ctx.stroke();
    });

    // 4. Shuravi the Dairy Cow (npc-cow-0 & npc-cow-1: 58 x 46 px)
    [0, 1].forEach(frame => {
      makeTex(`npc-cow-${frame}`, 58, 46, (ctx, W, H) => {
        const bob = frame ? -1 : 0;
        const tailSway = frame ? 2 : -2;

        // Ground Shadow
        ctx.fillStyle = 'rgba(10, 20, 10, 0.28)';
        ctx.beginPath(); ctx.ellipse(29, 41, 24, 5, 0, 0, Math.PI * 2); ctx.fill();

        // Tail
        ctx.strokeStyle = '#1c1917'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(11, 22 + bob); ctx.quadraticCurveTo(6, 28 + bob, 7 + tailSway, 35 + bob); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(7 + tailSway, 35 + bob, 2, 0, Math.PI * 2); ctx.fill();

        // 4 Legs (Black/White Hooves)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(14, 28 + (frame ? -1 : 0), 5, 13);
        ctx.fillRect(23, 28 + (frame ? 1 : 0), 5, 13);
        ctx.fillRect(36, 28 + (frame ? -1 : 0), 5, 13);
        ctx.fillRect(44, 28 + (frame ? 1 : 0), 5, 13);
        ctx.fillStyle = '#1e293b'; // Hooves
        ctx.fillRect(14, 38 + (frame ? -1 : 0), 5, 3);
        ctx.fillRect(23, 38 + (frame ? 1 : 0), 5, 3);
        ctx.fillRect(36, 38 + (frame ? -1 : 0), 5, 3);
        ctx.fillRect(44, 38 + (frame ? 1 : 0), 5, 3);

        // Pink Udder
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath(); ctx.ellipse(20, 31 + bob, 5, 3, 0, 0, Math.PI * 2); ctx.fill();

        // Plump Body (White with classic black spots)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(30, 23 + bob, 20, 12, 0, 0, Math.PI * 2); ctx.fill();
        // Black patches
        ctx.fillStyle = '#1e293b';
        ctx.beginPath(); ctx.ellipse(22, 19 + bob, 7, 6, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(36, 25 + bob, 6, 5, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(15, 25 + bob, 4, 4, 0, 0, Math.PI * 2); ctx.fill();

        // Cow Head (Facing Right)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(47, 16 + bob, 8.5, 7.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1e293b'; // Black patch over right eye
        ctx.beginPath(); ctx.ellipse(48, 14 + bob, 4.5, 4, 0, 0, Math.PI * 2); ctx.fill();

        // Horns
        ctx.fillStyle = '#fef08a';
        ctx.beginPath(); ctx.moveTo(43, 11 + bob); ctx.lineTo(41, 5 + bob); ctx.lineTo(45, 9 + bob); ctx.fill();
        ctx.beginPath(); ctx.moveTo(48, 11 + bob); ctx.lineTo(47, 5 + bob); ctx.lineTo(50, 9 + bob); ctx.fill();

        // Ears
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath(); ctx.ellipse(40, 14 + bob, 3.5, 2, -0.4, 0, Math.PI * 2); ctx.fill();

        // Big gentle cow eye
        ctx.fillStyle = '#0f172a';
        ctx.beginPath(); ctx.arc(49, 15 + bob, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(49.5, 14.2 + bob, 0.8, 0.8);

        // Pink Snout & Nostrils
        ctx.fillStyle = '#fda4af';
        ctx.beginPath(); ctx.ellipse(53, 19 + bob, 4.5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#9f1239';
        ctx.fillRect(53, 18.5 + bob, 1.2, 1.2); ctx.fillRect(55, 18.5 + bob, 1.2, 1.2);

        // Brass cowbell around neck
        ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(43, 22 + bob, 5, 0, Math.PI); ctx.stroke();
        ctx.fillStyle = '#eab308';
        ctx.beginPath(); ctx.moveTo(41, 26 + bob); ctx.lineTo(45, 26 + bob); ctx.lineTo(46, 30 + bob); ctx.lineTo(40, 30 + bob); ctx.closePath(); ctx.fill();
      });
    });

    // 5. Kalu the Bengal Black Goat (npc-goat-0 & npc-goat-1: 42 x 38 px)
    [0, 1].forEach(frame => {
      makeTex(`npc-goat-${frame}`, 42, 38, (ctx, W, H) => {
        const bob = frame ? -1 : 0;
        // Ground shadow
        ctx.fillStyle = 'rgba(10, 20, 10, 0.25)';
        ctx.beginPath(); ctx.ellipse(21, 35, 16, 4, 0, 0, Math.PI * 2); ctx.fill();

        // 4 Slender Legs
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(10, 24 + (frame ? -1 : 0), 3, 11);
        ctx.fillRect(16, 24 + (frame ? 1 : 0), 3, 11);
        ctx.fillRect(26, 24 + (frame ? -1 : 0), 3, 11);
        ctx.fillRect(31, 24 + (frame ? 1 : 0), 3, 11);

        // Black Body & Tail
        ctx.fillStyle = '#292524';
        ctx.beginPath(); ctx.ellipse(21, 19 + bob, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
        // Upright tail
        ctx.strokeStyle = '#1c1917'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(9, 18 + bob); ctx.lineTo(6, 13 + bob); ctx.stroke();

        // Goat Head & Goatee Beard
        ctx.fillStyle = '#1c1917';
        ctx.beginPath(); ctx.ellipse(32, 13 + bob, 6.5, 5.5, 0, 0, Math.PI * 2); ctx.fill();
        // Goatee
        ctx.fillStyle = '#f5f5f4';
        ctx.beginPath(); ctx.moveTo(34, 18 + bob); ctx.lineTo(37, 23 + bob); ctx.lineTo(35, 18 + bob); ctx.fill();

        // Curved Horns
        ctx.strokeStyle = '#e7e5e4'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(30, 9 + bob); ctx.quadraticCurveTo(27, 2 + bob, 23, 4 + bob); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(33, 9 + bob); ctx.quadraticCurveTo(30, 2 + bob, 26, 4 + bob); ctx.stroke();

        // Shiny Amber Eye
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.arc(33, 12 + bob, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.fillRect(32.8, 11.8 + bob, 0.8, 0.8);
      });
    });

    // 6. Tuntuni the Free-Range Hen (npc-chicken-0 & npc-chicken-1: 32 x 30 px)
    [0, 1].forEach(frame => {
      makeTex(`npc-chicken-${frame}`, 32, 30, (ctx, W, H) => {
        const bob = frame ? -1 : 0;
        const peck = frame ? 1.5 : 0;

        // Shadow
        ctx.fillStyle = 'rgba(10, 20, 10, 0.22)';
        ctx.beginPath(); ctx.ellipse(16, 27, 9, 3, 0, 0, Math.PI * 2); ctx.fill();

        // Yellow Feet
        ctx.fillStyle = '#eab308';
        ctx.fillRect(13, 21 + (frame ? -1 : 0), 2, 7);
        ctx.fillRect(18, 21 + (frame ? 1 : 0), 2, 7);

        // Speckled Brown Body
        ctx.fillStyle = '#b45309';
        ctx.beginPath(); ctx.ellipse(16, 17 + bob, 8.5, 7, 0, 0, Math.PI * 2); ctx.fill();
        // Tail Feathers
        ctx.fillStyle = '#78350f';
        ctx.beginPath(); ctx.moveTo(9, 16 + bob); ctx.lineTo(4, 9 + bob); ctx.lineTo(10, 12 + bob); ctx.fill();

        // Head
        ctx.fillStyle = '#d97706';
        ctx.beginPath(); ctx.arc(22, 12 + bob + peck, 4.5, 0, Math.PI * 2); ctx.fill();

        // Red Comb & Wattle
        ctx.fillStyle = '#dc2626';
        ctx.beginPath(); ctx.arc(22, 7 + bob + peck, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(24, 7.5 + bob + peck, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(23, 15 + bob + peck, 2, 2.5); // Wattle

        // Eye & Yellow Beak
        ctx.fillStyle = '#000000'; ctx.fillRect(23, 11 + bob + peck, 1.2, 1.2);
        ctx.fillStyle = '#facc15';
        ctx.beginPath(); ctx.moveTo(26, 11 + bob + peck); ctx.lineTo(29, 13 + bob + peck); ctx.lineTo(26, 14 + bob + peck); ctx.fill();
      });
    });

    // 7. Piku the White Duckling (npc-duck-0 & npc-duck-1: 34 x 28 px)
    [0, 1].forEach(frame => {
      makeTex(`npc-duck-${frame}`, 34, 28, (ctx, W, H) => {
        const bob = frame ? -1 : 0;
        // Shadow / Water Ripple
        ctx.fillStyle = 'rgba(14, 116, 144, 0.25)';
        ctx.beginPath(); ctx.ellipse(17, 25, 12, 3.5, 0, 0, Math.PI * 2); ctx.fill();

        // Orange Webbed Feet
        ctx.fillStyle = '#f97316';
        ctx.fillRect(13, 20 + (frame ? -1 : 0), 2.5, 5);
        ctx.fillRect(19, 20 + (frame ? 1 : 0), 2.5, 5);

        // Fluffy Pure White Body
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(17, 16 + bob, 9, 6.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath(); ctx.ellipse(17, 18 + bob, 7, 4, 0, 0, Math.PI * 2); ctx.fill();

        // Duck Tail upturned
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(9, 15 + bob); ctx.lineTo(5, 11 + bob); ctx.lineTo(10, 13 + bob); ctx.fill();

        // Head
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(23, 11 + bob, 4.8, 0, Math.PI * 2); ctx.fill();

        // Eye
        ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(24, 10 + bob, 1.2, 0, Math.PI * 2); ctx.fill();

        // Flat Orange Bill
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.roundRect(26, 11 + bob, 6, 3, 1.5);
        ctx.fill();
      });
    });

    // 8. Chacha Rafiq (Farm Owner in Kurta & Farmer Lungi: npc-farmer-rafiq-0 & -1)
    [0, 1].forEach(frame => {
      makeTex(`npc-farmer-rafiq-${frame}`, 36, 60, (ctx, W, H) => {
        const bob = frame ? -1 : 0;
        const cx = 18;

        // Ground shadow
        ctx.fillStyle = 'rgba(12, 18, 10, 0.28)';
        ctx.beginPath(); ctx.ellipse(cx, 55, 12, 3, 0, 0, Math.PI * 2); ctx.fill();

        // Checked Bengal Lungi (Green & White Plaid)
        ctx.fillStyle = '#15803d'; ctx.fillRect(cx - 6, 36, 12, 17);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 6, 41, 12, 1); ctx.fillRect(cx - 6, 48, 12, 1);
        ctx.fillRect(cx - 2, 36, 1, 17); ctx.fillRect(cx + 2, 36, 1, 17);

        // Brown Sandal Feet
        ctx.fillStyle = '#855836';
        ctx.fillRect(cx - 5, 53 + (frame ? -1 : 0), 4, 3);
        ctx.fillRect(cx + 1, 53 + (frame ? 1 : 0), 4, 3);

        // White Cotton Kurta
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(cx - 7, 20 + bob, 14, 18);
        ctx.fillStyle = '#e2e8f0'; ctx.fillRect(cx - 1, 20 + bob, 2, 18);

        // Neck & Smiling Face with Graying Beard
        ctx.fillStyle = '#dfaa78'; ctx.fillRect(cx - 2.5, 15 + bob, 5, 6);
        ctx.beginPath(); ctx.arc(cx, 13 + bob, 6, 0, Math.PI * 2); ctx.fill();

        // Graying Beard & Moustache
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath(); ctx.arc(cx, 15 + bob, 4.5, 0, Math.PI); ctx.fill();
        ctx.fillRect(cx - 3, 14 + bob, 6, 1.8);

        // Friendly Eyes & Eyebrows
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(cx - 3.5, 11 + bob, 2, 1.5); ctx.fillRect(cx + 1.5, 11 + bob, 2, 1.5);

        // Traditional Woven Straw Sun-Hat (Mathal)
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.moveTo(cx, 2 + bob);
        ctx.lineTo(cx + 12, 9 + bob);
        ctx.lineTo(cx - 12, 9 + bob);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(cx - 11, 8.5 + bob, 22, 1.5); // Hat brim

        // Arms holding a Pitchfork
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(cx - 9, 21 + bob, 2.5, 9);
        ctx.fillStyle = '#dfaa78'; ctx.fillRect(cx - 9, 30 + bob, 2.5, 3);
        // Wooden handle
        ctx.fillStyle = '#78350f'; ctx.fillRect(cx - 11, 14 + bob, 2, 40);
        // Iron Prongs
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(cx - 14, 11 + bob, 8, 2);
        ctx.fillRect(cx - 14, 7 + bob, 1.5, 5);
        ctx.fillRect(cx - 11, 6 + bob, 1.5, 6);
        ctx.fillRect(cx - 8, 7 + bob, 1.5, 5);
      });
    });

  }
}
