// tests/race/spm_loader.test.ts - Unit test for in-engine Three.js SPMLoader
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { SPMLoader, decodeFloat16, decodeNormal10_10_10_2 } from '../../src/scenes/minigames/race/stk/SPMLoader';

describe('SPMLoader (In-Engine STK Loader)', () => {
  const FIXTURES_DIR = path.resolve('tests/race/fixtures/stk');

  it('correctly unpacks float16 values', () => {
    expect(decodeFloat16(0x0000)).toBe(0.0);
    expect(decodeFloat16(0x3c00)).toBeCloseTo(1.0, 4);
    expect(decodeFloat16(0xbc00)).toBeCloseTo(-1.0, 4);
    expect(decodeFloat16(0x3800)).toBeCloseTo(0.5, 4);
  });

  it('correctly unpacks 10-10-10-2 packed normals', () => {
    const [x, y, z] = decodeNormal10_10_10_2(0);
    expect(x).toBeCloseTo(0, 2);
    expect(y).toBeCloseTo(0, 2);
    expect(z).toBeCloseTo(0, 2);
  });

  it('throws on non-SPM buffer magic', () => {
    const loader = new SPMLoader();
    const badBuf = new Uint8Array([0x47, 0x4c, 0x54, 0x46]); // "GLTF"
    expect(() => loader.parse(badBuf)).toThrow(/Invalid SPM magic/);
  });

  it('parses box.spm into a THREE.Group with valid BufferGeometry meshes', () => {
    const loader = new SPMLoader();
    const boxBuf = fs.readFileSync(path.join(FIXTURES_DIR, 'box.spm'));
    const group = loader.parse(boxBuf.buffer.slice(boxBuf.byteOffset, boxBuf.byteOffset + boxBuf.byteLength));

    expect(group).toBeInstanceOf(THREE.Group);
    expect(group.children.length).toBe(1);

    const mesh = group.children[0] as THREE.Mesh;
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.geometry).toBeInstanceOf(THREE.BufferGeometry);
    expect(mesh.geometry.getAttribute('position').count).toBe(8);
    expect(mesh.geometry.getIndex()?.count).toBe(36);
  });

  it('parses real STK tux.spm model directly without GLB conversion', () => {
    const loader = new SPMLoader();
    const tuxPath = path.resolve('public/assets/race/stk/spm/tux.spm');
    if (fs.existsSync(tuxPath)) {
      const tuxBuf = fs.readFileSync(tuxPath);
      const group = loader.parse(tuxBuf.buffer.slice(tuxBuf.byteOffset, tuxBuf.byteOffset + tuxBuf.byteLength));
      expect(group).toBeInstanceOf(THREE.Group);
      expect(group.children.length).toBeGreaterThan(0);
      for (const child of group.children) {
        expect(child).toBeInstanceOf(THREE.Mesh);
      }
    }
  });
});
