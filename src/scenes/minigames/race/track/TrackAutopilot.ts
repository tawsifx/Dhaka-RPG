// src/scenes/minigames/race/track/TrackAutopilot.ts - Pure-pursuit centerline/racing line follower for validation & headless test
import { TrackSpline } from './TrackSpline';
import { KartState, RaceActionInput } from '../../../../types/race.types';

export class TrackAutopilot {
  private spline: TrackSpline;
  private lookAheadDistance: number;
  private targetSpeed: number;
  private currentT = 0;
  private stuckTimer = 0;
  private reverseTimer = 0;

  constructor(spline: TrackSpline, targetSpeed = 22.0, lookAheadDistance = 14.0) {
    this.spline = spline;
    this.targetSpeed = targetSpeed;
    this.lookAheadDistance = lookAheadDistance;
  }

  setTargetSpeed(speed: number): void {
    this.targetSpeed = speed;
  }

  /**
   * Generates RaceActionInput using Pure Pursuit / heading tracking towards a lookahead point on the spline.
   */
  computeInput(kart: KartState): RaceActionInput {
    // 1. Find nearest point on spline seeded by previous parameter (or global search on first tick)
    const nearest = this.currentT === 0
      ? this.spline.findNearest(kart.x, kart.y, kart.z)
      : this.spline.findNearest(kart.x, kart.y, kart.z, this.currentT, 40);
    this.currentT = nearest.t;

    const totalLength = this.spline.getTotalLength() || 1;
    const currentSpeed = Math.abs(kart.speed);

    // 2. Curvature anticipation: sample track direction 25m ahead to prepare for sharp bends/hairpins
    const tanNow = this.spline.getTangent(this.currentT);
    const lookaheadCurveT = (this.currentT + 22.0 / totalLength) % 1.0;
    const tanAhead = this.spline.getTangent(lookaheadCurveT);
    const cornerBend = tanNow.x * tanAhead.x + tanNow.z * tanAhead.z; // dot product

    let maxSafeSpeed = this.targetSpeed;
    if (cornerBend < 0.5) {
      // Very sharp corner / hairpin (bend > 60 deg)
      maxSafeSpeed = 12.0;
    } else if (cornerBend < 0.75) {
      // Medium corner (bend > 40 deg)
      maxSafeSpeed = 16.0;
    }

    // 3. Dynamic steering lookahead
    const dynamicLookahead = Math.max(9.0, Math.min(18.0, currentSpeed * 0.7));
    const targetT = (nearest.t + dynamicLookahead / totalLength) % 1.0;
    const targetPoint = this.spline.getPoint(targetT);

    // Compute target vector from kart to lookahead target
    const dx = targetPoint.x - kart.x;
    const dz = targetPoint.z - kart.z;

    const targetAngle = Math.atan2(-dx, -dz);
    let headingError = targetAngle - kart.rotation;
    headingError = ((headingError + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;

    // 4. Proportional steer controller
    let steer = -headingError * 2.5;
    steer = Math.max(-1.0, Math.min(1.0, steer));

    // 5. Anti-stuck recovery
    if (this.reverseTimer > 0) {
      this.reverseTimer -= 1 / 60;
      return {
        throttle: 0,
        brake: 1.0, // Reverse
        steer: -steer, // Counter-steer while backing up
        drift: false,
        lookBehind: false,
        bell: false,
        trick: false
      };
    }

    if (currentSpeed < 1.0) {
      this.stuckTimer += 1 / 60;
      if (this.stuckTimer > 0.8) {
        this.stuckTimer = 0;
        this.reverseTimer = 0.6; // Back up for 0.6s
      }
    } else {
      this.stuckTimer = 0;
    }

    // 6. Throttle & Braking
    let throttle = 1.0;
    let brake = 0.0;

    if (currentSpeed > maxSafeSpeed) {
      throttle = 0.0;
      brake = Math.min(1.0, (currentSpeed - maxSafeSpeed) * 0.15 + 0.3);
    } else if (Math.abs(headingError) > 0.4 && currentSpeed > 14.0) {
      throttle = 0.2;
      brake = 0.4;
    }

    return {
      throttle,
      brake,
      steer,
      drift: false,
      lookBehind: false,
      bell: false,
      trick: true // Automatically trick on ramp jumps
    };
  }

  getCurrentSplineParameter(): number {
    return this.currentT;
  }
}
