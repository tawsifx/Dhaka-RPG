// src/systems/npc/OffscreenSimulator.ts - Analytic position and facing placement upon map entry
import {
  Facing,
  GridTile,
  MapId,
  NpcScheduleDef,
  NpcState,
  ScheduleContext
} from '../../types/npc.types';
import { NpcNavigator } from './NpcNavigator';
import { parseTimeToMinutes, resolveCurrentStop, resolveScheduleVariant } from './ScheduleResolver';

export interface SimulatedNpcPlacement {
  npcId: string;
  map: MapId;
  tile: GridTile;
  facing: Facing;
  state: NpcState;
  isEnRoute: boolean;
  dialogueKey?: string;
}

export class OffscreenSimulator {
  private navigator: NpcNavigator;

  constructor(navigator?: NpcNavigator) {
    this.navigator = navigator || new NpcNavigator();
  }

  /**
   * Analytically computes where an NPC should be located at the given time context.
   * If dwelling at a stop, places them at the stop's tile and facing.
   * If en-route between stops, calculates their interpolated node along the A* path.
   */
  simulatePlacement(
    npcDef: NpcScheduleDef,
    ctx: ScheduleContext
  ): SimulatedNpcPlacement {
    const variant = resolveScheduleVariant(npcDef, ctx);
    const stopRes = resolveCurrentStop(variant, ctx.totalMinutes);

    const cur = stopRes.currentStop;
    const nxt = stopRes.nextStop;

    // 1. If not en-route, or no next stop, they are dwelling at current stop
    if (!stopRes.isEnRoute || !nxt) {
      const state: NpcState = cur.activity === 'sleep'
        ? 'sleeping'
        : cur.activity && cur.activity !== 'none'
          ? 'activity'
          : 'idle';

      return {
        npcId: npcDef.npcId,
        map: cur.map,
        tile: { ...cur.tile },
        facing: cur.facing,
        state,
        isEnRoute: false,
        dialogueKey: cur.dialogueKey
      };
    }

    // 2. If en-route, calculate path from currentStop to nextStop
    const route = this.navigator.planRoute(cur.map, cur.tile, nxt.map, nxt.tile);
    const path = route.path;

    if (!path || path.length <= 1) {
      // Direct or empty path, place at current stop
      return {
        npcId: npcDef.npcId,
        map: cur.map,
        tile: { ...cur.tile },
        facing: cur.facing,
        state: 'idle',
        isEnRoute: false,
        dialogueKey: cur.dialogueKey
      };
    }

    // Calculate normalized progress (0.0 to 1.0)
    const dep = stopRes.departureMin;
    const arr = parseTimeToMinutes(nxt.at);
    const windowMin = arr >= dep ? (arr - dep) : (arr + 1440 - dep);

    const elapsedMin = ctx.totalMinutes >= dep
      ? (ctx.totalMinutes - dep)
      : (ctx.totalMinutes + 1440 - dep);

    const progress = windowMin > 0 ? Math.min(1.0, Math.max(0.0, elapsedMin / windowMin)) : 0.0;

    // Determine path node index
    const nodeIdx = Math.min(path.length - 1, Math.floor(progress * path.length));
    const currentTile = path[nodeIdx];

    // Determine facing direction from previous or next node
    let facing: Facing = cur.facing;
    if (nodeIdx < path.length - 1) {
      const nextTile = path[nodeIdx + 1];
      const dc = nextTile.col - currentTile.col;
      const dr = nextTile.row - currentTile.row;
      if (Math.abs(dc) > Math.abs(dr)) {
        facing = dc > 0 ? 'right' : 'left';
      } else if (dr !== 0) {
        facing = dr > 0 ? 'down' : 'up';
      }
    } else if (nodeIdx > 0) {
      const prevTile = path[nodeIdx - 1];
      const dc = currentTile.col - prevTile.col;
      const dr = currentTile.row - prevTile.row;
      if (Math.abs(dc) > Math.abs(dr)) {
        facing = dc > 0 ? 'right' : 'left';
      } else if (dr !== 0) {
        facing = dr > 0 ? 'down' : 'up';
      }
    }

    return {
      npcId: npcDef.npcId,
      map: cur.map,
      tile: { ...currentTile },
      facing,
      state: 'walking',
      isEnRoute: true,
      dialogueKey: cur.dialogueKey
    };
  }
}
