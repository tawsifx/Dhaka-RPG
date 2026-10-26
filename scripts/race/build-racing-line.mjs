// scripts/race/build-racing-line.mjs - Offline racing line and apex generator
import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { TrackSpline } from '../../src/scenes/minigames/race/track/TrackSpline.ts';

const TRACK_DIR = path.resolve('public/assets/race/tracks/fuller_road_sprint');
const jsonPath = path.join(TRACK_DIR, 'track.json');

if (!fs.existsSync(jsonPath)) {
  console.error(`Track file not found: ${jsonPath}`);
  process.exit(1);
}

const trackData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
console.log(`Generating racing line for track: ${trackData.name} (${trackData.id})...`);

const spline = new TrackSpline(trackData.centerline, true, 350);
const totalLength = spline.getTotalLength();
const NUM_SAMPLES = 350;
const ds = totalLength / NUM_SAMPLES;

// Step 1: Collect centerline sample points, tangents, normals, and road widths
const samples = [];
for (let i = 0; i < NUM_SAMPLES; i++) {
  const t = i / NUM_SAMPLES;
  const pt = spline.getPoint(t);
  const tan = spline.getTangent(t);
  const tanVec = new THREE.Vector3(tan.x, tan.y, tan.z).normalize();

  // Lateral normal vector perpendicular to tangent in horizontal plane
  // Facing forward, right is (tan.z, 0, -tan.x), left is (-tan.z, 0, tan.x)
  const leftNormal = new THREE.Vector3(-tanVec.z, 0, tanVec.x).normalize();

  // Width at this segment
  const query = spline.findNearest(pt.x, pt.y, pt.z, t);
  const width = query.width || 18.0;

  samples.push({
    index: i,
    t,
    pos: new THREE.Vector3(pt.x, pt.y, pt.z),
    tangent: tanVec,
    leftNormal,
    width,
    curvature: 0,
    turnSign: 0, // +1 = left, -1 = right, 0 = straight
    offset: 0,
    targetSpeed: 28.0,
    driftState: 'none'
  });
}

// Step 2: Calculate curvature and turn direction via central differences
for (let i = 0; i < NUM_SAMPLES; i++) {
  const prev = samples[(i - 1 + NUM_SAMPLES) % NUM_SAMPLES];
  const next = samples[(i + 1) % NUM_SAMPLES];

  const dTan = new THREE.Vector3().subVectors(next.tangent, prev.tangent);
  const curvature = dTan.length() / (2 * ds);

  // Cross product in Y gives turn sign (positive = turning left, negative = turning right)
  const crossY = prev.tangent.x * next.tangent.z - prev.tangent.z * next.tangent.x;
  let turnSign = 0;
  if (crossY < -0.0001) turnSign = 1; // Left turn
  else if (crossY > 0.0001) turnSign = -1; // Right turn

  samples[i].curvature = curvature;
  samples[i].turnSign = turnSign;
}

// Step 3: Outside-Inside-Outside Apex line calculation
// When entering and navigating a corner, the apex is towards the inside.
// Left turn: inside is LEFT (+leftNormal). Right turn: inside is RIGHT (-leftNormal).
// Safety margin: keep kart at least 2.0m from wall
const WALL_MARGIN = 2.0;

for (let i = 0; i < NUM_SAMPLES; i++) {
  const s = samples[i];
  const maxDisplacement = Math.max(0, (s.width / 2) - WALL_MARGIN);

  // Peak curvature in local window (radius 8 samples ~ 30m)
  let windowMaxK = 0;
  let dominantSign = 0;
  for (let k = -8; k <= 8; k++) {
    const neighbor = samples[(i + k + NUM_SAMPLES) % NUM_SAMPLES];
    if (neighbor.curvature > windowMaxK) {
      windowMaxK = neighbor.curvature;
      dominantSign = neighbor.turnSign;
    }
  }

  if (windowMaxK > 0.015) {
    // Inside offset proportional to curvature:
    // Left turn (turnSign = 1) -> shift positive (left)
    // Right turn (turnSign = -1) -> shift negative (right)
    const curveIntensity = Math.min(1.0, (s.curvature - 0.01) / 0.04);
    s.offset = dominantSign * curveIntensity * (maxDisplacement * 0.75);
  } else {
    s.offset = 0;
  }
}

// Step 4: Smooth lateral offsets with 5 passes of moving average
let smoothedOffsets = samples.map((s) => s.offset);
for (let pass = 0; pass < 5; pass++) {
  const nextPass = [...smoothedOffsets];
  for (let i = 0; i < NUM_SAMPLES; i++) {
    const prev = smoothedOffsets[(i - 1 + NUM_SAMPLES) % NUM_SAMPLES];
    const curr = smoothedOffsets[i];
    const next = smoothedOffsets[(i + 1) % NUM_SAMPLES];
    nextPass[i] = (prev + curr * 2 + next) / 4;
  }
  smoothedOffsets = nextPass;
}

for (let i = 0; i < NUM_SAMPLES; i++) {
  samples[i].offset = smoothedOffsets[i];
}

// Step 5: Cornering speed calculation & backward braking propagation
const MAX_SPEED = 28.0;
const MIN_SPEED = 16.5;
const MAX_LATERAL_ACCEL = 14.0; // m/s^2 lateral grip before sliding
const BRAKING_DECEL = 13.0; // m/s^2 comfortable braking

// Forward pass: instantaneous corner limit
for (let i = 0; i < NUM_SAMPLES; i++) {
  const s = samples[i];
  if (s.curvature > 0.015) {
    const cornerSpeed = Math.sqrt(MAX_LATERAL_ACCEL / s.curvature);
    s.targetSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, cornerSpeed));
  } else {
    s.targetSpeed = MAX_SPEED;
  }
}

// Backward pass: smooth deceleration zones so AI slows down BEFORE the apex
for (let pass = 0; pass < 2; pass++) {
  for (let i = NUM_SAMPLES - 1; i >= 0; i--) {
    const curr = samples[i];
    const next = samples[(i + 1) % NUM_SAMPLES];
    const maxEntrySpeed = Math.sqrt(next.targetSpeed * next.targetSpeed + 2 * BRAKING_DECEL * ds);
    curr.targetSpeed = Math.min(curr.targetSpeed, maxEntrySpeed);
  }
}

// Step 6: Identify Drift Zones
for (let i = 0; i < NUM_SAMPLES; i++) {
  const s = samples[i];
  if (s.curvature > 0.022) {
    s.driftState = s.turnSign > 0 ? 'drift_left' : 'drift_right';
  } else {
    s.driftState = 'none';
  }
}

// Step 7: Serialize to RacingLinePoint[]
const aiRacingLine = samples.map((s) => {
  const p = new THREE.Vector3().copy(s.pos).addScaledVector(s.leftNormal, s.offset);
  return {
    x: Number(p.x.toFixed(2)),
    y: Number(p.y.toFixed(2)),
    z: Number(p.z.toFixed(2)),
    targetSpeed: Number(s.targetSpeed.toFixed(1)),
    idealDriftState: s.driftState,
    lateralOffset: Number(s.offset.toFixed(2)),
    distanceAlongSpline: Number((s.t * totalLength).toFixed(1))
  };
});

// Step 8: Shortcuts metadata
const shortcuts = [
  {
    id: 'courtyard_bypass',
    name: 'Courtyard Shortcut',
    entranceGateId: 10,
    exitGateId: 12,
    requiresBoost: true,
    requiresHop: false,
    timeSavingSec: 2.1
  }
];

// Step 9: Update track.json
trackData.aiRacingLine = aiRacingLine;
trackData.shortcuts = shortcuts;

fs.writeFileSync(jsonPath, JSON.stringify(trackData, null, 2), 'utf-8');

console.log(`\n✅ Racing line built successfully for ${trackData.name}:`);
console.log(`  • Racing Line Points: ${aiRacingLine.length}`);
console.log(`  • Total Track Length: ${totalLength.toFixed(1)} m`);
console.log(`  • Speed Range: ${Math.min(...aiRacingLine.map((p) => p.targetSpeed))} m/s - ${Math.max(...aiRacingLine.map((p) => p.targetSpeed))} m/s`);
console.log(`  • Drift Points: ${aiRacingLine.filter((p) => p.idealDriftState !== 'none').length} / ${aiRacingLine.length}`);
console.log(`  • Shortcuts Added: ${shortcuts.length} (${shortcuts[0].name})`);
