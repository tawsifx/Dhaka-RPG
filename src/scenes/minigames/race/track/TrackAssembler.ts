// src/scenes/minigames/race/track/TrackAssembler.ts - Pure (DOM/WebGL-free) physics assembly shared by the browser TrackLoader,
// the headless validators/harness and unit tests: collision scene -> merged geometries -> BVH ground & wall worlds.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TrackDefinition } from '../../../../types/race.types';
import { TrackSpline } from './TrackSpline';
import { RescueSystem } from './RescueSystem';
import { LapTracker } from './LapTracker';
import { BvhGroundQuery } from '../core/BvhGroundQuery';
import { BvhCollisionWorld } from '../core/BvhCollisionWorld';

export interface AssembledTrackPhysics {
  definition: TrackDefinition;
  spline: TrackSpline;
  groundQuery: BvhGroundQuery;
  collisionWorld: BvhCollisionWorld;
  killPlaneY: number;
  /** Wall-only (or fallback ground) merged geometry, exposed for racing-line tooling. */
  wallGeometry: THREE.BufferGeometry | null;
  collisionTriangles: number;
  bvhBuildMs: number;
  /** Fresh per-kart lap tracker factory (every kart owns its own tracker). */
  createLapTracker: () => LapTracker;
  /** Fresh per-kart rescue system factory. */
  createRescueSystem: () => RescueSystem;
  dispose: () => void;
}

/** Position-only clone so heterogeneous meshes merge cleanly. */
function cleanGeometry(node: THREE.Mesh): THREE.BufferGeometry {
  const geom = node.geometry.clone();
  geom.applyMatrix4(node.matrixWorld);
  const clean = new THREE.BufferGeometry();
  clean.setAttribute('position', geom.getAttribute('position'));
  if (geom.index) clean.setIndex(geom.index);
  clean.computeVertexNormals();
  geom.dispose();
  return clean;
}

export function assembleTrackPhysics(
  definition: TrackDefinition,
  collisionRoot: THREE.Object3D,
  now: () => number = () => performance.now()
): AssembledTrackPhysics {
  const groundGeoms: THREE.BufferGeometry[] = [];
  const wallGeoms: THREE.BufferGeometry[] = [];
  let triangles = 0;

  collisionRoot.updateMatrixWorld(true);
  collisionRoot.traverse((node) => {
    if (node instanceof THREE.Mesh && node.geometry) {
      triangles += node.geometry.index ? node.geometry.index.count / 3 : node.geometry.getAttribute('position').count / 3;
      const clean = cleanGeometry(node);
      const mat = Array.isArray(node.material) ? node.material[0] : node.material;
      const matName = mat ? mat.name.toLowerCase() : '';
      if (matName.includes('wall') || matName.includes('barrier')) wallGeoms.push(clean);
      else groundGeoms.push(clean);
    }
  });

  const t0 = now();
  const mergedGround = BufferGeometryUtils.mergeGeometries(groundGeoms, false);
  const groundQuery = new BvhGroundQuery(mergedGround);
  let mergedWalls: THREE.BufferGeometry | null = null;
  let collisionWorld: BvhCollisionWorld;
  if (wallGeoms.length > 0) {
    mergedWalls = BufferGeometryUtils.mergeGeometries(wallGeoms, false);
    collisionWorld = new BvhCollisionWorld(mergedWalls);
  } else {
    collisionWorld = new BvhCollisionWorld(mergedGround);
  }
  const bvhBuildMs = now() - t0;

  const spline = new TrackSpline(definition.centerline, true, 300);
  const killPlaneY =
    definition.killPlaneY ?? (definition.killPlanes && definition.killPlanes[0] ? definition.killPlanes[0].y : -10.0);

  return {
    definition,
    spline,
    groundQuery,
    collisionWorld,
    killPlaneY,
    wallGeometry: mergedWalls,
    collisionTriangles: triangles,
    bvhBuildMs,
    createLapTracker: () => new LapTracker(definition.checkpoints, definition.lapCount),
    createRescueSystem: () => new RescueSystem(killPlaneY, 3.5),
    dispose: () => {
      groundGeoms.forEach((g) => g.dispose());
      wallGeoms.forEach((g) => g.dispose());
      mergedGround?.dispose();
      mergedWalls?.dispose();
    }
  };
}
