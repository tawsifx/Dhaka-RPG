// tests/stats.test.ts - Unit tests for RPGStats & leveling math
import { describe, it, expect, beforeEach } from 'vitest';
import { DateState } from '../src/state/DateState';
import { RPGStats } from '../src/state/RPGStats';
import { ITEMS_DB } from '../src/config/items.db';

describe('RPGStats System', () => {
  beforeEach(() => {
    // Reset DateState to clean base values
    DateState.level = 1;
    DateState.xp = 0;
    DateState.xpToNext = 100;
    DateState.hp = 100;
    DateState.maxHp = 100;
    DateState.sp = 50;
    DateState.maxSp = 50;
    DateState.baseAtk = 12;
    DateState.baseDef = 5;
    DateState.inventory = ['umbrella_blade', 'yellow_raincoat'];
    DateState.itemCounts = { umbrella_blade: 1, yellow_raincoat: 1 };
    DateState.equipped = {
      weapon: 'umbrella_blade',
      armor: 'yellow_raincoat',
      accessory: null
    };
  });

  it('calculates initial attack power correctly with umbrella_blade', () => {
    // baseAtk: 12 + (1 - 1)*4 + umbrella_blade ATK (8) = 20
    const atk = RPGStats.getAtk();
    expect(atk).toBe(20);
  });

  it('calculates initial defense power correctly with yellow_raincoat', () => {
    // baseDef: 5 + (1 - 1)*2 + yellow_raincoat DEF (6) = 11
    const def = RPGStats.getDef();
    expect(def).toBe(11);
  });

  it('updates attack power when equipping higher tier weapons', () => {
    DateState.equipped.weapon = 'astral_starblade'; // ATK: 50
    const atk = RPGStats.getAtk();
    expect(atk).toBe(12 + 50); // 62
  });

  it('correctly adds and stacks items in inventory', () => {
    RPGStats.addItem('cha', 3);
    expect(DateState.inventory).toContain('cha');
    expect(DateState.itemCounts['cha']).toBe(3);

    RPGStats.addItem('cha', 2);
    expect(DateState.itemCounts['cha']).toBe(5);
  });

  it('removes item quantities properly and removes item ID when empty', () => {
    RPGStats.addItem('flower', 2);
    expect(RPGStats.hasItem('flower', 2)).toBe(true);

    const removed = RPGStats.removeItem('flower', 1);
    expect(removed).toBe(true);
    expect(DateState.itemCounts['flower']).toBe(1);

    RPGStats.removeItem('flower', 1);
    expect(DateState.inventory).not.toContain('flower');
    expect(RPGStats.hasItem('flower', 1)).toBe(false);
  });

  it('handles XP gain and level up math progression', () => {
    expect(DateState.level).toBe(1);
    expect(DateState.maxHp).toBe(100);

    // Give 150 XP (100 to level up, 50 rollover)
    const res = RPGStats.gainXP(150);
    expect(res.leveled).toBe(true);
    expect(res.newLevel).toBe(2);
    expect(DateState.level).toBe(2);
    expect(DateState.xp).toBe(50);
    expect(DateState.maxHp).toBe(120); // +20 on level up
    expect(DateState.maxSp).toBe(60);  // +10 on level up
    expect(DateState.xpToNext).toBe(Math.floor(100 * 1.35)); // 135
  });

  it('scales attack and defense with character levels', () => {
    RPGStats.gainXP(300); // multiple level ups
    const level = DateState.level;
    expect(level).toBeGreaterThan(1);

    const expectedAtk = DateState.baseAtk + (level - 1) * 4 + (ITEMS_DB[DateState.equipped.weapon]?.atk || 0);
    expect(RPGStats.getAtk()).toBe(expectedAtk);
  });
});
