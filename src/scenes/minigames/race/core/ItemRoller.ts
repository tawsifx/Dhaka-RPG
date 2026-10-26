// src/scenes/minigames/race/core/ItemRoller.ts - Deterministic item rolling from rank probabilities
import { ItemType, ITEM_WEIGHTS } from '../../../../config/items.race.db';
import { ItemRng } from './ItemRng';

export class ItemRoller {
  private rng: ItemRng;

  constructor(rng: ItemRng) {
    this.rng = rng;
  }

  /**
   * Roll an item based on the kart's current race position (1-8).
   */
  rollItem(rank: number): ItemType {
    const clampedRank = Math.max(1, Math.min(8, Math.floor(rank))) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
    const weights = ITEM_WEIGHTS.ranks[String(clampedRank) as keyof typeof ITEM_WEIGHTS.ranks];

    const roll = this.rng.nextInt(1, ITEM_WEIGHTS.totalSum);
    let cumulative = 0;

    for (const [itemId, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (roll <= cumulative) {
        return itemId as ItemType;
      }
    }

    return 'malai_cha';
  }
}
