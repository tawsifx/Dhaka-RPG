// src/types/stardew.types.ts - Stardew-scale farming, calendar, schedule & tool simulation types

export type Season = 'spring' | 'summer' | 'monsoon' | 'autumn' | 'winter';

export type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'sunset' | 'night' | 'midnight';

export type WeatherType = 'sunny' | 'breezy' | 'rainy' | 'monsoon' | 'storm' | 'foggy';

export interface CalendarDate {
  year: number;
  season: Season;
  day: number; // 1 to 28
  hour: number; // 0 to 23
  minute: number; // 0 to 59
  timePhase: TimeOfDay;
  weather: WeatherType;
}

export type ToolType = 'hoe' | 'watering_can' | 'axe' | 'pickaxe' | 'scythe' | 'fishing_rod';

export interface ToolDef {
  id: string;
  name: string;
  type: ToolType;
  level: number; // 1: copper, 2: steel, 3: gold, 4: iridium
  spCost: number;
  reach: { x: number; y: number }[];
  description: string;
}

export interface CropGrowthConfig {
  stages: number; // e.g. 4 stages of sprite
  daysPerStage: number; // days per stage
  regrowsAfterHarvest: boolean;
  regrowDays?: number;
}

export interface CropDef {
  id: string;
  name: string;
  seedItemId: string;
  harvestItemId: string;
  seasons: Season[];
  growth: CropGrowthConfig;
  minYield: number;
  maxYield: number;
  xpValue: number;
  sellPrice: number;
  spriteKey: string;
}

export interface FarmCropState {
  cropId: string;
  currentStage: number;
  daysInStage: number;
  totalDaysAlive: number;
  isWateredToday: boolean;
  isReadyForHarvest: boolean;
  quality: 0 | 1 | 2; // normal, silver, gold
}

export interface FarmGridCell {
  x: number;
  y: number;
  isTillable: boolean;
  isTilled: boolean;
  isWatered: boolean;
  crop: FarmCropState | null;
  debris: 'weed' | 'rock' | 'stump' | null;
  fertilizer: string | null;
}

export interface NPCScheduleWaypoint {
  hour: number;
  minute: number;
  worldId: string;
  x: number;
  y: number;
  facing: 'up' | 'down' | 'left' | 'right';
  activity: string;
  dialogueId?: string;
}

export interface NPCSchedule {
  npcId: string;
  defaultWorld: string;
  defaultPosition: { x: number; y: number };
  seasonalRoutines: Record<Season, NPCScheduleWaypoint[]>;
}
