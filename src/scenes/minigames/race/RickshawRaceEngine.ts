// src/scenes/minigames/race/RickshawRaceEngine.ts - Lifecycle orchestrator for 3D Rickshaw Race Spike
import * as THREE from 'three';
import { RaceResult, RaceExitReason, KartState } from '../../../types/race.types';
import { KartController } from './core/KartController';
import { FixedStepLoop } from './core/FixedStepLoop';
import { RaceRenderer } from './render/RaceRenderer';
import { PlaceholderKart } from './render/PlaceholderKart';
import { ChaseCamera } from './render/ChaseCamera';
import { RaceInput } from './input/RaceInput';
import { RaceHud } from './ui/RaceHud';
import { RaceDebugOverlay } from './debug/RaceDebugOverlay';
import { SoundEngine } from '../../../audio/SoundEngine';
import { DEFAULT_KART_CONFIG } from '../../../config/race.config';

export class RickshawRaceEngine {
  private scene: any;
  private container: HTMLDivElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private renderer: RaceRenderer | null = null;
  private kartMesh: PlaceholderKart | null = null;
  private camera: ChaseCamera | null = null;
  private controller: KartController | null = null;
  private loop: FixedStepLoop | null = null;
  private input: RaceInput | null = null;
  private hud: RaceHud | null = null;
  private debugOverlay: RaceDebugOverlay | null = null;

  private animFrameId: number | null = null;
  private isRunning = false;
  private startTime = 0;
  private lastFrameTime = 0;
  private lastBellTime = 0;
  private previousKartState: KartState | null = null;

  private hiddenDomElements: HTMLElement[] = [];
  private resolveResult?: (res: RaceResult) => void;

  constructor(scene: any) {
    this.scene = scene;
  }

  /**
   * Static entry helper that instantiates the engine, runs the race, and returns RaceResult.
   */
  static async launch(scene: any): Promise<RaceResult> {
    const engine = new RickshawRaceEngine(scene);
    return engine.start();
  }

  async start(): Promise<RaceResult> {
    return new Promise<RaceResult>((resolve) => {
      this.resolveResult = resolve;
      this.init();
    });
  }

  private init(): void {
    this.startTime = performance.now();
    this.lastFrameTime = performance.now();
    this.isRunning = true;

    // 1. Duck overworld BGM
    try {
      SoundEngine.duckBGM(0.18, 300);
    } catch {
      // Audio fallback
    }

    // 2. Pause Phaser scene and lock cutscenes
    if (this.scene) {
      if (this.scene.timeCalendar) {
        this.scene.timeCalendar.setPaused(true);
      }
      this.scene.cutsceneLocked = true;
      if (this.scene.scene && typeof this.scene.scene.pause === 'function') {
        this.scene.scene.pause();
      }
    }

    // 3. Temporarily hide overworld HUD overlays to yield full screen to 3D race
    const hudIds = ['top-hud', 'minimap-panel', 'bottom-hud', 'boss-hud'];
    this.hiddenDomElements = [];
    hudIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el && !el.hidden) {
        el.hidden = true;
        this.hiddenDomElements.push(el);
      }
    });

    // 4. Create root overlay container and canvas
    this.container = document.createElement('div');
    this.container.id = 'race-container';
    this.container.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 1000;
      background: #000;
      overflow: hidden;
    `;

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'race-canvas-overlay';
    this.canvas.style.cssText = `
      display: block;
      width: 100%;
      height: 100%;
    `;
    this.container.appendChild(this.canvas);
    document.body.appendChild(this.container);

    // 5. Instantiate subsystems
    this.renderer = new RaceRenderer({ canvas: this.canvas });
    this.kartMesh = new PlaceholderKart();
    this.renderer.scene.add(this.kartMesh.group);

    const aspect = window.innerWidth / window.innerHeight;
    const threeCam = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);

    this.camera = new ChaseCamera(threeCam);
    this.controller = new KartController();
    this.loop = new FixedStepLoop();
    this.input = new RaceInput();

    const onExitTrigger = () => this.exit('user');
    this.hud = new RaceHud(this.container, this.input, onExitTrigger);
    this.debugOverlay = new RaceDebugOverlay(this.container, this.renderer, onExitTrigger);

    // Snap camera to starting kart position
    const startState = this.controller.getState();
    this.previousKartState = { ...startState };
    this.kartMesh.update(startState);
    this.camera.snapTo(startState);

    // Initial audio bell chime
    SoundEngine.rickshawBell();

    // Start requestAnimationFrame loop
    this.animFrameId = requestAnimationFrame(this.renderLoop.bind(this));
  }

  private renderLoop(timestamp: number): void {
    if (!this.isRunning) return;

    const frameDeltaSec = Math.min(0.1, (timestamp - this.lastFrameTime) / 1000);
    this.lastFrameTime = timestamp;

    if (
      !this.controller ||
      !this.loop ||
      !this.input ||
      !this.camera ||
      !this.kartMesh ||
      !this.renderer
    ) {
      return;
    }

    // 1. Poll inputs
    const inputState = this.input.poll();

    // Check exit request
    if (inputState.exit) {
      this.exit('user');
      return;
    }

    // Check bell request
    if (inputState.bell) {
      const now = performance.now();
      if (now - this.lastBellTime >= DEFAULT_KART_CONFIG.bellCooldownMs) {
        this.lastBellTime = now;
        SoundEngine.rickshawBell();
      }
    }

    // 2. Fixed timestep physics progression
    const prevState = { ...this.controller.getState() };
    const { alpha } = this.loop.step(frameDeltaSec, (dt) => {
      this.controller!.update(dt, inputState);
    });
    const currState = this.controller.getState();

    // 3. Render interpolation between previous tick and current tick
    const renderState = KartController.interpolate(prevState, currState, alpha);

    // 4. Update visual kart and chase camera
    this.kartMesh.update(renderState);
    this.camera.update(frameDeltaSec, renderState);

    // 5. Update HUD and telemetry
    if (this.hud) {
      this.hud.update(renderState.speed, renderState.distanceTravelled);
    }
    if (this.debugOverlay) {
      this.debugOverlay.update(renderState);
    }

    // 6. Render frame
    this.renderer.render(this.camera.camera);

    this.animFrameId = requestAnimationFrame(this.renderLoop.bind(this));
  }

  exit(reason: RaceExitReason = 'user'): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    const elapsedMs = performance.now() - this.startTime;
    const finalSpeed = this.controller ? this.controller.getState().speed : 0;
    const distanceTravelled = this.controller
      ? this.controller.getState().distanceTravelled
      : 0;

    const result: RaceResult = {
      completed: reason !== 'error',
      elapsedMs,
      exitReason: reason,
      finalSpeed,
      distanceTravelled
    };

    // Dispose all resources
    this.dispose();

    // Restore overworld state
    this.restoreOverworld();

    if (this.resolveResult) {
      this.resolveResult(result);
      this.resolveResult = undefined;
    }
  }

  private restoreOverworld(): void {
    // 1. Restore overworld HUD elements
    this.hiddenDomElements.forEach((el) => {
      el.hidden = false;
    });
    this.hiddenDomElements = [];

    // 2. Restore overworld BGM
    try {
      SoundEngine.restoreBGM(300);
    } catch {
      // Audio fallback
    }

    // 3. Resume time calendar and Phaser scene
    if (this.scene) {
      if (this.scene.timeCalendar) {
        this.scene.timeCalendar.setPaused(false);
      }
      this.scene.cutsceneLocked = false;
      if (this.scene.scene && typeof this.scene.scene.resume === 'function') {
        this.scene.scene.resume();
      }
    }
  }

  dispose(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.debugOverlay) {
      this.debugOverlay.dispose();
      this.debugOverlay = null;
    }

    if (this.hud) {
      this.hud.dispose();
      this.hud = null;
    }

    if (this.input) {
      this.input.dispose();
      this.input = null;
    }

    if (this.kartMesh) {
      this.kartMesh.dispose();
      this.kartMesh = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    if (this.camera) {
      this.camera.dispose();
      this.camera = null;
    }

    this.controller = null;
    this.loop = null;

    if (this.container && this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
      this.container = null;
    }
    this.canvas = null;
  }
}
