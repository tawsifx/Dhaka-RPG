// src/scenes/minigames/race/ai/AiDriver.ts - Pure, deterministic AI Driver using Racing Line & Pure Pursuit
import { DriverProfile, KartState, RaceActionInput, RacingLinePoint } from '../../../../types/race.types';
import { DifficultyConfig, DIFFICULTY_CONFIGS } from '../../../../config/drivers.race.db';
import { TrackSpline } from '../track/TrackSpline';
import { AiRng } from './AiRng';
import { AvoidanceSensors } from './AvoidanceSensors';
import { RubberBand } from './RubberBand';

export class AiDriver {
  readonly profile: DriverProfile;
  readonly difficulty: DifficultyConfig;
  private rng: AiRng;
  private spline: TrackSpline;
  private racingLine: RacingLinePoint[] = [];

  // Internal state
  private isDrifting = false;
  private driftDirection: -1 | 1 = 1;
  private mistakeTimer = 0;
  private mistakeBias = 0;
  private lastBellTime = 0;
  private targetIndex = 0;
  private currentT?: number;
  private stuckTimer = 0;
  private reverseTimer = 0;
  private reverseSteerDirection = 0.6;

  constructor(
    profile: DriverProfile,
    difficultyTier: keyof typeof DIFFICULTY_CONFIGS,
    spline: TrackSpline,
    racingLine: RacingLinePoint[] = [],
    seed = 42
  ) {
    this.profile = profile;
    this.difficulty = DIFFICULTY_CONFIGS[difficultyTier] || DIFFICULTY_CONFIGS.beshi_gorom;
    this.spline = spline;
    this.racingLine = racingLine;
    this.rng = new AiRng(seed);
  }

  setRacingLine(racingLine: RacingLinePoint[]): void {
    this.racingLine = racingLine;
  }

  computeInput(
    selfState: KartState,
    allKarts: KartState[],
    selfIndex: number,
    playerProgressMeters: number,
    currentTimeSec: number
  ): RaceActionInput {
    // 0. Anti-stuck reverse recovery
    if (this.reverseTimer > 0) {
      this.reverseTimer -= 1 / 60;
      return {
        throttle: 0,
        brake: 1.0,
        steer: this.reverseSteerDirection,
        drift: false,
        lookBehind: false,
        bell: false,
        trick: false
      };
    }

    if (Math.abs(selfState.speed) < 1.5 && selfState.distanceTravelled > 15) {
      this.stuckTimer += 1 / 60;
      if (this.stuckTimer > 0.6) {
        this.stuckTimer = 0;
        this.reverseTimer = 0.8;
      }
    } else {
      this.stuckTimer = 0;
    }

    // 1. Arc-length parameterized Spline Nearest Tracking
    const totalLen = this.spline.getTotalLength() || 1;
    const nearest = this.currentT === undefined
      ? this.spline.findNearest(selfState.x, selfState.y, selfState.z)
      : this.spline.findNearest(selfState.x, selfState.y, selfState.z, this.currentT, 35);
    this.currentT = nearest.t;

    // 2. Dynamic Lookahead Distance based on speed
    const lookaheadDist = Math.max(8.0, Math.min(18.0, 6.0 + 0.45 * Math.max(0, selfState.speed)));
    const targetT = (nearest.t + lookaheadDist / totalLen) % 1.0;
    const baseTargetPos = this.spline.getPoint(targetT);
    const targetTan = this.spline.getTangent(targetT);
    const targetNormal = { x: -targetTan.z, y: 0, z: targetTan.x };

    let targetPos = { ...baseTargetPos };
    let targetSpeed = 26.5;
    let idealDrift: 'none' | 'drift_left' | 'drift_right' = 'none';

    if (this.racingLine.length > 0) {
      const rlIdx = Math.floor(targetT * (this.racingLine.length - 1));
      const rlPt = this.racingLine[rlIdx];
      if (rlPt) {
        targetPos.x += targetNormal.x * (rlPt.lateralOffset * 0.7);
        targetPos.z += targetNormal.z * (rlPt.lateralOffset * 0.7);
        targetSpeed = rlPt.targetSpeed;
        idealDrift = rlPt.idealDriftState;
      }
    }

    // 3. Compute Steering Angle to Target
    // Kart forward is (-sin(rotation), -cos(rotation))
    const dx = targetPos.x - selfState.x;
    const dz = targetPos.z - selfState.z;
    const desiredHeading = Math.atan2(-dx, -dz);

    let angleDiff = desiredHeading - selfState.rotation;
    angleDiff = ((angleDiff + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;

    // Proportional steering with personality skill (negative heading error turns toward target)
    let steer = -angleDiff * 2.4 * this.profile.personality.skill;

    // 4. Avoidance Sensors
    const avoidance = AvoidanceSensors.evaluate(selfState, allKarts, selfIndex);
    steer += avoidance.steeringBias * this.profile.personality.aggression;

    // 5. Mistake Injection (Deterministic)
    if (this.mistakeTimer <= 0) {
      const mistakeChance = this.profile.personality.mistakeRate * this.difficulty.mistakeMultiplier * 0.005;
      if (this.rng.next() < mistakeChance) {
        this.mistakeTimer = this.rng.nextFloat(0.4, 1.2);
        this.mistakeBias = this.rng.nextFloat(-0.35, 0.35);
      }
    } else {
      this.mistakeTimer -= 1 / 60;
      steer += this.mistakeBias;
    }

    steer = Math.max(-1.0, Math.min(1.0, steer));

    // 6. Curvature anticipation: sample track direction 22m ahead to prepare for sharp bends
    const tanNow = this.spline.getTangent(this.currentT || 0);
    const lookaheadCurveT = ((this.currentT || 0) + 22.0 / totalLen) % 1.0;
    const tanAhead = this.spline.getTangent(lookaheadCurveT);
    const cornerBend = tanNow.x * tanAhead.x + tanNow.z * tanAhead.z;

    let maxSafeSpeed = targetSpeed;
    if (cornerBend < 0.5) {
      maxSafeSpeed = Math.min(maxSafeSpeed, 12.0);
    } else if (cornerBend < 0.75) {
      maxSafeSpeed = Math.min(maxSafeSpeed, 16.5);
    }

    // 7. Speed Control & Rubber-Banding
    const rubberBandMult = RubberBand.computeMultiplier(
      selfState.distanceTravelled,
      playerProgressMeters,
      false
    );

    const effectiveTargetSpeed =
      maxSafeSpeed * this.difficulty.speedMultiplier * rubberBandMult;

    let throttle = 1.0;
    let brake = 0.0;

    if (avoidance.brakeRecommended) {
      throttle = 0.2;
      brake = 0.6;
    } else if (selfState.speed > effectiveTargetSpeed + 1.0) {
      throttle = 0.0;
      brake = Math.min(1.0, (selfState.speed - effectiveTargetSpeed) / 3.0);
    } else if (Math.abs(angleDiff) > 0.40 && selfState.speed > 15.0) {
      throttle = 0.2;
      brake = 0.5;
    }

    // 7. Drift & Mini-Turbo Control
    let drift = false;
    const canDrift =
      this.difficulty.maxDriftTier > 0 &&
      selfState.speed > 16.0 &&
      this.profile.personality.driftiness > 0.3;

    if (canDrift) {
      if (!this.isDrifting) {
        // Initiate drift if corner demands it
        if (idealDrift !== 'none' && Math.abs(steer) > 0.25) {
          this.isDrifting = true;
          this.driftDirection = idealDrift === 'drift_left' ? -1 : 1;
          drift = true;
        }
      } else {
        // Currently drifting
        const currentTier = selfState.drift.tier;
        const reachedMaxTier = currentTier >= this.difficulty.maxDriftTier;

        if (idealDrift === 'none' || reachedMaxTier) {
          // Corner ended or hit tier cap: release drift to unleash mini-turbo!
          this.isDrifting = false;
          drift = false;
        } else {
          // Maintain drift
          drift = true;
          // Hold steering in drift direction to charge boost faster
          steer = this.driftDirection * Math.max(0.6, Math.abs(steer));
        }
      }
    } else {
      this.isDrifting = false;
    }

    // 8. Flavor Bell
    let bell = false;
    if (avoidance.nearestRivalDistance < 4.0 && currentTimeSec - this.lastBellTime > 4.0) {
      if (this.rng.next() < 0.25) {
        bell = true;
        this.lastBellTime = currentTimeSec;
      }
    }

    return {
      throttle,
      brake,
      steer,
      drift,
      lookBehind: false,
      bell,
      trick: false
    };
  }
}
