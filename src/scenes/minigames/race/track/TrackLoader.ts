// src/scenes/minigames/race/track/TrackLoader.ts - Async loader & runtime assembler for track meshes & BVH
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TrackDefinition } from '../../../../types/race.types';
import { TrackSpline } from './TrackSpline';
import { LapTracker } from './LapTracker';
import { RescueSystem } from './RescueSystem';
import { BvhGroundQuery } from '../core/BvhGroundQuery';
import { BvhCollisionWorld } from '../core/BvhCollisionWorld';
import { TRACK_REGISTRY, TrackMeta } from '../../../../config/tracks.db';

export interface TrackRuntime {
  meta: TrackMeta;
  definition: TrackDefinition;
  spline: TrackSpline;
  groundQuery: BvhGroundQuery;
  collisionWorld: BvhCollisionWorld;
  lapTracker: LapTracker;
  rescueSystem: RescueSystem;
  visualGroup: THREE.Group;
  collisionGroup: THREE.Group;
  dispose: () => void;
}

export class TrackLoader {
  private gltfLoader = new GLTFLoader();

  /**
   * Loads track assets, generates BVH acceleration trees, and returns fully assembled TrackRuntime.
   */
  async loadTrack(
    trackId: string,
    onProgress?: (progressFraction: number, stageText: string) => void
  ): Promise<TrackRuntime> {
    const meta = TRACK_REGISTRY[trackId] || TRACK_REGISTRY.fuller_road_sprint;

    onProgress?.(0.05, `Loading track manifest: ${meta.name}...`);

    // 1. Fetch and parse track.json
    const jsonRes = await fetch(meta.assets.json);
    if (!jsonRes.ok) {
      throw new Error(`Failed to load track definition from ${meta.assets.json}: ${jsonRes.statusText}`);
    }
    const definition: TrackDefinition = await jsonRes.json();

    onProgress?.(0.20, 'Downloading 3D collision & terrain mesh...');

    // 2. Load collision.glb and visual.glb in parallel
    const [collisionGltf, visualGltf] = await Promise.all([
      this.loadGLTF(meta.assets.collisionGlb, (p) => {
        onProgress?.(0.20 + p * 0.35, 'Downloading collision data...');
      }),
      this.loadGLTF(meta.assets.visualGlb, (p) => {
        onProgress?.(0.55 + p * 0.25, 'Downloading visual landmarks & track...');
      })
    ]);

    onProgress?.(0.85, 'Building BVH spatial trees for ground & barriers...');

    // 3. Process collision geometry
    const groundGeoms: THREE.BufferGeometry[] = [];
    const wallGeoms: THREE.BufferGeometry[] = [];

    collisionGltf.scene.updateMatrixWorld(true);
    collisionGltf.scene.traverse((node) => {
      if (node instanceof THREE.Mesh && node.geometry) {
        const geom = node.geometry.clone();
        geom.applyMatrix4(node.matrixWorld);

        // Normalize to position-only attribute for clean BufferGeometryUtils merging
        const cleanGeom = new THREE.BufferGeometry();
        cleanGeom.setAttribute('position', geom.getAttribute('position'));
        if (geom.index) cleanGeom.setIndex(geom.index);
        cleanGeom.computeVertexNormals();

        const mat = Array.isArray(node.material) ? node.material[0] : node.material;
        const matName = mat ? mat.name.toLowerCase() : '';
        if (matName.includes('wall') || matName.includes('barrier')) {
          wallGeoms.push(cleanGeom);
        } else {
          groundGeoms.push(cleanGeom);
        }

        geom.dispose();
      }
    });

    const mergedGround = BufferGeometryUtils.mergeGeometries(groundGeoms, false);
    const groundQuery = new BvhGroundQuery(mergedGround);

    let collisionWorld: BvhCollisionWorld;
    if (wallGeoms.length > 0) {
      const mergedWalls = BufferGeometryUtils.mergeGeometries(wallGeoms, false);
      collisionWorld = new BvhCollisionWorld(mergedWalls);
    } else {
      collisionWorld = new BvhCollisionWorld(mergedGround);
    }

    onProgress?.(0.95, 'Assembling spline & anti-cheat checkpoints...');

    // 4. Instantiate spline, lap tracker, and rescue system
    const spline = new TrackSpline(definition.centerline, true, 300);
    const lapTracker = new LapTracker(definition.checkpoints, definition.lapCount);
    const killPlane = definition.killPlaneY ?? (definition.killPlanes && definition.killPlanes[0] ? definition.killPlanes[0].y : -10.0);
    const rescueSystem = new RescueSystem(killPlane, 3.5);

    onProgress?.(1.0, 'Track ready!');

    const visualGroup = visualGltf.scene;
    const collisionGroup = collisionGltf.scene;
    collisionGroup.visible = false; // Hide collision debug mesh by default

    const dispose = () => {
      // Dispose visual group
      visualGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });

      // Dispose collision group & merged geometries
      collisionGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });

      groundGeoms.forEach((g) => g.dispose());
      wallGeoms.forEach((g) => g.dispose());
      mergedGround?.dispose();
    };

    return {
      meta,
      definition,
      spline,
      groundQuery,
      collisionWorld,
      lapTracker,
      rescueSystem,
      visualGroup,
      collisionGroup,
      dispose
    };
  }

  private loadGLTF(url: string, onProgress?: (fraction: number) => void): Promise<any> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => resolve(gltf),
        (xhr) => {
          if (xhr.total > 0) {
            onProgress?.(xhr.loaded / xhr.total);
          }
        },
        (err) => reject(err)
      );
    });
  }
}
