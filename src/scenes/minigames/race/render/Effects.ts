// src/scenes/minigames/race/render/Effects.ts - Pooled particle effects via THREE.InstancedMesh (Sparks, Smoke, Flames & Splashes)
import * as THREE from 'three';
import { KartState } from '../../../../types/race.types';

export interface ParticleEffectOptions {
  maxParticles?: number;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  scale: number;
  maxLife: number;
  life: number;
  color: THREE.Color;
}

export class RaceEffects {
  readonly group: THREE.Group;
  private instancedMesh: THREE.InstancedMesh;
  private particles: Particle[] = [];
  private maxParticles: number;
  private dummy = new THREE.Object3D();
  private emitTimer = 0;

  // Skid Marks Pool (Instanced flat quads on ground)
  private skidMesh: THREE.InstancedMesh;
  private maxSkids = 64;
  private skidIndex = 0;
  private skidTimer = 0;

  constructor(scene: THREE.Scene, options: ParticleEffectOptions = {}) {
    this.group = new THREE.Group();
    this.group.name = 'RaceEffects';

    const isMobile = typeof window !== 'undefined' && (window.innerWidth < 800 || 'ontouchstart' in window);
    this.maxParticles = options.maxParticles || (isMobile ? 80 : 180);

    // 1. Instanced Particles (Cube / Diamond particle geometry)
    const pGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const pMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85
    });

    this.instancedMesh = new THREE.InstancedMesh(pGeo, pMat, this.maxParticles);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }
    this.group.add(this.instancedMesh);

    // Initialize particle pool
    const defaultColor = new THREE.Color(1, 1, 1);
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        scale: 0.1,
        maxLife: 1.0,
        life: 0,
        color: defaultColor.clone()
      });
      this.dummy.position.set(0, -100, 0);
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
      this.instancedMesh.setColorAt(i, defaultColor);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) this.instancedMesh.instanceColor.needsUpdate = true;

    // 2. Instanced Skid Marks
    const skidGeo = new THREE.PlaneGeometry(0.35, 0.5);
    skidGeo.rotateX(-Math.PI / 2);
    const skidMat = new THREE.MeshBasicMaterial({
      color: 0x111827,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
    this.skidMesh = new THREE.InstancedMesh(skidGeo, skidMat, this.maxSkids);
    this.skidMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < this.maxSkids; i++) {
      this.dummy.position.set(0, -100, 0);
      this.dummy.updateMatrix();
      this.skidMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.skidMesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.skidMesh);

    scene.add(this.group);
  }

  spawnParticle(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    scale: number,
    lifeSec: number,
    colorHex: number
  ): void {
    // Find inactive or oldest particle
    let p = this.particles.find((item) => !item.active);
    if (!p) {
      p = this.particles[0]; // Recycle oldest
    }

    p.active = true;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.scale = scale;
    p.maxLife = lifeSec;
    p.life = lifeSec;
    p.color.setHex(colorHex);
  }

  spawnSkidMark(x: number, z: number, rotation: number): void {
    const idx = this.skidIndex % this.maxSkids;
    this.skidIndex++;

    this.dummy.position.set(x, 0.042, z);
    this.dummy.rotation.set(0, rotation, 0);
    this.dummy.scale.set(1, 1, 1);
    this.dummy.updateMatrix();
    this.skidMesh.setMatrixAt(idx, this.dummy.matrix);
    this.skidMesh.instanceMatrix.needsUpdate = true;
  }

  update(dt: number, kart: KartState): void {
    this.emitTimer += dt;
    this.skidTimer += dt;

    // 1. Drift Sparks & Smoke Emission
    if (kart.drift && kart.drift.isDrifting && Math.abs(kart.speed) > 5) {
      const tier = kart.drift.tier;
      let sparkColor = 0x93c5fd; // Default light blue
      if (tier === 3) sparkColor = 0xa855f7; // Purple
      else if (tier === 2) sparkColor = 0xf97316; // Orange
      else if (tier === 1) sparkColor = 0x38bdf8; // Blue

      if (this.emitTimer > 0.035) {
        // Emit from rear tires
        const backX = kart.x + Math.sin(kart.rotation) * 0.7;
        const backZ = kart.z + Math.cos(kart.rotation) * 0.7;

        // Drift sparks
        this.spawnParticle(
          backX + (Math.random() - 0.5) * 0.8,
          kart.y + 0.15,
          backZ + (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 3.0,
          Math.random() * 2.5 + 0.5,
          (Math.random() - 0.5) * 3.0,
          tier > 0 ? 0.22 : 0.12,
          0.35,
          sparkColor
        );

        // Tire Smoke
        this.spawnParticle(
          backX + (Math.random() - 0.5) * 0.6,
          kart.y + 0.1,
          backZ + (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 0.8,
          Math.random() * 0.8 + 0.2,
          (Math.random() - 0.5) * 0.8,
          0.28,
          0.45,
          kart.surface === 'grass' ? 0x4ade80 : 0xd1d5db
        );
      }

      // Lay down skid marks
      if (this.skidTimer > 0.08) {
        this.skidTimer = 0;
        this.spawnSkidMark(kart.x, kart.z, kart.rotation);
      }
    }

    // 2. Boost Flame Exhaust
    if (kart.boost && kart.boost.active) {
      if (this.emitTimer > 0.025) {
        const backX = kart.x + Math.sin(kart.rotation) * 0.8;
        const backZ = kart.z + Math.cos(kart.rotation) * 0.8;
        // High-velocity orange/yellow flame particle
        this.spawnParticle(
          backX + (Math.random() - 0.5) * 0.3,
          kart.y + 0.35,
          backZ + (Math.random() - 0.5) * 0.3,
          Math.sin(kart.rotation) * 4.0 + (Math.random() - 0.5) * 1.5,
          Math.random() * 1.5 + 0.2,
          Math.cos(kart.rotation) * 4.0 + (Math.random() - 0.5) * 1.5,
          0.32,
          0.25,
          Math.random() > 0.5 ? 0xf97316 : 0xfacc15
        );
      }
    }

    // 3. Puddle Splash
    if (kart.surface === 'puddle' && Math.abs(kart.speed) > 6 && this.emitTimer > 0.05) {
      this.spawnParticle(
        kart.x + (Math.random() - 0.5) * 1.2,
        kart.y + 0.1,
        kart.z + (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 4.0,
        Math.random() * 3.0 + 1.0,
        (Math.random() - 0.5) * 4.0,
        0.20,
        0.30,
        0x38bdf8
      );
    }

    if (this.emitTimer > 0.05) {
      this.emitTimer = 0;
    }

    // 4. Step active particles
    let matrixNeedsUpdate = false;
    let colorNeedsUpdate = false;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.dummy.position.set(0, -100, 0);
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
        matrixNeedsUpdate = true;
        continue;
      }

      // Physics integration
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 9.8 * dt * 0.4; // Light gravity

      const lifeRatio = p.life / p.maxLife;
      const currentScale = p.scale * lifeRatio;

      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.scale.set(currentScale, currentScale, currentScale);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
      this.instancedMesh.setColorAt(i, p.color);
      matrixNeedsUpdate = true;
      colorNeedsUpdate = true;
    }

    if (matrixNeedsUpdate) {
      this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
    if (colorNeedsUpdate && this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  dispose(): void {
    this.instancedMesh.geometry.dispose();
    if (Array.isArray(this.instancedMesh.material)) {
      this.instancedMesh.material.forEach((m) => m.dispose());
    } else {
      this.instancedMesh.material.dispose();
    }

    this.skidMesh.geometry.dispose();
    if (Array.isArray(this.skidMesh.material)) {
      this.skidMesh.material.forEach((m) => m.dispose());
    } else {
      this.skidMesh.material.dispose();
    }

    this.particles = [];
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
    this.group.clear();
  }
}
