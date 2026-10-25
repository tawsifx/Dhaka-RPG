// src/types/race.types.ts - Core types for 3D Rickshaw Race ("Tring-Tring Grand Prix")

export type RaceExitReason = 'user' | 'error' | 'finish';

export interface RaceResult {
  completed: boolean;
  elapsedMs: number;
  exitReason: RaceExitReason;
  finalSpeed: number;
  distanceTravelled: number;
}

export interface KartInput {
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
  steer: number; // -1 (left) to 1 (right)
  bell: boolean;
  exit: boolean;
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
}

export interface ChaseCameraConfig {
  distance: number;
  height: number;
  lookAhead: number;
  positionLag: number; // Lerp factor (higher = faster snap)
  rotationLag: number;
  baseFov: number;
  maxFovKick: number;
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
}
