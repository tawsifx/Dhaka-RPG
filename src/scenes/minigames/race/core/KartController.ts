// src/scenes/minigames/race/core/KartController.ts - Pure arcade kart kinematics master integrator (0 Three.js/Phaser imports)
import {
  KartConfig,
  KartInput,
  RaceActionInput,
  KartState,
  KartStats,
  SurfaceType,
  SurfaceQueryResult,
  ISurfaceQuery,
  ICollisionWorld,
  CollisionResult,
  BoostSource
} from '../../../../types/race.types';
import { DEFAULT_KART_CONFIG, KART_ARCHETYPES } from '../../../../config/race.config';
import { DriftSystem } from './DriftSystem';
import { BoostSystem } from './BoostSystem';
import { AnalyticSurfaceModel } from './SurfaceModel';
import { AirModel } from './AirModel';
import { AnalyticCollisionWorld } from './CollisionWorld';
import { StartCountdown } from './StartCountdown';

export class KartController {
  private config: KartConfig;
  private state: KartState;
  private stats: KartStats;

  // Composed Subsystems
  readonly driftSystem: DriftSystem;
  readonly boostSystem: BoostSystem;
  readonly surfaceModel: ISurfaceQuery;
  readonly airModel: AirModel;
  readonly collisionWorld: ICollisionWorld;
  readonly countdown: StartCountdown;
  public lastCollision: CollisionResult | null = null;

  constructor(
    config: Partial<KartConfig> = {},
    initialState: Partial<KartState> = {},
    stats: KartStats = KART_ARCHETYPES.balanced,
    surfaceModel?: ISurfaceQuery,
    collisionWorld?: ICollisionWorld
  ) {
    this.config = { ...DEFAULT_KART_CONFIG, ...config };
    this.stats = { ...stats };

    this.driftSystem = new DriftSystem(this.config);
    this.boostSystem = new BoostSystem();
    this.surfaceModel = surfaceModel || new AnalyticSurfaceModel();
    this.airModel = new AirModel(this.config);
    this.collisionWorld = collisionWorld || new AnalyticCollisionWorld(this.config);
    this.countdown = new StartCountdown(this.config);

    this.state = {
      x: 0,
      y: 0,
      z: 0,
      rotation: 0,
      speed: 0,
      steerAngle: 0,
      angularVelocity: 0,
      distanceTravelled: 0,
      drift: this.driftSystem.getState(),
      boost: this.boostSystem.getState(),
      air: this.airModel.getState(),
      surface: 'asphalt',
      stalled: false,
      bodyPitch: 0,
      bodyRoll: 0,
      lookBehind: false,
      ...initialState
    };
  }

  getConfig(): Readonly<KartConfig> {
    return this.config;
  }

  setConfig(partial: Partial<KartConfig>): void {
    this.config = { ...this.config, ...partial };
    this.driftSystem.setConfig(this.config);
    this.airModel.setConfig(this.config);
    if (this.collisionWorld instanceof AnalyticCollisionWorld) {
      this.collisionWorld.setConfig(this.config);
    }
    this.countdown.setConfig(this.config);
  }

  getStats(): Readonly<KartStats> {
    return this.stats;
  }

  setStats(stats: KartStats): void {
    this.stats = { ...stats };
  }

  getState(): Readonly<KartState> {
    return {
      ...this.state,
      drift: this.driftSystem.getState(),
      boost: this.boostSystem.getState(),
      air: this.airModel.getState(),
      stalled: this.countdown.isStalled()
    };
  }

  setState(partial: Partial<KartState>): void {
    this.state = { ...this.state, ...partial };
  }

  setSurfaceOverride(type: SurfaceType | null): void {
    if (this.surfaceModel instanceof AnalyticSurfaceModel) {
      this.surfaceModel.setOverride(type);
    }
  }

  giveBoost(source: BoostSource, strength?: number, durationSec?: number): void {
    let s = strength;
    let d = durationSec;

    if (s === undefined || d === undefined) {
      switch (source) {
        case 'mini_turbo_t1':
          s = s ?? this.config.tier1BoostStrength;
          d = d ?? this.config.tier1BoostDuration;
          break;
        case 'mini_turbo_t2':
          s = s ?? this.config.tier2BoostStrength;
          d = d ?? this.config.tier2BoostDuration;
          break;
        case 'mini_turbo_t3':
          s = s ?? this.config.tier3BoostStrength;
          d = d ?? this.config.tier3BoostDuration;
          break;
        case 'start_boost':
          s = s ?? this.config.startBoostStrength;
          d = d ?? this.config.startBoostDurationSec;
          break;
        case 'air_trick':
          s = s ?? this.config.trickBoostStrength;
          d = d ?? this.config.trickBoostDuration;
          break;
        case 'boost_pad':
        default:
          s = s ?? 0.80;
          d = d ?? 1.20;
          break;
      }
    }

    this.boostSystem.applyBoost(source, s, d);
  }

  reset(initialState: Partial<KartState> = {}): void {
    this.driftSystem.reset();
    this.boostSystem.reset();
    this.airModel.reset();
    this.countdown.skipToDrive();

    this.state = {
      x: 0,
      y: 0,
      z: 0,
      rotation: 0,
      speed: 0,
      steerAngle: 0,
      angularVelocity: 0,
      distanceTravelled: 0,
      drift: this.driftSystem.getState(),
      boost: this.boostSystem.getState(),
      air: this.airModel.getState(),
      surface: 'asphalt',
      stalled: false,
      bodyPitch: 0,
      bodyRoll: 0,
      lookBehind: false,
      ...initialState
    };
  }

  /**
   * Advances kart physics by fixed timestep dt seconds deterministically.
   */
  update(dt: number, input: KartInput | RaceActionInput): KartState {
    if (dt <= 0) return this.getState();

    const throttle = Math.max(0, Math.min(1, input.throttle));
    const brake = Math.max(0, Math.min(1, input.brake));
    const steer = Math.max(-1, Math.min(1, input.steer));
    const driftInput = Boolean((input as any).drift);
    const lookBehind = Boolean((input as any).lookBehind);
    const trickInput = Boolean((input as any).trick || (driftInput && this.airModel.isAirborne()));

    this.state.lookBehind = lookBehind;

    // 1. Countdown update (if active)
    const countdownRes = this.countdown.update(dt, throttle);
    if (countdownRes.startBoostTriggered) {
      this.giveBoost('start_boost');
    }

    // If countdown prohibits driving or kart is stalled, lock throttle and friction to zero
    const canDrive = this.countdown.isDrivingAllowed();
    const effectiveThrottle = canDrive ? throttle : 0;
    const effectiveBrake = canDrive ? brake : 0;

    // 2. Query Ground & Surface Model
    let groundHeight = 0;
    let groundNormalX = 0;
    let groundNormalY = 1;
    let groundNormalZ = 0;
    let onGround = true;

    let surfaceQuery: SurfaceQueryResult;
    if ('queryGround' in (this.surfaceModel as any)) {
      const gRes = (this.surfaceModel as any).queryGround(this.state.x, this.state.y, this.state.z);
      surfaceQuery = gRes;
      groundHeight = gRes.height;
      groundNormalX = gRes.normalX;
      groundNormalY = gRes.normalY;
      groundNormalZ = gRes.normalZ;
      onGround = gRes.onGround;
    } else {
      surfaceQuery = this.surfaceModel.query(this.state.x, this.state.z);
      if (this.surfaceModel instanceof AnalyticSurfaceModel) {
        this.surfaceModel.updateCooldowns(dt);
      }
    }

    this.state.surface = surfaceQuery.type;

    // Boost Pad Trigger
    if (surfaceQuery.isBoostPad) {
      this.giveBoost('boost_pad');
    }

    // Launch Ramp Trigger
    if (surfaceQuery.isRamp && !this.airModel.isAirborne() && this.state.speed > 5.0) {
      this.airModel.launch(this.state.speed, surfaceQuery.rampAngleRad || 0.28, this.state.y);
    } else if (!this.airModel.isAirborne() && !onGround && this.state.y - groundHeight > 0.8) {
      // Drove off a ledge / dropoff -> become airborne with downward velocity
      this.airModel.launch(this.state.speed, 0, this.state.y);
    }

    // 3. Air Model Update
    const landingRes = this.airModel.update(dt, trickInput, groundHeight);
    const isAirborne = this.airModel.isAirborne();
    this.state.y = isAirborne ? this.airModel.getHeight() : groundHeight;

    if (landingRes.landed && landingRes.trickSuccess) {
      // Clean landing after executing air-trick gives a boost!
      this.giveBoost('air_trick');
    }

    // 4. Boost System Update
    this.boostSystem.update(dt);
    const isBoosting = this.boostSystem.isActive();
    const boostStrength = this.boostSystem.getStrength();

    // 5. Speed Calculation
    // Base speed from archetype + config
    const baseMaxSpeed = Math.min(this.config.maxSpeed, this.stats.topSpeed);
    const baseAccel = Math.min(this.config.acceleration, this.stats.acceleration);

    // Boost shields against off-road grass/mud slowdown!
    const surfaceSpeedMult = isBoosting ? 1.0 : surfaceQuery.speedMultiplier;
    const surfaceAccelMult = surfaceQuery.accelerationMultiplier;
    const surfaceFrictionMult = surfaceQuery.frictionMultiplier;

    // Active max speed factoring in boost and surface
    const currentMaxSpeed = baseMaxSpeed * (1.0 + boostStrength) * surfaceSpeedMult;

    let speed = this.state.speed;

    if (effectiveThrottle > 0) {
      if (speed < 0) {
        // Reverse braking (moving backwards, pressing throttle acts as front brake)
        speed += this.config.braking * effectiveThrottle * dt;
        if (speed > 0) speed = 0;
      } else {
        // Forward acceleration (boost applies strong boost accel)
        const accelRate = isBoosting ? 42.0 : baseAccel * surfaceAccelMult;
        speed += accelRate * effectiveThrottle * dt;
        if (speed > currentMaxSpeed) {
          speed = currentMaxSpeed;
        }
      }
    } else if (effectiveBrake > 0) {
      if (speed > 0) {
        // Forward braking
        speed -= this.config.braking * effectiveBrake * dt;
        if (speed < 0) speed = 0;
      } else {
        // Reverse acceleration
        speed -= this.config.reverseAcceleration * effectiveBrake * dt;
        if (speed < -this.config.maxReverseSpeed) {
          speed = -this.config.maxReverseSpeed;
        }
      }
    } else {
      // Rolling friction / drag deceleration
      const frictionDecel = this.config.friction * surfaceFrictionMult * (isAirborne ? 0.1 : 1.0);
      if (speed > 0) {
        speed -= frictionDecel * dt;
        if (speed < 0) speed = 0;
      } else if (speed < 0) {
        speed += frictionDecel * dt;
        if (speed > 0) speed = 0;
      }
    }

    // 6. Drift System Update
    const driftRelease = this.driftSystem.update(
      dt,
      canDrive && driftInput,
      steer,
      effectiveBrake,
      speed,
      this.stats.driftChargeMultiplier,
      isAirborne
    );

    if (driftRelease.released && driftRelease.boostSource) {
      this.giveBoost(driftRelease.boostSource, driftRelease.boostStrength, driftRelease.boostDurationSec);
    }

    // 7. Steering & Heading Progression
    let angularVel = 0;

    if (this.driftSystem.isDrifting()) {
      // Drift arc turning
      angularVel = this.driftSystem.getDriftYawRate(steer);
    } else {
      // Standard speed-sensitive steering
      const speedRatio = Math.min(1, Math.abs(speed) / baseMaxSpeed);
      const speedSensitivity = 1 - speedRatio * (this.config.steerSensitivity * 0.4);
      const airFactor = isAirborne ? this.config.airSteerMultiplier : 1.0;
      const steerFactor = (speedRatio > 0.05 ? speedSensitivity : Math.abs(speed) > 0 ? 0.3 : 0) * airFactor;

      const reverseMult = speed < 0 ? -1 : 1;
      const baseHandling = Math.min(this.config.steerSpeed, this.stats.handling);
      angularVel = -steer * baseHandling * steerFactor * reverseMult * surfaceQuery.steerMultiplier;

      if (Math.abs(angularVel) < 1e-6) {
        angularVel = 0;
      }
    }

    this.state.angularVelocity = angularVel;
    this.state.rotation += this.state.angularVelocity * dt;

    // Normalize rotation angle to [-PI, PI]
    this.state.rotation = (this.state.rotation + Math.PI) % (2 * Math.PI);
    if (this.state.rotation < 0) this.state.rotation += 2 * Math.PI;
    this.state.rotation -= Math.PI;

    // Visual front wheel angle smoothly tracks input steer
    const targetSteerAngle = -steer * 0.45;
    this.state.steerAngle += (targetSteerAngle - this.state.steerAngle) * Math.min(1, 14 * dt);

    // 8. Velocity & Position Update
    // Direction vector points along -Z at rotation 0
    const forwardX = -Math.sin(this.state.rotation);
    const forwardZ = -Math.cos(this.state.rotation);
    const rightX = -Math.cos(this.state.rotation);
    const rightZ = Math.sin(this.state.rotation);

    // Visual body roll & pitch (including terrain slope & banking)
    const terrainPitch = isAirborne ? 0 : -(forwardX * groundNormalX + forwardZ * groundNormalZ);
    const terrainRoll = isAirborne ? 0 : (rightX * groundNormalX + rightZ * groundNormalZ);

    const accelPitch = effectiveThrottle > 0 ? 0.04 : effectiveBrake > 0 ? -0.06 : 0;
    const targetPitch = isAirborne ? -0.15 : (terrainPitch + accelPitch);
    this.state.bodyPitch += (targetPitch - this.state.bodyPitch) * Math.min(1, 8 * dt);

    const targetRoll = -this.state.angularVelocity * 0.08 + terrainRoll;
    this.state.bodyRoll += (targetRoll - this.state.bodyRoll) * Math.min(1, 10 * dt);

    let velX = forwardX * speed;
    let velZ = forwardZ * speed;

    let posX = this.state.x + velX * dt;
    let posZ = this.state.z + velZ * dt;

    // 9. Collision World Response
    const collision = ('checkCollision3D' in (this.collisionWorld as any))
      ? (this.collisionWorld as any).checkCollision3D(posX, this.state.y + 0.5, posZ, this.config.kartRadius)
      : this.collisionWorld.checkCollision(posX, posZ, this.config.kartRadius);
    this.lastCollision = collision;
    if (collision) {
      const resolved = (this.collisionWorld as any).resolveResponse(
        posX,
        posZ,
        velX,
        velZ,
        collision
      );

      posX = resolved.newPosX;
      posZ = resolved.newPosZ;

      if (resolved.cancelDrift) {
        this.driftSystem.cancelDrift();
      }

      speed = Math.max(-this.config.maxReverseSpeed, Math.min(currentMaxSpeed, Math.hypot(resolved.newVelX, resolved.newVelZ) * (speed < 0 ? -1 : 1)));
    }

    const stepDist = Math.hypot(posX - this.state.x, posZ - this.state.z);
    this.state.x = posX;
    this.state.z = posZ;
    this.state.speed = speed;
    this.state.distanceTravelled += stepDist;

    // Update nested state objects
    this.state.drift = this.driftSystem.getState();
    this.state.boost = this.boostSystem.getState();
    this.state.air = this.airModel.getState();
    this.state.stalled = this.countdown.isStalled();

    return this.getState();
  }

  /**
   * Pure interpolation helper for rendering between previous and current physics ticks.
   */
  static interpolate(previous: any, current: any, alpha: number): KartState {
    const a = Math.max(0, Math.min(1, alpha));

    // Shortest angular difference for smooth yaw rotation interpolation
    let rotDiff = (current.rotation || 0) - (previous.rotation || 0);
    while (rotDiff < -Math.PI) rotDiff += 2 * Math.PI;
    while (rotDiff > Math.PI) rotDiff -= 2 * Math.PI;

    return {
      x: (previous.x || 0) + ((current.x || 0) - (previous.x || 0)) * a,
      y: (previous.y || 0) + ((current.y || 0) - (previous.y || 0)) * a,
      z: (previous.z || 0) + ((current.z || 0) - (previous.z || 0)) * a,
      rotation: (previous.rotation || 0) + rotDiff * a,
      speed: (previous.speed || 0) + ((current.speed || 0) - (previous.speed || 0)) * a,
      steerAngle: (previous.steerAngle || 0) + ((current.steerAngle || 0) - (previous.steerAngle || 0)) * a,
      angularVelocity: current.angularVelocity || 0,
      distanceTravelled: (previous.distanceTravelled || 0) + ((current.distanceTravelled || 0) - (previous.distanceTravelled || 0)) * a,
      drift: current.drift ? { ...current.drift } : { isDrifting: false, driftSign: 0, charge: 0, tier: 0, hopTimer: 0, hopHeight: 0, slipAngle: 0 },
      boost: current.boost ? { ...current.boost } : { active: false, source: null, strength: 0, durationRemaining: 0 },
      air: current.air ? { ...current.air } : { isAirborne: false, verticalVelocity: 0, height: 0, trickActive: false, trickRotation: 0 },
      surface: current.surface || 'asphalt',
      stalled: Boolean(current.stalled),
      bodyPitch: (previous.bodyPitch || 0) + ((current.bodyPitch || 0) - (previous.bodyPitch || 0)) * a,
      bodyRoll: (previous.bodyRoll || 0) + ((current.bodyRoll || 0) - (previous.bodyRoll || 0)) * a,
      lookBehind: Boolean(current.lookBehind)
    };
  }
}
