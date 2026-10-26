// src/scenes/minigames/race/core/HitReaction.ts - Pure hit reactions state machine for kart impacts
import { HitReactionType } from '../../../../config/items.race.db';

export class HitReaction {
  public currentReaction: HitReactionType = 'none';
  public elapsedSec: number = 0;
  public durationSec: number = 0;
  public immunityRemainingSec: number = 0;

  // Visual Juice Offsets
  public visualYawOffset: number = 0;
  public visualTumblePitch: number = 0;
  public visualScaleY: number = 1.0;
  public visualScaleXZ: number = 1.0;

  /**
   * Check if the kart is currently immune to incoming hits.
   */
  isImmune(): boolean {
    return this.immunityRemainingSec > 0 || this.currentReaction !== 'none';
  }

  /**
   * Trigger a hit reaction on the kart. Returns true if hit registered, false if shielded/immune.
   */
  triggerHit(reaction: HitReactionType): boolean {
    if (reaction === 'none' || this.isImmune()) {
      return false;
    }

    this.currentReaction = reaction;
    this.elapsedSec = 0;

    switch (reaction) {
      case 'spin_out':
        this.durationSec = 0.85;
        break;
      case 'explosion':
        this.durationSec = 1.25;
        break;
      case 'squash':
        this.durationSec = 2.0;
        break;
      case 'stun':
        this.durationSec = 1.0;
        break;
    }

    return true;
  }

  /**
   * Reset reaction and grant invulnerability immunity window.
   */
  recover(immunitySec: number = 1.5): void {
    this.currentReaction = 'none';
    this.elapsedSec = 0;
    this.durationSec = 0;
    this.immunityRemainingSec = immunitySec;
    this.visualYawOffset = 0;
    this.visualTumblePitch = 0;
    this.visualScaleY = 1.0;
    this.visualScaleXZ = 1.0;
  }

  /**
   * Advance the hit reaction timer.
   */
  update(dt: number): void {
    if (this.immunityRemainingSec > 0) {
      this.immunityRemainingSec = Math.max(0, this.immunityRemainingSec - dt);
    }

    if (this.currentReaction === 'none') {
      return;
    }

    this.elapsedSec += dt;
    const progress = Math.min(1.0, this.elapsedSec / this.durationSec);

    switch (this.currentReaction) {
      case 'spin_out':
        // Full 360 degree spin (2 * PI)
        this.visualYawOffset = progress * Math.PI * 2;
        break;

      case 'explosion':
        // Pop upward and flip pitch tumble
        this.visualTumblePitch = Math.sin(progress * Math.PI) * (Math.PI * 0.75);
        break;

      case 'squash':
        // Flattened height, wide footprint
        this.visualScaleY = 0.4;
        this.visualScaleXZ = 1.25;
        break;

      case 'stun':
        // Steering wobble
        this.visualYawOffset = Math.sin(this.elapsedSec * 25) * 0.15;
        break;
    }

    if (this.elapsedSec >= this.durationSec) {
      const postImmunity = this.currentReaction === 'explosion' ? 2.0 : 1.5;
      this.recover(postImmunity);
    }
  }

  /**
   * Velocity multiplier applied to kart speed during hit.
   */
  getSpeedMultiplier(): number {
    switch (this.currentReaction) {
      case 'spin_out':
        return 0.5;
      case 'explosion':
        return 0.2;
      case 'squash':
        return 0.5;
      case 'stun':
        return 0.0;
      default:
        return 1.0;
    }
  }

  /**
   * Whether driver controls (throttle/steering) are locked by the hit reaction.
   */
  isControlLocked(): boolean {
    return this.currentReaction === 'spin_out' || this.currentReaction === 'explosion' || this.currentReaction === 'stun';
  }
}
