// src/config/npcSchedules.db.ts - Comprehensive 38 NPC Schedule & Behavior Database
import { NpcScheduleDef } from '../types/npc.types';

export const NPC_SCHEDULES_DB: Record<string, NpcScheduleDef> = {
  // =========================================================================
  // TIER A: DHAKA VALLEY OVERWORLD CITIZENS & VENDORS (19 ENTITIES)
  // =========================================================================

  // 1. Tong-er Mama (Master Tea Vendor, Fuller Road)
  tong_er_mama: {
    npcId: 'tong_er_mama',
    displayName: 'Tong-er Mama',
    tier: 'A',
    home: { map: 'dhaka', tile: { col: 8, row: 9 } }, // 272, 304
    sleep: { map: 'dhaka', tile: { col: 8, row: 9 } },
    movement: {
      speedTilesPerSec: 1.4,
      stepStyle: 'tile-step',
      idleBehaviors: [
        { id: 'brew_tea', weight: 4, minDurationSec: 6, maxDurationSec: 12 },
        { id: 'sip_tea', weight: 2, minDurationSec: 4, maxDurationSec: 8 }
      ],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'tong_rain_shelter',
        priority: 60,
        when: { isRaining: true },
        stops: [
          { at: '06:00', map: 'dhaka', tile: { col: 8, row: 9 }, facing: 'down', activity: 'shelter_rain', dialogueKey: 'tong_hot_cha_rain' }
        ]
      },
      {
        id: 'tong_winter_longer_hours',
        priority: 25,
        when: { seasons: ['winter'] },
        stops: [
          { at: '05:30', map: 'dhaka', tile: { col: 8, row: 9 }, facing: 'down', activity: 'brew_tea' },
          { at: '15:00', map: 'dhaka', tile: { col: 8, row: 10 }, facing: 'right', activity: 'sip_tea', dwellMin: 45 },
          { at: '16:00', map: 'dhaka', tile: { col: 8, row: 9 }, facing: 'down', activity: 'brew_tea' },
          { at: '23:30', map: 'dhaka', tile: { col: 8, row: 9 }, facing: 'up', activity: 'sleep' }
        ]
      },
      {
        id: 'tong_standard_day',
        priority: 10,
        when: {},
        stops: [
          { at: '06:00', map: 'dhaka', tile: { col: 8, row: 9 }, facing: 'down', activity: 'brew_tea' }, // Lights stove
          { at: '14:30', map: 'dhaka', tile: { col: 8, row: 10 }, facing: 'left', activity: 'sip_tea', dwellMin: 45 }, // Afternoon lull
          { at: '15:30', map: 'dhaka', tile: { col: 8, row: 9 }, facing: 'down', activity: 'brew_tea' }, // Evening rush
          { at: '23:00', map: 'dhaka', tile: { col: 8, row: 9 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '06:00', map: 'dhaka', tile: { col: 8, row: 9 }, facing: 'down', activity: 'brew_tea' },
      { at: '23:00', map: 'dhaka', tile: { col: 8, row: 9 }, facing: 'up', activity: 'sleep' }
    ]
  },

  // 2. Tania (Dhanmondi Jogger)
  tania: {
    npcId: 'tania',
    displayName: 'Tania (Dhanmondi Jogger)',
    tier: 'A',
    home: { map: 'dhaka', tile: { col: 36, row: 25 } }, // 1150, 820
    sleep: { map: 'dhaka', tile: { col: 36, row: 25 } },
    movement: {
      speedTilesPerSec: 2.4, // Fast jogger
      stepStyle: 'smooth',
      idleBehaviors: [
        { id: 'jog_stretch', weight: 4, minDurationSec: 4, maxDurationSec: 8 }
      ],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 1.5, repathAfterSec: 3.5 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'tania_rain_cancel',
        priority: 50,
        when: { isRaining: true },
        stops: [
          // Shelters under TSC Rotunda
          { at: '06:00', map: 'dhaka', tile: { col: 12, row: 10 }, facing: 'down', activity: 'shelter_rain' }
        ]
      },
      {
        id: 'tania_routine',
        priority: 10,
        when: {},
        stops: [
          { at: '06:00', map: 'dhaka', tile: { col: 36, row: 25 }, facing: 'right', activity: 'jog_stretch', dwellMin: 15 },
          { at: '06:30', map: 'dhaka', tile: { col: 52, row: 25 }, facing: 'down' },
          { at: '07:15', map: 'dhaka', tile: { col: 52, row: 36 }, facing: 'left' },
          { at: '08:00', map: 'dhaka', tile: { col: 36, row: 36 }, facing: 'up' },
          { at: '09:00', map: 'dhaka', tile: { col: 8, row: 9 }, facing: 'down', activity: 'sip_tea', dwellMin: 60 }, // Tea stop
          { at: '11:00', map: 'dhaka', tile: { col: 36, row: 25 }, facing: 'down', activity: 'none', dwellMin: 240 }, // Midday rest
          { at: '17:00', map: 'dhaka', tile: { col: 36, row: 25 }, facing: 'right', activity: 'jog_stretch', dwellMin: 15 }, // Evening lap
          { at: '17:30', map: 'dhaka', tile: { col: 52, row: 25 }, facing: 'down' },
          { at: '18:15', map: 'dhaka', tile: { col: 52, row: 36 }, facing: 'left' },
          { at: '19:00', map: 'dhaka', tile: { col: 36, row: 36 }, facing: 'up' },
          { at: '21:30', map: 'dhaka', tile: { col: 36, row: 25 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '06:00', map: 'dhaka', tile: { col: 36, row: 25 }, facing: 'right', activity: 'jog_stretch' },
      { at: '21:00', map: 'dhaka', tile: { col: 36, row: 25 }, facing: 'up', activity: 'sleep' }
    ]
  },

  // 3. Sami (Street Photographer)
  sami: {
    npcId: 'sami',
    displayName: 'Sami (Street Photographer)',
    tier: 'A',
    home: { map: 'dhaka', tile: { col: 47, row: 13 } }, // 1520, 420
    sleep: { map: 'dhaka', tile: { col: 47, row: 13 } },
    movement: {
      speedTilesPerSec: 1.7,
      stepStyle: 'tile-step',
      idleBehaviors: [
        { id: 'take_photos', weight: 4, minDurationSec: 5, maxDurationSec: 10 }
      ],
      noticePlayerRadiusTiles: 3,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'sami_rain',
        priority: 50,
        when: { isRaining: true },
        stops: [
          // Shoots rain reflections from under the TSC rotunda
          { at: '07:00', map: 'dhaka', tile: { col: 12, row: 11 }, facing: 'right', activity: 'take_photos' }
        ]
      },
      {
        id: 'sami_routine',
        priority: 10,
        when: {},
        stops: [
          { at: '07:30', map: 'dhaka', tile: { col: 47, row: 13 }, facing: 'down', activity: 'take_photos' },
          { at: '11:00', map: 'dhaka', tile: { col: 8, row: 9 }, facing: 'left', activity: 'sip_tea', dwellMin: 45 },
          { at: '13:00', map: 'dhaka', tile: { col: 30, row: 25 }, facing: 'up', activity: 'take_photos', dwellMin: 90 }, // Mintu Rd fountain
          { at: '17:00', map: 'dhaka', tile: { col: 55, row: 41 }, facing: 'left', activity: 'take_photos', dwellMin: 150 }, // Lake pier golden hour
          { at: '21:00', map: 'dhaka', tile: { col: 47, row: 13 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '07:30', map: 'dhaka', tile: { col: 47, row: 13 }, facing: 'down', activity: 'take_photos' },
      { at: '21:00', map: 'dhaka', tile: { col: 47, row: 13 }, facing: 'up', activity: 'sleep' }
    ]
  },

  // 4. Arif (DU Physics Senior)
  arif: {
    npcId: 'arif',
    displayName: 'Arif (DU Physics Senior)',
    tier: 'A',
    home: { map: 'dhaka', tile: { col: 15, row: 36 } }, // 480, 1180
    sleep: { map: 'dhaka', tile: { col: 15, row: 36 } },
    movement: {
      speedTilesPerSec: 1.7,
      stepStyle: 'tile-step',
      idleBehaviors: [
        { id: 'sip_tea', weight: 3, minDurationSec: 4, maxDurationSec: 8 },
        { id: 'read_book', weight: 3, minDurationSec: 5, maxDurationSec: 12 }
      ],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'arif_rain',
        priority: 50,
        when: { isRaining: true },
        stops: [
          // Shelters in Curzon portico
          { at: '08:00', map: 'dhaka', tile: { col: 6, row: 40 }, facing: 'down', activity: 'read_book' }
        ]
      },
      {
        id: 'arif_routine',
        priority: 10,
        when: {},
        stops: [
          { at: '08:00', map: 'dhaka', tile: { col: 15, row: 36 }, facing: 'up' },
          { at: '09:00', map: 'dhaka', tile: { col: 8, row: 9 }, facing: 'down', activity: 'sip_tea', dwellMin: 40 }, // Tea
          { at: '11:00', map: 'dhaka', tile: { col: 6, row: 40 }, facing: 'up', activity: 'read_book', dwellMin: 120 }, // Science library
          { at: '15:00', map: 'dhaka', tile: { col: 24, row: 16 }, facing: 'right', activity: 'none', dwellMin: 60 },
          { at: '18:00', map: 'dhaka', tile: { col: 8, row: 9 }, facing: 'down', activity: 'sip_tea', dwellMin: 60 },
          { at: '22:30', map: 'dhaka', tile: { col: 15, row: 36 }, facing: 'down', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '08:00', map: 'dhaka', tile: { col: 15, row: 36 }, facing: 'up' },
      { at: '22:00', map: 'dhaka', tile: { col: 15, row: 36 }, facing: 'down', activity: 'sleep' }
    ]
  },

  // 5. Nadia (Charukola Sketcher)
  nadia: {
    npcId: 'nadia',
    displayName: 'Nadia (Charukola Sketcher)',
    tier: 'A',
    home: { map: 'dhaka', tile: { col: 10, row: 25 } }, // 340, 820
    sleep: { map: 'dhaka', tile: { col: 10, row: 25 } },
    movement: {
      speedTilesPerSec: 1.5,
      stepStyle: 'tile-step',
      idleBehaviors: [
        { id: 'sketch', weight: 5, minDurationSec: 6, maxDurationSec: 14 }
      ],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'nadia_spring_bloom',
        priority: 25,
        when: { seasons: ['spring'] },
        stops: [
          // Sketches blooming Krishnachura canopy
          { at: '08:30', map: 'dhaka', tile: { col: 7, row: 23 }, facing: 'up', activity: 'sketch', dwellMin: 180 },
          { at: '14:00', map: 'dhaka', tile: { col: 25, row: 25 }, facing: 'down', activity: 'sketch', dwellMin: 120 },
          { at: '20:30', map: 'dhaka', tile: { col: 10, row: 25 }, facing: 'up', activity: 'sleep' }
        ]
      },
      {
        id: 'nadia_routine',
        priority: 10,
        when: {},
        stops: [
          { at: '08:30', map: 'dhaka', tile: { col: 10, row: 25 }, facing: 'right', activity: 'sketch' },
          { at: '12:00', map: 'dhaka', tile: { col: 8, row: 9 }, facing: 'down', activity: 'sip_tea', dwellMin: 45 },
          { at: '14:30', map: 'dhaka', tile: { col: 7, row: 23 }, facing: 'up', activity: 'sketch', dwellMin: 150 }, // Charukola wall
          { at: '18:00', map: 'dhaka', tile: { col: 25, row: 25 }, facing: 'right', activity: 'sketch', dwellMin: 90 },
          { at: '21:00', map: 'dhaka', tile: { col: 10, row: 25 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '08:30', map: 'dhaka', tile: { col: 10, row: 25 }, facing: 'right', activity: 'sketch' },
      { at: '21:00', map: 'dhaka', tile: { col: 10, row: 25 }, facing: 'up', activity: 'sleep' }
    ]
  },

  // 6. Mimi (Campus Ginger Cat)
  mimi: {
    npcId: 'mimi',
    displayName: 'Mimi (Campus Ginger Cat)',
    tier: 'C',
    home: { map: 'dhaka', tile: { col: 8, row: 11 } }, // 260, 380
    sleep: { map: 'dhaka', tile: { col: 8, row: 8 } },
    movement: {
      speedTilesPerSec: 1.3,
      stepStyle: 'smooth',
      idleBehaviors: [
        { id: 'cat_purr', weight: 4, minDurationSec: 4, maxDurationSec: 8 },
        { id: 'nap_sun', weight: 4, minDurationSec: 8, maxDurationSec: 18 }
      ],
      noticePlayerRadiusTiles: 3,
      personalSpaceTiles: 1,
      patience: { waitSec: 1, repathAfterSec: 2 },
      pathCosts: { path: 1, grass: 1, flowers: 2, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'mimi_rain_hide',
        priority: 60,
        when: { isRaining: true },
        stops: [
          // Hides under tea stall bench
          { at: '00:00', map: 'dhaka', tile: { col: 8, row: 8 }, facing: 'down', activity: 'shelter_rain' }
        ]
      },
      {
        id: 'mimi_routine',
        priority: 10,
        when: {},
        stops: [
          { at: '06:30', map: 'dhaka', tile: { col: 8, row: 11 }, facing: 'right', activity: 'cat_purr' },
          { at: '10:00', map: 'dhaka', tile: { col: 16, row: 11 }, facing: 'down', activity: 'nap_sun', dwellMin: 180 }, // Sun patches
          { at: '14:30', map: 'dhaka', tile: { col: 8, row: 9 }, facing: 'up', activity: 'cat_purr', dwellMin: 90 }, // Near tea stall
          { at: '17:00', map: 'dhaka', tile: { col: 16, row: 8 }, facing: 'left', activity: 'nap_sun', dwellMin: 120 },
          { at: '20:30', map: 'dhaka', tile: { col: 8, row: 8 }, facing: 'down', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '06:30', map: 'dhaka', tile: { col: 8, row: 11 }, facing: 'right', activity: 'cat_purr' },
      { at: '20:30', map: 'dhaka', tile: { col: 8, row: 8 }, facing: 'down', activity: 'sleep' }
    ]
  },

  // 7. Baki Bhai (Nilkhet Poet)
  baki_bhai: {
    npcId: 'baki_bhai',
    displayName: 'Baki Bhai (Nilkhet Poet)',
    tier: 'A',
    home: { map: 'dhaka', tile: { col: 19, row: 10 } }, // 620, 320
    sleep: { map: 'dhaka', tile: { col: 19, row: 10 } },
    movement: {
      speedTilesPerSec: 1.4,
      stepStyle: 'tile-step',
      idleBehaviors: [
        { id: 'compose_poetry', weight: 4, minDurationSec: 6, maxDurationSec: 14 }
      ],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'baki_rain',
        priority: 50,
        when: { isRaining: true },
        stops: [
          // Recites under awning
          { at: '08:00', map: 'dhaka', tile: { col: 12, row: 10 }, facing: 'down', activity: 'compose_poetry' }
        ]
      },
      {
        id: 'baki_routine',
        priority: 10,
        when: {},
        stops: [
          { at: '08:00', map: 'dhaka', tile: { col: 19, row: 10 }, facing: 'right', activity: 'compose_poetry' },
          { at: '11:30', map: 'dhaka', tile: { col: 33, row: 8 }, facing: 'down', activity: 'browse_books', dwellMin: 60 }, // Nilkhet book market
          { at: '15:00', map: 'dhaka', tile: { col: 8, row: 9 }, facing: 'down', activity: 'sip_tea', dwellMin: 60 },
          { at: '17:30', map: 'dhaka', tile: { col: 43, row: 10 }, facing: 'left', activity: 'compose_poetry', dwellMin: 120 }, // Pavement benches
          { at: '22:00', map: 'dhaka', tile: { col: 19, row: 10 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '08:00', map: 'dhaka', tile: { col: 19, row: 10 }, facing: 'right', activity: 'compose_poetry' },
      { at: '22:00', map: 'dhaka', tile: { col: 19, row: 10 }, facing: 'up', activity: 'sleep' }
    ]
  },

  // 8. TSC Acoustic Singer
  tsc_singer: {
    npcId: 'tsc_singer',
    displayName: 'TSC Acoustic Singer',
    tier: 'A',
    home: { map: 'dhaka', tile: { col: 12, row: 9 } }, // 400, 304
    sleep: { map: 'dhaka', tile: { col: 12, row: 9 } },
    movement: {
      speedTilesPerSec: 1.5,
      stepStyle: 'tile-step',
      idleBehaviors: [
        { id: 'play_guitar', weight: 5, minDurationSec: 8, maxDurationSec: 16 }
      ],
      noticePlayerRadiusTiles: 3,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'singer_rain',
        priority: 50,
        when: { isRaining: true },
        stops: [
          // Plays under rotunda ceiling
          { at: '14:00', map: 'dhaka', tile: { col: 12, row: 10 }, facing: 'down', activity: 'play_guitar' }
        ]
      },
      {
        id: 'singer_routine',
        priority: 10,
        when: {},
        stops: [
          { at: '14:00', map: 'dhaka', tile: { col: 12, row: 9 }, facing: 'down', activity: 'play_guitar' },
          { at: '17:00', map: 'dhaka', tile: { col: 12, row: 9 }, facing: 'down', activity: 'play_guitar', dwellMin: 240 }, // Golden hour concert
          { at: '22:00', map: 'dhaka', tile: { col: 8, row: 9 }, facing: 'left', activity: 'sip_tea', dwellMin: 45 },
          { at: '23:30', map: 'dhaka', tile: { col: 12, row: 9 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '14:00', map: 'dhaka', tile: { col: 12, row: 9 }, facing: 'down', activity: 'play_guitar' },
      { at: '23:00', map: 'dhaka', tile: { col: 12, row: 9 }, facing: 'up', activity: 'sleep' }
    ]
  },

  // 9. Charukola Clay Artist
  clay_artist: {
    npcId: 'clay_artist',
    displayName: 'Charukola Clay Artist',
    tier: 'A',
    home: { map: 'dhaka', tile: { col: 7, row: 23 } }, // 240, 752
    sleep: { map: 'dhaka', tile: { col: 7, row: 23 } },
    movement: {
      speedTilesPerSec: 1.4,
      stepStyle: 'tile-step',
      idleBehaviors: [
        { id: 'sculpt_clay', weight: 4, minDurationSec: 6, maxDurationSec: 14 }
      ],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'clay_artist_routine',
        priority: 10,
        when: {},
        stops: [
          { at: '08:00', map: 'dhaka', tile: { col: 7, row: 23 }, facing: 'down', activity: 'sculpt_clay' },
          { at: '12:30', map: 'dhaka', tile: { col: 8, row: 9 }, facing: 'down', activity: 'sip_tea', dwellMin: 45 },
          { at: '14:00', map: 'dhaka', tile: { col: 7, row: 23 }, facing: 'down', activity: 'sculpt_clay' },
          { at: '20:00', map: 'dhaka', tile: { col: 7, row: 23 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '08:00', map: 'dhaka', tile: { col: 7, row: 23 }, facing: 'down', activity: 'sculpt_clay' },
      { at: '20:00', map: 'dhaka', tile: { col: 7, row: 23 }, facing: 'up', activity: 'sleep' }
    ]
  },

  // 10. Nilkhet Boiwala (Antique Book Vendor)
  nilkhet_boiwala: {
    npcId: 'nilkhet_boiwala',
    displayName: 'Nilkhet Boiwala',
    tier: 'A',
    home: { map: 'dhaka', tile: { col: 33, row: 8 } }, // 1072, 272
    sleep: { map: 'dhaka', tile: { col: 33, row: 8 } },
    movement: {
      speedTilesPerSec: 1.4,
      stepStyle: 'tile-step',
      idleBehaviors: [
        { id: 'browse_books', weight: 4, minDurationSec: 6, maxDurationSec: 12 },
        { id: 'read_book', weight: 3, minDurationSec: 5, maxDurationSec: 10 }
      ],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'boiwala_rain',
        priority: 50,
        when: { isRaining: true },
        stops: [
          // Covers books with plastic tarp
          { at: '09:00', map: 'dhaka', tile: { col: 33, row: 8 }, facing: 'down', activity: 'shelter_rain' }
        ]
      },
      {
        id: 'boiwala_routine',
        priority: 10,
        when: {},
        stops: [
          { at: '09:30', map: 'dhaka', tile: { col: 33, row: 8 }, facing: 'down', activity: 'browse_books' },
          { at: '13:30', map: 'dhaka', tile: { col: 33, row: 8 }, facing: 'right', activity: 'read_book', dwellMin: 60 },
          { at: '15:00', map: 'dhaka', tile: { col: 33, row: 8 }, facing: 'down', activity: 'browse_books' },
          { at: '19:30', map: 'dhaka', tile: { col: 33, row: 8 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '09:30', map: 'dhaka', tile: { col: 33, row: 8 }, facing: 'down', activity: 'browse_books' },
      { at: '19:30', map: 'dhaka', tile: { col: 33, row: 8 }, facing: 'up', activity: 'sleep' }
    ]
  },

  // 11. Phulwali (Beli Gajra Flower Seller)
  phulwali: {
    npcId: 'phulwali',
    displayName: 'Phulwali (Beli Gajra)',
    tier: 'A',
    home: { map: 'dhaka', tile: { col: 39, row: 16 } }, // 1264, 528
    sleep: { map: 'dhaka', tile: { col: 39, row: 16 } },
    movement: {
      speedTilesPerSec: 1.5,
      stepStyle: 'tile-step',
      idleBehaviors: [
        { id: 'weave_garland', weight: 5, minDurationSec: 5, maxDurationSec: 12 }
      ],
      noticePlayerRadiusTiles: 3,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'phulwali_routine',
        priority: 10,
        when: {},
        stops: [
          { at: '07:30', map: 'dhaka', tile: { col: 39, row: 16 }, facing: 'down', activity: 'weave_garland' }, // Sets up cart
          { at: '12:00', map: 'dhaka', tile: { col: 8, row: 9 }, facing: 'left', activity: 'sip_tea', dwellMin: 40 },
          { at: '16:30', map: 'dhaka', tile: { col: 30, row: 25 }, facing: 'right', activity: 'weave_garland', dwellMin: 90 }, // Wanders near fountain
          { at: '18:30', map: 'dhaka', tile: { col: 55, row: 41 }, facing: 'down', activity: 'weave_garland', dwellMin: 60 }, // Pier couples
          { at: '20:30', map: 'dhaka', tile: { col: 39, row: 16 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '07:30', map: 'dhaka', tile: { col: 39, row: 16 }, facing: 'down', activity: 'weave_garland' },
      { at: '20:30', map: 'dhaka', tile: { col: 39, row: 16 }, facing: 'up', activity: 'sleep' }
    ]
  },

  // 12. Mama's Naga Fuchka Vendor
  naga_fuchka: {
    npcId: 'naga_fuchka',
    displayName: "Mama's Naga Fuchka",
    tier: 'A',
    home: { map: 'dhaka', tile: { col: 49, row: 8 } }, // 1584, 272
    sleep: { map: 'dhaka', tile: { col: 49, row: 8 } },
    movement: {
      speedTilesPerSec: 1.4,
      stepStyle: 'tile-step',
      idleBehaviors: [
        { id: 'sell_fuchka', weight: 5, minDurationSec: 5, maxDurationSec: 10 }
      ],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'fuchka_routine',
        priority: 10,
        when: {},
        stops: [
          { at: '13:00', map: 'dhaka', tile: { col: 49, row: 8 }, facing: 'down', activity: 'sell_fuchka' }, // Opens afternoon
          { at: '17:30', map: 'dhaka', tile: { col: 49, row: 8 }, facing: 'down', activity: 'sell_fuchka', dwellMin: 180 }, // Peak golden hour
          { at: '22:30', map: 'dhaka', tile: { col: 49, row: 8 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '13:00', map: 'dhaka', tile: { col: 49, row: 8 }, facing: 'down', activity: 'sell_fuchka' },
      { at: '22:00', map: 'dhaka', tile: { col: 49, row: 8 }, facing: 'up', activity: 'sleep' }
    ]
  },

  // 13. Pabnar Mishti Doi Vendor
  mishti_doi: {
    npcId: 'mishti_doi',
    displayName: 'Pabnar Mishti Doi',
    tier: 'A',
    home: { map: 'dhaka', tile: { col: 54, row: 8 } }, // 1744, 272
    sleep: { map: 'dhaka', tile: { col: 54, row: 8 } },
    movement: {
      speedTilesPerSec: 1.4,
      stepStyle: 'tile-step',
      idleBehaviors: [
        { id: 'sell_doi', weight: 5, minDurationSec: 5, maxDurationSec: 10 }
      ],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'doi_routine',
        priority: 10,
        when: {},
        stops: [
          { at: '10:00', map: 'dhaka', tile: { col: 54, row: 8 }, facing: 'down', activity: 'sell_doi' },
          { at: '14:00', map: 'dhaka', tile: { col: 54, row: 8 }, facing: 'down', activity: 'sell_doi', dwellMin: 240 },
          { at: '21:30', map: 'dhaka', tile: { col: 54, row: 8 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '10:00', map: 'dhaka', tile: { col: 54, row: 8 }, facing: 'down', activity: 'sell_doi' },
      { at: '21:30', map: 'dhaka', tile: { col: 54, row: 8 }, facing: 'up', activity: 'sleep' }
    ]
  },

  // 14. Anamika (Bestie Food Crawl)
  anamika: {
    npcId: 'anamika',
    displayName: 'Anamika',
    tier: 'A',
    home: { map: 'dhaka', tile: { col: 20, row: 24 } }, // 640, 780
    sleep: { map: 'dhaka', tile: { col: 20, row: 24 } },
    movement: {
      speedTilesPerSec: 1.8,
      stepStyle: 'tile-step',
      idleBehaviors: [
        { id: 'sip_tea', weight: 4, minDurationSec: 4, maxDurationSec: 8 }
      ],
      noticePlayerRadiusTiles: 3,
      personalSpaceTiles: 1,
      patience: { waitSec: 1.5, repathAfterSec: 3.5 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'anamika_atelier_running',
        priority: 40,
        when: { quest: [{ flag: 'apshoraQuestStage', min: 2 }] },
        stops: [
          { at: '08:00', map: 'dhaka', tile: { col: 8, row: 9 }, facing: 'down', activity: 'sip_tea', dwellMin: 60 },
          { at: '10:00', map: 'dhaka', tile: { col: 10, row: 24 }, facing: 'right', activity: 'sketch', dwellMin: 300 }, // Charukola studio
          { at: '17:00', map: 'dhaka', tile: { col: 49, row: 8 }, facing: 'left', activity: 'sip_tea', dwellMin: 60 }, // Naga fuchka break
          { at: '21:30', map: 'dhaka', tile: { col: 20, row: 24 }, facing: 'up', activity: 'sleep' }
        ]
      },
      {
        id: 'anamika_food_crawl',
        priority: 10,
        when: {},
        stops: [
          { at: '07:30', map: 'dhaka', tile: { col: 8, row: 9 }, facing: 'down', activity: 'sip_tea', dwellMin: 90 }, // Breakfast tea
          { at: '11:00', map: 'dhaka', tile: { col: 20, row: 24 }, facing: 'right' },
          { at: '13:00', map: 'dhaka', tile: { col: 30, row: 16 }, facing: 'down', dwellMin: 90 },
          { at: '16:00', map: 'dhaka', tile: { col: 49, row: 8 }, facing: 'left', dwellMin: 60 }, // Fuchka
          { at: '18:00', map: 'dhaka', tile: { col: 54, row: 8 }, facing: 'down', dwellMin: 60 }, // Mishti doi
          { at: '22:00', map: 'dhaka', tile: { col: 20, row: 24 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '07:30', map: 'dhaka', tile: { col: 20, row: 24 }, facing: 'down' },
      { at: '22:00', map: 'dhaka', tile: { col: 20, row: 24 }, facing: 'up', activity: 'sleep' }
    ]
  },

  // 15. Ahona (Romantic Reconciliation Quest)
  // 15. Ahona (Romantic Reconciliation Quest)
  ahona: {
    npcId: 'ahona',
    displayName: 'Ahona',
    tier: 'A',
    home: { map: 'dhaka', tile: { col: 15, row: 33 } }, // 480, 1056 - Krishnachura Avenue Gateway
    sleep: { map: 'dhaka', tile: { col: 15, row: 33 } },
    movement: {
      speedTilesPerSec: 1.6,
      stepStyle: 'tile-step',
      idleBehaviors: [],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'ahona_reconciled_with_rakin',
        priority: 50,
        when: { quest: [{ flag: 'ahonaQuestStage', min: 4 }] },
        stops: [
          { at: '09:00', map: 'dhaka', tile: { col: 40, row: 15 }, facing: 'right', activity: 'sip_tea', dwellMin: 120 }, // Sitting with Rakin
          { at: '16:00', map: 'dhaka', tile: { col: 55, row: 41 }, facing: 'left', activity: 'none', dwellMin: 180 }, // Lake promenade
          { at: '21:00', map: 'dhaka', tile: { col: 15, row: 33 }, facing: 'up', activity: 'sleep' }
        ]
      },
      {
        id: 'ahona_crying_on_bench',
        priority: 30,
        when: { quest: [{ flag: 'bulliesDefeated', equals: true }] },
        stops: [
          { at: '08:00', map: 'dhaka', tile: { col: 40, row: 15 }, facing: 'down', dwellMin: 480 },
          { at: '20:00', map: 'dhaka', tile: { col: 40, row: 15 }, facing: 'up', activity: 'sleep' }
        ]
      },
      {
        id: 'ahona_sulking_by_gateway',
        priority: 10,
        when: {},
        stops: [
          { at: '08:00', map: 'dhaka', tile: { col: 15, row: 33 }, facing: 'down', dwellMin: 480 },
          { at: '20:00', map: 'dhaka', tile: { col: 15, row: 33 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '08:00', map: 'dhaka', tile: { col: 15, row: 33 }, facing: 'down' },
      { at: '20:00', map: 'dhaka', tile: { col: 15, row: 33 }, facing: 'up', activity: 'sleep' }
    ]
  },

  // 16. Rakin
  rakin: {
    npcId: 'rakin',
    displayName: 'Rakin',
    tier: 'A',
    home: { map: 'dhaka', tile: { col: 25, row: 10 } }, // 830, 325
    sleep: { map: 'dhaka', tile: { col: 25, row: 10 } },
    movement: {
      speedTilesPerSec: 1.6,
      stepStyle: 'tile-step',
      idleBehaviors: [],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'rakin_reconciled',
        priority: 50,
        when: { quest: [{ flag: 'ahonaQuestStage', min: 4 }] },
        stops: [
          { at: '09:00', map: 'dhaka', tile: { col: 39, row: 15 }, facing: 'left', activity: 'sip_tea', dwellMin: 120 }, // Sitting with Ahona
          { at: '16:00', map: 'dhaka', tile: { col: 54, row: 41 }, facing: 'right', activity: 'none', dwellMin: 180 },
          { at: '21:00', map: 'dhaka', tile: { col: 25, row: 10 }, facing: 'up', activity: 'sleep' }
        ]
      },
      {
        id: 'rakin_lingering',
        priority: 10,
        when: {},
        stops: [
          { at: '08:00', map: 'dhaka', tile: { col: 25, row: 10 }, facing: 'down', dwellMin: 480 },
          { at: '20:30', map: 'dhaka', tile: { col: 25, row: 10 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '08:00', map: 'dhaka', tile: { col: 25, row: 10 }, facing: 'down' },
      { at: '20:30', map: 'dhaka', tile: { col: 25, row: 10 }, facing: 'up', activity: 'sleep' }
    ]
  },

  // 17. Apshora (Textile Artisan)
  apshora: {
    npcId: 'apshora',
    displayName: 'Apshora',
    tier: 'A',
    home: { map: 'dhaka', tile: { col: 16, row: 33 } }, // 516, 1056 - beside Ahona at Gateway
    sleep: { map: 'dhaka', tile: { col: 16, row: 33 } },
    movement: {
      speedTilesPerSec: 1.6,
      stepStyle: 'tile-step',
      idleBehaviors: [
        { id: 'sketch', weight: 4, minDurationSec: 5, maxDurationSec: 10 }
      ],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'apshora_atelier',
        priority: 40,
        when: { quest: [{ flag: 'apshoraQuestStage', min: 2 }] },
        stops: [
          { at: '08:30', map: 'dhaka', tile: { col: 10, row: 24 }, facing: 'left', activity: 'sketch', dwellMin: 420 },
          { at: '21:00', map: 'dhaka', tile: { col: 16, row: 33 }, facing: 'up', activity: 'sleep' }
        ]
      },
      {
        id: 'apshora_comforting_ahona',
        priority: 30,
        when: { quest: [{ flag: 'bulliesDefeated', equals: true }] },
        stops: [
          { at: '08:00', map: 'dhaka', tile: { col: 41, row: 15 }, facing: 'left', dwellMin: 480 },
          { at: '20:00', map: 'dhaka', tile: { col: 41, row: 15 }, facing: 'up', activity: 'sleep' }
        ]
      },
      {
        id: 'apshora_default',
        priority: 10,
        when: {},
        stops: [
          { at: '08:00', map: 'dhaka', tile: { col: 16, row: 33 }, facing: 'down', dwellMin: 480 },
          { at: '20:00', map: 'dhaka', tile: { col: 16, row: 33 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '08:00', map: 'dhaka', tile: { col: 16, row: 33 }, facing: 'down' },
      { at: '20:00', map: 'dhaka', tile: { col: 16, row: 33 }, facing: 'up', activity: 'sleep' }
    ]
  },

  // 18. Salat (Mintu Road Fountain)
  salat: {
    npcId: 'salat',
    displayName: 'Salat',
    tier: 'A',
    home: { map: 'dhaka', tile: { col: 30, row: 23 } }, // 960, 736 - Mintu Road fountain west terrace
    sleep: { map: 'dhaka', tile: { col: 30, row: 23 } },
    movement: {
      speedTilesPerSec: 1.5,
      stepStyle: 'tile-step',
      idleBehaviors: [],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'salat_happy_couple',
        priority: 50,
        when: { quest: [{ flag: 'enanQuestStage', min: 5 }] },
        stops: [
          { at: '09:00', map: 'dhaka', tile: { col: 32, row: 23 }, facing: 'right', activity: 'sip_tea', dwellMin: 180 }, // Seated together
          { at: '15:00', map: 'dhaka', tile: { col: 55, row: 41 }, facing: 'down', activity: 'none', dwellMin: 180 },
          { at: '21:00', map: 'dhaka', tile: { col: 30, row: 23 }, facing: 'up', activity: 'sleep' }
        ]
      },
      {
        id: 'salat_waiting',
        priority: 10,
        when: {},
        stops: [
          { at: '08:30', map: 'dhaka', tile: { col: 30, row: 23 }, facing: 'right', dwellMin: 480 },
          { at: '20:30', map: 'dhaka', tile: { col: 30, row: 23 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '08:30', map: 'dhaka', tile: { col: 30, row: 23 }, facing: 'right' },
      { at: '20:30', map: 'dhaka', tile: { col: 30, row: 23 }, facing: 'up', activity: 'sleep' }
    ]
  },

  // 19. Enan (Software Engineer)
  enan: {
    npcId: 'enan',
    displayName: 'Enan',
    tier: 'A',
    home: { map: 'dhaka', tile: { col: 36, row: 23 } }, // 1152, 736 - Mintu Road fountain east terrace
    sleep: { map: 'dhaka', tile: { col: 36, row: 23 } },
    movement: {
      speedTilesPerSec: 1.6,
      stepStyle: 'tile-step',
      idleBehaviors: [],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'enan_attentive_couple',
        priority: 50,
        when: { quest: [{ flag: 'enanQuestStage', min: 5 }] },
        stops: [
          { at: '09:00', map: 'dhaka', tile: { col: 34, row: 23 }, facing: 'left', activity: 'sip_tea', dwellMin: 180 }, // Beside Salat
          { at: '15:00', map: 'dhaka', tile: { col: 56, row: 41 }, facing: 'down', activity: 'none', dwellMin: 180 },
          { at: '21:00', map: 'dhaka', tile: { col: 36, row: 23 }, facing: 'up', activity: 'sleep' }
        ]
      },
      {
        id: 'enan_phone_glued',
        priority: 10,
        when: {},
        stops: [
          { at: '09:00', map: 'dhaka', tile: { col: 36, row: 23 }, facing: 'left', dwellMin: 480 },
          { at: '21:00', map: 'dhaka', tile: { col: 36, row: 23 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '09:00', map: 'dhaka', tile: { col: 36, row: 23 }, facing: 'left' },
      { at: '21:00', map: 'dhaka', tile: { col: 36, row: 23 }, facing: 'up', activity: 'sleep' }
    ]
  },

  // =========================================================================
  // TIER B: CURZON HALL SCIENCE FACULTY (6 ENTITIES)
  // =========================================================================

  // 20. Prof. Motahar Hossain (Chair of Mathematics & Chess Master)
  prof_motahar: {
    npcId: 'prof_motahar',
    displayName: 'Prof. Motahar Hossain',
    tier: 'B',
    home: { map: 'curzon_interior', tile: { col: 20, row: 11 } }, // 645, 362
    sleep: { map: 'curzon_interior', tile: { col: 20, row: 11 } },
    movement: {
      speedTilesPerSec: 1.3,
      stepStyle: 'tile-step',
      idleBehaviors: [],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 1, flowers: 1, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'motahar_academic_day',
        priority: 10,
        when: {},
        stops: [
          { at: '08:30', map: 'curzon_interior', tile: { col: 20, row: 11 }, facing: 'down', dwellMin: 180 }, // Central chess table
          { at: '13:00', map: 'curzon_interior', tile: { col: 18, row: 7 }, facing: 'up', dwellMin: 60 }, // Podium lecture
          { at: '15:30', map: 'curzon_interior', tile: { col: 20, row: 11 }, facing: 'down', dwellMin: 180 }, // Afternoon chess
          { at: '20:00', map: 'curzon_interior', tile: { col: 20, row: 11 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '08:30', map: 'curzon_interior', tile: { col: 20, row: 11 }, facing: 'down' }
    ]
  },

  // 21. Prof. Satyendra (S.N. Bose, Physics Chair)
  prof_satyendra: {
    npcId: 'prof_satyendra',
    displayName: 'Prof. Satyendra (S.N. Bose)',
    tier: 'B',
    home: { map: 'curzon_interior', tile: { col: 10, row: 10 } }, // 330, 322
    sleep: { map: 'curzon_interior', tile: { col: 10, row: 10 } },
    movement: {
      speedTilesPerSec: 1.4,
      stepStyle: 'tile-step',
      idleBehaviors: [
        { id: 'study_quantum', weight: 4, minDurationSec: 6, maxDurationSec: 12 }
      ],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 1, flowers: 1, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'satyendra_quantum_rhythm',
        priority: 10,
        when: {},
        stops: [
          { at: '09:00', map: 'curzon_interior', tile: { col: 10, row: 10 }, facing: 'down', activity: 'study_quantum', dwellMin: 210 },
          { at: '13:30', map: 'curzon_interior', tile: { col: 18, row: 15 }, facing: 'down', activity: 'sip_tea', dwellMin: 45 }, // Tea break in hall
          { at: '15:00', map: 'curzon_interior', tile: { col: 10, row: 10 }, facing: 'right', activity: 'study_quantum', dwellMin: 180 },
          { at: '21:00', map: 'curzon_interior', tile: { col: 10, row: 10 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '09:00', map: 'curzon_interior', tile: { col: 10, row: 10 }, facing: 'down', activity: 'study_quantum' }
    ]
  },

  // 22. Faiza (Physics Undergrad)
  faiza: {
    npcId: 'faiza',
    displayName: 'Faiza (Physics Undergrad)',
    tier: 'B',
    home: { map: 'curzon_interior', tile: { col: 10, row: 15 } }, // 315, 482
    sleep: { map: 'curzon_interior', tile: { col: 10, row: 15 } },
    movement: {
      speedTilesPerSec: 1.8,
      stepStyle: 'tile-step',
      idleBehaviors: [
        { id: 'study_quantum', weight: 4, minDurationSec: 4, maxDurationSec: 8 }
      ],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 1.5, repathAfterSec: 3.5 },
      pathCosts: { path: 1, grass: 1, flowers: 1, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'faiza_lab_schedule',
        priority: 10,
        when: {},
        stops: [
          { at: '08:45', map: 'curzon_interior', tile: { col: 10, row: 15 }, facing: 'up', activity: 'study_quantum' },
          { at: '12:00', map: 'curzon_interior', tile: { col: 10, row: 10 }, facing: 'up', dwellMin: 60 }, // Consulting Prof. Bose
          { at: '14:00', map: 'curzon_interior', tile: { col: 10, row: 15 }, facing: 'right', activity: 'study_quantum', dwellMin: 240 },
          { at: '21:30', map: 'curzon_interior', tile: { col: 10, row: 15 }, facing: 'down', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '08:45', map: 'curzon_interior', tile: { col: 10, row: 15 }, facing: 'up' }
    ]
  },

  // 23. Prof. Sultana (Botany Chair)
  prof_sultana: {
    npcId: 'prof_sultana',
    displayName: 'Prof. Sultana (Botany Chair)',
    tier: 'B',
    home: { map: 'curzon_interior', tile: { col: 27, row: 10 } }, // 875, 322
    sleep: { map: 'curzon_interior', tile: { col: 27, row: 10 } },
    movement: {
      speedTilesPerSec: 1.4,
      stepStyle: 'tile-step',
      idleBehaviors: [
        { id: 'tend_herbarium', weight: 5, minDurationSec: 6, maxDurationSec: 12 }
      ],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 1, flowers: 1, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'sultana_herbarium_rhythm',
        priority: 10,
        when: {},
        stops: [
          { at: '08:30', map: 'curzon_interior', tile: { col: 27, row: 10 }, facing: 'down', activity: 'tend_herbarium' },
          { at: '13:00', map: 'curzon_interior', tile: { col: 31, row: 15 }, facing: 'left', dwellMin: 60 }, // Chemistry cross-check
          { at: '15:00', map: 'curzon_interior', tile: { col: 27, row: 10 }, facing: 'right', activity: 'tend_herbarium', dwellMin: 180 },
          { at: '20:30', map: 'curzon_interior', tile: { col: 27, row: 10 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '08:30', map: 'curzon_interior', tile: { col: 27, row: 10 }, facing: 'down', activity: 'tend_herbarium' }
    ]
  },

  // 24. Dr. Kabir (Chemistry Master)
  dr_kabir: {
    npcId: 'dr_kabir',
    displayName: 'Dr. Kabir (Chemistry Master)',
    tier: 'B',
    home: { map: 'curzon_interior', tile: { col: 27, row: 15 } }, // 875, 482
    sleep: { map: 'curzon_interior', tile: { col: 27, row: 15 } },
    movement: {
      speedTilesPerSec: 1.4,
      stepStyle: 'tile-step',
      idleBehaviors: [
        { id: 'mix_chemicals', weight: 5, minDurationSec: 5, maxDurationSec: 10 }
      ],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 1, flowers: 1, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'kabir_lab_rhythm',
        priority: 10,
        when: {},
        stops: [
          { at: '09:00', map: 'curzon_interior', tile: { col: 27, row: 15 }, facing: 'down', activity: 'mix_chemicals' },
          { at: '14:00', map: 'curzon_interior', tile: { col: 31, row: 15 }, facing: 'right', activity: 'mix_chemicals', dwellMin: 180 },
          { at: '21:00', map: 'curzon_interior', tile: { col: 27, row: 15 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '09:00', map: 'curzon_interior', tile: { col: 27, row: 15 }, facing: 'down', activity: 'mix_chemicals' }
    ]
  },

  // 25. Tanvir (Biochemistry Student)
  tanvir: {
    npcId: 'tanvir',
    displayName: 'Tanvir (Biochemistry Student)',
    tier: 'B',
    home: { map: 'curzon_interior', tile: { col: 31, row: 15 } }, // 1010, 482
    sleep: { map: 'curzon_interior', tile: { col: 31, row: 15 } },
    movement: {
      speedTilesPerSec: 1.7,
      stepStyle: 'tile-step',
      idleBehaviors: [
        { id: 'mix_chemicals', weight: 4, minDurationSec: 4, maxDurationSec: 8 }
      ],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 1.5, repathAfterSec: 3.5 },
      pathCosts: { path: 1, grass: 1, flowers: 1, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'tanvir_research_rhythm',
        priority: 10,
        when: {},
        stops: [
          { at: '08:45', map: 'curzon_interior', tile: { col: 31, row: 15 }, facing: 'up', activity: 'mix_chemicals' },
          { at: '13:00', map: 'curzon_interior', tile: { col: 27, row: 15 }, facing: 'left', dwellMin: 60 }, // Assisting Dr. Kabir
          { at: '15:00', map: 'curzon_interior', tile: { col: 31, row: 15 }, facing: 'down', activity: 'mix_chemicals', dwellMin: 240 },
          { at: '22:00', map: 'curzon_interior', tile: { col: 31, row: 15 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '08:45', map: 'curzon_interior', tile: { col: 31, row: 15 }, facing: 'up' }
    ]
  },

  // =========================================================================
  // TIER C: GREEN MEADOWS FARMHOUSE & ANIMALS (5 ENTITIES)
  // =========================================================================

  // 26. Chacha Rafiq (Farm Master)
  chacha_rafiq: {
    npcId: 'chacha_rafiq',
    displayName: 'Chacha Rafiq (Farm Owner)',
    tier: 'C',
    home: { map: 'farmhouse', tile: { col: 18, row: 10 } }, // 580, 340
    sleep: { map: 'farmhouse', tile: { col: 18, row: 6 } }, // Inside barn
    movement: {
      speedTilesPerSec: 1.5,
      stepStyle: 'tile-step',
      idleBehaviors: [
        { id: 'farm_field_work', weight: 4, minDurationSec: 5, maxDurationSec: 10 }
      ],
      noticePlayerRadiusTiles: 3,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 2, flowers: 5, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'rafiq_rain',
        priority: 50,
        when: { isRaining: true },
        stops: [
          // Shelters inside barn
          { at: '06:00', map: 'farmhouse', tile: { col: 18, row: 7 }, facing: 'down', activity: 'shelter_rain' }
        ]
      },
      {
        id: 'rafiq_daily_chores',
        priority: 10,
        when: {},
        stops: [
          { at: '06:00', map: 'farmhouse', tile: { col: 8, row: 16 }, facing: 'down', activity: 'farm_feed_chickens', dwellMin: 60 }, // Dawn hen feeding
          { at: '07:30', map: 'farmhouse', tile: { col: 8, row: 8 }, facing: 'right', activity: 'farm_milk_cow', dwellMin: 90 }, // Morning cow milking
          { at: '09:30', map: 'farmhouse', tile: { col: 18, row: 10 }, facing: 'down', activity: 'farm_field_work', dwellMin: 150 }, // Central farm plots
          { at: '12:30', map: 'farmhouse', tile: { col: 18, row: 7 }, facing: 'down', activity: 'sip_tea', dwellMin: 90 }, // Noon tea & rest
          { at: '15:00', map: 'farmhouse', tile: { col: 26, row: 20 }, facing: 'left', activity: 'farm_field_work', dwellMin: 120 }, // Duck pond check
          { at: '18:00', map: 'farmhouse', tile: { col: 8, row: 8 }, facing: 'down', activity: 'farm_milk_cow', dwellMin: 60 }, // Evening milking
          { at: '20:30', map: 'farmhouse', tile: { col: 18, row: 6 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '06:00', map: 'farmhouse', tile: { col: 18, row: 10 }, facing: 'down' },
      { at: '20:30', map: 'farmhouse', tile: { col: 18, row: 6 }, facing: 'up', activity: 'sleep' }
    ]
  },

  // 27. Shuravi the Dairy Cow
  shuravi_cow: {
    npcId: 'shuravi_cow',
    displayName: 'Shuravi the Dairy Cow',
    tier: 'C',
    home: { map: 'farmhouse', tile: { col: 8, row: 8 } }, // 280, 260
    sleep: { map: 'farmhouse', tile: { col: 8, row: 7 } },
    movement: {
      speedTilesPerSec: 1.0,
      stepStyle: 'smooth',
      idleBehaviors: [
        { id: 'graze', weight: 5, minDurationSec: 6, maxDurationSec: 15 }
      ],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 1, flowers: 3, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'cow_rain',
        priority: 50,
        when: { isRaining: true },
        stops: [
          { at: '00:00', map: 'farmhouse', tile: { col: 8, row: 7 }, facing: 'down', activity: 'shelter_rain' }
        ]
      },
      {
        id: 'cow_pasture_routine',
        priority: 10,
        when: {},
        stops: [
          { at: '06:30', map: 'farmhouse', tile: { col: 8, row: 8 }, facing: 'down', activity: 'graze' },
          { at: '12:00', map: 'farmhouse', tile: { col: 11, row: 9 }, facing: 'left', activity: 'graze', dwellMin: 180 },
          { at: '16:00', map: 'farmhouse', tile: { col: 8, row: 8 }, facing: 'right', activity: 'graze', dwellMin: 180 },
          { at: '19:30', map: 'farmhouse', tile: { col: 8, row: 7 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '06:30', map: 'farmhouse', tile: { col: 8, row: 8 }, facing: 'down', activity: 'graze' },
      { at: '19:30', map: 'farmhouse', tile: { col: 8, row: 7 }, facing: 'up', activity: 'sleep' }
    ]
  },

  // 28. Kalu the Bengal Black Goat
  kalu_goat: {
    npcId: 'kalu_goat',
    displayName: 'Kalu the Bengal Goat',
    tier: 'C',
    home: { map: 'farmhouse', tile: { col: 27, row: 8 } }, // 880, 260
    sleep: { map: 'farmhouse', tile: { col: 27, row: 7 } },
    movement: {
      speedTilesPerSec: 1.3,
      stepStyle: 'smooth',
      idleBehaviors: [
        { id: 'graze', weight: 4, minDurationSec: 4, maxDurationSec: 10 }
      ],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 1.5, repathAfterSec: 3 },
      pathCosts: { path: 1, grass: 1, flowers: 2, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'goat_rain',
        priority: 50,
        when: { isRaining: true },
        stops: [
          { at: '00:00', map: 'farmhouse', tile: { col: 27, row: 7 }, facing: 'down', activity: 'shelter_rain' }
        ]
      },
      {
        id: 'goat_routine',
        priority: 10,
        when: {},
        stops: [
          { at: '06:30', map: 'farmhouse', tile: { col: 27, row: 8 }, facing: 'left', activity: 'graze' },
          { at: '11:00', map: 'farmhouse', tile: { col: 29, row: 9 }, facing: 'down', activity: 'graze', dwellMin: 180 },
          { at: '15:30', map: 'farmhouse', tile: { col: 26, row: 9 }, facing: 'right', activity: 'graze', dwellMin: 150 },
          { at: '19:30', map: 'farmhouse', tile: { col: 27, row: 7 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '06:30', map: 'farmhouse', tile: { col: 27, row: 8 }, facing: 'left', activity: 'graze' },
      { at: '19:30', map: 'farmhouse', tile: { col: 27, row: 7 }, facing: 'up', activity: 'sleep' }
    ]
  },

  // 29. Tuntuni the Free-Range Hen
  tuntuni_hen: {
    npcId: 'tuntuni_hen',
    displayName: 'Tuntuni the Hen',
    tier: 'C',
    home: { map: 'farmhouse', tile: { col: 8, row: 16 } }, // 260, 520
    sleep: { map: 'farmhouse', tile: { col: 8, row: 15 } },
    movement: {
      speedTilesPerSec: 1.2,
      stepStyle: 'smooth',
      idleBehaviors: [
        { id: 'graze', weight: 5, minDurationSec: 3, maxDurationSec: 6 }
      ],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 1, repathAfterSec: 2 },
      pathCosts: { path: 1, grass: 1, flowers: 1, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'hen_rain',
        priority: 50,
        when: { isRaining: true },
        stops: [
          { at: '00:00', map: 'farmhouse', tile: { col: 8, row: 15 }, facing: 'down', activity: 'shelter_rain' }
        ]
      },
      {
        id: 'hen_routine',
        priority: 10,
        when: {},
        stops: [
          { at: '06:00', map: 'farmhouse', tile: { col: 8, row: 16 }, facing: 'down', activity: 'graze' },
          { at: '11:00', map: 'farmhouse', tile: { col: 10, row: 17 }, facing: 'right', activity: 'graze', dwellMin: 180 },
          { at: '15:30', map: 'farmhouse', tile: { col: 7, row: 17 }, facing: 'left', activity: 'graze', dwellMin: 150 },
          { at: '19:00', map: 'farmhouse', tile: { col: 8, row: 15 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '06:00', map: 'farmhouse', tile: { col: 8, row: 16 }, facing: 'down', activity: 'graze' },
      { at: '19:00', map: 'farmhouse', tile: { col: 8, row: 15 }, facing: 'up', activity: 'sleep' }
    ]
  },

  // 30. Piku the White Duckling
  piku_duck: {
    npcId: 'piku_duck',
    displayName: 'Piku the Duckling',
    tier: 'C',
    home: { map: 'farmhouse', tile: { col: 25, row: 20 } }, // 820, 640
    sleep: { map: 'farmhouse', tile: { col: 25, row: 19 } },
    movement: {
      speedTilesPerSec: 1.3,
      stepStyle: 'smooth',
      idleBehaviors: [
        { id: 'graze', weight: 5, minDurationSec: 4, maxDurationSec: 8 }
      ],
      noticePlayerRadiusTiles: 2,
      personalSpaceTiles: 1,
      patience: { waitSec: 1, repathAfterSec: 2 },
      pathCosts: { path: 1, grass: 1, flowers: 1, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'duck_rain',
        priority: 50,
        when: { isRaining: true },
        stops: [
          // Ducks love rain! Splashes on pond bank
          { at: '00:00', map: 'farmhouse', tile: { col: 25, row: 20 }, facing: 'down', activity: 'graze' }
        ]
      },
      {
        id: 'duck_routine',
        priority: 10,
        when: {},
        stops: [
          { at: '06:30', map: 'farmhouse', tile: { col: 25, row: 20 }, facing: 'right', activity: 'graze' },
          { at: '12:00', map: 'farmhouse', tile: { col: 25, row: 22 }, facing: 'down', activity: 'graze', dwellMin: 180 },
          { at: '16:00', map: 'farmhouse', tile: { col: 25, row: 20 }, facing: 'left', activity: 'graze', dwellMin: 180 },
          { at: '19:30', map: 'farmhouse', tile: { col: 25, row: 19 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '06:30', map: 'farmhouse', tile: { col: 25, row: 20 }, facing: 'right', activity: 'graze' },
      { at: '19:30', map: 'farmhouse', tile: { col: 25, row: 19 }, facing: 'up', activity: 'sleep' }
    ]
  },

  // =========================================================================
  // TIER D: EXPEDITION REALMS SAGES, GHOSTS & GUARDIANS (8 ENTITIES)
  // =========================================================================

  // 31. Elder Banyan Sage (Forest Realm)
  elder_banyan_sage: {
    npcId: 'elder_banyan_sage',
    displayName: 'Elder Banyan Sage',
    tier: 'D',
    home: { map: 'forest', tile: { col: 16, row: 26 } }, // 528, 848
    sleep: { map: 'forest', tile: { col: 16, row: 26 } },
    movement: {
      speedTilesPerSec: 1.0,
      stepStyle: 'tile-step',
      idleBehaviors: [],
      noticePlayerRadiusTiles: 3,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 1, flowers: 1, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'sage_eternal_presence',
        priority: 10,
        when: {},
        stops: [
          // Sages are transcendent spiritual guides; blessing is always accessible
          { at: '00:00', map: 'forest', tile: { col: 16, row: 26 }, facing: 'down', dwellMin: 1440 }
        ]
      }
    ],
    fallback: [
      { at: '00:00', map: 'forest', tile: { col: 16, row: 26 }, facing: 'down' }
    ]
  },

  // 32. Ananya the Weeping Petni (Night-Gated Forest Ghost)
  ananya_ghost: {
    npcId: 'ananya_ghost',
    displayName: 'Ananya the Weeping Petni',
    tier: 'D',
    home: { map: 'forest', tile: { col: 23, row: 11 } }, // North Banyan: ~740, 380
    sleep: { map: 'forest', tile: { col: 23, row: 11 } },
    movement: {
      speedTilesPerSec: 1.2,
      stepStyle: 'smooth',
      idleBehaviors: [],
      noticePlayerRadiusTiles: 4,
      personalSpaceTiles: 1,
      patience: { waitSec: 1, repathAfterSec: 2 },
      pathCosts: { path: 1, grass: 1, flowers: 1, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'ananya_night_appearance',
        priority: 30,
        when: {
          // Active at night (20:00 to 05:00)
        },
        stops: [
          { at: '20:00', map: 'forest', tile: { col: 23, row: 11 }, facing: 'down', activity: 'none' },
          { at: '05:00', map: 'forest', tile: { col: 23, row: 11 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '20:00', map: 'forest', tile: { col: 23, row: 11 }, facing: 'down' }
    ]
  },

  // 33. Kofil Chacha (Phantom Rickshaw Puller)
  kofil_chacha: {
    npcId: 'kofil_chacha',
    displayName: 'Kofil Chacha',
    tier: 'D',
    home: { map: 'forest', tile: { col: 12, row: 42 } }, // Southwest Marsh
    sleep: { map: 'forest', tile: { col: 12, row: 42 } },
    movement: {
      speedTilesPerSec: 1.4,
      stepStyle: 'smooth',
      idleBehaviors: [],
      noticePlayerRadiusTiles: 3,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 1, flowers: 1, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'kofil_night_patrol',
        priority: 30,
        when: {},
        stops: [
          { at: '19:30', map: 'forest', tile: { col: 12, row: 42 }, facing: 'right' },
          { at: '22:00', map: 'forest', tile: { col: 20, row: 42 }, facing: 'left' },
          { at: '05:30', map: 'forest', tile: { col: 12, row: 42 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '19:30', map: 'forest', tile: { col: 12, row: 42 }, facing: 'right' }
    ]
  },

  // 34. Prof. Shamsher (Occult Investigator)
  prof_shamsher: {
    npcId: 'prof_shamsher',
    displayName: 'Prof. Shamsher',
    tier: 'D',
    home: { map: 'forest', tile: { col: 55, row: 15 } }, // Northeast Ruins
    sleep: { map: 'forest', tile: { col: 55, row: 15 } },
    movement: {
      speedTilesPerSec: 1.3,
      stepStyle: 'tile-step',
      idleBehaviors: [],
      noticePlayerRadiusTiles: 3,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 1, flowers: 1, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'shamsher_night_investigation',
        priority: 30,
        when: {},
        stops: [
          { at: '20:30', map: 'forest', tile: { col: 55, row: 15 }, facing: 'left' },
          { at: '05:00', map: 'forest', tile: { col: 55, row: 15 }, facing: 'up', activity: 'sleep' }
        ]
      }
    ],
    fallback: [
      { at: '20:30', map: 'forest', tile: { col: 55, row: 15 }, facing: 'left' }
    ]
  },

  // 35. Tidekeeper Marina (Sunken Kingdom Priestess)
  tidekeeper_marina: {
    npcId: 'tidekeeper_marina',
    displayName: 'Tidekeeper Marina',
    tier: 'D',
    home: { map: 'sunken', tile: { col: 37, row: 28 } }, // Central Shrine: 1200, 900
    sleep: { map: 'sunken', tile: { col: 37, row: 28 } },
    movement: {
      speedTilesPerSec: 1.2,
      stepStyle: 'smooth',
      idleBehaviors: [],
      noticePlayerRadiusTiles: 3,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 1, flowers: 1, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'marina_eternal_presence',
        priority: 10,
        when: {},
        stops: [
          { at: '00:00', map: 'sunken', tile: { col: 37, row: 28 }, facing: 'down', dwellMin: 1440 }
        ]
      }
    ],
    fallback: [
      { at: '00:00', map: 'sunken', tile: { col: 37, row: 28 }, facing: 'down' }
    ]
  },

  // 36. Master Blacksmith Kael (Emberfall Highlands)
  blacksmith_kael: {
    npcId: 'blacksmith_kael',
    displayName: 'Master Blacksmith Kael',
    tier: 'D',
    home: { map: 'ember', tile: { col: 37, row: 28 } }, // Forge
    sleep: { map: 'ember', tile: { col: 37, row: 28 } },
    movement: {
      speedTilesPerSec: 1.3,
      stepStyle: 'tile-step',
      idleBehaviors: [],
      noticePlayerRadiusTiles: 3,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 1, flowers: 1, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'kael_eternal_forge',
        priority: 10,
        when: {},
        stops: [
          { at: '00:00', map: 'ember', tile: { col: 37, row: 28 }, facing: 'down', dwellMin: 1440 }
        ]
      }
    ],
    fallback: [
      { at: '00:00', map: 'ember', tile: { col: 37, row: 28 }, facing: 'down' }
    ]
  },

  // 37. Astronomer Lyra (Kingdom of Eternal Frost)
  astronomer_lyra: {
    npcId: 'astronomer_lyra',
    displayName: 'Astronomer Lyra',
    tier: 'D',
    home: { map: 'frost', tile: { col: 37, row: 28 } }, // Starlight Observatory
    sleep: { map: 'frost', tile: { col: 37, row: 28 } },
    movement: {
      speedTilesPerSec: 1.4,
      stepStyle: 'tile-step',
      idleBehaviors: [],
      noticePlayerRadiusTiles: 3,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 1, flowers: 1, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'lyra_stargazing_loop',
        priority: 10,
        when: {},
        stops: [
          { at: '00:00', map: 'frost', tile: { col: 37, row: 28 }, facing: 'down', dwellMin: 1440 }
        ]
      }
    ],
    fallback: [
      { at: '00:00', map: 'frost', tile: { col: 37, row: 28 }, facing: 'down' }
    ]
  },

  // 38. Celestial Chronicler (The Astral Realm)
  celestial_chronicler: {
    npcId: 'celestial_chronicler',
    displayName: 'Celestial Chronicler',
    tier: 'D',
    home: { map: 'astral', tile: { col: 37, row: 28 } }, // Nexus of Memory
    sleep: { map: 'astral', tile: { col: 37, row: 28 } },
    movement: {
      speedTilesPerSec: 1.2,
      stepStyle: 'smooth',
      idleBehaviors: [],
      noticePlayerRadiusTiles: 3,
      personalSpaceTiles: 1,
      patience: { waitSec: 2, repathAfterSec: 4 },
      pathCosts: { path: 1, grass: 1, flowers: 1, tilledSoil: 'blocked' }
    },
    variants: [
      {
        id: 'chronicler_eternal_nexus',
        priority: 10,
        when: {},
        stops: [
          { at: '00:00', map: 'astral', tile: { col: 37, row: 28 }, facing: 'down', dwellMin: 1440 }
        ]
      }
    ],
    fallback: [
      { at: '00:00', map: 'astral', tile: { col: 37, row: 28 }, facing: 'down' }
    ]
  }
};
