// src/scenes/minigames/race/core/KartController.ts - Pure arcade kart physics math (0 Three.js/Phaser imports)
import { KartConfig, KartInput, KartState } from '../../../../types/race.types';
import { DEFAULT_KART_CONFIG } from '../../../../config/race.config';

export class KartController {
  private config: KartConfig;
  private state: KartState;

  constructor(config: Partial<KartConfig> = {}, initialState: Partial<KartState> = {}) {
    this.config = { ...DEFAULT_KART_CONFIG, ...config };
    this.state = {
      x: 0,
      y: 0,
      z: 0,
      rotation: 0,
      speed: 0,
      steerAngle: 0,
      angularVelocity: 0,
      distanceTravelled: 0,
      ...initialState
    };
  }

  getConfig(): Readonly<KartConfig> {
    return this.config;
  }

  getState(): Readonly<KartState> {
    return { ...this.state };
  }

  setState(partial: Partial<KartState>): void {
    this.state = { ...this.state, ...partial };
  }

  reset(initialState: Partial<KartState> = {}): void {
    this.state = {
      x: 0,
      y: 0,
      z: 0,
      rotation: 0,
      speed: 0,
      steerAngle: 0,
      angularVelocity: 0,
      distanceTravelled: 0,
      ...initialState
    };
  }

  /**
   * Advances kart physics by fixed timestep dt seconds.
   */
  update(dt: number, input: KartInput): KartState {
    if (dt <= 0) return this.getState();

    const throttle = Math.max(0, Math.min(1, input.throttle));
    const brake = Math.max(0, Math.min(1, input.brake));
    const steer = Math.max(-1, Math.min(1, input.steer));

    let speed = this.state.speed;

    // 1. Acceleration & Braking
    if (throttle > 0) {
      if (speed < 0) {
        // Reverse braking (moving backwards, pressing throttle acts as front brake)
        speed += this.config.braking * throttle * dt;
        if (speed > 0) speed = 0;
      } else {
        // Forward acceleration
        speed += this.config.acceleration * throttle * dt;
        if (speed > this.config.maxSpeed) {
          speed = this.config.maxSpeed;
        }
      }
    } else if (brake > 0) {
      if (speed > 0) {
        // Forward braking
        speed -= this.config.braking * brake * dt;
        if (speed < 0) speed = 0;
      } else {
        // Reverse acceleration
        speed -= this.config.reverseAcceleration * brake * dt;
        if (speed < -this.config.maxReverseSpeed) {
          speed = -this.config.maxReverseSpeed;
        }
      }
    } else {
      // 2. Rolling friction / drag deceleration
      if (speed > 0) {
        speed -= this.config.friction * dt;
        if (speed < 0) speed = 0;
      } else if (speed < 0) {
        speed += this.config.friction * dt;
        if (speed > 0) speed = 0;
      }
    }

    // 3. Speed-sensitive steering
    // Steering responsiveness is highest at moderate speed, slightly attenuated at max speed,
    // and allows slow pivot when crawling.
    const speedRatio = Math.min(1, Math.abs(speed) / this.config.maxSpeed);
    const speedSensitivity = 1 - speedRatio * (this.config.steerSensitivity * 0.4);
    const steerFactor = speedRatio > 0.05 ? speedSensitivity : (Math.abs(speed) > 0 ? 0.3 : 0);

    // Invert steering when reversing for realistic arcade feel
    const reverseMult = speed < 0 ? -1 : 1;
    let targetAngularVel = -steer * this.config.steerSpeed * steerFactor * reverseMult;
    if (Math.abs(targetAngularVel) < 1e-6) {
      targetAngularVel = 0;
    }

    // Smooth angular velocity transition
    this.state.angularVelocity = targetAngularVel;
    this.state.rotation += this.state.angularVelocity * dt;

    // Normalize rotation angle to [-PI, PI]
    this.state.rotation = (this.state.rotation + Math.PI) % (2 * Math.PI);
    if (this.state.rotation < 0) this.state.rotation += 2 * Math.PI;
    this.state.rotation -= Math.PI;

    // Visual front wheel angle smoothly tracks input steer
    const targetSteerAngle = -steer * 0.45; // ~26 degrees max wheel turn
    this.state.steerAngle += (targetSteerAngle - this.state.steerAngle) * Math.min(1, 12 * dt);

    // 4. Position update (kart forward vector is (sin(rotation), 0, cos(rotation)) or (-sin, -cos))
    // Three.js convention: rotation 0 points along -Z
    const forwardX = -Math.sin(this.state.rotation);
    const forwardZ = -Math.cos(this.state.rotation);

    const stepDist = speed * dt;
    this.state.x += forwardX * stepDist;
    this.state.z += forwardZ * stepDist;
    this.state.speed = speed;
    this.state.distanceTravelled += Math.abs(stepDist);

    return this.getState();
  }

  /**
   * Pure interpolation helper for rendering between previous and current physics ticks.
   */
  static interpolate(previous: KartState, current: KartState, alpha: number): KartState {
    const a = Math.max(0, Math.min(1, alpha));
    
    // Shortest angular difference for smooth yaw rotation interpolation
    let rotDiff = current.rotation - previous.rotation;
    while (rotDiff < -Math.PI) rotDiff += 2 * Math.PI;
    while (rotDiff > Math.PI) rotDiff -= 2 * Math.PI;

    return {
      x: previous.x + (current.x - previous.x) * a,
      y: previous.y + (current.y - previous.y) * a,
      z: previous.z + (current.z - previous.z) * a,
      rotation: previous.rotation + rotDiff * a,
      speed: previous.speed + (current.speed - previous.speed) * a,
      steerAngle: previous.steerAngle + (current.steerAngle - previous.steerAngle) * a,
      angularVelocity: current.angularVelocity,
      distanceTravelled: previous.distanceTravelled + (current.distanceTravelled - previous.distanceTravelled) * a
    };
  }
}
