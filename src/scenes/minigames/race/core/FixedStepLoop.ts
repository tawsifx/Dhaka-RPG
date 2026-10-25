// src/scenes/minigames/race/core/FixedStepLoop.ts - Deterministic fixed-timestep simulation loop with render interpolation
import { RACE_SIM_CONFIG } from '../../../../config/race.config';

export interface FixedStepLoopConfig {
  fixedDeltaSec?: number;
  maxSubSteps?: number;
  maxAccumulatedSec?: number;
}

export class FixedStepLoop {
  readonly fixedDeltaSec: number;
  readonly maxSubSteps: number;
  readonly maxAccumulatedSec: number;

  private accumulator = 0;
  private alpha = 0;

  constructor(config: FixedStepLoopConfig = {}) {
    this.fixedDeltaSec = config.fixedDeltaSec ?? RACE_SIM_CONFIG.fixedDeltaSec;
    this.maxSubSteps = config.maxSubSteps ?? RACE_SIM_CONFIG.maxSubSteps;
    this.maxAccumulatedSec = config.maxAccumulatedSec ?? RACE_SIM_CONFIG.maxAccumulatedSec;
  }

  /**
   * Advances the simulation by running integer fixed substeps.
   * Clamps accumulated time to avoid spiral-of-death frame spirals.
   * Returns the count of steps executed and the remaining render interpolation alpha [0, 1].
   */
  step(frameDeltaSec: number, onSubStep: (dt: number) => void): { subSteps: number; alpha: number } {
    const clampedFrameDelta = Math.max(0, Math.min(frameDeltaSec, this.maxAccumulatedSec));
    this.accumulator += clampedFrameDelta;

    let subSteps = 0;
    while (this.accumulator >= this.fixedDeltaSec && subSteps < this.maxSubSteps) {
      onSubStep(this.fixedDeltaSec);
      this.accumulator -= this.fixedDeltaSec;
      subSteps++;
    }

    // If accumulated time still exceeds after maxSubSteps, clamp it to prevent buildup
    if (this.accumulator >= this.fixedDeltaSec) {
      this.accumulator = 0;
    }

    this.alpha = Math.max(0, Math.min(1, this.accumulator / this.fixedDeltaSec));
    return { subSteps, alpha: this.alpha };
  }

  getAlpha(): number {
    return this.alpha;
  }

  getAccumulator(): number {
    return this.accumulator;
  }

  reset(): void {
    this.accumulator = 0;
    this.alpha = 0;
  }
}
