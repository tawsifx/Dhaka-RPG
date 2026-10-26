// src/scenes/minigames/race/debug/AiDebugOverlay.ts - F7 AI Driver & Telemetry Debug Overlay
import * as THREE from 'three';
import { RaceSession } from '../core/RaceSession';

export class AiDebugOverlay {
  private container: HTMLDivElement;
  private isVisible = false;
  private session?: RaceSession;
  private scene: THREE.Scene;
  private debugLineGroup: THREE.Group;
  private onKeyDown: (e: KeyboardEvent) => void;

  constructor(scene: THREE.Scene, parent: HTMLElement, session?: RaceSession) {
    this.scene = scene;
    this.session = session;
    this.debugLineGroup = new THREE.Group();
    this.debugLineGroup.visible = false;
    this.scene.add(this.debugLineGroup);

    this.container = document.createElement('div');
    this.container.id = 'race-ai-debug-overlay';
    this.container.style.cssText = `
      position: absolute;
      top: 60px;
      left: 280px;
      z-index: 1100;
      background: rgba(15, 23, 42, 0.94);
      border: 1px solid #a855f7;
      border-radius: 6px;
      padding: 10px 14px;
      color: #c084fc;
      font-family: monospace;
      font-size: 11px;
      line-height: 1.4;
      pointer-events: none;
      display: none;
      box-shadow: 0 4px 16px rgba(0,0,0,0.6);
      max-width: 440px;
    `;
    parent.appendChild(this.container);

    this.onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'F7') {
        e.preventDefault();
        this.toggle();
      }
    };
    window.addEventListener('keydown', this.onKeyDown);

    if (session) {
      this.buildVisualLine(session);
    }
  }

  setSession(session: RaceSession): void {
    this.session = session;
    this.buildVisualLine(session);
  }

  private buildVisualLine(session: RaceSession): void {
    while (this.debugLineGroup.children.length > 0) {
      this.debugLineGroup.remove(this.debugLineGroup.children[0]);
    }

    const racingLine = session.track.aiRacingLine;
    if (racingLine && racingLine.length > 1) {
      const points = racingLine.map((p) => new THREE.Vector3(p.x, p.y + 0.3, p.z));
      points.push(points[0].clone()); // Close loop
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
      const line = new THREE.Line(geo, mat);
      this.debugLineGroup.add(line);
    }
  }

  toggle(force?: boolean): void {
    this.isVisible = force !== undefined ? force : !this.isVisible;
    this.container.style.display = this.isVisible ? 'block' : 'none';
    this.debugLineGroup.visible = this.isVisible;
  }

  update(): void {
    if (!this.isVisible || !this.session) return;

    const standings = this.session.getStandings();
    const karts = this.session.getKarts();

    let html = `<strong>[F7] AI RIVALS TELEMETRY (${this.session.difficulty.toUpperCase()})</strong><br>`;
    html += `<table style="width:100%; border-collapse:collapse; margin-top:4px;">`;
    html += `<tr style="border-bottom:1px solid #475569; color:#94a3b8;">
      <th style="text-align:left;">#</th>
      <th style="text-align:left;">Driver</th>
      <th>Spd</th>
      <th>Lap</th>
      <th>Drift</th>
      <th>Gap</th>
    </tr>`;

    for (const entry of standings) {
      const kart = karts.find((k) => k.id === entry.kartId);
      const state = kart?.controller.getState();
      const isPlayer = kart?.isPlayer;
      const speed = state ? state.speed.toFixed(1) : '0.0';
      const driftTier = state?.drift?.isDrifting ? `T${state.drift.tier}` : '-';
      const gap = entry.rank === 1 ? 'LEAD' : `+${entry.gapToLeaderSec.toFixed(1)}s`;

      html += `<tr style="color:${isPlayer ? '#38bdf8' : '#e2e8f0'};">
        <td>${entry.rank}</td>
        <td>${kart?.driver.name || entry.kartId}</td>
        <td style="text-align:center;">${speed}</td>
        <td style="text-align:center;">L${entry.lap}</td>
        <td style="text-align:center;">${driftTier}</td>
        <td style="text-align:right;">${gap}</td>
      </tr>`;
    }

    html += `</table>`;
    this.container.innerHTML = html;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    while (this.debugLineGroup.children.length > 0) {
      const child = this.debugLineGroup.children[0] as THREE.Line;
      child.geometry?.dispose();
      (child.material as THREE.Material)?.dispose();
      this.debugLineGroup.remove(child);
    }
    if (this.debugLineGroup.parent) {
      this.debugLineGroup.parent.remove(this.debugLineGroup);
    }
  }
}
