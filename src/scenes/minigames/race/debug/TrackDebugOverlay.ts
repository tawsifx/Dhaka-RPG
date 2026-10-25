// src/scenes/minigames/race/debug/TrackDebugOverlay.ts - F6 Track Spline, Gate & Collision Visualizer
import * as THREE from 'three';
import { TrackSpline } from '../track/TrackSpline';
import { CheckpointGate } from '../../../../types/race.types';

export class TrackDebugOverlay {
  private scene: THREE.Scene;
  private spline: TrackSpline | null = null;
  private gates: CheckpointGate[] = [];
  private group = new THREE.Group();
  private enabled = false;
  private infoEl: HTMLDivElement | null = null;
  private gateMeshes: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene, parentDom: HTMLElement = document.body) {
    this.scene = scene;
    this.group.name = 'track-debug-overlay';
    this.group.visible = false;
    this.scene.add(this.group);

    // Dom Info Badge
    this.infoEl = document.createElement('div');
    this.infoEl.id = 'track-debug-info';
    Object.assign(this.infoEl.style, {
      position: 'absolute',
      top: '70px',
      left: '20px',
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      color: '#38bdf8',
      fontFamily: 'monospace',
      fontSize: '11px',
      padding: '8px 12px',
      borderRadius: '6px',
      border: '1px solid #0284c7',
      zIndex: '100015',
      display: 'none',
      pointerEvents: 'none'
    });
    parentDom.appendChild(this.infoEl);
  }

  setTrack(spline: TrackSpline, gates: CheckpointGate[]): void {
    this.spline = spline;
    this.gates = gates;
    this.rebuildMeshes();
  }

  private rebuildMeshes(): void {
    // Clear previous
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    }
    this.gateMeshes = [];

    if (!this.spline) return;

    // 1. Draw Spline Line
    const points: THREE.Vector3[] = [];
    const samples = 200;
    for (let i = 0; i <= samples; i++) {
      const p = this.spline.getPoint(i / samples);
      points.push(new THREE.Vector3(p.x, p.y + 0.3, p.z));
    }
    const splineGeom = new THREE.BufferGeometry().setFromPoints(points);
    const splineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
    const splineLine = new THREE.Line(splineGeom, splineMat);
    this.group.add(splineLine);

    // 2. Draw Checkpoint Gates (Rectangular wireframes)
    this.gates.forEach((gate) => {
      const planeGeom = new THREE.PlaneGeometry(gate.width, gate.height);
      const wireframeMat = new THREE.MeshBasicMaterial({
        color: 0x64748b,
        wireframe: true,
        side: THREE.DoubleSide
      });
      const gateMesh = new THREE.Mesh(planeGeom, wireframeMat);
      gateMesh.position.set(gate.center.x, gate.center.y + gate.height * 0.5, gate.center.z);

      // Rotate plane to align with gate normal
      const normal = new THREE.Vector3(gate.normal.x, gate.normal.y, gate.normal.z).normalize();
      gateMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

      this.gateMeshes.push(gateMesh);
      this.group.add(gateMesh);
    });
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    this.group.visible = this.enabled;
    if (this.infoEl) {
      this.infoEl.style.display = this.enabled ? 'block' : 'none';
    }
    return this.enabled;
  }

  update(
    kartX: number,
    kartY: number,
    kartZ: number,
    nextGateIndex: number,
    currentLap: number,
    surface: string
  ): void {
    if (!this.enabled || !this.spline) return;

    // Update gate colors
    this.gateMeshes.forEach((mesh, idx) => {
      const mat = mesh.material as THREE.MeshBasicMaterial;
      if (idx < nextGateIndex) {
        mat.color.setHex(0x22c55e); // Passed (green)
      } else if (idx === nextGateIndex) {
        mat.color.setHex(0xfacc15); // Target (yellow)
      } else {
        mat.color.setHex(0x38bdf8); // Future (blue)
      }
    });

    // Update debug text
    if (this.infoEl) {
      const query = this.spline.findNearest(kartX, kartY, kartZ);
      this.infoEl.innerHTML = `
        <strong>[F6 TRACK DEBUG]</strong><br/>
        Lap: ${currentLap} | Gate: ${nextGateIndex}/${this.gates.length}<br/>
        Spline t: ${query.t.toFixed(4)} (${query.distanceAlongSpline.toFixed(1)}m / ${this.spline.getTotalLength().toFixed(1)}m)<br/>
        Lateral Offset: ${query.distanceFromCenter.toFixed(2)}m (Road: ${query.width.toFixed(1)}m)<br/>
        Surface: <code>${surface}</code>
      `;
    }
  }

  dispose(): void {
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    }
    if (this.infoEl && this.infoEl.parentNode) {
      this.infoEl.parentNode.removeChild(this.infoEl);
    }
  }
}
