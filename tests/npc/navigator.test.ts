// tests/npc/navigator.test.ts - Vitest unit tests for NpcNavigator A* pathfinding
import { beforeEach, describe, expect, it } from 'vitest';
import { NpcNavigator, TerrainCostProvider } from '../../src/systems/npc/NpcNavigator';

describe('NpcNavigator: A* Pathfinding', () => {
  let navigator: NpcNavigator;

  beforeEach(() => {
    navigator = new NpcNavigator();
  });

  it('returns [start] if start and goal are the same tile', () => {
    const path = navigator.findPath('dhaka', { col: 5, row: 5 }, { col: 5, row: 5 });
    expect(path).toEqual([{ col: 5, row: 5 }]);
  });

  it('finds straightforward orthogonal path between two points', () => {
    const path = navigator.findPath('dhaka', { col: 2, row: 2 }, { col: 4, row: 2 });
    expect(path).not.toBeNull();
    expect(path?.length).toBe(3);
    expect(path?.[0]).toEqual({ col: 2, row: 2 });
    expect(path?.[2]).toEqual({ col: 4, row: 2 });
  });

  it('paths around solid obstacles', () => {
    // Place a vertical wall at col: 3, rows: 1..4
    const blockedTiles = new Set(['3,1', '3,2', '3,3', '3,4']);
    const provider: TerrainCostProvider = {
      isBlocked: (c, r) => blockedTiles.has(`${c},${r}`),
      getCost: () => 1.0
    };
    navigator.setCostProvider(provider);

    const path = navigator.findPath('dhaka', { col: 2, row: 2 }, { col: 4, row: 2 });
    expect(path).not.toBeNull();
    // Path should route around the wall without containing any blocked tiles
    path?.forEach(tile => {
      expect(blockedTiles.has(`${tile.col},${tile.row}`)).toBe(false);
    });
    expect(path?.[path.length - 1]).toEqual({ col: 4, row: 2 });
  });

  it('prefers lower cost paved paths over high-cost grass or flower terrain', () => {
    // 3 rows: row 0 is paved path (cost 1.0), row 1 is grass (cost 3.0), row 2 is flowers (cost 5.0)
    const provider: TerrainCostProvider = {
      isBlocked: () => false,
      getCost: (c, r) => {
        if (r === 0) return 1.0;
        if (r === 1) return 3.0;
        return 5.0;
      }
    };
    navigator.setCostProvider(provider);

    // Path from (0, 0) to (5, 0)
    const path = navigator.findPath('dhaka', { col: 0, row: 0 }, { col: 5, row: 0 });
    expect(path).not.toBeNull();
    // It should stay on row 0 the entire time
    path?.forEach(tile => {
      expect(tile.row).toBe(0);
    });
  });

  it('strictly avoids tilled soil and growing crops (cost 999)', () => {
    // Direct path on row 2 has tilled soil (cost 999), detour on row 1 is grass (cost 2)
    const tilledSoil = new Set(['2,2', '3,2', '4,2']);
    const provider: TerrainCostProvider = {
      isBlocked: () => false,
      getCost: (c, r) => (tilledSoil.has(`${c},${r}`) ? 999.0 : 2.0)
    };
    navigator.setCostProvider(provider);

    const path = navigator.findPath('dhaka', { col: 1, row: 2 }, { col: 5, row: 2 });
    expect(path).not.toBeNull();
    // Should detour around row 2 and not step on the tilled cells
    path?.forEach(tile => {
      expect(tilledSoil.has(`${tile.col},${tile.row}`)).toBe(false);
    });
  });

  it('caches paths and invalidates cache when requested', () => {
    const path1 = navigator.findPath('dhaka', { col: 1, row: 1 }, { col: 3, row: 1 });
    expect(path1).not.toBeNull();

    // Invalidate cache for dhaka
    navigator.invalidateCache('dhaka');
    const path2 = navigator.findPath('dhaka', { col: 1, row: 1 }, { col: 3, row: 1 });
    expect(path2).toEqual(path1);
  });

  it('returns null if goal is out of bounds or blocked', () => {
    const provider: TerrainCostProvider = {
      isBlocked: (c, r) => c === 10 && r === 10,
      getCost: () => 1.0
    };
    navigator.setCostProvider(provider);

    expect(navigator.findPath('dhaka', { col: 0, row: 0 }, { col: 10, row: 10 })).toBeNull();
    expect(navigator.findPath('dhaka', { col: 0, row: 0 }, { col: 999, row: 999 })).toBeNull();
  });

  it('plans multi-map route to door tile when maps differ', () => {
    const route = navigator.planRoute('dhaka', { col: 6, row: 30 }, 'curzon_interior', { col: 18, row: 10 });
    expect(route.nextDoor).not.toBeNull();
    expect(route.nextDoor?.toMap).toBe('curzon_interior');
    expect(route.nextDoor?.fromTile).toEqual({ col: 6, row: 41 });
    expect(route.path).not.toBeNull();
    expect(route.path?.[route.path.length - 1]).toEqual({ col: 6, row: 41 });
  });
});
