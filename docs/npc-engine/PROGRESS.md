# Living-World NPC Behavior Engine — Progress Tracker

This document tracks progress across all phases of the living-world NPC behavior engine implementation for *Totoro & Moon Walker: Chronicles of the Six Realms*.

---

## Phase 0: Recon & Audit (Read-Only)
- [x] Read `GAME_CONTEXT.md` in full.
- [x] Read core source files:
  - `src/systems/ScheduleSystem.ts`
  - `src/systems/TimeCalendarSystem.ts`
  - `src/systems/WeatherSystem.ts`
  - `src/systems/AtmosphereSystem.ts`
  - `src/systems/FarmingSystem.ts`
  - `src/scenes/DhakaValleyScene.ts`
  - `src/state/DateState.ts`
  - `src/state/SaveManager.ts`
  - `src/config/constants.ts`
  - `src/config/worlds.db.ts`
  - `src/config/crops.db.ts`
  - `src/graphics/CharacterSpriteGenerator.ts`
  - Existing test suite (`tests/stats.test.ts`, `tests/farming.test.ts`)
- [x] Author MCP inventory (`docs/npc-engine/mcp-inventory.md`).
- [x] Author current-state audit (`docs/npc-engine/00-audit.md`).
- [x] Reconcile doc discrepancy in `GAME_CONTEXT.md` §5 (32 titled vs 38 true NPC entries).

---

## Phase 1: Research Dossier (`docs/npc-engine/01-research.md`)
- [x] Stardew Valley reverse-engineering (clock, schedule data format, key priority, execution, offscreen math, blocked behavior, weather/festivals).
- [x] Pokémon HeartGold/SoulSilver reverse-engineering (grid model, object-event movement catalog, line-of-sight, RTC time bands, following mechanics).
- [x] Additional peers (Harvest Moon/Story of Seasons, Rune Factory, Animal Crossing, EarthBound/Zelda, open-source RPG schedule engines).
- [x] Cited synthesis matrix with explicit **ADOPT / ADAPT / SKIP** verdicts.

---

## Phase 2: Design Spec (`docs/npc-engine/02-design.md`)
- [x] Architectural overview & Mermaid component diagram.
- [x] Data schemas (`src/types/npc.types.ts`).
- [x] Deterministic Schedule Resolver algorithm & priority rules.
- [x] 8-state NPC Finite State Machine (FSM).
- [x] 12 Walking Manners specification.
- [x] Time & Calendar integration (events, time scale, phase anchors).
- [x] Offscreen analytic simulation math.
- [x] Weather, season, and atmosphere hooks.
- [x] Quest, affection, and `DateState` override requests.
- [x] Post summary for user review.

---

## Phase 3: Implementation Milestones
- [x] **M1: Plumbing & Schema**
  - `src/types/npc.types.ts` strict types
  - `TimeCalendarSystem.ts` event emitters (`minute`, `phaseChanged`, `dayStarted`, `seasonChanged`, `weatherChanged`, `getDayOfWeek()`)
  - `src/systems/npc/ScheduleResolver.ts` pure resolver
  - `tests/npc/resolver.test.ts` unit tests (20 tests passed)
- [x] **M2: Single NPC Vertical Slice**
  - Tong-er Mama schedule variant (open, peak, afternoon lull, evening rush, night close, rain awning shelter)
  - End-to-end proof in Dhaka Valley
- [x] **M3: Navigator + Mover Engine**
  - `src/systems/npc/NpcNavigator.ts` (in-house A*, path costs: path < grass < flower beds < tilled soil/crops = blocked, cache)
  - `src/systems/npc/NpcMover.ts` (stepping, facing, anim rate scaling, yield/wait/repath, freeze-and-restore on interaction)
  - `tests/npc/navigator.test.ts` & `tests/npc/mover.test.ts` (16 tests passed)
- [x] **M4: Dhaka Walkers & Street Vendors (Tier A)**
  - Tania (jogging loop, rain cancellation)
  - Arif, Nadia, Baki Bhai
  - Sami (golden-hour photo shoot at lake)
  - TSC Singer, Phulwali, Nilkhet Boiwala, Charukola Clay Artist
  - Mama's Naga Fuchka & Pabnar Mishti Doi carts
- [x] **M5: Relationship NPCs & Dynamic Group Behaviors**
  - Anamika (food crawl schedule, atelier transition with Apshora)
  - Ahona & Rakin (sulking/lingering -> reconciled pair walking)
  - Salat & Enan (fountain waiting -> attentive couple)
- [x] **M6: Interior Rhythms (Tier B) & Farmstead Living (Tier C)**
  - Curzon Hall: Prof. Motahar, Prof. Satyendra, Faiza, Prof. Sultana, Dr. Kabir, Tanvir (academic period rhythms)
  - Farmhouse: Chacha Rafiq daily schedule (feeding -> fields -> rest -> milking)
  - Farm animals: Shuravi, Kalu, Tuntuni, Piku (roaming-in-bounds, coop/barn at night, rain shelter)
  - Mimi the Cat (sun patches, Totoro proximity napping)
- [x] **M7: Realm Guardians & Night-Gated Spirits (Tier D)**
  - Forest: Elder Banyan Sage
  - Night-gated spirits: Ananya (Weeping Petni), Kofil Chacha, Prof. Shamsher (active in night/rain)
  - Sages: Marina, Kael, Lyra, Celestial Chronicler (ambient loops, blessings always accessible)
- [x] **M8: Offscreen Simulation & Save Persistence**
  - `src/systems/npc/OffscreenSimulator.ts` (analytic mid-route math upon entering map)
  - `src/state/SaveManager.ts` migration for `totoro_moonwalker_rpg_save_v2`
  - `tests/npc/offscreen.test.ts` (3 tests passed)
- [x] **M9: Atmosphere, Weather Polish & Emotes**
  - Monsoon rain reactions, umbrella/shelter overlays with procedural fallbacks
  - Idle emotes and emoji activity indicators ("!", "?", "...", musical notes, tea, books, snacks)
  - Weather reaction priority system in ScheduleResolver
- [x] **M10: Validator Script & F3 Debug Tools**
  - `npm run validate:npc` CLI validation tool
  - `src/debug/NpcDebugOverlay.ts` (F3 HUD with route polylines, states, ETA, clock controls)
  - Console debugging API (`__npc.where`, `__npc.explain`, `__npc.forceOverride`, `__npc.jump`, `__npc.rain`, `__npc.toggleOverlay`)

---

## Phase 4: Validation & Quality Gate
- [x] Vitest test suite passes (`tests/npc/*.test.ts`). (54/54 tests passed)
- [x] Validator tool passes cleanly with zero schedule collisions or unreachable waypoints (`npm run validate:npc`).
- [x] Strict TypeScript check passes (`npm run typecheck`). (0 errors)
- [x] Production build passes (`npm run build`). (Built in 533ms)
- [x] Browser visual verification with `chrome-devtools-mcp`:
  - [x] 06:30 Morning routine
  - [x] 12:00 Midday rush
  - [x] 18:00 Golden hour / dusk transition
  - [x] 23:30 Midnight / ghosts / asleep
  - [x] Monsoon rain sheltering
  - [x] Curzon Hall academic periods
  - [x] Green Meadows Farmhouse dawn & night
- [x] Performance profiling: verified 60.1 FPS on 80×60 tile maps with 19 active entities (`docs/npc-engine/PERF.md`).

---

## Phase 5: Documentation & Delivery
- [x] Author `docs/npc-engine/VERIFICATION.md` with screenshots and runtime logs.
- [x] Maintain `docs/npc-engine/DECISIONS.md`.
- [x] Synchronize `GAME_CONTEXT.md` (§5 NPC count reconciliation, new Living-World NPC Behavior Engine section, TOC, tree, Last Updated).
- [x] Update `src/config/assetSpecs.manifest.ts` if visual entities are added.
- [x] Final executive summary report for user.
