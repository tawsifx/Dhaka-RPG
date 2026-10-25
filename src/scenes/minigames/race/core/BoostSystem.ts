// src/scenes/minigames/race/core/BoostSystem.ts - Pure unified boost state machine
import { BoostSource, BoostState } from '../../../../types/race.types';

export class BoostSystem {
  private state: BoostState = {
    active: false,
    source: null,
    strength: 0,
    durationRemaining: 0
  };

  getState(): Readonly<BoostState> {
    return { ...this.state };
  }

  isActive(): boolean {
    return this.state.active && this.state.durationRemaining > 0;
  }

  getStrength(): number {
    return this.isActive() ? this.state.strength : 0;
  }

  getSource(): BoostSource | null {
    return this.isActive() ? this.state.source : null;
  }

  getRemainingSec(): number {
    return this.state.durationRemaining;
  }

  /**
   * Applies a boost from any source according to priority & duration refresh rules:
   * 1. Stronger boost always replaces a weaker one.
   * 2. Equal strength boost extends the active duration (up to 3.5s max cap).
   * 3. Weaker boost is ignored to avoid downgrading player speed.
   */
  applyBoost(source: BoostSource, strength: number, durationSec: number): void {
    if (strength <= 0 || durationSec <= 0) return;

    if (!this.state.active || strength > this.state.strength) {
      this.state.active = true;
      this.state.source = source;
      this.state.strength = strength;
      this.state.durationRemaining = durationSec;
    } else if (Math.abs(strength - this.state.strength) < 0.01) {
      // Refresh duration without stacking speed
      this.state.durationRemaining = Math.min(3.5, Math.max(this.state.durationRemaining, durationSec));
    }
  }

  update(dt: number): BoostState {
    if (!this.state.active) return this.getState();

    this.state.durationRemaining -= dt;
    if (this.state.durationRemaining <= 0) {
      this.reset();
    }

    return this.getState();
  }

  reset(): void {
    this.state.active = false;
    this.state.source = null;
    this.state.strength = 0;
    this.state.durationRemaining = 0;
  }
}
