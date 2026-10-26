/**
 * convert-mesh.mjs
 * Converts SuperTuxKart .spm binary meshes into standard glTF 2.0 binary (.glb) files
 * using Three.js and GLTFExporter in Node.js.
 */

import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { readSPM, spmToBufferGeometries } from './spm-reader.mjs';
import { resolveMaterialFromTexture } from './parse-materials.mjs';

// Polyfill FileReader for GLTFExporter in Node environment
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

/**
 * Convert an SPM file to a GLB Buffer.
 * @param {string} spmPath Path to input .spm file
 * @param {object} [options]
 * @param {string} [options.textureSearchDir] Directory to resolve textures
 * @param {number} [options.defaultColor=0xcccccc]
 * @param {number} [options.recolorTint] Optional color tint override (e.g. for Krishnachura flame red)
 * @returns {Promise<Buffer>} GLB binary buffer
 */
export async function convertSpmToGlb(spmPath, options = {}) {
  const buf = fs.readFileSync(spmPath);
  const spm = readSPM(buf, { transformCoordinates: true });
  const geomItems = spmToBufferGeometries(spm);

  const group = new THREE.Group();
  group.name = path.basename(spmPath, path.extname(spmPath));

  for (const item of geomItems) {
    const matDef = resolveMaterialFromTexture(item.materialName, options.textureSearchDir);

    const matProps = {
      name: item.materialName || 'default',
      roughness: matDef.roughness,
      metalness: matDef.metalness,
      side: matDef.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      transparent: matDef.transparent,
      alphaTest: matDef.alphaTest
    };

    if (options.recolorTint !== undefined) {
      matProps.color = new THREE.Color(options.recolorTint);
    } else if (matDef.tintColor !== undefined) {
      matProps.color = new THREE.Color(matDef.tintColor);
    } else {
      matProps.color = new THREE.Color(options.defaultColor ?? 0xdddddd);
    }

    const material = new THREE.MeshStandardMaterial(matProps);
    const mesh = new THREE.Mesh(item.geometry, material);
    mesh.name = `submesh_${item.matId}`;
    group.add(mesh);
  }

  const exporter = new GLTFExporter();
  const gltfArrayBuffer = await exporter.parseAsync(group, {
    binary: true,
    embedImages: false
  });

  return Buffer.from(gltfArrayBuffer);
}

// CLI usage: node scripts/race/stk/convert-mesh.mjs <input.spm> <output.glb> [textureDir] [hexTint]
if (process.argv[1] && process.argv[1].endsWith('convert-mesh.mjs')) {
  const inputSpm = process.argv[2];
  const outputGlb = process.argv[3];
  const textureDir = process.argv[4];
  const tint = process.argv[5] ? parseInt(process.argv[5], 16) : undefined;

  if (!inputSpm || !outputGlb) {
    console.error('Usage: node scripts/race/stk/convert-mesh.mjs <input.spm> <output.glb> [textureDir] [hexTint]');
    process.exit(1);
  }

  convertSpmToGlb(inputSpm, { textureSearchDir: textureDir, recolorTint: tint })
    .then((glbBuf) => {
      fs.mkdirSync(path.dirname(outputGlb), { recursive: true });
      fs.writeFileSync(outputGlb, glbBuf);
      console.log(`✅ Successfully converted ${inputSpm} -> ${outputGlb} (${glbBuf.length} bytes)`);
    })
    .catch((err) => {
      console.error(`❌ Conversion failed:`, err);
      process.exit(1);
    });
}
