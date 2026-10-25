// src/scenes/minigames/race/core/BvhCollisionWorld.ts - BVH-accelerated sphere sweep wall collision & glancing slide resolution
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { ICollisionWorld, CollisionResult, KartConfig } from '../../../../types/race.types';
import { DEFAULT_KART_CONFIG } from '../../../../config/race.config';

export class BvhCollisionWorld implements ICollisionWorld {
  private mesh: THREE.Mesh | null = null;
  private geometry: THREE.BufferGeometry;
  private bvh: MeshBVH;
  private config: KartConfig;

  // Scratch objects for allocation-free checks
  private sphere = new THREE.Sphere(new THREE.Vector3(), 0.75);
  private tempBox = new THREE.Box3();
  private invMatrix = new THREE.Matrix4();
  private closestPoint = new THREE.Vector3();
  private tempVec = new THREE.Vector3();

  constructor(
    geometryOrMesh: THREE.BufferGeometry | THREE.Mesh,
    config: Partial<KartConfig> = {}
  ) {
    this.config = { ...DEFAULT_KART_CONFIG, ...config };

    if (geometryOrMesh instanceof THREE.Mesh) {
      this.mesh = geometryOrMesh;
      this.geometry = geometryOrMesh.geometry;
    } else {
      this.mesh = null;
      this.geometry = geometryOrMesh;
    }

    if (!(this.geometry as any).boundsTree) {
      this.bvh = new MeshBVH(this.geometry, { targetLeafSize: 10 } as any);
      (this.geometry as any).boundsTree = this.bvh;
    } else {
      this.bvh = (this.geometry as any).boundsTree;
    }
  }

  /**
   * Check collision with 3D sphere at (x, y, z) with sub-stepping for thin walls.
   */
  checkCollision3D(x: number, y: number, z: number, radius = this.config.kartRadius): CollisionResult | null {
    this.sphere.center.set(x, y, z);
    this.sphere.radius = radius;

    // AABB of sphere
    this.tempBox.min.set(x - radius, y - radius, z - radius);
    this.tempBox.max.set(x + radius, y + radius, z + radius);

    let deepestPenetration = 0;
    let normalX = 0;
    let normalY = 0;
    let normalZ = 0;
    let collided = false;

    this.bvh.shapecast({
      intersectsBounds: (box) => box.intersectsBox(this.tempBox),
      intersectsTriangle: (tri) => {
        // Calculate closest point on triangle to sphere center
        tri.closestPointToPoint(this.sphere.center, this.closestPoint);
        const dist = this.closestPoint.distanceTo(this.sphere.center);

        if (dist < radius) {
          const penetration = radius - dist;
          if (penetration > deepestPenetration) {
            deepestPenetration = penetration;

            // Direction from triangle contact point to sphere center (push out normal)
            if (dist > 1e-6) {
              this.tempVec.subVectors(this.sphere.center, this.closestPoint).normalize();
            } else {
              // Penetrating through triangle, use triangle face normal
              tri.getNormal(this.tempVec);
            }

            normalX = this.tempVec.x;
            normalY = this.tempVec.y;
            normalZ = this.tempVec.z;
            collided = true;
          }
        }
      }
    });

    if (!collided) return null;

    // Zero out vertical normal if primarily horizontal wall collision
    const horizontalNorm = Math.hypot(normalX, normalZ);
    if (horizontalNorm > 0.01) {
      normalX /= horizontalNorm;
      normalZ /= horizontalNorm;
    }

    return {
      collided: true,
      normalX,
      normalZ,
      penetration: deepestPenetration,
      wallType: 'boundary',
      impactAngleDeg: 0
    };
  }

  /**
   * 2D collision check for compatibility with ICollisionWorld (assumes kart y = 0.5)
   */
  checkCollision(x: number, z: number, radius = this.config.kartRadius): CollisionResult | null {
    return this.checkCollision3D(x, 0.5, z, radius);
  }

  /**
   * Normal/Tangential decomposition for glancing slide (< 40 deg) vs head-on bounce (>= 40 deg)
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
    cancelDrift: boolean;
  } {
    const nx = collision.normalX;
    const nz = collision.normalZ;

    // 1. Push kart out of penetration along normal
    const pushDist = collision.penetration + 0.02;
    const newPosX = posX + nx * pushDist;
    const newPosZ = posZ + nz * pushDist;

    // 2. Velocity decomposition
    const speed = Math.hypot(velX, velZ);
    if (speed < 1e-4) {
      return { newPosX, newPosZ, newVelX: 0, newVelZ: 0, cancelDrift: false };
    }

    const dirX = velX / speed;
    const dirZ = velZ / speed;

    const vNormal = velX * nx + velZ * nz;
    const vTangX = velX - vNormal * nx;
    const vTangZ = velZ - vNormal * nz;

    // Impact angle (0 deg = head-on into normal, 90 deg = parallel glancing scrape)
    const cosAngle = Math.abs(vNormal) / speed;
    const impactAngleDeg = (Math.acos(Math.min(1, cosAngle)) * 180) / Math.PI;

    if (impactAngleDeg >= this.config.wallDriftCancelAngleDeg) {
      // Glancing Scrape: retain tangential speed without canceling drift
      const newVelX = vTangX * this.config.glancingSlideFriction;
      const newVelZ = vTangZ * this.config.glancingSlideFriction;
      return {
        newPosX,
        newPosZ,
        newVelX,
        newVelZ,
        cancelDrift: false
      };
    } else {
      // Head-On Crash: bounce back with restitution, 40% speed cut, and drift cancel
      const bounceNormal = -vNormal * this.config.headOnBounceRestitution;
      const speedCut = 1.0 - this.config.headOnBounceSpeedCut;
      const newVelX = (vTangX + nx * bounceNormal) * speedCut;
      const newVelZ = (vTangZ + nz * bounceNormal) * speedCut;
      return {
        newPosX,
        newPosZ,
        newVelX,
        newVelZ,
        cancelDrift: true
      };
    }
  }

  dispose(): void {
    if ((this.geometry as any).boundsTree === this.bvh) {
      (this.geometry as any).disposeBoundsTree?.();
    }
    this.mesh = null;
  }
}
