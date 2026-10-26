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
import { readSPM, spmToBufferGeometries } from './stk/spm-reader.mjs';

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
  color: 0xef4444,
  roughness: 0.6,
  name: 'mat_curb_red'
});
const matCurbWhite = new THREE.MeshStandardMaterial({
  color: 0xf8fafc,
  roughness: 0.6,
  name: 'mat_curb_white'
});
const matRoadLineWhite = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.4,
  name: 'mat_road_line_white'
});
const matStartChecker = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.3,
  name: 'mat_start_checker'
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

// 4b. Generate Road Surface Markings: White Dashed Centerline & Solid Edge Lines
console.log('🛣️ Generating crisp painted road markings (dashed centerline & solid edge stripes)...');
const centerLineGeom = new THREE.BufferGeometry();
const centerLinePositions = [];
const centerLineIndices = [];

const edgeLineGeom = new THREE.BufferGeometry();
const edgeLinePositions = [];
const edgeLineIndices = [];

const dashLength = 3.8;
const gapLength = 2.4;
const cycle = dashLength + gapLength;
let currentDist = 0;

for (let i = 0; i < SAMPLES; i++) {
  const t0 = i / SAMPLES;
  const t1 = (i + 1) / SAMPLES;
  const pt0 = spline.getPoint(t0);
  const pt1 = spline.getPoint(t1);
  const tan0 = spline.getTangent(t0);
  const tan1 = spline.getTangent(t1);

  const segDist = Math.hypot(pt1.x - pt0.x, pt1.y - pt0.y, pt1.z - pt0.z);
  const inDash = (currentDist % cycle) < dashLength;
  currentDist += segDist;

  const nx0 = -tan0.z / (Math.hypot(tan0.x, tan0.z) || 1);
  const nz0 = tan0.x / (Math.hypot(tan0.x, tan0.z) || 1);
  const nx1 = -tan1.z / (Math.hypot(tan1.x, tan1.z) || 1);
  const nz1 = tan1.x / (Math.hypot(tan1.x, tan1.z) || 1);

  const halfLineWidth = 0.18;
  const edgeOffset = (roadWidth * 0.5) - 0.45;
  const edgeLineWidth = 0.22;

  // Solid outer edge lines (left and right)
  const baseEdgeL = edgeLinePositions.length / 3;
  edgeLinePositions.push(pt0.x - nx0 * edgeOffset, pt0.y + 0.035, pt0.z - nz0 * edgeOffset);
  edgeLinePositions.push(pt0.x - nx0 * (edgeOffset - edgeLineWidth), pt0.y + 0.035, pt0.z - nz0 * (edgeOffset - edgeLineWidth));
  edgeLinePositions.push(pt1.x - nx1 * edgeOffset, pt1.y + 0.035, pt1.z - nz1 * edgeOffset);
  edgeLinePositions.push(pt1.x - nx1 * (edgeOffset - edgeLineWidth), pt1.y + 0.035, pt1.z - nz1 * (edgeOffset - edgeLineWidth));
  edgeLineIndices.push(baseEdgeL, baseEdgeL + 1, baseEdgeL + 2);
  edgeLineIndices.push(baseEdgeL + 1, baseEdgeL + 3, baseEdgeL + 2);

  const baseEdgeR = edgeLinePositions.length / 3;
  edgeLinePositions.push(pt0.x + nx0 * (edgeOffset - edgeLineWidth), pt0.y + 0.035, pt0.z + nz0 * (edgeOffset - edgeLineWidth));
  edgeLinePositions.push(pt0.x + nx0 * edgeOffset, pt0.y + 0.035, pt0.z + nz0 * edgeOffset);
  edgeLinePositions.push(pt1.x + nx1 * (edgeOffset - edgeLineWidth), pt1.y + 0.035, pt1.z + nz1 * (edgeOffset - edgeLineWidth));
  edgeLinePositions.push(pt1.x + nx1 * edgeOffset, pt1.y + 0.035, pt1.z + nz1 * edgeOffset);
  edgeLineIndices.push(baseEdgeR, baseEdgeR + 1, baseEdgeR + 2);
  edgeLineIndices.push(baseEdgeR + 1, baseEdgeR + 3, baseEdgeR + 2);

  // Dashed centerline
  if (inDash) {
    const baseCenter = centerLinePositions.length / 3;
    centerLinePositions.push(pt0.x - nx0 * halfLineWidth, pt0.y + 0.035, pt0.z - nz0 * halfLineWidth);
    centerLinePositions.push(pt0.x + nx0 * halfLineWidth, pt0.y + 0.035, pt0.z + nz0 * halfLineWidth);
    centerLinePositions.push(pt1.x - nx1 * halfLineWidth, pt1.y + 0.035, pt1.z - nz1 * halfLineWidth);
    centerLinePositions.push(pt1.x + nx1 * halfLineWidth, pt1.y + 0.035, pt1.z + nz1 * halfLineWidth);
    centerLineIndices.push(baseCenter, baseCenter + 1, baseCenter + 2);
    centerLineIndices.push(baseCenter + 1, baseCenter + 3, baseCenter + 2);
  }
}

centerLineGeom.setAttribute('position', new THREE.Float32BufferAttribute(centerLinePositions, 3));
centerLineGeom.setIndex(centerLineIndices);
centerLineGeom.computeVertexNormals();
const centerLineMesh = new THREE.Mesh(centerLineGeom, matRoadLineWhite);
centerLineMesh.name = 'visual_centerline';
visualScene.add(centerLineMesh);

edgeLineGeom.setAttribute('position', new THREE.Float32BufferAttribute(edgeLinePositions, 3));
edgeLineGeom.setIndex(edgeLineIndices);
edgeLineGeom.computeVertexNormals();
const edgeLineMesh = new THREE.Mesh(edgeLineGeom, matRoadLineWhite);
edgeLineMesh.name = 'visual_edgelines';
visualScene.add(edgeLineMesh);

// 4c. High-contrast alternating red and white curbs
const curbRedIndices = [];
const curbWhiteIndices = [];
let curbDist = 0;
for (let i = 0; i < SAMPLES; i++) {
  const t0 = i / SAMPLES;
  const t1 = (i + 1) / SAMPLES;
  const p0 = spline.getPoint(t0);
  const p1 = spline.getPoint(t1);
  const segLen = Math.hypot(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z);
  curbDist += segLen;
  const isRed = (Math.floor(curbDist / 3.0) % 2) === 0;
  const targetIndices = isRed ? curbRedIndices : curbWhiteIndices;

  const baseC = i * 4;
  targetIndices.push(baseC, baseC + 1, baseC + 4);
  targetIndices.push(baseC + 1, baseC + 5, baseC + 4);
  targetIndices.push(baseC + 2, baseC + 3, baseC + 6);
  targetIndices.push(baseC + 3, baseC + 7, baseC + 6);
}

curbGeom.setAttribute('position', new THREE.Float32BufferAttribute(curbPositions, 3));
curbGeom.setIndex(curbRedIndices);
curbGeom.computeVertexNormals();
const curbMeshRed = new THREE.Mesh(curbGeom, matCurbRed);
curbMeshRed.name = 'visual_curbs_red';
visualScene.add(curbMeshRed);

const curbWhiteGeom = curbGeom.clone();
curbWhiteGeom.setIndex(curbWhiteIndices);
const curbMeshWhite = new THREE.Mesh(curbWhiteGeom, matCurbWhite);
curbMeshWhite.name = 'visual_curbs_white';
visualScene.add(curbMeshWhite);

// 4d. Start / Finish Line Checkered Banner on track
const startCheckGeom = new THREE.BufferGeometry();
const startCheckPositions = [];
const startCheckIndices = [];
const sPt = spline.getPoint(0);
const sTan = spline.getTangent(0);
const sNx = -sTan.z / (Math.hypot(sTan.x, sTan.z) || 1);
const sNz = sTan.x / (Math.hypot(sTan.x, sTan.z) || 1);
const startW = roadWidth * 0.5 - 0.4;
const checkLen = 2.0;

const startBase = 0;
startCheckPositions.push(sPt.x - sNx * startW, sPt.y + 0.04, sPt.z - sNz * startW);
startCheckPositions.push(sPt.x + sNx * startW, sPt.y + 0.04, sPt.z + sNz * startW);
startCheckPositions.push(sPt.x - sNx * startW + sTan.x * checkLen, sPt.y + 0.04, sPt.z - sNz * startW + sTan.z * checkLen);
startCheckPositions.push(sPt.x + sNx * startW + sTan.x * checkLen, sPt.y + 0.04, sPt.z + sNz * startW + sTan.z * checkLen);
startCheckIndices.push(0, 1, 2, 1, 3, 2);
startCheckGeom.setAttribute('position', new THREE.Float32BufferAttribute(startCheckPositions, 3));
startCheckGeom.setIndex(startCheckIndices);
startCheckGeom.computeVertexNormals();
const startCheckMesh = new THREE.Mesh(startCheckGeom, matStartChecker);
startCheckMesh.name = 'visual_start_checker';
visualScene.add(startCheckMesh);

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

// 5. SuperTuxKart Candela City Metropolis & Architectural Monuments
console.log('🏙️ Importing whole Candela City track and architectural monuments...');

// Helper to unpack and mount STK SPM models into visual scene
function mountSpmModel(spmRelativePath, name, scale = 1, pos = [0, 0, 0], rot = [0, 0, 0], tintColor = null, excludeMaterials = []) {
  const fullPath = path.resolve('.cache/stk-assets', spmRelativePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`  ⚠️ Missing SPM model: ${fullPath}`);
    return null;
  }
  const buf = fs.readFileSync(fullPath);
  const spm = readSPM(buf, { transformCoordinates: true });
  const geoms = spmToBufferGeometries(spm);
  const grp = new THREE.Group();
  grp.name = name;

  for (const g of geoms) {
    if (excludeMaterials.includes(g.materialName)) {
      continue;
    }
    const matProps = {
      name: g.materialName,
      roughness: 0.75,
      metalness: 0.15
    };
    if (tintColor) {
      matProps.color = new THREE.Color(tintColor);
    }
    const mat = new THREE.MeshStandardMaterial(matProps);
    const mesh = new THREE.Mesh(g.geometry, mat);
    grp.add(mesh);
  }

  grp.scale.set(scale, scale, scale);
  grp.position.set(pos[0], pos[1], pos[2]);
  grp.rotation.set(rot[0], rot[1], rot[2]);
  visualScene.add(grp);
  return grp;
}

// 5a. Mount Candela City 3D Architectural Environment (excluding overhead highway slabs that clip the sky)
mountSpmModel(
  'tracks/candela_city/candela_city_track.spm',
  'candela_city_world_architecture',
  1.0,
  [0, -1.0, 0],
  [0, 0, 0],
  null,
  ['stk_darkGrayMetal_a.png', 'stk_generic_ironA.png', 'stk_greyMetal_a.png', 'stk_generic_runway_a.png']
);

// 6. External SuperTuxKart Architectural Monuments (replacing procedural landmark blocks)
console.log('🏛️ Placing authentic Candela City monuments: Start Arch Gantry, Clocktower, Observation Tower, Waterfall & Monorail...');

// Landmark A: Candela City Start/Finish Line Gantry & Neon Patterns directly above the start line (z = 28)
mountSpmModel(
  'tracks/candela_city/start_sign.spm',
  'candela_start_gantry_arch',
  2.8,
  [0, 8.5, 28],
  [0, 0, 0]
);
mountSpmModel(
  'tracks/candela_city/start_sign_pattern.spm',
  'candela_start_sign_neon_pattern',
  2.8,
  [0, 8.5, 28.2],
  [0, 0, 0]
);

// Landmark B: Candela City Clockwork Mechanical Monument (replaces procedural TSC Rotunda)
mountSpmModel(
  'tracks/candela_city/clockWork_a.spm',
  'candela_clocktower_monument_a',
  2.0,
  [230, 2.5, -180],
  [0, 0, 0]
);
mountSpmModel(
  'tracks/candela_city/clockWork_b.spm',
  'candela_clocktower_monument_b',
  2.0,
  [230, 6.0, -180],
  [0, Math.PI / 4, 0]
);

// Landmark C: Candela City Glass Observation Tower / Elevator (replaces procedural cylinder)
mountSpmModel(
  'tracks/candela_city/elevator_a1.spm',
  'candela_observation_elevator',
  1.6,
  [225, 0, -165],
  [0, -Math.PI / 3, 0]
);

// Landmark D: Candela City Caracalla Waterfall Monument (replaces procedural Shaheed Minar)
mountSpmModel(
  'tracks/candela_city/caracalla_waterfall.spm',
  'candela_caracalla_waterfall_monument',
  2.2,
  [145, 0, 18],
  [0, 0, 0]
);

// Landmark E: Candela City Monorail / Toy Train Transit (replaces procedural blocks)
mountSpmModel(
  'tracks/candela_city/toy_train.spm',
  'candela_monorail_transit_car',
  2.0,
  [145, 1.2, 35],
  [0, Math.PI / 2, 0]
);

// Landmark F: Candela City Aerial Transport Gondola
mountSpmModel(
  'tracks/candela_city/gondola.spm',
  'candela_aerial_gondola',
  1.8,
  [-18.0, 14.0, -70],
  [0, 0, 0]
);

// 7. Visual Boost Pads (Candela City start pattern chevron overlays)
console.log('⚡ Placing authentic visual boost pad overlays...');
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

// F. Hanging Festive Lanterns strung under the Start Arch (z = 28)
for (let lx = -9; lx <= 9; lx += 3) {
  props.push({
    model: 'lantern',
    position: [lx, 8.2, 28],
    rotation: [0, 0, 0],
    scale: [1.2, 1.2, 1.2]
  });
}

// G. Authentic STK Traffic Cars (from Candela City car_traffic.spm) parked roadside
const trafficCars = [
  // Curzon Hall parking & entrance
  { pos: [-24, 0, -45], rotY: 0.3 },
  { pos: [-24, 0, -75], rotY: -0.2 },
  { pos: [24, 0, -55], rotY: 2.9 },
  // TSC Rotunda perimeter parking
  { pos: [215, 0, -195], rotY: 1.2 },
  { pos: [245, 0, -165], rotY: 2.4 },
  // Shaheed Minar plaza edge
  { pos: [130, 0, 35], rotY: -1.5 },
  { pos: [160, 0, 35], rotY: 1.6 },
  // Krishnachura Avenue curbside
  { pos: [55, 0, 140], rotY: 0.8 },
  { pos: [-40, 0, 75], rotY: -2.1 }
];

for (const car of trafficCars) {
  props.push({
    model: 'stk_traffic_car',
    position: car.pos,
    rotation: [0, car.rotY, 0],
    scale: [1.3, 1.3, 1.3]
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
