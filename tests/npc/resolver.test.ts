// tests/npc/resolver.test.ts - Vitest unit tests for ScheduleResolver
import { describe, expect, it } from 'vitest';
import {
  formatMinutesToTime,
  matchesCondition,
  parseTimeToMinutes,
  resolveCurrentStop,
  resolveScheduleVariant
} from '../../src/systems/npc/ScheduleResolver';
import { NpcScheduleDef, ScheduleContext } from '../../src/types/npc.types';

describe('ScheduleResolver: Time Utilities', () => {
  it('parses valid time strings to minutes', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('06:30')).toBe(390);
    expect(parseTimeToMinutes('12:00')).toBe(720);
    expect(parseTimeToMinutes('18:45')).toBe(1125);
    expect(parseTimeToMinutes('23:59')).toBe(1439);
  });

  it('parses phase anchors with offsets', () => {
    expect(parseTimeToMinutes({ phase: 'dawn' })).toBe(300);
    expect(parseTimeToMinutes({ phase: 'morning', offsetMin: 15 })).toBe(495);
    expect(parseTimeToMinutes({ phase: 'afternoon', offsetMin: -30 })).toBe(690);
    expect(parseTimeToMinutes({ phase: 'sunset' })).toBe(1020);
    expect(parseTimeToMinutes({ phase: 'night', offsetMin: 20 })).toBe(1220);
    expect(parseTimeToMinutes({ phase: 'midnight' })).toBe(1380);
  });

  it('formats minutes to HH:MM strings', () => {
    expect(formatMinutesToTime(0)).toBe('00:00');
    expect(formatMinutesToTime(390)).toBe('06:30');
    expect(formatMinutesToTime(720)).toBe('12:00');
    expect(formatMinutesToTime(1439)).toBe('23:59');
  });

  it('throws on invalid time string', () => {
    expect(() => parseTimeToMinutes('invalid')).toThrow();
    expect(() => parseTimeToMinutes('25:00')).toThrow();
    expect(() => parseTimeToMinutes('12:65')).toThrow();
  });
});

describe('ScheduleResolver: Condition Matching', () => {
  const baseCtx: ScheduleContext = {
    hour: 12,
    minute: 0,
    totalMinutes: 720,
    season: 'spring',
    day: 15,
    dayOfWeek: 'mon',
    weather: 'sunny',
    isRaining: false,
    affection: 45,
    questFlags: {
      ahonaQuestStage: 2,
      bulliesDefeated: true
    }
  };

  it('matches seasons correctly', () => {
    expect(matchesCondition({ seasons: ['spring', 'summer'] }, baseCtx)).toBe(true);
    expect(matchesCondition({ seasons: ['winter'] }, baseCtx)).toBe(false);
  });

  it('matches day of week correctly', () => {
    expect(matchesCondition({ days: ['mon', 'fri'] }, baseCtx)).toBe(true);
    expect(matchesCondition({ days: ['tue', 'wed'] }, baseCtx)).toBe(false);
  });

  it('matches specific calendar dates', () => {
    expect(matchesCondition({ dates: [{ season: 'spring', day: 15 }] }, baseCtx)).toBe(true);
    expect(matchesCondition({ dates: [{ season: 'spring', day: 16 }] }, baseCtx)).toBe(false);
  });

  it('matches rain and weather states', () => {
    expect(matchesCondition({ weather: ['sunny'] }, baseCtx)).toBe(true);
    expect(matchesCondition({ weather: ['monsoon', 'rainy'] }, baseCtx)).toBe(false);
    expect(matchesCondition({ isRaining: false }, baseCtx)).toBe(true);
    expect(matchesCondition({ isRaining: true }, baseCtx)).toBe(false);
  });

  it('matches affection ranges', () => {
    expect(matchesCondition({ affection: { min: 20, max: 60 } }, baseCtx)).toBe(true);
    expect(matchesCondition({ affection: { min: 50 } }, baseCtx)).toBe(false);
    expect(matchesCondition({ affection: { max: 40 } }, baseCtx)).toBe(false);
  });

  it('matches quest flag conditions', () => {
    expect(matchesCondition({ quest: [{ flag: 'bulliesDefeated', equals: true }] }, baseCtx)).toBe(true);
    expect(matchesCondition({ quest: [{ flag: 'bulliesDefeated', equals: false }] }, baseCtx)).toBe(false);
    expect(matchesCondition({ quest: [{ flag: 'ahonaQuestStage', min: 1, max: 3 }] }, baseCtx)).toBe(true);
    expect(matchesCondition({ quest: [{ flag: 'ahonaQuestStage', min: 3 }] }, baseCtx)).toBe(false);
  });
});

describe('ScheduleResolver: Priority Variant Selection', () => {
  const dummyNpc: NpcScheduleDef = {
    npcId: 'test_npc',
    displayName: 'Test NPC',
    tier: 'A',
    home: { map: 'dhaka', tile: { col: 10, row: 10 } },
    sleep: { map: 'dhaka', tile: { col: 10, row: 10 } },
    movement: {
      speedTilesPerSec: 1.8,
      stepStyle: 'tile-step',
      idleBehaviors: [{ id: 'sip_tea', weight: 1, minDurationSec: 5, maxDurationSec: 10 }],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'var_rain',
        priority: 50,
        when: { isRaining: true },
        stops: [{ at: '08:00', map: 'dhaka', tile: { col: 5, row: 5 }, facing: 'down', activity: 'shelter_rain' }]
      },
      {
        id: 'var_weekend',
        priority: 20,
        when: { days: ['fri', 'sat'] },
        stops: [{ at: '09:00', map: 'dhaka', tile: { col: 20, row: 20 }, facing: 'up', activity: 'browse_books' }]
      },
      {
        id: 'var_weekday_sunny',
        priority: 10,
        when: { isRaining: false },
        stops: [{ at: '07:00', map: 'dhaka', tile: { col: 15, row: 15 }, facing: 'left', activity: 'brew_tea' }]
      }
    ],
    fallback: [
      { at: '00:00', map: 'dhaka', tile: { col: 10, row: 10 }, facing: 'down', activity: 'none' }
    ]
  };

  it('selects highest priority matching variant on sunny weekday', () => {
    const ctx: ScheduleContext = {
      hour: 10,
      minute: 0,
      totalMinutes: 600,
      season: 'spring',
      day: 1,
      dayOfWeek: 'mon',
      weather: 'sunny',
      isRaining: false,
      affection: 0,
      questFlags: {}
    };

    const variant = resolveScheduleVariant(dummyNpc, ctx);
    expect(variant.id).toBe('var_weekday_sunny');
  });

  it('prioritizes rain variant (priority 50) over weekday/weekend variants', () => {
    const ctx: ScheduleContext = {
      hour: 10,
      minute: 0,
      totalMinutes: 600,
      season: 'spring',
      day: 5,
      dayOfWeek: 'fri', // matches both weekend (20) and rain (50)
      weather: 'rainy',
      isRaining: true,
      affection: 0,
      questFlags: {}
    };

    const variant = resolveScheduleVariant(dummyNpc, ctx);
    expect(variant.id).toBe('var_rain');
  });

  it('falls back to default fallback when no variant matches', () => {
    const emptyNpc: NpcScheduleDef = {
      ...dummyNpc,
      variants: [
        {
          id: 'only_winter',
          priority: 10,
          when: { seasons: ['winter'] },
          stops: [{ at: '10:00', map: 'dhaka', tile: { col: 1, row: 1 }, facing: 'down' }]
        }
      ]
    };

    const ctx: ScheduleContext = {
      hour: 10,
      minute: 0,
      totalMinutes: 600,
      season: 'summer',
      day: 1,
      dayOfWeek: 'mon',
      weather: 'sunny',
      isRaining: false,
      affection: 0,
      questFlags: {}
    };

    const variant = resolveScheduleVariant(emptyNpc, ctx);
    expect(variant.id).toContain('default_fallback');
    expect(variant.priority).toBe(0);
  });

  it('allows scripted override to take absolute precedence (priority 9999)', () => {
    const ctx: ScheduleContext = {
      hour: 10,
      minute: 0,
      totalMinutes: 600,
      season: 'spring',
      day: 1,
      dayOfWeek: 'mon',
      weather: 'sunny',
      isRaining: false,
      affection: 0,
      questFlags: {},
      activeOverride: {
        id: 'cutscene_pitch',
        npcId: 'test_npc',
        map: 'dhaka',
        tile: { col: 44, row: 44 },
        facing: 'right',
        activity: 'sketch'
      }
    };

    const variant = resolveScheduleVariant(dummyNpc, ctx);
    expect(variant.priority).toBe(9999);
    expect(variant.stops[0].tile).toEqual({ col: 44, row: 44 });
    expect(variant.stops[0].facing).toBe('right');
  });
});

describe('ScheduleResolver: Timeline Stop Resolution', () => {
  const testVariant = {
    id: 'test_routine',
    priority: 10,
    when: {},
    stops: [
      { at: '06:00', map: 'dhaka' as const, tile: { col: 8, row: 9 }, facing: 'down' as const, activity: 'brew_tea' as const, dwellMin: 120 },
      { at: '12:00', map: 'dhaka' as const, tile: { col: 20, row: 15 }, facing: 'left' as const, activity: 'sip_tea' as const, dwellMin: 60 },
      { at: '18:00', map: 'dhaka' as const, tile: { col: 30, row: 25 }, facing: 'right' as const, activity: 'take_photos' as const, dwellMin: 180 },
      { at: '23:00', map: 'dhaka' as const, tile: { col: 8, row: 9 }, facing: 'up' as const, activity: 'sleep' as const, dwellMin: 420 }
    ]
  };

  it('resolves morning stop at 06:30', () => {
    const res = resolveCurrentStop(testVariant, 6 * 60 + 30); // 06:30 = 390 min
    expect(res.currentStop.at).toBe('06:00');
    expect(res.currentStop.activity).toBe('brew_tea');
    expect(res.isEnRoute).toBe(false);
    expect(res.nextStop?.at).toBe('12:00');
  });

  it('marks NPC en-route when dwell expires before next stop', () => {
    // 06:00 stop has dwellMin: 120, so departure is 08:00
    // At 09:30 (570 min), NPC has departed stop 1 and is heading towards stop 2 (12:00)
    const res = resolveCurrentStop(testVariant, 9 * 60 + 30);
    expect(res.currentStop.at).toBe('06:00');
    expect(res.nextStop?.at).toBe('12:00');
    expect(res.isEnRoute).toBe(true);
  });

  it('resolves midday stop at 12:15', () => {
    const res = resolveCurrentStop(testVariant, 12 * 60 + 15);
    expect(res.currentStop.at).toBe('12:00');
    expect(res.currentStop.activity).toBe('sip_tea');
    expect(res.isEnRoute).toBe(false);
  });

  it('resolves golden hour / evening stop at 18:30', () => {
    const res = resolveCurrentStop(testVariant, 18 * 60 + 30);
    expect(res.currentStop.at).toBe('18:00');
    expect(res.currentStop.activity).toBe('take_photos');
  });

  it('resolves midnight sleeping stop at 23:30', () => {
    const res = resolveCurrentStop(testVariant, 23 * 60 + 30);
    expect(res.currentStop.at).toBe('23:00');
    expect(res.currentStop.activity).toBe('sleep');
  });

  it('wraps around midnight correctly at 02:30 AM', () => {
    // At 02:30 (150 min), it should still be in the 23:00 sleeping stop
    const res = resolveCurrentStop(testVariant, 2 * 60 + 30);
    expect(res.currentStop.at).toBe('23:00');
    expect(res.currentStop.activity).toBe('sleep');
    expect(res.nextStop?.at).toBe('06:00');
  });
});
