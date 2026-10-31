import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { TRACKS } from '../../src/scenes/minigames/race/track.js';
import {
  CC_INDEX,
  CC_BATTLE,
  ccSpeedScale,
  speedKmh,
  PATH_POINTS,
  pickRivals
} from '../../src/scenes/minigames/race/kart.js';
import { ITEM_LABELS } from '../../src/scenes/minigames/race/items.js';
import { TotoroKartEngine, RickshawRaceEngine } from '../../src/scenes/minigames/race';

describe('MarioKart64JS Core Subsystem Tests', () => {
  it('defines all 16 Grand Prix circuits and 4 battle arenas', () => {
    expect(TRACKS).toHaveLength(20);
    const standardTracks = TRACKS.filter((t: any) => !t.battle);
    const battleTracks = TRACKS.filter((t: any) => t.battle);

    expect(standardTracks).toHaveLength(16);
    expect(battleTracks).toHaveLength(4);

    const trackIds = TRACKS.map((t: any) => t.id);
    expect(trackIds).toContain('mario');
    expect(trackIds).toContain('luigi');
    expect(trackIds).toContain('royal');
    expect(trackIds).toContain('bowser');
    expect(trackIds).toContain('rainbow');
    expect(trackIds).toContain('big-donut');
    expect(trackIds).toContain('block-fort');
  });

  it('calculates correct CC engine speed scales across drivers', () => {
    expect(ccSpeedScale(CC_INDEX[150], 'satsuki')).toBe(1);
    expect(ccSpeedScale(CC_INDEX[50], 'satsuki')).toBeCloseTo((290 / 320) ** 2, 6);
    expect(ccSpeedScale(CC_INDEX[150], 'totoro')).toBe(ccSpeedScale(CC_INDEX[150], 'donkeykong'));
    expect(ccSpeedScale(CC_INDEX[150], 'mario')).toBe(1);
    expect(ccSpeedScale(CC_INDEX[50], 'mario')).toBeCloseTo((290 / 320) ** 2, 6);
    expect(ccSpeedScale(CC_INDEX[150], 'yoshi')).toBeGreaterThan(1);
    expect(ccSpeedScale(CC_INDEX[150], 'unknown')).toBe(1);
    expect(ccSpeedScale(CC_BATTLE, 'satsuki')).toBeCloseTo((245 / 320) ** 2, 6);
    expect(ccSpeedScale(CC_BATTLE, 'mario')).toBeCloseTo((245 / 320) ** 2, 6);
  });

  it('converts velocity correctly to km/h', () => {
    expect(speedKmh(0)).toBe(0);
    expect(speedKmh(-10)).toBe(speedKmh(10));
    expect(speedKmh(44)).toBeCloseTo(70.6, 0);
  });

  it('configures path points for all 16 courses', () => {
    expect(Object.keys(PATH_POINTS)).toHaveLength(16);
    expect(PATH_POINTS['mario']).toBeGreaterThan(0);
    expect(PATH_POINTS['rainbow']).toBeGreaterThan(0);
  });

  it('picks 2 distinct rivals among CPU karts', () => {
    const karts = [
      { isPlayer: true, remote: false },
      { isPlayer: false, remote: false, rival: -1 },
      { isPlayer: false, remote: false, rival: -1 },
      { isPlayer: false, remote: false, rival: -1 },
      { isPlayer: false, remote: false, rival: -1 }
    ];
    pickRivals(karts);
    const rivals = karts.filter(k => (k as any).rival !== undefined && (k as any).rival >= 0);
    expect(rivals).toHaveLength(2);
  });

  it('contains authentic item labels', () => {
    expect(ITEM_LABELS).toBeDefined();
    expect(ITEM_LABELS['banana']).toBe('BANANA');
    expect(ITEM_LABELS['green_shell']).toBe('GREEN SHELL');
    expect(ITEM_LABELS['red_shell']).toBe('RED SHELL');
    expect(ITEM_LABELS['star']).toBe('STAR');
    expect(ITEM_LABELS['thunder_bolt']).toBe('THUNDER BOLT');
    expect(ITEM_LABELS['blue_shell']).toBe('BLUE SHELL');
    expect(ITEM_LABELS['mushroom']).toBe('MUSHROOM');
  });

  it('TotoroKartEngine exports launch and exit lifecycle hooks', () => {
    expect(TotoroKartEngine).toBeDefined();
    expect(typeof TotoroKartEngine.launch).toBe('function');
    expect(typeof TotoroKartEngine.exit).toBe('function');

    const dummyScene = {
      scene: { pause: () => {}, resume: () => {} },
      timeCalendar: { setPaused: () => {} },
      sound: { pauseAll: () => {}, resumeAll: () => {} }
    };

    const engine = new TotoroKartEngine(dummyScene);
    expect(engine).toBeInstanceOf(TotoroKartEngine);
    expect(RickshawRaceEngine).toBe(TotoroKartEngine);
  });

  it('supports Satsuki and Totoro across battle arenas and Grand Prix circuits', () => {
    const battleArenaIds = ['big-donut', 'block-fort', 'double-deck', 'skyscraper'];
    for (const arenaId of battleArenaIds) {
      const arena = TRACKS.find((t: any) => t.id === arenaId);
      expect(arena).toBeDefined();
      expect((arena as any)?.battle).toBe(true);
    }

    // Verify Satsuki and Totoro engine scales
    expect(ccSpeedScale(CC_BATTLE, 'satsuki')).toBeGreaterThan(0);
    expect(ccSpeedScale(CC_BATTLE, 'totoro')).toBeGreaterThan(0);
  });
});
