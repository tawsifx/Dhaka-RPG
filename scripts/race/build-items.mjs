// scripts/race/build-items.mjs - Build item box layout & update gameplay lock
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const TRACK_DIR = path.resolve('public/assets/race/tracks/fuller_road_sprint');
const TRACK_JSON_PATH = path.join(TRACK_DIR, 'track.json');
const ITEMS_JSON_PATH = path.join(TRACK_DIR, 'items.json');
const LOCK_JSON_PATH = path.join(TRACK_DIR, 'gameplay.lock.json');

export function buildItemsForTrack() {
  console.log(`======================================================`);
  console.log(`📦 BUILDING ITEM BOXES: fuller_road_sprint`);
  console.log(`======================================================`);

  const track = JSON.parse(fs.readFileSync(TRACK_JSON_PATH, 'utf8'));
  const anchors = track.itemBoxSpawns || [
    { id: 'item_box_straight', x: 0, y: 1.2, z: -60 },
    { id: 'item_box_rotunda', x: 215, y: 1.2, z: -175 },
    { id: 'item_box_avenue', x: 110, y: 1.2, z: 15 },
    { id: 'item_box_post_landing', x: -110, y: 1.2, z: -35 }
  ];

  // For each cluster anchor, place 4 boxes spaced across track width (perpendicular to road)
  // Perpendicular headings estimated from anchor track locations
  const clusterHeadings = {
    item_box_straight: { dx: 1, dz: 0 }, // Road runs along -Z, normal is +X
    item_box_rotunda: { dx: 0, dz: 1 },  // Road runs along +X, normal is +Z
    item_box_avenue: { dx: 0.707, dz: 0.707 },
    item_box_post_landing: { dx: 0.5, dz: -0.866 }
  };

  const lateralOffsets = [-4.5, -1.5, 1.5, 4.5];
  const items = [];

  for (const anchor of anchors) {
    const normal = clusterHeadings[anchor.id] || { dx: 1, dz: 0 };
    lateralOffsets.forEach((offset, idx) => {
      items.push({
        id: `${anchor.id}_${idx + 1}`,
        clusterId: anchor.id,
        slotIndex: idx,
        x: Number((anchor.x + normal.dx * offset).toFixed(2)),
        y: Number((anchor.y).toFixed(2)),
        z: Number((anchor.z + normal.dz * offset).toFixed(2)),
        radiusMeters: 1.3,
        respawnTimeSec: 3.5
      });
    });
  }

  const output = {
    trackId: track.id,
    version: 1,
    boxCount: items.length,
    clusters: anchors.map((a) => a.id),
    boxes: items
  };

  const jsonStr = JSON.stringify(output, null, 2) + '\n';
  fs.writeFileSync(ITEMS_JSON_PATH, jsonStr);
  console.log(`  ✅ Generated ${items.length} item boxes in ${ITEMS_JSON_PATH}`);

  // Calculate SHA-256 hash and update gameplay.lock.json
  const hash = crypto.createHash('sha256').update(jsonStr).digest('hex');
  if (fs.existsSync(LOCK_JSON_PATH)) {
    const lock = JSON.parse(fs.readFileSync(LOCK_JSON_PATH, 'utf8'));
    lock.itemsSha256 = hash;
    lock.itemsCount = items.length;
    fs.writeFileSync(LOCK_JSON_PATH, JSON.stringify(lock, null, 2) + '\n');
    console.log(`  🔒 Updated gameplay.lock.json with itemsSha256: ${hash}`);
  }

  return { items, hash };
}

if (process.argv[1]?.endsWith('build-items.mjs')) {
  buildItemsForTrack();
}
