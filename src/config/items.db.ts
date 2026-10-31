// src/config/items.db.ts - ITEMS_DB & WEAPON_FX migrated from game.js
import { ItemDef } from '../types/rpg.types';

export interface WeaponFxConfig {
  color: number;
  glow: number;
  sparks: string[];
  name: string;
}

export const ITEMS_DB: Record<string, ItemDef> = {
  // Original 10 Dhaka Valley Keepsakes (Preserved)
  flower:    { id: 'flower',    cat: 'keepsake', emoji: '🌺', name: 'Krishnachura Blossom', desc: 'A crimson blossom Totoro tucked behind your ear under the Curzon Hall trees. (+5 Max HP)' },
  cha:       { id: 'cha',       cat: 'consumable', healHp: 45, healSp: 25, emoji: '🍵', name: 'TSC Clay Cup Malai Cha', desc: 'Ten-taka tea in an earthen matir bhaar. Restores 45 HP & 25 SP when sipped.' },
  mug:       { id: 'mug',       cat: 'keepsake', emoji: '🏺', name: 'Charukola Painted Mug', desc: 'Hand-painted together at the Faculty of Fine Arts with slightly lopsided hearts.' },
  book:      { id: 'book',      cat: 'keepsake', emoji: '📚', name: 'Nilkhet Secret Poetry Book', desc: 'Picked for each other in Nilkhet Lane with a handwritten note inside the cover.' },
  shield:    { id: 'shield',    cat: 'accessory', def: 4, emoji: '🛡️', name: 'Badge of Unbothered Grace', desc: 'Won when Totoro stepped in front of Ahona & Apshora. (+4 DEF)' },
  charm:     { id: 'charm',     cat: 'accessory', atk: 4, def: 4, emoji: '💌', name: 'Peacekeeper Letter Charm', desc: 'Given by Ahona & Rakin after Moon Walker healed their misunderstanding. (+4 ATK, +4 DEF)' },
  gajra:     { id: 'gajra',     cat: 'accessory', def: 6, emoji: '🌼', name: 'Beli Flower Wrist Gajra', desc: 'Fragrant white Beli & Bokul flower garland tied around your wrist by Totoro. (+6 DEF)' },
  fuchka:    { id: 'fuchka',    cat: 'consumable', healHp: 60, healSp: 30, emoji: '🥙', name: "Mama's Naga Fuchka Plate", desc: 'Crispy shells loaded with tamarind tok and Naga chili. Restores 60 HP & 30 SP.' },
  doi:       { id: 'doi',       cat: 'consumable', healHp: 85, healSp: 40, emoji: '🍮', name: 'Bogurar Mishti Doi Pot', desc: 'Sweet, chilled caramelized yogurt. Restores 85 HP & 40 SP.' },
  starlight: { id: 'starlight', cat: 'keepsake', emoji: '🔭', name: 'Dhaka Starlight Chart', desc: 'Mapped all 4 constellations in the night sky, ending on Alpha Moon Walker.' },

  // RPG Weapons, Armor, Materials & Realm Relics
  umbrella_blade: { id: 'umbrella_blade', cat: 'weapon', atk: 8, emoji: '☂️', name: 'Crimson Monsoon Parasol', desc: 'Moon Walker’s trusty umbrella reinforced with Curzon spirit-wood. (+8 ATK)' },
  emerald_wand:   { id: 'emerald_wand',   cat: 'weapon', atk: 16, emoji: '🌿', name: 'Sylvan Rootblade', desc: 'Forged from Whispering Emerald Forest heartwood. (+16 ATK)' },
  tidal_trident:  { id: 'tidal_trident',  cat: 'weapon', atk: 24, emoji: '🔱', name: 'Coral Tideglaive', desc: 'Relic of the Sunken Kingdom. Allows swift strikes. (+24 ATK)' },
  ember_greatsword:{ id: 'ember_greatsword',cat: 'weapon', atk: 34, emoji: '🔥', name: 'Emberfall Sunblade', desc: 'Tempered in volcanic highland dragonfire. (+34 ATK)' },
  astral_starblade:{ id: 'astral_starblade',cat: 'weapon', atk: 50, emoji: '✨', name: 'Starlight Crescent Blade', desc: 'Woven from Dhaka memories and cosmic starlight. (+50 ATK)' },

  yellow_raincoat:{ id: 'yellow_raincoat',cat: 'armor', def: 6, emoji: '🧥', name: 'Iconic Yellow Raincoat', desc: 'Bright, cozy, and monsoon-proof. (+6 DEF)' },
  sylvan_cloak:   { id: 'sylvan_cloak',   cat: 'armor', def: 14, emoji: '🍃', name: 'Whispering Moss Cloak', desc: 'Woven by forest sprites. (+14 DEF)' },
  frost_mantle:   { id: 'frost_mantle',   cat: 'armor', def: 26, emoji: '❄️', name: 'Aurora Fur Mantle', desc: 'Warms the heart even in the Kingdom of Eternal Frost. (+26 DEF)' },

  spirit_dew:     { id: 'spirit_dew',     cat: 'material', emoji: '💧', name: 'Emerald Spirit Dew', desc: 'Glowing dewdrop gathered from enchanted forest flora.' },
  coral_shard:    { id: 'coral_shard',    cat: 'material', emoji: '🐚', name: 'Luminous Coral Shard', desc: 'Crystalline shell from the Sunken Kingdom.' },
  ember_ore:      { id: 'ember_ore',      cat: 'material', emoji: '🪨', name: 'Volcanic Ember Ore', desc: 'Warm metallic ore mined from Emberfall Highlands.' },
  frost_crystal:  { id: 'frost_crystal',  cat: 'material', emoji: '💎', name: 'Permafrost Star Crystal', desc: 'Resonant ice crystal from the northern observatory.' },

  seal_forest:    { id: 'seal_forest',    cat: 'relic', emoji: '🟢', name: 'Seal of the Whispering Bough', desc: 'Ancient Realm Seal recovered from the Briar Stag.' },
  seal_sunken:    { id: 'seal_sunken',    cat: 'relic', emoji: '🔵', name: 'Seal of the Abyssal Tide', desc: 'Ancient Realm Seal recovered from the Abyssal Leviathan. Grants Tidewalk.' },
  seal_ember:     { id: 'seal_ember',     cat: 'relic', emoji: '🔴', name: 'Seal of the Cinder Crown', desc: 'Ancient Realm Seal recovered from Ignis the Magma Drake.' },
  seal_frost:     { id: 'seal_frost',     cat: 'relic', emoji: '🟣', name: 'Seal of the Eternal Aurora', desc: 'Ancient Realm Seal recovered from Cryon the Frost Warden.' },
  seal_astral:    { id: 'seal_astral',    cat: 'relic', emoji: '🌟', name: 'Crown of Unbroken Memory', desc: 'Awarded for defeating the Chrono-Fracture Archon and saving the Six Realms.' },
  bose_lens:      { id: 'bose_lens',      cat: 'accessory', atk: 6, def: 6, emoji: '🔬', name: 'Bose-Einstein Quantum Monocle', desc: 'Conferred by Prof. Satyendra. Calibrated to perceive photon statistics. (+6 ATK, +6 DEF)' },
  curzon_elixir:  { id: 'curzon_elixir',  cat: 'consumable', healHp: 100, healSp: 50, emoji: '🧪', name: 'Curzon Botanical Elixir', desc: 'Distilled by Prof. Sultana from centennial Krishnachura petals. Restores 100 HP & 50 SP.' },
  double_date_polaroid: { id: 'double_date_polaroid', cat: 'keepsake', emoji: '📸', name: 'Four-Hearts Double Date Polaroid', desc: 'A candid snapshot of Iman, Mehjabin, Moon Walker, and Totoro laughing over clay-cup cha and sweets in Dhaka Valley.' },
  apshora_silk_stole:   { id: 'apshora_silk_stole',   cat: 'accessory', atk: 8, def: 8, emoji: '🧣', name: 'Apshora’s Royal Heritage Silk Stole', desc: 'Handcrafted by Apshora & Anamika. Pure Rajshahi silk with Jamdani gold thread & Barishal river motifs. (+8 ATK, +8 DEF)' },
  fresh_milk:           { id: 'fresh_milk',           cat: 'consumable', healHp: 50, healSp: 35, emoji: '🥛', name: 'Lal Teer Organic Cow Milk', desc: 'Fresh, rich whole milk from Shuravi the dairy cow. Restores 50 HP & 35 SP.' },
  golden_egg:           { id: 'golden_egg',           cat: 'consumable', healHp: 40, healSp: 20, emoji: '🥚', name: 'Deshi Free-Range Egg', desc: 'A warm golden egg gathered from Tuntuni the free-range hen. Restores 40 HP & 20 SP.' },
  arcade_token:         { id: 'arcade_token',         cat: 'material', emoji: '🪙', name: 'Dhaka Cyber Arcade Token', desc: 'A shiny brass token stamped with a pixelated Totoro face. Used to test retro arcade cabinets.' },
  plushie_totoro:       { id: 'plushie_totoro',       cat: 'keepsake', emoji: '🧸', name: 'Neon Arcade Totoro Plushie', desc: 'A rare prize scooped from the Cyber Arcade claw machine. Squishy and smells like bubblegum!' },
  farm_bell:            { id: 'farm_bell',            cat: 'accessory', atk: 5, def: 7, emoji: '🔔', name: 'Pastoral Brass Animal Bell', desc: 'A musical brass bell gifted by Chacha Rafiq at the Green Meadows Farmhouse. (+5 ATK, +7 DEF)' },
  spectral_lantern:     { id: 'spectral_lantern',     cat: 'accessory', atk: 7, def: 5, emoji: '🏮', name: 'Phantom Silver Lantern', desc: 'Gifted by Ananya the Shakchunni. Emits cold emerald light that dispels dark forest illusions. (+7 ATK, +5 DEF)' },
  ghost_bell:           { id: 'ghost_bell',           cat: 'accessory', atk: 6, def: 8, emoji: '🛺', name: 'Phantom Rickshaw Brass Bell', desc: 'Given by Kofil Chacha. Its resonant toll pierces misty silence and repels the Nishi. (+6 ATK, +8 DEF)' },
  occult_talisman:      { id: 'occult_talisman',      cat: 'keepsake',  emoji: '📜', name: 'Prof. Shamsher’s Occult Field Tome', desc: 'A handwritten field journal detailing the paranormal apparitions and Nishi frequencies of the Whispering Woods.' },
  forest_cleansing_charm:{ id: 'forest_cleansing_charm', cat: 'accessory', atk: 14, def: 14, emoji: '🧿', name: 'Aparthib Forest Cleansing Charm', desc: 'Forged from the harmony of the three pacified forest spirits. Radiates protective warmth across all realms. (+14 ATK, +14 DEF)' }
};

/* Elemental visual effects, slash colors, and particle spark presets for equipped weapons */
export const WEAPON_FX: Record<string, WeaponFxConfig> = {
  umbrella_blade: {
    color: 0xff3366,
    glow: 0xffe066,
    sparks: ['🌸', '✨', '🏮'],
    name: 'Crimson Monsoon Parasol'
  },
  emerald_wand: {
    color: 0x10b981,
    glow: 0x6ee7b7,
    sparks: ['🍃', '🌿', '✨'],
    name: 'Sylvan Rootblade'
  },
  tidal_trident: {
    color: 0x0ea5e9,
    glow: 0x7dd3fc,
    sparks: ['💧', '🌊', '🐚'],
    name: 'Coral Tideglaive'
  },
  ember_greatsword: {
    color: 0xf97316,
    glow: 0xfde047,
    sparks: ['🔥', '⚡', '💥'],
    name: 'Emberfall Sunblade'
  },
  astral_starblade: {
    color: 0x8b5cf6,
    glow: 0xfbcfe8,
    sparks: ['⭐', '✨', '🌟'],
    name: 'Starlight Crescent Blade'
  }
};
