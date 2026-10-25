// tests/race/race_m2.test.ts - Milestone 2 Pure Logic Unit Test Suite (Drift, Turbo, Boost, Surfaces, Air, Collisions)
import { describe, it, expect, beforeEach } from 'vitest';
import { KartController } from '../../src/scenes/minigames/race/core/KartController';
import { DriftSystem } from '../../src/scenes/minigames/race/core/DriftSystem';
import { BoostSystem } from '../../src/scenes/minigames/race/core/BoostSystem';
import { AnalyticSurfaceModel, SURFACE_DEFINITIONS } from '../../src/scenes/minigames/race/core/SurfaceModel';
import { AirModel } from '../../src/scenes/minigames/race/core/AirModel';
import { AnalyticCollisionWorld } from '../../src/scenes/minigames/race/core/CollisionWorld';
import { StartCountdown } from '../../src/scenes/minigames/race/core/StartCountdown';
import { ReplayRecorder, ReplayData } from '../../src/scenes/minigames/race/debug/ReplayRecorder';
import {
  DEFAULT_KART_CONFIG,
  KART_ARCHETYPES,
  TUNING_PRESETS
} from '../../src/config/race.config';
import { RaceActionInput } from '../../src/types/race.types';

const neutralInput: RaceActionInput = {
  throttle: 0,
  brake: 0,
  steer: 0,
  drift: false,
  bell: false,
  lookBehind: false,
  trick: false,
  reset: false,
  exit: false
};

describe('Rickshaw Race M2 — Pure Gameplay Math & Systems Suite', () => {
  // ── A. Drift System & Mini-Turbo ──────────────────────────────────────────
  describe('DriftSystem (Hop, Slip Angle, 3-Tier Mini-Turbo)', () => {
    let drift: DriftSystem;

    beforeEach(() => {
      drift = new DriftSystem(DEFAULT_KART_CONFIG);
    });

    it('1. does not enter drift if speed is below minDriftSpeed', () => {
      const res = drift.update(1 / 60, true, 1.0, 0, 4.0, 1.0, false);
      expect(drift.isDrifting()).toBe(false);
      expect(res.released).toBe(false);
    });

    it('2. does not enter drift if steer input is near zero', () => {
      const res = drift.update(1 / 60, true, 0.05, 0, 15.0, 1.0, false);
      expect(drift.isDrifting()).toBe(false);
    });

    it('3. enters drift hop phase when steering above threshold with drift pressed', () => {
      drift.update(1 / 60, true, 0.8, 0, 15.0, 1.0, false);
      expect(drift.isDrifting()).toBe(true);
      expect(drift.isHopping()).toBe(true);
      expect(drift.getDirection()).toBe(1);
    });

    it('4. locks drift direction to the initial steer sign', () => {
      drift.update(1 / 60, true, -0.7, 0, 15.0, 1.0, false);
      expect(drift.getDirection()).toBe(-1);

      // Even if steering switches positive, drift direction remains locked
      drift.update(1 / 60, true, 0.9, 0, 15.0, 1.0, false);
      expect(drift.getDirection()).toBe(-1);
    });

    it('5. completes hop phase and lands with slip angle', () => {
      // Step past hopDuration (0.16s = ~10 frames at 60Hz)
      for (let i = 0; i < 12; i++) {
        drift.update(1 / 60, true, 0.8, 0, 18.0, 1.0, false);
      }
      expect(drift.isHopping()).toBe(false);
      expect(drift.getState().slipAngle).toBeGreaterThan(0);
    });

    it('6. accumulates drift charge when committing to steer', () => {
      // Step past hop
      for (let i = 0; i < 12; i++) {
        drift.update(1 / 60, true, 0.8, 0, 20.0, 1.0, false);
      }
      const initialCharge = drift.getState().charge;
      // Step 20 frames with steer in drift direction
      for (let i = 0; i < 20; i++) {
        drift.update(1 / 60, true, 0.9, 0, 20.0, 1.0, false);
      }
      expect(drift.getState().charge).toBeGreaterThan(initialCharge);
    });

    it('7. transitions from Tier 0 to Tier 1 (Blue sparks) at threshold', () => {
      for (let i = 0; i < 60; i++) {
        drift.update(1 / 60, true, 1.0, 0, 22.0, 1.0, false);
      }
      expect(drift.getState().tier).toBeGreaterThanOrEqual(1);
      expect(drift.getTierColor()).toBe('blue');
    });

    it('8. transitions to Tier 2 (Orange sparks) after sustained drift', () => {
      for (let i = 0; i < 120; i++) {
        drift.update(1 / 60, true, 1.0, 0, 22.0, 1.0, false);
      }
      expect(drift.getState().tier).toBeGreaterThanOrEqual(2);
      expect(drift.getTierColor()).toBe('orange');
    });

    it('9. transitions to Tier 3 (Purple sparks) at max charge', () => {
      for (let i = 0; i < 180; i++) {
        drift.update(1 / 60, true, 1.0, 0, 22.0, 1.0, false);
      }
      expect(drift.getState().tier).toBe(3);
      expect(drift.getTierColor()).toBe('purple');
    });

    it('10. releases Tier 1 boost when drift button released at Tier 1', () => {
      for (let i = 0; i < 60; i++) {
        drift.update(1 / 60, true, 1.0, 0, 22.0, 1.0, false);
      }
      expect(drift.getState().tier).toBe(1);

      // Release drift button
      const release = drift.update(1 / 60, false, 0, 0, 22.0, 1.0, false);
      expect(release.released).toBe(true);
      expect(release.tier).toBe(1);
      expect(release.boostSource).toBe('mini_turbo_t1');
      expect(drift.isDrifting()).toBe(false);
    });

    it('11. releases Tier 3 boost when drift released at Tier 3', () => {
      for (let i = 0; i < 180; i++) {
        drift.update(1 / 60, true, 1.0, 0, 22.0, 1.0, false);
      }
      const release = drift.update(1 / 60, false, 0, 0, 22.0, 1.0, false);
      expect(release.tier).toBe(3);
      expect(release.boostSource).toBe('mini_turbo_t3');
    });

    it('12. grants zero boost when released at Tier 0', () => {
      drift.update(1 / 60, true, 0.8, 0, 15.0, 1.0, false);
      const release = drift.update(1 / 60, false, 0, 0, 15.0, 1.0, false);
      expect(release.tier).toBe(0);
      expect(release.boostSource).toBeNull();
      expect(release.boostStrength).toBe(0);
    });

    it('13. cancels drift immediately if brake is applied', () => {
      for (let i = 0; i < 60; i++) {
        drift.update(1 / 60, true, 1.0, 0, 22.0, 1.0, false);
      }
      expect(drift.isDrifting()).toBe(true);

      const cancel = drift.update(1 / 60, true, 1.0, 0.8, 22.0, 1.0, false);
      expect(drift.isDrifting()).toBe(false);
      expect(cancel.released).toBe(false);
    });

    it('14. cancels drift if speed drops below minDriftSpeed', () => {
      drift.update(1 / 60, true, 1.0, 0, 15.0, 1.0, false);
      expect(drift.isDrifting()).toBe(true);

      drift.update(1 / 60, true, 1.0, 0, 2.0, 1.0, false);
      expect(drift.isDrifting()).toBe(false);
    });

    it('15. cancels drift if kart becomes airborne', () => {
      drift.update(1 / 60, true, 1.0, 0, 15.0, 1.0, false);
      expect(drift.isDrifting()).toBe(true);

      drift.update(1 / 60, true, 1.0, 0, 15.0, 1.0, true);
      expect(drift.isDrifting()).toBe(false);
    });
  });

  // ── B. Boost System ───────────────────────────────────────────────────────
  describe('BoostSystem (Priority, Duration Extension & Max Cap)', () => {
    let boost: BoostSystem;

    beforeEach(() => {
      boost = new BoostSystem();
    });

    it('16. activates boost state with correct strength and duration', () => {
      boost.applyBoost('mini_turbo_t1', 0.25, 0.8);
      expect(boost.isActive()).toBe(true);
      expect(boost.getStrength()).toBe(0.25);
      expect(boost.getSource()).toBe('mini_turbo_t1');
    });

    it('17. decreases remaining duration on update', () => {
      boost.applyBoost('boost_pad', 0.8, 1.0);
      boost.update(0.4);
      expect(boost.getRemainingSec()).toBeCloseTo(0.6, 2);
      expect(boost.isActive()).toBe(true);
    });

    it('18. expires cleanly to inactive when duration elapsed', () => {
      boost.applyBoost('mini_turbo_t1', 0.25, 0.5);
      boost.update(0.6);
      expect(boost.isActive()).toBe(false);
      expect(boost.getStrength()).toBe(0);
      expect(boost.getSource()).toBeNull();
    });

    it('19. stronger boost preempts active weaker boost', () => {
      boost.applyBoost('mini_turbo_t1', 0.25, 1.0);
      boost.applyBoost('mini_turbo_t3', 0.60, 2.0);
      expect(boost.getStrength()).toBe(0.60);
      expect(boost.getSource()).toBe('mini_turbo_t3');
    });

    it('20. weaker boost does not downgrade active stronger boost', () => {
      boost.applyBoost('mini_turbo_t3', 0.60, 2.0);
      boost.applyBoost('mini_turbo_t1', 0.25, 0.8);
      expect(boost.getStrength()).toBe(0.60);
      expect(boost.getSource()).toBe('mini_turbo_t3');
    });

    it('21. caps duration stacking at 3.5 seconds', () => {
      boost.applyBoost('boost_pad', 0.8, 2.0);
      boost.applyBoost('boost_pad', 0.8, 2.5);
      expect(boost.getRemainingSec()).toBeLessThanOrEqual(3.5);
    });

    it('22. reset() immediately terminates active boost', () => {
      boost.applyBoost('mini_turbo_t2', 0.40, 1.5);
      boost.reset();
      expect(boost.isActive()).toBe(false);
      expect(boost.getStrength()).toBe(0);
    });
  });

  // ── C. Surface Model ──────────────────────────────────────────────────────
  describe('AnalyticSurfaceModel (Zones, Multipliers & Shielding)', () => {
    let surface: AnalyticSurfaceModel;

    beforeEach(() => {
      surface = new AnalyticSurfaceModel();
    });

    it('23. queries start position (0, 0) as asphalt', () => {
      const q = surface.query(0, 0);
      expect(q.type).toBe('asphalt');
      expect(q.speedMultiplier).toBe(1.0);
      expect(q.frictionMultiplier).toBe(1.0);
    });

    it('24. queries infield (18, 0) as grass', () => {
      const q = surface.query(18, 0);
      expect(q.type).toBe('grass');
      expect(q.speedMultiplier).toBe(SURFACE_DEFINITIONS.grass.speedMultiplier);
      expect(q.frictionMultiplier).toBe(SURFACE_DEFINITIONS.grass.frictionMultiplier);
    });

    it('25. queries south curve run-off as mud', () => {
      const q = surface.query(36, 70);
      expect(q.type).toBe('mud');
      expect(q.speedMultiplier).toBe(SURFACE_DEFINITIONS.mud.speedMultiplier);
    });

    it('26. queries north chicane as puddle', () => {
      const q = surface.query(18, -55);
      expect(q.type).toBe('puddle');
      expect(q.steerMultiplier).toBe(SURFACE_DEFINITIONS.puddle.steerMultiplier);
    });

    it('27. queries boost pad zone and triggers isBoostPad flag', () => {
      const q = surface.query(0, -20);
      expect(q.isBoostPad).toBe(true);
    });

    it('28. respects manual surface override when set', () => {
      surface.setOverride('mud');
      const q = surface.query(0, 0);
      expect(q.type).toBe('mud');
      surface.setOverride(null);
      const qReset = surface.query(0, 0);
      expect(qReset.type).toBe('asphalt');
    });

    it('29. enforces boost pad cooldowns to prevent double triggers', () => {
      const q1 = surface.query(0, -20);
      expect(q1.isBoostPad).toBe(true);
      // Immediate second query should not trigger boost pad flag
      const q2 = surface.query(0, -20);
      expect(q2.isBoostPad).toBe(false);
      // Advance cooldown by 1.5s
      surface.updateCooldowns(1.5);
      const q3 = surface.query(0, -20);
      expect(q3.isBoostPad).toBe(true);
    });
  });

  // ── D. Air Model & Ramps ──────────────────────────────────────────────────
  describe('AirModel (Ramps, Gravity Arc, Tricks & Landing)', () => {
    let air: AirModel;

    beforeEach(() => {
      air = new AirModel(DEFAULT_KART_CONFIG);
    });

    it('30. is grounded by default at y = 0', () => {
      expect(air.isAirborne()).toBe(false);
      expect(air.getHeight()).toBe(0);
    });

    it('31. launches off ramp into airborne trajectory with vertical velocity', () => {
      air.launch(20.0, 0.3); // 20 m/s at ~17 deg
      expect(air.isAirborne()).toBe(true);
      expect(air.getState().verticalVelocity).toBeGreaterThan(0);
    });

    it('32. applies gravity to parabolic arc until descending', () => {
      air.launch(20.0, 0.3);
      const initialVy = air.getState().verticalVelocity;
      air.update(0.2, false);
      expect(air.getState().verticalVelocity).toBeLessThan(initialVy);
    });

    it('33. performs air trick when trick input is pressed in air', () => {
      air.launch(25.0, 0.35);
      air.update(0.05, false);
      const res = air.update(0.05, true);
      expect(res.trickAttempted).toBe(true);
      expect(air.getState().trickActive).toBe(true);
    });

    it('34. cleanly detects landing and reports trickSuccess for landing boost', () => {
      air.launch(15.0, 0.2);
      air.update(0.05, true); // execute trick
      // Step until kart lands back on ground (y <= 0)
      let landed = false;
      let trickSuccess = false;
      for (let i = 0; i < 60; i++) {
        const res = air.update(1 / 60, false);
        if (res.landed) {
          landed = true;
          trickSuccess = res.trickSuccess;
          break;
        }
      }
      expect(landed).toBe(true);
      expect(trickSuccess).toBe(true);
      expect(air.isAirborne()).toBe(false);
      expect(air.getHeight()).toBe(0);
    });

    it('35. does not award trick boost if no trick was executed in air', () => {
      air.launch(15.0, 0.2);
      let landed = false;
      let trickSuccess = false;
      for (let i = 0; i < 60; i++) {
        const res = air.update(1 / 60, false);
        if (res.landed) {
          landed = true;
          trickSuccess = res.trickSuccess;
          break;
        }
      }
      expect(landed).toBe(true);
      expect(trickSuccess).toBe(false);
    });
  });

  // ── E. Collision World ────────────────────────────────────────────────────
  describe('AnalyticCollisionWorld (Glancing Slide vs Head-on Bounce)', () => {
    let world: AnalyticCollisionWorld;

    beforeEach(() => {
      world = new AnalyticCollisionWorld(DEFAULT_KART_CONFIG);
    });

    it('36. returns no collision for kart in open track space', () => {
      const res = world.resolve(0, 0, 1.2, 0, 20.0);
      expect(res.collided).toBe(false);
      expect(res.resolvedSpeed).toBe(20.0);
    });

    it('37. resolves boundary collision pushing kart back inside bounds', () => {
      // Near minX = -200
      const res = world.resolve(-199.5, 0, 1.2, 0, 15.0);
      expect(res.collided).toBe(true);
      expect(res.newX).toBeGreaterThanOrEqual(-198.8);
    });

    it('38. bounces head-on collision and drops forward speed', () => {
      // Drive directly into obstacle at (-18, 0)
      const res = world.resolve(-18, 1.5, 1.2, 0, 20.0);
      expect(res.collided).toBe(true);
      expect(res.bounce).toBe(true);
      expect(res.resolvedSpeed).toBeLessThan(20.0);
    });

    it('39. allows glancing slide without hard bounce', () => {
      // Glancing trajectory past pillar
      const res = world.resolve(-16.5, 0, 1.2, 0, 20.0);
      if (res.collided) {
        expect(res.bounce).toBe(false);
        expect(res.resolvedSpeed).toBeGreaterThan(15.0);
      } else {
        expect(res.collided).toBe(false);
      }
    });
  });

  // ── F. Start Countdown & Rocket Start ─────────────────────────────────────
  describe('StartCountdown (3-2-1-GO & Rocket Start Timing Window)', () => {
    let countdown: StartCountdown;

    beforeEach(() => {
      countdown = new StartCountdown(DEFAULT_KART_CONFIG);
    });

    it('40. allows driving by default before start() is initiated', () => {
      expect(countdown.isDrivingAllowed()).toBe(true);
    });

    it('41. blocks driving once start() is initiated', () => {
      countdown.start();
      expect(countdown.isDrivingAllowed()).toBe(false);
      expect(countdown.getState().phase).toBe('ready');
      expect(countdown.getState().count).toBe(3);
    });

    it('42. counts 3 -> 2 -> 1 -> GO', () => {
      countdown.start();
      countdown.update(1.1, 0); // t = 1.1s -> count 2
      expect(countdown.getState().count).toBe(2);
      countdown.update(1.0, 0); // t = 2.1s -> count 1
      expect(countdown.getState().count).toBe(1);
      const resGo = countdown.update(1.0, 0); // t = 3.1s -> GO!
      expect(resGo.justSaidGo).toBe(true);
      expect(countdown.getState().phase).toBe('go');
      expect(countdown.isDrivingAllowed()).toBe(true);
    });

    it('43. triggers rocket start boost when pressing accelerate in perfect window', () => {
      countdown.start();
      countdown.update(2.9, 0); // just before GO (inside window)
      const res = countdown.update(0.15, 1.0); // hit throttle in window around 3.0s
      expect(res.startBoostTriggered).toBe(true);
      expect(res.stallTriggered).toBe(false);
    });

    it('44. stalls and applies spin-out penalty when pressing throttle too early', () => {
      countdown.start();
      countdown.update(1.5, 0.8); // hit throttle way too early at count 2
      const res = countdown.update(1.6, 0.8); // reach GO
      expect(res.stallTriggered).toBe(true);
      expect(countdown.isStalled()).toBe(true);
      expect(countdown.isDrivingAllowed()).toBe(false);
    });

    it('45. recovers from stall after countdownStallDurationSec elapses', () => {
      countdown.start();
      countdown.update(1.5, 0.8); // early throttle
      countdown.update(1.6, 0.8); // trigger stall at GO
      expect(countdown.isStalled()).toBe(true);

      // Advance past stall penalty
      countdown.update(DEFAULT_KART_CONFIG.countdownStallDurationSec + 0.1, 0);
      expect(countdown.isStalled()).toBe(false);
      expect(countdown.isDrivingAllowed()).toBe(true);
    });
  });

  // ── G. Replay Recorder & Determinism ──────────────────────────────────────
  describe('ReplayRecorder & Determinism', () => {
    it('46. records frames and exports valid JSON replay data', () => {
      const recorder = new ReplayRecorder();
      recorder.startRecording('balanced');
      recorder.recordFrame(1 / 60, { ...neutralInput, throttle: 1 });
      recorder.recordFrame(1 / 60, { ...neutralInput, throttle: 1, steer: 0.5 });
      const json = recorder.exportJSON();

      const parsed = ReplayRecorder.parseJSON(json);
      expect(parsed.version).toBe(2);
      expect(parsed.frameCount).toBe(2);
      expect(parsed.archetypeId).toBe('balanced');
    });

    it('47. executes identical inputs deterministically to produce bit-exact final state', () => {
      const kart1 = new KartController();
      const kart2 = new KartController();

      const frames = [
        { dt: 1 / 60, input: { ...neutralInput, throttle: 1 } },
        { dt: 1 / 60, input: { ...neutralInput, throttle: 1, steer: 0.8, drift: true } },
        { dt: 1 / 60, input: { ...neutralInput, throttle: 1, steer: 0.8, drift: true } },
        { dt: 1 / 60, input: { ...neutralInput, throttle: 1, steer: 0.8, drift: true } },
        { dt: 1 / 60, input: { ...neutralInput, throttle: 1, steer: 0, drift: false } },
        { dt: 1 / 60, input: { ...neutralInput, throttle: 0, brake: 1 } }
      ];

      const replay: ReplayData = {
        version: 2,
        recordedAt: 'test',
        archetypeId: 'balanced',
        frameCount: frames.length,
        frames
      };

      const finalState1 = ReplayRecorder.playHeadless(kart1, replay);
      const finalState2 = ReplayRecorder.playHeadless(kart2, replay);

      expect(finalState1.x).toBe(finalState2.x);
      expect(finalState1.y).toBe(finalState2.y);
      expect(finalState1.z).toBe(finalState2.z);
      expect(finalState1.speed).toBe(finalState2.speed);
      expect(finalState1.rotation).toBe(finalState2.rotation);
    });
  });

  // ── H. Kart Archetypes & Configuration Sanity ─────────────────────────────
  describe('KartStats Archetypes & Configuration Sanity', () => {
    it('48. proves archetype differences (Light has higher accel, Heavy has higher top speed)', () => {
      const light = KART_ARCHETYPES.light;
      const balanced = KART_ARCHETYPES.balanced;
      const heavy = KART_ARCHETYPES.heavy;

      expect(light.acceleration).toBeGreaterThan(balanced.acceleration);
      expect(balanced.acceleration).toBeGreaterThan(heavy.acceleration);

      expect(heavy.topSpeed).toBeGreaterThan(balanced.topSpeed);
      expect(balanced.topSpeed).toBeGreaterThan(light.topSpeed);

      expect(light.driftChargeMultiplier).toBeGreaterThan(heavy.driftChargeMultiplier);
    });

    it('49. validates mini-turbo tier charge thresholds are strictly ascending', () => {
      const cfg = DEFAULT_KART_CONFIG;
      expect(cfg.tier1Threshold).toBeLessThan(cfg.tier2Threshold);
      expect(cfg.tier2Threshold).toBeLessThan(cfg.tier3Threshold);
    });

    it('50. validates mini-turbo boost strengths are strictly ascending', () => {
      const cfg = DEFAULT_KART_CONFIG;
      expect(cfg.tier1BoostStrength).toBeLessThan(cfg.tier2BoostStrength);
      expect(cfg.tier2BoostStrength).toBeLessThan(cfg.tier3BoostStrength);
      expect(cfg.tier1BoostDuration).toBeLessThan(cfg.tier2BoostDuration);
      expect(cfg.tier2BoostDuration).toBeLessThan(cfg.tier3BoostDuration);
    });

    it('51. validates all TUNING_PRESETS contain non-empty partial configs', () => {
      expect(Object.keys(TUNING_PRESETS).length).toBe(3);
      for (const [name, preset] of Object.entries(TUNING_PRESETS)) {
        expect(Object.keys(preset).length).toBeGreaterThan(3);
        for (const [key, val] of Object.entries(preset)) {
          expect(Number.isFinite(val)).toBe(true);
        }
      }
    });
  });
});
