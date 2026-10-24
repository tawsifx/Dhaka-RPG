import { describe, it, expect } from 'vitest';
import { GameDB, paginateList } from '../src/config/databaseIndex';

describe('GameDB Indexed Database Engine & Pagination', () => {
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

  it('paginates large lists and database queries accurately', () => {
    const sample = Array.from({ length: 16 }, (_, i) => `chapter_${i + 1}`);
    const page1 = paginateList(sample, 1, 6);
    expect(page1.items.length).toBe(6);
    expect(page1.totalPages).toBe(3);
    expect(page1.hasPrev).toBe(false);
    expect(page1.hasNext).toBe(true);
    expect(page1.startIndex).toBe(0);
    expect(page1.endIndex).toBe(6);

    const page3 = paginateList(sample, 3, 6);
    expect(page3.items.length).toBe(4);
    expect(page3.hasPrev).toBe(true);
    expect(page3.hasNext).toBe(false);

    const itemsPage = GameDB.getItemsPaginated(1, 5);
    expect(itemsPage.items.length).toBe(5);
    expect(itemsPage.totalItems).toBeGreaterThan(20);

    const npcsPage = GameDB.getNpcsPaginated(2, 6, 'dhaka');
    expect(npcsPage.page).toBe(2);
    expect(npcsPage.items.length).toBe(6);
  });
});
