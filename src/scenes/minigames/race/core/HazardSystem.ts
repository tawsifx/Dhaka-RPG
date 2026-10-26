// src/scenes/minigames/race/core/HazardSystem.ts - Pure deterministic Dhaka street hazards simulation
import { HitReactionType } from '../../../../config/items.race.db';

export interface CrossingRickshawHazard {
  id: string;
  type: 'crossing_rickshaw';
  x: number;
  y: number;
  z: number;
  minX: number;
  maxX: number;
  speed: number;
  direction: 1 | -1;
  radiusMeters: number;
}

export interface PetalSlickHazard {
  id: string;
  type: 'petal_slick';
  x: number;
  y: number;
  z: number;
  radiusMeters: number;
}

export class HazardSystem {
  private crossingRickshaws: CrossingRickshawHazard[] = [];
  private petalSlicks: PetalSlickHazard[] = [];

  constructor() {
    // 1. Crossing Rickshaws at Curzon Cross-street & TSC square
    this.crossingRickshaws = [
      {
        id: 'crossing_1',
        type: 'crossing_rickshaw',
        x: -8.0,
        y: 0.2,
        z: -120.0,
        minX: -10.0,
        maxX: 10.0,
        speed: 4.5,
        direction: 1,
        radiusMeters: 1.5
      },
      {
        id: 'crossing_2',
        type: 'crossing_rickshaw',
        x: 6.0,
        y: 0.2,
        z: -120.0,
        minX: -10.0,
        maxX: 10.0,
        speed: 4.5,
        direction: -1,
        radiusMeters: 1.5
      }
    ];

    // 2. Petal Slicks on technical hairpin entries
    this.petalSlicks = [
      { id: 'petal_1', type: 'petal_slick', x: 210.0, y: 0.1, z: -160.0, radiusMeters: 2.5 },
      { id: 'petal_2', type: 'petal_slick', x: 230.0, y: 0.1, z: -180.0, radiusMeters: 2.2 },
      { id: 'petal_3', type: 'petal_slick', x: -60.0, y: 0.1, z: 90.0, radiusMeters: 2.8 }
    ];
  }

  getCrossingRickshaws(): CrossingRickshawHazard[] {
    return this.crossingRickshaws;
  }

  getPetalSlicks(): PetalSlickHazard[] {
    return this.petalSlicks;
  }

  /**
   * Advance dynamic obstacles.
   */
  update(
    dt: number,
    karts: Array<{ id: string; x: number; y: number; z: number; isImmune: boolean; isBoosting: boolean }>
  ): Array<{ kartId: string; hitReaction: HitReactionType; hazardId: string }> {
    const hits: Array<{ kartId: string; hitReaction: HitReactionType; hazardId: string }> = [];

    // 1. Update crossing rickshaws
    for (const r of this.crossingRickshaws) {
      r.x += r.direction * r.speed * dt;
      if (r.x >= r.maxX) {
        r.x = r.maxX;
        r.direction = -1;
      } else if (r.x <= r.minX) {
        r.x = r.minX;
        r.direction = 1;
      }

      // Check collision
      for (const kart of karts) {
        if (kart.isImmune) continue;

        const dx = kart.x - r.x;
        const dz = kart.z - r.z;
        const distSq = dx * dx + dz * dz;
        const hitRadius = r.radiusMeters + 1.0;

        if (distSq <= hitRadius * hitRadius) {
          hits.push({ kartId: kart.id, hitReaction: 'explosion', hazardId: r.id });
        }
      }
    }

    // 2. Check petal slicks
    for (const p of this.petalSlicks) {
      for (const kart of karts) {
        if (kart.isImmune || kart.isBoosting) continue; // Boost shields against petal slicks!

        const dx = kart.x - p.x;
        const dz = kart.z - p.z;
        const distSq = dx * dx + dz * dz;
        const hitRadius = p.radiusMeters + 0.8;

        if (distSq <= hitRadius * hitRadius) {
          hits.push({ kartId: kart.id, hitReaction: 'spin_out', hazardId: p.id });
        }
      }
    }

    return hits;
  }

  reset(): void {
    if (this.crossingRickshaws[0]) {
      this.crossingRickshaws[0].x = -8.0;
      this.crossingRickshaws[0].direction = 1;
    }
    if (this.crossingRickshaws[1]) {
      this.crossingRickshaws[1].x = 6.0;
      this.crossingRickshaws[1].direction = -1;
    }
  }
}
