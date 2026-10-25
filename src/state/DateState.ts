// src/state/DateState.ts - Reactive state store migrated from DateState in game.js

export const DateState: any = {
  // Original Dhaka Valley flags
  totoroJoined: false,
  teaDone: false,
  charukolaDone: false,
  bookDone: false,
  bulliesDefeated: false,
  curzonExplored: false,
  boseQuizDone: false,
  sultanaElixirGiven: false,
  kabirBuffGiven: false,
  motaharChessDone: false,
  ahonaQuestStage: 0,
  imanQuestStage: 0,
  apshoraQuestStage: 0,
  fuchkaDone: false,
  doiDone: false,
  gajraDone: false,
  rickshawTourDone: false,
  stargazingDone: false,
  confessionDone: false,
  rickshawBest: 0,
  hearts: 0,
  farmhouseExplored: false,
  cowMilked: false,
  eggCollected: false,
  goatPetted: false,
  duckFed: false,
  inventory: [],
  memories: [],
  chosenBook: 'Neruda & Nazrul Poems',
  spicyChoice: 'Extra Naga Chili',
  paintedArt: 'Terracotta Rickshaw Mug',

  // Expanded Multi-World RPG State
  currentWorld: 'dhaka',
  playerPos: { x: 480, y: 1380 },
  level: 1,
  xp: 0,
  xpToNext: 100,
  hp: 100,
  maxHp: 100,
  sp: 50,
  maxSp: 50,
  // Totoro Bond System (0 - 4 pips)
  bond: 1.0,
  maxBond: 4.0,
  // Player Combat & Defense State
  isGuarding: false,
  parryActiveUntil: 0,
  dashCooldownUntil: 0,
  timeDilationUntil: 0,
  baseAtk: 12,
  baseDef: 5,
  equipped: {
    weapon: 'umbrella_blade',
    armor: 'yellow_raincoat',
    accessory: null
  },
  itemCounts: {
    umbrella_blade: 1,
    yellow_raincoat: 1
  },
  unlockedWorlds: ['dhaka', 'farmhouse'],
  defeatedBosses: [],
  sideQuests: {
    sq_cat_fish: false,
    sq_poet_rhyme: false,
    sq_photo_pose: false,
    sq_farmhouse_tour: false,
    sq_farm_animals: false,
    sq_forest_dew: false,
    sq_sunken_shells: false,
    sq_ember_forge: false,
    sq_frost_lens: false,
    sq_ananya_spirit: false,
    sq_kofil_rickshaw: false,
    sq_shamsher_nishi: false
  },
  forestSeanceComplete: false,
  ananyaQuestStage: 0,
  kofilQuestStage: 0,
  shamsherQuestStage: 0,
  npcOverrides: {},
  savedCalendar: null
};

if (typeof window !== 'undefined') {
  (window as any).DateState = DateState;
}
