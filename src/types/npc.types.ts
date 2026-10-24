// src/types/npc.types.ts - Living-World NPC Behavior Engine Types & Interfaces
import { Season, TimeOfDay, WeatherType } from './stardew.types';

export type Facing = 'down' | 'left' | 'right' | 'up';
export type DayPhase = TimeOfDay; // 'dawn' | 'morning' | 'afternoon' | 'sunset' | 'night' | 'midnight'
export type SeasonId = Season;    // 'spring' | 'summer' | 'monsoon' | 'autumn' | 'winter'
export type WeatherId = WeatherType; // 'sunny' | 'breezy' | 'rainy' | 'monsoon' | 'storm' | 'foggy'
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type MapId = 'dhaka' | 'forest' | 'sunken' | 'ember' | 'frost' | 'astral' | 'curzon_interior' | 'farmhouse';

export type NpcState =
  | 'sleeping'
  | 'idle'
  | 'planning'
  | 'walking'
  | 'waiting_blocked'
  | 'arriving'
  | 'activity'
  | 'interacting'
  | 'sheltering'
  | 'offscreen';

export type ActivityId =
  | 'none'
  | 'sleep'
  | 'sweep'
  | 'brew_tea'
  | 'sip_tea'
  | 'sketch'
  | 'compose_poetry'
  | 'take_photos'
  | 'jog_stretch'
  | 'play_guitar'
  | 'sell_fuchka'
  | 'sell_doi'
  | 'weave_garland'
  | 'browse_books'
  | 'sculpt_clay'
  | 'read_book'
  | 'study_quantum'
  | 'tend_herbarium'
  | 'mix_chemicals'
  | 'farm_feed_chickens'
  | 'farm_milk_cow'
  | 'farm_field_work'
  | 'graze'
  | 'nap_sun'
  | 'cat_purr'
  | 'shelter_rain';

export interface ScheduleCondition {
  seasons?: SeasonId[];
  days?: DayOfWeek[];
  dates?: { season: SeasonId; day: number }[]; // Specific festival / calendar dates
  weather?: WeatherId[];
  isRaining?: boolean;
  affection?: { min?: number; max?: number }; // 0 to 100
  quest?: { flag: string; equals?: unknown; min?: number; max?: number }[];
}

export type PhaseAnchor = { phase: DayPhase; offsetMin?: number };

export interface ScheduleStop {
  id?: string;
  at: string | PhaseAnchor; // e.g. "06:30" or { phase: 'morning', offsetMin: 15 }
  map: MapId;
  tile: { col: number; row: number }; // 32px tile coordinates
  facing: Facing;
  activity?: ActivityId;
  dwellMin?: number; // Minutes to stay before proceeding (defaults to until next stop)
  interruptible?: boolean; // Can Moon Walker talk to them? (default true)
  dialogueKey?: string; // Special context-sensitive dialogue node key
}

export interface ScheduleVariant {
  id: string;
  priority: number; // Higher number wins; strictly validated for uniqueness upon conflict
  when: ScheduleCondition;
  stops: ScheduleStop[];
}

export interface IdleBehaviorDef {
  id: ActivityId;
  weight: number;
  minDurationSec: number;
  maxDurationSec: number;
}

export interface MovementProfile {
  speedTilesPerSec: number; // e.g. Tania: 2.4, Baki Bhai: 1.4, Rafiq: 1.6
  stepStyle: 'tile-step' | 'smooth';
  idleBehaviors: IdleBehaviorDef[];
  noticePlayerRadiusTiles: number; // Tile distance to turn head / show greeting
  personalSpaceTiles: number;
  patience: {
    waitSec: number; // Seconds to wait when blocked before sidestepping
    repathAfterSec: number; // Seconds to wait before requesting alternative path
  };
  pathCosts: {
    path: number; // e.g. 1.0 (paved stone paths)
    grass: number; // e.g. 2.0 (open lawn)
    flowers: number; // e.g. 5.0 (flower beds discouraged)
    tilledSoil: number | 'blocked'; // 999.0 or 'blocked'
  };
}

export interface NpcScheduleDef {
  npcId: string;
  displayName: string;
  tier: 'A' | 'B' | 'C' | 'D';
  home: { map: MapId; tile: { col: number; row: number } };
  sleep: { map: MapId; tile: { col: number; row: number } };
  movement: MovementProfile;
  variants: ScheduleVariant[];
  fallback: ScheduleStop[];
}

export interface ScheduleContext {
  hour: number;
  minute: number;
  totalMinutes: number; // 0 to 1439
  season: SeasonId;
  day: number; // 1 to 28
  dayOfWeek: DayOfWeek;
  weather: WeatherId;
  isRaining: boolean;
  affection: number;
  questFlags: Record<string, unknown>;
  activeOverride?: ScheduleOverrideRequest | null;
}

export interface ScheduleOverrideRequest {
  id: string;
  npcId: string;
  map: MapId;
  tile: { col: number; row: number };
  facing: Facing;
  activity?: ActivityId;
  dialogueKey?: string;
  expiresAtMinute?: number;
}

export interface GridTile {
  col: number;
  row: number;
}

export interface PixelPoint {
  x: number;
  y: number;
}

/** Converts grid tile coordinate (0-indexed) to pixel center coordinate */
export function tileToPx(col: number, row: number): PixelPoint {
  return {
    x: col * 32 + 16,
    y: row * 32 + 16
  };
}

/** Converts pixel coordinate to grid tile coordinate */
export function pxToTile(x: number, y: number): GridTile {
  return {
    col: Math.floor(x / 32),
    row: Math.floor(y / 32)
  };
}
