# 🗺️ Totoro & Moon Walker: 32×32 Grid Asset Specification Guide & Download Directory

> **Single Source of Truth** for all visual entities, external PNG paths, grid footprints, frame sizes, and procedural fallbacks in *Totoro & Moon Walker: Chronicles of the Six Realms*.
> Auto-derived from `src/config/assetSpecs.manifest.ts`.

---

## 📖 Table of Contents
1. [Architectural Overview & Guardrails](#1-architectural-overview--guardrails)
2. [Multi-Layer Rendering Pipeline (Layers 0–6)](#2-multi-layer-rendering-pipeline-layers-06)
3. [Universal External Asset Normalizer (Integer 2× Scaling)](#3-universal-external-asset-normalizer-integer-2-scaling)
4. [Master Asset Manifest Index](#4-master-asset-manifest-index)
   - [Terrain & Autotiles](#terrain--autotiles)
   - [Characters & Companions](#characters--companions)
   - [Crops & Botanical Flora](#crops--botanical-flora)
   - [Trees & Biome Pillars](#trees--biome-pillars)
   - [Street Carts & Cultural Stalls](#street-carts--cultural-stalls)
   - [Heritage Landmarks & Buildings](#heritage-landmarks--buildings)
   - [Vehicles & Vessels](#vehicles--vessels)
   - [Enemies & Guardian Bosses](#enemies--guardian-bosses)
5. [AI Agent Prompting & Asset Ingestion Protocol](#5-ai-agent-prompting--asset-ingestion-protocol)

---

## 1. Architectural Overview & Guardrails

The world is mapped onto a strict **32×32 Logical Pixel Grid** adhering to **Stardew Valley** and **Pokémon HeartGold / SoulSilver (HGSS)** visual conventions.

### 🛡️ Critical Guarantees
1. **Zero Data Loss Guarantee**: All procedural canvas textures in `generateStardewTextures()` remain 100% functional. The game will never crash or halt due to a missing asset.
2. **Hybrid Fallback Pipeline**: `ExternalAssetAdapter.ts` inspects external PNG paths on launch. If a PNG is present, it auto-detects its dimensions, integer-upscales it 2× if native 16-bit, slices animation frames, and binds it. If missing, it seamlessly aliases the procedural fallback.
3. **AI-Readable `@asset-spec` Annotations**: Every texture generator, scene placement, and manifest entry embeds structured metadata so AI models can read the code and immediately know exact file paths, footprints, and frame slices.

---

## 2. Multi-Layer Rendering Pipeline (Layers 0–6)

| Layer | Name | Description | Depth / Z-Index |
|---|---|---|---|
| **Layer 0** | **Water & HGSS Shore Reflections** | Animated water ripple waves (`tile-water`) with Pokémon HGSS inverted vertical reflections (`alpha: 0.22`, `scaleY: -0.75`, gentle Lissajous wave wobble) for trees, piers, boats, and Moon Walker along Dhanmondi Lake shore. | Depth: `1 - 2` |
| **Layer 1** | **Base Terrain** | Deterministic seeded 32×32 grass and biome tiles from `dhaka-tileset-32` with Mulberry32 PRNG noise blending, landmark trampled earth hubs, and organic wildflower sprinkles. | Depth: `0` |
| **Layer 2** | **16-Tile 4-Bit Autotile Paths & Farm Soil** | Smoothly connected stone walkways (`autotile-stone-path`, 16-tile Wang/Blob bitmask 0–15) and dynamic untilled ➔ tilled ➔ watered agricultural loam plots (`autotile-farm-soil`). | Depth: `1 - 2` |
| **Layer 3** | **Interactive Ground Foliage** | Wildflowers, 4-leaf clovers, and fallen Krishnachura petals that physically rustle (wiggle tween) and emit floating petal particles when stepped on by Moon Walker. | Depth: `3` |
| **Layer 4** | **Y-Sorted Entities** | Characters, Totoro companion, NPCs, street carts, crops, enemies, and trees sorted dynamically every frame by foot baseline coordinate (`sprite.setDepth(sprite.y)`). | Depth: `10 - 2800` |
| **Layer 5** | **Overhead Canopies & Roofs** | Tree crowns, Curzon Hall brick facades, and stall awnings that smoothly fade to `alpha: 0.42` when Moon Walker walks behind their footprint. | Depth: `2850` |
| **Layer 6** | **Stardew 32×32 Tile Cursor** | Pixel-art tile selector bounding box with retro corner brackets indicating the exact 32×32 grid tile in front of the player based on facing direction vector. | Depth: `3100` |

---

## 3. Universal External Asset Normalizer (Integer 2× Scaling)

When external pixel art is placed into `public/assets/`, `ExternalAssetAdapter` handles resolution normalization:
- **16×16 Native Tilesets (Tuxemon, LimeZu, Buch, Kenney)**: Upscaled at exact **2× integer scale** onto an in-memory CanvasTexture with `ctx.imageSmoothingEnabled = false` to produce razor-sharp 32×32 tiles with **zero bilinear blur**.
- **16×32 / 16×24 Character Sheets (Stardew / GBA standard)**: Upscaled 2× to 32×64 / 32×48.
- **Native 32×32 / 32×48 Indie Sheets**: Loaded at **1:1 scale**.
- **64×64 LPC Sheets**: Anchored at foot baseline `(0.5, 1)`.

---

## 4. Master Asset Manifest Index

### Terrain & Autotiles (13 slots)

| ID / Texture Key | Target PNG Path | Preferred Frame Size | Grid Footprint | Fallback Key | Sheet Layout & Conventions |
|---|---|---|---|---|---|
| `dhaka-tileset-32` | `assets/tilesets/dhaka_valley_tileset.png` | 32×32 px | 4×3 tiles | `dhaka-tileset-32` | 4 cols x 3 rows atlas: Row 0=Lush Grass variations, Row 1=Flower blossoms, Row 2=Path & dirt fringes |
| `autotile-stone-path` | `assets/tilesets/autotile_stone_path.png` | 32×32 px | 4×4 tiles | `tile-path` | 4 cols x 4 rows (16 tiles): 4-bit neighbor bitmask (0=isolated to 15=solid interior) |
| `autotile-farm-soil` | `assets/tilesets/autotile_farm_soil.png` | 32×32 px | 4×4 tiles | `tile-grass` | 4 cols x 4 rows per moisture state: 4-bit Wang connected soil borders |
| `tuxemon-terrain` | `assets/tilesets/PastTheFuture_Grass_Sand_Snow.png` | 16×16 px | 16×16 tiles | `dhaka-tileset-32` | Continuous 16x16 grid tileset |
| `tileset-pipo-base` | `assets/tilesets/pipo_BaseChip.png` | 32×32 px | 16×32 tiles | `dhaka-tileset-32` | Standard 8-col or 16-col RPG Maker chip layout |
| `tileset-outdoor` | `assets/tilesets/Outdoor_Tiles_by_Kelvin_Shadewing.png` | 16×16 px | 16×20 tiles | `dhaka-tileset-32` | 16x16 outdoor feature atlas |
| `tileset-vegetation` | `assets/tilesets/Vegetation_by_George.png` | 16×16 px | 8×12 tiles | `dhaka-tileset-32` | 16x16 shrubbery and flora sheet |
| `tile-forest` | `assets/tilesets/realm_forest_tileset.png` | 32×32 px | 4×4 tiles | `tile-forest` | 4 cols x 4 rows seamless forest ground |
| `tile-sunken` | `assets/tilesets/realm_sunken_tileset.png` | 32×32 px | 4×4 tiles | `tile-sunken` | 4 cols x 4 rows seabed and water caustics |
| `tile-ember` | `assets/tilesets/realm_ember_tileset.png` | 32×32 px | 4×4 tiles | `tile-ember` | 4 cols x 4 rows volcanic rock with magma veins |
| `tile-frost` | `assets/tilesets/realm_frost_tileset.png` | 32×32 px | 4×4 tiles | `tile-frost` | 4 cols x 4 rows glacial snow with ice fractals |
| `tile-astral` | `assets/tilesets/realm_astral_tileset.png` | 32×32 px | 4×4 tiles | `tile-astral` | 4 cols x 4 rows celestial marble plates with rune nodes |
| `tile-curzon-floor` | `assets/tilesets/curzon_interior_tileset.png` | 32×32 px | 4×4 tiles | `tile-curzon-floor` | 32x32 interior academic floor and red carpet runners |

#### Detailed Specifications for Terrain & Autotiles

##### `dhaka-tileset-32` — Dhaka Valley 32x32 Ground & Meadow Atlas
- **Description**: 12 distinct 32x32 terrain tiles (grass variations, clovers, Krishnachura petals, Aparajita flowers, dirt pebbles).
- **Target File Path**: `assets/tilesets/dhaka_valley_tileset.png`
- **Fallback Procedural Key**: `dhaka-tileset-32`
- **Logical Footprint**: 4 cols × 3 rows (in 32×32 tiles)
- **Preferred Frame Size**: 32×32 px
- **Accepted External Sizes**: 16x16 (auto-2x), 32x32 (1:1)
- **Origin / Anchor**: `x: 0, y: 0`
- **Sheet Layout**: 4 cols x 3 rows atlas: Row 0=Lush Grass variations, Row 1=Flower blossoms, Row 2=Path & dirt fringes
- **AI / Search Tags**: `Stardew Valley terrain`, `16-bit RPG tileset`, `lush meadow`, `pixel art flowers`, `seamless 32x32`

##### `autotile-stone-path` — Dhaka Heritage Cobblestone & Flagstone Autotile
- **Description**: 16-tile 4-bit Wang/Blob autotiling layout for seamless stone walkways with bevelled flagstone edges and moss mortar.
- **Target File Path**: `assets/tilesets/autotile_stone_path.png`
- **Fallback Procedural Key**: `tile-path`
- **Logical Footprint**: 4 cols × 4 rows (in 32×32 tiles)
- **Preferred Frame Size**: 32×32 px
- **Accepted External Sizes**: 16x16 (auto-2x), 32x32 (1:1), RPG Maker A2/A4 strip
- **Origin / Anchor**: `x: 0, y: 0`
- **Sheet Layout**: 4 cols x 4 rows (16 tiles): 4-bit neighbor bitmask (0=isolated to 15=solid interior)
- **AI / Search Tags**: `Stardew cobblestone path`, `RPG Maker autotile`, `flagstone walkway`, `16-tile blob autotile`

##### `autotile-farm-soil` — Green Meadows Farm Soil Autotile (Untilled, Tilled & Watered)
- **Description**: Dynamic 3-state autotiling soil plots (untilled turf, rich tilled loam, glistening dark watered soil).
- **Target File Path**: `assets/tilesets/autotile_farm_soil.png`
- **Fallback Procedural Key**: `tile-grass`
- **Logical Footprint**: 4 cols × 4 rows (in 32×32 tiles)
- **Preferred Frame Size**: 32×32 px
- **Accepted External Sizes**: 16x16 (auto-2x), 32x32 (1:1), Stardew farm soil standard
- **Origin / Anchor**: `x: 0, y: 0`
- **Sheet Layout**: 4 cols x 4 rows per moisture state: 4-bit Wang connected soil borders
- **AI / Search Tags**: `Stardew Valley hoe dirt`, `tilled soil autotile`, `farm ground 32x32`, `watered soil`

##### `tuxemon-terrain` — Tuxemon Terrain (PastTheFuture Grass, Sand & Snow)
- **Description**: Open source CC-BY-SA 16x16 tile atlas auto-upscaled 2x to 32x32 for high-density ground diversity.
- **Target File Path**: `assets/tilesets/PastTheFuture_Grass_Sand_Snow.png`
- **Fallback Procedural Key**: `dhaka-tileset-32`
- **Logical Footprint**: 16 cols × 16 rows (in 32×32 tiles)
- **Preferred Frame Size**: 16×16 px
- **Accepted External Sizes**: 16x16 (auto-2x), 32x32 (1:1)
- **Origin / Anchor**: `x: 0, y: 0`
- **Sheet Layout**: Continuous 16x16 grid tileset
- **AI / Search Tags**: `Tuxemon tileset`, `Pokémon GBA terrain`, `16x16 pixel art grass`, `sand and snow`

##### `tileset-pipo-base` — Pipoya Base Chip Tileset
- **Description**: Classic 32x32 Japanese indie RPG maker base terrain and structural elements.
- **Target File Path**: `assets/tilesets/pipo_BaseChip.png`
- **Fallback Procedural Key**: `dhaka-tileset-32`
- **Logical Footprint**: 16 cols × 32 rows (in 32×32 tiles)
- **Preferred Frame Size**: 32×32 px
- **Accepted External Sizes**: 32x32 (1:1), 16x16 (auto-2x)
- **Origin / Anchor**: `x: 0, y: 0`
- **Sheet Layout**: Standard 8-col or 16-col RPG Maker chip layout
- **AI / Search Tags**: `Pipoya basechip`, `top-down 32x32 RPG tileset`, `stone stairs`, `wooden bridges`

##### `tileset-outdoor` — Kelvin Shadewing Outdoor Tileset
- **Description**: High-contrast 16-bit RPG outdoor foliage, fences, cliff ledges and river embankments.
- **Target File Path**: `assets/tilesets/Outdoor_Tiles_by_Kelvin_Shadewing.png`
- **Fallback Procedural Key**: `dhaka-tileset-32`
- **Logical Footprint**: 16 cols × 20 rows (in 32×32 tiles)
- **Preferred Frame Size**: 16×16 px
- **Accepted External Sizes**: 16x16 (auto-2x), 32x32 (1:1)
- **Origin / Anchor**: `x: 0, y: 0`
- **Sheet Layout**: 16x16 outdoor feature atlas
- **AI / Search Tags**: `outdoor pixel art`, `cliff ledges`, `river banks`, `wooden fences`

##### `tileset-vegetation` — George Vegetation Tileset
- **Description**: Lush bushes, reeds, water lilies, and decorative shrubbery.
- **Target File Path**: `assets/tilesets/Vegetation_by_George.png`
- **Fallback Procedural Key**: `dhaka-tileset-32`
- **Logical Footprint**: 8 cols × 12 rows (in 32×32 tiles)
- **Preferred Frame Size**: 16×16 px
- **Accepted External Sizes**: 16x16 (auto-2x), 32x32 (1:1)
- **Origin / Anchor**: `x: 0, y: 0`
- **Sheet Layout**: 16x16 shrubbery and flora sheet
- **AI / Search Tags**: `RPG foliage`, `pixel art shrubs`, `water lilies`, `tall grass`

##### `tile-forest` — Whispering Emerald Forest Ground
- **Description**: Deep emerald mossy forest floor with glowing spores and fallen ancient leaves.
- **Target File Path**: `assets/tilesets/realm_forest_tileset.png`
- **Fallback Procedural Key**: `tile-forest`
- **Logical Footprint**: 4 cols × 4 rows (in 32×32 tiles)
- **Preferred Frame Size**: 32×32 px
- **Accepted External Sizes**: 32x32 (1:1), 128x128 (seamless procedural)
- **Origin / Anchor**: `x: 0, y: 0`
- **Sheet Layout**: 4 cols x 4 rows seamless forest ground
- **AI / Search Tags**: `mossy forest floor`, `spirit banyan biome`, `glowing spores`, `deep green tileset`

##### `tile-sunken` — Sunken Kingdom Tidepool & Reef Ground
- **Description**: Luminous underwater sand ripples, caustics, sea shells, and branching coral speckles.
- **Target File Path**: `assets/tilesets/realm_sunken_tileset.png`
- **Fallback Procedural Key**: `tile-sunken`
- **Logical Footprint**: 4 cols × 4 rows (in 32×32 tiles)
- **Preferred Frame Size**: 32×32 px
- **Accepted External Sizes**: 32x32 (1:1), 128x128 (seamless procedural)
- **Origin / Anchor**: `x: 0, y: 0`
- **Sheet Layout**: 4 cols x 4 rows seabed and water caustics
- **AI / Search Tags**: `underwater reef tileset`, `sunken temple ground`, `aquamarine caustics`, `seashells`

##### `tile-ember` — Emberfall Highlands Basalt & Magma Ground
- **Description**: Dark basalt tectonic plates, glowing magma fissures, and drifting ash specks.
- **Target File Path**: `assets/tilesets/realm_ember_tileset.png`
- **Fallback Procedural Key**: `tile-ember`
- **Logical Footprint**: 4 cols × 4 rows (in 32×32 tiles)
- **Preferred Frame Size**: 32×32 px
- **Accepted External Sizes**: 32x32 (1:1), 128x128 (seamless procedural)
- **Origin / Anchor**: `x: 0, y: 0`
- **Sheet Layout**: 4 cols x 4 rows volcanic rock with magma veins
- **AI / Search Tags**: `volcanic caldera tileset`, `lava cracks`, `obsidian basalt ground`, `ember sparks`

##### `tile-frost` — Kingdom of Eternal Frost Ice & Snow Ground
- **Description**: Wind-packed glacial snow, crystalline ice fissures, and sparkling permafrost.
- **Target File Path**: `assets/tilesets/realm_frost_tileset.png`
- **Fallback Procedural Key**: `tile-frost`
- **Logical Footprint**: 4 cols × 4 rows (in 32×32 tiles)
- **Preferred Frame Size**: 32×32 px
- **Accepted External Sizes**: 32x32 (1:1), 128x128 (seamless procedural)
- **Origin / Anchor**: `x: 0, y: 0`
- **Sheet Layout**: 4 cols x 4 rows glacial snow with ice fractals
- **AI / Search Tags**: `snow tileset`, `ice crystal floor`, `winter observatory ground`, `frost biome`

##### `tile-astral` — The Astral Realm Nebula Sanctuary Floor
- **Description**: Deep cosmic violet floor plates, nebula washes, glowing constellation glyphs, and stardust.
- **Target File Path**: `assets/tilesets/realm_astral_tileset.png`
- **Fallback Procedural Key**: `tile-astral`
- **Logical Footprint**: 4 cols × 4 rows (in 32×32 tiles)
- **Preferred Frame Size**: 32×32 px
- **Accepted External Sizes**: 32x32 (1:1), 128x128 (seamless procedural)
- **Origin / Anchor**: `x: 0, y: 0`
- **Sheet Layout**: 4 cols x 4 rows celestial marble plates with rune nodes
- **AI / Search Tags**: `astral temple floor`, `cosmic nebula tileset`, `star runes`, `space sanctuary`

##### `tile-curzon-floor` — Curzon Hall Parquet & Terrazzo Floor
- **Description**: Heritage red-brick polish, dark teakwood herringbone parquet, and brass border trim.
- **Target File Path**: `assets/tilesets/curzon_interior_tileset.png`
- **Fallback Procedural Key**: `tile-curzon-floor`
- **Logical Footprint**: 4 cols × 4 rows (in 32×32 tiles)
- **Preferred Frame Size**: 32×32 px
- **Accepted External Sizes**: 32x32 (1:1), 16x16 (auto-2x)
- **Origin / Anchor**: `x: 0, y: 0`
- **Sheet Layout**: 32x32 interior academic floor and red carpet runners
- **AI / Search Tags**: `interior parquet floor`, `red carpet runner`, `Victorian university hall`, `teakwood tile`


### Characters & Companions (35 slots)

| ID / Texture Key | Target PNG Path | Preferred Frame Size | Grid Footprint | Fallback Key | Sheet Layout & Conventions | Source / Provenance |
|---|---|---|---|---|---|---|
| `player` | `assets/sprites/characters/moon_walker.png` | 32×64 px | 1×1 tiles | `player-0` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Studio Ghibli Satsuki Kusakabe (*My Neighbor Totoro*) |
| `totoro` | `assets/sprites/characters/totoro.png` | 64×76 px | 2×1 tiles | `totoro-0` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Studio Ghibli Totoro (*My Neighbor Totoro*) |
| `npc-ahona` | `assets/sprites/characters/npc_ahona.png` | 32×64 px | 1×1 tiles | `npc-ahona` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Cooltrainer Female) |
| `npc-apshora` | `assets/sprites/characters/npc_apshora.png` | 32×64 px | 1×1 tiles | `npc-apshora` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Beauty) |
| `npc-tea` | `assets/sprites/characters/npc_tea_vendor.png` | 32×64 px | 1×1 tiles | `npc-tea` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Chef / Tea Master) |
| `npc-fuchka` | `assets/sprites/characters/npc_fuchka_vendor.png` | 32×64 px | 1×1 tiles | `npc-fuchka` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Cook / Fuchkawala) |
| `npc-books` | `assets/sprites/characters/npc_book_vendor.png` | 32×64 px | 1×1 tiles | `npc-books` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Professor Oak / Scholar) |
| `npc-phulwali` | `assets/sprites/characters/npc_phulwali.png` | 32×64 px | 1×1 tiles | `npc-phulwali` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Leaf / Flower Maiden) |
| `npc-rakin` | `assets/sprites/characters/npc_rakin.png` | 32×64 px | 1×1 tiles | `npc-rakin` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Blue / Musician Rival) |
| `npc-anamika` | `assets/sprites/characters/npc_anamika.png` | 32×64 px | 1×1 tiles | `npc-anamika` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Girl 3 / Bestie Scholar) |
| `npc-guitar` | `assets/sprites/characters/npc_guitarist.png` | 32×64 px | 1×1 tiles | `npc-guitar` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Cooltrainer Male) |
| `npc-artist` | `assets/sprites/characters/npc_clay_artist.png` | 32×64 px | 1×1 tiles | `npc-artist` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Artist) |
| `npc-doi` | `assets/sprites/characters/npc_doi_vendor.png` | 32×64 px | 1×1 tiles | `npc-doi` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Woman 1 / Waitress) |
| `npc-mehjabin` | `assets/sprites/characters/npc_mehjabin.png` | 32×64 px | 1×1 tiles | `npc-mehjabin` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Girl 1) |
| `npc-iman` | `assets/sprites/characters/npc_iman.png` | 32×64 px | 1×1 tiles | `npc-iman` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Boy 1) |
| `npc-farmer-rafiq` | `assets/sprites/characters/npc_farmer_rafiq.png` | 32×64 px | 1×1 tiles | `npc-farmer-rafiq-0` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Old Man 1 / Agrarian Elder) |
| `npc-sage` | `assets/sprites/characters/npc_sage.png` | 32×64 px | 1×1 tiles | `npc-sage` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Expert Male / Forest Sage) |
| `npc-marina` | `assets/sprites/characters/npc_marina.png` | 32×64 px | 1×1 tiles | `npc-marina` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Swimmer Female / Ocean Guardian) |
| `npc-kael` | `assets/sprites/characters/npc_kael.png` | 32×64 px | 1×1 tiles | `npc-kael` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Hiker / Volcanic Blacksmith) |
| `npc-lyra` | `assets/sprites/characters/npc_lyra.png` | 32×64 px | 1×1 tiles | `npc-lyra` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Hex Maniac / Astronomer) |
| `npc-chronicler` | `assets/sprites/characters/npc_chronicler.png` | 32×64 px | 1×1 tiles | `npc-chronicler` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Psychic Male / Astral Sage) |
| `npc-ananya-ghost` | `assets/sprites/characters/npc_ananya_ghost.png` | 32×64 px | 1×1 tiles | `npc-ananya-ghost` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Channeler / Weeping Petni) |
| `npc-kofil-ghost` | `assets/sprites/characters/npc_kofil_ghost.png` | 32×64 px | 1×1 tiles | `npc-kofil-ghost` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Sailor / Phantom Rickshaw) |
| `npc-shamsher` | `assets/sprites/characters/npc_shamsher.png` | 32×64 px | 1×1 tiles | `npc-shamsher-investigator` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Scientist 1 / Paranormal Researcher) |
| `npc-walker1` | `assets/sprites/characters/npc_walker1.png` | 32×64 px | 1×1 tiles | `npc-walker1` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Picnicker / DU Senior) |
| `npc-walker2` | `assets/sprites/characters/npc_walker2.png` | 32×64 px | 1×1 tiles | `npc-walker2` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Reporter Female / Sketcher) |
| `npc-walker3` | `assets/sprites/characters/npc_walker3.png` | 32×64 px | 1×1 tiles | `npc-walker3` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Gentleman / Nilkhet Poet) |
| `npc-photo` | `assets/sprites/characters/npc_photo.png` | 32×64 px | 1×1 tiles | `npc-photo` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Cameraman / Street Photographer) |
| `npc-jogger` | `assets/sprites/characters/npc_jogger.png` | 32×64 px | 1×1 tiles | `npc-jogger` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Triathlete Female / Jogger) |
| `npc-prof-satyendra` | `assets/sprites/characters/npc_prof_satyendra.png` | 32×64 px | 1×1 tiles | `npc-prof-satyendra` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Gentleman / Physics Chair) |
| `npc-student-faiza` | `assets/sprites/characters/npc_student_faiza.png` | 32×64 px | 1×1 tiles | `npc-student-faiza` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Girl 2 / Undergrad) |
| `npc-prof-sultana` | `assets/sprites/characters/npc_prof_sultana.png` | 32×64 px | 1×1 tiles | `npc-prof-sultana` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Old Woman / Botany Chair) |
| `npc-dr-kabir` | `assets/sprites/characters/npc_dr_kabir.png` | 32×64 px | 1×1 tiles | `npc-dr-kabir` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Scientist 2 / Chemistry Master) |
| `npc-student-tanvir` | `assets/sprites/characters/npc_student_tanvir.png` | 32×64 px | 1×1 tiles | `npc-student-tanvir` | 4 cols x 4 rows: Row 0=Down, 1=Left, 2=Right, 3=Up | Pokémon Overworld (Youngster / Biochem Student) |
| `npc-cat` | `assets/sprites/characters/npc_cat_mimi.png` | 32×32 px | 1×1 tiles | `npc-cat` | 4 cols x 4 rows: Walk cycle in 4 directions + sit idle | Campus Calico Cat (Procedural + Sprite) |

#### Detailed Specifications for Characters & Companions

##### `player` — Moon Walker (Protagonist)
- **Description**: Joyful Ghibli-inspired heroine with amber-orange suspender skirt, pale yellow shirt, bob hair and parasol.
- **Target File Path**: `assets/sprites/characters/moon_walker.png`
- **Fallback Procedural Key**: `player-0`
- **Logical Footprint**: 1 cols × 1 rows (in 32×32 tiles)
  - *Collision Hitbox*: 0.625×0.44 tiles
- **Preferred Frame Size**: 32×48 px
- **Accepted External Sizes**: 16x32 (auto-2x -> 32x64), 32x48 (1:1), 48x56 (game.js fallback), 64x64 (LPC foot-aligned)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up (Frames 0,1,2,3 walk cycle)
- **AI / Search Tags**: `Stardew Valley female farmer`, `HGSS trainer sprite`, `Ghibli female protagonist`, `16-bit RPG walk cycle`

##### `totoro` — Totoro (Forest Avatar of Affection)
- **Description**: Giant cuddly slate-sage forest spirit with cream chevron belly, bunny ears, chibi Totoro perched on head.
- **Target File Path**: `assets/sprites/characters/totoro.png`
- **Fallback Procedural Key**: `totoro-0`
- **Logical Footprint**: 2 cols × 1 rows (in 32×32 tiles)
  - *Collision Hitbox*: 1.8×0.8 tiles
- **Preferred Frame Size**: 64×76 px
- **Accepted External Sizes**: 32x38 (auto-2x -> 64x76), 64x76 (1:1), 68x76 (game.js fallback)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up (Heavy waddling step animation)
- **AI / Search Tags**: `My Neighbor Totoro sprite`, `large friendly creature RPG`, `Ghibli companion walk cycle`, `pixel art Totoro`

##### `npc-ahona` — Ahona (Dhaka Fashionista & Stylist)
- **Description**: Campus trendsetter in vibrant crimson-magenta Jamdani kurti, ivory quilted bag and emerald jhumkas.
- **Target File Path**: `assets/sprites/characters/npc_ahona.png`
- **Fallback Procedural Key**: `npc-ahona`
- **Logical Footprint**: 1 cols × 1 rows (in 32×32 tiles)
  - *Collision Hitbox*: 0.625×0.44 tiles
- **Preferred Frame Size**: 32×48 px
- **Accepted External Sizes**: 16x32 (auto-2x), 32x48 (1:1), 38x62 (game.js fallback)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
- **AI / Search Tags**: `Bengali kurti pixel art`, `fashionable female NPC`, `Stardew Valley townsperson`, `Jamdani dress`

##### `npc-apshora` — Apshora (Haute Couture Fashionista)
- **Description**: High-fashion socialite in royal violet silk kameez, rose-gold chiffon dupatta and metallic handbag.
- **Target File Path**: `assets/sprites/characters/npc_apshora.png`
- **Fallback Procedural Key**: `npc-apshora`
- **Logical Footprint**: 1 cols × 1 rows (in 32×32 tiles)
  - *Collision Hitbox*: 0.625×0.44 tiles
- **Preferred Frame Size**: 32×48 px
- **Accepted External Sizes**: 16x32 (auto-2x), 32x48 (1:1), 38x62 (game.js fallback)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
- **AI / Search Tags**: `violet silk kameez`, `chic RPG NPC`, `dupatta animation`, `HGSS female citizen`

##### `npc-tea` — Tong-er Mama (TSC Cha Master)
- **Description**: Beloved tea vendor in checkered blue lungi and gamcha, boiling spiced cardamom milk tea.
- **Target File Path**: `assets/sprites/characters/npc_tea_vendor.png`
- **Fallback Procedural Key**: `npc-tea`
- **Logical Footprint**: 1 cols × 1 rows (in 32×32 tiles)
  - *Collision Hitbox*: 0.625×0.44 tiles
- **Preferred Frame Size**: 32×48 px
- **Accepted External Sizes**: 16x32 (auto-2x), 32x48 (1:1), 52x58 (game.js fallback)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
- **AI / Search Tags**: `street vendor pixel art`, `tea master lungi`, `Dhaka TSC cha stall`, `South Asian RPG character`

##### `npc-fuchka` — Mama Fuchkawala (Street Food Vendor)
- **Description**: Crispy puchka maker in green apron with spicy tamarind tok bowl and boiled potato mix.
- **Target File Path**: `assets/sprites/characters/npc_fuchka_vendor.png`
- **Fallback Procedural Key**: `npc-fuchka`
- **Logical Footprint**: 1 cols × 1 rows (in 32×32 tiles)
  - *Collision Hitbox*: 0.625×0.44 tiles
- **Preferred Frame Size**: 32×48 px
- **Accepted External Sizes**: 16x32 (auto-2x), 32x48 (1:1), 52x58 (game.js fallback)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
- **AI / Search Tags**: `fuchka vendor`, `street food chef`, `Dhaka merchant`, `pixel art apron`

##### `npc-books` — Nilkhet Book Seller
- **Description**: Scholarly merchant surrounded by stacks of vintage novels, poetry, and academic texts.
- **Target File Path**: `assets/sprites/characters/npc_book_vendor.png`
- **Fallback Procedural Key**: `npc-books`
- **Logical Footprint**: 1 cols × 1 rows (in 32×32 tiles)
  - *Collision Hitbox*: 0.625×0.44 tiles
- **Preferred Frame Size**: 32×48 px
- **Accepted External Sizes**: 16x32 (auto-2x), 32x48 (1:1), 52x58 (game.js fallback)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
- **AI / Search Tags**: `bookkeeper NPC`, `scholarly merchant`, `spectacles professor`, `Nilkhet book lane`

##### `npc-phulwali` — Beli Phulwali (Flower Maiden)
- **Description**: Gentle flower weaver in magenta saree crafting fragrant white Jasmine & Beli garlands.
- **Target File Path**: `assets/sprites/characters/npc_phulwali.png`
- **Fallback Procedural Key**: `npc-phulwali`
- **Logical Footprint**: 1 cols × 1 rows (in 32×32 tiles)
  - *Collision Hitbox*: 0.625×0.44 tiles
- **Preferred Frame Size**: 32×48 px
- **Accepted External Sizes**: 16x32 (auto-2x), 32x48 (1:1), 52x58 (game.js fallback)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
- **AI / Search Tags**: `flower maiden saree`, `Ramna flower seller`, `jasmine garland girl`, `Stardew florist`

##### `npc-rakin` — Rakin (Acoustic Guitarist & Rival)
- **Description**: Charming campus musician in denim jacket with wooden acoustic guitar slung over shoulder.
- **Target File Path**: `assets/sprites/characters/npc_rakin.png`
- **Fallback Procedural Key**: `npc-rakin`
- **Logical Footprint**: 1 cols × 1 rows (in 32×32 tiles)
  - *Collision Hitbox*: 0.625×0.44 tiles
- **Preferred Frame Size**: 32×48 px
- **Accepted External Sizes**: 16x32 (auto-2x), 32x48 (1:1), 52x58 (game.js fallback)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
- **AI / Search Tags**: `guitarist pixel art`, `musician rival RPG`, `denim jacket student`, `acoustic guitarist`

##### `npc-anamika` — Anamika (Poetry & Literature Enthusiast)
- **Description**: Quiet literature scholar reading Kazi Nazrul and Tagore poems near Aparajeyo Bangla.
- **Target File Path**: `assets/sprites/characters/npc_anamika.png`
- **Fallback Procedural Key**: `npc-anamika`
- **Logical Footprint**: 1 cols × 1 rows (in 32×32 tiles)
  - *Collision Hitbox*: 0.625×0.44 tiles
- **Preferred Frame Size**: 32×48 px
- **Accepted External Sizes**: 16x32 (auto-2x), 32x48 (1:1), 52x58 (game.js fallback)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
- **AI / Search Tags**: `poet girl RPG`, `book reading student`, `traditional salwar kameez`, `campus scholar`

##### `npc-cat` — Mimi (Campus Calico Cat)
- **Description**: Playful calico feline wandering Curzon Hall lawns and sleeping near tea stalls.
- **Target File Path**: `assets/sprites/characters/npc_cat_mimi.png`
- **Fallback Procedural Key**: `npc-cat`
- **Logical Footprint**: 1 cols × 1 rows (in 32×32 tiles)
  - *Collision Hitbox*: 0.5×0.3 tiles
- **Preferred Frame Size**: 32×32 px
- **Accepted External Sizes**: 16x16 (auto-2x), 32x32 (1:1), 42x36 (game.js fallback)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 4 cols x 4 rows: Walk cycle in 4 directions + sit idle
- **AI / Search Tags**: `calico cat pixel art`, `Stardew Valley farm pet`, `RPG cat walk cycle`, `cute kitten sprite`

##### `npc-farmer-rafiq` — Chacha Rafiq (Green Meadows Patriarch)
- **Description**: Warm elderly farmer in straw hat and plaid shirt tending heirloom crops and farm animals.
- **Target File Path**: `assets/sprites/characters/npc_farmer_rafiq.png`
- **Fallback Procedural Key**: `npc-farmer-rafiq-0`
- **Logical Footprint**: 1 cols × 1 rows (in 32×32 tiles)
  - *Collision Hitbox*: 0.625×0.44 tiles
- **Preferred Frame Size**: 32×48 px
- **Accepted External Sizes**: 16x32 (auto-2x), 32x48 (1:1), 36x60 (game.js fallback)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 4 cols x 4 rows: Row 0=Down, Row 1=Left, Row 2=Right, Row 3=Up
- **AI / Search Tags**: `elderly farmer pixel art`, `Stardew Valley grandfather`, `straw hat agrarian`, `Chacha Rafiq`

##### `npc-sage` — Elder Banyan Sage
- **Description**: Ancient spirit elder of the Whispering Emerald Forest draped in living moss robes.
- **Target File Path**: `assets/sprites/characters/npc_sage.png`
- **Fallback Procedural Key**: `npc-sage`
- **Logical Footprint**: 1 cols × 1 rows (in 32×32 tiles)
  - *Collision Hitbox*: 0.625×0.44 tiles
- **Preferred Frame Size**: 32×48 px
- **Accepted External Sizes**: 32x48 (1:1), 52x58 (game.js fallback)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 4 cols x 4 rows: 4-directional walk and meditative idle
- **AI / Search Tags**: `forest sage druid`, `banyan tree hermit`, `green spirit elder`, `RPG mystic guide`

##### `npc-marina` — Tidekeeper Marina
- **Description**: Guardian of the Sunken Kingdom adorned with glowing seafoam pearls and aquamarine coral.
- **Target File Path**: `assets/sprites/characters/npc_marina.png`
- **Fallback Procedural Key**: `npc-marina`
- **Logical Footprint**: 1 cols × 1 rows (in 32×32 tiles)
  - *Collision Hitbox*: 0.625×0.44 tiles
- **Preferred Frame Size**: 32×48 px
- **Accepted External Sizes**: 32x48 (1:1), 52x58 (game.js fallback)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 4 cols x 4 rows: 4-directional walk with flowing water hair
- **AI / Search Tags**: `tidekeeper mermaid priestess`, `coral shrine maiden`, `aquamarine hair NPC`, `water realm guide`

##### `npc-kael` — Master Blacksmith Kael
- **Description**: Muscular volcanic blacksmith of Emberfall Highlands wielding a heavy obsidian forging hammer.
- **Target File Path**: `assets/sprites/characters/npc_kael.png`
- **Fallback Procedural Key**: `npc-kael`
- **Logical Footprint**: 1 cols × 1 rows (in 32×32 tiles)
  - *Collision Hitbox*: 0.625×0.44 tiles
- **Preferred Frame Size**: 32×48 px
- **Accepted External Sizes**: 32x48 (1:1), 52x58 (game.js fallback)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 4 cols x 4 rows: 4-directional walk with hammer swing
- **AI / Search Tags**: `blacksmith forge master`, `volcanic artisan`, `obsidian hammer smith`, `RPG armor smith`

##### `npc-lyra` — Astronomer Lyra
- **Description**: Star-watcher of the Kingdom of Eternal Frost bundled in fur cloak with a brass astrolabe.
- **Target File Path**: `assets/sprites/characters/npc_lyra.png`
- **Fallback Procedural Key**: `npc-lyra`
- **Logical Footprint**: 1 cols × 1 rows (in 32×32 tiles)
  - *Collision Hitbox*: 0.625×0.44 tiles
- **Preferred Frame Size**: 32×48 px
- **Accepted External Sizes**: 32x48 (1:1), 52x58 (game.js fallback)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 4 cols x 4 rows: 4-directional walk with fur hood
- **AI / Search Tags**: `astronomer winter cloak`, `stargazer observatory scholar`, `frost realm guide`, `astrolabe researcher`

##### `npc-chronicler` — Celestial Chronicler
- **Description**: Ascended cosmic entity recording historical memories across space and time.
- **Target File Path**: `assets/sprites/characters/npc_chronicler.png`
- **Fallback Procedural Key**: `npc-chronicler`
- **Logical Footprint**: 1 cols × 1 rows (in 32×32 tiles)
  - *Collision Hitbox*: 0.625×0.44 tiles
- **Preferred Frame Size**: 32×48 px
- **Accepted External Sizes**: 32x48 (1:1), 52x58 (game.js fallback)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 4 cols x 4 rows: Floating celestial aura walk cycle
- **AI / Search Tags**: `celestial chronicler`, `starlight archivist`, `astral entity`, `floating cosmic sage`


### Crops & Botanical Flora (7 slots)

| ID / Texture Key | Target PNG Path | Preferred Frame Size | Grid Footprint | Fallback Key | Sheet Layout & Conventions |
|---|---|---|---|---|---|
| `crop-mango` | `assets/sprites/crops/crop_mango.png` | 32×48 px | 1×1 tiles | `crop-mango` | 6 cols x 1 row: Stage 0=Seed, 1=Sprout, 2=Sapling, 3=Blossom, 4=Ripe Mango, 5=Harvested |
| `crop-tea` | `assets/sprites/crops/crop_tea.png` | 32×48 px | 1×1 tiles | `crop-tea` | 6 cols x 1 row: Stage 0=Seed, 1=Sprout, 2=Young Bush, 3=Leaf Flush, 4=Prime Harvest, 5=Pruned Bush |
| `crop-jute` | `assets/sprites/crops/crop_jute.png` | 32×48 px | 1×1 tiles | `crop-jute` | 6 cols x 1 row: Stage 0=Seed, 1=Shoot, 2=Mid Cane, 3=Tall Stalk, 4=Golden Mature, 5=Cut Stubble |
| `crop-beli` | `assets/sprites/crops/crop_beli.png` | 32×48 px | 1×1 tiles | `crop-beli` | 6 cols x 1 row: Stage 0=Seed, 1=Sprout, 2=Budding, 3=White Flower, 4=Full Blossom, 5=Harvested |
| `crop-naga` | `assets/sprites/crops/crop_naga.png` | 32×48 px | 1×1 tiles | `crop-naga` | 6 cols x 1 row: Stage 0=Seed, 1=Sprout, 2=Green Plant, 3=White Flower, 4=Crimson Chili, 5=Regrow |
| `crop-spirit-melon` | `assets/sprites/crops/crop_spirit_melon.png` | 32×48 px | 1×1 tiles | `crop-spirit-melon` | 6 cols x 1 row: Stage 0=Spore, 1=Sprout, 2=Glowing Vine, 3=Young Gourd, 4=Ripe Spirit Melon, 5=Harvested |
| `crop-star-berry` | `assets/sprites/crops/crop_star_berry.png` | 32×48 px | 1×1 tiles | `crop-star-berry` | 6 cols x 1 row: Stage 0=Seed, 1=Ice Shoot, 2=Frost Vine, 3=Blue Blossom, 4=Luminous Star Berry, 5=Regrow |

#### Detailed Specifications for Crops & Botanical Flora

##### `crop-mango` — Rajshahi Fazli Mango Tree / Sapling
- **Description**: Heirloom Bengal summer mango tree that blooms golden panicles and heavy sweet green mangoes.
- **Target File Path**: `assets/sprites/crops/crop_mango.png`
- **Fallback Procedural Key**: `crop-mango`
- **Logical Footprint**: 1 cols × 1 rows (in 32×32 tiles)
  - *Collision Hitbox*: 0.8×0.8 tiles
- **Preferred Frame Size**: 32×48 px
- **Accepted External Sizes**: 16x24 (auto-2x), 32x48 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.9`
- **Sheet Layout**: 6 cols x 1 row: Stage 0=Seed, 1=Sprout, 2=Sapling, 3=Blossom, 4=Ripe Mango, 5=Harvested
- **AI / Search Tags**: `Stardew Valley fruit tree`, `mango sapling growth stages`, `pixel art crop sheet`

##### `crop-tea` — Sylhet Camellia Tea Bush
- **Description**: Emerald green tea bush with tender two-leaves-and-a-bud flushes for high-grade malai cha.
- **Target File Path**: `assets/sprites/crops/crop_tea.png`
- **Fallback Procedural Key**: `crop-tea`
- **Logical Footprint**: 1 cols × 1 rows (in 32×32 tiles)
- **Preferred Frame Size**: 32×48 px
- **Accepted External Sizes**: 16x24 (auto-2x), 32x48 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.9`
- **Sheet Layout**: 6 cols x 1 row: Stage 0=Seed, 1=Sprout, 2=Young Bush, 3=Leaf Flush, 4=Prime Harvest, 5=Pruned Bush
- **AI / Search Tags**: `tea bush crop`, `Stardew tea plant stages`, `Camellia sinensis sprite`, `harvestable bush`

##### `crop-jute` — Golden Valley Jute (Paat)
- **Description**: Iconic Bengali golden fiber crop growing tall slender emerald stalks during monsoon.
- **Target File Path**: `assets/sprites/crops/crop_jute.png`
- **Fallback Procedural Key**: `crop-jute`
- **Logical Footprint**: 1 cols × 1 rows (in 32×32 tiles)
- **Preferred Frame Size**: 32×48 px
- **Accepted External Sizes**: 16x24 (auto-2x), 32x48 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.9`
- **Sheet Layout**: 6 cols x 1 row: Stage 0=Seed, 1=Shoot, 2=Mid Cane, 3=Tall Stalk, 4=Golden Mature, 5=Cut Stubble
- **AI / Search Tags**: `jute crop sprite`, `sugarcane / bamboo stalk stages`, `tall crop overlap 32x48`

##### `crop-beli` — Curzon Beli Garland Bloom
- **Description**: Fragrant double-flowered Arabian Jasmine bush blooming snow-white blossoms for flower garlands.
- **Target File Path**: `assets/sprites/crops/crop_beli.png`
- **Fallback Procedural Key**: `crop-beli`
- **Logical Footprint**: 1 cols × 1 rows (in 32×32 tiles)
- **Preferred Frame Size**: 32×48 px
- **Accepted External Sizes**: 16x24 (auto-2x), 32x48 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.9`
- **Sheet Layout**: 6 cols x 1 row: Stage 0=Seed, 1=Sprout, 2=Budding, 3=White Flower, 4=Full Blossom, 5=Harvested
- **AI / Search Tags**: `jasmine flower crop`, `Stardew Valley flower stages`, `Arabian jasmine bush`, `beli phul`

##### `crop-naga` — Sreemangal Naga Fire Chili
- **Description**: Ghost pepper plant loaded with wrinkled fiery crimson chilies of extreme heat.
- **Target File Path**: `assets/sprites/crops/crop_naga.png`
- **Fallback Procedural Key**: `crop-naga`
- **Logical Footprint**: 1 cols × 1 rows (in 32×32 tiles)
- **Preferred Frame Size**: 32×48 px
- **Accepted External Sizes**: 16x24 (auto-2x), 32x48 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.9`
- **Sheet Layout**: 6 cols x 1 row: Stage 0=Seed, 1=Sprout, 2=Green Plant, 3=White Flower, 4=Crimson Chili, 5=Regrow
- **AI / Search Tags**: `chili pepper plant`, `ghost pepper stages`, `hot pepper crop 32x48`, `Stardew pepper`

##### `crop-spirit-melon` — Whispering Spirit Melon
- **Description**: Glowing bioluminescent forest melon that pulses with emerald spirit dew.
- **Target File Path**: `assets/sprites/crops/crop_spirit_melon.png`
- **Fallback Procedural Key**: `crop-spirit-melon`
- **Logical Footprint**: 1 cols × 1 rows (in 32×32 tiles)
- **Preferred Frame Size**: 32×48 px
- **Accepted External Sizes**: 16x24 (auto-2x), 32x48 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.9`
- **Sheet Layout**: 6 cols x 1 row: Stage 0=Spore, 1=Sprout, 2=Glowing Vine, 3=Young Gourd, 4=Ripe Spirit Melon, 5=Harvested
- **AI / Search Tags**: `magic fantasy crop`, `glowing melon sprite`, `spirit vine crop stages`, `bioluminescent fruit`

##### `crop-star-berry` — Cryo Star Berry
- **Description**: Frost-resistant celestial bush producing star-shaped shimmering blue berries.
- **Target File Path**: `assets/sprites/crops/crop_star_berry.png`
- **Fallback Procedural Key**: `crop-star-berry`
- **Logical Footprint**: 1 cols × 1 rows (in 32×32 tiles)
- **Preferred Frame Size**: 32×48 px
- **Accepted External Sizes**: 16x24 (auto-2x), 32x48 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.9`
- **Sheet Layout**: 6 cols x 1 row: Stage 0=Seed, 1=Ice Shoot, 2=Frost Vine, 3=Blue Blossom, 4=Luminous Star Berry, 5=Regrow
- **AI / Search Tags**: `winter frost berry`, `celestial star fruit`, `blue crystal berry`, `Stardew winter crop`


### Trees & Biome Pillars (6 slots)

| ID / Texture Key | Target PNG Path | Preferred Frame Size | Grid Footprint | Fallback Key | Sheet Layout & Conventions |
|---|---|---|---|---|---|
| `prop-tree-krishna` | `assets/sprites/trees/tree_krishnachura.png` | 128×128 px | 4×4 tiles | `prop-tree-krishna` | 1 static canopy frame + optional swaying blossom wind frames |
| `prop-tree-emerald` | `assets/sprites/trees/tree_emerald_banyan.png` | 128×128 px | 4×4 tiles | `prop-tree-emerald` | 1 static frame + hollow spirit core glow |
| `prop-pillar-coral` | `assets/sprites/trees/pillar_coral.png` | 120×128 px | 4×4 tiles | `prop-pillar-coral` | Static underwater pillar with glowing pearl |
| `prop-spire-obsidian` | `assets/sprites/trees/spire_obsidian.png` | 120×128 px | 4×4 tiles | `prop-spire-obsidian` | Static obsidian spire with glowing magma fissures |
| `prop-tree-pine` | `assets/sprites/trees/tree_frost_pine.png` | 120×128 px | 4×4 tiles | `prop-tree-pine` | Snow-frosted pine tree canopy |
| `prop-pillar-astral` | `assets/sprites/trees/pillar_astral.png` | 120×128 px | 4×4 tiles | `prop-pillar-astral` | Astral monolith with glowing constellation glyphs |

#### Detailed Specifications for Trees & Biome Pillars

##### `prop-tree-krishna` — Royal Krishnachura Tree (Delonix regia)
- **Description**: Spreading umbrella canopy bursting with flame-scarlet flowers and fern-like compound leaves.
- **Target File Path**: `assets/sprites/trees/tree_krishnachura.png`
- **Fallback Procedural Key**: `prop-tree-krishna`
- **Logical Footprint**: 4 cols × 4 rows (in 32×32 tiles)
  - *Collision Hitbox*: 2×1 tiles
- **Preferred Frame Size**: 128×128 px
- **Accepted External Sizes**: 64x64 (auto-2x -> 128x128), 120x128 (game.js fallback), 128x128 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.92`
- **Sheet Layout**: 1 static canopy frame + optional swaying blossom wind frames
- **AI / Search Tags**: `flamboyant tree pixel art`, `Krishnachura red flowers`, `top-down RPG tree 128x128`, `Stardew tree canopy`

##### `prop-tree-emerald` — Ancient Spirit Banyan Tree
- **Description**: Massive bioluminescent banyan with hanging aerial prop roots and glowing dew orbs.
- **Target File Path**: `assets/sprites/trees/tree_emerald_banyan.png`
- **Fallback Procedural Key**: `prop-tree-emerald`
- **Logical Footprint**: 4 cols × 4 rows (in 32×32 tiles)
  - *Collision Hitbox*: 2×1 tiles
- **Preferred Frame Size**: 128×128 px
- **Accepted External Sizes**: 64x64 (auto-2x), 120x128, 128x128
- **Origin / Anchor**: `x: 0.5, y: 0.92`
- **Sheet Layout**: 1 static frame + hollow spirit core glow
- **AI / Search Tags**: `banyan tree pixel art`, `glowing fantasy tree`, `spirit hollow banyan`, `aerial prop roots`

##### `prop-pillar-coral` — Luminous Abyssal Coral Pillar
- **Description**: Ancient sunken temple column overgrown with staghorn and brain corals topped with a pearl.
- **Target File Path**: `assets/sprites/trees/pillar_coral.png`
- **Fallback Procedural Key**: `prop-pillar-coral`
- **Logical Footprint**: 4 cols × 4 rows (in 32×32 tiles)
  - *Collision Hitbox*: 2×1 tiles
- **Preferred Frame Size**: 120×128 px
- **Accepted External Sizes**: 120x128 (1:1), 64x64 (auto-2x)
- **Origin / Anchor**: `x: 0.5, y: 0.92`
- **Sheet Layout**: Static underwater pillar with glowing pearl
- **AI / Search Tags**: `coral pillar pixel art`, `sunken temple column`, `underwater shrine prop`, `bioluminescent reef`

##### `prop-spire-obsidian` — Obsidian Magma Spire
- **Description**: Jagged volcanic spire oozing molten magma veins with flying ember particles.
- **Target File Path**: `assets/sprites/trees/spire_obsidian.png`
- **Fallback Procedural Key**: `prop-spire-obsidian`
- **Logical Footprint**: 4 cols × 4 rows (in 32×32 tiles)
  - *Collision Hitbox*: 2×1 tiles
- **Preferred Frame Size**: 120×128 px
- **Accepted External Sizes**: 120x128 (1:1), 64x64 (auto-2x)
- **Origin / Anchor**: `x: 0.5, y: 0.92`
- **Sheet Layout**: Static obsidian spire with glowing magma fissures
- **AI / Search Tags**: `volcanic rock spire`, `obsidian pillar`, `lava rock formation`, `caldera terrain`

##### `prop-tree-pine` — Glacial Starlight Pine
- **Description**: Heavy snow-laden mountain evergreen crowned with sparkling ice stalactites.
- **Target File Path**: `assets/sprites/trees/tree_frost_pine.png`
- **Fallback Procedural Key**: `prop-tree-pine`
- **Logical Footprint**: 4 cols × 4 rows (in 32×32 tiles)
  - *Collision Hitbox*: 2×1 tiles
- **Preferred Frame Size**: 120×128 px
- **Accepted External Sizes**: 120x128 (1:1), 64x64 (auto-2x)
- **Origin / Anchor**: `x: 0.5, y: 0.92`
- **Sheet Layout**: Snow-frosted pine tree canopy
- **AI / Search Tags**: `snow pine tree`, `frost pine sprite`, `winter evergreen pixel art`, `Stardew winter tree`

##### `prop-pillar-astral` — Celestial Monolith & Chrono-Rune Pillar
- **Description**: Floating violet marble monolith engraved with pulsing golden zodiac runes.
- **Target File Path**: `assets/sprites/trees/pillar_astral.png`
- **Fallback Procedural Key**: `prop-pillar-astral`
- **Logical Footprint**: 4 cols × 4 rows (in 32×32 tiles)
  - *Collision Hitbox*: 2×1 tiles
- **Preferred Frame Size**: 120×128 px
- **Accepted External Sizes**: 120x128 (1:1), 64x64 (auto-2x)
- **Origin / Anchor**: `x: 0.5, y: 0.92`
- **Sheet Layout**: Astral monolith with glowing constellation glyphs
- **AI / Search Tags**: `astral obelisk`, `cosmic monolith`, `rune pillar`, `floating temple stone`


### Street Carts & Cultural Stalls (6 slots)

| ID / Texture Key | Target PNG Path | Preferred Frame Size | Grid Footprint | Fallback Key | Sheet Layout & Conventions |
|---|---|---|---|---|---|
| `prop-teastall` | `assets/sprites/stalls/tsc_teastall.png` | 224×160 px | 7×5 tiles | `prop-teastall` | 1 static frame or 2-4 frames with kettle steam and lantern flicker |
| `prop-fuchkacart` | `assets/sprites/stalls/fuchka_cart.png` | 224×160 px | 7×5 tiles | `prop-fuchkacart` | 1-2 frames: striped awning and glass display box |
| `prop-bookstall` | `assets/sprites/stalls/nilkhet_bookstall.png` | 224×160 px | 7×5 tiles | `prop-bookstall` | 3 horizontal frames: 0, 1, 2 for flickering warm Edison bulb lighting |
| `prop-doicart` | `assets/sprites/stalls/pabna_doi_cart.png` | 224×160 px | 7×5 tiles | `prop-doicart` | 2 frames: clay pot displays and scalloped awning |
| `prop-flowercart` | `assets/sprites/stalls/ramna_flower_cart.png` | 224×160 px | 7×5 tiles | `prop-flowercart-0` | 2 frames: swaying flower garlands and awning bunting |
| `prop-charukola` | `assets/sprites/stalls/charukola_exhibit.png` | 224×160 px | 7×5 tiles | `prop-charukola-0` | 4 frames: animated colorful wind flags and terracotta displays |

#### Detailed Specifications for Street Carts & Cultural Stalls

##### `prop-teastall` — TSC Tong-er Cha Stall
- **Description**: Classic Dhaka tea stall with corrugated tin awning, condensed milk tins, glass biscuit jars, and smoking kettle.
- **Target File Path**: `assets/sprites/stalls/tsc_teastall.png`
- **Fallback Procedural Key**: `prop-teastall`
- **Logical Footprint**: 7 cols × 5 rows (in 32×32 tiles)
  - *Collision Hitbox*: 6×3 tiles
- **Preferred Frame Size**: 224×160 px
- **Accepted External Sizes**: 112x80 (auto-2x), 216x152 (game.js fallback), 224x160 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 1 static frame or 2-4 frames with kettle steam and lantern flicker
- **AI / Search Tags**: `tea stall pixel art`, `Dhaka TSC tong`, `street food stall RPG`, `tin roof tea shop`

##### `prop-fuchkacart` — Mama Fuchka & Chotpoti Cart
- **Description**: Dhaka street food cart with pyramid piles of puffed crispy puchkas, clay sour water pots, and red striped canopy.
- **Target File Path**: `assets/sprites/stalls/fuchka_cart.png`
- **Fallback Procedural Key**: `prop-fuchkacart`
- **Logical Footprint**: 7 cols × 5 rows (in 32×32 tiles)
  - *Collision Hitbox*: 6×3 tiles
- **Preferred Frame Size**: 224×160 px
- **Accepted External Sizes**: 112x80 (auto-2x), 216x152 (game.js fallback), 224x160 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 1-2 frames: striped awning and glass display box
- **AI / Search Tags**: `fuchka cart pixel art`, `chotpoti wagon`, `Dhaka street food`, `wooden push cart`

##### `prop-bookstall` — Nilkhet Heritage Bookstall
- **Description**: Multi-tiered wooden book pavilion under teal awning illuminated by 3 hanging Edison filament bulbs.
- **Target File Path**: `assets/sprites/stalls/nilkhet_bookstall.png`
- **Fallback Procedural Key**: `prop-bookstall`
- **Logical Footprint**: 7 cols × 5 rows (in 32×32 tiles)
  - *Collision Hitbox*: 6×3 tiles
- **Preferred Frame Size**: 224×160 px
- **Accepted External Sizes**: 112x80 (auto-2x), 216x152 (game.js fallback), 224x160 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 3 horizontal frames: 0, 1, 2 for flickering warm Edison bulb lighting
- **AI / Search Tags**: `bookstall pixel art`, `Nilkhet book market`, `bookshelves awning`, `Edison bulb stall`

##### `prop-doicart` — Pabna Traditional Mishti Doi Cart
- **Description**: Rustic sweet shop cart showcasing earthen pots (shora) of caramel sweet yogurt and Chamcham.
- **Target File Path**: `assets/sprites/stalls/pabna_doi_cart.png`
- **Fallback Procedural Key**: `prop-doicart`
- **Logical Footprint**: 7 cols × 5 rows (in 32×32 tiles)
  - *Collision Hitbox*: 6×3 tiles
- **Preferred Frame Size**: 224×160 px
- **Accepted External Sizes**: 112x80 (auto-2x), 216x152 (game.js fallback), 224x160 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 2 frames: clay pot displays and scalloped awning
- **AI / Search Tags**: `mishti doi cart`, `Bengali sweet stall`, `earthen clay pots`, `sweetshop wagon`

##### `prop-flowercart` — Ramna Park Flower Cart
- **Description**: Festive wooden flower cart overflowing with Beli garlands, Rajnigandha sticks, and yellow marigolds.
- **Target File Path**: `assets/sprites/stalls/ramna_flower_cart.png`
- **Fallback Procedural Key**: `prop-flowercart-0`
- **Logical Footprint**: 7 cols × 5 rows (in 32×32 tiles)
  - *Collision Hitbox*: 6×3 tiles
- **Preferred Frame Size**: 224×160 px
- **Accepted External Sizes**: 112x80 (auto-2x), 216x152 (game.js fallback), 224x160 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 2 frames: swaying flower garlands and awning bunting
- **AI / Search Tags**: `flower cart pixel art`, `Ramna flower seller`, `marigold garlands`, `florist stall`

##### `prop-charukola` — Charukola Fine Arts Exhibit
- **Description**: Artisanal campus outdoor exhibit showcasing colorful terracotta pottery, folk masks, and oil paintings.
- **Target File Path**: `assets/sprites/stalls/charukola_exhibit.png`
- **Fallback Procedural Key**: `prop-charukola-0`
- **Logical Footprint**: 7 cols × 5 rows (in 32×32 tiles)
  - *Collision Hitbox*: 6×3 tiles
- **Preferred Frame Size**: 224×160 px
- **Accepted External Sizes**: 112x80 (auto-2x), 216x152 (game.js fallback), 224x160 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 4 frames: animated colorful wind flags and terracotta displays
- **AI / Search Tags**: `Charukola fine arts`, `folk art exhibit`, `terracotta pottery`, `Dhaka art pavilion`


### Heritage Landmarks & Buildings (10 slots)

| ID / Texture Key | Target PNG Path | Preferred Frame Size | Grid Footprint | Fallback Key | Sheet Layout & Conventions |
|---|---|---|---|---|---|
| `prop-curzon` | `assets/sprites/landmarks/curzon_hall_facade.png` | 448×256 px | 14×8 tiles | `prop-curzon` | Static monumental facade with interior doorway trigger zone at center arch |
| `prop-monument` | `assets/sprites/landmarks/aparajeyo_bangla.png` | 148×156 px | 5×5 tiles | `prop-monument` | Static stone pedestal sculpture |
| `prop-fountain` | `assets/sprites/landmarks/mintu_road_fountain.png` | 136×124 px | 4×4 tiles | `prop-fountain` | 3-4 frames animated water jets and basin ripples |
| `prop-portal` | `assets/sprites/landmarks/realm_portal.png` | 112×128 px | 4×4 tiles | `prop-portal-0` | 3-6 frames swirling vortex with floating rune spark motes |
| `prop-farm-barn` | `assets/sprites/landmarks/farm_barn.png` | 196×140 px | 6×5 tiles | `prop-farm-barn` | Static timber barn with sliding hay door |
| `prop-farm-silo` | `assets/sprites/landmarks/farm_silo.png` | 64×130 px | 2×4 tiles | `prop-farm-silo` | Static tall farm silo |
| `prop-farm-arch` | `assets/sprites/landmarks/farm_archway.png` | 192×128 px | 6×4 tiles | `prop-farm-arch` | Spanning gateway with central open road clearance |
| `prop-spirit-altar` | `assets/sprites/landmarks/spirit_altar.png` | 68×62 px | 2×2 tiles | `prop-spirit-altar` | Carved stone pedestal with floating cyan soul orb |
| `prop-rickshaw` | `assets/sprites/vehicles/dhaka_rickshaw.png` | 96×76 px | 3×2 tiles | `prop-rickshaw` | Static vehicle with brass bell and passenger seat |
| `prop-boat` | `assets/sprites/vehicles/dhanmondi_rowboat.png` | 160×72 px | 5×2 tiles | `prop-boat` | Wooden rowboat with water ripple reflections and floating lanterns |

#### Detailed Specifications for Heritage Landmarks & Buildings

##### `prop-curzon` — Curzon Hall (Faculty of Science Heritage Facade)
- **Description**: Monumental Indo-Saracenic terracotta red-brick architectural marvel with horse-shoe arches, domed kiosks, and grand entrance.
- **Target File Path**: `assets/sprites/landmarks/curzon_hall_facade.png`
- **Fallback Procedural Key**: `prop-curzon`
- **Logical Footprint**: 14 cols × 8 rows (in 32×32 tiles)
  - *Collision Hitbox*: 14×4 tiles
- **Preferred Frame Size**: 448×256 px
- **Accepted External Sizes**: 428x261 (game.js CURZON_K=2.25), 448x256 (14x8 tiles), 224x128 (auto-2x)
- **Origin / Anchor**: `x: 0.5, y: 0.95`
- **Sheet Layout**: Static monumental facade with interior doorway trigger zone at center arch
- **AI / Search Tags**: `Curzon Hall Dhaka`, `Indo-Saracenic palace RPG`, `red brick university facade`, `grand heritage building`

##### `prop-monument` — Aparajeyo Bangla Sculpture
- **Description**: Iconic three-figure liberation monument depicting freedom fighters standing in solidarity.
- **Target File Path**: `assets/sprites/landmarks/aparajeyo_bangla.png`
- **Fallback Procedural Key**: `prop-monument`
- **Logical Footprint**: 5 cols × 5 rows (in 32×32 tiles)
  - *Collision Hitbox*: 3×1.5 tiles
- **Preferred Frame Size**: 148×156 px
- **Accepted External Sizes**: 148x156 (1:1), 74x78 (auto-2x)
- **Origin / Anchor**: `x: 0.5, y: 0.92`
- **Sheet Layout**: Static stone pedestal sculpture
- **AI / Search Tags**: `Aparajeyo Bangla statue`, `Dhaka University monument`, `liberation sculpture`, `stone monument sprite`

##### `prop-fountain` — Mintu Road Fountain Plaza
- **Description**: Circular tiered stone fountain spraying animated clear water ripples into a stone basin.
- **Target File Path**: `assets/sprites/landmarks/mintu_road_fountain.png`
- **Fallback Procedural Key**: `prop-fountain`
- **Logical Footprint**: 4 cols × 4 rows (in 32×32 tiles)
  - *Collision Hitbox*: 3×2 tiles
- **Preferred Frame Size**: 136×124 px
- **Accepted External Sizes**: 136x124 (1:1), 68x62 (auto-2x)
- **Origin / Anchor**: `x: 0.5, y: 0.9`
- **Sheet Layout**: 3-4 frames animated water jets and basin ripples
- **AI / Search Tags**: `stone fountain pixel art`, `plaza fountain animated`, `Stardew town fountain`, `water jet basin`

##### `prop-portal` — Chrono-Fracture Realm Portal
- **Description**: Mystic interdimensional swirling gate linking Dhaka Valley to the outer five realms.
- **Target File Path**: `assets/sprites/landmarks/realm_portal.png`
- **Fallback Procedural Key**: `prop-portal-0`
- **Logical Footprint**: 4 cols × 4 rows (in 32×32 tiles)
  - *Collision Hitbox*: 2×1 tiles
- **Preferred Frame Size**: 112×128 px
- **Accepted External Sizes**: 112x128 (1:1), 56x64 (auto-2x)
- **Origin / Anchor**: `x: 0.5, y: 0.9`
- **Sheet Layout**: 3-6 frames swirling vortex with floating rune spark motes
- **AI / Search Tags**: `portal vortex sprite`, `dimensional gate`, `swirling magic portal`, `chrono fracture portal`

##### `prop-farm-barn` — Green Meadows Heritage Red Barn
- **Description**: Classic rustic timber livestock barn housing dairy cows, goats, and heritage poultry.
- **Target File Path**: `assets/sprites/landmarks/farm_barn.png`
- **Fallback Procedural Key**: `prop-farm-barn`
- **Logical Footprint**: 6 cols × 5 rows (in 32×32 tiles)
  - *Collision Hitbox*: 6×2.5 tiles
- **Preferred Frame Size**: 196×140 px
- **Accepted External Sizes**: 196x140 (1:1), 98x70 (auto-2x)
- **Origin / Anchor**: `x: 0.5, y: 0.9`
- **Sheet Layout**: Static timber barn with sliding hay door
- **AI / Search Tags**: `Stardew Valley red barn`, `farmhouse livestock barn`, `timber farm building`, `hayloft barn`

##### `prop-farm-silo` — Grain & Feed Silo
- **Description**: Tall cylindrical stone and galvanized iron silo for storing winter grain and animal feed.
- **Target File Path**: `assets/sprites/landmarks/farm_silo.png`
- **Fallback Procedural Key**: `prop-farm-silo`
- **Logical Footprint**: 2 cols × 4 rows (in 32×32 tiles)
  - *Collision Hitbox*: 2×1.5 tiles
- **Preferred Frame Size**: 64×130 px
- **Accepted External Sizes**: 64x130 (1:1), 32x65 (auto-2x)
- **Origin / Anchor**: `x: 0.5, y: 0.9`
- **Sheet Layout**: Static tall farm silo
- **AI / Search Tags**: `grain silo sprite`, `Stardew silo`, `farm storage tower`, `galvanized silo`

##### `prop-farm-arch` — Green Meadows Timber Archway
- **Description**: Grand pastoral timber archway spanning country lane with warm hanging iron lanterns.
- **Target File Path**: `assets/sprites/landmarks/farm_archway.png`
- **Fallback Procedural Key**: `prop-farm-arch`
- **Logical Footprint**: 6 cols × 4 rows (in 32×32 tiles)
  - *Collision Hitbox*: 6×1 tiles
- **Preferred Frame Size**: 192×128 px
- **Accepted External Sizes**: 192x128 (1:1), 96x64 (auto-2x)
- **Origin / Anchor**: `x: 0.5, y: 0.95`
- **Sheet Layout**: Spanning gateway with central open road clearance
- **AI / Search Tags**: `timber entrance arch`, `farm gateway`, `pastoral ranch entrance`, `hanging lanterns arch`

##### `prop-spirit-altar` — Ancient Forest Spirit Altar
- **Description**: Carved stone sanctum in the Whispering Emerald Forest where lost souls find eternal peace.
- **Target File Path**: `assets/sprites/landmarks/spirit_altar.png`
- **Fallback Procedural Key**: `prop-spirit-altar`
- **Logical Footprint**: 2 cols × 2 rows (in 32×32 tiles)
  - *Collision Hitbox*: 2×1 tiles
- **Preferred Frame Size**: 68×62 px
- **Accepted External Sizes**: 68x62 (1:1), 34x31 (auto-2x)
- **Origin / Anchor**: `x: 0.5, y: 0.9`
- **Sheet Layout**: Carved stone pedestal with floating cyan soul orb
- **AI / Search Tags**: `spirit altar stone`, `ancient rune shrine`, `seance stone`, `forest ghost sanctum`

##### `prop-rickshaw` — Traditional Painted Dhaka Rickshaw
- **Description**: Authentic 3-wheeled cycle rickshaw adorned with intricate enamel cinema art, bell, and hood.
- **Target File Path**: `assets/sprites/vehicles/dhaka_rickshaw.png`
- **Fallback Procedural Key**: `prop-rickshaw`
- **Logical Footprint**: 3 cols × 2 rows (in 32×32 tiles)
  - *Collision Hitbox*: 2.5×1.2 tiles
- **Preferred Frame Size**: 96×76 px
- **Accepted External Sizes**: 48x38 (auto-2x -> 96x76), 96x76 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: Static vehicle with brass bell and passenger seat
- **AI / Search Tags**: `Dhaka cycle rickshaw`, `painted rickshaw pixel art`, `South Asian tricycle cab`, `retro vehicle`

##### `prop-boat` — Dhanmondi Lake Lantern Rowboat
- **Description**: Graceful wooden rowboat resting by the pier with glowing evening sky lanterns and wooden oars.
- **Target File Path**: `assets/sprites/vehicles/dhanmondi_rowboat.png`
- **Fallback Procedural Key**: `prop-boat`
- **Logical Footprint**: 5 cols × 2 rows (in 32×32 tiles)
  - *Collision Hitbox*: 4.5×1.5 tiles
- **Preferred Frame Size**: 160×72 px
- **Accepted External Sizes**: 80x36 (auto-2x), 156x72 (game.js fallback), 160x72 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: Wooden rowboat with water ripple reflections and floating lanterns
- **AI / Search Tags**: `lake rowboat pixel art`, `wooden boat with lantern`, `Dhanmondi lake pier boat`, `Stardew fishing boat`


### Vehicles & Vessels (2 slots)

| ID / Texture Key | Target PNG Path | Preferred Frame Size | Grid Footprint | Fallback Key | Sheet Layout & Conventions |
|---|---|---|---|---|---|
| `prop-rickshaw` | `assets/sprites/vehicles/dhaka_rickshaw.png` | 96×76 px | 3×2 tiles | `prop-rickshaw` | Static vehicle with brass bell and passenger seat |
| `prop-boat` | `assets/sprites/vehicles/dhanmondi_rowboat.png` | 160×72 px | 5×2 tiles | `prop-boat` | Wooden rowboat with water ripple reflections and floating lanterns |

#### Detailed Specifications for Vehicles & Vessels

##### `prop-rickshaw` — Traditional Painted Dhaka Rickshaw
- **Description**: Authentic 3-wheeled cycle rickshaw adorned with intricate enamel cinema art, bell, and hood.
- **Target File Path**: `assets/sprites/vehicles/dhaka_rickshaw.png`
- **Fallback Procedural Key**: `prop-rickshaw`
- **Logical Footprint**: 3 cols × 2 rows (in 32×32 tiles)
  - *Collision Hitbox*: 2.5×1.2 tiles
- **Preferred Frame Size**: 96×76 px
- **Accepted External Sizes**: 48x38 (auto-2x -> 96x76), 96x76 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: Static vehicle with brass bell and passenger seat
- **AI / Search Tags**: `Dhaka cycle rickshaw`, `painted rickshaw pixel art`, `South Asian tricycle cab`, `retro vehicle`

##### `prop-boat` — Dhanmondi Lake Lantern Rowboat
- **Description**: Graceful wooden rowboat resting by the pier with glowing evening sky lanterns and wooden oars.
- **Target File Path**: `assets/sprites/vehicles/dhanmondi_rowboat.png`
- **Fallback Procedural Key**: `prop-boat`
- **Logical Footprint**: 5 cols × 2 rows (in 32×32 tiles)
  - *Collision Hitbox*: 4.5×1.5 tiles
- **Preferred Frame Size**: 160×72 px
- **Accepted External Sizes**: 80x36 (auto-2x), 156x72 (game.js fallback), 160x72 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: Wooden rowboat with water ripple reflections and floating lanterns
- **AI / Search Tags**: `lake rowboat pixel art`, `wooden boat with lantern`, `Dhanmondi lake pier boat`, `Stardew fishing boat`


### Enemies & Guardian Bosses (9 slots)

| ID / Texture Key | Target PNG Path | Preferred Frame Size | Grid Footprint | Fallback Key | Sheet Layout & Conventions |
|---|---|---|---|---|---|
| `enemy-slime` | `assets/sprites/enemies/briar_bogling.png` | 64×64 px | 2×2 tiles | `enemy-slime` | 2-4 frames: hopping squash-and-stretch animation cycle |
| `enemy-crab` | `assets/sprites/enemies/tidepool_crabler.png` | 64×64 px | 2×2 tiles | `enemy-crab` | 2-4 frames: side-scuttling stride with alternating claw snaps |
| `enemy-wisp` | `assets/sprites/enemies/cinder_hound.png` | 64×64 px | 2×2 tiles | `enemy-wisp` | 2-4 frames: fiery prowling step with flame tail flickers |
| `enemy-wraith` | `assets/sprites/enemies/glacier_wraith.png` | 64×64 px | 2×2 tiles | `enemy-wraith` | 2-4 frames: undulating spectral hover animation |
| `boss-stag` | `assets/sprites/bosses/sylvan_briar_stag.png` | 128×128 px | 4×4 tiles | `boss-stag` | 2-4 frames: regal guardian breathing and hoof stomping cycle |
| `boss-leviathan` | `assets/sprites/bosses/abyssal_coral_leviathan.png` | 128×128 px | 4×4 tiles | `boss-leviathan` | 2-4 frames: undulating aquatic serpentine coils and tail thrash |
| `boss-drake` | `assets/sprites/bosses/ignis_magma_drake.png` | 128×128 px | 4×4 tiles | `boss-drake` | 2-4 frames: heavy wing beat and magma breath flare |
| `boss-warden` | `assets/sprites/bosses/cryon_frost_warden.png` | 128×128 px | 4×4 tiles | `boss-warden` | 2-4 frames: heavy glacial stomp and shield slam |
| `boss-archon` | `assets/sprites/bosses/chrono_fracture_archon.png` | 128×128 px | 4×4 tiles | `boss-archon` | 2-4 frames: floating astral ring rotation and cosmic eye pulse |

#### Detailed Specifications for Enemies & Guardian Bosses

##### `enemy-slime` — Briar Bogling (World 2 Forest Enemy)
- **Description**: Mossy forest imp with bioluminescent spotted toadstool cap and thorny root feet.
- **Target File Path**: `assets/sprites/enemies/briar_bogling.png`
- **Fallback Procedural Key**: `enemy-slime`
- **Logical Footprint**: 2 cols × 2 rows (in 32×32 tiles)
  - *Collision Hitbox*: 1.5×1.2 tiles
- **Preferred Frame Size**: 64×64 px
- **Accepted External Sizes**: 32x32 (auto-2x), 54x54 (game.js fallback), 64x64 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 2-4 frames: hopping squash-and-stretch animation cycle
- **AI / Search Tags**: `forest slime sprite`, `mushroom imp monster`, `briar bogling`, `RPG nature creature`

##### `enemy-crab` — Tidepool Crabler (World 3 Sunken Enemy)
- **Description**: Armored hermit-carapace crab with sharp snapping pincers and crystal shell.
- **Target File Path**: `assets/sprites/enemies/tidepool_crabler.png`
- **Fallback Procedural Key**: `enemy-crab`
- **Logical Footprint**: 2 cols × 2 rows (in 32×32 tiles)
  - *Collision Hitbox*: 1.5×1.2 tiles
- **Preferred Frame Size**: 64×64 px
- **Accepted External Sizes**: 32x32 (auto-2x), 58x52 (game.js fallback), 64x64 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 2-4 frames: side-scuttling stride with alternating claw snaps
- **AI / Search Tags**: `crab monster pixel art`, `tidepool crabler`, `coral crab enemy`, `underwater creature`

##### `enemy-wisp` — Cinder Hound (World 4 Ember Enemy)
- **Description**: Blazing quadrupedal hound forged of cooled basalt and molten flame cores.
- **Target File Path**: `assets/sprites/enemies/cinder_hound.png`
- **Fallback Procedural Key**: `enemy-wisp`
- **Logical Footprint**: 2 cols × 2 rows (in 32×32 tiles)
  - *Collision Hitbox*: 1.5×1.2 tiles
- **Preferred Frame Size**: 64×64 px
- **Accepted External Sizes**: 32x32 (auto-2x), 58x54 (game.js fallback), 64x64 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 2-4 frames: fiery prowling step with flame tail flickers
- **AI / Search Tags**: `fire hound sprite`, `cinder hound beast`, `volcanic wolf monster`, `lava beast`

##### `enemy-wraith` — Glacier Wraith (World 5 Frost Enemy)
- **Description**: Hovering specter of blue glacial frost radiating chilling mist and piercing ice claws.
- **Target File Path**: `assets/sprites/enemies/glacier_wraith.png`
- **Fallback Procedural Key**: `enemy-wraith`
- **Logical Footprint**: 2 cols × 2 rows (in 32×32 tiles)
  - *Collision Hitbox*: 1.5×1.2 tiles
- **Preferred Frame Size**: 64×64 px
- **Accepted External Sizes**: 32x32 (auto-2x), 56x60 (game.js fallback), 64x64 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.88`
- **Sheet Layout**: 2-4 frames: undulating spectral hover animation
- **AI / Search Tags**: `ice wraith specter`, `frost ghost pixel art`, `glacier phantom`, `undead winter creature`

##### `boss-stag` — Sylvan Briar Stag (Forest Guardian)
- **Description**: Majestic forest guardian stag crowned with massive crystalline glowing antlers and emerald briars.
- **Target File Path**: `assets/sprites/bosses/sylvan_briar_stag.png`
- **Fallback Procedural Key**: `boss-stag`
- **Logical Footprint**: 4 cols × 4 rows (in 32×32 tiles)
  - *Collision Hitbox*: 3.5×2.5 tiles
- **Preferred Frame Size**: 128×128 px
- **Accepted External Sizes**: 64x64 (auto-2x), 112x112 (game.js fallback), 128x128 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.9`
- **Sheet Layout**: 2-4 frames: regal guardian breathing and hoof stomping cycle
- **AI / Search Tags**: `guardian stag boss`, `forest god deer`, `crystal antlers beast`, `Ghibli forest spirit boss`

##### `boss-leviathan` — Abyssal Coral Leviathan (Sunken Guardian)
- **Description**: Ancient armored sea serpent with luminous bioluminescent fins and branching coral horn crest.
- **Target File Path**: `assets/sprites/bosses/abyssal_coral_leviathan.png`
- **Fallback Procedural Key**: `boss-leviathan`
- **Logical Footprint**: 4 cols × 4 rows (in 32×32 tiles)
  - *Collision Hitbox*: 3.5×2.5 tiles
- **Preferred Frame Size**: 128×128 px
- **Accepted External Sizes**: 64x64 (auto-2x), 112x112 (game.js fallback), 128x128 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.9`
- **Sheet Layout**: 2-4 frames: undulating aquatic serpentine coils and tail thrash
- **AI / Search Tags**: `sea leviathan boss`, `coral dragon sprite`, `abyssal serpent`, `deep sea guardian`

##### `boss-drake` — Ignis, the Magma Drake (Ember Guardian)
- **Description**: Colossal subterranean dragon of molten basalt with wings of white-hot volcanic flame.
- **Target File Path**: `assets/sprites/bosses/ignis_magma_drake.png`
- **Fallback Procedural Key**: `boss-drake`
- **Logical Footprint**: 4 cols × 4 rows (in 32×32 tiles)
  - *Collision Hitbox*: 3.5×2.5 tiles
- **Preferred Frame Size**: 128×128 px
- **Accepted External Sizes**: 64x64 (auto-2x), 118x114 (game.js fallback), 128x128 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.9`
- **Sheet Layout**: 2-4 frames: heavy wing beat and magma breath flare
- **AI / Search Tags**: `magma dragon boss`, `volcanic drake sprite`, `lava wyrm pixel art`, `fire dragon boss`

##### `boss-warden` — Cryon, Warden of Eternal Frost (Frost Guardian)
- **Description**: Armored glacial titan forged of jagged permafrost ice slabs wielding a frostbite greatshield.
- **Target File Path**: `assets/sprites/bosses/cryon_frost_warden.png`
- **Fallback Procedural Key**: `boss-warden`
- **Logical Footprint**: 4 cols × 4 rows (in 32×32 tiles)
  - *Collision Hitbox*: 3.5×2.5 tiles
- **Preferred Frame Size**: 128×128 px
- **Accepted External Sizes**: 64x64 (auto-2x), 114x114 (game.js fallback), 128x128 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.9`
- **Sheet Layout**: 2-4 frames: heavy glacial stomp and shield slam
- **AI / Search Tags**: `frost titan boss`, `glacial golem sprite`, `ice warden monster`, `winter guardian boss`

##### `boss-archon` — Chrono-Fracture Archon (Final Boss)
- **Description**: Reality-bending cosmic entity commanding astral rings, shattered chrono-crystals, and starlight blades.
- **Target File Path**: `assets/sprites/bosses/chrono_fracture_archon.png`
- **Fallback Procedural Key**: `boss-archon`
- **Logical Footprint**: 4 cols × 4 rows (in 32×32 tiles)
  - *Collision Hitbox*: 3.5×2.5 tiles
- **Preferred Frame Size**: 128×128 px
- **Accepted External Sizes**: 64x64 (auto-2x), 124x120 (game.js fallback), 128x128 (1:1)
- **Origin / Anchor**: `x: 0.5, y: 0.9`
- **Sheet Layout**: 2-4 frames: floating astral ring rotation and cosmic eye pulse
- **AI / Search Tags**: `chrono archon final boss`, `cosmic deity sprite`, `astral boss pixel art`, `reality fracture entity`

---

## 5. AI Agent Prompting & Asset Ingestion Protocol

When an AI agent (or human artist) is tasked with downloading or generating assets for any slot:

1. **Locate Target Slot**: Inspect `src/config/assetSpecs.manifest.ts` or this guide to identify the target slot `id`.
2. **Adhere to Sheet Layout**:
   - For characters: 4 columns × 4 rows (Down, Left, Right, Up).
   - For crops: 6 horizontal stages (Seed, Sprout, Young, Flowering, Mature, Regrow).
   - For autotiles: 4 columns × 4 rows (4-bit Wang blob indexing).
3. **Save File to Exact Path**: Save transparent PNG directly to `spec.externalPath` (e.g. `public/assets/sprites/characters/moon_walker.png`).
4. **Zero Code Modification Required**: `ExternalAssetAdapter` will automatically detect the file, check if 2× integer upscaling is required, register animation keys, and replace the procedural fallback seamlessly.
