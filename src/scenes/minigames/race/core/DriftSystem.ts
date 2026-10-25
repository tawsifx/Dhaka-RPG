// src/scenes/minigames/race/core/DriftSystem.ts - Pure Mario Kart hop-to-drift, slip angle & 3-tier mini-turbo
import { DriftState, DriftTier, BoostSource } from '../../../../types/race.types';
import { KartConfig } from '../../../../types/race.types';
import { DEFAULT_KART_CONFIG } from '../../../../config/race.config';

export interface DriftReleaseResult {
  released: boolean;
  tier: DriftTier;
  boostSource: BoostSource | null;
  boostStrength: number;
  boostDurationSec: number;
}

export class DriftSystem {
  private config: KartConfig;
  private state: DriftState = {
    isDrifting: false,
    driftSign: 0,
    charge: 0,
    tier: 0,
    hopTimer: 0,
    hopHeight: 0,
    slipAngle: 0
  };

  constructor(config: Partial<KartConfig> = {}) {
    this.config = { ...DEFAULT_KART_CONFIG, ...config };
  }

  setConfig(config: Partial<KartConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getState(): Readonly<DriftState> {
    return { ...this.state };
  }

  isDrifting(): boolean {
    return this.state.isDrifting;
  }

  getTier(): DriftTier {
    return this.state.tier;
  }

  getSlipAngle(): number {
    return this.state.slipAngle;
  }

  getHopHeight(): number {
    return this.state.hopHeight;
  }

  /**
   * Computes the angular turning velocity in radians/sec driven by the active drift arc.
   */
  getDriftYawRate(steerInput: number): number {
    if (!this.state.isDrifting || this.state.driftSign === 0) return 0;

    // Tightening (+steer in drift direction) or widening/counter-steering (-steer)
    const steerCommitment = Math.max(-0.5, Math.min(1.0, steerInput * this.state.driftSign));
    return this.state.driftSign * (this.config.driftBaseTurnRate + steerCommitment * this.config.driftControlSteerRate);
  }

  /**
   * Updates drift state, hop curve, and mini-turbo charge accumulation.
   */
  update(
    dt: number,
    driftInput: boolean,
    steerInput: number,
    brakeInput: number,
    currentSpeed: number,
    statChargeMultiplier = 1.0,
    isAirborne = false
  ): DriftReleaseResult {
    const neutralRelease: DriftReleaseResult = {
      released: false,
      tier: 0,
      boostSource: null,
      boostStrength: 0,
      boostDurationSec: 0
    };

    // 1. Cancellation conditions: braking, severe low speed, or airborne
    if (this.state.isDrifting) {
      if (brakeInput > 0 || currentSpeed < this.config.driftMinSpeed * 0.7 || isAirborne) {
        this.cancelDrift();
        return neutralRelease;
      }
    }

    // 2. Hop & Entry Initiation
    if (driftInput && !this.state.isDrifting) {
      // Must have forward speed and steering intent to initiate drift
      if (currentSpeed >= this.config.driftMinSpeed && Math.abs(steerInput) > 0.05) {
        this.state.isDrifting = true;
        this.state.driftSign = steerInput > 0 ? 1 : -1;
        this.state.hopTimer = this.config.driftHopDuration;
        this.state.charge = 0;
        this.state.tier = 0;
        this.state.slipAngle = 0;
      }
    }

    // 3. Active Drift Dynamics
    if (this.state.isDrifting) {
      // Release drift trigger when drift button is released
      if (!driftInput) {
        return this.releaseDrift();
      }

      // Hop arc animation
      if (this.state.hopTimer > 0) {
        this.state.hopTimer -= dt;
        const progress = Math.max(0, Math.min(1, 1 - this.state.hopTimer / this.config.driftHopDuration));
        this.state.hopHeight = Math.sin(progress * Math.PI) * this.config.driftHopHeight;
      } else {
        this.state.hopHeight = 0;
      }

      // Visual slip angle lerp
      const targetSlip = this.state.driftSign * this.config.driftSlipAngle;
      this.state.slipAngle += (targetSlip - this.state.slipAngle) * Math.min(1, 14 * dt);

      // Charge accumulation
      const steerBonus = Math.max(0, steerInput * this.state.driftSign) * this.config.driftSteerChargeBonus;
      const chargeRate = this.config.driftBaseChargeRate * (1.0 + steerBonus) * Math.max(0.1, statChargeMultiplier);
      this.state.charge += chargeRate * dt;

      // Tier thresholds
      if (this.state.charge >= this.config.tier3Threshold) {
        this.state.tier = 3; // Ultra Mini-Turbo (Purple sparks)
      } else if (this.state.charge >= this.config.tier2Threshold) {
        this.state.tier = 2; // Super Mini-Turbo (Orange sparks)
      } else if (this.state.charge >= this.config.tier1Threshold) {
        this.state.tier = 1; // Mini-Turbo (Blue sparks)
      } else {
        this.state.tier = 0;
      }
    } else {
      // Smoothly return slip angle to zero when not drifting
      this.state.slipAngle += (0 - this.state.slipAngle) * Math.min(1, 16 * dt);
      this.state.hopHeight = 0;
    }

    return neutralRelease;
  }

  releaseDrift(): DriftReleaseResult {
    if (!this.state.isDrifting) {
      return {
        released: false,
        tier: 0,
        boostSource: null,
        boostStrength: 0,
        boostDurationSec: 0
      };
    }

    const tier = this.state.tier;
    let boostSource: BoostSource | null = null;
    let boostStrength = 0;
    let boostDurationSec = 0;

    if (tier === 3) {
      boostSource = 'mini_turbo_t3';
      boostStrength = this.config.tier3BoostStrength;
      boostDurationSec = this.config.tier3BoostDuration;
    } else if (tier === 2) {
      boostSource = 'mini_turbo_t2';
      boostStrength = this.config.tier2BoostStrength;
      boostDurationSec = this.config.tier2BoostDuration;
    } else if (tier === 1) {
      boostSource = 'mini_turbo_t1';
      boostStrength = this.config.tier1BoostStrength;
      boostDurationSec = this.config.tier1BoostDuration;
    }

    this.cancelDrift();

    return {
      released: true,
      tier,
      boostSource,
      boostStrength,
      boostDurationSec
    };
  }

  getTierColor(): 'none' | 'blue' | 'orange' | 'purple' {
    switch (this.state.tier) {
      case 1:
        return 'blue';
      case 2:
        return 'orange';
      case 3:
        return 'purple';
      default:
        return 'none';
    }
  }

  isHopping(): boolean {
    return this.state.hopTimer > 0;
  }

  getDirection(): number {
    return this.state.driftSign;
  }

  cancelDrift(): void {
    this.state.isDrifting = false;
    this.state.driftSign = 0;
    this.state.charge = 0;
    this.state.tier = 0;
    this.state.hopTimer = 0;
    this.state.hopHeight = 0;
  }

  reset(): void {
    this.cancelDrift();
    this.state.slipAngle = 0;
  }
}
