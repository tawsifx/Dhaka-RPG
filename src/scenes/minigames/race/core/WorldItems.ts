// src/scenes/minigames/race/core/WorldItems.ts - Pure simulation of active projectiles, traps, and shields
import { ItemType, ITEMS_DB, HitReactionType } from '../../../../config/items.race.db';

export interface WorldItemInstance {
  id: string;
  type: ItemType;
  ownerId: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radiusMeters: number;
  lifetimeRemainingSec: number;
  targetKartId?: string;
  expired: boolean;
  bouncesRemaining?: number;
}

export class WorldItems {
  private items: WorldItemInstance[] = [];
  private nextId: number = 1;

  getItems(): WorldItemInstance[] {
    return this.items;
  }

  /**
   * Spawn a Naga Fuchka Rocket.
   */
  spawnNagaFuchka(
    ownerId: string,
    x: number,
    y: number,
    z: number,
    headingYaw: number,
    backward: boolean = false
  ): WorldItemInstance {
    const def = ITEMS_DB.naga_fuchka;
    const speed = backward ? -(def.projectileSpeed || 35.0) : (def.projectileSpeed || 35.0);
    const vx = -Math.sin(headingYaw) * speed;
    const vz = -Math.cos(headingYaw) * speed;

    const spawnDist = backward ? -2.2 : 2.2;
    const item: WorldItemInstance = {
      id: `fuchka_${this.nextId++}`,
      type: 'naga_fuchka',
      ownerId,
      x: x - Math.sin(headingYaw) * spawnDist,
      y: y + 0.4,
      z: z - Math.cos(headingYaw) * spawnDist,
      vx,
      vy: 0,
      vz,
      radiusMeters: def.radiusMeters || 1.2,
      lifetimeRemainingSec: def.durationSec,
      expired: false,
      bouncesRemaining: 3
    };

    this.items.push(item);
    return item;
  }

  /**
   * Spawn a Mishti Doi Splat stationary trap.
   */
  spawnMishtiDoi(ownerId: string, x: number, y: number, z: number, headingYaw: number): WorldItemInstance {
    const def = ITEMS_DB.mishti_doi;
    // Drop 2.0m behind kart
    const dropDist = -2.0;
    const item: WorldItemInstance = {
      id: `doi_${this.nextId++}`,
      type: 'mishti_doi',
      ownerId,
      x: x - Math.sin(headingYaw) * dropDist,
      y: y + 0.1,
      z: z - Math.cos(headingYaw) * dropDist,
      vx: 0,
      vy: 0,
      vz: 0,
      radiusMeters: def.radiusMeters || 1.6,
      lifetimeRemainingSec: def.durationSec,
      expired: false
    };

    this.items.push(item);
    return item;
  }

  /**
   * Spawn a Ghuri Kite homing flyer targeting leader.
   */
  spawnGhuriKite(ownerId: string, x: number, y: number, z: number, targetKartId: string): WorldItemInstance {
    const def = ITEMS_DB.ghuri_kite;
    const item: WorldItemInstance = {
      id: `ghuri_${this.nextId++}`,
      type: 'ghuri_kite',
      ownerId,
      targetKartId,
      x,
      y: y + 1.5,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      radiusMeters: def.radiusMeters || 1.8,
      lifetimeRemainingSec: def.durationSec,
      expired: false
    };

    this.items.push(item);
    return item;
  }

  /**
   * Update all world items and check collisions against kart positions.
   * Returns array of hit events: { kartId, hitReaction, itemType, itemId }
   */
  update(
    dt: number,
    karts: Array<{ id: string; x: number; y: number; z: number; isImmune: boolean; hasShield: boolean }>
  ): Array<{ kartId: string; hitReaction: HitReactionType; itemType: ItemType; itemId: string }> {
    const hits: Array<{ kartId: string; hitReaction: HitReactionType; itemType: ItemType; itemId: string }> = [];

    for (const item of this.items) {
      if (item.expired) continue;

      item.lifetimeRemainingSec -= dt;
      if (item.lifetimeRemainingSec <= 0) {
        item.expired = true;
        continue;
      }

      // Projectile movement
      if (item.type === 'naga_fuchka') {
        item.x += item.vx * dt;
        item.z += item.vz * dt;
      } else if (item.type === 'ghuri_kite') {
        // Find target kart
        const target = karts.find((k) => k.id === item.targetKartId) || karts[0];
        if (target) {
          const dx = target.x - item.x;
          const dz = target.z - item.z;
          const dist = Math.hypot(dx, dz);
          const speed = (ITEMS_DB.ghuri_kite.projectileSpeed || 38.0);
          if (dist > 0.5) {
            item.vx = (dx / dist) * speed;
            item.vz = (dz / dist) * speed;
            item.x += item.vx * dt;
            item.z += item.vz * dt;
            item.y += (target.y + 0.5 - item.y) * 4.0 * dt;
          }
        }
      }

      // Check collisions against karts
      for (const kart of karts) {
        if (kart.isImmune) continue;

        // Skip hitting owner within first 0.3s of projectile launch
        if (item.ownerId === kart.id && item.type === 'naga_fuchka' && item.lifetimeRemainingSec > ITEMS_DB.naga_fuchka.durationSec - 0.3) {
          continue;
        }

        const dx = kart.x - item.x;
        const dy = kart.y - item.y;
        const dz = kart.z - item.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const contactDist = item.radiusMeters + 1.0;

        if (distSq <= contactDist * contactDist) {
          const def = ITEMS_DB[item.type];
          item.expired = true;

          // If kart has active shield, shield absorbs hit
          if (kart.hasShield) {
            hits.push({ kartId: kart.id, hitReaction: 'none', itemType: item.type, itemId: item.id });
          } else {
            hits.push({ kartId: kart.id, hitReaction: def.hitReaction, itemType: item.type, itemId: item.id });
          }
          break;
        }
      }
    }

    // Purge expired
    this.items = this.items.filter((i) => !i.expired);
    return hits;
  }

  clear(): void {
    this.items = [];
  }
}
