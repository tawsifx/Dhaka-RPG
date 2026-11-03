// src/systems/FarmingSystem.ts - 2D grid state machine (till, water, plant, daily growth tick, harvest)
import { FarmGridCell } from '../types/stardew.types';
import { CROPS_DB } from '../config/crops.db';
import { RPGStats } from '../state/RPGStats';

export class FarmingSystem {
  private width: number;
  private height: number;
  private grid: Map<string, FarmGridCell> = new Map();

  constructor(width = 30, height = 30) {
    this.width = width;
    this.height = height;
    this.initializeGrid();
  }

  private getKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  initializeGrid(): void {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.grid.set(this.getKey(x, y), {
          x,
          y,
          isTillable: true,
          isTilled: false,
          isWatered: false,
          crop: null,
          debris: null,
          fertilizer: null
        });
      }
    }
  }

  getCell(x: number, y: number): FarmGridCell | undefined {
    return this.grid.get(this.getKey(x, y));
  }

  getAllCells(): FarmGridCell[] {
    return Array.from(this.grid.values());
  }

  setTileTillable(x: number, y: number, tillable: boolean): void {
    const cell = this.getCell(x, y);
    if (cell) cell.isTillable = tillable;
  }

  setTillableBounds(regions: { minCol: number; maxCol: number; minRow: number; maxRow: number }[]): void {
    for (const cell of this.grid.values()) {
      cell.isTillable = regions.some(
        (r) => cell.x >= r.minCol && cell.x <= r.maxCol && cell.y >= r.minRow && cell.y <= r.maxRow
      );
    }
  }

  exportGrid(): FarmGridCell[] {
    const active: FarmGridCell[] = [];
    for (const cell of this.grid.values()) {
      if (cell.isTilled || cell.crop !== null || cell.isWatered) {
        active.push({
          ...cell,
          crop: cell.crop ? { ...cell.crop } : null
        });
      }
    }
    return active;
  }

  importGrid(cells: Partial<FarmGridCell>[]): void {
    if (!Array.isArray(cells)) return;
    for (const c of cells) {
      if (typeof c.x !== 'number' || typeof c.y !== 'number') continue;
      const target = this.getCell(c.x, c.y);
      if (target) {
        target.isTilled = Boolean(c.isTilled);
        target.isWatered = Boolean(c.isWatered);
        target.crop = c.crop ? { ...c.crop } : null;
      }
    }
  }

  tillSoil(x: number, y: number): boolean {
    const cell = this.getCell(x, y);
    if (!cell || !cell.isTillable || cell.isTilled) return false;
    cell.isTilled = true;
    return true;
  }

  waterSoil(x: number, y: number): boolean {
    const cell = this.getCell(x, y);
    if (!cell || !cell.isTilled || cell.isWatered) return false;
    cell.isWatered = true;
    if (cell.crop) {
      cell.crop.isWateredToday = true;
    }
    return true;
  }

  plantCrop(x: number, y: number, cropId: string): boolean {
    const cell = this.getCell(x, y);
    const cropDef = CROPS_DB[cropId];
    if (!cell || !cell.isTilled || cell.crop !== null || !cropDef) return false;

    cell.crop = {
      cropId,
      currentStage: 1,
      daysInStage: 0,
      totalDaysAlive: 0,
      isWateredToday: cell.isWatered,
      isReadyForHarvest: false,
      quality: 0
    };
    return true;
  }

  dailyGrowthTick(isRaining = false): { cropsMatured: number; cropsWatered: number } {
    let cropsMatured = 0;
    let cropsWatered = 0;

    for (const cell of this.grid.values()) {
      if (!cell.isTilled) continue;

      if (isRaining) {
        cell.isWatered = true;
        if (cell.crop) cell.crop.isWateredToday = true;
      }

      if (cell.isWatered) {
        cropsWatered++;
      }

      if (cell.crop) {
        cell.crop.totalDaysAlive++;

        if (cell.crop.isWateredToday && !cell.crop.isReadyForHarvest) {
          const cropDef = CROPS_DB[cell.crop.cropId];
          if (cropDef) {
            cell.crop.daysInStage++;
            if (cell.crop.daysInStage >= cropDef.growth.daysPerStage) {
              cell.crop.daysInStage = 0;
              cell.crop.currentStage++;

              if (cell.crop.currentStage >= cropDef.growth.stages) {
                cell.crop.isReadyForHarvest = true;
                cropsMatured++;
              }
            }
          }
        }

        cell.crop.isWateredToday = false;
      }

      // Reset soil moisture for the next sunny day
      cell.isWatered = isRaining;
    }

    return { cropsMatured, cropsWatered };
  }

  harvestCrop(x: number, y: number): { success: boolean; itemId?: string; quantity?: number; xpGained?: number } {
    const cell = this.getCell(x, y);
    if (!cell || !cell.crop || !cell.crop.isReadyForHarvest) {
      return { success: false };
    }

    const cropDef = CROPS_DB[cell.crop.cropId];
    if (!cropDef) return { success: false };

    const qty = Math.floor(Math.random() * (cropDef.maxYield - cropDef.minYield + 1)) + cropDef.minYield;
    const itemId = cropDef.harvestItemId;
    const xp = cropDef.xpValue;

    RPGStats.addItem(itemId, qty);
    RPGStats.gainXP(xp);

    if (cropDef.growth.regrowsAfterHarvest) {
      cell.crop.currentStage = Math.max(1, cropDef.growth.stages - 1);
      cell.crop.daysInStage = 0;
      cell.crop.isReadyForHarvest = false;
    } else {
      cell.crop = null;
    }

    return {
      success: true,
      itemId,
      quantity: qty,
      xpGained: xp
    };
  }
}
