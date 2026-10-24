// src/systems/npc/NpcNavigator.ts - In-house A* pathfinding with terrain costs, path caching & door routing
import { GridTile, MapId } from '../../types/npc.types';

export interface PathNode {
  col: number;
  row: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

export interface TerrainCostProvider {
  isBlocked(col: number, row: number, mapId: MapId): boolean;
  getCost(col: number, row: number, mapId: MapId): number;
}

export interface DoorLink {
  fromMap: MapId;
  fromTile: GridTile;
  toMap: MapId;
  toTile: GridTile;
}

export const KNOWN_DOOR_LINKS: DoorLink[] = [
  // Curzon Hall Entrance / Exit
  {
    fromMap: 'dhaka',
    fromTile: { col: 6, row: 41 }, // CURZON_X: 208, CURZON_Y: 1328
    toMap: 'curzon_interior',
    toTile: { col: 18, row: 26 }   // South Exit: 600, 836
  },
  {
    fromMap: 'curzon_interior',
    fromTile: { col: 18, row: 26 },
    toMap: 'dhaka',
    toTile: { col: 6, row: 41 }
  },
  // Green Meadows Farmhouse Gate
  {
    fromMap: 'dhaka',
    fromTile: { col: 23, row: 48 }, // Farmhouse visit trigger: 736, 1536
    toMap: 'farmhouse',
    toTile: { col: 18, row: 26 }   // South Gate: 600, 840
  },
  {
    fromMap: 'farmhouse',
    fromTile: { col: 18, row: 26 },
    toMap: 'dhaka',
    toTile: { col: 23, row: 48 }
  },
  // Forest Realm Portal
  {
    fromMap: 'dhaka',
    fromTile: { col: 68, row: 25 }, // Portal: 2192, 816
    toMap: 'forest',
    toTile: { col: 7, row: 28 }    // Return: 240, 912
  },
  {
    fromMap: 'forest',
    fromTile: { col: 7, row: 28 },
    toMap: 'dhaka',
    toTile: { col: 68, row: 25 }
  }
];

export class NpcNavigator {
  private costProvider: TerrainCostProvider;
  private pathCache: Map<string, GridTile[]> = new Map();
  private maxCacheSize = 250;

  constructor(costProvider?: TerrainCostProvider) {
    this.costProvider = costProvider || {
      isBlocked: () => false,
      getCost: () => 1.0
    };
  }

  setCostProvider(provider: TerrainCostProvider): void {
    this.costProvider = provider;
    this.invalidateCache();
  }

  invalidateCache(mapId?: MapId): void {
    if (!mapId) {
      this.pathCache.clear();
      return;
    }
    const prefix = `${mapId}:`;
    for (const key of this.pathCache.keys()) {
      if (key.startsWith(prefix)) {
        this.pathCache.delete(key);
      }
    }
  }

  /**
   * Finds the shortest walkable path on a single map using A* with terrain costs.
   * Returns an array of GridTiles including start and goal.
   * If start === goal, returns [start].
   * If no path exists, returns null.
   */
  findPath(
    mapId: MapId,
    start: GridTile,
    goal: GridTile,
    maxCols = 80,
    maxRows = 60
  ): GridTile[] | null {
    if (start.col === goal.col && start.row === goal.row) {
      return [{ col: start.col, row: start.row }];
    }

    const cacheKey = `${mapId}:${start.col},${start.row}->${goal.col},${goal.row}`;
    const cached = this.pathCache.get(cacheKey);
    if (cached) {
      return [...cached];
    }

    // Check bounds
    if (
      goal.col < 0 || goal.col >= maxCols ||
      goal.row < 0 || goal.row >= maxRows ||
      this.costProvider.isBlocked(goal.col, goal.row, mapId)
    ) {
      return null;
    }

    const openList: PathNode[] = [];
    const openMap = new Map<number, PathNode>();
    const closedSet = new Set<number>();

    const toKey = (c: number, r: number) => r * 1000 + c;

    const startNode: PathNode = {
      col: start.col,
      row: start.row,
      g: 0,
      h: this.heuristic(start, goal),
      f: this.heuristic(start, goal),
      parent: null
    };

    openList.push(startNode);
    openMap.set(toKey(start.col, start.row), startNode);

    // Cardinal orthogonal directions (Down, Up, Right, Left)
    const dirs = [
      { dc: 0, dr: 1 },
      { dc: 0, dr: -1 },
      { dc: 1, dr: 0 },
      { dc: -1, dr: 0 }
    ];

    while (openList.length > 0) {
      // Find lowest f in open list (or lowest h as tiebreaker)
      let bestIdx = 0;
      for (let i = 1; i < openList.length; i++) {
        if (
          openList[i].f < openList[bestIdx].f ||
          (openList[i].f === openList[bestIdx].f && openList[i].h < openList[bestIdx].h)
        ) {
          bestIdx = i;
        }
      }

      const current = openList.splice(bestIdx, 1)[0];
      const curKey = toKey(current.col, current.row);
      openMap.delete(curKey);
      closedSet.add(curKey);

      // Goal reached
      if (current.col === goal.col && current.row === goal.row) {
        const path: GridTile[] = [];
        let curr: PathNode | null = current;
        while (curr) {
          path.unshift({ col: curr.col, row: curr.row });
          curr = curr.parent;
        }

        // Save to cache
        if (this.pathCache.size >= this.maxCacheSize) {
          const firstKey = this.pathCache.keys().next().value;
          if (firstKey) this.pathCache.delete(firstKey);
        }
        this.pathCache.set(cacheKey, path);

        return [...path];
      }

      // Evaluate neighbors
      for (const d of dirs) {
        const nc = current.col + d.dc;
        const nr = current.row + d.dr;

        if (nc < 0 || nc >= maxCols || nr < 0 || nr >= maxRows) continue;

        const nKey = toKey(nc, nr);
        if (closedSet.has(nKey)) continue;

        if (this.costProvider.isBlocked(nc, nr, mapId)) continue;

        const stepCost = this.costProvider.getCost(nc, nr, mapId);
        const tentativeG = current.g + stepCost;

        const existingOpen = openMap.get(nKey);

        if (!existingOpen) {
          const h = this.heuristic({ col: nc, row: nr }, goal);
          const neighborNode: PathNode = {
            col: nc,
            row: nr,
            g: tentativeG,
            h,
            f: tentativeG + h,
            parent: current
          };
          openList.push(neighborNode);
          openMap.set(nKey, neighborNode);
        } else if (tentativeG < existingOpen.g) {
          existingOpen.g = tentativeG;
          existingOpen.f = tentativeG + existingOpen.h;
          existingOpen.parent = current;
        }
      }
    }

    // No path found
    return null;
  }

  /**
   * Plans multi-map routing using doors if startMap !== goalMap.
   * Returns:
   * - route on current map leading to doorway (or direct goal if same map)
   * - door link if a transition is needed
   */
  planRoute(
    currentMap: MapId,
    start: GridTile,
    goalMap: MapId,
    goal: GridTile,
    maxCols = 80,
    maxRows = 60
  ): { path: GridTile[] | null; nextDoor: DoorLink | null } {
    if (currentMap === goalMap) {
      const path = this.findPath(currentMap, start, goal, maxCols, maxRows);
      return { path, nextDoor: null };
    }

    // Look for door connecting currentMap to goalMap
    const directDoor = KNOWN_DOOR_LINKS.find(
      d => d.fromMap === currentMap && d.toMap === goalMap
    );

    if (directDoor) {
      const path = this.findPath(currentMap, start, directDoor.fromTile, maxCols, maxRows);
      return { path, nextDoor: directDoor };
    }

    // If multi-hop door (e.g. curzon_interior -> dhaka -> farmhouse), route through dhaka
    const toDhakaDoor = KNOWN_DOOR_LINKS.find(
      d => d.fromMap === currentMap && d.toMap === 'dhaka'
    );
    if (toDhakaDoor) {
      const path = this.findPath(currentMap, start, toDhakaDoor.fromTile, maxCols, maxRows);
      return { path, nextDoor: toDhakaDoor };
    }

    return { path: null, nextDoor: null };
  }

  private heuristic(a: GridTile, b: GridTile): number {
    // Manhattan distance
    return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
  }
}
