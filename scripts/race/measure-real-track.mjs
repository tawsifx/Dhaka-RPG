// scripts/race/measure-real-track.mjs - A1/A3: BVH build + per-step query cost on the REAL collision.glb, lap length & speed facts
import { loadHeadlessTrack } from './lib/headlessTrack.ts';
import { KartController } from '../../src/scenes/minigames/race/core/KartController.ts';
import { TrackAutopilot } from '../../src/scenes/minigames/race/track/TrackAutopilot.ts';

const t = await loadHeadlessTrack('fuller_road_sprint', false);
console.log(`collision.glb: ${(t.collisionBytes / 1024).toFixed(1)} kB, ${t.collisionTriangles} tris`);
console.log(`GLB parse+assemble total: ${t.loadMs.toFixed(1)} ms ; BVH build (ground+walls merge+build): ${t.bvhBuildMs.toFixed(2)} ms`);

// Per-step query cost: ground raycast + wall sphere check at 100k random on-track points
const L = t.spline.getTotalLength();
let n = 0;
const pts = [];
for (let i = 0; i < 20000; i++) {
  const p = t.spline.getPoint((i * 0.6180339) % 1);
  pts.push(p);
}
const t0 = performance.now();
for (let r = 0; r < 5; r++) {
  for (const p of pts) {
    t.groundQuery.queryGround(p.x, p.y, p.z);
    t.collisionWorld.checkCollision3D(p.x, p.y + 0.5, p.z, 0.75);
    n++;
  }
}
const dt = performance.now() - t0;
console.log(`Combined ground+wall query: ${((dt / n) * 1000).toFixed(2)} µs/step over ${n} samples`);

// Lap facts
console.log(`Lap length (spline arc): ${L.toFixed(1)} m`);
const slot = t.definition.startGrid[0];
const kart = new KartController({}, { x: slot.x, y: slot.y, z: slot.z, rotation: slot.rotation }, undefined, t.groundQuery, t.collisionWorld);
const ap = new TrackAutopilot(t.spline, 24.5, 16.0);
const lt = t.createLapTracker();
lt.startRace(0);
let time = 0, peak = 0, sumSpeed = 0, steps = 0;
const dtS = 1 / 60;
while (!lt.getState(time * 1000).raceFinished && time < 300) {
  const prev = { ...kart.getState() };
  kart.update(dtS, ap.computeInput(kart.getState()));
  const c = kart.getState();
  peak = Math.max(peak, c.speed);
  sumSpeed += c.speed; steps++;
  lt.update(prev.x, prev.y, prev.z, c.x, c.y, c.z, time * 1000);
  time += dtS;
}
const st = lt.getState(time * 1000);
console.log(`Drift-free autopilot: laps ${st.splits.map((s) => (s.lapTimeMs / 1000).toFixed(2)).join(', ')} s ; avg speed ${(sumSpeed / steps).toFixed(2)} m/s ; peak ${peak.toFixed(2)} m/s`);
console.log(`Kart config maxSpeed 28 (balanced), no-boost cap = ${28} m/s; autopilot target 24.5 m/s`);
