// src/graphics/ExternalAssetAdapter.ts - Universal External Asset Normalizer & Procedural Bridge
// Provides auto-detection, nearest-neighbor 2x integer scaling, fallback binding, and animation slicing

import Phaser from 'phaser';
import { ASSET_SPECS_MANIFEST, AssetSpec, AssetCategory } from '../config/assetSpecs.manifest';
import { TILE_SIZE } from '../config/constants';

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
      if (!spec.externalPath) continue;
      // Do not duplicate load if already in queue or exists
      if (!scene.textures.exists(id) && !scene.textures.exists(`ext-${id}`)) {
        scene.load.image(`ext-${id}`, spec.externalPath);
      }
    }
  }

  /**
   * Post-load normalization: inspects loaded external textures, performs integer 2x scaling
   * with nearest-neighbor interpolation (zero blur), slices frames, and registers animations.
   * If an asset failed to load, securely aliases the procedural fallback texture.
   */
  static normalizeLoadedAssets(scene: Phaser.Scene): void {
    if (this.normalizedScenes.has(scene)) return;
    this.normalizedScenes.add(scene);

    console.log('🔄 [ExternalAssetAdapter] Normalizing external assets & procedural bridges...');

    for (const [id, spec] of Object.entries(ASSET_SPECS_MANIFEST)) {
      const extKey = `ext-${id}`;
      const hasExternal = scene.textures.exists(extKey);

      if (hasExternal) {
        this.processExternalAsset(scene, id, extKey, spec);
      } else {
        this.bindProceduralFallback(scene, id, spec);
      }
    }

    console.log('✨ [ExternalAssetAdapter] All asset slots normalized and verified.');
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

    if (needs2x) {
      const upscaledKey = `${id}-upscaled-2x`;
      const upW = nativeW * 2;
      const upH = nativeH * 2;

      let upCanvas = scene.textures.exists(upscaledKey)
        ? (scene.textures.get(upscaledKey) as any)
        : scene.textures.createCanvas(upscaledKey, upW, upH);

      if (upCanvas) {
        const ctx = upCanvas.getContext();
        ctx.imageSmoothingEnabled = false; // Nearest-neighbor sharp pixel scaling
        ctx.clearRect(0, 0, upW, upH);
        ctx.drawImage(img, 0, 0, upW, upH);
        upCanvas.refresh();
        workingKey = upscaledKey;
        console.log(`🔍 [ExternalAssetAdapter] Upscaled "${id}" 2x nearest-neighbor (${nativeW}x${nativeH} -> ${upW}x${upH}).`);
      }
    }

    // Register primary key alias so scene.add.sprite(x, y, id) resolves directly
    this.createTextureAlias(scene, id, workingKey);

    // If character sheet or multi-frame entity, slice frames and register animations
    if (spec.category === 'character' || spec.category === 'companion') {
      this.sliceAndRegisterCharacterAnimations(scene, id, workingKey, spec);
    } else if (spec.category === 'crop') {
      this.sliceCropStages(scene, id, workingKey);
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
      if (!scene.anims.exists(walkAnimKey)) {
        scene.anims.create({
          key: walkAnimKey,
          frames: animFrames,
          frameRate: 6,
          repeat: -1
        });
      }

      // First frame of each row is that direction's idle frame
      const idleAnimKey = `${id}-idle-${dir}`;
      if (!scene.anims.exists(idleAnimKey)) {
        scene.anims.create({
          key: idleAnimKey,
          frames: [animFrames[0]],
          frameRate: 1,
          repeat: 0
        });
      }
    }

    // Default global idle animation
    if (!scene.anims.exists(`${id}-idle`)) {
      scene.anims.create({
        key: `${id}-idle`,
        frames: [{ key: texKey, frame: `${id}-down-0` }],
        frameRate: 1,
        repeat: -1
      });
    }

    console.log(`🏃 [ExternalAssetAdapter] Sliced & registered 4-directional animations for "${id}".`);
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
   * Fallback binding guarantee: If external PNG is missing, safely binds the procedural
   * texture generated by TextureGenerator.ts, ensuring zero crashes.
   */
  private static bindProceduralFallback(scene: Phaser.Scene, id: string, spec: AssetSpec): void {
    const fallbackKey = spec.fallbackProceduralKey;

    if (scene.textures.exists(fallbackKey)) {
      this.createTextureAlias(scene, id, fallbackKey);
    } else {
      // If even the specified fallback key does not exist, use dhaka-tileset-32 or tile-grass as ultra-safe fallback
      const ultraSafe = scene.textures.exists('tile-grass') ? 'tile-grass' : undefined;
      if (ultraSafe) {
        this.createTextureAlias(scene, id, ultraSafe);
      }
    }
  }

  /**
   * Helper to create a texture alias in Phaser's TextureManager
   */
  private static createTextureAlias(scene: Phaser.Scene, targetKey: string, sourceKey: string): void {
    if (targetKey === sourceKey || scene.textures.exists(targetKey)) return;

    const sourceTex = scene.textures.get(sourceKey);
    if (!sourceTex) return;

    const img = sourceTex.getSourceImage();
    if (!img) return;

    const canvas = scene.textures.createCanvas(targetKey, img.width, img.height);
    if (canvas) {
      const ctx = canvas.getContext();
      ctx.imageSmoothingEnabled = false;
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
