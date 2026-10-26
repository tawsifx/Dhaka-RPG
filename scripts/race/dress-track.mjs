/**
 * dress-track.mjs
 * Declarative track dressing engine for Fuller Road Sprint (Milestone 3.5).
 * Generates visual.glb and props.json while keeping collision.glb and gameplay
 * geometry 100% byte-identical and locked.
 *
 * Sourced from SuperTuxKart (STK) assets and Dhaka landmark kitbashes.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { TrackSpline } from '../../src/scenes/minigames/race/track/TrackSpline.ts';

// Polyfill FileReader for GLTFExporter in Node
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        if (this.onloadend) this.onloadend({ target: this });
      });
    }
  };
}

const TRACK_DIR = path.resolve('public/assets/race/tracks/fuller_road_sprint');
const TRACK_JSON_PATH = path.join(TRACK_DIR, 'track.json');
const LOCK_PATH = path.join(TRACK_DIR, 'gameplay.lock.json');
const VISUAL_GLB_PATH = path.join(TRACK_DIR, 'visual.glb');
const PROPS_JSON_PATH = path.join(TRACK_DIR, 'props.json');

console.log('🏁 Starting Track Dressing for Fuller Road Sprint...');

// 1. Verify Gameplay Lock Before Touching Anything
const lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
const trackData = JSON.parse(fs.readFileSync(TRACK_JSON_PATH, 'utf8'));
const collisionBuf = fs.readFileSync(path.join(TRACK_DIR, 'collision.glb'));
const currentColHash = crypto.createHash('sha256').update(collisionBuf).digest('hex');

const gameplayFields = {
  centerline: trackData.centerline,
  checkpoints: trackData.checkpoints,
  startGrid: trackData.startGrid,
  aiRacingLine: trackData.aiRacingLine,
  shortcuts: trackData.shortcuts,
  ramps: trackData.ramps,
  boostPads: trackData.boostPads,
  killPlaneY: trackData.killPlaneY,
  lapCount: trackData.lapCount
};
const currentDataHash = crypto.createHash('sha256').update(JSON.stringify(gameplayFields)).digest('hex');

if (currentColHash !== lock.collisionGlbSha256) {
  throw new Error(`CRITICAL: collision.glb drift! Expected ${lock.collisionGlbSha256}, got ${currentColHash}`);
}
if (currentDataHash !== lock.gameplayDataSha256) {
  throw new Error(`CRITICAL: track.json gameplay data drift! Expected ${lock.gameplayDataSha256}, got ${currentDataHash}`);
}
console.log('🔒 Gameplay lock verified: collision.glb and track data are 100% intact.');

// 2. Initialize Track Spline from Control Points
const spline = new TrackSpline(trackData.centerline, { closed: true, tension: 0.5 });
const visualScene = new THREE.Scene();

// 3. Materials
const matRoad = new THREE.MeshStandardMaterial({
  color: 0x222225,
  roughness: 0.85,
  metalness: 0.1,
  name: 'mat_road_asphalt'
});
const matCurbRed = new THREE.MeshStandardMaterial({
  color: 0xd32f2f,
  roughness: 0.7,
  name: 'mat_curb_red'
});
const matCurbWhite = new THREE.MeshStandardMaterial({
  color: 0xf5f5f5,
  roughness: 0.7,
  name: 'mat_curb_white'
});
const matSidewalk = new THREE.MeshStandardMaterial({
  color: 0x8d6e63, // Dhaka reddish-brown brick
  roughness: 0.9,
  name: 'mat_sidewalk_brick'
});
const matBarrierRail = new THREE.MeshStandardMaterial({
  color: 0xb0bec5, // Galvanized steel rail
  roughness: 0.4,
  metalness: 0.8,
  name: 'mat_barrier_rail'
});
const matFlyoverPier = new THREE.MeshStandardMaterial({
  color: 0x78909c,
  roughness: 0.8,
  name: 'mat_flyover_pier'
});
const matCurzonBrick = new THREE.MeshStandardMaterial({
  color: 0xb71c1c, // Deep red Curzon Hall brick
  roughness: 0.8,
  name: 'mat_curzon_brick'
});
const matCurzonWhite = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.6,
  name: 'mat_curzon_trim'
});
const matTscGreen = new THREE.MeshStandardMaterial({
  color: 0x1b5e20,
  roughness: 0.5,
  name: 'mat_tsc_dome'
});
const matShaheedWhite = new THREE.MeshStandardMaterial({
  color: 0xeeeeee,
  roughness: 0.3,
  metalness: 0.1,
  name: 'mat_shaheed_monument'
});
const matShaheedRedSun = new THREE.MeshStandardMaterial({
  color: 0xd50000,
  roughness: 0.4,
  name: 'mat_shaheed_sun'
});
const matPetalPad = new THREE.MeshStandardMaterial({
  color: 0xff6d00,
  emissive: 0xff3d00,
  emissiveIntensity: 0.8,
  roughness: 0.3,
  name: 'mat_boost_pad'
});
const matBanner = new THREE.MeshStandardMaterial({
  color: 0xffd600,
  roughness: 0.5,
  name: 'mat_start_banner'
});

// 4. Generate Road Ribbon with Curbs, Sidewalks, and Guardrails
console.log('🛣️ Generating detailed road ribbon, curbs, and sidewalks...');
const SAMPLES = 300;
const roadGeom = new THREE.BufferGeometry();
const curbGeom = new THREE.BufferGeometry();
const sidewalkGeom = new THREE.BufferGeometry();
const railGeom = new THREE.BufferGeometry();

const roadPositions = [];
const roadUvs = [];
const roadIndices = [];

const curbPositions = [];
const curbIndices = [];

const sidewalkPositions = [];
const sidewalkIndices = [];

const railPositions = [];
const railIndices = [];

const roadWidth = 16.0;
const curbWidth = 0.5;
const sidewalkWidth = 3.5;
const railHeight = 0.9;

for (let i = 0; i <= SAMPLES; i++) {
  const t = i / SAMPLES;
  const pt = spline.getPoint(t);
  const tan = spline.getTangent(t);

  const nx = -tan.z;
  const nz = tan.x;
  const len = Math.hypot(nx, nz) || 1;
  const unitNx = nx / len;
  const unitNz = nz / len;

  const halfW = roadWidth * 0.5;

  // Road left & right
  const rLx = pt.x - unitNx * halfW;
  const rLz = pt.z - unitNz * halfW;
  const rRx = pt.x + unitNx * halfW;
  const rRz = pt.z + unitNz * halfW;

  roadPositions.push(rLx, pt.y + 0.02, rLz);
  roadUvs.push(0, t * 40);
  roadPositions.push(rRx, pt.y + 0.02, rRz);
  roadUvs.push(1, t * 40);

  // Curbs (left & right, raised 0.15m)
  const cLx = rLx - unitNx * curbWidth;
  const cLz = rLz - unitNz * curbWidth;
  const cRx = rRx + unitNx * curbWidth;
  const cRz = rRz + unitNz * curbWidth;

  curbPositions.push(cLx, pt.y + 0.15, cLz);
  curbPositions.push(rLx, pt.y + 0.15, rLz);
  curbPositions.push(rRx, pt.y + 0.15, rRz);
  curbPositions.push(cRx, pt.y + 0.15, cRz);

  // Sidewalks
  const sLx = cLx - unitNx * sidewalkWidth;
  const sLz = cLz - unitNz * sidewalkWidth;
  const sRx = cRx + unitNx * sidewalkWidth;
  const sRz = cRz + unitNz * sidewalkWidth;

  sidewalkPositions.push(sLx, pt.y + 0.14, sLz);
  sidewalkPositions.push(cLx, pt.y + 0.14, cLz);
  sidewalkPositions.push(cRx, pt.y + 0.14, cRz);
  sidewalkPositions.push(sRx, pt.y + 0.14, sRz);

  // Barrier Guardrails along outer edge
  railPositions.push(sLx, pt.y + railHeight, sLz);
  railPositions.push(sLx, pt.y + railHeight - 0.3, sLz);
  railPositions.push(sRx, pt.y + railHeight, sRz);
  railPositions.push(sRx, pt.y + railHeight - 0.3, sRz);

  if (i < SAMPLES) {
    // Road quads
    const baseR = i * 2;
    roadIndices.push(baseR, baseR + 1, baseR + 2);
    roadIndices.push(baseR + 1, baseR + 3, baseR + 2);

    // Curb quads
    const baseC = i * 4;
    curbIndices.push(baseC, baseC + 1, baseC + 4);
    curbIndices.push(baseC + 1, baseC + 5, baseC + 4);
    curbIndices.push(baseC + 2, baseC + 3, baseC + 6);
    curbIndices.push(baseC + 3, baseC + 7, baseC + 6);

    // Sidewalk quads
    const baseS = i * 4;
    sidewalkIndices.push(baseS, baseS + 1, baseS + 4);
    sidewalkIndices.push(baseS + 1, baseS + 5, baseS + 4);
    sidewalkIndices.push(baseS + 2, baseS + 3, baseS + 6);
    sidewalkIndices.push(baseS + 3, baseS + 7, baseS + 6);

    // Rail quads
    const baseRail = i * 4;
    railIndices.push(baseRail, baseRail + 1, baseRail + 4);
    railIndices.push(baseRail + 1, baseRail + 5, baseRail + 4);
    railIndices.push(baseRail + 2, baseRail + 3, baseRail + 6);
    railIndices.push(baseRail + 3, baseRail + 7, baseRail + 6);
  }
}

roadGeom.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
roadGeom.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
roadGeom.setIndex(roadIndices);
roadGeom.computeVertexNormals();
const roadMesh = new THREE.Mesh(roadGeom, matRoad);
roadMesh.name = 'visual_road';
visualScene.add(roadMesh);

curbGeom.setAttribute('position', new THREE.Float32BufferAttribute(curbPositions, 3));
curbGeom.setIndex(curbIndices);
curbGeom.computeVertexNormals();
const curbMesh = new THREE.Mesh(curbGeom, matCurbRed);
curbMesh.name = 'visual_curbs';
visualScene.add(curbMesh);

sidewalkGeom.setAttribute('position', new THREE.Float32BufferAttribute(sidewalkPositions, 3));
sidewalkGeom.setIndex(sidewalkIndices);
sidewalkGeom.computeVertexNormals();
const sidewalkMesh = new THREE.Mesh(sidewalkGeom, matSidewalk);
sidewalkMesh.name = 'visual_sidewalks';
visualScene.add(sidewalkMesh);

railGeom.setAttribute('position', new THREE.Float32BufferAttribute(railPositions, 3));
railGeom.setIndex(railIndices);
railGeom.computeVertexNormals();
const railMesh = new THREE.Mesh(railGeom, matBarrierRail);
railMesh.name = 'visual_guardrails';
visualScene.add(railMesh);

// 5. Flyover Structural Pillars
console.log('🌉 Adding Flyover bridge support piers...');
const flyoverPillars = new THREE.Group();
flyoverPillars.name = 'visual_flyover_piers';
[-35, -15, 15, 35].forEach((px) => {
  const pier = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 6.2, 12), matFlyoverPier);
  pier.position.set(px, 3.1, 115);
  flyoverPillars.add(pier);
});
visualScene.add(flyoverPillars);

// 6. Kitbashed Dhaka Landmarks
console.log('🏛️ Kitbashing Dhaka Landmarks: Curzon Hall, TSC Rotunda, Shaheed Minar...');

// Landmark A: Curzon Hall Mughal-Gothic Red-Brick Pavilion (around z: -40 to z: -100)
const curzonGroup = new THREE.Group();
curzonGroup.name = 'landmark_curzon_hall';
for (let cz = -30; cz >= -110; cz -= 25) {
  // West Arcade Wing
  const colW = new THREE.Mesh(new THREE.BoxGeometry(3.5, 12.0, 3.5), matCurzonBrick);
  colW.position.set(-18.0, 6.0, cz);
  const domeW = new THREE.Mesh(new THREE.ConeGeometry(2.5, 3.5, 8), matCurzonWhite);
  domeW.position.set(-18.0, 13.5, cz);
  curzonGroup.add(colW, domeW);

  // East Arcade Wing
  const colE = new THREE.Mesh(new THREE.BoxGeometry(3.5, 12.0, 3.5), matCurzonBrick);
  colE.position.set(18.0, 6.0, cz);
  const domeE = new THREE.Mesh(new THREE.ConeGeometry(2.5, 3.5, 8), matCurzonWhite);
  domeE.position.set(18.0, 13.5, cz);
  curzonGroup.add(colE, domeE);
}
visualScene.add(curzonGroup);

// Landmark B: Start/Finish Gantry Arch at z = 0 with bilingual banner
const archGroup = new THREE.Group();
archGroup.name = 'landmark_start_finish_arch';
const archBeam = new THREE.Mesh(new THREE.BoxGeometry(26.0, 3.0, 2.5), matCurzonBrick);
archBeam.position.set(0, 10.5, 0);

const bannerSign = new THREE.Mesh(new THREE.BoxGeometry(18.0, 1.8, 0.4), matBanner);
bannerSign.position.set(0, 10.5, 1.4); // Facing approaching karts

const pLeft = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 11.0, 8), matCurzonBrick);
pLeft.position.set(-12.0, 5.5, 0);
const pRight = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 11.0, 8), matCurzonBrick);
pRight.position.set(12.0, 5.5, 0);

archGroup.add(archBeam, bannerSign, pLeft, pRight);
visualScene.add(archGroup);

// Landmark C: TSC Rotunda & Green Dome (Hairpin apex at x: 230, z: -180)
const tscGroup = new THREE.Group();
tscGroup.name = 'landmark_tsc_rotunda';
const tscBase = new THREE.Mesh(new THREE.CylinderGeometry(14.0, 14.0, 3.0, 24), matFlyoverPier);
tscBase.position.set(230, 1.5, -180);
const tscDome = new THREE.Mesh(new THREE.SphereGeometry(14.0, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), matTscGreen);
tscDome.position.set(230, 3.0, -180);

// White columns around rotunda perimeter
for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
  const cx = 230 + Math.cos(a) * 12.0;
  const cz = -180 + Math.sin(a) * 12.0;
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 6.0, 8), matCurzonWhite);
  col.position.set(cx, 4.5, cz);
  tscGroup.add(col);
}
tscGroup.add(tscBase, tscDome);
visualScene.add(tscGroup);

// Landmark D: Shaheed Minar (Central tilted monument and red sun at x: 145, z: 20)
const shaheedGroup = new THREE.Group();
shaheedGroup.name = 'landmark_shaheed_minar';
const monumentBase = new THREE.Mesh(new THREE.BoxGeometry(20.0, 1.5, 15.0), matFlyoverPier);
monumentBase.position.set(145, 0.75, 20);

// Central tilted column
const mainCol = new THREE.Mesh(new THREE.BoxGeometry(2.5, 16.0, 1.0), matShaheedWhite);
mainCol.position.set(145, 8.5, 18);
mainCol.rotation.x = -0.15; // Iconic forward lean

// Side columns
const leftCol = new THREE.Mesh(new THREE.BoxGeometry(1.8, 12.0, 0.8), matShaheedWhite);
leftCol.position.set(139, 6.5, 19);
leftCol.rotation.x = -0.15;
const rightCol = new THREE.Mesh(new THREE.BoxGeometry(1.8, 12.0, 0.8), matShaheedWhite);
rightCol.position.set(151, 6.5, 19);
rightCol.rotation.x = -0.15;

// Red Sun disc behind the columns
const redSun = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.4, 32), matShaheedRedSun);
redSun.position.set(145, 9.5, 16.5);
redSun.rotation.x = Math.PI / 2;

shaheedGroup.add(monumentBase, mainCol, leftCol, rightCol, redSun);
visualScene.add(shaheedGroup);

// 7. Visual Petal Boost Pads (Overlaying gameplay boost pads)
console.log('⚡ Placing glowing visual petal boost pad overlays...');
for (const pad of (trackData.boostPads || [])) {
  const padMesh = new THREE.Mesh(new THREE.PlaneGeometry(pad.width || 4.5, pad.length || 7.0), matPetalPad);
  padMesh.rotation.x = -Math.PI / 2;
  padMesh.rotation.z = pad.rotation || 0;
  padMesh.position.set(pad.x, pad.y + 0.06, pad.z);
  padMesh.name = 'visual_boost_pad';
  visualScene.add(padMesh);
}

// 8. Generate Declarative Props Definition (props.json)
console.log('📦 Generating props.json with STK models (lamps, benches, trees, bushes, barrels, lanterns)...');
const props = [];

// A. Street Lamps every ~25m along sidewalks
for (let i = 0; i < SAMPLES; i += 8) {
  const t = i / SAMPLES;
  const pt = spline.getPoint(t);
  const tan = spline.getTangent(t);
  const nx = -tan.z;
  const nz = tan.x;
  const len = Math.hypot(nx, nz) || 1;
  const unx = nx / len;
  const unz = nz / len;

  const lampOffset = (roadWidth * 0.5) + curbWidth + 1.0;
  // Left lamp
  props.push({
    model: 'lamp',
    position: [+(pt.x - unx * lampOffset).toFixed(2), +(pt.y).toFixed(2), +(pt.z - unz * lampOffset).toFixed(2)],
    rotation: [0, +(Math.atan2(tan.x, tan.z)).toFixed(3), 0],
    scale: [1, 1, 1]
  });
  // Right lamp
  props.push({
    model: 'lamp',
    position: [+(pt.x + unx * lampOffset).toFixed(2), +(pt.y).toFixed(2), +(pt.z + unz * lampOffset).toFixed(2)],
    rotation: [0, +(Math.atan2(-tan.x, -tan.z)).toFixed(3), 0],
    scale: [1, 1, 1]
  });
}

// B. Krishnachura Trees along Krishnachura Avenue (t between 0.35 and 0.55)
for (let i = Math.floor(SAMPLES * 0.35); i <= Math.floor(SAMPLES * 0.55); i += 6) {
  const t = i / SAMPLES;
  const pt = spline.getPoint(t);
  const tan = spline.getTangent(t);
  const unx = -tan.z / (Math.hypot(tan.x, tan.z) || 1);
  const unz = tan.x / (Math.hypot(tan.x, tan.z) || 1);

  const treeOffset = (roadWidth * 0.5) + 3.0;
  props.push({
    model: 'krishnachura_tree',
    position: [+(pt.x + unx * treeOffset).toFixed(2), +(pt.y).toFixed(2), +(pt.z + unz * treeOffset).toFixed(2)],
    rotation: [0, +(Math.random() * Math.PI * 2).toFixed(2), 0],
    scale: [1.2, 1.2, 1.2]
  });
}

// C. Campus Benches along sidewalks
for (let i = 10; i < SAMPLES; i += 24) {
  const t = i / SAMPLES;
  const pt = spline.getPoint(t);
  const tan = spline.getTangent(t);
  const unx = -tan.z / (Math.hypot(tan.x, tan.z) || 1);
  const unz = tan.x / (Math.hypot(tan.x, tan.z) || 1);

  const benchOffset = (roadWidth * 0.5) + curbWidth + 2.0;
  props.push({
    model: 'bench',
    position: [+(pt.x - unx * benchOffset).toFixed(2), +(pt.y).toFixed(2), +(pt.z - unz * benchOffset).toFixed(2)],
    rotation: [0, +(Math.atan2(tan.x, tan.z)).toFixed(3), 0],
    scale: [1, 1, 1]
  });
}

// D. Roadside Bushes & Flowerbeds
for (let i = 5; i < SAMPLES; i += 12) {
  const t = i / SAMPLES;
  const pt = spline.getPoint(t);
  const tan = spline.getTangent(t);
  const unx = -tan.z / (Math.hypot(tan.x, tan.z) || 1);
  const unz = tan.x / (Math.hypot(tan.x, tan.z) || 1);

  const bushOffset = (roadWidth * 0.5) + curbWidth + 3.0;
  props.push({
    model: 'bush',
    position: [+(pt.x + unx * bushOffset).toFixed(2), +(pt.y).toFixed(2), +(pt.z + unz * bushOffset).toFixed(2)],
    rotation: [0, +(Math.random() * Math.PI * 2).toFixed(2), 0],
    scale: [0.9, 0.9, 0.9]
  });
}

// E. Crash Barrels at S-Chicane Apexes
[
  [25, 0, -150],
  [65, 0, -175],
  [105, 0, -155],
  [145, 0, -185]
].forEach(([cx, cy, cz]) => {
  props.push({
    model: 'barrel',
    position: [cx + 9.0, cy, cz],
    rotation: [0, 0, 0],
    scale: [1, 1, 1]
  });
});

// F. Hanging Festive Lanterns strung under the Start Arch
for (let lx = -9; lx <= 9; lx += 3) {
  props.push({
    model: 'lantern',
    position: [lx, 9.2, 0],
    rotation: [0, 0, 0],
    scale: [1.2, 1.2, 1.2]
  });
}

fs.writeFileSync(PROPS_JSON_PATH, JSON.stringify(props, null, 2) + '\n');
console.log(`✅ Exported ${props.length} instanced props to ${PROPS_JSON_PATH}`);

// 9. Export visual.glb via GLTFExporter
console.log('📦 Exporting dressed visual.glb...');
const exporter = new GLTFExporter();
const gltfBuf = await exporter.parseAsync(visualScene, { binary: true });
fs.writeFileSync(VISUAL_GLB_PATH, Buffer.from(gltfBuf));
console.log(`💾 visual.glb exported successfully: ${(gltfBuf.byteLength / 1024).toFixed(1)} kB (Budget: <= 8000 kB)`);

// 10. Re-verify Gameplay Lock After Export
const finalColHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(TRACK_DIR, 'collision.glb'))).digest('hex');
if (finalColHash !== lock.collisionGlbSha256) {
  throw new Error('POST-CONDITION FAILURE: collision.glb was modified during dressing!');
}
console.log('🎉 Track Dressing complete! Gameplay lock preserved 100%.');
