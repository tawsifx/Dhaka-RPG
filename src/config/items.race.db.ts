// src/config/items.race.db.ts - Dhaka Street Items Database & Specifications
import itemWeights from './itemWeights.race.json';

export type ItemType =
  | 'malai_cha'
  | 'naga_fuchka'
  | 'mishti_doi'
  | 'parasol_shield'
  | 'rickshaw_bell'
  | 'ghuri_kite';

export type HitReactionType = 'none' | 'spin_out' | 'explosion' | 'squash' | 'stun';

export interface ItemDefinition {
  id: ItemType;
  name: string;
  bengaliName: string;
  description: string;
  category: 'boost' | 'projectile' | 'trap' | 'shield' | 'shockwave' | 'homing';
  stkEquivalent: string;
  durationSec: number;
  hitReaction: HitReactionType;
  projectileSpeed?: number;
  maxDistance?: number;
  bounceElasticity?: number;
  radiusMeters?: number;
  speedBoost?: number;
  icon: string;
}

export const ITEMS_DB: Record<ItemType, ItemDefinition> = {
  malai_cha: {
    id: 'malai_cha',
    name: 'Malai Cha Boost',
    bengaliName: 'মালাই চা বুস্ট',
    description: 'Hot cup of rich creamy tea providing instant turbo acceleration and off-road shielding.',
    category: 'boost',
    stkEquivalent: 'zipper',
    durationSec: 2.5,
    hitReaction: 'none',
    speedBoost: 6.0,
    icon: '🍵'
  },
  naga_fuchka: {
    id: 'naga_fuchka',
    name: 'Naga Fuchka Rocket',
    bengaliName: 'নাগা ফুচকা রকেট',
    description: 'Ultra-spicy tamarind fuchka fired forward or backward that bounces off barriers and explodes on contact.',
    category: 'projectile',
    stkEquivalent: 'bowling',
    durationSec: 6.0,
    hitReaction: 'explosion',
    projectileSpeed: 35.0,
    maxDistance: 120.0,
    bounceElasticity: 0.8,
    radiusMeters: 1.2,
    icon: '🌶️'
  },
  mishti_doi: {
    id: 'mishti_doi',
    name: 'Mishti Doi Splat',
    bengaliName: 'মিষ্টি দই স্প্ল্যাট',
    description: 'Traditional clay pot of sweet yoghurt dropped as an oil slick that causes rivals to spin out 360°.',
    category: 'trap',
    stkEquivalent: 'cake',
    durationSec: 20.0,
    hitReaction: 'spin_out',
    radiusMeters: 1.6,
    icon: '🍯'
  },
  parasol_shield: {
    id: 'parasol_shield',
    name: 'Parasol Shield',
    bengaliName: 'রঙিন ছাতা শিল্ড',
    description: 'Vibrant hand-painted rickshaw umbrella rotating around the kart, deflecting projectiles and contact bumps.',
    category: 'shield',
    stkEquivalent: 'swatter',
    durationSec: 7.5,
    hitReaction: 'none',
    radiusMeters: 2.0,
    icon: '☂️'
  },
  rickshaw_bell: {
    id: 'rickshaw_bell',
    name: 'Rickshaw Bell Shockwave',
    bengaliName: 'রিকশা বেল শকওয়েভ',
    description: 'Acoustic brass chime shockwave that stuns and disorients all surrounding karts within 6 meters.',
    category: 'shockwave',
    stkEquivalent: 'plunger',
    durationSec: 1.0,
    hitReaction: 'stun',
    radiusMeters: 6.0,
    icon: '🔔'
  },
  ghuri_kite: {
    id: 'ghuri_kite',
    name: 'Ghuri Kite (Patang)',
    bengaliName: 'ঘুড়ি (পতঙ্গ)',
    description: 'Soaring festival kite gliding along the track centerline that homes in on the 1st place leader and squashes them.',
    category: 'homing',
    stkEquivalent: 'rubber-ball',
    durationSec: 8.0,
    hitReaction: 'squash',
    projectileSpeed: 38.0,
    radiusMeters: 1.8,
    icon: '🪁'
  }
};

export const ITEM_WEIGHTS = itemWeights;
