// src/config/assetSpecs.manifest.ts - AI-Readable Asset Specification Manifest & Single Source of Truth
// Standardized for 32x32 Grid World, Stardew Valley & Pokémon HGSS conventions

export type AssetCategory =
  | 'tileset'
  | 'autotile'
  | 'character'
  | 'companion'
  | 'landmark'
  | 'stall'
  | 'tree'
  | 'crop'
  | 'enemy'
  | 'boss';

export interface CollisionFootprint {
  widthTiles: number;
  heightTiles: number;
  offsetX?: number; // in tiles from center
  offsetY?: number; // in tiles from foot baseline
}

export interface GridFootprint {
  cols: number;
  rows: number;
  collision?: CollisionFootprint;
}

export interface RecommendedDownloadSpecs {
  preferredFrameSize: { width: number; height: number };
  acceptedNativeSizes: string[];
  sheetLayout: string;
  origin: { x: number; y: number };
  styleSearchTags: string[];
}

export interface AnimationEventDef {
  frame: number;
  type: 'hitbox_on' | 'hitbox_off' | 'sfx' | 'vfx' | 'shake' | 'spawn_projectile' | 'i_frames_on' | 'i_frames_off' | 'parry_window';
  payload?: any;
}

export interface AnimationSpec {
  name: string;
  frameCount: number;
  frameRate: number;
  row?: number;
  loop?: boolean;
  events?: AnimationEventDef[];
}

export interface AssetSourceInfo {
  author?: string;
  url?: string;
  license?: string;
  date?: string;
  provenance?: 'licensed' | 'cc0' | 'cc-by' | 'custom' | 'placeholder';
}

export interface AssetSpec {
  id: string;
  name: string;
  category: AssetCategory;
  description: string;
  externalPath: string;
  fallbackProceduralKey: string;
  logicalGridFootprint: GridFootprint;
  recommendedDownloadSpecs: RecommendedDownloadSpecs;
  hasAnimJson?: boolean;
  hasExternalFile?: boolean;
  anchor?: { x: number; y: number };
  source?: AssetSourceInfo;
  animations?: Record<string, AnimationSpec>;
  attackRefs?: string[];
}

/**
 * Universal Master Asset Specification Manifest
 * Machine-readable index for all external graphic assets, overrides, and procedural fallbacks.
 */
export const ASSET_SPECS_MANIFEST: Record<string, AssetSpec> = {
  // =========================================================================
  // 1. TERRAIN & AUTOTILE SHEETS ('tileset' | 'autotile')
  // =========================================================================
  'dhaka-tileset-32': {
    id: 'dhaka-tileset-32',
    name: 'Dhaka Valley 32x32 Ground & Meadow Atlas',
    category: 'tileset',
    description: '12 distinct 32x32 terrain tiles (grass variations, clovers, Krishnachura petals, Aparajita flowers, dirt pebbles).',
    externalPath: 'assets/tilesets/dhaka_valley_tileset.png',
    fallbackProceduralKey: 'dhaka-tileset-32',
    logicalGridFootprint: { cols: 4, rows: 3 },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 32 },
      acceptedNativeSizes: ['16x16 (auto-2x)', '32x32 (1:1)'],
      sheetLayout: '4 cols x 3 rows atlas: Row 0=Lush Grass variations, Row 1=Flower blossoms, Row 2=Path & dirt fringes',
      origin: { x: 0, y: 0 },
      styleSearchTags: ['Stardew Valley terrain', '16-bit RPG tileset', 'lush meadow', 'pixel art flowers', 'seamless 32x32']
    }
  },
  'autotile-stone-path': {
    id: 'autotile-stone-path',
    name: 'Dhaka Heritage Cobblestone & Flagstone Autotile',
    category: 'autotile',
    description: '16-tile 4-bit Wang/Blob autotiling layout for seamless stone walkways with bevelled flagstone edges and moss mortar.',
    externalPath: 'assets/tilesets/autotile_stone_path.png',
    fallbackProceduralKey: 'tile-path',
    logicalGridFootprint: { cols: 4, rows: 4 },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 32 },
      acceptedNativeSizes: ['16x16 (auto-2x)', '32x32 (1:1)', 'RPG Maker A2/A4 strip'],
      sheetLayout: '4 cols x 4 rows (16 tiles): 4-bit neighbor bitmask (0=isolated to 15=solid interior)',
      origin: { x: 0, y: 0 },
      styleSearchTags: ['Stardew cobblestone path', 'RPG Maker autotile', 'flagstone walkway', '16-tile blob autotile']
    }
  },
  'autotile-farm-soil': {
    id: 'autotile-farm-soil',
    name: 'Green Meadows Farm Soil Autotile (Untilled, Tilled & Watered)',
    category: 'autotile',
    description: 'Dynamic 3-state autotiling soil plots (untilled turf, rich tilled loam, glistening dark watered soil).',
    externalPath: 'assets/tilesets/autotile_farm_soil.png',
    fallbackProceduralKey: 'tile-grass',
    logicalGridFootprint: { cols: 4, rows: 4 },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 32 },
      acceptedNativeSizes: ['16x16 (auto-2x)', '32x32 (1:1)', 'Stardew farm soil standard'],
      sheetLayout: '4 cols x 4 rows per moisture state: 4-bit Wang connected soil borders',
      origin: { x: 0, y: 0 },
      styleSearchTags: ['Stardew Valley hoe dirt', 'tilled soil autotile', 'farm ground 32x32', 'watered soil']
    }
  },
  'tuxemon-terrain': {
    id: 'tuxemon-terrain',
    name: 'Tuxemon Terrain (PastTheFuture Grass, Sand & Snow)',
    category: 'tileset',
    description: 'Open source CC-BY-SA 16x16 tile atlas auto-upscaled 2x to 32x32 for high-density ground diversity.',
    externalPath: 'assets/tilesets/PastTheFuture_Grass_Sand_Snow.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'dhaka-tileset-32',
    logicalGridFootprint: { cols: 16, rows: 16 },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 16, height: 16 },
      acceptedNativeSizes: ['16x16 (auto-2x)', '32x32 (1:1)'],
      sheetLayout: 'Continuous 16x16 grid tileset',
      origin: { x: 0, y: 0 },
      styleSearchTags: ['Tuxemon tileset', 'Pokémon GBA terrain', '16x16 pixel art grass', 'sand and snow']
    }
  },
  'tileset-pipo-base': {
    id: 'tileset-pipo-base',
    name: 'Pipoya Base Chip Tileset',
    category: 'tileset',
    description: 'Classic 32x32 Japanese indie RPG maker base terrain and structural elements.',
    externalPath: 'assets/tilesets/pipo_BaseChip.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'dhaka-tileset-32',
    logicalGridFootprint: { cols: 16, rows: 32 },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 32 },
      acceptedNativeSizes: ['32x32 (1:1)', '16x16 (auto-2x)'],
      sheetLayout: 'Standard 8-col or 16-col RPG Maker chip layout',
      origin: { x: 0, y: 0 },
      styleSearchTags: ['Pipoya basechip', 'top-down 32x32 RPG tileset', 'stone stairs', 'wooden bridges']
    }
  },
  'tileset-outdoor': {
    id: 'tileset-outdoor',
    name: 'Kelvin Shadewing Outdoor Tileset',
    category: 'tileset',
    description: 'High-contrast 16-bit RPG outdoor foliage, fences, cliff ledges and river embankments.',
    externalPath: 'assets/tilesets/Outdoor_Tiles_by_Kelvin_Shadewing.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'dhaka-tileset-32',
    logicalGridFootprint: { cols: 16, rows: 20 },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 16, height: 16 },
      acceptedNativeSizes: ['16x16 (auto-2x)', '32x32 (1:1)'],
      sheetLayout: '16x16 outdoor feature atlas',
      origin: { x: 0, y: 0 },
      styleSearchTags: ['outdoor pixel art', 'cliff ledges', 'river banks', 'wooden fences']
    }
  },
  'tileset-vegetation': {
    id: 'tileset-vegetation',
    name: 'George Vegetation Tileset',
    category: 'tileset',
    description: 'Lush bushes, reeds, water lilies, and decorative shrubbery.',
    externalPath: 'assets/tilesets/Vegetation_by_George.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'dhaka-tileset-32',
    logicalGridFootprint: { cols: 8, rows: 12 },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 16, height: 16 },
      acceptedNativeSizes: ['16x16 (auto-2x)', '32x32 (1:1)'],
      sheetLayout: '16x16 shrubbery and flora sheet',
      origin: { x: 0, y: 0 },
      styleSearchTags: ['RPG foliage', 'pixel art shrubs', 'water lilies', 'tall grass']
    }
  },
  'tile-forest': {
    id: 'tile-forest',
    name: 'Whispering Emerald Forest Ground',
    category: 'tileset',
    description: 'Deep emerald mossy forest floor with glowing spores and fallen ancient leaves.',
    externalPath: 'assets/tilesets/realm_forest_tileset.png',
    fallbackProceduralKey: 'tile-forest',
    logicalGridFootprint: { cols: 4, rows: 4 },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 32 },
      acceptedNativeSizes: ['32x32 (1:1)', '128x128 (seamless procedural)'],
      sheetLayout: '4 cols x 4 rows seamless forest ground',
      origin: { x: 0, y: 0 },
      styleSearchTags: ['mossy forest floor', 'spirit banyan biome', 'glowing spores', 'deep green tileset']
    }
  },
  'tile-sunken': {
    id: 'tile-sunken',
    name: 'Sunken Kingdom Tidepool & Reef Ground',
    category: 'tileset',
    description: 'Luminous underwater sand ripples, caustics, sea shells, and branching coral speckles.',
    externalPath: 'assets/tilesets/realm_sunken_tileset.png',
    fallbackProceduralKey: 'tile-sunken',
    logicalGridFootprint: { cols: 4, rows: 4 },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 32 },
      acceptedNativeSizes: ['32x32 (1:1)', '128x128 (seamless procedural)'],
      sheetLayout: '4 cols x 4 rows seabed and water caustics',
      origin: { x: 0, y: 0 },
      styleSearchTags: ['underwater reef tileset', 'sunken temple ground', 'aquamarine caustics', 'seashells']
    }
  },
  'tile-ember': {
    id: 'tile-ember',
    name: 'Emberfall Highlands Basalt & Magma Ground',
    category: 'tileset',
    description: 'Dark basalt tectonic plates, glowing magma fissures, and drifting ash specks.',
    externalPath: 'assets/tilesets/realm_ember_tileset.png',
    fallbackProceduralKey: 'tile-ember',
    logicalGridFootprint: { cols: 4, rows: 4 },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 32 },
      acceptedNativeSizes: ['32x32 (1:1)', '128x128 (seamless procedural)'],
      sheetLayout: '4 cols x 4 rows volcanic rock with magma veins',
      origin: { x: 0, y: 0 },
      styleSearchTags: ['volcanic caldera tileset', 'lava cracks', 'obsidian basalt ground', 'ember sparks']
    }
  },
  'tile-frost': {
    id: 'tile-frost',
    name: 'Kingdom of Eternal Frost Ice & Snow Ground',
    category: 'tileset',
    description: 'Wind-packed glacial snow, crystalline ice fissures, and sparkling permafrost.',
    externalPath: 'assets/tilesets/realm_frost_tileset.png',
    fallbackProceduralKey: 'tile-frost',
    logicalGridFootprint: { cols: 4, rows: 4 },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 32 },
      acceptedNativeSizes: ['32x32 (1:1)', '128x128 (seamless procedural)'],
      sheetLayout: '4 cols x 4 rows glacial snow with ice fractals',
      origin: { x: 0, y: 0 },
      styleSearchTags: ['snow tileset', 'ice crystal floor', 'winter observatory ground', 'frost biome']
    }
  },
  'tile-astral': {
    id: 'tile-astral',
    name: 'The Astral Realm Nebula Sanctuary Floor',
    category: 'tileset',
    description: 'Deep cosmic violet floor plates, nebula washes, glowing constellation glyphs, and stardust.',
    externalPath: 'assets/tilesets/realm_astral_tileset.png',
    fallbackProceduralKey: 'tile-astral',
    logicalGridFootprint: { cols: 4, rows: 4 },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 32 },
      acceptedNativeSizes: ['32x32 (1:1)', '128x128 (seamless procedural)'],
      sheetLayout: '4 cols x 4 rows celestial marble plates with rune nodes',
      origin: { x: 0, y: 0 },
      styleSearchTags: ['astral temple floor', 'cosmic nebula tileset', 'star runes', 'space sanctuary']
    }
  },
  'tile-curzon-floor': {
    id: 'tile-curzon-floor',
    name: 'Curzon Hall Parquet & Terrazzo Floor',
    category: 'tileset',
    description: 'Heritage red-brick polish, dark teakwood herringbone parquet, and brass border trim.',
    externalPath: 'assets/tilesets/curzon_interior_tileset.png',
    fallbackProceduralKey: 'tile-curzon-floor',
    logicalGridFootprint: { cols: 4, rows: 4 },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 32 },
      acceptedNativeSizes: ['32x32 (1:1)', '16x16 (auto-2x)'],
      sheetLayout: '32x32 interior academic floor and red carpet runners',
      origin: { x: 0, y: 0 },
      styleSearchTags: ['interior parquet floor', 'red carpet runner', 'Victorian university hall', 'teakwood tile']
    }
  },

  // =========================================================================
  // 2. CHARACTERS & COMPANIONS ('character' | 'companion')
  // =========================================================================
  'player': {
    id: 'player',
    name: 'Moon Walker (Protagonist)',
    category: 'character',
    description: 'Joyful Ghibli-inspired heroine with amber-orange suspender skirt, pale yellow shirt, bob hair and parasol.',
    externalPath: 'assets/sprites/characters/moon_walker.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'player-0',
    logicalGridFootprint: {
      cols: 1,
      rows: 1,
      collision: { widthTiles: 0.625, heightTiles: 0.44, offsetY: 0.05 } // 20x14px hitbox at feet
    },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x -> 32x64)', '32x48 (1:1)', '48x56 (game.js fallback)', '64x64 (LPC foot-aligned)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up (Frames 0,1,2,3 walk cycle)',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['Stardew Valley female farmer', 'HGSS trainer sprite', 'Ghibli female protagonist', '16-bit RPG walk cycle']
    }
  },
  'totoro': {
    id: 'totoro',
    name: 'Totoro (Forest Avatar of Affection)',
    category: 'companion',
    description: 'Giant cuddly slate-sage forest spirit with cream chevron belly, bunny ears, chibi Totoro perched on head.',
    externalPath: 'assets/sprites/characters/totoro.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'totoro-0',
    logicalGridFootprint: {
      cols: 2,
      rows: 1,
      collision: { widthTiles: 1.8, heightTiles: 0.8, offsetY: 0.1 } // 58x26px foot shadow hitbox
    },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 64, height: 76 },
      acceptedNativeSizes: ['32x38 (auto-2x -> 64x76)', '64x76 (1:1)', '68x76 (game.js fallback)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up (Heavy waddling step animation)',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['My Neighbor Totoro sprite', 'large friendly creature RPG', 'Ghibli companion walk cycle', 'pixel art Totoro']
    }
  },
  'npc-ahona': {
    id: 'npc-ahona',
    name: 'Ahona (Dhaka Fashionista & Stylist)',
    category: 'character',
    description: 'Campus trendsetter in vibrant crimson-magenta Jamdani kurti, ivory quilted bag and emerald jhumkas.',
    externalPath: 'assets/sprites/characters/npc_ahona.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-ahona',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)', '38x62 (game.js fallback)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['Bengali kurti pixel art', 'fashionable female NPC', 'Stardew Valley townsperson', 'Jamdani dress']
    }
  },
  'npc-apshora': {
    id: 'npc-apshora',
    name: 'Apshora (Haute Couture Fashionista)',
    category: 'character',
    description: 'High-fashion socialite in royal violet silk kameez, rose-gold chiffon dupatta and metallic handbag.',
    externalPath: 'assets/sprites/characters/npc_apshora.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-apshora',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)', '38x62 (game.js fallback)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['violet silk kameez', 'chic RPG NPC', 'dupatta animation', 'HGSS female citizen']
    }
  },
  'npc-tea': {
    id: 'npc-tea',
    name: 'Tong-er Mama (TSC Cha Master)',
    category: 'character',
    description: 'Beloved tea vendor in checkered blue lungi and gamcha, boiling spiced cardamom milk tea.',
    externalPath: 'assets/sprites/characters/npc_tea_vendor.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-tea',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)', '52x58 (game.js fallback)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['street vendor pixel art', 'tea master lungi', 'Dhaka TSC cha stall', 'South Asian RPG character']
    }
  },
  'npc-fuchka': {
    id: 'npc-fuchka',
    name: 'Mama Fuchkawala (Street Food Vendor)',
    category: 'character',
    description: 'Crispy puchka maker in green apron with spicy tamarind tok bowl and boiled potato mix.',
    externalPath: 'assets/sprites/characters/npc_fuchka_vendor.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-fuchka',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)', '52x58 (game.js fallback)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['fuchka vendor', 'street food chef', 'Dhaka merchant', 'pixel art apron']
    }
  },
  'npc-books': {
    id: 'npc-books',
    name: 'Nilkhet Book Seller',
    category: 'character',
    description: 'Scholarly merchant surrounded by stacks of vintage novels, poetry, and academic texts.',
    externalPath: 'assets/sprites/characters/npc_book_vendor.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-books',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)', '52x58 (game.js fallback)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['bookkeeper NPC', 'scholarly merchant', 'spectacles professor', 'Nilkhet book lane']
    }
  },
  'npc-phulwali': {
    id: 'npc-phulwali',
    name: 'Beli Phulwali (Flower Maiden)',
    category: 'character',
    description: 'Gentle flower weaver in magenta saree crafting fragrant white Jasmine & Beli garlands.',
    externalPath: 'assets/sprites/characters/npc_phulwali.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-phulwali',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)', '52x58 (game.js fallback)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['flower maiden saree', 'Ramna flower seller', 'jasmine garland girl', 'Stardew florist']
    }
  },
  'npc-rakin': {
    id: 'npc-rakin',
    name: 'Rakin (Acoustic Guitarist & Rival)',
    category: 'character',
    description: 'Charming campus musician in denim jacket with wooden acoustic guitar slung over shoulder.',
    externalPath: 'assets/sprites/characters/npc_rakin.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-rakin',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)', '52x58 (game.js fallback)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['guitarist pixel art', 'musician rival RPG', 'denim jacket student', 'acoustic guitarist']
    }
  },
  'npc-anamika': {
    id: 'npc-anamika',
    name: 'Anamika (Poetry & Literature Enthusiast)',
    category: 'character',
    description: 'Quiet literature scholar reading Kazi Nazrul and Tagore poems near Aparajeyo Bangla.',
    externalPath: 'assets/sprites/characters/npc_anamika.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-anamika',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)', '52x58 (game.js fallback)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['poet girl RPG', 'book reading student', 'traditional salwar kameez', 'campus scholar']
    }
  },
  'npc-cat': {
    id: 'npc-cat',
    name: 'Mimi (Campus Calico Cat)',
    category: 'character',
    description: 'Playful calico feline wandering Curzon Hall lawns and sleeping near tea stalls.',
    externalPath: 'assets/sprites/characters/npc_cat_mimi.png',
    fallbackProceduralKey: 'npc-cat',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.5, heightTiles: 0.3 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 32 },
      acceptedNativeSizes: ['16x16 (auto-2x)', '32x32 (1:1)', '42x36 (game.js fallback)'],
      sheetLayout: '4 cols x 4 rows: Walk cycle in 4 directions + sit idle',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['calico cat pixel art', 'Stardew Valley farm pet', 'RPG cat walk cycle', 'cute kitten sprite']
    }
  },
  'npc-farmer-rafiq': {
    id: 'npc-farmer-rafiq',
    name: 'Chacha Rafiq (Green Meadows Patriarch)',
    category: 'character',
    description: 'Warm elderly farmer in straw hat and plaid shirt tending heirloom crops and farm animals.',
    externalPath: 'assets/sprites/characters/npc_farmer_rafiq.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-farmer-rafiq-0',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)', '36x60 (game.js fallback)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['elderly farmer pixel art', 'Stardew Valley grandfather', 'straw hat agrarian', 'Chacha Rafiq']
    }
  },
  'npc-sage': {
    id: 'npc-sage',
    name: 'Elder Banyan Sage',
    category: 'character',
    description: 'Ancient spirit elder of the Whispering Emerald Forest draped in living moss robes.',
    externalPath: 'assets/sprites/characters/npc_sage.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-sage',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['32x48 (1:1)', '52x58 (game.js fallback)'],
      sheetLayout: '4 cols x 4 rows: 4-directional walk and meditative idle',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['forest sage druid', 'banyan tree hermit', 'green spirit elder', 'RPG mystic guide']
    }
  },
  'npc-marina': {
    id: 'npc-marina',
    name: 'Tidekeeper Marina',
    category: 'character',
    description: 'Guardian of the Sunken Kingdom adorned with glowing seafoam pearls and aquamarine coral.',
    externalPath: 'assets/sprites/characters/npc_marina.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-marina',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['32x48 (1:1)', '52x58 (game.js fallback)'],
      sheetLayout: '4 cols x 4 rows: 4-directional walk with flowing water hair',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['tidekeeper mermaid priestess', 'coral shrine maiden', 'aquamarine hair NPC', 'water realm guide']
    }
  },
  'npc-kael': {
    id: 'npc-kael',
    name: 'Master Blacksmith Kael',
    category: 'character',
    description: 'Muscular volcanic blacksmith of Emberfall Highlands wielding a heavy obsidian forging hammer.',
    externalPath: 'assets/sprites/characters/npc_kael.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-kael',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['32x48 (1:1)', '52x58 (game.js fallback)'],
      sheetLayout: '4 cols x 4 rows: 4-directional walk with hammer swing',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['blacksmith forge master', 'volcanic artisan', 'obsidian hammer smith', 'RPG armor smith']
    }
  },
  'npc-lyra': {
    id: 'npc-lyra',
    name: 'Astronomer Lyra',
    category: 'character',
    description: 'Star-watcher of the Kingdom of Eternal Frost bundled in fur cloak with a brass astrolabe.',
    externalPath: 'assets/sprites/characters/npc_lyra.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-lyra',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['32x48 (1:1)', '52x58 (game.js fallback)'],
      sheetLayout: '4 cols x 4 rows: 4-directional walk with fur hood',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['astronomer winter cloak', 'stargazer observatory scholar', 'frost realm guide', 'astrolabe researcher']
    }
  },
  'npc-chronicler': {
    id: 'npc-chronicler',
    name: 'Celestial Chronicler',
    category: 'character',
    description: 'Ascended cosmic entity recording historical memories across space and time.',
    externalPath: 'assets/sprites/characters/npc_chronicler.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-chronicler',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['32x48 (1:1)', '52x58 (game.js fallback)'],
      sheetLayout: '4 cols x 4 rows: Floating celestial aura walk cycle',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['celestial chronicler', 'starlight archivist', 'astral entity', 'floating cosmic sage']
    }
  },
  'npc-guitar': {
    id: 'npc-guitar',
    name: 'TSC Acoustic Singer (Guitarist)',
    category: 'character',
    description: 'Charming campus musician in denim jacket strumming acoustic melodies by TSC.',
    externalPath: 'assets/sprites/characters/npc_guitarist.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-guitar',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['acoustic singer', 'campus guitarist', 'denim jacket student', 'pixel art musician']
    }
  },
  'npc-artist': {
    id: 'npc-artist',
    name: 'Charukola Clay Artist',
    category: 'character',
    description: 'Artisan sculpting terracotta pottery and painting traditional folk motifs.',
    externalPath: 'assets/sprites/characters/npc_clay_artist.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-artist',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['clay sculptor', 'terracotta artisan', 'Charukola painter', 'fine arts student']
    }
  },
  'npc-doi': {
    id: 'npc-doi',
    name: 'Pabnar Mishti Doi Vendor',
    category: 'character',
    description: 'Friendly vendor serving sweet chilled Bogurar and Pabnar clay-pot yogurt.',
    externalPath: 'assets/sprites/characters/npc_doi_vendor.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-doi',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['mishti doi vendor', 'sweet yogurt seller', 'Dhaka traditional dessert master']
    }
  },
  'npc-mehjabin': {
    id: 'npc-mehjabin',
    name: 'Mehjabin (Fountain Plaza Resident)',
    category: 'character',
    description: 'Thoughtful young woman waiting near the Mintu Road fountain plaza.',
    externalPath: 'assets/sprites/characters/npc_mehjabin.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-mehjabin',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['townsperson girl', 'fountain plaza resident', 'student female RPG']
    }
  },
  'npc-iman': {
    id: 'npc-iman',
    name: 'Iman (Tech Professional)',
    category: 'character',
    description: 'Busy young professional balancing smartphone notifications and campus strolls.',
    externalPath: 'assets/sprites/characters/npc_iman.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-iman',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['young professional', 'smartphone tech boy', 'campus male RPG']
    }
  },
  'npc-ananya-ghost': {
    id: 'npc-ananya-ghost',
    name: 'Ananya (Weeping Petni Ghost)',
    category: 'character',
    description: 'Sorrowful spirit floating among the ancient banyans of the Whispering Emerald Forest.',
    externalPath: 'assets/sprites/characters/npc_ananya_ghost.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-ananya-ghost',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '4 cols x 4 rows: Floating spirit walk cycle',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['petni ghost', 'spirit maiden', 'spectral girl', 'white floating ghost']
    }
  },
  'npc-kofil-ghost': {
    id: 'npc-kofil-ghost',
    name: 'Kofil Chacha (Phantom Rickshaw Puller)',
    category: 'character',
    description: 'Faithful spirit rickshaw puller navigating the marsh pathways of the Emerald Forest.',
    externalPath: 'assets/sprites/characters/npc_kofil_ghost.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-kofil-ghost',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['phantom rickshaw puller', 'spirit boatman', 'gamcha elder ghost']
    }
  },
  'npc-shamsher-investigator': {
    id: 'npc-shamsher-investigator',
    name: 'Prof. Shamsher (Occult Investigator)',
    category: 'character',
    description: 'Dhaka University paranormal researcher tracking electromagnetic anomalies and the Nishi.',
    externalPath: 'assets/sprites/characters/npc_shamsher.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-shamsher-investigator',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['occult investigator', 'paranormal researcher', 'trench coat scientist']
    }
  },
  'npc-walker1': {
    id: 'npc-walker1',
    name: 'Arif (DU Physics Senior)',
    category: 'character',
    description: 'Physics undergraduate strolling along Fuller Road with notebooks and lab gear.',
    externalPath: 'assets/sprites/characters/npc_walker1.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-walker1',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['university student male', 'campus walker', 'physics senior']
    }
  },
  'npc-walker2': {
    id: 'npc-walker2',
    name: 'Nadia (Charukola Sketcher)',
    category: 'character',
    description: 'Enthusiastic fine arts student sketching campus landmarks in charcoal and watercolor.',
    externalPath: 'assets/sprites/characters/npc_walker2.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-walker2',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['sketcher girl', 'artist student', 'beret sketchpad female']
    }
  },
  'npc-walker3': {
    id: 'npc-walker3',
    name: 'Baki Bhai (Nilkhet Poet)',
    category: 'character',
    description: 'Contemplative poet carrying vintage verse manuscripts through Nilkhet and Curzon.',
    externalPath: 'assets/sprites/characters/npc_walker3.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-walker3',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['nilkhet poet', 'intellectual scholar', 'panjabi kurti poet']
    }
  },
  'npc-photo': {
    id: 'npc-photo',
    name: 'Sami (Street Photographer)',
    category: 'character',
    description: 'Dhaka street photographer capturing candid portraits of campus life and lovers.',
    externalPath: 'assets/sprites/characters/npc_photo.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-photo',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['street photographer', 'cameraman NPC', 'camera around neck']
    }
  },
  'npc-jogger': {
    id: 'npc-jogger',
    name: 'Tania (Dhanmondi Jogger)',
    category: 'character',
    description: 'Athletic jogger doing morning laps along the Dhanmondi Lake wooden pier.',
    externalPath: 'assets/sprites/characters/npc_jogger.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-jogger',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['athletic jogger', 'tracksuit runner', 'pier jogger']
    }
  },
  'npc-prof-satyendra': {
    id: 'npc-prof-satyendra',
    name: 'Prof. Satyendra (Physics Chair)',
    category: 'character',
    description: 'Distinguished physicist lecturing on quantum statistics in Curzon Hall Bose Lab.',
    externalPath: 'assets/sprites/characters/npc_prof_satyendra.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-prof-satyendra',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['physics professor', 'bose statistics', 'academic chair']
    }
  },
  'npc-student-faiza': {
    id: 'npc-student-faiza',
    name: 'Faiza (Physics Undergrad)',
    category: 'character',
    description: 'Dedicated student verifying quantum optics experiments in Curzon Hall.',
    externalPath: 'assets/sprites/characters/npc_student_faiza.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-student-faiza',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['undergrad student female', 'curzon lab student', 'lab coat scholar']
    }
  },
  'npc-prof-sultana': {
    id: 'npc-prof-sultana',
    name: 'Prof. Sultana (Botany Chair)',
    category: 'character',
    description: 'Renowned botanist cataloguing endemic medicinal flora in the Curzon Hall Herbarium.',
    externalPath: 'assets/sprites/characters/npc_prof_sultana.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-prof-sultana',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['botany professor', 'herbarium curator', 'elder academic female']
    }
  },
  'npc-dr-kabir': {
    id: 'npc-dr-kabir',
    name: 'Dr. Kabir (Chemistry Master)',
    category: 'character',
    description: 'Polymer chemistry researcher distilling rare botanical alkaloids in Curzon Hall.',
    externalPath: 'assets/sprites/characters/npc_dr_kabir.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-dr-kabir',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['chemistry researcher', 'lab scientist', 'alkaloid distiller']
    }
  },
  'npc-student-tanvir': {
    id: 'npc-student-tanvir',
    name: 'Tanvir (Biochemistry Student)',
    category: 'character',
    description: 'Diligent researcher running chromatography columns and brewing caffeine extracts.',
    externalPath: 'assets/sprites/characters/npc_student_tanvir.png',
    hasExternalFile: true,
    fallbackProceduralKey: 'npc-student-tanvir',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.625, heightTiles: 0.44 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x32 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['biochemistry student', 'lab technician', 'chromatography scholar']
    }
  },

  // =========================================================================
  // 3. CROPS & FLORA ('crop')
  // =========================================================================
  'crop-mango': {
    id: 'crop-mango',
    name: 'Rajshahi Fazli Mango Tree / Sapling',
    category: 'crop',
    description: 'Heirloom Bengal summer mango tree that blooms golden panicles and heavy sweet green mangoes.',
    externalPath: 'assets/sprites/crops/crop_mango.png',
    fallbackProceduralKey: 'crop-mango',
    logicalGridFootprint: { cols: 1, rows: 1, collision: { widthTiles: 0.8, heightTiles: 0.8 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x24 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '6 cols x 1 row: Stage 0=Seed, 1=Sprout, 2=Sapling, 3=Blossom, 4=Ripe Mango, 5=Harvested',
      origin: { x: 0.5, y: 0.9 },
      styleSearchTags: ['Stardew Valley fruit tree', 'mango sapling growth stages', 'pixel art crop sheet']
    }
  },
  'crop-tea': {
    id: 'crop-tea',
    name: 'Sylhet Camellia Tea Bush',
    category: 'crop',
    description: 'Emerald green tea bush with tender two-leaves-and-a-bud flushes for high-grade malai cha.',
    externalPath: 'assets/sprites/crops/crop_tea.png',
    fallbackProceduralKey: 'crop-tea',
    logicalGridFootprint: { cols: 1, rows: 1 },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x24 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '6 cols x 1 row: Stage 0=Seed, 1=Sprout, 2=Young Bush, 3=Leaf Flush, 4=Prime Harvest, 5=Pruned Bush',
      origin: { x: 0.5, y: 0.9 },
      styleSearchTags: ['tea bush crop', 'Stardew tea plant stages', 'Camellia sinensis sprite', 'harvestable bush']
    }
  },
  'crop-jute': {
    id: 'crop-jute',
    name: 'Golden Valley Jute (Paat)',
    category: 'crop',
    description: 'Iconic Bengali golden fiber crop growing tall slender emerald stalks during monsoon.',
    externalPath: 'assets/sprites/crops/crop_jute.png',
    fallbackProceduralKey: 'crop-jute',
    logicalGridFootprint: { cols: 1, rows: 1 },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x24 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '6 cols x 1 row: Stage 0=Seed, 1=Shoot, 2=Mid Cane, 3=Tall Stalk, 4=Golden Mature, 5=Cut Stubble',
      origin: { x: 0.5, y: 0.9 },
      styleSearchTags: ['jute crop sprite', 'sugarcane / bamboo stalk stages', 'tall crop overlap 32x48']
    }
  },
  'crop-beli': {
    id: 'crop-beli',
    name: 'Curzon Beli Garland Bloom',
    category: 'crop',
    description: 'Fragrant double-flowered Arabian Jasmine bush blooming snow-white blossoms for flower garlands.',
    externalPath: 'assets/sprites/crops/crop_beli.png',
    fallbackProceduralKey: 'crop-beli',
    logicalGridFootprint: { cols: 1, rows: 1 },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x24 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '6 cols x 1 row: Stage 0=Seed, 1=Sprout, 2=Budding, 3=White Flower, 4=Full Blossom, 5=Harvested',
      origin: { x: 0.5, y: 0.9 },
      styleSearchTags: ['jasmine flower crop', 'Stardew Valley flower stages', 'Arabian jasmine bush', 'beli phul']
    }
  },
  'crop-naga': {
    id: 'crop-naga',
    name: 'Sreemangal Naga Fire Chili',
    category: 'crop',
    description: 'Ghost pepper plant loaded with wrinkled fiery crimson chilies of extreme heat.',
    externalPath: 'assets/sprites/crops/crop_naga.png',
    fallbackProceduralKey: 'crop-naga',
    logicalGridFootprint: { cols: 1, rows: 1 },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x24 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '6 cols x 1 row: Stage 0=Seed, 1=Sprout, 2=Green Plant, 3=White Flower, 4=Crimson Chili, 5=Regrow',
      origin: { x: 0.5, y: 0.9 },
      styleSearchTags: ['chili pepper plant', 'ghost pepper stages', 'hot pepper crop 32x48', 'Stardew pepper']
    }
  },
  'crop-spirit-melon': {
    id: 'crop-spirit-melon',
    name: 'Whispering Spirit Melon',
    category: 'crop',
    description: 'Glowing bioluminescent forest melon that pulses with emerald spirit dew.',
    externalPath: 'assets/sprites/crops/crop_spirit_melon.png',
    fallbackProceduralKey: 'crop-spirit-melon',
    logicalGridFootprint: { cols: 1, rows: 1 },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x24 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '6 cols x 1 row: Stage 0=Spore, 1=Sprout, 2=Glowing Vine, 3=Young Gourd, 4=Ripe Spirit Melon, 5=Harvested',
      origin: { x: 0.5, y: 0.9 },
      styleSearchTags: ['magic fantasy crop', 'glowing melon sprite', 'spirit vine crop stages', 'bioluminescent fruit']
    }
  },
  'crop-star-berry': {
    id: 'crop-star-berry',
    name: 'Cryo Star Berry',
    category: 'crop',
    description: 'Frost-resistant celestial bush producing star-shaped shimmering blue berries.',
    externalPath: 'assets/sprites/crops/crop_star_berry.png',
    fallbackProceduralKey: 'crop-star-berry',
    logicalGridFootprint: { cols: 1, rows: 1 },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 32, height: 48 },
      acceptedNativeSizes: ['16x24 (auto-2x)', '32x48 (1:1)'],
      sheetLayout: '6 cols x 1 row: Stage 0=Seed, 1=Ice Shoot, 2=Frost Vine, 3=Blue Blossom, 4=Luminous Star Berry, 5=Regrow',
      origin: { x: 0.5, y: 0.9 },
      styleSearchTags: ['winter frost berry', 'celestial star fruit', 'blue crystal berry', 'Stardew winter crop']
    }
  },

  // =========================================================================
  // 4. TREES & BIOME PILLARS ('tree')
  // =========================================================================
  'prop-tree-krishna': {
    id: 'prop-tree-krishna',
    name: 'Royal Krishnachura Tree (Delonix regia)',
    category: 'tree',
    description: 'Spreading umbrella canopy bursting with flame-scarlet flowers and fern-like compound leaves.',
    externalPath: 'assets/sprites/trees/tree_krishnachura.png',
    fallbackProceduralKey: 'prop-tree-krishna',
    logicalGridFootprint: {
      cols: 4,
      rows: 4,
      collision: { widthTiles: 2, heightTiles: 1, offsetY: -0.1 } // 64x32px trunk collision at roots
    },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 128, height: 128 },
      acceptedNativeSizes: ['64x64 (auto-2x -> 128x128)', '120x128 (game.js fallback)', '128x128 (1:1)'],
      sheetLayout: '1 static canopy frame + optional swaying blossom wind frames',
      origin: { x: 0.5, y: 0.92 },
      styleSearchTags: ['flamboyant tree pixel art', 'Krishnachura red flowers', 'top-down RPG tree 128x128', 'Stardew tree canopy']
    }
  },
  'prop-tree-emerald': {
    id: 'prop-tree-emerald',
    name: 'Ancient Spirit Banyan Tree',
    category: 'tree',
    description: 'Massive bioluminescent banyan with hanging aerial prop roots and glowing dew orbs.',
    externalPath: 'assets/sprites/trees/tree_emerald_banyan.png',
    fallbackProceduralKey: 'prop-tree-emerald',
    logicalGridFootprint: {
      cols: 4,
      rows: 4,
      collision: { widthTiles: 2, heightTiles: 1 }
    },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 128, height: 128 },
      acceptedNativeSizes: ['64x64 (auto-2x)', '120x128', '128x128'],
      sheetLayout: '1 static frame + hollow spirit core glow',
      origin: { x: 0.5, y: 0.92 },
      styleSearchTags: ['banyan tree pixel art', 'glowing fantasy tree', 'spirit hollow banyan', 'aerial prop roots']
    }
  },
  'prop-pillar-coral': {
    id: 'prop-pillar-coral',
    name: 'Luminous Abyssal Coral Pillar',
    category: 'tree',
    description: 'Ancient sunken temple column overgrown with staghorn and brain corals topped with a pearl.',
    externalPath: 'assets/sprites/trees/pillar_coral.png',
    fallbackProceduralKey: 'prop-pillar-coral',
    logicalGridFootprint: { cols: 4, rows: 4, collision: { widthTiles: 2, heightTiles: 1 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 120, height: 128 },
      acceptedNativeSizes: ['120x128 (1:1)', '64x64 (auto-2x)'],
      sheetLayout: 'Static underwater pillar with glowing pearl',
      origin: { x: 0.5, y: 0.92 },
      styleSearchTags: ['coral pillar pixel art', 'sunken temple column', 'underwater shrine prop', 'bioluminescent reef']
    }
  },
  'prop-spire-obsidian': {
    id: 'prop-spire-obsidian',
    name: 'Obsidian Magma Spire',
    category: 'tree',
    description: 'Jagged volcanic spire oozing molten magma veins with flying ember particles.',
    externalPath: 'assets/sprites/trees/spire_obsidian.png',
    fallbackProceduralKey: 'prop-spire-obsidian',
    logicalGridFootprint: { cols: 4, rows: 4, collision: { widthTiles: 2, heightTiles: 1 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 120, height: 128 },
      acceptedNativeSizes: ['120x128 (1:1)', '64x64 (auto-2x)'],
      sheetLayout: 'Static obsidian spire with glowing magma fissures',
      origin: { x: 0.5, y: 0.92 },
      styleSearchTags: ['volcanic rock spire', 'obsidian pillar', 'lava rock formation', 'caldera terrain']
    }
  },
  'prop-tree-pine': {
    id: 'prop-tree-pine',
    name: 'Glacial Starlight Pine',
    category: 'tree',
    description: 'Heavy snow-laden mountain evergreen crowned with sparkling ice stalactites.',
    externalPath: 'assets/sprites/trees/tree_frost_pine.png',
    fallbackProceduralKey: 'prop-tree-pine',
    logicalGridFootprint: { cols: 4, rows: 4, collision: { widthTiles: 2, heightTiles: 1 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 120, height: 128 },
      acceptedNativeSizes: ['120x128 (1:1)', '64x64 (auto-2x)'],
      sheetLayout: 'Snow-frosted pine tree canopy',
      origin: { x: 0.5, y: 0.92 },
      styleSearchTags: ['snow pine tree', 'frost pine sprite', 'winter evergreen pixel art', 'Stardew winter tree']
    }
  },
  'prop-pillar-astral': {
    id: 'prop-pillar-astral',
    name: 'Celestial Monolith & Chrono-Rune Pillar',
    category: 'tree',
    description: 'Floating violet marble monolith engraved with pulsing golden zodiac runes.',
    externalPath: 'assets/sprites/trees/pillar_astral.png',
    fallbackProceduralKey: 'prop-pillar-astral',
    logicalGridFootprint: { cols: 4, rows: 4, collision: { widthTiles: 2, heightTiles: 1 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 120, height: 128 },
      acceptedNativeSizes: ['120x128 (1:1)', '64x64 (auto-2x)'],
      sheetLayout: 'Astral monolith with glowing constellation glyphs',
      origin: { x: 0.5, y: 0.92 },
      styleSearchTags: ['astral obelisk', 'cosmic monolith', 'rune pillar', 'floating temple stone']
    }
  },

  // =========================================================================
  // 5. STREET CARTS & STALLS ('stall')
  // =========================================================================
  'prop-teastall': {
    id: 'prop-teastall',
    name: 'TSC Tong-er Cha Stall',
    category: 'stall',
    description: 'Classic Dhaka tea stall with corrugated tin awning, condensed milk tins, glass biscuit jars, and smoking kettle.',
    externalPath: 'assets/sprites/stalls/tsc_teastall.png',
    fallbackProceduralKey: 'prop-teastall',
    logicalGridFootprint: {
      cols: 7,
      rows: 5,
      collision: { widthTiles: 6, heightTiles: 3, offsetY: -0.2 } // 192x96px solid counter collision base
    },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 224, height: 160 },
      acceptedNativeSizes: ['112x80 (auto-2x)', '216x152 (game.js fallback)', '224x160 (1:1)'],
      sheetLayout: '1 static frame or 2-4 frames with kettle steam and lantern flicker',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['tea stall pixel art', 'Dhaka TSC tong', 'street food stall RPG', 'tin roof tea shop']
    }
  },
  'prop-fuchkacart': {
    id: 'prop-fuchkacart',
    name: 'Mama Fuchka & Chotpoti Cart',
    category: 'stall',
    description: 'Dhaka street food cart with pyramid piles of puffed crispy puchkas, clay sour water pots, and red striped canopy.',
    externalPath: 'assets/sprites/stalls/fuchka_cart.png',
    fallbackProceduralKey: 'prop-fuchkacart',
    logicalGridFootprint: {
      cols: 7,
      rows: 5,
      collision: { widthTiles: 6, heightTiles: 3 }
    },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 224, height: 160 },
      acceptedNativeSizes: ['112x80 (auto-2x)', '216x152 (game.js fallback)', '224x160 (1:1)'],
      sheetLayout: '1-2 frames: striped awning and glass display box',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['fuchka cart pixel art', 'chotpoti wagon', 'Dhaka street food', 'wooden push cart']
    }
  },
  'prop-bookstall': {
    id: 'prop-bookstall',
    name: 'Nilkhet Heritage Bookstall',
    category: 'stall',
    description: 'Multi-tiered wooden book pavilion under teal awning illuminated by 3 hanging Edison filament bulbs.',
    externalPath: 'assets/sprites/stalls/nilkhet_bookstall.png',
    fallbackProceduralKey: 'prop-bookstall',
    logicalGridFootprint: {
      cols: 7,
      rows: 5,
      collision: { widthTiles: 6, heightTiles: 3 }
    },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 224, height: 160 },
      acceptedNativeSizes: ['112x80 (auto-2x)', '216x152 (game.js fallback)', '224x160 (1:1)'],
      sheetLayout: '3 horizontal frames: 0, 1, 2 for flickering warm Edison bulb lighting',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['bookstall pixel art', 'Nilkhet book market', 'bookshelves awning', 'Edison bulb stall']
    }
  },
  'prop-doicart': {
    id: 'prop-doicart',
    name: 'Pabna Traditional Mishti Doi Cart',
    category: 'stall',
    description: 'Rustic sweet shop cart showcasing earthen pots (shora) of caramel sweet yogurt and Chamcham.',
    externalPath: 'assets/sprites/stalls/pabna_doi_cart.png',
    fallbackProceduralKey: 'prop-doicart',
    logicalGridFootprint: {
      cols: 7,
      rows: 5,
      collision: { widthTiles: 6, heightTiles: 3 }
    },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 224, height: 160 },
      acceptedNativeSizes: ['112x80 (auto-2x)', '216x152 (game.js fallback)', '224x160 (1:1)'],
      sheetLayout: '2 frames: clay pot displays and scalloped awning',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['mishti doi cart', 'Bengali sweet stall', 'earthen clay pots', 'sweetshop wagon']
    }
  },
  'prop-flowercart': {
    id: 'prop-flowercart',
    name: 'Ramna Park Flower Cart',
    category: 'stall',
    description: 'Festive wooden flower cart overflowing with Beli garlands, Rajnigandha sticks, and yellow marigolds.',
    externalPath: 'assets/sprites/stalls/ramna_flower_cart.png',
    fallbackProceduralKey: 'prop-flowercart-0',
    logicalGridFootprint: {
      cols: 7,
      rows: 5,
      collision: { widthTiles: 6, heightTiles: 3 }
    },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 224, height: 160 },
      acceptedNativeSizes: ['112x80 (auto-2x)', '216x152 (game.js fallback)', '224x160 (1:1)'],
      sheetLayout: '2 frames: swaying flower garlands and awning bunting',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['flower cart pixel art', 'Ramna flower seller', 'marigold garlands', 'florist stall']
    }
  },
  'prop-charukola': {
    id: 'prop-charukola',
    name: 'Charukola Fine Arts Exhibit',
    category: 'stall',
    description: 'Artisanal campus outdoor exhibit showcasing colorful terracotta pottery, folk masks, and oil paintings.',
    externalPath: 'assets/sprites/stalls/charukola_exhibit.png',
    fallbackProceduralKey: 'prop-charukola-0',
    logicalGridFootprint: {
      cols: 7,
      rows: 5,
      collision: { widthTiles: 6, heightTiles: 3 }
    },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 224, height: 160 },
      acceptedNativeSizes: ['112x80 (auto-2x)', '216x152 (game.js fallback)', '224x160 (1:1)'],
      sheetLayout: '4 frames: animated colorful wind flags and terracotta displays',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['Charukola fine arts', 'folk art exhibit', 'terracotta pottery', 'Dhaka art pavilion']
    }
  },

  // =========================================================================
  // 6. MAJOR LANDMARKS & MONUMENTS ('landmark')
  // =========================================================================
  'prop-curzon': {
    id: 'prop-curzon',
    name: 'Curzon Hall (Faculty of Science Heritage Facade)',
    category: 'landmark',
    description: 'Monumental Indo-Saracenic terracotta red-brick architectural marvel with horse-shoe arches, domed kiosks, and grand entrance.',
    externalPath: 'assets/sprites/landmarks/curzon_hall_facade.png',
    fallbackProceduralKey: 'prop-curzon',
    logicalGridFootprint: {
      cols: 14,
      rows: 8,
      collision: { widthTiles: 14, heightTiles: 4, offsetY: -0.5 } // 448x128px collision with 2x2 arch portal
    },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 448, height: 256 },
      acceptedNativeSizes: ['428x261 (game.js CURZON_K=2.25)', '448x256 (14x8 tiles)', '224x128 (auto-2x)'],
      sheetLayout: 'Static monumental facade with interior doorway trigger zone at center arch',
      origin: { x: 0.5, y: 0.95 },
      styleSearchTags: ['Curzon Hall Dhaka', 'Indo-Saracenic palace RPG', 'red brick university facade', 'grand heritage building']
    }
  },
  'prop-monument': {
    id: 'prop-monument',
    name: 'Aparajeyo Bangla Sculpture',
    category: 'landmark',
    description: 'Iconic three-figure liberation monument depicting freedom fighters standing in solidarity.',
    externalPath: 'assets/sprites/landmarks/aparajeyo_bangla.png',
    fallbackProceduralKey: 'prop-monument',
    logicalGridFootprint: { cols: 5, rows: 5, collision: { widthTiles: 3, heightTiles: 1.5 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 148, height: 156 },
      acceptedNativeSizes: ['148x156 (1:1)', '74x78 (auto-2x)'],
      sheetLayout: 'Static stone pedestal sculpture',
      origin: { x: 0.5, y: 0.92 },
      styleSearchTags: ['Aparajeyo Bangla statue', 'Dhaka University monument', 'liberation sculpture', 'stone monument sprite']
    }
  },
  'prop-fountain': {
    id: 'prop-fountain',
    name: 'Mintu Road Fountain Plaza',
    category: 'landmark',
    description: 'Circular tiered stone fountain spraying animated clear water ripples into a stone basin.',
    externalPath: 'assets/sprites/landmarks/mintu_road_fountain.png',
    fallbackProceduralKey: 'prop-fountain',
    logicalGridFootprint: { cols: 4, rows: 4, collision: { widthTiles: 3, heightTiles: 2 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 136, height: 124 },
      acceptedNativeSizes: ['136x124 (1:1)', '68x62 (auto-2x)'],
      sheetLayout: '3-4 frames animated water jets and basin ripples',
      origin: { x: 0.5, y: 0.9 },
      styleSearchTags: ['stone fountain pixel art', 'plaza fountain animated', 'Stardew town fountain', 'water jet basin']
    }
  },
  'prop-portal': {
    id: 'prop-portal',
    name: 'Chrono-Fracture Realm Portal',
    category: 'landmark',
    description: 'Mystic interdimensional swirling gate linking Dhaka Valley to the outer five realms.',
    externalPath: 'assets/sprites/landmarks/realm_portal.png',
    fallbackProceduralKey: 'prop-portal-0',
    logicalGridFootprint: { cols: 4, rows: 4, collision: { widthTiles: 2, heightTiles: 1 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 112, height: 128 },
      acceptedNativeSizes: ['112x128 (1:1)', '56x64 (auto-2x)'],
      sheetLayout: '3-6 frames swirling vortex with floating rune spark motes',
      origin: { x: 0.5, y: 0.9 },
      styleSearchTags: ['portal vortex sprite', 'dimensional gate', 'swirling magic portal', 'chrono fracture portal']
    }
  },
  'prop-farm-barn': {
    id: 'prop-farm-barn',
    name: 'Green Meadows Heritage Red Barn',
    category: 'landmark',
    description: 'Classic rustic timber livestock barn housing dairy cows, goats, and heritage poultry.',
    externalPath: 'assets/sprites/landmarks/farm_barn.png',
    fallbackProceduralKey: 'prop-farm-barn',
    logicalGridFootprint: { cols: 6, rows: 5, collision: { widthTiles: 6, heightTiles: 2.5 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 196, height: 140 },
      acceptedNativeSizes: ['196x140 (1:1)', '98x70 (auto-2x)'],
      sheetLayout: 'Static timber barn with sliding hay door',
      origin: { x: 0.5, y: 0.9 },
      styleSearchTags: ['Stardew Valley red barn', 'farmhouse livestock barn', 'timber farm building', 'hayloft barn']
    }
  },
  'prop-farm-silo': {
    id: 'prop-farm-silo',
    name: 'Grain & Feed Silo',
    category: 'landmark',
    description: 'Tall cylindrical stone and galvanized iron silo for storing winter grain and animal feed.',
    externalPath: 'assets/sprites/landmarks/farm_silo.png',
    fallbackProceduralKey: 'prop-farm-silo',
    logicalGridFootprint: { cols: 2, rows: 4, collision: { widthTiles: 2, heightTiles: 1.5 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 64, height: 130 },
      acceptedNativeSizes: ['64x130 (1:1)', '32x65 (auto-2x)'],
      sheetLayout: 'Static tall farm silo',
      origin: { x: 0.5, y: 0.9 },
      styleSearchTags: ['grain silo sprite', 'Stardew silo', 'farm storage tower', 'galvanized silo']
    }
  },
  'prop-farm-arch': {
    id: 'prop-farm-arch',
    name: 'Green Meadows Timber Archway',
    category: 'landmark',
    description: 'Grand pastoral timber archway spanning country lane with warm hanging iron lanterns.',
    externalPath: 'assets/sprites/landmarks/farm_archway.png',
    fallbackProceduralKey: 'prop-farm-arch',
    logicalGridFootprint: { cols: 6, rows: 4, collision: { widthTiles: 6, heightTiles: 1 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 192, height: 128 },
      acceptedNativeSizes: ['192x128 (1:1)', '96x64 (auto-2x)'],
      sheetLayout: 'Spanning gateway with central open road clearance',
      origin: { x: 0.5, y: 0.95 },
      styleSearchTags: ['timber entrance arch', 'farm gateway', 'pastoral ranch entrance', 'hanging lanterns arch']
    }
  },
  'prop-spirit-altar': {
    id: 'prop-spirit-altar',
    name: 'Ancient Forest Spirit Altar',
    category: 'landmark',
    description: 'Carved stone sanctum in the Whispering Emerald Forest where lost souls find eternal peace.',
    externalPath: 'assets/sprites/landmarks/spirit_altar.png',
    fallbackProceduralKey: 'prop-spirit-altar',
    logicalGridFootprint: { cols: 2, rows: 2, collision: { widthTiles: 2, heightTiles: 1 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 68, height: 62 },
      acceptedNativeSizes: ['68x62 (1:1)', '34x31 (auto-2x)'],
      sheetLayout: 'Carved stone pedestal with floating cyan soul orb',
      origin: { x: 0.5, y: 0.9 },
      styleSearchTags: ['spirit altar stone', 'ancient rune shrine', 'seance stone', 'forest ghost sanctum']
    }
  },

  // =========================================================================
  // 7. VEHICLES & WATERCRAFT ('landmark')
  // =========================================================================
  'prop-rickshaw': {
    id: 'prop-rickshaw',
    name: 'Traditional Painted Dhaka Rickshaw',
    category: 'landmark',
    description: 'Authentic 3-wheeled cycle rickshaw adorned with intricate enamel cinema art, bell, and hood.',
    externalPath: 'assets/sprites/vehicles/dhaka_rickshaw.png',
    fallbackProceduralKey: 'prop-rickshaw',
    logicalGridFootprint: {
      cols: 3,
      rows: 2,
      collision: { widthTiles: 2.5, heightTiles: 1.2 }
    },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 96, height: 76 },
      acceptedNativeSizes: ['48x38 (auto-2x -> 96x76)', '96x76 (1:1)'],
      sheetLayout: 'Static vehicle with brass bell and passenger seat',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['Dhaka cycle rickshaw', 'painted rickshaw pixel art', 'South Asian tricycle cab', 'retro vehicle']
    }
  },
  'prop-boat': {
    id: 'prop-boat',
    name: 'Dhanmondi Lake Lantern Rowboat',
    category: 'landmark',
    description: 'Graceful wooden rowboat resting by the pier with glowing evening sky lanterns and wooden oars.',
    externalPath: 'assets/sprites/vehicles/dhanmondi_rowboat.png',
    fallbackProceduralKey: 'prop-boat',
    logicalGridFootprint: {
      cols: 5,
      rows: 2,
      collision: { widthTiles: 4.5, heightTiles: 1.5 }
    },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 160, height: 72 },
      acceptedNativeSizes: ['80x36 (auto-2x)', '156x72 (game.js fallback)', '160x72 (1:1)'],
      sheetLayout: 'Wooden rowboat with water ripple reflections and floating lanterns',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['lake rowboat pixel art', 'wooden boat with lantern', 'Dhanmondi lake pier boat', 'Stardew fishing boat']
    }
  },

  // =========================================================================
  // 8. BIOME ENEMIES ('enemy')
  // =========================================================================
  'enemy-slime': {
    id: 'enemy-slime',
    name: 'Briar Bogling (World 2 Forest Enemy)',
    category: 'enemy',
    description: 'Mossy forest imp with bioluminescent spotted toadstool cap and thorny root feet.',
    externalPath: 'assets/sprites/enemies/briar_bogling.png',
    hasExternalFile: true,
    hasAnimJson: true,
    fallbackProceduralKey: 'enemy-slime',
    logicalGridFootprint: { cols: 2, rows: 2, collision: { widthTiles: 1.5, heightTiles: 1.2 } },
    anchor: { x: 0.5, y: 0.88 },
    source: {
      author: 'OpenGameArt (Calciumtrice & cyberkrishna)',
      url: 'https://opengameart.org/content/pixel-art-animated-slime',
      license: 'CC0 1.0 Universal',
      date: '2026-10-19',
      provenance: 'cc0'
    },
    animations: {
      idle: { name: 'idle', row: 0, frameCount: 4, frameRate: 4, loop: true },
      walk: { name: 'walk', row: 1, frameCount: 4, frameRate: 6, loop: true },
      attack: {
        name: 'attack',
        row: 2,
        frameCount: 4,
        frameRate: 8,
        loop: false,
        events: [
          { frame: 1, type: 'hitbox_on' },
          { frame: 3, type: 'hitbox_off' }
        ]
      },
      stagger: { name: 'stagger', row: 3, frameCount: 4, frameRate: 6, loop: true }
    },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 64, height: 64 },
      acceptedNativeSizes: ['32x32 (auto-2x)', '54x54 (game.js fallback)', '64x64 (1:1)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Idle, Row 1=Hop, Row 2=Leap Attack, Row 3=Squish Stagger',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['forest slime sprite', 'mushroom imp monster', 'briar bogling', 'RPG nature creature']
    }
  },
  'enemy-crab': {
    id: 'enemy-crab',
    name: 'Tidepool Crabler (World 3 Sunken Enemy)',
    category: 'enemy',
    description: 'Armored hermit-carapace crab with sharp snapping pincers and crystal shell.',
    externalPath: 'assets/sprites/enemies/tidepool_crabler.png',
    fallbackProceduralKey: 'enemy-crab',
    logicalGridFootprint: { cols: 2, rows: 2, collision: { widthTiles: 1.5, heightTiles: 1.2 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 64, height: 64 },
      acceptedNativeSizes: ['32x32 (auto-2x)', '58x52 (game.js fallback)', '64x64 (1:1)'],
      sheetLayout: '2-4 frames: side-scuttling stride with alternating claw snaps',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['crab monster pixel art', 'tidepool crabler', 'coral crab enemy', 'underwater creature']
    }
  },
  'enemy-wisp': {
    id: 'enemy-wisp',
    name: 'Cinder Hound (World 4 Ember Enemy)',
    category: 'enemy',
    description: 'Blazing quadrupedal hound forged of cooled basalt and molten flame cores.',
    externalPath: 'assets/sprites/enemies/cinder_hound.png',
    fallbackProceduralKey: 'enemy-wisp',
    logicalGridFootprint: { cols: 2, rows: 2, collision: { widthTiles: 1.5, heightTiles: 1.2 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 64, height: 64 },
      acceptedNativeSizes: ['32x32 (auto-2x)', '58x54 (game.js fallback)', '64x64 (1:1)'],
      sheetLayout: '2-4 frames: fiery prowling step with flame tail flickers',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['fire hound sprite', 'cinder hound beast', 'volcanic wolf monster', 'lava beast']
    }
  },
  'enemy-wraith': {
    id: 'enemy-wraith',
    name: 'Glacier Wraith (World 5 Frost Enemy)',
    category: 'enemy',
    description: 'Hovering specter of blue glacial frost radiating chilling mist and piercing ice claws.',
    externalPath: 'assets/sprites/enemies/glacier_wraith.png',
    fallbackProceduralKey: 'enemy-wraith',
    logicalGridFootprint: { cols: 2, rows: 2, collision: { widthTiles: 1.5, heightTiles: 1.2 } },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 64, height: 64 },
      acceptedNativeSizes: ['32x32 (auto-2x)', '56x60 (game.js fallback)', '64x64 (1:1)'],
      sheetLayout: '2-4 frames: undulating spectral hover animation',
      origin: { x: 0.5, y: 0.88 },
      styleSearchTags: ['ice wraith specter', 'frost ghost pixel art', 'glacier phantom', 'undead winter creature']
    }
  },

  // =========================================================================
  // 9. GUARDIAN BOSSES ('boss')
  // =========================================================================
  'boss-stag': {
    id: 'boss-stag',
    name: 'Sylvan Briar Stag (Forest Guardian)',
    category: 'boss',
    description: 'Majestic forest guardian stag crowned with massive crystalline glowing antlers and emerald briars.',
    externalPath: 'assets/sprites/bosses/sylvan_briar_stag.png',
    hasExternalFile: true,
    hasAnimJson: true,
    fallbackProceduralKey: 'boss-stag',
    logicalGridFootprint: {
      cols: 4,
      rows: 4,
      collision: { widthTiles: 3.5, heightTiles: 2.5 }
    },
    anchor: { x: 0.5, y: 0.9 },
    source: {
      author: 'Pokémon Showdown Gen 5 Animation Archive (Sawsbuck)',
      url: 'https://play.pokemonshowdown.com/sprites/ani/sawsbuck.gif',
      license: 'Fair Use / Fan Educational Game Asset Archive',
      date: '2026-10-19',
      provenance: 'licensed'
    },
    animations: {
      idle: { name: 'idle', row: 0, frameCount: 4, frameRate: 4, loop: true },
      walk: { name: 'walk', row: 1, frameCount: 4, frameRate: 5, loop: true },
      attack: {
        name: 'attack',
        row: 2,
        frameCount: 4,
        frameRate: 6,
        loop: false,
        events: [
          { frame: 1, type: 'hitbox_on' },
          { frame: 3, type: 'hitbox_off' }
        ]
      },
      stagger: { name: 'stagger', row: 3, frameCount: 4, frameRate: 5, loop: true }
    },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 128, height: 128 },
      acceptedNativeSizes: ['64x64 (auto-2x)', '112x112 (game.js fallback)', '128x128 (1:1)'],
      sheetLayout: '4 cols x 4 rows: Row 0=Idle, Row 1=Stride, Row 2=Antler Sweep, Row 3=Stagger/Hurt',
      origin: { x: 0.5, y: 0.9 },
      styleSearchTags: ['guardian stag boss', 'forest god deer', 'crystal antlers beast', 'Ghibli forest spirit boss']
    }
  },
  'boss-leviathan': {
    id: 'boss-leviathan',
    name: 'Abyssal Coral Leviathan (Sunken Guardian)',
    category: 'boss',
    description: 'Ancient armored sea serpent with luminous bioluminescent fins and branching coral horn crest.',
    externalPath: 'assets/sprites/bosses/abyssal_coral_leviathan.png',
    fallbackProceduralKey: 'boss-leviathan',
    logicalGridFootprint: {
      cols: 4,
      rows: 4,
      collision: { widthTiles: 3.5, heightTiles: 2.5 }
    },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 128, height: 128 },
      acceptedNativeSizes: ['64x64 (auto-2x)', '112x112 (game.js fallback)', '128x128 (1:1)'],
      sheetLayout: '2-4 frames: undulating aquatic serpentine coils and tail thrash',
      origin: { x: 0.5, y: 0.9 },
      styleSearchTags: ['sea leviathan boss', 'coral dragon sprite', 'abyssal serpent', 'deep sea guardian']
    }
  },
  'boss-drake': {
    id: 'boss-drake',
    name: 'Ignis, the Magma Drake (Ember Guardian)',
    category: 'boss',
    description: 'Colossal subterranean dragon of molten basalt with wings of white-hot volcanic flame.',
    externalPath: 'assets/sprites/bosses/ignis_magma_drake.png',
    fallbackProceduralKey: 'boss-drake',
    logicalGridFootprint: {
      cols: 4,
      rows: 4,
      collision: { widthTiles: 3.5, heightTiles: 2.5 }
    },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 128, height: 128 },
      acceptedNativeSizes: ['64x64 (auto-2x)', '118x114 (game.js fallback)', '128x128 (1:1)'],
      sheetLayout: '2-4 frames: heavy wing beat and magma breath flare',
      origin: { x: 0.5, y: 0.9 },
      styleSearchTags: ['magma dragon boss', 'volcanic drake sprite', 'lava wyrm pixel art', 'fire dragon boss']
    }
  },
  'boss-warden': {
    id: 'boss-warden',
    name: 'Cryon, Warden of Eternal Frost (Frost Guardian)',
    category: 'boss',
    description: 'Armored glacial titan forged of jagged permafrost ice slabs wielding a frostbite greatshield.',
    externalPath: 'assets/sprites/bosses/cryon_frost_warden.png',
    fallbackProceduralKey: 'boss-warden',
    logicalGridFootprint: {
      cols: 4,
      rows: 4,
      collision: { widthTiles: 3.5, heightTiles: 2.5 }
    },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 128, height: 128 },
      acceptedNativeSizes: ['64x64 (auto-2x)', '114x114 (game.js fallback)', '128x128 (1:1)'],
      sheetLayout: '2-4 frames: heavy glacial stomp and shield slam',
      origin: { x: 0.5, y: 0.9 },
      styleSearchTags: ['frost titan boss', 'glacial golem sprite', 'ice warden monster', 'winter guardian boss']
    }
  },
  'boss-archon': {
    id: 'boss-archon',
    name: 'Chrono-Fracture Archon (Final Boss)',
    category: 'boss',
    description: 'Reality-bending cosmic entity commanding astral rings, shattered chrono-crystals, and starlight blades.',
    externalPath: 'assets/sprites/bosses/chrono_fracture_archon.png',
    fallbackProceduralKey: 'boss-archon',
    logicalGridFootprint: {
      cols: 4,
      rows: 4,
      collision: { widthTiles: 3.5, heightTiles: 2.5 }
    },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 128, height: 128 },
      acceptedNativeSizes: ['64x64 (auto-2x)', '124x120 (game.js fallback)', '128x128 (1:1)'],
      sheetLayout: '2-4 frames: floating astral ring rotation and cosmic eye pulse',
      origin: { x: 0.5, y: 0.9 },
      styleSearchTags: ['chrono archon final boss', 'cosmic deity sprite', 'astral boss pixel art', 'reality fracture entity']
    }
  },
  'kart-rickshaw-3d': {
    id: 'kart-rickshaw-3d',
    name: 'Tring-Tring Grand Prix 3D Cycle Rickshaw Kart',
    category: 'landmark',
    description: '3D arcade cycle rickshaw kart with emerald body, gold canopy hood, red padded seat, and steering front wheel for Three.js racing.',
    externalPath: 'assets/models/rickshaw_kart.glb',
    fallbackProceduralKey: 'kart-placeholder-box',
    logicalGridFootprint: {
      cols: 2,
      rows: 2,
      collision: { widthTiles: 1.5, heightTiles: 1.5 }
    },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 128, height: 128 },
      acceptedNativeSizes: ['3D GLB Model', 'Procedural Three.js Box Mesh'],
      sheetLayout: '3D GLTF / Box mesh fallback',
      origin: { x: 0.5, y: 0.5 },
      styleSearchTags: ['low poly rickshaw 3d', 'arcade kart 3d model', 'dhaka cycle rickshaw glb']
    }
  },
  'track-fuller-road-sprint': {
    id: 'track-fuller-road-sprint',
    name: 'Fuller Road Sprint 3D Race Track',
    category: 'landmark',
    description: '3D race circuit for Tring-Tring Grand Prix featuring Curzon Hall straight, S-chicane, TSC rotunda hairpin, flyover elevation bridge, jump gap ramp, and courtyard grass shortcut.',
    externalPath: 'assets/race/tracks/fuller_road_sprint/visual.glb',
    hasExternalFile: true,
    fallbackProceduralKey: 'track-arena-flat',
    logicalGridFootprint: {
      cols: 10,
      rows: 10,
      collision: { widthTiles: 8, heightTiles: 8 }
    },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 256, height: 256 },
      acceptedNativeSizes: ['3D GLB Model + Collision GLB', 'Procedural Road Ribbon'],
      sheetLayout: '3D GLTF Track Assembly',
      origin: { x: 0.5, y: 0.5 },
      styleSearchTags: ['3d race track glb', 'curzon hall dhaka 3d', 'low poly racetrack']
    }
  },
  'race-audio-garden': {
    id: 'race-audio-garden',
    name: 'Garden Race BGM Loop',
    category: 'landmark',
    description: 'High-energy race loop soundtrack from SuperTuxKart (garden.ogg by DJHelium) for Fuller Road Sprint.',
    externalPath: 'assets/race/audio/garden.ogg',
    hasExternalFile: true,
    fallbackProceduralKey: 'bgm-audio-fallback',
    logicalGridFootprint: { cols: 1, rows: 1 },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 1, height: 1 },
      acceptedNativeSizes: ['OGG Vorbis Audio Stream'],
      sheetLayout: 'Single Audio Stream',
      origin: { x: 0, y: 0 },
      styleSearchTags: ['race soundtrack', 'kart bgm loop ogg']
    }
  },
  'track-fuller-road-props': {
    id: 'track-fuller-road-props',
    name: 'Fuller Road Sprint Scenery Props Manifest',
    category: 'landmark',
    description: 'Declarative prop instances placing STK street lamps, benches, Krishnachura trees, bushes, barrels, and lanterns along Fuller Road.',
    externalPath: 'assets/race/tracks/fuller_road_sprint/props.json',
    hasExternalFile: true,
    fallbackProceduralKey: 'track-arena-flat',
    logicalGridFootprint: { cols: 1, rows: 1 },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 1, height: 1 },
      acceptedNativeSizes: ['JSON Manifest + Instanced GLBs'],
      sheetLayout: 'Declarative Prop Map',
      origin: { x: 0.5, y: 0.5 },
      styleSearchTags: ['race track props', 'instanced scenery gltf']
    }
  },
  'track-fuller-road-items': {
    id: 'track-fuller-road-items',
    name: 'Fuller Road Sprint Items & Hazards Manifest',
    category: 'landmark',
    description: 'Declarative item box clusters (tiffin boxes) and dynamic street hazards (crossing rickshaws, petal slicks) along Fuller Road.',
    externalPath: 'assets/race/tracks/fuller_road_sprint/items.json',
    hasExternalFile: true,
    fallbackProceduralKey: 'track-arena-flat',
    logicalGridFootprint: { cols: 1, rows: 1 },
    recommendedDownloadSpecs: {
      preferredFrameSize: { width: 1, height: 1 },
      acceptedNativeSizes: ['JSON Manifest'],
      sheetLayout: 'Declarative Items Map',
      origin: { x: 0.5, y: 0.5 },
      styleSearchTags: ['race items', 'tiffin boxes', 'street hazards']
    }
  }
};
