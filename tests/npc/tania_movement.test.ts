// tests/npc/tania_movement.test.ts - Tests for Tania (npc-jogger) movement, orientation, and spritesheet layout
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NpcMover } from '../../src/systems/npc/NpcMover';
import { NPC_SCHEDULES_DB } from '../../src/config/npcSchedules.db';
import { ASSET_SPECS_MANIFEST } from '../../src/config/assetSpecs.manifest';

describe('Tania (npc-jogger) Asset & Movement Specifications', () => {
  it('validates Tania asset specification and sheet layout', () => {
    const spec = ASSET_SPECS_MANIFEST['npc-jogger'];
    expect(spec).toBeDefined();
    expect(spec.name).toContain('Tania');
    expect(spec.externalPath).toBe('assets/sprites/characters/npc_jogger.png');
    expect(spec.recommendedDownloadSpecs.sheetLayout).toContain('Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up');
  });

  it('validates Tania schedule definition in NPC database', () => {
    const taniaDef = NPC_SCHEDULES_DB.tania;
    expect(taniaDef).toBeDefined();
    expect(taniaDef.displayName).toContain('Tania');
    expect(taniaDef.movement.speedTilesPerSec).toBe(2.4);
    expect(taniaDef.variants.length).toBeGreaterThanOrEqual(1);
  });

  it('verifies NpcMover updates Tania facing direction across a 4-point park lap', () => {
    const mover = new NpcMover({ col: 30, row: 20 }, 'down', NPC_SCHEDULES_DB.tania.movement);
    expect(mover.facing).toBe('down');

    // Lap Step 1: Head East (Right) 1 tile: col 30 -> col 31
    mover.setPath([{ col: 30, row: 20 }, { col: 31, row: 20 }]);
    expect(mover.facing).toBe('right');
    expect(mover.state).toBe('walking');
    mover.update(1.0);
    expect(mover.currentTile.col).toBe(31);

    // Lap Step 2: Head South (Down) 1 tile: row 20 -> row 21
    mover.setPath([{ col: 31, row: 20 }, { col: 31, row: 21 }]);
    expect(mover.facing).toBe('down');
    expect(mover.state).toBe('walking');
    mover.update(1.0);
    expect(mover.currentTile.row).toBe(21);

    // Lap Step 3: Head West (Left) 1 tile: col 31 -> col 30
    mover.setPath([{ col: 31, row: 21 }, { col: 30, row: 21 }]);
    expect(mover.facing).toBe('left');
    expect(mover.state).toBe('walking');
    mover.update(1.0);
    expect(mover.currentTile.col).toBe(30);

    // Lap Step 4: Head North (Up) 1 tile: row 21 -> row 20
    mover.setPath([{ col: 30, row: 21 }, { col: 30, row: 20 }]);
    expect(mover.facing).toBe('up');
    expect(mover.state).toBe('walking');
    mover.update(1.0);
    expect(mover.currentTile.row).toBe(20);
  });

  it('verifies npc_jogger.png exists and conforms to standard 128x256 dimensions', () => {
    const filePath = path.resolve(process.cwd(), 'public/assets/sprites/characters/npc_jogger.png');
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
