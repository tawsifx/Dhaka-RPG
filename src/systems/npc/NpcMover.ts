// src/systems/npc/NpcMover.ts - Stepping controller, 4-direction facing, anim rate & yield/freeze handling
import { Facing, GridTile, MovementProfile, NpcState, PixelPoint, tileToPx } from '../../types/npc.types';

export interface MoverTarget {
  x: number;
  y: number;
  facing: Facing;
  state: NpcState;
  speedTilesPerSec: number;
}

export class NpcMover {
  public x: number;
  public y: number;
  public currentTile: GridTile;
  public facing: Facing;
  public state: NpcState = 'idle';

  private profile: MovementProfile;
  private path: GridTile[] = [];
  private pathIdx = 0;
  private targetTile: GridTile | null = null;
  private targetPx: PixelPoint | null = null;

  // Interaction and pause memory
  private preInteractFacing: Facing = 'down';
  private preInteractState: NpcState = 'idle';

  // Blocked & patience tracking
  private blockedTimer = 0; // seconds spent waiting while blocked
  private needsRepath = false;
  private needsSidestep = false;

  constructor(initialTile: GridTile, initialFacing: Facing = 'down', profile?: MovementProfile) {
    this.currentTile = { ...initialTile };
    const px = tileToPx(initialTile.col, initialTile.row);
    this.x = px.x;
    this.y = px.y;
    this.facing = initialFacing;

    this.profile = profile || {
      speedTilesPerSec: 1.8,
      stepStyle: 'tile-step',
      idleBehaviors: [],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 2.0, repathAfterSec: 4.0 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    };
  }

  setProfile(profile: MovementProfile): void {
    this.profile = profile;
  }

  getProfile(): MovementProfile {
    return this.profile;
  }

  setPath(path: GridTile[]): void {
    if (!path || path.length === 0) {
      this.path = [];
      this.targetTile = null;
      this.targetPx = null;
      this.state = 'idle';
      return;
    }

    this.path = [...path];
    // If the path starts with the tile the mover is already occupying, skip to the next step
    if (
      this.path.length > 1 &&
      this.path[0].col === this.currentTile.col &&
      this.path[0].row === this.currentTile.row
    ) {
      this.pathIdx = 1;
    } else {
      this.pathIdx = 0;
    }

    this.state = 'walking';
    this.advanceToNextPathNode();

    // Immediately orient facing towards target node
    if (this.targetPx) {
      const dx = this.targetPx.x - this.x;
      const dy = this.targetPx.y - this.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        this.facing = dx > 0 ? 'right' : 'left';
      } else if (Math.abs(dy) > 0.01) {
        this.facing = dy > 0 ? 'down' : 'up';
      }
    }
  }

  hasActivePath(): boolean {
    return this.state === 'walking' && this.path.length > 0 && this.pathIdx < this.path.length;
  }

  getPath(): GridTile[] {
    return [...this.path];
  }

  getPathIndex(): number {
    return this.pathIdx;
  }

  /**
   * Advances mover state by delta seconds.
   * `isNextTileBlocked`: callback checking if the immediate next tile is occupied.
   */
  update(
    deltaSec: number,
    isNextTileBlocked?: (tile: GridTile) => boolean
  ): {
    moved: boolean;
    reachedGoal: boolean;
    facingChanged: boolean;
    needsRepath: boolean;
    needsSidestep: boolean;
  } {
    let moved = false;
    let reachedGoal = false;
    let facingChanged = false;

    this.needsRepath = false;
    this.needsSidestep = false;

    // Do nothing if interacting or sleeping
    if (this.state === 'interacting' || this.state === 'sleeping') {
      return { moved, reachedGoal, facingChanged, needsRepath: false, needsSidestep: false };
    }

    if (!this.targetPx || !this.targetTile) {
      if (this.state === 'walking') {
        this.state = 'idle';
        reachedGoal = true;
      }
      return { moved, reachedGoal, facingChanged, needsRepath: false, needsSidestep: false };
    }

    // Check if next tile is currently blocked
    if (isNextTileBlocked && isNextTileBlocked(this.targetTile)) {
      this.state = 'waiting_blocked';
      this.blockedTimer += deltaSec;

      if (this.blockedTimer >= this.profile.patience.repathAfterSec) {
        this.needsRepath = true;
      } else if (this.blockedTimer >= this.profile.patience.waitSec) {
        this.needsSidestep = true;
      }

      return {
        moved: false,
        reachedGoal: false,
        facingChanged: false,
        needsRepath: this.needsRepath,
        needsSidestep: this.needsSidestep
      };
    }

    // Tile is clear, resume walking
    if (this.state === 'waiting_blocked') {
      this.state = 'walking';
      this.blockedTimer = 0;
    }

    // Move smoothly towards target pixel position
    const dx = this.targetPx.x - this.x;
    const dy = this.targetPx.y - this.y;
    const dist = Math.hypot(dx, dy);

    // Determine facing direction from movement vector
    const oldFacing = this.facing;
    if (Math.abs(dx) > Math.abs(dy)) {
      this.facing = dx > 0 ? 'right' : 'left';
    } else if (Math.abs(dy) > 0.01) {
      this.facing = dy > 0 ? 'down' : 'up';
    }
    if (this.facing !== oldFacing) {
      facingChanged = true;
    }

    const stepSpeedPx = this.profile.speedTilesPerSec * 32; // 32px per tile
    const stepDist = stepSpeedPx * deltaSec;

    if (dist <= stepDist || dist < 1.0) {
      // Arrived at target tile center
      this.x = this.targetPx.x;
      this.y = this.targetPx.y;
      this.currentTile = { ...this.targetTile };
      moved = true;

      // Advance to next node in path
      this.pathIdx++;
      if (this.pathIdx < this.path.length) {
        this.advanceToNextPathNode();
      } else {
        // Reached end of path
        this.targetTile = null;
        this.targetPx = null;
        this.state = 'arriving';
        reachedGoal = true;
      }
    } else {
      // Interpolate position along vector
      this.x += (dx / dist) * stepDist;
      this.y += (dy / dist) * stepDist;
      moved = true;
    }

    return {
      moved,
      reachedGoal,
      facingChanged,
      needsRepath: this.needsRepath,
      needsSidestep: this.needsSidestep
    };
  }

  private advanceToNextPathNode(): void {
    if (this.pathIdx < this.path.length) {
      this.targetTile = { ...this.path[this.pathIdx] };
      this.targetPx = tileToPx(this.targetTile.col, this.targetTile.row);
    }
  }

  /**
   * Player dialogue interaction hook: freezes movement, faces player, saves previous facing.
   */
  startInteraction(playerX: number, playerY: number): void {
    if (this.state === 'interacting') return;

    this.preInteractFacing = this.facing;
    this.preInteractState = this.state;
    this.state = 'interacting';

    // Face player
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      this.facing = dx > 0 ? 'right' : 'left';
    } else {
      this.facing = dy > 0 ? 'down' : 'up';
    }
  }

  /**
   * Resumes movement/idle state and restores previous facing direction upon dialogue close.
   */
  endInteraction(): void {
    if (this.state !== 'interacting') return;

    this.facing = this.preInteractFacing;
    this.state = this.preInteractState;
  }

  /**
   * Turns head towards player if player enters notice radius while idle.
   */
  noticePlayer(playerX: number, playerY: number): boolean {
    if (this.state !== 'idle' && this.state !== 'activity') return false;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const distTiles = Math.hypot(dx, dy) / 32;

    if (distTiles <= this.profile.noticePlayerRadiusTiles) {
      if (Math.abs(dx) > Math.abs(dy)) {
        this.facing = dx > 0 ? 'right' : 'left';
      } else {
        this.facing = dy > 0 ? 'down' : 'up';
      }
      return true;
    }
    return false;
  }

  /** Teleport/snaps entity to a specific tile and facing (safe for offscreen placement) */
  snapToTile(tile: GridTile, facing?: Facing): void {
    this.currentTile = { ...tile };
    const px = tileToPx(tile.col, tile.row);
    this.x = px.x;
    this.y = px.y;
    if (facing) this.facing = facing;
    this.targetTile = null;
    this.targetPx = null;
    this.path = [];
    this.pathIdx = 0;
  }
}
