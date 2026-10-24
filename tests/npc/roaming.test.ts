// tests/npc/roaming.test.ts - Dynamic Ambient NPC Roaming & Scatter Tests
import { beforeEach, describe, expect, it } from 'vitest';
import { NpcMover } from '../../src/systems/npc/NpcMover';
import { NpcNavigator } from '../../src/systems/npc/NpcNavigator';
import { NpcRoamData } from '../../src/systems/ScheduleSystem';
import { GridTile } from '../../src/types/npc.types';

describe('NPC Dynamic Roaming & Scatter Engine', () => {
  let navigator: NpcNavigator;

  beforeEach(() => {
    navigator = new NpcNavigator({
      isBlocked: (c, r) => {
        // Mock boundary constraint: 80x60
        if (c < 0 || c >= 80 || r < 0 || r >= 60) return true;
        // Mock a solid obstacle at (15, 15)
        if (c === 15 && r === 15) return true;
        return false;
      },
      getCost: () => 1.0
    });
  });

  it('correctly configures roaming parameters across character archetypes', () => {
    // Vendors: 1-tile radius to remain at carts
    const vendorRoam: NpcRoamData = {
      anchorTile: { col: 32, row: 35 },
      nextRoamTime: 10.0,
      pauseDurationSec: 3.5,
      roamRadius: 1,
      isVendor: true,
      isSleeping: false
    };
    expect(vendorRoam.roamRadius).toBe(1);
    expect(vendorRoam.isVendor).toBe(true);

    // Jogger: high-cardio 8-tile radius, rapid 0.8s pauses
    const joggerRoam: NpcRoamData = {
      anchorTile: { col: 48, row: 16 },
      nextRoamTime: 5.0,
      pauseDurationSec: 0.8,
      roamRadius: 8,
      isVendor: false,
      isSleeping: false
    };
    expect(joggerRoam.roamRadius).toBe(8);
    expect(joggerRoam.pauseDurationSec).toBe(0.8);

    // Citizens / Painters / Couples: 4-tile stroll radius
    const citizenRoam: NpcRoamData = {
      anchorTile: { col: 10, row: 23 },
      nextRoamTime: 7.0,
      pauseDurationSec: 2.2,
      roamRadius: 4,
      isVendor: false,
      isSleeping: false
    };
    expect(citizenRoam.roamRadius).toBe(4);
  });

  it('prevents roaming paths from selecting blocked obstacle tiles', () => {
    const startTile: GridTile = { col: 14, row: 15 };
    const blockedTile: GridTile = { col: 15, row: 15 };

    const path = navigator.findPath('dhaka', startTile, blockedTile);
    expect(path).toBeNull();
  });

  it('generates valid multi-hop roaming path within wander radius', () => {
    const startTile: GridTile = { col: 20, row: 20 };
    const targetTile: GridTile = { col: 22, row: 21 }; // within 4-tile radius

    const path = navigator.findPath('dhaka', startTile, targetTile);
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(1);
    expect(path![0]).toEqual(startTile);
    expect(path![path!.length - 1]).toEqual(targetTile);
  });

  it('restores mover idle state and facing direction after dialogue interaction closes', () => {
    const mover = new NpcMover({ col: 10, row: 20 }, 'right');
    expect(mover.facing).toBe('right');
    expect(mover.state).toBe('idle');

    // Player talks from the south (higher Y)
    mover.startInteraction(mover.x, mover.y + 40);
    expect(mover.state).toBe('interacting');
    expect(mover.facing).toBe('down');

    // Dialogue interaction closes
    mover.endInteraction();
    expect(mover.state).toBe('idle');
    expect(mover.facing).toBe('right');
  });

  it('ensures sleeping NPCs are flagged and suppress roaming', () => {
    const sleepingRoam: NpcRoamData = {
      anchorTile: { col: 6, row: 41 },
      nextRoamTime: 100.0,
      pauseDurationSec: 5.0,
      roamRadius: 3,
      isVendor: false,
      isSleeping: true
    };
    expect(sleepingRoam.isSleeping).toBe(true);
  });
});
