// src/config/recipes.db.ts - CRAFT_RECIPES migrated from game.js

export interface CraftRecipeDef {
  id: string;
  result: string;
  name: string;
  costDesc: string;
  reqs: Record<string, number>;
}

export const CRAFT_RECIPES: CraftRecipeDef[] = [
  {
    id: 'craft_cha',
    result: 'cha',
    name: 'Brew Restorative Malai Cha (x1)',
    costDesc: '1x Emerald Spirit Dew',
    reqs: { spirit_dew: 1 }
  },
  {
    id: 'craft_emerald_wand',
    result: 'emerald_wand',
    name: 'Forge Sylvan Rootblade (+16 ATK)',
    costDesc: '2x Emerald Spirit Dew',
    reqs: { spirit_dew: 2 }
  },
  {
    id: 'craft_sylvan_cloak',
    result: 'sylvan_cloak',
    name: 'Weave Whispering Moss Cloak (+14 DEF)',
    costDesc: '2x Emerald Spirit Dew + 1x Luminous Coral Shard',
    reqs: { spirit_dew: 2, coral_shard: 1 }
  },
  {
    id: 'craft_tidal_trident',
    result: 'tidal_trident',
    name: 'Craft Coral Tideglaive (+24 ATK)',
    costDesc: '2x Luminous Coral Shard',
    reqs: { coral_shard: 2 }
  },
  {
    id: 'craft_ember_sword',
    result: 'ember_greatsword',
    name: 'Forge Emberfall Sunblade (+34 ATK)',
    costDesc: '2x Volcanic Ember Ore + 1x Luminous Coral Shard',
    reqs: { ember_ore: 2, coral_shard: 1 }
  },
  {
    id: 'craft_frost_mantle',
    result: 'frost_mantle',
    name: 'Tailor Aurora Fur Mantle (+26 DEF)',
    costDesc: '2x Permafrost Star Crystal + 1x Volcanic Ember Ore',
    reqs: { frost_crystal: 2, ember_ore: 1 }
  },
  {
    id: 'craft_astral_blade',
    result: 'astral_starblade',
    name: 'Awaken Starlight Crescent Blade (+50 ATK)',
    costDesc: '1x Spirit Dew + 1x Coral Shard + 1x Ember Ore + 1x Frost Crystal',
    reqs: { spirit_dew: 1, coral_shard: 1, ember_ore: 1, frost_crystal: 1 }
  }
];
