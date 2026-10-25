// src/config/race.config.ts - Tuning constants, archetypes & presets for 3D Rickshaw Race
import { KartConfig, ChaseCameraConfig, KartStats } from '../types/race.types';

export const DEFAULT_KART_CONFIG: Readonly<KartConfig> = Object.freeze({
  maxSpeed: 28.0, // Top forward speed in world units/sec
  maxReverseSpeed: 8.0, // Top reverse speed
  acceleration: 16.0, // Forward acceleration rate (units/s^2)
  braking: 24.0, // Braking deceleration rate when moving forward
  reverseAcceleration: 10.0, // Reverse acceleration rate
  friction: 6.0, // Passive drag / rolling resistance deceleration
  steerSpeed: 2.8, // Maximum turning yaw rate in rad/sec
  steerSensitivity: 0.65, // Speed-sensitive steering falloff factor
  bellCooldownMs: 350, // Minimum time between bell chimes

  // Drift tunables
  driftMinSpeed: 6.0, // Min speed to enter/sustain drift
  driftHopDuration: 0.18, // Hop duration in seconds
  driftHopHeight: 0.35, // Visual hop peak height
  driftBaseTurnRate: 1.85, // Base yaw rate along drift arc (rad/s)
  driftControlSteerRate: 1.40, // Steer tightening/widening authority (rad/s)
  driftSlipAngle: 0.45, // Outward visual slip angle (~26 degrees)
  driftBaseChargeRate: 90.0, // Base charge per second
  driftSteerChargeBonus: 0.85, // Extra charge multiplier when steering hard into drift
  tier1Threshold: 100.0, // Blue sparks threshold (~0.8s)
  tier2Threshold: 220.0, // Orange sparks threshold (~1.6s)
  tier3Threshold: 360.0, // Purple sparks threshold (~2.4s)
  tier1BoostStrength: 0.30, // +30% top speed
  tier1BoostDuration: 0.85, // 0.85s boost duration
  tier2BoostStrength: 0.50, // +50% top speed
  tier2BoostDuration: 1.40, // 1.40s boost duration
  tier3BoostStrength: 0.75, // +75% top speed
  tier3BoostDuration: 2.20, // 2.20s boost duration

  // Air & Jump tunables
  gravity: 28.0, // Snappy arcade gravity (units/s^2)
  airSteerMultiplier: 0.25, // 75% reduced steering authority in air
  trickBoostStrength: 0.35, // Air trick landing boost strength
  trickBoostDuration: 0.70, // Air trick landing boost duration

  // Collision tunables
  kartRadius: 0.75, // Bounding collision radius (m)
  glancingSlideFriction: 0.92, // Tangential velocity retention on glancing scrape
  headOnBounceRestitution: 0.25, // Restitution coefficient on head-on wall hit
  headOnBounceSpeedCut: 0.40, // 60% speed loss on head-on bounce
  wallDriftCancelAngleDeg: 40.0, // Wall impacts steeper than 40 deg cancel drift

  // Countdown tunables
  countdownPerfectWindowMs: 200.0, // +/- window around GO! for rocket start
  countdownEarlyStallThresholdMs: 200.0, // Early press threshold causing engine stall
  countdownStallDurationSec: 1.20, // Stall spin-out penalty duration
  startBoostStrength: 0.65, // Rocket start boost strength
  startBoostDurationSec: 1.80 // Rocket start boost duration
});

export const DEFAULT_CAMERA_CONFIG: Readonly<ChaseCameraConfig> = Object.freeze({
  distance: 6.2, // Offset distance behind the kart
  height: 2.8, // Elevation above the ground plane
  lookAhead: 3.8, // Distance ahead of the kart the camera focuses on
  positionLag: 8.5, // Exponential smoothing rate for camera position
  rotationLag: 6.5, // Exponential smoothing rate for camera orientation
  baseFov: 60, // Standard field of view (degrees)
  maxFovKick: 12.0, // Dynamic FOV expansion at top speed and boost
  driftSwayFactor: 0.40, // Camera lateral lean opposite drift slip angle
  shakeDamping: 6.0 // Damping factor for camera shake
});

export const RACE_SIM_CONFIG = Object.freeze({
  fixedDeltaSec: 1 / 60, // 60 Hz simulation step (~16.66ms)
  maxSubSteps: 5, // Spiral-of-death clamp
  maxAccumulatedSec: 0.2 // Max time clamp for long background pauses
});

// ── Three Sample Kart Archetypes ─────────────────────────────────────────────
export const KART_ARCHETYPES: Record<string, KartStats> = Object.freeze({
  light: {
    id: 'light',
    name: 'Swift Bengal (Light)',
    topSpeed: 26.0,
    acceleration: 19.0,
    handling: 3.2,
    weight: 0.80,
    driftChargeMultiplier: 1.25 // Fast charge rate
  },
  balanced: {
    id: 'balanced',
    name: 'Curzon Cruiser (Balanced)',
    topSpeed: 28.0,
    acceleration: 18.0,
    handling: 2.8,
    weight: 1.00,
    driftChargeMultiplier: 1.00
  },
  heavy: {
    id: 'heavy',
    name: 'Forest Giant (Heavy)',
    topSpeed: 31.0,
    acceleration: 13.0,
    handling: 2.3,
    weight: 1.35,
    driftChargeMultiplier: 0.85
  }
});

// ── Named Presets for Live Tuning Panel ──────────────────────────────────────
export const TUNING_PRESETS: Record<string, Partial<KartConfig>> = {
  'Arcade Snappy (Default)': { ...DEFAULT_KART_CONFIG },
  'Floaty': {
    acceleration: 12.0,
    braking: 16.0,
    friction: 3.5,
    driftBaseTurnRate: 1.4,
    driftSlipAngle: 0.35,
    gravity: 16.0
  },
  'Heavy': {
    maxSpeed: 31.0,
    acceleration: 13.0,
    braking: 30.0,
    friction: 7.5,
    driftBaseTurnRate: 2.1,
    driftSlipAngle: 0.55,
    gravity: 34.0
  }
};
