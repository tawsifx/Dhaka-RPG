// scripts/race/build-track.mjs - Build and export Fuller Road Sprint track assets (track.json, collision.glb, visual.glb)
import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { TrackSpline } from '../../src/scenes/minigames/race/track/TrackSpline.ts';
import { TrackValidator } from '../../src/scenes/minigames/race/track/TrackValidator.ts';

// Polyfill FileReader for Node
class NodeFileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      this.onloadend && this.onloadend();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = 'data:application/octet-stream;base64,' + Buffer.from(buf).toString('base64');
      this.onloadend && this.onloadend();
    });
  }
}
globalThis.FileReader = NodeFileReader;

const OUTPUT_DIR = path.resolve('public/assets/race/tracks/fuller_road_sprint');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ── 1. Define Fuller Road Sprint Spline Control Points ──────────────────────
const CONTROL_POINTS = [
  // Curzon Hall Start/Finish Straight (heading North along -Z)
  { x: 0, y: 0.0, z: 20, width: 18.0, bankRad: 0 },
  { x: 0, y: 0.0, z: -40, width: 18.0, bankRad: 0 },
  { x: 0, y: 0.0, z: -100, width: 18.0, bankRad: 0 },

  // Turn 1 & 2: Curzon East S-Chicane
  { x: 25, y: 0.0, z: -150, width: 16.0, bankRad: 0.05 },
  { x: 65, y: 0.0, z: -175, width: 16.0, bankRad: -0.05 },
  { x: 105, y: 0.0, z: -155, width: 16.0, bankRad: 0.04 },
  { x: 145, y: 0.0, z: -185, width: 16.0, bankRad: -0.04 },

  // Turn 3 & 4: TSC Rotunda Hairpin (180 deg drift hairpin)
  { x: 190, y: 0.0, z: -215, width: 20.0, bankRad: 0.08 },
  { x: 230, y: 0.0, z: -200, width: 22.0, bankRad: 0.12 }, // Hairpin apex
  { x: 235, y: 0.0, z: -160, width: 20.0, bankRad: 0.10 },
  { x: 205, y: 0.0, z: -130, width: 18.0, bankRad: 0.06 },

  // Krishnachura Avenue Long Straight (Petal Boost Pads)
  { x: 160, y: 0.0, z: -80, width: 16.0, bankRad: 0 },
  { x: 125, y: 0.0, z: -15, width: 16.0, bankRad: 0 },
  { x: 90, y: 0.0, z: 45, width: 16.0, bankRad: 0 },

  // Flyover Elevation Ramp (rises to y = 6.0m over the lower track crossing)
  { x: 60, y: 1.5, z: 95, width: 16.0, bankRad: 0 },
  { x: 25, y: 4.5, z: 125, width: 16.0, bankRad: 0 },
  { x: -15, y: 6.0, z: 125, width: 16.0, bankRad: 0.05 }, // Flyover bridge crest
  { x: -55, y: 6.0, z: 105, width: 16.0, bankRad: -0.05 },
  { x: -85, y: 3.5, z: 70, width: 16.0, bankRad: 0 },

  // Jump Ramp Approach & Air Trick Gap
  { x: -105, y: 1.2, z: 30, width: 16.0, bankRad: 0 }, // Ramp lip
  { x: -115, y: 0.0, z: -15, width: 16.0, bankRad: 0 }, // Gap landing

  // Puddle & Mud Runoff Chicane
  { x: -105, y: 0.0, z: -60, width: 16.0, bankRad: 0.04 },
  { x: -80, y: 0.0, z: -90, width: 16.0, bankRad: -0.04 },

  // Approach to Courtyard Grass Shortcut
  { x: -50, y: 0.0, z: -70, width: 18.0, bankRad: 0 },
  { x: -30, y: 0.0, z: -15, width: 20.0, bankRad: 0.05 },

  // Final Sweeper & Straight Return to Curzon Hall Start/Finish
  { x: -16, y: 0.0, z: 20, width: 22.0, bankRad: 0.04 },
  { x: -6, y: 0.0, z: 42, width: 22.0, bankRad: 0.02 },
  { x: 0, y: 0.0, z: 42, width: 20.0, bankRad: 0 }
];

console.log('🏗 Assembling "Fuller Road Sprint" track geometry and pipeline...');

const trackSpline = new TrackSpline(CONTROL_POINTS, true, 300);
const totalLength = trackSpline.getTotalLength();
console.log(`📏 Spline Arc Length: ${totalLength.toFixed(1)} meters`);
console.log(`⏱ Estimated Lap Time at 23 m/s: ${(totalLength / 23.0).toFixed(1)} seconds (Target: 45–60 s)`);

// ── 2. Checkpoint Gates & Start Grid ─────────────────────────────────────────
// 14 checkpoint gates: 13 intermediate gates + 1 finish line gate at t = 1.0 (z = 20)
const CHECKPOINTS = [];
const numGates = 14;

for (let i = 0; i < numGates; i++) {
  // Intermediate gates spaced from t = 1/14 to t = 13/14, finish line at t = 14/14 = 1.0
  const t = (i + 1) / numGates;
  const pt = trackSpline.getPoint(t >= 1.0 ? 0.0 : t);
  const tan = trackSpline.getTangent(t >= 1.0 ? 0.0 : t);

  // Shortcut Courtyard any-of group at Gate 11 (near end of circuit before final turn)
  if (i === 11) {
    // 11A: Main Road sweeping exterior curve
    CHECKPOINTS.push({
      id: 11,
      groupId: 'shortcut_courtyard',
      center: { x: pt.x - 6.0, y: pt.y, z: pt.z },
      normal: { x: tan.x, y: tan.y, z: tan.z },
      width: 14.0,
      height: 8.0
    });
    // 11B: Secret Grass Shortcut through inner courtyard
    CHECKPOINTS.push({
      id: 11,
      groupId: 'shortcut_courtyard',
      center: { x: pt.x + 8.0, y: pt.y, z: pt.z },
      normal: { x: tan.x, y: tan.y, z: tan.z },
      width: 12.0,
      height: 8.0
    });
  } else {
    CHECKPOINTS.push({
      id: i,
      center: { x: pt.x, y: pt.y, z: pt.z },
      normal: { x: tan.x, y: tan.y, z: tan.z },
      width: i === numGates - 1 ? 22.0 : 18.0,
      height: 8.0
    });
  }
}

// Finish Line is the final gate (crossing it completes the lap)
const FINISH_LINE = CHECKPOINTS[CHECKPOINTS.length - 1];

// Start Grid: 8 slots behind Finish Line on Curzon Hall Straight (heading North along -Z)
const START_GRID = [];
for (let slot = 1; slot <= 8; slot++) {
  const row = Math.floor((slot - 1) / 2);
  const col = (slot - 1) % 2; // 0 = left, 1 = right
  const lateralOffset = col === 0 ? -3.5 : 3.5;
  const distBehindFinish = 8.0 + row * 7.0; // Staggered rows every 7 meters behind line

  START_GRID.push({
    slot,
    x: FINISH_LINE.center.x + lateralOffset,
    y: FINISH_LINE.center.y,
    z: FINISH_LINE.center.z + distBehindFinish, // Behind line along +Z
    rotation: 0 // Facing North along -Z
  });
}

// Boost Pads & Ramps
const BOOST_PADS = [
  { id: 'petal_pad_1', x: 145, y: 0.0, z: -55, width: 4.5, length: 7.0, rotation: 0.55 },
  { id: 'petal_pad_2', x: 105, y: 0.0, z: 20, width: 4.5, length: 7.0, rotation: 0.55 },
  // Shortcut entry boost pad (allows slicing across grass shortcut)
  { id: 'petal_pad_shortcut', x: -58, y: 0.0, z: -80, width: 4.5, length: 7.0, rotation: -0.35 }
];

const RAMPS = [
  { id: 'ramp_flyover_gap', x: -105, y: 1.2, z: 30, width: 14.0, length: 8.0, height: 1.4, rotation: -0.28 }
];

const HAZARDS = [
  { id: 'puddle_chicane', type: 'puddle', x: -100, y: 0.0, z: -55, radius: 6.5 },
  { id: 'mud_runoff', type: 'mud', x: -115, y: 0.0, z: -70, radius: 8.5 }
];

const ITEM_BOXES = [
  { id: 'item_box_straight', x: 0, y: 1.2, z: -60 },
  { id: 'item_box_rotunda', x: 215, y: 1.2, z: -175 },
  { id: 'item_box_avenue', x: 110, y: 1.2, z: 15 },
  { id: 'item_box_post_landing', x: -110, y: 1.2, z: -35 }
];

// Minimap Bounds
const MINIMAP_BOUNDS = {
  minX: -140,
  maxX: 260,
  minZ: -240,
  maxZ: 150
};

// ── 3. Assemble Track Definition JSON ────────────────────────────────────────
const TRACK_DEFINITION = {
  id: 'fuller_road_sprint',
  name: 'Fuller Road Sprint',
  version: 1,
  units: 'meters',
  lapCount: 3,
  centerline: CONTROL_POINTS,
  checkpoints: CHECKPOINTS,
  startGrid: START_GRID,
  finishLine: FINISH_LINE,
  boostPads: BOOST_PADS,
  ramps: RAMPS,
  hazards: HAZARDS,
  itemBoxSpawns: ITEM_BOXES,
  killPlanes: [{ y: -10.0 }],
  minimapBounds: MINIMAP_BOUNDS,
  lightingPreset: 'golden_hour',
  musicId: 'game_bgm',
  skyPreset: 'golden_hour'
};

// Validate JSON
const report = TrackValidator.validate(TRACK_DEFINITION);
if (!report.valid) {
  console.error('❌ Track Validation Errors:', report.errors);
  process.exit(1);
}
console.log('✅ Track JSON Schema Validated Successfully (0 errors, 14 checkpoints, 8 start slots)');
fs.writeFileSync(path.join(OUTPUT_DIR, 'track.json'), JSON.stringify(TRACK_DEFINITION, null, 2));

// ── 4. Build 3D Collision Mesh (collision.glb) ───────────────────────────────
// Low-poly collision mesh with named materials: surf_asphalt, surf_grass, surf_mud, surf_puddle, surf_boostpad, surf_ramp, surf_offtrack_kill
console.log('🔨 Generating collision mesh (low-poly, texture-free)...');

const collisionScene = new THREE.Scene();

// Material definitions
const matAsphalt = new THREE.MeshBasicMaterial({ name: 'surf_asphalt', color: 0x222222 });
const matGrass = new THREE.MeshBasicMaterial({ name: 'surf_grass', color: 0x2d5a27 });
const matMud = new THREE.MeshBasicMaterial({ name: 'surf_mud', color: 0x5c4033 });
const matPuddle = new THREE.MeshBasicMaterial({ name: 'surf_puddle', color: 0x38bdf8 });
const matBoostPad = new THREE.MeshBasicMaterial({ name: 'surf_boostpad', color: 0xf59e0b });
const matRamp = new THREE.MeshBasicMaterial({ name: 'surf_ramp', color: 0xef4444 });
const matKill = new THREE.MeshBasicMaterial({ name: 'surf_offtrack_kill', color: 0x000000 });
const matWall = new THREE.MeshBasicMaterial({ name: 'wall_barrier', color: 0x888888 });

// Generate Road Ribbon Geometry along Spline
function createRoadRibbon(spline, samples = 240) {
  const geom = new THREE.BufferGeometry();
  const positions = [];
  const indices = [];

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const pt = spline.getPoint(t);
    const tan = spline.getTangent(t);
    const width = 16.0;

    // Normal orthogonal to tangent
    const normX = -tan.z;
    const normZ = tan.x;
    const len = Math.hypot(normX, normZ) || 1;
    const nx = (normX / len) * (width * 0.5);
    const nz = (normZ / len) * (width * 0.5);

    // Left vertex
    positions.push(pt.x - nx, pt.y, pt.z - nz);
    // Right vertex
    positions.push(pt.x + nx, pt.y, pt.z + nz);

    if (i < samples) {
      const v0 = i * 2;
      const v1 = i * 2 + 1;
      const v2 = (i + 1) * 2;
      const v3 = (i + 1) * 2 + 1;

      // Two triangles per quad segment
      indices.push(v0, v1, v2);
      indices.push(v1, v3, v2);
    }
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

const roadMesh = new THREE.Mesh(createRoadRibbon(trackSpline, 260), matAsphalt);
collisionScene.add(roadMesh);

// Add Infield Grass Ground Plane
const grassGround = new THREE.Mesh(new THREE.PlaneGeometry(500, 500, 16, 16), matGrass);
grassGround.rotation.x = -Math.PI / 2;
grassGround.position.y = -0.05;
collisionScene.add(grassGround);

// Add Mud runoff zone
for (const hazard of HAZARDS) {
  if (hazard.type === 'mud') {
    const mudMesh = new THREE.Mesh(new THREE.CircleGeometry(hazard.radius, 16), matMud);
    mudMesh.rotation.x = -Math.PI / 2;
    mudMesh.position.set(hazard.x, hazard.y + 0.02, hazard.z);
    collisionScene.add(mudMesh);
  } else if (hazard.type === 'puddle') {
    const puddleMesh = new THREE.Mesh(new THREE.CircleGeometry(hazard.radius, 16), matPuddle);
    puddleMesh.rotation.x = -Math.PI / 2;
    puddleMesh.position.set(hazard.x, hazard.y + 0.03, hazard.z);
    collisionScene.add(puddleMesh);
  }
}

// Add Boost Pads
for (const pad of BOOST_PADS) {
  const padMesh = new THREE.Mesh(new THREE.PlaneGeometry(pad.width, pad.length), matBoostPad);
  padMesh.rotation.x = -Math.PI / 2;
  padMesh.rotation.z = pad.rotation;
  padMesh.position.set(pad.x, pad.y + 0.04, pad.z);
  collisionScene.add(padMesh);
}

// Add Jump Ramp Collision Geometry
for (const ramp of RAMPS) {
  const rampGeom = new THREE.BoxGeometry(ramp.width, ramp.height, ramp.length);
  rampGeom.rotateX(0.28);
  const rampMesh = new THREE.Mesh(rampGeom, matRamp);
  rampMesh.position.set(ramp.x, ramp.y + ramp.height * 0.5, ramp.z);
  collisionScene.add(rampMesh);
}

// Add Guardrails & Barriers along Track Outer Bounds (Placed outside road ribbon)
function createWallBarriers(spline, samples = 200) {
  const wallGroup = new THREE.Group();
  for (let i = 0; i < samples; i += 2) {
    const t = i / samples;
    const pt = spline.getPoint(t);
    const tan = spline.getTangent(t);
    const splineData = spline.findNearest(pt.x, pt.y, pt.z, t);
    const roadWidth = splineData.width || 18.0;

    const normX = -tan.z;
    const normZ = tan.x;
    const len = Math.hypot(normX, normZ) || 1;
    // Barrier positioned 1.5m outside road edge so karts have full road lane
    const offset = roadWidth * 0.5 + 1.5;
    const nx = (normX / len) * offset;
    const nz = (normZ / len) * offset;

    // Left barrier post
    const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 3.0), matWall);
    leftPost.position.set(pt.x - nx, pt.y + 0.7, pt.z - nz);
    leftPost.rotation.y = Math.atan2(tan.x, tan.z);
    wallGroup.add(leftPost);

    // Right barrier post
    const rightPost = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 3.0), matWall);
    rightPost.position.set(pt.x + nx, pt.y + 0.7, pt.z + nz);
    rightPost.rotation.y = Math.atan2(tan.x, tan.z);
    wallGroup.add(rightPost);
  }
  return wallGroup;
}
collisionScene.add(createWallBarriers(trackSpline, 120));

// Add Out-of-Bounds Kill Plane below track
const killPlane = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), matKill);
killPlane.rotation.x = -Math.PI / 2;
killPlane.position.y = -10.0;
collisionScene.add(killPlane);

// ── 5. Build 3D Visual Scene (visual.glb) ────────────────────────────────────
console.log('🎨 Generating visual mesh with Dhaka heritage landmarks, TSC rotunda, and Curzon Hall façade...');
const visualScene = new THREE.Scene();

// 1. Asphalt Road with White Center Striping
const visualRoadMat = new THREE.MeshStandardMaterial({
  color: 0x1f2421,
  roughness: 0.85,
  metalness: 0.1
});
const visualRoad = new THREE.Mesh(createRoadRibbon(trackSpline, 280), visualRoadMat);
visualScene.add(visualRoad);

// 2. Curzon Hall Indo-Saracenic Red-Brick Façade Towers (at Start/Finish)
const matCurzonBrick = new THREE.MeshStandardMaterial({
  color: 0x991b1b, // Terracotta red-brick
  roughness: 0.8,
  metalness: 0.05
});
const matCurzonKiosk = new THREE.MeshStandardMaterial({
  color: 0xfef08a, // Pale gold domed kiosk
  roughness: 0.5,
  metalness: 0.2
});

function createCurzonPillars() {
  const g = new THREE.Group();
  for (let z = -90; z <= 30; z += 30) {
    // West wing pillar
    const pW = new THREE.Mesh(new THREE.BoxGeometry(4.0, 14.0, 4.0), matCurzonBrick);
    pW.position.set(-14.0, 7.0, z);
    const domeW = new THREE.Mesh(new THREE.ConeGeometry(2.8, 4.0, 8), matCurzonKiosk);
    domeW.position.set(-14.0, 16.0, z);
    g.add(pW, domeW);

    // East wing pillar
    const pE = new THREE.Mesh(new THREE.BoxGeometry(4.0, 14.0, 4.0), matCurzonBrick);
    pE.position.set(14.0, 7.0, z);
    const domeE = new THREE.Mesh(new THREE.ConeGeometry(2.8, 4.0, 8), matCurzonKiosk);
    domeE.position.set(14.0, 16.0, z);
    g.add(pE, domeE);
  }

  // Start/Finish Arch Gantry at z = 0
  const archTop = new THREE.Mesh(new THREE.BoxGeometry(26.0, 2.5, 3.0), matCurzonBrick);
  archTop.position.set(0, 11.0, 0);
  g.add(archTop);

  return g;
}
visualScene.add(createCurzonPillars());

// 3. TSC Rotunda Landmark (Circular tea stall & umbrella kiosk at x: 195, z: -180)
const matRotundaBase = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
const matRotundaRoof = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.6 }); // DU green
const tscRotunda = new THREE.Group();

const rotundaBase = new THREE.Mesh(new THREE.CylinderGeometry(12.0, 12.0, 2.5, 24), matRotundaBase);
rotundaBase.position.set(195, 1.25, -180);
const rotundaRoof = new THREE.Mesh(new THREE.ConeGeometry(14.0, 5.0, 24), matRotundaRoof);
rotundaRoof.position.set(195, 5.0, -180);
tscRotunda.add(rotundaBase, rotundaRoof);

// Umbrella tea tables
for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
  const tx = 195 + Math.cos(a) * 18.0;
  const tz = -180 + Math.sin(a) * 18.0;
  const umbrella = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.5, 8), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
  umbrella.position.set(tx, 3.0, tz);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.0), matRotundaBase);
  pole.position.set(tx, 1.5, tz);
  tscRotunda.add(umbrella, pole);
}
visualScene.add(tscRotunda);

// 4. Krishnachura Avenue Trees (Instanced red-orange flowering trees along straight)
const matTreeTrunk = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
const matKrishnachuraBloom = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 }); // Orange-red blooms

const avenueTrees = new THREE.Group();
for (let z = -80; z <= 40; z += 18) {
  const pt = trackSpline.findNearest(140, 0, z);
  const tx = pt.closestPoint.x + 12.0;
  const tz = pt.closestPoint.z;

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 6.0, 6), matTreeTrunk);
  trunk.position.set(tx, 3.0, tz);
  const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(3.8), matKrishnachuraBloom);
  foliage.position.set(tx, 7.0, tz);
  avenueTrees.add(trunk, foliage);
}
visualScene.add(avenueTrees);

// 5. Flyover Bridge Architecture (Deck + Piers)
const matBridgeConcrete = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
const bridgePiers = new THREE.Group();
[-30, -10, 10, 30].forEach((x) => {
  const pier = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 6.0, 8), matBridgeConcrete);
  pier.position.set(x, 3.0, 115);
  bridgePiers.add(pier);
});
visualScene.add(bridgePiers);

// 6. Visual Boost Pads (Glowing Petal Pads)
const matPetalPadVisual = new THREE.MeshStandardMaterial({
  color: 0xf59e0b,
  emissive: 0xd97706,
  emissiveIntensity: 0.8,
  roughness: 0.3
});
for (const pad of BOOST_PADS) {
  const padMesh = new THREE.Mesh(new THREE.PlaneGeometry(pad.width, pad.length), matPetalPadVisual);
  padMesh.rotation.x = -Math.PI / 2;
  padMesh.rotation.z = pad.rotation;
  padMesh.position.set(pad.x, pad.y + 0.05, pad.z);
  visualScene.add(padMesh);
}

// ── 6. Export Binary GLB Files ───────────────────────────────────────────────
const exporter = new GLTFExporter();

console.log('📦 Exporting collision.glb...');
const collisionGlb = await exporter.parseAsync(collisionScene, { binary: true });
fs.writeFileSync(path.join(OUTPUT_DIR, 'collision.glb'), Buffer.from(collisionGlb));
console.log(`  💾 collision.glb exported: ${(collisionGlb.byteLength / 1024).toFixed(1)} kB (Budget: <= 1000 kB)`);

console.log('📦 Exporting visual.glb...');
const visualGlb = await exporter.parseAsync(visualScene, { binary: true });
fs.writeFileSync(path.join(OUTPUT_DIR, 'visual.glb'), Buffer.from(visualGlb));
console.log(`  💾 visual.glb exported: ${(visualGlb.byteLength / 1024).toFixed(1)} kB (Budget: <= 8000 kB)`);

console.log('\n🎉 Fuller Road Sprint track pipeline successfully generated and validated!');
