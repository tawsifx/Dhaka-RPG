// tests/npc/offscreen.test.ts - Vitest tests for OffscreenSimulator analytic placement
import { describe, expect, it } from 'vitest';
import { OffscreenSimulator } from '../../src/systems/npc/OffscreenSimulator';
import { NpcScheduleDef, ScheduleContext } from '../../src/types/npc.types';

describe('OffscreenSimulator: Analytic Map Entry Placement', () => {
  const simulator = new OffscreenSimulator();

  const testNpc: NpcScheduleDef = {
    npcId: 'walker_test',
    displayName: 'Walker Test',
    tier: 'A',
    home: { map: 'dhaka', tile: { col: 10, row: 10 } },
    sleep: { map: 'dhaka', tile: { col: 10, row: 10 } },
    movement: {
      speedTilesPerSec: 1.5,
      stepStyle: 'tile-step',
      idleBehaviors: [],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'daily_routine',
        priority: 10,
        when: {},
        stops: [
          { at: '06:00', map: 'dhaka', tile: { col: 10, row: 10 }, facing: 'down', activity: 'sip_tea', dwellMin: 60 },
          { at: '12:00', map: 'dhaka', tile: { col: 20, row: 10 }, facing: 'left', activity: 'none', dwellMin: 120 },
          { at: '22:00', map: 'dhaka', tile: { col: 10, row: 10 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '06:00', map: 'dhaka', tile: { col: 10, row: 10 }, facing: 'down' }
    ]
  };

  it('places NPC at stop coordinate during dwell window', () => {
    // 06:30 (390 min): dwelling at stop 1 (06:00)
    const ctx: ScheduleContext = {
      hour: 6,
      minute: 30,
      totalMinutes: 390,
      season: 'spring',
      day: 1,
      dayOfWeek: 'mon',
      weather: 'sunny',
      isRaining: false,
      affection: 0,
      questFlags: {}
    };

    const placement = simulator.simulatePlacement(testNpc, ctx);
    expect(placement.map).toBe('dhaka');
    expect(placement.tile).toEqual({ col: 10, row: 10 });
    expect(placement.facing).toBe('down');
    expect(placement.isEnRoute).toBe(false);
    expect(placement.state).toBe('activity');
  });

  it('places NPC en-route along path when traveling between stops', () => {
    // Stop 1 (06:00) dwell: 60 min -> departs at 07:00 (420 min)
    // Next stop: 12:00 (720 min)
    // At 09:30 (570 min): 50% along the path from (10, 10) to (20, 10)
    const ctx: ScheduleContext = {
      hour: 9,
      minute: 30,
      totalMinutes: 570,
      season: 'spring',
      day: 1,
      dayOfWeek: 'mon',
      weather: 'sunny',
      isRaining: false,
      affection: 0,
      questFlags: {}
    };

    const placement = simulator.simulatePlacement(testNpc, ctx);
    expect(placement.map).toBe('dhaka');
    expect(placement.isEnRoute).toBe(true);
    expect(placement.state).toBe('walking');
    // Progress should place them roughly midway between col 10 and col 20 (col ~15)
    expect(placement.tile.col).toBeGreaterThanOrEqual(14);
    expect(placement.tile.col).toBeLessThanOrEqual(16);
    expect(placement.tile.row).toBe(10);
    expect(placement.facing).toBe('right');
  });

  it('places NPC in bed at midnight', () => {
    const ctx: ScheduleContext = {
      hour: 23,
      minute: 30,
      totalMinutes: 23 * 60 + 30,
      season: 'spring',
      day: 1,
      dayOfWeek: 'mon',
      weather: 'sunny',
      isRaining: false,
      affection: 0,
      questFlags: {}
    };

    const placement = simulator.simulatePlacement(testNpc, ctx);
    expect(placement.tile).toEqual({ col: 10, row: 10 });
    expect(placement.facing).toBe('up');
    expect(placement.state).toBe('sleeping');
  });
});
