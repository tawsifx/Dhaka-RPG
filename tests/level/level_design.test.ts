// tests/level/level_design.test.ts - Level design validation tests
import { describe, it, expect } from 'vitest';
import { LevelValidator } from '../../src/systems/level/LevelValidator';
import { WORLDS_DB } from '../../src/config/worlds.db';
import { TILE_SIZE } from '../../src/config/constants';

describe('Level Design Patterns & Grid Alignment (level-design-patterns)', () => {
  it('correctly validates 32px tile snapping for grid boundaries and centers', () => {
    // 32px grid boundaries (0, 32, 64, 2560)
    expect(LevelValidator.isGridSnapped(0)).toBe(true);
    expect(LevelValidator.isGridSnapped(32)).toBe(true);
    expect(LevelValidator.isGridSnapped(64)).toBe(true);
    expect(LevelValidator.isGridSnapped(2560)).toBe(true);

    // Half-tile centers (16, 48, 80)
    expect(LevelValidator.isGridSnapped(16)).toBe(true);
    expect(LevelValidator.isGridSnapped(48)).toBe(true);

    // Unaligned floating offsets (15, 33.7)
    expect(LevelValidator.isGridSnapped(15)).toBe(false);
    expect(LevelValidator.isGridSnapped(33.7)).toBe(false);
  });

  it('validates portal and spawn alignment across all 8 worlds', () => {
    const reports = LevelValidator.validateWorldGridAlignment();

    expect(reports.length).toBeGreaterThan(0);

    for (const r of reports) {
      expect(r.isAligned).toBe(true);
      expect(r.offset).toBeLessThanOrEqual(Math.hypot(TILE_SIZE / 2, TILE_SIZE / 2) + 0.01);
    }
  });

  it('guarantees all corridors meet minimum companion clearance (>= 64px)', () => {
    const clearances = LevelValidator.validatePathClearances();

    expect(clearances.length).toBeGreaterThanOrEqual(9);

    for (const c of clearances) {
      expect(c.passed).toBe(true);
      expect(c.width).toBeGreaterThanOrEqual(LevelValidator.MIN_COMPANION_CLEARANCE);
    }
  });

  it('executes full level audit with zero blocking errors', () => {
    const audit = LevelValidator.runFullAudit();

    expect(audit.passed).toBe(true);
    expect(audit.errors.length).toBe(0);
    expect(audit.totalChecks).toBeGreaterThan(15);
  });

  it('verifies multi-pathway connectivity for expedition realms', () => {
    const paths = LevelValidator.validatePathClearances();
    const bypassLoop = paths.find(p => p.pathName === 'Realms:NorthernScenicBypassLoop');

    expect(bypassLoop).toBeDefined();
    expect(bypassLoop?.passed).toBe(true);
    expect(bypassLoop?.width).toBe(64);
  });
});
