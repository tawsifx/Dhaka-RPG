// src/config/drivers.race.db.ts - Data-driven driver personalities, roster, and difficulty tiers
import { DriverProfile, RaceDifficultyTier } from '../types/race.types';

export const DEFAULT_PLAYER_DRIVER: DriverProfile = {
  id: 'moon_walker',
  name: 'Moon Walker',
  kartColor: '#2563eb', // Vivid Royal Blue
  accentColor: '#60a5fa',
  spriteKey: 'moon_walker',
  weightClass: 'medium',
  stats: {
    id: 'player_rickshaw',
    name: 'Moon Walker Standard',
    topSpeed: 28.0,
    acceleration: 17.5,
    handling: 2.8,
    weight: 1.0,
    driftChargeMultiplier: 1.0
  },
  personality: {
    skill: 1.0,
    aggression: 0.5,
    driftiness: 1.0,
    mistakeRate: 0.0,
    shortcutAffinity: 1.0
  },
  quote: 'Hold on tight, cosmic rickshaw rolling!'
};

export const RIVAL_DRIVERS: DriverProfile[] = [
  {
    id: 'tania',
    name: 'Tania',
    kartColor: '#e11d48', // Crimson Red
    accentColor: '#fda4af',
    spriteKey: 'npc_walker1',
    weightClass: 'medium',
    stats: {
      id: 'tania_rickshaw',
      name: 'Curzon Comet',
      topSpeed: 28.0,
      acceleration: 17.8,
      handling: 2.9,
      weight: 1.0,
      driftChargeMultiplier: 1.1
    },
    personality: {
      skill: 0.88,
      aggression: 0.45,
      driftiness: 0.75,
      mistakeRate: 0.05,
      shortcutAffinity: 0.65
    },
    quote: 'Science says the fastest line is pure math!'
  },
  {
    id: 'baki_bhai',
    name: 'Baki Bhai',
    kartColor: '#d97706', // Heavy Amber / Gold
    accentColor: '#fde68a',
    spriteKey: 'npc_walker3',
    weightClass: 'heavy',
    stats: {
      id: 'baki_rickshaw',
      name: 'Old Town Juggernaut',
      topSpeed: 29.5,
      acceleration: 14.5,
      handling: 2.4,
      weight: 1.45,
      driftChargeMultiplier: 0.8
    },
    personality: {
      skill: 0.76,
      aggression: 0.85,
      driftiness: 0.40,
      mistakeRate: 0.12,
      shortcutAffinity: 0.30
    },
    quote: 'Move aside! Baki Bhai clears the road!'
  },
  {
    id: 'iman',
    name: 'Iman',
    kartColor: '#059669', // Emerald Green
    accentColor: '#6ee7b7',
    spriteKey: 'npc_iman',
    weightClass: 'light',
    stats: {
      id: 'iman_rickshaw',
      name: 'Shahbagh Breeze',
      topSpeed: 26.5,
      acceleration: 19.5,
      handling: 3.2,
      weight: 0.80,
      driftChargeMultiplier: 1.3
    },
    personality: {
      skill: 0.82,
      aggression: 0.30,
      driftiness: 0.85,
      mistakeRate: 0.08,
      shortcutAffinity: 0.75
    },
    quote: 'Fast and light, like a winter morning gust!'
  },
  {
    id: 'arif',
    name: 'Arif',
    kartColor: '#7c3aed', // Purple Thunder
    accentColor: '#c4b5fd',
    spriteKey: 'npc_walker2',
    weightClass: 'medium',
    stats: {
      id: 'arif_rickshaw',
      name: 'TSC Turbo',
      topSpeed: 28.0,
      acceleration: 17.2,
      handling: 2.8,
      weight: 1.05,
      driftChargeMultiplier: 1.0
    },
    personality: {
      skill: 0.79,
      aggression: 0.65,
      driftiness: 0.65,
      mistakeRate: 0.10,
      shortcutAffinity: 0.85
    },
    quote: 'Tea break is over, full speed ahead!'
  },
  {
    id: 'anamika',
    name: 'Anamika',
    kartColor: '#db2777', // Magenta Pink
    accentColor: '#fbcfe8',
    spriteKey: 'npc_anamika',
    weightClass: 'light',
    stats: {
      id: 'anamika_rickshaw',
      name: 'Lily Cruiser',
      topSpeed: 27.0,
      acceleration: 19.0,
      handling: 3.1,
      weight: 0.85,
      driftChargeMultiplier: 1.35
    },
    personality: {
      skill: 0.90,
      aggression: 0.35,
      driftiness: 0.95,
      mistakeRate: 0.04,
      shortcutAffinity: 0.50
    },
    quote: 'Drifting is just dancing on wheels.'
  },
  {
    id: 'rakin',
    name: 'Rakin',
    kartColor: '#dc2626', // Bright Flame Orange-Red
    accentColor: '#fca5a5',
    spriteKey: 'npc_rakin',
    weightClass: 'heavy',
    stats: {
      id: 'rakin_rickshaw',
      name: 'Bakshi Bazooka',
      topSpeed: 29.0,
      acceleration: 15.0,
      handling: 2.5,
      weight: 1.35,
      driftChargeMultiplier: 0.9
    },
    personality: {
      skill: 0.74,
      aggression: 0.90,
      driftiness: 0.60,
      mistakeRate: 0.16,
      shortcutAffinity: 0.90
    },
    quote: 'Never brake until you see the finish flag!'
  },
  {
    id: 'apshora',
    name: 'Apshora',
    kartColor: '#0891b2', // Cyan Teal
    accentColor: '#a5f3fc',
    spriteKey: 'npc_apshora',
    weightClass: 'medium',
    stats: {
      id: 'apshora_rickshaw',
      name: 'Aparajita Stride',
      topSpeed: 28.2,
      acceleration: 17.0,
      handling: 3.0,
      weight: 0.95,
      driftChargeMultiplier: 1.15
    },
    personality: {
      skill: 0.92,
      aggression: 0.40,
      driftiness: 0.80,
      mistakeRate: 0.03,
      shortcutAffinity: 0.45
    },
    quote: 'Patience and perfect apexes win the cup.'
  }
];

export const ALL_DRIVERS: DriverProfile[] = [DEFAULT_PLAYER_DRIVER, ...RIVAL_DRIVERS];

export interface DifficultyConfig {
  tier: RaceDifficultyTier;
  label: string;
  description: string;
  ccEquivalent: string;
  speedMultiplier: number;
  accelMultiplier: number;
  skillMultiplier: number;
  maxDriftTier: 1 | 2 | 3;
  mistakeMultiplier: number;
  reactionLatencySec: number;
}

export const DIFFICULTY_CONFIGS: Record<RaceDifficultyTier, DifficultyConfig> = {
  gorom_cha: {
    tier: 'gorom_cha',
    label: 'Gorom Cha (Easy)',
    description: 'Relaxed street cruising with mild rivals. Great for learning tracks.',
    ccEquivalent: '50cc',
    speedMultiplier: 0.84,
    accelMultiplier: 0.88,
    skillMultiplier: 0.70,
    maxDriftTier: 1,
    mistakeMultiplier: 1.8,
    reactionLatencySec: 0.22
  },
  beshi_gorom: {
    tier: 'beshi_gorom',
    label: 'Beshi Gorom (Medium)',
    description: 'Competitive championship pace. Rivals drift and take shortcuts.',
    ccEquivalent: '100cc',
    speedMultiplier: 0.95,
    accelMultiplier: 0.96,
    skillMultiplier: 0.95,
    maxDriftTier: 2,
    mistakeMultiplier: 1.0,
    reactionLatencySec: 0.10
  },
  naga_jhal: {
    tier: 'naga_jhal',
    label: 'Naga Jhal (Hard)',
    description: 'Brutal Grand Prix speed! Rivals attack apexes with Tier 3 mini-turbos.',
    ccEquivalent: '150cc',
    speedMultiplier: 1.03,
    accelMultiplier: 1.06,
    skillMultiplier: 1.18,
    maxDriftTier: 3,
    mistakeMultiplier: 0.35,
    reactionLatencySec: 0.04
  }
};
