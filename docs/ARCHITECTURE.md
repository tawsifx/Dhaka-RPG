# Dhaka Date RPG — Modular File Architecture Specification

> **Version:** 4.1.0  
> **Status:** Canonical Architecture Reference  
> **Updated:** October 2026  

---

## 1. Architectural Overview & Design Principles

Dhaka Date RPG (*Totoro & Moon Walker: Chronicles of the Six Realms*) uses a **decoupled, modular component architecture** built around single-responsibility subsystems, canonical barrel exports, and strict context isolation between the 2D RPG engine (Phaser 3.87) and the 3D racing simulator (Three.js 0.186).

### Key Architectural Tenets
1. **Single-Responsibility Subsystems:** Monolithic scene files are decomposed into dedicated subsystem classes (combat, farming, calendar/time, weather, atmosphere, NPC navigation, dialogue, quests, and minimap).
2. **Standard Core Architecture Framework (`src/core/`):** Adheres to industry game programming patterns (`game-arch-patterns`):
   - **Typed EventBus (`EventBus.ts`):** Decoupled, strongly-typed publish/subscribe system replacing tight cross-singleton couplings.
   - **Game State Stack (`GameStateStack.ts`):** Hierarchical state stack FSM (`GAMEPLAY`, `PAUSE`, `DIALOGUE`, `CUTSCENE`, `MINIGAME`, `COMBAT`) with enter/exit lifecycle transitions.
   - **Service Locator (`Services.ts`):** Controlled global access with Null Object safety pattern (`registerNullService`).
   - **Fixed Timestep Loop (`GameLoop.ts`):** Glenn Fiedler accumulator pattern with spiral-of-death delta clamping (`MAX_DELTA = 0.25`).
   - **ECS Composition Primitives (`Component.ts`):** Entity-Component primitives (`HealthComponent`, `MovementComponent`) replacing deep inheritance.
3. **Canonical Barrel Exports (`index.ts`):** Every subsystem directory provides a clean, self-contained `index.ts` barrel. Cross-module imports target the directory barrel rather than deep internal paths.
4. **Dual Engine Isolation (2D / 3D Context Boundary):** The 3D Totoro Kart simulator operates in an isolated iframe harness (`/race.html`) launched via `TotoroKartEngine.launch(scene)`. This prevents Three.js WebGL2 contexts and assets from leaking into the 2D Phaser pipeline and preserves fast bundle load times.
5. **Unidirectional Data Flow:**
   ```
   [Config & Databases] ──> [State & SaveManager] ──> [Core & Services] ──> [Systems & Engines] ──> [Scenes & Minigames] ──> [UI & HUD Controller]
   ```
6. **Zero-Lag Diagnostic Tooling:** Real-time diagnostics (`NpcDebugOverlay`, telemetry) are fully modularized under `src/debug/` and can be toggled via hotkeys (`F3`, `F4`) or browser console (`window.__npc`).

---

## 2. Source Code Modular Layout (`src/`)

```
src/
├── index.ts                     # Root master barrel export (re-exports types, core, config, state, audio, graphics, systems, ui, scenes, debug)
├── main.ts                      # Slim application bootloader (Phaser Game initialization & window bindings)
├── style.css                    # Retro styling, CRT scanline filter, responsive HUD positioning
├── vite-env.d.ts                # Vite client type definitions
│
├── core/                        # Standard Game Architecture Core (game-arch-patterns)
│   ├── index.ts                 # Core subsystem barrel export
│   ├── EventBus.ts              # Strongly-typed publish-subscribe event bus
│   ├── GameStateStack.ts        # Hierarchical FSM state stack (GAMEPLAY, DIALOGUE, CUTSCENE, MINIGAME)
│   ├── Services.ts              # Service Locator with Null Object fallback
│   ├── GameLoop.ts              # Fixed timestep physics accumulator loop & spiral-of-death clamp
│   └── Component.ts             # ECS component composition primitives (Health, Movement)
│
├── types/                       # Core TypeScript definitions & contracts
│   ├── index.ts                 # Types barrel export
│   ├── rpg.types.ts             # Item definitions, craft recipes, spawns, dialog interfaces
│   ├── npc.types.ts             # Stardew/HGSS schedule, pathfinding & navigation interfaces
│   ├── stardew.types.ts         # Farming, tile grid, crops, and Bengal seasonal calendar types
│   └── race.types.ts            # 3D Totoro Kart results, track metadata, and race contracts
│
├── config/                      # Declarative configuration, game databases, and indexing
│   ├── index.ts                 # Config subsystem barrel export
│   ├── constants.ts             # World coordinates, map boundaries, tile dimensions, camera speeds
│   ├── items.db.ts              # Weapons, equipment, keepsakes, food, materials database
│   ├── crops.db.ts              # 5 Bengal seasons crop database, growth stages & yields
│   ├── recipes.db.ts            # Crafting recipes & material requirements
│   ├── worlds.db.ts             # 8 playable environments layout, boundaries & spawn anchors
│   ├── attacks.db.ts            # Action combat attack frames, hitboxes, and cooldowns
│   ├── npcSchedules.db.ts       # Declarative routines & schedule variants for all 38 NPCs
│   ├── openingDialogues.db.ts   # Narrative introduction dialogue trees
│   ├── tracks.db.ts             # 3D Totoro Kart tracks & proving ground registry
│   ├── assetSpecs.manifest.ts   # Declarative external asset audit manifest
│   └── databaseIndex.ts         # O(1) in-memory secondary index engine for fast queries
│
├── state/                       # Reactive state machines & persistence
│   ├── index.ts                 # State subsystem barrel export
│   ├── DateState.ts             # Romance affection, quest flags, inventory, gift history
│   ├── RPGStats.ts              # HP, SP, XP, Level, ATK, DEF, and leveling curve progression
│   └── SaveManager.ts           # IndexedDB & LocalStorage persistent state engine
│
├── audio/                       # SFX and Procedural Audio Pipelines
│   ├── index.ts                 # Audio subsystem barrel export
│   └── SoundEngine.ts           # Dual-player 400ms cross-fading BGM, 6-channel pooled SFX & dynamic ducking
│
├── graphics/                    # Hybrid External Asset & Procedural Fallback Adapters
│   ├── index.ts                 # Graphics subsystem barrel export
│   ├── CharacterSpriteGenerator.ts # External character spritesheet adapter & procedural generator
│   ├── CreatureSpriteGenerator.ts  # Bosses, fauna, and farm livestock renderer
│   ├── ExternalAssetAdapter.ts     # 2x nearest-neighbor upscaling & 2-pass border defringing
│   ├── GroundTileGenerator.ts      # 32x32 autotiling bitmasks & terrain textures
│   ├── LandmarkGenerator.ts        # Dhaka cultural monuments & cycle rickshaws
│   └── TextureGenerator.ts         # Central composite procedural texture builder
│
├── debug/                       # Diagnostic HUD & Developer Tooling
│   ├── index.ts                 # Debug subsystem barrel export
│   └── NpcDebugOverlay.ts       # F3 diagnostic HUD, route polylines, and window.__npc API
│
├── systems/                     # Core Game Simulation Engines
│   ├── index.ts                 # Systems subsystem barrel export
│   ├── CombatSystem.ts          # Action combat, combo chains, cooldowns, knockback
│   ├── FarmingSystem.ts         # Grid tilling, watering, multi-stage crop growth simulation
│   ├── AtmosphereSystem.ts      # Real-time day/night color grading & ambient shadows
│   ├── WeatherSystem.ts         # Dynamic precipitation, lightning, wind gusts, puddles
│   ├── TimeCalendarSystem.ts    # Real-time calendar clock & seasonal progression
│   ├── ScheduleSystem.ts        # Living-world NPC tick dispatcher & entity manager
│   ├── OpeningDialogueSystem.ts # Bengali/English intro sequence coordinator
│   │
│   ├── npc/                     # Specialized living-world NPC subsystems
│   │   ├── index.ts             # NPC subsystems barrel export
│   │   ├── ScheduleResolver.ts  # Pure deterministic schedule evaluator & routine variant selector
│   │   ├── NpcNavigator.ts      # In-house A* terrain cost & door pathfinding
│   │   ├── NpcMover.ts          # Smooth tile-stepping controller & interaction freezing
│   │   ├── NpcBehaviors.ts      # Seeded PRNG idle activities, badges & emotion bubbles
│   │   └── OffscreenSimulator.ts# Discrete analytic placement for offscreen NPCs across time jumps
│   │
│   └── player/                  # Player locomotion and animation subsystems
│       ├── index.ts             # Player subsystems barrel export
│       └── PlayerBehaviors.ts   # 8-directional movement, swing & harvest anims
│
├── ui/                          # HUD & Mobile Integration
│   ├── index.ts                 # UI subsystem barrel export
│   ├── UIController.ts          # DOM HUD (Inventory, Crafting, Quests, Stats, Dialogue)
│   ├── TitleSlideshow.ts        # Cinematic title screen background rotator
│   └── MobileSupport.ts         # PWA touch controls, orientation locks, floating fullscreen
│
└── scenes/                      # Scene Orchestration & Minigames
    ├── index.ts                 # Scenes subsystem barrel export
    ├── DhakaValleyScene.ts      # Master scene coordinator (~4,690 lines)
    │
    ├── minigames/               # Specialized minigame simulation engines
    │   ├── index.ts             # Minigames barrel export (LakeBoat, RickshawTour, Stargazing, Race)
    │   ├── LakeBoatEngine.ts     # Lantern Rowboat Simulation
    │   ├── RickshawTourEngine.ts # 2D Grand Dhaka Rickshaw Tour
    │   ├── StargazingEngine.ts   # Dhanmondi Lake Observatory & Constellation Cutscene
    │   │
    │   └── race/                # Three.js 3D Racing Engine (MarioKart64JS / Totoro Kart)
    │       ├── index.ts         # Totoro Kart barrel export (TotoroKartEngine, RaceResult)
    │       ├── TotoroKartEngine.ts # Master lifecycle coordinator & iframe bridge
    │       ├── main.js          # Core MarioKart64JS game loop, camera, controls, HUD
    │       ├── track.js         # 16 GP circuits + 4 battle arenas loader & geometry
    │       ├── kart.js          # Kart kinematics, collision response, rivals, physics
    │       ├── kart3d.js        # Wii 3D Standard Kart & driver mesh assembler
    │       ├── items.js         # Authentic N64 item system, boxes, projectile logic
    │       ├── audio.js         # Web Audio synthesizer sequencing & driver voice clips
    │       ├── title3d.js       # Studio Ghibli 3D CGI menu background scene
    │       └── [hazard modules] # chomps.js, traffic.js, train.js, thwomp.js, etc.
    │
    ├── world/                   # Architectural & World Builders
    │   ├── index.ts             # World builders barrel export
    │   ├── InteriorBuilder.ts   # Curzon Hall & Green Meadows Farmhouse interiors
    │   └── MinimapRenderer.ts   # Real-time multi-world radar minimap canvas renderer
    │
    └── quests/                  # Narrative Romance Quest Saga Orchestrators
        ├── index.ts             # Quests barrel export
        └── CampusRomanceQuests.ts # Ahona & Rakin, Mehjabin & Iman, Apshora & Anamika sagas
```

---

## 3. Subsystem Decomposition & Boundaries

### 3.1 Types Subsystem (`src/types/`)
- All system interfaces, type contracts, and enums reside in `src/types/`.
- No circular dependencies: `types` modules never import from `systems` or `scenes`.
- Exported via `src/types/index.ts` and re-exported at `src/index.ts`.

### 3.2 Configuration Subsystem (`src/config/`)
- Pure data modules (`constants`, databases, asset manifests, tracks).
- `databaseIndex.ts` provides $O(1)$ memory indexing over raw database definitions for zero-latency lookups.
- Exported via `src/config/index.ts`.

### 3.3 Systems Subsystem (`src/systems/`)
- Encapsulates pure business logic separated from Phaser scene rendering.
- `ScheduleSystem` coordinates the 38 NPC schedules via sub-modules (`ScheduleResolver`, `NpcNavigator`, `NpcMover`, `NpcBehaviors`, `OffscreenSimulator`).
- `CombatSystem` manages weapon hitboxes, combo timings, and damage formulas.
- `FarmingSystem` handles tile tilling, watering, and seasonal growth rates.
- Sub-packages (`npc`, `player`) maintain their own barrel files re-exported through `src/systems/index.ts`.

### 3.4 Scenes & Minigames (`src/scenes/`)
- `DhakaValleyScene.ts` coordinates world loading, player inputs, camera follow, and system ticks.
- Sub-scenes and minigames (`RickshawTourEngine`, `StargazingEngine`, `LakeBoatEngine`, `TotoroKartEngine`) encapsulate isolated game states.
- Interior generation and minimap rendering are cleanly abstracted into `world/`.

---

## 4. Vite Rolldown Code-Splitting Architecture

To guarantee fast initial page loads on mobile and desktop, `vite.config.ts` partitions the application into 9 targeted bundle groups:

| Chunk Name | Matched Modules | Purpose |
| :--- | :--- | :--- |
| `phaser` | `node_modules/phaser` | Cached 2D game engine vendor bundle |
| `three` | `node_modules/(three\|three-mesh-bvh)` | 3D WebGL renderer & BVH physics vendor bundle |
| `race-engine` | `src/scenes/minigames/race/*` (excluding bridge) | Isolated MarioKart64JS engine & course scripts |
| `game-systems` | `src/(systems\|audio\|ui\|state\|debug)/*` | Core game logic, state machines, audio, and HUD |
| `game-db` | `src/config/*` | Item, crop, recipe, schedule, and world databases |
| `scene-dhaka` | `src/scenes/*` | Overworld scene coordinator, interiors, quests |
| `graphics-world` | `GroundTileGenerator`, `LandmarkGenerator`, etc. | Terrain and world texture builders |
| `graphics-creatures` | `CreatureSpriteGenerator` | Livestock, fauna, and monster graphics |
| `graphics-characters`| `CharacterSpriteGenerator` | NPC and player character spritesheets |

---

## 5. Verification & Test Architecture (`tests/`)

Unit tests and regression suites mirror the subsystem architecture:
- `tests/stats.test.ts` — RPG combat stats & formulas
- `tests/farming.test.ts` — Stardew farming simulation & seasons
- `tests/opening_dialogue.test.ts` — Opening narrative dialogue trees
- `tests/database_index.test.ts` — $O(1)$ in-memory index queries
- `tests/sound_engine.test.ts` — Dual-player Web Audio crossfading
- `tests/player_behaviors.test.ts` — Player 8-direction movement & combos
- `tests/combat/attacks.test.ts` — Weapon attack frames & hitboxes
- `tests/combat/assets_validation.test.ts` — Asset manifest specifications
- `tests/npc/validator.test.ts` — CLI validator across all 38 NPC schedules
- `tests/npc/resolver.test.ts`, `navigator.test.ts`, `mover.test.ts`, `offscreen.test.ts` — NPC engine unit tests
- `tests/race/mariokart64.test.ts` — Totoro Kart CC speed, track registry, item roulette, rivals

Run full test suite:
```bash
npm test
```
Run type checking:
```bash
npm run typecheck
```
Build verification:
```bash
npm run build
```
