// src/scenes/DhakaValleyScene.ts - Main Phaser.Scene integrating Graphics, Systems, Audio, and UI
// Migrated 100% intact from game.js
import Phaser from 'phaser';
import { TextureGenerator } from '../graphics/TextureGenerator';
import { ExternalAssetAdapter } from '../graphics/ExternalAssetAdapter';
import { DateState } from '../state/DateState';
import { RPGStats } from '../state/RPGStats';
import { SoundEngine } from '../audio/SoundEngine';
import { UI } from '../ui/UIController';
import { ITEMS_DB } from '../config/items.db';
import { WORLDS_DB } from '../config/worlds.db';
import {
  CURZON_K,
  CURZON_X,
  CURZON_Y,
  DHAKA_MAP_WIDTH,
  DHAKA_MAP_HEIGHT,
  CURZON_INTERIOR_WIDTH,
  CURZON_INTERIOR_HEIGHT,
  FARMHOUSE_WIDTH,
  FARMHOUSE_HEIGHT
} from '../config/constants';
import { CombatSystem } from '../systems/CombatSystem';
import { ScheduleSystem } from '../systems/ScheduleSystem';
import { TimeCalendarSystem } from '../systems/TimeCalendarSystem';
import { FarmingSystem } from '../systems/FarmingSystem';
import { AtmosphereSystem } from '../systems/AtmosphereSystem';
import { PlayerBehaviors } from '../systems/player/PlayerBehaviors';
import { OpeningDialogueSystem } from '../systems/OpeningDialogueSystem';
import { RickshawTourEngine, StargazingEngine, LakeBoatEngine, TotoroKartEngine } from './minigames';
import { MinimapRenderer, InteriorBuilder } from './world';
import { CampusRomanceQuests } from './quests';

export class DhakaValleyScene extends Phaser.Scene {
  [key: string]: any;

  constructor() {
    super('DhakaValleyScene');
    this.currentOpeningScenario = null;
    this.playerBehaviors = null;
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
      frames: [{ key: 'prop-doicart-0' }, { key: 'prop-doicart-1' }, { key: 'prop-doicart-2' }, { key: 'prop-doicart-3' }],
      frameRate: 3,
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
    (window as any).__activeScene = this;
    (window as any).DateState = DateState;
    (window as any).RPGStats = RPGStats;
    (window as any).CombatSystem = CombatSystem;
    (window as any).UI = UI;
    (window as any).__startRace = () => this.startTotoroKart();
    if (typeof window !== 'undefined' && !(window as any).__race) {
      (window as any).__race = {
        start: () => this.startTotoroKart(),
        isActive: () => false,
        exit: () => {},
        toggleOverlay: () => {},
        stats: () => null
      };
    }
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
    this.farming = this.farmingSystem;

    // Initialize Living-World NPC Behavior Engine
    this.scheduleSystem = new ScheduleSystem(this);

    // Initialize Dynamic Player Behaviors Engine
    this.playerBehaviors = new PlayerBehaviors(this);

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
    this.input.keyboard.on('keydown-E', e => {
      if (!e.repeat) {
        if (this.currentInteractable) {
          this.handleActionPress();
        } else {
          CombatSystem.performTotoroGroundSlam(this);
        }
      }
    });
    this.input.keyboard.on('keydown-J', e => {
      if (!e.repeat) {
        CombatSystem.performPlayerAttack(this);
        this.jHoldTimer = this.time.delayedCall(160, () => {
          CombatSystem.startGuard(this);
        });
      }
    });
    this.input.keyboard.on('keyup-J', () => {
      if (this.jHoldTimer) this.jHoldTimer.remove();
      CombatSystem.stopGuard(this);
    });
    this.input.keyboard.on('keydown-K', e => { if (!e.repeat) CombatSystem.performPlayerDash(this); });
    this.input.keyboard.on('keydown-SHIFT', e => { if (!e.repeat) CombatSystem.performPlayerDash(this); });
    this.input.keyboard.on('keydown-Q', e => { if (!e.repeat) CombatSystem.performTotoroRoar(this); });
    this.input.keyboard.on('keydown-R', e => { if (!e.repeat) CombatSystem.performTotoroGroundSlam(this); });
    this.input.keyboard.on('keydown-F', e => { if (!e.repeat) CombatSystem.performTotoroLeafGust(this); });
    this.input.keyboard.on('keydown-I', e => { if (!e.repeat && !UI.isOpen()) UI.openRPGMenu('inventory'); });
    this.input.keyboard.on('keydown-M', e => { if (!e.repeat && !UI.isOpen()) UI.openRPGMenu('map'); });
    this.input.keyboard.on('keydown-L', e => { if (!e.repeat && !UI.isOpen()) UI.openRPGMenu('quests'); });

    this.input.on('pointerdown', pointer => {
      if (!UI.isOpen()) {
        if (pointer.leftButtonDown()) {
          CombatSystem.performPlayerAttack(this);
        } else if (pointer.rightButtonDown()) {
          CombatSystem.startGuard(this);
        }
      }
    });
    this.input.on('pointerup', pointer => {
      if (pointer.rightButtonReleased()) {
        CombatSystem.stopGuard(this);
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
      const defaultSpawn = worldId === 'dhaka'
        ? { x: 480, y: 1380 }
        : (worldId === 'curzon_interior' || worldId === 'farmhouse'
            ? { x: 600, y: 780 }
            : { x: 340, y: 900 });
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
      { x: 208, y: 1328, r: 165 },                      // Curzon Hall courtyard
      { x: 272, y: 272, r: 135 },                       // TSC Tea Stall adda
      { x: 656, y: 272, r: 105 },                       // Aparajeyo Bangla Monument
      { x: 208, y: 752, r: 135 },                       // Charukola Fine Arts
      { x: 1072, y: 240, r: 130 },                      // Nilkhet Book Lane
      { x: 1072, y: 816, r: 120 },                      // Mintu Road Fountain Plaza
      { x: 1216, y: 512, r: 110, isFlowerCart: true },  // Phulwali Flower Cart (West Ramna Promenade)
      { x: 1472, y: 464, r: 95, isRamnaBench: true },   // Shaded Ramna Park Bench Clearing
      { x: 1584, y: 240, r: 110 },                      // Mama's Fuchka Cart (Food Bazaar)
      { x: 1744, y: 240, r: 110 },                      // Pabna Mishti Doi (Food Bazaar)
      { x: 1648, y: 816, r: 105 },                      // Rickshaw Stand
      { x: 2192, y: 816, r: 110 },                      // Whispering Forest Portal Sanctuary
    ];

    // ── Redesigned Multi-Type Road & Garden Trail Corridors (Snapped to 32x32) ──
    const paths = [
      { x: 224, y: 768, w: 1968, h: 96 },               // Main East-West Fuller Rd boulevard (Charukola to Portal)
      { x: 416, y: 256, w: 96, h: 1216 },               // West DU Heritage Brick road (TSC to Curzon/Farm junction)
      { x: 208, y: 1296, w: 256, h: 96 },               // Curzon Hall Mughal Brick Forecourt
      { x: 1024, y: 256, w: 96, h: 560 },               // Central Nilkhet Brick spine
      { x: 1472, y: 256, w: 96, h: 1104 },              // East North-South Lakeside promenade
      { x: 256, y: 248, w: 1536, h: 88 },               // Continuous North Brick Avenue (TSC -> Nilkhet -> Food Bazaar)
      { x: 1072, y: 464, w: 784, h: 64 },               // Ramna Park Stepping-Stone Trail (Nilkhet -> Flower Cart -> Upper Pond)
      { x: 736, y: 1184, w: 784, h: 64 },               // Botanical Lotus Pond North Stepping-Stone Walk
      { x: 688, y: 1408, w: 96, h: 352 },               // Farmhouse Country Dirt-Cobble Lane
      { x: 464, y: 1408, w: 272, h: 88 },               // West connecting lane to Farmhouse Gate
    ];

    // ── Redesigned Multi-Body Water Zones (Dhanmondi Lake + Coves + Ramna Canal + Botanical Lotus Pond) ──
    const waterBodies = [
      { x: 1568, y: 1056, w: 832, h: 744 },             // Dhanmondi Lake Main Deep Basin
      { x: 1728, y: 928, w: 672, h: 128 },              // Dhanmondi Lake Northern Cove
      { x: 1440, y: 1504, w: 128, h: 296 },             // Dhanmondi Lake Southern Inlet
      { x: 1856, y: 384, w: 224, h: 144 },              // Upper Ramna Lotus Pond
      { x: 1920, y: 528, w: 80, h: 400 },               // Serpentine Ramna-Dhanmondi Canal
      { x: 1088, y: 1248, w: 256, h: 160 },             // Curzon Botanical Lotus Pond (Shapla Dighi)
    ];

    // ── Build Tile Grid ──
    const data = [];
    for (let row = 0; row < ROWS; row++) {
      const tileRow = [];
      for (let col = 0; col < COLS; col++) {
        const wx = col * TILE + TILE / 2;
        const wy = row * TILE + TILE / 2;
        const rTile = makeRng(row * 10007 + col * 31 + 999);
        const rnd = rTile();

        // 1. Inside any water body: Plain grass/earth foundation tile under water surface
        let inWater = false;
        let nearWaterShore = false;
        for (const wb of waterBodies) {
          if (wx >= wb.x && wx <= wb.x + wb.w && wy >= wb.y && wy <= wb.y + wb.h) {
            inWater = true;
            break;
          }
          if (wx >= wb.x - 56 && wx <= wb.x + wb.w + 56 && wy >= wb.y - 56 && wy <= wb.y + wb.h + 56) {
            nearWaterShore = true;
          }
        }
        if (inWater) {
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

        // 4. Water Shoreline Fringe (within 56px of any water body edge)
        const nearLakeShore = nearWaterShore;

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
      else if (tex === 'prop-fountain') {
        // Dynamic fountain water pulsing
        this.tweens.add({
          targets: sp,
          scaleX: { from: 1, to: 1.018 },
          scaleY: { from: 1, to: 1.025 },
          duration: 1400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        // Ambient fountain mist droplets
        this.time.addEvent({
          delay: 380,
          loop: true,
          callback: () => {
            if (!sp.active) return;
            const drop = this.add.circle(x + (Math.random() - 0.5) * 32, y - 46 - Math.random() * 16, 2, 0x81d4fa, 0.7).setDepth(y + 2);
            this.tweens.add({
              targets: drop,
              y: drop.y + 14,
              alpha: 0,
              duration: 420 + Math.random() * 180,
              onComplete: () => drop.destroy()
            });
          }
        });
      } else if (tex === 'prop-teastall') {
        // Rising aromatic tea steam motes
        this.time.addEvent({
          delay: 550,
          loop: true,
          callback: () => {
            if (!sp.active) return;
            const steam = this.add.circle(x - 24 + (Math.random() - 0.5) * 10, y - 44, 2.5, 0xffffff, 0.45).setDepth(y + 2);
            this.tweens.add({
              targets: steam,
              y: steam.y - 18,
              x: steam.x + (Math.random() - 0.5) * 8,
              alpha: 0,
              scale: 1.7,
              duration: 850,
              onComplete: () => steam.destroy()
            });
          }
        });
      } else if (tex === 'prop-curzon') {
        this.tweens.add({
          targets: sp,
          alpha: { from: 0.96, to: 1.0 },
          duration: 3200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      } else if (tex === 'prop-monument') {
        this.tweens.add({
          targets: sp,
          scaleY: { from: 1, to: 1.012 },
          duration: 2600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }

      // Layer 5: Register overhead canopies for smooth alpha fading (0.42) when walking behind
      if (tex.includes('tree')) {
        this.overheadCanopies.push({
          sprite: sp,
          minX: x - 48,
          maxX: x + 48,
          minY: y - 110,
          maxY: y - 10
        });
        // Gentle canopy wind sway
        this.tweens.add({
          targets: sp,
          angle: { from: -1.2, to: 1.2 },
          duration: 2500 + Math.random() * 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Math.random() * 1000
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
          // Stationary interactable NPC: rhythmic breathing so they are alive & dynamic
          this.tweens.add({
            targets: sp,
            scaleY: { from: 1, to: 1.025 },
            duration: 1600 + Math.random() * 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: Math.random() * 600
          });
        } else if (tex === 'prop-rickshaw') {
          // Dynamic rickshaw suspension bounce
          this.tweens.add({
            targets: sp,
            scaleY: { from: 1, to: 1.02 },
            y: { from: y, to: y - 1.5 },
            duration: 1800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        } else if (tex === 'prop-telescope') {
          // Brass telescope twinkle sparkle
          this.time.addEvent({
            delay: 2400,
            loop: true,
            callback: () => {
              if (!sp.active) return;
              const glint = this.add.text(x + 10, y - 46, '✨', { fontSize: '10px' }).setDepth(y + 2);
              this.tweens.add({
                targets: glint,
                alpha: 0,
                y: glint.y - 12,
                duration: 650,
                onComplete: () => glint.destroy()
              });
            }
          });
        }
      }
      const badgeY = sp ? y - sp.height - 8 : y - 58;
      const isShop = name.includes('Mama') || name.includes('Cha') || name.includes('Fuchka') || name.includes('Doi') || name.includes('Gajra') || name.includes('Book') || name.includes('Clay') || name.includes('Tour');
      const badge = this.add.text(x, badgeY, '💬 ' + name, {
        fontFamily: "'Rajdhani', 'Outfit', sans-serif",
        fontSize: '12px',
        fontStyle: 'bold',
        backgroundColor: isShop ? 'rgba(120, 53, 15, 0.90)' : 'rgba(28, 20, 16, 0.88)',
        color: isShop ? '#fef3c7' : '#fdf5e6',
        stroke: '#140f0c',
        strokeThickness: 3,
        shadow: { offsetX: 0, offsetY: 2, color: 'rgba(0, 0, 0, 0.65)', blur: 4, stroke: true, fill: true },
        padding: { x: 8, y: 3 }
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

    this.extraWaterSprites = [];

    if (worldId === 'dhaka') {
      // --- WORLD 1: DHAKA VALLEY (Multi-Type Pathways, Natural Endings & Organic Water Network) ---

      // Helper for Horizontal Paved Corridors with Dressed Curbs, Rounded Arch Caps & Stepping-Stone Dissipation
      const addPathH = (
        cx: number, cy: number, w: number, h: number, tex: string,
        capW: 'stone' | 'brick' | 'dirt' | null = null,
        capE: 'stone' | 'brick' | 'dirt' | null = null,
        withCurbs = true
      ) => {
        this.add.tileSprite(cx, cy, w, h, tex).setDepth(1.1);
        if (withCurbs) {
          this.add.tileSprite(cx, cy - h / 2, w, 12, 'tile-curb-h').setDepth(1.25);
          this.add.tileSprite(cx, cy + h / 2, w, 12, 'tile-curb-h').setDepth(1.25);
        }
        if (capW) {
          this.add.sprite(cx - w / 2 + 2, cy, `path-cap-${capW}-w`).setOrigin(1, 0.5).setDepth(1.3);
          this.add.sprite(cx - w / 2 - 42, cy, 'prop-stepping-trail-h').setOrigin(1, 0.5).setFlipX(true).setDepth(1.05);
        }
        if (capE) {
          this.add.sprite(cx + w / 2 - 2, cy, `path-cap-${capE}-e`).setOrigin(0, 0.5).setDepth(1.3);
          this.add.sprite(cx + w / 2 + 42, cy, 'prop-stepping-trail-h').setOrigin(0, 0.5).setDepth(1.05);
        }
      };

      // Helper for Vertical Paved Corridors with Dressed Curbs, Rounded Arch Caps & Stepping-Stone Dissipation
      const addPathV = (
        cx: number, cy: number, w: number, h: number, tex: string,
        capN: 'stone' | 'brick' | 'dirt' | null = null,
        capS: 'stone' | 'brick' | 'dirt' | null = null,
        withCurbs = true
      ) => {
        this.add.tileSprite(cx, cy, w, h, tex).setDepth(1.1);
        if (withCurbs) {
          this.add.tileSprite(cx - w / 2, cy, 12, h, 'tile-curb-v').setDepth(1.25);
          this.add.tileSprite(cx + w / 2, cy, 12, h, 'tile-curb-v').setDepth(1.25);
        }
        if (capN) {
          this.add.sprite(cx, cy - h / 2 + 2, `path-cap-${capN}-n`).setOrigin(0.5, 1).setDepth(1.3);
          this.add.sprite(cx, cy - h / 2 - 42, 'prop-stepping-trail-v').setOrigin(0.5, 1).setFlipY(true).setDepth(1.05);
        }
        if (capS) {
          this.add.sprite(cx, cy + h / 2 - 2, `path-cap-${capS}-s`).setOrigin(0.5, 0).setDepth(1.3);
          this.add.sprite(cx, cy + h / 2 + 42, 'prop-stepping-trail-v').setOrigin(0.5, 0).setDepth(1.05);
        }
      };

      // ── 1. PATHWAY TYPE 4: Ramna Garden Stepping Stones & Laterite Pebble Trails (Depth 1.0) ──
      // Ramna Park Flower Cart & Bench Garden Trail (Nilkhet Spine -> Flower Cart -> East Promenade -> Upper Ramna Pond)
      this.add.tileSprite(1464, 480, 784, 56, 'tile-path-stepping').setDepth(1.0);
      this.add.sprite(1856, 480, 'prop-stepping-trail-h').setOrigin(0, 0.5).setDepth(1.05);
      // Curzon Botanical Lotus Pond Garden Walk (West DU Avenue -> Botanical Pond -> Lakeside Pierhead)
      this.add.tileSprite(1128, 1208, 784, 56, 'tile-path-stepping').setDepth(1.0);
      this.add.tileSprite(960, 1328, 56, 240, 'tile-path-stepping').setDepth(1.0);

      // ── 2. PATHWAY TYPE 2: Mughal Heritage Red-Brick Herringbone Avenues ('tile-path-brick') ──
      // Continuous Northern Academic & Bazaar Brick Avenue (TSC -> Aparajeyo Bangla -> Nilkhet -> Food Bazaar)
      addPathH(1016, 288, 1520, 88, 'tile-path-brick', 'brick', 'brick');
      // West DU & Curzon Hall Heritage Brick Avenue (TSC Adda down to Curzon / Farmhouse Junction, no orphan stubs!)
      addPathV(464, 872, 92, 1168, 'tile-path-brick', null, 'brick');
      // Curzon Hall Grand Mughal Forecourt (Connects Curzon Hall entrance directly to West DU Brick Avenue)
      addPathH(336, 1344, 256, 88, 'tile-path-brick', 'brick', null);
      // Central Nilkhet Book Lane Brick Spine (Nilkhet Book Stall to Mintu Road Fountain Plaza)
      addPathV(1072, 536, 88, 544, 'tile-path-brick', 'brick', null);

      // ── 3. PATHWAY TYPE 1: Royal Dressed Sandstone & Limestone Boulevard ('tile-path') ──
      // Main East-West Fuller Road & Mintu Road Thoroughfare (Charukola Courtyard to Whispering Forest Portal)
      addPathH(1200, 816, 1920, 96, 'tile-path', 'stone', 'stone');
      // East North-South Lakeside Promenade (Food Bazaar Court down to Dhanmondi Lake Pierhead)
      addPathV(1520, 816, 92, 1056, 'tile-path', null, 'stone');

      // ── 4. PATHWAY TYPE 5: Pastoral Country Loam & Cobble Wheel-Track Lane ('tile-path-dirt') ──
      // Green Meadows Farmhouse Country Lane & West Branch
      addPathH(600, 1456, 272, 80, 'tile-path-dirt', null, null, false);
      addPathV(736, 1592, 88, 336, 'tile-path-dirt', 'dirt', 'dirt', false);

      // ── 5. PATHWAY TYPE 3: Chini-Tikri Mosaic Courtyards & Circular Plaza Medallions ──
      // Fuller Road Food Bazaar Mosaic Court (Mama's Naga Fuchka & Pabnar Mishti Doi)
      this.add.tileSprite(1664, 272, 288, 96, 'tile-path-plaza').setDepth(1.32);
      // Charukola Banyan Artisan Mosaic Courtyard
      this.add.tileSprite(224, 784, 160, 104, 'tile-path-plaza').setDepth(1.32);
      // Grand Circular Medallions at Key Plazas & Road Intersections
      this.add.sprite(1072, 816, 'prop-plaza-ring').setDepth(1.4);        // Mintu Road Fountain Grand Plaza
      this.add.sprite(464, 816, 'prop-plaza-medallion').setDepth(1.38);   // West DU Crossroads
      this.add.sprite(1520, 816, 'prop-plaza-medallion').setDepth(1.38);  // East Promenade Crossroads
      this.add.sprite(208, 1344, 'prop-plaza-medallion').setDepth(1.38);  // Curzon Hall Entrance Forecourt
      this.add.sprite(272, 288, 'prop-plaza-medallion').setDepth(1.38);   // TSC Adda Rotunda Courtyard
      this.add.sprite(656, 288, 'prop-plaza-medallion').setDepth(1.38);   // Aparajeyo Bangla Monument Plinth
      this.add.sprite(1072, 272, 'prop-plaza-medallion').setDepth(1.38);  // Nilkhet Book Lane Hub
      this.add.sprite(1648, 816, 'prop-plaza-medallion').setDepth(1.38);  // Dhaka Rickshaw Stand Bay
      this.add.sprite(1520, 1328, 'prop-plaza-medallion').setDepth(1.38); // Dhanmondi Lake Pierhead Plaza
      this.add.sprite(2192, 816, 'prop-plaza-medallion').setDepth(1.38);  // Whispering Forest Portal Sanctuary

      // ── 6. REDESIGNED WATER BODIES, STEPPED BENGALI GHATS, CANAL BRIDGE & AQUATIC FLORA ──

      // Water Body A: Dhanmondi Lake (Multi-Tiered Terraced Bay + Northern Cove + Southern Inlet)
      this.lakeWater = this.add.tileSprite(1984, 1428, 832, 744, 'tile-water').setDepth(1.0);
      const lakeNorthCove = this.add.tileSprite(2064, 992, 672, 128, 'tile-water').setDepth(1.0);
      const lakeSouthInlet = this.add.tileSprite(1504, 1652, 128, 296, 'tile-water').setDepth(1.0);
      // Shallow Turquoise Shoreline Margins
      const shWest = this.add.tileSprite(1592, 1280, 48, 448, 'tile-water-shallow').setDepth(1.15);
      const shNorth = this.add.tileSprite(2064, 952, 672, 48, 'tile-water-shallow').setDepth(1.15);
      const shSouth = this.add.tileSprite(1464, 1652, 48, 296, 'tile-water-shallow').setDepth(1.15);
      this.extraWaterSprites.push(lakeNorthCove, lakeSouthInlet, shWest, shNorth, shSouth);

      // Dressed Stone Embankments & Traditional Stepped Brick Ghats (Shiri Ghat)
      this.add.tileSprite(1568, 1280, 24, 448, 'tile-bank').setDepth(2.0);
      this.add.tileSprite(1648, 1056, 184, 24, 'tile-bank').setDepth(2.0);
      this.add.tileSprite(1728, 992, 24, 152, 'tile-bank').setDepth(2.0);
      this.add.tileSprite(2064, 928, 672, 24, 'tile-bank').setDepth(2.0);
      this.add.tileSprite(1504, 1504, 152, 24, 'tile-bank').setDepth(2.0);
      this.add.tileSprite(1440, 1652, 24, 296, 'tile-bank').setDepth(2.0);
      // Stepped Bengali Ghats descending into Dhanmondi Lake
      this.add.tileSprite(1588, 1184, 48, 128, 'tile-ghat-steps-v').setDepth(2.2);
      this.add.tileSprite(1840, 946, 128, 48, 'tile-ghat-steps').setDepth(2.2);

      // PATHWAY TYPE 6: Teakwood Lakeside Boardwalk & Dhanmondi Lake Pier
      this.add.tileSprite(1556, 1328, 64, 84, 'tile-path-boardwalk').setDepth(2.6);
      this.add.tileSprite(1744, 1328, 384, 72, 'tile-pier').setDepth(3.0);

      // Dhanmondi Lake Physics Collisions (Keeping Pier at y: 1296..1360 walkable)
      blockRect(2064, 992, 672, 128);
      blockRect(1984, 1176, 832, 240);
      blockRect(1984, 1580, 832, 440);
      blockRect(2168, 1328, 464, 64);
      blockRect(1504, 1652, 128, 296);

      // Water Body B: Upper Ramna Lotus Pond & Serpentine Canal with Arched Stone Bridge
      const ramnaPondShallow = this.add.tileSprite(1968, 456, 224, 144, 'tile-water-shallow').setDepth(1.0);
      const ramnaPondDeep = this.add.tileSprite(1968, 456, 176, 96, 'tile-water').setDepth(1.1);
      const canalWater = this.add.tileSprite(1960, 728, 80, 400, 'tile-water').setDepth(1.05);
      this.extraWaterSprites.push(ramnaPondShallow, ramnaPondDeep, canalWater);

      // Upper Ramna Pond & Canal Stone Embankments + Stepped Ghat
      this.add.tileSprite(1968, 384, 232, 18, 'tile-bank').setDepth(2.0);
      this.add.tileSprite(1856, 456, 18, 148, 'tile-bank').setDepth(2.0);
      this.add.tileSprite(2080, 456, 18, 148, 'tile-bank').setDepth(2.0);
      this.add.tileSprite(1888, 528, 72, 18, 'tile-bank').setDepth(2.0);
      this.add.tileSprite(2040, 528, 88, 18, 'tile-bank').setDepth(2.0);
      this.add.tileSprite(1968, 396, 96, 36, 'tile-ghat-steps').setDepth(2.2);
      this.add.tileSprite(1916, 728, 16, 400, 'tile-bank').setDepth(2.0);
      this.add.tileSprite(2004, 728, 16, 400, 'tile-bank').setDepth(2.0);

      // Arched Stone & Teakwood Footbridge spanning the Ramna-Dhanmondi Canal at y=816
      this.add.sprite(1960, 816, 'prop-stone-bridge').setOrigin(0.5, 0.5).setDepth(3.2);

      // Upper Pond & Canal Collisions (Bridge passage at y: 768..864 remains completely open!)
      blockRect(1968, 456, 220, 140);
      blockRect(1960, 644, 84, 232);
      blockRect(1960, 896, 84, 64);

      // Water Body C: Curzon Botanical Lotus Pond / Shahidullah Hall Dighi (South-Central Lawn)
      const botPondShallow = this.add.tileSprite(1216, 1328, 256, 160, 'tile-water-shallow').setDepth(1.0);
      const botPondDeep = this.add.tileSprite(1216, 1328, 208, 112, 'tile-water').setDepth(1.1);
      this.extraWaterSprites.push(botPondShallow, botPondDeep);

      this.add.tileSprite(1216, 1248, 264, 20, 'tile-bank').setDepth(2.0);
      this.add.tileSprite(1216, 1408, 264, 20, 'tile-bank').setDepth(2.0);
      this.add.tileSprite(1088, 1328, 20, 164, 'tile-bank').setDepth(2.0);
      this.add.tileSprite(1344, 1328, 20, 164, 'tile-bank').setDepth(2.0);
      this.add.tileSprite(1216, 1262, 96, 36, 'tile-ghat-steps').setDepth(2.2);
      blockRect(1216, 1328, 252, 156);

      // Floating Shapla (National Water Lilies), Lily Pads & Swaying Shoreline Reeds across all Water Bodies
      const aquaticFlora = [
        // Curzon Botanical Lotus Pond
        { x: 1148, y: 1304, tex: 'prop-lotus' },
        { x: 1272, y: 1348, tex: 'prop-lotus' },
        { x: 1196, y: 1364, tex: 'prop-lilypad' },
        { x: 1252, y: 1296, tex: 'prop-lilypad' },
        { x: 1112, y: 1384, tex: 'prop-reeds' },
        { x: 1320, y: 1384, tex: 'prop-reeds' },
        // Upper Ramna Lotus Pond & Canal
        { x: 1916, y: 444, tex: 'prop-lotus' },
        { x: 2016, y: 472, tex: 'prop-lotus' },
        { x: 1964, y: 488, tex: 'prop-lilypad' },
        { x: 1884, y: 508, tex: 'prop-reeds' },
        { x: 2052, y: 508, tex: 'prop-reeds' },
        { x: 1940, y: 620, tex: 'prop-lilypad' },
        { x: 1978, y: 700, tex: 'prop-lotus' },
        // Dhanmondi Lake Coves & Shoreline
        { x: 1784, y: 984, tex: 'prop-lotus' },
        { x: 1912, y: 1004, tex: 'prop-lilypad' },
        { x: 2140, y: 976, tex: 'prop-lotus' },
        { x: 1624, y: 1112, tex: 'prop-lotus' },
        { x: 1640, y: 1236, tex: 'prop-lilypad' },
        { x: 1604, y: 1084, tex: 'prop-reeds' },
        { x: 1752, y: 964, tex: 'prop-reeds' },
        { x: 1488, y: 1560, tex: 'prop-lotus' },
        { x: 1528, y: 1640, tex: 'prop-lilypad' },
        { x: 1468, y: 1536, tex: 'prop-reeds' }
      ];
      aquaticFlora.forEach((fl, idx) => {
        const sp = this.add.sprite(fl.x, fl.y, fl.tex).setOrigin(0.5, 0.5).setDepth(2.3);
        this.tweens.add({
          targets: sp,
          y: fl.y + (fl.tex === 'prop-reeds' ? 1 : 2.2),
          angle: fl.tex === 'prop-reeds' ? { from: -2.5, to: 2.5 } : { from: -1, to: 1 },
          duration: 1800 + (idx % 5) * 320,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      });

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

      // Ramna Promenade — Well-Separated Flower Cart & Park Bench Garden Sanctuaries
      this.flowerCartSprite = addLandmark(1216, 512, 'prop-flowercart-0', 180, 52);
      this.ramnaBench = this.add.sprite(1472, 464, 'prop-bench').setOrigin(0.5, 1).setDepth(464);

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
        [400, 1360], [1216, 464], [1472, 432], [1552, 1264], [1872, 1296]
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
        this.atmosphere.registerLight(1216, 496, 64, 0xfbcfe8, 0.65); // Flower cart
        this.atmosphere.registerLight(1472, 436, 64, 0xfde68a, 0.65); // Ramna bench
        this.atmosphere.registerLight(1584, 240, 68, 0xfde68a, 0.7); // Fuchka cart
        this.atmosphere.registerLight(1744, 240, 68, 0xfde68a, 0.7); // Mishti doi
        this.atmosphere.registerLight(2032, 1352, 60, 0xfef08a, 0.85); // Lake rowboat lantern
        this.atmosphere.registerLight(672, 1433, 50, 0xfde68a, 0.6); // Farm arch left
        this.atmosphere.registerLight(808, 1433, 50, 0xfde68a, 0.6); // Farm arch right

        [
          [400, 752], [624, 752], [944, 752], [1168, 752], [1456, 752],
          [400, 1360], [1216, 464], [1472, 432], [1552, 1264], [1872, 1296]
        ].forEach(([lx, ly]) => {
          this.atmosphere.registerLight(lx, ly - 50, 64, 0xfde68a, 0.6);
        });
      }

      const shopSignStyle = {
        fontFamily: "'Rajdhani', 'Outfit', sans-serif",
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fff3b0',
        stroke: '#241409',
        strokeThickness: 3.5,
        backgroundColor: 'rgba(24, 16, 11, 0.82)',
        padding: { x: 10, y: 4 },
        shadow: { offsetX: 0, offsetY: 2, color: 'rgba(0, 0, 0, 0.75)', blur: 4, stroke: true, fill: true }
      };
      this.add.text(CURZON_X, CURZON_Y - 116 * CURZON_K - 18, 'CURZON HALL & KRISHNACHURA LAWN', shopSignStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(272, 96, 'TSC TEA STALL & ADDA ☕', shopSignStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(656, 136, 'APARAJEYO BANGLA 🇧🇩', shopSignStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(208, 528, 'CHARUKOLA FINE ARTS 🎨', shopSignStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1072, 80, 'NILKHET BOOK LANE 📚', shopSignStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1072, 720, 'MINTU ROAD FOUNTAIN PLAZA ⛲', shopSignStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1472, 396, 'RAMNA PARK BENCH 🌸', shopSignStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1216, 412, 'PHULWALI FLOWER CART 🌼', shopSignStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1664, 80, "FULLER ROAD FOOD BAZAAR 🥙🍮", shopSignStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1648, 752, 'DHAKA RICKSHAW STAND 🛺', shopSignStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1776, 1200, 'DHANMONDI LAKE PIER & TELESCOPE 🔭', shopSignStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1216, 1216, 'BOTANICAL LOTUS POND (SHAPLA DIGHI) 🪷', shopSignStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1960, 736, 'RAMNA CANAL STONE BRIDGE 🌉', shopSignStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(736, 1432, 'GREEN MEADOWS FARMHOUSE ROAD 🏡', shopSignStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(2192, 712, 'WHISPERING FOREST PORTAL 🌀', shopSignStyle).setOrigin(0.5).setDepth(2000);

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
      if (!this.scheduleSystem) {
        registerInteract(272, 304, 'npc-tea-0', 'Tong-er Mama (Cha)', 105, () => this.interactTeaStall());
        registerInteract(400, 304, 'npc-guitar-0', 'TSC Acoustic Singer', 90, () => this.interactGuitarist());
        registerInteract(240, 752, 'npc-artist-0', 'Charukola Clay Art', 85, () => this.interactCharukola());
        registerInteract(1072, 272, 'npc-books-0', 'Nilkhet Boiwala', 105, () => this.interactBookStall());
        registerInteract(1216, 544, 'npc-phulwali-0', 'Phulwali (Beli Gajra)', 85, () => this.interactFlowerCart());
        registerInteract(1584, 272, 'npc-fuchka-0', "Mama's Naga Fuchka", 105, () => this.interactFuchkaCart());
        registerInteract(1744, 272, 'npc-doi-0', 'Pabnar Mishti Doi', 105, () => this.interactDoiCart());
      }

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

      if (this.scheduleSystem) {
        this.scheduleSystem.initWorldNpcs('dhaka');
      } else {
        // Ahona, Apshora & Rakin Setup
        // Placed at Krishnachura Avenue Gateway (x: 480, y: 1056) or Shaded Ramna Park Bench (x: 1472, y: 464)
        const ahonaPos = DateState.bulliesDefeated ? { x: 1452, y: 468 } : { x: 480, y: 1056 };
        let apshoraPos = DateState.bulliesDefeated ? { x: 1496, y: 468 } : { x: 516, y: 1056 };
        if (DateState.apshoraQuestStage >= 2 && DateState.apshoraQuestStage < 4) {
          apshoraPos = { x: 320, y: 785 };
        } else if (DateState.apshoraQuestStage >= 4) {
          apshoraPos = { x: 1512, y: 468 };
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

        const rakinPos = DateState.ahonaQuestStage >= 3 ? { x: 1412, y: 468 } : { x: 830, y: 325 };
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

        // Iman & Mehjabin Couple Setup (Mintu Road Fountain Plaza terraces, x: 960–1152, y: 736)
        let mehjabinPos = { x: 960, y: 736 };
        let imanPos = { x: 1152, y: 736 };
        let mehjabinText = '💬 Mehjabin (Wants to talk!)';
        let imanText = '💼 Iman (Typing on phone...)';

        if (DateState.imanQuestStage >= 5) {
          mehjabinPos = { x: 1024, y: 736 };
          imanPos = { x: 1088, y: 736 };
          mehjabinText = '💑 Iman & Mehjabin (Happy Couple)';
          imanText = '💑 Iman & Mehjabin (Happy Couple)';
        } else if (DateState.imanQuestStage === 2) {
          mehjabinPos = { x: 960, y: 736 };
          mehjabinText = '😢 Mehjabin (Crying by Fountain)';
          imanText = '📱 Iman (Glued to Screen)';
        } else if (DateState.imanQuestStage === 3) {
          mehjabinPos = { x: 960, y: 736 };
          mehjabinText = '🥺 Mehjabin (Hoping Totoro Can Help)';
          imanText = '📱 Iman (Glued to Screen)';
        } else if (DateState.imanQuestStage === 4) {
          mehjabinPos = { x: 960, y: 736 };
          mehjabinText = '🥺 Mehjabin (Waiting for Totoro)';
          imanText = '❗ Iman (Totoro will talk to him!)';
        }

        this.mehjabin = this.add.sprite(mehjabinPos.x, mehjabinPos.y, 'npc-mehjabin-0').setOrigin(0.5, 1).setDepth(mehjabinPos.y);
        this.mehjabinBadge = this.add.text(mehjabinPos.x, mehjabinPos.y - 65, mehjabinText, {
          fontFamily: 'Outfit', fontSize: '12px', fontStyle: 'bold',
          backgroundColor: '#831843', color: '#fce7f3', padding: { x: 7, y: 3 }
        }).setOrigin(0.5, 1).setDepth(2100);

        this.mehjabinInteract = {
          x: mehjabinPos.x, y: mehjabinPos.y, radius: 85, sprite: this.mehjabin, badge: this.mehjabinBadge,
          name: 'Talk to Mehjabin',
          onInteract: () => this.interactMehjabin()
        };
        this.interactables.push(this.mehjabinInteract);

      this.iman = this.add.sprite(imanPos.x, imanPos.y, 'npc-iman-0').setOrigin(0.5, 1).setDepth(imanPos.y);

      this.imanBadge = this.add.text(imanPos.x, imanPos.y - 70, imanText, {
        fontFamily: 'Outfit', fontSize: '12px', fontStyle: 'bold',
        backgroundColor: '#164e63', color: '#cffafe', padding: { x: 7, y: 3 }
      }).setOrigin(0.5, 1).setDepth(2100).setVisible(DateState.imanQuestStage < 5);

      this.imanInteract = {
        x: imanPos.x, y: imanPos.y, radius: 85, sprite: this.iman, badge: this.imanBadge,
        name: 'Talk to Iman',
        onInteract: () => this.interactIman()
      };
      this.interactables.push(this.imanInteract);

        this.createWanderingCitizens();
      }
    } else {
      // --- WORLDS 2 TO 6: EXPEDITION REALMS (Pathways, Shrines, Gatherables, Enemies & Boss Arena) ---
      // Secondary Stepping-Stone & Brick Trails leading to Material Nodes & Spirit Groves
      this.add.tileSprite(935, 690, 460, 48, 'tile-path-stepping').setDepth(1.0);
      this.add.tileSprite(1245, 700, 220, 48, 'tile-path-stepping').setDepth(1.0);
      this.add.tileSprite(1065, 1120, 200, 48, 'tile-path-stepping').setDepth(1.0);
      this.add.tileSprite(1325, 1140, 380, 48, 'tile-path-stepping').setDepth(1.0);

      // Main East-West & North-South Realm Causeways with Dressed Curbs & Rounded Arch End-Caps
      this.add.tileSprite(1200, 900, 1920, 96, wCfg.pathTex).setDepth(1.1);
      this.add.tileSprite(1200, 852, 1920, 12, 'tile-curb-h').setDepth(1.25);
      this.add.tileSprite(1200, 948, 1920, 12, 'tile-curb-h').setDepth(1.25);
      this.add.sprite(242, 900, 'path-cap-stone-w').setOrigin(1, 0.5).setDepth(1.3);
      this.add.sprite(2158, 900, 'path-cap-stone-e').setOrigin(0, 0.5).setDepth(1.3);
      this.add.sprite(192, 900, 'prop-stepping-trail-h').setOrigin(1, 0.5).setFlipX(true).setDepth(1.05);
      this.add.sprite(2208, 900, 'prop-stepping-trail-h').setOrigin(0, 0.5).setDepth(1.05);

      this.add.tileSprite(1150, 880, 96, 1160, wCfg.pathTex).setDepth(1.1);
      this.add.tileSprite(1102, 880, 12, 1160, 'tile-curb-v').setDepth(1.25);
      this.add.tileSprite(1198, 880, 12, 1160, 'tile-curb-v').setDepth(1.25);
      this.add.sprite(1150, 302, 'path-cap-stone-n').setOrigin(0.5, 1).setDepth(1.3);
      this.add.sprite(1150, 254, 'prop-stepping-trail-v').setOrigin(0.5, 1).setFlipY(true).setDepth(1.05);

      // Circular Sanctuary & Boss Arena Plaza Medallions
      this.add.sprite(240, 912, 'prop-plaza-medallion').setDepth(1.35);
      this.add.sprite(528, 868, 'prop-plaza-medallion').setDepth(1.35);
      this.add.sprite(1150, 900, 'prop-plaza-ring').setDepth(1.38);
      this.add.sprite(1808, 912, 'prop-plaza-ring').setDepth(1.38);
      this.add.sprite(2160, 912, 'prop-plaza-medallion').setDepth(1.35);

      // Redesigned Multi-Tiered Realm Waterway, Embankments, Stepped Ghat & Causeway Bridge
      this.lakeWater = this.add.tileSprite(1200, 1630, 2240, 300, wCfg.waterTex).setDepth(1.0);
      const realmCoveL = this.add.tileSprite(620, 1430, 480, 100, wCfg.waterTex).setDepth(1.0);
      const realmCoveR = this.add.tileSprite(1740, 1430, 520, 100, wCfg.waterTex).setDepth(1.0);
      this.extraWaterSprites.push(realmCoveL, realmCoveR);

      this.add.tileSprite(620, 1380, 488, 22, 'tile-bank').setDepth(2.0);
      this.add.tileSprite(1740, 1380, 528, 22, 'tile-bank').setDepth(2.0);
      this.add.tileSprite(230, 1480, 300, 22, 'tile-bank').setDepth(2.0);
      this.add.tileSprite(1150, 1480, 580, 22, 'tile-bank').setDepth(2.0);
      this.add.tileSprite(2160, 1480, 320, 22, 'tile-bank').setDepth(2.0);
      this.add.tileSprite(1150, 1468, 128, 48, 'tile-ghat-steps').setDepth(2.2);
      this.add.sprite(1150, 1524, 'prop-stone-bridge').setRotation(Math.PI / 2).setDepth(2.6);

      const labelStyle = {
        fontFamily: "'Rajdhani', 'Cinzel', sans-serif",
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#fff8eb',
        stroke: '#120d1f',
        strokeThickness: 3.5,
        backgroundColor: 'rgba(18, 13, 31, 0.85)',
        padding: { x: 12, y: 5 },
        shadow: { offsetX: 0, offsetY: 2, color: 'rgba(0, 0, 0, 0.8)', blur: 5, stroke: true, fill: true }
      };
      this.add.text(1200, 180, wCfg.name.toUpperCase(), labelStyle).setOrigin(0.5).setDepth(2000);
      this.add.text(1200, 215, wCfg.subtitle, {
        fontFamily: "'Rajdhani', 'Outfit', sans-serif",
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#f7cb45',
        stroke: '#120d1f',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(2000);

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

      // Realm Guide NPC (Fallback if ScheduleSystem inactive)
      if (!this.scheduleSystem && wCfg.npcSpec) {
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
        if (!this.scheduleSystem) {
          // 1. Ananya the Weeping Petni (North Banyan Grove: x: 880, y: 460)
          const ananyaEntry = registerInteract(880, 460, 'npc-ananya-ghost-0', 'Ananya (Weeping Petni) 👻', 90, () => this.interactAnanyaGhost());
          if (ananyaEntry.sprite) {
            this.tweens.add({ targets: ananyaEntry.sprite, y: { from: 460, to: 452 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            this.tweens.add({ targets: ananyaEntry.sprite, alpha: { from: 0.65, to: 0.95 }, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          }

          // 2. Kofil Chacha & Phantom Rickshaw (Southwest Marsh: x: 420, y: 1320)
          const kofilEntry = registerInteract(420, 1320, 'npc-kofil-ghost-0', 'Kofil Chacha (Phantom Rickshaw) 🛺', 95, () => this.interactKofilGhost());
          if (kofilEntry.sprite) {
            this.tweens.add({ targets: kofilEntry.sprite, y: { from: 1320, to: 1314 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            this.tweens.add({ targets: kofilEntry.sprite, alpha: { from: 0.7, to: 1.0 }, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          }

          // 3. Prof. Shamsher (DU Occult Investigator: x: 1540, y: 460)
          const shamsherEntry = registerInteract(1540, 460, 'npc-shamsher-investigator-0', 'Prof. Shamsher (Occult Investigator) 📻', 90, () => this.interactShamsherNishi());
          if (shamsherEntry.sprite) {
            this.tweens.add({ targets: shamsherEntry.sprite, scaleY: { from: 1, to: 1.025 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          }
        }

        // 4. Ancient Spirit Altar (Central Grove: x: 1150, y: 640)
        registerInteract(1150, 640, 'prop-spirit-altar', 'Ancient Spirit Altar 🕯️', 95, () => this.interactSpiritAltar());
      }

      if (this.scheduleSystem) {
        this.scheduleSystem.initWorldNpcs(worldId);
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

    if (!DateState.totoroJoined) {
      this.currentOpeningScenario = OpeningDialogueSystem.selectOpeningScenario({
        isRaining: this.isRaining,
        hour: this.inGameClock ? this.inGameClock.hour : 15
      });
    }

    const badgeText = DateState.totoroJoined
      ? '♥ Totoro'
      : (this.currentOpeningScenario ? this.currentOpeningScenario.badgeText : '❗ Totoro (Waiting for you)');

    this.totoroBadge = this.add.text(totoroStart.x, totoroStart.y - 68, badgeText, {
      fontFamily: "'Rajdhani', 'Outfit', sans-serif",
      fontSize: '13px',
      fontStyle: 'bold',
      backgroundColor: 'rgba(212, 87, 121, 0.94)',
      color: '#ffffff',
      stroke: '#2a0815',
      strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 2, color: 'rgba(0, 0, 0, 0.6)', blur: 4, stroke: true, fill: true },
      padding: { x: 9, y: 4 }
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
      fontFamily: "'Rajdhani', 'Outfit', sans-serif",
      fontSize: '12px',
      fontStyle: 'bold',
      backgroundColor: '#fdf5e6',
      color: '#1a1008',
      stroke: '#2b1d14',
      strokeThickness: 1.5,
      padding: { x: 8, y: 4 },
      shadow: { offsetX: 0, offsetY: 2, color: 'rgba(0, 0, 0, 0.5)', blur: 3, fill: true }
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
        poise: 30,
        maxPoise: 30,
        atk: eSpec.atk,
        xp: eSpec.xp,
        drop: eSpec.drop,
        speed: 68,
        lastHitPlayer: 0,
        attackPhase: 'idle'
      });
    });

    // Guardian Boss
    const bSpec = wCfg.bossSpec;
    if (bSpec && !DateState.defeatedBosses.includes(bSpec.id)) {
      const bSp = this.add.sprite(bSpec.x, bSpec.y, `${bSpec.tex}-0`).setOrigin(0.5, 1).setDepth(bSpec.y);
      const bossAnim = this.getOrCreateWalkAnim(bSpec.tex, 3);
      if (bossAnim) bSp.play(bossAnim);
      const bLbl = this.add.text(bSpec.x, bSpec.y - 114, `👑 ${bSpec.name}`, {
        fontFamily: 'Rajdhani', fontSize: '13px', fontStyle: 'bold',
        backgroundColor: 'rgba(89, 28, 51, 0.92)', color: '#fff3a1', padding: { x: 8, y: 3 },
        stroke: '#2e0a18', strokeThickness: 3,
        shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 3, fill: true }
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
        poise: 80,
        maxPoise: 80,
        atk: bSpec.atk,
        xp: bSpec.xp,
        reward: bSpec.reward,
        speed: 82,
        lastHitPlayer: 0,
        lastTelegraph: 0,
        attackPhase: 'idle',
        phase2Triggered: false
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

  /* Real-Time Combat: Overhauled Data-Driven Combos & Companion System */
  performPlayerAttack() {
    CombatSystem.performPlayerAttack(this);
  }

  performPlayerDash() {
    CombatSystem.performPlayerDash(this);
  }

  performTotoroRoar() {
    CombatSystem.performTotoroRoar(this);
  }

  performTotoroGroundSlam() {
    CombatSystem.performTotoroGroundSlam(this);
  }

  performTotoroLeafGust() {
    CombatSystem.performTotoroLeafGust(this);
  }

  performTotoroSkill() {
    CombatSystem.performTotoroRoar(this);
  }

  damageEnemiesInRadius(cx, cy, radius, dmg, knockback = 26, isStun = false) {
    const atk = {
      id: 'custom_aoe',
      name: 'AoE Strike',
      source: 'player' as const,
      windupMs: 0,
      activeMs: 0,
      recoveryMs: 0,
      hitbox: { shape: 'circle' as const, radius },
      damageMult: 1.0,
      poiseDamage: isStun ? 50 : 20,
      knockback,
      hitStopMs: 40,
      sfx: 'enemy_hit',
      parryable: false,
      dodgeOnly: false
    };
    CombatSystem.damageEnemiesInRadius(this, cx, cy, radius, atk, isStun);
  }

  handleEnemyDefeated(en, idx) {
    CombatSystem.handleEnemyDefeated(this, en, idx);
  }

  spawnDamageNumber(x, y, text, color = '#ffffff') {
    CombatSystem.spawnDamageNumber(this, x, y, text, color);
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
        waypoints: [{ x: 256, y: 640 }, { x: 320, y: 736 }, { x: 640, y: 736 }, { x: 320, y: 736 }],
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
      // Spawn stationary wanderers in idle stance; directional walk animation will trigger upon movement
      const idleAnim = `${s.baseTex}-idle-down`;
      if (this.anims.exists(idleAnim)) {
        sp.play(idleAnim);
      }
      const badge = this.add.text(start.x, start.y - sp.height - 6, '💬 ' + s.name, {
        fontFamily: "'Rajdhani', 'Outfit', sans-serif",
        fontSize: '12px',
        fontStyle: 'bold',
        backgroundColor: s.isAnamika ? 'rgba(15, 118, 110, 0.92)' : 'rgba(28, 20, 16, 0.88)',
        color: s.isAnamika ? '#fff3a1' : '#f7efe2',
        stroke: '#140f0c',
        strokeThickness: 3,
        shadow: { offsetX: 0, offsetY: 2, color: 'rgba(0, 0, 0, 0.65)', blur: 4, stroke: true, fill: true },
        padding: { x: 7, y: 3 }
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

    UI.showToast('⛈️', 'Kalbaishakhi Monsoon!', 'A sudden warm Dhaka shower sweeps over campus!');
    UI.startDialogue([
      { speaker: 'Totoro', portrait: '🐾', text: 'Whoa! The sky opened up! Classic Dhaka Kalbaishakhi rain! Fresh raindrops feel wonderful on my fur!' },
      { speaker: 'Moon Walker', portrait: '🌙', text: 'It smells just like wet red earth (shondha matir gondho)... Good thing you love the rain as much as I do, Totoro!' }
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
      return;
    }

    // Dynamic Farming Soil Actions (Hoeing, Watering, Harvesting)
    if (this.farmingSystem && this.facingVec) {
      const targetCol = Math.floor((this.player.x + this.facingVec.x * 24) / 32);
      const targetRow = Math.floor((this.player.y + this.facingVec.y * 24) / 32);
      const cell = this.farmingSystem.getCell(targetCol, targetRow);
      if (cell) {
        if (!cell.isTilled && cell.isTillable) {
          if (this.farmingSystem.tillSoil(targetCol, targetRow)) {
            if (this.playerBehaviors) this.playerBehaviors.triggerHoeAction(targetCol, targetRow);
            return;
          }
        } else if (cell.isTilled && !cell.isWatered) {
          if (this.farmingSystem.waterSoil(targetCol, targetRow)) {
            if (this.playerBehaviors) this.playerBehaviors.triggerWaterAction(targetCol, targetRow);
            return;
          }
        } else if (cell.crop && cell.crop.isReadyForHarvest) {
          const cropId = cell.crop.cropId;
          const harvestResult = this.farmingSystem.harvestCrop(targetCol, targetRow);
          if (harvestResult.success) {
            if (this.playerBehaviors) this.playerBehaviors.triggerHarvestAction(cropId, targetCol, targetRow);
            return;
          }
        }
      }
    }
  }

  /* ================= Original Dhaka Valley Story & Diversified Quest Interactions ================= */
  meetTotoroFirstTime() {
    if (!this.currentOpeningScenario) {
      this.currentOpeningScenario = OpeningDialogueSystem.selectOpeningScenario({
        isRaining: this.isRaining,
        hour: this.inGameClock ? this.inGameClock.hour : 15
      });
    }
    OpeningDialogueSystem.meetTotoro(this, this.currentOpeningScenario);
  }

  talkToTotoroCompanion() {
    if (UI.isOpen() || this.cutsceneLocked) return;
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Moon Walker', portrait: '🌙', text: 'Totoro is waiting for me under the Krishnachura tree at Curzon Hall!' }]);
      return;
    }

    this.tweens.add({ targets: this.totoro, y: this.totoro.y - 12, duration: 140, yoyo: true });
    SoundEngine.heartUp();

    // Context-sensitive greeting based on location / atmosphere / reload cycle
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
    } else {
      const dynamicNodes = OpeningDialogueSystem.selectCompanionDialogue({
        isRaining: this.isRaining,
        timePhase: this.inGameClock?.phase
      });
      if (dynamicNodes && dynamicNodes.length) {
        greeting = dynamicNodes[0].text;
      }
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
      if (DateState.imanQuestStage === 0) {
        return 'Mehjabin is waving near Mintu Road Fountain Plaza (Center)! She looks like she wants to propose something exciting to us.';
      }
      if (DateState.imanQuestStage === 2) {
        return 'Mehjabin is crying by the fountain at Mintu Road after Iman brushed her off with work excuses. We should go comfort her!';
      }
      if (DateState.imanQuestStage === 3) {
        return 'Mehjabin is counting on us! Tell me what happened with Iman so I can help make him understand.';
      }
      if (DateState.imanQuestStage === 4) {
        return 'Iman is standing near Mintu Road with his phone. Let us go speak with him and remind his soul what truly matters!';
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
          ...(DateState.imanQuestStage === 3 ? [{
            label: '💔 "Totoro, Mehjabin is heartbroken... Iman is ignoring her for work."',
            nextNodes: [
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Totoro, Mehjabin asked Iman to go on a Double Couple Date with us tonight, but Iman coldly brushed her off with work excuses. He even called you an "oversized forest spirit" and told her he has no time for her!' },
              { speaker: 'Totoro', portrait: '🐾', text: '*Ears twitch with deep sorrow and righteous spirit energy* ...Grrr-oooh. The mortal curse of endless hurry. Humans run so fast towards tomorrow that they forget the warm hand they are holding today.' },
              { speaker: 'Moon Walker', portrait: '🌙', text: 'Mehjabin cried so hard... she remembered how in university Iman used to wait forty minutes in the Kalbaishakhi rain at TSC just to share a cup of tea. She asked if you could make him understand.' },
              { speaker: 'Totoro', portrait: '🐾', text: 'The boy who waited in the rain is not gone, Moon Walker. He is merely trapped beneath fear, spreadsheets, and the noise of the city. We are going to bring him back to her. Let us go confront Iman right now!' },
              { speaker: 'Moon Walker', portrait: '🌙', text: 'With you beside me, Totoro, nothing is impossible!' }
            ],
            onPick: () => {
              DateState.imanQuestStage = 4;
              if (this.mehjabinBadge) this.mehjabinBadge.setText('🥺 Mehjabin (Waiting for Totoro)');
              if (this.imanBadge) this.imanBadge.setText('❗ Iman (Totoro will talk to him!)');
              UI.updateQuestText();
              UI.showToast('🐾', 'Totoro is Ready!', 'Approach Iman at Mintu Road Fountain Plaza with Totoro!');
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
    CampusRomanceQuests.interactAhonaApshora(this);
  }

  interactRakin() {
    CampusRomanceQuests.interactRakin(this);
  }

  playAhonaRakinReunionCutscene() {
    CampusRomanceQuests.playAhonaRakinReunionCutscene(this);
  }

  playRakinConcertForAhonaCutscene() {
    CampusRomanceQuests.playRakinConcertForAhonaCutscene(this);
  }

  interactMehjabin() {
    CampusRomanceQuests.interactMehjabin(this);
  }

  playImanExcusesCutscene() {
    CampusRomanceQuests.playImanExcusesCutscene(this);
  }

  interactIman() {
    CampusRomanceQuests.interactIman(this);
  }

  playTotoroSwaysImanCutscene() {
    CampusRomanceQuests.playTotoroSwaysImanCutscene(this);
  }

  playDoubleDateCutscene() {
    CampusRomanceQuests.playDoubleDateCutscene(this);
  }

  interactApshoraSolo() {
    CampusRomanceQuests.interactApshoraSolo(this);
  }

  playApshoraAnamikaPitchCutscene() {
    CampusRomanceQuests.playApshoraAnamikaPitchCutscene(this);
  }

  interactApshoraAnamikaStudio() {
    CampusRomanceQuests.interactApshoraAnamikaStudio(this);
  }

  playApshoraExhibitionCutscene() {
    CampusRomanceQuests.playApshoraExhibitionCutscene(this);
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

  /* ===== Grand Dhaka Rickshaw Tour & Race Subsystem ===== */
  interactRickshawTour() {
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Moon Walker', portrait: '🌙', text: 'I should get Totoro from Curzon Hall before taking the rickshaw!' }]);
      return;
    }
    SoundEngine.rickshawBell();
    UI.startDialogue([
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'Tring-Tring! Ready to hit the road? Choose your rickshaw adventure:',
        choices: [
          {
            label: '🛺 Grand Rickshaw Tour (Sightseeing)',
            onPick: () => {
              RickshawTourEngine.interact(this);
            }
          },
          {
            label: '🏁 Race — Grand Prix (Totoro Kart)',
            onPick: () => {
              this.startTotoroKart();
            }
          }
        ]
      }
    ]);
  }

  async startTotoroKart() {
    try {
      const result = await TotoroKartEngine.launch(this);
      console.log('🏁 [Race] Completed with result:', result);
      return result;
    } catch (err) {
      console.error('Failed to launch TotoroKartEngine:', err);
      return null;
    }
  }

  // Alias for backward compatibility
  async startRickshawRace() {
    return this.startTotoroKart();
  }

  startRickshawTour() {
    RickshawTourEngine.startTour(this);
  }

  spawnRickshawObstacles(leg: any) {
    RickshawTourEngine.spawnObstacles(this, leg);
  }

  ringRickshawBell() {
    RickshawTourEngine.ringBell(this);
  }

  rickshawClearObstacle(o: any, perfect: boolean) {
    RickshawTourEngine.clearObstacle(this, o, perfect);
  }

  rickshawBonk(o: any) {
    RickshawTourEngine.bonk(this, o);
  }

  rickshawStopMoment(caption: string) {
    RickshawTourEngine.stopMoment(this, caption);
  }

  updateRickshawTour(time: number, delta: number) {
    RickshawTourEngine.updateTour(this, time, delta);
  }

  finishRickshawTour(R: any, home: any, lastStop: any) {
    RickshawTourEngine.finishTour(this, R, home, lastStop);
  }

  /* ===== Stargazing Observatory Subsystem ===== */
  interactStargazingTelescope() {
    StargazingEngine.interact(this);
  }

  launchConstellationCutscene() {
    StargazingEngine.launchConstellationCutscene(this);
  }

  /* ===== Lantern Rowboat Subsystem ===== */
  createLakeBoat(x: number, y: number) {
    return LakeBoatEngine.createBoat(this, x, y);
  }

  updateLakeBoat(time: number, delta: number) {
    LakeBoatEngine.updateBoat(this, time, delta);
  }

  spawnWaterRipple(x: number, y: number, w: number, driftX?: number) {
    LakeBoatEngine.spawnWaterRipple(this, x, y, w, driftX);
  }

  releaseSkyLanterns(B: any) {
    LakeBoatEngine.releaseSkyLanterns(this, B);
  }

  runLakeBoatTour(onDone: () => void) {
    LakeBoatEngine.runTour(this, onDone);
  }

  interactLakePier() {
    LakeBoatEngine.interactPier(this);
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

  exitCurzonHall() {
    if (this.isTransitioning || this.cutsceneLocked) return;
    SoundEngine.portalWarp();
    this.transitionToWorld('dhaka', { x: CURZON_X, y: CURZON_Y + 70 });
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
    this.transitionToWorld('dhaka', { x: 736, y: 1570 });
  }

  buildCurzonInterior(spawnPos?: { x: number; y: number }) {
    InteriorBuilder.buildCurzonInterior(this, spawnPos);
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
  buildFarmhouse(spawnPos?: { x: number; y: number }) {
    InteriorBuilder.buildFarmhouse(this, spawnPos);
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
    MinimapRenderer.render(this);
  }

  update(time, delta) {
    if (!this.player) return;

    // Advance TimeCalendarSystem, AtmosphereSystem and Living-World NPC ScheduleSystem
    const isWorldPaused = UI.isOpen() || this.cutsceneLocked;
    if (this.timeCalendar && !isWorldPaused) this.timeCalendar.update(delta);
    if (this.atmosphere && !isWorldPaused) this.atmosphere.update(time, delta);
    if (this.scheduleSystem) this.scheduleSystem.update(time, delta);

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
    if (this.extraWaterSprites && this.extraWaterSprites.length > 0) {
      const waveX = Math.sin(time * 0.0012) * 12;
      const stepY = delta * 0.0055;
      for (const ws of this.extraWaterSprites) {
        if (ws && ws.active) {
          ws.tilePositionX = waveX;
          ws.tilePositionY += stepY;
        }
      }
    }
    if (this.petals) {
      this.petals.forEach(p => {
        p.obj.x += p.vx * (delta / 1000) + Math.sin(time * 0.003 + p.phase) * 0.3;
        p.obj.y += p.vy * (delta / 1000);
        if (p.obj.y > 1760) { p.obj.y = 20; p.obj.x = Phaser.Math.Between(60, 2340); }
        if (p.obj.x < 20) p.obj.x = 2340;
      });
    }

    const px = this.player.x, py = this.player.y;

    // 2. Update Wandering Citizens (Fallback if ScheduleSystem is inactive)
    if (!this.scheduleSystem) {
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
          w.sprite.setFlipX(false);
          const idleAnim = `${w.baseTex}-idle-down`;
          if (this.anims.exists(idleAnim)) {
            w.sprite.play(idleAnim);
          } else {
            if (w.sprite.anims && w.sprite.anims.isPlaying) {
              w.sprite.anims.stop();
            }
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
            // For 4-row sheets (like npc-walker2), Row 1 is natively Left and Row 2 is natively Right.
            // Never flipX on 4-row character sheets to avoid reverse walking!
            const isFourRowSheet = this.anims.exists(`${w.baseTex}-walk-down`);
            if (!isFourRowSheet && Math.abs(dx) > 0.5) {
              w.sprite.setFlipX(dx < 0);
            }
          }
          w.badge.setPosition(w.x, w.y - w.sprite.height - 6).setDepth(w.y + 5);
        }
      });
    }

    // 3. Update Enemy & Boss AI with Data-Driven Telegraphs, Poise & Parry
    CombatSystem.updateEnemies(this, time, delta);

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
        const onPier =
          (DateState.currentWorld === 'dhaka' &&
            ((px > 1550 && py >= 1290 && py <= 1360) ||
             (px >= 1888 && px <= 2032 && py >= 768 && py <= 864))) ||
          (DateState.currentWorld === 'farmhouse' && px >= 780 && px <= 848 && py >= 640 && py <= 680);
        const inPuddle = this.isRaining && this.puddles.some(p => Phaser.Math.Distance.Between(px, py, p.x, p.y) < 26);
        const onPath =
          (py > 768 && py < 864) ||
          (px > 432 && px < 528 && py > 200 && py < 1480) ||
          (px > 1472 && px < 1568 && py > 200 && py < 1460) ||
          (px > 1012 && px < 1108 && py > 250 && py < 840) ||
          (py > 278 && py < 362 && px > 460 && px < 1850) ||
          (py > 490 && py < 550 && px > 1100 && px < 1480) ||
          (py > 1298 && py < 1358 && px > 780 && px < 1480) ||
          (px > 692 && px < 788 && py > 1360);

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

    // Player behaviors: dynamic breathing, footstep dust/splashes, idle quirks & rain parasol
    if (this.playerBehaviors) {
      this.playerBehaviors.update(time, delta, moving, pDir);
    }

    // 5. Auto-trigger Ahona & Apshora Act I Ambush in Dhaka Valley
    if (DateState.currentWorld === 'dhaka' && DateState.totoroJoined && !DateState.bulliesDefeated && !this.cutsceneLocked && this.ahona) {
      if (Phaser.Math.Distance.Between(px, py, this.ahona.x + 24, this.ahona.y + 10) < 85) {
        this.interactAhonaApshora();
        return;
      }
    }

    // 5.5. Auto-step through interior exit doorways/gates
    if (!this.isTransitioning && !this.cutsceneLocked) {
      if (DateState.currentWorld === 'curzon_interior') {
        if (py >= 830 && Math.abs(px - 600) < 65) {
          this.exitCurzonHall();
          return;
        }
      } else if (DateState.currentWorld === 'farmhouse') {
        if (py >= 830 && Math.abs(px - 600) < 65) {
          this.exitFarmhouse();
          return;
        }
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
      else if (px >= 1150 && px < 1550 && py >= 400 && py < 740) UI.setZone('Ramna Park & Flower Promenade');
      else if (px >= 1450 && py < 420) UI.setZone("Mama's Fuchka Corner");
      else if (px >= 1680 && py >= 420 && py < 960) UI.setZone('Old Dhaka Sweet Cart');
      else if (px >= 1520 && py >= 1020) UI.setZone('Dhanmondi Lake Pier');
      else UI.setZone('Fuller Road Fountain Plaza');
    }

    // 8. Floating Interaction Prompt
    let nearTarget = null, bestDist = Infinity;
    if (!DateState.totoroJoined && this.totoro && Phaser.Math.Distance.Between(px, py, this.totoro.x, this.totoro.y) < 92) {
      nearTarget = this.currentOpeningScenario ? this.currentOpeningScenario.promptText : 'SPACE: Meet Totoro 🐾';
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

    // Layer 0: Pokémon HGSS Vertical Water Reflections near Dhanmondi Lake, Canal & Lotus Ponds
    if (this.playerReflection) {
      const nearLake =
        (DateState.currentWorld === 'dhaka' && (
          (px >= 1420 && px <= 2420 && py >= 910 && py <= 1820) ||
          (px >= 1840 && px <= 2100 && py >= 370 && py <= 930) ||
          (px >= 1070 && px <= 1360 && py >= 1230 && py <= 1425)
        )) ||
        (DateState.currentWorld === 'farmhouse' && px >= 780 && px <= 1090 && py >= 555 && py <= 775);
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
