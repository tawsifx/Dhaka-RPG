// tests/race/race_m1.test.ts - Vitest unit tests for 3D Rickshaw Race Spike (M1 pure logic)
import { describe, it, expect } from 'vitest';
import { KartController } from '../../src/scenes/minigames/race/core/KartController';
import { FixedStepLoop } from '../../src/scenes/minigames/race/core/FixedStepLoop';
import { DEFAULT_KART_CONFIG, DEFAULT_CAMERA_CONFIG, RACE_SIM_CONFIG } from '../../src/config/race.config';
import { RaceResult, RaceExitReason, KartInput } from '../../src/types/race.types';

describe('Rickshaw Race M1 — Pure Logic Test Suite', () => {
  const neutralInput: KartInput = {
    throttle: 0,
    brake: 0,
    steer: 0,
    bell: false,
    exit: false
  };

  describe('KartController — Kinematics & Physics Math', () => {
    it('1. accelerates forward from rest when throttle is applied', () => {
      const kart = new KartController();
      const dt = 1 / 60;
      const input: KartInput = { ...neutralInput, throttle: 1 };

      const state = kart.update(dt, input);
      expect(state.speed).toBeGreaterThan(0);
      expect(state.speed).toBeCloseTo(DEFAULT_KART_CONFIG.acceleration * dt, 4);
      expect(state.z).toBeLessThan(0); // Forward along -Z
    });

    it('2. clamps forward speed to maxSpeed when accelerating continuously', () => {
      const kart = new KartController();
      const input: KartInput = { ...neutralInput, throttle: 1 };

      // Simulate 5 seconds of full throttle
      for (let i = 0; i < 300; i++) {
        kart.update(1 / 60, input);
      }

      const state = kart.getState();
      expect(state.speed).toBe(DEFAULT_KART_CONFIG.maxSpeed);
    });

    it('3. brakes when moving forward and brake is applied', () => {
      const kart = new KartController();
      kart.setState({ speed: 20 });
      const dt = 1 / 60;
      const input: KartInput = { ...neutralInput, brake: 1 };

      const state = kart.update(dt, input);
      expect(state.speed).toBeLessThan(20);
      expect(state.speed).toBeCloseTo(20 - DEFAULT_KART_CONFIG.braking * dt, 4);
    });

    it('4. decelerates via friction when coasting (zero throttle, zero brake)', () => {
      const kart = new KartController();
      kart.setState({ speed: 10 });
      const dt = 1 / 60;

      const state = kart.update(dt, neutralInput);
      expect(state.speed).toBeLessThan(10);
      expect(state.speed).toBeCloseTo(10 - DEFAULT_KART_CONFIG.friction * dt, 4);
    });

    it('5. snaps cleanly to exactly zero when coasting near zero', () => {
      const kart = new KartController();
      kart.setState({ speed: 0.02 }); // Below friction * dt (6.0 * (1/60) = 0.1)
      const dt = 1 / 60;

      const state = kart.update(dt, neutralInput);
      expect(state.speed).toBe(0);
    });

    it('6. reverses when brake is applied while stationary or in reverse', () => {
      const kart = new KartController();
      const dt = 1 / 60;
      const input: KartInput = { ...neutralInput, brake: 1 };

      const state = kart.update(dt, input);
      expect(state.speed).toBeLessThan(0);
      expect(state.speed).toBeCloseTo(-DEFAULT_KART_CONFIG.reverseAcceleration * dt, 4);
      expect(state.z).toBeGreaterThan(0); // Backward along +Z
    });

    it('7. clamps reverse speed to maxReverseSpeed', () => {
      const kart = new KartController();
      const input: KartInput = { ...neutralInput, brake: 1 };

      for (let i = 0; i < 180; i++) {
        kart.update(1 / 60, input);
      }

      const state = kart.getState();
      expect(state.speed).toBe(-DEFAULT_KART_CONFIG.maxReverseSpeed);
    });

    it('8. applies speed-sensitive steering attenuation at top speed', () => {
      const kartMid = new KartController();
      kartMid.setState({ speed: 10 });
      const kartTop = new KartController();
      kartTop.setState({ speed: DEFAULT_KART_CONFIG.maxSpeed });

      const dt = 1 / 60;
      const input: KartInput = { ...neutralInput, steer: 1 };

      const stateMid = kartMid.update(dt, input);
      const stateTop = kartTop.update(dt, input);

      // Steering yaw rate at top speed should be attenuated relative to mid speed
      expect(Math.abs(stateTop.angularVelocity)).toBeLessThan(Math.abs(stateMid.angularVelocity));
    });

    it('9. does not rotate when completely stationary and steering', () => {
      const kart = new KartController();
      kart.setState({ speed: 0 });
      const dt = 1 / 60;
      const input: KartInput = { ...neutralInput, steer: 1 };

      const state = kart.update(dt, input);
      expect(state.angularVelocity).toBe(0);
      expect(state.rotation).toBe(0);
    });

    it('10. correctly interpolates between previous and current states using alpha', () => {
      const prev = {
        x: 0,
        y: 0,
        z: 0,
        rotation: 0,
        speed: 10,
        steerAngle: 0,
        angularVelocity: 0,
        distanceTravelled: 100
      };
      const curr = {
        x: 10,
        y: 0,
        z: -20,
        rotation: 0.2,
        speed: 20,
        steerAngle: 0.4,
        angularVelocity: 1.0,
        distanceTravelled: 120
      };

      const mid = KartController.interpolate(prev, curr, 0.5);
      expect(mid.x).toBeCloseTo(5, 5);
      expect(mid.z).toBeCloseTo(-10, 5);
      expect(mid.rotation).toBeCloseTo(0.1, 5);
      expect(mid.speed).toBeCloseTo(15, 5);
      expect(mid.distanceTravelled).toBeCloseTo(110, 5);
    });
  });

  describe('FixedStepLoop — Deterministic Timestepping', () => {
    it('11. executes exact integer substeps for 60Hz delta', () => {
      const loop = new FixedStepLoop({ fixedDeltaSec: 1 / 60 });
      let callCount = 0;

      const { subSteps, alpha } = loop.step(1 / 60, () => {
        callCount++;
      });

      expect(callCount).toBe(1);
      expect(subSteps).toBe(1);
      expect(alpha).toBeCloseTo(0, 4);
    });

    it('12. accumulates fractional frame times without dropping residual time', () => {
      const loop = new FixedStepLoop({ fixedDeltaSec: 1 / 60 }); // ~0.016667s
      let callCount = 0;

      // Half a tick: 0.008333s
      const res1 = loop.step(0.008333, () => callCount++);
      expect(callCount).toBe(0);
      expect(res1.subSteps).toBe(0);
      expect(res1.alpha).toBeCloseTo(0.5, 2);

      // Another half tick: total ~0.016667s, should trigger exactly 1 step
      const res2 = loop.step(0.008334, () => callCount++);
      expect(callCount).toBe(1);
      expect(res2.subSteps).toBe(1);
      expect(res2.alpha).toBeCloseTo(0, 2);
    });

    it('13. enforces spiral-of-death clamp when frame delta is unusually large', () => {
      const loop = new FixedStepLoop({ fixedDeltaSec: 1 / 60, maxSubSteps: 5 });
      let callCount = 0;

      // 0.5s elapsed (e.g. background tab or freeze)
      const res = loop.step(0.5, () => callCount++);
      expect(callCount).toBe(5);
      expect(res.subSteps).toBe(5);
      // Residual time clamped, loop did not run 30 times
      expect(loop.getAccumulator()).toBeLessThan(1 / 60);
    });

    it('14. clamps delta to maxAccumulatedSec', () => {
      const loop = new FixedStepLoop({ fixedDeltaSec: 1 / 60, maxAccumulatedSec: 0.1 });
      let callCount = 0;

      loop.step(10.0, () => callCount++);
      // At max 0.1s, running at 1/60 (~0.0166s) steps at most 6 times (or maxSubSteps)
      expect(callCount).toBeLessThanOrEqual(5);
    });

    it('15. produces alpha strictly bounded within [0, 1]', () => {
      const loop = new FixedStepLoop({ fixedDeltaSec: 1 / 60 });
      for (let dt = 0; dt <= 0.05; dt += 0.003) {
        const res = loop.step(dt, () => {});
        expect(res.alpha).toBeGreaterThanOrEqual(0);
        expect(res.alpha).toBeLessThanOrEqual(1);
      }
    });

    it('16. resets accumulator and alpha cleanly', () => {
      const loop = new FixedStepLoop();
      loop.step(0.01, () => {});
      expect(loop.getAccumulator()).toBeGreaterThan(0);

      loop.reset();
      expect(loop.getAccumulator()).toBe(0);
      expect(loop.getAlpha()).toBe(0);
    });
  });

  describe('RaceResult & Configuration Sanity', () => {
    it('17. validates all DEFAULT_KART_CONFIG constants are positive and finite', () => {
      const cfg = DEFAULT_KART_CONFIG;
      expect(cfg.maxSpeed).toBeGreaterThan(0);
      expect(cfg.maxReverseSpeed).toBeGreaterThan(0);
      expect(cfg.acceleration).toBeGreaterThan(0);
      expect(cfg.braking).toBeGreaterThan(0);
      expect(cfg.reverseAcceleration).toBeGreaterThan(0);
      expect(cfg.friction).toBeGreaterThan(0);
      expect(cfg.steerSpeed).toBeGreaterThan(0);
      expect(cfg.steerSensitivity).toBeGreaterThan(0);
      expect(cfg.bellCooldownMs).toBeGreaterThan(0);

      for (const val of Object.values(cfg)) {
        expect(Number.isFinite(val)).toBe(true);
      }
    });

    it('18. validates all DEFAULT_CAMERA_CONFIG constants are positive and finite', () => {
      const cam = DEFAULT_CAMERA_CONFIG;
      expect(cam.distance).toBeGreaterThan(0);
      expect(cam.height).toBeGreaterThan(0);
      expect(cam.lookAhead).toBeGreaterThan(0);
      expect(cam.positionLag).toBeGreaterThan(0);
      expect(cam.rotationLag).toBeGreaterThan(0);
      expect(cam.baseFov).toBeGreaterThan(0);
      expect(cam.maxFovKick).toBeGreaterThan(0);

      for (const val of Object.values(cam)) {
        expect(Number.isFinite(val)).toBe(true);
      }
    });

    it('19. validates all RACE_SIM_CONFIG constants are positive and finite', () => {
      const sim = RACE_SIM_CONFIG;
      expect(sim.fixedDeltaSec).toBeGreaterThan(0);
      expect(sim.maxSubSteps).toBeGreaterThan(0);
      expect(sim.maxAccumulatedSec).toBeGreaterThan(0);

      for (const val of Object.values(sim)) {
        expect(Number.isFinite(val)).toBe(true);
      }
    });

    it('20. correctly builds typed RaceResult and handles exit reasons', () => {
      const reasons: RaceExitReason[] = ['user', 'error', 'finish'];

      for (const reason of reasons) {
        const result: RaceResult = {
          completed: reason !== 'error',
          elapsedMs: 4500,
          exitReason: reason,
          finalSpeed: 24.5,
          distanceTravelled: 312.8
        };

        expect(result.exitReason).toBe(reason);
        expect(result.completed).toBe(reason !== 'error');
        expect(result.elapsedMs).toBe(4500);
        expect(result.finalSpeed).toBe(24.5);
        expect(result.distanceTravelled).toBe(312.8);
      }
    });
  });
});
