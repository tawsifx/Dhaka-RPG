// src/scenes/minigames/race/debug/RaceDebugOverlay.ts - F4 Debug HUD & window.__race telemetry API
import { RaceRenderer } from '../render/RaceRenderer';
import { KartState, RaceStats } from '../../../../types/race.types';

export class RaceDebugOverlay {
  private container: HTMLDivElement;
  private isVisible = false;
  private renderer: RaceRenderer;
  private onExitCallback: () => void;

  // Frame timing
  private lastTime = performance.now();
  private frames = 0;
  private currentFps = 60;
  private currentFrameTime = 16.6;
  private latestKartState?: KartState;

  private onKeyDownBound: (e: KeyboardEvent) => void;

  constructor(parent: HTMLElement, renderer: RaceRenderer, onExit: () => void) {
    this.renderer = renderer;
    this.onExitCallback = onExit;

    this.container = document.createElement('div');
    this.container.id = 'race-debug-overlay';
    this.container.style.cssText = `
      position: absolute;
      top: 60px;
      left: 16px;
      z-index: 1100;
      background: rgba(15, 23, 42, 0.92);
      border: 1px solid #38bdf8;
      border-radius: 6px;
      padding: 10px 14px;
      color: #38bdf8;
      font-family: monospace;
      font-size: 12px;
      line-height: 1.4;
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

    this.container.innerHTML = `
      <div style="font-weight: bold; color: #facc15; margin-bottom: 4px;">[F4] TRING-TRING TELEMETRY</div>
      <div>FPS: <span style="color: ${this.currentFps >= 55 ? '#4ade80' : '#f87171'}">${this.currentFps}</span> (${this.currentFrameTime}ms)</div>
      <div>Draw Calls: ${render.calls} | Tris: ${render.triangles}</div>
      <div>Geometries: ${mem.geometries} | Textures: ${mem.textures}</div>
      <div>Speed: ${Math.round(kart.speed * 10) / 10} u/s (${Math.round(Math.abs(kart.speed) * 3.6)} km/h)</div>
      <div>Yaw: ${Math.round((kart.rotation * 180) / Math.PI)}° | Wheel: ${Math.round((kart.steerAngle * 180) / Math.PI)}°</div>
      <div>Pos: (${Math.round(kart.x * 10) / 10}, ${Math.round(kart.z * 10) / 10}) | Dist: ${Math.round(kart.distanceTravelled)}m</div>
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
      getRenderer: () => this.renderer
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
