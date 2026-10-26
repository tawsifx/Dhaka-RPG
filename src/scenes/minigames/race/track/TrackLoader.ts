// src/scenes/minigames/race/track/TrackLoader.ts - Async loader & runtime assembler for track meshes & BVH
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TrackDefinition } from '../../../../types/race.types';
import { TrackSpline } from './TrackSpline';
import { LapTracker } from './LapTracker';
import { RescueSystem } from './RescueSystem';
import { assembleTrackPhysics, AssembledTrackPhysics } from './TrackAssembler';
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
  assembled: AssembledTrackPhysics;
  timings: { downloadMs: number; parseMs: number; bvhBuildMs: number; totalMs: number };
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
    const tTotal0 = performance.now();
    const meta = TRACK_REGISTRY[trackId] || TRACK_REGISTRY.fuller_road_sprint;

    onProgress?.(0.05, `Loading track manifest: ${meta.name}...`);

    // 1. Fetch and parse track.json
    const jsonRes = await fetch(meta.assets.json);
    if (!jsonRes.ok) {
      throw new Error(`Failed to load track definition from ${meta.assets.json}: ${jsonRes.statusText}`);
    }
    const definition: TrackDefinition = await jsonRes.json();

    onProgress?.(0.20, 'Downloading 3D collision & terrain mesh...');

    // 2. Download (fetch bytes) collision.glb and visual.glb in parallel, then parse; stage timings are recorded (PERF.md A1)
    const tDownload0 = performance.now();
    const [collisionBuf, visualBuf] = await Promise.all([
      this.fetchBinary(meta.assets.collisionGlb, (p) => {
        onProgress?.(0.20 + p * 0.35, 'Downloading collision data...');
      }),
      this.fetchBinary(meta.assets.visualGlb, (p) => {
        onProgress?.(0.55 + p * 0.25, 'Downloading visual landmarks & track...');
      })
    ]);
    const downloadMs = performance.now() - tDownload0;

    const tParse0 = performance.now();
    const [collisionGltf, visualGltf] = await Promise.all([
      this.parseGLTF(collisionBuf, meta.assets.collisionGlb),
      this.parseGLTF(visualBuf, meta.assets.visualGlb)
    ]);
    const parseMs = performance.now() - tParse0;

    onProgress?.(0.85, 'Building BVH spatial trees for ground & barriers...');

    // 3. Pure physics assembly (shared with headless tooling)
    const assembled = assembleTrackPhysics(definition, collisionGltf.scene);
    const { groundQuery, collisionWorld, spline } = assembled;

    onProgress?.(0.95, 'Assembling spline & anti-cheat checkpoints...');

    // 4. Instantiate lap tracker and rescue system for the local player
    const lapTracker = assembled.createLapTracker();
    const rescueSystem = assembled.createRescueSystem();

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

      assembled.dispose();
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
      assembled,
      timings: { downloadMs, parseMs, bvhBuildMs: assembled.bvhBuildMs, totalMs: performance.now() - tTotal0 },
      dispose
    };
  }

  private async fetchBinary(url: string, onProgress?: (fraction: number) => void): Promise<ArrayBuffer> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download ${url}: ${res.statusText}`);
    const total = Number(res.headers.get('content-length') || 0);
    if (!res.body || !total) {
      const buf = await res.arrayBuffer();
      onProgress?.(1);
      return buf;
    }
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      onProgress?.(Math.min(1, loaded / total));
    }
    const out = new Uint8Array(loaded);
    let off = 0;
    for (const c of chunks) {
      out.set(c, off);
      off += c.length;
    }
    return out.buffer;
  }

  private parseGLTF(buffer: ArrayBuffer, url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.parse(buffer, url.substring(0, url.lastIndexOf('/') + 1), (gltf) => resolve(gltf), (err) => reject(err));
    });
  }
}
