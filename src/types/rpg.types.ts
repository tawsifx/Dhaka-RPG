// src/types/rpg.types.ts - Core types & interfaces for Totoro & Moon Walker RPG

export type ItemCategory = 'keepsake' | 'consumable' | 'weapon' | 'armor' | 'material' | 'tool' | 'seed';

export interface ItemDef {
  id: string;
  cat: ItemCategory | string;
  name: string;
  desc: string;
  emoji: string;
  healHp?: number;
  healSp?: number;
  atk?: number;
  def?: number;
  critRate?: number;
  maxHp?: number;
  value?: number;
  tint?: string;
  [key: string]: any;
}

export interface CraftRecipe {
  id: string;
  name: string;
  resultId: string;
  resultQty: number;
  inputs: Record<string, number>;
  desc: string;
  icon: string;
}

export interface WorldSpawnPos {
  x: number;
  y: number;
}

export interface GatherableSpawn {
  type: string;
  x: number;
  y: number;
  respawnTime?: number;
}

export interface EnemySpawnConfig {
  type: string;
  x: number;
  y: number;
  level?: number;
  isBoss?: boolean;
}

export interface WorldConfig {
  id: string;
  name: string;
  color: string;
  bgmTrack: string;
  mapW: number;
  mapH: number;
  spawnPos: WorldSpawnPos;
  portalPos?: WorldSpawnPos;
  desc: string;
  weatherTheme: string;
  gatherables?: GatherableSpawn[];
  enemies?: EnemySpawnConfig[];
  monumentName?: string;
  monumentPos?: WorldSpawnPos;
  [key: string]: any;
}

export interface DialogueChoice {
  text: string;
  next?: number;
  onSelect?: () => void;
}

export interface DialogueNode {
  speaker: string;
  text: string;
  portrait?: string;
  choices?: DialogueChoice[];
  sfx?: string;
  action?: () => void;
}

export interface PlayerInventorySlot {
  id: string;
  qty: number;
}

export interface PlayerStatsState {
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  totoroBond: number; // 0 - 5
  gold: number;
  equippedWeapon: string | null;
  equippedArmor: string | null;
  activeObjective: string;
}

export interface DateProgressionState {
  totoroJoined: boolean;
  activeWorld: string;
  unlockedWorlds: string[];
  defeatedBosses: string[];
  unlockedKeepsakes: string[];
  memoriesUnlocked: string[];
  craftedItems: string[];
  questsCompleted: string[];
  dialogueHistory: Record<string, number>;
  farmUnlocked: boolean;
  [key: string]: any;
}

export interface SavePayload {
  version: number;
  timestamp: number;
  stats: PlayerStatsState;
  inventory: PlayerInventorySlot[];
  progression: DateProgressionState;
  activeWorld: string;
  playerPos: { x: number; y: number };
}
