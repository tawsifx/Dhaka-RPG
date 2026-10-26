/**
 * parse-scene.mjs
 * Parses SuperTuxKart scene.xml and node.xml files to extract
 * object transforms, LOD definitions, light anchors, and model references.
 */

/**
 * @typedef {object} SceneObject
 * @property {string} id
 * @property {string} model
 * @property {[number, number, number]} position [x, y, z]
 * @property {[number, number, number]} rotation [h, p, r] in degrees
 * @property {[number, number, number]} scale [sx, sy, sz]
 * @property {string} interaction
 * @property {number} [lodDistance]
 */

/**
 * @typedef {object} SceneLight
 * @property {string} id
 * @property {[number, number, number]} position [x, y, z]
 * @property {number} distance
 * @property {number} energy
 * @property {[number, number, number]} color [r, g, b] (0-255)
 */

/**
 * Parses space-separated float tuple.
 * @param {string|null} str 
 * @param {[number, number, number]} defaultVal 
 * @returns {[number, number, number]}
 */
function parseVec3(str, defaultVal = [0, 0, 0]) {
  if (!str) return defaultVal;
  const parts = str.trim().split(/\s+/).map(Number);
  return [parts[0] ?? defaultVal[0], parts[1] ?? defaultVal[1], parts[2] ?? defaultVal[2]];
}

/**
 * Parse an STK node.xml or scene.xml content string.
 * @param {string} xmlString
 * @param {object} options
 * @param {boolean} [options.transformCoordinates=true]
 * @returns {{ objects: SceneObject[], lights: SceneLight[] }}
 */
export function parseSceneXml(xmlString, options = { transformCoordinates: true }) {
  const objects = [];
  const lights = [];

  // Match <object ...> and <static-object ...> tags
  const objMatches = xmlString.matchAll(/<(object|static-object)\s+([^>]+)>/g);
  for (const match of objMatches) {
    const attrStr = match[2];
    const getAttr = (name) => {
      const m = attrStr.match(new RegExp(`${name}="([^"]+)"`));
      return m ? m[1] : null;
    };

    const model = getAttr('model');
    if (!model) continue;

    const id = getAttr('id') || model.replace(/\.spm$/i, '');
    let pos = parseVec3(getAttr('xyz'));
    let rot = parseVec3(getAttr('hpr'));
    const scale = parseVec3(getAttr('scale'), [1, 1, 1]);
    const interaction = getAttr('interaction') || 'ghost';
    const lodDistance = getAttr('lod_distance') ? parseFloat(getAttr('lod_distance')) : undefined;

    if (options.transformCoordinates) {
      // Invert Z for right-handed coordinate system
      pos = [pos[0], pos[1], -pos[2]];
      // Negate roll / yaw rotation to match coordinate flip
      rot = [-rot[0], rot[1], -rot[2]];
    }

    objects.push({
      id,
      model,
      position: pos,
      rotation: rot,
      scale,
      interaction,
      lodDistance
    });
  }

  // Match <light ...> tags
  const lightMatches = xmlString.matchAll(/<light\s+([^>]+)>/g);
  for (const match of lightMatches) {
    const attrStr = match[1];
    const getAttr = (name) => {
      const m = attrStr.match(new RegExp(`${name}="([^"]+)"`));
      return m ? m[1] : null;
    };

    const id = getAttr('id') || 'light';
    let pos = parseVec3(getAttr('xyz'));
    const distance = getAttr('distance') ? parseFloat(getAttr('distance')) : 20;
    const energy = getAttr('energy') ? parseFloat(getAttr('energy')) : 1.0;
    const color = parseVec3(getAttr('color'), [255, 255, 255]);

    if (options.transformCoordinates) {
      pos = [pos[0], pos[1], -pos[2]];
    }

    lights.push({
      id,
      position: pos,
      distance,
      energy,
      color
    });
  }

  return { objects, lights };
}
