// src/graphics/CharacterSpriteGenerator.ts - Moon Walker, Totoro, Ahona, Apshora, Rakin, Anamika, Faculty, & Ghost sprites
// Migrated 100% intact from game.js

export class CharacterSpriteGenerator {
  static generate(scene: any, makeTex: (key: string, w: number, h: number, drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => void) {
    // --- Moon Walker & Totoro Sprites ---
    /**
     * @asset-spec
     * @id player
     * @external-png assets/sprites/characters/moon_walker.png
     * @fallback-procedural player-0 (48x56)
     * @grid-footprint 1x1 tile (20x14px solid foot collision)
     * @visual-size 32x48px (or 16x32px native upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
     */
    [0, 1].forEach(step => {
      makeTex(`player-${step}`, 48, 56, ctx => {
        const bob = step === 1 ? -1.5 : 0;
        const lLegOff = step === 1 ? -2.5 : 0;
        const rLegOff = step === 1 ? 2.0 : 0;
        const lArmSwing = step === 1 ? 1.5 : 0;
        const rArmSwing = step === 1 ? -1.5 : 0;

        // 1. Soft Ground Shadow
        ctx.fillStyle = 'rgba(15, 10, 22, 0.26)';
        ctx.beginPath(); ctx.ellipse(24, 52, 12, 4.2, 0, 0, Math.PI * 2); ctx.fill();

        // 2. Bare Legs, Knees & Blue Slip-On Shoes (with pink collars)
        // Left Leg
        ctx.fillStyle = '#d4a383'; // Under-skirt leg shadow
        ctx.fillRect(17.5, 38 + bob, 4, 4);
        ctx.fillStyle = '#ecc1a1'; // Warm skin tone
        ctx.fillRect(17.5, 41 + bob, 4, 8 + lLegOff);
        ctx.fillStyle = '#c99576'; // Subtle knee tick mark
        ctx.fillRect(19, 43 + bob + lLegOff * 0.4, 1.5, 1);

        // Right Leg
        ctx.fillStyle = '#d4a383';
        ctx.fillRect(26.5, 38 + bob, 4, 4);
        ctx.fillStyle = '#ecc1a1';
        ctx.fillRect(26.5, 41 + bob, 4, 8 + rLegOff);
        ctx.fillStyle = '#c99576';
        ctx.fillRect(28, 43 + bob + rLegOff * 0.4, 1.5, 1);

        // Left Shoe (Blue flat with pink ankle trim & dark sole)
        const lShoeY = 48.5 + bob + lLegOff;
        ctx.fillStyle = '#3a4454';
        ctx.beginPath(); ctx.ellipse(19, lShoeY + 2.2, 4.2, 1.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6088b8';
        ctx.beginPath(); ctx.ellipse(19, lShoeY + 1.2, 4, 2.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e09bb3'; // Pink collar trim
        ctx.fillRect(17.5, lShoeY - 0.5, 3.2, 1.5);

        // Right Shoe
        const rShoeY = 48.5 + bob + rLegOff;
        ctx.fillStyle = '#3a4454';
        ctx.beginPath(); ctx.ellipse(29, rShoeY + 2.2, 4.2, 1.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6088b8';
        ctx.beginPath(); ctx.ellipse(29, rShoeY + 1.2, 4, 2.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e09bb3';
        ctx.fillRect(27.3, rShoeY - 0.5, 3.2, 1.5);

        // 3. Outstretched Swinging Arms & Bare Hands
        ctx.strokeStyle = '#ecc1a1';
        ctx.lineWidth = 3.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        // Left arm angled slightly outward like reference pose
        ctx.moveTo(15, 25 + bob);
        ctx.lineTo(9.5, 33.5 + bob + lArmSwing);
        // Right arm angled slightly outward
        ctx.moveTo(33, 25 + bob);
        ctx.lineTo(38.5, 33.5 + bob + rArmSwing);
        ctx.stroke();

        // Hands
        ctx.fillStyle = '#ecc1a1';
        ctx.beginPath();
        ctx.arc(9.2, 34 + bob + lArmSwing, 2.2, 0, Math.PI * 2);
        ctx.arc(38.8, 34 + bob + rArmSwing, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // 4. Pale-Yellow Collared Short-Sleeve Shirt
        // Flared Short Sleeves
        ctx.fillStyle = '#d4c362'; // Sleeve shadow outline
        ctx.beginPath();
        ctx.moveTo(17, 22 + bob); ctx.lineTo(10.5, 26.5 + bob); ctx.lineTo(14.5, 30 + bob); ctx.lineTo(18, 27 + bob);
        ctx.moveTo(31, 22 + bob); ctx.lineTo(37.5, 26.5 + bob); ctx.lineTo(33.5, 30 + bob); ctx.lineTo(30, 27 + bob);
        ctx.fill();

        ctx.fillStyle = '#eee07a'; // Main pale yellow shirt
        ctx.beginPath();
        ctx.moveTo(17, 22 + bob); ctx.lineTo(11.5, 26 + bob); ctx.lineTo(14.5, 29 + bob); ctx.lineTo(18, 26.5 + bob);
        ctx.moveTo(31, 22 + bob); ctx.lineTo(36.5, 26 + bob); ctx.lineTo(33.5, 29 + bob); ctx.lineTo(30, 26.5 + bob);
        ctx.fill();

        // Shirt Torso
        ctx.fillStyle = '#dfd06b';
        ctx.fillRect(16.5, 21.5 + bob, 15, 9.5);
        ctx.fillStyle = '#f2e585';
        ctx.fillRect(17.5, 21.5 + bob, 13, 9);

        // 5. High-Waisted Flared Amber-Orange Skirt & Terracotta Left Shading
        // Dark interior hem shadow
        ctx.fillStyle = '#8c3819';
        ctx.beginPath(); ctx.ellipse(24, 39.2 + bob, 11.5, 2.2, 0, 0, Math.PI * 2); ctx.fill();

        // Main Flared Skirt Silhouette (Bright Amber-Orange)
        ctx.fillStyle = '#e08219';
        ctx.beginPath();
        ctx.moveTo(17, 29.5 + bob);
        ctx.lineTo(31, 29.5 + bob);
        ctx.quadraticCurveTo(36, 34.5 + bob, 36.5, 39 + bob);
        ctx.quadraticCurveTo(24, 41.5 + bob, 11.5, 39 + bob);
        ctx.quadraticCurveTo(12, 34.5 + bob, 17, 29.5 + bob);
        ctx.closePath();
        ctx.fill();

        // Characteristic Reddish-Terracotta Left Side Shade (Exact match to picture)
        ctx.fillStyle = '#c45936';
        ctx.beginPath();
        ctx.moveTo(17, 29.5 + bob);
        ctx.lineTo(20.5, 29.5 + bob);
        ctx.quadraticCurveTo(16.5, 35 + bob, 16, 39.8 + bob);
        ctx.lineTo(11.5, 39 + bob);
        ctx.quadraticCurveTo(12, 34.5 + bob, 17, 29.5 + bob);
        ctx.closePath();
        ctx.fill();

        // High Waistband
        ctx.fillStyle = '#c45936';
        ctx.fillRect(17, 28.5 + bob, 14, 2.2);
        ctx.fillStyle = '#e88d25';
        ctx.fillRect(19.5, 28.5 + bob, 11.5, 2);

        // 6. Orange Suspender Straps & Red-Orange Buttons
        ctx.fillStyle = '#d96e24';
        ctx.fillRect(19, 22 + bob, 2.2, 7.5);
        ctx.fillRect(26.8, 22 + bob, 2.2, 7.5);
        // Suspender Buttons on Waistband
        ctx.fillStyle = '#c94a29';
        ctx.beginPath();
        ctx.arc(20.1, 29.4 + bob, 1.3, 0, Math.PI * 2);
        ctx.arc(27.9, 29.4 + bob, 1.3, 0, Math.PI * 2);
        ctx.fill();

        // 7. Peter-Pan Shirt Collar, Neck & Center Button
        ctx.fillStyle = '#d4a383'; // Neck shadow
        ctx.fillRect(22, 18.5 + bob, 4, 3.5);
        ctx.fillStyle = '#ecc1a1'; // Neck
        ctx.fillRect(22.5, 18.5 + bob, 3, 3);

        // Yellow Collar Flaps
        ctx.fillStyle = '#b59b40'; // Collar outline
        ctx.beginPath();
        ctx.moveTo(24, 21.8 + bob); ctx.lineTo(19, 20 + bob); ctx.lineTo(20.5, 23.8 + bob); ctx.closePath();
        ctx.moveTo(24, 21.8 + bob); ctx.lineTo(29, 20 + bob); ctx.lineTo(27.5, 23.8 + bob); ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#f5e98e';
        ctx.beginPath();
        ctx.moveTo(24, 21.5 + bob); ctx.lineTo(19.6, 20.2 + bob); ctx.lineTo(20.8, 23.2 + bob); ctx.closePath();
        ctx.moveTo(24, 21.5 + bob); ctx.lineTo(28.4, 20.2 + bob); ctx.lineTo(27.2, 23.2 + bob); ctx.closePath();
        ctx.fill();

        // Tiny gold shirt button below collar
        ctx.fillStyle = '#c49e35';
        ctx.fillRect(23.5, 23.2 + bob, 1.2, 1.2);

        // 8. Ghibli Face, Ears & Cheerful Open Smile
        // Back hair base
        ctx.fillStyle = '#241814';
        ctx.beginPath(); ctx.arc(24, 11.5 + bob, 10, 0, Math.PI * 2); ctx.fill();

        // Ears
        ctx.fillStyle = '#e0b292';
        ctx.beginPath();
        ctx.arc(15.2, 14 + bob, 2.2, 0, Math.PI * 2);
        ctx.arc(32.8, 14 + bob, 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Face contour (warm peach skin)
        ctx.fillStyle = '#f4cbb0';
        ctx.beginPath();
        ctx.arc(24, 13.2 + bob, 8.2, 0, Math.PI * 2);
        ctx.fill();

        // Arched Eyebrows
        ctx.fillStyle = '#3b241c';
        ctx.fillRect(19, 10 + bob, 3, 1);
        ctx.fillRect(26, 10 + bob, 3, 1);

        // Expressive Dark Brown Eyes with White Catchlights
        ctx.fillStyle = '#211512';
        ctx.beginPath();
        ctx.ellipse(20.5, 12.6 + bob, 1.4, 1.8, 0, 0, Math.PI * 2);
        ctx.ellipse(27.5, 12.6 + bob, 1.4, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(20, 11.5 + bob, 1, 1);
        ctx.fillRect(27, 11.5 + bob, 1, 1);

        // Subtle Nose & Warm Cheek Blush
        ctx.fillStyle = '#d49b7e';
        ctx.fillRect(23.6, 13.5 + bob, 1, 1.2);
        ctx.fillStyle = 'rgba(235, 125, 115, 0.45)';
        ctx.beginPath();
        ctx.arc(18.5, 14.8 + bob, 1.8, 0, Math.PI * 2);
        ctx.arc(29.5, 14.8 + bob, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Happy Open Smile (Matching the cheerful expression in the screenshot)
        ctx.fillStyle = '#9e3b3b';
        ctx.beginPath();
        ctx.arc(24, 15.6 + bob, 2.8, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#e87a82'; // Tongue highlight
        ctx.beginPath();
        ctx.arc(24, 16.4 + bob, 1.7, 0, Math.PI);
        ctx.fill();

        // 9. Tousled Short Dark-Brown Bob Hair, Parted Bangs & Top Cowlick Spikes
        ctx.fillStyle = '#261915';
        ctx.beginPath();
        // Left Fluffy Side-Bob
        ctx.moveTo(14, 14 + bob);
        ctx.quadraticCurveTo(12, 8 + bob, 17, 4.5 + bob);
        // Top Spiky Cowlick Tufts (just like the reference)
        ctx.lineTo(15.5, 3 + bob);
        ctx.lineTo(20, 3.2 + bob);
        ctx.lineTo(22.5, 1 + bob); // Center-left peak spike
        ctx.lineTo(25.5, 2.8 + bob);
        ctx.lineTo(31, 2.2 + bob); // Right peak tuft
        ctx.lineTo(30, 4.5 + bob);
        // Right Fluffy Side-Bob
        ctx.quadraticCurveTo(36, 8 + bob, 34, 14 + bob);
        ctx.lineTo(31.5, 12 + bob);
        // Jagged Parted Bangs across Forehead
        ctx.lineTo(30, 8.8 + bob);
        ctx.lineTo(28, 11 + bob);
        ctx.lineTo(26.5, 8.2 + bob);
        ctx.lineTo(24.2, 10.8 + bob);
        ctx.lineTo(22.5, 8 + bob);
        ctx.lineTo(20, 10.8 + bob);
        ctx.lineTo(18, 8.8 + bob);
        ctx.lineTo(16.5, 12 + bob);
        ctx.closePath();
        ctx.fill();

        // Warm Espresso Hair Sheen Highlights
        ctx.fillStyle = '#422c25';
        ctx.beginPath();
        ctx.ellipse(20, 6.2 + bob, 3.5, 1.3, -0.25, 0, Math.PI * 2);
        ctx.ellipse(28, 6.2 + bob, 3.5, 1.3, 0.25, 0, Math.PI * 2);
        ctx.fill();
      });

      /**
       * @asset-spec
       * @id totoro
       * @external-png assets/sprites/characters/totoro.png
       * @fallback-procedural totoro-0 (68x76)
       * @grid-footprint 2x1 tiles (58x26px base shadow collision)
       * @visual-size 64x76px (or 32x38px native upscaled 2x)
       * @origin 0.5, 0.88
       * @frames 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
       */
      makeTex(`totoro-${step}`, 68, 76, ctx => {
        const bob = step === 1 ? -2 : 0;
        const lFootOff = step === 1 ? -1.8 : 0;
        const rFootOff = step === 1 ? 1.8 : 0;
        const cx = 34;

        // 1. Soft Ground Shadow & Fluffy Tail Base Peeking Below
        ctx.fillStyle = 'rgba(12, 8, 20, 0.28)';
        ctx.beginPath(); ctx.ellipse(cx, 70, 22, 5.5, 0, 0, Math.PI * 2); ctx.fill();

        // Rounded Tail (peeking beneath body like the reference art)
        ctx.fillStyle = '#56635e';
        ctx.beginPath(); ctx.ellipse(cx, 66.5 + bob * 0.5, 6.5, 5.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6c7a75';
        ctx.beginPath(); ctx.ellipse(cx - 1, 65.5 + bob * 0.5, 4.5, 4, 0, 0, Math.PI * 2); ctx.fill();

        // 2. Long Pointed Bunny-Like Ears (with narrow base & cheek fur tufts)
        const drawEar = (ex, angle) => {
          ctx.save();
          ctx.translate(ex, 20 + bob);
          ctx.rotate(angle);
          // Outer dark slate border
          ctx.fillStyle = '#4c5854';
          ctx.beginPath(); ctx.ellipse(0, -6, 4.4, 9.5, 0, 0, Math.PI * 2); ctx.fill();
          // Inner sage-grey ear shading
          ctx.fillStyle = '#73827c';
          ctx.beginPath(); ctx.ellipse(-0.4, -6.2, 3.2, 7.8, 0, 0, Math.PI * 2); ctx.fill();
          // Narrow ear-stem connector
          ctx.fillStyle = '#5e6b66';
          ctx.fillRect(-2.2, 1, 4.4, 4);
          ctx.restore();
        };
        drawEar(cx - 10.5, -0.12);
        drawEar(cx + 10.5, 0.12);

        // Ear-base fluffy fur tufts (seen on both sides below ears in the photo)
        ctx.fillStyle = '#5e6b66';
        ctx.beginPath();
        ctx.moveTo(cx - 13, 21 + bob); ctx.lineTo(cx - 17, 20 + bob); ctx.lineTo(cx - 14, 23 + bob);
        ctx.moveTo(cx + 13, 21 + bob); ctx.lineTo(cx + 17, 20 + bob); ctx.lineTo(cx + 14, 23 + bob);
        ctx.fill();

        // 3. Tiny White Chibi-Totoro Perched on Head + Miniature Fishing Rod & Pink Flower!
        // Chibi-Totoro body & ears sitting between big Totoro's ears
        ctx.fillStyle = '#dcdad0'; // Subtle shadow outline
        ctx.beginPath(); ctx.ellipse(cx + 2, 16.5 + bob, 4.4, 4.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(cx + 2, 16.5 + bob, 3.8, 4.2, 0, 0, Math.PI * 2); // Body
        ctx.ellipse(cx + 0.3, 11.5 + bob, 1.1, 2.6, -0.1, 0, Math.PI * 2); // Left ear
        ctx.ellipse(cx + 3.7, 11.5 + bob, 1.1, 2.6, 0.1, 0, Math.PI * 2);  // Right ear
        ctx.fill();
        // Chibi-Totoro tiny eyes
        ctx.fillStyle = '#222222';
        ctx.fillRect(cx + 0.5, 14.5 + bob, 1, 1);
        ctx.fillRect(cx + 2.8, 14.5 + bob, 1, 1);

        // Miniature Fishing Rod & Line dangling a Pink Blossom onto Totoro's forehead
        ctx.strokeStyle = '#3b4247';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(cx + 2.5, 16 + bob);
        ctx.quadraticCurveTo(cx + 4, 7 + bob, cx + 6.5, 3 + bob); // Curved rod tip
        ctx.stroke();

        ctx.strokeStyle = 'rgba(235, 240, 245, 0.75)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx + 6.5, 3 + bob);
        ctx.lineTo(cx + 5.5, 23.5 + bob); // Fishing line down to forehead
        ctx.stroke();

        // Dangling Pink Flower & Green Stem on Totoro's forehead (Exact match to picture)
        ctx.strokeStyle = '#7cb56b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx + 7, 23.2 + bob); ctx.lineTo(cx + 1.5, 24.2 + bob);
        ctx.stroke();
        ctx.fillStyle = '#f28482'; // Pink blossom petals
        ctx.beginPath(); ctx.arc(cx + 1.5, 24 + bob, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffe599'; // Yellow flower center
        ctx.fillRect(cx + 1, 23.5 + bob, 1.2, 1.2);

        // 4. Giant Pear-Shaped Slate-Sage Body & Heavy Side Arms
        // Outer Shadow Silhouette
        ctx.fillStyle = '#4e5b56';
        ctx.beginPath();
        ctx.ellipse(cx, 46 + bob, 23.5, 21.5, 0, 0, Math.PI * 2); // Wide lower torso
        ctx.ellipse(cx, 31 + bob, 18.5, 14.5, 0, 0, Math.PI * 2); // Upper head/shoulders
        ctx.fill();

        // Side Arms Resting Along Body with 3 Claws
        ctx.fillStyle = '#56645f';
        ctx.beginPath();
        ctx.ellipse(cx - 21.5, 45 + bob, 4.5, 12.5, 0.16, 0, Math.PI * 2);
        ctx.ellipse(cx + 21.5, 45 + bob, 4.5, 12.5, -0.16, 0, Math.PI * 2);
        ctx.fill();
        // Arm Claws
        ctx.fillStyle = '#cbd2c9';
        [-24, -22, -20].forEach(ox => ctx.fillRect(cx + ox, 55.5 + bob, 1.1, 2.5));
        [19, 21, 23].forEach(ox => ctx.fillRect(cx + ox, 55.5 + bob, 1.1, 2.5));

        // Main Slate-Sage Fur Midtone (Authentic Ghibli green-grey)
        ctx.fillStyle = '#6c7a74';
        ctx.beginPath();
        ctx.ellipse(cx, 45.5 + bob, 22, 20.5, 0, 0, Math.PI * 2);
        ctx.ellipse(cx, 30.5 + bob, 17.5, 13.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Soft Top-Head & Shoulder Fur Highlight
        ctx.fillStyle = '#7d8c86';
        ctx.beginPath();
        ctx.ellipse(cx - 2, 25 + bob, 12, 6.5, -0.1, 0, Math.PI * 2);
        ctx.fill();

        // 5. Huge Round Cream-Beige Belly
        // Soft fur border shadow around belly
        ctx.fillStyle = '#d8d4be';
        ctx.beginPath();
        ctx.ellipse(cx, 48.5 + bob, 17.5, 16.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Warm Cream Belly Center
        ctx.fillStyle = '#ede9d0';
        ctx.beginPath();
        ctx.ellipse(cx, 48 + bob, 16.6, 15.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // 6. Iconic Two Rows of Slate Boomerang Chevron Markings (3 top, 4 bottom)
        const drawChevron = (mx, my, w, h) => {
          ctx.fillStyle = '#687670';
          ctx.beginPath();
          ctx.moveTo(mx, my - h);
          ctx.quadraticCurveTo(mx + w, my - h * 0.2, mx + w, my + h);
          ctx.quadraticCurveTo(mx, my + h * 0.15, mx - w, my + h);
          ctx.quadraticCurveTo(mx - w, my - h * 0.2, mx, my - h);
          ctx.closePath();
          ctx.fill();
        };
        // Top Row (3 Chevrons)
        drawChevron(cx - 8.5, 38.5 + bob, 3.6, 2.1);
        drawChevron(cx,       37.2 + bob, 3.8, 2.2);
        drawChevron(cx + 8.5, 38.5 + bob, 3.6, 2.1);
        // Second Row (4 Chevrons)
        drawChevron(cx - 11.5, 43.2 + bob, 3.3, 1.9);
        drawChevron(cx - 4.0,  42.0 + bob, 3.5, 2.0);
        drawChevron(cx + 4.0,  42.0 + bob, 3.5, 2.0);
        drawChevron(cx + 11.5, 43.2 + bob, 3.3, 1.9);

        // 7. Wide White Ghibli Eyes, Dark Nose & Tiny Mouth Line
        // Left & Right Sclera
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx - 9.5, 27.5 + bob, 3.3, 0, Math.PI * 2);
        ctx.arc(cx + 9.5, 27.5 + bob, 3.3, 0, Math.PI * 2);
        ctx.fill();

        // Dark Pupils + Tiny Specular Catchlight
        ctx.fillStyle = '#1c1f1e';
        ctx.beginPath();
        ctx.arc(cx - 9.3, 27.5 + bob, 1.5, 0, Math.PI * 2);
        ctx.arc(cx + 9.3, 27.5 + bob, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 10, 26.5 + bob, 1, 1);
        ctx.fillRect(cx + 8.6, 26.5 + bob, 1, 1);

        // Flat Oval Dark Nose & Bridge Wrinkle
        ctx.fillStyle = '#53615c';
        ctx.fillRect(cx - 2.5, 25.8 + bob, 5, 0.9); // Nose bridge crease
        ctx.fillStyle = '#252b29';
        ctx.beginPath();
        ctx.ellipse(cx, 27.6 + bob, 2.6, 1.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tiny Calm Mouth Stitch (Just like the poster)
        ctx.fillStyle = '#3b4542';
        ctx.fillRect(cx - 1.2, 31.8 + bob, 2.4, 1);

        // 8. Three Long Whiskers on Each Cheek
        ctx.strokeStyle = '#2b302e';
        ctx.lineWidth = 1.15;
        ctx.lineCap = 'round';
        ctx.beginPath();
        // Left 3 Whiskers
        ctx.moveTo(cx - 14, 28.5 + bob); ctx.lineTo(cx - 26, 26.5 + bob);
        ctx.moveTo(cx - 14.5, 30.2 + bob); ctx.lineTo(cx - 27, 30.0 + bob);
        ctx.moveTo(cx - 14, 31.8 + bob); ctx.lineTo(cx - 25.5, 33.2 + bob);
        // Right 3 Whiskers
        ctx.moveTo(cx + 14, 28.5 + bob); ctx.lineTo(cx + 26, 26.5 + bob);
        ctx.moveTo(cx + 14.5, 30.2 + bob); ctx.lineTo(cx + 27, 30.0 + bob);
        ctx.moveTo(cx + 14, 31.8 + bob); ctx.lineTo(cx + 25.5, 33.2 + bob);
        ctx.stroke();

        // 9. Sturdy Slate Paws, Blue-Grey Sole Pads & 3 Claws per Foot
        const drawFoot = (fx, fy) => {
          // Foot mound
          ctx.fillStyle = '#4e5b56';
          ctx.beginPath(); ctx.ellipse(fx, fy, 6.2, 5.2, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#6c7a74';
          ctx.beginPath(); ctx.ellipse(fx, fy - 0.5, 5.4, 4.4, 0, 0, Math.PI * 2); ctx.fill();
          // Blue-grey bottom pad (visible in the sitting/stepping pose)
          ctx.fillStyle = '#738299';
          ctx.beginPath(); ctx.ellipse(fx, fy + 2.2, 2.6, 1.4, 0, 0, Math.PI * 2); ctx.fill();
          // 3 Pointed Claws
          ctx.fillStyle = '#d8ded6';
          [-2.8, 0, 2.8].forEach(coff => {
            ctx.beginPath();
            ctx.moveTo(fx + coff - 0.9, fy - 1);
            ctx.lineTo(fx + coff + 0.9, fy - 1);
            ctx.lineTo(fx + coff, fy - 4.2);
            ctx.closePath();
            ctx.fill();
          });
        };
        drawFoot(cx - 9.5, 61.5 + bob + lFootOff);
        drawFoot(cx + 9.5, 61.5 + bob + rFootOff);
      });
    });

    // --- NPCs & Rivals ---
    // --- Detailed Dhaka Campus Fashionistas: Ahona & Apshora (Animated High-End RPG Sprites) ---
    const makeFashionista = (baseKey, cfg) => {
      [0, 1].forEach(step => {
        makeTex(`${baseKey}-${step}`, 38, 62, ctx => {
          const bob = step === 1 ? -1.5 : 0;
          const lLeg = step === 1 ? -2 : 0;
          const rLeg = step === 1 ? 2 : 0;
          const flutter = step === 1 ? 1.8 : 0;
          const cx = 19;

          // 1. Soft Ambient Ground Shadow
          ctx.fillStyle = 'rgba(12, 8, 20, 0.28)';
          ctx.beginPath();
          ctx.ellipse(cx, 59.5, 12.5, 3.8, 0, 0, Math.PI * 2);
          ctx.fill();

          // 2. Flowing Back Hair Layer
          ctx.fillStyle = cfg.hairDark;
          ctx.beginPath();
          ctx.ellipse(cx, 16.5 + bob, 10, 11, 0, 0, Math.PI * 2);
          if (cfg.hairStyle === 'wavy') {
            // Ahona: cascading voluminous layered curls past shoulders
            ctx.ellipse(cx - 7.5, 23 + bob, 4.5, 8.5, 0.22, 0, Math.PI * 2);
            ctx.ellipse(cx + 7.5, 23 + bob, 4.5, 8.5, -0.22, 0, Math.PI * 2);
          } else {
            // Apshora: sleek side-swept high ponytail with ribbon tie
            ctx.ellipse(cx + 8, 24 + bob, 4.2, 9.5, -0.28, 0, Math.PI * 2);
            ctx.fillStyle = '#fde047'; // Gold hair ribbon
            ctx.fillRect(cx + 5, 17 + bob, 3, 2);
            ctx.fillStyle = cfg.hairDark;
          }
          ctx.fill();

          // 3. Lower Body: Churidar / Trousers & Heeled Strappy Footwear
          ctx.fillStyle = cfg.pantsCol;
          ctx.fillRect(cx - 5.8, 41 + lLeg, 4.8, 12);
          ctx.fillRect(cx + 1, 41 + rLeg, 4.8, 12);
          // Gold gota embroidery on ankle cuffs
          ctx.fillStyle = '#facc15';
          ctx.fillRect(cx - 5.8, 51 + lLeg, 4.8, 1.5);
          ctx.fillRect(cx + 1, 51 + rLeg, 4.8, 1.5);

          // Strappy Sandals & Ankles
          ctx.fillStyle = cfg.skinTone || '#fae1d4';
          ctx.fillRect(cx - 5.2, 53 + lLeg, 3.8, 4);
          ctx.fillRect(cx + 1.4, 53 + rLeg, 3.8, 4);
          // Heeled Sandal Straps & Soles
          ctx.fillStyle = cfg.heelCol || '#78350f';
          ctx.fillRect(cx - 5.8, 56.5 + lLeg, 4.8, 2);
          ctx.fillRect(cx + 0.8, 56.5 + rLeg, 4.8, 2);
          ctx.fillStyle = '#fde047'; // gold buckle/strap
          ctx.fillRect(cx - 5.5, 54.5 + lLeg, 4.2, 1);
          ctx.fillRect(cx + 1.2, 54.5 + rLeg, 4.2, 1);

          // 4. Tailored Designer Kurti / Kameez
          // Outer fabric shadow
          ctx.fillStyle = cfg.dressShadow;
          ctx.beginPath();
          ctx.roundRect(cx - 8.5, 22 + bob, 17, 22, 2);
          ctx.fill();

          // Main Silk / Jamdani Kurti Fabric
          ctx.fillStyle = cfg.dressMain;
          ctx.beginPath();
          ctx.roundRect(cx - 7.5, 22.5 + bob, 15, 20.5, 2);
          ctx.fill();

          // Sunlit Luster Highlight
          ctx.fillStyle = cfg.dressLight;
          ctx.fillRect(cx - 6.5, 23.5 + bob, 6, 17);

          // Intricate Gold Jamdani / Zari Floral Bootis & Borders
          ctx.fillStyle = '#facc15';
          ctx.fillRect(cx - 7.5, 41 + bob, 15, 2); // Embroidered hem border
          ctx.fillRect(cx - 2, 23 + bob, 4, 12); // Neckline placket
          ctx.fillRect(cx - 4.5, 23 + bob, 9, 1.5); // Collar trim
          // Floral bootis dots
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(cx - 5, 28 + bob, 1.5, 1.5);
          ctx.fillRect(cx + 3.5, 28 + bob, 1.5, 1.5);
          ctx.fillRect(cx - 5, 34 + bob, 1.5, 1.5);
          ctx.fillRect(cx + 3.5, 34 + bob, 1.5, 1.5);

          // 5. Flowing Chiffon / Organza Dupatta
          ctx.fillStyle = cfg.dupattaCol;
          ctx.beginPath();
          ctx.moveTo(cx - 8, 21 + bob);
          ctx.quadraticCurveTo(cx - 2, 28 + bob, cx + 7.5, 35 + bob);
          ctx.lineTo(cx + 6, 38 + bob);
          ctx.quadraticCurveTo(cx - 4, 31 + bob, cx - 8.5, 24 + bob);
          ctx.closePath();
          ctx.fill();
          // Trailing pleated dupatta tail fluttering at side
          ctx.fillStyle = cfg.dupattaCol;
          ctx.fillRect(cx - 10, 24 + bob, 3.5, 17 + flutter);
          ctx.fillStyle = '#facc15'; // Gold border on dupatta
          ctx.fillRect(cx - 10, 39.5 + bob + flutter, 3.5, 1.5);

          // 6. Arms & Stance: Forearms, Gold Bangles & Luxury Designer Bag
          ctx.fillStyle = cfg.dressMain;
          ctx.fillRect(cx - 10, 23 + bob, 3, 9);
          ctx.fillRect(cx + 7, 23 + bob, 3, 9);
          ctx.fillStyle = cfg.skinTone || '#fae1d4';
          ctx.fillRect(cx - 10, 32 + bob, 3, 5);
          ctx.fillRect(cx + 7, 32 + bob, 3, 5);
          // Gold Bangles on wrists
          ctx.fillStyle = '#facc15';
          ctx.fillRect(cx - 10, 31.5 + bob, 3, 1.2);
          ctx.fillRect(cx + 7, 31.5 + bob, 3, 1.2);

          // Luxury Designer Handbag (Ahona: Quilted Tote; Apshora: Structured Haute Tote)
          ctx.strokeStyle = '#facc15'; // Gold chain straps
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(cx + 8.5, 33 + bob); ctx.lineTo(cx + 7.5, 38 + bob);
          ctx.moveTo(cx + 10, 33 + bob); ctx.lineTo(cx + 11.5, 38 + bob);
          ctx.stroke();

          ctx.fillStyle = '#1c1917'; // Bag shadow
          ctx.fillRect(cx + 6, 38 + bob, 7, 7.5);
          ctx.fillStyle = cfg.bagCol;
          ctx.fillRect(cx + 5.5, 37.5 + bob, 6.5, 7);
          ctx.fillStyle = '#ffffff'; // Bag leather highlight
          ctx.fillRect(cx + 6, 38 + bob, 5.5, 2);
          ctx.fillStyle = '#facc15'; // Gold emblem / lock clasp
          ctx.fillRect(cx + 8, 39.5 + bob, 1.6, 1.6);

          // 7. Neck, Face & Golden Statement Jhumkas
          ctx.fillStyle = cfg.skinShade || '#f3cebd';
          ctx.fillRect(cx - 2, 17 + bob, 4, 4.5);
          // Face
          ctx.fillStyle = cfg.skinTone || '#fae1d4';
          ctx.beginPath();
          ctx.arc(cx, 14 + bob, 6.5, 0, Math.PI * 2);
          ctx.fill();

          // Golden Statement Earrings / Jhumkas
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(cx - 7, 15.5 + bob, 1.6, 0, Math.PI * 2);
          ctx.arc(cx + 7, 15.5 + bob, 1.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = cfg.earringGem || '#10b981'; // Gemstone drop
          ctx.fillRect(cx - 7.6, 17 + bob, 1.8, 2);
          ctx.fillRect(cx + 6.2, 17 + bob, 1.8, 2);

          // Cheek Blush & Bold Lipstick
          ctx.fillStyle = cfg.blushCol || 'rgba(244, 63, 94, 0.35)';
          ctx.beginPath();
          ctx.arc(cx - 3.8, 15.5 + bob, 1.6, 0, Math.PI * 2);
          ctx.arc(cx + 3.8, 15.5 + bob, 1.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = cfg.lipCol;
          ctx.fillRect(cx - 1.8, 17.2 + bob, 3.6, 1.4);

          // Cat-Eye Kohl Liner & Shimmering Catchlights
          ctx.fillStyle = '#18181b';
          ctx.fillRect(cx - 4.5, 12.8 + bob, 2.8, 2);
          ctx.fillRect(cx + 1.7, 12.8 + bob, 2.8, 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cx - 3.8, 13 + bob, 1, 1);
          ctx.fillRect(cx + 2.4, 13 + bob, 1, 1);

          // Sassy / High-Fashion Eyebrows
          ctx.strokeStyle = '#27272a';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(cx - 5.5, 11.5 + bob); ctx.lineTo(cx - 1.5, 11.8 + bob);
          ctx.moveTo(cx + 5.5, 11.5 + bob); ctx.lineTo(cx + 1.5, 11.8 + bob);
          ctx.stroke();

          // 8. Front Bangs & Perched Designer Sunglasses on Crown
          ctx.fillStyle = cfg.hairDark;
          ctx.beginPath();
          ctx.arc(cx, 10.5 + bob, 7, Math.PI, 0);
          ctx.fill();
          ctx.fillRect(cx - 7, 10.5 + bob, 2.2, 3);
          ctx.fillRect(cx + 4.8, 10.5 + bob, 2.2, 3);

          // Glossy Hair Highlight
          ctx.fillStyle = cfg.hairLight;
          ctx.beginPath();
          ctx.ellipse(cx - 3, 8.5 + bob, 3, 1, -0.2, 0, Math.PI * 2);
          ctx.ellipse(cx + 3, 8.5 + bob, 3, 1, 0.2, 0, Math.PI * 2);
          ctx.fill();

          // Designer Sunglasses Crown
          ctx.fillStyle = '#18181b';
          ctx.fillRect(cx - 6, 7.5 + bob, 5, 2.6);
          ctx.fillRect(cx + 1, 7.5 + bob, 5, 2.6);
          ctx.fillStyle = '#facc15'; // Gold nose bridge
          ctx.fillRect(cx - 1, 8.2 + bob, 2, 1);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'; // Glass reflection
          ctx.fillRect(cx - 5, 8 + bob, 1.8, 0.9);
          ctx.fillRect(cx + 2, 8 + bob, 1.8, 0.9);
        });
      });

      // Alias static texture to frame 0
      makeTex(baseKey, 38, 62, (ctx, w, h) => {
        const img = scene.textures.get(`${baseKey}-0`).getSourceImage();
        ctx.drawImage(img, 0, 0);
      });
    };

    /**
     * @asset-spec
     * @id npc-ahona
     * @external-png assets/sprites/characters/npc_ahona.png
     * @fallback-procedural npc-ahona (38x62)
     * @grid-footprint 1x1 tile (20x14px foot collision base)
     * @visual-size 32x48px (or 16x32px native upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
     */
    makeFashionista('npc-ahona', {
      dressShadow: '#831843',
      dressMain:   '#be185d', // Vibrant Crimson-Magenta Jamdani Kurti
      dressLight:  '#f472b6',
      dupattaCol:  'rgba(251, 207, 232, 0.92)', // Blush Pink Chiffon Dupatta
      pantsCol:    '#fef3c7', // Cream Silk Palazzo
      hairDark:    '#1c1917',
      hairLight:   '#451a03',
      hairStyle:   'wavy',
      bagCol:      '#fffbeb', // Ivory Quilted Luxury Bag
      lipCol:      '#e11d48', // Bold Crimson Lips
      skinTone:    '#fff0e6',
      skinShade:   '#fae1d4',
      earringGem:  '#10b981', // Emerald jhumka drop
      heelCol:     '#9f1239'
    });

    /**
     * @asset-spec
     * @id npc-apshora
     * @external-png assets/sprites/characters/npc_apshora.png
     * @fallback-procedural npc-apshora (38x62)
     * @grid-footprint 1x1 tile (20x14px foot collision base)
     * @visual-size 32x48px (or 16x32px native upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
     */
    makeFashionista('npc-apshora', {
      dressShadow: '#3b0764',
      dressMain:   '#6b21a8', // Royal Violet Silk Kameez
      dressLight:  '#9333ea',
      dupattaCol:  'rgba(244, 114, 182, 0.9)', // Rose-Gold Chiffon Dupatta
      pantsCol:    '#ede9fe', // Soft Lavender Tailored Trousers
      hairDark:    '#09090b',
      hairLight:   '#27272a',
      hairStyle:   'sleek',
      bagCol:      '#f472b6', // Metallic Rose-Gold Designer Bag
      lipCol:      '#c026d3', // Matte Plum-Rose Lips
      skinTone:    '#fff3eb',
      skinShade:   '#fae3d7',
      earringGem:  '#facc15', // Gold geometric drop
      heelCol:     '#581c87'
    });

   // --- Contextual Vendors, Rakin, Wandering Citizens & Mimi the Cat ---
    // --- Contextual Vendors, Rakin, Wandering Citizens & Mimi the Cat ---
    const makeWalkerNPC = (baseKey, shirtCol, hairCol, accCol, role = '') => {
      [0, 1, 2, 3].forEach(step => {
        makeTex(`${baseKey}-${step}`, 52, 58, ctx => {
          // 4-frame walk cycle kinematics
          const bob = (step === 1 || step === 3) ? -1.8 : 0;
          const lLeg = step === 0 ? 2.5 : (step === 2 ? -2.2 : 0);
          const rLeg = step === 2 ? 2.5 : (step === 0 ? -2.2 : 0);
          const lFoot = step === 0 ? 2.0 : (step === 2 ? -1.2 : 0);
          const rFoot = step === 2 ? 2.0 : (step === 0 ? -1.2 : 0);
          const armSwing = step === 0 ? 2.4 : (step === 2 ? -2.4 : 0);
          const flutter = step === 1 ? 1.5 : (step === 3 ? -1.5 : (step === 0 ? -0.8 : 0.8));
          const cx = 26;

          // 1. Double-Layer Contact Ground Shadow (dynamically breathes with stride)
          ctx.fillStyle = 'rgba(12, 8, 20, 0.12)';
          ctx.beginPath();
          ctx.ellipse(cx, 53, (step % 2 === 0) ? 13 : 11.5, (step % 2 === 0) ? 4.2 : 3.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(12, 8, 20, 0.28)';
          ctx.beginPath();
          ctx.ellipse(cx, 53, (step % 2 === 0) ? 8.5 : 7.2, (step % 2 === 0) ? 2.5 : 2.1, 0, 0, Math.PI * 2);
          ctx.fill();

          // 2. Contextual Back Hair Layer (for female NPCs & fantasy guides)
          const isFemale = ['phulwali', 'sketcher', 'jogger', 'marina', 'lyra'].includes(role);
          if (isFemale) {
            ctx.fillStyle = hairCol;
            ctx.beginPath();
            ctx.ellipse(cx, 16.5 + bob, 10.5, 11, 0, 0, Math.PI * 2);
            if (role === 'jogger') {
              // High athletic ponytail swinging dynamically
              ctx.ellipse(cx + 9.5 + armSwing * 0.7, 12.5 + bob * 1.3, 3.8, 7.5, 0.35 + flutter * 0.15, 0, Math.PI * 2);
            } else if (role === 'phulwali') {
              // Long dark braid draped forward
              ctx.ellipse(cx - 7.5, 23 + bob, 4.2, 8.5, 0.2, 0, Math.PI * 2);
            } else if (role === 'sketcher') {
              // Bohemian wavy artistic locks
              ctx.ellipse(cx - 8, 22 + bob, 4.2, 7.5, 0.2, 0, Math.PI * 2);
              ctx.ellipse(cx + 8, 22 + bob, 4.2, 7.5, -0.2, 0, Math.PI * 2);
            } else if (role === 'marina') {
              // Flowing seafoam-aquamarine tresses
              ctx.ellipse(cx - 9, 23 + bob, 4.8, 9.5, 0.22, 0, Math.PI * 2);
              ctx.ellipse(cx + 9, 23 + bob, 4.8, 9.5, -0.22, 0, Math.PI * 2);
            } else if (role === 'lyra') {
              // Cascading starlight silver-blue locks
              ctx.ellipse(cx - 9, 23 + bob, 4.5, 9, 0.18, 0, Math.PI * 2);
              ctx.ellipse(cx + 9, 23 + bob, 4.5, 9, -0.18, 0, Math.PI * 2);
            }
            ctx.fill();

            // Hair accessories in back hair
            if (role === 'jogger') {
              ctx.fillStyle = '#f43f5e'; // Neon pink scrunchie
              ctx.fillRect(cx + 7.5, 10.5 + bob, 2.5, 2.5);
            } else if (role === 'phulwali') {
              ctx.fillStyle = '#ffffff'; // White Beli flower blossom
              ctx.beginPath(); ctx.arc(cx - 8, 17 + bob, 2.2, 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = '#fef08a'; ctx.fillRect(cx - 8.5, 16.5 + bob, 1, 1);
            } else if (role === 'sketcher') {
              ctx.strokeStyle = '#d97706'; ctx.lineWidth = 1.4; // Carved wooden hairpin
              ctx.beginPath(); ctx.moveTo(cx + 4, 10 + bob); ctx.lineTo(cx + 12, 16 + bob); ctx.stroke();
            }
          }

          // 3. Lower Body, Legs, Attire & Footwear
          if (role === 'tea' || role === 'doi') {
            // Checkered Traditional Dhaka Lungi
            const lungiBase = role === 'tea' ? '#1e3a8a' : '#78350f';
            ctx.fillStyle = lungiBase;
            ctx.fillRect(cx - 8, 38 + bob, 16, 12);
            // Detailed checkered grid stripes
            ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
            for (let ly = 41; ly <= 48; ly += 3) ctx.fillRect(cx - 8, ly + bob, 16, 1);
            for (let lx = -5; lx <= 5; lx += 4) ctx.fillRect(cx + lx, 38 + bob, 1.2, 12);
            // Waist knot fold
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.fillRect(cx - 3.5, 37.5 + bob, 7, 2.2);

            // Feet peeking below lungi with leather toe-thong sandals
            ctx.fillStyle = '#dfaa78';
            ctx.fillRect(cx - 5.5, 50 + lFoot, 4, 3);
            ctx.fillRect(cx + 1.5, 50 + rFoot, 4, 3);
            ctx.fillStyle = '#451a03'; // Sandal soles & straps
            ctx.fillRect(cx - 6, 52 + lFoot, 5, 1.6);
            ctx.fillRect(cx + 1, 52 + rFoot, 5, 1.6);
            ctx.fillRect(cx - 4, 50.5 + lFoot, 1.2, 1.8);
            ctx.fillRect(cx + 3, 50.5 + rFoot, 1.2, 1.8);
          } else if (role === 'phulwali') {
            // Festive Magenta & Yellow Bengali Saree
            ctx.fillStyle = '#be185d'; // Deep magenta saree drape
            ctx.fillRect(cx - 8, 38 + bob, 16, 12);
            ctx.fillStyle = '#eab308'; // Sunflower-yellow pleats
            ctx.fillRect(cx - 2.5, 38 + bob, 5, 12);
            ctx.fillStyle = '#fde047'; // Gold zari hem border
            ctx.fillRect(cx - 8, 48.5 + bob, 16, 1.8);

            // Feet & gold heeled sandals
            ctx.fillStyle = '#f3c5a5';
            ctx.fillRect(cx - 4.8, 50 + lFoot, 3.8, 2.8);
            ctx.fillRect(cx + 1.2, 50 + rFoot, 3.8, 2.8);
            ctx.fillStyle = '#dc2626'; // Red glass ankle bangles
            ctx.fillRect(cx - 5.2, 49.5 + lFoot, 4.4, 1);
            ctx.fillRect(cx + 0.8, 49.5 + rFoot, 4.4, 1);
            ctx.fillStyle = '#d97706'; // Gold sandal straps
            ctx.fillRect(cx - 5.2, 52 + lFoot, 4.4, 1.4);
            ctx.fillRect(cx + 0.8, 52 + rFoot, 4.4, 1.4);
          } else if (role === 'jogger') {
            // Charcoal Running Leggings with Lavender Side Stripes
            ctx.fillStyle = '#18181b';
            ctx.fillRect(cx - 6.5, 39 + lLeg, 5, 10);
            ctx.fillRect(cx + 1.5, 39 + rLeg, 5, 10);
            ctx.fillStyle = '#c084fc'; // Lavender speed stripes
            ctx.fillRect(cx - 6.5, 39 + lLeg, 1.2, 10);
            ctx.fillRect(cx + 5.3, 39 + rLeg, 1.2, 10);

            // High-Performance Cushioned Running Shoes
            ctx.fillStyle = '#ffffff'; // White foam midsole
            ctx.fillRect(cx - 6.8, 49 + lFoot, 5.8, 3.5);
            ctx.fillRect(cx + 1.2, 49 + rFoot, 5.8, 3.5);
            ctx.fillStyle = '#fb7185'; // Neon pink outer sole
            ctx.fillRect(cx - 6.8, 52 + lFoot, 5.8, 1.2);
            ctx.fillRect(cx + 1.2, 52 + rFoot, 5.8, 1.2);
            ctx.fillStyle = '#06b6d4'; // Electric cyan mesh accents
            ctx.fillRect(cx - 6, 49.5 + lFoot, 4.2, 1.8);
            ctx.fillRect(cx + 2, 49.5 + rFoot, 4.2, 1.8);
          } else if (role === 'physics') {
            // Tailored Khaki Chinos & Collegiate Canvas Sneakers
            ctx.fillStyle = '#bfa07a';
            ctx.fillRect(cx - 6.5, 39 + lLeg, 5.2, 10);
            ctx.fillRect(cx + 1.5, 39 + rLeg, 5.2, 10);
            ctx.fillStyle = '#9c7c58'; // Inseam shadow
            ctx.fillRect(cx - 2, 39 + Math.min(lLeg, rLeg), 4, 3);
            ctx.fillStyle = '#d4b896'; // Ankle cuff roll
            ctx.fillRect(cx - 6.5, 48 + lLeg, 5.2, 1.5);
            ctx.fillRect(cx + 1.5, 48 + rLeg, 5.2, 1.5);

            // Navy Canvas Sneakers with White Rubber Foxing
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(cx - 6.5, 49.5 + lFoot, 5.4, 2.5);
            ctx.fillRect(cx + 1.5, 49.5 + rFoot, 5.4, 2.5);
            ctx.fillStyle = '#f8fafc'; // White rubber soles
            ctx.fillRect(cx - 6.8, 51.5 + lFoot, 6, 1.6);
            ctx.fillRect(cx + 1.2, 51.5 + rFoot, 6, 1.6);
          } else if (role === 'sketcher') {
            // Bohemian Wide-Leg Indigo Culottes & Kolhapuri Sandals
            ctx.fillStyle = '#2e4057';
            ctx.fillRect(cx - 7, 39 + lLeg, 5.8, 10.5);
            ctx.fillRect(cx + 1.2, 39 + rLeg, 5.8, 10.5);
            ctx.fillStyle = '#854d0e'; // Tan leather Kolhapuri sandals
            ctx.fillRect(cx - 6.5, 51 + lFoot, 5, 2);
            ctx.fillRect(cx + 1.5, 51 + rFoot, 5, 2);
            ctx.fillStyle = '#b45309'; // Toe-ring straps
            ctx.fillRect(cx - 5.5, 49.5 + lFoot, 3, 1.5);
            ctx.fillRect(cx + 2.5, 49.5 + rFoot, 3, 1.5);
          } else if (role === 'poet') {
            // Crisp White Cotton Pajama & Nagra Slippers
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(cx - 6.5, 39 + lLeg, 5.2, 11);
            ctx.fillRect(cx + 1.5, 39 + rLeg, 5.2, 11);
            ctx.fillStyle = '#cbd5e1'; // Crease lines
            ctx.fillRect(cx - 6.5, 46 + lLeg, 5.2, 1);
            ctx.fillRect(cx + 1.5, 46 + rLeg, 5.2, 1);
            // Chestnut leather pointed nagra shoes
            ctx.fillStyle = '#451a03';
            ctx.fillRect(cx - 6.5, 50.5 + lFoot, 5.5, 2.5);
            ctx.fillRect(cx + 1.5, 50.5 + rFoot, 5.5, 2.5);
            ctx.fillRect(cx - 8, 51 + lFoot, 2, 1.8); // Curled toe point
            ctx.fillRect(cx + 6.5, 51 + rFoot, 2, 1.8);
          } else if (role === 'photo') {
            // Olive Tactical Cargo Joggers & Modern Sneakers
            ctx.fillStyle = '#3f6212';
            ctx.fillRect(cx - 6.5, 39 + lLeg, 5.2, 10.5);
            ctx.fillRect(cx + 1.5, 39 + rLeg, 5.2, 10.5);
            ctx.fillStyle = '#2d470c'; // Side flap pockets
            ctx.fillRect(cx - 7.5, 42 + lLeg, 1.5, 4);
            ctx.fillRect(cx + 6.2, 42 + rLeg, 1.5, 4);
            // Two-tone sneakers with orange speed trim
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(cx - 6.5, 49.5 + lFoot, 5.4, 2.5);
            ctx.fillRect(cx + 1.5, 49.5 + rFoot, 5.4, 2.5);
            ctx.fillStyle = '#f97316'; // Orange streak
            ctx.fillRect(cx - 6.5, 50.5 + lFoot, 5.4, 1);
            ctx.fillRect(cx + 1.5, 50.5 + rFoot, 5.4, 1);
            ctx.fillStyle = '#ffffff'; // White soles
            ctx.fillRect(cx - 6.8, 51.5 + lFoot, 6, 1.6);
            ctx.fillRect(cx + 1.2, 51.5 + rFoot, 6, 1.6);
          } else if (role === 'sage') {
            // Forest Druid Robes
            ctx.fillStyle = '#14532d';
            ctx.fillRect(cx - 8, 38 + bob, 16, 13);
            ctx.fillStyle = '#86efac';
            ctx.fillRect(cx - 8, 49.5 + bob, 16, 1.5);
            ctx.fillStyle = '#451a03';
            ctx.fillRect(cx - 5, 51.5 + lFoot, 4, 2);
            ctx.fillRect(cx + 1, 51.5 + rFoot, 4, 2);
          } else if (role === 'marina') {
            // Seafoam Ocean Skirt
            ctx.fillStyle = '#0d9488';
            ctx.fillRect(cx - 8, 38 + bob, 16, 13);
            ctx.fillStyle = '#5eead4';
            ctx.fillRect(cx - 8, 49 + bob, 16, 2);
            ctx.fillStyle = '#f3c5a5';
            ctx.fillRect(cx - 4.5, 51 + lFoot, 3.5, 2);
            ctx.fillRect(cx + 1, 51 + rFoot, 3.5, 2);
          } else if (role === 'kael') {
            // Heavy Studded Blacksmith Kilt & Iron Boots
            ctx.fillStyle = '#451a03';
            ctx.fillRect(cx - 7.5, 38 + bob, 15, 11);
            ctx.fillStyle = '#d97706';
            ctx.fillRect(cx - 7.5, 47 + bob, 15, 1.8);
            ctx.fillStyle = '#334155'; // Iron greaves & boots
            ctx.fillRect(cx - 6.5, 49 + lFoot, 5.5, 4);
            ctx.fillRect(cx + 1.2, 49 + rFoot, 5.5, 4);
          } else if (role === 'lyra') {
            // Starlight Velvet Gown
            ctx.fillStyle = '#1e1b4b';
            ctx.fillRect(cx - 8, 38 + bob, 16, 13);
            ctx.fillStyle = '#93c5fd';
            ctx.fillRect(cx - 8, 49.5 + bob, 16, 1.5);
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(cx - 4.5, 51 + lFoot, 3.5, 2);
            ctx.fillRect(cx + 1, 51 + rFoot, 3.5, 2);
          } else if (role === 'chronicler') {
            // Astral Nebula Robes
            ctx.fillStyle = '#3b0764';
            ctx.fillRect(cx - 8, 38 + bob, 16, 13);
            ctx.fillStyle = '#c084fc';
            ctx.fillRect(cx - 8, 49.5 + bob, 16, 1.5);
            ctx.fillStyle = '#fde047';
            ctx.fillRect(cx - 4.5, 51 + lFoot, 3.5, 2);
            ctx.fillRect(cx + 1, 51 + rFoot, 3.5, 2);
          } else {
            // Default Tailored Trousers / Jeans & Leather Shoes
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(cx - 6.5, 40 + lLeg, 5, 9.5);
            ctx.fillRect(cx + 1.5, 40 + rLeg, 5, 9.5);
            ctx.fillStyle = '#3b2219';
            ctx.fillRect(cx - 6.8, 49.5 + lFoot, 5.6, 2.8);
            ctx.fillRect(cx + 1.2, 49.5 + rFoot, 5.6, 2.8);
          }

          // 4. Torso, Kurti, Panjabi, Jacket & Attire
          ctx.fillStyle = shirtCol;
          ctx.beginPath();
          ctx.roundRect(cx - 8.5, 23 + bob, 17, 18, 2.5);
          ctx.fill();

          // Fabric Shading (Shadow on left, highlight on right)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
          ctx.fillRect(cx - 8.5, 23 + bob, 4, 18);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
          ctx.fillRect(cx + 2, 23.5 + bob, 5, 14);

          // Role-Specific Attire Details
          if (role === 'tea') {
            // Vendor Apron + Checkered Gamcha on Left Shoulder
            ctx.fillStyle = '#fffbeb';
            ctx.fillRect(cx - 6.5, 28 + bob, 13, 12);
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(cx - 4.5, 34 + bob, 9, 5); // Apron pocket
            // Red Checkered Gamcha
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(cx - 9, 23 + bob, 5, 13);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 9, 26 + bob, 5, 1.2);
            ctx.fillRect(cx - 9, 30 + bob, 5, 1.2);
            ctx.fillRect(cx - 9, 34 + bob, 5, 1.2);
            // Gamcha tassel fringe
            ctx.fillStyle = '#fca5a5';
            ctx.fillRect(cx - 9, 36 + bob, 5, 2.2);
          } else if (role === 'fuchka') {
            // Emerald Vendor Shirt + Crisp White Apron
            ctx.fillStyle = '#ffffff'; // White collar
            ctx.fillRect(cx - 5, 23 + bob, 10, 2.5);
            ctx.fillStyle = '#f8fafc'; // White apron
            ctx.fillRect(cx - 6.5, 28 + bob, 13, 12);
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(cx - 4.5, 34 + bob, 9, 4.5);
          } else if (role === 'books') {
            // Tweed Waistcoat with Welt Pockets & Buttons
            ctx.fillStyle = '#78350f';
            ctx.fillRect(cx - 7.5, 24 + bob, 15, 15);
            ctx.fillStyle = '#451a03'; // V-neck opening
            ctx.beginPath();
            ctx.moveTo(cx - 4, 24 + bob); ctx.lineTo(cx, 31 + bob); ctx.lineTo(cx + 4, 24 + bob);
            ctx.fill();
            ctx.fillStyle = '#fefce8'; // Kurta inside V
            ctx.fillRect(cx - 2, 24 + bob, 4, 6);
            ctx.fillStyle = '#facc15'; // Gold buttons
            ctx.fillRect(cx - 0.7, 32 + bob, 1.4, 1.4);
            ctx.fillRect(cx - 0.7, 35 + bob, 1.4, 1.4);
            ctx.fillStyle = '#5c2a05'; // Welt pockets
            ctx.fillRect(cx - 6, 33 + bob, 3.5, 1.2);
            ctx.fillRect(cx + 2.5, 33 + bob, 3.5, 1.2);
          } else if (role === 'guitar') {
            // Royal Purple Kurti with Golden Mirrorwork Neckline
            ctx.fillStyle = '#facc15';
            ctx.fillRect(cx - 1.5, 23 + bob, 3, 11);
            ctx.fillRect(cx - 4.5, 23 + bob, 9, 1.8);
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(cx - 0.7, 26 + bob, 1.4, 1.4);
            ctx.fillRect(cx - 0.7, 29 + bob, 1.4, 1.4);
            ctx.fillRect(cx - 0.7, 32 + bob, 1.4, 1.4);
          } else if (role === 'artist') {
            // Orange Kurta with Multi-Color Paint Splatters
            ctx.fillStyle = accCol;
            ctx.fillRect(cx - 5, 23 + bob, 10, 2.5);
            // Splatters
            ctx.fillStyle = '#2563eb'; ctx.fillRect(cx - 5, 29 + bob, 2.2, 2.2);
            ctx.fillStyle = '#ef4444'; ctx.fillRect(cx + 3, 31 + bob, 2, 2);
            ctx.fillStyle = '#eab308'; ctx.fillRect(cx - 2, 35 + bob, 2.5, 2);
            ctx.fillStyle = '#10b981'; ctx.fillRect(cx + 4, 36 + bob, 1.8, 1.8);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 4, 38 + bob, 1.5, 1.5);
          } else if (role === 'doi') {
            // Sweetmaker's Apron & Gold Neck Embroidery
            ctx.fillStyle = '#facc15';
            ctx.fillRect(cx - 5, 23 + bob, 10, 2.2);
            ctx.fillStyle = '#78350f';
            ctx.fillRect(cx - 6.5, 29 + bob, 13, 11);
            ctx.fillStyle = '#c28b38';
            ctx.fillRect(cx - 6.5, 38 + bob, 13, 1.5);
          } else if (role === 'phulwali') {
            // Saree Pallu Draped Across Chest to Left Shoulder
            ctx.fillStyle = '#fde047'; // Blouse border
            ctx.fillRect(cx - 5, 23 + bob, 10, 2);
            ctx.fillStyle = '#be185d';
            ctx.beginPath();
            ctx.moveTo(cx + 8, 38 + bob); ctx.lineTo(cx - 8, 23 + bob);
            ctx.lineTo(cx - 4, 23 + bob); ctx.lineTo(cx + 8, 34 + bob);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#fde047'; // Zari border on pallu
            ctx.beginPath();
            ctx.moveTo(cx + 8, 38 + bob); ctx.lineTo(cx - 8, 23 + bob);
            ctx.lineTo(cx - 6.5, 23 + bob); ctx.lineTo(cx + 8, 36.5 + bob);
            ctx.closePath(); ctx.fill();
          } else if (role === 'physics') {
            // Forest Green Kurta with Placket & Pen Pocket
            ctx.fillStyle = '#1d3d28';
            ctx.fillRect(cx - 1.5, 23 + bob, 3, 10);
            ctx.fillRect(cx - 4.5, 23 + bob, 9, 2);
            ctx.fillStyle = '#b45309'; // Buttons
            ctx.fillRect(cx - 0.7, 26 + bob, 1.4, 1.4);
            ctx.fillRect(cx - 0.7, 29 + bob, 1.4, 1.4);
            // Pen in pocket
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(cx + 3, 27 + bob, 1.2, 3.5);
            // Crossbody leather bag strap
            ctx.strokeStyle = '#78350f'; ctx.lineWidth = 1.8;
            ctx.beginPath(); ctx.moveTo(cx - 7, 23 + bob); ctx.lineTo(cx + 8, 37 + bob); ctx.stroke();
          } else if (role === 'sketcher') {
            // Layered Rust Kurta with Mustard Undershirt & Batik Dots
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(cx - 4.5, 23 + bob, 9, 3);
            ctx.fillStyle = '#fde047';
            ctx.fillRect(cx - 4, 29 + bob, 1.5, 1.5);
            ctx.fillRect(cx + 3, 31 + bob, 1.5, 1.5);
            ctx.fillRect(cx - 2, 34 + bob, 1.5, 1.5);
          } else if (role === 'poet') {
            // Crimson Kashmiri Woolen Shawl Draped Over Left Shoulder
            ctx.fillStyle = '#881337';
            ctx.beginPath();
            ctx.moveTo(cx - 8.5, 23 + bob); ctx.lineTo(cx - 2, 23 + bob);
            ctx.lineTo(cx + 8.5, 37 + bob); ctx.lineTo(cx + 4, 39 + bob);
            ctx.lineTo(cx - 8.5, 28 + bob);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#facc15'; // Gold zari border fringe
            ctx.beginPath();
            ctx.moveTo(cx - 8.5, 27 + bob); ctx.lineTo(cx + 4, 39 + bob);
            ctx.lineTo(cx + 4, 40.5 + bob); ctx.lineTo(cx - 8.5, 28.5 + bob);
            ctx.closePath(); ctx.fill();
          } else if (role === 'photo') {
            // Denim Trucker Jacket Worn Open Over Camera Graphic Tee
            ctx.fillStyle = '#ffffff'; // White graphic tee inside
            ctx.fillRect(cx - 3, 24 + bob, 6, 15);
            ctx.fillStyle = '#18181b'; // Miniature camera graphic
            ctx.fillRect(cx - 1.5, 28 + bob, 3, 2);
            // Denim collar lapels
            ctx.fillStyle = '#1d4ed8';
            ctx.fillRect(cx - 7.5, 23 + bob, 4, 3);
            ctx.fillRect(cx + 3.5, 23 + bob, 4, 3);
          } else if (role === 'jogger') {
            // Athletic Racerback Tank with Reflective Trim
            ctx.fillStyle = '#e2e8f0'; // Silver reflective side piping
            ctx.fillRect(cx - 8.5, 23 + bob, 1.5, 16);
            ctx.fillRect(cx + 7, 23 + bob, 1.5, 16);
            ctx.fillStyle = '#be123c';
            ctx.fillRect(cx - 4, 23 + bob, 8, 2);
          } else if (role === 'sage') {
            // Forest Druid Mantle & Leaf Brooch
            ctx.fillStyle = '#14532d';
            ctx.fillRect(cx - 8, 23 + bob, 16, 5);
            ctx.fillStyle = '#4ade80'; // Emerald leaf brooch
            ctx.beginPath(); ctx.arc(cx, 26 + bob, 2.2, 0, Math.PI * 2); ctx.fill();
          } else if (role === 'marina') {
            // Seashell Pearl Scallop Collar
            ctx.fillStyle = '#5eead4';
            ctx.fillRect(cx - 6, 23 + bob, 12, 3);
            ctx.fillStyle = '#ffffff'; // Pearl
            ctx.beginPath(); ctx.arc(cx, 25.5 + bob, 1.8, 0, Math.PI * 2); ctx.fill();
          } else if (role === 'kael') {
            // Charred Leather Smithing Vest & Copper Rivets
            ctx.fillStyle = '#451a03';
            ctx.fillRect(cx - 8, 23 + bob, 16, 17);
            ctx.fillStyle = '#b45309'; // Copper rivets
            ctx.fillRect(cx - 6, 26 + bob, 1.5, 1.5);
            ctx.fillRect(cx + 4.5, 26 + bob, 1.5, 1.5);
            ctx.fillRect(cx - 6, 33 + bob, 1.5, 1.5);
            ctx.fillRect(cx + 4.5, 33 + bob, 1.5, 1.5);
          } else if (role === 'lyra') {
            // Midnight Velvet Cloak with Fur Trim
            ctx.fillStyle = '#ffffff'; // White fur trim
            ctx.fillRect(cx - 8.5, 23 + bob, 17, 3);
            ctx.fillStyle = '#facc15'; // Star clasp
            ctx.fillRect(cx - 1.5, 25 + bob, 3, 3);
          } else if (role === 'chronicler') {
            // Celestial Starlight Mantle
            ctx.fillStyle = '#7e22ce';
            ctx.fillRect(cx - 8.5, 23 + bob, 17, 4);
            ctx.fillStyle = '#fde047'; // Constellation gold dots
            ctx.fillRect(cx - 5, 28 + bob, 1.2, 1.2);
            ctx.fillRect(cx + 4, 30 + bob, 1.2, 1.2);
            ctx.fillRect(cx, 33 + bob, 1.2, 1.2);
          } else {
            ctx.fillStyle = accCol;
            ctx.fillRect(cx - 5, 23 + bob, 10, 2.5);
          }

          // 5. Arms & Sleeves (With Walking Arm Swing!)
          const lArmX = cx - 11.5 + (armSwing * -0.5);
          const rArmX = cx + 8 + (armSwing * 0.5);
          ctx.fillStyle = shirtCol;
          ctx.fillRect(lArmX, 24 + bob, 3.5, 8.5);
          ctx.fillRect(rArmX, 24 + bob, 3.5, 8.5);
          // Forearms & Hands
          ctx.fillStyle = '#f0c4a5';
          ctx.fillRect(lArmX + 0.2, 32.5 + bob, 3.2, 4.5);
          ctx.fillRect(rArmX + 0.2, 32.5 + bob, 3.2, 4.5);

          // Wrist Accessories
          if (role === 'physics') {
            ctx.fillStyle = '#334155'; // Casio digital watch
            ctx.fillRect(lArmX, 33 + bob, 3.5, 2);
            ctx.fillStyle = '#38bdf8'; // Cyan screen glint
            ctx.fillRect(lArmX + 1, 33.5 + bob, 1.5, 1);
          } else if (role === 'jogger') {
            ctx.fillStyle = '#0f172a'; // Smart fitness watch
            ctx.fillRect(lArmX, 33 + bob, 3.5, 2.2);
            ctx.fillStyle = '#22c55e'; // Green pulse display
            ctx.fillRect(lArmX + 1, 33.5 + bob, 1.5, 1);
          } else if (role === 'phulwali') {
            ctx.fillStyle = '#dc2626'; // Red glass bangles
            ctx.fillRect(lArmX, 32.5 + bob, 3.5, 1.2);
            ctx.fillRect(rArmX, 32.5 + bob, 3.5, 1.2);
            ctx.fillStyle = '#fde047'; // Gold bangles
            ctx.fillRect(lArmX, 34 + bob, 3.5, 1);
            ctx.fillRect(rArmX, 34 + bob, 3.5, 1);
          }

          // 6. Signature High-Detail Held Props
          if (role === 'tea') {
            // Left hand: Hammered Aluminum Kettle with Spout & Handle
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath(); ctx.ellipse(cx - 13, 36 + bob, 5, 4.2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#e2e8f0'; // Specular highlight
            ctx.fillRect(cx - 15, 34 + bob, 2.5, 2);
            ctx.fillStyle = '#64748b'; // Spout
            ctx.beginPath();
            ctx.moveTo(cx - 17, 34 + bob); ctx.lineTo(cx - 19, 30 + bob); ctx.lineTo(cx - 16.5, 32 + bob);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1.4; // Black handle
            ctx.beginPath(); ctx.arc(cx - 13, 31 + bob, 3.2, Math.PI, 0); ctx.stroke();

            // Right hand: Steaming Terracotta Matir Bhaar (Clay Cup) of Spiced Malai Cha
            ctx.fillStyle = '#b45309'; // Terracotta clay cup
            ctx.fillRect(cx + 9, 32 + bob, 5.5, 6);
            ctx.fillStyle = '#fef08a'; // Frothy Malai Cha top
            ctx.fillRect(cx + 9.5, 31.5 + bob, 4.5, 1.5);
            // Rising animated steam curls
            ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.fillRect(cx + 10.5 + flutter * 0.6, 27 + bob, 1.5, 3.5);
            ctx.fillRect(cx + 12 + flutter * 0.3, 24 + bob, 1.2, 2.5);
          } else if (role === 'fuchka') {
            // Left hand: Plate of Crispy Fuchkas & Egg Shaving Garnish
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath(); ctx.ellipse(cx + 10.5, 35.5 + bob, 6.2, 2.8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#d97706'; // Golden puffed fuchkas
            ctx.beginPath();
            ctx.arc(cx + 8, 34 + bob, 2, 0, Math.PI * 2);
            ctx.arc(cx + 12.5, 34 + bob, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fef08a'; // Egg shreds
            ctx.fillRect(cx + 9.5, 33 + bob, 2, 1);
            ctx.fillStyle = '#16a34a'; // Cilantro green
            ctx.fillRect(cx + 11.5, 32.5 + bob, 1.2, 1.2);

            // Right hand: Bowl of Spicy Tamarind Tok
            ctx.fillStyle = '#9a3412';
            ctx.fillRect(cx - 14, 34 + bob, 5, 4);
            ctx.fillStyle = '#78350f'; // Dark tamarind tok
            ctx.fillRect(cx - 13.5, 33.5 + bob, 4, 1.5);
          } else if (role === 'books') {
            // Towering Stack of 3 Antique Hardcover Volumes
            // Bottom volume: Crimson Moroccan leather
            ctx.fillStyle = '#991b1b'; ctx.fillRect(cx + 5, 36 + bob, 10, 3.5);
            ctx.fillStyle = '#fef08a'; ctx.fillRect(cx + 5.5, 37 + bob, 9, 1); // Gold page edges
            // Middle volume: Peacock teal clothbound
            ctx.fillStyle = '#0f766e'; ctx.fillRect(cx + 4.5, 32.5 + bob, 10.5, 3.5);
            ctx.fillStyle = '#facc15'; ctx.fillRect(cx + 4.5, 33.5 + bob, 1.5, 1.5);
            // Top volume: Midnight blue with dangling ribbon
            ctx.fillStyle = '#1e3a8a'; ctx.fillRect(cx + 5.5, 29 + bob, 9.5, 3.5);
            ctx.fillStyle = '#ef4444'; // Red ribbon bookmark
            ctx.fillRect(cx + 13.5, 31 + bob, 1.5, 4);
          } else if (role === 'guitar') {
            // Acoustic Sunburst Guitar Slung Across Body
            ctx.fillStyle = '#d97706'; // Sunburst amber top
            ctx.beginPath(); ctx.ellipse(cx - 2, 36 + bob, 8.5, 6, -0.32, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#451a03'; // Body dark rim
            ctx.stroke();
            ctx.fillStyle = '#1c1917'; // Soundhole
            ctx.beginPath(); ctx.arc(cx - 2, 36 + bob, 2.2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fde68a'; // Rosette ring
            ctx.beginPath(); ctx.arc(cx - 2, 36 + bob, 2.8, 0, Math.PI * 2); ctx.stroke();
            // Guitar Neck, Frets & Headstock
            ctx.strokeStyle = '#5c3822'; ctx.lineWidth = 2.4;
            ctx.beginPath(); ctx.moveTo(cx + 2, 33 + bob); ctx.lineTo(cx + 14, 22 + bob); ctx.stroke();
            ctx.fillStyle = '#cbd5e1'; // Tuning pegs
            ctx.fillRect(cx + 13, 20 + bob, 3, 2);
          } else if (role === 'artist') {
            // Kidney-Shaped Wooden Artist Palette & Paintbrush
            ctx.fillStyle = '#d4a373';
            ctx.beginPath(); ctx.ellipse(cx - 12, 35 + bob, 5.5, 4, 0, 0, Math.PI * 2); ctx.fill();
            // Palette paint blobs
            ctx.fillStyle = '#ef4444'; ctx.fillRect(cx - 14.5, 33.5 + bob, 1.8, 1.8);
            ctx.fillStyle = '#eab308'; ctx.fillRect(cx - 13, 36 + bob, 1.8, 1.8);
            ctx.fillStyle = '#2563eb'; ctx.fillRect(cx - 10, 36.5 + bob, 1.8, 1.8);
            ctx.fillStyle = '#10b981'; ctx.fillRect(cx - 9.5, 34 + bob, 1.8, 1.8);
            // Paintbrush dripping red in right hand
            ctx.strokeStyle = '#78350f'; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(cx + 9, 37 + bob); ctx.lineTo(cx + 13.5, 27 + bob); ctx.stroke();
            ctx.fillStyle = '#ef4444'; ctx.fillRect(cx + 12.5, 26 + bob, 2.5, 2.5);
          } else if (role === 'doi') {
            // Authentic Terracotta Earthen Pot (Matir Haari) of Bogurar Mishti Doi
            ctx.fillStyle = '#9a3412';
            ctx.beginPath(); ctx.arc(cx + 10.5, 36.5 + bob, 5.2, 0, Math.PI); ctx.fill();
            ctx.fillStyle = '#fef3c7'; // Luscious caramelized yogurt crust
            ctx.beginPath(); ctx.ellipse(cx + 10.5, 35.5 + bob, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fde047';
            ctx.fillRect(cx + 9, 35 + bob, 3, 1);
            // Wooden sweet scoop
            ctx.fillStyle = '#d4a373'; ctx.fillRect(cx + 13.5, 32 + bob, 2, 5);
          } else if (role === 'phulwali') {
            // Woven Bamboo Basket Overflowing with Fragrant Beli Gajras & Marigolds
            ctx.fillStyle = '#b45309';
            ctx.beginPath(); ctx.arc(cx, 37 + bob, 7.5, 0, Math.PI); ctx.fill();
            ctx.strokeStyle = '#78350f'; ctx.lineWidth = 1;
            ctx.stroke();
            // Blooming Beli Gajras (Jasmine)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx - 3.5, 35.5 + bob, 2.5, 0, Math.PI * 2);
            ctx.arc(cx + 3.5, 35.5 + bob, 2.5, 0, Math.PI * 2);
            ctx.arc(cx, 34 + bob, 2.5, 0, Math.PI * 2);
            ctx.fill();
            // Marigolds
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(cx - 5.5, 37 + bob, 1.8, 0, Math.PI * 2);
            ctx.arc(cx + 5.5, 37 + bob, 1.8, 0, Math.PI * 2);
            ctx.fill();
          } else if (role === 'physics') {
            // Leather Messenger Bag & Hardbound Quantum Mechanics Textbook
            ctx.fillStyle = '#78350f'; // Messenger bag
            ctx.fillRect(cx + 7, 34 + bob, 6.5, 8);
            ctx.fillStyle = '#fbbf24'; // Brass buckle
            ctx.fillRect(cx + 9.5, 37 + bob, 1.8, 1.8);
            // Quantum Mechanics Textbook tucked under left arm
            ctx.fillStyle = '#1e3a8a';
            ctx.fillRect(cx - 14, 30 + bob, 6.5, 8.5);
            ctx.fillStyle = '#facc15'; // Gold foil spine
            ctx.fillRect(cx - 14, 30 + bob, 1.5, 8.5);
            ctx.fillStyle = '#f8fafc'; // Pages
            ctx.fillRect(cx - 12, 37 + bob, 4.5, 1.2);
          } else if (role === 'sketcher') {
            // Spiral-Bound Artist Sketchpad with Curzon Hall Sketch & 2B Pencil
            ctx.fillStyle = '#fdf6e2';
            ctx.fillRect(cx + 6.5, 30 + bob, 7.5, 9);
            ctx.fillStyle = '#1c1917'; // Spiral binding
            for (let sp = 31; sp <= 38; sp += 2) ctx.fillRect(cx + 6.5, sp + bob, 1.2, 1);
            // Miniature Curzon red dome sketch on cover
            ctx.fillStyle = '#b91c1c';
            ctx.fillRect(cx + 9.5, 33 + bob, 3, 2.5);
            // Wooden drawing pencil in left hand
            ctx.fillStyle = '#b45309'; ctx.fillRect(cx - 13.5, 32 + bob, 2, 6);
            ctx.fillStyle = '#18181b'; ctx.fillRect(cx - 13.5, 31 + bob, 2, 1.5); // Graphite tip
          } else if (role === 'poet') {
            // Woven Jhola Bag & Rolled Handmade Poetry Scroll
            ctx.fillStyle = '#d4a373'; // Jhola shoulder bag
            ctx.fillRect(cx - 13.5, 33 + bob, 6, 7.5);
            ctx.fillStyle = '#fdf6e2'; // Manuscript papers inside bag
            ctx.fillRect(cx - 12.5, 31.5 + bob, 4, 2);
            // Handmade poetry scroll tied with red silk ribbon
            ctx.fillStyle = '#fef3c7';
            ctx.fillRect(cx + 8.5, 29 + bob, 4, 9);
            ctx.fillStyle = '#dc2626'; // Red ribbon & wax seal
            ctx.fillRect(cx + 8.5, 33 + bob, 4, 1.8);
            ctx.fillRect(cx + 10, 34.5 + bob, 1.5, 1.5);
          } else if (role === 'photo') {
            // Modern Professional DSLR Camera Hanging on Neck Strap
            ctx.strokeStyle = '#18181b'; ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(cx - 4.5, 23 + bob); ctx.lineTo(cx - 3, 31 + bob);
            ctx.moveTo(cx + 4.5, 23 + bob); ctx.lineTo(cx + 3, 31 + bob);
            ctx.stroke();
            // Camera body
            ctx.fillStyle = '#18181b';
            ctx.fillRect(cx - 5, 30 + bob, 10, 6.5);
            ctx.fillStyle = '#ef4444'; // Red recording tally LED
            ctx.fillRect(cx - 4, 31 + bob, 1.2, 1.2);
            // Telephoto zoom lens
            ctx.fillStyle = '#27272a';
            ctx.beginPath(); ctx.arc(cx, 33.5 + bob, 3.2, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 0.8; ctx.stroke(); // Red ring of luxury lens
            ctx.fillStyle = '#38bdf8'; // Cyan glass reflection
            ctx.fillRect(cx - 1, 32.5 + bob, 1.8, 1.8);
          } else if (role === 'jogger') {
            // Translucent Cyan Sports Water Bottle
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(cx + 9, 31 + bob, 4, 7);
            ctx.fillStyle = '#bae6fd'; // Water level
            ctx.fillRect(cx + 9.5, 33.5 + bob, 3, 4);
            ctx.fillStyle = '#ffffff'; // White lid
            ctx.fillRect(cx + 9.5, 29.5 + bob, 3, 1.8);
          } else if (role === 'sage') {
            // Gnarled Wooden Staff with Glowing Emerald Leaf Crystal
            ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2.2;
            ctx.beginPath(); ctx.moveTo(cx + 10, 48 + bob); ctx.lineTo(cx + 11, 20 + bob); ctx.stroke();
            ctx.fillStyle = '#22c55e'; // Emerald crystal
            ctx.beginPath(); ctx.arc(cx + 11, 18 + bob, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#86efac'; ctx.fillRect(cx + 10, 17 + bob, 1.5, 1.5);
          } else if (role === 'marina') {
            // Glowing Nautilus Conch Shell
            ctx.fillStyle = '#fef08a';
            ctx.beginPath(); ctx.ellipse(cx + 9, 34 + bob, 4.5, 3.5, 0.4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#5eead4'; ctx.fillRect(cx + 8, 33 + bob, 2, 2);
          } else if (role === 'kael') {
            // Heavy Obsidian Forge Hammer with Molten Runes
            ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2.2;
            ctx.beginPath(); ctx.moveTo(cx + 9, 44 + bob); ctx.lineTo(cx + 11, 24 + bob); ctx.stroke();
            ctx.fillStyle = '#334155'; ctx.fillRect(cx + 8, 22 + bob, 7, 4.5);
            ctx.fillStyle = '#f97316'; ctx.fillRect(cx + 9.5, 23.5 + bob, 4, 1.5);
          } else if (role === 'lyra') {
            // Polished Brass Armillary Sphere
            ctx.strokeStyle = '#facc15'; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.arc(cx + 10, 33 + bob, 3.8, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = '#93c5fd'; ctx.beginPath(); ctx.arc(cx + 10, 33 + bob, 1.8, 0, Math.PI * 2); ctx.fill();
          } else if (role === 'chronicler') {
            // Floating Astral Tome & Radiant Golden Feather Quill
            ctx.fillStyle = '#581c87'; ctx.fillRect(cx - 14, 30 + bob, 6.5, 8);
            ctx.fillStyle = '#fde047'; ctx.fillRect(cx - 13, 31 + bob, 4.5, 6);
            ctx.fillStyle = '#facc15'; // Golden quill
            ctx.beginPath(); ctx.moveTo(cx + 10, 36 + bob); ctx.lineTo(cx + 13, 27 + bob); ctx.stroke();
          }

          // 7. Neck, Head, Face & Character Expression
          ctx.fillStyle = '#dfaa78'; // Neck
          ctx.fillRect(cx - 2.5, 20 + bob, 5, 4);
          ctx.fillStyle = '#f0c4a5'; // Face
          ctx.beginPath(); ctx.arc(cx, 15.2 + bob, 7.8, 0, Math.PI * 2); ctx.fill();

          // Expressive Eyes with Pupils & Catchlights
          ctx.fillStyle = '#18181b';
          ctx.fillRect(cx - 4.5, 13.5 + bob, 2.2, 2.4);
          ctx.fillRect(cx + 2.3, 13.5 + bob, 2.2, 2.4);
          ctx.fillStyle = '#ffffff'; // Catchlight sparkles
          ctx.fillRect(cx - 4.2, 13.8 + bob, 1, 1);
          ctx.fillRect(cx + 2.6, 13.8 + bob, 1, 1);

          // Rosy Cheek Blush
          ctx.fillStyle = 'rgba(244, 63, 94, 0.28)';
          ctx.beginPath();
          ctx.arc(cx - 4.5, 16.5 + bob, 1.4, 0, Math.PI * 2);
          ctx.arc(cx + 4.5, 16.5 + bob, 1.4, 0, Math.PI * 2);
          ctx.fill();

          // Glasses (DU Senior Arif & Nilkhet Boiwala)
          if (role === 'physics') {
            ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.1;
            ctx.strokeRect(cx - 6, 12.8 + bob, 4.2, 3.2);
            ctx.strokeRect(cx + 1.8, 12.8 + bob, 4.2, 3.2);
            ctx.beginPath(); ctx.moveTo(cx - 1.8, 14.2 + bob); ctx.lineTo(cx + 1.8, 14.2 + bob); ctx.stroke();
            // Anti-reflective blue glint
            ctx.fillStyle = 'rgba(186, 230, 253, 0.55)';
            ctx.fillRect(cx - 5.2, 13.4 + bob, 1.8, 1.8);
            ctx.fillRect(cx + 2.6, 13.4 + bob, 1.8, 1.8);
          } else if (role === 'books') {
            ctx.strokeStyle = '#eab308'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx - 3.8, 14.5 + bob, 2.2, 0, Math.PI * 2);
            ctx.arc(cx + 3.8, 14.5 + bob, 2.2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx - 1.6, 14.5 + bob); ctx.lineTo(cx + 1.6, 14.5 + bob); ctx.stroke();
          }

          // Mustaches, Beards & Smiles
          if (role === 'tea' || role === 'doi') {
            // Friendly generous Bengali mustache
            ctx.fillStyle = '#1c1917';
            ctx.fillRect(cx - 4, 17.2 + bob, 8, 1.8);
          } else if (role === 'fuchka') {
            ctx.fillStyle = '#1c1917';
            ctx.fillRect(cx - 3.5, 17.5 + bob, 7, 1.6);
          } else if (role === 'poet') {
            // Distinguished salt-and-pepper poet's beard
            ctx.fillStyle = '#262626';
            ctx.beginPath(); ctx.arc(cx, 17.5 + bob, 4.5, 0, Math.PI); ctx.fill();
            ctx.fillStyle = '#a1a1aa'; // Grey wisdom streaks
            ctx.fillRect(cx - 2, 18.5 + bob, 4, 1);
          } else if (role === 'kael') {
            // Braided fiery dwarven beard with copper rings
            ctx.fillStyle = '#c2410c';
            ctx.fillRect(cx - 4, 17 + bob, 8, 6);
            ctx.fillStyle = '#b45309'; // Copper ring
            ctx.fillRect(cx - 2.5, 21 + bob, 5, 1.5);
          } else if (role === 'sage') {
            // Long flowing silver druidic beard
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath(); ctx.arc(cx, 17.5 + bob, 5, 0, Math.PI); ctx.fill();
            ctx.fillRect(cx - 3, 20 + bob, 6, 6);
          } else {
            // Gentle warm smile
            ctx.fillStyle = '#b91c1c';
            ctx.fillRect(cx - 1.8, 18.2 + bob, 3.6, 1.2);
          }

          // 8. Hair & Role-Specific Headgear
          ctx.fillStyle = hairCol;
          ctx.beginPath();
          ctx.arc(cx, 11.2 + bob, 8, Math.PI, 0);
          ctx.fill();

          // Glossy Hair Sheen Highlight
          ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
          ctx.fillRect(cx - 4, 8 + bob, 8, 1.5);

          // Headgear / Forehead Adornments
          if (role === 'fuchka') {
            // Crisp White Jaali Topi with Golden Rim
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(cx, 9.5 + bob, 7.8, Math.PI, 0); ctx.fill();
            ctx.fillStyle = '#eab308';
            ctx.fillRect(cx - 7.8, 9 + bob, 15.6, 2);
          } else if (role === 'doi') {
            // Traditional Old Dhaka Embroidered Topi
            ctx.fillStyle = '#fefce8';
            ctx.fillRect(cx - 7.5, 6.5 + bob, 15, 4.8);
            ctx.fillStyle = '#facc15';
            ctx.fillRect(cx - 7.5, 9.2 + bob, 15, 1.8);
          } else if (role === 'jogger') {
            // Sporty Neon Coral Sweatband
            ctx.fillStyle = '#fb7185';
            ctx.fillRect(cx - 8, 9.5 + bob, 16, 2.6);
          } else if (role === 'phulwali') {
            // Red Bindi (Tip) on Forehead
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(cx - 0.8, 11.8 + bob, 1.6, 1.6);
          } else if (role === 'sage') {
            // Living Emerald Banyan Leaf Crown
            ctx.fillStyle = '#4ade80';
            ctx.fillRect(cx - 7.5, 9 + bob, 15, 2);
            ctx.fillRect(cx - 2, 7 + bob, 4, 3);
          } else if (role === 'marina') {
            // Sea Pearl & Coral Circlet
            ctx.fillStyle = '#f43f5e'; ctx.fillRect(cx - 7, 9.5 + bob, 14, 1.8);
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, 9 + bob, 1.8, 0, Math.PI * 2); ctx.fill();
          } else if (role === 'lyra') {
            // Starlight Silver Tiara
            ctx.fillStyle = '#93c5fd'; ctx.fillRect(cx - 6, 9.5 + bob, 12, 1.6);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 1, 7.5 + bob, 2, 3);
          } else if (role === 'chronicler') {
            // Floating Golden Halo of Astral Starlight
            ctx.strokeStyle = '#fde047'; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.ellipse(cx, 5.5 + bob, 9, 2.5, 0, 0, Math.PI * 2); ctx.stroke();
          }
        });
      });

      // Alias static texture to frame 0
      makeTex(baseKey, 52, 58, (ctx) => {
        const tex = scene.textures.get(`${baseKey}-0`);
        if (tex) ctx.drawImage(tex.getSourceImage(), 0, 0);
      });
    };

    // Vendors & Story Characters (Dhaka Valley)
    /**
     * @asset-spec
     * @id npc-tea
     * @external-png assets/sprites/characters/npc_tea_vendor.png
     * @fallback-procedural npc-tea (52x58)
     * @grid-footprint 1x1 tile (20x14px foot collision base)
     * @visual-size 32x48px (or 16x32px native upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
     */
    makeWalkerNPC('npc-tea',      '#c96551', '#3b2416', '#f5e1c0', 'tea');

    /**
     * @asset-spec
     * @id npc-fuchka
     * @external-png assets/sprites/characters/npc_fuchka_vendor.png
     * @fallback-procedural npc-fuchka (52x58)
     * @grid-footprint 1x1 tile (20x14px foot collision base)
     * @visual-size 32x48px (or 16x32px native upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
     */
    makeWalkerNPC('npc-fuchka',   '#2d8a56', '#241d1d', '#f7cb45', 'fuchka');

    /**
     * @asset-spec
     * @id npc-books
     * @external-png assets/sprites/characters/npc_book_vendor.png
     * @fallback-procedural npc-books (52x58)
     * @grid-footprint 1x1 tile (20x14px foot collision base)
     * @visual-size 32x48px (or 16x32px native upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
     */
    makeWalkerNPC('npc-books',    '#3b6e8c', '#4a2e1b', '#e6d3b8', 'books');

    /**
     * @asset-spec
     * @id npc-guitar
     * @external-png assets/sprites/characters/npc_guitar_player.png
     * @fallback-procedural npc-guitar (52x58)
     * @grid-footprint 1x1 tile (20x14px foot collision base)
     * @visual-size 32x48px (or 16x32px native upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
     */
    makeWalkerNPC('npc-guitar',   '#7e57c2', '#1c1924', '#f4a9c0', 'guitar');

    /**
     * @asset-spec
     * @id npc-artist
     * @external-png assets/sprites/characters/npc_charukola_artist.png
     * @fallback-procedural npc-artist (52x58)
     * @grid-footprint 1x1 tile (20x14px foot collision base)
     * @visual-size 32x48px (or 16x32px native upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
     */
    makeWalkerNPC('npc-artist',   '#d97757', '#2b5876', '#f7cb45', 'artist');

    /**
     * @asset-spec
     * @id npc-doi
     * @external-png assets/sprites/characters/npc_doi_vendor.png
     * @fallback-procedural npc-doi (52x58)
     * @grid-footprint 1x1 tile (20x14px foot collision base)
     * @visual-size 32x48px (or 16x32px native upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
     */
    makeWalkerNPC('npc-doi',      '#c28b38', '#4a2e1b', '#fff5de', 'doi');

    /**
     * @asset-spec
     * @id npc-phulwali
     * @external-png assets/sprites/characters/npc_phulwali.png
     * @fallback-procedural npc-phulwali (52x58)
     * @grid-footprint 1x1 tile (20x14px foot collision base)
     * @visual-size 32x48px (or 16x32px native upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
     */
    makeWalkerNPC('npc-phulwali', '#d45779', '#2b1912', '#fff3a1', 'phulwali');

    // --- Animated Nilkhet Bookstall (3 Frames: -0, -1, -2 with Flickering Edison Bulbs) ---
    const drawBookstallTexture = (ctx, frame = 0) => {
      const W = 216, H = 152;
      let seed = 918273;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

      ctx.fillStyle = 'rgba(12, 8, 20, 0.32)';
      ctx.beginPath(); ctx.ellipse(W / 2, 143, 102, 11, 0, 0, Math.PI * 2); ctx.fill();

      R(12, 134, 192, 9, '#59534b');
      R(14, 132, 188, 4, '#7d756b');
      R(14, 132, 188, 1.5, '#a39a8e');
      for (let sx = 28; sx < 196; sx += 24) R(sx, 133, 1.5, 9, '#454039');

      R(18, 30, 180, 103, '#2b180e');
      R(22, 34, 172, 97, '#170d08');

      [18, 76, 134, 192].forEach(px => {
        R(px, 30, 6, 103, '#4a2b18');
        R(px + 1, 30, 2, 103, '#6e4226');
        R(px + 5, 30, 1, 103, '#24130b');
      });

      const bookPalette = [
        '#b8292f', '#d94e34', '#2b5876', '#3b8ea5', '#2d7a53',
        '#4f9a65', '#c98a2c', '#e6b333', '#6b3fa0', '#8c3b61',
        '#d4b886', '#e8d8b9', '#3d5a80', '#98523c'
      ];

      const drawBookRow = (bx, by, bw, bh) => {
        R(bx, by + bh, bw, 3, '#5c361e');
        R(bx, by + bh, bw, 1, '#855132');
        R(bx, by + bh + 3, bw, 2, 'rgba(0,0,0,0.45)');

        let cx = bx + 1;
        while (cx < bx + bw - 4) {
          const spineW = 3 + ((rnd() * 3.5) | 0);
          const bookH = bh - 1 - ((rnd() * 4) | 0);
          const topY = by + (bh - bookH);
          const col = bookPalette[(rnd() * bookPalette.length) | 0];

          if (rnd() < 0.12 && cx + 8 < bx + bw) {
            ctx.save();
            ctx.translate(cx + 2, by + bh);
            ctx.rotate(-0.18);
            R(0, -bookH, spineW, bookH, col);
            R(0, -bookH + 2, spineW, 1.5, '#f7cb45');
            ctx.restore();
            cx += spineW + 3;
          } else {
            R(cx, topY, spineW, bookH, col);
            R(cx, topY, 1, bookH, 'rgba(255,255,255,0.22)');
            R(cx + spineW - 1, topY, 1, bookH, 'rgba(0,0,0,0.28)');
            if (rnd() < 0.65) {
              R(cx + 0.5, topY + 2, spineW - 1, 1.5, rnd() < 0.5 ? '#f7cb45' : '#fdf5e6');
            }
            cx += spineW + 0.5;
          }
        }
      };

      const bays = [[24, 52], [82, 52], [140, 52]];
      const shelfYs = [42, 60, 78, 96];
      bays.forEach(([bx, bw]) => {
        shelfYs.forEach(sy => drawBookRow(bx, sy, bw, 14));
      });

      [50, 108, 166].forEach((lx, idx) => {
        R(lx, 34, 1.5, 8, '#2b1d14');
        const glowRad = 20 + ((frame + idx) % 3) * 2.5;
        const alpha = 0.45 + ((frame + idx * 2) % 3) * 0.1;
        const g = ctx.createRadialGradient(lx + 1, 44, 1, lx + 1, 44, glowRad);
        g.addColorStop(0, `rgba(255, 230, 130, ${alpha})`);
        g.addColorStop(1, 'rgba(255, 200, 90, 0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx + 1, 44, glowRad, 0, Math.PI * 2); ctx.fill();
        R(lx - 1, 40, 3.5, 2, '#b88628');
        R(lx + 0.5, 42.5, 1.5, 2.5, '#fff3a1');
      });

      R(20, 112, 176, 22, '#3d2212');
      R(22, 113, 172, 18, '#5c361e');
      R(16, 108, 184, 5, '#8c5634');
      R(98, 104, 18, 5, '#8a1c24');
      R(99, 103, 8, 5, '#fdf5e6');
      R(106, 108, 2, 6, '#e63946');

      const awningStripes = 12;
      const stripeW = 192 / awningStripes;
      for (let i = 0; i < awningStripes; i++) {
        const ax = 12 + i * stripeW;
        const isTeal = i % 2 === 0;
        ctx.fillStyle = isTeal ? '#1f5f78' : '#f5ebe0';
        ctx.beginPath();
        ctx.moveTo(ax + 2, 18); ctx.lineTo(ax + stripeW + 2, 18);
        ctx.lineTo(ax + stripeW, 33); ctx.lineTo(ax, 33);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = isTeal ? '#2d7a96' : '#ffffff';
        ctx.fillRect(ax + 2, 20, stripeW - 1, 5);
        ctx.fillStyle = isTeal ? '#164557' : '#d9ccb8';
        ctx.beginPath(); ctx.arc(ax + stripeW / 2, 33, stripeW / 2, 0, Math.PI); ctx.fill();
      }
      R(12, 32, 192, 1.5, '#f7cb45');

      R(32, 2, 152, 18, '#3b2010');
      R(34, 4, 148, 14, '#f7cb45');
      R(35, 5, 146, 12, '#16384c');
      ctx.fillStyle = '#fff8eb'; ctx.font = 'bold 8px "Press Start 2P", monospace'; ctx.textAlign = 'center';
      ctx.fillText('NILKHET BOOKS', W / 2, 14);
    };

    makeTex('prop-bookstall', 216, 152, ctx => drawBookstallTexture(ctx, 0));
    [0, 1, 2].forEach(frame => {
      makeTex(`prop-bookstall-${frame}`, 216, 152, ctx => drawBookstallTexture(ctx, frame));
    });

    // Note: Mishti Doi Cart textures (prop-doicart, prop-doicart-0..3) are generated with complete 4-frame animation in LandmarkGenerator.ts


    // --- Animated TSC Guitar Adda Spot (2 Frames: -0, -1 with Plucking Strings) ---
    [0, 1].forEach(frame => {
      makeTex(`prop-guitar-${frame}`, 56, 56, (ctx, cw, ch) => {
        const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
        // Acoustic guitar resting against tree/bench
        ctx.fillStyle = '#b5651d';
        ctx.beginPath(); ctx.ellipse(28, 32, 14, 10, 0.45, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3d2314';
        ctx.beginPath(); ctx.arc(28, 32, 4, 0, Math.PI * 2); ctx.fill();
        // Neck & vibrating strings
        ctx.strokeStyle = '#5c3822'; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(34, 25); ctx.lineTo(46, 12); ctx.stroke();
        ctx.strokeStyle = frame === 1 ? '#ffffff' : 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(34, 25 + (frame ? 1 : 0)); ctx.lineTo(46, 12); ctx.stroke();
      });
    });

    // --- Dedicated Rakin Sprite (Earnest DU Student with Roses & Apology Letter: 4-Frame Walk) ---
    [0, 1, 2, 3].forEach(step => {
      makeTex(`npc-rakin-${step}`, 52, 58, ctx => {
        const bob = (step === 1 || step === 3) ? -1.8 : 0;
        const lLeg = step === 0 ? 2.5 : (step === 2 ? -2.2 : 0);
        const rLeg = step === 2 ? 2.5 : (step === 0 ? -2.2 : 0);
        const lFoot = step === 0 ? 2.0 : (step === 2 ? -1.2 : 0);
        const rFoot = step === 2 ? 2.0 : (step === 0 ? -1.2 : 0);
        const armSwing = step === 0 ? 2.2 : (step === 2 ? -2.2 : 0);
        const cx = 26;

        // 1. Double-Layer Contact Ground Shadow
        ctx.fillStyle = 'rgba(12, 8, 20, 0.12)';
        ctx.beginPath();
        ctx.ellipse(cx, 53, (step % 2 === 0) ? 13 : 11.5, (step % 2 === 0) ? 4.2 : 3.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(12, 8, 20, 0.28)';
        ctx.beginPath();
        ctx.ellipse(cx, 53, (step % 2 === 0) ? 8.5 : 7.2, (step % 2 === 0) ? 2.5 : 2.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Dark Slim-Fit Chinos & Polished Leather Oxford Shoes
        ctx.fillStyle = '#1c2430';
        ctx.fillRect(cx - 6.5, 39 + lLeg, 5, 10);
        ctx.fillRect(cx + 1.5, 39 + rLeg, 5, 10);
        ctx.fillStyle = '#0f172a'; // Inseam shadow
        ctx.fillRect(cx - 2, 39 + Math.min(lLeg, rLeg), 4, 3);
        // Polished chestnut leather Oxford shoes
        ctx.fillStyle = '#3b2219';
        ctx.beginPath();
        ctx.ellipse(cx - 4, 50.5 + lFoot, 3.8, 2, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 4, 50.5 + rFoot, 3.8, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#67402c'; // Leather gloss highlight
        ctx.fillRect(cx - 5.2, 49.5 + lFoot, 2.5, 1);
        ctx.fillRect(cx + 2.8, 49.5 + rFoot, 2.5, 1);

        // 3. Tailored Navy-Blue Silk Panjabi with Silver Embroidery
        ctx.fillStyle = '#172554'; // Outer shadow fold
        ctx.beginPath();
        ctx.roundRect(cx - 8.5, 23 + bob, 17, 18, 2.5);
        ctx.fill();
        ctx.fillStyle = '#1e3a8a'; // Main rich royal navy fabric
        ctx.fillRect(cx - 7.5, 23.5 + bob, 15, 17);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'; // Fabric luster
        ctx.fillRect(cx + 2, 23.5 + bob, 5, 14);

        // Silver Embroidery along Mandarin Collar & Front Placket
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(cx - 1, 23.5 + bob, 2, 11);
        ctx.fillRect(cx - 3.5, 23.5 + bob, 7, 1.8);
        ctx.fillStyle = '#94a3b8'; // Silver buttons
        ctx.fillRect(cx - 0.6, 26 + bob, 1.2, 1.2);
        ctx.fillRect(cx - 0.6, 29 + bob, 1.2, 1.2);
        ctx.fillRect(cx - 0.6, 32 + bob, 1.2, 1.2);

        // 4. Sleeves, Forearms, Wristwatch & Hands
        const lArmX = cx - 11.5 + (armSwing * -0.5);
        const rArmX = cx + 8 + (armSwing * 0.5);
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(lArmX, 24 + bob, 3.5, 9);
        ctx.fillRect(rArmX, 24 + bob, 3.5, 9);
        ctx.fillStyle = '#f0c4a5';
        ctx.fillRect(lArmX + 0.2, 33 + bob, 3.2, 4);
        ctx.fillRect(rArmX + 0.2, 33 + bob, 3.2, 4);
        // Silver Watch on Left Wrist
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(lArmX, 33 + bob, 3.5, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(lArmX + 1, 33.5 + bob, 1.5, 1);

        // 5. Neck, Head, Nervous/Earnest Expression
        ctx.fillStyle = '#dfaa78';
        ctx.fillRect(cx - 2.5, 20 + bob, 5, 4);
        ctx.fillStyle = '#f5cfb0';
        ctx.beginPath(); ctx.arc(cx, 15.2 + bob, 7.8, 0, Math.PI * 2); ctx.fill();

        // Earnest, slightly worried dark eyes with catchlight & slight nervous sweat bead
        ctx.fillStyle = '#1f1614';
        ctx.fillRect(cx - 4.5, 13.8 + bob, 2.2, 2.2);
        ctx.fillRect(cx + 2.3, 13.8 + bob, 2.2, 2.2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 4.2, 14 + bob, 1, 1);
        ctx.fillRect(cx + 2.6, 14 + bob, 1, 1);
        // Nervous sweat bead near right temple
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(cx + 6.2, 12.8 + bob, 1.4, 2);

        // Gentle, apologetic smile / closed lips
        ctx.fillStyle = '#b55d52';
        ctx.fillRect(cx - 1.8, 18.2 + bob, 3.6, 1.2);

        // 6. Styled DU Student Hair (Side-swept dark fringe with sheen)
        ctx.fillStyle = '#1c1817';
        ctx.beginPath();
        ctx.arc(cx, 11.5 + bob, 8.2, Math.PI, 0);
        ctx.fill();
        // Swept-over fringe across forehead
        ctx.beginPath();
        ctx.moveTo(cx - 8, 11.5 + bob);
        ctx.quadraticCurveTo(cx, 6.5 + bob, cx + 8.5, 12.5 + bob);
        ctx.lineTo(cx + 7, 9.5 + bob);
        ctx.quadraticCurveTo(cx, 4.5 + bob, cx - 7, 9.5 + bob);
        ctx.closePath();
        ctx.fill();
        // Hair sheen
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(cx - 3, 7.5 + bob, 6, 1.5);

        // 7. Signature Items: Fresh Red Rose Bouquet & Heart-Sealed Apology Letter!
        // Bouquet of Blooming Red Roses in Right Hand
        ctx.fillStyle = '#d4a373'; // Kraft paper wrapping
        ctx.beginPath();
        ctx.moveTo(cx + 8, 36 + bob); ctx.lineTo(cx + 15, 25 + bob); ctx.lineTo(cx + 17, 30 + bob);
        ctx.closePath(); ctx.fill();
        // Pink silk ribbon bow
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(cx + 10.5, 33 + bob, 3, 2);
        // Rose blossoms and emerald leaves
        ctx.fillStyle = '#15803d'; // Leaves
        ctx.fillRect(cx + 11, 23 + bob, 2.5, 2.5);
        ctx.fillRect(cx + 15, 25 + bob, 2.5, 2.5);
        [
          [12, 24], [10, 22], [14, 23], [12, 20], [15, 21]
        ].forEach(([rx, ry]) => {
          ctx.fillStyle = '#b91c1c';
          ctx.beginPath(); ctx.arc(cx + rx, ry + bob, 2.6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ef4444'; // Petal highlight
          ctx.fillRect(cx + rx - 0.8, ry - 0.8 + bob, 1.3, 1.3);
        });

        // Apology Letter with Red Wax Heart Seal in Left Hand
        ctx.fillStyle = '#fefce8'; // Linen parchment
        ctx.fillRect(cx - 14, 32 + bob, 7.5, 5.5);
        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 0.8;
        ctx.strokeRect(cx - 14, 32 + bob, 7.5, 5.5);
        // Crimson Wax Heart Seal
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(cx - 11, 34 + bob, 2.5, 2.5);
      });
    });

    /**
     * @asset-spec
     * @id npc-rakin
     * @external-png assets/sprites/characters/npc_rakin.png
     * @fallback-procedural npc-rakin (52x58)
     * @grid-footprint 1x1 tile (20x14px foot collision base)
     * @visual-size 32x48px (or 16x32px native upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
     */
    makeTex('npc-rakin', 52, 58, ctx => {
      const tex = scene.textures.get('npc-rakin-0');
      if (tex) ctx.drawImage(tex.getSourceImage(), 0, 0);
    });

    // --- Rakin Acoustic Guitar Concert Sprites (2-Frame Singing & Strumming Animation) ---
    [0, 1].forEach(frame => {
      makeTex(`npc-rakin-guitar-${frame}`, 56, 60, ctx => {
        const bob = frame === 1 ? -1.4 : 0;
        const cx = 28;

        // 1. Contact Ground Shadow
        ctx.fillStyle = 'rgba(12, 8, 20, 0.26)';
        ctx.beginPath();
        ctx.ellipse(cx, 54, 11.5, 3.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Dark Slim-Fit Chinos & Polished Leather Oxford Shoes
        ctx.fillStyle = '#1c2430';
        ctx.fillRect(cx - 6.5, 40, 5, 10);
        ctx.fillRect(cx + 1.5, 40, 5, 10);
        ctx.fillStyle = '#3b2219';
        ctx.beginPath();
        ctx.ellipse(cx - 4, 51.5, 3.8, 2, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 4, 51.5, 3.8, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3. Tailored Navy-Blue Silk Panjabi with Silver Embroidery
        ctx.fillStyle = '#172554';
        ctx.beginPath();
        ctx.roundRect(cx - 8.5, 23 + bob, 17, 18, 2.5);
        ctx.fill();
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(cx - 7.5, 23.5 + bob, 15, 17);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(cx - 1, 23.5 + bob, 2, 9);

        // 4. Leather Guitar Strap Across Shoulder
        ctx.strokeStyle = '#5c3822';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(cx - 6, 24 + bob);
        ctx.lineTo(cx + 6, 37 + bob);
        ctx.stroke();

        // 5. Handcrafted Sunburst Acoustic Guitar Slung Across Chest
        ctx.save();
        ctx.translate(cx - 1, 35 + bob);
        ctx.rotate(-0.28);
        // Guitar lower & upper bouts
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.ellipse(-3, 1, 9.5, 7, 0, 0, Math.PI * 2);
        ctx.ellipse(4, 0, 6.8, 5.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d97706'; // Honey sunburst top
        ctx.beginPath();
        ctx.ellipse(-3, 1, 8, 5.6, 0, 0, Math.PI * 2);
        ctx.ellipse(4, 0, 5.5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Soundhole & mother-of-pearl rosette
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0.5, 3.2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(0, 0.5, 2.4, 0, Math.PI * 2);
        ctx.fill();
        // Rosewood bridge
        ctx.fillStyle = '#3b2219';
        ctx.fillRect(-6.5, -1.8, 2, 4.5);
        // Mahogany neck & fretboard
        ctx.fillStyle = '#451a03';
        ctx.fillRect(8, -1.6, 13, 3.2);
        // Headstock & silver tuning pegs
        ctx.fillStyle = '#29150c';
        ctx.fillRect(20.5, -2.2, 4, 4.2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(21, -3.2, 3, 1);
        ctx.fillRect(21, 2, 3, 1);
        // Vibrating acoustic strings
        ctx.strokeStyle = frame === 1 ? '#ffffff' : 'rgba(254, 240, 138, 0.85)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(-5, -0.5);
        ctx.lineTo(20, -0.5 + (frame === 1 ? 0.6 : -0.4));
        ctx.moveTo(-5, 1.2);
        ctx.lineTo(20, 1.2 + (frame === 1 ? -0.6 : 0.4));
        ctx.stroke();
        ctx.restore();

        // 6. Left Strumming Hand & Right Chord-Fretting Hand
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(cx - 11.5, 24.5 + bob, 3.5, 7.5);
        ctx.fillRect(cx + 8, 24.5 + bob, 3.5, 7);
        // Strumming hand over soundhole (moves down/up with frame)
        ctx.fillStyle = '#f0c4a5';
        ctx.fillRect(cx - 5, 31.5 + bob + (frame === 1 ? 2.2 : -1.0), 3.6, 3.6);
        // Fretting hand on guitar neck
        ctx.fillRect(cx + 10.5, 28.5 + bob + (frame === 1 ? -0.8 : 0.5), 3.5, 3.5);

        // 7. Neck, Head & Soulful Singing Expression
        ctx.fillStyle = '#dfaa78';
        ctx.fillRect(cx - 2.5, 20 + bob, 5, 4);
        ctx.fillStyle = '#f5cfb0';
        ctx.beginPath();
        ctx.arc(cx, 15.2 + bob, 7.8, 0, Math.PI * 2);
        ctx.fill();

        // Eyes (passionate closed eyes on frame 1, warm sparkling eyes on frame 0)
        ctx.fillStyle = '#1f1614';
        if (frame === 1) {
          ctx.fillRect(cx - 4.8, 14.5 + bob, 2.8, 1.1);
          ctx.fillRect(cx + 2.0, 14.5 + bob, 2.8, 1.1);
        } else {
          ctx.fillRect(cx - 4.5, 13.8 + bob, 2.2, 2.2);
          ctx.fillRect(cx + 2.3, 13.8 + bob, 2.2, 2.2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cx - 4.2, 14 + bob, 1, 1);
          ctx.fillRect(cx + 2.6, 14 + bob, 1, 1);
        }

        // Singing mouth (open oval singing on frame 1, warm melodic smile on frame 0)
        ctx.fillStyle = '#991b1b';
        if (frame === 1) {
          ctx.beginPath();
          ctx.ellipse(cx, 18.5 + bob, 2.0, 1.5, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(cx - 2.0, 18.2 + bob, 4.0, 1.3);
        }

        // 8. Styled DU Student Hair
        ctx.fillStyle = '#1c1817';
        ctx.beginPath();
        ctx.arc(cx, 11.5 + bob, 8.2, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx - 8, 11.5 + bob);
        ctx.quadraticCurveTo(cx, 6.5 + bob, cx + 8.5, 12.5 + bob);
        ctx.lineTo(cx + 7, 9.5 + bob);
        ctx.quadraticCurveTo(cx, 4.5 + bob, cx - 7, 9.5 + bob);
        ctx.closePath();
        ctx.fill();
      });
    });

    // Wandering Dhaka Citizens (Fuller Road, TSC, Curzon, Dhanmondi Lake)
    makeWalkerNPC('npc-walker1',  '#2d5a3c', '#1c1917', '#bfa07a', 'physics');  // Arif (DU Physics Senior)
    makeWalkerNPC('npc-walker2',  '#c2593f', '#26150f', '#f59e0b', 'sketcher'); // Nadia (Charukola Sketcher)
    makeWalkerNPC('npc-walker3',  '#1e293b', '#262626', '#881337', 'poet');     // Baki Bhai (Nilkhet Poet)
    makeWalkerNPC('npc-photo',    '#1d4ed8', '#1c1917', '#f97316', 'photo');    // Sami (Street Photographer)
    makeWalkerNPC('npc-jogger',   '#e11d48', '#271610', '#fb7185', 'jogger');   // Tania (Dhanmondi Jogger)

    // Dedicated Realm Guardians & Guides (Worlds 2 to 6)
    /**
     * @asset-spec
     * @id npc-sage
     * @external-png assets/sprites/characters/npc_sage.png
     * @fallback-procedural npc-sage (52x58)
     * @grid-footprint 1x1 tile (20x14px foot collision base)
     * @visual-size 32x48px (or 16x32px native upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
     */
    makeWalkerNPC('npc-sage',       '#166534', '#e2e8f0', '#4ade80', 'sage');       // Elder Banyan Sage

    /**
     * @asset-spec
     * @id npc-marina
     * @external-png assets/sprites/characters/npc_marina.png
     * @fallback-procedural npc-marina (52x58)
     * @grid-footprint 1x1 tile (20x14px foot collision base)
     * @visual-size 32x48px (or 16x32px native upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
     */
    makeWalkerNPC('npc-marina',     '#0d9488', '#5eead4', '#f43f5e', 'marina');     // Tidekeeper Marina

    /**
     * @asset-spec
     * @id npc-kael
     * @external-png assets/sprites/characters/npc_kael.png
     * @fallback-procedural npc-kael (52x58)
     * @grid-footprint 1x1 tile (20x14px foot collision base)
     * @visual-size 32x48px (or 16x32px native upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
     */
    makeWalkerNPC('npc-kael',       '#451a03', '#c2410c', '#f97316', 'kael');       // Master Blacksmith Kael

    /**
     * @asset-spec
     * @id npc-lyra
     * @external-png assets/sprites/characters/npc_lyra.png
     * @fallback-procedural npc-lyra (52x58)
     * @grid-footprint 1x1 tile (20x14px foot collision base)
     * @visual-size 32x48px (or 16x32px native upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
     */
    makeWalkerNPC('npc-lyra',       '#1e1b4b', '#93c5fd', '#facc15', 'lyra');       // Astronomer Lyra

    /**
     * @asset-spec
     * @id npc-chronicler
     * @external-png assets/sprites/characters/npc_chronicler.png
     * @fallback-procedural npc-chronicler (52x58)
     * @grid-footprint 1x1 tile (20x14px foot collision base)
     * @visual-size 32x48px (or 16x32px native upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
     */
    makeWalkerNPC('npc-chronicler', '#581c87', '#e9d5ff', '#fde047', 'chronicler'); // Celestial Chronicler

    // Dedicated Sprite for Anamika (Moon Walker's Bestie & Star Kebab Partner: 4-Frame Walk)
    /**
     * @asset-spec
     * @id npc-anamika
     * @external-png assets/sprites/characters/npc_anamika.png
     * @fallback-procedural npc-anamika (52x58)
     * @grid-footprint 1x1 tile (20x14px foot collision base)
     * @visual-size 32x48px (or 16x32px native upscaled 2x)
     * @origin 0.5, 0.88
     * @frames 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
     */
    [0, 1, 2, 3].forEach(step => {
      makeTex(`npc-anamika-${step}`, 52, 58, ctx => {
        const bob = (step === 1 || step === 3) ? -1.8 : 0;
        const lLeg = step === 0 ? 2.5 : (step === 2 ? -2.2 : 0);
        const rLeg = step === 2 ? 2.5 : (step === 0 ? -2.2 : 0);
        const lFoot = step === 0 ? 2.0 : (step === 2 ? -1.2 : 0);
        const rFoot = step === 2 ? 2.0 : (step === 0 ? -1.2 : 0);
        const armSwing = step === 0 ? 2.2 : (step === 2 ? -2.2 : 0);
        const flutter = step === 1 ? 1.8 : (step === 3 ? -1.8 : (step === 0 ? -0.9 : 0.9));
        const cx = 26;

        // 1. Two-Tone Contact Ground Shadow
        ctx.fillStyle = 'rgba(12, 8, 20, 0.12)';
        ctx.beginPath();
        ctx.ellipse(cx, 53, (step % 2 === 0) ? 13 : 11.5, (step % 2 === 0) ? 4.2 : 3.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(12, 8, 20, 0.28)';
        ctx.beginPath();
        ctx.ellipse(cx, 53, (step % 2 === 0) ? 8.5 : 7.2, (step % 2 === 0) ? 2.5 : 2.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Flowing Wavy Dark-Auburn Hair Layer
        ctx.fillStyle = '#26150f';
        ctx.beginPath();
        ctx.ellipse(cx, 16.5 + bob, 11, 12, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - 8.5, 23.5 + bob, 4.8, 8.5, 0.2, 0, Math.PI * 2);
        ctx.ellipse(cx + 8.5, 23.5 + bob, 4.8, 8.5, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // 3. Cream Silk Palazzo Pants & Heeled Sandals
        ctx.fillStyle = '#fefce8';
        ctx.fillRect(cx - 6.5, 39 + lLeg, 5.2, 10);
        ctx.fillRect(cx + 1.5, 39 + rLeg, 5.2, 10);
        ctx.fillStyle = '#facc15'; // Gold embroidered hem border
        ctx.fillRect(cx - 6.5, 48 + lLeg, 5.2, 1.5);
        ctx.fillRect(cx + 1.5, 48 + rLeg, 5.2, 1.5);

        // Elegant Feet & Heeled Sandals
        ctx.fillStyle = '#f5cfb0';
        ctx.fillRect(cx - 4.8, 49.5 + lFoot, 3.8, 2.5);
        ctx.fillRect(cx + 1.2, 49.5 + rFoot, 3.8, 2.5);
        ctx.fillStyle = '#7c2d12'; // Strappy leather heels
        ctx.fillRect(cx - 5.2, 51.5 + lFoot, 4.4, 1.5);
        ctx.fillRect(cx + 0.8, 51.5 + rFoot, 4.4, 1.5);

        // 4. Emerald-Teal Jamdani Kurti & Mustard-Gold Chiffon Dupatta
        ctx.fillStyle = '#0f766e'; // Main emerald-teal fabric
        ctx.beginPath();
        ctx.roundRect(cx - 8.5, 23 + bob, 17, 19, 2.5);
        ctx.fill();
        ctx.fillStyle = '#115e59'; // Side slit shadow
        ctx.fillRect(cx - 8.5, 35 + bob, 2.5, 7);
        ctx.fillRect(cx + 6, 35 + bob, 2.5, 7);
        ctx.fillStyle = '#fde047'; // Embroidered hem border & floral bootis
        ctx.fillRect(cx - 8.5, 41 + bob, 17, 1.6);
        ctx.fillRect(cx - 5, 28 + bob, 1.5, 1.5);
        ctx.fillRect(cx + 3.5, 28 + bob, 1.5, 1.5);
        ctx.fillRect(cx - 5, 34 + bob, 1.5, 1.5);
        ctx.fillRect(cx + 3.5, 34 + bob, 1.5, 1.5);

        // Mustard-Gold Chiffon Dupatta Floating Across Chest & Side
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(cx - 8, 23 + bob); ctx.lineTo(cx - 3, 23 + bob);
        ctx.lineTo(cx + 8.5, 35 + bob); ctx.lineTo(cx + 7, 39 + bob);
        ctx.lineTo(cx - 8.5, 27 + bob);
        ctx.closePath(); ctx.fill();
        // Trailing fluttering dupatta tail
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(cx - 10, 24 + bob, 3.5, 16 + flutter);
        ctx.fillStyle = '#fef08a'; // Gold lace border on dupatta
        ctx.fillRect(cx - 10, 39 + bob + flutter, 3.5, 1.5);

        // 5. Sleeves, Hands & Signature Props (Glowing Smartphone + Star Kebab Box)
        const lArmX = cx - 11.5 + (armSwing * -0.5);
        const rArmX = cx + 8 + (armSwing * 0.5);
        ctx.fillStyle = '#0f766e';
        ctx.fillRect(lArmX, 24 + bob, 3.5, 8.5);
        ctx.fillRect(rArmX, 24 + bob, 3.5, 8.5);
        ctx.fillStyle = '#f5cfb0';
        ctx.fillRect(lArmX + 0.2, 32.5 + bob, 3.2, 4);
        ctx.fillRect(rArmX + 0.2, 32.5 + bob, 3.2, 4);
        // Gold Bangles on Wrists
        ctx.fillStyle = '#facc15';
        ctx.fillRect(lArmX, 32 + bob, 3.5, 1.2);
        ctx.fillRect(rArmX, 32 + bob, 3.5, 1.2);

        // Left Hand: Smartphone glowing with Shuvra's Video Call & Heart
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(lArmX - 2.5, 29 + bob, 4.8, 7.5);
        ctx.fillStyle = '#38bdf8'; // Glowing call screen
        ctx.fillRect(lArmX - 1.8, 30 + bob, 3.6, 5);
        ctx.fillStyle = '#f43f5e'; // Pink heart notification emoji!
        ctx.fillRect(lArmX - 0.8, 31.5 + bob, 1.8, 1.8);

        // Right Hand: Authentic Star Kebab Takeout Box with Steam
        ctx.fillStyle = '#fdf6e2'; // Star Kebab parcel box
        ctx.fillRect(rArmX + 1.5, 33 + bob, 7, 7.5);
        ctx.fillStyle = '#dc2626'; // Star Kebab red emblem
        ctx.beginPath(); ctx.arc(rArmX + 5, 36.5 + bob, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d97706'; // Gold ribbon tie
        ctx.fillRect(rArmX + 1.5, 36 + bob, 7, 1);
        // Rising fragrant steam
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(rArmX + 3.5 + flutter * 0.4, 28 + bob, 1.5, 3.5);

        // 6. Neck, Radiant Smiling Face & Flowing Bangs
        ctx.fillStyle = '#dfaa78';
        ctx.fillRect(cx - 2.5, 20 + bob, 5, 4);
        ctx.fillStyle = '#f5cfb0';
        ctx.beginPath(); ctx.arc(cx, 15.2 + bob, 7.8, 0, Math.PI * 2); ctx.fill();

        // Cat-Eye Kohl Liner, Dark Eyes, Catchlights & Cheerful Blush
        ctx.fillStyle = '#18181b';
        ctx.fillRect(cx - 4.5, 13.5 + bob, 2.5, 2.2);
        ctx.fillRect(cx + 2, 13.5 + bob, 2.5, 2.2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 4.2, 13.8 + bob, 1, 1);
        ctx.fillRect(cx + 2.4, 13.8 + bob, 1, 1);
        ctx.fillStyle = 'rgba(244, 63, 94, 0.35)'; // Rosy peach blush
        ctx.beginPath();
        ctx.arc(cx - 4.5, 16.5 + bob, 1.6, 0, Math.PI * 2);
        ctx.arc(cx + 4.5, 16.5 + bob, 1.6, 0, Math.PI * 2);
        ctx.fill();
        // Warm radiant smile
        ctx.fillStyle = '#e11d48';
        ctx.beginPath(); ctx.arc(cx, 17.5 + bob, 2.4, 0, Math.PI); ctx.fill();

        // Parted Hair Bangs & Gold Barrette Clip
        ctx.fillStyle = '#26150f';
        ctx.beginPath();
        ctx.arc(cx, 11 + bob, 8, Math.PI, 0);
        ctx.fill();
        // Side bangs sweeping down
        ctx.fillRect(cx - 8, 11 + bob, 2.5, 4);
        ctx.fillRect(cx + 5.5, 11 + bob, 2.5, 4);
        // Gold barrette hair clip
        ctx.fillStyle = '#facc15';
        ctx.fillRect(cx - 7, 9.5 + bob, 3.2, 1.4);
        // Dangling gold jhumka earrings with emerald drops
        ctx.fillStyle = '#facc15';
        ctx.beginPath(); ctx.arc(cx - 7, 16.5 + bob, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 7, 16.5 + bob, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#10b981';
        ctx.fillRect(cx - 7.5, 17.5 + bob, 1.2, 1.5);
        ctx.fillRect(cx + 6.3, 17.5 + bob, 1.2, 1.5);
      });
    });

    makeTex('npc-anamika', 52, 58, ctx => {
      const tex = scene.textures.get('npc-anamika-0');
      if (tex) ctx.drawImage(tex.getSourceImage(), 0, 0);
    });

    // Mimi the Campus Ginger Tabby Cat (4-Frame Walk: Mackerel Stripes, Swishing Tail, White Paws, Bell)
    [0, 1, 2, 3].forEach(step => {
      makeTex(`npc-cat-${step}`, 42, 36, ctx => {
        const bob = (step === 1 || step === 3) ? -1.2 : 0;
        const tailWag = step === 0 ? -2.2 : (step === 1 ? 0 : (step === 2 ? 2.5 : 0.8));
        // Stepping paw offsets for realistic 4-beat cat trot
        const flPaw = step === 0 ? -1.8 : (step === 2 ? 1.5 : 0);
        const frPaw = step === 2 ? -1.8 : (step === 0 ? 1.5 : 0);
        const blPaw = step === 3 ? -1.5 : (step === 1 ? 1.2 : 0);
        const brPaw = step === 1 ? -1.5 : (step === 3 ? 1.2 : 0);

        // Ground shadow (stretches and contracts with trot)
        ctx.fillStyle = 'rgba(12, 8, 20, 0.22)';
        ctx.beginPath();
        ctx.ellipse(21, 31, (step % 2 === 0) ? 12 : 10.5, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Upright Curving Ginger Tail with White Tip & Swish
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(11, 21 + bob);
        ctx.quadraticCurveTo(5, 13 + bob, 7 + tailWag, 7 + bob);
        ctx.stroke();
        // Dark ginger stripe on tail
        ctx.strokeStyle = '#9a3412'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(9, 17 + bob); ctx.lineTo(8, 14 + bob); ctx.stroke();
        // White fluffy tail tip
        ctx.fillStyle = '#fffbeb';
        ctx.beginPath(); ctx.arc(7 + tailWag, 7 + bob, 2, 0, Math.PI * 2); ctx.fill();

        // 4 Stepping White Paws / Mittens
        ctx.fillStyle = '#fffbeb';
        ctx.fillRect(10.5, 25 + blPaw, 3.5, 5); // Back Left
        ctx.fillRect(15.5, 25 + brPaw, 3.5, 5); // Back Right
        ctx.fillRect(22.5, 25 + flPaw, 3.5, 5); // Front Left
        ctx.fillRect(27.5, 25 + frPaw, 3.5, 5); // Front Right

        // Plump Ginger Body & Cream Belly
        ctx.fillStyle = '#ea580c';
        ctx.beginPath(); ctx.ellipse(20, 21 + bob, 10.5, 6.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fffbeb'; // Cream underbelly bib
        ctx.beginPath(); ctx.ellipse(20, 24 + bob, 7.8, 3.2, 0, 0, Math.PI * 2); ctx.fill();

        // Dark Russet Tabby Mackerel Stripes along Spine & Flank
        ctx.fillStyle = '#9a3412';
        ctx.fillRect(14, 15.5 + bob, 2, 5);
        ctx.fillRect(18, 15 + bob, 2.2, 5.5);
        ctx.fillRect(22, 15.5 + bob, 2, 5);
        ctx.fillRect(25.5, 17 + bob, 1.8, 4);

        // Cat Head & Pointed Ears with Pink Inner Cartilage
        ctx.fillStyle = '#ea580c';
        ctx.beginPath(); ctx.arc(29, 15.2 + bob, 6.8, 0, Math.PI * 2); ctx.fill();
        // Ears
        ctx.beginPath();
        ctx.moveTo(24, 12 + bob); ctx.lineTo(25, 5 + bob); ctx.lineTo(29, 9.5 + bob);
        ctx.moveTo(29, 9.5 + bob); ctx.lineTo(33.5, 5 + bob); ctx.lineTo(34.5, 12 + bob);
        ctx.fill();
        // Inner ears
        ctx.fillStyle = '#f4a9c0';
        ctx.fillRect(25.5, 7.5 + bob, 1.8, 2.8);
        ctx.fillRect(31.8, 7.5 + bob, 1.8, 2.8);
        // White ear tufts
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(25, 10 + bob, 1, 1.5);
        ctx.fillRect(33, 10 + bob, 1, 1.5);

        // Emerald Cat Eyes, Pink Nose, Whisker Dots & White Muzzle
        ctx.fillStyle = '#fffbeb'; // White muzzle pad
        ctx.beginPath(); ctx.ellipse(30.5, 17.5 + bob, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#15803d'; // Luminous emerald green eyes
        ctx.fillRect(27, 13.8 + bob, 2.2, 2.4);
        ctx.fillRect(31.5, 13.8 + bob, 2.2, 2.4);
        ctx.fillStyle = '#ffffff'; // Eye glint
        ctx.fillRect(27.2, 14 + bob, 1, 1);
        ctx.fillRect(31.7, 14 + bob, 1, 1);
        ctx.fillStyle = '#fb7185'; // Tiny pink triangular nose
        ctx.fillRect(29.8, 16.5 + bob, 1.6, 1.2);
        // Whiskers
        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(33, 17.5 + bob); ctx.lineTo(38, 16.5 + bob);
        ctx.moveTo(33, 18.5 + bob); ctx.lineTo(38, 19 + bob);
        ctx.stroke();

        // Red Leather Collar with Shiny Golden Bell
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(24.5, 19.5 + bob, 7.5, 1.8);
        ctx.fillStyle = '#facc15'; // Golden jingle bell
        ctx.beginPath(); ctx.arc(29.5, 21.5 + bob, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#78350f'; // Bell slit
        ctx.fillRect(29.2, 22.2 + bob, 0.8, 0.8);
      });
    });

    makeTex('npc-cat', 42, 36, ctx => {
      const tex = scene.textures.get('npc-cat-0');
      if (tex) ctx.drawImage(tex.getSourceImage(), 0, 0);
    });

    // --- World 2: Whispering Emerald Forest Spooky NPCs & Spirit Altar ---
    // 1. Ananya the Weeping Petni (4-Frame Floating Ethereal Ghost)
    [0, 1, 2, 3].forEach(step => {
      makeTex(`npc-ananya-ghost-${step}`, 54, 66, ctx => {
        const floatY = Math.sin((step / 4) * Math.PI * 2) * 3.5;
        const driftX = Math.cos((step / 4) * Math.PI * 2) * 1.5;
        const cx = 27 + driftX;

        // Ethereal Aura Glow
        ctx.fillStyle = 'rgba(52, 211, 153, 0.15)';
        ctx.beginPath(); ctx.ellipse(cx, 32 + floatY, 22, 28, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(167, 243, 208, 0.25)';
        ctx.beginPath(); ctx.ellipse(cx, 32 + floatY, 15, 20, 0, 0, Math.PI * 2); ctx.fill();

        // Spectral Ground Motes (No physical shadow, glowing wisps)
        ctx.fillStyle = 'rgba(110, 231, 183, 0.35)';
        ctx.beginPath(); ctx.ellipse(cx, 60, 14 + step, 3, 0, 0, Math.PI * 2); ctx.fill();

        // Flowing Pale Mint / Mist Jamdani Saree
        ctx.fillStyle = 'rgba(209, 250, 229, 0.85)';
        ctx.beginPath();
        ctx.moveTo(cx - 9, 24 + floatY);
        ctx.quadraticCurveTo(cx - 14, 46 + floatY, cx - 10 + step, 56 + floatY);
        ctx.quadraticCurveTo(cx, 59 + floatY, cx + 11 - step, 56 + floatY);
        ctx.quadraticCurveTo(cx + 14, 46 + floatY, cx + 9, 24 + floatY);
        ctx.closePath();
        ctx.fill();

        // Translucent Pale Torso & Draped Saree Pallu
        ctx.fillStyle = '#ecfdf5';
        ctx.fillRect(cx - 6, 20 + floatY, 12, 12);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.45)';
        ctx.beginPath();
        ctx.moveTo(cx - 6, 20 + floatY);
        ctx.lineTo(cx + 7, 30 + floatY);
        ctx.lineTo(cx + 5, 42 + floatY);
        ctx.lineTo(cx - 7, 28 + floatY);
        ctx.closePath();
        ctx.fill();

        // Drifting Dark Spectral Hair (Floating in spirit currents)
        ctx.fillStyle = '#064e3b';
        ctx.beginPath();
        ctx.ellipse(cx, 14 + floatY, 8.5, 9, 0, 0, Math.PI * 2);
        ctx.moveTo(cx - 7, 14 + floatY);
        ctx.quadraticCurveTo(cx - 15, 26 + floatY, cx - 12 - step, 40 + floatY);
        ctx.quadraticCurveTo(cx + 15, 26 + floatY, cx + 7, 14 + floatY);
        ctx.fill();

        // Pale Spectral Face & Weeping Eyes
        ctx.fillStyle = '#f0fdf4';
        ctx.beginPath(); ctx.arc(cx, 14 + floatY, 6.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#047857'; // Eerie glowing eyes
        ctx.fillRect(cx - 3.5, 13 + floatY, 2, 2.2);
        ctx.fillRect(cx + 1.5, 13 + floatY, 2, 2.2);
        ctx.fillStyle = '#6ee7b7'; // Glowing tears
        ctx.fillRect(cx - 3, 16 + floatY, 1.2, 3);
        ctx.fillRect(cx + 2, 16 + floatY, 1.2, 3);

        // Phantom Silver Lantern in Hands
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(cx + 9, 28 + floatY, 5, 7);
        ctx.fillStyle = '#34d399'; // Emerald flame
        ctx.beginPath(); ctx.arc(cx + 11.5, 31.5 + floatY, 2.5, 0, Math.PI * 2); ctx.fill();
      });
    });
    makeTex('npc-ananya-ghost', 54, 66, ctx => {
      const tex = scene.textures.get('npc-ananya-ghost-0');
      if (tex) ctx.drawImage(tex.getSourceImage(), 0, 0);
    });

    // 2. Kofil Chacha & The Phantom Rickshaw (4-Frame Spectral Stepping)
    [0, 1, 2, 3].forEach(step => {
      makeTex(`npc-kofil-ghost-${step}`, 74, 66, ctx => {
        const bob = (step === 1 || step === 3) ? -1.5 : 0;
        const lLeg = step === 0 ? 2.5 : (step === 2 ? -2.5 : 0);
        const rLeg = step === 2 ? 2.5 : (step === 0 ? -2.5 : 0);

        // Phantom Rickshaw Wheel & Chassis (Left Side)
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(22, 46, 16, 0, Math.PI * 2); ctx.stroke();
        // Rickshaw Spokes
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          ctx.beginPath(); ctx.moveTo(22, 46);
          ctx.lineTo(22 + Math.cos(a + step * 0.2) * 16, 46 + Math.sin(a + step * 0.2) * 16);
          ctx.stroke();
        }
        // Rickshaw Hood & Passenger Seat
        ctx.fillStyle = 'rgba(14, 116, 144, 0.55)';
        ctx.beginPath();
        ctx.roundRect(8, 22, 28, 22, 4);
        ctx.fill();
        // Brass rickshaw bell on handlebar
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath(); ctx.arc(42, 34 + bob, 2.8, 0, Math.PI * 2); ctx.fill();

        // Kofil Chacha Pulling Rickshaw (Right Side)
        const cx = 54;
        // Legs & Checked Lungi
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(cx - 5, 42 + lLeg, 4, 12);
        ctx.fillRect(cx + 1, 42 + rLeg, 4, 12);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.55)'; // Checked pattern
        ctx.fillRect(cx - 6, 34 + bob, 12, 11);

        // Weathered Vest & Gamchha / Muffler
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(cx - 5, 23 + bob, 10, 12);
        ctx.fillStyle = '#f43f5e'; // Red gamchha around neck
        ctx.fillRect(cx - 6, 21 + bob, 12, 3.5);

        // Head, White Beard & Flat Cap
        ctx.fillStyle = '#bae6fd';
        ctx.beginPath(); ctx.arc(cx, 14 + bob, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e2e8f0'; // Wispy white beard
        ctx.beginPath(); ctx.ellipse(cx, 17.5 + bob, 3.5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#334155'; // Wool flat cap
        ctx.fillRect(cx - 6, 9 + bob, 12, 3);
        ctx.fillRect(cx - 2, 7 + bob, 8, 3);

        // Friendly Spectral Blue Eyes
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(cx - 2.5, 13 + bob, 1.8, 1.8);
        ctx.fillRect(cx + 1.5, 13 + bob, 1.8, 1.8);
      });
    });
    makeTex('npc-kofil-ghost', 74, 66, ctx => {
      const tex = scene.textures.get('npc-kofil-ghost-0');
      if (tex) ctx.drawImage(tex.getSourceImage(), 0, 0);
    });

    // 3. Prof. Shamsher (DU Occult Investigator with Radio EMF Scanner)
    [0, 1, 2, 3].forEach(step => {
      makeTex(`npc-shamsher-investigator-${step}`, 54, 62, ctx => {
        const bob = (step === 1 || step === 3) ? -1.5 : 0;
        const lLeg = step === 0 ? 2 : (step === 2 ? -2 : 0);
        const rLeg = step === 2 ? 2 : (step === 0 ? -2 : 0);
        const cx = 27;

        // Ground shadow
        ctx.fillStyle = 'rgba(12, 8, 20, 0.25)';
        ctx.beginPath(); ctx.ellipse(cx, 56, 12, 3.5, 0, 0, Math.PI * 2); ctx.fill();

        // Trousers & Oxford Shoes
        ctx.fillStyle = '#334155';
        ctx.fillRect(cx - 5.5, 42 + lLeg, 4.5, 11);
        ctx.fillRect(cx + 1, 42 + rLeg, 4.5, 11);

        // Tweed Investigator Coat & Knit Sweater
        ctx.fillStyle = '#78350f'; // Tweed trench coat
        ctx.fillRect(cx - 8, 25 + bob, 16, 19);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(cx - 6.5, 26 + bob, 13, 17);
        // White shirt collar & mustard tie
        ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 2.5, 25 + bob, 5, 4);
        ctx.fillStyle = '#ca8a04'; ctx.fillRect(cx - 1, 28 + bob, 2, 7);

        // Head, Salt & Pepper Hair, Glasses & Mustachio
        ctx.fillStyle = '#d4a383';
        ctx.beginPath(); ctx.arc(cx, 16 + bob, 6.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#475569'; // Grey parted hair
        ctx.fillRect(cx - 7, 10 + bob, 14, 4);
        ctx.fillRect(cx - 7.5, 12 + bob, 3, 5);
        // Wireframe Round Glasses
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 1;
        ctx.strokeRect(cx - 5.5, 14 + bob, 4, 3);
        ctx.strokeRect(cx + 1.5, 14 + bob, 4, 3);
        ctx.beginPath(); ctx.moveTo(cx - 1.5, 15.5 + bob); ctx.lineTo(cx + 1.5, 15.5 + bob); ctx.stroke();
        // Scholarly Mustache
        ctx.fillStyle = '#334155'; ctx.fillRect(cx - 3.5, 19 + bob, 7, 1.8);

        // Handheld Cathode Vacuum EMF Radio Scanner
        ctx.fillStyle = '#1e293b'; // Bakelite casing
        ctx.fillRect(cx + 8, 30 + bob, 8, 12);
        // Antenna
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(cx + 12, 30 + bob); ctx.lineTo(cx + 12, 18 + bob); ctx.stroke();
        // Glowing Green Oscilloscope / Meter
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(cx + 9.5, 32 + bob, 5, 4);
        ctx.fillStyle = '#ef4444'; // Signal blip
        ctx.fillRect(cx + 11.5, 33 + bob, 1.5, 1.5);
      });
    });
    makeTex('npc-shamsher-investigator', 54, 62, ctx => {
      const tex = scene.textures.get('npc-shamsher-investigator-0');
      if (tex) ctx.drawImage(tex.getSourceImage(), 0, 0);
    });

    // 4. Ancient Spirit Altar Prop (World 2 Centerpiece)
    makeTex('prop-spirit-altar', 68, 62, ctx => {
      // Ground Shadow
      ctx.fillStyle = 'rgba(12, 8, 20, 0.35)';
      ctx.beginPath(); ctx.ellipse(34, 56, 28, 5.5, 0, 0, Math.PI * 2); ctx.fill();

      // Ancient Weathered Stone Pedestal
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(10, 44, 48, 12);
      ctx.fillStyle = '#334155';
      ctx.fillRect(14, 32, 40, 14);
      ctx.fillStyle = '#475569';
      ctx.fillRect(8, 24, 52, 9);

      // Carved Emerald Runes
      ctx.fillStyle = '#34d399';
      [18, 26, 34, 42, 50].forEach(rx => {
        ctx.fillRect(rx, 27, 2, 4);
        ctx.fillRect(rx - 1, 29, 4, 1);
      });

      // Sacred Incense Vessel & Glowing Spirit Hearth
      ctx.fillStyle = '#78350f';
      ctx.beginPath(); ctx.ellipse(34, 22, 12, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a855f7'; // Purple flame core
      ctx.beginPath(); ctx.arc(34, 18, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c084fc';
      ctx.beginPath(); ctx.arc(34, 16, 2.5, 0, Math.PI * 2); ctx.fill();

      // Flanking Incense Candles
      [16, 52].forEach(cx => {
        ctx.fillStyle = '#fde047'; ctx.fillRect(cx - 1.5, 19, 3, 6);
        ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(cx, 17, 1.8, 0, Math.PI * 2); ctx.fill();
      });
    });


  }
}
