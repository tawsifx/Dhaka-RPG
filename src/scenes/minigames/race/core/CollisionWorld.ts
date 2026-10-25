// src/scenes/minigames/race/core/CollisionWorld.ts - Pure analytic collision detection & Mario Kart wall response
import { CollisionResult, ICollisionWorld, KartConfig } from '../../../../types/race.types';
import { DEFAULT_KART_CONFIG } from '../../../../config/race.config';

export interface CircleObstacle {
  id: string;
  x: number;
  z: number;
  radius: number;
}

export interface WallSegment {
  id: string;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  normalX: number;
  normalZ: number;
}

export class AnalyticCollisionWorld implements ICollisionWorld {
  private config: KartConfig;
  private minX = -200;
  private maxX = 200;
  private minZ = -250;
  private maxZ = 250;
  private obstacles: CircleObstacle[] = [];
  private walls: WallSegment[] = [];

  constructor(config: Partial<KartConfig> = {}) {
    this.config = { ...DEFAULT_KART_CONFIG, ...config };
    this.setupDefaultArenaColliders();
  }

  setConfig(config: Partial<KartConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private setupDefaultArenaColliders(): void {
    // 1. Slalom Cones in West Apron (x = -18)
    const pillarPositions = [
      { id: 'p_1', x: -18, z: -40, radius: 0.8 },
      { id: 'p_2', x: -18, z: -20, radius: 0.8 },
      { id: 'p_3', x: -18, z: 0, radius: 0.8 },
      { id: 'p_4', x: -18, z: 20, radius: 0.8 },
      { id: 'p_5', x: -18, z: 40, radius: 0.8 }
    ];
    this.obstacles.push(...pillarPositions);
  }

  addObstacle(obstacle: CircleObstacle): void {
    this.obstacles.push(obstacle);
  }

  /**
   * Tests kart circle against boundary walls and circle obstacles.
   */
  checkCollision(x: number, z: number, radius = this.config.kartRadius): CollisionResult | null {
    // 1. Boundary Wall Checks
    // West Wall (x = minX)
    if (x - radius < this.minX) {
      return {
        collided: true,
        normalX: 1,
        normalZ: 0,
        penetration: this.minX - (x - radius),
        wallType: 'boundary',
        impactAngleDeg: 0
      };
    }
    // East Wall (x = maxX)
    if (x + radius > this.maxX) {
      return {
        collided: true,
        normalX: -1,
        normalZ: 0,
        penetration: x + radius - this.maxX,
        wallType: 'boundary',
        impactAngleDeg: 0
      };
    }
    // North Wall (z = minZ)
    if (z - radius < this.minZ) {
      return {
        collided: true,
        normalX: 0,
        normalZ: 1,
        penetration: this.minZ - (z - radius),
        wallType: 'boundary',
        impactAngleDeg: 0
      };
    }
    // South Wall (z = maxZ)
    if (z + radius > this.maxZ) {
      return {
        collided: true,
        normalX: 0,
        normalZ: -1,
        penetration: z + radius - this.maxZ,
        wallType: 'boundary',
        impactAngleDeg: 0
      };
    }

    // 2. Circle Obstacles
    for (const obs of this.obstacles) {
      const dx = x - obs.x;
      const dz = z - obs.z;
      const distSq = dx * dx + dz * dz;
      const minDist = radius + obs.radius;

      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq) || 0.001;
        return {
          collided: true,
          normalX: dx / dist,
          normalZ: dz / dist,
          penetration: minDist - dist,
          wallType: 'obstacle',
          impactAngleDeg: 0
        };
      }
    }

    return null;
  }

  /**
   * Resolves velocity and position after a collision:
   * - Pushes kart out by penetration depth
   * - Decomposes velocity into normal and tangential components
   * - Glancing hits slide along the wall with slight friction
   * - Head-on hits bounce back with restitution and cut forward speed
   */
  resolveResponse(
    posX: number,
    posZ: number,
    velX: number,
    velZ: number,
    collision: CollisionResult
  ): {
    newPosX: number;
    newPosZ: number;
    newVelX: number;
    newVelZ: number;
    speedLoss: number;
    cancelDrift: boolean;
    shakeIntensity: number;
  } {
    // 1. Position Push-Out
    const newPosX = posX + collision.normalX * (collision.penetration + 0.01);
    const newPosZ = posZ + collision.normalZ * (collision.penetration + 0.01);

    const speed = Math.hypot(velX, velZ);
    if (speed < 0.001) {
      return {
        newPosX,
        newPosZ,
        newVelX: 0,
        newVelZ: 0,
        speedLoss: 0,
        cancelDrift: false,
        shakeIntensity: 0
      };
    }

    // 2. Velocity Decomposition
    // Normal velocity component v_n = v . normal
    const vNormal = velX * collision.normalX + velZ * collision.normalZ;

    // Moving away from wall already?
    if (vNormal >= 0) {
      return {
        newPosX,
        newPosZ,
        newVelX: velX,
        newVelZ: velZ,
        speedLoss: 0,
        cancelDrift: false,
        shakeIntensity: 0
      };
    }

    // Tangential velocity component v_t = v - (v . normal) * normal
    const vTanX = velX - vNormal * collision.normalX;
    const vTanZ = velZ - vNormal * collision.normalZ;

    // Impact angle (0 deg = head-on into normal, 90 deg = parallel glancing scrape)
    const cosAngle = Math.abs(vNormal) / speed;
    const impactAngleDeg = (Math.acos(Math.min(1, cosAngle)) * 180) / Math.PI;

    if (impactAngleDeg >= this.config.wallDriftCancelAngleDeg) {
      // ── GLANCING SCRAPE (Slides along wall) ──
      const newVelX = vTanX * this.config.glancingSlideFriction;
      const newVelZ = vTanZ * this.config.glancingSlideFriction;
      const newSpeed = Math.hypot(newVelX, newVelZ);

      return {
        newPosX,
        newPosZ,
        newVelX,
        newVelZ,
        speedLoss: speed - newSpeed,
        cancelDrift: false,
        shakeIntensity: 0.15
      };
    } else {
      // ── HEAD-ON IMPACT (Bounce + Speed Cut + Cancel Drift) ──
      const bounceNormal = -vNormal * this.config.headOnBounceRestitution;
      let newVelX = (vTanX + collision.normalX * bounceNormal) * (1 - this.config.headOnBounceSpeedCut);
      let newVelZ = (vTanZ + collision.normalZ * bounceNormal) * (1 - this.config.headOnBounceSpeedCut);

      const newSpeed = Math.hypot(newVelX, newVelZ);

      return {
        newPosX,
        newPosZ,
        newVelX,
        newVelZ,
        speedLoss: speed - newSpeed,
        cancelDrift: true,
        shakeIntensity: 0.45
      };
    }
  }

  /**
   * Convenience high-level test & resolver for position, heading and speed.
   */
  resolve(
    x: number,
    z: number,
    radius: number,
    headingRad: number,
    speed: number
  ): {
    collided: boolean;
    bounce: boolean;
    newX: number;
    newZ: number;
    resolvedSpeed: number;
    cancelDrift: boolean;
  } {
    const col = this.checkCollision(x, z, radius);
    if (!col) {
      return {
        collided: false,
        bounce: false,
        newX: x,
        newZ: z,
        resolvedSpeed: speed,
        cancelDrift: false
      };
    }

    const velX = -Math.sin(headingRad) * speed;
    const velZ = -Math.cos(headingRad) * speed;
    const resp = this.resolveResponse(x, z, velX, velZ, col);
    const newSpeed = Math.hypot(resp.newVelX, resp.newVelZ);
    const dot = velX * col.normalX + velZ * col.normalZ;
    const bounce = dot < -0.3;

    return {
      collided: true,
      bounce,
      newX: resp.newPosX,
      newZ: resp.newPosZ,
      resolvedSpeed: newSpeed,
      cancelDrift: resp.cancelDrift
    };
  }
}
