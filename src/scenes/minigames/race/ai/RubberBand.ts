// src/scenes/minigames/race/ai/RubberBand.ts - Bounded, transparent rubber-banding speed modifier
export class RubberBand {
  static readonly MAX_CATCHUP_BONUS = 0.06; // +6.0% max speed assist when far behind
  static readonly MAX_LEAD_HANDICAP = 0.06; // -6.0% max handicap when far ahead
  static readonly DISTANCE_RAMP_METERS = 60.0; // Distance over which modifier reaches max

  /**
   * Computes the bounded speed multiplier for a kart.
   * Player ALWAYS receives exactly 1.0 (zero rubber-band assist/handicap).
   *
   * @param aiProgressMeters Continuous race distance travelled by AI kart
   * @param playerProgressMeters Continuous race distance travelled by Player kart
   * @param isPlayer True if evaluating for the human player
   * @returns Speed multiplier strictly bounded in [0.94, 1.06]
   */
  static computeMultiplier(
    aiProgressMeters: number,
    playerProgressMeters: number,
    isPlayer: boolean
  ): number {
    if (isPlayer) return 1.0;

    const gap = aiProgressMeters - playerProgressMeters; // positive: AI ahead, negative: AI behind

    if (gap > 0) {
      // AI is ahead -> slight handicap (up to -6%)
      const alpha = Math.min(1.0, gap / RubberBand.DISTANCE_RAMP_METERS);
      return Number((1.0 - alpha * RubberBand.MAX_LEAD_HANDICAP).toFixed(4));
    } else {
      // AI is behind -> slight boost (up to +6%)
      const alpha = Math.min(1.0, -gap / RubberBand.DISTANCE_RAMP_METERS);
      return Number((1.0 + alpha * RubberBand.MAX_CATCHUP_BONUS).toFixed(4));
    }
  }
}
