// tests/combat/attacks.test.ts - Attack Framework and Validator Unit Tests
import { describe, it, expect, vi } from 'vitest';
import { ATTACKS_DB, validateAttacks } from '../../src/config/attacks.db';

vi.mock('phaser', () => ({
  default: {
    Math: {
      Distance: {
        Between: (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1)
      },
      Clamp: (v: number, min: number, max: number) => Math.min(Math.max(v, min), max),
      DegToRad: (deg: number) => (deg * Math.PI) / 180,
      Angle: {
        Between: (x1: number, y1: number, x2: number, y2: number) => Math.atan2(y2 - y1, x2 - x1)
      }
    }
  }
}));

describe('Data-Driven Attack Framework (attacks.db.ts)', () => {
  it('passes all telegraph and windup validation rules', () => {
    const result = validateAttacks();
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('contains player combo attacks with responsive frame data', () => {
    const jab = ATTACKS_DB.player_jab;
    const slash = ATTACKS_DB.player_slash;
    const spin = ATTACKS_DB.player_spin;
    const parry = ATTACKS_DB.player_parry;

    expect(jab).toBeDefined();
    expect(jab.windupMs).toBe(70);
    expect(jab.activeMs).toBe(60);
    expect(jab.cancelInto).toContain('player_slash');

    expect(slash).toBeDefined();
    expect(slash.windupMs).toBe(90);
    expect(slash.activeMs).toBe(80);
    expect(slash.cancelInto).toContain('player_spin');

    expect(spin).toBeDefined();
    expect(spin.windupMs).toBe(120);
    expect(spin.activeMs).toBe(140);
    expect(spin.poiseDamage).toBeGreaterThan(40);

    expect(parry).toBeDefined();
    expect(parry.activeMs).toBe(150); // 150ms parry window
  });

  it('contains Totoro companion abilities with distinct assists', () => {
    const roar = ATTACKS_DB.totoro_roar;
    const slam = ATTACKS_DB.totoro_slam;
    const gust = ATTACKS_DB.totoro_leaf_gust;
    const assist = ATTACKS_DB.totoro_assist_tackle;

    expect(roar).toBeDefined();
    expect(roar.poiseDamage).toBeGreaterThanOrEqual(60);

    expect(slam).toBeDefined();
    expect(slam.damageMult).toBeGreaterThanOrEqual(2.5);

    expect(gust).toBeDefined();
    expect(assist).toBeDefined();
  });

  it('enforces boss windup >= 400ms and mob windup >= 300ms', () => {
    for (const [id, atk] of Object.entries(ATTACKS_DB)) {
      if (atk.source === 'enemy') {
        expect(atk.windupMs >= 300 || (atk.fast && Boolean(atk.fastReason))).toBe(true);
      }
      if (atk.source === 'boss') {
        expect(atk.windupMs >= 400 || (atk.fast && Boolean(atk.fastReason))).toBe(true);
      }
    }
  });

  it('enforces telegraph color language rules', () => {
    for (const [id, atk] of Object.entries(ATTACKS_DB)) {
      if (atk.telegraph) {
        if (atk.telegraph.color === 'gold') expect(atk.parryable).toBe(true);
        if (atk.telegraph.color === 'red') expect(atk.dodgeOnly).toBe(true);
        if (atk.telegraph.color === 'purple') expect(atk.totoroInterrupt).toBe(true);
      }
    }
  });

  it('validates boss Phase 2 signature interrupt charge and mob encounter specs', () => {
    const barrierCharge = ATTACKS_DB.stag_nature_barrier_charge;
    expect(barrierCharge).toBeDefined();
    expect(barrierCharge.source).toBe('boss');
    expect(barrierCharge.totoroInterrupt).toBe(true);
    expect(barrierCharge.telegraph?.color).toBe('purple');
    expect(barrierCharge.windupMs).toBeGreaterThanOrEqual(1000); // Generous windup window for Totoro Q interrupt

    const antlerSweep = ATTACKS_DB.stag_antler_sweep;
    expect(antlerSweep.parryable).toBe(true);
    expect(antlerSweep.hitbox.radius).toBeGreaterThanOrEqual(85);

    const boglingHop = ATTACKS_DB.bogling_spore_hop;
    expect(boglingHop.source).toBe('enemy');
    expect(boglingHop.parryable).toBe(true);
  });

  it('prohibits combat attacks and guard in farmhouse, on farmland, and during farming actions', async () => {
    const { CombatSystem } = await import('../../src/systems/CombatSystem');
    const { FarmingSystem } = await import('../../src/systems/FarmingSystem');
    const { DateState } = await import('../../src/state/DateState');

    const farming = new FarmingSystem(20, 20);

    // 1. In farmhouse
    DateState.currentWorld = 'farmhouse';
    const farmhouseScene: any = {
      currentWorld: 'farmhouse',
      player: { x: 300, y: 300 },
      farmingSystem: farming,
      time: { now: 1000 }
    };
    expect(CombatSystem.isCombatRestricted(farmhouseScene)).toBe(true);

    // Attempt attack in farmhouse - should be blocked
    let attackTriggered = false;
    farmhouseScene.tweens = {
      add: () => { attackTriggered = true; }
    };
    CombatSystem.performPlayerAttack(farmhouseScene);
    expect(farmhouseScene.isAttacking).toBeFalsy();
    expect(attackTriggered).toBe(false);

    // 2. In normal world, not on farmland
    DateState.currentWorld = 'dhaka';
    const normalScene: any = {
      currentWorld: 'dhaka',
      player: { x: 320, y: 320 }, // Tile (10, 10)
      farmingSystem: farming,
      time: { now: 1000 },
      facingVec: { x: 0, y: 1 }
    };
    expect(CombatSystem.isCombatRestricted(normalScene)).toBe(false);

    // 3. During active farming action (e.g. hoeing)
    normalScene.isFarmingAction = true;
    expect(CombatSystem.isCombatRestricted(normalScene)).toBe(true);
    normalScene.isFarmingAction = false;

    // 4. Standing on tilled farmland
    farming.tillSoil(10, 10);
    const standingOnFarmlandScene: any = {
      currentWorld: 'dhaka',
      player: { x: 10 * 32 + 16, y: 10 * 32 + 16 },
      farmingSystem: farming,
      time: { now: 1000 },
      facingVec: { x: 0, y: 1 }
    };
    expect(CombatSystem.isCombatRestricted(standingOnFarmlandScene)).toBe(true);

    // 5. Standing on normal ground but facing tilled farmland
    const facingFarmlandScene: any = {
      currentWorld: 'dhaka',
      player: { x: 10 * 32 + 16, y: 9 * 32 + 16 }, // Tile (10, 9)
      facingVec: { x: 0, y: 1 },  // Facing south towards (10, 10)
      farmingSystem: farming,
      time: { now: 1000 }
    };
    expect(CombatSystem.isCombatRestricted(facingFarmlandScene)).toBe(true);

    // 6. Target coordinate clicked on farmland
    const distantPlayerScene: any = {
      currentWorld: 'dhaka',
      player: { x: 50, y: 50 },
      facingVec: { x: 1, y: 0 },
      farmingSystem: farming,
      time: { now: 1000 }
    };
    expect(CombatSystem.isCombatRestricted(distantPlayerScene)).toBe(false);
    expect(CombatSystem.isCombatRestricted(distantPlayerScene, { col: 10, row: 10 })).toBe(true);
  });
});
