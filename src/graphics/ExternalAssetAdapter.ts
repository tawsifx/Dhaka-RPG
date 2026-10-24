// src/graphics/ExternalAssetAdapter.ts - Universal External Asset Normalizer & Procedural Bridge
// Provides auto-detection, nearest-neighbor 2x integer scaling, fallback binding, and animation slicing

import Phaser from 'phaser';
import { ASSET_SPECS_MANIFEST, AssetSpec, AssetCategory } from '../config/assetSpecs.manifest';

export class ExternalAssetAdapter {
  private static registeredErrorHandlers = new Set<Phaser.Scene>();
  private static normalizedScenes = new WeakSet<Phaser.Scene>();

  /**
   * Preload all external assets specified in ASSET_SPECS_MANIFEST.
   * Attaches graceful error listener so missing files never crash the Phaser loader or game loop.
   */
  static preloadExternalAssets(scene: Phaser.Scene): void {
    if (!this.registeredErrorHandlers.has(scene)) {
      this.registeredErrorHandlers.add(scene);

      scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: any) => {
        // Silently capture missing external asset; fallback procedural will be bound seamlessly
        console.info(`[ExternalAssetAdapter] Missing external asset "${file.key}" at "${file.url}". Seamless fallback guaranteed.`);
      });
    }

    for (const [id, spec] of Object.entries(ASSET_SPECS_MANIFEST)) {
      // Only request files from the network if marked as available external files.
      // Unintegrated / shopping list slots instantly bypass network requests and bind fallbacks.
      if (!spec.externalPath || !spec.hasExternalFile) continue;

      // Do not duplicate load if already loaded in this scene
      if (!scene.textures.exists(`ext-${id}`)) {
        scene.load.image(`ext-${id}`, spec.externalPath);
      }
      if (spec.hasAnimJson) {
        const animPath = spec.externalPath.replace(/\.png$/i, '.anim.json');
        scene.load.json(`anim-data-${id}`, animPath);
      }
    }
  }

  /**
   * Post-load normalization: inspects loaded external textures, performs integer 2x scaling
   * with nearest-neighbor interpolation (zero blur), slices frames, and registers animations.
   * If an asset failed to load or is a fallback slot, securely aliases the procedural fallback texture.
   */
  static normalizeLoadedAssets(scene: Phaser.Scene): void {
    if (this.normalizedScenes.has(scene)) return;
    this.normalizedScenes.add(scene);

    console.log('🔄 [ExternalAssetAdapter] Normalizing external assets & procedural bridges...');

    for (const [id, spec] of Object.entries(ASSET_SPECS_MANIFEST)) {
      const extKey = `ext-${id}`;
      const hasExternal = Boolean(spec.hasExternalFile && scene.textures.exists(extKey));

      if (hasExternal) {
        this.processExternalAsset(scene, id, extKey, spec);
      } else {
        this.bindProceduralFallback(scene, id, spec);
      }

      if (scene.cache.json.exists(`anim-data-${id}`)) {
        const animData = scene.cache.json.get(`anim-data-${id}`);
        this.registerJsonAnimations(scene, id, animData);
      }
    }

    console.log('✨ [ExternalAssetAdapter] All asset slots normalized and verified.');
  }

  /**
   * Registers animations from an authored .anim.json definition
   */
  private static registerJsonAnimations(scene: Phaser.Scene, id: string, animData: any): void {
    if (!animData || !animData.animations) return;
    for (const anim of animData.animations) {
      const animKey = `${id}-${anim.name}`;
      if (scene.anims.exists(animKey)) scene.anims.remove(animKey);

      const frames: Phaser.Types.Animations.AnimationFrame[] = [];
      if (Array.isArray(anim.frames)) {
        for (const f of anim.frames) {
          const fIdx = typeof f === 'number' ? f : f.index;
          const frameTextureKey = `${id}-${fIdx}`;
          if (scene.textures.exists(frameTextureKey)) {
            frames.push({ key: frameTextureKey });
          } else {
            frames.push({ key: id, frame: fIdx });
          }
        }
      }

      if (frames.length > 0) {
        scene.anims.create({
          key: animKey,
          frames,
          frameRate: anim.frameRate || 6,
          repeat: anim.loop ? -1 : 0
        });
      }
    }
  }

  /**
   * Process a successfully loaded external image:
   * Inspect native dimensions, apply nearest-neighbor 2x upscaling if 16px native,
   * slice frames, and register standard animation sets.
   */
  private static processExternalAsset(
    scene: Phaser.Scene,
    id: string,
    extKey: string,
    spec: AssetSpec
  ): void {
    const rawTex = scene.textures.get(extKey);
    const img = rawTex.getSourceImage() as HTMLImageElement;
    if (!img || !img.width || !img.height) return;

    const nativeW = img.width;
    const nativeH = img.height;
    const prefFrame = spec.recommendedDownloadSpecs.preferredFrameSize;

    // Detect if this asset requires 2x integer upscaling:
    // E.g., if native frame is 16px wide and preferred is 32px
    const needs2x =
      spec.recommendedDownloadSpecs.acceptedNativeSizes.some(s => s.includes('auto-2x')) &&
      (nativeW <= prefFrame.width || (spec.category === 'character' && nativeW <= 64));

    let workingKey = extKey;

    if (spec.category === 'character' || spec.category === 'companion') {
      const cleanedKey = `${id}-defringed`;
      const cleanCanvas = scene.textures.exists(cleanedKey)
        ? (scene.textures.get(cleanedKey) as any)
        : scene.textures.createCanvas(cleanedKey, nativeW, nativeH);

      if (cleanCanvas && cleanCanvas.getContext) {
        const cCtx = cleanCanvas.getContext();
        cCtx.imageSmoothingEnabled = false;
        cCtx.clearRect(0, 0, nativeW, nativeH);
        cCtx.drawImage(img, 0, 0, nativeW, nativeH);
        this.defringeSpriteSheetCanvas(cCtx, nativeW, nativeH);
        cleanCanvas.refresh();
        workingKey = cleanedKey;
      }
    }

    if (needs2x) {
      const upscaledKey = `${id}-upscaled-2x`;
      const upW = nativeW * 2;
      const upH = nativeH * 2;
      const srcImg = scene.textures.get(workingKey)?.getSourceImage() as HTMLImageElement | HTMLCanvasElement;

      let upCanvas = scene.textures.exists(upscaledKey)
        ? (scene.textures.get(upscaledKey) as any)
        : scene.textures.createCanvas(upscaledKey, upW, upH);

      if (upCanvas && srcImg) {
        const ctx = upCanvas.getContext();
        ctx.imageSmoothingEnabled = false; // Nearest-neighbor sharp pixel scaling
        ctx.clearRect(0, 0, upW, upH);
        ctx.drawImage(srcImg, 0, 0, upW, upH);
        upCanvas.refresh();
        workingKey = upscaledKey;
        console.log(`🔍 [ExternalAssetAdapter] Upscaled "${id}" 2x nearest-neighbor (${nativeW}x${nativeH} -> ${upW}x${upH}).`);
      }
    }

    // If character sheet or multi-frame entity, slice frames and register animations
    if (spec.category === 'character' || spec.category === 'companion') {
      this.sliceAndRegisterCharacterAnimations(scene, id, workingKey, spec);
    } else if (spec.category === 'enemy' || spec.category === 'boss') {
      this.sliceAndRegisterEnemyBossAnimations(scene, id, workingKey, spec);
    } else if (spec.category === 'crop') {
      this.sliceCropStages(scene, id, workingKey);
    } else {
      // Register primary key alias so scene.add.sprite(x, y, id) resolves directly
      this.createTextureAlias(scene, id, workingKey);
    }
  }

  /**
   * Removes residual white/light-grey background-removal border pixels sitting outside
   * dark character/companion outlines while preserving interior sclera/clothing pixels.
   */
  private static defringeSpriteSheetCanvas(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    if (typeof ctx.getImageData !== 'function' || typeof ctx.putImageData !== 'function') return;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    if (!data || data.length < width * height * 4) return;

    const total = width * height;
    const isCand = new Uint8Array(total);
    const isDark = new Uint8Array(total);
    const isTrans = new Uint8Array(total);

    for (let i = 0; i < total; i++) {
      const idx = i * 4;
      const a = data[idx + 3];
      if (a === 0) {
        isTrans[i] = 1;
        continue;
      }
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = (r + g + b) / 3;
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      if (lum < 80) {
        isDark[i] = 1;
      } else if (lum >= 115 && sat <= 25) {
        isCand[i] = 1;
      }
    }

    let modified = false;
    for (let pass = 0; pass < 2; pass++) {
      const toClear: number[] = [];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = y * width + x;
          if (!isCand[i]) continue;

          let touchesTrans = false;
          let touchesDark = false;
          let touchesInterior = false;

          const neighbors = [
            y > 0 ? (y - 1) * width + x : -1,
            y < height - 1 ? (y + 1) * width + x : -1,
            x > 0 ? y * width + (x - 1) : -1,
            x < width - 1 ? y * width + (x + 1) : -1
          ];

          for (const ni of neighbors) {
            if (ni === -1 || isTrans[ni]) {
              touchesTrans = true;
            } else if (isDark[ni]) {
              touchesDark = true;
            } else if (!isCand[ni]) {
              touchesInterior = true;
            }
          }

          if (touchesTrans && touchesDark && !touchesInterior) {
            toClear.push(i);
          }
        }
      }

      if (toClear.length === 0) break;
      modified = true;
      for (const i of toClear) {
        isCand[i] = 0;
        isTrans[i] = 1;
        const idx = i * 4;
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
      }
    }

    if (modified) {
      ctx.putImageData(imgData, 0, 0);
    }
  }

  /**
   * Slices 4-directional walk cycles (Down, Left, Right, Up) from 4x4 or 4-column sheets
   * and creates standard animation keys (${id}-idle, ${id}-walk-down, etc.)
   */
  private static sliceAndRegisterCharacterAnimations(
    scene: Phaser.Scene,
    id: string,
    texKey: string,
    spec: AssetSpec
  ): void {
    const tex = scene.textures.get(texKey);
    if (!tex) return;

    const img = tex.getSourceImage() as HTMLImageElement;
    const cols = 4;
    const rows = 4;
    const frameW = Math.floor(img.width / cols);
    const frameH = Math.floor(img.height / rows);

    // Only slice if dimensions divide cleanly
    if (frameW < 8 || frameH < 12) return;

    const dirNames = ['down', 'left', 'right', 'up'];

    // 1. Slice directional frames and register directional walk/idle anims
    for (let r = 0; r < rows; r++) {
      const dir = dirNames[r] || `row-${r}`;
      const animFrames: Phaser.Types.Animations.AnimationFrame[] = [];

      for (let c = 0; c < cols; c++) {
        const subFrameName = `${id}-${dir}-${c}`;
        const fx = c * frameW;
        const fy = r * frameH;

        if (!tex.has(subFrameName)) {
          tex.add(subFrameName, 0, fx, fy, frameW, frameH);
        }
        animFrames.push({ key: texKey, frame: subFrameName });
      }

      // Create walk cycle animation
      const walkAnimKey = `${id}-walk-${dir}`;
      if (scene.anims.exists(walkAnimKey)) scene.anims.remove(walkAnimKey);
      scene.anims.create({
        key: walkAnimKey,
        frames: animFrames,
        frameRate: 6,
        repeat: -1
      });

      // First frame of each row is that direction's idle frame
      const idleAnimKey = `${id}-idle-${dir}`;
      if (scene.anims.exists(idleAnimKey)) scene.anims.remove(idleAnimKey);
      scene.anims.create({
        key: idleAnimKey,
        frames: [animFrames[0]],
        frameRate: 1,
        repeat: 0
      });
    }

    // 2. Extract directional idle frame textures:
    // Row 0 = Down (${id}-0, ${id}-down)
    // Row 1 = Left (${id}-1, ${id}-left)
    // Row 2 = Right (${id}-2, ${id}-right)
    // Row 3 = Up (${id}-3, ${id}-up)
    const dirRowMap: Record<number, string> = { 0: 'down', 1: 'left', 2: 'right', 3: 'up' };
    for (let r = 0; r < rows; r++) {
      const dName = dirRowMap[r] || `row-${r}`;
      const dirIdleKey = `${id}-${r}`;
      let fCanvas: any = scene.textures.exists(dirIdleKey)
        ? scene.textures.get(dirIdleKey)
        : scene.textures.createCanvas(dirIdleKey, frameW, frameH);

      if (fCanvas && fCanvas.getContext) {
        const fCtx = fCanvas.getContext();
        fCtx.clearRect(0, 0, frameW, frameH);
        fCtx.imageSmoothingEnabled = false;
        fCtx.drawImage(img, 0, r * frameH, frameW, frameH, 0, 0, frameW, frameH);
        fCanvas.refresh();
      }
      this.createTextureAlias(scene, `${id}-${dName}`, dirIdleKey);
    }

    // Extract Row 0 walk cycle step frames for standard walk animation
    for (let c = 0; c < cols; c++) {
      const stepFrameKey = `${id}-step-${c}`;
      let sCanvas: any = scene.textures.exists(stepFrameKey)
        ? scene.textures.get(stepFrameKey)
        : scene.textures.createCanvas(stepFrameKey, frameW, frameH);

      if (sCanvas && sCanvas.getContext) {
        const sCtx = sCanvas.getContext();
        sCtx.clearRect(0, 0, frameW, frameH);
        sCtx.imageSmoothingEnabled = false;
        sCtx.drawImage(img, c * frameW, 0, frameW, frameH, 0, 0, frameW, frameH);
        sCanvas.refresh();
      }
    }

    // Alias primary key ${id} directly to ${id}-0 (Down idle) so scene.add.sprite(x, y, id) resolves to single frame
    this.createTextureAlias(scene, id, `${id}-0`);

    // 3. Register standard walk animation anim-${id} used by getOrCreateWalkAnim
    // CRITICAL: Uses Row 0 step frames so fallback walk animations step forward without 360-degree spinning!
    const standardAnimKey = `anim-${id}`;
    if (scene.anims.exists(standardAnimKey)) scene.anims.remove(standardAnimKey);
    scene.anims.create({
      key: standardAnimKey,
      frames: [
        { key: `${id}-step-0` },
        { key: `${id}-step-1` },
        { key: `${id}-step-2` },
        { key: `${id}-step-3` }
      ],
      frameRate: 5,
      repeat: -1
    });

    // 4. Player & Totoro specific walk animation bindings
    // Use Row 0 step frames (step-0..3) rather than directional row idle textures (0=down, 1=left, 2=right, 3=up)
    if (id === 'player') {
      if (scene.anims.exists('player-walk')) scene.anims.remove('player-walk');
      scene.anims.create({
        key: 'player-walk',
        frames: [
          { key: 'player-step-0' },
          { key: 'player-step-1' },
          { key: 'player-step-2' },
          { key: 'player-step-3' }
        ],
        frameRate: 6,
        repeat: -1
      });

      if (scene.anims.exists('player-idle')) scene.anims.remove('player-idle');
      scene.anims.create({
        key: 'player-idle',
        frames: [{ key: 'player-0' }],
        frameRate: 1,
        repeat: -1
      });
    }

    if (id === 'totoro') {
      if (scene.anims.exists('totoro-walk')) scene.anims.remove('totoro-walk');
      scene.anims.create({
        key: 'totoro-walk',
        frames: [
          { key: 'totoro-step-0' },
          { key: 'totoro-step-1' },
          { key: 'totoro-step-2' },
          { key: 'totoro-step-3' }
        ],
        frameRate: 4,
        repeat: -1
      });

      if (scene.anims.exists('totoro-idle')) scene.anims.remove('totoro-idle');
      scene.anims.create({
        key: 'totoro-idle',
        frames: [{ key: 'totoro-0' }],
        frameRate: 1,
        repeat: -1
      });
    }

    // Default global idle animation
    if (scene.anims.exists(`${id}-idle`)) scene.anims.remove(`${id}-idle`);
    scene.anims.create({
      key: `${id}-idle`,
      frames: [{ key: `${id}-0` }],
      frameRate: 1,
      repeat: -1
    });

    console.log(`🏃 [ExternalAssetAdapter] Sliced & registered 4-directional animations for "${id}".`);
  }

  /**
   * Slices 4x4 animated enemy and boss sheets (Row 0=Idle, Row 1=Move/Walk, Row 2=Attack, Row 3=Stagger/Hurt)
   * into 16 discrete sub-frame textures (${id}-0 through ${id}-15), aliasing primary ${id} to ${id}-0,
   * and registers anim-${id}, ${id}-idle, ${id}-walk, ${id}-attack, and ${id}-stagger animations.
   */
  private static sliceAndRegisterEnemyBossAnimations(
    scene: Phaser.Scene,
    id: string,
    texKey: string,
    spec: AssetSpec
  ): void {
    const tex = scene.textures.get(texKey);
    if (!tex) return;

    const img = tex.getSourceImage() as HTMLImageElement;
    const cols = 4;
    const rows = 4;
    const frameW = Math.floor(img.width / cols);
    const frameH = Math.floor(img.height / rows);

    if (frameW < 8 || frameH < 8) return;

    // Slice all 16 frames into canvas textures so scene.textures.exists(`${id}-${i}`) is true
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const frameIdx = r * cols + c;
        const subFrameName = `${id}-${frameIdx}`;
        const fx = c * frameW;
        const fy = r * frameH;

        if (!tex.has(subFrameName)) {
          tex.add(subFrameName, 0, fx, fy, frameW, frameH);
        }
        if (!tex.has(String(frameIdx))) {
          tex.add(String(frameIdx), 0, fx, fy, frameW, frameH);
        }

        let fCanvas: any = scene.textures.exists(subFrameName)
          ? scene.textures.get(subFrameName)
          : scene.textures.createCanvas(subFrameName, frameW, frameH);

        if (fCanvas && fCanvas.getContext) {
          const fCtx = fCanvas.getContext();
          fCtx.clearRect(0, 0, frameW, frameH);
          fCtx.imageSmoothingEnabled = false;
          fCtx.drawImage(img, fx, fy, frameW, frameH, 0, 0, frameW, frameH);
          fCanvas.refresh();
        }
      }
    }

    // Alias base texture ${id} directly to ${id}-0
    this.createTextureAlias(scene, id, `${id}-0`);

    // 1. anim-${id} (standard walk animation checked by DhakaValleyScene.getOrCreateWalkAnim)
    // Uses Row 1 frames 4, 5, 6, 7 (Walk/Stride)
    const standardAnimKey = `anim-${id}`;
    if (scene.anims.exists(standardAnimKey)) scene.anims.remove(standardAnimKey);
    scene.anims.create({
      key: standardAnimKey,
      frames: [
        { key: `${id}-4` },
        { key: `${id}-5` },
        { key: `${id}-6` },
        { key: `${id}-7` }
      ],
      frameRate: spec.category === 'boss' ? 5 : 6,
      repeat: -1
    });

    // 2. ${id}-idle: Row 0 frames 0, 1, 2, 3
    const idleKey = `${id}-idle`;
    if (scene.anims.exists(idleKey)) scene.anims.remove(idleKey);
    scene.anims.create({
      key: idleKey,
      frames: [
        { key: `${id}-0` },
        { key: `${id}-1` },
        { key: `${id}-2` },
        { key: `${id}-3` }
      ],
      frameRate: 4,
      repeat: -1
    });

    // 3. ${id}-walk: Row 1 frames 4, 5, 6, 7
    const walkKey = `${id}-walk`;
    if (scene.anims.exists(walkKey)) scene.anims.remove(walkKey);
    scene.anims.create({
      key: walkKey,
      frames: [
        { key: `${id}-4` },
        { key: `${id}-5` },
        { key: `${id}-6` },
        { key: `${id}-7` }
      ],
      frameRate: spec.category === 'boss' ? 5 : 6,
      repeat: -1
    });

    // 4. ${id}-attack: Row 2 frames 8, 9, 10, 11
    const attackKey = `${id}-attack`;
    if (scene.anims.exists(attackKey)) scene.anims.remove(attackKey);
    scene.anims.create({
      key: attackKey,
      frames: [
        { key: `${id}-8` },
        { key: `${id}-9` },
        { key: `${id}-10` },
        { key: `${id}-11` }
      ],
      frameRate: 6,
      repeat: 0
    });

    // 5. ${id}-stagger: Row 3 frames 12, 13, 14, 15
    const staggerKey = `${id}-stagger`;
    if (scene.anims.exists(staggerKey)) scene.anims.remove(staggerKey);
    scene.anims.create({
      key: staggerKey,
      frames: [
        { key: `${id}-12` },
        { key: `${id}-13` },
        { key: `${id}-14` },
        { key: `${id}-15` }
      ],
      frameRate: 5,
      repeat: -1
    });

    console.log(`👾 [ExternalAssetAdapter] Sliced & registered 4x4 combat animations for ${spec.category} "${id}".`);
  }

  /**
   * Slice 6 growth stages for crops (Seed, Sprout, Young, Flowering, Mature, Regrow)
   */
  private static sliceCropStages(scene: Phaser.Scene, id: string, texKey: string): void {
    const tex = scene.textures.get(texKey);
    if (!tex) return;

    const img = tex.getSourceImage() as HTMLImageElement;
    const stages = 6;
    const stageW = Math.floor(img.width / stages);
    const stageH = img.height;

    if (stageW < 8) return;

    for (let s = 0; s < stages; s++) {
      const stageFrameName = `${id}-stage-${s}`;
      const shortFrameName = `${id}-${s}`;
      if (!tex.has(stageFrameName)) {
        tex.add(stageFrameName, 0, s * stageW, 0, stageW, stageH);
      }
      if (!tex.has(shortFrameName)) {
        tex.add(shortFrameName, 0, s * stageW, 0, stageW, stageH);
      }
    }
  }

  /**
   * Fallback binding guarantee: If external PNG is missing:
   * 1. Safely binds existing procedural texture generated by TextureGenerator.ts (preserving existing fallbacks).
   * 2. For any slot with no PNG and no procedural texture yet, registers a flat, labeled placeholder
   *    rectangle (slot id + frame size) per Art Policy §0+, ensuring zero crashes.
   */
  private static bindProceduralFallback(scene: Phaser.Scene, id: string, spec: AssetSpec): void {
    const fallbackKey = spec.fallbackProceduralKey;

    if (scene.textures.exists(fallbackKey)) {
      this.createTextureAlias(scene, id, fallbackKey);
      this.createTextureAlias(scene, `${id}-0`, fallbackKey);
      this.createTextureAlias(scene, `${id}-down`, fallbackKey);
      return;
    }

    // Art Policy §0+: Flat, labeled placeholder rectangle (slot id + frame size)
    const pref = spec.recommendedDownloadSpecs?.preferredFrameSize;
    const w = (pref && pref.width) || 64;
    const h = (pref && pref.height) || 64;

    let canvas: any = scene.textures.exists(id)
      ? scene.textures.get(id)
      : scene.textures.createCanvas(id, w, h);

    if (canvas && canvas.getContext) {
      const ctx = canvas.getContext();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, w - 2, h - 2);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(id.slice(0, 11), w / 2, h / 2 - 5);
      ctx.fillText(`${w}x${h}`, w / 2, h / 2 + 7);

      canvas.refresh();
    }

    for (let i = 0; i < 16; i++) {
      this.createTextureAlias(scene, `${id}-${i}`, id);
    }
    this.createTextureAlias(scene, `${id}-down`, id);
    this.createTextureAlias(scene, `${id}-left`, id);
    this.createTextureAlias(scene, `${id}-right`, id);
    this.createTextureAlias(scene, `${id}-up`, id);
    this.createTextureAlias(scene, fallbackKey, id);

    if (!scene.anims.exists(`${id}-idle`)) {
      scene.anims.create({
        key: `${id}-idle`,
        frames: [{ key: id }],
        frameRate: 1,
        repeat: -1
      });
    }
  }

  /**
   * Helper to create a texture alias in Phaser's TextureManager
   */
  private static createTextureAlias(scene: Phaser.Scene, targetKey: string, sourceKey: string): void {
    if (targetKey === sourceKey) return;

    const sourceTex = scene.textures.get(sourceKey);
    if (!sourceTex) return;

    const img = sourceTex.getSourceImage();
    if (!img) return;

    let canvas: any = scene.textures.exists(targetKey)
      ? scene.textures.get(targetKey)
      : scene.textures.createCanvas(targetKey, img.width, img.height);

    if (canvas && canvas.getContext) {
      const ctx = canvas.getContext();
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, img.width, img.height);
      ctx.drawImage(img as any, 0, 0);
      canvas.refresh();
    }
  }

  /**
   * Resolve best active texture key for an entity: checks for normalized external texture,
   * otherwise seamlessly returns fallback procedural key.
   */
  static resolveTextureKey(scene: Phaser.Scene, id: string): string {
    if (scene.textures.exists(id)) return id;
    if (scene.textures.exists(`ext-${id}`)) return `ext-${id}`;

    const spec = ASSET_SPECS_MANIFEST[id];
    if (spec && scene.textures.exists(spec.fallbackProceduralKey)) {
      return spec.fallbackProceduralKey;
    }

    return id;
  }

  /**
   * Get Asset Specification entry by ID
   */
  static getSpec(id: string): AssetSpec | undefined {
    return ASSET_SPECS_MANIFEST[id];
  }

  /**
   * Get all registered Asset Specifications
   */
  static getAllSpecs(): AssetSpec[] {
    return Object.values(ASSET_SPECS_MANIFEST);
  }

  /**
   * Filter specifications by category
   */
  static getSpecsByCategory(category: AssetCategory): AssetSpec[] {
    return Object.values(ASSET_SPECS_MANIFEST).filter(s => s.category === category);
  }
}
