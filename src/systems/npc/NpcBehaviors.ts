// src/systems/npc/NpcBehaviors.ts - Seeded idle activity catalog & overhead emotes
import { ActivityId, Facing, IdleBehaviorDef } from '../../types/npc.types';

export class NpcBehaviors {
  /**
   * Fast, deterministic Mulberry32 pseudo-random number generator.
   * Produces a float in [0, 1) from an integer seed.
   */
  static mulberry32(seed: number): () => number {
    return () => {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Hashes a string into a 32-bit integer for RNG seeding.
   */
  static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return hash;
  }

  /**
   * Creates a deterministic PRNG for an NPC on a specific game day.
   */
  static createNpcRng(npcId: string, day: number, year = 1): () => number {
    const seed = this.hashString(`${npcId}_d${day}_y${year}`);
    return this.mulberry32(seed);
  }

  /**
   * Selects a weighted idle activity from the profile's behaviors.
   */
  static pickIdleActivity(
    behaviors: IdleBehaviorDef[],
    rng: () => number = Math.random
  ): { activity: ActivityId; durationSec: number } {
    if (!behaviors || behaviors.length === 0) {
      return { activity: 'none', durationSec: 3.0 };
    }

    const totalWeight = behaviors.reduce((sum, b) => sum + b.weight, 0);
    let r = rng() * totalWeight;

    for (const b of behaviors) {
      if (r < b.weight) {
        const duration = b.minDurationSec + rng() * (b.maxDurationSec - b.minDurationSec);
        return { activity: b.id, durationSec: duration };
      }
      r -= b.weight;
    }

    const fallback = behaviors[0];
    return { activity: fallback.id, durationSec: fallback.minDurationSec };
  }

  /**
   * Randomly chooses a new facing direction for "look around" idle behavior.
   */
  static pickNextFacing(
    currentFacing: Facing,
    rng: () => number = Math.random
  ): Facing {
    const facings: Facing[] = ['down', 'left', 'right', 'up'];
    const candidates = facings.filter(f => f !== currentFacing);
    const idx = Math.floor(rng() * candidates.length);
    return candidates[idx];
  }

  /**
   * Maps an ActivityId to an iconic overhead emoji badge.
   */
  static getActivityEmoji(activity: ActivityId): string | null {
    switch (activity) {
      case 'sleep':
        return '💤';
      case 'brew_tea':
      case 'sip_tea':
        return '☕';
      case 'sketch':
        return '🎨';
      case 'compose_poetry':
        return '📜';
      case 'take_photos':
        return '📸';
      case 'jog_stretch':
        return '👟';
      case 'play_guitar':
        return '🎵';
      case 'sell_fuchka':
        return '🥣';
      case 'sell_doi':
        return '🏺';
      case 'weave_garland':
        return '🌸';
      case 'browse_books':
      case 'read_book':
        return '📚';
      case 'sculpt_clay':
        return '🏺';
      case 'study_quantum':
        return '🔬';
      case 'tend_herbarium':
        return '🌿';
      case 'mix_chemicals':
        return '⚗️';
      case 'farm_feed_chickens':
        return '🌾';
      case 'farm_milk_cow':
        return '🥛';
      case 'farm_field_work':
        return '🌱';
      case 'graze':
        return '🌿';
      case 'nap_sun':
        return '☀️';
      case 'cat_purr':
        return '🐱';
      case 'shelter_rain':
        return '☔';
      default:
        return null;
    }
  }
}
