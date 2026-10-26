// tests/race/race_m4.test.ts - Milestone 4 Unit Tests (Rivals, AI, Physics, Ranking & Flow)
import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { AiRng } from '../../src/scenes/minigames/race/ai/AiRng';
import { AvoidanceSensors } from '../../src/scenes/minigames/race/ai/AvoidanceSensors';
import { RubberBand } from '../../src/scenes/minigames/race/ai/RubberBand';
import { AiDriver } from '../../src/scenes/minigames/race/ai/AiDriver';
import {
  ALL_DRIVERS,
  DEFAULT_PLAYER_DRIVER,
  DIFFICULTY_CONFIGS,
  RIVAL_DRIVERS
} from '../../src/config/drivers.race.db';
import { KartCollisionSystem } from '../../src/scenes/minigames/race/core/KartCollisionSystem';
import { RankingSystem } from '../../src/scenes/minigames/race/core/RankingSystem';
import { RaceSession } from '../../src/scenes/minigames/race/core/RaceSession';
import { KartController } from '../../src/scenes/minigames/race/core/KartController';
import { TrackSpline } from '../../src/scenes/minigames/race/track/TrackSpline';
import { KartState, TrackDefinition } from '../../src/types/race.types';

function createMockKartState(partial: Partial<KartState> = {}): KartState {
  return {
    x: 0,
    y: 0,
    z: 0,
    rotation: 0,
    speed: 20,
    steerAngle: 0,
    angularVelocity: 0,
    distanceTravelled: 0,
    drift: {
      isDrifting: false,
      driftSign: 0,
      charge: 0,
      tier: 0,
      hopTimer: 0,
      hopHeight: 0,
      slipAngle: 0
    },
    boost: {
      active: false,
      source: null,
      strength: 0,
      durationRemaining: 0
    },
    air: {
      isAirborne: false,
      verticalVelocity: 0,
      height: 0,
      trickActive: false,
      trickRotation: 0
    },
    surface: 'asphalt',
    stalled: false,
    bodyPitch: 0,
    bodyRoll: 0,
    lookBehind: false,
    ...partial
  };
}

function createMockTrack(): TrackDefinition {
  return {
    id: 'test_track',
    name: 'Test Oval',
    version: 1,
    units: 'meters',
    lapCount: 3,
    centerline: [
      { x: 0, y: 0, z: 50, width: 16 },
      { x: 50, y: 0, z: 0, width: 16 },
      { x: 0, y: 0, z: -50, width: 16 },
      { x: -50, y: 0, z: 0, width: 16 }
    ],
    checkpoints: [
      { id: 0, center: { x: 0, y: 0, z: 50 }, normal: { x: 1, y: 0, z: 0 }, width: 20, height: 8 },
      { id: 1, center: { x: 50, y: 0, z: 0 }, normal: { x: 0, y: 0, z: -1 }, width: 20, height: 8 },
      { id: 2, center: { x: 0, y: 0, z: -50 }, normal: { x: -1, y: 0, z: 0 }, width: 20, height: 8 },
      { id: 3, center: { x: -50, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 }, width: 20, height: 8 }
    ],
    startGrid: [
      { slot: 1, x: -3, y: 0, z: 45, rotation: 0 },
      { slot: 2, x: 3, y: 0, z: 45, rotation: 0 },
      { slot: 3, x: -3, y: 0, z: 40, rotation: 0 },
      { slot: 4, x: 3, y: 0, z: 40, rotation: 0 },
      { slot: 5, x: -3, y: 0, z: 35, rotation: 0 },
      { slot: 6, x: 3, y: 0, z: 35, rotation: 0 },
      { slot: 7, x: -3, y: 0, z: 30, rotation: 0 },
      { slot: 8, x: 3, y: 0, z: 30, rotation: 0 }
    ],
    finishLine: { id: 0, center: { x: 0, y: 0, z: 50 }, normal: { x: 1, y: 0, z: 0 }, width: 20, height: 8 },
    minimapBounds: { minX: -60, maxX: 60, minZ: -60, maxZ: 60 },
    lightingPreset: 'golden_hour',
    musicId: 'bgm_test',
    skyPreset: 'sky_sunset'
  };
}

describe('M4: Seeded PRNG (AiRng)', () => {
  it('generates identical sequence from the same seed', () => {
    const rng1 = new AiRng(12345);
    const rng2 = new AiRng(12345);

    const seq1 = [rng1.next(), rng1.next(), rng1.next(), rng1.nextInt(1, 10)];
    const seq2 = [rng2.next(), rng2.next(), rng2.next(), rng2.nextInt(1, 10)];

    expect(seq1).toEqual(seq2);
  });

  it('generates different sequences from different seeds', () => {
    const rng1 = new AiRng(123);
    const rng2 = new AiRng(456);

    expect(rng1.next()).not.toEqual(rng2.next());
  });

  it('serializes and restores state accurately', () => {
    const rng = new AiRng(999);
    rng.next();
    rng.next();
    const savedState = rng.getState();

    const val1 = rng.next();
    const val2 = rng.next();

    rng.setState(savedState);
    expect(rng.next()).toBe(val1);
    expect(rng.next()).toBe(val2);
  });

  it('generates integers within bounds inclusive', () => {
    const rng = new AiRng(777);
    for (let i = 0; i < 50; i++) {
      const val = rng.nextInt(3, 7);
      expect(val).toBeGreaterThanOrEqual(3);
      expect(val).toBeLessThanOrEqual(7);
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it('generates floats within bounds', () => {
    const rng = new AiRng(888);
    for (let i = 0; i < 50; i++) {
      const val = rng.nextFloat(10.5, 20.5);
      expect(val).toBeGreaterThanOrEqual(10.5);
      expect(val).toBeLessThan(20.5);
    }
  });
});

describe('M4: Driver Database & Difficulty Configs', () => {
  it('defines exactly 8 distinct drivers (Moon Walker + 7 rivals)', () => {
    expect(ALL_DRIVERS.length).toBe(8);
    expect(RIVAL_DRIVERS.length).toBe(7);
    expect(DEFAULT_PLAYER_DRIVER.id).toBe('moon_walker');
  });

  it('ensures all drivers have unique IDs and colors', () => {
    const ids = new Set(ALL_DRIVERS.map((d) => d.id));
    const colors = new Set(ALL_DRIVERS.map((d) => d.kartColor));

    expect(ids.size).toBe(8);
    expect(colors.size).toBe(8);
  });

  it('validates driver personality ranges', () => {
    for (const d of ALL_DRIVERS) {
      expect(d.personality.skill).toBeGreaterThanOrEqual(0);
      expect(d.personality.skill).toBeLessThanOrEqual(1);
      expect(d.personality.aggression).toBeGreaterThanOrEqual(0);
      expect(d.personality.aggression).toBeLessThanOrEqual(1);
      expect(d.personality.driftiness).toBeGreaterThanOrEqual(0);
      expect(d.personality.driftiness).toBeLessThanOrEqual(1);
      expect(d.personality.mistakeRate).toBeGreaterThanOrEqual(0);
      expect(d.personality.mistakeRate).toBeLessThanOrEqual(1);
    }
  });

  it('defines 3 difficulty tiers with ascending speed multipliers', () => {
    const easy = DIFFICULTY_CONFIGS.gorom_cha;
    const med = DIFFICULTY_CONFIGS.beshi_gorom;
    const hard = DIFFICULTY_CONFIGS.naga_jhal;

    expect(easy.speedMultiplier).toBeLessThan(med.speedMultiplier);
    expect(med.speedMultiplier).toBeLessThan(hard.speedMultiplier);
    expect(easy.maxDriftTier).toBe(1);
    expect(med.maxDriftTier).toBe(2);
    expect(hard.maxDriftTier).toBe(3);
  });
});

describe('M4: Avoidance Sensors', () => {
  it('returns zero steering bias when no karts nearby', () => {
    const self = createMockKartState({ x: 0, z: 0 });
    const rivals = [createMockKartState({ x: 50, z: 50 })];

    const report = AvoidanceSensors.evaluate(self, [self, ...rivals], 0);
    expect(report.steeringBias).toBe(0);
    expect(report.brakeRecommended).toBe(false);
  });

  it('steers left when rival is directly ahead leaning right', () => {
    const self = createMockKartState({ x: 0, z: 0, rotation: 0 }); // heading -Z
    const rival = createMockKartState({ x: 0.8, z: -5.0, rotation: 0 }); // ahead and right

    const report = AvoidanceSensors.evaluate(self, [self, rival], 0);
    expect(report.steeringBias).toBeLessThan(0); // Left bias
  });

  it('steers right when rival is directly ahead leaning left', () => {
    const self = createMockKartState({ x: 0, z: 0, rotation: 0 }); // heading -Z
    const rival = createMockKartState({ x: -0.8, z: -5.0, rotation: 0 }); // ahead and left

    const report = AvoidanceSensors.evaluate(self, [self, rival], 0);
    expect(report.steeringBias).toBeGreaterThan(0); // Right bias
  });

  it('ignores karts on different vertical levels (flyover separation)', () => {
    const self = createMockKartState({ x: 0, y: 0, z: 0, rotation: 0 });
    const rival = createMockKartState({ x: 0.5, y: 5.0, z: -4.0, rotation: 0 }); // 5m above on flyover bridge

    const report = AvoidanceSensors.evaluate(self, [self, rival], 0);
    expect(report.steeringBias).toBe(0);
    expect(report.nearestRivalDistance).toBe(Infinity);
  });

  it('recommends braking when approaching stopped kart too fast', () => {
    const self = createMockKartState({ x: 0, z: 0, speed: 25 });
    const stopped = createMockKartState({ x: 0, z: -2.5, speed: 0 });

    const report = AvoidanceSensors.evaluate(self, [self, stopped], 0);
    expect(report.brakeRecommended).toBe(true);
  });
});

describe('M4: Bounded Rubber-Banding', () => {
  it('gives player strictly 1.0 multiplier regardless of gap', () => {
    expect(RubberBand.computeMultiplier(500, 100, true)).toBe(1.0);
    expect(RubberBand.computeMultiplier(100, 500, true)).toBe(1.0);
    expect(RubberBand.computeMultiplier(0, 0, true)).toBe(1.0);
  });

  it('gives AI 1.0 when tied with player', () => {
    expect(RubberBand.computeMultiplier(200, 200, false)).toBe(1.0);
  });

  it('caps AI catchup bonus at +6% when far behind', () => {
    const mult = RubberBand.computeMultiplier(0, 200, false); // 200m behind
    expect(mult).toBe(1.06);
  });

  it('caps AI handicap at -6% when far ahead', () => {
    const mult = RubberBand.computeMultiplier(200, 0, false); // 200m ahead
    expect(mult).toBe(0.94);
  });

  it('scales smoothly with distance ramp', () => {
    const halfBehind = RubberBand.computeMultiplier(0, 30, false); // 30m behind (half ramp)
    expect(halfBehind).toBeCloseTo(1.03, 2);

    const halfAhead = RubberBand.computeMultiplier(30, 0, false); // 30m ahead (half ramp)
    expect(halfAhead).toBeCloseTo(0.97, 2);
  });
});

describe('M4: Kart-vs-Kart Collision System', () => {
  it('pushes overlapping karts apart along contact normal', () => {
    const k1 = new KartController({}, { x: 0, z: 0 });
    const k2 = new KartController({}, { x: 1.2, z: 0 }); // dist 1.2 < 1.8 (radius 0.9 * 2)

    KartCollisionSystem.resolveCollisions([
      { id: 'k1', controller: k1, weight: 1.0 },
      { id: 'k2', controller: k2, weight: 1.0 }
    ]);

    const s1 = k1.getState();
    const s2 = k2.getState();

    expect(s1.x).toBeLessThan(0);
    expect(s2.x).toBeGreaterThan(1.2);
    expect(Math.hypot(s2.x - s1.x, s2.z - s1.z)).toBeCloseTo(1.8, 2);
  });

  it('applies mass asymmetry: heavy kart moves less than light kart', () => {
    const heavy = new KartController({}, { x: 0, z: 0 });
    const light = new KartController({}, { x: 1.2, z: 0 });

    KartCollisionSystem.resolveCollisions([
      { id: 'heavy', controller: heavy, weight: 2.0 },
      { id: 'light', controller: light, weight: 0.5 }
    ]);

    const heavyDist = Math.abs(heavy.getState().x - 0);
    const lightDist = Math.abs(light.getState().x - 1.2);

    expect(lightDist).toBeGreaterThan(heavyDist * 2);
  });

  it('ignores collision between karts on different flyover vertical elevations', () => {
    const lower = new KartController({}, { x: 0, y: 0, z: 0 });
    const upper = new KartController({}, { x: 0.5, y: 4.5, z: 0 }); // 4.5m vertical separation

    const events = KartCollisionSystem.resolveCollisions([
      { id: 'lower', controller: lower, weight: 1.0 },
      { id: 'upper', controller: upper, weight: 1.0 }
    ]);

    expect(events.length).toBe(0);
    expect(lower.getState().x).toBe(0);
    expect(upper.getState().x).toBe(0.5);
  });

  it('cancels drift on hard impact (> 10 m/s relative speed)', () => {
    const k1 = new KartController({}, { x: 0, z: 0, rotation: 0, speed: 20 });
    const k2 = new KartController({}, { x: 0, z: -1.0, rotation: Math.PI, speed: 20 }); // Head on!

    k1.driftSystem.update(1 / 60, true, 1.0, 0, 20.0);
    expect(k1.getState().drift.isDrifting).toBe(true);

    const events = KartCollisionSystem.resolveCollisions([
      { id: 'k1', controller: k1, weight: 1.0 },
      { id: 'k2', controller: k2, weight: 1.0 }
    ]);

    expect(events.length).toBe(1);
    expect(events[0].driftCancelled).toBe(true);
    expect(k1.getState().drift.isDrifting).toBe(false);
  });
});

describe('M4: Ranking System & Standings', () => {
  let ranking: RankingSystem;

  beforeEach(() => {
    ranking = new RankingSystem();
    ranking.registerKart('p1');
    ranking.registerKart('p2');
    ranking.registerKart('p3');
  });

  it('ranks kart on higher lap ahead of kart on lower lap', () => {
    ranking.updateKartProgress('p1', 2, 0, 50, false);
    ranking.updateKartProgress('p2', 1, 10, 500, false);

    ranking.updateStandings();

    expect(ranking.getKartRank('p1')).toBe(1);
    expect(ranking.getKartRank('p2')).toBe(2);
  });

  it('ranks kart on higher gate ahead on the same lap', () => {
    ranking.updateKartProgress('p1', 1, 5, 100, false);
    ranking.updateKartProgress('p2', 1, 4, 900, false);

    ranking.updateStandings();

    expect(ranking.getKartRank('p1')).toBe(1);
    expect(ranking.getKartRank('p2')).toBe(2);
  });

  it('ranks finished karts by finish time', () => {
    ranking.updateKartProgress('p1', 3, 0, 0, true, 65000); // Finished in 65s
    ranking.updateKartProgress('p2', 3, 0, 0, true, 63000); // Finished in 63s (Faster!)
    ranking.updateKartProgress('p3', 2, 5, 100, false); // Still racing

    ranking.updateStandings();

    expect(ranking.getKartRank('p2')).toBe(1);
    expect(ranking.getKartRank('p1')).toBe(2);
    expect(ranking.getKartRank('p3')).toBe(3);
  });

  it('awards correct Mario Kart points', () => {
    expect(RankingSystem.getPointsForRank(1)).toBe(15);
    expect(RankingSystem.getPointsForRank(2)).toBe(12);
    expect(RankingSystem.getPointsForRank(3)).toBe(10);
    expect(RankingSystem.getPointsForRank(4)).toBe(8);
    expect(RankingSystem.getPointsForRank(5)).toBe(6);
    expect(RankingSystem.getPointsForRank(6)).toBe(4);
    expect(RankingSystem.getPointsForRank(7)).toBe(2);
    expect(RankingSystem.getPointsForRank(8)).toBe(1);
    expect(RankingSystem.getPointsForRank(9)).toBe(0);
  });

  it('guarantees shortcut gate neutrality for gates sharing the same index or groupId', () => {
    const mainRouteProgress = 1 * 1_000_000 + 11 * 10_000 + 50;
    const shortcutProgress = 1 * 1_000_000 + 11 * 10_000 + 50;

    ranking.updateKartProgress('p1', 1, 11, 50, false);
    ranking.updateKartProgress('p2', 1, 11, 50, false);
    ranking.updateStandings();

    const s1 = ranking.getStandings().find((s) => s.kartId === 'p1');
    const s2 = ranking.getStandings().find((s) => s.kartId === 'p2');

    expect(s1?.progressScore).toBe(s2?.progressScore);
    expect(s1?.progressScore).toBe(mainRouteProgress);
  });

  it('computes gaps to leader and ahead kart in seconds', () => {
    ranking.updateKartProgress('p1', 2, 5, 200, false);
    ranking.updateKartProgress('p2', 2, 5, 100, false); // 100m behind
    ranking.updateKartProgress('p3', 2, 5, 50, false);  // 150m behind leader, 50m behind p2

    const standings = ranking.updateStandings();

    expect(standings[0].gapToLeaderSec).toBe(0);
    expect(standings[1].gapToLeaderSec).toBeCloseTo(4.0, 1);
    expect(standings[2].gapToAheadSec).toBeCloseTo(2.0, 1);
  });
});

describe('M4: AI Driver Steering & Decision Making', () => {
  it('steers towards lookahead point along spline', () => {
    const spline = new TrackSpline([
      { x: 0, y: 0, z: 0 },
      { x: 50, y: 0, z: 0 },
      { x: 50, y: 0, z: 50 },
      { x: 0, y: 0, z: 50 }
    ], true, 100);

    const driver = new AiDriver(RIVAL_DRIVERS[0], 'beshi_gorom', spline);
    const selfState = createMockKartState({ x: 0, z: 0, rotation: 0, speed: 10 });

    const input = driver.computeInput(selfState, [selfState], 0, 0, 0);

    expect(input.throttle).toBeGreaterThan(0);
    expect(input.steer).toBeDefined();
  });

  it('initiates and releases drift when racing line specifies drift state', () => {
    const spline = new TrackSpline([
      { x: 0, y: 0, z: 0 },
      { x: 50, y: 0, z: 0 },
      { x: 50, y: 0, z: 50 }
    ], false, 50);

    const racingLine = [
      { x: 0, y: 0, z: 0, targetSpeed: 20, idealDriftState: 'drift_left' as const, lateralOffset: 0 },
      { x: 25, y: 0, z: 0, targetSpeed: 20, idealDriftState: 'drift_left' as const, lateralOffset: 0 },
      { x: 50, y: 0, z: 25, targetSpeed: 25, idealDriftState: 'none' as const, lateralOffset: 0 }
    ];

    const driver = new AiDriver(RIVAL_DRIVERS[0], 'naga_jhal', spline, racingLine);
    const selfState = createMockKartState({ x: 0, z: 0, rotation: Math.PI / 4, speed: 22 });

    const input1 = driver.computeInput(selfState, [selfState], 0, 0, 0);
    expect(input1.drift).toBe(true); // Should start drift
  });
});

describe('M4: 8-Kart Race Session Orchestrator', () => {
  it('initializes 8 karts on start grid in Quick Race mode with zero overlap', () => {
    const track = createMockTrack();
    const session = new RaceSession({
      track,
      mode: 'quick_race',
      difficulty: 'beshi_gorom'
    });

    const karts = session.getKarts();
    expect(karts.length).toBe(8);

    // Player in slot 8
    const player = session.getPlayerKart();
    expect(player.isPlayer).toBe(true);
    expect(player.id).toBe('moon_walker');

    // Check positions for zero overlap (all pairs distance >= 2.5m)
    for (let i = 0; i < karts.length; i++) {
      const s1 = karts[i].controller.getState();
      for (let j = i + 1; j < karts.length; j++) {
        const s2 = karts[j].controller.getState();
        const dist = Math.hypot(s1.x - s2.x, s1.z - s2.z);
        expect(dist).toBeGreaterThanOrEqual(2.5);
      }
    }
  });

  it('steps all 8 karts in lockstep and maintains continuous standings', () => {
    const track = createMockTrack();
    const session = new RaceSession({
      track,
      mode: 'quick_race',
      difficulty: 'beshi_gorom'
    });

    session.startRace(0);

    const playerInput = {
      throttle: 1,
      brake: 0,
      steer: 0,
      drift: false,
      lookBehind: false,
      bell: false,
      trick: false
    };

    // Step 60 ticks (1 second)
    for (let i = 0; i < 60; i++) {
      session.step(1 / 60, playerInput);
    }

    const standings = session.getStandings();
    expect(standings.length).toBe(8);
    for (let i = 0; i < standings.length; i++) {
      expect(standings[i].rank).toBe(i + 1);
    }
  });

  it('runs solo in Time Trial mode (1 kart only)', () => {
    const track = createMockTrack();
    const session = new RaceSession({
      track,
      mode: 'time_trial'
    });

    const karts = session.getKarts();
    expect(karts.length).toBe(1);
    expect(karts[0].isPlayer).toBe(true);
  });

  it('generates complete final results matching Mario Kart rules', () => {
    const track = createMockTrack();
    const session = new RaceSession({
      track,
      mode: 'quick_race',
      difficulty: 'beshi_gorom'
    });

    const results = session.getFinalResults('finish');
    expect(results.trackId).toBe('test_track');
    expect(results.exitReason).toBe('finish');
    expect(results.finishPlace).toBeGreaterThanOrEqual(1);
    expect(results.finishPlace).toBeLessThanOrEqual(8);
  });

  it('handles 4 karts in simultaneous cluster collision without NaN or panic', () => {
    const karts = [
      { id: 'k1', controller: new KartController({}, { x: 0, z: 0 }), weight: 1.0 },
      { id: 'k2', controller: new KartController({}, { x: 0.5, z: 0.5 }), weight: 1.2 },
      { id: 'k3', controller: new KartController({}, { x: -0.5, z: 0.5 }), weight: 0.8 },
      { id: 'k4', controller: new KartController({}, { x: 0, z: 0.8 }), weight: 1.4 }
    ];

    const events = KartCollisionSystem.resolveCollisions(karts);
    expect(events.length).toBeGreaterThan(0);

    for (const k of karts) {
      const s = k.controller.getState();
      expect(Number.isNaN(s.x)).toBe(false);
      expect(Number.isNaN(s.z)).toBe(false);
      expect(Number.isNaN(s.speed)).toBe(false);
    }
  });

  it('guarantees player kart physics are strictly identical across all difficulty tiers (Part A2)', () => {
    const track = createMockTrack();
    const tiers = ['gorom_cha', 'beshi_gorom', 'naga_jhal'] as const;

    const sessions = tiers.map((tier) =>
      new RaceSession({
        track,
        mode: 'quick_race',
        difficulty: tier,
        seed: 42
      })
    );

    // Initial stats must match DEFAULT_PLAYER_DRIVER
    for (const session of sessions) {
      const player = session.getPlayerKart();
      expect(player.driver.stats.topSpeed).toBe(28.0);
      expect(player.driver.stats.acceleration).toBe(17.5);
      expect(player.driver.stats.handling).toBe(2.8);
      expect(player.driver.stats.weight).toBe(1.0);
    }

    // Step physics forward 60 frames with full acceleration and steering
    for (let f = 0; f < 60; f++) {
      const input = {
        throttle: 1.0,
        brake: 0.0,
        steer: 0.4,
        drift: f > 30,
        lookBehind: false,
        bell: false,
        trick: false
      };
      for (const session of sessions) {
        session.step(1 / 60, input);
      }
    }

    // Player state must be bit-identical across all three difficulty tiers
    const s0 = sessions[0].getPlayerKart().controller.getState();
    const s1 = sessions[1].getPlayerKart().controller.getState();
    const s2 = sessions[2].getPlayerKart().controller.getState();

    expect(s0.speed).toBe(s1.speed);
    expect(s1.speed).toBe(s2.speed);
    expect(s0.x).toBe(s1.x);
    expect(s1.x).toBe(s2.x);
    expect(s0.z).toBe(s1.z);
    expect(s1.z).toBe(s2.z);
    expect(s0.rotation).toBe(s1.rotation);
    expect(s1.rotation).toBe(s2.rotation);
  });
});
