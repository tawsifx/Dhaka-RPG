// src/types/race.types.ts - Core types for 3D Rickshaw Race ("Tring-Tring Grand Prix")

export type RaceExitReason = 'user' | 'error' | 'finish';

export interface RaceResult {
  completed: boolean;
  elapsedMs: number;
  exitReason: RaceExitReason;
  finalSpeed: number;
  distanceTravelled: number;
}

export type SurfaceType = 'asphalt' | 'grass' | 'mud' | 'puddle' | 'boost_pad';

export interface SurfaceQueryResult {
  type: SurfaceType;
  speedMultiplier: number;
  accelerationMultiplier: number;
  steerMultiplier: number;
  frictionMultiplier: number;
  isBoostPad: boolean;
  isRamp: boolean;
  rampAngleRad?: number;
}

export interface ISurfaceQuery {
  query(x: number, z: number): SurfaceQueryResult;
}

export type BoostSource =
  | 'mini_turbo_t1'
  | 'mini_turbo_t2'
  | 'mini_turbo_t3'
  | 'boost_pad'
  | 'start_boost'
  | 'air_trick'
  | 'item';

export interface BoostState {
  active: boolean;
  source: BoostSource | null;
  strength: number; // e.g. 0.3 for +30%
  durationRemaining: number; // in seconds
}

export type DriftTier = 0 | 1 | 2 | 3;

export interface DriftState {
  isDrifting: boolean;
  driftSign: -1 | 0 | 1; // -1 = left, +1 = right
  charge: number; // Accumulated turbo charge
  tier: DriftTier;
  hopTimer: number; // Remaining hop duration
  hopHeight: number; // Current visual hop elevation
  slipAngle: number; // Outward visual slip angle in radians
}

export interface AirState {
  isAirborne: boolean;
  verticalVelocity: number;
  height: number;
  trickActive: boolean;
  trickRotation: number;
}

export interface CollisionResult {
  collided: boolean;
  normalX: number;
  normalZ: number;
  penetration: number;
  wallType: 'boundary' | 'obstacle';
  impactAngleDeg: number;
}

export interface ICollisionWorld {
  checkCollision(x: number, z: number, radius: number): CollisionResult | null;
}

export type CountdownPhase = 'waiting' | 'ready' | 'set' | 'go' | 'finished';

export interface CountdownState {
  phase: CountdownPhase;
  count: number; // 3, 2, 1, 0
  timer: number;
  canDrive: boolean;
  stalled: boolean;
  stallTimer: number;
}

export interface KartStats {
  id: string;
  name: string;
  topSpeed: number;
  acceleration: number;
  handling: number;
  weight: number;
  driftChargeMultiplier: number;
}

export interface KartInput {
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
  steer: number; // -1 (left) to 1 (right)
  drift?: boolean;
  lookBehind?: boolean;
  bell: boolean;
  trick?: boolean;
  reset?: boolean;
  exit: boolean;
}

export interface RaceActionInput {
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
  steer: number; // -1 to 1
  drift: boolean;
  lookBehind: boolean;
  bell: boolean;
  trick: boolean;
  reset?: boolean;
  exit?: boolean;
}

export interface KartState {
  x: number;
  y: number;
  z: number;
  rotation: number; // Heading angle in radians (yaw)
  speed: number; // Forward velocity (units/sec, negative = reverse)
  steerAngle: number; // Current visual front wheel angle
  angularVelocity: number;
  distanceTravelled: number;
  drift: DriftState;
  boost: BoostState;
  air: AirState;
  surface: SurfaceType;
  stalled: boolean;
  bodyPitch: number;
  bodyRoll: number;
  lookBehind: boolean;
}

export interface KartConfig {
  maxSpeed: number;
  maxReverseSpeed: number;
  acceleration: number;
  braking: number;
  reverseAcceleration: number;
  friction: number;
  steerSpeed: number;
  steerSensitivity: number;
  bellCooldownMs: number;
  // Drift tunables
  driftMinSpeed: number;
  driftHopDuration: number;
  driftHopHeight: number;
  driftBaseTurnRate: number;
  driftControlSteerRate: number;
  driftSlipAngle: number;
  driftBaseChargeRate: number;
  driftSteerChargeBonus: number;
  tier1Threshold: number;
  tier2Threshold: number;
  tier3Threshold: number;
  tier1BoostStrength: number;
  tier1BoostDuration: number;
  tier2BoostStrength: number;
  tier2BoostDuration: number;
  tier3BoostStrength: number;
  tier3BoostDuration: number;
  // Air & Jump tunables
  gravity: number;
  airSteerMultiplier: number;
  trickBoostStrength: number;
  trickBoostDuration: number;
  // Collision tunables
  kartRadius: number;
  glancingSlideFriction: number;
  headOnBounceRestitution: number;
  headOnBounceSpeedCut: number;
  wallDriftCancelAngleDeg: number;
  // Countdown tunables
  countdownPerfectWindowMs: number;
  countdownEarlyStallThresholdMs: number;
  countdownStallDurationSec: number;
  startBoostStrength: number;
  startBoostDurationSec: number;
}

export interface ChaseCameraConfig {
  distance: number;
  height: number;
  lookAhead: number;
  positionLag: number;
  rotationLag: number;
  baseFov: number;
  maxFovKick: number;
  driftSwayFactor: number;
  shakeDamping: number;
  reducedMotion?: boolean;
}

export interface RaceStats {
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  speed: number;
  distance: number;
  driftState?: 'idle' | 'drifting' | 'hop';
  driftTier?: DriftTier;
  driftCharge?: number;
  boostActive?: boolean;
  boostSource?: string;
  surface?: SurfaceType;
  isAirborne?: boolean;
  slipAngleDeg?: number;
  particleCount?: number;
}
