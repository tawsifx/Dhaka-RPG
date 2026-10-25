// src/scenes/minigames/race/core/AirModel.ts - Pure air kinematics, ramp launches & air-trick boost
import { AirState } from '../../../../types/race.types';
import { KartConfig } from '../../../../types/race.types';
import { DEFAULT_KART_CONFIG } from '../../../../config/race.config';

export interface LandingResult {
  landed: boolean;
  trickSuccess: boolean;
  landingSquash: number; // Vertical squash multiplier
  trickAttempted?: boolean;
}

export class AirModel {
  private config: KartConfig;
  private state: AirState = {
    isAirborne: false,
    verticalVelocity: 0,
    height: 0,
    trickActive: false,
    trickRotation: 0
  };

  constructor(config: Partial<KartConfig> = {}) {
    this.config = { ...DEFAULT_KART_CONFIG, ...config };
  }

  setConfig(config: Partial<KartConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getState(): Readonly<AirState> {
    return { ...this.state };
  }

  isAirborne(): boolean {
    return this.state.isAirborne;
  }

  getHeight(): number {
    return this.state.height;
  }

  getTrickRotation(): number {
    return this.state.trickRotation;
  }

  /**
   * Launches kart into the air from a ramp or dropoff.
   */
  launch(forwardSpeed: number, rampAngleRad = 0.28, baseElevation = 0): void {
    this.state.isAirborne = true;
    const launchSpeed = Math.max(8.0, Math.abs(forwardSpeed));
    this.state.verticalVelocity = launchSpeed * Math.tan(rampAngleRad);
    this.state.height = baseElevation;
    this.state.trickActive = false;
    this.state.trickRotation = 0;
  }

  /**
   * Attempts to execute an air trick while airborne.
   */
  triggerTrick(): boolean {
    if (!this.state.isAirborne || this.state.trickActive) return false;
    this.state.trickActive = true;
    return true;
  }

  update(dt: number, trickInput: boolean, groundHeight = 0): LandingResult {
    const noLanding: LandingResult = {
      landed: false,
      trickSuccess: false,
      landingSquash: 1.0
    };

    if (!this.state.isAirborne) {
      this.state.height = groundHeight;
      this.state.verticalVelocity = 0;
      this.state.trickActive = false;
      this.state.trickRotation = 0;
      return noLanding;
    }

    let trickAttempted = false;
    // Try to trigger trick if requested
    if (trickInput && !this.state.trickActive) {
      trickAttempted = this.triggerTrick();
    }

    // Advance trick spin animation in the air
    if (this.state.trickActive) {
      this.state.trickRotation += 2 * Math.PI * 2.5 * dt;
    }

    // Gravity step
    this.state.verticalVelocity -= this.config.gravity * dt;
    this.state.height += this.state.verticalVelocity * dt;

    // Landing detection
    if (this.state.height <= groundHeight) {
      this.state.height = groundHeight;
      this.state.verticalVelocity = 0;
      this.state.isAirborne = false;

      const trickSuccess = this.state.trickActive;
      this.state.trickActive = false;
      this.state.trickRotation = 0;

      return {
        landed: true,
        trickSuccess,
        landingSquash: 0.75,
        trickAttempted
      };
    }

    return {
      landed: false,
      trickSuccess: false,
      landingSquash: 1.0,
      trickAttempted: trickAttempted || this.state.trickActive
    };
  }

  reset(): void {
    this.state.isAirborne = false;
    this.state.verticalVelocity = 0;
    this.state.height = 0;
    this.state.trickActive = false;
    this.state.trickRotation = 0;
  }
}
