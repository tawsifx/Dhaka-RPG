// src/scenes/minigames/race/core/SurfaceModel.ts - Pure analytic surface query & grip model
import { SurfaceType, SurfaceQueryResult, ISurfaceQuery } from '../../../../types/race.types';

export interface SurfaceZoneRect {
  id: string;
  type: SurfaceType;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  isBoostPad?: boolean;
  isRamp?: boolean;
  rampAngleRad?: number;
}

export interface SurfaceZoneCircle {
  id: string;
  type: SurfaceType;
  x: number;
  z: number;
  radius: number;
  isBoostPad?: boolean;
}

export const SURFACE_DEFINITIONS: Record<SurfaceType, Readonly<Omit<SurfaceQueryResult, 'type'>>> = {
  grass: {
    speedMultiplier: 0.65,
    accelerationMultiplier: 0.50,
    steerMultiplier: 0.85,
    frictionMultiplier: 1.80,
    isBoostPad: false,
    isRamp: false
  },
  mud: {
    speedMultiplier: 0.40,
    accelerationMultiplier: 0.35,
    steerMultiplier: 0.60,
    frictionMultiplier: 2.50,
    isBoostPad: false,
    isRamp: false
  },
  puddle: {
    speedMultiplier: 0.82,
    accelerationMultiplier: 0.70,
    steerMultiplier: 0.45,
    frictionMultiplier: 0.80,
    isBoostPad: false,
    isRamp: false
  },
  boost_pad: {
    speedMultiplier: 1.80,
    accelerationMultiplier: 3.00,
    steerMultiplier: 1.00,
    frictionMultiplier: 0.50,
    isBoostPad: true,
    isRamp: false
  },
  asphalt: {
    speedMultiplier: 1.00,
    accelerationMultiplier: 1.00,
    steerMultiplier: 1.00,
    frictionMultiplier: 1.00,
    isBoostPad: false,
    isRamp: false
  }
};

export class AnalyticSurfaceModel implements ISurfaceQuery {
  private rectZones: SurfaceZoneRect[] = [];
  private circleZones: SurfaceZoneCircle[] = [];
  private overrideType: SurfaceType | null = null;
  private boostPadCooldowns: Map<string, number> = new Map();

  constructor() {
    this.setupDefaultArenaZones();
  }

  setOverride(type: SurfaceType | null): void {
    this.overrideType = type;
  }

  getOverride(): SurfaceType | null {
    return this.overrideType;
  }

  addRectZone(zone: SurfaceZoneRect): void {
    this.rectZones.push(zone);
  }

  addCircleZone(zone: SurfaceZoneCircle): void {
    this.circleZones.push(zone);
  }

  /**
   * Sets up the analytic zones for the M2 test arena:
   * - Center grass infield
   * - South mud patch
   * - East rainwater puddle
   * - 3 Boost pads (Petal Pads)
   * - 2 Launch ramps
   */
  private setupDefaultArenaZones(): void {
    // 1. Grass Infield (Inside oval loop, between front X=[-7,7] and back X=[29,43] straights)
    this.addRectZone({
      id: 'grass_infield',
      type: 'grass',
      minX: 10,
      maxX: 26,
      minZ: -45,
      maxZ: 45
    });

    // 2. Mud Patch (South curve outside run-off)
    this.addCircleZone({
      id: 'mud_patch_south',
      type: 'mud',
      x: 36,
      z: 70,
      radius: 12
    });

    // 3. Rainwater Puddle (North curve chicane)
    this.addCircleZone({
      id: 'puddle_north',
      type: 'puddle',
      x: 18,
      z: -55,
      radius: 9
    });

    // 4. Boost Pads (Petal Pads) on Straightaways
    this.addRectZone({
      id: 'boost_pad_front',
      type: 'boost_pad',
      minX: -4,
      maxX: 4,
      minZ: -25,
      maxZ: -15,
      isBoostPad: true
    });

    this.addRectZone({
      id: 'boost_pad_back',
      type: 'boost_pad',
      minX: 32,
      maxX: 40,
      minZ: 15,
      maxZ: 25,
      isBoostPad: true
    });

    // 5. Jump Ramp Launch Lip (Back straightaway)
    this.addRectZone({
      id: 'ramp_back',
      type: 'asphalt',
      minX: 32,
      maxX: 40,
      minZ: -16,
      maxZ: -13,
      isRamp: true,
      rampAngleRad: (16 * Math.PI) / 180 // 16 degree incline
    });
  }

  updateCooldowns(dt: number): void {
    for (const [id, time] of this.boostPadCooldowns.entries()) {
      const remaining = time - dt;
      if (remaining <= 0) {
        this.boostPadCooldowns.delete(id);
      } else {
        this.boostPadCooldowns.set(id, remaining);
      }
    }
  }

  query(x: number, z: number): SurfaceQueryResult {
    if (this.overrideType) {
      return this.buildResult(this.overrideType);
    }

    // 1. Check Rectangular Zones (Higher priority: boost pads, ramps, mud, grass)
    for (const zone of this.rectZones) {
      if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ) {
        if (zone.isBoostPad) {
          const onCooldown = this.boostPadCooldowns.has(zone.id);
          if (!onCooldown) {
            this.boostPadCooldowns.set(zone.id, 0.6); // 0.6s cooldown before pad re-triggers
            return {
              ...this.buildResult('boost_pad'),
              isBoostPad: true
            };
          }
          return {
            ...this.buildResult('boost_pad'),
            isBoostPad: false
          };
        }
        return {
          ...this.buildResult(zone.type),
          isBoostPad: Boolean(zone.isBoostPad),
          isRamp: Boolean(zone.isRamp),
          rampAngleRad: zone.rampAngleRad
        };
      }
    }

    // 2. Check Circular Zones
    for (const circle of this.circleZones) {
      const dx = x - circle.x;
      const dz = z - circle.z;
      if (dx * dx + dz * dz <= circle.radius * circle.radius) {
        return {
          ...this.buildResult(circle.type),
          isBoostPad: Boolean(circle.isBoostPad)
        };
      }
    }

    // Default: Clean asphalt
    return this.buildResult('asphalt');
  }

  private buildResult(type: SurfaceType): SurfaceQueryResult {
    const def = SURFACE_DEFINITIONS[type] || SURFACE_DEFINITIONS.asphalt;
    return {
      type,
      ...def
    };
  }
}
