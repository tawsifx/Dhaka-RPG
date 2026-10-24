import { describe, it, expect } from 'vitest';
import { GameDB } from '../src/config/databaseIndex';

describe('GameDB Indexed Database Engine', () => {
  it('indexes all items by ID and category for O(1) lookup', () => {
    const cha = GameDB.getItem('cha');
    expect(cha).toBeDefined();
    expect(cha?.name).toContain('Malai Cha');

    const keepsakes = GameDB.getItemsByCategory('keepsake');
    expect(keepsakes.length).toBeGreaterThanOrEqual(5);

    const weapons = GameDB.getItemsByCategory('weapon');
    expect(weapons.some(w => w.id === 'astral_starblade')).toBe(true);
  });

  it('indexes crops by ID, seed ID, and season', () => {
    const mango = GameDB.getCrop('rajshahi_mango');
    expect(mango).toBeDefined();

    const bySeed = GameDB.getCropBySeed('seed_mango');
    expect(bySeed?.id).toBe('rajshahi_mango');

    const monsoonCrops = GameDB.getCropsForSeason('monsoon');
    expect(monsoonCrops.some(c => c.id === 'dhaka_jute')).toBe(true);
  });

  it('indexes crafting recipes by required material', () => {
    const spiritDewRecipes = GameDB.getRecipesUsingMaterial('spirit_dew');
    expect(spiritDewRecipes.length).toBeGreaterThanOrEqual(3);
    expect(spiritDewRecipes.some(r => r.result === 'cha')).toBe(true);
  });

  it('indexes NPC schedules by home map, scheduled map, and tier', () => {
    const dhakaNpcs = GameDB.getNpcsForMap('dhaka');
    expect(dhakaNpcs.length).toBeGreaterThanOrEqual(15);
    expect(dhakaNpcs.some(n => n.npcId === 'ahona')).toBe(true);
    expect(dhakaNpcs.some(n => n.npcId === 'rakin')).toBe(true);

    const farmNpcs = GameDB.getNpcsForMap('farmhouse');
    expect(farmNpcs.some(n => n.npcId === 'chacha_rafiq')).toBe(true);
  });

  it('indexes combat attacks by ID and source', () => {
    expect(GameDB.attacksById.size).toBeGreaterThan(0);
    const bossAttacks = GameDB.attacksBySource.get('boss') || [];
    expect(bossAttacks.length).toBeGreaterThan(0);
  });
});
