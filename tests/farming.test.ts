// tests/farming.test.ts - Unit tests for headless FarmingSystem grid logic
import { describe, it, expect, beforeEach } from 'vitest';
import { FarmingSystem } from '../src/systems/FarmingSystem';
import { DateState } from '../src/state/DateState';
import { CROPS_DB } from '../src/config/crops.db';

describe('FarmingSystem (2D Grid Simulation)', () => {
  let farm: FarmingSystem;

  beforeEach(() => {
    farm = new FarmingSystem(20, 20);
    DateState.inventory = [];
    DateState.itemCounts = {};
    DateState.xp = 0;
    DateState.level = 1;
    DateState.xpToNext = 100;
  });

  it('initializes grid cells correctly', () => {
    const cell = farm.getCell(5, 5);
    expect(cell).toBeDefined();
    expect(cell?.isTillable).toBe(true);
    expect(cell?.isTilled).toBe(false);
    expect(cell?.isWatered).toBe(false);
    expect(cell?.crop).toBeNull();
  });

  it('allows tilling untilled soil', () => {
    const tilled = farm.tillSoil(3, 4);
    expect(tilled).toBe(true);
    expect(farm.getCell(3, 4)?.isTilled).toBe(true);

    // Cannot till already tilled soil
    const secondTill = farm.tillSoil(3, 4);
    expect(secondTill).toBe(false);
  });

  it('allows watering tilled soil', () => {
    farm.tillSoil(2, 2);
    const watered = farm.waterSoil(2, 2);
    expect(watered).toBe(true);
    expect(farm.getCell(2, 2)?.isWatered).toBe(true);

    // Cannot water untilled soil
    const unwatered = farm.waterSoil(1, 1);
    expect(unwatered).toBe(false);
  });

  it('plants valid seasonal crops on tilled soil', () => {
    farm.tillSoil(10, 10);
    const planted = farm.plantCrop(10, 10, 'rajshahi_mango');
    expect(planted).toBe(true);

    const cell = farm.getCell(10, 10);
    expect(cell?.crop).toBeDefined();
    expect(cell?.crop?.cropId).toBe('rajshahi_mango');
    expect(cell?.crop?.currentStage).toBe(1);
    expect(cell?.crop?.isReadyForHarvest).toBe(false);
  });

  it('advances crop growth only when watered during daily growth tick', () => {
    farm.tillSoil(8, 8);
    farm.plantCrop(8, 8, 'sylhet_tea'); // Sylhet tea: 4 stages, 2 days per stage
    const cell = farm.getCell(8, 8);

    // Day 1: unwatered -> no growth
    farm.dailyGrowthTick(false);
    expect(cell?.crop?.currentStage).toBe(1);
    expect(cell?.crop?.daysInStage).toBe(0);

    // Day 2: watered -> grows 1 day in stage
    farm.waterSoil(8, 8);
    farm.dailyGrowthTick(false);
    expect(cell?.crop?.daysInStage).toBe(1);
    expect(cell?.crop?.currentStage).toBe(1);

    // Day 3: watered -> reaches 2 days in stage -> advances to stage 2!
    farm.waterSoil(8, 8);
    farm.dailyGrowthTick(false);
    expect(cell?.crop?.currentStage).toBe(2);
    expect(cell?.crop?.daysInStage).toBe(0);
  });

  it('auto-waters all tilled plots during rainy monsoon weather', () => {
    farm.tillSoil(4, 4);
    farm.tillSoil(5, 5);

    farm.dailyGrowthTick(true); // isRaining = true
    expect(farm.getCell(4, 4)?.isWatered).toBe(true);
    expect(farm.getCell(5, 5)?.isWatered).toBe(true);
  });

  it('harvests mature crops, grants yield, adds items to inventory, and handles regrowth', () => {
    farm.tillSoil(6, 6);
    farm.plantCrop(6, 6, 'sylhet_tea'); // regrows = true
    const cell = farm.getCell(6, 6);
    if (!cell || !cell.crop) throw new Error('Crop missing');

    // Force mature
    cell.crop.currentStage = CROPS_DB.sylhet_tea.growth.stages;
    cell.crop.isReadyForHarvest = true;

    const result = farm.harvestCrop(6, 6);
    expect(result.success).toBe(true);
    expect(result.itemId).toBe('leaves_tea');
    expect(result.quantity).toBeGreaterThanOrEqual(CROPS_DB.sylhet_tea.minYield);
    expect(DateState.inventory).toContain('leaves_tea');
    expect(DateState.itemCounts['leaves_tea']).toBe(result.quantity);

    // Since sylhet_tea regrows, the plant remains in the ground!
    expect(cell.crop).not.toBeNull();
    expect(cell.crop?.isReadyForHarvest).toBe(false);
  });
});
