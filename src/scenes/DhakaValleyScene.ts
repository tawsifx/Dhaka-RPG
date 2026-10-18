// src/scenes/DhakaValleyScene.ts - Main Phaser.Scene integrating Graphics, Systems, Audio, and UI
// Migrated 100% intact from game.js
import Phaser from 'phaser';
import { TextureGenerator } from '../graphics/TextureGenerator';
import { ExternalAssetAdapter } from '../graphics/ExternalAssetAdapter';
import { DateState } from '../state/DateState';
import { RPGStats } from '../state/RPGStats';
import { SoundEngine } from '../audio/SoundEngine';
import { UI } from '../ui/UIController';
import { ITEMS_DB, WEAPON_FX } from '../config/items.db';
import { WORLDS_DB } from '../config/worlds.db';
import { CRAFT_RECIPES } from '../config/recipes.db';
import {
  CURZON_K,
  CURZON_X,
  CURZON_Y,
  DHAKA_MAP_WIDTH,
  DHAKA_MAP_HEIGHT,
  CURZON_INTERIOR_WIDTH,
  CURZON_INTERIOR_HEIGHT,
  FARMHOUSE_WIDTH,
  FARMHOUSE_HEIGHT,
  TILE_SIZE
} from '../config/constants';
import { CombatSystem } from '../systems/CombatSystem';
import { WeatherSystem } from '../systems/WeatherSystem';
import { ScheduleSystem } from '../systems/ScheduleSystem';
import { TimeCalendarSystem } from '../systems/TimeCalendarSystem';
import { FarmingSystem } from '../systems/FarmingSystem';
import { AtmosphereSystem } from '../systems/AtmosphereSystem';

export class DhakaValleyScene extends Phaser.Scene {
  [key: string]: any;

  constructor() {
    super('DhakaValleyScene');
    this.trail = [];
    this.stepCounter = 0;
    this.touchDir = { up: false, down: false, left: false, right: false };
    this.cutsceneLocked = false;
    this.companionIdx = 0;
    this.wanderers = [];
    this.enemies = [];
    this.activeBoss = null;
    this.lastAtkTime = 0;
    this.lastDashTime = 0;
    this.lastSkillTime = 0;
    this.facingVec = { x: 0, y: 1 };
    this.isRaining = false;
    this.rainGraphics = null;
    this.rainDrops = [];
    this.puddles = [];
    this.monsoonTriggered = false;
    this.nextThunder = 0;
    // Multi-Layer HGSS & Stardew systems
    this.atmosphere = null;
    this.timeCalendar = null;
    this.farmingSystem = null;
    this.tileCursor = null;
    this.overheadCanopies = [];
    this.interactiveFoliage = [];
    this.playerReflection = null;
    // Evening life, fireflies & wind gust tracking
    this.fireflies = [];
    this.nextWindGust = 0;
    this.windGustPetals = [];
    this.nextEveningAmbience = 0;
  }

  preload() {
    this.generateStardewTextures();
    // External asset manifest preload with graceful error fallback guarantee
    ExternalAssetAdapter.preloadExternalAssets(this);

    // Tuxemon outdoor tileset (CC-BY-SA) — PastTheFuture_Grass_Sand_Snow, 16×16 tiles
    this.load.image('tuxemon-terrain', 'assets/tilesets/PastTheFuture_Grass_Sand_Snow.png');
    // External interior & scenery tileset asset packs (Pipo, Buch, Kelvin Shadewing, Superpowers, George)
    this.load.image('tileset-pipo-base', 'assets/tilesets/pipo_BaseChip.png');
    this.load.image('tileset-buch', 'assets/tilesets/Basic_Buch_Tiles_Compiled.png');
    this.load.image('tileset-outdoor', 'assets/tilesets/Outdoor_Tiles_by_Kelvin_Shadewing.png');
    this.load.image('tileset-core-outdoor', 'assets/tilesets/core_outdoor.png');
    this.load.image('tileset-superpowers', 'assets/tilesets/Superpowers_Tilesheet.png');
    this.load.image('tileset-vegetation', 'assets/tilesets/Vegetation_by_George.png');
    this.load.image('tileset-pipo-flower', 'assets/tilesets/pipo_Flower.png');
  }


  generateStardewTextures() {
    TextureGenerator.generateAll(this);
  }
  initAnimations() {
    if (this.anims.exists('anim-flowercart')) return;

    this.anims.create({
      key: 'anim-flowercart',
      frames: [{ key: 'prop-flowercart-0' }, { key: 'prop-flowercart-1' }],
      frameRate: 3.2,
      repeat: -1
    });

    this.anims.create({
      key: 'anim-charukola',
      frames: [
        { key: 'prop-charukola-0' },
        { key: 'prop-charukola-1' },
        { key: 'prop-charukola-2' },
        { key: 'prop-charukola-3' }
      ],
      frameRate: 7,
      repeat: -1
    });

    this.anims.create({
      key: 'anim-portal',
      frames: [{ key: 'prop-portal-0' }, { key: 'prop-portal-1' }, { key: 'prop-portal-2' }],
      frameRate: 6,
      repeat: -1
    });

    this.anims.create({
      key: 'anim-bookstall',
      frames: [{ key: 'prop-bookstall-0' }, { key: 'prop-bookstall-1' }, { key: 'prop-bookstall-2' }],
      frameRate: 3.5,
      repeat: -1
    });

    this.anims.create({
      key: 'anim-doicart',
      frames: [{ key: 'prop-doicart-0' }, { key: 'prop-doicart-1' }],
      frameRate: 2.5,
      repeat: -1
    });

    this.anims.create({
      key: 'anim-fuchkacart',
      frames: [{ key: 'prop-fuchkacart-0' }, { key: 'prop-fuchkacart-1' }],
      frameRate: 3.2,
      repeat: -1
    });

    if (!this.anims.exists('player-walk')) {
      this.anims.create({
        key: 'player-walk',
        frames: [{ key: 'player-0' }, { key: 'player-1' }],
        frameRate: 6,
        repeat: -1
      });
    }

    if (!this.anims.exists('totoro-walk')) {
      this.anims.create({
        key: 'totoro-walk',
        frames: [{ key: 'totoro-0' }, { key: 'totoro-1' }],
        frameRate: 6,
        repeat: -1
      });
    }

    if (!this.anims.exists('totoro-idle')) {
      this.anims.create({
        key: 'totoro-idle',
        frames: [{ key: 'totoro-0' }, { key: 'totoro-1' }],
        frameRate: 2,
        repeat: -1
      });
    }
  }

  getOrCreateWalkAnim(baseTex, frameRate = 4) {
    const key = `anim-${baseTex}`;
    if (!this.anims.exists(key)) {
      const frames = [];
      for (let i = 0; i < 8; i++) {
        const frameKey = `${baseTex}-${i}`;
        if (this.textures.exists(frameKey)) {
          frames.push({ key: frameKey });
        } else {
          break;
        }
      }
      if (frames.length >= 2) {
        this.anims.create({
          key,
          frames,
          frameRate: frames.length > 2 ? Math.max(frameRate, 4.5) : frameRate,
          repeat: -1
        });
      }
    }
    return this.anims.exists(key) ? key : null;
  }

  create() {
    window.__activeScene = this;
    this.isTransitioning = false;

    // Normalize external assets & register animations/fallbacks
    ExternalAssetAdapter.normalizeLoadedAssets(this);

    // Initialize Atmosphere and Weather Lighting System
    this.atmosphere = new AtmosphereSystem(this);
    this.atmosphere.init();

    // Initialize Time & Calendar System with sync to Atmosphere
    this.timeCalendar = new TimeCalendarSystem('spring', 1, 15, 30);
    this.timeCalendar.onMinuteCallback = (date) => {
      if (this.atmosphere) {
        this.atmosphere.updateLighting(date.timePhase, this.isRaining ? 'monsoon' : (date.weather || 'sunny'));
      }
    };

    // Initialize 2D Grid Farming System
    this.farmingSystem = new FarmingSystem(40, 30);

    // Initialize Layer 6 Stardew Tile Cursor
    this.tileCursor = this.add.graphics().setDepth(3100);

    // Initialize native Phaser Animation System
    this.initAnimations();

    // Cache Minimap DOM Canvas & Context once to eliminate per-frame DOM queries in update()
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
    this.lastMinimapUpdate = 0;

    this.buildWorld(DateState.currentWorld, DateState.playerPos);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      j: Phaser.Input.Keyboard.KeyCodes.J,
      k: Phaser.Input.Keyboard.KeyCodes.K,
      q: Phaser.Input.Keyboard.KeyCodes.Q,
      r: Phaser.Input.Keyboard.KeyCodes.R,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      i: Phaser.Input.Keyboard.KeyCodes.I,
      m: Phaser.Input.Keyboard.KeyCodes.M,
      l: Phaser.Input.Keyboard.KeyCodes.L
    });

    this.comboStep = 0;
    this.lastAtkTime = 0;
    this.totoroBusyUntil = 0;
    this.swiftnessUntil = 0;
    this.lastSkillTime = 0;
    this.lastSlamTime = 0;

    // Guard against OS key-repeat (e.repeat) so holding SPACE/E doesn't skip dialogue
    this.input.keyboard.on('keydown-SPACE', e => { if (!e.repeat) this.handleActionPress(); });
    this.input.keyboard.on('keydown-E', e => { if (!e.repeat) this.handleActionPress(); });
    this.input.keyboard.on('keydown-J', e => { if (!e.repeat) this.performPlayerAttack(); });
    this.input.keyboard.on('keydown-K', e => { if (!e.repeat) this.performPlayerDash(); });
    this.input.keyboard.on('keydown-SHIFT', e => { if (!e.repeat) this.performPlayerDash(); });
    this.input.keyboard.on('keydown-Q', e => { if (!e.repeat) this.performTotoroRoar(); });
    this.input.keyboard.on('keydown-R', e => { if (!e.repeat) this.performTotoroGroundSlam(); });
    this.input.keyboard.on('keydown-F', e => { if (!e.repeat) this.performTotoroGroundSlam(); });
    this.input.keyboard.on('keydown-I', e => { if (!e.repeat && !UI.isOpen()) UI.openRPGMenu('inventory'); });
    this.input.keyboard.on('keydown-M', e => { if (!e.repeat && !UI.isOpen()) UI.openRPGMenu('map'); });
    this.input.keyboard.on('keydown-L', e => { if (!e.repeat && !UI.isOpen()) UI.openRPGMenu('quests'); });

    this.input.on('pointerdown', pointer => {
      if (!UI.isOpen() && pointer.leftButtonDown()) {
        this.performPlayerAttack();
      }
    });

    // Use .onclick instead of addEventListener so DOM buttons never stack duplicate listeners if scene restarts
    const talkBtn = document.getElementById('btn-talk-partner');
    if (talkBtn) talkBtn.onclick = () => this.talkToTotoroCompanion();

    const bgmBtn = document.getElementById('btn-bgm');
    if (bgmBtn) {
      bgmBtn.onclick = e => {
        const on = SoundEngine.toggleBGM();
        (e.currentTarget as any).textContent = on ? '🎵 BGM: ON' : '🎵 BGM: OFF';
      };
    }

   // Analog Joystick Vector State
    this.joyVector = { x: 0, y: 0 };
    this.joyTouchId = null;

    const joyZone = document.getElementById('joystick-zone');
    const joyBase = document.getElementById('joystick-base');
    const joyKnob = document.getElementById('joystick-knob');

    if (joyZone && joyBase && joyKnob) {
      const maxRadius = 38;

      const resetJoy = () => {
        this.joyTouchId = null;
        this.joyVector.x = 0;
        this.joyVector.y = 0;
        this.touchDir = { up: false, down: false, left: false, right: false };
        joyKnob.style.transform = 'translate(0px, 0px)';
      };

      const handleJoyMove = (clientX, clientY) => {
        const rect = joyBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let dx = clientX - centerX;
        let dy = clientY - centerY;
        const dist = Phaser.Math.Distance.Between(centerX, centerY, clientX, clientY);

        if (dist > maxRadius) {
          dx = (dx / dist) * maxRadius;
          dy = (dy / dist) * maxRadius;
        }

        joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;

        // Normalized movement vectors
        const normX = dx / maxRadius;
        const normY = dy / maxRadius;
        this.joyVector.x = Math.abs(normX) > 0.15 ? normX : 0;
        this.joyVector.y = Math.abs(normY) > 0.15 ? normY : 0;

        // Sync directional flags for discrete checks
        this.touchDir.left = normX < -0.3;
        this.touchDir.right = normX > 0.3;
        this.touchDir.up = normY < -0.3;
        this.touchDir.down = normY > 0.3;
      };

      joyZone.addEventListener('pointerdown', e => {
        e.preventDefault();
        e.stopPropagation();
        this.joyTouchId = e.pointerId;
        joyZone.setPointerCapture(e.pointerId);
        handleJoyMove(e.clientX, e.clientY);
      }, { passive: false });

      joyZone.addEventListener('pointermove', e => {
        if (this.joyTouchId === e.pointerId) {
          e.preventDefault();
          handleJoyMove(e.clientX, e.clientY);
        }
      }, { passive: false });

      const endJoy = e => {
        if (this.joyTouchId === e.pointerId) {
          e.preventDefault();
          resetJoy();
        }
      };
      joyZone.addEventListener('pointerup', endJoy);
      joyZone.addEventListener('pointercancel', endJoy);
    }

    // Bind Right-Hand Mobile Action Buttons with Safari-safe Pointer Events
    const bindTouchAction = (id, fn) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('pointerdown', e => {
        e.preventDefault();
        e.stopPropagation();
        fn();
      }, { passive: false });
    };

    bindTouchAction('btn-mobile-act', () => this.handleActionPress());
    bindTouchAction('btn-mobile-atk', () => this.performPlayerAttack());
    bindTouchAction('btn-mobile-dash', () => this.performPlayerDash());
    bindTouchAction('btn-mobile-skill', () => this.performTotoroRoar());
    bindTouchAction('btn-mobile-slam', () => this.performTotoroGroundSlam());

    UI.updateRPGStats();
    UI.updateQuestText();
  }

  /* Builds or rebuilds any of the 6 worlds cleanly */
  transitionToWorld(worldId, customSpawn = null) {
    if (this.isTransitioning) return; // Prevent double-warp race condition
    this.isTransitioning = true;
    this.cutsceneLocked = true;

    if (!WORLDS_DB[worldId]) worldId = 'dhaka';
    DateState.currentWorld = worldId;
    if (!DateState.unlockedWorlds.includes(worldId)) {
      DateState.unlockedWorlds.push(worldId);
    }
    SoundEngine.portalWarp();
    this.cameras.main.fadeOut(220, 15, 10, 25);
        this.time.delayedCall(230, () => {
      const defaultSpawn = worldId === 'dhaka' ? { x: 480, y: 1380 } : { x: 340, y: 900 };
      try {
        this.buildWorld(worldId, customSpawn || defaultSpawn);
      } catch (err) {
        console.error('buildWorld failed for', worldId, err);   // never leave the game locked on a black screen
      } finally {
        this.cutsceneLocked = false;
        this.isTransitioning = false;
        this.cameras.main.fadeIn(260, 15, 10, 25);
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────────────────
   *  TUXEMON TILEMAP BUILDER — Dhaka Valley Ground
   *  Uses PastTheFuture_Grass_Sand_Snow.png (384×240, 16×16, 24 cols × 15 rows)
   *  Tile IDs by visual inspection:
   *    Row 0 (y=0):   0-23  — buildings, signs (ignore)
   *    Cols 0-5, Row 1-4:   green grass with flowers, bushes
   *    Cols 6-11, Row 1-4:  light grass / grass-sand transitions
   *    Cols 12-17, Row 1-4: sand / desert terrain
   *    Cols 18-23, Row 1-4: sand edges, dirt
   *    Row 5-6: trees, fences, path segments, flowers
   *    Row 7-8: water edge tiles
   *    Row 9-14: water, snow, ice
   * ──────────────────────────────────────────────────────────────────────── */
  buildDhakaTilemap(mapW, mapH) {
    const tilesetKey = this.textures.exists('dhaka-tileset-32') ? 'dhaka-tileset-32' : 'tile-grass';
    if (tilesetKey === 'tile-grass') {
      return this.add.tileSprite(mapW / 2, mapH / 2, mapW, mapH, 'tile-grass').setDepth(0);
    }

    const TILE = 32;                                 // Native 32x32 tileset matching player and path scale
    const COLS = Math.ceil(mapW / TILE);             // 2400 / 32 = 75 columns
    const ROWS = Math.ceil(mapH / TILE);             // 1800 / 32 = 57 rows (covers full 1824px)

    // ── Dedicated Seeded PRNG (Mulberry32) - Zero Global State Pollution ──
    const makeRng = (seed) => {
      let s = seed >>> 0;
      return () => {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };

    // ── Continuous 2D Value Noise (No Edge Wrapping Artifacts) ──
    const makeNoise2D = (cols, rows, seedVal, freqX = 6, freqY = 5) => {
      const r = makeRng(seedVal);
      const grid = [];
      for (let y = 0; y <= freqY; y++) {
        const row = [];
        for (let x = 0; x <= freqX; x++) row.push(r());
        grid.push(row);
      }
      const smooth = t => t * t * (3 - 2 * t);
      return (c, r) => {
        const gx = (c / cols) * freqX;
        const gy = (r / rows) * freqY;
        const x0 = Math.min(freqX - 1, Math.floor(gx));
        const y0 = Math.min(freqY - 1, Math.floor(gy));
        const x1 = x0 + 1;
        const y1 = y0 + 1;
        const tx = smooth(gx - x0);
        const ty = smooth(gy - y0);
        const a = grid[y0][x0], b = grid[y0][x1];
        const cVal = grid[y1][x0], d = grid[y1][x1];
        return (a + (b - a) * tx) * (1 - ty) + (cVal + (d - cVal) * tx) * ty;
      };
    };

    const nLawn = makeNoise2D(COLS, ROWS, 101, 8, 6);       // Broad lawn contour
    const nTufts = makeNoise2D(COLS, ROWS, 202, 14, 11);     // Grass tuft variation
    const nFlower = makeNoise2D(COLS, ROWS, 303, 7, 5);      // Organic meadow blooming zones

    // ── Landmark Proximity Hubs (Trampled earth around social centers) ──
    const landmarks = [
      { x: 208, y: 1328, r: 160 },                      // Curzon Hall courtyard
      { x: 272, y: 272, r: 130 },                       // TSC Tea Stall adda
      { x: 656, y: 272, r: 100 },                       // Aparajeyo Bangla Monument
      { x: 208, y: 752, r: 130 },                       // Charukola Fine Arts
      { x: 1072, y: 240, r: 130 },                      // Nilkhet Book Lane
      { x: 1072, y: 816, r: 100 },                      // Mintu Road Fountain
      { x: 1264, y: 496, r: 100, isFlowerCart: true },  // Flower Cart (beside Ramna Bench)
      { x: 1584, y: 240, r: 100 },                      // Mama's Fuchka Cart (Food Bazaar)
      { x: 1744, y: 240, r: 100 },                      // Pabna Mishti Doi (Food Bazaar)
      { x: 1648, y: 816, r: 100 },                      // Rickshaw Stand
    ];

    // ── Main Paved Road Corridors (World coordinates - Snapped to 32x32) ──
    const paths = [
      { x: 0, y: 768, w: 2240, h: 96 },                 // Main East-West thoroughfare
      { x: 416, y: 160, w: 96, h: 1472 },               // West North-South road (TSC to Curzon)
      { x: 1024, y: 224, w: 96, h: 640 },               // Central Nilkhet spine
      { x: 1472, y: 160, w: 96, h: 1472 },              // East North-South promenade
      { x: 416, y: 256, w: 1120, h: 96 },               // North connecting avenue
      { x: 1472, y: 224, w: 384, h: 96 },               // North-East Food Bazaar Plaza
      { x: 672, y: 1408, w: 96, h: 416 },               // Farmhouse Country Lane
      { x: 480, y: 1408, w: 224, h: 96 },               // West connecting lane to Farmhouse
    ];

    // ── Dhanmondi Lake Boundary (World coordinates - Snapped to 32x32) ──
    const lake = { x: 1568, y: 1056, w: 864, h: 768 };

    // ── Build Tile Grid ──
    const data = [];
    for (let row = 0; row < ROWS; row++) {
      const tileRow = [];
      for (let col = 0; col < COLS; col++) {
        const wx = col * TILE + TILE / 2;
        const wy = row * TILE + TILE / 2;
        const rTile = makeRng(row * 10007 + col * 31 + 999);
        const rnd = rTile();

        // 1. Inside Dhanmondi Lake: Plain grass tile under water surface
        if (wx >= lake.x && wx <= lake.x + lake.w && wy >= lake.y && wy <= lake.y + lake.h) {
          tileRow.push(0);
          continue;
        }

        // 2. Measure distance to closest paved road corridor
        let distPath = 9999;
        for (const p of paths) {
          const dx = Math.max(p.x - wx, 0, wx - (p.x + p.w));
          const dy = Math.max(p.y - wy, 0, wy - (p.y + p.h));
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < distPath) distPath = d;
        }

        // Directly under paved path: fine warm dirt / sand foundation (tiles 8, 9, 10)
        if (distPath === 0) {
          tileRow.push(rnd < 0.6 ? 8 : (rnd < 0.85 ? 9 : 10));
          continue;
        }

        // 3. Proximity to Landmark Hubs
        let nearLandmark = null;
        let landmarkDistRatio = 1.0;
        for (const lm of landmarks) {
          const dx = wx - lm.x, dy = wy - lm.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < lm.r) {
            nearLandmark = lm;
            landmarkDistRatio = dist / lm.r;
            break;
          }
        }

        // 4. Lake Shoreline Fringe (within 64px of lake edge)
        const nearLakeShore = (wx >= lake.x - 64 && wx <= lake.x + lake.w + 64 && wy >= lake.y - 64 && wy <= lake.y + lake.h + 64);

        let tileId;
        if (nearLandmark) {
          if (nearLandmark.isFlowerCart && rnd < 0.35) {
            // Flower Cart feature: natural blossom petals around the cart!
            tileId = 4 + Math.floor(rTile() * 4);
          } else if (landmarkDistRatio < 0.45) {
            // Core trampled hub
            tileId = rnd < 0.65 ? 8 : 9;
          } else if (landmarkDistRatio < 0.8) {
            // Mid ring: sandy grass blend
            tileId = rnd < 0.5 ? 10 : (rnd < 0.75 ? 8 : 1);
          } else {
            // Outer fringe
            tileId = rnd < 0.4 ? 10 : (rnd < 0.75 ? 0 : 2);
          }
        } else if (distPath < 24) {
          // Paved path shoulder: soft sandy grass transition
          tileId = rnd < 0.45 ? 10 : (rnd < 0.75 ? 1 : 0);
        } else if (nearLakeShore) {
          // Sandy bank gradation near water edge
          tileId = rnd < 0.45 ? 8 : (rnd < 0.75 ? 10 : 0);
        } else {
          // Open meadows & lawns: lush grass with naturally scattered wildflowers
          const vFlower = nFlower(col, row);
          const vBlend = nLawn(col, row) * 0.6 + nTufts(col, row) * 0.4;

          if (vFlower > 0.58 && rnd < 0.13) {
            // Organic wildflower sprinkles in designated blooming meadow zones
            // Variety: 4 (Krishnachura), 5 (Aparajita), 6 (Golden Beli), 7 (Daisy duo)
            tileId = 4 + Math.floor(rTile() * 4);
          } else if (rnd < 0.02) {
            // Rare single wildflower sprinkled across open grass
            tileId = 4 + Math.floor(rTile() * 4);
          } else if (vBlend > 0.62) {
            // Wild grass tufts & clovers
            tileId = rnd < 0.5 ? 2 : (rnd < 0.75 ? 3 : 11);
          } else if (rnd < 0.35) {
            // Soft mottled grass
            tileId = 1;
          } else {
            // Crisp, lush base grass
            tileId = 0;
          }
        }
        tileRow.push(tileId);
      }
      data.push(tileRow);
    }

    // ── Create Phaser Tilemap (Native 32×32, scale 1.0, 0 gid offset) ──
    const map = this.make.tilemap({
      data: data,
      tileWidth: TILE,
      tileHeight: TILE
    });
    const tileset = map.addTilesetImage('dhaka-tileset-32', 'dhaka-tileset-32', TILE, TILE, 0, 0, 0);
    const layer = map.createLayer(0, tileset, 0, 0);
    layer.setDepth(0);

    // Keep reference for safe cleanup on world transitions
    this.dhakaTilemap = { map, layer };
    return layer;
  }

  buildWorld(worldId, spawnPos) {
    if (worldId === 'curzon_interior') {
      this.buildCurzonInterior(spawnPos);
      return;
    }
    if (worldId === 'farmhouse') {
      this.buildFarmhouse(spawnPos);
      return;
    }

    if (this.dhakaTilemap) {
      try {
        if (this.dhakaTilemap.map) this.dhakaTilemap.map.destroy();
      } catch (e) {}
      this.dhakaTilemap = null;
    }
    this.children.removeAll(true);
    if (this.obstacles) this.obstacles.clear(true, true);
    this.interactables = [];
    this.wanderers = [];
    this.enemies = [];
    this.lampGlows = [];
    this.activeBoss = null;
    UI.setBossHUD(false);

    const wCfg = WORLDS_DB[worldId] || WORLDS_DB.dhaka;
    SoundEngine.setTheme(wCfg.theme);
    const minLabel = document.getElementById('minimap-world-label');
    if (minLabel) minLabel.textContent = wCfg.name;

    const MAP_W = DHAKA_MAP_WIDTH, MAP_H = DHAKA_MAP_HEIGHT;
    this.currentMapW = MAP_W;
    this.currentMapH = MAP_H;
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H);
    this.obstacles = this.physics.add.staticGroup();
    this.overheadCanopies = [];
    this.interactiveFoliage = [];

    const blockRect = (x, y, w, h) => {
      const zone = this.add.zone(x, y, w, h);
      this.physics.add.existing(zone, true);
      this.obstacles.add(zone);
    };

    const addLandmark = (x, y, tex, w, h) => {
      const sp = this.add.sprite(x, y, tex).setOrigin(0.5, 1).setDepth(y);
      blockRect(x, y - h / 2, w, h);
      if (tex.startsWith('prop-charukola')) sp.play('anim-charukola');
      else if (tex.startsWith('prop-flowercart')) sp.play('anim-flowercart');
      else if (tex.startsWith('prop-bookstall')) sp.play('anim-bookstall');
      else if (tex.startsWith('prop-fuchkacart')) sp.play('anim-fuchkacart');
      else if (tex.startsWith('prop-doicart')) sp.play('anim-doicart');

      // Layer 5: Register overhead canopies for smooth alpha fading (0.42) when walking behind
      if (tex.includes('tree')) {
        this.overheadCanopies.push({
          sprite: sp,
          minX: x - 48,
          maxX: x + 48,
          minY: y - 110,
          maxY: y - 10
        });
      } else if (tex === 'prop-curzon') {
        this.overheadCanopies.push({
          sprite: sp,
          minX: x - (176 * CURZON_K) / 2,
          maxX: x + (176 * CURZON_K) / 2,
          minY: y - 116 * CURZON_K,
          maxY: y - 20
        });
      } else if (tex.includes('stall') || tex.includes('cart') || tex.includes('arch')) {
        this.overheadCanopies.push({
          sprite: sp,
          minX: x - w / 2,
          maxX: x + w / 2,
          minY: y - h - 20,
          maxY: y - 10
        });
      }

      return sp;
    };

    const registerInteract = (x, y, tex, name, radius, onInteract) => {
      const sp = tex ? this.add.sprite(x, y, tex).setOrigin(0.5, 1).setDepth(y) : null;
      if (sp && tex) {
        if (tex.startsWith('prop-portal')) sp.play('anim-portal');
        else if (tex.startsWith('prop-charukola')) sp.play('anim-charukola');
        else if (tex.startsWith('prop-flowercart')) sp.play('anim-flowercart');
        else if (tex.startsWith('prop-bookstall')) sp.play('anim-bookstall');
        else if (tex.startsWith('prop-fuchkacart')) sp.play('anim-fuchkacart');
        else if (tex.startsWith('prop-doicart')) sp.play('anim-doicart');
        else if (tex.startsWith('npc-')) {
          // Stationary interactable NPC: display clean static idle pose
        }
      }
      const badgeY = sp ? y - sp.height - 8 : y - 58;
      const badge = this.add.text(x, badgeY, '💬 ' + name, {
        fontFamily: 'Outfit', fontSize: '12px', fontStyle: 'bold',
        backgroundColor: 'rgba(43,29,20,0.86)', color: '#fdf5e6', padding: { x: 6, y: 3 }
      }).setOrigin(0.5, 1).setDepth(y + 10);
      const entry = { x, y, radius, sprite: sp, badge, name, onInteract };
      this.interactables.push(entry);
      return entry;
    };

    // 1. Base Ground & Terrain (Layer 1)
    if (worldId === 'dhaka') {
      this.buildDhakaTilemap(MAP_W, MAP_H);
    } else {
      this.add.tileSprite(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, wCfg.groundTex).setDepth(0);
    }

    if (worldId === 'dhaka') {
      // --- WORLD 1: DHAKA VALLEY (Full 80x60 Grid Map + Stardew / HGSS Layers) ---

      // Layer 2: Paved Road Corridors & Autotile Stone Walkways
      this.add.tileSprite(1120, 816, 2240, 96, 'tile-path').setDepth(1);
      this.add.tileSprite(464, 896, 96, 1472, 'tile-path').setDepth(1);
      this.add.tileSprite(1072, 544, 96, 640, 'tile-path').setDepth(1);
      this.add.tileSprite(1520, 896, 96, 1472, 'tile-path').setDepth(1);
      this.add.tileSprite(976, 304, 1120, 96, 'tile-path').setDepth(1);
      this.add.tileSprite(1664, 272, 384, 96, 'tile-path').setDepth(1);
      this.add.tileSprite(720, 1616, 96, 416, 'tile-path').setDepth(1);
      this.add.tileSprite(592, 1456, 224, 96, 'tile-path').setDepth(1);

      // Layer 0: Water & Shore with Animated Ripples & HGSS Vertical Reflections
      this.lakeWater = this.add.tileSprite(2064, 1440, 992, 768, 'tile-water').setDepth(1);
      this.add.tileSprite(1568, 1440, 24, 768, 'tile-bank').setDepth(2);
      this.add.tileSprite(2064, 1056, 992, 24, 'tile-bank').setDepth(2);
      this.add.tileSprite(1744, 1328, 384, 72, 'tile-pier').setDepth(3);

      blockRect(2064, 1184, 992, 256);
      blockRect(2064, 1600, 992, 448);
      blockRect(2192, 1328, 480, 64);

      // Pokémon HGSS Vertical Water Reflections (alpha: 0.22)
      this.boatReflection = this.add.sprite(2032, 1376, 'prop-boat')
        .setOrigin(0.5, 0).setScale(1, -0.7).setAlpha(0.22).setDepth(2).setTint(0x4a7c8c);

      this.pierReflection = this.add.tileSprite(1744, 1364, 384, 36, 'tile-pier')
        .setScale(1, -0.6).setAlpha(0.22).setDepth(2).setTint(0x4a7c8c);

      this.playerReflection = this.add.sprite(0, 0, 'player-0')
        .setOrigin(0.5, 0).setScale(1, -0.75).setAlpha(0).setDepth(2).setTint(0x4a7c8c);

      // Layer 3: Interactive Ground Foliage (Wildflowers, clovers, fallen petals that rustle on step)
      const foliagePositions = [
        [176, 1264], [240, 1200], [336, 1248], [432, 1200], [208, 1424], [304, 1456],
        [528, 656], [624, 624], [720, 688], [816, 640], [912, 672],
        [1200, 368], [1296, 336], [1392, 368], [1712, 368], [1808, 336],
        [624, 1168], [720, 1232], [816, 1168], [912, 1232], [1008, 1168],
        [1200, 1168], [1296, 1232], [1392, 1168], [1488, 1232],
        [560, 1552], [624, 1616], [816, 1616], [880, 1552], [944, 1616]
      ];
      const folTexs = ['tile-flower-red', 'tile-flower-blue', 'tile-flower-yellow', 'tile-clover', 'tile-petals'];
      foliagePositions.forEach(([fx, fy], i) => {
        const tex = folTexs[i % folTexs.length];
        const sp = this.add.sprite(fx, fy, tex).setOrigin(0.5, 1).setDepth(3);
        this.interactiveFoliage.push({ sprite: sp, x: fx, y: fy, isRustling: false });
      });

      // Layer 4: Snapped Landmarks & Stalls (32x32 Grid Aligned)
      addLandmark(CURZON_X, CURZON_Y, 'prop-curzon', 176 * CURZON_K, 50 * CURZON_K);
      addLandmark(272, 272, 'prop-teastall', 184, 54);
      addLandmark(656, 272, 'prop-monument', 96, 42);
      this.charukolaSprite = addLandmark(208, 752, 'prop-charukola-0', 188, 54);
      addLandmark(1072, 240, 'prop-bookstall', 188, 56);
      addLandmark(1072, 816, 'prop-fountain', 88, 42);

      // Ramna Promenade
      this.flowerCartSprite = addLandmark(1264, 496, 'prop-flowercart-0', 180, 52);
      this.ramnaBench = this.add.sprite(1328, 464, 'prop-bench').setOrigin(0.5, 1).setDepth(464);

      // Fuller Road Food Bazaar
      addLandmark(1584, 240, 'prop-fuchkacart', 180, 52);
      addLandmark(1744, 240, 'prop-doicart', 180, 52);
      this.add.sprite(1648, 304, 'prop-bench').setOrigin(0.5, 1).setDepth(304);

      this.telescopeProp = this.add.sprite(1776, 1328, 'prop-telescope').setOrigin(0.5, 1).setDepth(1328);
      this.createLakeBoat(2032, 1360);

      // Biome Trees (32x32 Snapped)
      [
        [144, 1488], [400, 1488], [112, 1008], [144, 528], [592, 528],
        [848, 528], [1392, 432], [1936, 336], [2128, 560],
        [784, 1168], [1168, 1168], [1360, 1488], [880, 1552]
      ].forEach(([tx, ty]) => addLandmark(tx, ty, 'prop-tree-krishna', 40, 28));

      // Streetlamps & Halos (32x32 Snapped)
      [
        [400, 752], [624, 752], [944, 752], [1168, 752], [1456, 752],
        [400, 1360], [1264, 464], [1552, 1264], [1872, 1296]
      ].forEach(([lx, ly]) => {
        this.add.sprite(lx, ly, 'prop-lamp').setOrigin(0.5, 1).setDepth(ly);
        const glow = this.add.circle(lx, ly - 68, 68, 0xfde68a, 0).setDepth(ly + 1);
        this.lampGlows.push(glow);
      });

      // Atmosphere Lighting Registration (Edison Bulbs, Lamps, Rowboat)
      if (this.atmosphere) {
        this.atmosphere.destroy();
        this.atmosphere = new AtmosphereSystem(this);
        this.atmosphere.init();

        this.atmosphere.registerLight(272, 260, 68, 0xfde68a, 0.7); // Tea stall
        this.atmosphere.registerLight(1072, 240, 68, 0xfde68a, 0.65); // Book stall
        this.atmosphere.registerLight(1264, 480, 64, 0xfbcfe8, 0.65); // Flower cart
        this.atmosphere.registerLight(1584, 240, 68, 0xfde68a, 0.7); // Fuchka cart
        this.atmosphere.registerLight(1744, 240, 68, 0xfde68a, 0.7); // Mishti doi
        this.atmosphere.registerLight(2032, 1352, 60, 0xfef08a, 0.85); // Lake rowboat lantern
        this.atmosphere.registerLight(672, 1433, 50, 0xfde68a, 0.6); // Farm arch left
        this.atmosphere.registerLight(808, 1433, 50, 0xfde68a, 0.6); // Farm arch right

        [
          [400, 752], [624, 752], [944, 752], [1168, 752], [1456, 752],
          [400, 1360], [1264, 464], [1552, 1264], [1872, 1296]
        ].forEach(([lx, ly]) => {
          this.atmosphere.registerLight(lx, ly - 50, 64, 0xfde68a, 0.6);
        });
      }

      const labelStyle = { fontFamily: 'Press Start 2P', fontSize: '9.5px', color: '#fff8eb', stroke: '#2b1d14', strokeThickness: 4 };
      this.add.text(CURZON_X, CURZON_Y - 116 * CURZON_K - 18, 'CURZON HALL & KRISHNACHURA LAWN', labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(272, 96, 'TSC TEA STALL & ADDA', labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(656, 136, 'APARAJEYO BANGLA', labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(208, 528, 'CHARUKOLA FINE ARTS 🎨', labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1072, 80, 'NILKHET BOOK LANE 📚', labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1072, 720, 'MiNTU ROAD FOUNTAIN PLAZA', labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1328, 396, 'RAMNA PARK BENCH 🌸', labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1264, 396, 'PHULWALI FLOWER CART 🌼', labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1664, 80, "FULLER ROAD FOOD BAZAAR 🥙🍮", labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1648, 752, 'DHAKA RICKSHAW STAND 🛺', labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1776, 1200, 'DHANMONDI LAKE PIER & TELESCOPE 🔭', labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(736, 1432, 'GREEN MEADOWS FARMHOUSE ROAD 🏡', labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(2192, 712, 'WHISPERING FOREST PORTAL 🌀', labelStyle).setOrigin(0.5).setDepth(2000);

      // Farmstead Timber Archway & Pastoral Entrance (32x32 Snapped)
      this.add.sprite(736, 1488, 'prop-farm-arch').setOrigin(0.5, 1).setDepth(1488);
      this.add.sprite(608, 1488, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(1488);
      this.add.sprite(512, 1488, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(1488);
      this.add.sprite(864, 1488, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(1488);
      this.add.sprite(960, 1488, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(1488);

      blockRect(550, 1475, 230, 16);
      blockRect(930, 1475, 230, 16);
      blockRect(668, 1478, 44, 18);
      blockRect(812, 1478, 44, 18);

      this.add.sprite(816, 1456, 'prop-farm-sign').setOrigin(0.5, 1).setDepth(1456);

      this.add.sprite(656, 1456, 'prop-sunflowers').setOrigin(0.5, 1).setDepth(1456);
      this.add.sprite(816, 1488, 'prop-sunflowers').setOrigin(0.5, 1).setDepth(1488);
      this.add.sprite(544, 1488, 'prop-sunflowers').setOrigin(0.5, 1).setDepth(1488);
      this.add.sprite(928, 1488, 'prop-sunflowers').setOrigin(0.5, 1).setDepth(1488);

      this.add.sprite(624, 1488, 'prop-farm-haybale').setOrigin(0.5, 1).setDepth(1488);
      this.add.sprite(640, 1488, 'prop-farm-haybale').setOrigin(0.5, 1).setDepth(1488);
      this.add.sprite(880, 1488, 'prop-farm-haybale').setOrigin(0.5, 1).setDepth(1488);

      const archGlowL = this.add.circle(672, 1440, 44, 0xfde68a, 0.25).setDepth(1489);
      const archGlowR = this.add.circle(808, 1440, 44, 0xfde68a, 0.25).setDepth(1489);
      this.lampGlows.push(archGlowL, archGlowR);

      for (let i = 0; i < 6; i++) {
        const dX = Phaser.Math.Between(695, 785);
        const dY = Phaser.Math.Between(1440, 1530);
        const mote = this.add.circle(dX, dY, 2, 0xfef08a, 0.65).setDepth(1600);
        this.tweens.add({
          targets: mote,
          y: dY - 26,
          x: dX + Phaser.Math.Between(-14, 14),
          alpha: 0.15,
          duration: 2400 + i * 400,
          repeat: -1,
          yoyo: true,
          ease: 'Sine.easeInOut'
        });
      }

      this.add.circle(736, 1536, 24, 0xca8a04, 0.25).setDepth(1529);
      this.add.circle(736, 1536, 14, 0xfef08a, 0.35).setDepth(1529);

      registerInteract(CURZON_X, CURZON_Y + 12, null, 'Enter Curzon Hall 🏛️', 92, () => this.enterCurzonHall());
      registerInteract(736, 1536, null, 'Visit Green Meadows Farmhouse 🏡', 85, () => this.enterFarmhouse());
      registerInteract(272, 304, 'npc-tea-0', 'Tong-er Mama (Cha)', 105, () => this.interactTeaStall());
      registerInteract(400, 304, 'npc-guitar-0', 'TSC Acoustic Singer', 90, () => this.interactGuitarist());
      registerInteract(240, 752, 'npc-artist-0', 'Charukola Clay Art', 85, () => this.interactCharukola());
      registerInteract(1072, 272, 'npc-books-0', 'Nilkhet Boiwala', 105, () => this.interactBookStall());
      registerInteract(1264, 528, 'npc-phulwali-0', 'Phulwali (Beli Gajra)', 85, () => this.interactFlowerCart());
      registerInteract(1584, 272, 'npc-fuchka-0', "Mama's Naga Fuchka", 105, () => this.interactFuchkaCart());
      registerInteract(1744, 272, 'npc-doi-0', 'Pabnar Mishti Doi', 105, () => this.interactDoiCart());

      const rickEntry = registerInteract(1648, 816, 'prop-rickshaw', 'Grand Dhaka Rickshaw Tour 🛺', 92, () => this.interactRickshawTour());
      this.rickshawSprite = rickEntry.sprite;

      registerInteract(1776, 1328, 'prop-telescope', 'Stargazing Telescope 🔭', 105, () => this.interactStargazingTelescope());
      registerInteract(1904, 1328, 'prop-lamp', 'Lantern Rowboat Finale ⛵', 88, () => this.interactLakePier());

      // Portal to World 2: Whispering Emerald Forest
      registerInteract(2192, 816, 'prop-portal-0', 'Enter Whispering Emerald Forest 🌀', 95, () => {
        if (!DateState.totoroJoined) {
          UI.startDialogue([{ speaker: 'Moon Walker', portrait: '🌙', text: 'A shimmering fracture in reality! I have to bring Totoro from Curzon Hall before stepping through.' }]);
          return;
        }
        this.transitionToWorld('forest');
      });

      // Ahona, Apshora & Rakin Setup
      const ahonaPos = DateState.bulliesDefeated ? { x: 1290, y: 480 } : { x: 670, y: 810 };
      let apshoraPos = DateState.bulliesDefeated ? { x: 1335, y: 480 } : { x: 710, y: 810 };
      if (DateState.apshoraQuestStage >= 2 && DateState.apshoraQuestStage < 4) {
        apshoraPos = { x: 320, y: 785 };
      } else if (DateState.apshoraQuestStage >= 4) {
        apshoraPos = { x: 1345, y: 480 };
      }
      this.ahona = this.add.sprite(ahonaPos.x, ahonaPos.y, 'npc-ahona-0').setOrigin(0.5, 1).setDepth(ahonaPos.y);
      this.apshora = this.add.sprite(apshoraPos.x, apshoraPos.y, 'npc-apshora-0').setOrigin(0.5, 1).setDepth(apshoraPos.y);

      let rivalText = '😒 Ahona & Apshora';
      if (DateState.ahonaQuestStage === 4) {
        rivalText = (DateState.apshoraQuestStage >= 2 && DateState.apshoraQuestStage < 4)
          ? '💑 Ahona & Rakin'
          : '💑 Ahona, Rakin & Apshora';
      } else if (DateState.bulliesDefeated) {
        rivalText = '😢 Ahona (On Bench)';
      }

      this.rivalBadge = this.add.text(ahonaPos.x + 20, ahonaPos.y - 67, rivalText, {
        fontFamily: 'Outfit', fontSize: '12px', fontStyle: 'bold',
        backgroundColor: '#591c33', color: '#ffd6e4', padding: { x: 7, y: 3 }
      }).setOrigin(0.5, 1).setDepth(2100);
      this.rivalInteract = {
        x: ahonaPos.x + 20, y: ahonaPos.y, radius: 95, sprite: this.ahona, badge: this.rivalBadge,
        name: DateState.ahonaQuestStage === 4 ? 'Talk to Ahona & Rakin' : 'Talk to Ahona & Apshora',
        onInteract: () => this.interactAhonaApshora()
      };
      this.interactables.push(this.rivalInteract);

      // Dedicated Apshora Atelier Interactable when working at Charukola
      if (DateState.apshoraQuestStage >= 2 && DateState.apshoraQuestStage < 4) {
        this.apshoraBadge = this.add.text(apshoraPos.x, apshoraPos.y - 67, '✨ Apshora & Anamika Atelier', {
          fontFamily: 'Outfit', fontSize: '11px', fontStyle: 'bold',
          backgroundColor: '#4c1d95', color: '#f3e8ff', padding: { x: 6, y: 3 }
        }).setOrigin(0.5, 1).setDepth(2100);
        this.apshoraInteract = {
          x: apshoraPos.x, y: apshoraPos.y, radius: 90, sprite: this.apshora, badge: this.apshoraBadge,
          name: 'Visit Apshora & Anamika Atelier',
          onInteract: () => this.interactApshoraAnamikaStudio()
        };
        this.interactables.push(this.apshoraInteract);
      } else if (DateState.apshoraQuestStage >= 4) {
        this.apshoraBadge = this.add.text(apshoraPos.x, apshoraPos.y - 67, '👑 Apshora (Fashion Mogul)', {
          fontFamily: 'Outfit', fontSize: '11px', fontStyle: 'bold',
          backgroundColor: '#581c87', color: '#faf5ff', padding: { x: 6, y: 3 }
        }).setOrigin(0.5, 1).setDepth(2100);
        this.apshoraInteract = {
          x: apshoraPos.x, y: apshoraPos.y, radius: 85, sprite: this.apshora, badge: this.apshoraBadge,
          name: 'Talk to Fashion Mogul Apshora',
          onInteract: () => this.interactApshoraSolo()
        };
        this.interactables.push(this.apshoraInteract);
      }

      const rakinPos = DateState.ahonaQuestStage >= 3 ? { x: 1255, y: 480 } : { x: 830, y: 325 };
      this.rakin = this.add.sprite(rakinPos.x, rakinPos.y, 'npc-rakin-0').setOrigin(0.5, 1).setDepth(rakinPos.y);
      this.rakinBadge = this.add.text(rakinPos.x, rakinPos.y - 65, '💌 Rakin', {
        fontFamily: 'Outfit', fontSize: '12px', fontStyle: 'bold',
        backgroundColor: '#1d4e6e', color: '#e6f5ff', padding: { x: 7, y: 3 }
      }).setOrigin(0.5, 1).setDepth(2100).setVisible(DateState.ahonaQuestStage < 4);
      this.rakinInteract = {
        x: rakinPos.x, y: rakinPos.y, radius: 85, sprite: this.rakin, badge: this.rakinBadge,
        name: "Talk to Rakin",
        onInteract: () => this.interactRakin()
      };
      this.interactables.push(this.rakinInteract);

      // Enan & Salat Couple Setup (Mintu Road Fountain Plaza, x: 975–1145, y: 810)
      let salatPos = { x: 975, y: 810 };
      let enanPos = { x: 1145, y: 810 };
      let salatText = '💬 Salat (Wants to talk!)';
      let enanText = '💼 Enan (Typing on phone...)';

      if (DateState.enanQuestStage >= 5) {
        salatPos = { x: 1045, y: 810 };
        enanPos = { x: 1080, y: 810 };
        salatText = '💑 Enan & Salat (Happy Couple)';
        enanText = '💑 Enan & Salat (Happy Couple)';
      } else if (DateState.enanQuestStage === 2) {
        salatPos = { x: 965, y: 810 };
        salatText = '😢 Salat (Crying by Fountain)';
        enanText = '📱 Enan (Glued to Screen)';
      } else if (DateState.enanQuestStage === 3) {
        salatPos = { x: 970, y: 810 };
        salatText = '🥺 Salat (Hoping Totoro Can Help)';
        enanText = '📱 Enan (Glued to Screen)';
      } else if (DateState.enanQuestStage === 4) {
        salatPos = { x: 975, y: 810 };
        salatText = '🥺 Salat (Waiting for Totoro)';
        enanText = '❗ Enan (Totoro will talk to him!)';
      }

      this.salat = this.add.sprite(salatPos.x, salatPos.y, 'npc-salat-0').setOrigin(0.5, 1).setDepth(salatPos.y);
      this.salatBadge = this.add.text(salatPos.x, salatPos.y - 65, salatText, {
        fontFamily: 'Outfit', fontSize: '12px', fontStyle: 'bold',
        backgroundColor: '#831843', color: '#fce7f3', padding: { x: 7, y: 3 }
      }).setOrigin(0.5, 1).setDepth(2100);

      this.salatInteract = {
        x: salatPos.x, y: salatPos.y, radius: 85, sprite: this.salat, badge: this.salatBadge,
        name: 'Talk to Salat',
        onInteract: () => this.interactSalat()
      };
      this.interactables.push(this.salatInteract);

      this.enan = this.add.sprite(enanPos.x, enanPos.y, 'npc-enan-0').setOrigin(0.5, 1).setDepth(enanPos.y);

      this.enanBadge = this.add.text(enanPos.x, enanPos.y - 70, enanText, {
        fontFamily: 'Outfit', fontSize: '12px', fontStyle: 'bold',
        backgroundColor: '#164e63', color: '#cffafe', padding: { x: 7, y: 3 }
      }).setOrigin(0.5, 1).setDepth(2100).setVisible(DateState.enanQuestStage < 5);

      this.enanInteract = {
        x: enanPos.x, y: enanPos.y, radius: 85, sprite: this.enan, badge: this.enanBadge,
        name: 'Talk to Enan',
        onInteract: () => this.interactEnan()
      };
      this.interactables.push(this.enanInteract);

      this.createWanderingCitizens();
    } else {
      // --- WORLDS 2 TO 6: EXPEDITION REALMS (Pathways, Shrines, Gatherables, Enemies & Boss Arena) ---
      this.add.tileSprite(1200, 900, 2000, 110, wCfg.pathTex).setDepth(1);
      this.add.tileSprite(1150, 900, 110, 1300, wCfg.pathTex).setDepth(1);
      this.lakeWater = this.add.tileSprite(1200, 1620, 2200, 320, wCfg.waterTex).setDepth(1);

      const labelStyle = { fontFamily: 'Press Start 2P', fontSize: '11px', color: '#fff8eb', stroke: '#120d1f', strokeThickness: 4 };
      this.add.text(1200, 180, wCfg.name.toUpperCase(), labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1200, 210, wCfg.subtitle, { fontFamily: 'Outfit', fontSize: '15px', color: '#f7cb45' }).setOrigin(0.5).setDepth(2000);

      // Decorative Border & Grove Trees/Pillars
      [
        [260, 520], [560, 520], [880, 520], [1420, 520], [1740, 520], [2040, 520],
        [260, 1260], [560, 1260], [880, 1260], [1420, 1260], [1740, 1260], [2040, 1260]
      ].forEach(([tx, ty]) => addLandmark(tx, ty, wCfg.treeTex, 42, 28));

      // Return Portal (West) & Next World Portal (East)
      registerInteract(wCfg.returnPos.x, wCfg.returnPos.y, 'prop-portal-0', 'Return to Dhaka Valley 🏠', 92, () => {
        this.transitionToWorld('dhaka', { x: 2060, y: 820 });
      });

      registerInteract(wCfg.portalPos.x, wCfg.portalPos.y, 'prop-portal-0', `Portal to ${WORLDS_DB[wCfg.nextWorld].name} 🌀`, 92, () => {
        if (!DateState.defeatedBosses.includes(wCfg.bossSpec.id)) {
          UI.startDialogue([
            { speaker: 'Totoro', portrait: '🐾', text: `The portal is sealed by ${wCfg.bossSpec.name}! Let us defeat the guardian in the arena just to the left first.` }
          ]);
          return;
        }
        this.transitionToWorld(wCfg.nextWorld);
      });

      // Realm Guide NPC
      if (wCfg.npcSpec) {
        let lineCursor = 0;
        registerInteract(wCfg.npcSpec.x, wCfg.npcSpec.y, `${wCfg.npcSpec.tex}-0`, wCfg.npcSpec.name, 88, () => {
          if (wCfg.npcSpec.getDialogue) {
            UI.startDialogue(wCfg.npcSpec.getDialogue(this));
          } else {
            const text = wCfg.npcSpec.lines[lineCursor % wCfg.npcSpec.lines.length];
            lineCursor++;
            UI.startDialogue([{ speaker: wCfg.npcSpec.name, portrait: wCfg.npcSpec.portrait, text }]);
          }
        });
      }

      // Collectible Material Nodes
      const mat = ITEMS_DB[wCfg.matItem];
      [[720, 680], [980, 1120], [1340, 700], [1500, 1140]].forEach(([mx, my], idx) => {
        const entry = registerInteract(mx, my, 'prop-lamp', `Gather ${mat.name} ${mat.emoji}`, 78, () => {
          UI.giveItem(wCfg.matItem, `Gathered ${mat.name} in ${wCfg.name}.`);
          entry.badge.setVisible(false);
          if (entry.sprite) entry.sprite.setVisible(false);
          this.interactables = this.interactables.filter(i => i !== entry);
        });
      });

      // World 2: Whispering Emerald Forest Spooky NPCs & Spirit Altar
      if (worldId === 'forest') {
        // 1. Ananya the Weeping Petni (North Banyan Grove: x: 880, y: 460)
        const ananyaEntry = registerInteract(880, 460, 'npc-ananya-ghost-0', 'Ananya (Weeping Petni) 👻', 90, () => this.interactAnanyaGhost());
        const ananyaAnim = this.getOrCreateWalkAnim('npc-ananya-ghost', 2.5);
        if (ananyaAnim && ananyaEntry.sprite) ananyaEntry.sprite.play(ananyaAnim);

        // 2. Kofil Chacha & Phantom Rickshaw (Southwest Marsh: x: 420, y: 1320)
        const kofilEntry = registerInteract(420, 1320, 'npc-kofil-ghost-0', 'Kofil Chacha (Phantom Rickshaw) 🛺', 95, () => this.interactKofilGhost());
        const kofilAnim = this.getOrCreateWalkAnim('npc-kofil-ghost', 2.5);
        if (kofilAnim && kofilEntry.sprite) kofilEntry.sprite.play(kofilAnim);

        // 3. Prof. Shamsher (DU Occult Investigator: x: 1540, y: 460)
        const shamsherEntry = registerInteract(1540, 460, 'npc-shamsher-investigator-0', 'Prof. Shamsher (Occult Investigator) 📻', 90, () => this.interactShamsherNishi());
        const shamsherAnim = this.getOrCreateWalkAnim('npc-shamsher-investigator', 2.5);
        if (shamsherAnim && shamsherEntry.sprite) shamsherEntry.sprite.play(shamsherAnim);

        // 4. Ancient Spirit Altar (Central Grove: x: 1150, y: 640)
        registerInteract(1150, 640, 'prop-spirit-altar', 'Ancient Spirit Altar 🕯️', 95, () => this.interactSpiritAltar());
      }

      // Spawn Patrol Enemies & Guardian Boss
      this.spawnRealmEnemies(wCfg);
    }

    // Spawn Player & Totoro
    this.player = this.physics.add.sprite(spawnPos.x, spawnPos.y, 'player-0').setOrigin(0.5, 1);
    const pBoxW = 20;
    const pBoxH = 14;
    this.player.body.setSize(pBoxW, pBoxH).setOffset((this.player.width - pBoxW) / 2, this.player.height - pBoxH);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.obstacles);

    const totoroStart = DateState.totoroJoined
      ? { x: spawnPos.x - 42, y: spawnPos.y }
      : { x: 345, y: 1360 };
    this.totoro = this.add.sprite(totoroStart.x, totoroStart.y, 'totoro-0').setOrigin(0.5, 1).setDepth(totoroStart.y);
    this.totoroBadge = this.add.text(totoroStart.x, totoroStart.y - 68,
      DateState.totoroJoined ? '♥ Totoro' : '❗ Totoro (Waiting for you)', {
      fontFamily: 'Outfit', fontSize: '13px', fontStyle: 'bold',
      backgroundColor: '#d45779', color: '#ffffff', padding: { x: 8, y: 4 }
    }).setOrigin(0.5, 1).setDepth(2100);
    this.trail = Array(16).fill({ x: this.player.x, y: this.player.y });

    // Atmospheric Particles
    this.petals = Array.from({ length: 26 }, () => ({
      obj: this.add.circle(Phaser.Math.Between(60, MAP_W - 60), Phaser.Math.Between(60, MAP_H - 60), 3, wCfg.petalColor, 0.75).setDepth(2400),
      vx: Phaser.Math.FloatBetween(-12, -4),
      vy: Phaser.Math.FloatBetween(8, 18),
      phase: Phaser.Math.FloatBetween(0, 6)
    }));

    // Rain Particles & Slanted Streaks Setup
    this.rainGraphics = this.add.graphics().setDepth(2600);
    this.rainDrops = Array.from({ length: 140 }, () => ({
      x: Phaser.Math.Between(0, MAP_W),
      y: Phaser.Math.Between(0, MAP_H),
      len: Phaser.Math.Between(18, 30),
      speed: Phaser.Math.Between(650, 950)
    }));

    // Taro Leaf Sprite attached to Totoro
    this.taroLeaf = this.add.sprite(this.totoro.x, this.totoro.y - 65, 'prop-taro-leaf')
      .setOrigin(0.5, 1).setDepth(this.totoro.depth + 2).setVisible(false);

    // Scattered Glossy Rain Puddles around Curzon Lawn & Dhanmondi Lake Bank
    this.puddles = [];
    if (worldId === 'dhaka') {
      const puddleCoords = [
        // Around Curzon Hall & Lawn
        [210, 1370], [290, 1340], [380, 1380], [420, 1310], [480, 1260],
        // Along Fuller Road Fountain Plaza
        [980, 810], [1060, 860], [1140, 810],
        // Along Dhanmondi Lake Pier Bank
        [1540, 1290], [1580, 1340], [1630, 1285], [1710, 1340]
      ];
      puddleCoords.forEach(([px, py]) => {
        const pd = this.add.sprite(px, py, 'prop-puddle')
          .setOrigin(0.5, 0.5)
          .setDepth(2)
          .setAlpha(0.78);
        this.puddles.push(pd);
      });
    }

    // Fireflies & Moths Swirling around Colonial Street Lamps
    this.fireflies = [];
    if (worldId === 'dhaka' && this.lampGlows) {
      this.lampGlows.forEach(lamp => {
        for (let i = 0; i < 4; i++) {
          const isMoth = i === 0;
          const insect = this.add.circle(
            lamp.x, lamp.y,
            isMoth ? 2 : 1.5,
            isMoth ? 0xfff3a1 : 0x80ffdb,
            0
          ).setDepth(lamp.depth + 3);

          this.fireflies.push({
            obj: insect,
            baseX: lamp.x,
            baseY: lamp.y,
            orbitR: Phaser.Math.Between(18, 38),
            speed: Phaser.Math.FloatBetween(1.8, 3.2),
            phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
            isMoth
          });
        }
      });
    } 

    this.promptBubble = this.add.text(0, 0, 'SPACE / TAP: Interact', {
      fontFamily: 'Press Start 2P', fontSize: '9px',
      backgroundColor: '#fdf5e6', color: '#2b1d14', padding: { x: 6, y: 4 }
    }).setOrigin(0.5, 1).setDepth(3000).setVisible(false);

    this.ambientOverlay = this.add.rectangle(0, 0, MAP_W * 2, MAP_H * 2, 0x1a1438, 0)
      .setOrigin(0, 0).setDepth(2500);

    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.setZoom(1.22);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    UI.updateQuestText();
  }

  /* Spawns patrolling monsters and the world's Guardian Boss */
  /* Spawns patrolling monsters and the world's Guardian Boss */
  spawnRealmEnemies(wCfg) {
    const eSpec = wCfg.enemySpec;
    const positions = [
      { x: 780, y: 860 }, { x: 1020, y: 740 }, { x: 1180, y: 1060 },
      { x: 1420, y: 860 }, { x: 1580, y: 980 }
    ];
    positions.forEach(pos => {
      const sp = this.add.sprite(pos.x, pos.y, `${eSpec.tex}-0`).setOrigin(0.5, 1).setDepth(pos.y);
      const animKey = this.getOrCreateWalkAnim(eSpec.tex, 3.5);
      if (animKey) sp.play(animKey);
      const hpLbl = this.add.text(pos.x, pos.y - 54, `${eSpec.name} (${eSpec.hp})`, {
        fontFamily: 'Outfit', fontSize: '11px', fontStyle: 'bold',
        backgroundColor: 'rgba(25,10,15,0.8)', color: '#ffb3c4', padding: { x: 5, y: 2 }
      }).setOrigin(0.5, 1).setDepth(pos.y + 5);

      this.enemies.push({
        isBoss: false,
        name: eSpec.name,
        baseTex: eSpec.tex,
        sprite: sp,
        label: hpLbl,
        x: pos.x,
        y: pos.y,
        homeX: pos.x,
        homeY: pos.y,
        hp: eSpec.hp,
        maxHp: eSpec.hp,
        atk: eSpec.atk,
        xp: eSpec.xp,
        drop: eSpec.drop,
        speed: 68,
        lastHitPlayer: 0
      });
    });

    // Guardian Boss
    const bSpec = wCfg.bossSpec;
    if (bSpec && !DateState.defeatedBosses.includes(bSpec.id)) {
      const bSp = this.add.sprite(bSpec.x, bSpec.y, `${bSpec.tex}-0`).setOrigin(0.5, 1).setDepth(bSpec.y);
      const bossAnim = this.getOrCreateWalkAnim(bSpec.tex, 3);
      if (bossAnim) bSp.play(bossAnim);
      const bLbl = this.add.text(bSpec.x, bSpec.y - 114, `👑 ${bSpec.name}`, {
        fontFamily: 'Press Start 2P', fontSize: '9px',
        backgroundColor: '#591c33', color: '#fff3a1', padding: { x: 6, y: 4 }
      }).setOrigin(0.5, 1).setDepth(bSpec.y + 5);

      const bossObj = {
        isBoss: true,
        id: bSpec.id,
        name: bSpec.name,
        baseTex: bSpec.tex,
        sprite: bSp,
        label: bLbl,
        x: bSpec.x,
        y: bSpec.y,
        homeX: bSpec.x,
        homeY: bSpec.y,
        hp: bSpec.hp,
        maxHp: bSpec.hp,
        atk: bSpec.atk,
        xp: bSpec.xp,
        reward: bSpec.reward,
        speed: 82,
        lastHitPlayer: 0,
        lastTelegraph: 0
      };
      this.enemies.push(bossObj);
      this.activeBoss = bossObj;
    }
  }

  /* Emits 3 to 4 tiny water splash particles and droplet sound */
  spawnPuddleSplash(x, y) {
    SoundEngine.waterDroplet();
    this.spawnWaterRipple(x, y, 20, 0);

    for (let i = 0; i < 4; i++) {
      const drop = this.add.circle(
        x + Phaser.Math.Between(-6, 6),
        y + Phaser.Math.Between(-4, 4),
        Phaser.Math.FloatBetween(1.2, 2.2),
        0x7fd4e6,
        0.85
      ).setDepth(2600);

      const vx = Phaser.Math.FloatBetween(-28, 28);
      const vy = Phaser.Math.FloatBetween(-35, -15);

      this.tweens.add({
        targets: drop,
        x: drop.x + vx,
        y: drop.y + vy,
        alpha: 0,
        duration: Phaser.Math.Between(220, 360),
        ease: 'Quad.easeOut',
        onComplete: () => drop.destroy()
      });
    }
  }

  /* Sweeps a lateral gust of 8–12 crimson petals across the camera */
  triggerPetalWindGust() {
    if (DateState.currentWorld !== 'dhaka') return;
    const cam = this.cameras.main;
    const startX = cam.scrollX - 40;
    const count = Phaser.Math.Between(8, 12);

    for (let i = 0; i < count; i++) {
      const startY = cam.scrollY + Phaser.Math.Between(20, cam.height - 20);
      const petal = this.add.circle(
        startX - Phaser.Math.Between(0, 120),
        startY,
        Phaser.Math.FloatBetween(2.2, 3.4),
        Phaser.Math.RND.pick([0xe63946, 0xff5c77, 0xff7b33]),
        0.85
      ).setDepth(2700);

      const travelDist = cam.width + 180;
      const duration = Phaser.Math.Between(1300, 2000);

      this.tweens.add({
        targets: petal,
        x: petal.x + travelDist,
        y: petal.y + Phaser.Math.Between(-30, 40),
        alpha: { from: 0.85, to: 0 },
        duration,
        ease: 'Sine.easeInOut',
        onComplete: () => petal.destroy()
      });
    }
  }

  /* Real-Time Combat: 3-Hit Weapon Combo System with Elemental Slashes */
  performPlayerAttack() {
    if (UI.isOpen() || this.cutsceneLocked || !this.player) return;
    const now = this.time.now;
    if (now - this.lastAtkTime < 220) return;

    if (now - this.lastAtkTime < 650) {
      this.comboStep = (this.comboStep + 1) % 3;
    } else {
      this.comboStep = 0;
    }
    this.lastAtkTime = now;

    const weaponId = (DateState.equipped && DateState.equipped.weapon) || 'umbrella_blade';
    const wfx = WEAPON_FX[weaponId] || WEAPON_FX.umbrella_blade;
    const baseAngle = Math.atan2(this.facingVec.y, this.facingVec.x);
    const px = this.player.x;
    const py = this.player.y - 18;

    if (this.comboStep === 0) {
      // --- COMBO HIT 1: Swift Crescent Slash ---
      SoundEngine.attackSlash();

      // Quick forward lunge & tilt
      const lungeDist = 10;
      this.tweens.add({
        targets: this.player,
        x: px + this.facingVec.x * lungeDist,
        y: this.player.y + this.facingVec.y * lungeDist,
        duration: 75,
        yoyo: true,
        ease: 'Quad.easeOut'
      });
      this.tweens.add({
        targets: this.player,
        angle: this.player.flipX ? 14 : -14,
        duration: 70,
        yoyo: true,
        onComplete: () => this.player.setAngle(0)
      });

      // Luminous Crescent Slash Graphic
      const slashGfx = this.add.graphics().setDepth(2900);
      slashGfx.lineStyle(6, wfx.color, 0.95);
      slashGfx.beginPath();
      slashGfx.arc(px, py, 46, baseAngle - 0.95, baseAngle + 0.95, false);
      slashGfx.strokePath();

      slashGfx.lineStyle(2.5, wfx.glow, 1);
      slashGfx.beginPath();
      slashGfx.arc(px, py, 46, baseAngle - 0.75, baseAngle + 0.75, false);
      slashGfx.strokePath();

      this.tweens.add({
        targets: slashGfx,
        scaleX: 1.35,
        scaleY: 1.35,
        alpha: 0,
        duration: 180,
        ease: 'Quad.easeOut',
        onComplete: () => slashGfx.destroy()
      });

      // Flying weapon spark particles
      for (let i = 0; i < 3; i++) {
        const offsetAng = baseAngle + (i - 1) * 0.45;
        const spark = this.add.text(px + Math.cos(offsetAng) * 28, py + Math.sin(offsetAng) * 28, wfx.sparks[i % wfx.sparks.length], { fontSize: '11px' }).setOrigin(0.5).setDepth(2910);
        this.tweens.add({
          targets: spark,
          x: px + Math.cos(offsetAng) * 58,
          y: py + Math.sin(offsetAng) * 58,
          alpha: 0,
          scale: 0.4,
          duration: 220,
          onComplete: () => spark.destroy()
        });
      }

      const dmg = RPGStats.getAtk() + Phaser.Math.Between(0, 3);
      this.damageEnemiesInRadius(px + this.facingVec.x * 42, py + this.facingVec.y * 42, 70, dmg, 24);

    } else if (this.comboStep === 1) {
      // --- COMBO HIT 2: Piercing Starlight Thrust / Flurry Jab ---
      SoundEngine.attackThrust();

      // Extended lunge & stretch
      const lungeDist = 18;
      this.tweens.add({
        targets: this.player,
        x: px + this.facingVec.x * lungeDist,
        y: this.player.y + this.facingVec.y * lungeDist,
        scaleX: this.player.flipX ? -1.25 : 1.25,
        scaleY: 0.88,
        duration: 90,
        yoyo: true,
        ease: 'Cubic.easeOut',
        onComplete: () => this.player.setScale(this.player.flipX ? -1 : 1, 1)
      });

      // Long Piercing Starlight Spear Beam
      const tipX = px + this.facingVec.x * 74;
      const tipY = py + this.facingVec.y * 74;
      const thrustGfx = this.add.graphics().setDepth(2900);
      thrustGfx.lineStyle(7, wfx.color, 0.85);
      thrustGfx.lineBetween(px, py, tipX, tipY);
      thrustGfx.lineStyle(3, wfx.glow, 1);
      thrustGfx.lineBetween(px, py, tipX, tipY);
      thrustGfx.fillStyle(wfx.glow, 1);
      thrustGfx.fillCircle(tipX, tipY, 7);

      this.tweens.add({
        targets: thrustGfx,
        alpha: 0,
        duration: 200,
        onComplete: () => thrustGfx.destroy()
      });

      // Piercing starburst on impact
      for (let i = 0; i < 4; i++) {
        const sang = (i / 4) * Math.PI * 2;
        const spark = this.add.text(tipX, tipY, wfx.sparks[0], { fontSize: '12px' }).setOrigin(0.5).setDepth(2910);
        this.tweens.add({
          targets: spark,
          x: tipX + Math.cos(sang) * 35,
          y: tipY + Math.sin(sang) * 35,
          alpha: 0,
          scale: 0.3,
          duration: 220,
          onComplete: () => spark.destroy()
        });
      }

      const dmg = Math.floor(RPGStats.getAtk() * 1.35) + Phaser.Math.Between(2, 6);
      this.damageEnemiesInRadius(tipX, tipY, 68, dmg, 36);

    } else {
      // --- COMBO HIT 3: 360° Starlight Blossom Cyclone (Finisher) ---
      SoundEngine.attackSpin();

      // Full 360-degree whirlwind spin
      this.tweens.add({
        targets: this.player,
        angle: this.player.flipX ? -360 : 360,
        duration: 250,
        ease: 'Cubic.easeInOut',
        onComplete: () => this.player.setAngle(0)
      });

      this.cameras.main.shake(130, 0.009);

      // Expanding 360° Blossom Ring
      const ringGfx = this.add.graphics().setDepth(2900);
      ringGfx.lineStyle(6, wfx.color, 0.95);
      ringGfx.strokeCircle(px, py, 26);
      ringGfx.lineStyle(2.5, wfx.glow, 1);
      ringGfx.strokeCircle(px, py, 22);

      this.tweens.add({
        targets: ringGfx,
        scaleX: 3.8,
        scaleY: 3.8,
        alpha: 0,
        duration: 320,
        ease: 'Quad.easeOut',
        onComplete: () => ringGfx.destroy()
      });

      // 8-pointed mandala blossom burst
      for (let i = 0; i < 8; i++) {
        const rad = (i / 8) * Math.PI * 2;
        const spark = this.add.text(px, py, wfx.sparks[i % wfx.sparks.length], { fontSize: '14px' })
          .setOrigin(0.5).setDepth(2950);
        this.tweens.add({
          targets: spark,
          x: px + Math.cos(rad) * 98,
          y: py + Math.sin(rad) * 98,
          alpha: 0,
          scale: 0.45,
          duration: 320,
          ease: 'Sine.easeOut',
          onComplete: () => spark.destroy()
        });
      }

      const dmg = Math.floor(RPGStats.getAtk() * 1.9) + Phaser.Math.Between(6, 12);
      this.damageEnemiesInRadius(px, py, 118, dmg, 48);

      // Totoro Leaf Cyclone Synergy if Totoro is present and nearby
      if (DateState.totoroJoined && this.totoro && Phaser.Math.Distance.Between(px, py, this.totoro.x, this.totoro.y) < 180) {
        this.triggerTotoroLeafSynergy();
      }
    }
  }

  /* Totoro Leaf Cyclone Assist: Synced with Combo Finisher */
  triggerTotoroLeafSynergy() {
    SoundEngine.teaClink();
    this.totoroBusyUntil = this.time.now + 380;
    this.tweens.add({
      targets: this.totoro,
      angle: this.totoro.flipX ? -22 : 22,
      duration: 110,
      yoyo: true,
      onComplete: () => this.totoro.setAngle(0)
    });

    const leaf = this.add.text(this.totoro.x, this.totoro.y - 25, '🍃', { fontSize: '18px' })
      .setOrigin(0.5).setDepth(2900);
    const targetX = this.totoro.x + this.facingVec.x * 145;
    const targetY = this.totoro.y + this.facingVec.y * 145;

    this.tweens.add({
      targets: leaf,
      x: targetX,
      y: targetY,
      angle: 360,
      scale: 1.5,
      duration: 280,
      ease: 'Quad.easeOut',
      onComplete: () => {
        leaf.destroy();
        this.damageEnemiesInRadius(targetX, targetY, 60, Math.floor(RPGStats.getAtk() * 0.8) + 4, 25);
      }
    });
  }

  /* Companion Special Ability: Totoro's Spirit Shockwave Roar (Q or Mobile Roar) */
  performTotoroRoar() {
    if (UI.isOpen() || this.cutsceneLocked) return;
    if (!DateState.totoroJoined || !this.totoro) {
      UI.showToast('🐾', 'Partner Needed', 'Meet Totoro at Curzon Hall to unlock companion abilities!');
      return;
    }
    const now = this.time.now;
    if (now - (this.lastSkillTime || 0) < 1800) return;
    if (DateState.sp < 14) {
      UI.showToast('💧', 'Low Spirit!', 'Sip TSC Malai Cha or wait for SP to regenerate.');
      return;
    }
    this.lastSkillTime = now;
    DateState.sp -= 14;
    UI.updateRPGStats();

    this.totoroBusyUntil = now + 650;
    SoundEngine.totoroRoar();
    this.cameras.main.shake(180, 0.007);

    // Totoro squash, chest-puff and spirit leap
    this.tweens.add({
      targets: this.totoro,
      scaleX: 1.35,
      scaleY: 0.8,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.tweens.add({
          targets: this.totoro,
          y: this.totoro.y - 18,
          scaleX: 1.1,
          scaleY: 1.25,
          duration: 150,
          yoyo: true,
          ease: 'Sine.easeOut'
        });
      }
    });

    // Expanding dual spirit shockwave rings
    const ring1 = this.add.circle(this.totoro.x, this.totoro.y - 24, 24, 0x80ffdb, 0.55).setDepth(2800);
    this.tweens.add({
      targets: ring1,
      radius: 185,
      alpha: 0,
      duration: 420,
      ease: 'Quad.easeOut',
      onComplete: () => ring1.destroy()
    });

    const ring2 = this.add.circle(this.totoro.x, this.totoro.y - 24, 18, 0xfde047, 0.45).setDepth(2801);
    this.tweens.add({
      targets: ring2,
      radius: 220,
      alpha: 0,
      duration: 500,
      ease: 'Sine.easeOut',
      onComplete: () => ring2.destroy()
    });

    // Swirl of spirit leaves & starlight particles
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const leaf = this.add.text(this.totoro.x, this.totoro.y - 24, i % 2 === 0 ? '🍃' : '✨', { fontSize: '13px' }).setOrigin(0.5).setDepth(2850);
      this.tweens.add({
        targets: leaf,
        x: this.totoro.x + Math.cos(angle) * 125,
        y: this.totoro.y - 24 + Math.sin(angle) * 125,
        alpha: 0,
        scale: 0.4,
        duration: 460,
        onComplete: () => leaf.destroy()
      });
    }

    // Heal & Swiftness Speed Boost for Moon Walker
    DateState.hp = Math.min(DateState.maxHp, DateState.hp + 16);
    DateState.sp = Math.min(DateState.maxSp, DateState.sp + 8);
    UI.updateRPGStats();
    this.spawnDamageNumber(this.player.x, this.player.y - 50, '+16 HP 💚', '#4ade80');
    this.swiftnessUntil = now + 3500;

    // Deal heavy AoE magic spirit damage
    const roarDmg = Math.floor(RPGStats.getAtk() * 1.8) + 6;
    this.damageEnemiesInRadius(this.totoro.x, this.totoro.y, 185, roarDmg, 36);
  }

  /* Companion Special Ability: Totoro's Seismic Belly Slam / Ground Pound (R or Mobile Slam) */
  performTotoroGroundSlam() {
    if (UI.isOpen() || this.cutsceneLocked) return;
    if (!DateState.totoroJoined || !this.totoro) {
      UI.showToast('🐾', 'Partner Needed', 'Meet Totoro at Curzon Hall to unlock companion abilities!');
      return;
    }
    const now = this.time.now;
    if (now - (this.lastSlamTime || 0) < 2400) return;
    if (DateState.sp < 18) {
      UI.showToast('💧', 'Low Spirit!', 'Sip TSC Malai Cha or wait for SP to regenerate.');
      return;
    }
    this.lastSlamTime = now;
    DateState.sp -= 18;
    UI.updateRPGStats();

    this.totoroBusyUntil = now + 1000;

    // Pick leap target: nearest enemy within 240px, or 45px in player facing direction
    let targetX = this.player.x + this.facingVec.x * 45;
    let targetY = this.player.y + this.facingVec.y * 45;
    let closestDist = 9999;
    this.enemies.forEach(en => {
      const d = Phaser.Math.Distance.Between(this.totoro.x, this.totoro.y, en.x, en.y);
      if (d < 240 && d < closestDist) {
        closestDist = d;
        targetX = en.x;
        targetY = en.y;
      }
    });

    targetX = Phaser.Math.Clamp(targetX, 60, (this.currentMapW || 2400) - 60);
    targetY = Phaser.Math.Clamp(targetY, 60, (this.currentMapH || 1800) - 60);

    // Drop landing reticle shadow on ground
    const shadow = this.add.ellipse(targetX, targetY, 44, 20, 0x111827, 0.45).setDepth(targetY - 1);
    this.tweens.add({
      targets: shadow,
      scaleX: 1.6,
      scaleY: 1.6,
      alpha: 0.75,
      duration: 380
    });

    // Totoro leaps high into the air with 360 somersault flip
    this.tweens.add({
      targets: this.totoro,
      x: targetX,
      y: targetY - 88,
      angle: 360,
      scaleX: 0.9,
      scaleY: 1.25,
      duration: 380,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.totoro.setAngle(0);
        this.totoro.setScale(1.4, 0.9); // Big belly bounce pose!

        // Slam down fast!
        this.tweens.add({
          targets: this.totoro,
          y: targetY,
          duration: 130,
          ease: 'Quad.easeIn',
          onComplete: () => {
            shadow.destroy();

            // Screen shake & heavy slam sound
            SoundEngine.totoroSlam();
            this.cameras.main.shake(250, 0.015);

            // Squash & stretch on impact
            this.tweens.add({
              targets: this.totoro,
              scaleX: 1.55,
              scaleY: 0.65,
              duration: 80,
              yoyo: true,
              ease: 'Quad.easeOut',
              onComplete: () => {
                this.totoro.setScale(1, 1);
              }
            });

            // Shockwave dust ring
            const dustRing = this.add.circle(targetX, targetY, 20, 0xc2a67e, 0.6).setDepth(targetY - 1);
            this.tweens.add({
              targets: dustRing,
              radius: 175,
              alpha: 0,
              duration: 420,
              ease: 'Quad.easeOut',
              onComplete: () => dustRing.destroy()
            });

            // Debris & dust puffs
            for (let i = 0; i < 10; i++) {
              const ang = (i / 10) * Math.PI * 2;
              const dist = Phaser.Math.Between(40, 110);
              const puff = this.add.circle(
                targetX + Math.cos(ang) * 15,
                targetY + Math.sin(ang) * 10,
                Phaser.Math.Between(4, 7),
                i % 2 === 0 ? 0x854d0e : 0xd8c7a0,
                0.7
              ).setDepth(targetY + 2);
              this.tweens.add({
                targets: puff,
                x: targetX + Math.cos(ang) * dist,
                y: targetY + Math.sin(ang) * (dist * 0.6) - 14,
                scale: 1.8,
                alpha: 0,
                duration: 380,
                onComplete: () => puff.destroy()
              });
            }

            // Deal crushing damage & stun all enemies in radius
            const slamDmg = Math.floor(RPGStats.getAtk() * 2.2) + Phaser.Math.Between(8, 15);
            this.damageEnemiesInRadius(targetX, targetY, 175, slamDmg, 45, true);
          }
        });
      }
    });
  }

  /* Backward compatibility for generic skill trigger */
  performTotoroSkill() {
    this.performTotoroRoar();
  }

  /* Spawns orbiting dizzy stars around stunned enemy */
  spawnStunStars(en) {
    for (let i = 0; i < 3; i++) {
      const star = this.add.text(en.x, en.y - 45, '⭐', { fontSize: '13px' }).setOrigin(0.5).setDepth(en.y + 10);
      const angleOffset = (i / 3) * Math.PI * 2;
      const startTime = this.time.now;
      const timer = this.time.addEvent({
        delay: 30,
        repeat: 70,
        callback: () => {
          if (!en.sprite || !en.sprite.active || !en.stunnedUntil || this.time.now > en.stunnedUntil) {
            star.destroy();
            timer.remove();
            return;
          }
          const elapsed = (this.time.now - startTime) * 0.007;
          star.setPosition(en.x + Math.cos(elapsed + angleOffset) * 18, en.y - 46 + Math.sin(elapsed + angleOffset) * 7);
        }
      });
      this.time.delayedCall(2200, () => {
        if (star && star.active) star.destroy();
      });
    }
  }

  damageEnemiesInRadius(cx, cy, radius, dmg, knockback = 26, isStun = false) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const en = this.enemies[i];
      const d = Phaser.Math.Distance.Between(cx, cy, en.x, en.y - 20);
      if (d <= radius) {
        en.hp -= dmg;
        SoundEngine.enemyHit();
        this.spawnDamageNumber(en.x, en.y - 50, `-${dmg}`, isStun ? '#f59e0b' : '#ffea79');

        if (isStun && !en.isBoss) {
          en.stunnedUntil = this.time.now + 2200;
          this.spawnDamageNumber(en.x, en.y - 70, 'STUNNED! 💫', '#67e8f9');
          this.spawnStunStars(en);
        }

        const angle = Phaser.Math.Angle.Between(cx, cy, en.x, en.y);
        en.x = Phaser.Math.Clamp(en.x + Math.cos(angle) * knockback, 60, 2340);
        en.y = Phaser.Math.Clamp(en.y + Math.sin(angle) * knockback, 60, 1740);
        en.sprite.setPosition(en.x, en.y);
        if (en.label) {
          en.label.setPosition(en.x, en.y - (en.isBoss ? 114 : 54));
        }

        if (en.hp <= 0) {
          this.handleEnemyDefeated(en, i);
        } else {
          if (en.isBoss) {
            UI.setBossHUD(true, en.name, en.hp, en.maxHp);
          } else {
            en.label.setText(`${en.name} (${en.hp})`);
          }
        }
      }
    }
  }

  handleEnemyDefeated(en, idx) {
    en.sprite.destroy();
    en.label.destroy();
    this.enemies.splice(idx, 1);
    RPGStats.gainXP(en.xp);

    if (en.drop) {
      UI.giveItem(en.drop);
    }

    if (en.isBoss) {
      this.activeBoss = null;
      UI.setBossHUD(false);
      if (!DateState.defeatedBosses.includes(en.id)) {
        DateState.defeatedBosses.push(en.id);
      }
      const wCfg = WORLDS_DB[DateState.currentWorld];
      if (wCfg && wCfg.nextWorld && !DateState.unlockedWorlds.includes(wCfg.nextWorld)) {
        DateState.unlockedWorlds.push(wCfg.nextWorld);
      }
      if (en.reward) {
        UI.giveItem(en.reward, `Defeated ${en.name} in ${wCfg.name}!`);
      }
      UI.updateQuestText();
      RPGStats.saveGame(this);

      if (en.id === 'boss_astral') {
        UI.startDialogue([
          { speaker: 'Totoro', portrait: '🐾', text: 'Moon Walker! We shattered the Chrono-Fracture Archon! The Six Realms and all our Dhaka Valley memories are safe forever!' },
          { speaker: 'Moon Walker', portrait: '🌙', text: 'From Curzon Hall to the stars of the Astral Realm... best adventure and best date in history!' }
        ], () => UI.showScrapbook());
      }
    }
  }

  spawnDamageNumber(x, y, text, color = '#ffffff') {
    const lbl = this.add.text(x, y, text, {
      fontFamily: 'Press Start 2P', fontSize: '11px', color, stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(3100);
    this.tweens.add({
      targets: lbl,
      y: y - 34,
      alpha: 0,
      duration: 650,
      onComplete: () => lbl.destroy()
    });
  }

/* Seven Dynamically Walking Citizens in Dhaka Valley (Including Bestie Anamika!) */
  createWanderingCitizens() {
    const specs = [
      {
        name: 'Anamika', baseTex: 'npc-anamika', portrait: '🥙', isAnamika: true,
        waypoints: [{ x: 640, y: 780 }, { x: 980, y: 780 }, { x: 980, y: 540 }, { x: 640, y: 540 }],
        speed: 50,
        conversations: [
          [
            { speaker: 'Anamika', portrait: '🥙', text: 'Moon Walker!! Wait up! I literally just walked past TSC looking for you. Look at you and Totoro strolling together—my heart cannot handle how cute you two are!' },
            { speaker: 'Moon Walker', portrait: '🌙', text: 'Anamika! We were just exploring campus. Wait, is that a Star Kebab takeaway bag in your hand already?! We had a pact to go together!' },
            { speaker: 'Anamika', portrait: '🥙', text: 'Relax, bestie, this is just a warm-up leg roast! Our official Star Kebab mutton kacchi, brain masala, and cold falooda date at Dhanmondi is still 100% on for tomorrow!' },
            { speaker: 'Totoro', portrait: '🐾', text: 'Did someone say Star Kebab mutton kacchi and falooda? Anamika, you are officially my favorite friend of Moon Walker.' }
          ],
          [
            { speaker: 'Anamika', portrait: '📱', text: '*Sighs at her phone screen*... Shuvra just called me from Barishal. He is standing on the deck of the Sadarghat-bound launch watching the Kirtankhola River.' },
            { speaker: 'Moon Walker', portrait: '🌙', text: 'Aww, how is Shuvra doing in Barishal? Is he taking the night launch to Dhaka this weekend?' },
            { speaker: 'Anamika', portrait: '🥺', text: 'Yes! He promised to bring a whole tin of Barishal’s famous Guthia Sandesh and Balam rice when his launch docks at Sadarghat at 6 AM.' },
            { speaker: 'Moon Walker', portrait: '🌙', text: 'And let me guess—the second Shuvra steps off the launch, the four of us are heading straight to Star Kebab for breakfast parathas, khichuri, and beef seekh?' },
            { speaker: 'Anamika', portrait: '🥙', text: 'You know me better than I know myself! Shuvra already said he is paying for the extra falooda.' }
          ],
          [
            { speaker: 'Anamika', portrait: '🥙', text: 'Okay, real talk: remember last month at Star Kebab when we laughed so hard over Shuvra’s Barishal slang that you nearly spilled borhani on the waiter?' },
            { speaker: 'Moon Walker', portrait: '🌙', text: 'Hey! You were the one doing a dramatic impression of Shuvra arguing with a launch cabin master!' },
            { speaker: 'Totoro', portrait: '🐾', text: 'Wait, I need to hear this entire story over clay-cup cha. Does Shuvra really defend Barishal launches like a matter of national pride?' },
            { speaker: 'Anamika', portrait: '😂', text: 'Totoro, do NOT get Shuvra started on Barishal launches unless you have three hours to spare and a full plate of Star Kebab beef chap in front of you!' }
          ],
          [
            { speaker: 'Anamika', portrait: '💌', text: 'Shuvra just texted: "Tell Moon Walker and Totoro that next time they visit Barishal, floating guava market tour and river hilsa are on me!"' },
            { speaker: 'Moon Walker', portrait: '🌙', text: 'Tell Shuvra it is a deal! Though until he gets back from Barishal, I am keeping you company on every Star Kebab run.' },
            { speaker: 'Totoro', portrait: '🐾', text: 'Long-distance from Dhaka to Barishal takes real devotion. Shuvra sounds like a solid guy, Anamika!' }
          ]
        ]
      },
      {
        name: 'Arif (DU Physics Senior)', baseTex: 'npc-walker1', portrait: '🎓',
        waypoints: [{ x: 480, y: 1180 }, { x: 480, y: 520 }, { x: 780, y: 520 }, { x: 480, y: 520 }],
        speed: 55,
        conversations: [
          [
            { speaker: 'Arif (DU Physics Senior)', portrait: '🎓', text: 'I was supposed to be deriving Schrödinger’s wave equation at the Science Library, yet the Krishnachura breeze on Fuller Road pulled me out here.' },
            { speaker: 'Totoro', portrait: '🐾', text: 'According to my calculations, walking beside Moon Walker increases local happiness by 1000%.' }
          ],
          [
            { speaker: 'Arif (DU Physics Senior)', portrait: '🎓', text: 'Did you notice the shimmering spacetime anomaly at the East end of Fuller Road? My magnetometer went crazy near it!' },
            { speaker: 'Moon Walker', portrait: '🌙', text: 'That is the Realm Fracture Portal! Totoro and I are planning to investigate it together.' }
          ],
          [
            { speaker: 'Arif (DU Physics Senior)', portrait: '🎓', text: 'Curzon Hall’s red bricks have seen a hundred monsoons, yet every afternoon under these trees feels brand new.' },
            { speaker: 'Totoro', portrait: '🐾', text: 'Especially when you have the right lab partner holding your hand.' }
          ],
          [
            { speaker: 'Arif (DU Physics Senior)', portrait: '🎓', text: 'Pro-tip from a final-year senior: two cups of Tong-er Mama’s cardamom Malai Cha can solve more problems than any textbook.' }
          ]
        ]
      },
      {
        name: 'Nadia (Charukola Sketcher)', baseTex: 'npc-walker2', portrait: '🖌️',
        waypoints: [{ x: 340, y: 820 }, { x: 820, y: 820 }],
        speed: 48,
        conversations: [
          [
            { speaker: 'Nadia (Charukola Sketcher)', portrait: '🖌️', text: 'Hold that pose for five seconds! A girl in a yellow polo and amber suspender skirt walking beside a giant forest spirit is pure Studio Ghibli magic!' },
            { speaker: 'Totoro', portrait: '🐾', text: 'Make sure you get my good side—and draw Chibi-Totoro on top of my head too!' }
          ],
          [
            { speaker: 'Nadia (Charukola Sketcher)', portrait: '🖌️', text: 'We stayed up all night painting alpana and terracotta murals along the Charukola wall. Have you two painted your clay mugs yet?' },
            { speaker: 'Moon Walker', portrait: '🌙', text: 'Charukola always has the warmest colors in Dhaka. We love stopping by the banyan trees there!' }
          ],
          [
            { speaker: 'Nadia (Charukola Sketcher)', portrait: '🖌️', text: 'Look at the contrast between the crimson Krishnachura petals and the old red bricks of Curzon Hall. Dhaka in love is a living canvas.' }
          ],
          [
            { speaker: 'Nadia (Charukola Sketcher)', portrait: '🖌️', text: 'I sketched your silhouettes in charcoal! If you ever frame it, title it "Chronicles of Fuller Road."' }
          ]
        ]
      },
      {
        name: 'Mimi (Campus Ginger Cat)', baseTex: 'npc-cat', portrait: '🐱', isCat: true,
        waypoints: [{ x: 260, y: 380 }, { x: 540, y: 380 }, { x: 540, y: 260 }, { x: 260, y: 260 }],
        speed: 42,
        conversations: [
          [
            { speaker: 'Mimi (Campus Ginger Cat)', portrait: '🐱', text: 'Mrr-meow! (Mimi figure-eights around your ankles and stares up at Totoro’s giant cream belly like it is the ultimate nap cloud.)' },
            { speaker: 'Totoro', portrait: '🐾', text: 'Look, Moon Walker, Mimi approves of us! Can we make her our official TSC mascot?' }
          ],
          [
            { speaker: 'Mimi (Campus Ginger Cat)', portrait: '🐱', text: 'Purrrrr... (Mimi gently taps your hand with a white-socked paw, politely inquiring if you brought any leftover Star Kebab roast from Anamika.)' },
            { speaker: 'Moon Walker', portrait: '🌙', text: 'Haha, Mimi has the most refined food radar on the entire Dhaka University campus!' }
          ],
          [
            { speaker: 'Mimi (Campus Ginger Cat)', portrait: '🐱', text: 'Mew! (Mimi bats playfully at the dangling pink blossom on Chibi-Totoro’s miniature fishing line, then curls her tail happily.)' }
          ],
          [
            { speaker: 'Mimi (Campus Ginger Cat)', portrait: '🐱', text: 'Prrrr-chirp! (Mimi stretches in the warm afternoon sunbeam and gives you a slow, affectionate cat-blink.)' }
          ]
        ]
      },
      {
        name: 'Baki Bhai (Nilkhet Poet)', baseTex: 'npc-walker3', portrait: '📜', isPoet: true,
        waypoints: [{ x: 620, y: 320 }, { x: 1380, y: 320 }],
        speed: 46,
        conversations: [
          [
            { speaker: 'Baki Bhai (Nilkhet Poet)', portrait: '📜', text: '"In a city of ten million rickshaw bells, one quiet glance across a clay teacup says everything." I just composed that for you two!' },
            { speaker: 'Totoro', portrait: '🐾', text: 'Write that down in my notebook, Baki Bhai! I need lines like that whenever Moon Walker smiles at me.' }
          ],
          [
            { speaker: 'Baki Bhai (Nilkhet Poet)', portrait: '📜', text: 'Jibanananda Das once wrote of Banalata Sen of Natore, yet today I see the poetry of Dhaka walking right past Aparajeyo Bangla.' },
            { speaker: 'Moon Walker', portrait: '🌙', text: 'Nilkhet’s old book alleys and Baki Bhai’s verses make the whole afternoon feel timeless.' }
          ],
          [
            { speaker: 'Baki Bhai (Nilkhet Poet)', portrait: '📜', text: 'When you buy a second-hand poetry book in Nilkhet, check the margins—sometimes previous lovers left pressed Krishnachura petals inside.' }
          ],
          [
            { speaker: 'Baki Bhai (Nilkhet Poet)', portrait: '📜', text: '"From the arches of Curzon to the lanterns of Dhanmondi Lake, may your footsteps always rhyme."' }
          ]
        ]
      },
      {
        name: 'Sami (Street Photographer)', baseTex: 'npc-photo', portrait: '📸', isPhoto: true,
        waypoints: [{ x: 1520, y: 420 }, { x: 1520, y: 1120 }],
        speed: 54,
        conversations: [
          [
            { speaker: 'Sami (Street Photographer)', portrait: '📸', text: '*Click-shutter!* Caught a 50mm prime candid of you two! The way Totoro looks at you when you are laughing is pure magazine-cover material.' },
            { speaker: 'Totoro', portrait: '🐾', text: 'Guilty as charged. How am I supposed to look anywhere else when Moon Walker is right here?' }
          ],
          [
            { speaker: 'Sami (Street Photographer)', portrait: '📸', text: 'Golden hour light bouncing off the Fuller Road fountain and Dhanmondi Lake is every Dhaka street photographer’s dream.' },
            { speaker: 'Moon Walker', portrait: '🌙', text: 'Save a copy of that photo for our Chronicle Scrapbook, Sami!' }
          ],
          [
            { speaker: 'Sami (Street Photographer)', portrait: '📸', text: '*Click!* I also snapped a photo of your friend Anamika earlier—she was proudly holding up a Star Kebab parcel while on video call with Barishal!' }
          ],
          [
            { speaker: 'Sami (Street Photographer)', portrait: '📸', text: 'If you two take the painted rickshaw tour at dusk, wave at my lens when you pass the fountain plaza!' }
          ]
        ]
      },
      {
        name: 'Tania (Dhanmondi Jogger)', baseTex: 'npc-jogger', portrait: '👟',
        waypoints: [{ x: 1150, y: 820 }, { x: 1680, y: 820 }, { x: 1680, y: 1180 }, { x: 1150, y: 1180 }],
        speed: 68,
        conversations: [
          [
            { speaker: 'Tania (Dhanmondi Jogger)', portrait: '👟', text: 'Phew! Three laps around Ramna and Dhanmondi Lake! Every couple on the wooden pier tonight looks like they are in a romantic movie.' },
            { speaker: 'Totoro', portrait: '🐾', text: 'We are saving the lantern rowboat at the tip of the pier for our grand finale!' }
          ],
          [
            { speaker: 'Tania (Dhanmondi Jogger)', portrait: '👟', text: 'Someone set up a brass stargazing telescope on the Dhanmondi Lake pier! The evening breeze just cleared the sky.' }
          ],
          [
            { speaker: 'Tania (Dhanmondi Jogger)', portrait: '👟', text: 'My cardio routine is 50% jogging and 50% resisting the urge to stop at Mama’s Naga Fuchka cart and Old Dhaka Mishti Doi.' },
            { speaker: 'Moon Walker', portrait: '🌙', text: 'Life is too short to skip Naga fuchka and Bogurar Mishti Doi, Tania!' }
          ],
          [
            { speaker: 'Tania (Dhanmondi Jogger)', portrait: '👟', text: 'Keep hydrated, you two! If you head into the Eastern Portal, make sure you have plenty of TSC Malai Cha in your bag.' }
          ]
        ]
      }
    ];

    specs.forEach(s => {
      const start = s.waypoints[0];
      const sp = this.add.sprite(start.x, start.y, `${s.baseTex}-0`).setOrigin(0.5, 1).setDepth(start.y);
      const animKey = this.getOrCreateWalkAnim(s.baseTex, 4);
      if (animKey) sp.play(animKey);
      const badge = this.add.text(start.x, start.y - sp.height - 6, '💬 ' + s.name, {
        fontFamily: 'Outfit', fontSize: '11px', fontStyle: 'bold',
        backgroundColor: s.isAnamika ? 'rgba(19, 78, 74, 0.92)' : 'rgba(31,30,28,0.75)',
        color: s.isAnamika ? '#fff3a1' : '#f7efe2',
        padding: { x: 5, y: 2 }
      }).setOrigin(0.5, 1).setDepth(start.y + 5);

      const wObj = {
        ...s,
        sprite: sp,
        badge,
        wpIdx: 1 % s.waypoints.length,
        lineIdx: 0,
        x: start.x,
        y: start.y,
        radius: 82,
        onInteract: () => {
          RPGStats.gainXP(15);

          // 1. Bestie Anamika Interactive Dialogue Hub
          if (s.isAnamika) {
            SoundEngine.heartUp();
            UI.startDialogue([
              {
                speaker: 'Anamika',
                portrait: '🥙',
                text: 'Moon Walker!! Bestie! Look at you and Totoro strolling together—my heart cannot handle how cute you two are! What’s the scoop?',
                choices: [
                  ...(DateState.apshoraQuestStage === 1 ? [{
                    label: '👗 "Anamika! Apshora wants to meet you—she has an incredible fashion startup vision!"',
                    onPick: () => this.playApshoraAnamikaPitchCutscene()
                  }] : []),
                  ...(DateState.apshoraQuestStage === 2 ? [{
                    label: '✨ "How is the debut \'Nodi O Jamdani\' collection coming along, Anamika?"',
                    onPick: () => this.interactApshoraAnamikaStudio()
                  }] : []),
                  ...(DateState.apshoraQuestStage === 3 ? [{
                    label: '🎉 "The runway is set! Let us begin the Grand Debut Exhibition at Curzon Hall!"',
                    onPick: () => this.playApshoraExhibitionCutscene()
                  }] : []),
                  ...(DateState.apshoraQuestStage >= 4 ? [{
                    label: '👑 "To Dhaka\'s most celebrated fashion visionary duo! How are the London & Paris orders?"',
                    nextNodes: [
                      { speaker: 'Anamika', portrait: '🥙', text: 'Girl, our email inbox crashed three times today! Curators from London, Paris, and Dubai want exclusive showcase rights for "Nodi O Jamdani"!' },
                      { speaker: 'Anamika', portrait: '✨', text: 'Shuvra called me from Barishal in tears of joy—our advance orders just guaranteed steady living wages for thirty rural handloom artisan families for the entire year!' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'You and Apshora didn’t just build a brand, Anamika. You changed lives.' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'True victory is lifting everyone up along the way. We are so proud of both of you!' }
                    ]
                  }] : []),
                  {
                    label: '🥙 "What is in that Star Kebab parcel right now, Anamika?"',
                    nextNodes: [
                      { speaker: 'Anamika', portrait: '🥙', text: 'Fresh grilled parathas, spiced mutton seekh kebabs, and two chilled faloodas! I was testing it to make sure tomorrow’s group feast is top tier!' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: '"Testing" by eating an entire leg roast beforehand? Bestie, you are legendary.' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'Can confirm, the smoky kebab aroma drifting from that bag is mesmerizing.' }
                    ]
                  },
                  {
                    label: '🚢 "Any updates on Shuvra and his Barishal launch journey?"',
                    nextNodes: [
                      { speaker: 'Anamika', portrait: '📱', text: 'Oh girl, you won’t believe it! Shuvra called me from the launch cabin. The launch was delayed for two hours because of river fog near Chandpur!' },
                      { speaker: 'Anamika', portrait: '😂', text: 'And he was guarding his tin of Barishal Guthia Sandesh with his life under his pillow so the cabin mates wouldn’t eat it!' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'A man who guards sweets through river fog for his girl is a keeper, Anamika.' },
                      { speaker: 'Anamika', portrait: '🥺', text: 'Right?! His launch docks at Sadarghat at 6 AM, and we are going straight to Star Kebab for breakfast!' }
                    ]
                  },
                  {
                    label: '🏆 "Settle this debate: The Ultimate Dhaka Date Food Ranking!"',
                    nextNodes: [
                      { speaker: 'Anamika', portrait: '🏆', text: 'Okay, hear me out: 1. Star Kebab Mutton Kacchi with Borhani. 2. Mama’s Extra-Spicy Naga Fuchka. 3. TSC Matir Bhaar Malai Cha. 4. Bogurar Mishti Doi.' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'I vote we eat all four in a single afternoon with Moon Walker!' },
                      { speaker: 'Anamika', portrait: '👏', text: 'Totoro, you get it! Moon Walker, hold onto this guy forever!' }
                    ]
                  },
                  {
                    label: '✨ "Bestie high-five & energy boost!"',
                    onPick: () => {
                      SoundEngine.itemFanfare();
                      DateState.sp = DateState.maxSp;
                      UI.updateRPGStats();
                      UI.showToast('💖', 'Bestie Power!', 'Anamika gave you an energy boost! SP fully restored!');
                    },
                    nextNodes: [
                      { speaker: 'Anamika', portrait: '✨', text: '*SLAP!* Ultimate bestie high-five! You two go conquer the Six Realms and have the best date ever! (SP Fully Restored!)' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'Love you, Anamika! See you at Star Kebab tomorrow!' }
                    ]
                  }
                ]
              }
            ]);
            return;
          }

          // 2. Mimi the Campus Ginger Cat Interactive Options
          if (s.isCat) {
            SoundEngine.catMeow();
            DateState.sideQuests.sq_cat_fish = true;
            UI.startDialogue([
              {
                speaker: 'Mimi (Campus Ginger Cat)',
                portrait: '🐱',
                text: 'Mrr-meow! (Mimi figure-eights around your ankles and stares up at Totoro’s giant fluffy tummy with big curious green eyes.)',
                choices: [
                  {
                    label: '🐟 Offer Mimi a crunchy snack bite',
                    onPick: () => {
                      SoundEngine.catMeow();
                      DateState.hp = Math.min(DateState.maxHp, DateState.hp + 20);
                      UI.updateRPGStats();
                      UI.showToast('🐱', 'Mimi is Delighted!', 'Mimi gave you a good luck purr! (+20 HP)');
                    },
                    nextNodes: [
                      { speaker: 'Mimi (Campus Ginger Cat)', portrait: '🐱', text: '*Nom nom nom!* Purrrrrr! (Mimi happily devours the treat, then nuzzles her forehead against your palm.)' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'Aww, look at her! Chibi-Totoro wants to give her a little ear scratch too!' }
                    ]
                  },
                  {
                    label: '🐾 Scratch Mimi under her chin and behind her soft ears',
                    onPick: () => SoundEngine.catMeow(),
                    nextNodes: [
                      { speaker: 'Mimi (Campus Ginger Cat)', portrait: '🐱', text: 'Prrr-chirp! (Mimi closes her eyes, tips her chin up into your hand, and emits a motorboat purr that can be heard across Fuller Road.)' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'Meeting Mimi is officially the softest highlight of campus.' }
                    ]
                  },
                  {
                    label: '🧶 Let Chibi-Totoro play with Mimi',
                    nextNodes: [
                      { speaker: 'Mimi (Campus Ginger Cat)', portrait: '🐱', text: 'Meow! (Mimi playfully pats at Chibi-Totoro’s leafy fishing line, rolling onto her back in the warm grass.)' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'They are best friends now! Can we bring her with us into the Astral Realm?' }
                    ]
                  }
                ]
              }
            ]);
            return;
          }

          // 3. Baki Bhai (Nilkhet Poet)
          if (s.isPoet) {
            DateState.sideQuests.sq_poet_rhyme = true;
            UI.startDialogue([
              {
                speaker: 'Baki Bhai (Nilkhet Poet)',
                portrait: '📜',
                text: 'Ah, Moon Walker and Totoro! The very air around Fuller Road turns into rhythm when you two walk together. What verse seeks your ear?',
                choices: [
                  {
                    label: '📖 "Baki Bhai, improvise a couplet for us!"',
                    onPick: () => SoundEngine.select(),
                    nextNodes: [
                      { speaker: 'Baki Bhai (Nilkhet Poet)', portrait: '📜', text: '"Dhaka may have ten million crowded streets and endless rain,\nYet in your quiet footsteps, all of time begins again."' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'Writing that down in my memory journal right now. That is pure gold, Baki Bhai!' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'Nilkhet’s poets really are the heart of Dhaka.' }
                    ]
                  },
                  {
                    label: '📚 "What is your secret to finding hidden gems in Nilkhet?"',
                    nextNodes: [
                      { speaker: 'Baki Bhai (Nilkhet Poet)', portrait: '📜', text: 'Never look for pristine covers. The best books are the weathered ones—where someone forty years ago underlined a sentence and left a dried rose petal.' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'That is exactly why picking books for each other is our favorite tradition.' }
                    ]
                  }
                ]
              }
            ]);
            return;
          }

          // 4. Sami (Street Photographer)
          if (s.isPhoto) {
            DateState.sideQuests.sq_photo_pose = true;
            UI.startDialogue([
              {
                speaker: 'Sami (Street Photographer)',
                portrait: '📸',
                text: '*Click!* The natural golden light on Fuller Road is sublime right now. Let me take an official couple photo of you two for your Chronicle Scrapbook!',
                choices: [
                  {
                    label: '🌅 Romantic Sunset Gaze (Hold Totoro’s hand & smile)',
                    onPick: () => {
                      SoundEngine.cameraShutter();
                      this.cameras.main.flash(350, 255, 255, 255);
                      UI.showToast('📸', 'Photo Captured!', 'A warm romantic snapshot was added to your memories!');
                    },
                    nextNodes: [
                      { speaker: 'Sami (Street Photographer)', portrait: '📸', text: '*FLASH!* Magnificent! The way the golden hour catches the Beli garland on your wrist and Totoro’s smile is pure magazine-cover perfection.' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'Frame this one immediately, Moon Walker!' }
                    ]
                  },
                  {
                    label: '✌️ Playful Peace Sign & Goofy Totoro Faces',
                    onPick: () => {
                      SoundEngine.cameraShutter();
                      this.cameras.main.flash(350, 255, 255, 255);
                    },
                    nextNodes: [
                      { speaker: 'Sami (Street Photographer)', portrait: '📸', text: '*FLASH!* Haha! Totoro stuck his tongue out while Chibi-Totoro made bunny ears! That is going straight into Dhaka campus history!' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'Hahaha, that is 100% going on our scrapbook cover!' }
                    ]
                  },
                  {
                    label: '⚔️ Heroic Realm Guardians Stance',
                    onPick: () => {
                      SoundEngine.cameraShutter();
                      this.cameras.main.flash(350, 255, 255, 255);
                    },
                    nextNodes: [
                      { speaker: 'Sami (Street Photographer)', portrait: '📸', text: '*FLASH!* Incredible dynamic tension! Moon Walker with her parasol and Totoro standing tall like the legendary Forest Guardian!' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'The Six Realms do not stand a chance against us!' }
                    ]
                  }
                ]
              }
            ]);
            return;
          }

          // 5. Arif (Physics Senior)
          if (s.name.includes('Arif')) {
            UI.startDialogue([
              {
                speaker: 'Arif (DU Physics Senior)',
                portrait: '🎓',
                text: 'Greetings, Moon Walker and Totoro! I just took a break from the Science Library. What query brings you to the realm of science?',
                choices: [
                  {
                    label: '🧮 "Have you calculated the physics equation of love yet, Arif?"',
                    nextNodes: [
                      { speaker: 'Arif (DU Physics Senior)', portrait: '🎓', text: 'F = G * (m1 * m2) / r^2... Except whenever you and Totoro stand next to each other, the gravitational attraction defies classical mechanics and generates infinite happiness!' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'See? Even physics proves we belong together!' }
                    ]
                  },
                  {
                    label: '🌀 "What do your sensors say about the Eastern Spacetime Fracture?"',
                    nextNodes: [
                      { speaker: 'Arif (DU Physics Senior)', portrait: '🎓', text: 'It is a stable Einstein-Rosen bridge leading to higher dimensional planes! My advice: stock up on Tong-er Mama’s Malai Cha before venturing through.' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'Good advice—tea is the ultimate universal constant!' }
                    ]
                  }
                ]
              }
            ]);
            return;
          }

          // 6. Nadia (Charukola Sketcher)
          if (s.name.includes('Nadia')) {
            UI.startDialogue([
              {
                speaker: 'Nadia (Charukola Sketcher)',
                portrait: '🖌️',
                text: 'Look at that palette! The amber of Moon Walker’s skirt, the crimson Krishnachura canopy, and the gentle slate-gray of Totoro... What can I sketch for you two?',
                choices: [
                  {
                    label: '🎨 "Show us your latest sketchbook drawing of us!"',
                    onPick: () => SoundEngine.brushStroke(),
                    nextNodes: [
                      { speaker: 'Nadia (Charukola Sketcher)', portrait: '🖌️', text: '*Shows sketchbook page* See? A quick charcoal study of you two laughing by the Fuller Road fountain. The expression in Totoro’s eyes says everything.' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'Can I hang this in our forest hollow? It is beautiful, Nadia!' }
                    ]
                  },
                  {
                    label: '🎭 "What motif are you working on for Pohela Boishakh?"',
                    nextNodes: [
                      { speaker: 'Nadia (Charukola Sketcher)', portrait: '🖌️', text: 'A giant paper-mâché Forest Spirit mask inspired by Totoro, surrounded by golden sun rays and floral alpana!' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'The Mangal Shobhajatra parade is going to look spectacular this year!' }
                    ]
                  }
                ]
              }
            ]);
            return;
          }

          // 7. Tania (Dhanmondi Jogger)
          if (s.name.includes('Tania')) {
            UI.startDialogue([
              {
                speaker: 'Tania (Dhanmondi Jogger)',
                portrait: '👟',
                text: 'Phew! Lap four around Dhanmondi Lake complete! How is the grand date going, you two?',
                choices: [
                  {
                    label: '🏃‍♀️ "Tania, how do you resist stopping at the fuchka cart every lap?"',
                    nextNodes: [
                      { speaker: 'Tania (Dhanmondi Jogger)', portrait: '👟', text: 'Who said I resist?! My secret training method is: run 3km, reward myself with 10 Naga fuchkas and a clay cup of Mishti Doi!' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'Now THAT is the kind of balanced workout plan I can get behind!' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'Cardio powered by tamarind tok and sweet curd. Pure genius.' }
                    ]
                  },
                  {
                    label: '🌊 "How is the lake view tonight?"',
                    nextNodes: [
                      { speaker: 'Tania (Dhanmondi Jogger)', portrait: '👟', text: 'The water is completely still, reflecting the paper lanterns on the pier. The stargazing telescope is all set up—definitely do not miss it!' }
                    ]
                  }
                ]
              }
            ]);
            return;
          }

          // Fallback standard conversations
          const conv = s.conversations[wObj.lineIdx % s.conversations.length];
          wObj.lineIdx++;
          UI.startDialogue(conv);
        }
      };

      if (s.isAnamika) this.anamikaWanderer = wObj;
      this.wanderers.push(wObj);
      this.interactables.push(wObj);
    });
  }

  advanceDateProgress() {
    SoundEngine.heartUp();
    RPGStats.gainXP(35);
    const completed = UI.getCompletedCount();
    UI.updateHearts(Math.min(5, Math.ceil((completed / 10) * 5)));
    UI.updateClock();
    UI.updateQuestText();

    // Trigger Kalbaishakhi Monsoon Event at Milestone 4 or 5 in Dhaka Valley
    if (DateState.currentWorld === 'dhaka' && completed >= 4 && completed <= 7 && !this.monsoonTriggered) {
      this.triggerMonsoonEvent();
    } else if (completed > 7 && this.isRaining) {
      this.stopMonsoonEvent();
    }

    const alphas = [0, 0.03, 0.06, 0.1, 0.14, 0.18, 0.23, 0.28, 0.33, 0.38, 0.42];
    const tintCols = [0xf7a440, 0xf7a440, 0xe88846, 0xd96b43, 0xb85856, 0x8c4966, 0x5c3c6e, 0x3b2d5c, 0x251e42, 0x191633, 0x111229];
    const idx = Math.min(completed, alphas.length - 1);
    if (this.ambientOverlay) this.ambientOverlay.setFillStyle(tintCols[idx], alphas[idx]);

    if (completed >= 5 && this.lampGlows) {
      this.lampGlows.forEach(g => g.setAlpha(0.3));
    }
  }

  triggerMonsoonEvent() {
    this.monsoonTriggered = true;
    this.isRaining = true;
    SoundEngine.thunder();
    this.cameras.main.flash(450, 230, 240, 255);

    // Fade in puddles
    this.puddles.forEach(p => this.tweens.add({ targets: p, alpha: 0.85, duration: 2000 }));
    if (this.taroLeaf) this.taroLeaf.setVisible(true);

    UI.showToast('⛈️', 'Kalbaishakhi Monsoon!', 'A sudden warm Dhaka shower sweeps over campus!');
    UI.startDialogue([
      { speaker: 'Totoro', portrait: '🐾', text: 'Whoa! The sky opened up! Classic Dhaka Kalbaishakhi rain! Here Moon Walker, huddle close under this giant taro leaf!' },
      { speaker: 'Moon Walker', portrait: '🌙', text: 'It smells just like wet red earth (shondha matir gondho)... Good thing you are wide enough to block all the rain drops, Totoro!' }
    ]);

    // Automatically clear the storm after 50 seconds
    this.time.delayedCall(50000, () => {
      if (this.isRaining) {
        this.stopMonsoonEvent();
        UI.showToast('⛅', 'Skies Clearing!', 'The monsoon clouds roll past Fuller Road.');
      }
    });
  }

  stopMonsoonEvent() {
    this.isRaining = false;
    if (this.taroLeaf) this.taroLeaf.setVisible(false);
    this.puddles.forEach(p => this.tweens.add({ targets: p, alpha: 0, duration: 3000 }));
    if (this.rainGraphics) this.rainGraphics.clear();
  }

  handleActionPress() {
    SoundEngine.unlock();
    if (UI.isOpen()) {
      UI.advanceDialogue();
      return;
    }
    if (this.cutsceneLocked) return;

    const distTotoro = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.totoro.x, this.totoro.y);
    if (!DateState.totoroJoined && distTotoro < 92) {
      this.meetTotoroFirstTime();
      return;
    }

    let best = null, bestDist = Infinity;
    for (const item of this.interactables) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);
      if (d < item.radius && d < bestDist) {
        best = item;
        bestDist = d;
      }
    }
    if (best) {
      best.onInteract();
      return;
    }

    if (DateState.totoroJoined && distTotoro < 98) {
      this.talkToTotoroCompanion();
    }
  }

  /* ================= Original Dhaka Valley Story & Diversified Quest Interactions ================= */
  meetTotoroFirstTime() {
    UI.startDialogue([
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'Moon Walker! You made it! I was standing under this Krishnachura tree rehearsing how to act cool, and I immediately forgot every line the second you smiled.'
      },
      {
        speaker: 'Moon Walker',
        portrait: '🌙',
        text: 'You brought Chibi-Totoro on your head AND a crimson blossom? That is already cooler than any speech, Totoro.'
      },
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'I saved the brightest Krishnachura flower for your hair. Ready to explore Dhaka University, Ramna, Dhanmondi Lake, and the shimmering portals beyond?',
        choices: [
          {
            label: "Duh, 100% yes. Let's walk together!",
            nextNodes: [
              { speaker: 'Totoro', portrait: '🐾', text: "Best answer in Dhaka history. Lead the way, Moon Walker! I'm walking right behind you wherever you go." }
            ]
          },
          {
            label: 'Only if you hold my hand in Dhaka traffic and share your food.',
            nextNodes: [
              { speaker: 'Totoro', portrait: '🐾', text: "Hand-holding is mandatory, and you get first dibs on every plate—even when we meet Anamika for Star Kebab!" }
            ]
          }
        ]
      }
    ], () => {
      DateState.totoroJoined = true;
      if (!DateState.unlockedWorlds.includes('forest')) DateState.unlockedWorlds.push('forest');
      this.totoroBadge.setText('♥ Totoro');
      this.trail = Array(16).fill({ x: this.player.x, y: this.player.y });
      UI.giveItem('flower', 'Met under the crimson Krishnachura trees at Curzon Hall.');
      this.advanceDateProgress();
    });
  }

  talkToTotoroCompanion() {
    if (UI.isOpen() || this.cutsceneLocked) return;
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Moon Walker', portrait: '🌙', text: 'Totoro is waiting for me under the Krishnachura tree at Curzon Hall!' }]);
      return;
    }

    this.tweens.add({ targets: this.totoro, y: this.totoro.y - 12, duration: 140, yoyo: true });
    SoundEngine.heartUp();

    // Context-sensitive greeting based on location / atmosphere
    let greeting = 'What is on your mind, Moon Walker? Every step with you is my favorite adventure.';
    if (DateState.currentWorld === 'curzon_interior') {
      greeting = 'Look at the towering red-brick arches and grand chandeliers of Curzon Hall, Moon Walker! S.N. Bose himself derived quantum statistics in this very building!';
    } else if (this.isRaining) {
      greeting = 'The Kalbaishakhi rain is coming down! Stay close under my taro leaf, Moon Walker. What would you like to do?';
    } else if (DateState.currentWorld !== 'dhaka') {
      const wName = WORLDS_DB[DateState.currentWorld]?.name || 'the Six Realms';
      greeting = `We are braving ${wName} together! My spirit claws are ready, and I will protect you with my life.`;
    } else if (UI.getCompletedCount() >= 10) {
      greeting = 'We have explored every legendary corner of Dhaka Valley together tonight! What shall we do next, my favorite person?';
    }

    // Dynamic date & quest advice
    const getAdvice = () => {
      if (DateState.currentWorld === 'curzon_interior') {
        return 'The faculty here possess legendary academic wisdom! Have you visited Prof. Satyendra at the West Wing quantum slate, Prof. Sultana at the botany table, Dr. Kabir at the chemistry lab bench, or Prof. Motahar at the chess dais yet?';
      }
      if (DateState.currentWorld !== 'dhaka') {
        const wCfg = WORLDS_DB[DateState.currentWorld];
        return `We need to defeat the realm boss to the East (${wCfg?.bossSpec?.name}) and gather ${ITEMS_DB[wCfg?.matItem]?.name || 'materials'} to forge powerful equipment in our Bag & Craft menu (I)!`;
      }
      if (DateState.enanQuestStage === 0) {
        return 'Salat is waving near Mintu Road Fountain Plaza (Center)! She looks like she wants to propose something exciting to us.';
      }
      if (DateState.enanQuestStage === 2) {
        return 'Salat is crying by the fountain at Mintu Road after Enan brushed her off with work excuses. We should go comfort her!';
      }
      if (DateState.enanQuestStage === 3) {
        return 'Salat is counting on us! Tell me what happened with Enan so I can help make him understand.';
      }
      if (DateState.enanQuestStage === 4) {
        return 'Enan is standing near Mintu Road with his phone. Let us go speak with him and remind his soul what truly matters!';
      }
      if (DateState.apshoraQuestStage === 1) {
        return 'Apshora has a fiery entrepreneurial ambition! Let us introduce her to Anamika near Charukola / campus to ignite their fashion collective!';
      }
      if (DateState.apshoraQuestStage === 2) {
        return 'Apshora & Anamika are designing their debut "Nodi O Jamdani" collection at Charukola! Let us go review their showstopper piece.';
      }
      if (DateState.apshoraQuestStage === 3) {
        return 'The grand runway exhibition is set at Curzon Hall! Talk to Apshora or Anamika to launch their debut fashion show!';
      }
      if (DateState.ahonaQuestStage === 1) {
        return 'We should check on crying Ahona at the Ramna Park bench (North-East) and help her patch things up with Rakin!';
      }
      if (DateState.ahonaQuestStage === 2) {
        return 'Rakin is pacing nervously near Nilkhet Book Lane. Let us go talk to him and deliver his love letter to Ahona!';
      }
      if (!DateState.teaDone) {
        return 'Tong-er Mama is waving from the TSC Tea Stall! Let us go grab two steaming clay cups of cardamom Malai Cha.';
      }
      if (!DateState.charukolaDone) {
        return 'The Faculty of Fine Arts (Charukola) is open! Let us paint terracotta clay mugs under the banyan trees.';
      }
      if (!DateState.bookDone) {
        return 'Nilkhet Book Lane is buzzing! Let us pick a surprise vintage book for each other from the stacks.';
      }
      if (!DateState.fuchkaDone) {
        return 'Fuchka Mama is serving crispy Naga fuchka near the promenade! Ready for an extra-spicy chili challenge?';
      }
      if (!DateState.doiDone) {
        return 'The Old Dhaka Sweetwalla has chilled Bogurar Mishti Doi and rose Beauty Lassi waiting for us!';
      }
      if (!DateState.gajraDone) {
        return 'Phulwali Khala has freshly woven Beli and Bokul flower garlands near the flower cart. May I tie one on your wrist?';
      }
      if (!DateState.rickshawTourDone) {
        return 'The grand painted rickshaw is waiting at Fuller Road for our "Tring-Tring Rush" hood-down tour across the city!';
      }
      if (!DateState.stargazingDone) {
        return 'The brass stargazing telescope is positioned on the Dhanmondi Lake Pier! Let us go connect the constellations.';
      }
      return 'The Eastern Realm Fracture Portal is glowing! We have experienced all of Dhaka Valley; let us step into the Six Realms together!';
    };

    // 4 Rotating Trivia/Riddles
    this.riddleIdx = (this.riddleIdx || 0);
    const riddles = [
      {
        q: 'Riddle time! What is the sacred rule when you drink Tong-er Mama’s Malai Cha on Fuller Road?',
        c1: { label: 'Sip slowly from clay cups, split a hot Singara, and lose track of time', correct: true,
              ans: 'Spot on! You understand the true soul of a Dhaka date, Moon Walker! (+25 XP & 15 SP restored)' },
        c2: { label: 'Gulp it in five seconds and sprint to the Science Library', correct: false,
              ans: 'Haha! Arif Bhai might do that during finals week, but not on our date!' }
      },
      {
        q: 'Pop quiz: Where in Dhaka do you go when you want to smell old paperbacks and slip a secret note inside?',
        c1: { label: 'Nilkhet Book Lane!', correct: true,
              ans: 'Yes! And that handwritten note I left in your book? I meant every single word. (+25 XP & 15 SP restored)' },
        c2: { label: 'Inside the campus administrative filing cabinet', correct: false,
              ans: 'Aww, that sounds way too bureaucratic! Nilkhet has infinitely more romance!' }
      },
      {
        q: 'Foodie lore: What legendary dessert did Anamika say Shuvra is bringing on the launch from Barishal?',
        c1: { label: 'Barishal’s authentic Guthia Sandesh in a tin!', correct: true,
              ans: 'Correct! Fresh chhana from Guthia! Anamika will be overjoyed when his launch docks! (+25 XP & 15 SP restored)' },
        c2: { label: 'A cold leftover takeaway burger', correct: false,
              ans: 'Haha! If Shuvra brought cold burgers from Barishal, Anamika would throw him in the Kirtankhola river!' }
      },
      {
        q: 'Courage test: When Mama puts extra Naga chili in your fuchka, what is the proper reaction?',
        c1: { label: 'Take a bite and grab Totoro’s hand immediately!', correct: true,
              ans: 'Works every single time. My paws are always here for you to hold, Moon Walker! (+25 XP & 15 SP restored)' },
        c2: { label: 'Pretend you are completely unbothered while crying silently', correct: false,
              ans: 'Haha, that is cute too, but holding my hand is 100% recommended!' }
      }
    ];
    const rCurrent = riddles[this.riddleIdx % riddles.length];

    // Build the interactive Companion Menu
    UI.startDialogue([
      {
        speaker: 'Totoro (Right Beside You)',
        portrait: '🐾',
        text: greeting,
        choices: [
          ...(DateState.enanQuestStage === 3 ? [{
            label: '💔 "Totoro, Salat is heartbroken... Enan is ignoring her for work."',
            nextNodes: [
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Totoro, Salat asked Enan to go on a Double Couple Date with us tonight, but Enan coldly brushed her off with work excuses. He even called you an "oversized forest spirit" and told her he has no time for her!' },
              { speaker: 'Totoro', portrait: '🐾', text: '*Ears twitch with deep sorrow and righteous spirit energy* ...Grrr-oooh. The mortal curse of endless hurry. Humans run so fast towards tomorrow that they forget the warm hand they are holding today.' },
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Salat cried so hard... she remembered how in university Enan used to wait forty minutes in the Kalbaishakhi rain at TSC just to share a cup of tea. She asked if you could make him understand.' },
              { speaker: 'Totoro', portrait: '🐾', text: 'The boy who waited in the rain is not gone, Moon Walker. He is merely trapped beneath fear, spreadsheets, and the noise of the city. We are going to bring him back to her. Let us go confront Enan right now!' },
              { speaker: 'Moon Walker', portrait: '🌙', text: 'With you beside me, Totoro, nothing is impossible!' }
            ],
            onPick: () => {
              DateState.enanQuestStage = 4;
              if (this.salatBadge) this.salatBadge.setText('🥺 Salat (Waiting for Totoro)');
              if (this.enanBadge) this.enanBadge.setText('❗ Enan (Totoro will talk to him!)');
              UI.updateQuestText();
              UI.showToast('🐾', 'Totoro is Ready!', 'Approach Enan at Mintu Road Fountain Plaza with Totoro!');
            }
          }] : []),
          ...(DateState.apshoraQuestStage === 1 ? [{
            label: '👗 "Totoro, Apshora wants to partner with Anamika on a cultural fashion brand!"',
            nextNodes: [
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Apshora is tired of being Ahona’s dramatic sidekick—she wants to build a luxury cultural fashion house with Jamdani weavers, and partner with Anamika!' },
              { speaker: 'Totoro', portrait: '🐾', text: 'Magnificent! Every spirit in this ancient delta was once woven from song and handloom yarn. An ambitious heart paired with Anamika’s artistic soul will move mountains!' },
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Let’s go introduce them near Charukola right now!' }
            ]
          }] : []),
          {
            label: '💕 Sweet Talk & Flirt',
            nextNodes: [
              {
                speaker: 'Moon Walker',
                portrait: '🌙',
                text: 'Tell me, Mr. Forest Spirit... what went through your mind the very first moment you saw me at Curzon Hall?'
              },
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: 'My heart beat so fast that Chibi-Totoro nearly tumbled off my head! I thought: "There she is. The keeper of every star I have ever wished upon."',
                choices: [
                  {
                    label: '"Okay, that was dangerously smooth, Totoro."',
                    nextNodes: [
                      { speaker: 'Totoro', portrait: '🐾', text: '*(Blushes warmly)* I only speak the honest truth when I look into those eyes, Moon Walker.' }
                    ]
                  },
                  {
                    label: 'Lean your head against Totoro’s soft furry shoulder',
                    onPick: () => { SoundEngine.heartUp(); DateState.sp = Math.min(DateState.maxSp, DateState.sp + 20); UI.updateRPGStats(); },
                    nextNodes: [
                      { speaker: 'Totoro', portrait: '🐾', text: '*(Gently wraps his paw around you)* You are safe, you are cherished, and I am never letting you go. (20 SP Restored!)' }
                    ]
                  }
                ]
              }
            ]
          },
          {
            label: '🎲 Dhaka Trivia & Riddle Match',
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: rCurrent.q,
                choices: [
                  {
                    label: rCurrent.c1.label,
                    onPick: () => {
                      if (rCurrent.c1.correct) {
                        SoundEngine.itemFanfare();
                        RPGStats.gainXP(25);
                        DateState.sp = Math.min(DateState.maxSp, DateState.sp + 15);
                        UI.updateRPGStats();
                      }
                      this.riddleIdx++;
                    },
                    nextNodes: [{ speaker: 'Totoro', portrait: '🐾', text: rCurrent.c1.ans }]
                  },
                  {
                    label: rCurrent.c2.label,
                    onPick: () => {
                      if (rCurrent.c2.correct) {
                        SoundEngine.itemFanfare();
                        RPGStats.gainXP(25);
                        DateState.sp = Math.min(DateState.maxSp, DateState.sp + 15);
                        UI.updateRPGStats();
                      }
                      this.riddleIdx++;
                    },
                    nextNodes: [{ speaker: 'Totoro', portrait: '🐾', text: rCurrent.c2.ans }]
                  }
                ]
              }
            ]
          },
          {
            label: '🥪 Share a Campus Snack with Totoro',
            nextNodes: [
              {
                speaker: 'Moon Walker',
                portrait: '🌙',
                text: 'I have some delicious treats in our date pouch! What would you like to share, Totoro?',
                choices: [
                  {
                    label: '🥟 Crispy Hot Singara from TSC',
                    onPick: () => {
                      SoundEngine.crunchFuchka();
                      DateState.hp = Math.min(DateState.maxHp, DateState.hp + 35);
                      UI.updateRPGStats();
                    },
                    nextNodes: [
                      { speaker: 'Totoro', portrait: '🐾', text: '*Crunch!* Flaky pastry, spiced roasted peanuts, and warm potatoes... You gave me the crispiest corner! Delicious! (+35 HP Restored!)' }
                    ]
                  },
                  {
                    label: '🥙 Extra-Spicy Naga Fuchka',
                    onPick: () => {
                      SoundEngine.crunchFuchka();
                      DateState.sp = Math.min(DateState.maxSp, DateState.sp + 25);
                      UI.updateRPGStats();
                    },
                    nextNodes: [
                      { speaker: 'Totoro', portrait: '🐾', text: '*Crunch!* WHOA! The Naga chili kicked in! My spirit fur is tingling! Quick Moon Walker, hold my hand! (Attack Spirit Fueled! +25 SP Restored!)' }
                    ]
                  },
                  {
                    label: '🍮 Chilled Bogurar Mishti Doi',
                    onPick: () => {
                      SoundEngine.teaClink();
                      DateState.hp = DateState.maxHp;
                      DateState.sp = DateState.maxSp;
                      UI.updateRPGStats();
                    },
                    nextNodes: [
                      { speaker: 'Totoro', portrait: '🐾', text: 'Silky, creamy, caramel clay-pot yogurt... Mmm, pure bliss. Feeding each other makes it taste ten times sweeter! (HP & SP Fully Restored!)' }
                    ]
                  }
                ]
              }
            ]
          },
          {
            label: '🎵 Hum a Melody Together',
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: 'I love when we sing together. What melody shall we hum to the campus breeze?',
                choices: [
                  {
                    label: '♪ "Tomake Chai" (Kabir Suman acoustic classic)',
                    onPick: () => {
                      SoundEngine.guitarChord();
                      this.time.delayedCall(400, () => SoundEngine.guitarChord());
                    },
                    nextNodes: [
                      { speaker: 'Totoro', portrait: '🐾', text: '♪ "Tomake chai, shudhu tomake chai..." ♪ (Totoro hums a deep, soothing baritone harmony while Moon Walker’s voice floats like starlight.)' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'Listening to you sing makes my whole chest feel warm.' }
                    ]
                  },
                  {
                    label: '♪ "Majhe Majhe Tobo Dekha Pai" (Rabindra Sangeet)',
                    onPick: () => {
                      SoundEngine.guitarChord();
                      this.time.delayedCall(350, () => SoundEngine.teaClink());
                    },
                    nextNodes: [
                      { speaker: 'Totoro', portrait: '🐾', text: '♪ "Chirodin keno pai na..." ♪ (The Krishnachura blossoms gently flutter down around the two of you as the song echoes down Fuller Road.)' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'With you, Moon Walker, I never have to wonder—because you are always right here in my heart.' }
                    ]
                  }
                ]
              }
            ]
          },
          {
            label: '🧭 "Totoro, what should we do next?" (Date Advice)',
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: getAdvice()
              }
            ]
          },
          {
            label: '🐾 Give Totoro a Big Hug & Ear Scratch',
            onPick: () => {
              SoundEngine.heartUp();
              this.tweens.add({ targets: this.totoro, scaleX: 1.15, scaleY: 1.15, duration: 180, yoyo: true });
            },
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: '*(Totoro purrs like a giant rumble of thunder, his soft ears twitching with utter delight! Chibi-Totoro does a joyful backflip on his head!)*'
              },
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: 'Best hug in all Six Realms. You just recharged my spirit battery to 1000%!'
              }
            ]
          }
        ]
      }
    ]);
  }

  interactTeaStall() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Tong-er Mama', portrait: '🍵', text: 'Go grab Totoro from Curzon Hall first! I will keep two clay cups of cardamom Malai Cha warm on the kettle for you two.' }]);
      return;
    }
    SoundEngine.teaClink();
    this.teaVisits = (this.teaVisits || 0) + 1;

    if (!DateState.teaDone) {
      UI.startDialogue([
        {
          speaker: 'Tong-er Mama',
          portrait: '🍵',
          text: 'Earthen matir bhaar Malai Cha with crushed green cardamom, thick malai skin, and hot Singara! Enjoy the TSC breeze, you two.'
        },
        {
          speaker: 'Totoro',
          portrait: '🐾',
          text: 'One clay cup of tea, ten extra minutes with you. Blow on it first so you do not burn your tongue...',
          choices: [
            {
              label: 'Clink clay cups with Totoro and take a slow sip',
              nextNodes: [{ speaker: 'Totoro', portrait: '🐾', text: 'Sweet, warm, smoky from the clay cup, and slightly addictive. Sound familiar?' }]
            },
            {
              label: 'Offer Totoro the crispiest corner of your warm Singara',
              nextNodes: [{ speaker: 'Totoro', portrait: '🐾', text: 'Wait, you are sharing the best part of the Singara with me? Now I am definitely falling even harder.' }]
            }
          ]
        }
      ], () => {
        DateState.hp = DateState.maxHp;
        DateState.sp = DateState.maxSp;
        UI.updateRPGStats();
        DateState.teaDone = true;
        UI.giveItem('cha', 'Shared clay-cup Malai Cha and Singara at TSC.');
        this.advanceDateProgress();
      });
    } else {
      DateState.hp = DateState.maxHp;
      DateState.sp = DateState.maxSp;
      UI.updateRPGStats();
      UI.startDialogue([
        {
          speaker: 'Tong-er Mama',
          portrait: '🍵',
          text: 'Welcome back to the stall, Moon Walker & Totoro! The kettle is bubbling hot. What will it be?',
          choices: [
            {
              label: '🍵 "Mama, two fresh cups of extra-thick Malai Cha!"',
              onPick: () => SoundEngine.teaClink(),
              nextNodes: [
                { speaker: 'Tong-er Mama', portrait: '🍵', text: 'Pouring it high from the kettle! Thick golden malai on top for the sweetest couple at Dhaka University! (HP & SP Fully Restored!)' },
                { speaker: 'Totoro', portrait: '🐾', text: 'Pure fuel for our souls, Mama! Dhonnobad!' }
              ]
            },
            {
              label: '🗞️ "Mama, what is the latest campus adda gossip?"',
              nextNodes: [
                { speaker: 'Tong-er Mama', portrait: '🍵', text: 'Haha! First, your bestie Anamika was bargaining for extra cucumber salad for her Star Kebab roll. Second, Ahona and Rakin were seen holding hands near Ramna looking happier than ever—thanks to you two!' },
                { speaker: 'Moon Walker', portrait: '🌙', text: 'Tong-er Mama knows every single happening on campus!' }
              ]
            },
            {
              label: '🍪 "Debate: What is the supreme tea accompaniment?"',
              nextNodes: [
                { speaker: 'Tong-er Mama', portrait: '🍵', text: 'Crunchy hot Singara dipped in tea beats everything! Though Old Dhaka Bakarkhani is a very close second.' },
                { speaker: 'Totoro', portrait: '🐾', text: 'I vote for both at the same time!' }
              ]
            }
          ]
        }
      ]);
    }
  }

  interactGuitarist() {
    SoundEngine.guitarChord();
    this.guitarVisits = (this.guitarVisits || 0) + 1;
    const songs = [
      [
        { speaker: 'TSC Acoustic Singer', portrait: '🎸', text: '♪ "Tomake chai, shudhu tomake chai... Ekhon onek raat, tomar kandhe aamar nisshash..." ♪' },
        { speaker: 'Totoro', portrait: '🐾', text: 'He is playing our song! I will just hum the chorus under my breath while holding your hand.' }
      ],
      [
        { speaker: 'TSC Acoustic Singer', portrait: '🎸', text: '♪ "Ami opar hoye boshe achi, ohe dayamoy..." ♪ (Strumming an acoustic folk fusion under the TSC banyan tree)' },
        { speaker: 'Moon Walker', portrait: '🌙', text: 'Anamika told me her boyfriend Shuvra sings this exact song on the launch deck whenever he travels from Barishal to Dhaka!' },
        { speaker: 'Totoro', portrait: '🐾', text: 'Next time Shuvra is in town, we are bringing him right here to TSC for a four-part harmony!' }
      ],
      [
        { speaker: 'TSC Acoustic Singer', portrait: '🎸', text: '♪ "Bhalobashi bole dao, akash-toli chire..." ♪ Dedicating this acoustic chord progression to the girl in the amber skirt and her giant guardian spirit!' },
        { speaker: 'Totoro', portrait: '🐾', text: 'Did you hear that, Moon Walker? Even the TSC musicians know we are head over heels.' }
      ]
    ];
    UI.startDialogue(songs[this.guitarVisits % songs.length]);
  }

  interactCharukola() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Charukola Artist', portrait: '🎨', text: 'Bring your partner over! We are painting terracotta mugs under the banyan trees.' }]);
      return;
    }
    SoundEngine.brushStroke();
    this.artVisits = (this.artVisits || 0) + 1;

    if (!DateState.charukolaDone) {
      UI.startDialogue([
        { speaker: 'Charukola Artist', portrait: '🎨', text: 'Welcome to the Faculty of Fine Arts! Here are two terracotta clay mugs and bright rickshaw-art paints. What motif will you two paint?' },
        {
          speaker: 'Totoro',
          portrait: '🐾',
          text: 'I am trying to paint a portrait of you, Moon Walker, though my paws get shaky whenever you lean close.',
          choices: [
            {
              label: 'Paint a crescent moon & Totoro under one red umbrella',
              onPick: () => { DateState.paintedArt = 'Umbrella & Crescent Moon Mug'; },
              nextNodes: [{ speaker: 'Totoro', portrait: '🐾', text: 'It is slightly lopsided and 100% a masterpiece. We are keeping these mugs forever.' }]
            },
            {
              label: 'Dab a tiny dot of pink paint onto the tip of Totoro’s nose',
              onPick: () => { DateState.paintedArt = 'Pink-Nosed Totoro Mug'; },
              nextNodes: [{ speaker: 'Totoro', portrait: '🐾', text: 'Hey! Okay fine, if it makes you laugh like that, you can paint my whole face.' }]
            }
          ]
        }
      ], () => {
        DateState.charukolaDone = true;
        UI.giveItem('mug', `Painted the ${DateState.paintedArt} at Charukola.`);
        this.advanceDateProgress();
      });
    } else {
      const followUps = [
        [
          { speaker: 'Charukola Artist', portrait: '🎨', text: `The glaze on your ${DateState.paintedArt} dried beautifully! The warm terracotta really captures the spirit of Dhaka.` },
          { speaker: 'Moon Walker', portrait: '🌙', text: 'Every time we drink cha from these mugs, we will remember this afternoon under the Charukola trees.' }
        ],
        [
          { speaker: 'Charukola Artist', portrait: '🎨', text: 'We are sketching ideas for the upcoming Pohela Boishakh Mangal Shobhajatra masks—Totoro just inspired our newest friendly forest spirit motif!' },
          { speaker: 'Totoro', portrait: '🐾', text: 'Wait until Chibi-Totoro hears he is becoming Fine Arts famous!' }
        ]
      ];
      UI.startDialogue(followUps[this.artVisits % followUps.length]);
    }
  }

  interactBookStall() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Nilkhet Bookwalla', portrait: '📚', text: 'Come back with Totoro! Picking books for each other is the finest Nilkhet tradition.' }]);
      return;
    }
    this.bookVisits = (this.bookVisits || 0) + 1;

    if (!DateState.bookDone) {
      UI.startDialogue([
        { speaker: 'Nilkhet Bookwalla', portrait: '📚', text: 'Ah, the classic Nilkhet date rule: pick a book for each other from the stacks, no peeking until you reach Dhanmondi Lake!' },
        {
          speaker: 'Totoro',
          portrait: '🐾',
          text: 'Close your eyes for three seconds while I slip a handwritten note inside the front cover of yours.',
          choices: [
            {
              label: 'Pick a hardcover anthology of Tagore, Jibanananda & Neruda love poems',
              onPick: () => { DateState.chosenBook = 'Anthology of Love Poems'; },
              nextNodes: [{ speaker: 'Totoro', portrait: '🐾', text: 'I will read every page tonight, though my favorite line is still whatever you say next.' }]
            },
            {
              label: 'Pick a vintage star-atlas of the night sky over Bengal',
              onPick: () => { DateState.chosenBook = 'Dhaka Night Sky Atlas'; },
              nextNodes: [{ speaker: 'Totoro', portrait: '🐾', text: 'Spoiler alert: the brightest star in this whole atlas is named Alpha Moon Walker.' }]
            }
          ]
        }
      ], () => {
        DateState.bookDone = true;
        UI.giveItem('book', `Exchanged the ${DateState.chosenBook} at Nilkhet.`);
        this.advanceDateProgress();
      });
    } else {
      const followUps = [
        [
          { speaker: 'Nilkhet Bookwalla', portrait: '📚', text: 'Your friend Anamika was just here bargaining like a pro! She bought a collection of Barishal river ballads by Jibanananda Das to mail to Shuvra.' },
          { speaker: 'Moon Walker', portrait: '🌙', text: 'Haha, nobody bargains in Nilkhet better than Anamika—especially when she is buying a gift for Shuvra!' }
        ],
        [
          { speaker: 'Nilkhet Bookwalla', portrait: '📚', text: `Take good care of that ${DateState.chosenBook}! Nothing smells quite like old paperbacks and monsoon rain in Nilkhet Lane.` }
        ]
      ];
      UI.startDialogue(followUps[this.bookVisits % followUps.length]);
    }
  }

  interactAhonaApshora() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([
        { speaker: 'Ahona', portrait: '😒', text: 'Oh look, Apshora, is that Moon Walker walking all by herself near Fuller Road?' },
        { speaker: 'Moon Walker', portrait: '🌙', text: '(Ahona and Apshora are looking for trouble... Let me go meet Totoro at Curzon Hall first!)' }
      ]);
      return;
    }

    if (!DateState.bulliesDefeated) {
      this.cutsceneLocked = true;
      SoundEngine.alertExclaim();
      this.tweens.add({ targets: [this.ahona, this.apshora], y: '-=10', duration: 120, yoyo: true });

      UI.startDialogue([
        { speaker: 'Ahona', portrait: '😒', text: 'Well, well, look who is strolling past Fuller Road. Where do you think you are going, Moon Walker?' },
        { speaker: 'Apshora', portrait: '🙄', text: 'Honestly, carrying around street flowers and old Nilkhet books? We were just saying how ridiculous...' },
        { speaker: 'Totoro (Stepping In Front)', portrait: '🐾', text: 'Hold on right there. Take one step back and watch how you speak to her.' }
      ], () => {
        SoundEngine.totoroRoar();
        this.tweens.add({
          targets: this.totoro,
          x: this.ahona.x + 20,
          y: this.ahona.y + 24,
          scaleX: 1.34,
          scaleY: 1.34,
          duration: 280,
          ease: 'Back.easeOut',
          onComplete: () => {
            this.cameras.main.shake(230, 0.006);
            UI.startDialogue([
              { speaker: 'Totoro', portrait: '🐾', text: 'Moon Walker has more kindness, grace, and brilliance in her little finger than both of you combined. If either of you ever tries to disrespect her again, you will answer to me.' },
              { speaker: 'Ahona', portrait: '😨', text: 'Eek! W-why is he so huge and intimidating?! Apshora, did the ground just shake?!' },
              { speaker: 'Apshora', portrait: '😰', text: 'W-we are sorry, Moon Walker! Come on Ahona, let us run to the Ramna Park bench!' }
            ], () => {
              SoundEngine.scurryAway();
              this.tweens.add({ targets: this.totoro, scaleX: 1, scaleY: 1, duration: 250 });
              this.tweens.add({
                targets: this.ahona,
                x: 1290,
                y: 480,
                duration: 950,
                ease: 'Cubic.easeOut'
              });
              this.tweens.add({
                targets: this.apshora,
                x: 1335,
                y: 480,
                duration: 950,
                ease: 'Cubic.easeOut'
              });
              this.tweens.add({
                targets: this.rivalBadge,
                x: 1312,
                y: 412,
                duration: 950,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                  this.ahona.setPosition(1290, 480).setDepth(480);
                  this.apshora.setPosition(1335, 480).setDepth(480);
                  this.rivalBadge.setPosition(1312, 412).setText('😢 Ahona (Crying on Bench)');
                  this.rivalInteract.x = 1312;
                  this.rivalInteract.y = 480;
                  this.rivalInteract.name = 'Check on Crying Ahona';
                  DateState.bulliesDefeated = true;
                  DateState.ahonaQuestStage = 1;
                  this.cutsceneLocked = false;
                  UI.giveItem('shield', 'Totoro stepped in and sent Ahona & Apshora running.');
                  this.advanceDateProgress();
                }
              });
            });
          }
        });
      });
      return;
    }

    if (DateState.ahonaQuestStage === 1) {
      UI.startDialogue([
        { speaker: 'Apshora', portrait: '😟', text: 'Moon Walker, please do not let Totoro roar at us again! Ahona has been crying on this bench for ten minutes...' },
        { speaker: 'Ahona (Sniffling)', portrait: '😢', text: 'I am really sorry for being so mean to you earlier, Moon Walker. The truth is... my boyfriend Rakin and I had a terrible argument at TSC this afternoon.' },
        {
          speaker: 'Ahona',
          portrait: '😢',
          text: 'He walked off toward Nilkhet Book Lane and has not answered my texts. When I saw how sweet and protective Totoro was with you, I got bitter and jealous and took it out on you.',
          choices: [
            {
              label: '"Hey, dry your tears. I saw Rakin near Nilkhet, I will go talk to him for you!"',
              nextNodes: [
                { speaker: 'Ahona', portrait: '🥺', text: 'Wait... you would actually help me after how awful I was to you? You really are as kind as Totoro said.' },
                { speaker: 'Totoro', portrait: '🐾', text: 'See? That is my Moon Walker. Let us walk up to Nilkhet Book Lane (North-Center) and talk some sense into Rakin!' }
              ]
            },
            {
              label: '"Apology accepted, Ahona. Everyone deserves a second chance at love."',
              nextNodes: [
                { speaker: 'Apshora', portrait: '🥺', text: 'Thank you, Moon Walker! Rakin was last seen pacing around between Aparajeyo Bangla and Nilkhet Book Lane.' }
              ]
            }
          ]
        }
      ], () => {
        DateState.ahonaQuestStage = 2;
        this.rivalBadge.setText('🥺 Ahona (Waiting for Rakin)');
        this.rakinBadge.setText('❗ Rakin (Talk to Him!)');
        UI.updateQuestText();
      });
      return;
    }

    if (DateState.ahonaQuestStage === 2) {
      UI.startDialogue([
        { speaker: 'Ahona', portrait: '🥺', text: 'Did you find Rakin near Nilkhet Book Lane yet? He usually wears his navy-blue Panjabi when we have a date...' },
        { speaker: 'Apshora', portrait: '😟', text: 'Please hurry, Moon Walker! I have run out of tissues for her.' }
      ]);
      return;
    }

    if (DateState.ahonaQuestStage === 3) {
      this.playAhonaRakinReunionCutscene();
      return;
    }

    this.reunionVisits = (this.reunionVisits || 0) + 1;
    UI.startDialogue([
      {
        speaker: 'Ahona, Rakin & Apshora',
        portrait: '💑',
        text: 'Moon Walker! Totoro! The savior couple of Dhaka University! Who would you like to chat with on our bench?',
        choices: [
          {
            label: '🌹 Talk with Ahona (Reconciliation reflections & friendship)',
            nextNodes: [
              { speaker: 'Ahona', portrait: '😊', text: 'Moon Walker, I still can’t thank you enough. When I saw how gently Totoro treats you, it made me realize I was projecting all my insecurities onto you.' },
              { speaker: 'Ahona', portrait: '🥺', text: 'You showed me that real love is about patience, trust, and lifting each other up. If you ever need anything on campus, you have a friend for life.' },
              { speaker: 'Moon Walker', portrait: '🌙', text: 'I am so glad, Ahona. We all get stressed sometimes—what matters is coming back to kindness.' }
            ]
          },
          {
            label: '💌 Talk with Rakin (Apology letters & poetry tips)',
            nextNodes: [
              { speaker: 'Rakin', portrait: '💌', text: 'Moon Walker, Ahona cried happy tears when she read the letter! Totoro, your advice about holding her hand immediately? Worked like magic.' },
              { speaker: 'Totoro', portrait: '🐾', text: 'Told you, brother! A sincere apology plus holding hands solves 99% of arguments.' },
              { speaker: 'Rakin', portrait: '😊', text: 'We are heading to Star Kebab later tonight—let us know if you and your bestie Anamika want to make it a double date!' }
            ]
          },
          ...(DateState.apshoraQuestStage === 0 ? [{
            label: '👗 Talk with Apshora (Her secret dreams & bold ambitions)',
            onPick: () => this.interactApshoraSolo()
          }] : []),
          ...(DateState.apshoraQuestStage === 1 ? [{
            label: '👗 Talk with Apshora ("Did you introduce me to Anamika yet?")',
            onPick: () => this.interactApshoraSolo()
          }] : []),
          ...(DateState.apshoraQuestStage >= 4 ? [{
            label: '👑 Talk with Apshora (Celebrated Fashion Mogul & London Gala)',
            onPick: () => this.interactApshoraSolo()
          }] : []),
          ...(DateState.apshoraQuestStage >= 2 && DateState.apshoraQuestStage < 4 ? [{
            label: '✨ "Where is Apshora?" (Working at Charukola Atelier)',
            nextNodes: [
              { speaker: 'Ahona', portrait: '😊', text: 'Apshora is at Charukola Fine Arts with your bestie Anamika! They are working day and night on their debut fashion collection!' },
              { speaker: 'Rakin', portrait: '👔', text: 'I’ve never seen Apshora this inspired and driven. You should go visit their atelier on Charukola lawn!' }
            ]
          }] : [])
        ]
      }
    ]);
  }

  interactRakin() {
    if (DateState.ahonaQuestStage < 2) {
      UI.startDialogue([
        { speaker: 'Rakin', portrait: '😔', text: '*Sigh*... I bought this bouquet of red roses and wrote an apology letter with a wax seal, yet I am too scared I ruined everything with Ahona...' },
        { speaker: 'Totoro', portrait: '🐾', text: 'Hang in there, brother. Something tells me we will be helping you deliver that letter very soon.' }
      ]);
      return;
    }

    if (DateState.ahonaQuestStage === 2) {
      UI.startDialogue([
        { speaker: 'Rakin', portrait: '😔', text: 'Excuse me... I have been pacing outside Nilkhet in my best navy Panjabi for an hour. I said something stubborn during a silly argument with my girlfriend Ahona, and now I am afraid she hates me.' },
        {
          speaker: 'Moon Walker',
          portrait: '🌙',
          text: 'Rakin! Ahona does not hate you at all. She is sitting on the Ramna Park bench right now crying because she misses you!',
          choices: [
            {
              label: '"Take those red roses and that apology letter to the Ramna bench right now!"',
              nextNodes: [{ speaker: 'Rakin', portrait: '😳', text: 'She is waiting at the Ramna Park bench?! Thank you so much, Moon Walker! I am running there right now!' }]
            },
            {
              label: '"Pro tip from Totoro: give her the roses and hold her hand immediately."',
              nextNodes: [{ speaker: 'Totoro', portrait: '🐾', text: 'Works 100% of the time, brother. Go on, we will meet you at the Ramna bench!' }]
            }
          ]
        }
      ], () => {
        DateState.ahonaQuestStage = 3;
        this.cutsceneLocked = true;
        this.tweens.add({
          targets: [this.rakin, this.rakinBadge],
          x: 1255,
          y: 480,
          duration: 1400,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.rakin.setPosition(1255, 480).setDepth(480);
            this.rakinBadge.setPosition(1255, 412).setText('💌 Rakin');
            this.rakinInteract.x = 1255;
            this.rakinInteract.y = 480;
            this.cutsceneLocked = false;
            this.playAhonaRakinReunionCutscene();
          }
        });
      });
      return;
    }

    this.playAhonaRakinReunionCutscene();
  }

  playAhonaRakinReunionCutscene() {
    if (DateState.ahonaQuestStage === 4) {
      this.interactAhonaApshora();
      return;
    }
    this.cutsceneLocked = true;
    this.cameras.main.pan(1290, 470, 700, 'Sine.easeInOut');

    this.time.delayedCall(750, () => {
      SoundEngine.heartUp();
      UI.startDialogue([
        { speaker: 'Rakin', portrait: '💌', text: 'Ahona! I was such an idiot earlier at TSC. I brought you fresh red roses, your favorite book from Nilkhet, and wrote everything I was too shy to say.' },
        { speaker: 'Ahona', portrait: '😭', text: 'Rakin! No, it was my fault. I was so miserable without you that I was rude to Moon Walker, and she still came all the way to Nilkhet to bring you back to me!' },
        { speaker: 'Apshora', portrait: '🥺', text: 'Moon Walker, Totoro... we owe you two the biggest apology. Please take this Peacekeeper Letter Charm as our thank-you gift!' },
        { speaker: 'Totoro', portrait: '🐾', text: 'First I protect you from bullies, and then you turn them into friends and save their relationship. Is there anything you cannot do, Moon Walker?' }
      ], () => {
        DateState.ahonaQuestStage = 4;
        this.rivalBadge.setText('💑 Ahona, Rakin & Apshora');
        this.rakinBadge.setVisible(false);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cutsceneLocked = false;
        UI.giveItem('charm', 'Helped Ahona and her boyfriend Rakin reconcile at Ramna Park.');
        this.advanceDateProgress();
      });
    });
  }

  /* =========================================================================
   *  ENAN & SALAT COUPLE DATE QUESTLINE & CUTSCENES
   * ========================================================================= */
  interactSalat() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([
        { speaker: 'Salat', portrait: '🌸', text: 'Oh hello! Are you looking for your partner? I saw a huge, cuddly forest spirit waiting by the Krishnachura tree at Curzon Hall!' }
      ]);
      return;
    }

    // Stage 0: Initial proposal of the Couple Date
    if (DateState.enanQuestStage === 0) {
      SoundEngine.heartUp();
      UI.startDialogue([
        {
          speaker: 'Salat',
          portrait: '🌸',
          text: 'Moon Walker! Oh, it really is you! And is that... Totoro?! You two are literally the most enchanting couple in all of Dhaka!'
        },
        {
          speaker: 'Moon Walker',
          portrait: '🌙',
          text: 'Thank you, Salat! We have been exploring the valley together today.'
        },
        {
          speaker: 'Salat',
          portrait: '🌸',
          text: 'I have been watching you two from across the fountain... you look so genuinely happy and in love. You see that handsome guy over there in the navy silk Panjabi? That is Enan, my boyfriend.'
        },
        {
          speaker: 'Salat',
          portrait: '🌸',
          text: 'We have been together for two years since our first year at DU... but lately, he is so consumed by his job and client spreadsheets that we haven’t had a real date in months.'
        },
        {
          speaker: 'Salat',
          portrait: '✨',
          text: 'I just had the most wonderful idea: what if we go on a Double Couple Date together?! Enan and me, and Moon Walker and Totoro! We could walk under the Ramna trees, drink hot clay-cup Malai Cha, and take photos under the lanterns!',
          choices: [
            {
              label: '🌸 "That sounds like an amazing idea, Salat! Double date of the century!"',
              nextNodes: [
                {
                  speaker: 'Salat',
                  portrait: '🌸',
                  text: 'Really?! Oh, thank you! Moon Walker, please propose this scenario to Totoro so he is ready! And I will run over to Enan right now and tell him to put his laptop away!'
                },
                {
                  speaker: 'Moon Walker',
                  portrait: '🌙',
                  text: 'Go get him, Salat! We will watch from right here.'
                }
              ]
            },
            {
              label: '🍵 "Count us in! Totoro loves hot tea and sweet treats."',
              nextNodes: [
                {
                  speaker: 'Salat',
                  portrait: '✨',
                  text: 'Hooray! Moon Walker, let Totoro know our plan! I am going to tell Enan the great news right now!'
                }
              ]
            }
          ]
        }
      ], () => {
        DateState.enanQuestStage = 1;
        this.playEnanExcusesCutscene();
      });
      return;
    }

    // Stage 1: Trigger excuses cutscene if not finished
    if (DateState.enanQuestStage === 1) {
      this.playEnanExcusesCutscene();
      return;
    }

    // Stage 2: Salat's heartbreaking vent after Enan brushed her off
    if (DateState.enanQuestStage === 2) {
      SoundEngine.blip(340, 'sine');
      UI.startDialogue([
        {
          speaker: 'Salat (Crying)',
          portrait: '😭',
          text: '*Sniffles and wipes her tears* Did you see that, Moon Walker? He didn’t even look up from his phone. Not even for five seconds...'
        },
        {
          speaker: 'Salat',
          portrait: '💔',
          text: 'He called Totoro an "oversized forest spirit"... and said taking two hours for a date is "lost productivity". Am I just an interruption to his schedule now?'
        },
        {
          speaker: 'Salat',
          portrait: '🥺',
          text: 'When we first started dating on Curzon lawn, Enan wasn’t like this at all. He used to write silly rhymes on the back of exam papers. Once, during a Kalbaishakhi storm, he waited forty minutes in the soaking rain at TSC just to bring me hot tea because he knew I had a migraine.'
        },
        {
          speaker: 'Salat',
          portrait: '😭',
          text: 'Now all he sees are deadlines, quarterly targets, and billable hours. Does he even remember the boy he used to be? If work is all that matters to him, why are we even together?!',
          choices: [
            {
              label: '🌸 "Don’t give up on him yet, Salat. Let me tell Totoro—his ancient spirit wisdom can melt any stubborn heart!"',
              nextNodes: [
                {
                  speaker: 'Salat',
                  portrait: '🥺',
                  text: 'You think Totoro can reach him? Enan was so dismissive... but maybe an ancient forest avatar can shake him awake.'
                },
                {
                  speaker: 'Salat',
                  portrait: '🥺',
                  text: 'Please, Moon Walker... tell Totoro what happened. I just want my sweet, caring Enan back.'
                }
              ]
            },
            {
              label: '🫂 "You deserve to be loved and prioritized, Salat. We are going to give Enan a serious wake-up call."',
              nextNodes: [
                {
                  speaker: 'Salat',
                  portrait: '🥺',
                  text: 'Thank you... hearing you say that means the world. Please talk to Totoro, Moon Walker. Maybe he can make Enan realize what he is throwing away.'
                }
              ]
            }
          ]
        }
      ], () => {
        DateState.enanQuestStage = 3;
        if (this.salatBadge) this.salatBadge.setText('🥺 Salat (Hoping Totoro Can Help)');
        UI.updateQuestText();
        UI.showToast('💬', 'Talk to Totoro!', 'Tell Totoro about Enan’s excuses (Click Partner button or press E near Totoro)!');
      });
      return;
    }

    // Stage 3: Waiting for player to talk to Totoro
    if (DateState.enanQuestStage === 3) {
      UI.startDialogue([
        {
          speaker: 'Salat',
          portrait: '🥺',
          text: 'Moon Walker, please talk to Totoro right beside you! Tell him how Enan is hiding behind his work excuses. I am praying Totoro can make him understand.'
        }
      ]);
      return;
    }

    // Stage 4: Totoro is ready to sway Enan
    if (DateState.enanQuestStage === 4) {
      UI.startDialogue([
        {
          speaker: 'Salat',
          portrait: '🥺',
          text: 'Totoro agreed to talk to Enan?! Oh, Moon Walker... I hope Enan listens. Please go confront him at Mintu Road!'
        }
      ]);
      return;
    }

    // Stage 5: Happy couple after double date
    if (DateState.enanQuestStage >= 5) {
      SoundEngine.heartUp();
      UI.startDialogue([
        {
          speaker: 'Salat',
          portrait: '🌸',
          text: 'Moon Walker! Look at him—Enan hasn’t touched his phone once since our double date! He even tied fresh Beli flowers around my wrist.'
        },
        {
          speaker: 'Enan',
          portrait: '👔',
          text: 'And I am taking her to dinner at Dhanmondi Lake every Friday from now on. Totoro’s words will stay in my heart forever.'
        },
        {
          speaker: 'Totoro',
          portrait: '🐾',
          text: 'That is the spirit, Enan! The true wealth of Dhaka is the love we share under the night sky.'
        }
      ]);
    }
  }

  /* Cutscene 1: Enan brushes Salat off with excuses */
  playEnanExcusesCutscene() {
    this.cutsceneLocked = true;
    this.cameras.main.pan(1060, 800, 600, 'Sine.easeInOut');

    this.time.delayedCall(650, () => {
      // Salat walks over to Enan
      this.tweens.add({
        targets: [this.salat, this.salatBadge],
        x: 1105,
        duration: 750,
        ease: 'Power1',
        onComplete: () => {
          SoundEngine.blip(480, 'sine');
          UI.startDialogue([
            {
              speaker: 'Salat',
              portrait: '🌸',
              text: 'Enan, jaan! Look who is here—Moon Walker and Totoro! They agreed to go on a Double Couple Date with us tonight!'
            },
            {
              speaker: 'Enan (Glued to Phone)',
              portrait: '💼',
              text: '*Tapping furiously on his phone, without even looking up* ...Salat, please. I told you three times today, my quarterly project deliverables are due tomorrow morning at 9 AM, and I have thirty-four unread client emails.'
            },
            {
              speaker: 'Salat',
              portrait: '🥺',
              text: 'Enan, you promised me last week! It’s just two hours... we can have tea at TSC, walk by the lake, and double date with them!'
            },
            {
              speaker: 'Enan',
              portrait: '💼',
              text: 'Two hours?! Salat, do you know how much productivity that is? I don’t have time to go on a picnic date with an oversized forest spirit and an umbrella girl right now. Be reasonable! Maybe next month.'
            },
            {
              speaker: 'Salat',
              portrait: '💔',
              text: '...Next month? Enan, that’s what you said last month. And the month before that.'
            },
            {
              speaker: 'Enan',
              portrait: '💼',
              text: 'I am working for our future, Salat! Why can’t you understand that?! *turns his back coldly, continuing to type*'
            }
          ], () => {
            // Heartbreak: Salat walks away crying
            SoundEngine.blip(260, 'sine');
            this.tweens.add({
              targets: [this.salat, this.salatBadge],
              x: 965,
              duration: 800,
              ease: 'Sine.easeInOut',
              onComplete: () => {
                DateState.enanQuestStage = 2;
                if (this.salatBadge) this.salatBadge.setText('😢 Salat (Crying by Fountain)');
                if (this.enanBadge) this.enanBadge.setText('📱 Enan (Glued to Screen)');
                this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
                this.cutsceneLocked = false;
                UI.updateQuestText();
                UI.showToast('😢', 'Salat is Heartbroken', 'Enan gave excuses and brushed her off. Go comfort Salat!');
              }
            });
          });
        }
      });
    });
  }

  interactEnan() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([
        { speaker: 'Enan', portrait: '💼', text: '*Typing on phone* Not right now, please. I am swamped with urgent project emails.' }
      ]);
      return;
    }

    if (DateState.enanQuestStage < 4) {
      SoundEngine.blip(300, 'square');
      UI.startDialogue([
        {
          speaker: 'Enan (Buried in Work)',
          portrait: '💼',
          text: 'Look, if you’re here to ask for directions or sell something, I don’t have time. I have thirty-four client emails to draft before my morning presentation.'
        },
        {
          speaker: 'Moon Walker',
          portrait: '🌙',
          text: '(Enan is completely trapped in his phone screen... Salat was right. We need Totoro’s wisdom to snap him out of this.)'
        }
      ]);
      return;
    }

    if (DateState.enanQuestStage === 4) {
      this.playTotoroSwaysEnanCutscene();
      return;
    }

    if (DateState.enanQuestStage >= 5) {
      this.interactSalat();
    }
  }

  /* Cutscene 2: Totoro sways Enan with profound wisdom and emotion */
  playTotoroSwaysEnanCutscene() {
    this.cutsceneLocked = true;
    this.cameras.main.pan(1110, 800, 700, 'Sine.easeInOut');

    this.time.delayedCall(750, () => {
      // Totoro steps forward in front of Enan
      this.tweens.add({
        targets: this.totoro,
        x: 1105,
        y: 810,
        duration: 500,
        ease: 'Sine.easeOut',
        onComplete: () => {
          SoundEngine.totoroRoar();
          // Visual petal aura around Totoro
          for (let i = 0; i < 8; i++) {
            const petal = this.add.circle(this.totoro.x, this.totoro.y - 30, 4, 0xff6b8b, 0.9).setDepth(2500);
            this.tweens.add({
              targets: petal,
              x: this.totoro.x + Phaser.Math.Between(-60, 60),
              y: this.totoro.y - Phaser.Math.Between(40, 100),
              alpha: 0,
              duration: 1200,
              onComplete: () => petal.destroy()
            });
          }

          UI.startDialogue([
            {
              speaker: 'Enan',
              portrait: '💼',
              text: 'Listen, I already told Salat, I don’t have time to chit-chat with—'
            },
            {
              speaker: 'Totoro',
              portrait: '🐾',
              text: 'Enan. Put down that glowing rectangle in your hands.'
            },
            {
              speaker: 'Enan',
              portrait: '😳',
              text: '*Startled by Totoro’s deep, resonant spirit voice* ...W-what? Look, I am on the clock!'
            },
            {
              speaker: 'Totoro',
              portrait: '🐾',
              text: 'Tell me, Enan... when your brief mortal days beneath this Dhaka sky draw to an end, which memory will keep your spirit warm? The thirty-four emails you replied to at midnight? Or the sound of Salat’s laughter when the evening breeze carried the scent of Beli flowers through her hair?'
            },
            {
              speaker: 'Enan',
              portrait: '😳',
              text: '*His hand trembles, lowering his phone* ...I... I...'
            },
            {
              speaker: 'Totoro',
              portrait: '🐾',
              text: 'She stood by that fountain in tears. She was remembering a young man in an embroidered Panjabi who once stood forty minutes in the freezing Kalbaishakhi rain at TSC just to bring her ten-taka tea. Where did that boy go, Enan? Did you trade his soul for a promotion?'
            },
            {
              speaker: 'Moon Walker',
              portrait: '🌙',
              text: 'She isn’t asking for the world, Enan. She is asking for you. Work will never hold your hand when you are lonely, and a spreadsheet will never love you back.'
            },
            {
              speaker: 'Enan',
              portrait: '🥺',
              text: '*Tears well up in Enan’s eyes* What... what on earth have I been doing? She was standing right in front of me, hurting, and I was treating her love like a nuisance.'
            },
            {
              speaker: 'Enan',
              portrait: '🥺',
              text: 'I was so terrified of falling behind in life that I forgot why I wanted to succeed in the first place—to give her a happy life. But I was losing her in the process.'
            }
          ], () => {
            // Enan puts phone away and rushes over to Salat
            this.tweens.add({
              targets: [this.enan, this.enanBadge],
              x: 865,
              duration: 600,
              ease: 'Power2',
              onComplete: () => {
                SoundEngine.heartUp();
                UI.startDialogue([
                  {
                    speaker: 'Enan',
                    portrait: '🥺',
                    text: 'Salat! Salat, look at me. I was an arrogant, blind fool. I am so deeply sorry. Work means nothing if I lose you. Please forgive me.'
                  },
                  {
                    speaker: 'Salat',
                    portrait: '😭',
                    text: 'Enan... you really put your phone away? You came back to me?'
                  },
                  {
                    speaker: 'Enan',
                    portrait: '🥺',
                    text: 'I came back, and I am never letting work get between us again. Tonight is completely for us.'
                  },
                  {
                    speaker: 'Salat',
                    portrait: '🌸',
                    text: '*Embraces Enan with joyful tears* Oh, Enan! I love you so much!'
                  },
                  {
                    speaker: 'Enan',
                    portrait: '👔',
                    text: 'Moon Walker, Totoro... you saved my relationship tonight. Will you please do us the greatest honor and join our Double Couple Date right this moment?!'
                  },
                  {
                    speaker: 'Totoro',
                    portrait: '🐾',
                    text: 'Grrr-oooh! That is what we came here for! Let the Double Couple Date begin!'
                  }
                ], () => {
                  DateState.enanQuestStage = 5;
                  this.playDoubleDateCutscene();
                });
              }
            });
          });
        }
      });
    });
  }

  /* Cutscene 3: The Grand Double Date Celebration */
  playDoubleDateCutscene() {
    this.cutsceneLocked = true;
    this.cameras.main.pan(1060, 800, 600, 'Sine.easeInOut');

    // Place all 4 characters in festive double date arrangement
    this.salat.setPosition(1045, 810).setDepth(810);
    this.enan.setPosition(1080, 810).setDepth(810);
    this.salatBadge.setPosition(1062, 742).setText('💑 Enan & Salat (Happy Couple)');
    if (this.enanBadge) this.enanBadge.setVisible(false);

    // Totoro and Moon Walker join them
    this.player.setPosition(1010, 810);
    this.totoro.setPosition(975, 810);

    // Floating festive hearts & confetti particles
    for (let i = 0; i < 16; i++) {
      const heart = this.add.text(
        Phaser.Math.Between(970, 1090),
        Phaser.Math.Between(750, 790),
        i % 2 === 0 ? '♥' : '🌸',
        { fontSize: '14px', color: '#ff69b4' }
      ).setDepth(2600);
      this.tweens.add({
        targets: heart,
        y: heart.y - Phaser.Math.Between(30, 70),
        alpha: 0,
        duration: 1800,
        delay: i * 80,
        onComplete: () => heart.destroy()
      });
    }

    SoundEngine.itemFanfare();
    UI.startDialogue([
      {
        speaker: 'Enan',
        portrait: '👔',
        text: 'Tong-er Mama just delivered four fresh clay cups of steaming Malai Cha, and I bought a full pot of Bogurar Mishti Doi! Salat, have the first spoonful.'
      },
      {
        speaker: 'Salat',
        portrait: '🌸',
        text: 'Mmm! Sweet, chilled, and ten times better because we are all here together. Look at us—the greatest double date in Dhaka history!'
      },
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: '*Slurps cha happily* Sharing warmth, laughter, and four beating hearts under the city lights. This is the true soul of Dhaka!'
      },
      {
        speaker: 'Moon Walker',
        portrait: '🌙',
        text: 'A toast to love that never gives up! Say cheese for the camera!'
      },
      {
        speaker: 'Enan & Salat',
        portrait: '💑',
        text: '*Smiling together hand-in-hand* CHEESE! 📸'
      }
    ], () => {
      // Rewards & Keepsake
      UI.giveItem('double_date_polaroid', 'Went on a memorable Double Couple Date with Enan, Salat, and Totoro.');
      RPGStats.gainXP(80);
      DateState.hearts = Math.min(5, DateState.hearts + 1);
      DateState.hp = DateState.maxHp;
      DateState.sp = DateState.maxSp;
      DateState.memories.push({
        emoji: '📸',
        title: 'Four-Hearts Double Couple Date',
        note: 'Totoro swayed Enan to put down his phone. Celebrated love with cha and mishti doi.'
      });

      SoundEngine.levelUp();
      UI.updateRPGStats();
      UI.updateHearts(DateState.hearts);
      UI.updateQuestText();
      UI.showToast('📸', 'Double Date Polaroid Keepsake!', 'Four-Hearts Double Date Polaroid added to bag! (+80 XP, +1 Heart)');

      this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
      this.cutsceneLocked = false;
    });
  }

  /* =========================================================================
   *  APSHORA & ANAMIKA: AMBITION & HERITAGE COUTURE SAGA
   * ========================================================================= */
  interactApshoraSolo() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([
        { speaker: 'Apshora', portrait: '💅', text: 'Moon Walker! Are you exploring campus? Have you seen Totoro at Curzon Hall yet?' }
      ]);
      return;
    }

    // Stage 0: Apshora's Ambition Confession
    if (DateState.apshoraQuestStage === 0) {
      SoundEngine.heartUp();
      UI.startDialogue([
        {
          speaker: 'Apshora',
          portrait: '💅',
          text: 'Moon Walker! Come closer for a moment. Ahona and Rakin are over there murmuring love poetry... but to be completely honest, seeing them reconcile made me look at my own life.'
        },
        {
          speaker: 'Apshora',
          portrait: '🥺',
          text: 'I’ve spent months being the sidekick in everyone else’s relationship drama—holding Ahona’s tissues, giving fashion commentary, and playing the sassy best friend. But that is not all I am.'
        },
        {
          speaker: 'Moon Walker',
          portrait: '🌙',
          text: 'You’ve always had incredible style, Apshora. What is on your mind?'
        },
        {
          speaker: 'Apshora',
          portrait: '✨',
          text: 'I have a burning ambition, Moon Walker. Look around Dhaka: malls are stuffed with imported synthetic fast-fashion, while our generational Jamdani master-weavers in Sonargaon and handloom artisans in Barishal are going out of business.'
        },
        {
          speaker: 'Apshora',
          portrait: '🔥',
          text: 'I want to build Dhaka’s most daring cultural luxury fashion house: "Nodi O Jamdani" (River & Jamdani Collective)! Avant-garde silk capes, tailored Jamdani power-blazers, and handloom stoles woven with Bengali river poetry. I have the business plan, the retail capital, and the hunger to win. But I need an artistic visionary partner who understands regional folklore, village weavers, and natural dyes.',
          choices: [
            {
              label: '🎨 "Apshora! You HAVE to meet my bestie Anamika at Charukola!"',
              nextNodes: [
                { speaker: 'Moon Walker', portrait: '🌙', text: 'My best friend Anamika is a fine-arts prodigy at Charukola! Her boyfriend Shuvra is in Barishal with direct artisan launch links, and she has secret sketchbooks filled with river ballads and water-lily textile patterns!' },
                { speaker: 'Apshora', portrait: '😳', text: 'Wait... THAT Anamika?! The charismatic girl who bargains like a warrior at Nilkhet bookstalls and knows the river launch routes?! She is an artistic genius!' },
                { speaker: 'Apshora', portrait: '✨', text: 'Moon Walker, please take me to her! Introduce us right away—I can feel that this is going to be the turning point of my life!' }
              ]
            },
            {
              label: '🌟 "Your ambition is inspiring, Apshora. Anamika is the exact co-founder you need."',
              nextNodes: [
                { speaker: 'Apshora', portrait: '🥰', text: 'Thank you for believing in me, Moon Walker! Let us go find Anamika near Charukola / campus right now. Let’s create history together!' }
              ]
            }
          ]
        }
      ], () => {
        DateState.apshoraQuestStage = 1;
        if (this.apshoraBadge) this.apshoraBadge.setText('👗 Apshora (Wants to Meet Anamika)');
        UI.updateQuestText();
        UI.showToast('👗', 'Apshora’s Ambition Sparked!', 'Find Anamika walking near Charukola or Fuller Road (x:640 y:780) to introduce them!');
      });
      return;
    }

    // Stage 1: Waiting for introduction
    if (DateState.apshoraQuestStage === 1) {
      UI.startDialogue([
        {
          speaker: 'Apshora',
          portrait: '✨',
          text: 'Moon Walker! Did you spot Anamika yet? I have my business portfolio and fabric swatches ready in my bag. Let’s talk to her whenever you’re near her!'
        }
      ]);
      return;
    }

    // Stage 2 & 3: Working at Atelier
    if (DateState.apshoraQuestStage >= 2 && DateState.apshoraQuestStage < 4) {
      this.interactApshoraAnamikaStudio();
      return;
    }

    // Stage 4: Celebrated Fashion Mogul
    if (DateState.apshoraQuestStage >= 4) {
      SoundEngine.heartUp();
      UI.startDialogue([
        {
          speaker: 'Apshora',
          portrait: '👑',
          text: 'Moon Walker! Totoro! Look at this headline in the Dhaka Tribune: "Apshora & Anamika’s Nodi O Jamdani Sells Out Debut Collection in 48 Hours!"'
        },
        {
          speaker: 'Apshora',
          portrait: '🥰',
          text: 'Our handloom weavers in Sonargaon and Barishal just received full health insurance and 3x living wage bonuses thanks to our global orders. I went from being the sidekick to leading a national heritage movement... all because you believed in my spark.'
        },
        {
          speaker: 'Totoro',
          portrait: '🐾',
          text: 'True brilliance cannot be dimmed, Apshora. You carved your own path with honor and power!'
        },
        {
          speaker: 'Moon Walker',
          portrait: '🌙',
          text: 'You and Anamika are true inspirations to every dreamer in Dhaka!'
        }
      ]);
    }
  }

  /* Cutscene 1: Apshora meets Anamika at Charukola / Campus — Sparks of Ambition! */
  playApshoraAnamikaPitchCutscene() {
    this.cutsceneLocked = true;

    // Find Anamika's coordinates or default to Charukola lawn
    let targetX = 640;
    let targetY = 780;
    if (this.anamikaWanderer && this.anamikaWanderer.sprite) {
      targetX = this.anamikaWanderer.sprite.x;
      targetY = this.anamikaWanderer.sprite.y;
    }

    this.cameras.main.pan(targetX, targetY, 650, 'Sine.easeInOut');

    this.time.delayedCall(700, () => {
      // Bring Apshora smoothly into the scene beside Anamika
      this.apshora.setPosition(targetX - 70, targetY).setDepth(targetY);
      this.tweens.add({
        targets: this.apshora,
        x: targetX - 35,
        duration: 600,
        ease: 'Power1',
        onComplete: () => {
          SoundEngine.heartUp();

          // Little sparkle burst
          for (let i = 0; i < 8; i++) {
            const star = this.add.text(targetX - 18, targetY - 40, '✨', { fontSize: '13px' }).setDepth(2600);
            this.tweens.add({
              targets: star,
              x: star.x + Phaser.Math.Between(-35, 35),
              y: star.y - Phaser.Math.Between(20, 50),
              alpha: 0,
              duration: 1200,
              delay: i * 70,
              onComplete: () => star.destroy()
            });
          }

          UI.startDialogue([
            {
              speaker: 'Moon Walker',
              portrait: '🌙',
              text: 'Anamika! Stop eating that Star Kebab mutton kebab for just three minutes. I want to introduce you to Apshora.'
            },
            {
              speaker: 'Anamika',
              portrait: '🥙',
              text: 'Huh?! Apshora?! The style queen of Fuller Road? Wait, why are you two looking at me like you’re about to announce a national revolution?!'
            },
            {
              speaker: 'Apshora',
              portrait: '✨',
              text: 'Because we ARE, Anamika. I’ve seen your sketches and heard about your ties to the Barishal river weavers through Shuvra. Dhaka is losing its soul to cheap synthetic fast-fashion while our generational Jamdani weavers are abandoned.'
            },
            {
              speaker: 'Apshora (Delivering Her Pitch)',
              portrait: '🔥',
              text: 'I have the seed capital, marketing strategy, and brand blueprint for an ultra-luxury cultural fashion house: "Nodi O Jamdani". But clothes without soul are just cloth. I need an artistic genius who knows Bengali river ballads, handloom block prints, and natural botanical dyes. Will you co-found this brand with me?'
            },
            {
              speaker: 'Anamika',
              portrait: '😳',
              text: '*Her eyes light up, dropping her takeaway parcel in shock* ...Are you serious?! Apshora, look at this sketchbook! I have spent two years secretly designing water-lily Jacquard borders, Jamdani power-stoles, and Jibanananda Das poetry calligraphy along silk hemlines!'
            },
            {
              speaker: 'Anamika',
              portrait: '😭',
              text: 'My professors said nobody in high fashion would fund rural handloom artisans! They said Dhaka only cares about foreign brand rip-offs!'
            },
            {
              speaker: 'Apshora',
              portrait: '✨',
              text: 'Then we are going to prove every single one of them wrong. Together. You design the soul and direct the artisans; I will run operations, sourcing, and take our runway to London and Paris.'
            },
            {
              speaker: 'Anamika',
              portrait: '🎉',
              text: 'YES! A thousand times YES! Partner! Shuvra’s launch docks from Barishal tomorrow morning—I’ll have him load three sacks of handspun organic yarn and river indigo dyes!'
            },
            {
              speaker: 'Totoro',
              portrait: '🐾',
              text: 'Roaaar! When two determined, brilliant women unite their spirits, the rivers themselves dance in celebration!'
            },
            {
              speaker: 'Moon Walker',
              portrait: '🌙',
              text: 'I knew you two were destined to be an unstoppable creative duo. Let’s get to work!'
            }
          ], () => {
            DateState.apshoraQuestStage = 2;

            // Set up Apshora & Anamika Atelier at Charukola Fine Arts lawn (x: 320, y: 785)
            this.apshora.setPosition(320, 785).setDepth(785);
            if (this.apshoraBadge) {
              this.apshoraBadge.setPosition(320, 720).setText('✨ Apshora & Anamika Atelier');
              this.apshoraBadge.setVisible(true);
            }
            if (this.apshoraInteract) {
              this.apshoraInteract.x = 320;
              this.apshoraInteract.y = 785;
              this.apshoraInteract.name = 'Visit Apshora & Anamika Atelier';
              this.apshoraInteract.onInteract = () => this.interactApshoraAnamikaStudio();
            }

            this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
            this.cutsceneLocked = false;
            UI.updateQuestText();
            UI.showToast('👗', 'Apshora & Anamika Atelier Founded!', 'Visit their design studio at Charukola Fine Arts (West, x:320 y:785) to review their debut collection!');
          });
        }
      });
    });
  }

  /* Act 3: Sourcing Heritage Materials & Prototype Review at Charukola Atelier */
  interactApshoraAnamikaStudio() {
    SoundEngine.heartUp();

    if (DateState.apshoraQuestStage === 2) {
      UI.startDialogue([
        {
          speaker: 'Apshora',
          portrait: '✨',
          text: 'Moon Walker! Totoro! Welcome to our creative atelier! Anamika and I haven’t slept in 48 hours, and it was worth every second.'
        },
        {
          speaker: 'Anamika',
          portrait: '🎨',
          text: 'Shuvra’s launch arrived from Barishal at dawn packed with pure riverine cotton and natural indigo! And Prof. Sultana from Curzon Hall gave us centennial Krishnachura petals for our deep red dye!'
        },
        {
          speaker: 'Apshora',
          portrait: '👗',
          text: 'We are crafting the showstopper centerpiece for our grand debut runway. Moon Walker, you and Totoro have Dhaka’s purest aesthetic taste. Which design philosophy should define our centerpiece?',
          choices: [
            {
              label: '🌌 "A Royal Midnight-Violet Silk Stole woven with Golden Jamdani Paisleys."',
              nextNodes: [
                { speaker: 'Apshora', portrait: '✨', text: 'Perfection! Pure Rajshahi mulberry silk steeped in twilight violet, edged with 24k gold Jamdani thread. It embodies royal resilience!' },
                { speaker: 'Anamika', portrait: '🎨', text: 'I am sketching the gold-thread river borders right now! It looks breathtaking under the lamplight!' }
              ]
            },
            {
              label: '🌊 "A River-Indigo Handloom Cape inscribed with Jibanananda Das Barishal Poetry."',
              nextNodes: [
                { speaker: 'Anamika', portrait: '🥺', text: 'Yes! "Abar ashibo phire, Dhanshiriti-r teere..." The words of our southern rivers woven into luxury haute-couture!' },
                { speaker: 'Apshora', portrait: '✨', text: 'International curators will lose their minds over this level of literary storytelling!' }
              ]
            },
            {
              label: '🌺 "A Krishnachura-Crimson Organza Trench with Antique Silver Zari Embroidery."',
              nextNodes: [
                { speaker: 'Apshora', portrait: '🔥', text: 'Bold, fiery, and unapologetic! The exact red of Curzon Hall blossoms in springtime!' },
                { speaker: 'Anamika', portrait: '🎨', text: 'Prof. Sultana and Dr. Kabir are going to cheer from the front row when they see this!' }
              ]
            }
          ]
        },
        {
          speaker: 'Apshora',
          portrait: '👑',
          text: 'The debut collection is officially finalized! The runway has been erected under the historic red-brick colonnade of Curzon Hall. Are you ready to attend the Grand Debut Runway Exhibition?',
          choices: [
            {
              label: '🎉 "Let’s start the Grand Runway Exhibition at Curzon Hall right now!"',
              onPick: () => {
                DateState.apshoraQuestStage = 3;
                this.playApshoraExhibitionCutscene();
              }
            },
            {
              label: '⏳ "Give me a minute to explore campus, then we’ll begin!"',
              nextNodes: [
                { speaker: 'Apshora', portrait: '✨', text: 'Take your time, Moon Walker! We’ll be waiting at Curzon Hall courtyard whenever you’re ready!' }
              ]
            }
          ]
        }
      ], () => {
        if (DateState.apshoraQuestStage === 2) {
          DateState.apshoraQuestStage = 3;
          if (this.apshoraBadge) this.apshoraBadge.setText('🎉 Apshora (Runway Ready at Curzon Hall)');
          UI.updateQuestText();
        }
      });
      return;
    }

    if (DateState.apshoraQuestStage === 3) {
      UI.startDialogue([
        {
          speaker: 'Apshora',
          portrait: '👑',
          text: 'The spotlights are glowing across Curzon Hall courtyard, and the critics have taken their seats! Shall we launch the show?',
          choices: [
            {
              label: '🎉 "Commence the Grand Runway Debut Exhibition!"',
              onPick: () => this.playApshoraExhibitionCutscene()
            },
            {
              label: '⏳ "Just taking a final walk around the lawn first."',
              nextNodes: [
                { speaker: 'Anamika', portrait: '🎨', text: 'Hurry back, bestie! This night is going to redefine Dhaka!' }
              ]
            }
          ]
        }
      ]);
    }
  }

  /* Cutscene 2: The Breakthrough Curzon Hall Fashion Exhibition */
  playApshoraExhibitionCutscene() {
    this.cutsceneLocked = true;

    // Pan camera to the grand Curzon Hall Courtyard
    const runwayX = 420;
    const runwayY = 1310;
    this.cameras.main.pan(runwayX, runwayY, 800, 'Sine.easeInOut');

    this.time.delayedCall(850, () => {
      // Setup characters on runway
      this.player.setPosition(runwayX - 95, runwayY + 20);
      this.totoro.setPosition(runwayX - 125, runwayY + 20);
      this.apshora.setPosition(runwayX, runwayY - 20).setDepth(runwayY + 10);

      // Temporary model sprite / visual spectacle
      const runwayParticles = [];
      for (let i = 0; i < 24; i++) {
        const item = i % 4 === 0 ? '✨' : (i % 4 === 1 ? '⭐' : (i % 4 === 2 ? '🧣' : '🌸'));
        const p = this.add.text(
          Phaser.Math.Between(runwayX - 110, runwayX + 110),
          Phaser.Math.Between(runwayY - 60, runwayY + 40),
          item,
          { fontSize: '15px' }
        ).setDepth(2650);
        this.tweens.add({
          targets: p,
          y: p.y - Phaser.Math.Between(40, 90),
          alpha: 0,
          scaleX: 1.4,
          scaleY: 1.4,
          duration: 2200,
          delay: i * 75,
          onComplete: () => p.destroy()
        });
        runwayParticles.push(p);
      }

      SoundEngine.itemFanfare();
      this.cameras.main.flash(350, 255, 245, 220);

      UI.startDialogue([
        {
          speaker: 'Dhaka Arts Emcee',
          portrait: '🎙️',
          text: 'Distinguished faculty, honored critics, and citizens of Dhaka! Welcome to the historic runway debut of "NODI O JAMDANI", founded by Apshora & Anamika!'
        },
        {
          speaker: 'Runway Narrator',
          portrait: '✨',
          text: '*Music swells as models glide down the red carpet beneath Curzon Hall’s glowing red-brick arches, draped in midnight-violet Rajshahi silks, shimmering gold Jamdani cloaks, and river-indigo stoles.*'
        },
        {
          speaker: 'Prof. Satyendra',
          portrait: '🔬',
          text: 'Fascinating! The optical interference of the pure gold zari and indigo thread creates a quantum harmonic sheen unlike anything in industrial textiles!'
        },
        {
          speaker: 'Prof. Sultana',
          portrait: '🌿',
          text: 'And the botanical dye stability from Curzon’s Krishnachura petals is breathtaking! A triumph of Bengali natural sciences and aesthetic design!'
        },
        {
          speaker: 'Ahona (Applauding Wildly)',
          portrait: '😭',
          text: 'Apshora!! Look at her, Rakin! Look at my best friend! She isn’t standing on any sideline anymore—she owns the entire world tonight!'
        },
        {
          speaker: 'Rakin & Enan',
          portrait: '👏',
          text: 'Bravo! Absolutely sensational work!'
        },
        {
          speaker: 'Apshora (At the Spotlight Mic)',
          portrait: '👑',
          text: 'Thank you, everyone! Growing up as girls in Dhaka, we are so often conditioned to keep our dreams modest—to stay quiet, follow in someone else’s footsteps, and never dare to take up space.'
        },
        {
          speaker: 'Apshora',
          portrait: '🔥',
          text: 'Tonight proves that our heritage is not a relic to hide away in museum boxes. It is alive, it is powerful, and when women join hands with fierce ambition and authentic artistry, nothing on earth can stop us!'
        },
        {
          speaker: 'Anamika',
          portrait: '🎨',
          text: 'And our rural weavers in Barishal and Sonargaon will never be exploited by middlemen again! We weave with honor, fair pay, and pure Bengali pride!'
        },
        {
          speaker: 'International Fashion Curator',
          portrait: '🌍',
          text: 'Outstanding! The South Asian Cultural Council is placing an immediate order for thirty complete ensembles to headline the London Fashion Gala next month!'
        },
        {
          speaker: 'Apshora & Anamika',
          portrait: '🥰',
          text: '*Gasping with tears of triumph and tightly embracing each other as flashbulbs burst across the runway*'
        },
        {
          speaker: 'Apshora (Walking up to Moon Walker)',
          portrait: '👑',
          text: 'Moon Walker... none of this would have happened if you hadn’t believed in my ambition and connected me to Anamika. You saw the fire in me when I was just a bitter girl on a bench. Please accept the crown jewel of our debut collection: Apshora’s Royal Heritage Silk Stole.'
        },
        {
          speaker: 'Totoro',
          portrait: '🐾',
          text: 'A wondrous achievement born of perseverance and sisterhood. May your creations touch every corner of the earth!'
        }
      ], () => {
        // Complete the quest and award items
        DateState.apshoraQuestStage = 4;
        UI.giveItem('apshora_silk_stole', 'Awarded by Apshora & Anamika at their triumphant Curzon Hall debut runway.');
        RPGStats.gainXP(90);
        DateState.sp = DateState.maxSp;
        DateState.hearts = Math.min(5, DateState.hearts + 1);

        DateState.memories.push({
          emoji: '🧣',
          title: 'Apshora & Anamika’s Heritage Triumph',
          note: 'Witnessed Apshora’s ambitious dream ignite into Dhaka’s premiere cultural fashion revolution alongside Anamika.'
        });

        SoundEngine.levelUp();
        UI.updateRPGStats();
        UI.updateHearts(DateState.hearts);
        UI.updateQuestText();
        UI.showToast('🧣', 'Apshora’s Silk Stole Acquired!', 'Royal Heritage Silk Stole added to bag! (+8 ATK, +8 DEF, +90 XP)');

        // Reposition Apshora as a triumphant fashion mogul
        this.apshora.setPosition(1345, 480).setDepth(480);
        if (this.apshoraBadge) {
          this.apshoraBadge.setPosition(1345, 412).setText('👑 Apshora (Celebrated Fashion Mogul)');
          this.apshoraBadge.setVisible(true);
        }
        if (this.apshoraInteract) {
          this.apshoraInteract.x = 1345;
          this.apshoraInteract.y = 480;
          this.apshoraInteract.name = 'Talk to Fashion Mogul Apshora';
          this.apshoraInteract.onInteract = () => this.interactApshoraSolo();
        }

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cutsceneLocked = false;
      });
    });
  }

  interactFlowerCart() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Phulwali Khala', portrait: '🌼', text: 'Fresh Beli and Bokul flower garlands! Bring your partner over so he can tie one around your wrist.' }]);
      return;
    }
    SoundEngine.heartUp();
    this.flowerVisits = (this.flowerVisits || 0) + 1;

    if (!DateState.gajraDone) {
      UI.startDialogue([
        { speaker: 'Phulwali Khala', portrait: '🌼', text: 'Freshly woven Beli phuler gajra and fragrant Bokul garlands! Here, young man, tie this white Beli garland around her wrist properly.' },
        { speaker: 'Totoro', portrait: '🐾', text: 'May I have your wrist, Moon Walker? Every time the evening breeze blows across Ramna, the scent of Beli flowers will remind me of this exact moment.' }
      ], () => {
        DateState.gajraDone = true;
        UI.giveItem('gajra', 'Totoro tied a fragrant Beli flower gajra around your wrist.');
        this.advanceDateProgress();
      });
    } else {
      UI.startDialogue([
        {
          speaker: 'Phulwali Khala',
          portrait: '🌼',
          text: 'The evening breeze is carrying the scent of fresh Beli and Bokul blossoms! What floral blessing seeks your heart?',
          choices: [
            {
              label: '🌿 "Khala, what is the folklore meaning of Beli flowers?"',
              nextNodes: [
                { speaker: 'Phulwali Khala', portrait: '🌼', text: 'Beli is the flower of silent devotion and pure intentions. It blooms under moonlight and never asks for anything in return.' },
                { speaker: 'Totoro', portrait: '🐾', text: 'That sounds just like how I feel about Moon Walker.' }
              ]
            },
            {
              label: '🌸 Tie a tiny Bokul flower ring on Totoro’s paw',
              onPick: () => SoundEngine.heartUp(),
              nextNodes: [
                { speaker: 'Phulwali Khala', portrait: '🌼', text: 'Aww! Look at that giant forest spirit wearing a delicate Bokul ring! You two are blessed, মা (ma).' },
                { speaker: 'Totoro', portrait: '🐾', text: 'I am never taking this flower ring off my paw!' }
              ]
            },
            {
              label: '💌 "Did Anamika stop by your cart earlier, Khala?"',
              nextNodes: [
                { speaker: 'Phulwali Khala', portrait: '🌼', text: 'Yes! She bought a string of sweet Bokul flowers to press inside a notebook for Shuvra when his launch docks from Barishal!' },
                { speaker: 'Moon Walker', portrait: '🌙', text: 'Anamika acts tough, but she is the sweetest romantic at heart.' }
              ]
            }
          ]
        }
      ]);
    }
  }

  interactFuchkaCart() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Fuchka Mama', portrait: '🥙', text: 'Bring Totoro along! My extra-spicy Naga fuchka requires a hand-holding partner.' }]);
      return;
    }
    SoundEngine.crunchFuchka();
    this.fuchkaVisits = (this.fuchkaVisits || 0) + 1;

    if (!DateState.fuchkaDone) {
      UI.startDialogue([
        { speaker: 'Fuchka Mama', portrait: '🥙', text: 'Shabash! Two plates of crispy fuchka loaded with spiced masheddabli, coriander, and extra tamarind tok! How much Naga chili shall I add?' },
        {
          speaker: 'Totoro',
          portrait: '🐾',
          text: 'Remember our rule: if the Naga chili makes your eyes water, you hold my hand.',
          choices: [
            {
              label: 'Extra Naga Chili! (Immediately grab Totoro’s hand)',
              onPick: () => { DateState.spicyChoice = 'Extra Naga Chili Fuchka'; },
              nextNodes: [{ speaker: 'Totoro', portrait: '🐾', text: 'Wait, you grabbed my hand before even taking a bite! Not that I am complaining at all.' }]
            },
            {
              label: 'Challenge Totoro to a 10-Fuchka eating race',
              onPick: () => { DateState.spicyChoice = 'Championship Fuchka Plate'; },
              nextNodes: [{ speaker: 'Totoro', portrait: '🐾', text: 'Loser buys Bogurar Mishti Doi next! (And I am 100% planning on losing on purpose).' }]
            }
          ]
        }
      ], () => {
        DateState.fuchkaDone = true;
        UI.giveItem('fuchka', `Shared ${DateState.spicyChoice} at Mama's cart.`);
        this.advanceDateProgress();
      });
    } else {
      UI.startDialogue([
        {
          speaker: 'Fuchka Mama',
          portrait: '🥙',
          text: 'Back for more crispy fuchka round two?! Pick your spice level, champions!',
          choices: [
            {
              label: '🌶️ Level 1: Sweet & Sour Tamarind Tok (Mild & Refreshing)',
              onPick: () => {
                SoundEngine.crunchFuchka();
                DateState.hp = Math.min(DateState.maxHp, DateState.hp + 25);
                UI.updateRPGStats();
              },
              nextNodes: [
                { speaker: 'Fuchka Mama', portrait: '🥙', text: '*Crunch!* Loaded with coriander and cool tamarind water! (+25 HP Restored!)' },
                { speaker: 'Moon Walker', portrait: '🌙', text: 'Crispy, tangy, and absolutely addictive!' }
              ]
            },
            {
              label: '🔥 Level 2: Dhaka Classic (Crushed Green Chilies & Roasted Cumin)',
              onPick: () => {
                SoundEngine.crunchFuchka();
                DateState.sp = Math.min(DateState.maxSp, DateState.sp + 25);
                UI.updateRPGStats();
              },
              nextNodes: [
                { speaker: 'Totoro', portrait: '🐾', text: '*Crunch!* Mmm! Now that is the signature Dhaka zing! (+25 SP Restored!)' }
              ]
            },
            {
              label: '💀 Level 3: MAXIMUM NAGA CHALLENGE! (Hold Totoro’s Hand!)',
              onPick: () => {
                SoundEngine.crunchFuchka();
                DateState.sp = DateState.maxSp;
                UI.updateRPGStats();
                UI.showToast('🔥', 'Naga Champion!', 'Your spirit roared with Dhaka spice! (SP Maxed!)');
              },
              nextNodes: [
                { speaker: 'Fuchka Mama', portrait: '🥙', text: 'AHAHA! EXTRA NAGA CHILI CRUSHED IN! Look at the smoke coming out of your ears!' },
                { speaker: 'Totoro', portrait: '🐾', text: '*(Chugging tamarind tok while gripping Moon Walker’s hand tight)* W-WE SURVIVED! WE ARE UNSTOPPABLE! (SP Fully Maxed!)' },
                { speaker: 'Moon Walker', portrait: '🌙', text: 'Haha, quick, let us run to the Mishti Doi cart before our tongues melt!' }
              ]
            }
          ]
        }
      ]);
    }
  }

  interactDoiCart() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Sweetwalla', portrait: '🍮', text: 'Chilled Bogurar Mishti Doi and Beauty Lassi! Bring your date over.' }]);
      return;
    }
    SoundEngine.teaClink();
    this.doiVisits = (this.doiVisits || 0) + 1;

    if (!DateState.doiDone) {
      UI.startDialogue([
        { speaker: 'Old Dhaka Sweetwalla', portrait: '🍮', text: 'Nothing cools down Naga chili fuchka like chilled clay-pot Bogurar Mishti Doi and rose-water Beauty Lassi!' },
        { speaker: 'Totoro', portrait: '🐾', text: 'I get to feed you the first wooden spoonful of Mishti Doi. Old Dhaka’s sweetest classic, second only to you!' }
      ], () => {
        DateState.doiDone = true;
        UI.giveItem('doi', 'Fed each other chilled Bogurar Mishti Doi.');
        this.advanceDateProgress();
      });
    } else {
      DateState.hp = DateState.maxHp;
      DateState.sp = DateState.maxSp;
      UI.updateRPGStats();
      UI.startDialogue([
        {
          speaker: 'Old Dhaka Sweetwalla',
          portrait: '🍮',
          text: 'Chilled clay pots of Bogurar Mishti Doi and rose Beauty Lassi! What dessert dream shall we satisfy?',
          choices: [
            {
              label: '🥄 "Feed Totoro another wooden spoon of sweet Mishti Doi"',
              onPick: () => SoundEngine.teaClink(),
              nextNodes: [
                { speaker: 'Totoro', portrait: '🐾', text: 'Mmm! Creamy, caramelized perfection! And seeing you smile like that while feeding me is the sweetest part. (HP & SP Fully Restored!)' },
                { speaker: 'Old Dhaka Sweetwalla', portrait: '🍮', text: 'You two are the sweetest couple on Fuller Road!' }
              ]
            },
            {
              label: '🏆 "The Great Sweet Debate: Mishti Doi vs. Barishal Guthia Sandesh vs. Falooda!"',
              nextNodes: [
                { speaker: 'Old Dhaka Sweetwalla', portrait: '🍮', text: 'Your friend Anamika claims Shuvra’s Barishal Guthia Sandesh will win, but my family has made Bogurar Mishti Doi for four generations!' },
                { speaker: 'Moon Walker', portrait: '🌙', text: 'We promise to hold an official taste test at Star Kebab with Anamika and Shuvra this weekend!' },
                { speaker: 'Totoro', portrait: '🐾', text: 'I volunteer as chief taste-tester!' }
              ]
            },
            {
              label: '🌹 "A chilled glass of rose-water Beauty Lassi to go!"',
              onPick: () => {
                SoundEngine.teaClink();
                UI.showToast('🌹', 'Beauty Lassi!', 'Fragrant and cooling! (Speed & Energy Boost!)');
              },
              nextNodes: [
                { speaker: 'Old Dhaka Sweetwalla', portrait: '🍮', text: 'Topped with crushed pistachios and saffron threads! Stay refreshed under the Dhaka stars! (HP & SP Fully Restored!)' }
              ]
            }
          ]
        }
      ]);
    }
  }

  /* ===== World 2: Whispering Emerald Forest — Spooky NPCs & Cutscenes ===== */
  interactAnanyaGhost() {
    SoundEngine.ghostWhisper();
    if (DateState.ananyaQuestStage === 0) {
      SoundEngine.spookyChime();
      this.cameras.main.pan(880, 460, 800, 'Sine.easeInOut');
      UI.startDialogue([
        {
          speaker: 'Ananya (Weeping Petni)',
          portrait: '👻',
          text: 'Sob... sob... the winter fog never lifts from Curzon’s gardens... Seventy years ago in 1952, I left my final letter tucked beneath the banyan root... but the gunfire echoed, and he never came...'
        },
        {
          speaker: 'Moon Walker',
          portrait: '🌙',
          text: 'Ananya? You don’t have to weep alone in the dark anymore. We hear your grief, and Dhaka has never forgotten your sacrifice.'
        },
        {
          speaker: 'Totoro',
          portrait: '🐾',
          text: '(Totoro steps forward softly on giant padded paws and lays a freshly woven garland of white Beli flowers and glowing Spirit Dew at her floating feet.)'
        },
        {
          speaker: 'Ananya (Weeping Petni)',
          portrait: '🏮',
          text: 'The scent of Beli flowers... warmth... after all these frozen decades! My heart feels light as air! Please, kind travelers, take my Phantom Silver Lantern. Its emerald flame pierces all forest illusions!',
          choices: [
            {
              label: '🏮 Accept Ananya’s Phantom Silver Lantern (+7 ATK, +5 DEF)',
              onPick: () => {
                DateState.ananyaQuestStage = 1;
                DateState.sideQuests.sq_ananya_spirit = true;
                SoundEngine.itemFanfare();
                UI.giveItem('spectral_lantern', 'Received Phantom Silver Lantern from Ananya!');
                UI.showToast('🏮', 'Spirit Pacified!', 'Ananya’s sorrow has been soothed! (+7 ATK, +5 DEF)');
                this.cameras.main.flash(500, 52, 211, 153);
              },
              nextNodes: [
                {
                  speaker: 'Ananya (Pacified Spirit)',
                  portrait: '✨',
                  text: 'Thank you, Moon Walker and Totoro! If you seek to bring peace to this grove, please visit old Kofil Chacha by the marsh, and find Prof. Shamsher near the ruins before the Nishi claims his soul!'
                }
              ]
            }
          ]
        }
      ]);
    } else {
      SoundEngine.spookyChime();
      UI.startDialogue([
        {
          speaker: 'Ananya (Pacified Spirit)',
          portrait: '✨',
          text: 'The banyan whispers softly now, free from sorrow. Go with peace, Moon Walker and Totoro! May my lantern light your path!'
        }
      ]);
    }
  }

  interactKofilGhost() {
    SoundEngine.bellToll();
    if (DateState.kofilQuestStage === 0) {
      SoundEngine.rickshawBell();
      this.cameras.main.pan(420, 1320, 800, 'Sine.easeInOut');
      UI.startDialogue([
        {
          speaker: 'Kofil Chacha',
          portrait: '🛺',
          text: 'Tring-tring... Hajaribagh, Lalbagh, Sadarghat... Who needs passage across the high waters? The floodwaters of ’88 are rising, but old Kofil never leaves a passenger stranded!'
        },
        {
          speaker: 'Moon Walker',
          portrait: '🌙',
          text: 'Kofil Chacha... the flood ended decades ago. You got every mother and child home safely that night.'
        },
        {
          speaker: 'Totoro',
          portrait: '🐾',
          text: '(Totoro clambers gently onto the vintage rickshaw seat, bouncing the carriage softly with a delighted smile, and hands Kofil Chacha a steaming clay cup of Tong-er Mama’s spiced tea.)'
        },
        {
          speaker: 'Kofil Chacha',
          portrait: '🍵',
          text: 'Orey baba! A giant fluffy forest spirit riding my rickshaw?! And hot ginger malai cha in the middle of this swamp?! Ha ha ha! By Allah, that warms my old bones like sunshine on Buriganga!',
          choices: [
            {
              label: '🛺 Ring Kofil Chacha’s Phantom Brass Bell (+6 ATK, +8 DEF)',
              onPick: () => {
                DateState.kofilQuestStage = 1;
                DateState.sideQuests.sq_kofil_rickshaw = true;
                SoundEngine.bellToll();
                SoundEngine.rickshawBell();
                SoundEngine.itemFanfare();
                UI.giveItem('ghost_bell', 'Received Phantom Rickshaw Brass Bell from Kofil Chacha!');
                UI.showToast('🔔', 'Chacha’s Joy!', 'Kofil Chacha’s phantom rickshaw shines bright! (+6 ATK, +8 DEF)');
                this.cameras.main.flash(500, 56, 189, 248);
              },
              nextNodes: [
                {
                  speaker: 'Kofil Chacha',
                  portrait: '🔔',
                  text: 'Take my lucky brass bell, beta! When the mist rolls thick and eerie sounds call your name, ring this bell—no phantom tricks can overcome a Dhaka rickshawalla’s chime! Now hurry and check on that professor in the ruins!'
                }
              ]
            }
          ]
        }
      ]);
    } else {
      SoundEngine.rickshawBell();
      UI.startDialogue([
        {
          speaker: 'Kofil Chacha',
          portrait: '🛺',
          text: 'Tring-tring! Whenever you and Totoro need a breather from slaying briar stags, my rickshaw hood is always open for you two!'
        }
      ]);
    }
  }

  interactShamsherNishi() {
    SoundEngine.radioStatic();
    if (DateState.shamsherQuestStage === 0) {
      SoundEngine.spookyChime();
      this.cameras.main.pan(1540, 460, 800, 'Sine.easeInOut');
      UI.startDialogue([
        {
          speaker: 'Prof. Shamsher',
          portrait: '📻',
          text: 'Shamsher... Shamsher... come into the dark thicket... yes mother, I am coming... (Prof. Shamsher stands rigid like a mannequin, his eyes glazed in a hypnotic stupor as his radio scanner crackles violently.)'
        },
        {
          speaker: 'Moon Walker',
          portrait: '🌙',
          text: 'Professor Shamsher! Snap out of it! That’s the Nishi—the Night Caller! Don’t answer its call!'
        },
        {
          speaker: 'Totoro',
          portrait: '🐾',
          text: 'Not on my watch! (Totoro inflates his chest to massive proportions, planting his claws into the soil...)'
        },
        {
          speaker: 'Totoro',
          portrait: '🦁',
          text: 'ROOOOOOOAAAAAAR! (A titanic Spirit Roar detonates through the ruins, shattering the disembodied Nishi frequencies into glowing emerald sparks!)',
          choices: [
            {
              label: '💥 Unleash Totoro’s Spirit Shockwave!',
              onPick: () => {
                SoundEngine.totoroRoar();
                this.cameras.main.shake(500, 0.02);
                this.cameras.main.flash(500, 244, 63, 94);
              },
              nextNodes: [
                {
                  speaker: 'Prof. Shamsher',
                  portrait: '👓',
                  text: 'Gasp! Cough! My spectacles! Great Scott! The Nishi frequency... shattered by pure acoustic resonant power!'
                },
                {
                  speaker: 'Prof. Shamsher',
                  portrait: '📜',
                  text: 'You two saved my mind! I am Prof. Shamsher from Dhaka University’s Department of Folklore. Take my handwritten Occult Field Tome—it records the ancient secrets of the spirit realm!',
                  choices: [
                    {
                      label: '📜 Receive Prof. Shamsher’s Occult Field Tome (+ Keepsake)',
                      onPick: () => {
                        DateState.shamsherQuestStage = 1;
                        DateState.sideQuests.sq_shamsher_nishi = true;
                        SoundEngine.itemFanfare();
                        UI.giveItem('occult_talisman', 'Received Prof. Shamsher’s Occult Field Tome!');
                        UI.showToast('📜', 'Nishi Banished!', 'Hypnotic trance broken! Tome acquired.');
                      },
                      nextNodes: [
                        {
                          speaker: 'Prof. Shamsher',
                          portrait: '✨',
                          text: 'Now that Ananya, Kofil Chacha, and I have found clarity, the ancient Spirit Altar in the central grove can be awakened! Head to the altar, children of light!'
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]);
    } else {
      SoundEngine.spookyChime();
      UI.startDialogue([
        {
          speaker: 'Prof. Shamsher',
          portrait: '👓',
          text: 'Fascinating! My EMF scanner is picking up pure harmonious aura waves now. Totoro’s roar was pure genius!'
        }
      ]);
    }
  }

  interactSpiritAltar() {
    SoundEngine.spookyChime();
    const aidedCount = (DateState.ananyaQuestStage >= 1 ? 1 : 0) +
                       (DateState.kofilQuestStage >= 1 ? 1 : 0) +
                       (DateState.shamsherQuestStage >= 1 ? 1 : 0);

    if (DateState.forestSeanceComplete) {
      SoundEngine.bellToll();
      UI.startDialogue([
        {
          speaker: 'Ancient Spirit Altar',
          portrait: '🕯️',
          text: 'The sacred runes glow with eternal tranquil emerald fire. The three pacified souls of Dhaka’s past watch over you across all Six Realms.'
        }
      ]);
      return;
    }

    if (aidedCount < 3) {
      UI.startDialogue([
        {
          speaker: 'Ancient Spirit Altar',
          portrait: '🕯️',
          text: `Ancient weathered runes flicker dimly on the mossy stone pedestal (${aidedCount}/3 Spirits Pacified).`
        },
        {
          speaker: 'Totoro',
          portrait: '🐾',
          text: aidedCount === 0
            ? 'Three restless apparitions still wander the grove: the weeping ghost under the North banyan, the rickshawalla in the Southwest marsh, and the professor near the Northeast ruins.'
            : `We have aided ${aidedCount} spirit${aidedCount > 1 ? 's' : ''}! Let us comfort the remaining wanderer${3 - aidedCount > 1 ? 's' : ''} to awaken the sacred seance!`
        }
      ]);
      return;
    }

    // Grand Seance Cutscene: All 3 Spirits Gather
    SoundEngine.bellToll();
    this.cameras.main.pan(1150, 640, 1000, 'Sine.easeInOut');
    this.cameras.main.flash(700, 168, 85, 247);
    UI.startDialogue([
      {
        speaker: 'Ancient Spirit Altar',
        portrait: '🕯️',
        text: '(The incense hearth ignites into radiant violet and emerald flames! The silver lantern, brass rickshaw bell, and occult tome resonate in harmonic unison!)'
      },
      {
        speaker: 'Ananya (Pacified Spirit)',
        portrait: '🏮',
        text: 'From the tearful fog of Curzon Hall, we bring our blessing of eternal remembrance...'
      },
      {
        speaker: 'Kofil Chacha',
        portrait: '🔔',
        text: 'From the flooded alleys of Old Dhaka, we bring the unyielding spirit of resilience and protection!'
      },
      {
        speaker: 'Prof. Shamsher',
        portrait: '📜',
        text: 'And from the scholarly halls of knowledge, we dispel all darkness and dread!'
      },
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'Look, Moon Walker! Their harmonious memories are fusing into a radiant talisman above the altar!'
      },
      {
        speaker: 'Moon Walker',
        portrait: '🌙',
        text: 'The Aparthib Forest Cleansing Charm... Forged from Dhaka’s history and love.',
        choices: [
          {
            label: '🧿 Claim the Aparthib Forest Cleansing Charm (+14 ATK, +14 DEF)',
            onPick: () => {
              DateState.forestSeanceComplete = true;
              DateState.hp = DateState.maxHp;
              DateState.sp = DateState.maxSp;
              SoundEngine.itemFanfare();
              UI.giveItem('forest_cleansing_charm', 'Forged the Aparthib Forest Cleansing Charm!');
              UI.updateRPGStats();
              UI.showToast('🧿', 'Grand Seance Complete!', 'The Forest Spirits blessed you! (+14 ATK, +14 DEF, Fully Healed)');
              this.cameras.main.flash(800, 52, 211, 153);
            },
            nextNodes: [
              {
                speaker: 'Elder Banyan Sage',
                portrait: '🌿',
                text: 'Glorious! The Whispering Emerald Forest hasn’t breathed this peacefully in three hundred years. Go forth, heroes of Dhaka, and claim victory over the Sylvan Briar Stag!'
              }
            ]
          }
        ]
      }
    ]);
  }

  /* ===== Grand Dhaka Rickshaw Tour — "Tring-Tring Rush" =====
     Goats, cats and cows wander onto the road: ring the bell (SPACE / E / tap) while they are in the
     sweet spot to clear the way. Snap a photo at every stop, chase the sunset, then get a scored report. */
  interactRickshawTour() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Moon Walker', portrait: '🌙', text: 'I should get Totoro from Curzon Hall before taking the Grand Dhaka Rickshaw Tour!' }]);
      return;
    }
    SoundEngine.rickshawBell();
    UI.startDialogue([
      { speaker: 'Totoro', portrait: '🐾', text: 'Tring-Tring! Ready for our Grand Hood-Down Rickshaw Tour across Dhaka? We will cruise past Fuller Road Fountain, TSC, Aparajeyo Bangla, and down to Dhanmondi Lake!' },
      { speaker: 'Totoro', portrait: '🐾', text: 'Dhaka traffic is full of surprises: goats, cats and cows will wander onto the road. Ring the bell with SPACE (or tap the screen) when they are close to clear a path. Perfect timing earns bonus points!' }
    ], () => this.startRickshawTour());
  }

  startRickshawTour() {
    const rs = this.rickshawSprite;
    if (!rs || !rs.active || !this.player || !this.totoro) return;
    this.cutsceneLocked = true;
    const home = { x: rs.x, y: rs.y };
    const legs = [
      { x: 1060, y: 820,  msg: 'Cruising past Fuller Road Fountain... Dhaka traffic is the best excuse to sit a little closer.' },
      { x: 480,  y: 820,  msg: 'Turning up the University avenue under the Krishnachura canopy...' },
      { x: 480,  y: 320,  msg: 'Passing TSC and Aparajeyo Bangla! Hear the acoustic guitars in the evening air?' },
      { x: 1520, y: 320,  msg: 'Gliding past Nilkhet and Ramna toward the eastern promenade...' },
      { x: 1520, y: 1295, msg: 'Arrived at Dhanmondi Lake Pier! Look at the telescope and lanterns waiting on the water.' }
    ];
    let totalLen = 0, cx = home.x, cy = home.y;
    legs.forEach(l => { totalLen += Math.hypot(l.x - cx, l.y - cy); cx = l.x; cy = l.y; });

    const entry = this.interactables.find(i => i.sprite === rs);
    if (entry && entry.badge) entry.badge.setVisible(false);          // the name badge must not stay behind at the stand
    const ov = this.ambientOverlay;

    const R: any = this.rickTour = {
      active: true, x: home.x, y: home.y, px: home.x, py: home.y, heading: 1, dir: { x: -1, y: 0 },
      speed: 0, t: 0, leg: null, legStart: 0, travelled: 0, totalLen,
      score: 0, combo: 0, bestCombo: 0, cleared: 0, perfects: 0, bonks: 0, photos: 0, total: 0,
      jolt: 0, bellReadyAt: 0, nextDust: 0, nextLine: 0, nextScan: 0,
      obstacles: [], waved: new Set(), entry,
      ambient: ov && ov.active ? { col: ov.fillColor, a: ov.fillAlpha } : null
    };

    // Same artwork, second sprite: only the lower body panel is redrawn above the riders so they sit INSIDE the rickshaw
    R.over = this.add.sprite(home.x, home.y, rs.texture.key).setOrigin(0.5, 1);
    if (R.over.setCrop) R.over.setCrop(0, Math.round(rs.height * 0.47), rs.width, Math.round(rs.height * 0.39));
    R.scoreTxt = this.add.text(home.x, home.y, '', {
      fontFamily: 'Press Start 2P', fontSize: '9px', color: '#fff8eb', stroke: '#2b1d14', strokeThickness: 4
    }).setOrigin(0.5, 1).setDepth(3200);
    R.prompt = this.add.text(home.x, home.y, '🔔 TRING!  SPACE / TAP', {
      fontFamily: 'Press Start 2P', fontSize: '10px', color: '#2b1d14', backgroundColor: '#f7cb45', padding: { x: 6, y: 4 }
    }).setOrigin(0.5, 1).setDepth(3200).setVisible(false);

    this.player.body.enable = false;                                   // riders are moved by hand, not by physics
    R.bellFn = () => this.ringRickshawBell();
    this.input.keyboard.on('keydown-SPACE', R.bellFn);
    this.input.keyboard.on('keydown-E', R.bellFn);
    this.input.on('pointerdown', R.bellFn);

    this.spawnDamageNumber(home.x, home.y - 130, '🔔 SPACE / TAP = bell!', '#ffe27a');
    SoundEngine.rickshawBell();

    const alive = () => this.rickTour === R && R.active && rs.active;
    let idx = 0;
    const runLeg = () => {
      if (!alive()) return;
      if (idx >= legs.length) { this.finishRickshawTour(R, home, legs[legs.length - 1]); return; }
      const wp = legs[idx++];
      const dx = wp.x - R.x, dy = wp.y - R.y, dist = Math.hypot(dx, dy) || 1;
      R.dir = { x: dx / dist, y: dy / dist };
      if (Math.abs(dx) > Math.abs(dy) * 0.5) R.heading = dx < 0 ? -1 : 1;     // face the way we are driving
      R.obstacles = R.obstacles.filter(o => !o.done);
      this.spawnRickshawObstacles(R, dist);
      R.leg = wp; R.legStart = this.time.now;
      SoundEngine.rickshawBell();
      this.tweens.add({
        targets: R, x: wp.x, y: wp.y, duration: Math.round(dist / 250 * 1000), ease: 'Sine.easeInOut',
        onComplete: () => {
          if (!alive()) return;
          R.leg = null;
          this.rickshawStopMoment(R);
          UI.startDialogue([{ speaker: 'Totoro (In the Rickshaw)', portrait: '🛺', text: wp.msg }], () => runLeg());
        }
      });
    };
    runLeg();
  }

  /* Road hazards appear on the stretch ahead of the rickshaw */
  spawnRickshawObstacles(R, dist) {
    const icons = ['🐐', '🐈', '🐄', '🐓', '🚲', '🐕'];
    (dist < 650 ? [0.55] : [0.4, 0.72]).forEach(f => {
      const ox = R.x + R.dir.x * dist * f, oy = R.y + R.dir.y * dist * f;
      const icon = icons[R.total % icons.length];
      R.total++;
      const sh = this.add.ellipse(ox, oy - 2, 30, 10, 0x000000, 0.25).setDepth(oy - 1);
      const sp = this.add.text(ox, oy, icon, { fontSize: '34px' }).setOrigin(0.5, 1).setDepth(oy).setScale(0);
      const mark = this.add.text(ox, oy - 46, '❗', { fontSize: '20px' }).setOrigin(0.5, 1).setDepth(oy + 2).setVisible(false);
      this.tweens.add({ targets: sp, scale: 1, duration: 260, ease: 'Back.easeOut' });
      R.obstacles.push({ sp, sh, mark, x: ox, y: oy, ahead: 9999, done: false });
    });
  }

  ringRickshawBell() {
    const R: any = this.rickTour;
    if (!R || !R.active || !R.leg || UI.isOpen()) return;
    const now = this.time.now;
    if (now - R.legStart < 350 || now < R.bellReadyAt) return;        // ignores the key-press that closed the dialogue
    R.bellReadyAt = now + 240;
    SoundEngine.rickshawBell();
    const ring = this.add.circle(R.x, R.y - 70, 14, 0xf7cb45, 0).setStrokeStyle(3, 0xf7cb45, 0.9).setDepth(3150);
    this.tweens.add({ targets: ring, scale: 4.5, alpha: 0, duration: 420, onComplete: () => ring.destroy() });
    this.wanderers.forEach(w => {                                      // pedestrians hop out of the way
      if (w.sprite && w.sprite.active && Math.hypot(w.x - R.x, w.y - R.y) < 170) {
        this.tweens.add({ targets: w.sprite, y: w.sprite.y - 9, duration: 120, yoyo: true });
      }
    });
    let target = null, best = 1e9;
    let nearby = false;
    R.obstacles.forEach(o => {
      if (o.done) return;
      if (o.ahead < 330 && o.ahead > 0) nearby = true;
      if (o.ahead >= 40 && o.ahead <= 200 && o.ahead < best) { best = o.ahead; target = o; }
    });
    if (target) {
      this.rickshawClearObstacle(R, target, target.ahead >= 80 && target.ahead <= 150);
    } else if (nearby) {                                               // mistimed ring: the bell jams for a moment
      R.combo = 0;
      R.bellReadyAt = now + 1000;
      this.spawnDamageNumber(R.x, R.y - 104, 'Mistimed! 🔔', '#ffb3b3');
    }
  }

  rickshawClearObstacle(R, o, perfect) {
    o.done = true;
    if (o.mark) o.mark.destroy();
    const base = perfect ? 20 : 10;
    const gain = Math.round(base * (1 + Math.min(R.combo, 5) * 0.25));
    R.score += gain; R.combo++; R.cleared++;
    if (perfect) R.perfects++;
    R.bestCombo = Math.max(R.bestCombo, R.combo);
    const side = Math.random() < 0.5 ? -1 : 1, lx = -R.dir.y * side, ly = R.dir.x * side;
    this.tweens.add({ targets: o.sp, x: o.x + lx * 80, y: o.y + ly * 80 - 14, angle: 360 * side, alpha: 0, duration: 520, ease: 'Quad.easeOut', onComplete: () => o.sp.destroy() });
    this.tweens.add({ targets: o.sh, x: o.x + lx * 80, y: o.y + ly * 80, alpha: 0, duration: 520, ease: 'Quad.easeOut', onComplete: () => o.sh.destroy() });
    this.spawnDamageNumber(R.x, R.y - 104, `${perfect ? 'PERFECT!' : 'NICE!'} +${gain}${R.combo >= 3 ? '  x' + R.combo : ''}`, perfect ? '#ffe27a' : '#9be7ff');
    if (perfect) {
      SoundEngine.heartUp();
      for (let i = 0; i < 4; i++) {
        const hx = R.x + (i - 1.5) * 20, h = this.add.text(hx, R.y - 80, '💖', { fontSize: '16px' }).setOrigin(0.5).setDepth(3150);
        this.tweens.add({ targets: h, y: h.y - 46 - i * 6, alpha: 0, duration: 750, delay: i * 60, onComplete: () => h.destroy() });
      }
    } else {
      SoundEngine.select();
    }
  }

  rickshawBonk(R, o) {
    o.done = true;
    if (o.mark) o.mark.destroy();
    R.combo = 0; R.bonks++; R.jolt = 1;
    this.cameras.main.shake(140, 0.005);
    SoundEngine.blip(150, 'square');
    const side = Math.random() < 0.5 ? -1 : 1, lx = -R.dir.y * side, ly = R.dir.x * side;
    this.tweens.add({ targets: o.sp, x: o.x + lx * 110, y: o.y + ly * 110 - 30, angle: 720 * side, alpha: 0, duration: 600, ease: 'Quad.easeOut', onComplete: () => o.sp.destroy() });
    this.tweens.add({ targets: o.sh, x: o.x + lx * 110, y: o.y + ly * 110, alpha: 0, duration: 600, ease: 'Quad.easeOut', onComplete: () => o.sh.destroy() });
    this.spawnDamageNumber(R.x, R.y - 104, 'BONK! 😵', '#ff7b7b');
    const quips = ['Mind the goat!', 'Hold on tight!', 'Ouch, Dhaka traffic!', 'Tring sooner next time!'];
    this.spawnDamageNumber(this.totoro.x, this.totoro.y - 100, quips[R.bonks % quips.length], '#ffffff');
  }

  /* Every landmark stop: camera flash + shutter, stray hazards fade away */
  rickshawStopMoment(R) {
    this.cameras.main.flash(200, 255, 244, 214);
    SoundEngine.cameraShutter();
    R.photos++;
    this.spawnDamageNumber(R.x, R.y - 120, '📸 Snap!', '#ffffff');
    R.obstacles.forEach(o => {
      if (o.done) return;
      o.done = true;
      if (o.mark) o.mark.destroy();
      this.tweens.add({ targets: [o.sp, o.sh], alpha: 0, duration: 200, onComplete: () => { o.sp.destroy(); o.sh.destroy(); } });
    });
  }

  updateRickshawTour(time, delta) {
    const R: any = this.rickTour, rs: any = this.rickshawSprite;
    if (!R || !R.active || !rs || !rs.active || !R.over || !R.over.active) return;
    const dt = Math.min(delta, 50) / 1000;
    if (dt <= 0) return;
    R.t += dt;
    const moved = Math.hypot(R.x - R.px, R.y - R.py);
    R.px = R.x; R.py = R.y;
    R.travelled += moved;
    R.speed += (moved / dt - R.speed) * Math.min(1, dt * 8);
    const sn = Math.min(1, R.speed / 360);

    // pose: bumpy road, lean back when speeding, jolt on a bonk
    const h = R.heading, flip = h < 0;
    R.jolt = Math.max(0, R.jolt - dt * 2.8);
    const shx = (Math.random() - 0.5) * 6 * R.jolt, shy = (Math.random() - 0.5) * 4 * R.jolt;
    const bob = (Math.sin(R.t * 24) * 1.1 - Math.abs(Math.sin(R.t * 5.3)) * 1.8) * sn;
    const lean = -0.04 * h * sn + Math.sin(R.t * 2.6) * 0.008 + 0.09 * R.jolt * h;
    const cs = Math.cos(lean), sl = Math.sin(lean);
    const bx = R.x + shx, by = R.y + bob + shy;
    const rel = (rx, ry) => ({ x: bx + rx * h * cs - ry * sl, y: by + rx * h * sl + ry * cs });
    rs.setPosition(bx, by).setRotation(lean).setFlipX(flip).setDepth(by);
    R.over.setPosition(bx, by).setRotation(lean).setFlipX(flip).setDepth(by + 2);
    const ps = rel(-18, -20), ts = rel(4, -14);
    this.player.setPosition(ps.x, ps.y).setDepth(by + 0.5).setFlipX(flip).setTexture('player-0');
    this.totoro.setPosition(ts.x, ts.y).setDepth(by + 1).setFlipX(flip).setTexture(`totoro-${Math.floor(time / (R.speed > 30 ? 160 : 420)) % 2}`);
    if (this.totoroBadge) this.totoroBadge.setPosition(ts.x, ts.y - 80);

    // dust puffs from the rear wheel + speed lines
    if (R.speed > 70 && time > R.nextDust) {
      R.nextDust = time + 85;
      const w = rel(-21, 0);
      const puff = this.add.circle(w.x, w.y - 2, 4 + Math.random() * 2, 0xd8c7a0, 0.5).setDepth(by - 1);
      this.tweens.add({ targets: puff, x: puff.x - R.dir.x * 18, y: puff.y - R.dir.y * 18 - 8, scale: 2.4, alpha: 0, duration: 520, onComplete: () => puff.destroy() });
    }
    if (R.speed > 300 && time > R.nextLine) {
      R.nextLine = time + 70;
      const horiz = Math.abs(R.dir.x) > Math.abs(R.dir.y), off = (Math.random() - 0.5) * 70;
      const lx = bx - R.dir.x * 70 + (horiz ? 0 : off), ly = by - 30 - R.dir.y * 70 + (horiz ? off * 0.5 : 0);
      const ln = this.add.rectangle(lx, ly, horiz ? 30 : 2, horiz ? 2 : 30, 0xffffff, 0.5).setDepth(by + 3);
      this.tweens.add({ targets: ln, x: lx - R.dir.x * 40, y: ly - R.dir.y * 40, alpha: 0, duration: 260, onComplete: () => ln.destroy() });
    }

    // hazards: warning marks, bell prompt, bonk if we reach one
    let inWindow = false;
    R.obstacles.forEach(o => {
      if (o.done) return;
      o.ahead = (o.x - R.x) * R.dir.x + (o.y - R.y) * R.dir.y;
      o.mark.setVisible(o.ahead < 330 && o.ahead > 0).setScale(1 + 0.15 * Math.sin(R.t * 12));
      if (o.ahead >= 40 && o.ahead <= 200) inWindow = true;
      if (R.leg && o.ahead < 22) this.rickshawBonk(R, o);
    });
    R.prompt.setVisible(inWindow).setPosition(bx, by - 150).setScale(1 + 0.06 * Math.sin(R.t * 14));
    R.scoreTxt.setText(`★ ${R.score}${R.combo >= 2 ? '   COMBO x' + R.combo : ''}`).setPosition(bx, by - 128);

    // pedestrians cheer as we roll past
    if (time > R.nextScan) {
      R.nextScan = time + 250;
      const cheers = ['👋', '😄', '🎶', '📸', '😲'];
      this.wanderers.forEach(w => {
        if (!w.sprite || !w.sprite.active || R.waved.has(w) || Math.hypot(w.x - R.x, w.y - R.y) > 140) return;
        R.waved.add(w);
        const e = this.add.text(w.x, w.y - 64, cheers[R.waved.size % cheers.length], { fontSize: '22px' }).setOrigin(0.5, 1).setDepth(3100);
        this.tweens.add({ targets: e, y: e.y - 28, alpha: 0, duration: 900, onComplete: () => e.destroy() });
      });
    }

    // chase the sunset: golden hour -> rose dusk -> lavender at the lake
    if (R.ambient && this.ambientOverlay && this.ambientOverlay.active) {
      const lc = (c1, c2, t) => {
        const r = Math.round(((c1 >> 16) & 255) + (((c2 >> 16) & 255) - ((c1 >> 16) & 255)) * t);
        const g = Math.round(((c1 >> 8) & 255) + (((c2 >> 8) & 255) - ((c1 >> 8) & 255)) * t);
        const b = Math.round((c1 & 255) + ((c2 & 255) - (c1 & 255)) * t);
        return (r << 16) | (g << 8) | b;
      };
      const p = Math.min(1, R.travelled / R.totalLen);
      const t1 = Math.min(1, p / 0.6), t2 = Math.max(0, (p - 0.6) / 0.4);
      this.ambientOverlay.setFillStyle(p < 0.6 ? lc(0xf7b050, 0xe0607a, t1) : lc(0xe0607a, 0x6a4a9a, t2), p < 0.6 ? 0.03 + 0.14 * t1 : 0.17 + 0.07 * t2);
    }
  }

  finishRickshawTour(R, home, lastStop) {
    const rs = this.rickshawSprite;
    R.active = false;
    this.input.keyboard.off('keydown-SPACE', R.bellFn);
    this.input.keyboard.off('keydown-E', R.bellFn);
    this.input.off('pointerdown', R.bellFn);
    [R.over, R.scoreTxt, R.prompt].forEach(o => { if (o && o.active) o.destroy(); });
    R.obstacles.forEach(o => [o.sp, o.sh, o.mark].forEach(x => { if (x && x.active) x.destroy(); }));
    if (R.entry && R.entry.badge && R.entry.badge.active) R.entry.badge.setVisible(true);
    if (R.ambient && this.ambientOverlay && this.ambientOverlay.active) this.ambientOverlay.setFillStyle(R.ambient.col, R.ambient.a);

    SoundEngine.rickshawBell();
    rs.setPosition(home.x, home.y).setRotation(0).setFlipX(false).setDepth(home.y);
    this.player.setFlipX(false).setPosition(lastStop.x, lastStop.y).setDepth(lastStop.y);
    this.player.body.enable = true;
    this.player.body.reset(lastStop.x, lastStop.y);
    this.totoro.setFlipX(false).setPosition(lastStop.x - 38, lastStop.y).setDepth(lastStop.y);
    if (this.totoroBadge) this.totoroBadge.setPosition(this.totoro.x, this.totoro.y - 68);
    this.trail = Array(16).fill({ x: this.player.x, y: this.player.y });
    this.rickTour = null;
    this.cutsceneLocked = false;

    if (!DateState.rickshawTourDone) {
      DateState.rickshawTourDone = true;
      DateState.memories.push({ emoji: '🛺', title: 'Grand Dhaka Rickshaw Tour', note: 'Cruised hood-down from Fuller Road to TSC and Dhanmondi Lake.' });
      this.advanceDateProgress();
    }

    // scored report + rank + reward (rewards only when you beat your best score)
    const ratio = R.total ? R.cleared / R.total : 0;
    const rank = (ratio >= 0.9 && R.bonks === 0 && R.perfects >= Math.ceil(R.total * 0.5)) ? { l: 'S', t: 'Dhaka Rickshaw Legend 🏆', item: 'doi', xp: 60 }
      : ratio >= 0.7 ? { l: 'A', t: 'Tring-Tring Pro 🔔', item: 'fuchka', xp: 40 }
      : ratio >= 0.45 ? { l: 'B', t: 'Street-Smart Rider 🛺', item: 'cha', xp: 25 }
      : { l: 'C', t: 'Cheerful Tourist 🌸', item: null, xp: 10 };
    const prevBest = DateState.rickshawBest || 0;
    let rewardLine;
    if (R.score > prevBest) {
      DateState.rickshawBest = R.score;
      RPGStats.gainXP(rank.xp);
      if (rank.item) UI.giveItem(rank.item);
      rewardLine = `New best score! +${rank.xp} XP${rank.item ? ' and a ' + ITEMS_DB[rank.item].name : ''}.`;
    } else {
      rewardLine = prevBest ? `Your best is ${prevBest}. Beat it to earn another treat!` : 'Ring the bell on your next ride to earn treats!';
    }
    UI.startDialogue([
      { speaker: 'Totoro', portrait: '🐾', text: `Tour report: ${R.cleared}/${R.total} road hazards cleared (${R.perfects} perfect bells), best combo x${R.bestCombo}, ${R.photos} photos snapped. Final score: ${R.score}!` },
      { speaker: 'Totoro', portrait: '🐾', text: `Rank ${rank.l}: ${rank.t}. ${rewardLine}` },
      { speaker: 'Totoro', portrait: '🐾', text: 'That rickshaw tour was magical. Look out onto the wooden pier to the right: my Brass Stargazing Telescope is set up right by the water!' }
    ]);
  }

  interactStargazingTelescope() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Moon Walker', portrait: '🌙', text: 'A brass telescope pointed at the night sky! I should bring Totoro here.' }]);
      return;
    }

    UI.startDialogue([
      { speaker: 'Totoro', portrait: '🐾', text: 'Step up to the eyepiece, Moon Walker! Even when the Dhaka haze tries to hide the night sky, let us connect the constellations together.' }
    ], () => {
      this.launchConstellationCutscene();
    });
  }

  launchConstellationCutscene() {
    this.cutsceneLocked = true;
    SoundEngine.starChime();

    let skyModal = document.getElementById('stargaze-cutscene-modal');
    if (skyModal) skyModal.remove();

    skyModal = document.createElement('div');
    skyModal.id = 'stargaze-cutscene-modal';
    skyModal.style.cssText = `
      position:fixed;inset:0;z-index:55;background:radial-gradient(circle at 50% 35%, #1b2242 0%, #0b0d1c 75%);
      display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:22px;color:#fdf5e6;
      font-family:'Outfit',sans-serif;animation:popUp 0.35s ease-out;
    `;

    skyModal.innerHTML = `
      <div style="text-align:center;max-width:680px;">
        <p style="margin:0;font-family:'Press Start 2P',monospace;font-size:0.6rem;color:#f7cb45;letter-spacing:0.12em;">★ DHANMONDI LAKE OBSERVATORY CUTSCENE ★</p>
        <h2 style="margin:8px 0 4px;font-size:1.55rem;">Click Each Glowing Constellation in the Dhaka Sky</h2>
        <p id="sky-sub-status" style="margin:0;font-size:0.95rem;color:#c9d6ea;">Totoro is standing right behind you, guiding the brass telescope...</p>
      </div>

      <div style="position:relative;width:100%;max-width:820px;aspect-ratio:16/9;border:3px solid #f0b942;border-radius:16px;overflow:hidden;box-shadow:0 0 45px rgba(244,169,192,0.28);background:#090b16;">
        <svg id="cutscene-sky-svg" viewBox="0 0 800 450" style="width:100%;height:100%;display:block;">
          <g id="cutscene-bg-stars"></g>
          <g class="sky-const-node" data-id="0" style="cursor:pointer;">
            <polygon id="c-line-0" points="140,130 165,105 205,105 230,130 205,155 165,155" fill="rgba(247,203,69,0.06)" stroke="#f7cb45" stroke-width="2" stroke-dasharray="5 4" opacity="0.35"/>
            <circle cx="140" cy="130" r="5" fill="#fff"/><circle cx="165" cy="105" r="4.5" fill="#fff"/>
            <circle cx="205" cy="105" r="5" fill="#fff"/><circle cx="230" cy="130" r="4.5" fill="#fff"/>
            <circle cx="205" cy="155" r="4.5" fill="#fff"/><circle cx="165" cy="155" r="5" fill="#fff"/>
            <text x="185" y="182" text-anchor="middle" fill="#f7cb45" font-size="13" font-weight="bold">1. Fuchka Minor 🥙 (Click)</text>
          </g>
          <g class="sky-const-node" data-id="1" style="cursor:pointer;">
            <polyline id="c-line-1" points="555,145 555,98 595,84 620,118 650,145 555,145" fill="rgba(127,212,230,0.06)" stroke="#7fd4e6" stroke-width="2" stroke-dasharray="5 4" opacity="0.35"/>
            <circle cx="555" cy="145" r="5" fill="#fff"/><circle cx="555" cy="98" r="4.5" fill="#fff"/>
            <circle cx="595" cy="84" r="5.5" fill="#fff"/><circle cx="620" cy="118" r="4.5" fill="#fff"/>
            <circle cx="650" cy="145" r="5" fill="#fff"/>
            <text x="602" y="176" text-anchor="middle" fill="#7fd4e6" font-size="13" font-weight="bold">2. Rickshaw Major 🛺 (Click)</text>
          </g>
          <g class="sky-const-node" data-id="2" style="cursor:pointer;">
            <path id="c-line-2" d="M185,285 Q235,230 285,285 Z" fill="rgba(244,169,192,0.08)" stroke="#f4a9c0" stroke-width="2" stroke-dasharray="5 4" opacity="0.35"/>
            <line x1="235" y1="255" x2="235" y2="320" stroke="#f4a9c0" stroke-width="2"/>
            <circle cx="185" cy="285" r="5" fill="#fff"/><circle cx="235" cy="255" r="5.5" fill="#fff"/>
            <circle cx="285" cy="285" r="5" fill="#fff"/><circle cx="235" cy="320" r="4.5" fill="#f4a9c0"/>
            <text x="235" y="346" text-anchor="middle" fill="#f4a9c0" font-size="13" font-weight="bold">3. Totoro's Umbrella ☂️ (Click)</text>
          </g>
          <g class="sky-const-node" data-id="3" style="cursor:pointer;">
            <path id="c-line-3" d="M490 285 C445 250 452 210 476 214 C486 216 490 226 490 232 C490 226 494 216 504 214 C528 210 535 250 490 285Z" fill="rgba(255,158,187,0.18)" stroke="#ff9ebb" stroke-width="2.5" opacity="0.4"/>
            <circle cx="490" cy="214" r="6" fill="#fff"/><circle cx="456" cy="236" r="5" fill="#ffd6e4"/>
            <circle cx="524" cy="236" r="5" fill="#ffd6e4"/><circle cx="490" cy="285" r="6" fill="#fff"/>
            <circle cx="490" cy="248" r="7.5" fill="#fffdf0"/>
            <text x="490" y="315" text-anchor="middle" fill="#fff3a1" font-size="14" font-weight="bold">★ 4. ALPHA MOON WALKER 🌙 (Click) ★</text>
          </g>
          <path d="M0 450 L0 398 L800 398 L800 450 Z" fill="#05060d"/>
          <ellipse cx="382" cy="396" rx="18" ry="24" fill="#1c223d"/>
          <ellipse cx="418" cy="392" rx="24" ry="30" fill="#2b3259"/>
          <text x="400" y="432" text-anchor="middle" fill="#a8b8d8" font-size="12">Moon Walker &amp; Totoro gazing up from Dhanmondi Lake Pier</text>
        </svg>
      </div>

      <div style="background:#fdf5e6;color:#2b1d14;border:3px solid #4a2e1b;border-radius:10px;padding:12px 18px;max-width:760px;width:100%;display:flex;justify-content:space-between;align-items:center;gap:14px;">
        <p id="sky-dialogue-line" style="margin:0;font-family:'VT323',monospace;font-size:1.45rem;">🐾 Totoro: "Tap any of the 4 star clusters above to connect the lines!"</p>
        <button id="btn-close-stargaze" type="button" style="padding:8px 16px;background:#d45779;color:#fff;border:2px solid #4a2e1b;border-radius:8px;font-weight:700;cursor:pointer;white-space:nowrap;">Finish Stargazing ✨</button>
      </div>
    `;

    document.body.appendChild(skyModal);

    const bgGroup = skyModal.querySelector('#cutscene-bg-stars');
    let shtml = '';
    for (let i = 0; i < 95; i++) {
      const sx = (i * 89) % 800, sy = (i * 53) % 385, r = (i % 3 === 0) ? 1.8 : 1.1;
      shtml += `<circle cx="${sx}" cy="${sy}" r="${r}" fill="#ffffff" opacity="${(0.3 + (i % 5) * 0.12).toFixed(2)}"/>`;
    }
    bgGroup.innerHTML = shtml;

    const LORE = [
      '🐾 Totoro: "Fuchka Minor! Six crispy stars aligned in extra-tamarind harmony over Dhaka University."',
      '🐾 Totoro: "Rickshaw Major! Known for moving at 4 km/h through traffic so we have an excuse to sit closer."',
      '🐾 Totoro: "Umbrella Borealis! Five shelter stars that keep the monsoon rain out and all the warmth in."',
      '🐾 Totoro: "Alpha Moon Walker! Even when Dhaka smog hides every other star, you are still the brightest in my sky."'
    ];

    const foundSet = new Set();
    skyModal.querySelectorAll('.sky-const-node').forEach(node => {
      node.addEventListener('click', () => {
        const id = Number((node as any).dataset.id);
        foundSet.add(id);
        SoundEngine.starChime();
        const shape = skyModal.querySelector(`#c-line-${id}`);
        if (shape) {
          shape.setAttribute('opacity', '1');
          shape.removeAttribute('stroke-dasharray');
        }
        skyModal.querySelector('#sky-dialogue-line').textContent = LORE[id];
        skyModal.querySelector('#sky-sub-status').textContent = `Constellations Connected: ${foundSet.size} / 4`;
      });
    });

    skyModal.querySelector('#btn-close-stargaze').addEventListener('click', () => {
      SoundEngine.select();
      skyModal.remove();
      this.cutsceneLocked = false;
      if (foundSet.size >= 4) {
        if (!DateState.stargazingDone) {
          DateState.stargazingDone = true;
          UI.giveItem('starlight', 'Spotted all 4 constellations in the Dhaka night sky.');
          this.advanceDateProgress();
        }
        UI.startDialogue([
          { speaker: 'Totoro', portrait: '🐾', text: 'Now that we have mapped the stars... look right at the tip of the pier. Our lantern rowboat is ready for the final chapter of our date.' }
        ]);
      } else {
        UI.startDialogue([
          { speaker: 'Totoro', portrait: '🐾', text: `You stepped away from the brass lens! We connected ${foundSet.size} of 4 constellations. Let us spot all 4 in the Dhaka night sky before we board the lake rowboat!` }
        ]);
      }
    });
  }

  /* ===== Lantern Rowboat (Dhanmondi Lake): layered hull, animated oars, lantern glow, ripples & wake ===== */
  createLakeBoat(x, y) {
    const B: any = this.lakeBoat = {
      x, y, homeX: x, homeY: y, heading: 1, touring: false,
      rowTarget: 0, rowAmt: 0, phase: 0, t: 0, nextRipple: 0, nextWake: 0, rollKick: 0
    };
    // lantern anchors in boat-local pixels from the hull centre (bow = +x)
    B.lanterns = [{ rx: -51, ry: -19 }, { rx: 63, ry: -19 }];
    B.shadow = this.add.ellipse(x, y + 26, 150, 28, 0x07233a, 0.34).setDepth(3.4);
    B.ring = this.add.ellipse(x, y + 24, 176, 58, 0xffffff, 0).setStrokeStyle(2, 0xcdeffa, 0.4).setDepth(3.5);
    B.refl = B.lanterns.map(() => this.add.ellipse(x, y + 58, 14, 34, 0xffb347, 0.18).setBlendMode(Phaser.BlendModes.ADD).setDepth(3.6));
    B.oarFar = this.add.sprite(x, y, 'prop-oar').setOrigin(0.17, 0.5).setDepth(4.2);
    this.boatSprite = this.add.sprite(x, y, 'prop-boat').setOrigin(0.5, 0.5).setDepth(4);
    B.front = this.add.sprite(x, y, 'prop-boat-front').setOrigin(0.5, 0.5);
    B.oarNear = this.add.sprite(x, y, 'prop-oar').setOrigin(0.17, 0.5);
    B.glows = B.lanterns.map(() => this.add.circle(x, y, 30, 0xffb347, 0.28).setBlendMode(Phaser.BlendModes.ADD).setDepth(4.6));
    B.cores = B.lanterns.map(() => this.add.circle(x, y, 8, 0xfff1b0, 0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(4.7));
    B.rope = this.add.graphics().setDepth(4.1);
    this.updateLakeBoat(0, 0);
    return this.boatSprite;
  }

  updateLakeBoat(time, delta) {
    const B: any = this.lakeBoat;
    if (!B || !this.boatSprite || !this.boatSprite.active) return;
    const dt = Math.min(delta, 50) / 1000, h = B.heading, flip = h < 0;
    B.t += dt;
    B.rowAmt += (B.rowTarget - B.rowAmt) * Math.min(1, dt * 4);
    B.phase += dt * (Math.PI * 2 / 1.5) * B.rowAmt;

    // gentle bob + roll (stronger while under way)
    const bob = Math.sin(B.t * 1.7) * (B.touring ? 1.7 : 1.1);
    const roll = Math.sin(B.t * 1.25 + 0.6) * (B.touring ? 0.024 : 0.012) + B.rollKick;
    const cs = Math.cos(roll), sn = Math.sin(roll);
    const bx = B.x, by = B.y + bob;
    const rel = (rx, ry) => ({ x: bx + rx * h * cs - ry * sn, y: by + rx * h * sn + ry * cs });

    this.boatSprite.setPosition(bx, by).setRotation(roll).setFlipX(flip);
    B.front.setPosition(bx, by).setRotation(roll).setFlipX(flip).setDepth(by + 26);
    B.shadow.setPosition(bx, B.y + 26);
    B.ring.setPosition(bx, B.y + 24).setScale(1 + Math.sin(B.t * 1.4) * 0.025, 1 + Math.sin(B.t * 1.4 + 1) * 0.04).setAlpha(0.7 + 0.3 * Math.sin(B.t * 2));

    // flickering lantern light + water reflections
    B.lanterns.forEach((l, i) => {
      const p = rel(l.rx, l.ry);
      const fl = 0.27 + Math.sin(B.t * 9 + i * 2.1) * 0.05 + Math.sin(B.t * 23 + i) * 0.03;
      B.glows[i].setPosition(p.x, p.y).setAlpha(fl).setScale(1 + Math.sin(B.t * 7 + i) * 0.04);
      B.cores[i].setPosition(p.x, p.y).setAlpha(fl + 0.2);
      B.refl[i].setPosition(p.x + Math.sin(B.t * 2.2 + i) * 3, by + 58).setAlpha(0.12 + (fl - 0.2)).setScale(1 + Math.sin(B.t * 3 + i) * 0.15, 1);
    });

    // oars: shipped at rest, a proper pull / recover stroke while rowing
    const pFar = rel(-12, -21), pNear = rel(-12, 20);
    const s = Math.sin(B.phase), wet = Math.max(0, Math.min(1, -Math.cos(B.phase) * 1.4)), ra = B.rowAmt;
    let aFar = -100 + (30 * s + 10) * ra, aNear = 100 - (30 * s + 10) * ra;
    if (flip) { aFar = 180 - aFar; aNear = 180 - aNear; }
    const sy = 1 - (1 - (0.75 + 0.25 * wet)) * ra;
    B.oarFar.setPosition(pFar.x, pFar.y).setAngle(aFar).setScale(1, sy).setFlipY(flip).setDepth(4.2);
    B.oarNear.setPosition(pNear.x, pNear.y).setAngle(aNear).setScale(1, sy).setFlipY(flip).setDepth(by + 27);

    if (ra > 0.35 && wet > 0.55 && time > B.nextRipple) {          // blade dips -> ripples
      B.nextRipple = time + 360;
      ([[pFar, aFar], [pNear, aNear]] as any[]).forEach(([p, a]: any[]) => {
        const r = Number(a) * Math.PI / 180;
        this.spawnWaterRipple(Number((p as any).x) + Math.cos(r) * 52, Number((p as any).y) + Math.sin(r) * 52, 18, 0);
      });
    }
    if (B.touring && ra > 0.3 && time > B.nextWake) {               // foamy wake behind the stern
      B.nextWake = time + 170;
      const st = rel(-70, 26);
      this.spawnWaterRipple(st.x, st.y, 26, -h * 26);
    }

    // mooring rope to the pier cleat while docked
    B.rope.clear();
    if (!B.touring) {
      const st = rel(-66, 12), x0 = 1934, y0 = 1346;
      const cx = (x0 + st.x) / 2, cy = Math.max(y0, st.y) + 8;
      B.rope.lineStyle(2, 0xd9c08a, 1).beginPath().moveTo(x0, y0);
      for (let k = 1; k <= 10; k++) {
        const t = k / 10, u = 1 - t;
        B.rope.lineTo(u * u * x0 + 2 * u * t * cx + t * t * st.x, u * u * y0 + 2 * u * t * cy + t * t * st.y);
      }
      B.rope.strokePath();
      B.rope.fillStyle(0x3a2210, 1).fillCircle(x0, y0, 2.6);
    }

    // passengers ride inside the hull while touring (feet tucked behind the near gunwale)
    if (B.touring && this.player && this.totoro) {
      const ps = rel(-22, 24), ts = rel(24, 24);
      this.player.setPosition(ps.x, ps.y).setDepth(ps.y).setFlipX(flip).setTexture('player-0');
      this.totoro.setPosition(ts.x, ts.y).setDepth(ts.y).setFlipX(flip).setTexture(`totoro-${Math.floor(time / 450) % 2}`);
      if (this.totoroBadge) this.totoroBadge.setPosition(ts.x, ts.y - 66);
    }
  }

  spawnWaterRipple(x, y, w, driftX) {
    const e = this.add.ellipse(x, y, w, w * 0.38, 0xffffff, 0).setStrokeStyle(1.5, 0xe6f7ff, 0.6).setDepth(3.7);
    this.tweens.add({ targets: e, scaleX: 2.6, scaleY: 2.6, alpha: 0, x: x + (driftX || 0), duration: 800, ease: 'Sine.easeOut', onComplete: () => e.destroy() });
  }

  releaseSkyLanterns(B) {
    for (let i = 0; i < 7; i++) {
      this.time.delayedCall(i * 330, () => {
        if (this.lakeBoat !== B || !this.boatSprite || !this.boatSprite.active) return;
        const x = B.x + Phaser.Math.Between(-46, 46), y = B.y - 24 + Phaser.Math.Between(-8, 8);
        const lan = this.add.sprite(x, y, 'prop-skylantern').setDepth(2500);
        const glow = this.add.circle(x, y, 22, 0xffb347, 0.3).setBlendMode(Phaser.BlendModes.ADD).setDepth(2499);
        const dx = Phaser.Math.Between(-40, 60), dy = Phaser.Math.Between(190, 280);
        this.tweens.add({ targets: [lan, glow], x: `+=${dx}`, y: `-=${dy}`, duration: 3800, ease: 'Sine.easeOut' });
        this.tweens.add({ targets: [lan, glow], alpha: 0, delay: 2000, duration: 1800, onComplete: () => { lan.destroy(); glow.destroy(); } });
        this.spawnWaterRipple(x, B.y + 30, 20, 0);
      });
    }
  }

  runLakeBoatTour(onDone) {
    const B: any = this.lakeBoat;
    if (!B || !this.boatSprite || !this.boatSprite.active) { onDone(); return; }
    const alive = () => this.lakeBoat === B && this.boatSprite && this.boatSprite.active;
    this.cutsceneLocked = true;
    SoundEngine.waterSplash();
    const origPX = this.player.x, origPY = this.player.y;
    B.touring = true; B.heading = 1; B.rowTarget = 1; B.x = B.homeX; B.y = B.homeY;

    const leg = (x, y, duration, ease, next) => {
      if (!alive()) return;
      this.tweens.add({ targets: B, x, y, duration, ease, onComplete: () => { if (alive() && next) next(); } });
    };
    const finish = () => {
      B.touring = false; B.rowTarget = 0; B.heading = 1; B.x = B.homeX; B.y = B.homeY;
      SoundEngine.waterSplash();
      this.player.setPosition(origPX, origPY).setFlipX(false);
      this.totoro.setPosition(origPX - 38, origPY).setFlipX(false);
      if (this.totoroBadge) this.totoroBadge.setPosition(this.totoro.x, this.totoro.y - 66);
      this.cutsceneLocked = false;
      onDone();
    };

    // 1) cast off and row out from the pier  2) glide to open water  3) rest oars, release sky lanterns
    // 4) turn the boat around  5) row back and tie up
    leg(2150, 1424, 2300, 'Sine.easeInOut', () => {
      leg(2262, 1512, 2000, 'Sine.easeInOut', () => {
        B.rowTarget = 0;
        this.releaseSkyLanterns(B);
        UI.showToast('🏮', 'Lantern Release', 'Totoro lights a floating lantern for every place you visited together.');
        this.tweens.add({
          targets: B, x: B.x + 14, y: B.y + 6, duration: 3200, ease: 'Sine.easeInOut',
          onComplete: () => {
            if (!alive()) return;
            B.heading = -1; B.rowTarget = 1; B.rollKick = 0.12;
            this.tweens.add({ targets: B, rollKick: 0, duration: 900, ease: 'Sine.easeOut' });
            leg(2118, 1430, 2100, 'Sine.easeInOut', () => {
              leg(B.homeX, B.homeY, 1900, 'Sine.easeOut', finish);
            });
          }
        });
      });
    });
  }

  interactLakePier() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Moon Walker', portrait: '🌙', text: 'The lake pier is glowing... I cannot wait to bring Totoro here!' }]);
      return;
    }

    UI.startDialogue([
      { speaker: 'Totoro', portrait: '🐾', text: 'Look at how the lanterns reflect across Dhanmondi Lake, Moon Walker. Shall we take this wooden rowboat out onto the water?' }
    ], () => {
      this.runLakeBoatTour(() => {
        UI.startDialogue([
          {
            speaker: 'Totoro',
            portrait: '🐾',
            text: 'Slow ripples on the water, slower goodbyes. From Curzon Hall to TSC, putting Ahona and Apshora in their place, helping Ahona and Rakin reconcile, and stargazing on the pier...'
          },
          {
            speaker: 'Totoro',
            portrait: '🐾',
            text: 'The smog hides the stars over Dhaka, yet you are still the brightest thing in my entire sky. After all this... do you love me? 🥺',
            choices: [
              {
                label: 'Duh, 100% yes! 💖',
                nextNodes: [
                  { speaker: 'Totoro', portrait: '🐾', text: 'Then it is official: 0.0 km away, permanent resident in Moon Walker’s heart. And now, let us step through the East Fuller Road Portal to explore the Six Realms together!' }
                ]
              },
              {
                label: 'Yes, from Curzon Hall all the way to the Astral Realm 🌙',
                nextNodes: [
                  { speaker: 'Totoro', portrait: '🐾', text: 'Best date in Dhaka history. Come here: unlimited forehead kisses, cha dates, and realm adventures for life!' }
                ]
              }
            ]
          }
        ], () => {
          if (!DateState.confessionDone) {
            DateState.confessionDone = true;
            DateState.memories.push({ emoji: '⛵', title: 'Dhanmondi Lake Confession', note: 'Rowed under the lanterns and said 100% yes.' });
            this.advanceDateProgress();
          }
          UI.showScrapbook();
        });
      });
    });
  }

  /* ================= Curzon Hall Interior & Faculty of Science System ================= */
  enterCurzonHall() {
    if (this.isTransitioning || this.cutsceneLocked) return;
    SoundEngine.portalWarp();
    this.transitionToWorld('curzon_interior', { x: 600, y: 780 });
    if (!DateState.curzonExplored) {
      DateState.curzonExplored = true;
      UI.showToast('🏛️', 'Curzon Hall: Faculty of Science', 'Step inside the historic auditoriums and laboratories!');
    }
  }

  /* ================= Farmhouse Pastoral Activity System ================= */
  enterFarmhouse() {
    if (this.isTransitioning || this.cutsceneLocked) return;
    SoundEngine.portalWarp();
    this.transitionToWorld('farmhouse', { x: 600, y: 780 });
    if (!DateState.farmhouseExplored) {
      DateState.farmhouseExplored = true;
      DateState.sideQuests.sq_farmhouse_tour = true;
      UI.showToast('🏡', 'Green Meadows Farmhouse', 'Breathe in the countryside air and greet the friendly farm animals!');
    }
  }

  exitFarmhouse() {
    if (this.isTransitioning || this.cutsceneLocked) return;
    SoundEngine.portalWarp();
    this.transitionToWorld('dhaka', { x: 740, y: 1455 });
  }

  buildCurzonInterior(spawnPos) {
    if (this.dhakaTilemap) {
      try {
        if (this.dhakaTilemap.map) this.dhakaTilemap.map.destroy();
      } catch (e) {}
      this.dhakaTilemap = null;
    }
    this.children.removeAll(true);
    if (this.obstacles) this.obstacles.clear(true, true);
    this.interactables = [];
    this.wanderers = [];
    this.enemies = [];
    this.lampGlows = [];
    this.activeBoss = null;
    UI.setBossHUD(false);

    SoundEngine.setTheme('dhaka');
    const minLabel = document.getElementById('minimap-world-label');
    if (minLabel) minLabel.textContent = 'Curzon Hall: Faculty of Science';

    const MAP_W = CURZON_INTERIOR_WIDTH, MAP_H = CURZON_INTERIOR_HEIGHT;
    this.currentMapW = MAP_W;
    this.currentMapH = MAP_H;
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H);
    this.obstacles = this.physics.add.staticGroup();

    const blockRect = (x, y, w, h) => {
      const zone = this.add.zone(x, y, w, h);
      this.physics.add.existing(zone, true);
      this.obstacles.add(zone);
    };

    const addLandmark = (x, y, tex, w, h) => {
      const sp = this.add.sprite(x, y, tex).setOrigin(0.5, 1).setDepth(y);
      if (w && h) blockRect(x, y - h / 2, w, h);
      return sp;
    };

    const registerInteract = (x, y, tex, name, radius, onInteract) => {
      const sp = tex ? this.add.sprite(x, y, tex).setOrigin(0.5, 1).setDepth(y) : null;
      if (sp && tex && tex.startsWith('npc-')) {
        const anim = this.getOrCreateWalkAnim(tex.replace(/-\d+$/, ''), 2.5);
        if (anim) sp.play(anim);
      }
      const badgeY = sp ? y - sp.height - 8 : y - 58;
      const badge = this.add.text(x, badgeY, '💬 ' + name, {
        fontFamily: 'Outfit', fontSize: '12px', fontStyle: 'bold',
        backgroundColor: 'rgba(43,29,20,0.88)', color: '#fdf5e6', padding: { x: 7, y: 3 }
      }).setOrigin(0.5, 1).setDepth(y + 10);
      const entry = { x, y, radius, sprite: sp, badge, name, onInteract };
      this.interactables.push(entry);
      return entry;
    };

    // 1. Flooring: Polished Heritage Teak Parquet
    this.add.tileSprite(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, 'tile-curzon-floor').setDepth(0);

    // 2. Velvet Runners
    // Central Grand Runner (South Entrance up to Dais)
    this.add.tileSprite(600, 530, 72, 540, 'tile-curzon-carpet').setDepth(1);
    // West Cross-Aisle to Physics / Bose Lab
    this.add.tileSprite(330, 500, 480, 56, 'tile-curzon-carpet').setDepth(1);
    // East Cross-Aisle to Botany & Chemistry
    this.add.tileSprite(870, 500, 480, 56, 'tile-curzon-carpet').setDepth(1);
    // Dais Platform Runner
    this.add.tileSprite(600, 240, 280, 64, 'tile-curzon-carpet').setDepth(1);

    // 3. Walls & Physics Colliders
    // North Wall
    this.add.tileSprite(600, 110, MAP_W, 64, 'tile-curzon-wall').setDepth(110);
    blockRect(600, 75, MAP_W, 90);
    // West Wall
    this.add.tileSprite(16, MAP_H / 2, 32, MAP_H, 'tile-curzon-wall').setDepth(MAP_H / 2);
    blockRect(16, MAP_H / 2, 32, MAP_H);
    // East Wall
    this.add.tileSprite(MAP_W - 16, MAP_H / 2, 32, MAP_H, 'tile-curzon-wall').setDepth(MAP_H / 2);
    blockRect(MAP_W - 16, MAP_H / 2, 32, MAP_H);
    // South Wall (Split by central exit doors at x = 600)
    this.add.tileSprite(270, 868, 540, 64, 'tile-curzon-wall').setDepth(868);
    blockRect(270, 878, 540, 44);
    this.add.tileSprite(930, 868, 540, 64, 'tile-curzon-wall').setDepth(868);
    blockRect(930, 878, 540, 44);
    blockRect(600, 895, 120, 20); // Behind the exit doors

    // Exit Doors at South Center
    this.add.sprite(600, 864, 'prop-exit-door').setOrigin(0.5, 1).setDepth(864);
    registerInteract(600, 836, null, 'Exit to Curzon Lawn 🚪', 85, () => this.exitCurzonHall());

    // 4. Central Dais: Auditorium & Mathematics
    this.add.sprite(600, 95, 'prop-portrait-du').setOrigin(0.5, 1).setDepth(96);
    this.add.sprite(600, 155, 'prop-blackboard-math').setOrigin(0.5, 1).setDepth(155);
    addLandmark(600, 230, 'prop-podium', 42, 24);
    addLandmark(600, 360, 'prop-chess-table', 52, 28);
    registerInteract(645, 362, 'npc-prof-motahar-0', 'Prof. Motahar Hossain (Math & Chess Chair)', 92, () => this.interactProfMotahar());

    // 5. West Wing: Department of Physics & S.N. Bose Quantum Lab
    this.add.sprite(180, 95, 'prop-portrait-bose').setOrigin(0.5, 1).setDepth(96);
    this.add.sprite(320, 155, 'prop-blackboard-bose').setOrigin(0.5, 1).setDepth(155);
    addLandmark(72, 210, 'prop-curzon-bookshelf', 70, 28);
    addLandmark(72, 360, 'prop-curzon-bookshelf', 70, 28);
    addLandmark(72, 520, 'prop-curzon-bookshelf', 70, 28);
    addLandmark(260, 320, 'prop-labdesk', 90, 32);
    addLandmark(260, 480, 'prop-botany-table', 84, 30);
    registerInteract(330, 322, 'npc-prof-satyendra-0', 'Prof. Satyendra (Physics Chair)', 92, () => this.interactProfSatyendra());
    registerInteract(315, 482, 'npc-student-faiza-0', 'Faiza (Physics Undergrad)', 85, () => this.interactFaizaStudent());

    // 6. East Wing: Botany Herbarium & Chemistry Research Lab
    this.add.sprite(880, 155, 'prop-blackboard-chem').setOrigin(0.5, 1).setDepth(155);
    addLandmark(1128, 210, 'prop-curzon-bookshelf', 70, 28);
    addLandmark(1128, 360, 'prop-curzon-bookshelf', 70, 28);
    addLandmark(1128, 520, 'prop-curzon-bookshelf', 70, 28);
    addLandmark(940, 320, 'prop-botany-table', 84, 30);
    addLandmark(940, 480, 'prop-labdesk', 90, 32);
    registerInteract(875, 322, 'npc-prof-sultana-0', 'Prof. Sultana (Botany Chair)', 92, () => this.interactProfSultana());
    registerInteract(875, 482, 'npc-dr-kabir-0', 'Dr. Kabir (Chemistry Master)', 92, () => this.interactDrKabir());
    registerInteract(1010, 482, 'npc-student-tanvir-0', 'Tanvir (Biochemistry Student)', 85, () => this.interactTanvirStudent());

    // 7. Lighting & Chandeliers
    [
      [360, 250], [840, 250], [600, 440], [360, 620], [840, 620]
    ].forEach(([cx, cy]) => {
      this.add.sprite(cx, cy, 'prop-curzon-chandelier').setOrigin(0.5, 1).setDepth(cy);
      const glow = this.add.circle(cx, cy - 18, 70, 0xfde68a, 0.16).setDepth(cy + 1);
      this.lampGlows.push(glow);
    });

    // 8. Potted Dhaka Ferns
    [
      [145, 680], [475, 680], [725, 680], [1055, 680], [475, 175], [725, 175]
    ].forEach(([fx, fy]) => {
      this.add.sprite(fx, fy, 'prop-indoor-fern').setOrigin(0.5, 1).setDepth(fy);
    });

    // 9. Floating Golden Dust Motes / Sunlight Beams
    this.petals = Array.from({ length: 22 }, () => ({
      obj: this.add.circle(Phaser.Math.Between(70, MAP_W - 70), Phaser.Math.Between(140, MAP_H - 120), 2.5, 0xffe29a, 0.65).setDepth(2400),
      vx: Phaser.Math.FloatBetween(-5, 5),
      vy: Phaser.Math.FloatBetween(-3, -1),
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2)
    }));

    // 10. Architectural Labels
    const labelStyle = { fontFamily: 'Press Start 2P', fontSize: '9px', color: '#fff8eb', stroke: '#2b1d14', strokeThickness: 4 };
    this.add.text(600, 48, 'CENTRAL AUDITORIUM & MATHEMATICS DAIS', labelStyle).setOrigin(0.5).setDepth(2000);
    this.add.text(260, 48, 'BOSE QUANTUM LABORATORY (PHYSICS)', labelStyle).setOrigin(0.5).setDepth(2000);
    this.add.text(940, 48, 'BOTANICAL HERBARIUM & CHEMISTRY LAB', labelStyle).setOrigin(0.5).setDepth(2000);

    // 11. Spawn Player & Totoro
    const pSpawn = spawnPos || { x: 600, y: 780 };
    this.player = this.physics.add.sprite(pSpawn.x, pSpawn.y, 'player-0').setOrigin(0.5, 1);
    const pBoxW = 20;
    const pBoxH = 14;
    this.player.body.setSize(pBoxW, pBoxH).setOffset((this.player.width - pBoxW) / 2, this.player.height - pBoxH);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.obstacles);

    const totoroPos = { x: pSpawn.x - 38, y: pSpawn.y };
    this.totoro = this.add.sprite(totoroPos.x, totoroPos.y, 'totoro-0').setOrigin(0.5, 1).setDepth(totoroPos.y);
    this.totoroBadge = this.add.text(totoroPos.x, totoroPos.y - 68, '♥ Totoro', {
      fontFamily: 'Outfit', fontSize: '13px', fontStyle: 'bold',
      backgroundColor: '#d45779', color: '#ffffff', padding: { x: 8, y: 4 }
    }).setOrigin(0.5, 1).setDepth(2100);
    this.trail = Array(16).fill({ x: this.player.x, y: this.player.y });

    this.taroLeaf = this.add.sprite(this.totoro.x, this.totoro.y - 65, 'prop-taro-leaf')
      .setOrigin(0.5, 1).setDepth(this.totoro.depth + 2).setVisible(false);

    this.interactPrompt = this.add.text(0, 0, 'PRESS E', {
      fontFamily: 'Press Start 2P', fontSize: '9px',
      backgroundColor: '#fdf5e6', color: '#2b1d14', padding: { x: 6, y: 4 }
    }).setOrigin(0.5, 1).setDepth(3000).setVisible(false);

    this.ambientOverlay = this.add.rectangle(0, 0, MAP_W * 2, MAP_H * 2, 0x1a1438, 0)
      .setOrigin(0, 0).setDepth(2500);

    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    UI.updateQuestText();
  }

  /* ─────────────────────────────────────────────────────────────────────────
   *  FACULTY OF SCIENCE INTERACTION HANDLERS
   * ──────────────────────────────────────────────────────────────────────── */
  interactProfSatyendra() {
    SoundEngine.heartUp();
    UI.startDialogue([
      {
        speaker: 'Prof. Satyendra',
        portrait: '🔬',
        text: 'Greetings, young scholars! Welcome to the Department of Physics at Curzon Hall. What brings you to our optics and quantum laboratory today?',
        choices: [
          {
            label: '⚛️ "Prof. Satyendra, what is written on your quantum slate?"',
            nextNodes: [
              { speaker: 'Prof. Satyendra', portrait: '🔬', text: 'Ah! In 1924, right here within Curzon Hall, I realized that photons do not obey classical Maxwell-Boltzmann statistics. They are indistinguishable particles of integer spin!' },
              { speaker: 'Moon Walker', portrait: '🌙', text: 'And you sent the derivation directly to Albert Einstein in Berlin!' },
              { speaker: 'Prof. Satyendra', portrait: '🔬', text: 'Indeed! Einstein personally translated my manuscript into German and generalized it to atoms, predicting the Bose-Einstein Condensate.' },
              { speaker: 'Totoro', portrait: '🐾', text: 'Indistinguishable particles... When two souls resonate with true affection, they share one single wave function across the cosmos!' },
              { speaker: 'Prof. Satyendra', portrait: '🔬', text: 'Poetic, and mathematically profound, young companion!' }
            ]
          },
          {
            label: '🧪 "May I take the Bose-Einstein Quantum Quiz?"',
            nextNodes: [
              {
                speaker: 'Prof. Satyendra',
                portrait: '🔬',
                text: 'A scholar after my own heart! Tell me: When a gas of bosons is cooled near absolute zero, what phenomenon occurs?',
                choices: [
                  {
                    label: '✨ "A macroscopic fraction collapses into the lowest quantum ground state!"',
                    onPick: () => {
                      SoundEngine.itemFanfare();
                      RPGStats.gainXP(60);
                      if (!DateState.boseQuizDone) {
                        DateState.boseQuizDone = true;
                        UI.giveItem('bose_lens', 'Passed Prof. Satyendra’s Bose-Einstein Quantum Quiz at Curzon Hall.');
                        UI.showToast('🔬', 'Quantum Monocle Awarded!', 'Prof. Satyendra conferred the Bose-Einstein Quantum Monocle (+6 ATK, +6 DEF)!');
                      } else {
                        UI.showToast('✨', 'Academic Excellence!', 'Prof. Satyendra nodded with great approval! (+60 XP)');
                      }
                    },
                    nextNodes: [
                      { speaker: 'Prof. Satyendra', portrait: '🔬', text: 'Magnificent! That is the very essence of the Bose-Einstein Condensate. You possess the sharp mind of a true Dhaka University physicist! Take this Quantum Monocle for your journey.' },
                      { speaker: 'Moon Walker', portrait: '🌙', text: 'Thank you, Professor! Through its lens, reality itself seems clearer.' }
                    ]
                  },
                  {
                    label: '🍵 "They boil away into hot cardamom milk tea at TSC!"',
                    nextNodes: [
                      { speaker: 'Prof. Satyendra', portrait: '🔬', text: 'Haha! A delicious culinary hypothesis, but thermodynamically catastrophic! Revise your statistical mechanics, traveler!' }
                    ]
                  }
                ]
              }
            ]
          },
          {
            label: '🌟 Receive Quantum Harmonization (Restore HP & SP)',
            onPick: () => {
              SoundEngine.itemFanfare();
              DateState.hp = DateState.maxHp;
              DateState.sp = DateState.maxSp;
              UI.updateRPGStats();
              UI.showToast('⚛️', 'Quantum Harmonization', 'Prof. Satyendra tuned your kinetic wavelength! (HP & SP Fully Restored)');
            },
            nextNodes: [
              { speaker: 'Prof. Satyendra', portrait: '🔬', text: 'May the fundamental wave functions of the universe align in your favor. Walk in perfect equilibrium, Moon Walker and Totoro!' }
            ]
          },
          {
            label: '🏛️ "Tell us about Curzon Hall’s Indo-Saracenic architecture"',
            nextNodes: [
              { speaker: 'Prof. Satyendra', portrait: '🔬', text: 'Curzon Hall was inaugurated in 1904. Its majestic red-brick arches, domed chhatris, and intricate terracotta motifs blend European neoclassical geometry with Mughal Saracenic elegance.' },
              { speaker: 'Prof. Satyendra', portrait: '🔬', text: 'Generations of pioneers—from Satyendra Nath Bose to Qazi Motahar Hossain—walked these very teakwood floors.' }
            ]
          }
        ]
      }
    ]);
  }

  interactProfSultana() {
    SoundEngine.heartUp();
    UI.startDialogue([
      {
        speaker: 'Prof. Sultana',
        portrait: '🌿',
        text: 'Welcome to the Botanical Herbarium, travelers! The scent of pressed Krishnachura leaves and fresh morning dew fills our halls. How may botany serve you?',
        choices: [
          {
            label: '🌺 "Tell us about the century-old Krishnachura trees outside!"',
            nextNodes: [
              { speaker: 'Prof. Sultana', portrait: '🌿', text: 'Delonix regia! For over a century, their scarlet and crimson canopies have sheltered students, poets, and lovers under Curzon Hall’s brick arches.' },
              { speaker: 'Totoro', portrait: '🐾', text: 'The blossom Moon Walker wears behind her ear has that exact same warm flame.' },
              { speaker: 'Prof. Sultana', portrait: '🌿', text: 'And you have cherished it with pure affection. In nature, genuine devotion is the most powerful bio-catalyst of all.' }
            ]
          },
          {
            label: '🧪 "Synthesize Curzon Botanical Elixir"',
            onPick: () => {
              SoundEngine.itemFanfare();
              if (!DateState.sultanaElixirGiven) {
                DateState.sultanaElixirGiven = true;
                UI.giveItem('curzon_elixir', 'Received Curzon Botanical Elixir distilled by Prof. Sultana.');
                UI.showToast('🧪', 'Botanical Elixir Synthesized!', 'Prof. Sultana crafted Curzon Botanical Elixir (+100 HP, +50 SP)!');
              } else {
                DateState.hp = Math.min(DateState.maxHp, DateState.hp + 50);
                DateState.sp = Math.min(DateState.maxSp, DateState.sp + 25);
                UI.updateRPGStats();
                UI.showToast('🌿', 'Herbarium Blessing', 'Revitalized by Krishnachura herbal extract! (+50 HP, +25 SP)');
              }
            },
            nextNodes: [
              { speaker: 'Prof. Sultana', portrait: '🌿', text: 'Here is our special Curzon Botanical Elixir, cold-distilled from centennial Delonix petals and sacred banyan roots. Keep it in your Bag (I) for when danger looms!' }
            ]
          },
          {
            label: '🌼 "Ask about the Beli flower wrist gajra"',
            nextNodes: [
              { speaker: 'Prof. Sultana', portrait: '🌿', text: 'Jasminum sambac! Fragrant white Beli flowers woven into wrist garlands. Their essential oils soothe the pulse and calm erratic heartbeats.' },
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Totoro tied one on my wrist earlier near Ramna Park!' },
              { speaker: 'Prof. Sultana', portrait: '🌿', text: 'A classic Dhaka tradition. Its soothing aura will protect you wherever you tread.' }
            ]
          }
        ]
      }
    ]);
  }

  interactDrKabir() {
    SoundEngine.heartUp();
    UI.startDialogue([
      {
        speaker: 'Dr. Kabir',
        portrait: '⚗️',
        text: 'Careful around the bunsen burners! I am Dr. Kabir, Master of the Curzon Chemistry Laboratory. What reaction can we catalyze for you today?',
        choices: [
          {
            label: '🌶️ "What are you synthesizing in that glowing flask, Dr. Kabir?"',
            nextNodes: [
              { speaker: 'Dr. Kabir', portrait: '⚗️', text: 'I am extracting thermodynamic capsaicinoids from Old Dhaka Naga chilis and stabilizing them with sweet lactic lactones from Bogurar Mishti Doi!' },
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Wait... are you distilling spicy fuchka and mishti doi into rocket fuel?!' },
              { speaker: 'Dr. Kabir', portrait: '⚗️', text: 'Haha! Chemistry is simply gastronomy elevated to molecular perfection, my dear traveler!' }
            ]
          },
          {
            label: '⚔️ "Can you temper Moon Walker’s Crimson Monsoon Parasol?"',
            onPick: () => {
              if (!DateState.kabirBuffGiven) {
                DateState.kabirBuffGiven = true;
                DateState.baseAtk += 5;
                SoundEngine.itemFanfare();
                UI.updateRPGStats();
                UI.showToast('⚗️', 'Weapon Tempered!', 'Dr. Kabir applied organometallic catalyst! Permanently gained +5 Base ATK!');
              } else {
                UI.showToast('✨', 'Catalyst Active', 'Your parasol blade is already resonance-tempered to maximum capacity!');
              }
            },
            nextNodes: [
              { speaker: 'Dr. Kabir', portrait: '⚗️', text: DateState.kabirBuffGiven ? 'Your Crimson Monsoon Parasol is coated with an ultra-durable organometallic sheen! Its kinetic strike is second to none.' : 'Hold still! I have quenched your umbrella blade in a catalytic organometallic solution. You have permanently gained +5 Base ATK!' }
            ]
          },
          {
            label: '🥽 "Why keep safety goggles on inside the lecture hall?"',
            nextNodes: [
              { speaker: 'Dr. Kabir', portrait: '⚗️', text: 'Rule number one of Dhaka University Chemistry: Never trust an exothermic reaction, especially when tamarind chutney is within 50 meters of a test tube!' },
              { speaker: 'Totoro', portrait: '🐾', text: 'Wise advice. Safety first, glorious adventures second!' }
            ]
          }
        ]
      }
    ]);
  }

  interactProfMotahar() {
    SoundEngine.heartUp();
    UI.startDialogue([
      {
        speaker: 'Prof. Motahar',
        portrait: '♟️',
        text: 'Welcome, thinkers! I am Prof. Motahar Hossain. Mathematics, statistics, and chess are but different dialects of the same harmony. Are you ready to sharpen your mind?',
        choices: [
          {
            label: '♟️ "Play a tactical chess challenge!"',
            nextNodes: [
              {
                speaker: 'Prof. Motahar',
                portrait: '♟️',
                text: 'Observe this board! White has a Knight on e5 and Queen on f3. Black’s King is castled on g8. What is White’s decisive tactical sacrifice?',
                choices: [
                  {
                    label: '⚡ "1. Bxf7+! Kh8 2. Ng6+! hxg6 3. Qh3# (Smothered Royal Net)!"',
                    onPick: () => {
                      SoundEngine.itemFanfare();
                      RPGStats.gainXP(50);
                      DateState.sp = Math.min(DateState.maxSp, DateState.sp + 30);
                      UI.updateRPGStats();
                      if (!DateState.motaharChessDone) {
                        DateState.motaharChessDone = true;
                        UI.showToast('♟️', 'Tactical Mastery!', 'Solved Prof. Motahar’s Curzon Chess Puzzle! (+50 XP, +30 SP)');
                      } else {
                        UI.showToast('♟️', 'Grandmaster Precision!', 'Prof. Motahar beamed with pride! (+50 XP)');
                      }
                    },
                    nextNodes: [
                      { speaker: 'Prof. Motahar', portrait: '♟️', text: 'Exquisite! The classic Greek gift sacrifice leading into a smothered royal net. You have the strategic vision of an all-Bengal champion!' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'Checkmate! Moon Walker calculates faster than the Kalbaishakhi wind!' }
                    ]
                  },
                  {
                    label: '💨 "Fling the chessboard across the dais and dash away!"',
                    nextNodes: [
                      { speaker: 'Prof. Motahar', portrait: '♟️', text: 'Haha! Emotion without calculation leads only to blunders, my impetuous friend. Breathe, evaluate, and attack with patience!' }
                    ]
                  }
                ]
              }
            ]
          },
          {
            label: '📊 "Calculate the statistical probability of our bond"',
            nextNodes: [
              { speaker: 'Prof. Motahar', portrait: '♟️', text: 'By applying the multivariate Gaussian distribution across infinite parallel timelines...' },
              { speaker: 'Prof. Motahar', portrait: '♟️', text: 'The probability of Moon Walker and Totoro meeting beneath the Krishnachura trees is 1.0000. It is an immutable statistical certainty!' },
              { speaker: 'Totoro', portrait: '🐾', text: 'A mathematical law! Even the numbers in the textbooks know we belong together.' }
            ]
          },
          {
            label: '🧠 Receive Grandmaster Focus (Restore SP)',
            onPick: () => {
              SoundEngine.itemFanfare();
              DateState.sp = DateState.maxSp;
              UI.updateRPGStats();
              UI.showToast('♟️', 'Grandmaster Focus', 'Prof. Motahar cleared your mental fatigue! (SP Fully Restored)');
            },
            nextNodes: [
              { speaker: 'Prof. Motahar', portrait: '♟️', text: 'A tranquil mind calculates twenty moves ahead without hesitation. Go forth with absolute clarity!' }
            ]
          }
        ]
      }
    ]);
  }

  interactFaizaStudent() {
    SoundEngine.blip(520, 'triangle');
    UI.startDialogue([
      {
        speaker: 'Faiza (Physics)',
        portrait: '📚',
        text: 'Phew! Studying for Prof. Satyendra’s quantum electrodynamics midterm is no joke. Did you know S.N. Bose formulated his statistics on that exact chalkboard behind us?',
        choices: [
          {
            label: '💡 "Any combat tips for our journey into the Six Realms?"',
            nextNodes: [
              { speaker: 'Faiza (Physics)', portrait: '📚', text: 'Kinetic energy is all about timing! Tap Shift (or K) to dash right when an enemy begins its attack swing. It gives you invulnerability frames!' },
              { speaker: 'Faiza (Physics)', portrait: '📚', text: 'And when you are surrounded by monsters, press R (or Q) for Totoro’s Spirit Roar to wipe out the whole cluster!' },
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Thanks Faiza! Physics in theory, physics in combat!' }
            ]
          },
          {
            label: '👋 "Good luck on your quantum midterm, Faiza!"',
            nextNodes: [
              { speaker: 'Faiza (Physics)', portrait: '📚', text: 'Thank you! If I pass with an A, I am treating myself to double-tok Naga Fuchka and a full pot of Mishti Doi!' }
            ]
          }
        ]
      }
    ]);
  }

  interactTanvirStudent() {
    SoundEngine.blip(440, 'sine');
    UI.startDialogue([
      {
        speaker: 'Tanvir (Biochem)',
        portrait: '🎒',
        text: 'Hey there! I am trying to finish my chromatography report before Dr. Kabir notices I sneaked Singaras into the chemistry bench.',
        choices: [
          {
            label: '🏛️ "What is your favorite thing about Curzon Hall?"',
            nextNodes: [
              { speaker: 'Tanvir (Biochem)', portrait: '🎒', text: 'At sunset, when the red-brick domes catch the golden light, the entire building glows like a royal palace in a Stardew Valley dream.' },
              { speaker: 'Tanvir (Biochem)', portrait: '🎒', text: 'And in monsoon, the rain drops patter against the Victorian stained-glass transoms. There is no place on Earth quite like it.' },
              { speaker: 'Totoro', portrait: '🐾', text: 'We feel that exact same magic in the air, Tanvir!' }
            ]
          },
          {
            label: '🧪 "Don’t spill any chai on your chromatography sheet!"',
            nextNodes: [
              { speaker: 'Tanvir (Biochem)', portrait: '🎒', text: 'Haha! If I do, I will just tell Dr. Kabir it is a new organic caffeine compound!' }
            ]
          }
        ]
      }
    ]);
  }

  /* ================= Green Meadows Farmhouse Activity Scene ================= */
  buildFarmhouse(spawnPos) {
    if (this.dhakaTilemap) {
      try {
        if (this.dhakaTilemap.map) this.dhakaTilemap.map.destroy();
      } catch (e) {}
      this.dhakaTilemap = null;
    }
    this.children.removeAll(true);
    if (this.obstacles) this.obstacles.clear(true, true);
    this.interactables = [];
    this.wanderers = [];
    this.enemies = [];
    this.lampGlows = [];
    this.activeBoss = null;
    UI.setBossHUD(false);

    SoundEngine.setTheme('dhaka');
    const minLabel = document.getElementById('minimap-world-label');
    if (minLabel) minLabel.textContent = 'Green Meadows Farmhouse 🏡';

    const MAP_W = FARMHOUSE_WIDTH, MAP_H = FARMHOUSE_HEIGHT;
    this.currentMapW = MAP_W;
    this.currentMapH = MAP_H;
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H);
    this.obstacles = this.physics.add.staticGroup();

    const blockRect = (x, y, w, h) => {
      const zone = this.add.zone(x, y, w, h);
      this.physics.add.existing(zone, true);
      this.obstacles.add(zone);
    };

    const addLandmark = (x, y, tex, w, h) => {
      const sp = this.add.sprite(x, y, tex).setOrigin(0.5, 1).setDepth(y);
      if (w && h) blockRect(x, y - h / 2, w, h);
      return sp;
    };

    const registerInteract = (x, y, tex, name, radius, onInteract) => {
      const sp = tex ? this.add.sprite(x, y, tex).setOrigin(0.5, 1).setDepth(y) : null;
      if (sp && tex && tex.startsWith('npc-')) {
        const anim = this.getOrCreateWalkAnim(tex.replace(/-\d+$/, ''), 2.5);
        if (anim) sp.play(anim);
      }
      const badgeY = sp ? y - sp.height - 8 : y - 58;
      const badge = this.add.text(x, badgeY, '💬 ' + name, {
        fontFamily: 'Outfit', fontSize: '12px', fontStyle: 'bold',
        backgroundColor: 'rgba(30,50,20,0.88)', color: '#fef3c7', padding: { x: 7, y: 3 }
      }).setOrigin(0.5, 1).setDepth(y + 10);
      const entry = { x, y, radius, sprite: sp, badge, name, onInteract };
      this.interactables.push(entry);
      return entry;
    };

    // 1. Base Terrain: Lush Pasture Grass
    this.add.tileSprite(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, 'tile-grass').setDepth(0);

    // 2. Rural Dirt / Cobblestone Roadways & Hubs
    // Central North-South Farmyard Avenue
    this.add.tileSprite(600, 520, 84, 580, 'tile-path').setDepth(1);
    // East-West Connecting Lane
    this.add.tileSprite(600, 480, 860, 68, 'tile-path').setDepth(1);

    // 3. Duckling Pond (South-East Meadow: x: 920, y: 640)
    this.add.tileSprite(940, 660, 260, 180, 'tile-water').setDepth(1);
    this.add.tileSprite(800, 660, 20, 180, 'tile-bank').setDepth(2);
    this.add.tileSprite(940, 560, 260, 20, 'tile-bank').setDepth(2);
    blockRect(940, 660, 240, 160);

    // 4. Pasture Fences (Separating Animal Paddocks)
    // Cow Pasture (North-West)
    this.add.sprite(220, 360, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(360);
    this.add.sprite(316, 360, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(360);
    this.add.sprite(412, 360, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(360);
    blockRect(316, 350, 280, 20);

    // Goat Pasture (North-East)
    this.add.sprite(780, 360, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(360);
    this.add.sprite(876, 360, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(360);
    this.add.sprite(972, 360, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(360);
    blockRect(876, 350, 280, 20);

    // Chicken Pen (South-West)
    this.add.sprite(220, 620, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(620);
    this.add.sprite(316, 620, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(620);
    blockRect(268, 610, 190, 20);

    // 5. Farmhouse Barn & Grain Silo (North Center: x: 600, y: 220)
    addLandmark(600, 210, 'prop-farm-barn', 186, 68);
    addLandmark(460, 205, 'prop-farm-silo', 56, 44);

    // Hay Bales & Rural Props
    [
      [360, 220], [740, 220], [780, 215], [380, 680], [710, 680]
    ].forEach(([bx, by]) => {
      this.add.circle(bx, by, 16, 0xfacc15).setDepth(by);
      this.add.circle(bx, by - 4, 14, 0xfde047).setDepth(by + 1);
      blockRect(bx, by, 30, 24);
    });

    // 6. Farm Boundary & Shade Trees
    [
      [80, 120], [80, 380], [80, 680], [80, 840],
      [1120, 120], [1120, 380], [1120, 840],
      [320, 120], [880, 120]
    ].forEach(([tx, ty]) => addLandmark(tx, ty, 'prop-tree-krishna', 38, 24));

    // Farm Entrance / Exit Gates & Grand Pastoral Archway (South Center: x: 600, y: 850)
    this.add.sprite(600, 850, 'prop-farm-arch').setOrigin(0.5, 1).setDepth(850);

    // Flanking Southern Boundary Fences (Extending to West & East Margins)
    this.add.sprite(456, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);
    this.add.sprite(360, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);
    this.add.sprite(264, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);
    this.add.sprite(168, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);

    this.add.sprite(744, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);
    this.add.sprite(840, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);
    this.add.sprite(936, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);
    this.add.sprite(1032, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);

    // Southern Boundary Collisions (Leaving open central avenue at x: 552–648 for passage)
    blockRect(312, 842, 400, 16);
    blockRect(888, 842, 400, 16);
    blockRect(528, 845, 34, 18);
    blockRect(672, 845, 34, 18);

    // Gate Milestone Signpost
    this.add.sprite(665, 810, 'prop-farm-sign').setOrigin(0.5, 1).setDepth(810);

    // Lush Sunflowers & Golden Hay Bales Framing the Exit Gate
    this.add.sprite(520, 856, 'prop-sunflowers').setOrigin(0.5, 1).setDepth(856);
    this.add.sprite(680, 856, 'prop-sunflowers').setOrigin(0.5, 1).setDepth(856);
    this.add.sprite(475, 858, 'prop-farm-haybale').setOrigin(0.5, 1).setDepth(858);
    this.add.sprite(725, 858, 'prop-farm-haybale').setOrigin(0.5, 1).setDepth(858);

    // Warm Gate Lantern Glows
    const farmGlowL = this.add.circle(520, 798, 44, 0xfde68a, 0.25).setDepth(851);
    const farmGlowR = this.add.circle(680, 798, 44, 0xfde68a, 0.25).setDepth(851);
    this.lampGlows.push(farmGlowL, farmGlowR);

    // Stepping Threshold & Exit Return Trigger
    this.add.circle(600, 840, 22, 0xca8a04, 0.25).setDepth(839);
    this.add.circle(600, 840, 12, 0xfef08a, 0.35).setDepth(839);

    registerInteract(600, 840, null, 'Return to Dhaka Valley 🚶', 75, () => this.exitFarmhouse());

    // 7. Interactive Animals & Farmer
    // A. Chacha Rafiq (Farm Master)
    registerInteract(580, 340, 'npc-farmer-rafiq-0', 'Chacha Rafiq (Farm Owner)', 95, () => this.interactFarmerRafiq());

    // B. Shuravi the Gentle Dairy Cow (North-West Pasture)
    registerInteract(280, 260, 'npc-cow-0', 'Shuravi the Dairy Cow 🐄', 95, () => this.interactCowShuravi());

    // C. Kalu the Bengal Black Goat (North-East Pasture)
    registerInteract(880, 260, 'npc-goat-0', 'Kalu the Bengal Goat 🐐', 90, () => this.interactGoatKalu());

    // D. Tuntuni the Free-Range Hen (South-West Coop)
    registerInteract(260, 520, 'npc-chicken-0', 'Tuntuni the Hen 🐔', 85, () => this.interactChickenTuntuni());

    // E. Piku the White Duckling (Pond Bank)
    registerInteract(820, 640, 'npc-duck-0', 'Piku the Duckling 🦆', 85, () => this.interactDuckPiku());

    // 8. Pastoral Floating Petals / Dandelion Seeds
    this.petals = Array.from({ length: 24 }, () => ({
      obj: this.add.circle(Phaser.Math.Between(50, MAP_W - 50), Phaser.Math.Between(80, MAP_H - 80), 2.5, 0xfef08a, 0.7).setDepth(2400),
      vx: Phaser.Math.FloatBetween(-6, 6),
      vy: Phaser.Math.FloatBetween(-3, -1),
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2)
    }));

    // 9. Zone Signs & Banners
    const labelStyle = { fontFamily: 'Press Start 2P', fontSize: '9px', color: '#fff8eb', stroke: '#1c1917', strokeThickness: 4 };
    this.add.text(600, 56, 'GREEN MEADOWS FARMHOUSE & BARN 🏡', labelStyle).setOrigin(0.5).setDepth(2000);
    this.add.text(280, 160, 'DAIRY COW PASTURE 🐄', labelStyle).setOrigin(0.5).setDepth(2000);
    this.add.text(880, 160, 'BENGAL GOAT PEN 🐐', labelStyle).setOrigin(0.5).setDepth(2000);
    this.add.text(260, 440, 'CHICKEN COOP 🐔', labelStyle).setOrigin(0.5).setDepth(2000);
    this.add.text(940, 525, 'DUCK POND & MEADOW 🦆', labelStyle).setOrigin(0.5).setDepth(2000);

    // 10. Spawn Player & Totoro
    const pSpawn = spawnPos || { x: 600, y: 780 };
    this.player = this.physics.add.sprite(pSpawn.x, pSpawn.y, 'player-0').setOrigin(0.5, 1);
    const pBoxW = 20;
    const pBoxH = 14;
    this.player.body.setSize(pBoxW, pBoxH).setOffset((this.player.width - pBoxW) / 2, this.player.height - pBoxH);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.obstacles);

    const totoroPos = { x: pSpawn.x - 38, y: pSpawn.y };
    this.totoro = this.add.sprite(totoroPos.x, totoroPos.y, 'totoro-0').setOrigin(0.5, 1).setDepth(totoroPos.y);
    this.totoroBadge = this.add.text(totoroPos.x, totoroPos.y - 68, '♥ Totoro', {
      fontFamily: 'Outfit', fontSize: '13px', fontStyle: 'bold',
      backgroundColor: '#15803d', color: '#ffffff', padding: { x: 8, y: 4 }
    }).setOrigin(0.5, 1).setDepth(2100);
    this.trail = Array(16).fill({ x: this.player.x, y: this.player.y });

    this.taroLeaf = this.add.sprite(this.totoro.x, this.totoro.y - 65, 'prop-taro-leaf')
      .setOrigin(0.5, 1).setDepth(this.totoro.depth + 2).setVisible(false);

    this.interactPrompt = this.add.text(0, 0, 'PRESS E', {
      fontFamily: 'Press Start 2P', fontSize: '9px',
      backgroundColor: '#fdf5e6', color: '#2b1d14', padding: { x: 6, y: 4 }
    }).setOrigin(0.5, 1).setDepth(3000).setVisible(false);

    this.ambientOverlay = this.add.rectangle(0, 0, MAP_W * 2, MAP_H * 2, 0x1a1438, 0)
      .setOrigin(0, 0).setDepth(2500);

    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.setZoom(1.22);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    UI.updateQuestText();
  }

  /* ─────────────────────────────────────────────────────────────────────────
   *  GREEN MEADOWS FARMHOUSE INTERACTION HANDLERS
   * ──────────────────────────────────────────────────────────────────────── */
  interactFarmerRafiq() {
    SoundEngine.heartUp();
    UI.startDialogue([
      {
        speaker: 'Chacha Rafiq',
        portrait: '🌾',
        text: 'Assalamu Alaikum, young travelers! Welcome to Green Meadows Farmhouse. Look at your giant furry companion! He looks like he loves fresh grass and hay!',
        choices: [
          {
            label: '🏡 "Chacha, tell us about your farmhouse and animals!"',
            nextNodes: [
              { speaker: 'Chacha Rafiq', portrait: '🌾', text: 'I have tended this land for forty seasons! To the left is Shuravi, our sweet dairy cow who gives rich organic milk.' },
              { speaker: 'Chacha Rafiq', portrait: '🌾', text: 'To the right is Kalu, the smartest Black Bengal goat in the district. And down by the pond, Tuntuni the hen and Piku the duckling enjoy the morning sun!' },
              { speaker: 'Totoro', portrait: '🐾', text: 'The heartbeat of the earth is pure and gentle here, Chacha Rafiq!' },
              { speaker: 'Chacha Rafiq', portrait: '🌾', text: 'Here, take this musical brass bell as a welcome gift from Green Meadows!' },
              {
                speaker: 'System',
                portrait: '🔔',
                text: 'Obtained Pastoral Brass Animal Bell (+5 ATK, +7 DEF)!',
                onComplete: () => {
                  if (!DateState.itemCounts.farm_bell) {
                    UI.giveItem('farm_bell', 'Gifted by Chacha Rafiq at Green Meadows Farmhouse.');
                  }
                }
              }
            ]
          },
          {
            label: '🥛 "Can we interact with Shuravi and the animals?"',
            nextNodes: [
              { speaker: 'Chacha Rafiq', portrait: '🌾', text: 'Of course! Go ahead and milk Shuravi, pet Kalu’s soft ears, search the coop for eggs, or toss puffed rice to Piku by the pond.' }
            ]
          }
        ]
      }
    ]);
  }

  interactCowShuravi() {
    SoundEngine.blip(260, 'sine');
    UI.startDialogue([
      {
        speaker: 'Shuravi the Cow',
        portrait: '🐄',
        text: 'Moo-o-o~! (Shuravi turns her gentle brown eyes toward you and swishes her tail contentedly.)',
        choices: [
          {
            label: '🥛 Gently milk Shuravi for fresh whole milk',
            nextNodes: [
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Easy does it, Shuravi... You are such a sweet, patient girl.' },
              { speaker: 'Totoro', portrait: '🐾', text: 'Moo-o-o~! (Totoro imitates her call with a big warm belly rumble!)' },
              { speaker: 'Shuravi the Cow', portrait: '🐄', text: 'Moo-o-o! (A generous pail fills with frothy, warm organic milk!)' },
              {
                speaker: 'System',
                portrait: '🥛',
                text: 'Obtained Lal Teer Organic Cow Milk (Restores 50 HP & 35 SP)!',
                onComplete: () => {
                  DateState.cowMilked = true;
                  DateState.sideQuests.sq_farm_animals = true;
                  UI.giveItem('fresh_milk', 'Milked fresh from Shuravi the Cow at Green Meadows.');
                }
              }
            ]
          },
          {
            label: '🌾 Feed Shuravi a bundle of sweet green grass',
            nextNodes: [
              { speaker: 'Shuravi the Cow', portrait: '🐄', text: 'Crunch, munch! (Shuravi nuzzles Moon Walker and Totoro’s hands with immense gratitude!)' }
            ]
          }
        ]
      }
    ]);
  }

  interactGoatKalu() {
    SoundEngine.blip(520, 'triangle');
    UI.startDialogue([
      {
        speaker: 'Kalu the Goat',
        portrait: '🐐',
        text: 'Maa-a-a! (Kalu hops playfully on his slender hooves and nudges your knee with his curved horn!)',
        choices: [
          {
            label: '🖐️ Scratch Kalu under his silky chin and goatee',
            nextNodes: [
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Who is the most handsome Bengal Black goat in the valley? You are, Kalu!' },
              { speaker: 'Kalu the Goat', portrait: '🐐', text: 'Maa-a-a~! (Kalu closes his amber eyes in pure bliss and rubs against your fingers.)' },
              { speaker: 'Totoro', portrait: '🐾', text: 'His fur is soft like monsoon moss! Animals remember every kind touch.' },
              {
                speaker: 'System',
                portrait: '✨',
                text: 'Kalu’s affection warms your heart! Date Bond increased.',
                onComplete: () => {
                  DateState.goatPetted = true;
                  SoundEngine.heartUp();
                  DateState.hearts = Math.min(5, DateState.hearts + 1);
                  UI.updateHearts();
                }
              }
            ]
          },
          {
            label: '🌿 Offer fresh banyan leaves',
            nextNodes: [
              { speaker: 'Kalu the Goat', portrait: '🐐', text: 'Maa-a! (Kalu nibbles the crunchy leaves enthusiastically from your palm!)' }
            ]
          }
        ]
      }
    ]);
  }

  interactChickenTuntuni() {
    SoundEngine.blip(680, 'sine');
    UI.startDialogue([
      {
        speaker: 'Tuntuni the Hen',
        portrait: '🐔',
        text: 'Bok-bok-bok-ba-GOK! (Tuntuni struts proudly across the coop bedding and fluffs her speckled amber feathers.)',
        choices: [
          {
            label: '🥚 Check the straw nest for a warm free-range egg',
            nextNodes: [
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Look Totoro, nestled right in the golden straw!' },
              { speaker: 'Tuntuni the Hen', portrait: '🐔', text: 'Bok-bok-bok! (Tuntuni pecks gently at your sleeve, giving her blessing.)' },
              {
                speaker: 'System',
                portrait: '🥚',
                text: 'Obtained Deshi Free-Range Egg (Restores 40 HP & 20 SP)!',
                onComplete: () => {
                  DateState.eggCollected = true;
                  UI.giveItem('golden_egg', 'Gathered from Tuntuni the Hen at Green Meadows Farmhouse.');
                }
              }
            ]
          },
          {
            label: '🌾 Scatter cracked corn on the ground',
            nextNodes: [
              { speaker: 'Tuntuni the Hen', portrait: '🐔', text: 'Peck, peck, peck! (Tuntuni clucks joyfully as she pecks every single grain!)' }
            ]
          }
        ]
      }
    ]);
  }

  interactDuckPiku() {
    SoundEngine.waterSplash();
    UI.startDialogue([
      {
        speaker: 'Piku the Duckling',
        portrait: '🦆',
        text: 'Quack! Quack-quack! (Piku paddels across the pond ripples, shaking water droplets from his fluffy white tail!)',
        choices: [
          {
            label: '🌾 Toss puffed rice (muri) into the pond ripples',
            nextNodes: [
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Here you go, little Piku! Crunchy Dhaka puffed rice!' },
              { speaker: 'Piku the Duckling', portrait: '🦆', text: 'Quack! Quack! (Piku dives playfully, scooping up the puffed rice in happy circles!)' },
              { speaker: 'Totoro', portrait: '🐾', text: 'Splash splash! Watching ducklings paddle brings instant tranquility to the mind.' },
              {
                speaker: 'System',
                portrait: '🦆',
                text: 'Piku does a joyful back-paddle spin! SP restored to maximum.',
                onComplete: () => {
                  DateState.duckFed = true;
                  DateState.sp = DateState.maxSp;
                  UI.updateRPGStats();
                  SoundEngine.heartUp();
                }
              }
            ]
          },
          {
            label: '🌊 Watch the ripples with Totoro',
            nextNodes: [
              { speaker: 'Totoro', portrait: '🐾', text: 'Clear blue water, floating lilies, and gentle breeze... This farm is a haven, Moon Walker.' }
            ]
          }
        ]
      }
    ]);
  }
  renderMinimap() {
    if (!this.minimapCanvas || !this.minimapCtx || !this.player) return;
    const cvs = this.minimapCanvas;
    const ctx = this.minimapCtx;
    const world = DateState.currentWorld || 'dhaka';
    const wCfg = WORLDS_DB[world] || WORLDS_DB.dhaka;

    const mapW = this.currentMapW || 2400;
    const mapH = this.currentMapH || 1800;
    const sx = cvs.width / mapW;
    const sy = cvs.height / mapH;

    // 1. Natural Base Terrain / Meadow
    ctx.fillStyle = wCfg.minimapColor || '#335e29';
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    // Subtle terrain texture lines / vignetted borders
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, cvs.width - 1, cvs.height - 1);

    if (world === 'dhaka') {
      // 2. Real Water Bodies: Dhanmondi Lake & Shorelines
      ctx.fillStyle = '#1e3a5f'; // Deep lake water
      ctx.fillRect(1568 * sx, 1040 * sy, 832 * sx, 760 * sy);
      ctx.fillStyle = '#38bdf8'; // Surface reflection shimmer
      ctx.fillRect(1600 * sx, 1080 * sy, 760 * sx, 3 * sy);
      ctx.fillRect(1640 * sx, 1200 * sy, 680 * sx, 2.5 * sy);
      ctx.fillRect(1580 * sx, 1380 * sy, 780 * sx, 2.5 * sy);

      // Lake Pier
      ctx.fillStyle = '#b45309';
      ctx.fillRect(1556 * sx, 1284 * sy, 384 * sx, 72 * sy);

      // 3. Real Road & Promenade Network
      ctx.fillStyle = '#d4b996'; // Warm paved pathways
      // East-West Thoroughfare
      ctx.fillRect(25 * sx, 772 * sy, 2175 * sx, 96 * sy);
      // West North-South Road (TSC -> Curzon)
      ctx.fillRect(432 * sx, 175 * sy, 96 * sx, 1450 * sy);
      // Central Spine
      ctx.fillRect(1012 * sx, 250 * sy, 96 * sx, 620 * sy);
      // East North-South Road
      ctx.fillRect(1472 * sx, 175 * sy, 96 * sx, 1450 * sy);
      // North Avenue
      ctx.fillRect(430 * sx, 278 * sy, 1100 * sx, 84 * sy);
      // North-East Food Bazaar Promenade
      ctx.fillRect(1472 * sx, 240 * sy, 380 * sx, 96 * sy);
      // Farmhouse Country Lane & West Branch
      ctx.fillRect(692 * sx, 1420 * sy, 96 * sx, 380 * sy);
      ctx.fillRect(480 * sx, 1420 * sy, 220 * sx, 72 * sy);

      // Road shoulder strokes
      ctx.strokeStyle = 'rgba(120, 80, 50, 0.4)';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(25 * sx, 772 * sy, 2175 * sx, 96 * sy);
      ctx.strokeRect(432 * sx, 175 * sy, 96 * sx, 1450 * sy);

      // 4. Distinct Landmark Buildings & Plinths
      // Curzon Hall Grand Complex (South-West)
      ctx.fillStyle = '#831843'; // Iconic Mughal brick-red
      ctx.fillRect((CURZON_X - 160) * sx, (CURZON_Y - 140) * sy, 320 * sx, 150 * sy);
      ctx.fillStyle = '#fef08a'; // Golden dome peaks
      ctx.beginPath();
      ctx.arc(CURZON_X * sx, (CURZON_Y - 140) * sy, 3, 0, Math.PI * 2);
      ctx.arc((CURZON_X - 110) * sx, (CURZON_Y - 125) * sy, 2.2, 0, Math.PI * 2);
      ctx.arc((CURZON_X + 110) * sx, (CURZON_Y - 125) * sy, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // TSC Complex & Adda
      ctx.fillStyle = '#065f46';
      ctx.fillRect(220 * sx, 220 * sy, 120 * sx, 90 * sy);

      // Aparajeyo Bangla Monument Plinth
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(630 * sx, 230 * sy, 60 * sx, 60 * sy);

      // Charukola Fine Arts
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(160 * sx, 690 * sy, 120 * sx, 90 * sy);

      // Nilkhet Book Market
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(990 * sx, 210 * sy, 140 * sx, 80 * sy);

      // Fuller Road Food Bazaar Stalls (Mama's Fuchka & Pabna Mishti Doi)
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(1540 * sx, 220 * sy, 60 * sx, 35 * sy);
      ctx.fillRect(1720 * sx, 220 * sy, 60 * sx, 35 * sy);

      // Phulwali Flower Cart & Ramna Park Garden
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(1240 * sx, 460 * sy, 40 * sx, 30 * sy);

      // Mintu Road Fountain Plaza Ring
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(1060 * sx, 820 * sy, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.fill();

      // Green Meadows Farmhouse Gateway Arch & Boundary Fences
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(500 * sx, 1485 * sy, 480 * sx, 4 * sy);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(644 * sx, 1475 * sy, 192 * sx, 16 * sy);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(660 * sx, 1480 * sy, 4 * sx, 4 * sy);
      ctx.fillRect(816 * sx, 1480 * sy, 4 * sx, 4 * sy);

    } else if (world === 'farmhouse') {
      // Farmhouse Layout: Central Yard, Pastures, Duck Pond, Barn & Silo
      ctx.fillStyle = '#c2a67e'; // Dirt Farmyard Roads
      ctx.fillRect(558 * sx, 230 * sy, 84 * sx, 580 * sy);
      ctx.fillRect(170 * sx, 446 * sy, 860 * sx, 68 * sy);

      // Duck Pond (South-East)
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(810 * sx, 570 * sy, 260 * sx, 180 * sy);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(840 * sx, 620 * sy, 190 * sx, 4 * sy);

      // Red Barn Complex (North Center)
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(507 * sx, 142 * sy, 186 * sx, 68 * sy);
      // Silo
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(460 * sx, 183 * sy, 6, 0, Math.PI * 2);
      ctx.fill();

      // Animal Paddocks Outline (Fences)
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1;
      ctx.strokeRect(176 * sx, 220 * sy, 280 * sx, 140 * sy); // Cow pasture
      ctx.strokeRect(736 * sx, 220 * sy, 280 * sx, 140 * sy); // Goat pasture
      ctx.strokeRect(173 * sx, 514 * sy, 190 * sx, 110 * sy); // Chicken coop

      // Southern Farmstead Boundary Fences & Grand Timber Gateway Arch
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(160 * sx, 846 * sy, 880 * sx, 4 * sy);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(504 * sx, 840 * sy, 192 * sx, 14 * sy);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(520 * sx, 843 * sy, 3 * sx, 3 * sy);
      ctx.fillRect(676 * sx, 843 * sy, 3 * sx, 3 * sy);

    } else if (world === 'curzon_interior') {
      // Parquet Interior & Velvet Carpet Runners
      ctx.fillStyle = '#451a03';
      ctx.fillRect(564 * sx, 260 * sy, 72 * sx, 540 * sy);
      ctx.fillRect(90 * sx, 472 * sy, 1020 * sx, 56 * sy);
      // Dais Platform
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(460 * sx, 190 * sy, 280 * sx, 70 * sy);
    } else {
      // Expedition Realms (Worlds 2 to 6)
      ctx.fillStyle = '#475569';
      ctx.fillRect(200 * sx, 845 * sy, 2000 * sx, 110 * sy);
      ctx.fillRect(1095 * sx, 250 * sy, 110 * sx, 1300 * sy);
      // Realm Lake
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(100 * sx, 1460 * sy, 2200 * sx, 320 * sy);
    }

    // 5. Draw Interactables (Golden star / diamond icons)
    this.interactables.forEach(it => {
      const ix = it.x * sx;
      const iy = it.y * sy;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(ix, iy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // 6. Draw Enemies & Boss Arena
    this.enemies.forEach(en => {
      const ex = en.x * sx;
      const ey = en.y * sy;
      if (en.isBoss) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(ex, ey, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#f87171';
        ctx.fillRect(ex - 1.5, ey - 1.5, 3, 3);
      }
    });

    // 7. Draw Totoro (Violet companion marker)
    if (this.totoro) {
      const tx = this.totoro.x * sx;
      const ty = this.totoro.y * sy;
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(tx, ty, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f3e8ff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 8. Draw Player (Radar ping beacon with glowing core)
    const px = this.player.x * sx;
    const py = this.player.y * sy;

    // Soft radar aura
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();

    // Sharp Player Point
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  update(time, delta) {
    if (!this.player) return;

    // Advance TimeCalendarSystem and AtmosphereSystem (Day/Night & Halos)
    if (this.timeCalendar) this.timeCalendar.update(delta);
    if (this.atmosphere) this.atmosphere.update(time, delta);

    // Render Monsoon Rain Drops & Slanted Streaks (Batched single draw call)
    if (this.isRaining && this.rainGraphics) {
      this.rainGraphics.clear();
      this.rainGraphics.lineStyle(1.6, 0xcdeffa, 0.65);
      const cam = this.cameras.main;
      const slant = -6;

      this.rainGraphics.beginPath();
      this.rainDrops.forEach(drop => {
        drop.y += (drop.speed * delta) / 1000;
        drop.x += (slant * drop.speed * delta) / 3000;
        if (drop.y > cam.scrollY + cam.height + 40) {
          drop.y = cam.scrollY - 30;
          drop.x = cam.scrollX + Phaser.Math.Between(-80, cam.width + 80);
        }
        this.rainGraphics.moveTo(drop.x, drop.y);
        this.rainGraphics.lineTo(drop.x + slant, drop.y + drop.len);
      });
      this.rainGraphics.strokePath();

      // Position Totoro's Taro Leaf over his head
      if (this.taroLeaf && this.totoro) {
        this.taroLeaf.setPosition(this.totoro.x, this.totoro.y - 68);
      }

      // Random distant lightning flash & thunder
      if (time > this.nextThunder) {
        this.nextThunder = time + Phaser.Math.Between(10000, 18000);
        this.cameras.main.flash(200, 240, 245, 255, true);
        SoundEngine.thunder();
      }
    }

    // Regenerate SP slowly
    if (DateState.sp < DateState.maxSp) {
      DateState.sp = Math.min(DateState.maxSp, DateState.sp + (delta / 1000) * 3.2);
      UI.updateRPGStats();
    }

    this.updateLakeBoat(time, delta);
    this.updateRickshawTour(time, delta);

    // Dynamic Evening Atmosphere in Dhaka Valley (past 6:30 PM / Milestone 6+)
    if (DateState.currentWorld === 'dhaka') {
      const completed = UI.getCompletedCount();
      const isEvening = completed >= 6;

      // 1. Lamp Brightness & Firefly Behavior
      if (isEvening && this.lampGlows) {
        this.lampGlows.forEach((g, idx) => {
          // Soft flickering halo on grass
          const flicker = 0.42 + Math.sin(time * 0.003 + idx) * 0.05;
          g.setAlpha(flicker);
        });

        // Swirling fireflies and moths around street lamps
        this.fireflies.forEach(f => {
          f.phase += (delta / 1000) * f.speed;
          const wobble = Math.sin(f.phase * 2.5) * 6;
          f.obj.x = f.baseX + Math.cos(f.phase) * f.orbitR;
          f.obj.y = f.baseY + Math.sin(f.phase) * (f.orbitR * 0.55) + wobble;
          f.obj.setAlpha(0.65 + Math.sin(f.phase * 4) * 0.35);
        });

        // 2. Evening Ambient Soundscape: Crickets & Distant Cycle Bells
        if (time > this.nextEveningAmbience && !UI.isOpen() && !this.cutsceneLocked) {
          this.nextEveningAmbience = time + Phaser.Math.Between(4500, 8500);
          if (Math.random() < 0.65) {
            SoundEngine.cricketChirp();
          } else {
            SoundEngine.distantRickshawBell();
          }
        }
      }

      // 3. Reflect Sky Tint onto Glossy Puddles
      if (this.ambientOverlay && this.puddles.length > 0) {
        const skyCol = this.ambientOverlay.fillColor;
        this.puddles.forEach(p => p.setTint(skyCol));
      }

      // 4. Periodic Lateral Krishnachura Wind Gusts across Curzon Lawn
      if (time > this.nextWindGust) {
        this.nextWindGust = time + Phaser.Math.Between(14000, 22000);
        this.triggerPetalWindGust();
      }
    }

    // 1. Animate Water & Petals
    if (this.lakeWater) {
      this.lakeWater.tilePositionX = Math.sin(time * 0.0012) * 14;
      this.lakeWater.tilePositionY += delta * 0.006;
    }
    if (this.petals) {
      this.petals.forEach(p => {
        p.obj.x += p.vx * (delta / 1000) + Math.sin(time * 0.003 + p.phase) * 0.3;
        p.obj.y += p.vy * (delta / 1000);
        if (p.obj.y > 1760) { p.obj.y = 20; p.obj.x = Phaser.Math.Between(60, 2340); }
        if (p.obj.x < 20) p.obj.x = 2340;
      });
    }

    // 2. Update Wandering Citizens
    const px = this.player.x, py = this.player.y;
    this.wanderers.forEach((w, idx) => {
      const distToPlayer = Phaser.Math.Distance.Between(px, py, w.x, w.y);
      if (UI.isOpen() || this.cutsceneLocked || distToPlayer < 68) {
        if (w.sprite.anims && w.sprite.anims.isPlaying) {
          w.sprite.anims.pause();
          w.sprite.setTexture(`${w.baseTex}-0`);
        }
        return;
      }
      if (w.sprite.anims && w.sprite.anims.isPaused) {
        w.sprite.anims.resume();
      }
      const target = w.waypoints[w.wpIdx];
      const dx = target.x - w.x, dy = target.y - w.y;
      const dist = Phaser.Math.Distance.Between(w.x, w.y, target.x, target.y);
      if (dist < 6) {
        w.wpIdx = (w.wpIdx + 1) % w.waypoints.length;
        if (w.sprite.anims && w.sprite.anims.isPlaying) {
          w.sprite.anims.stop();
          w.sprite.setTexture(`${w.baseTex}-0`);
        }
      } else {
        const step = (w.speed * delta) / 1000;
        w.x += (dx / dist) * step;
        w.y += (dy / dist) * step;
        w.sprite.setPosition(w.x, w.y).setDepth(w.y);

        let dir = 'down';
        if (Math.abs(dx) > Math.abs(dy)) {
          dir = dx < 0 ? 'left' : 'right';
        } else {
          dir = dy < 0 ? 'up' : 'down';
        }
        w.sprite.setFlipX(false);
        const walkKey = `${w.baseTex}-walk-${dir}`;
        if (this.anims.exists(walkKey)) {
          if (!w.sprite.anims.isPlaying || w.sprite.anims.currentAnim.key !== walkKey) {
            w.sprite.play(walkKey);
          }
        } else {
          const fallbackAnim = this.getOrCreateWalkAnim(w.baseTex, 4);
          if (fallbackAnim && (!w.sprite.anims.isPlaying || w.sprite.anims.currentAnim.key !== fallbackAnim)) {
            w.sprite.play(fallbackAnim);
          }
          if (Math.abs(dx) > 0.5) {
            w.sprite.setFlipX(dx < 0);
          }
        }
        w.badge.setPosition(w.x, w.y - w.sprite.height - 6).setDepth(w.y + 5);
      }
    });

    // 3. Update Enemy & Boss AI (animations handled automatically by Phaser)
    if (!UI.isOpen() && !this.cutsceneLocked) {
      this.enemies.forEach((en, idx) => {
        const dist = Phaser.Math.Distance.Between(px, py, en.x, en.y);
        const detectRange = en.isBoss ? 440 : 250;

        if (en.isBoss) {
          UI.setBossHUD(dist < 540, en.name, en.hp, en.maxHp);
        }

        // Stunned condition: if stunned by Totoro's Seismic Belly Slam, enemy cannot chase or attack
        if (en.stunnedUntil && time < en.stunnedUntil) {
          en.sprite.setAngle(Math.sin(time * 0.02) * 8);
          return;
        } else if (en.stunnedUntil) {
          en.stunnedUntil = 0;
          en.sprite.setAngle(0);
        }

        if (dist < detectRange && dist > 26) {
          // Chase Player
          const dx = px - en.x, dy = py - en.y;
          const step = (en.speed * delta) / 1000;
          en.x += (dx / dist) * step;
          en.y += (dy / dist) * step;
          en.sprite.setFlipX(dx < -1);
        } else if (!en.isBoss) {
          // Gentle Patrol Orbit Around Home Position when Idle
          const patrolAng = time * 0.0012 + idx * 1.7;
          const tx = en.homeX + Math.cos(patrolAng) * 28;
          const ty = en.homeY + Math.sin(patrolAng) * 18;
          const dx = tx - en.x, dy = ty - en.y;
          en.x += dx * 0.03;
          en.y += dy * 0.03;
          en.sprite.setFlipX(dx < -0.2);
        }

        // Subtle breathing/floating bob + update depth & label
        const floatBob = Math.sin(time * 0.005 + idx) * (en.isBoss ? 2.5 : 1.2);
        en.sprite.setPosition(en.x, en.y + floatBob).setDepth(en.y);
        en.label.setPosition(en.x, en.y - (en.isBoss ? 114 : 54)).setDepth(en.y + 5);

        // Contact / Melee Attack on Player with Lunge Animation
        if (dist < (en.isBoss ? 56 : 36) && time - en.lastHitPlayer > 1100) {
          en.lastHitPlayer = time;
          this.tweens.add({
            targets: en.sprite,
            scaleX: 1.22,
            scaleY: 1.22,
            duration: 95,
            yoyo: true
          });
          const rawDmg = Math.max(2, en.atk - RPGStats.getDef());
          DateState.hp = Math.max(0, DateState.hp - rawDmg);
          SoundEngine.playerHurt();
          this.spawnDamageNumber(px, py - 54, `-${rawDmg}`, '#ff4d6d');
          UI.updateRPGStats();

          if (DateState.hp <= 0) {
            DateState.hp = DateState.maxHp;
            DateState.sp = DateState.maxSp;
            UI.updateRPGStats();
            const spawnPos = DateState.currentWorld === 'dhaka' ? { x: 480, y: 1380 } : { x: 340, y: 900 };
            this.player.setPosition(spawnPos.x, spawnPos.y);
            if (this.player.body) this.player.body.reset(spawnPos.x, spawnPos.y);
            this.trail = Array(16).fill({ x: spawnPos.x, y: spawnPos.y });
            if (this.totoro) this.totoro.setPosition(spawnPos.x, spawnPos.y);
            if (this.totoroBadge) this.totoroBadge.setPosition(spawnPos.x, spawnPos.y - 68);
            UI.showToast('🐾', 'Totoro Rescued You!', 'Restored to full health at the realm entrance.');
          }
        }
      });
    }

    if (UI.isOpen() || this.cutsceneLocked) {
      this.player.setVelocity(0, 0);
      if (this.player.anims && this.player.anims.isPlaying) {
        this.player.stop();
        this.player.setTexture('player-0');
      }
      if (this.promptBubble) this.promptBubble.setVisible(false);
      return;
    }

    // 4. Player Movement (Keyboard + Analog Joystick)
    const isSwift = this.swiftnessUntil && time < this.swiftnessUntil;
    const speed = isSwift ? 275 : 225;
    let vx = 0, vy = 0;

    if (this.joyVector && (this.joyVector.x !== 0 || this.joyVector.y !== 0)) {
      vx = this.joyVector.x * speed;
      vy = this.joyVector.y * speed;
    } else {
      if (this.cursors.left.isDown || this.keys.a.isDown || this.touchDir.left) vx = -speed;
      else if (this.cursors.right.isDown || this.keys.d.isDown || this.touchDir.right) vx = speed;

      if (this.cursors.up.isDown || this.keys.w.isDown || this.touchDir.up) vy = -speed;
      else if (this.cursors.down.isDown || this.keys.s.isDown || this.touchDir.down) vy = speed;

      if (vx !== 0 && vy !== 0) {
        vx *= 0.7071;
        vy *= 0.7071;
      }
    }
    this.player.setVelocity(vx, vy);
    this.player.setDepth(this.player.y);

    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      const mag = Phaser.Math.Distance.Between(0, 0, vx, vy) || 1;
      this.facingVec = { x: vx / mag, y: vy / mag };

      // Swiftness speed sparkles
      if (isSwift && Math.random() < 0.28) {
        const spk = this.add.text(px + (Math.random() - 0.5) * 16, py - 12, '✨', { fontSize: '10px' }).setDepth(py - 1);
        this.tweens.add({ targets: spk, alpha: 0, y: py - 26, duration: 240, onComplete: () => spk.destroy() });
      }
    }
    let pDir = 'down';
    if (Math.abs(vx) > Math.abs(vy)) {
      pDir = vx < 0 ? 'left' : 'right';
    } else if (Math.abs(vy) > 0) {
      pDir = vy < 0 ? 'up' : 'down';
    }
    this.player.setFlipX(false);

    if (moving) {
      this.stepCounter += delta;
      const pWalkKey = `player-walk-${pDir}`;
      const targetAnim = this.anims.exists(pWalkKey) ? pWalkKey : 'player-walk';
      if (!this.player.anims.isPlaying || this.player.anims.currentAnim.key !== targetAnim) {
        this.player.play(targetAnim);
      }

      if (this.stepCounter > 250) {
        this.stepCounter = 0;
        const onPier = DateState.currentWorld === 'dhaka' && px > 1550 && py >= 1290 && py <= 1350;
        const inPuddle = this.isRaining && this.puddles.some(p => Phaser.Math.Distance.Between(px, py, p.x, p.y) < 26);
        const onPath = (py > 770 && py < 870) || (px > 430 && px < 530) || (px > 1470 && px < 1570);

        if (inPuddle) {
          SoundEngine.step('puddle');
          this.spawnWaterRipple(px, py, 22, 0);
        } else {
          SoundEngine.step(onPier ? 'pier' : onPath ? 'path' : 'grass');
        }
      }
    } else {
      if (this.player.anims.isPlaying) {
        this.player.stop();
        const pIdleKey = `player-idle-${pDir}`;
        if (this.anims.exists(pIdleKey)) {
          this.player.play(pIdleKey);
        } else {
          this.player.setTexture('player-0');
        }
      }
    }

    // 5. Auto-trigger Ahona & Apshora Act I Ambush in Dhaka Valley
    if (DateState.currentWorld === 'dhaka' && DateState.totoroJoined && !DateState.bulliesDefeated && !this.cutsceneLocked && this.ahona) {
      if (Phaser.Math.Distance.Between(px, py, this.ahona.x + 24, this.ahona.y + 10) < 85) {
        this.interactAhonaApshora();
        return;
      }
    }

    // 6. Companion Following Logic
    if (DateState.totoroJoined && this.totoro) {
      if (this.totoroBusyUntil && time < this.totoroBusyUntil) {
        // Totoro is performing active combat animation (Leap, Slam, Roar) - preserve animation & transform
      } else {
        const head = this.trail[0];
        if (!head || Phaser.Math.Distance.Between(px, py, head.x, head.y) > 4) {
          this.trail.unshift({ x: px, y: py });
          if (this.trail.length > 15) {
            const target = this.trail.pop();
            const tdx = target.x - this.totoro.x;
            const tdy = target.y - this.totoro.y;
            this.totoro.setPosition(target.x, target.y);

            let tDir = 'down';
            if (Math.abs(tdx) > Math.abs(tdy)) {
              tDir = tdx < 0 ? 'left' : 'right';
            } else if (Math.abs(tdy) > 0) {
              tDir = tdy < 0 ? 'up' : 'down';
            }
            this.totoroLastDir = tDir;
            this.totoro.setFlipX(false);
            const tWalkKey = `totoro-walk-${tDir}`;
            const targetAnim = moving ? (this.anims.exists(tWalkKey) ? tWalkKey : 'totoro-walk') : 'totoro-idle';
            if (!this.totoro.anims.isPlaying || this.totoro.anims.currentAnim.key !== targetAnim) {
              this.totoro.play(targetAnim);
            }
          }
        }
        if (!moving) {
          const tIdleKey = `totoro-idle-${this.totoroLastDir || 'down'}`;
          const targetIdle = this.anims.exists(tIdleKey) ? tIdleKey : 'totoro-idle';
          if (!this.totoro.anims.isPlaying || this.totoro.anims.currentAnim.key !== targetIdle) {
            this.totoro.play(targetIdle);
          }
        }
        this.totoro.setDepth(this.totoro.y);
        this.totoroBadge.setPosition(this.totoro.x, this.totoro.y - this.totoro.height - 4);
      }
    } else if (this.totoro) {
      if (!this.totoro.anims.isPlaying || this.totoro.anims.currentAnim.key !== 'totoro-idle') {
        this.totoro.play('totoro-idle');
      }
      this.totoroBadge.setPosition(this.totoro.x, this.totoro.y - this.totoro.height - 4);
    }

    // 7. Update Zone Name in Top-Left HUD
    if (DateState.currentWorld === 'curzon_interior') {
      if (px < 460) UI.setZone('Bose Quantum Laboratory (Physics)');
      else if (px > 740) UI.setZone('Botanical Herbarium & Chemistry Lab');
      else UI.setZone('Curzon Auditorium & Mathematics Dais');
    } else if (DateState.currentWorld === 'farmhouse') {
      if (px < 420 && py < 450) UI.setZone('Dairy Cow Pasture 🐄');
      else if (px > 780 && py < 450) UI.setZone('Bengal Goat Grazing Pen 🐐');
      else if (px < 450 && py >= 450) UI.setZone('Free-Range Hen Coop 🐔');
      else if (px > 750 && py >= 450) UI.setZone('Pondside Duck Meadow 🦆');
      else UI.setZone('Green Meadows Farmhouse Yard 🏡');
    } else if (DateState.currentWorld !== 'dhaka') {
      UI.setZone(WORLDS_DB[DateState.currentWorld].name);
    } else {
      if (px < 650 && py > 1050) UI.setZone('Curzon Hall Lawn');
      else if (px < 560 && py < 450) UI.setZone('TSC Adda & Tea Stall');
      else if (px >= 560 && px < 880 && py < 450) UI.setZone('Aparajeyo Bangla');
      else if (px < 420 && py >= 450 && py <= 1050) UI.setZone('Charukola Fine Arts');
      else if (px >= 880 && px < 1350 && py < 420) UI.setZone('Nilkhet Book Lane');
      else if (px >= 1180 && px < 1480 && py >= 420 && py < 740) UI.setZone('Ramna Park & Flower Cart');
      else if (px >= 1450 && py < 420) UI.setZone("Mama's Fuchka Corner");
      else if (px >= 1680 && py >= 420 && py < 960) UI.setZone('Old Dhaka Sweet Cart');
      else if (px >= 1520 && py >= 1020) UI.setZone('Dhanmondi Lake Pier');
      else UI.setZone('Fuller Road Fountain Plaza');
    }

    // 8. Floating Interaction Prompt
    let nearTarget = null, bestDist = Infinity;
    if (!DateState.totoroJoined && this.totoro && Phaser.Math.Distance.Between(px, py, this.totoro.x, this.totoro.y) < 92) {
      nearTarget = 'SPACE: Meet Totoro 🐾';
    } else {
      for (const item of this.interactables) {
        const d = Phaser.Math.Distance.Between(px, py, item.x, item.y);
        if (d < item.radius && d < bestDist) {
          bestDist = d;
          nearTarget = `SPACE: ${item.name}`;
        }
      }
    }

    if (nearTarget) {
      this.promptBubble.setText(nearTarget);
      this.promptBubble.setPosition(px, py - 62);
      this.promptBubble.setVisible(true);
    } else {
      this.promptBubble.setVisible(false);
    }

    // Layer 0: Pokémon HGSS Vertical Water Reflections near Dhanmondi Lake
    if (this.playerReflection) {
      const nearLake = (DateState.currentWorld === 'dhaka' && px >= 1550 && px <= 2560 && py >= 1020 && py <= 1920);
      if (nearLake) {
        this.playerReflection.setVisible(true);
        this.playerReflection.setPosition(px + Math.sin(time * 0.004) * 2, py + 12);
        if (this.player.frame) this.playerReflection.setFrame(this.player.frame.name);
        this.playerReflection.setFlipX(this.player.flipX);
        this.playerReflection.setAlpha(0.22);
      } else {
        this.playerReflection.setVisible(false);
      }
    }

    // Layer 3: Interactive Ground Foliage Rustling & Petal Particles
    if (this.interactiveFoliage && this.interactiveFoliage.length > 0) {
      for (const f of this.interactiveFoliage) {
        if (f.isRustling) continue;
        const dist = Phaser.Math.Distance.Between(px, py, f.x, f.y);
        if (dist < 22) {
          f.isRustling = true;
          this.tweens.add({
            targets: f.sprite,
            angle: { from: -10, to: 10 },
            duration: 65,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
              f.sprite.angle = 0;
              this.time.delayedCall(350, () => { f.isRustling = false; });
            }
          });
          const petal = this.add.circle(f.x + Phaser.Math.Between(-6, 6), f.y - 12, 2, 0xf43f5e, 0.85).setDepth(f.y + 10);
          this.tweens.add({
            targets: petal,
            y: petal.y - 18,
            x: petal.x + Phaser.Math.Between(-12, 12),
            alpha: 0,
            duration: 380,
            onComplete: () => petal.destroy()
          });
        }
      }
    }

    // Layer 5: Overhead Canopies & Roofs Alpha Fading (smoothly lerps to 0.42 when Moon Walker walks behind)
    if (this.overheadCanopies && this.overheadCanopies.length > 0) {
      for (const c of this.overheadCanopies) {
        if (!c.sprite || !c.sprite.active) continue;
        const inside = (px >= c.minX && px <= c.maxX && py >= c.minY && py <= c.maxY);
        const targetAlpha = inside ? 0.42 : 1.0;
        c.sprite.alpha = Phaser.Math.Linear(c.sprite.alpha, targetAlpha, 0.12);
      }
    }

    // Layer 6: Stardew Valley 32x32 Grid Tile Cursor
    if (this.tileCursor) {
      if (UI.isOpen() || this.cutsceneLocked) {
        this.tileCursor.clear();
      } else {
        const targetCol = Math.floor((px + this.facingVec.x * 24) / 32);
        const targetRow = Math.floor((py + this.facingVec.y * 24) / 32);
        const cx = targetCol * 32;
        const cy = targetRow * 32;

        this.tileCursor.clear();
        const pulse = 0.75 + Math.sin(time * 0.006) * 0.2;
        this.tileCursor.lineStyle(2, 0xfde68a, pulse);
        this.tileCursor.strokeRect(cx, cy, 32, 32);

        this.tileCursor.lineStyle(2, 0xffffff, Math.min(1.0, pulse + 0.15));
        const b = 6;
        // Corner brackets
        this.tileCursor.beginPath();
        // Top-left
        this.tileCursor.moveTo(cx, cy + b); this.tileCursor.lineTo(cx, cy); this.tileCursor.lineTo(cx + b, cy);
        // Top-right
        this.tileCursor.moveTo(cx + 32 - b, cy); this.tileCursor.lineTo(cx + 32, cy); this.tileCursor.lineTo(cx + 32, cy + b);
        // Bottom-left
        this.tileCursor.moveTo(cx, cy + 32 - b); this.tileCursor.lineTo(cx, cy + 32); this.tileCursor.lineTo(cx + b, cy + 32);
        // Bottom-right
        this.tileCursor.moveTo(cx + 32 - b, cy + 32); this.tileCursor.lineTo(cx + 32, cy + 32); this.tileCursor.lineTo(cx + 32, cy + 32 - b);
        this.tileCursor.strokePath();
      }
    }

    // 9. Update Live Minimap (throttled to ~16 FPS to avoid per-frame CPU canvas redraws)
    if (time - this.lastMinimapUpdate > 60) {
      this.lastMinimapUpdate = time;
      this.renderMinimap();
    }
  }

}

if (typeof window !== 'undefined') {
  (window as any).DhakaValleyScene = DhakaValleyScene;
}
