// src/scenes/minigames/race/ui/RaceMinimap.ts - 2D Canvas Minimap with track ribbon, finish line & kart blip
import { SplinePoint } from '../../../../types/race.types';
import { TrackSpline } from '../track/TrackSpline';

export class RaceMinimap {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private spline: TrackSpline | null = null;
  private minX = -150;
  private maxX = 250;
  private minZ = -250;
  private maxZ = 100;
  private width = 160;
  private height = 160;
  private trackPoints: { x: number; z: number }[] = [];

  constructor(parent: HTMLElement = document.body) {
    this.container = document.createElement('div');
    this.container.id = 'race-minimap-container';
    Object.assign(this.container.style, {
      position: 'absolute',
      right: '20px',
      bottom: '24px',
      width: `${this.width}px`,
      height: `${this.height}px`,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      border: '2px solid rgba(255, 255, 255, 0.25)',
      borderRadius: '12px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6), inset 0 0 8px rgba(0,0,0,0.4)',
      overflow: 'hidden',
      zIndex: '100005',
      pointerEvents: 'none'
    });

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width * (window.devicePixelRatio || 1);
    this.canvas.height = this.height * (window.devicePixelRatio || 1);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    this.container.appendChild(this.canvas);
    parent.appendChild(this.container);
  }

  setTrack(spline: TrackSpline, controlPoints?: SplinePoint[]): void {
    this.spline = spline;
    const samples = 140;
    this.trackPoints = [];

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (let i = 0; i < samples; i++) {
      const pt = spline.getPoint(i / samples);
      this.trackPoints.push({ x: pt.x, z: pt.z });
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.z < minZ) minZ = pt.z;
      if (pt.z > maxZ) maxZ = pt.z;
    }

    const padX = (maxX - minX) * 0.12;
    const padZ = (maxZ - minZ) * 0.12;
    this.minX = minX - padX;
    this.maxX = maxX + padX;
    this.minZ = minZ - padZ;
    this.maxZ = maxZ + padZ;
  }

  private worldToCanvas(worldX: number, worldZ: number): { x: number; y: number } {
    const rangeX = (this.maxX - this.minX) || 1;
    const rangeZ = (this.maxZ - this.minZ) || 1;

    // Preserve aspect ratio inside minimap box
    const scale = Math.min((this.width - 24) / rangeX, (this.height - 24) / rangeZ);
    const centerX = (this.minX + this.maxX) * 0.5;
    const centerZ = (this.minZ + this.maxZ) * 0.5;

    const canvasX = (this.width * 0.5) + (worldX - centerX) * scale;
    // Map -Z (North) to canvas top (-Y)
    const canvasY = (this.height * 0.5) + (worldZ - centerZ) * scale;

    return { x: canvasX, y: canvasY };
  }

  render(kartX: number, kartZ: number, kartRotation: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    if (this.trackPoints.length < 2) return;

    // 1. Draw Track Road Ribbon (Gray base)
    ctx.beginPath();
    const first = this.worldToCanvas(this.trackPoints[0].x, this.trackPoints[0].z);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < this.trackPoints.length; i++) {
      const p = this.worldToCanvas(this.trackPoints[i].x, this.trackPoints[i].z);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 2. Draw Track Centerline (Gold accent)
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 3. Draw Finish Line indicator
    const finish = this.worldToCanvas(this.trackPoints[0].x, this.trackPoints[0].z);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(finish.x, finish.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // 4. Draw Player Kart Blip (Green dot with heading notch)
    const kartPos = this.worldToCanvas(kartX, kartZ);

    ctx.save();
    ctx.translate(kartPos.x, kartPos.y);

    // Kart heading in 3D: rot = 0 faces -Z (which is up on minimap, -Y)
    // rot = -PI/2 faces +X (right on minimap, +X)
    ctx.rotate(-kartRotation);

    // Glow
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 8;

    // Blip circle
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Direction arrow / tip
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(0, -6.5);
    ctx.lineTo(-3, -1);
    ctx.lineTo(3, -1);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  show(): void {
    this.container.style.display = 'block';
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  dispose(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
