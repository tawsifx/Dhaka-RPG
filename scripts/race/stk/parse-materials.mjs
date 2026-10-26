/**
 * parse-materials.mjs
 * Parses SuperTuxKart material XML files and resolves texture paths,
 * blending modes, alpha testing, and PBR properties for Three.js.
 */

import fs from 'fs';
import path from 'path';

/**
 * Material definition structure for Three.js consumption.
 * @typedef {object} MaterialDef
 * @property {string} name
 * @property {string|null} diffusePath
 * @property {string|null} normalPath
 * @property {boolean} transparent
 * @property {number} alphaTest
 * @property {boolean} doubleSided
 * @property {number} roughness
 * @property {number} metalness
 * @property {number} [tintColor]
 */

/**
 * Parse an STK materials.xml file string.
 * @param {string} xmlString
 * @param {string} baseDir Base directory to resolve texture paths
 * @returns {Map<string, MaterialDef>}
 */
export function parseMaterialsXml(xmlString, baseDir = '') {
  const materials = new Map();
  // Basic XML regex parsing to avoid heavyweight DOM dependencies in Node
  const matBlocks = xmlString.matchAll(/<material\s+([^>]+)>/g);
  
  for (const match of matBlocks) {
    const attrStr = match[1];
    const getAttr = (name) => {
      const m = attrStr.match(new RegExp(`${name}="([^"]+)"`));
      return m ? m[1] : null;
    };

    const name = getAttr('name');
    if (!name) continue;

    const texName = getAttr('tex-file') || name;
    const diffusePath = baseDir ? path.join(baseDir, texName) : texName;
    const isAlpha = getAttr('alpha') === 'Y' || getAttr('blend') === 'blend';
    const isAdditive = getAttr('blend') === 'additive';
    const isDoubleSided = getAttr('backface-culling') === 'N';

    materials.set(name, {
      name,
      diffusePath: fs.existsSync(diffusePath) ? diffusePath : null,
      normalPath: null,
      transparent: isAlpha || isAdditive,
      alphaTest: isAlpha ? 0.5 : 0.0,
      doubleSided: isDoubleSided,
      roughness: 0.8,
      metalness: 0.1
    });
  }

  return materials;
}

/**
 * Heuristically resolve material properties from a texture file name and search directory.
 * @param {string} textureName
 * @param {string} searchDir
 * @returns {MaterialDef}
 */
export function resolveMaterialFromTexture(textureName, searchDir) {
  const baseName = path.basename(textureName);
  let resolvedPath = null;

  if (searchDir && fs.existsSync(searchDir)) {
    const direct = path.join(searchDir, baseName);
    if (fs.existsSync(direct)) {
      resolvedPath = direct;
    } else {
      // Recursive search
      const files = fs.readdirSync(searchDir, { recursive: true });
      for (const f of files) {
        if (typeof f === 'string' && path.basename(f) === baseName) {
          resolvedPath = path.join(searchDir, f);
          break;
        }
      }
    }
  }

  const isPng = baseName.toLowerCase().endsWith('.png');
  const isLeafOrFlower = /leaf|flower|tree|bush|branch|foliage/i.test(baseName);
  const isLantern = /lantern/i.test(baseName);
  const isMetal = /metal|iron|steel|chrome/i.test(baseName);
  const isRoad = /road|asphalt|ground/i.test(baseName);

  return {
    name: baseName,
    diffusePath: resolvedPath,
    normalPath: null,
    transparent: isPng && isLeafOrFlower,
    alphaTest: isLeafOrFlower ? 0.5 : 0.0,
    doubleSided: isLeafOrFlower,
    roughness: isMetal ? 0.4 : (isRoad ? 0.9 : 0.7),
    metalness: isMetal ? 0.7 : 0.05,
    tintColor: isLantern ? 0xff2222 : undefined
  };
}
