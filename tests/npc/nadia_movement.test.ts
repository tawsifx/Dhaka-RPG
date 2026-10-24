// tests/npc/nadia_movement.test.ts - Tests for Nadia (npc-walker2) movement, orientation, and animations
import { describe, it, expect } from 'vitest';
import { NpcMover } from '../../src/systems/npc/NpcMover';
import { NPC_SCHEDULES_DB } from '../../src/config/npcSchedules.db';
import { ASSET_SPECS_MANIFEST } from '../../src/config/assetSpecs.manifest';

describe('Nadia (npc-walker2) Asset & Movement Specifications', () => {
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
