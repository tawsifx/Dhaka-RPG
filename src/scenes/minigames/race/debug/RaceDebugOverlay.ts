// src/scenes/minigames/race/debug/RaceDebugOverlay.ts - F4 Debug HUD & window.__race telemetry/tuning API
import { RaceRenderer } from '../render/RaceRenderer';
import { KartState, RaceStats, SurfaceType, BoostSource } from '../../../../types/race.types';
import { KartController } from '../core/KartController';
import { KART_ARCHETYPES } from '../../../../config/race.config';
import { ReplayRecorder } from './ReplayRecorder';

export class RaceDebugOverlay {
  private container: HTMLDivElement;
  private isVisible = false;
  private renderer: RaceRenderer;
  private kartController?: KartController;
  private onExitCallback: () => void;
  readonly replayRecorder = new ReplayRecorder();

  // Frame timing
  private lastTime = performance.now();
  private frames = 0;
  private currentFps = 60;
  private currentFrameTime = 16.6;
  private latestKartState?: KartState;

  private onKeyDownBound: (e: KeyboardEvent) => void;

  constructor(
    parent: HTMLElement,
    renderer: RaceRenderer,
    onExit: () => void,
    kartController?: KartController
  ) {
    this.renderer = renderer;
    this.onExitCallback = onExit;
    this.kartController = kartController;

    this.container = document.createElement('div');
    this.container.id = 'race-debug-overlay';
    this.container.style.cssText = `
      position: absolute;
      top: 60px;
      left: 16px;
      z-index: 1100;
      background: rgba(15, 23, 42, 0.94);
      border: 1px solid #38bdf8;
      border-radius: 6px;
      padding: 10px 14px;
      color: #38bdf8;
      font-family: monospace;
      font-size: 11.5px;
      line-height: 1.45;
      pointer-events: none;
      display: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    `;
    parent.appendChild(this.container);

    this.onKeyDownBound = (e: KeyboardEvent) => {
      if (e.code === 'F4') {
        e.preventDefault();
        this.toggle();
      }
    };
    window.addEventListener('keydown', this.onKeyDownBound);

    // Register global developer API
    this.exposeGlobalApi();
  }

  toggle(force?: boolean): void {
    this.isVisible = force !== undefined ? force : !this.isVisible;
    this.container.style.display = this.isVisible ? 'block' : 'none';
  }

  update(kart: KartState): void {
    this.latestKartState = kart;
    const now = performance.now();
    this.frames++;

    const delta = now - this.lastTime;
    if (delta >= 500) {
      this.currentFps = Math.round((this.frames * 1000) / delta);
      this.currentFrameTime = Math.round((delta / this.frames) * 10) / 10;
      this.frames = 0;
      this.lastTime = now;
    }

    if (!this.isVisible) return;

    const mem = this.renderer.getMemoryInfo();
    const render = this.renderer.getRenderInfo();

    const driftTier = kart.drift?.tier || 0;
    const driftText = kart.drift?.isDrifting
      ? `Tier ${driftTier} (${Math.round(kart.drift.charge)}%)`
      : 'Inactive';

    const boostText = kart.boost?.active
      ? `${kart.boost.source} (${Math.round(kart.boost.durationRemaining * 10) / 10}s)`
      : 'None';

    const airText = kart.air?.isAirborne
      ? `H: ${Math.round(kart.air.height * 10) / 10}m ${kart.air.trickActive ? 'TRICK!' : ''}`
      : 'Grounded';

    this.container.innerHTML = `
      <div style="font-weight: bold; color: #facc15; margin-bottom: 4px;">[F4] TRING-TRING TELEMETRY (M2)</div>
      <div>FPS: <span style="color: ${this.currentFps >= 55 ? '#4ade80' : '#f87171'}">${this.currentFps}</span> (${this.currentFrameTime}ms)</div>
      <div>Draw Calls: ${render.calls} | Tris: ${render.triangles}</div>
      <div>Geometries: ${mem.geometries} | Textures: ${mem.textures}</div>
      <div>Speed: ${Math.round(kart.speed * 10) / 10} u/s (${Math.round(Math.abs(kart.speed) * 3.6)} km/h)</div>
      <div>Surface: <span style="color: #facc15;">${kart.surface.toUpperCase()}</span></div>
      <div>Drift: <span style="color: #a855f7;">${driftText}</span></div>
      <div>Boost: <span style="color: #f97316;">${boostText}</span></div>
      <div>Air: <span style="color: #38bdf8;">${airText}</span></div>
      <div>Pos: (${Math.round(kart.x * 10) / 10}, ${Math.round(kart.z * 10) / 10}) | Yaw: ${Math.round((kart.rotation * 180) / Math.PI)}°</div>
    `;
  }

  getStats(kart?: KartState): RaceStats {
    const mem = this.renderer.getMemoryInfo();
    const render = this.renderer.getRenderInfo();
    const k = kart || this.latestKartState;
    return {
      fps: this.currentFps,
      frameTimeMs: this.currentFrameTime,
      drawCalls: render.calls,
      triangles: render.triangles,
      geometries: mem.geometries,
      textures: mem.textures,
      speed: k ? k.speed : 0,
      distance: k ? k.distanceTravelled : 0
    };
  }

  private exposeGlobalApi(): void {
    const win = window as any;
    win.__race = {
      isActive: () => true,
      exit: () => this.onExitCallback(),
      toggleOverlay: (force?: boolean) => this.toggle(force),
      stats: (kart?: KartState) => this.getStats(kart),
      getRenderer: () => this.renderer,
      getKartState: () => this.latestKartState || (this.kartController ? this.kartController.getState() : null),
      setKartState: (partial: Partial<KartState>) => {
        if (this.kartController) {
          this.kartController.setState(partial);
        }
      },
      launchRamp: (speed?: number, angle?: number) => {
        if (this.kartController) {
          this.kartController.airModel.launch(speed || 22.0, angle || 0.28);
        }
      },
      tune: (key: string, val: number) => {
        if (this.kartController) {
          this.kartController.setConfig({ [key]: val });
        }
      },
      setSurfaceOverride: (type: SurfaceType | null) => {
        if (this.kartController) {
          this.kartController.setSurfaceOverride(type);
        }
      },
      giveBoost: (source: BoostSource = 'boost_pad', strength?: number, durationSec?: number) => {
        if (this.kartController) {
          this.kartController.giveBoost(source, strength, durationSec);
        }
      },
      setStats: (archetypeKey: 'light' | 'balanced' | 'heavy') => {
        const arch = KART_ARCHETYPES[archetypeKey];
        if (arch && this.kartController) {
          this.kartController.setStats(arch);
        }
      },
      replay: {
        record: () => this.replayRecorder.startRecording(),
        stop: () => this.replayRecorder.stopRecording(this.latestKartState),
        exportJSON: () => this.replayRecorder.exportJSON(this.latestKartState)
      }
    };
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDownBound);
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
    const win = window as any;
    if (win.__race) {
      win.__race.isActive = () => false;
      delete win.__race;
    }
  }
}
