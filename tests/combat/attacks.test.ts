// tests/combat/attacks.test.ts - Attack Framework and Validator Unit Tests
import { describe, it, expect } from 'vitest';
import { ATTACKS_DB, validateAttacks } from '../../src/config/attacks.db';

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
});
