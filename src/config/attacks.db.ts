// src/config/attacks.db.ts - Data-Driven Attack Framework for Totoro & Moon Walker
// Defines all player, companion, enemy, and boss attacks with strict telegraph language & frame timing.

export type HitboxShape = 'arc' | 'circle' | 'line' | 'cone';

export interface HitboxDef {
  shape: HitboxShape;
  radius?: number;       // for arc, circle, cone
  width?: number;        // for line/rect
  height?: number;       // for line/rect
  angleDeg?: number;     // sweep angle for arc or cone
  offsetX?: number;      // offset from attacker facing origin
  offsetY?: number;
}

export type TelegraphColor = 'gold' | 'red' | 'purple' | 'blue';

export interface TelegraphDef {
  shape: 'circle' | 'ring' | 'cone' | 'line';
  color: TelegraphColor; // gold: parryable | red: dodge-only | purple: totoro-interrupt | blue: safe/vulnerable tell
  durationMs: number;
  radius?: number;
  width?: number;
  height?: number;
  angleDeg?: number;
  fillStyle?: 'sweep' | 'pulse';
}

export interface AttackDef {
  id: string;
  name: string;
  source: 'player' | 'totoro' | 'enemy' | 'boss';
  windupMs: number;
  activeMs: number;
  recoveryMs: number;
  hitbox: HitboxDef;
  damageMult: number;
  poiseDamage: number;
  knockback: number;
  hitStopMs: number;
  shake?: { duration: number; intensity: number };
  cancelInto?: string[];
  telegraph?: TelegraphDef;
  sfx: string;
  vfx?: string;
  parryable: boolean;
  dodgeOnly: boolean;
  totoroInterrupt?: boolean;
  animRef?: string;
  fast?: boolean;
  fastReason?: string;
}

/**
 * Master Attacks Database
 */
export const ATTACKS_DB: Record<string, AttackDef> = {
  // =========================================================================
  // 1. PLAYER (MOON WALKER) ATTACKS
  // =========================================================================
  player_jab: {
    id: 'player_jab',
    name: 'Parasol Quick Jab',
    source: 'player',
    windupMs: 70,
    activeMs: 60,
    recoveryMs: 110,
    hitbox: { shape: 'arc', radius: 48, angleDeg: 75, offsetX: 24, offsetY: 0 },
    damageMult: 1.0,
    poiseDamage: 12,
    knockback: 16,
    hitStopMs: 45,
    cancelInto: ['player_slash'],
    sfx: 'slash',
    vfx: 'fx_slash_arc_jab',
    parryable: false,
    dodgeOnly: false,
    animRef: 'player_jab',
    fast: true,
    fastReason: 'Player combo opener requires responsive 70ms windup'
  },
  player_slash: {
    id: 'player_slash',
    name: 'Parasol Crescent Slash',
    source: 'player',
    windupMs: 90,
    activeMs: 80,
    recoveryMs: 130,
    hitbox: { shape: 'arc', radius: 64, angleDeg: 120, offsetX: 32, offsetY: 0 },
    damageMult: 1.35,
    poiseDamage: 18,
    knockback: 28,
    hitStopMs: 60,
    cancelInto: ['player_spin'],
    sfx: 'thrust',
    vfx: 'fx_slash_arc_slash',
    parryable: false,
    dodgeOnly: false,
    animRef: 'player_slash',
    fast: true,
    fastReason: 'Player combo second step requires fluid 90ms windup'
  },
  player_spin: {
    id: 'player_spin',
    name: 'Starlight Blossom Spin Finisher',
    source: 'player',
    windupMs: 120,
    activeMs: 140,
    recoveryMs: 260,
    hitbox: { shape: 'circle', radius: 110, offsetX: 0, offsetY: 0 },
    damageMult: 2.1,
    poiseDamage: 45,
    knockback: 55,
    hitStopMs: 90,
    shake: { duration: 140, intensity: 0.009 },
    cancelInto: [],
    sfx: 'spin',
    vfx: 'fx_slash_spin',
    parryable: false,
    dodgeOnly: false,
    animRef: 'player_spin',
    fast: true,
    fastReason: 'Player combo finisher with 120ms windup and 260ms recovery'
  },
  player_parry: {
    id: 'player_parry',
    name: 'Parasol Guard & Perfect Parry',
    source: 'player',
    windupMs: 20,
    activeMs: 150, // 150ms active parry window from guard start
    recoveryMs: 180,
    hitbox: { shape: 'arc', radius: 52, angleDeg: 160, offsetX: 16, offsetY: 0 },
    damageMult: 0,
    poiseDamage: 30, // deals poise damage to attacker on perfect parry
    knockback: 40,
    hitStopMs: 120,
    shake: { duration: 180, intensity: 0.012 },
    sfx: 'select',
    vfx: 'fx_parry_flash',
    parryable: false,
    dodgeOnly: false,
    animRef: 'player_parry',
    fast: true,
    fastReason: 'Parry reactive defense window must activate within 20ms'
  },

  // =========================================================================
  // 2. TOTORO ASSIST & COMPANION ABILITIES
  // =========================================================================
  totoro_roar: {
    id: 'totoro_roar',
    name: 'Totoro Spirit Roar',
    source: 'totoro',
    windupMs: 160,
    activeMs: 200,
    recoveryMs: 350,
    hitbox: { shape: 'circle', radius: 140, offsetX: 0, offsetY: 0 },
    damageMult: 1.8,
    poiseDamage: 65, // Massive poise damage, interrupts PURPLE attacks & breaks shields
    knockback: 45,
    hitStopMs: 80,
    shake: { duration: 220, intensity: 0.012 },
    sfx: 'totoro_roar',
    vfx: 'fx_totoro_roar_ring',
    parryable: false,
    dodgeOnly: false,
    animRef: 'totoro_roar',
    fast: true,
    fastReason: 'Totoro interrupt assist must trigger reliably to counter purple attacks'
  },
  totoro_slam: {
    id: 'totoro_slam',
    name: 'Totoro Seismic Belly Slam',
    source: 'totoro',
    windupMs: 380, // High leap windup with visible landing reticle
    activeMs: 140,
    recoveryMs: 320,
    hitbox: { shape: 'circle', radius: 160, offsetX: 0, offsetY: 0 },
    damageMult: 2.6,
    poiseDamage: 85, // Enormous poise damage, creates safe stagger window
    knockback: 65,
    hitStopMs: 100,
    shake: { duration: 280, intensity: 0.018 },
    sfx: 'totoro_slam',
    vfx: 'fx_totoro_slam_shockwave',
    parryable: false,
    dodgeOnly: false,
    animRef: 'totoro_slam',
    fast: true,
    fastReason: 'Totoro companion 2-pip ability with leap arc'
  },
  totoro_leaf_gust: {
    id: 'totoro_leaf_gust',
    name: 'Totoro Leaf Gust & Swiftness',
    source: 'totoro',
    windupMs: 100,
    activeMs: 180,
    recoveryMs: 200,
    hitbox: { shape: 'cone', radius: 120, angleDeg: 90, offsetX: 20, offsetY: 0 },
    damageMult: 0.8,
    poiseDamage: 25,
    knockback: 35,
    hitStopMs: 30,
    sfx: 'tea_clink',
    vfx: 'fx_totoro_leaf_gust',
    parryable: false,
    dodgeOnly: false,
    animRef: 'totoro_leaf_gust',
    fast: true,
    fastReason: 'Speed buff and hazard clear ability'
  },
  totoro_assist_tackle: {
    id: 'totoro_assist_tackle',
    name: 'Totoro Combo Assist Tackle',
    source: 'totoro',
    windupMs: 60,
    activeMs: 120,
    recoveryMs: 180,
    hitbox: { shape: 'circle', radius: 75, offsetX: 35, offsetY: 0 },
    damageMult: 1.2,
    poiseDamage: 30,
    knockback: 40,
    hitStopMs: 50,
    sfx: 'dash',
    vfx: 'fx_dash_dust',
    parryable: false,
    dodgeOnly: false,
    animRef: 'totoro_assist_tackle',
    fast: true,
    fastReason: 'Automatic synergy follow-up on 3rd combo hit'
  },

  // =========================================================================
  // 3. FOREST REALM MOBS (BRIAR BOGLING)
  // =========================================================================
  bogling_spore_hop: {
    id: 'bogling_spore_hop',
    name: 'Briar Bogling Spore Hop',
    source: 'enemy',
    windupMs: 420, // >= 300ms mob rule
    activeMs: 120,
    recoveryMs: 450,
    hitbox: { shape: 'circle', radius: 36, offsetX: 0, offsetY: 0 },
    damageMult: 0.9,
    poiseDamage: 15,
    knockback: 18,
    hitStopMs: 35,
    telegraph: {
      shape: 'circle',
      color: 'gold', // Parryable! Teaches player the parasol parry
      durationMs: 420,
      radius: 36,
      fillStyle: 'sweep'
    },
    sfx: 'player_hurt',
    parryable: true,
    dodgeOnly: false,
    animRef: 'bogling_attack'
  },
  bogling_thorn_burst: {
    id: 'bogling_thorn_burst',
    name: 'Briar Bogling Thorn Eruption',
    source: 'enemy',
    windupMs: 500, // >= 300ms mob rule
    activeMs: 140,
    recoveryMs: 550,
    hitbox: { shape: 'circle', radius: 56, offsetX: 0, offsetY: 0 },
    damageMult: 1.3,
    poiseDamage: 25,
    knockback: 26,
    hitStopMs: 45,
    telegraph: {
      shape: 'ring',
      color: 'red', // Dodge only! Cannot be parried
      durationMs: 500,
      radius: 56,
      fillStyle: 'pulse'
    },
    sfx: 'enemy_hit',
    parryable: false,
    dodgeOnly: true,
    animRef: 'bogling_attack'
  },

  // =========================================================================
  // 4. FOREST GUARDIAN BOSS (SYLVAN BRIAR STAG)
  // =========================================================================
  stag_antler_sweep: {
    id: 'stag_antler_sweep',
    name: 'Sylvan Antler Cleave',
    source: 'boss',
    windupMs: 650, // >= 400ms boss rule
    activeMs: 160,
    recoveryMs: 700,
    hitbox: { shape: 'cone', radius: 95, angleDeg: 120, offsetX: 24, offsetY: 0 },
    damageMult: 1.4,
    poiseDamage: 35,
    knockback: 38,
    hitStopMs: 60,
    shake: { duration: 160, intensity: 0.008 },
    telegraph: {
      shape: 'cone',
      color: 'gold', // Parryable with Parasol!
      durationMs: 650,
      radius: 95,
      angleDeg: 120,
      fillStyle: 'sweep'
    },
    sfx: 'slash',
    parryable: true,
    dodgeOnly: false,
    animRef: 'stag_sweep'
  },
  stag_briar_trample: {
    id: 'stag_briar_trample',
    name: 'Verdant Briar Stampede',
    source: 'boss',
    windupMs: 800, // >= 400ms boss rule
    activeMs: 240,
    recoveryMs: 900,
    hitbox: { shape: 'line', width: 180, height: 60, offsetX: 80, offsetY: 0 },
    damageMult: 1.9,
    poiseDamage: 55,
    knockback: 60,
    hitStopMs: 80,
    shake: { duration: 250, intensity: 0.015 },
    telegraph: {
      shape: 'line',
      color: 'red', // Unblockable stampede! Dodge only
      durationMs: 800,
      width: 180,
      height: 60,
      fillStyle: 'sweep'
    },
    sfx: 'totoro_slam',
    parryable: false,
    dodgeOnly: true,
    animRef: 'stag_stampede'
  },
  stag_nature_barrier_charge: {
    id: 'stag_nature_barrier_charge',
    name: 'Thorny Aegis Awakening',
    source: 'boss',
    windupMs: 1100, // >= 400ms boss rule: long purple charge
    activeMs: 200,
    recoveryMs: 800,
    hitbox: { shape: 'circle', radius: 140, offsetX: 0, offsetY: 0 },
    damageMult: 2.2,
    poiseDamage: 70,
    knockback: 75,
    hitStopMs: 90,
    shake: { duration: 320, intensity: 0.02 },
    telegraph: {
      shape: 'circle',
      color: 'purple', // Totoro interrupt! Roar or Belly Slam breaks it
      durationMs: 1100,
      radius: 140,
      fillStyle: 'pulse'
    },
    sfx: 'totoro_roar',
    parryable: false,
    dodgeOnly: false,
    totoroInterrupt: true,
    animRef: 'stag_charge'
  },
  stag_dazed_stagger: {
    id: 'stag_dazed_stagger',
    name: 'Exhausted Recovery Window',
    source: 'boss',
    windupMs: 400,
    activeMs: 1500, // 1.5s vulnerability window
    recoveryMs: 300,
    hitbox: { shape: 'circle', radius: 0 },
    damageMult: 0,
    poiseDamage: 0,
    knockback: 0,
    hitStopMs: 0,
    telegraph: {
      shape: 'circle',
      color: 'blue', // Safe tell / vulnerability window
      durationMs: 1500,
      radius: 80,
      fillStyle: 'pulse'
    },
    sfx: 'select',
    parryable: false,
    dodgeOnly: false,
    animRef: 'stag_stagger'
  }
};

/**
 * Validate attack definitions against design rules
 */
export function validateAttacks(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [id, atk] of Object.entries(ATTACKS_DB)) {
    // Mob rule: windup >= 300ms unless fast with reason
    if (atk.source === 'enemy') {
      if (atk.windupMs < 300 && (!atk.fast || !atk.fastReason)) {
        errors.push(`Enemy attack "${id}" has windup ${atk.windupMs}ms < 300ms without fast flag and reason.`);
      }
      if (!atk.fast && !atk.telegraph) {
        errors.push(`Non-fast enemy attack "${id}" is missing a required telegraph.`);
      }
    }

    // Boss rule: windup >= 400ms unless fast with reason
    if (atk.source === 'boss') {
      if (atk.windupMs < 400 && (!atk.fast || !atk.fastReason)) {
        errors.push(`Boss attack "${id}" has windup ${atk.windupMs}ms < 400ms without fast flag and reason.`);
      }
      if (!atk.fast && !atk.telegraph) {
        errors.push(`Non-fast boss attack "${id}" is missing a required telegraph.`);
      }
    }

    // Telegraph color rule
    if (atk.telegraph) {
      if (!['gold', 'red', 'purple', 'blue'].includes(atk.telegraph.color)) {
        errors.push(`Attack "${id}" telegraph color "${atk.telegraph.color}" is invalid. Must be gold, red, purple, or blue.`);
      }
      if (atk.telegraph.color === 'gold' && !atk.parryable) {
        errors.push(`Attack "${id}" has gold telegraph but parryable is false.`);
      }
      if (atk.telegraph.color === 'red' && !atk.dodgeOnly) {
        errors.push(`Attack "${id}" has red telegraph but dodgeOnly is false.`);
      }
      if (atk.telegraph.color === 'purple' && !atk.totoroInterrupt) {
        errors.push(`Attack "${id}" has purple telegraph but totoroInterrupt is not true.`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
