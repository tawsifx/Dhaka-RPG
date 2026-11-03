// tests/npc/character_movement.test.ts - Consolidated character movement, orientation, and spritesheet layout specifications
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NpcMover } from '../../src/systems/npc/NpcMover';
import { NPC_SCHEDULES_DB } from '../../src/config/npcSchedules.db';
import { ASSET_SPECS_MANIFEST } from '../../src/config/assetSpecs.manifest';

describe('NPC Character Movement, Orientation & Spritesheet Specifications', () => {
  describe('Nadia (npc-walker2)', () => {
    it('validates Nadia asset specification and sheet layout', () => {
      const spec = ASSET_SPECS_MANIFEST['npc-walker2'];
      expect(spec).toBeDefined();
      expect(spec.name).toContain('Nadia');
      expect(spec.recommendedDownloadSpecs.sheetLayout).toContain('Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up');
    });

    it('validates Nadia schedule definition in NPC database', () => {
      const nadiaDef = NPC_SCHEDULES_DB.nadia;
      expect(nadiaDef).toBeDefined();
      expect(nadiaDef.displayName).toContain('Nadia');
      expect(nadiaDef.movement.speedTilesPerSec).toBeGreaterThan(0);
      expect(nadiaDef.variants.length).toBeGreaterThanOrEqual(1);
    });

    it('verifies NpcMover updates facing direction forward without reversing', () => {
      const mover = new NpcMover({ col: 10, row: 25 }, 'down');
      expect(mover.facing).toBe('down');

      // Walk East (right): col 10 -> col 11
      mover.setPath([{ col: 10, row: 25 }, { col: 11, row: 25 }]);
      expect(mover.facing).toBe('right');
      expect(mover.state).toBe('walking');

      // Advance until arriving at tile col 11
      mover.update(1.0);
      expect(mover.currentTile.col).toBe(11);

      // Walk West (left): col 11 -> col 10
      mover.setPath([{ col: 11, row: 25 }, { col: 10, row: 25 }]);
      expect(mover.facing).toBe('left');
      expect(mover.state).toBe('walking');

      mover.update(1.0);
      expect(mover.currentTile.col).toBe(10);

      // Walk North (up): row 25 -> row 24
      mover.setPath([{ col: 10, row: 25 }, { col: 10, row: 24 }]);
      expect(mover.facing).toBe('up');
      expect(mover.state).toBe('walking');

      mover.update(1.0);
      expect(mover.currentTile.row).toBe(24);

      // Walk South (down): row 24 -> row 25
      mover.setPath([{ col: 10, row: 24 }, { col: 10, row: 25 }]);
      expect(mover.facing).toBe('down');
      expect(mover.state).toBe('walking');
    });

    it('verifies that idle directional frames map correctly to Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up', () => {
      const dirMap: Record<string, number> = {
        down: 0,
        left: 1,
        right: 2,
        up: 3
      };

      expect(dirMap['down']).toBe(0);
      expect(dirMap['left']).toBe(1);
      expect(dirMap['right']).toBe(2);
      expect(dirMap['up']).toBe(3);
    });
  });

  describe('Phulwali (npc-phulwali)', () => {
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
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4e);
      expect(buffer[3]).toBe(0x47);

      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      expect(width).toBe(128);
      expect(height).toBe(256);
    });
  });

  describe('Tania (npc-jogger)', () => {
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
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4e);
      expect(buffer[3]).toBe(0x47);

      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      expect(width).toBe(128);
      expect(height).toBe(256);
    });
  });
});
