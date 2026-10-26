// src/scenes/minigames/race/ai/ItemBrain.ts - Pure AI item decision logic ported from SuperTuxKart skidding_ai.cpp
//
// Ported from SuperTuxKart (https://github.com/supertuxkart/stk-code)
// File: src/karts/controller/skidding_ai.cpp
// Authors: SuperTuxKart Team, Jean-Manuel Clémençon, Joerg Henrichs
// License: GNU General Public License v2.0 or later (GPL-2.0+)

import { ItemType, ITEMS_DB } from '../../../../config/items.race.db';
import { WorldItemInstance } from '../core/WorldItems';

export interface KartRelativePosition {
  kartId: string;
  distance: number;
  relFwd: number;
  relRight: number;
  isAhead: boolean;
  isBehind: boolean;
  angleRad: number;
}

export interface ItemDecision {
  useItem: boolean;
  aimBack: boolean;
}

export class ItemBrain {
  private timeSinceLastShot: number = 0;

  constructor() {
    this.timeSinceLastShot = 5.0; // Ready initially
  }

  update(dt: number): void {
    this.timeSinceLastShot += dt;
  }

  reset(): void {
    this.timeSinceLastShot = 5.0;
  }

  /**
   * Decide whether to use current item based on surroundings, skill, and item type.
   */
  evaluate(
    heldItem: ItemType | null,
    skill: number,
    selfState: { x: number; y: number; z: number; yaw: number; speed: number },
    otherKarts: Array<{ id: string; x: number; y: number; z: number; isImmune: boolean }>,
    incomingProjectiles: WorldItemInstance[] = []
  ): ItemDecision {
    if (!heldItem) {
      return { useItem: false, aimBack: false };
    }

    // Proximity to others
    const relativeKarts: KartRelativePosition[] = [];
    const cosY = Math.cos(selfState.yaw);
    const sinY = Math.sin(selfState.yaw);

    for (const other of otherKarts) {
      const dx = other.x - selfState.x;
      const dz = other.z - selfState.z;
      const dist = Math.hypot(dx, dz);

      // Local coordinate transform relative to kart heading
      const relFwd = -(dx * sinY + dz * cosY);
      const relRight = dx * cosY - dz * sinY;
      const angle = Math.atan2(Math.abs(relRight), Math.abs(relFwd));

      relativeKarts.push({
        kartId: other.id,
        distance: dist,
        relFwd,
        relRight,
        isAhead: relFwd > 1.0,
        isBehind: relFwd < -1.0,
        angleRad: angle
      });
    }

    const kartAhead = relativeKarts
      .filter((k) => k.isAhead)
      .sort((a, b) => a.distance - b.distance)[0] || null;

    const kartBehind = relativeKarts
      .filter((k) => k.isBehind)
      .sort((a, b) => a.distance - b.distance)[0] || null;

    // Check incoming hostile projectiles within 25m
    const hostileProjectiles = incomingProjectiles.filter((p) => {
      const dist = Math.hypot(p.x - selfState.x, p.z - selfState.z);
      return dist < 25.0;
    });

    switch (heldItem) {
      case 'malai_cha': {
        // Boost: fire on straights or when trying to overtake
        if (selfState.speed > 18.0) {
          return { useItem: true, aimBack: false };
        }
        return { useItem: false, aimBack: false };
      }

      case 'parasol_shield': {
        // Shield: activate immediately if incoming threat or crowded pack
        if (hostileProjectiles.length > 0 || (kartAhead && kartAhead.distance < 6.0)) {
          return { useItem: true, aimBack: false };
        }
        return { useItem: false, aimBack: false };
      }

      case 'mishti_doi': {
        // Trap: drop behind if someone is following closely
        if (this.timeSinceLastShot < 2.0) return { useItem: false, aimBack: false };
        if (kartBehind && kartBehind.distance < 14.0 && kartBehind.angleRad < 0.35) {
          this.timeSinceLastShot = 0;
          return { useItem: true, aimBack: true };
        }
        // Or drop randomly at exit of tight sections
        if (this.timeSinceLastShot > 12.0) {
          this.timeSinceLastShot = 0;
          return { useItem: true, aimBack: true };
        }
        return { useItem: false, aimBack: false };
      }

      case 'naga_fuchka': {
        // Projectile: fire ahead if target in forward cone (< 35m, angle < 0.35 rad)
        if (this.timeSinceLastShot < 2.5) return { useItem: false, aimBack: false };

        if (kartAhead && kartAhead.distance < 38.0 && kartAhead.angleRad < 0.38) {
          this.timeSinceLastShot = 0;
          return { useItem: true, aimBack: false };
        }

        // Fire backward if chased closely from behind
        if (kartBehind && kartBehind.distance < 16.0 && kartBehind.angleRad < 0.30) {
          this.timeSinceLastShot = 0;
          return { useItem: true, aimBack: true };
        }

        return { useItem: false, aimBack: false };
      }

      case 'rickshaw_bell': {
        // Acoustic chime: fire when any rival is within 5.5m radius
        const closeRival = relativeKarts.some((k) => k.distance < 5.5);
        if (closeRival) {
          return { useItem: true, aimBack: false };
        }
        return { useItem: false, aimBack: false };
      }

      case 'ghuri_kite': {
        // Homing kite: fire if not in 1st place
        if (kartAhead !== null) {
          return { useItem: true, aimBack: false };
        }
        return { useItem: false, aimBack: false };
      }

      default:
        return { useItem: false, aimBack: false };
    }
  }
}
