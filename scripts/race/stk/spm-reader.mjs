/**
 * spm-reader.mjs
 * Pure Node.js SuperTuxKart SPM (SuperTuxKart Mesh) binary format reader.
 * Converts STK SPM meshes into Three.js BufferGeometry objects with correct
 * coordinate transformation (Irrlicht left-handed -> Three.js right-handed).
 *
 * See ADR 024: Pure Node SPM Converter vs Headless Blender.
 */

import * as THREE from 'three';

/**
 * IEEE 754 half-precision float (16-bit) to 32-bit single precision float decoder.
 * @param {number} h uint16 representation of float16
 * @returns {number} float32 value
 */
export function decodeFloat16(h) {
  const s = (h & 0x8000) >> 15;
  const e = (h & 0x7c00) >> 10;
  const f = h & 0x03ff;
  if (e === 0) {
    return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
  }
  if (e === 31) {
    return f ? NaN : ((s ? -1 : 1) * Infinity);
  }
  return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
}

/**
 * Decodes 10-10-10-2 packed signed normalized vector (MiniGLM format).
 * @param {number} raw uint32 packed vector
 * @returns {[number, number, number]} normalized [x, y, z] components
 */
export function decodeNormal10_10_10_2(raw) {
  const px = raw & 1023;
  const py = (raw >> 10) & 1023;
  const pz = (raw >> 20) & 1023;
  const decodeComp = (p) => (p & 512) ? (1024 - p) * (-1.0 / 512.0) : p * (1.0 / 511.0);
  return [decodeComp(px), decodeComp(py), decodeComp(pz)];
}

/**
 * Parse an SPM binary buffer into structured mesh data.
 * @param {Buffer|Uint8Array} buffer 
 * @param {object} options
 * @param {boolean} [options.transformCoordinates=true] Convert left-handed (STK) to right-handed (Three.js)
 * @returns {object} Parsed SPM data with header, materials, and sections
 */
export function readSPM(buffer, options = { transformCoordinates: true }) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  const magic = buf.subarray(0, 2).toString('ascii');
  if (magic !== 'SP') {
    throw new Error(`Invalid SPM magic: expected "SP", got "${magic}"`);
  }

  const typeByte = buf[2];
  const meshType = typeByte & 7; // 0=SPMS, 1=SPMA, 2=SPMN
  const isSkinned = (meshType === 1);
  const version = typeByte >> 3; // usually 1
  const flags = buf[3];
  const hasNormals = (flags & 1) !== 0;
  const hasVColors = (flags & 2) !== 0;
  const hasTangents = (flags & 4) !== 0;

  // Bounding box (6 floats)
  const bbox = {
    min: [view.getFloat32(4, true), view.getFloat32(8, true), view.getFloat32(12, true)],
    max: [view.getFloat32(16, true), view.getFloat32(20, true), view.getFloat32(24, true)]
  };

  let offset = 28;

  // Materials table
  const numMaterials = view.getUint16(offset, true);
  offset += 2;
  const materials = [];
  for (let i = 0; i < numMaterials; i++) {
    const l1 = buf[offset++];
    const tex1 = buf.subarray(offset, offset + l1).toString('utf8');
    offset += l1;

    const l2 = buf[offset++];
    const tex2 = buf.subarray(offset, offset + l2).toString('utf8');
    offset += l2;

    materials.push({ tex1, tex2 });
  }

  // Buffers and sections
  const numBuffers = view.getUint16(offset, true);
  offset += 2;

  const sections = [];

  for (let b = 0; b < numBuffers; b++) {
    const numSections = view.getUint16(offset, true);
    offset += 2;

    for (let s = 0; s < numSections; s++) {
      const vertexCount = view.getUint32(offset, true); offset += 4;
      const indexCount = view.getUint32(offset, true); offset += 4;
      const matId = view.getUint16(offset, true); offset += 2;

      const mat = materials[matId] || { tex1: true, tex2: false };
      const uvOne = Boolean(mat.tex1);
      const uvTwo = Boolean(mat.tex2);

      const positions = new Float32Array(vertexCount * 3);
      const normals = hasNormals ? new Float32Array(vertexCount * 3) : null;
      const uvs = new Float32Array(vertexCount * 2);
      const colors = hasVColors ? new Float32Array(vertexCount * 3) : null;

      for (let v = 0; v < vertexCount; v++) {
        let x = view.getFloat32(offset, true); offset += 4;
        let y = view.getFloat32(offset, true); offset += 4;
        let z = view.getFloat32(offset, true); offset += 4;

        if (options.transformCoordinates) {
          // Invert Z for right-handed glTF/Three.js convention
          z = -z;
        }

        positions[v * 3 + 0] = x;
        positions[v * 3 + 1] = y;
        positions[v * 3 + 2] = z;

        if (hasNormals) {
          const rawNorm = view.getUint32(offset, true); offset += 4;
          let [nx, ny, nz] = decodeNormal10_10_10_2(rawNorm);
          if (options.transformCoordinates) {
            nz = -nz;
          }
          normals[v * 3 + 0] = nx;
          normals[v * 3 + 1] = ny;
          normals[v * 3 + 2] = nz;
        }

        if (hasVColors) {
          const flag = buf[offset++];
          if (flag === 128) {
            colors[v * 3 + 0] = 1.0;
            colors[v * 3 + 1] = 1.0;
            colors[v * 3 + 2] = 1.0;
          } else {
            colors[v * 3 + 0] = buf[offset++] / 255.0;
            colors[v * 3 + 1] = buf[offset++] / 255.0;
            colors[v * 3 + 2] = buf[offset++] / 255.0;
          }
        }

        if (uvOne) {
          // UV Float16
          const uRaw = view.getUint16(offset, true); offset += 2;
          const vRaw = view.getUint16(offset, true); offset += 2;
          const u = decodeFloat16(uRaw);
          let vCoord = decodeFloat16(vRaw);
          if (options.transformCoordinates) {
            // Flip V for glTF/Three.js convention
            vCoord = 1.0 - vCoord;
          }
          uvs[v * 2 + 0] = u;
          uvs[v * 2 + 1] = vCoord;

          if (uvTwo) {
            offset += 4; // Second UV set
          }
          if (hasTangents) {
            offset += 4; // Skip packed tangent
          }
        }

        if (isSkinned) {
          offset += 16; // Skip skeletal joint indices and weights
        }
      }

      // Read indices
      const isUint16 = vertexCount > 255;
      const indices = new Uint32Array(indexCount);
      for (let i = 0; i < indexCount; i++) {
        if (isUint16) {
          indices[i] = view.getUint16(offset, true);
          offset += 2;
        } else {
          indices[i] = buf[offset++];
        }
      }

      if (options.transformCoordinates) {
        // Swap winding order for triangles to stay counter-clockwise after Z flip
        for (let t = 0; t < indexCount; t += 3) {
          const tmp = indices[t + 1];
          indices[t + 1] = indices[t + 2];
          indices[t + 2] = tmp;
        }
      }

      sections.push({
        bufferIndex: b,
        sectionIndex: s,
        vertexCount,
        indexCount,
        matId,
        positions,
        normals,
        uvs,
        colors,
        indices
      });
    }
  }

  return {
    version,
    meshType,
    flags,
    bbox,
    materials,
    sections
  };
}

/**
 * Creates Three.js BufferGeometry instances from parsed SPM data.
 * @param {object} spmData Output of readSPM()
 * @returns {Array<{ geometry: THREE.BufferGeometry, matId: number, materialName: string }>}
 */
export function spmToBufferGeometries(spmData) {
  const result = [];
  for (const sec of spmData.sections) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(sec.positions, 3));
    if (sec.normals) {
      geo.setAttribute('normal', new THREE.BufferAttribute(sec.normals, 3));
    } else {
      geo.computeVertexNormals();
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(sec.uvs, 2));
    if (sec.colors) {
      geo.setAttribute('color', new THREE.BufferAttribute(sec.colors, 3));
    }
    geo.setIndex(new THREE.BufferAttribute(sec.indices, 1));

    const matInfo = spmData.materials[sec.matId] || { tex1: 'default', tex2: '' };
    result.push({
      geometry: geo,
      matId: sec.matId,
      materialName: matInfo.tex1
    });
  }
  return result;
}
