// scripts/race/lib/headlessTrack.ts - Loads a REAL track (track.json + collision.glb) in Node for validators, harness and tests.
import fs from 'fs';
import path from 'path';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TrackDefinition } from '../../../src/types/race.types';
import { assembleTrackPhysics, AssembledTrackPhysics } from '../../../src/scenes/minigames/race/track/TrackAssembler';

export interface HeadlessTrack extends AssembledTrackPhysics {
  trackDir: string;
  loadMs: number;
  collisionBytes: number;
}

const cache = new Map<string, Promise<HeadlessTrack>>();

export function loadHeadlessTrack(trackId = 'fuller_road_sprint', useCache = true): Promise<HeadlessTrack> {
  if (useCache && cache.has(trackId)) return cache.get(trackId)!;
  const p = (async () => {
    const t0 = performance.now();
    const trackDir = path.resolve('public/assets/race/tracks', trackId);
    const definition: TrackDefinition = JSON.parse(fs.readFileSync(path.join(trackDir, 'track.json'), 'utf-8'));
    const buf = fs.readFileSync(path.join(trackDir, 'collision.glb'));
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    const gltf: any = await new Promise((resolve, reject) => new GLTFLoader().parse(ab, '', resolve, reject));
    const assembled = assembleTrackPhysics(definition, gltf.scene);
    return { ...assembled, trackDir, loadMs: performance.now() - t0, collisionBytes: buf.byteLength };
  })();
  if (useCache) cache.set(trackId, p);
  return p;
}
