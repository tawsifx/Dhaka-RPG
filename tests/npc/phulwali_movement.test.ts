// tests/npc/phulwali_movement.test.ts - Tests for Phulwali (npc-phulwali) movement, orientation, and spritesheet layout
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NpcMover } from '../../src/systems/npc/NpcMover';
import { NPC_SCHEDULES_DB } from '../../src/config/npcSchedules.db';
import { ASSET_SPECS_MANIFEST } from '../../src/config/assetSpecs.manifest';

describe('Phulwali (npc-phulwali) Asset & Movement Specifications', () => {
  it('validates Phulwali asset specification and sheet layout', () => {
    const spec = ASSET_SPECS_MANIFEST['npc-phulwali'];
    expect(spec).toBeDefined();
    expect(spec.name).toContain('Phulwali');
    expect(spec.externalPath).toBe('assets/sprites/characters/npc_phulwali.png');
    expect(spec.recommendedDownloadSpecs.sheetLayout).toContain('Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up');
  });

  it('validates Phulwali schedule definition in NPC database', () => {
    const phulwaliDef = NPC_SCHEDULES_DB.phulwali;
    expect(phulwaliDef).toBeDefined();
    expect(phulwaliDef.displayName).toContain('Phulwali');
    expect(phulwaliDef.movement.speedTilesPerSec).toBeGreaterThan(0);
    expect(phulwaliDef.variants.length).toBeGreaterThanOrEqual(1);
  });

  it('verifies NpcMover updates Phulwali facing direction along flower promenade route', () => {
    const mover = new NpcMover({ col: 38, row: 17 }, 'down', NPC_SCHEDULES_DB.phulwali.movement);
    expect(mover.facing).toBe('down');

    // Promenade Step 1: Head West (Left) 1 tile: col 38 -> col 37
    mover.setPath([{ col: 38, row: 17 }, { col: 37, row: 17 }]);
    expect(mover.facing).toBe('left');
    expect(mover.state).toBe('walking');
    mover.update(1.0);
    expect(mover.currentTile.col).toBe(37);

    // Promenade Step 2: Head East (Right) 1 tile: col 37 -> col 38
    mover.setPath([{ col: 37, row: 17 }, { col: 38, row: 17 }]);
    expect(mover.facing).toBe('right');
    expect(mover.state).toBe('walking');
    mover.update(1.0);
    expect(mover.currentTile.col).toBe(38);

    // Promenade Step 3: Head North (Up) 1 tile: row 17 -> row 16
    mover.setPath([{ col: 38, row: 17 }, { col: 38, row: 16 }]);
    expect(mover.facing).toBe('up');
    expect(mover.state).toBe('walking');
    mover.update(1.0);
    expect(mover.currentTile.row).toBe(16);

    // Promenade Step 4: Head South (Down) 1 tile: row 16 -> row 17
    mover.setPath([{ col: 38, row: 16 }, { col: 38, row: 17 }]);
    expect(mover.facing).toBe('down');
    expect(mover.state).toBe('walking');
    mover.update(1.0);
    expect(mover.currentTile.row).toBe(17);
  });

  it('verifies npc_phulwali.png exists and conforms to standard 128x256 dimensions', () => {
    const filePath = path.resolve(process.cwd(), 'public/assets/sprites/characters/npc_phulwali.png');
    expect(fs.existsSync(filePath)).toBe(true);

    const buffer = fs.readFileSync(filePath);
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50);
    expect(buffer[2]).toBe(0x4e);
    expect(buffer[3]).toBe(0x47);

    // IHDR width and height: bytes 16-23
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    expect(width).toBe(128);
    expect(height).toBe(256);
  });
});
