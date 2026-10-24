// tests/npc/mover.test.ts - Vitest unit tests for NpcMover
import { beforeEach, describe, expect, it } from 'vitest';
import { NpcMover } from '../../src/systems/npc/NpcMover';
import { tileToPx } from '../../src/types/npc.types';

describe('NpcMover: Stepping & Facing', () => {
  let mover: NpcMover;

  beforeEach(() => {
    mover = new NpcMover({ col: 10, row: 10 }, 'down', {
      speedTilesPerSec: 2.0, // 64 px / sec
      stepStyle: 'tile-step',
      idleBehaviors: [],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 1.0, repathAfterSec: 3.0 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    });
  });

  it('initializes at exact tile center coordinates', () => {
    const expected = tileToPx(10, 10);
    expect(mover.x).toBe(expected.x);
    expect(mover.y).toBe(expected.y);
    expect(mover.facing).toBe('down');
    expect(mover.state).toBe('idle');
  });

  it('updates position and facing when stepping along a path', () => {
    // Path: (10, 10) -> (12, 10) (moving Right 2 tiles = 64px)
    mover.setPath([
      { col: 10, row: 10 },
      { col: 11, row: 10 },
      { col: 12, row: 10 }
    ]);
    expect(mover.state).toBe('walking');

    // Advance 0.5s at 64px/sec = 32px (should reach (11, 10))
    const res = mover.update(0.5);
    expect(res.moved).toBe(true);
    expect(mover.facing).toBe('right');
    expect(mover.currentTile).toEqual({ col: 11, row: 10 });

    // Advance another 0.5s = reaches (12, 10) and finishes
    const res2 = mover.update(0.5);
    expect(res2.reachedGoal).toBe(true);
    expect(mover.currentTile).toEqual({ col: 12, row: 10 });
    expect(mover.x).toBe(tileToPx(12, 10).x);
  });

  it('faces up when moving vertically upward', () => {
    mover.setPath([
      { col: 10, row: 10 },
      { col: 10, row: 9 }
    ]);
    mover.update(0.1);
    expect(mover.facing).toBe('up');
  });

  it('faces down when moving vertically downward', () => {
    mover.setPath([
      { col: 10, row: 10 },
      { col: 10, row: 11 }
    ]);
    mover.update(0.1);
    expect(mover.facing).toBe('down');
  });

  it('faces left when moving horizontally left', () => {
    mover.setPath([
      { col: 10, row: 10 },
      { col: 9, row: 10 }
    ]);
    mover.update(0.1);
    expect(mover.facing).toBe('left');
  });
});

describe('NpcMover: Yielding & Patience', () => {
  let mover: NpcMover;

  beforeEach(() => {
    mover = new NpcMover({ col: 10, row: 10 }, 'down', {
      speedTilesPerSec: 2.0,
      stepStyle: 'tile-step',
      idleBehaviors: [],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 1.0, repathAfterSec: 3.0 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    });
  });

  it('pauses and enters waiting_blocked when next tile is blocked', () => {
    mover.setPath([
      { col: 10, row: 10 },
      { col: 11, row: 10 }
    ]);

    // Next tile is (11, 10) - simulate player standing there
    const isBlocked = (t: { col: number; row: number }) => t.col === 11 && t.row === 10;

    const res1 = mover.update(0.2, isBlocked);
    expect(res1.moved).toBe(false);
    expect(mover.state).toBe('waiting_blocked');

    // Wait until waitSec (1.0s) passes -> needsSidestep becomes true
    const res2 = mover.update(0.9, isBlocked);
    expect(res2.needsSidestep).toBe(true);
    expect(res2.needsRepath).toBe(false);

    // Wait until repathAfterSec (3.0s) passes -> needsRepath becomes true
    const res3 = mover.update(2.0, isBlocked);
    expect(res3.needsRepath).toBe(true);
  });
});

describe('NpcMover: Interaction & Player Noticing', () => {
  let mover: NpcMover;

  beforeEach(() => {
    mover = new NpcMover({ col: 10, row: 10 }, 'up');
  });

  it('freezes, turns to face player on talk, and restores previous facing on exit', () => {
    const center = tileToPx(10, 10);
    // Player stands to the right of NPC: (center.x + 50, center.y)
    mover.startInteraction(center.x + 50, center.y);
    expect(mover.state).toBe('interacting');
    expect(mover.facing).toBe('right'); // turned right to face player

    // Dialogue closes
    mover.endInteraction();
    expect(mover.state).toBe('idle');
    expect(mover.facing).toBe('up'); // restored original facing
  });

  it('turns head towards player when player enters notice radius while idle', () => {
    const center = tileToPx(10, 10);
    // Player walks 1 tile to the left: (center.x - 32, center.y)
    const noticed = mover.noticePlayer(center.x - 32, center.y);
    expect(noticed).toBe(true);
    expect(mover.facing).toBe('left');
  });
});
