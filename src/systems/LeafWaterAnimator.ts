// src/systems/LeafWaterAnimator.ts - Procedural Leaf Fall Aerodynamics & Multi-Layer Water Surface Animator
import Phaser from 'phaser';
import { DateState } from '../state/DateState';

export interface FallingLeafParticle {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseScale: number;
  phase: number;
  swayFreq: number;
  swayAmp: number;
  tumbleFreq: number;
  spinSpeed: number;
  targetGroundY: number;
  state: 'falling' | 'settled';
  settleTimer: number;
  fromCanopy: boolean;
}

export interface FoamStripEntry {
  sprite: Phaser.GameObjects.TileSprite;
  baseX: number;
  baseY: number;
  isVertical: boolean;
  phase: number;
}

export interface CausticLayerEntry {
  sprite: Phaser.GameObjects.TileSprite;
  speedX: number;
  speedY: number;
  phase: number;
}

export class LeafWaterAnimator {
  public static initWorldEffects(scene: any, worldId: string, mapW: number, mapH: number): void {
    scene.fallingLeaves = [] as FallingLeafParticle[];
    scene.treeCanopyCoords = scene.treeCanopyCoords || ([] as Array<{ x: number; y: number; tex: string }>);
    scene.waterCausticLayers = [] as CausticLayerEntry[];
    scene.waterFoamStrips = [] as FoamStripEntry[];
    scene.nextCanopyDropTime = 0;
    scene.nextAmbientRippleTime = 0;

    // 1. Attach Multi-Layer Caustic Shimmer Overlays onto all water bodies
    const allWaters: Phaser.GameObjects.TileSprite[] = [];
    if (scene.lakeWater && scene.lakeWater.active) {
      allWaters.push(scene.lakeWater);
    }
    if (Array.isArray(scene.extraWaterSprites)) {
      scene.extraWaterSprites.forEach((ws: any) => {
        if (ws && ws.active) allWaters.push(ws);
      });
    }

    if (scene.textures.exists('water-caustic-overlay')) {
      allWaters.forEach((ws, idx) => {
        // Skip tiny strips or lava
        if (ws.texture?.key === 'tile-lava') return;
        const isShallow = ws.texture?.key === 'tile-water-shallow';
        const caustic = scene.add
          .tileSprite(ws.x, ws.y, ws.width, ws.height, 'water-caustic-overlay')
          .setDepth((ws.depth || 1) + 0.08)
          .setAlpha(isShallow ? 0.28 : 0.22);
        if (worldId === 'forest') caustic.setTint(0x6ee7b7);
        else if (worldId === 'sunken') caustic.setTint(0x7dd3fc);
        else if (worldId === 'frost') caustic.setTint(0xe0f2fe);
        else if (worldId === 'astral') caustic.setTint(0xd8b4fe);

        scene.waterCausticLayers.push({
          sprite: caustic,
          speedX: (idx % 2 === 0 ? -1 : 1) * (isShallow ? 0.0055 : 0.0042),
          speedY: isShallow ? -0.0038 : -0.005,
          phase: idx * 1.15
        });
      });
    }

    // 2. Attach Animated Shoreline Lapping Foam Strips along Dhaka & Farmhouse water edges
    if (worldId === 'dhaka' && scene.textures.exists('water-foam-h')) {
      const addFoamH = (x: number, y: number, w: number, phase = 0) => {
        const fs = scene.add.tileSprite(x, y, w, 12, 'water-foam-h').setDepth(1.85).setAlpha(0.68);
        scene.waterFoamStrips.push({ sprite: fs, baseX: x, baseY: y, isVertical: false, phase });
      };
      const addFoamV = (x: number, y: number, h: number, phase = 0) => {
        const fs = scene.add.tileSprite(x, y, 12, h, 'water-foam-v').setDepth(1.85).setAlpha(0.68);
        scene.waterFoamStrips.push({ sprite: fs, baseX: x, baseY: y, isVertical: true, phase });
      };

      // Dhanmondi Lake embankments & ghats
      addFoamV(1582, 1280, 436, 0.2);
      addFoamH(2064, 942, 656, 0.9);
      addFoamH(1840, 968, 124, 1.4); // North Shiri Ghat lapping surf
      addFoamV(1610, 1184, 124, 2.1); // West Shiri Ghat lapping surf
      addFoamV(1454, 1652, 280, 2.8);

      // Upper Ramna Lotus Pond
      addFoamH(1968, 398, 212, 0.5);
      addFoamH(1968, 516, 212, 1.7);
      addFoamV(1868, 456, 132, 1.1);
      addFoamV(2068, 456, 132, 2.3);

      // Curzon Botanical Lotus Pond (Shapla Dighi)
      addFoamH(1216, 1262, 244, 0.8);
      addFoamH(1216, 1394, 244, 2.0);
      addFoamV(1100, 1328, 144, 1.5);
      addFoamV(1332, 1328, 144, 2.9);
    } else if (worldId === 'farmhouse' && scene.textures.exists('water-foam-h')) {
      const fsTop = scene.add.tileSprite(820, 616, 224, 12, 'water-foam-h').setDepth(2.2).setAlpha(0.65);
      const fsBot = scene.add.tileSprite(820, 784, 224, 12, 'water-foam-h').setDepth(2.2).setAlpha(0.65);
      scene.waterFoamStrips.push(
        { sprite: fsTop, baseX: 820, baseY: 616, isVertical: false, phase: 0.4 },
        { sprite: fsBot, baseX: 820, baseY: 784, isVertical: false, phase: 1.9 }
      );
    }

    // 3. Initialize Falling Leaves Pool (34 textured leaves with ground shadows)
    const leafKeys = this.getLeafTexturesForWorld(scene, worldId);
    const leafCount = worldId === 'curzon_interior' ? 14 : 34;

    for (let i = 0; i < leafCount; i++) {
      const leaf = this.createLeafParticle(scene, worldId, mapW, mapH, leafKeys, true);
      scene.fallingLeaves.push(leaf);
    }
  }

  public static getLeafTexturesForWorld(scene: any, worldId: string): string[] {
    const candidates: Record<string, string[]> = {
      dhaka: ['leaf-krishnachura', 'leaf-krishnachura', 'leaf-krishna-pinna', 'leaf-banyan', 'leaf-autumn', 'leaf-lotus-petal'],
      curzon_interior: ['leaf-krishnachura', 'leaf-lotus-petal', 'leaf-autumn'],
      farmhouse: ['leaf-krishnachura', 'leaf-banyan', 'leaf-autumn', 'leaf-krishna-pinna', 'leaf-lotus-petal'],
      forest: ['leaf-banyan', 'leaf-krishna-pinna', 'leaf-autumn', 'leaf-banyan'],
      sunken: ['leaf-lotus-petal', 'leaf-banyan', 'leaf-krishna-pinna'],
      ember: ['leaf-ember', 'leaf-autumn'],
      frost: ['leaf-frost'],
      astral: ['leaf-astral', 'leaf-lotus-petal']
    };
    const list = candidates[worldId] || candidates.dhaka;
    return list.filter(k => scene.textures.exists(k));
  }

  private static createLeafParticle(
    scene: any,
    worldId: string,
    mapW: number,
    mapH: number,
    leafKeys: string[],
    randomInitialHeight: boolean
  ): FallingLeafParticle {
    const tex = leafKeys.length > 0 ? Phaser.Math.RND.pick(leafKeys) : 'leaf-krishnachura';
    const trees: Array<{ x: number; y: number; tex: string }> = scene.treeCanopyCoords || [];
    const spawnFromCanopy = trees.length > 0 && Math.random() < 0.58;

    let startX = Phaser.Math.Between(60, Math.max(120, mapW - 60));
    let startY = randomInitialHeight
      ? Phaser.Math.Between(40, Math.max(120, mapH - 80))
      : Phaser.Math.Between(20, Math.max(80, mapH - 220));
    let targetGroundY = Math.min(mapH - 24, startY + Phaser.Math.Between(140, 310));

    if (spawnFromCanopy) {
      const tree = Phaser.Math.RND.pick(trees);
      startX = tree.x + Phaser.Math.Between(-38, 38);
      const crownTopY = tree.y - Phaser.Math.Between(62, 98);
      const groundY = tree.y + Phaser.Math.Between(-6, 26);
      startY = randomInitialHeight ? Phaser.Math.Between(crownTopY, groundY) : crownTopY;
      targetGroundY = Math.min(mapH - 20, groundY);
    }

    const baseScale = Phaser.Math.FloatBetween(0.82, 1.18);
    const shadow = scene.add
      .ellipse(startX, targetGroundY, 7 * baseScale, 3.5 * baseScale, 0x0f172a, 0.14)
      .setDepth(3.4);
    const sprite = scene.add
      .sprite(startX, startY, tex)
      .setOrigin(0.5, 0.5)
      .setScale(baseScale)
      .setAlpha(0.92)
      .setDepth(2420);

    return {
      sprite,
      shadow,
      x: startX,
      y: startY,
      vx: Phaser.Math.FloatBetween(-16, -5),
      vy: Phaser.Math.FloatBetween(14, 26),
      baseScale,
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      swayFreq: Phaser.Math.FloatBetween(0.0024, 0.0042),
      swayAmp: Phaser.Math.FloatBetween(0.45, 0.95),
      tumbleFreq: Phaser.Math.FloatBetween(0.0032, 0.0058),
      spinSpeed: Phaser.Math.FloatBetween(-28, 28),
      targetGroundY,
      state: 'falling',
      settleTimer: 0,
      fromCanopy: spawnFromCanopy
    };
  }

  private static resetLeafParticle(
    scene: any,
    leaf: FallingLeafParticle,
    worldId: string,
    mapW: number,
    mapH: number
  ): void {
    const leafKeys = this.getLeafTexturesForWorld(scene, worldId);
    if (leafKeys.length > 0) {
      leaf.sprite.setTexture(Phaser.Math.RND.pick(leafKeys));
    }
    const trees: Array<{ x: number; y: number; tex: string }> = scene.treeCanopyCoords || [];
    const spawnFromCanopy = trees.length > 0 && Math.random() < 0.62;

    if (spawnFromCanopy) {
      const tree = Phaser.Math.RND.pick(trees);
      leaf.x = tree.x + Phaser.Math.Between(-38, 38);
      leaf.y = tree.y - Phaser.Math.Between(64, 98);
      leaf.targetGroundY = Math.min(mapH - 20, tree.y + Phaser.Math.Between(-4, 28));
      leaf.fromCanopy = true;
    } else {
      const cam = scene.cameras?.main;
      if (cam && Math.random() < 0.7) {
        leaf.x = Phaser.Math.Clamp(
          cam.scrollX + Phaser.Math.Between(-60, cam.width + 120),
          40,
          Math.max(80, mapW - 40)
        );
        leaf.y = Phaser.Math.Clamp(
          cam.scrollY + Phaser.Math.Between(-40, Math.floor(cam.height * 0.45)),
          20,
          Math.max(60, mapH - 180)
        );
      } else {
        leaf.x = Phaser.Math.Between(50, Math.max(100, mapW - 50));
        leaf.y = Phaser.Math.Between(20, Math.max(80, mapH - 220));
      }
      leaf.targetGroundY = Math.min(mapH - 20, leaf.y + Phaser.Math.Between(150, 310));
      leaf.fromCanopy = false;
    }

    leaf.vx = Phaser.Math.FloatBetween(-16, -5);
    leaf.vy = Phaser.Math.FloatBetween(14, 26);
    leaf.phase = Phaser.Math.FloatBetween(0, Math.PI * 2);
    leaf.state = 'falling';
    leaf.settleTimer = 0;
    leaf.sprite.setPosition(leaf.x, leaf.y).setAlpha(0).setDepth(2420);
    leaf.shadow.setPosition(leaf.x, leaf.targetGroundY).setAlpha(0.08);
  }

  /**
   * Detaches a burst of fluttering leaves directly from a tree crown (or world coordinate)
   */
  public static spawnCanopyLeafDrop(
    scene: any,
    treeX: number,
    treeY: number,
    count = 5,
    customLeafKeys?: string[]
  ): void {
    const worldId = scene.currentWorldId || DateState.currentWorld || 'dhaka';
    const leafKeys = customLeafKeys || this.getLeafTexturesForWorld(scene, worldId);
    if (leafKeys.length === 0) return;

    for (let i = 0; i < count; i++) {
      const tex = Phaser.Math.RND.pick(leafKeys);
      const startX = treeX + Phaser.Math.Between(-34, 34);
      const startY = treeY - Phaser.Math.Between(56, 92);
      const landX = startX + Phaser.Math.Between(-48, 26);
      const landY = treeY + Phaser.Math.Between(-6, 22);

      const sp = scene.add
        .sprite(startX, startY, tex)
        .setOrigin(0.5, 0.5)
        .setDepth(2425)
        .setScale(Phaser.Math.FloatBetween(0.85, 1.2));

      const dur = Phaser.Math.Between(1350, 2100);
      const phase = Math.random() * Math.PI * 2;

      scene.tweens.add({
        targets: sp,
        x: landX,
        y: landY,
        angle: Phaser.Math.Between(-160, 160),
        duration: dur,
        ease: 'Sine.easeInOut',
        onUpdate: (tween: Phaser.Tweens.Tween) => {
          const p = tween.progress;
          const sway = Math.sin(p * Math.PI * 3.5 + phase) * 14 * (1 - p * 0.5);
          sp.x = Phaser.Math.Linear(startX, landX, p) + sway;
          sp.scaleX = Math.cos(p * Math.PI * 4 + phase) * 0.95;
          sp.scaleY = 0.72 + Math.sin(p * Math.PI * 3 + phase) * 0.28;
        },
        onComplete: () => {
          if (!sp.active) return;
          sp.setDepth(3.6);
          sp.setScale(0.95, 0.62);
          scene.tweens.add({
            targets: sp,
            alpha: 0,
            delay: Phaser.Math.Between(700, 1300),
            duration: 500,
            onComplete: () => sp.destroy()
          });
        }
      });
    }
  }

  /**
   * Sweeps an aerodynamic gust of textured leaves & Krishnachura blossoms across the camera
   */
  public static triggerLeafWindGust(scene: any): void {
    const worldId = scene.currentWorldId || DateState.currentWorld || 'dhaka';
    const leafKeys = this.getLeafTexturesForWorld(scene, worldId);
    if (leafKeys.length === 0) return;

    const cam = scene.cameras.main;
    const startX = cam.scrollX - 40;
    const count = Phaser.Math.Between(14, 20);

    // Rustle visible tree canopies during the wind gust
    if (Array.isArray(scene.overheadCanopies)) {
      scene.overheadCanopies.forEach((c: any) => {
        if (c.sprite && c.sprite.active && c.sprite.texture?.key?.includes('tree')) {
          scene.tweens.add({
            targets: c.sprite,
            angle: { from: -3.2, to: 3.8 },
            duration: 260,
            yoyo: true,
            repeat: 2,
            ease: 'Sine.easeInOut'
          });
        }
      });
    }

    for (let i = 0; i < count; i++) {
      const tex = Phaser.Math.RND.pick(leafKeys);
      const sx = startX - Phaser.Math.Between(0, 160);
      const sy = cam.scrollY + Phaser.Math.Between(20, cam.height - 20);
      const leaf = scene.add
        .sprite(sx, sy, tex)
        .setOrigin(0.5, 0.5)
        .setDepth(2700)
        .setAlpha(0.92)
        .setScale(Phaser.Math.FloatBetween(0.85, 1.25));

      const travelDist = cam.width + Phaser.Math.Between(180, 280);
      const driftY = Phaser.Math.Between(-35, 65);
      const duration = Phaser.Math.Between(1400, 2200);
      const phase = Math.random() * Math.PI * 2;
      const baseScale = leaf.scaleX;

      scene.tweens.add({
        targets: leaf,
        alpha: { from: 0.95, to: 0 },
        duration,
        ease: 'Sine.easeInOut',
        onUpdate: (tween: Phaser.Tweens.Tween) => {
          const p = tween.progress;
          leaf.x = sx + travelDist * p;
          leaf.y = sy + driftY * p + Math.sin(p * Math.PI * 4 + phase) * 18;
          leaf.angle = Math.sin(p * Math.PI * 5 + phase) * 42 + p * 220;
          leaf.scaleX = Math.cos(p * Math.PI * 6 + phase) * baseScale;
          leaf.scaleY = (0.68 + 0.32 * Math.sin(p * Math.PI * 4 + phase)) * baseScale;
        },
        onComplete: () => leaf.destroy()
      });
    }
  }

  /**
   * Per-frame update for multi-layer water waves, caustic shimmer, shoreline foam, reflections, and falling leaves
   */
  public static update(scene: any, time: number, delta: number): void {
    const dt = delta / 1000;
    const worldId = scene.currentWorldId || DateState.currentWorld || 'dhaka';
    const mapW = scene.currentMapW || 2400;
    const mapH = scene.currentMapH || 1800;

    // 1. Multi-Layer Water Motion (Distinct deep vs shallow wave harmonics)
    if (scene.lakeWater && scene.lakeWater.active) {
      scene.lakeWater.tilePositionX = Math.sin(time * 0.0013) * 16 + Math.cos(time * 0.0007) * 6;
      scene.lakeWater.tilePositionY += delta * 0.0065;
    }

    if (Array.isArray(scene.extraWaterSprites)) {
      for (let i = 0; i < scene.extraWaterSprites.length; i++) {
        const ws = scene.extraWaterSprites[i];
        if (!ws || !ws.active) continue;
        const isShallow = ws.texture?.key === 'tile-water-shallow';
        if (isShallow) {
          ws.tilePositionX = Math.sin(time * 0.0018 + i * 0.7) * 10;
          ws.tilePositionY += delta * 0.0042;
        } else {
          ws.tilePositionX = Math.sin(time * 0.0013 + i * 0.5) * 14;
          ws.tilePositionY += delta * 0.006;
        }
      }
    }

    // 2. Counter-Scrolling Caustic Shimmer Overlays
    if (Array.isArray(scene.waterCausticLayers)) {
      for (const cl of scene.waterCausticLayers) {
        if (!cl.sprite || !cl.sprite.active) continue;
        cl.sprite.tilePositionX += delta * cl.speedX + Math.cos(time * 0.0016 + cl.phase) * 0.14;
        cl.sprite.tilePositionY += delta * cl.speedY;
        cl.sprite.setAlpha(0.16 + 0.11 * Math.sin(time * 0.0024 + cl.phase));
      }
    }

    // 3. Shoreline Lapping Foam Strips
    if (Array.isArray(scene.waterFoamStrips)) {
      for (const fs of scene.waterFoamStrips) {
        if (!fs.sprite || !fs.sprite.active) continue;
        const wave = Math.sin(time * 0.0028 + fs.phase);
        if (fs.isVertical) {
          fs.sprite.x = fs.baseX + wave * 2.2;
          fs.sprite.tilePositionY += delta * 0.007;
          fs.sprite.setScale(0.88 + 0.22 * ((wave + 1) * 0.5), 1);
        } else {
          fs.sprite.y = fs.baseY + wave * 2.2;
          fs.sprite.tilePositionX += delta * 0.007;
          fs.sprite.setScale(1, 0.88 + 0.22 * ((wave + 1) * 0.5));
        }
        fs.sprite.setAlpha(0.46 + 0.32 * ((wave + 1) * 0.5));
      }
    }

    // 4. Undulating Water Reflections (Boat & Pier)
    const rippleShear = Math.sin(time * 0.0038) * 0.035;
    if (scene.boatReflection && scene.boatReflection.active) {
      scene.boatReflection.setScale(1 + rippleShear, -0.7 + Math.cos(time * 0.003) * 0.025);
      if (scene.lakeBoatSprite) {
        scene.boatReflection.x = scene.lakeBoatSprite.x + Math.sin(time * 0.0042) * 1.8;
      }
    }
    if (scene.pierReflection && scene.pierReflection.active) {
      scene.pierReflection.tilePositionX = Math.sin(time * 0.0032) * 4;
      scene.pierReflection.setScale(1 - rippleShear * 0.6, -0.6 + Math.sin(time * 0.0026) * 0.02);
    }

    // 5. Periodic Ambient Water Surface Rings & Sunlight Glints
    if (time > (scene.nextAmbientRippleTime || 0)) {
      scene.nextAmbientRippleTime = time + Phaser.Math.Between(1100, 2200);
      if (worldId === 'dhaka' && typeof scene.spawnWaterRipple === 'function') {
        const spots = [
          { x: Phaser.Math.Between(1680, 2280), y: Phaser.Math.Between(1020, 1680) }, // Dhanmondi Lake
          { x: Phaser.Math.Between(1890, 2040), y: Phaser.Math.Between(410, 500) },   // Ramna Lotus Pond
          { x: Phaser.Math.Between(1120, 1310), y: Phaser.Math.Between(1280, 1380) }  // Botanical Lotus Pond
        ];
        const pick = Phaser.Math.RND.pick(spots);
        scene.spawnWaterRipple(pick.x, pick.y, Phaser.Math.Between(16, 26), 0);
      } else if (worldId === 'farmhouse' && typeof scene.spawnWaterRipple === 'function') {
        scene.spawnWaterRipple(
          Phaser.Math.Between(730, 910),
          Phaser.Math.Between(640, 760),
          Phaser.Math.Between(15, 22),
          0
        );
      }
    }

    // 6. Periodic Tree Canopy Leaf Detachment
    if (
      Array.isArray(scene.treeCanopyCoords) &&
      scene.treeCanopyCoords.length > 0 &&
      time > (scene.nextCanopyDropTime || 0)
    ) {
      scene.nextCanopyDropTime = time + Phaser.Math.Between(2800, 4800);
      const tree = Phaser.Math.RND.pick(scene.treeCanopyCoords) as { x: number; y: number } | undefined;
      if (tree) {
        this.spawnCanopyLeafDrop(scene, tree.x, tree.y, Phaser.Math.Between(2, 4));
      }
    }

    // 7. Update Aerodynamic Falling Leaves & Ground Settling
    if (Array.isArray(scene.fallingLeaves)) {
      const px = scene.player ? scene.player.x : -999;
      const py = scene.player ? scene.player.y : -999;

      for (const leaf of scene.fallingLeaves as FallingLeafParticle[]) {
        if (!leaf.sprite || !leaf.sprite.active) continue;

        if (leaf.state === 'falling') {
          const sway = Math.sin(time * leaf.swayFreq + leaf.phase) * leaf.swayAmp;
          leaf.x += leaf.vx * dt + sway;
          leaf.y += leaf.vy * dt;

          // Interactive swirl if player runs right through a low-altitude leaf
          const distToPlayer = Math.hypot(leaf.x - px, leaf.y - (py - 18));
          if (distToPlayer < 44 && leaf.targetGroundY - leaf.y < 90) {
            const pushAngle = Math.atan2(leaf.y - py, leaf.x - px);
            leaf.x += Math.cos(pushAngle) * 55 * dt;
            leaf.y -= 18 * dt;
            leaf.spinSpeed = 140;
          }

          // 3D leaf flutter / tumble via scaleX & scaleY oscillation + pendular angle
          const sx = Math.cos(time * leaf.tumbleFreq + leaf.phase) * leaf.baseScale;
          const sy = (0.7 + 0.3 * Math.sin(time * leaf.tumbleFreq * 1.3 + leaf.phase)) * leaf.baseScale;
          const rockAngle = Math.sin(time * leaf.swayFreq + leaf.phase) * 34 + leaf.spinSpeed * (time * 0.001);

          leaf.sprite.setPosition(leaf.x, leaf.y);
          leaf.sprite.setScale(sx, sy);
          leaf.sprite.setAngle(rockAngle);

          // Fade in smoothly at start of fall
          if (leaf.sprite.alpha < 0.92) {
            leaf.sprite.setAlpha(Math.min(0.92, leaf.sprite.alpha + dt * 1.8));
          }

          // Update ground shadow convergence as leaf nears targetGroundY
          const heightRemaining = Math.max(0, leaf.targetGroundY - leaf.y);
          const proximity = Phaser.Math.Clamp(1 - heightRemaining / 220, 0.15, 1);
          leaf.shadow.setPosition(leaf.x, Math.min(mapH - 10, leaf.y + heightRemaining * 0.35));
          leaf.shadow.setAlpha(0.06 + proximity * 0.18);
          leaf.shadow.setScale(0.6 + proximity * 0.45);

          // Check ground landing
          if (leaf.y >= leaf.targetGroundY) {
            leaf.y = leaf.targetGroundY;
            leaf.state = 'settled';
            leaf.settleTimer = Phaser.Math.Between(1200, 2300);
            leaf.sprite.setPosition(leaf.x, leaf.y);
            leaf.sprite.setDepth(3.6);
            leaf.sprite.setScale(leaf.baseScale * 0.95, leaf.baseScale * 0.62);
            leaf.shadow.setPosition(leaf.x, leaf.y + 1).setAlpha(0.22);
          } else if (leaf.x < 16 || leaf.y > mapH - 16) {
            this.resetLeafParticle(scene, leaf, worldId, mapW, mapH);
          }
        } else {
          // 'settled' on ground before gently fading out
          leaf.settleTimer -= delta;
          // If player walks over a settled leaf, kick it up!
          if (Math.hypot(leaf.x - px, leaf.y - py) < 34) {
            leaf.state = 'falling';
            leaf.targetGroundY = Math.min(mapH - 16, leaf.y + Phaser.Math.Between(24, 52));
            leaf.y -= 14;
            leaf.vx = (leaf.x >= px ? 1 : -1) * Phaser.Math.FloatBetween(24, 42);
            leaf.vy = Phaser.Math.FloatBetween(16, 24);
            leaf.sprite.setDepth(2420);
            continue;
          }

          if (leaf.settleTimer < 450) {
            const fade = Math.max(0, leaf.settleTimer / 450);
            leaf.sprite.setAlpha(fade * 0.9);
            leaf.shadow.setAlpha(fade * 0.2);
          }
          if (leaf.settleTimer <= 0) {
            this.resetLeafParticle(scene, leaf, worldId, mapW, mapH);
          }
        }
      }
    }
  }
}
