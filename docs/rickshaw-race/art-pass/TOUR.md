# Fuller Road Sprint — 8-Vantage Point Art Pass Tour (M3.5)

This document catalogs the 8 key scenic vantage points of **Fuller Road Sprint** following the SuperTuxKart (STK) art pass, verifying that visual dressing does not affect locked collision geometry.

---


## 1. Start/Finish Gantry & Red Lanterns
- **Camera Pose**: Position `[0, 5, 25]` -> Target `[0, 8, -10]`
- **Landmark**: **Curzon Start Arch**
- **STK Assets Featured**: `hd_chineseRedLantern_a`, `hd_modernStreetLamp_a`
- **Scene Description**: Bilingual "Tring-Tring Grand Prix" gantry arch spanning the 16m road with celebratory hanging red lanterns.

```json
{
  "id": "vp1_start_finish_arch",
  "title": "1. Start/Finish Gantry & Red Lanterns",
  "camera": {
    "pos": [
      0,
      5,
      25
    ],
    "target": [
      0,
      8,
      -10
    ]
  },
  "landmark": "Curzon Start Arch",
  "stkAssets": [
    "hd_chineseRedLantern_a",
    "hd_modernStreetLamp_a"
  ],
  "description": "Bilingual \"Tring-Tring Grand Prix\" gantry arch spanning the 16m road with celebratory hanging red lanterns."
}
```

---

## 2. Curzon Hall Mughal-Gothic Verandas
- **Camera Pose**: Position `[-24, 8, -60]` -> Target `[0, 4, -75]`
- **Landmark**: **Curzon Hall Academic Complex**
- **STK Assets Featured**: `stklib_bench_a`, `hd_modernStreetLamp_a`
- **Scene Description**: Red brick arched arcades with white domes and campus park benches along the northern straight.

```json
{
  "id": "vp2_curzon_verandas",
  "title": "2. Curzon Hall Mughal-Gothic Verandas",
  "camera": {
    "pos": [
      -24,
      8,
      -60
    ],
    "target": [
      0,
      4,
      -75
    ]
  },
  "landmark": "Curzon Hall Academic Complex",
  "stkAssets": [
    "stklib_bench_a",
    "hd_modernStreetLamp_a"
  ],
  "description": "Red brick arched arcades with white domes and campus park benches along the northern straight."
}
```

---

## 3. East S-Chicane Apex & Crash Cushions
- **Camera Pose**: Position `[55, 4, -185]` -> Target `[75, 2, -165]`
- **Landmark**: **East Botanical Perimeter**
- **STK Assets Featured**: `stklib_fitchBarrel_a`, `stklib_autumnSmallBush_a`
- **Scene Description**: High-speed technical S-bend with yellow crash barrels and lush roadside shrubbery.

```json
{
  "id": "vp3_east_chicane_apex",
  "title": "3. East S-Chicane Apex & Crash Cushions",
  "camera": {
    "pos": [
      55,
      4,
      -185
    ],
    "target": [
      75,
      2,
      -165
    ]
  },
  "landmark": "East Botanical Perimeter",
  "stkAssets": [
    "stklib_fitchBarrel_a",
    "stklib_autumnSmallBush_a"
  ],
  "description": "High-speed technical S-bend with yellow crash barrels and lush roadside shrubbery."
}
```

---

## 4. TSC Rotunda Hairpin & Tea Kiosks
- **Camera Pose**: Position `[210, 6, -210]` -> Target `[230, 4, -180]`
- **Landmark**: **Teacher-Student Centre (TSC)**
- **STK Assets Featured**: `tracks/hacienda/hacienda_ground.jpg`, `stklib_bench_a`
- **Scene Description**: Iconic circular rotunda with green dome, colonnade, and student umbrella tea stalls at the 180° hairpin apex.

```json
{
  "id": "vp4_tsc_rotunda",
  "title": "4. TSC Rotunda Hairpin & Tea Kiosks",
  "camera": {
    "pos": [
      210,
      6,
      -210
    ],
    "target": [
      230,
      4,
      -180
    ]
  },
  "landmark": "Teacher-Student Centre (TSC)",
  "stkAssets": [
    "tracks/hacienda/hacienda_ground.jpg",
    "stklib_bench_a"
  ],
  "description": "Iconic circular rotunda with green dome, colonnade, and student umbrella tea stalls at the 180° hairpin apex."
}
```

---

## 5. Krishnachura Avenue Flame Canopy
- **Camera Pose**: Position `[140, 5, -50]` -> Target `[110, 3, 0]`
- **Landmark**: **Krishnachura Avenue**
- **STK Assets Featured**: `stklib_autumnTree_a`, `tracks/candela_city/sky.png`
- **Scene Description**: Stately avenue flanked by flame red-orange blooming trees against the warm Candela sunset sky.

```json
{
  "id": "vp5_krishnachura_avenue",
  "title": "5. Krishnachura Avenue Flame Canopy",
  "camera": {
    "pos": [
      140,
      5,
      -50
    ],
    "target": [
      110,
      3,
      0
    ]
  },
  "landmark": "Krishnachura Avenue",
  "stkAssets": [
    "stklib_autumnTree_a",
    "tracks/candela_city/sky.png"
  ],
  "description": "Stately avenue flanked by flame red-orange blooming trees against the warm Candela sunset sky."
}
```

---

## 6. Glowing Petal Boost Pad Straight
- **Camera Pose**: Position `[100, 3, 20]` -> Target `[75, 2, 60]`
- **Landmark**: **Central University Axis**
- **STK Assets Featured**: `tracks/hacienda/boost_arrows.spm`, `textures/gfx_sparkFire_a.png`
- **Scene Description**: Luminous orange petal boost pads embedded into the asphalt with neon chevron flow effects.

```json
{
  "id": "vp6_petal_boost_straight",
  "title": "6. Glowing Petal Boost Pad Straight",
  "camera": {
    "pos": [
      100,
      3,
      20
    ],
    "target": [
      75,
      2,
      60
    ]
  },
  "landmark": "Central University Axis",
  "stkAssets": [
    "tracks/hacienda/boost_arrows.spm",
    "textures/gfx_sparkFire_a.png"
  ],
  "description": "Luminous orange petal boost pads embedded into the asphalt with neon chevron flow effects."
}
```

---

## 7. Flyover Bridge Elevation & Pillars
- **Camera Pose**: Position `[45, 2, 80]` -> Target `[0, 6, 120]`
- **Landmark**: **Shahbagh Flyover Ramp**
- **STK Assets Featured**: `tracks/zengarden/bridge_LOD50.spm`, `stklib_asianWoodPost_a`
- **Scene Description**: Ramp rising to 6.0m over the lower track crossing with concrete bridge piers and steel safety rails.

```json
{
  "id": "vp7_flyover_approach",
  "title": "7. Flyover Bridge Elevation & Pillars",
  "camera": {
    "pos": [
      45,
      2,
      80
    ],
    "target": [
      0,
      6,
      120
    ]
  },
  "landmark": "Shahbagh Flyover Ramp",
  "stkAssets": [
    "tracks/zengarden/bridge_LOD50.spm",
    "stklib_asianWoodPost_a"
  ],
  "description": "Ramp rising to 6.0m over the lower track crossing with concrete bridge piers and steel safety rails."
}
```

---

## 8. Central Shaheed Minar Monument Plaza
- **Camera Pose**: Position `[130, 7, 35]` -> Target `[145, 8, 20]`
- **Landmark**: **Central Shaheed Minar**
- **STK Assets Featured**: `textures/gfx_sparkBlue_a.png`, `hd_chineseRedLantern_a`
- **Scene Description**: Monumental white columns leaning over the crimson red sun circle overlooking the final sector.

```json
{
  "id": "vp8_shaheed_minar_plaza",
  "title": "8. Central Shaheed Minar Monument Plaza",
  "camera": {
    "pos": [
      130,
      7,
      35
    ],
    "target": [
      145,
      8,
      20
    ]
  },
  "landmark": "Central Shaheed Minar",
  "stkAssets": [
    "textures/gfx_sparkBlue_a.png",
    "hd_chineseRedLantern_a"
  ],
  "description": "Monumental white columns leaning over the crimson red sun circle overlooking the final sector."
}
```


---

*Generated by `scripts/race/screenshot-tour.mjs` during Milestone 3.5 Art Pass.*
