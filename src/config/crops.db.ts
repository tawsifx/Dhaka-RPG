// src/config/crops.db.ts - Stardew-scale seasonal Dhaka & Realm crop definitions
import { CropDef } from '../types/stardew.types';

export const CROPS_DB: Record<string, CropDef> = {
  rajshahi_mango: {
    id: 'rajshahi_mango',
    name: 'Rajshahi Fazli Mango',
    seedItemId: 'seed_mango',
    harvestItemId: 'fruit_mango',
    seasons: ['summer'],
    growth: {
      stages: 4,
      daysPerStage: 3,
      regrowsAfterHarvest: true,
      regrowDays: 2
    },
    minYield: 1,
    maxYield: 3,
    xpValue: 24,
    sellPrice: 120,
    spriteKey: 'crop-mango'
  },

  sylhet_tea: {
    id: 'sylhet_tea',
    name: 'Sylhet Camellia Tea Bush',
    seedItemId: 'seed_tea',
    harvestItemId: 'leaves_tea',
    seasons: ['spring', 'monsoon', 'autumn'],
    growth: {
      stages: 4,
      daysPerStage: 2,
      regrowsAfterHarvest: true,
      regrowDays: 1
    },
    minYield: 2,
    maxYield: 5,
    xpValue: 18,
    sellPrice: 45,
    spriteKey: 'crop-tea'
  },

  dhaka_jute: {
    id: 'dhaka_jute',
    name: 'Golden Valley Jute',
    seedItemId: 'seed_jute',
    harvestItemId: 'fiber_jute',
    seasons: ['monsoon'],
    growth: {
      stages: 5,
      daysPerStage: 2,
      regrowsAfterHarvest: false
    },
    minYield: 3,
    maxYield: 6,
    xpValue: 30,
    sellPrice: 85,
    spriteKey: 'crop-jute'
  },

  beli_flower: {
    id: 'beli_flower',
    name: 'Curzon Beli Garland Bloom',
    seedItemId: 'seed_beli',
    harvestItemId: 'flower_beli',
    seasons: ['spring', 'summer'],
    growth: {
      stages: 4,
      daysPerStage: 1,
      regrowsAfterHarvest: true,
      regrowDays: 2
    },
    minYield: 2,
    maxYield: 4,
    xpValue: 15,
    sellPrice: 60,
    spriteKey: 'crop-beli'
  },

  naga_morich: {
    id: 'naga_morich',
    name: 'Sreemangal Naga Fire Chili',
    seedItemId: 'seed_naga',
    harvestItemId: 'chili_naga',
    seasons: ['summer', 'autumn'],
    growth: {
      stages: 4,
      daysPerStage: 2,
      regrowsAfterHarvest: true,
      regrowDays: 3
    },
    minYield: 1,
    maxYield: 3,
    xpValue: 35,
    sellPrice: 150,
    spriteKey: 'crop-naga'
  },

  // Realm Exotic Crops
  spirit_dew_melon: {
    id: 'spirit_dew_melon',
    name: 'Whispering Spirit Melon',
    seedItemId: 'seed_spirit_melon',
    harvestItemId: 'spirit_dew',
    seasons: ['spring', 'summer', 'autumn'],
    growth: {
      stages: 5,
      daysPerStage: 3,
      regrowsAfterHarvest: false
    },
    minYield: 2,
    maxYield: 4,
    xpValue: 50,
    sellPrice: 280,
    spriteKey: 'crop-spirit-melon'
  },

  frost_star_berry: {
    id: 'frost_star_berry',
    name: 'Cryo Star Berry',
    seedItemId: 'seed_star_berry',
    harvestItemId: 'frost_crystal',
    seasons: ['winter'],
    growth: {
      stages: 4,
      daysPerStage: 2,
      regrowsAfterHarvest: true,
      regrowDays: 2
    },
    minYield: 1,
    maxYield: 2,
    xpValue: 40,
    sellPrice: 220,
    spriteKey: 'crop-star-berry'
  }
};
