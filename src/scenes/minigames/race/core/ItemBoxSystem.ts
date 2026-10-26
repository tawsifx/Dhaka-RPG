// src/scenes/minigames/race/core/ItemBoxSystem.ts - Pure item box collision & respawn lifecycle
export interface ItemBoxDef {
  id: string;
  clusterId: string;
  slotIndex: number;
  x: number;
  y: number;
  z: number;
  radiusMeters: number;
  respawnTimeSec: number;
}

export interface ItemBoxState {
  def: ItemBoxDef;
  active: boolean;
  respawnRemainingSec: number;
  rotationY: number;
  bobOffset: number;
}

export class ItemBoxSystem {
  private boxes: ItemBoxState[] = [];

  constructor(defs: ItemBoxDef[] = []) {
    this.boxes = defs.map((def) => ({
      def,
      active: true,
      respawnRemainingSec: 0,
      rotationY: 0,
      bobOffset: 0
    }));
  }

  getBoxes(): ItemBoxState[] {
    return this.boxes;
  }

  /**
   * Advance box animations and respawn timers.
   */
  update(dt: number): void {
    for (const box of this.boxes) {
      box.rotationY += dt * 2.5; // Rotate ~143 deg/sec
      box.bobOffset = Math.sin(box.rotationY * 1.5) * 0.12;

      if (!box.active) {
        box.respawnRemainingSec -= dt;
        if (box.respawnRemainingSec <= 0) {
          box.active = true;
          box.respawnRemainingSec = 0;
        }
      }
    }
  }

  /**
   * Check collision against a kart center and return collected box if any.
   */
  checkCollision(kartX: number, kartY: number, kartZ: number, kartRadius: number = 1.0): ItemBoxDef | null {
    for (const box of this.boxes) {
      if (!box.active) continue;

      const dx = kartX - box.def.x;
      const dy = kartY - (box.def.y + box.bobOffset);
      const dz = kartZ - box.def.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const hitRadius = box.def.radiusMeters + kartRadius;

      if (distSq <= hitRadius * hitRadius) {
        box.active = false;
        box.respawnRemainingSec = box.def.respawnTimeSec;
        return box.def;
      }
    }
    return null;
  }

  /**
   * Reset all boxes to active.
   */
  reset(): void {
    for (const box of this.boxes) {
      box.active = true;
      box.respawnRemainingSec = 0;
    }
  }
}
