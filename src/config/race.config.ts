// src/config/race.config.ts - Tuning constants for 3D Rickshaw Race ("Tring-Tring Grand Prix")
import { KartConfig, ChaseCameraConfig } from '../types/race.types';

export const DEFAULT_KART_CONFIG: Readonly<KartConfig> = Object.freeze({
  maxSpeed: 28.0, // Top forward speed in world units/sec
  maxReverseSpeed: 8.0, // Top reverse speed
  acceleration: 16.0, // Forward acceleration rate (units/s^2)
  braking: 24.0, // Braking deceleration rate when moving forward
  reverseAcceleration: 10.0, // Reverse acceleration rate
  friction: 6.0, // Passive drag / rolling resistance deceleration
  steerSpeed: 2.8, // Maximum turning yaw rate in rad/sec
  steerSensitivity: 0.65, // Speed-sensitive steering falloff factor
  bellCooldownMs: 350 // Minimum time between bell chimes
});

export const DEFAULT_CAMERA_CONFIG: Readonly<ChaseCameraConfig> = Object.freeze({
  distance: 6.2, // Offset distance behind the kart
  height: 2.8, // Elevation above the ground plane
  lookAhead: 3.8, // Distance ahead of the kart the camera focuses on
  positionLag: 8.5, // Exponential smoothing rate for camera position
  rotationLag: 6.5, // Exponential smoothing rate for camera orientation
  baseFov: 60, // Standard field of view (degrees)
  maxFovKick: 10.0 // Additional FOV at top speed (60 -> 70 deg)
});

export const RACE_SIM_CONFIG = Object.freeze({
  fixedDeltaSec: 1 / 60, // 60 Hz simulation step (~16.66ms)
  maxSubSteps: 5, // Spiral-of-death clamp
  maxAccumulatedSec: 0.2 // Max time clamp for long background pauses
});
