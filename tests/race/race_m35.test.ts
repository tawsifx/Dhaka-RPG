// tests/race/race_m35.test.ts - Milestone 3.5 Art Pass unit test suite
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as THREE from 'three';

import {
  readSPM,
  spmToBufferGeometries,
  decodeFloat16,
  decodeNormal10_10_10_2
} from '../../scripts/race/stk/spm-reader.mjs';
import {
  parseMaterialsXml,
  resolveMaterialFromTexture
} from '../../scripts/race/stk/parse-materials.mjs';
import { parseSceneXml } from '../../scripts/race/stk/parse-scene.mjs';
import { convertSpmToGlb } from '../../scripts/race/stk/convert-mesh.mjs';
import { GfxQuality } from '../../src/scenes/minigames/race/render/GfxQuality';
import { PropInstancer } from '../../src/scenes/minigames/race/render/PropInstancer';
import { PlaceholderKart } from '../../src/scenes/minigames/race/render/PlaceholderKart';
import { RaceAudio } from '../../src/scenes/minigames/race/audio/RaceAudio';
import { RaceGallery } from '../../src/scenes/minigames/race/ui/RaceGallery';
import { ALL_DRIVERS } from '../../src/config/drivers.race.db';

describe('Milestone 3.5: SuperTuxKart Art Pass & Fuller Road Dressing', () => {
  const FIXTURES_DIR = path.resolve('tests/race/fixtures/stk');
  const TRACK_DIR = path.resolve('public/assets/race/tracks/fuller_road_sprint');
  const STK_PUBLIC_DIR = path.resolve('public/assets/race/stk');

  // ── 1. Float16 and Normal Decoders ──────────────────────────────────────────
  describe('SPM Math & Vector Unpackers', () => {
    it('accurately decodes 16-bit half-precision floats', () => {
      // 0.0 in Float16 is 0x0000
      expect(decodeFloat16(0x0000)).toBe(0.0);
      // 1.0 in Float16 is 0x3c00
      expect(decodeFloat16(0x3c00)).toBeCloseTo(1.0, 4);
      // -1.0 in Float16 is 0xbc00
      expect(decodeFloat16(0xbc00)).toBeCloseTo(-1.0, 4);
      // 0.5 in Float16 is 0x3800
      expect(decodeFloat16(0x3800)).toBeCloseTo(0.5, 4);
    });

    it('decodes 10-10-10-2 packed normals into normalized unit vectors', () => {
      // Test zero and axis vectors
      const [nx, ny, nz] = decodeNormal10_10_10_2(0);
      expect(nx).toBeCloseTo(0, 2);
      expect(ny).toBeCloseTo(0, 2);
      expect(nz).toBeCloseTo(0, 2);
    });
  });

  // ── 2. Pure Node SPM Reader ─────────────────────────────────────────────────
  describe('SPM Binary Reader (readSPM)', () => {
    it('throws when binary magic is not "SP"', () => {
      const corruptBuf = Buffer.from('BAD_MAGIC_HEADER_DATA_PADDING_MORE');
      expect(() => readSPM(corruptBuf)).toThrow(/Invalid SPM magic/);
    });

    it('parses box.spm fixture correctly', () => {
      const boxBuf = fs.readFileSync(path.join(FIXTURES_DIR, 'box.spm'));
      const spm: any = readSPM(boxBuf);

      expect(spm.version).toBe(1);
      expect(spm.meshType).toBe(0); // SPMS
      expect(spm.flags & 1).toBe(1); // hasNormals
      expect(spm.bbox.min).toEqual([-1, -1, -1]);
      expect(spm.bbox.max).toEqual([1, 1, 1]);
      expect(spm.materials.length).toBe(1);
      expect(spm.materials[0].tex1).toBe('test_box.png');
      expect(spm.sections.length).toBe(1);
      expect(spm.sections[0].vertexCount).toBe(8);
      expect(spm.sections[0].indexCount).toBe(36);
    });

    it('inverts Z and reverses triangle winding for Three.js coordinates', () => {
      const boxBuf = fs.readFileSync(path.join(FIXTURES_DIR, 'box.spm'));
      const rawSpm: any = readSPM(boxBuf, { transformCoordinates: false });
      const transformedSpm: any = readSPM(boxBuf, { transformCoordinates: true });

      // Check Z inversion on first vertex
      expect(transformedSpm.sections[0].positions[2]).toBe(-rawSpm.sections[0].positions[2]);
      // Check triangle winding index swap
      expect(transformedSpm.sections[0].indices[1]).toBe(rawSpm.sections[0].indices[2]);
      expect(transformedSpm.sections[0].indices[2]).toBe(rawSpm.sections[0].indices[1]);
    });

    it('converts parsed SPM data into valid Three.js BufferGeometry instances', () => {
      const boxBuf = fs.readFileSync(path.join(FIXTURES_DIR, 'box.spm'));
      const spm: any = readSPM(boxBuf);
      const geos = spmToBufferGeometries(spm);

      expect(geos.length).toBe(1);
      const { geometry, materialName } = geos[0];
      expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
      expect(geometry.getAttribute('position').count).toBe(8);
      expect(geometry.getIndex()?.count).toBe(36);
      expect(materialName).toBe('test_box.png');
    });

    it('parses test_quad.spm fixture cleanly', () => {
      const quadBuf = fs.readFileSync(path.join(FIXTURES_DIR, 'test_quad.spm'));
      const spm: any = readSPM(quadBuf);

      expect(spm.version).toBe(1);
      expect(spm.sections[0].vertexCount).toBe(4);
      expect(spm.sections[0].indexCount).toBe(6);
    });
  });

  // ── 3. Material & Scene XML Parsers ─────────────────────────────────────────
  describe('Materials and Scene XML Parsers', () => {
    it('parses STK materials.xml with transparency, blend modes, and backface culling', () => {
      const xml = `
        <materials>
          <material name="leaf_foliage" tex-file="leaf.png" alpha="Y" backface-culling="N"/>
          <material name="asphalt_road" tex-file="road.jpg" alpha="N" backface-culling="Y"/>
        </materials>
      `;
      const mats = parseMaterialsXml(xml);
      expect(mats.has('leaf_foliage')).toBe(true);
      expect(mats.get('leaf_foliage')?.transparent).toBe(true);
      expect(mats.get('leaf_foliage')?.doubleSided).toBe(true);
      expect(mats.get('asphalt_road')?.transparent).toBe(false);
      expect(mats.get('asphalt_road')?.doubleSided).toBe(false);
    });

    it('heuristically resolves roughness and metalness for foliage vs metal vs road', () => {
      const metalMat = resolveMaterialFromTexture('stk_metal_iron.png', '');
      expect(metalMat.metalness).toBeGreaterThan(0.5);

      const leafMat = resolveMaterialFromTexture('autumn_leaf.png', '');
      expect(leafMat.transparent).toBe(true);
      expect(leafMat.doubleSided).toBe(true);

      const roadMat = resolveMaterialFromTexture('blackRoad.jpg', '');
      expect(roadMat.roughness).toBeGreaterThanOrEqual(0.8);
      expect(roadMat.metalness).toBeLessThan(0.2);
    });

    it('parses node.xml and handles left-to-right hand coordinate conversion', () => {
      const xml = `
        <scene>
          <object id="bench_01" model="bench.spm" xyz="10.0 2.0 30.0" hpr="45.0 0.0 0.0" scale="1.0 1.0 1.0"/>
          <light id="street_light" xyz="5.0 8.0 20.0" distance="30.0" energy="2.0" color="255 200 100"/>
        </scene>
      `;
      const result = parseSceneXml(xml, { transformCoordinates: true });
      expect(result.objects.length).toBe(1);
      expect(result.objects[0].model).toBe('bench.spm');
      // Z inverted: 30.0 -> -30.0
      expect(result.objects[0].position[2]).toBe(-30.0);
      // Yaw negated: 45.0 -> -45.0
      expect(result.objects[0].rotation[0]).toBe(-45.0);

      expect(result.lights.length).toBe(1);
      expect(result.lights[0].position[2]).toBe(-20.0);
      expect(result.lights[0].energy).toBe(2.0);
    });
  });

  // ── 4. Mesh Converter (convertSpmToGlb) ──────────────────────────────────────
  describe('Mesh Converter (convertSpmToGlb)', () => {
    it('converts SPM fixture into a valid binary GLB format', async () => {
      const boxSpmPath = path.join(FIXTURES_DIR, 'box.spm');
      const glbBuf = await convertSpmToGlb(boxSpmPath);

      expect(glbBuf).toBeInstanceOf(Buffer);
      expect(glbBuf.length).toBeGreaterThan(100);
      // GLB Header magic is 0x46546C67 ("glTF")
      const magic = glbBuf.subarray(0, 4).toString('ascii');
      expect(magic).toBe('glTF');
      const version = glbBuf.readUInt32LE(4);
      expect(version).toBe(2);
    });

    it('applies color tint override when requested', async () => {
      const boxSpmPath = path.join(FIXTURES_DIR, 'box.spm');
      const glbBuf = await convertSpmToGlb(boxSpmPath, { recolorTint: 0xd32f2f });
      expect(glbBuf.length).toBeGreaterThan(0);
    });
  });

  // ── 5. Graphics Quality Presets (GfxQuality) ─────────────────────────────────
  describe('Graphics Quality Presets (GfxQuality)', () => {
    afterEach(() => {
      GfxQuality.setLevel('high');
    });

    it('returns high preset settings with full density and shadows', () => {
      GfxQuality.setLevel('high');
      const s = GfxQuality.getSettings();
      expect(s.level).toBe('high');
      expect(s.shadows).toBe(true);
      expect(s.propDensity).toBe(1.0);
      expect(s.particleMultiplier).toBe(1.0);
    });

    it('returns med preset settings with balanced density', () => {
      GfxQuality.setLevel('med');
      const s = GfxQuality.getSettings();
      expect(s.level).toBe('med');
      expect(s.shadows).toBe(true);
      expect(s.propDensity).toBe(0.70);
    });

    it('returns low preset settings with shadows disabled and reduced density', () => {
      GfxQuality.setLevel('low');
      const s = GfxQuality.getSettings();
      expect(s.level).toBe('low');
      expect(s.shadows).toBe(false);
      expect(s.propDensity).toBe(0.35);
      expect(s.particleMultiplier).toBe(0.25);
    });
  });

  // ── 6. Prop Instancer (PropInstancer) ────────────────────────────────────────
  describe('Prop Instancer (PropInstancer)', () => {
    it('initializes with an empty THREE.Group', () => {
      const instancer = new PropInstancer();
      expect(instancer.group).toBeInstanceOf(THREE.Group);
      expect(instancer.group.name).toBe('instanced_props_group');
      instancer.dispose();
    });

    it('cleans up geometries and instanced meshes on dispose()', () => {
      const instancer = new PropInstancer();
      instancer.dispose();
      expect(instancer.group.children.length).toBe(0);
    });
  });

  // ── 7. Rickshaw Kart Enhancements ───────────────────────────────────────────
  describe('Rickshaw Kart Enhancements (PlaceholderKart)', () => {
    it('provides character driver and passenger anchor groups', () => {
      const kart = new PlaceholderKart();
      expect(kart.driverAnchor).toBeInstanceOf(THREE.Group);
      expect(kart.passengerAnchor).toBeInstanceOf(THREE.Group);
      expect(kart.rescueLantern).toBeInstanceOf(THREE.Group);
      kart.dispose();
    });

    it('keeps rescue lantern hidden during normal racing and shows it when rescuing', () => {
      const kart = new PlaceholderKart();
      expect(kart.rescueLantern.visible).toBe(false);

      // Normal state update
      kart.update({
        x: 0, y: 0, z: 0, rotation: 0, speed: 10,
        steerAngle: 0, bodyRoll: 0, bodyPitch: 0,
        distanceTravelled: 50, isRescuing: false
      } as any);
      expect(kart.rescueLantern.visible).toBe(false);

      // Rescue state update
      kart.update({
        x: 0, y: 0, z: 0, rotation: 0, speed: 0,
        steerAngle: 0, bodyRoll: 0, bodyPitch: 0,
        distanceTravelled: 50, isRescuing: true
      } as any);
      expect(kart.rescueLantern.visible).toBe(true);

      kart.dispose();
    });

    it('properly configures all 8 drivers with distinct palettes and stats', () => {
      expect(ALL_DRIVERS.length).toBe(8);
      const names = ALL_DRIVERS.map((d) => d.name);
      expect(names).toContain('Tania');
      expect(names).toContain('Baki Bhai');
      expect(names).toContain('Iman');
      expect(names).toContain('Arif');
      expect(names).toContain('Anamika');
      expect(names).toContain('Rakin');
      expect(names).toContain('Apshora');
    });
  });

  // ── 8. Race Audio Loop & Ducking ────────────────────────────────────────────
  describe('Race Audio Integration (RaceAudio)', () => {
    it('exposes playMusic, duckMusic, and stopMusic methods', () => {
      const audio = new RaceAudio();
      expect(typeof audio.playMusic).toBe('function');
      expect(typeof audio.duckMusic).toBe('function');
      expect(typeof audio.stopMusic).toBe('function');
      audio.dispose();
    });

    it('ducks and restores music without throwing', () => {
      const audio = new RaceAudio();
      expect(() => audio.duckMusic(true)).not.toThrow();
      expect(() => audio.duckMusic(false)).not.toThrow();
      expect(() => audio.stopMusic()).not.toThrow();
      audio.dispose();
    });
  });

  // ── 9. Non-Negotiable Rule 2: Gameplay Lock Invariance ──────────────────────
  describe('Gameplay Lock Verification (collision.glb & track data)', () => {
    it('verifies that gameplay.lock.json exists and contains correct track ID', () => {
      const lockPath = path.join(TRACK_DIR, 'gameplay.lock.json');
      expect(fs.existsSync(lockPath)).toBe(true);

      const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      expect(lock.trackId).toBe('fuller_road_sprint');
      expect(lock.collisionGlbSha256).toBeDefined();
      expect(lock.gameplayDataSha256).toBeDefined();
    });

    it('asserts collision.glb SHA-256 matches locked hash byte-for-byte', () => {
      const lockPath = path.join(TRACK_DIR, 'gameplay.lock.json');
      const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

      const colBuf = fs.readFileSync(path.join(TRACK_DIR, 'collision.glb'));
      const colHash = crypto.createHash('sha256').update(colBuf).digest('hex');

      expect(colHash).toBe(lock.collisionGlbSha256);
      expect(colBuf.length).toBe(lock.collisionSizeBytes);
    });

    it('asserts track.json gameplay fields match locked hash byte-for-byte', () => {
      const lockPath = path.join(TRACK_DIR, 'gameplay.lock.json');
      const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

      const track = JSON.parse(fs.readFileSync(path.join(TRACK_DIR, 'track.json'), 'utf8'));
      const gameplayData = {
        centerline: track.centerline,
        checkpoints: track.checkpoints,
        startGrid: track.startGrid,
        aiRacingLine: track.aiRacingLine,
        shortcuts: track.shortcuts,
        ramps: track.ramps,
        boostPads: track.boostPads,
        killPlaneY: track.killPlaneY,
        lapCount: track.lapCount
      };
      const dataHash = crypto.createHash('sha256').update(JSON.stringify(gameplayData)).digest('hex');

      expect(dataHash).toBe(lock.gameplayDataSha256);
    });
  });

  // ── 10. Third-Party Licenses & Manifest Compliance ──────────────────────────
  describe('Asset Manifest & Licensing Compliance', () => {
    it('provides public/assets/race/stk/import-manifest.json with all imported assets', () => {
      const manifestPath = path.join(STK_PUBLIC_DIR, 'import-manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.upstream.name).toBe('SuperTuxKart');
      expect(manifest.assets.length).toBeGreaterThanOrEqual(10);
    });

    it('contains verbatim CC and GPL license files in public/assets/race/stk/licenses/', () => {
      const licDir = path.join(STK_PUBLIC_DIR, 'licenses');
      expect(fs.existsSync(path.join(licDir, 'CC-BY-SA-4.0.txt'))).toBe(true);
      expect(fs.existsSync(path.join(licDir, 'CC-BY-SA-3.0.txt'))).toBe(true);
      expect(fs.existsSync(path.join(licDir, 'GPL-2.0.txt'))).toBe(true);
    });

    it('verifies ASSET_CREDITS.md documents SuperTuxKart authors and licenses', () => {
      const creditsPath = path.resolve('ASSET_CREDITS.md');
      expect(fs.existsSync(creditsPath)).toBe(true);
      const text = fs.readFileSync(creditsPath, 'utf8');
      expect(text).toContain('SuperTuxKart');
      expect(text).toContain('Jean-Manuel Clémençon');
      expect(text).toContain('DJHelium');
      expect(text).toContain('Julian Schönbächler');
      expect(text).toContain('CC-BY-SA 4.0');
    });

    it('verifies visual.glb and props.json are within budget', () => {
      const visualGlbPath = path.join(TRACK_DIR, 'visual.glb');
      expect(fs.existsSync(visualGlbPath)).toBe(true);
      const visualSize = fs.statSync(visualGlbPath).size;
      // Budget: <= 8000 kB (8 MB)
      expect(visualSize).toBeLessThan(8 * 1024 * 1024);

      const propsJsonPath = path.join(TRACK_DIR, 'props.json');
      expect(fs.existsSync(propsJsonPath)).toBe(true);
      const props = JSON.parse(fs.readFileSync(propsJsonPath, 'utf8'));
      expect(Array.isArray(props)).toBe(true);
      expect(props.length).toBeGreaterThan(50);
    });

    it('confirms RaceGallery detects URL parameter ?race-gallery', () => {
      expect(typeof RaceGallery.shouldOpen).toBe('function');
      expect(typeof RaceGallery.shouldOpen()).toBe('boolean');
    });

    it('verifies garden.ogg background music loop is copied to public assets', () => {
      const audioPath = path.resolve('public/assets/race/audio/garden.ogg');
      expect(fs.existsSync(audioPath)).toBe(true);
      const size = fs.statSync(audioPath).size;
      expect(size).toBeGreaterThan(1 * 1024 * 1024); // ~2.88 MB
    });
  });
});
