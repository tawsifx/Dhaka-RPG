// src/scenes/minigames/race/stk/SPMLoader.ts - Native Three.js Loader for SuperTuxKart SPM binary meshes
import * as THREE from 'three';

/**
 * IEEE 754 half-precision float (16-bit) decoder.
 */
export function decodeFloat16(h: number): number {
  const s = (h & 0x8000) >> 15;
  const e = (h & 0x7c00) >> 10;
  const f = h & 0x03ff;
  if (e === 0) {
    return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
  }
  if (e === 31) {
    return f ? NaN : (s ? -1 : 1) * Infinity;
  }
  return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
}

/**
 * Decodes 10-10-10-2 packed signed normalized vector (MiniGLM format).
 */
export function decodeNormal10_10_10_2(raw: number): [number, number, number] {
  const px = raw & 1023;
  const py = (raw >> 10) & 1023;
  const pz = (raw >> 20) & 1023;
  const decodeComp = (p: number) => ((p & 512) ? (1024 - p) * (-1.0 / 512.0) : p * (1.0 / 511.0));
  return [decodeComp(px), decodeComp(py), decodeComp(pz)];
}

export interface SPMLoaderOptions {
  textureBasePath?: string;
  tintColor?: number | string;
  transformCoordinates?: boolean;
}

export class SPMLoader extends THREE.Loader<THREE.Group> {
  private static textureCache = new Map<string, THREE.Texture>();
  private defaultOptions: SPMLoaderOptions = {};

  constructor(manager?: THREE.LoadingManager, options: SPMLoaderOptions = {}) {
    super(manager);
    this.defaultOptions = options;
  }

  /**
   * Asynchronously loads and parses an SPM file from a URL.
   */
  override async loadAsync(
    url: string,
    onProgress?: (event: ProgressEvent<EventTarget>) => void
  ): Promise<THREE.Group> {
    const fileLoader = new THREE.FileLoader(this.manager);
    fileLoader.setResponseType('arraybuffer');
    fileLoader.setPath(this.path);
    fileLoader.setRequestHeader(this.requestHeader);
    fileLoader.setWithCredentials(this.withCredentials);

    const buffer = (await fileLoader.loadAsync(url, onProgress)) as ArrayBuffer;
    return this.parse(buffer, this.defaultOptions);
  }

  /**
   * Directly load SPM with custom loader options.
   */
  async loadSpm(url: string, options?: SPMLoaderOptions): Promise<THREE.Group> {
    const fileLoader = new THREE.FileLoader(this.manager);
    fileLoader.setResponseType('arraybuffer');
    fileLoader.setPath(this.path);
    fileLoader.setRequestHeader(this.requestHeader);
    fileLoader.setWithCredentials(this.withCredentials);

    const buffer = (await fileLoader.loadAsync(url)) as ArrayBuffer;
    return this.parse(buffer, options || this.defaultOptions);
  }

  /**
   * Standard Three.js load callback pattern.
   */
  load(
    url: string,
    onLoad: (group: THREE.Group) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void
  ): void {
    const fileLoader = new THREE.FileLoader(this.manager);
    fileLoader.setResponseType('arraybuffer');
    fileLoader.setPath(this.path);
    fileLoader.setRequestHeader(this.requestHeader);
    fileLoader.setWithCredentials(this.withCredentials);

    fileLoader.load(
      url,
      (buffer) => {
        try {
          const group = this.parse(buffer as ArrayBuffer);
          onLoad(group);
        } catch (err) {
          if (onError) onError(err);
          else console.error(err);
        }
      },
      onProgress,
      onError
    );
  }

  /**
   * Parses an SPM binary buffer directly into a Three.js Group with meshes and textures.
   */
  parse(buffer: ArrayBuffer | Uint8Array, options: SPMLoaderOptions = {}): THREE.Group {
    const transformCoordinates = options.transformCoordinates !== false;
    const textureBasePath = options.textureBasePath || '/assets/race/stk/textures/';
    const tintColor = options.tintColor;

    const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);

    const textDecoder = new TextDecoder('utf-8');

    // Header check
    const magic = String.fromCharCode(u8[0], u8[1]);
    if (magic !== 'SP') {
      throw new Error(`Invalid SPM magic: expected "SP", got "${magic}"`);
    }

    const typeByte = u8[2];
    const meshType = typeByte & 7; // 0=SPMS, 1=SPMA, 2=SPMN
    const isSkinned = meshType === 1;
    const flags = u8[3];
    const hasNormals = (flags & 1) !== 0;
    const hasVColors = (flags & 2) !== 0;
    const hasTangents = (flags & 4) !== 0;

    let offset = 28;

    // Read materials table
    const numMaterials = view.getUint16(offset, true);
    offset += 2;
    const materials: Array<{ tex1: string; tex2: string }> = [];

    for (let i = 0; i < numMaterials; i++) {
      const l1 = u8[offset++];
      const tex1 = textDecoder.decode(u8.subarray(offset, offset + l1));
      offset += l1;

      const l2 = u8[offset++];
      const tex2 = textDecoder.decode(u8.subarray(offset, offset + l2));
      offset += l2;

      materials.push({ tex1, tex2 });
    }

    // Read buffers and sections
    const numBuffers = view.getUint16(offset, true);
    offset += 2;

    const group = new THREE.Group();
    group.name = 'spm_model';

    const texLoader = typeof window !== 'undefined' ? new THREE.TextureLoader(this.manager) : null;

    for (let b = 0; b < numBuffers; b++) {
      const numSections = view.getUint16(offset, true);
      offset += 2;

      for (let s = 0; s < numSections; s++) {
        const vertexCount = view.getUint32(offset, true);
        offset += 4;
        const indexCount = view.getUint32(offset, true);
        offset += 4;
        const matId = view.getUint16(offset, true);
        offset += 2;

        const matInfo = materials[matId] || { tex1: '', tex2: '' };
        const uvOne = Boolean(matInfo.tex1);
        const uvTwo = Boolean(matInfo.tex2);

        const positions = new Float32Array(vertexCount * 3);
        const normals = hasNormals ? new Float32Array(vertexCount * 3) : null;
        const uvs = new Float32Array(vertexCount * 2);
        const colors = hasVColors ? new Float32Array(vertexCount * 3) : null;

        for (let v = 0; v < vertexCount; v++) {
          let x = view.getFloat32(offset, true);
          offset += 4;
          let y = view.getFloat32(offset, true);
          offset += 4;
          let z = view.getFloat32(offset, true);
          offset += 4;

          if (transformCoordinates) {
            z = -z;
          }

          positions[v * 3 + 0] = x;
          positions[v * 3 + 1] = y;
          positions[v * 3 + 2] = z;

          if (hasNormals && normals) {
            const rawNorm = view.getUint32(offset, true);
            offset += 4;
            let [nx, ny, nz] = decodeNormal10_10_10_2(rawNorm);
            if (transformCoordinates) {
              nz = -nz;
            }
            normals[v * 3 + 0] = nx;
            normals[v * 3 + 1] = ny;
            normals[v * 3 + 2] = nz;
          }

          if (hasVColors && colors) {
            const flag = u8[offset++];
            if (flag === 128) {
              colors[v * 3 + 0] = 1.0;
              colors[v * 3 + 1] = 1.0;
              colors[v * 3 + 2] = 1.0;
            } else {
              colors[v * 3 + 0] = u8[offset++] / 255.0;
              colors[v * 3 + 1] = u8[offset++] / 255.0;
              colors[v * 3 + 2] = u8[offset++] / 255.0;
            }
          }

          if (uvOne) {
            const uRaw = view.getUint16(offset, true);
            offset += 2;
            const vRaw = view.getUint16(offset, true);
            offset += 2;
            const u = decodeFloat16(uRaw);
            let vCoord = decodeFloat16(vRaw);
            if (transformCoordinates) {
              vCoord = 1.0 - vCoord;
            }
            uvs[v * 2 + 0] = u;
            uvs[v * 2 + 1] = vCoord;

            if (uvTwo) offset += 4;
            if (hasTangents) offset += 4;
          }

          if (isSkinned) {
            offset += 16;
          }
        }

        const isUint16 = vertexCount > 255;
        const indices = new Uint32Array(indexCount);
        for (let i = 0; i < indexCount; i++) {
          if (isUint16) {
            indices[i] = view.getUint16(offset, true);
            offset += 2;
          } else {
            indices[i] = u8[offset++];
          }
        }

        if (transformCoordinates) {
          for (let t = 0; t < indexCount; t += 3) {
            const tmp = indices[t + 1];
            indices[t + 1] = indices[t + 2];
            indices[t + 2] = tmp;
          }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        if (normals) {
          geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        } else {
          geo.computeVertexNormals();
        }
        geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        if (colors) {
          geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        }
        geo.setIndex(new THREE.BufferAttribute(indices, 1));

        // Material binding
        const matProps: THREE.MeshStandardMaterialParameters = {
          name: matInfo.tex1 || `spm_mat_${matId}`,
          roughness: 0.75,
          metalness: 0.15
        };

        if (matInfo.tex1 && texLoader) {
          const texUrl = `${textureBasePath}${matInfo.tex1}`;
          let tex = SPMLoader.textureCache.get(texUrl);
          if (!tex) {
            tex = texLoader.load(texUrl);
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            SPMLoader.textureCache.set(texUrl, tex);
          }
          matProps.map = tex;

          // Check for foliage / cutout transparency
          const lowerTex = matInfo.tex1.toLowerCase();
          if (
            lowerTex.includes('leaf') ||
            lowerTex.includes('tree') ||
            lowerTex.includes('bush') ||
            lowerTex.includes('grass') ||
            lowerTex.includes('flower') ||
            lowerTex.includes('alpha')
          ) {
            matProps.transparent = true;
            matProps.alphaTest = 0.4;
            matProps.side = THREE.DoubleSide;
          }

          if (lowerTex.includes('metal') || lowerTex.includes('engine') || lowerTex.includes('iron')) {
            matProps.metalness = 0.75;
            matProps.roughness = 0.35;
          }
        }

        if (tintColor && matInfo.tex1 && (matInfo.tex1.includes('tuxkart') || matInfo.tex1.includes('diffuse') || matInfo.tex1.includes('body'))) {
          matProps.color = new THREE.Color(tintColor);
        }

        const material = new THREE.MeshStandardMaterial(matProps);
        const mesh = new THREE.Mesh(geo, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.name = `submesh_${s}`;
        group.add(mesh);
      }
    }

    return group;
  }
}
