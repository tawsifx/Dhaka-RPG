// src/scenes/minigames/race/core/BvhGroundQuery.ts - BVH-accelerated downward ground raycasting
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import {
  IGroundQuery,
  GroundQueryResult,
  SurfaceQueryResult,
  SurfaceType
} from '../../../../types/race.types';

export interface BvhGroundQueryOptions {
  upOffset?: number; // Ray start offset above kart (default 2.0m)
  rayLength?: number; // Downward ray length (default 25.0m)
  snapTolerance?: number; // Max distance below kart considered "on ground" (default 1.2m)
  surfaceMultiplierOverrides?: Partial<Record<SurfaceType, {
    speedMultiplier?: number;
    accelerationMultiplier?: number;
    steerMultiplier?: number;
    frictionMultiplier?: number;
  }>>;
}

export class BvhGroundQuery implements IGroundQuery {
  private mesh: THREE.Mesh | null = null;
  private geometry: THREE.BufferGeometry;
  private bvh: MeshBVH;
  private upOffset: number;
  private rayLength: number;
  private snapTolerance: number;

  // Cached Three.js objects to avoid per-query heap allocations
  private raycaster = new THREE.Raycaster();
  private invMatrix = new THREE.Matrix4();
  private localRay = new THREE.Ray();
  private vA = new THREE.Vector3();
  private vB = new THREE.Vector3();
  private vC = new THREE.Vector3();
  private triNormal = new THREE.Vector3();
  private hitPoint = new THREE.Vector3();

  // Material name / group mapping for surface types
  private materialSurfaceMap: Map<number, SurfaceType> = new Map();

  constructor(
    geometryOrMesh: THREE.BufferGeometry | THREE.Mesh,
    options: BvhGroundQueryOptions = {}
  ) {
    this.upOffset = options.upOffset ?? 2.0;
    this.rayLength = options.rayLength ?? 25.0;
    this.snapTolerance = options.snapTolerance ?? 1.2;

    if (geometryOrMesh instanceof THREE.Mesh) {
      this.mesh = geometryOrMesh;
      this.geometry = geometryOrMesh.geometry;
    } else {
      this.mesh = null;
      this.geometry = geometryOrMesh;
    }

    // Ensure BVH boundsTree exists
    if (!(this.geometry as any).boundsTree) {
      this.bvh = new MeshBVH(this.geometry, { targetLeafSize: 10 } as any);
      (this.geometry as any).boundsTree = this.bvh;
    } else {
      this.bvh = (this.geometry as any).boundsTree;
    }

    this.buildSurfaceMapping();
  }

  private buildSurfaceMapping(): void {
    if (this.mesh && Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((mat, idx) => {
        this.materialSurfaceMap.set(idx, this.parseSurfaceName(mat.name));
      });
    } else if (this.mesh && this.mesh.material) {
      const mat = this.mesh.material as any;
      this.materialSurfaceMap.set(0, this.parseSurfaceName(mat.name || ''));
    }
  }

  /**
   * Parses surface type from material or node name following canonical convention:
   * surf_asphalt, surf_grass, surf_mud, surf_puddle, surf_boostpad, surf_ramp, surf_offtrack_kill
   */
  public parseSurfaceName(name = ''): SurfaceType {
    const lower = name.toLowerCase();
    if (lower.includes('boostpad') || lower.includes('boost_pad') || lower.includes('petal_pad')) {
      return 'boost_pad';
    }
    if (lower.includes('ramp')) {
      return 'ramp';
    }
    if (lower.includes('puddle') || lower.includes('water')) {
      return 'puddle';
    }
    if (lower.includes('mud')) {
      return 'mud';
    }
    if (lower.includes('grass') || lower.includes('infield')) {
      return 'grass';
    }
    if (lower.includes('kill') || lower.includes('offtrack')) {
      return 'offtrack_kill';
    }
    return 'asphalt';
  }

  /**
   * Multi-level downward ground query:
   * Raycasts downward from (x, y + upOffset, z). If in multi-level geometry (e.g. flyover),
   * picks the highest ground hit that is at or below the kart's current elevation + 0.5m.
   */
  queryGround(x: number, y: number, z: number): GroundQueryResult {
    const rayOrigin = this.localRay.origin.set(x, y + this.upOffset, z);
    const rayDir = this.localRay.direction.set(0, -1, 0);

    if (this.mesh) {
      this.invMatrix.copy(this.mesh.matrixWorld).invert();
      this.localRay.applyMatrix4(this.invMatrix);
    }

    // Raycast against BVH
    const hits: any[] = this.bvh.raycast(this.localRay, THREE.DoubleSide as any);

    if (!hits || hits.length === 0) {
      return this.createFallbackResult(false, y);
    }

    // Transform hits back to world space and filter for multi-level elevations
    // Pick the highest hit that is below ray origin (allowing smooth incline climbs up to upOffset)
    let bestHit: any = null;
    let maxValidY = -Infinity;
    const thresholdY = y + this.upOffset - 0.1;

    for (let i = 0; i < hits.length; i++) {
      const h = hits[i];
      let worldY = h.point.y;
      if (this.mesh) {
        this.hitPoint.copy(h.point).applyMatrix4(this.mesh.matrixWorld);
        worldY = this.hitPoint.y;
      }

      if (worldY <= thresholdY && worldY > maxValidY) {
        maxValidY = worldY;
        bestHit = h;
      }
    }

    // If no surface found directly beneath kart (e.g. dropped from very high), pick closest hit below ray origin
    if (!bestHit && hits.length > 0) {
      hits.sort((a, b) => a.distance - b.distance);
      bestHit = hits[0];
      if (this.mesh) {
        this.hitPoint.copy(bestHit.point).applyMatrix4(this.mesh.matrixWorld);
        maxValidY = this.hitPoint.y;
      } else {
        maxValidY = bestHit.point.y;
      }
    }

    const groundY = maxValidY;
    const onGround = Math.abs(y - groundY) <= this.snapTolerance;

    // Calculate face normal from hit triangle
    this.extractTriangleNormal(bestHit.faceIndex);

    // Determine surface type
    let surfaceType: SurfaceType = 'asphalt';
    const matIdx = bestHit.face?.materialIndex ?? bestHit.materialIndex ?? 0;
    if (this.materialSurfaceMap.has(matIdx)) {
      surfaceType = this.materialSurfaceMap.get(matIdx)!;
    } else if (bestHit.face && (bestHit.face as any).materialName) {
      surfaceType = this.parseSurfaceName((bestHit.face as any).materialName);
    } else if (this.mesh && this.mesh.material) {
      const m = this.mesh.material as any;
      surfaceType = this.parseSurfaceName(m.name || '');
    }

    const isBoostPad = surfaceType === 'boost_pad';
    const isRamp = surfaceType === 'ramp';
    const isKillPlane = surfaceType === 'offtrack_kill' || groundY < -15.0;

    let rampAngleRad = 0;
    if (isRamp) {
      // Angle between normal and vertical Up (0, 1, 0)
      rampAngleRad = Math.acos(Math.max(0, Math.min(1, this.triNormal.y)));
    }

    // Multipliers based on surface type
    let speedMult = 1.0;
    let accelMult = 1.0;
    let steerMult = 1.0;
    let frictionMult = 1.0;

    switch (surfaceType) {
      case 'grass':
        speedMult = 0.65;
        accelMult = 0.70;
        frictionMult = 1.8;
        break;
      case 'mud':
        speedMult = 0.40;
        accelMult = 0.45;
        steerMult = 0.70;
        frictionMult = 2.5;
        break;
      case 'puddle':
        speedMult = 0.82;
        accelMult = 0.85;
        steerMult = 0.50; // Slick turning
        frictionMult = 0.6;
        break;
      case 'boost_pad':
        speedMult = 1.0;
        break;
      case 'offtrack_kill':
        speedMult = 0.1;
        break;
      default:
        speedMult = 1.0;
        break;
    }

    return {
      onGround,
      height: groundY,
      normalX: this.triNormal.x,
      normalY: this.triNormal.y,
      normalZ: this.triNormal.z,
      type: surfaceType,
      surfaceType,
      speedMultiplier: speedMult,
      accelerationMultiplier: accelMult,
      steerMultiplier: steerMult,
      frictionMultiplier: frictionMult,
      isBoostPad,
      isRamp,
      rampAngleRad: rampAngleRad || 0.28,
      isKillPlane
    };
  }

  /**
   * Backwards-compatible 2D query implementation (assumes y = 0).
   */
  query(x: number, z: number): SurfaceQueryResult {
    const res = this.queryGround(x, 0, z);
    return {
      type: res.type,
      speedMultiplier: res.speedMultiplier,
      accelerationMultiplier: res.accelerationMultiplier,
      steerMultiplier: res.steerMultiplier,
      frictionMultiplier: res.frictionMultiplier,
      isBoostPad: res.isBoostPad,
      isRamp: res.isRamp,
      rampAngleRad: res.rampAngleRad
    };
  }

  private extractTriangleNormal(faceIndex: number): void {
    const pos = this.geometry.attributes.position;
    const index = this.geometry.index;

    if (!index || faceIndex * 3 + 2 >= index.count) {
      this.triNormal.set(0, 1, 0);
      return;
    }

    const i0 = index.getX(faceIndex * 3);
    const i1 = index.getX(faceIndex * 3 + 1);
    const i2 = index.getX(faceIndex * 3 + 2);

    this.vA.fromBufferAttribute(pos, i0);
    this.vB.fromBufferAttribute(pos, i1);
    this.vC.fromBufferAttribute(pos, i2);

    this.vB.sub(this.vA);
    this.vC.sub(this.vA);
    this.triNormal.crossVectors(this.vB, this.vC).normalize();

    // Ensure normal points upward
    if (this.triNormal.y < 0) {
      this.triNormal.negate();
    }
  }

  private createFallbackResult(onGround: boolean, y: number): GroundQueryResult {
    return {
      onGround,
      height: y,
      normalX: 0,
      normalY: 1,
      normalZ: 0,
      type: 'asphalt',
      surfaceType: 'asphalt',
      speedMultiplier: 1.0,
      accelerationMultiplier: 1.0,
      steerMultiplier: 1.0,
      frictionMultiplier: 1.0,
      isBoostPad: false,
      isRamp: false,
      isKillPlane: false
    };
  }

  dispose(): void {
    // If this instance created the boundsTree, dispose it
    if ((this.geometry as any).boundsTree === this.bvh) {
      (this.geometry as any).disposeBoundsTree?.();
    }
    this.materialSurfaceMap.clear();
    this.mesh = null;
  }
}
