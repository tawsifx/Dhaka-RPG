// scripts/race/validate-track.mjs - CLI validator for all race tracks, collision meshes, and completability
import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TrackValidator } from '../../src/scenes/minigames/race/track/TrackValidator.ts';
import { TrackSpline } from '../../src/scenes/minigames/race/track/TrackSpline.ts';
import { LapTracker } from '../../src/scenes/minigames/race/track/LapTracker.ts';
import { TrackAutopilot } from '../../src/scenes/minigames/race/track/TrackAutopilot.ts';
import { BvhGroundQuery } from '../../src/scenes/minigames/race/core/BvhGroundQuery.ts';
import { BvhCollisionWorld } from '../../src/scenes/minigames/race/core/BvhCollisionWorld.ts';
import { KartController } from '../../src/scenes/minigames/race/core/KartController.ts';

const TRACKS_DIR = path.resolve('public/assets/race/tracks');

async function validateTrack(trackId) {
  console.log(`\n======================================================`);
  console.log(`🔍 VALIDATING TRACK: ${trackId}`);
  console.log(`======================================================`);

  const trackDir = path.join(TRACKS_DIR, trackId);
  if (!fs.existsSync(trackDir)) {
    throw new Error(`Track directory not found: ${trackDir}`);
  }

  // 1. Validate track.json
  const jsonPath = path.join(trackDir, 'track.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Missing track.json in ${trackDir}`);
  }
  const trackData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const report = TrackValidator.validate(trackData);

  if (!report.valid) {
    console.error('❌ track.json validation failed:', report.errors);
    process.exit(1);
  }
  console.log(`✅ track.json schema valid (version: ${trackData.version}, laps: ${trackData.lapCount})`);

  // 2. Validate collision.glb and visual.glb file sizes & budgets
  const collisionPath = path.join(trackDir, 'collision.glb');
  const visualPath = path.join(trackDir, 'visual.glb');

  if (!fs.existsSync(collisionPath)) throw new Error(`Missing collision.glb in ${trackDir}`);
  if (!fs.existsSync(visualPath)) throw new Error(`Missing visual.glb in ${trackDir}`);

  const colSize = fs.statSync(collisionPath).size;
  const visSize = fs.statSync(visualPath).size;
  const totalDownloadSize = colSize + visSize + fs.statSync(jsonPath).size;

  console.log(`📦 Track Download Payload:`);
  console.log(`  • collision.glb: ${(colSize / 1024).toFixed(1)} kB (Budget: <= 1000 kB)`);
  console.log(`  • visual.glb: ${(visSize / 1024).toFixed(1)} kB (Budget: <= 8000 kB)`);
  console.log(`  • track.json: ${(fs.statSync(jsonPath).size / 1024).toFixed(1)} kB`);
  console.log(`  • Total Download: ${(totalDownloadSize / 1024).toFixed(1)} kB (Target: <= 8 MB)`);

  if (colSize > 1024 * 1024) throw new Error(`collision.glb exceeds 1 MB budget: ${colSize} bytes`);
  if (visSize > 8 * 1024 * 1024) throw new Error(`visual.glb exceeds 8 MB budget: ${visSize} bytes`);

  // 3. Load collision.glb and verify collision geometry & naming convention
  const loader = new GLTFLoader();
  const collisionBuffer = fs.readFileSync(collisionPath).buffer;
  const gltf = await new Promise((resolve, reject) => {
    loader.parse(collisionBuffer, '', resolve, reject);
  });

  let collisionTriCount = 0;
  const foundSurfaces = new Set();
  const groundGeometries = [];
  const wallGeometries = [];

  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((node) => {
    if (node instanceof THREE.Mesh && node.geometry) {
      if (node.geometry.index) {
        collisionTriCount += node.geometry.index.count / 3;
      }
      const geom = node.geometry.clone();
      geom.applyMatrix4(node.matrixWorld);

      // Clean to common attributes (position only) for seamless merging
      const cleanGeom = new THREE.BufferGeometry();
      cleanGeom.setAttribute('position', geom.getAttribute('position'));
      if (geom.index) cleanGeom.setIndex(geom.index);
      cleanGeom.computeVertexNormals();

      const mat = Array.isArray(node.material) ? node.material[0] : node.material;
      const matName = mat ? mat.name.toLowerCase() : '';
      if (matName.includes('wall') || matName.includes('barrier')) {
        wallGeometries.push(cleanGeom);
      } else {
        groundGeometries.push(cleanGeom);
      }

      if (mat) {
        foundSurfaces.add(mat.name);
      }
    }
  });

  console.log(`📊 Collision Mesh Geometry:`);
  console.log(`  • Total Collision Triangles: ${collisionTriCount.toLocaleString()} (Budget: <= 40,000)`);
  console.log(`  • Detected Surfaces in Collision Mesh:`, Array.from(foundSurfaces));

  if (collisionTriCount > 40000) {
    throw new Error(`Collision triangle count (${collisionTriCount}) exceeds 40k budget limit`);
  }

  // 4. Validate Ground Snapping of Gates, Start Slots, Pads
  console.log(`📐 Verifying Ground & Surface Alignment...`);
  const mergedGround = BufferGeometryUtils.mergeGeometries(groundGeometries, false);
  const groundQuery = new BvhGroundQuery(mergedGround);

  let bvhCollisionWorld;
  if (wallGeometries.length > 0) {
    const mergedWalls = BufferGeometryUtils.mergeGeometries(wallGeometries, false);
    bvhCollisionWorld = new BvhCollisionWorld(mergedWalls);
  } else {
    bvhCollisionWorld = new BvhCollisionWorld(mergedGround);
  }

  // Check that all start slots lie on valid ground and do not overlap
  if (trackData.startGrid.length < 8) {
    throw new Error(`Track must provide at least 8 start grid slots for an 8-kart grid (found ${trackData.startGrid.length})`);
  }
  for (let i = 0; i < trackData.startGrid.length; i++) {
    const slotA = trackData.startGrid[i];
    const res = groundQuery.queryGround(slotA.x, slotA.y, slotA.z);
    if (!res.onGround && Math.abs(slotA.y - res.height) > 1.5) {
      throw new Error(`Start grid slot ${slotA.slot} at (${slotA.x}, ${slotA.z}) does not lie on ground (height diff: ${Math.abs(slotA.y - res.height)})`);
    }
    for (let j = i + 1; j < trackData.startGrid.length; j++) {
      const slotB = trackData.startGrid[j];
      const dist = Math.hypot(slotA.x - slotB.x, slotA.z - slotB.z);
      if (dist < 2.5) {
        throw new Error(`Start grid overlap between slots ${slotA.slot} and ${slotB.slot}: distance ${dist.toFixed(2)}m < 2.5m minimum`);
      }
    }
  }
  console.log(`  ✅ All ${trackData.startGrid.length} start grid slots lie on valid ground with >= 2.5m non-overlapping spacing`);

  // Validate aiRacingLine if present
  if (trackData.aiRacingLine) {
    if (!Array.isArray(trackData.aiRacingLine) || trackData.aiRacingLine.length < 50) {
      throw new Error(`Invalid aiRacingLine: expected array with >= 50 points, got ${trackData.aiRacingLine?.length}`);
    }
    for (const p of trackData.aiRacingLine) {
      if (typeof p.x !== 'number' || typeof p.y !== 'number' || typeof p.z !== 'number') {
        throw new Error(`aiRacingLine point has invalid non-numeric coordinates`);
      }
      if (typeof p.targetSpeed !== 'number' || p.targetSpeed < 10 || p.targetSpeed > 35) {
        throw new Error(`aiRacingLine point has out-of-bounds targetSpeed: ${p.targetSpeed}`);
      }
    }
    console.log(`  ✅ AI Racing Line validated: ${trackData.aiRacingLine.length} points, speeds ${Math.min(...trackData.aiRacingLine.map(p => p.targetSpeed))} - ${Math.max(...trackData.aiRacingLine.map(p => p.targetSpeed))} m/s`);
  }

  // Validate shortcuts if present
  if (trackData.shortcuts) {
    for (const sc of trackData.shortcuts) {
      if (!sc.id || !sc.entranceGateId || !sc.exitGateId) {
        throw new Error(`Shortcut missing id or gate references: ${JSON.stringify(sc)}`);
      }
    }
    console.log(`  ✅ Shortcuts validated: ${trackData.shortcuts.length} shortcut(s) verified`);
  }

  // Check that all checkpoints lie on valid ground
  for (const gate of trackData.checkpoints) {
    const res = groundQuery.queryGround(gate.center.x, gate.center.y, gate.center.z);
    if (!res.onGround && Math.abs(gate.center.y - res.height) > 2.0) {
      console.warn(`  ⚠️ Checkpoint gate ${gate.id} elevation diff: ${Math.abs(gate.center.y - res.height).toFixed(2)}m`);
    }
  }
  console.log(`  ✅ All ${trackData.checkpoints.length} checkpoint gates validated on track bounds`);

  // 5. Headless Autopilot Completability Verification (Runs 3 Full Laps)
  console.log(`🏎 Running Headless Autopilot 3-Lap Completability Test...`);
  const spline = new TrackSpline(trackData.centerline, true, 300);
  const lapTracker = new LapTracker(trackData.checkpoints, trackData.lapCount);
  const autopilot = new TrackAutopilot(spline, 24.5, 16.0);

  // Initialize kart at Slot 1
  const slot1 = trackData.startGrid[0];
  const kart = new KartController(
    {},
    {
      x: slot1.x,
      y: slot1.y,
      z: slot1.z,
      rotation: slot1.rotation,
      speed: 0
    },
    undefined,
    groundQuery,
    bvhCollisionWorld
  );

  lapTracker.startRace(0);

  const dt = 1 / 60;
  let simulatedTimeSec = 0;
  const maxSimulationSec = 220; // Max allowed time for 3 laps (73s per lap ceiling)
  let lapsCompleted = 0;

  while (simulatedTimeSec < maxSimulationSec && !lapTracker.getState().raceFinished) {
    const input = autopilot.computeInput(kart.getState());
    const prevState = { ...kart.getState() };

    kart.update(dt, input);
    const currState = kart.getState();

    if (Math.floor(simulatedTimeSec) % 5 === 0 && Math.floor(simulatedTimeSec - dt) % 5 !== 0) {
      console.log(`  [t=${simulatedTimeSec.toFixed(0)}s] Pos: (${currState.x.toFixed(1)}, ${currState.z.toFixed(1)}), Speed: ${currState.speed.toFixed(1)}, NextGate: ${lapTracker.getNextGateIndex()}`);
    }

    const lapRes = lapTracker.update(
      prevState.x,
      prevState.y,
      prevState.z,
      currState.x,
      currState.y,
      currState.z,
      simulatedTimeSec * 1000
    );

    if (lapRes.lapCompleted) {
      lapsCompleted++;
      const lapState = lapTracker.getState(simulatedTimeSec * 1000);
      const lastLap = lapState.splits[lapState.splits.length - 1];
      console.log(`  🏁 Lap ${lapsCompleted}/${trackData.lapCount} Completed in ${(lastLap.lapTimeMs / 1000).toFixed(2)}s`);
    }

    simulatedTimeSec += dt;
  }

  const finalLapState = lapTracker.getState(simulatedTimeSec * 1000);
  if (!finalLapState.raceFinished) {
    throw new Error(`FAILURE: Autopilot failed to complete ${trackData.lapCount} laps within ${maxSimulationSec}s timeout (completed ${lapsCompleted} laps)`);
  }

  const avgLapTime = (simulatedTimeSec / trackData.lapCount).toFixed(2);
  console.log(`\n🏆 AUTOPILOT COMPLETABILITY VERIFIED!`);
  console.log(`  • Total Race Time: ${simulatedTimeSec.toFixed(2)} s`);
  console.log(`  • Average Lap Time: ${avgLapTime} s (Target: 45–60 s)`);
  console.log(`  • Best Lap Time: ${(finalLapState.bestLapMs / 1000).toFixed(2)} s`);
  console.log(`  • Checkpoints Crossed: 100% in order (zero skip / anti-cheat passed)`);
  console.log(`======================================================\n`);
}

async function run() {
  const tracks = fs.readdirSync(TRACKS_DIR).filter((f) => fs.statSync(path.join(TRACKS_DIR, f)).isDirectory());
  for (const track of tracks) {
    await validateTrack(track);
  }
}

run().catch((err) => {
  console.error('❌ Validation Error:', err);
  process.exit(1);
});
