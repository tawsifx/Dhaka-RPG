// src/systems/npc/ScheduleResolver.ts - Pure functional schedule and stop resolver
import {
  DayPhase,
  NpcScheduleDef,
  PhaseAnchor,
  ScheduleCondition,
  ScheduleContext,
  ScheduleStop,
  ScheduleVariant
} from '../../types/npc.types';

export const PHASE_BASE_MINUTES: Record<DayPhase, number> = {
  dawn: 5 * 60,       // 05:00 = 300
  morning: 8 * 60,    // 08:00 = 480
  afternoon: 12 * 60, // 12:00 = 720
  sunset: 17 * 60,    // 17:00 = 1020
  night: 20 * 60,     // 20:00 = 1200
  midnight: 23 * 60   // 23:00 = 1380
};

/**
 * Converts a time representation ("HH:MM" string or PhaseAnchor object)
 * into total minutes from midnight (0 to 1439).
 */
export function parseTimeToMinutes(at: string | PhaseAnchor): number {
  if (typeof at === 'string') {
    const parts = at.split(':');
    if (parts.length !== 2) {
      throw new Error(`Invalid time string format: "${at}". Expected "HH:MM".`);
    }
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      throw new Error(`Invalid hour or minute in time string: "${at}".`);
    }
    return h * 60 + m;
  }

  if (at && typeof at === 'object' && at.phase) {
    const base = PHASE_BASE_MINUTES[at.phase];
    if (base === undefined) {
      throw new Error(`Unknown phase anchor: "${at.phase}".`);
    }
    const offset = at.offsetMin || 0;
    return (base + offset + 1440) % 1440;
  }

  throw new Error(`Unrecognized time format: ${JSON.stringify(at)}`);
}

/**
 * Formats minutes from midnight into standard "HH:MM" (24-hour).
 */
export function formatMinutesToTime(min: number): string {
  const normalized = ((Math.floor(min) % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
}

/**
 * Checks whether a single ScheduleCondition matches the current game context.
 */
export function matchesCondition(cond: ScheduleCondition, ctx: ScheduleContext): boolean {
  // 1. Season condition
  if (cond.seasons && cond.seasons.length > 0) {
    if (!cond.seasons.includes(ctx.season)) return false;
  }

  // 2. Day of week condition
  if (cond.days && cond.days.length > 0) {
    if (!cond.days.includes(ctx.dayOfWeek)) return false;
  }

  // 3. Specific calendar dates (festivals, birthdays)
  if (cond.dates && cond.dates.length > 0) {
    const matchedDate = cond.dates.some(d => d.season === ctx.season && d.day === ctx.day);
    if (!matchedDate) return false;
  }

  // 4. Weather type
  if (cond.weather && cond.weather.length > 0) {
    if (!cond.weather.includes(ctx.weather)) return false;
  }

  // 5. Rain boolean
  if (cond.isRaining !== undefined) {
    if (cond.isRaining !== ctx.isRaining) return false;
  }

  // 6. Affection tier range
  if (cond.affection) {
    if (cond.affection.min !== undefined && ctx.affection < cond.affection.min) return false;
    if (cond.affection.max !== undefined && ctx.affection > cond.affection.max) return false;
  }

  // 7. Quest flags
  if (cond.quest && cond.quest.length > 0) {
    for (const q of cond.quest) {
      const val = ctx.questFlags ? ctx.questFlags[q.flag] : undefined;
      if (q.equals !== undefined && val !== q.equals) return false;
      if (q.min !== undefined && (typeof val !== 'number' || val < q.min)) return false;
      if (q.max !== undefined && (typeof val !== 'number' || val > q.max)) return false;
    }
  }

  return true;
}

/**
 * Pure function: Resolves the active ScheduleVariant for an NPC given the current context.
 * Follows strict priority order:
 * 1. Active Quest/Cutscene Override (priority 9999)
 * 2. Highest priority matching ScheduleVariant
 * 3. Default fallback schedule (priority 0)
 */
export function resolveScheduleVariant(npcDef: NpcScheduleDef, ctx: ScheduleContext): ScheduleVariant {
  // 1. Active scripted override takes absolute precedence
  if (ctx.activeOverride && ctx.activeOverride.npcId === npcDef.npcId) {
    return {
      id: `override_${ctx.activeOverride.id}`,
      priority: 9999,
      when: {},
      stops: [
        {
          at: '00:00',
          map: ctx.activeOverride.map,
          tile: ctx.activeOverride.tile,
          facing: ctx.activeOverride.facing,
          activity: ctx.activeOverride.activity,
          dialogueKey: ctx.activeOverride.dialogueKey
        }
      ]
    };
  }

  // 2. Filter matching variants
  const matches = (npcDef.variants || []).filter(v => matchesCondition(v.when, ctx));

  if (matches.length > 0) {
    // Sort descending by priority
    matches.sort((a, b) => b.priority - a.priority);
    return matches[0];
  }

  // 3. Fallback variant if no custom variant matches
  return {
    id: `${npcDef.npcId}_default_fallback`,
    priority: 0,
    when: {},
    stops: npcDef.fallback && npcDef.fallback.length > 0 ? npcDef.fallback : [
      {
        at: '00:00',
        map: npcDef.home.map,
        tile: npcDef.home.tile,
        facing: 'down',
        activity: 'none'
      }
    ]
  };
}

export interface StopResolution {
  currentStop: ScheduleStop;
  nextStop: ScheduleStop | null;
  isEnRoute: boolean;
  departureMin: number;
  arrivalMin: number;
  nextArrivalMin: number | null;
}

/**
 * Resolves the current stop, next stop, and en-route status along a variant's stops.
 */
export function resolveCurrentStop(variant: ScheduleVariant, totalMinutes: number): StopResolution {
  const stops = variant.stops;
  if (!stops || stops.length === 0) {
    throw new Error(`Variant "${variant.id}" has no schedule stops.`);
  }

  // Parse and sort stops by minute of day ascending
  const stopsWithMinutes = stops.map(s => ({
    stop: s,
    min: parseTimeToMinutes(s.at)
  })).sort((a, b) => a.min - b.min);

  const t = ((totalMinutes % 1440) + 1440) % 1440;

  // Find the latest stop whose time is <= t
  let activeIdx = -1;
  for (let i = 0; i < stopsWithMinutes.length; i++) {
    if (stopsWithMinutes[i].min <= t) {
      activeIdx = i;
    } else {
      break;
    }
  }

  // If time is before the first stop of the day, wrap around to the final stop of the previous day
  if (activeIdx === -1) {
    activeIdx = stopsWithMinutes.length - 1;
    const currentEntry = stopsWithMinutes[activeIdx];
    const nextEntry = stopsWithMinutes[0];

    const currentDwell = currentEntry.stop.dwellMin !== undefined
      ? currentEntry.stop.dwellMin
      : (nextEntry.min + 1440 - currentEntry.min);

    const departureMin = (currentEntry.min + currentDwell) % 1440;
    // En route if time is past departure time and before next arrival
    const isEnRoute = t >= departureMin && t < nextEntry.min;

    return {
      currentStop: currentEntry.stop,
      nextStop: nextEntry.stop,
      isEnRoute,
      departureMin,
      arrivalMin: currentEntry.min,
      nextArrivalMin: nextEntry.min
    };
  }

  const currentEntry = stopsWithMinutes[activeIdx];
  const nextIdx = (activeIdx + 1) % stopsWithMinutes.length;
  const nextEntry = stopsWithMinutes[nextIdx];

  const timeDiff = nextEntry.min >= currentEntry.min
    ? (nextEntry.min - currentEntry.min)
    : (nextEntry.min + 1440 - currentEntry.min);

  const currentDwell = currentEntry.stop.dwellMin !== undefined
    ? currentEntry.stop.dwellMin
    : timeDiff;

  const departureMin = (currentEntry.min + currentDwell) % 1440;
  const isEnRoute = currentEntry.stop.dwellMin !== undefined && t >= currentEntry.min + currentDwell && t < nextEntry.min;

  return {
    currentStop: currentEntry.stop,
    nextStop: nextEntry.stop !== currentEntry.stop ? nextEntry.stop : null,
    isEnRoute,
    departureMin,
    arrivalMin: currentEntry.min,
    nextArrivalMin: nextEntry.min
  };
}
