// tests/npc/validator.test.ts - Comprehensive schedule validation tool (npm run validate:npc)
import { describe, expect, it } from 'vitest';
import { NPC_SCHEDULES_DB } from '../../src/config/npcSchedules.db';
import { DateState } from '../../src/state/DateState';
import { NpcNavigator } from '../../src/systems/npc/NpcNavigator';
import { parseTimeToMinutes } from '../../src/systems/npc/ScheduleResolver';
import { MapId, NpcScheduleDef } from '../../src/types/npc.types';

describe('NPC Schedule Validator (npm run validate:npc)', () => {
  const navigator = new NpcNavigator();
  const errors: string[] = [];
  const reportLines: string[] = [];

  const mapMaxBounds: Record<MapId, { maxCols: number; maxRows: number }> = {
    dhaka: { maxCols: 80, maxRows: 60 },
    forest: { maxCols: 80, maxRows: 60 },
    sunken: { maxCols: 80, maxRows: 60 },
    ember: { maxCols: 80, maxRows: 60 },
    frost: { maxCols: 80, maxRows: 60 },
    astral: { maxCols: 80, maxRows: 60 },
    curzon_interior: { maxCols: 40, maxRows: 30 },
    farmhouse: { maxCols: 40, maxRows: 30 }
  };

  it('validates all 38 NPC schedules against world constraints', () => {
    const npcIds = Object.keys(NPC_SCHEDULES_DB);
    expect(npcIds.length).toBe(38);

    reportLines.push('\n=== NPC SCHEDULE VALIDATION REPORT ===\n');

    for (const id of npcIds) {
      const def: NpcScheduleDef = NPC_SCHEDULES_DB[id];

      // 1. Check ID and display name
      if (!def.npcId || def.npcId !== id) {
        errors.push(`[${id}] npcId field "${def.npcId}" does not match key "${id}".`);
      }

      // 2. Check home and sleep
      if (!def.home || !def.home.map || def.home.tile.col === undefined || def.home.tile.row === undefined) {
        errors.push(`[${id}] Missing valid home definition.`);
      }
      if (!def.sleep || !def.sleep.map || def.sleep.tile.col === undefined || def.sleep.tile.row === undefined) {
        errors.push(`[${id}] Missing valid sleep definition.`);
      }

      // 3. Check fallback
      if (!def.fallback || def.fallback.length === 0) {
        errors.push(`[${id}] Fallback schedule is empty.`);
      }

      // 4. Check for equal priority collisions among variants
      const seenPriorities = new Map<number, string>();
      for (const v of def.variants) {
        if (seenPriorities.has(v.priority)) {
          errors.push(`[${id}] Variant "${v.id}" shares equal priority (${v.priority}) with "${seenPriorities.get(v.priority)}".`);
        } else {
          seenPriorities.set(v.priority, v.id);
        }

        // 5. Check quest flag validity against DateState
        if (v.when && v.when.quest) {
          for (const q of v.when.quest) {
            if (!(q.flag in DateState)) {
              errors.push(`[${id}] Variant "${v.id}" references quest flag "${q.flag}" which does not exist in DateState.`);
            }
          }
        }

        // 6. Check stops bounds, reachability & travel time
        const bounds = mapMaxBounds[def.home.map];
        for (let i = 0; i < v.stops.length; i++) {
          const s = v.stops[i];
          const sBounds = mapMaxBounds[s.map];

          if (!sBounds) {
            errors.push(`[${id}:${v.id}] Stop #${i} references invalid mapId "${s.map}".`);
            continue;
          }

          if (s.tile.col < 0 || s.tile.col >= sBounds.maxCols || s.tile.row < 0 || s.tile.row >= sBounds.maxRows) {
            errors.push(`[${id}:${v.id}] Stop #${i} tile (${s.tile.col}, ${s.tile.row}) is out of bounds on map "${s.map}".`);
          }

          // Check consecutive hops for timing and reachability
          if (i > 0) {
            const prev = v.stops[i - 1];
            const tPrev = parseTimeToMinutes(prev.at);
            const tCurr = parseTimeToMinutes(s.at);
            const timeGapMin = tCurr >= tPrev ? (tCurr - tPrev) : (tCurr + 1440 - tPrev);

            const route = navigator.planRoute(prev.map, prev.tile, s.map, s.tile);
            if (!route.path && prev.map === s.map) {
              errors.push(`[${id}:${v.id}] No path found between stop #${i - 1} and stop #${i}.`);
            } else if (route.path) {
              const hops = route.path.length - 1;
              const estTravelTimeSec = hops / def.movement.speedTilesPerSec;
              const estTravelTimeMin = estTravelTimeSec / 60; // 1 real sec = 1 game min
              const slackMin = timeGapMin - estTravelTimeMin;

              if (slackMin < 0) {
                errors.push(`[${id}:${v.id}] Hop #${i - 1} -> #${i} has negative slack (${slackMin.toFixed(1)} min). Est: ${estTravelTimeMin.toFixed(1)} min, Gap: ${timeGapMin} min.`);
              } else {
                reportLines.push(`  ${id} -> [${v.id}] Hop ${i}: ${hops} tiles | ETA: ${estTravelTimeMin.toFixed(1)}m | Gap: ${timeGapMin}m | Slack: +${slackMin.toFixed(1)}m`);
              }
            }
          }
        }
      }
    }

    reportLines.push(`\nTotal NPCs Validated: ${npcIds.length}`);
    reportLines.push(`Total Validation Errors: ${errors.length}\n`);

    if (errors.length > 0) {
      console.error(errors.join('\n'));
    } else {
      console.log(reportLines.join('\n'));
    }

    expect(errors).toEqual([]);
  });
});
