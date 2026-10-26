# Master Progress & Milestone Checklist
## 3D Rickshaw Racing Mini-Game — "Tring-Tring Grand Prix"

**Architecture:** Three.js + Vite Dynamic Code-Splitting + Fixed-Timestep Physics  
**Host Game:** Totoro & Moon Walker: Chronicles of the Six Realms  
**Last Updated:** October 26, 2026

---

### Milestone Roadmap Overview

- [x] **M1: Three.js Integration Spike (Architecture & Overlay)**
  - [x] Pin Three.js dependency (`0.186.1`) and `@types/three` (`0.186.0`).
  - [x] Vite / Rolldown lazy chunking configuration (`three` and `race-engine` chunks).
  - [x] Overlay canvas mount above Phaser without corrupting 2D WebGL context.
  - [x] Dialogue choice hub at Rickshaw Stand (`x: 1648, y: 816`): "Tour" vs "Race (Beta)".
  - [x] Overworld state preservation (frozen clock, weather, NPC schedules, player coordinates).
  - [x] Pure arcade kart math (`KartController.ts`) & fixed-timestep loop (`FixedStepLoop.ts`).
  - [x] Spring-arm chase camera with speed-dependent dynamic FOV kick.
  - [x] DOM HUD (speedometer, bell hint, Esc exit) and mobile touch controls.
  - [x] Audio integration: BGM ducking and Rickshaw bell SFX.
  - [x] Full resource disposal (`dispose()`) of renderer, geometries, textures, materials, and listeners.
  - [x] Zero memory leaks verified across 10 enter/exit cycles.
  - [x] Developer telemetry API (`window.__race` and F4 toggle).
  - [x] Vitest unit test suite (20 tests) and Playwright E2E automation (`scripts/test_race_m1.js`).

- [x] **M2: Kart Handling, Drift, Boost, Surfaces & Air (Feel Complete)**
  - [x] **Drift System:** Hop-to-drift (`driftHopHeight = 0.22m, driftHopDuration = 0.16s`), locked slip-angle arc, tightening/counter-steering, brake/low-speed cancel.
  - [x] **3-Tier Mini-Turbo:** Blue sparks (Tier 1), Orange sparks (Tier 2), Purple sparks (Tier 3) with scaled boosts on release.
  - [x] **Boost System:** Priority state machine (stronger preempts weaker, duration extends up to 3.5s cap, max speed modifier).
  - [x] **Start Countdown & Rocket Start:** 3-2-1-GO countdown, perfect timing window boost, early throttle stall penalty.
  - [x] **Analytic Surfaces:** Asphalt, Grass (speed cap, high friction), Mud (steep slowdown), Puddle (slick steering, splash VFX), Petal Boost Pads (instant boost), Launch Ramps (airborne arc).
  - [x] **Boost Shielding:** Active boost shields the kart against off-road grass and mud slowdowns.
  - [x] **Air Mechanics & Trick Boost:** Ramp launching, gravity parabolic arc, airborne state, air trick trigger (360° visual flip), clean landing detection & landing boost.
  - [x] **Collision Response:** Glancing slide ($<40^\circ$) retaining momentum vs head-on bounce ($\ge 40^\circ$) with restitution, speed cut, and drift cancel.
  - [x] **Kart Archetypes:** 3 balanced archetypes (`light`, `balanced`, `heavy`) with varied top speeds, accelerations, and drift charge multipliers.
  - [x] **Action-Map Input Layer:** Unified keyboard, Gamepad API (hot-plug safe, 0.15 deadzone, cubic curve), and mobile touch controls (Drift button, Auto-Accel toggle).
  - [x] **Visual Juice & Animations:** Chassis body roll in turns, body pitch on accel/brake, slip-angle yaw offset, steering wheel pivot, 360° air trick spin, trauma camera shake.
  - [x] **Chase Camera Upgrades:** Lateral drift sway, look-behind view (Key C / Button Y), dynamic FOV kick, landing vertical squash.
  - [x] **Pooled Particle Systems:** `THREE.InstancedMesh` for drift sparks, tire smoke, boost exhaust flames, puddle splashes, and skid mark decals (constant 2 draw calls, zero per-frame allocations).
  - [x] **Audio Layer:** Web Audio synthesized engine RPM loop pitch-shifted by speed, white noise drift screech loop, tier-up chimes, boost whoosh, landing thump, countdown beeps.
  - [x] **Live Tuning Drawer (F5 / `?race-tune`):** 13 interactive sliders, "Copy JSON", "Reset", and 3 presets ("Snappy", "Floaty", "Heavy").
  - [x] **Deterministic Replay Recorder:** `ReplayRecorder.ts` headless deterministic runner for bit-for-bit test reproducibility.
  - [x] **Verification & Tests:** 51 new pure Vitest unit tests (177 total tests across project passing) + 10-step Playwright E2E automation (`scripts/test_race_m2.js`).

- [x] **M3: Track Pipeline & 3D Collisions ("Fuller Road Sprint")**
  - [x] **Asset Provenance & Audio Audit:** Completed `ASSETS.md` audit, CC0 sample-based audio pipeline in `RaceAudio.ts` with procedural fallbacks (ADR 012), 3D kart asset evaluation in `ASSET_SHOPPING_LIST.md` (ADR 013).
  - [x] **Mini-Turbo & Benchmarks:** Reference corner mini-turbo retuned to 2.24s (2.05–2.45s target window), verified feel checklist (f/g/h), 4× CPU throttled 60s sustained drift heap delta $+0.4$ MB with zero leaks.
  - [x] **three-mesh-bvh Integration:** Pinned `0.9.16`, validated sub-microsecond query performance (10.14 ms build, 3.46 µs / step query, 1.4% budget limit, ADR 014), refined headless math purity rule (ADR 015).
  - [x] **Multi-Elevation 3D Ground Query:** `BvhGroundQuery.ts` downward raycasting with multi-level thresholding (`y + upOffset - 0.1`) supporting flyover bridge climbing (4.5m – 6.0m elevation), surface material parsing (`road_asphalt`, `road_brick`, `offroad_grass`, `offroad_mud`, `wall`, `boost_pad`, `jump_ramp`), and face normal extraction.
  - [x] **3D Wall Collision World:** `BvhCollisionWorld.ts` sphere sweep queries, glancing slide ($<40^\circ$) vs head-on bounce ($\ge 40^\circ$) with restitution, speed cut, and drift cancel.
  - [x] **Spline Mathematics & Progress:** `TrackSpline.ts` 3D Catmull-Rom spline, arc-length parameterization, local window search, progress calculation, wrong-way detection, width and banking interpolation.
  - [x] **Lap Tracker & Anti-Cheat:** `LapTracker.ts` continuous segment-plane gate intersections, ordered checkpoints, shortcut group branching (`groupId`), wrong-way reversing rejection.
  - [x] **Paper-Lantern Rescue System:** `RescueSystem.ts` fall plane detection ($y < -10\text{m}$) and stuck detection ($\ge 3.5\text{s}$), immediate respawn at last verified checkpoint with safe heading and 1.5s invulnerability.
  - [x] **Track Asset Pipeline & "Fuller Road Sprint":** `scripts/race/build-track.mjs` generates `track.json`, `visual.glb` (200.4 kB), and `collision.glb` (258.2 kB, 2,524 collision triangles) for the 1,120m Dhaka University circuit featuring Curzon Hall, Shaheed Minar, and TSC.
  - [x] **UI & Runtime Integration:** `TrackLoader.ts`, `RaceMinimap.ts` 2D canvas radar map with live track ribbon and player blip, `RaceLoadingScreen.ts` progress indicator, `RaceResults.ts` finish modal with lap split readouts, and `TrackDebugOverlay.ts` (F6).
  - [x] **Validation & Testing:** `npm run race:validate` (3 full laps, 63.99s avg lap, 100% checkpoints passed in order), 46 new pure Vitest unit tests (223/223 total project tests green), and comprehensive Playwright E2E automation (`scripts/test_race_m3.js`).

- [x] **M4: Rivals — AI Drivers, 8-Kart Grid, Ranking, Rubber-Banding & Race Flow**
  - [x] **M3 Carry-Overs (A1-A5):** Real-track benchmarks recorded in `PERF.md` (258.2 kB, 2,524 collision tris, 4.43ms BVH build, 4.17 µs/step queries, 60 FPS), honest art provenance audit in `ASSETS.md` §3 (ADR 017), GLB budget policy (ADR 018), lap-time fact finding (1,316.4m spline), documentation updated, real stand interaction integrated in `test_race_m3.js`.
  - [x] **Offline Racing Line Generator:** `scripts/race/build-racing-line.mjs` calculates smoothed outside-inside-outside apex trajectory, lateral offsets, cornering speed recommendations from lateral grip, ideal drift zones, and courtyard shortcut metadata into `track.json`.
  - [x] **8-Slot Start Grid & Track Validation:** `scripts/race/validate-track.mjs` (`npm run race:validate`) asserts 8 non-overlapping starting slots ($\ge 2.5$m spacing), ground snapping, and racing line schema validation.
  - [x] **Pure Deterministic AI Driver:** `AiDriver.ts` uses pure pursuit lookahead, curvature-based braking before sharp bends, drift initiation and mini-turbo release, deterministic mistake injection via Mulberry32 PRNG (`AiRng.ts`), and anti-stuck reverse recovery.
  - [x] **Driver Roster & Personalities:** Data-driven `src/config/drivers.race.db.ts` defining Moon Walker + 7 distinct rivals (Tania, Baki Bhai, Iman, Arif, Anamika, Rakin, Apshora) with individual weights, handling (2.4 to 3.2 rad/s), skill, aggression, driftiness, mistake rates, and shortcut affinity.
  - [x] **Difficulty Tiers:** "Gorom Cha" (Easy/50cc), "Beshi Gorom" (Medium/100cc), "Naga Jhal" (Hard/150cc) with scaled speed multipliers, mistake rates, and drift tier caps.
  - [x] **Avoidance Sensors:** `AvoidanceSensors.ts` detects frontal obstacles and lateral crowding, applies steering repulsion bias, recommends braking on close obstructions, and filters out flyover vertical separation ($|\Delta y| > 2.0$m).
  - [x] **Multi-Kart Collision System:** `KartCollisionSystem.ts` resolves pairwise collisions with mass asymmetry ($m_B / (m_A + m_B)$), arcade restitution $e = 0.35$, rear-end speed scrub, drift cancellation on hard impacts ($> 10$ m/s), and flyover bridge isolation.
  - [x] **Ranking System & Points:** `RankingSystem.ts` continuous monotonic progress key, shortcut group neutrality (`any-of`), live standings ladder, gap to leader in seconds, and authentic Mario Kart points (15, 12, 10, 8, 6, 4, 2, 1).
  - [x] **Bounded Rubber-Banding:** `RubberBand.ts` provides strictly bounded speed modifier within $[0.94, 1.06]$ ($\pm 6\%$), zero for human player (1.000 invariant), ramping over 60m gap.
  - [x] **Race Session Orchestrator:** `RaceSession.ts` manages all 8 karts, AI driving, collisions, laps, standings, and finishes headlessly in Node/browser.
  - [x] **Rival Presentation & 2.5D Billboards:** `BillboardDriver.ts` samples character spritesheets (`moon_walker`, `npc_walker1`, `npc_walker3`, `npc_iman`, `npc_anamika`, etc.) with 4-directional row switching based on camera-relative heading; `RivalKartRenderer.ts` manages 7 tinted karts and projected screen-space name tags.
  - [x] **HUD Upgrades:** Position badge (`1st / 8` to `8th / 8`), live 8-driver standings ladder with time gaps, animated "FINAL LAP!" banner overlay, and multi-blip minimap in `RaceMinimap.ts`.
  - [x] **Pre-Race & Results Panels:** `RacePreRacePanel.ts` for difficulty & mode selection; `RaceResults.ts` podium finish modal with 8-kart standings and points awarded.
  - [x] **F7 AI Debug Overlay:** `AiDebugOverlay.ts` toggles real-time 8-driver telemetry table and 3D racing line visualizer.
  - [x] **Simulation & Testing:** Headless Monte-Carlo simulator `scripts/race/simulate-race.mjs` (`npm run race:simulate`), 36 new pure Vitest unit tests (259/259 total tests green), and comprehensive Playwright E2E automation `scripts/test_race_m4.js` (`npm run test:race:m4`) passing all 9 phases with zero errors.

- [x] **M3.5: Art Pass — Dress "Fuller Road Sprint" with SuperTuxKart Assets**
  - [x] **Part A Carry-Overs:** Aligned rival roster canonical truth in docs (§6.1), added player physics difficulty independence test and ADR 023, cleaned hidden arena mesh dead weight from track mode (saving 25 geometries and ~20 draw calls), ran 50-seed Monte Carlo balancing simulation in `PERF.md`.
  - [x] **Gameplay Lock:** Recorded SHA-256 hashes of `collision.glb` and track data in `gameplay.lock.json`; verified 100% bit-for-bit invariance in CI (`tests/race/race_m35.test.ts`).
  - [x] **STK Asset Sourcing & Survey:** Acquired candidate assets via `scripts/race/stk/fetch-stk.mjs` into `.cache/stk-assets/` and documented in `docs/rickshaw-race/STK_SURVEY.md`.
  - [x] **Pure Node SPM Binary Converter:** Built `scripts/race/stk/spm-reader.mjs` and `convert-mesh.mjs` decoding header, float16 UVs, 10-10-10-2 normals, and handedness transforms without Blender (ADR 024); created test fixtures in `tests/race/fixtures/stk/`.
  - [x] **Materials & Scene Parsers:** Built `parse-materials.mjs` and `parse-scene.mjs` for material flags, PBR tuning, and light anchors.
  - [x] **Licensing & Credits Architecture:** Built `scripts/race/stk/build-credits.mjs` generating `public/assets/race/stk/import-manifest.json`, distributing license texts in `public/assets/race/stk/licenses/`, and documenting credits in `ASSET_CREDITS.md` (ADR 027).
  - [x] **Declarative Track Dressing:** Built `scripts/race/dress-track.mjs` (`npm run race:dress`) compiling `visual.glb` (262 kB) with textured asphalt, raised curbs, brick sidewalks, safety barrier rails, flyover piers, petal boost pad overlays, start/finish arch with bilingual banner, and kitbashed Dhaka landmarks (Curzon Hall, TSC Rotunda, Shaheed Minar).
  - [x] **Instanced Scenery Props & Quality Presets:** Built `PropInstancer.ts` rendering 136 props via `THREE.InstancedMesh` (ADR 026) and `GfxQuality.ts` (`?race-gfx=low|med|high`).
  - [x] **Rickshaw Kart Model & Visual Enhancements:** Added character driver/passenger attachment anchors, articulated spinning wheels, 8 distinct rival color tints, and swinging rescue lantern.
  - [x] **Race BGM Audio Loop:** Sourced `garden.ogg` (by DJHelium) from STK into `public/assets/race/audio/garden.ogg` with pause menu ducking.
  - [x] **QA Tooling & Verification:** Created `RaceGallery.ts` (`?race-gallery`), 8-vantage-point screenshot tour (`scripts/race/screenshot-tour.mjs`), Playwright E2E automation (`scripts/test_race_m35.js`, `npm run test:race:m35`), and 31 new unit tests in `tests/race/race_m35.test.ts` (185/185 3D race tests green).

- [x] **M5: Dhaka Street Items & Hazards**
  - [x] **Part A1: Honest M4 Balance Re-measurement:** Corrected drift yaw sign, removed AI braking while drifting, widened gate tolerances for apex clipping, standardized continuous rubber-band progress; 150-seed Monte Carlo achieved 100% field finish rate, 0.00 rescues/kart, strictly monotonic pace (ADR 028).
  - [x] **Part A2: Settle M3.5 Evidence Debt:** Fixed 2D overworld preloading leak in `ExternalAssetAdapter.ts`, recorded real-track 8-kart benchmarks in `PERF.md` (60.1 FPS desktop, 55.0 FPS mobile 4× CPU throttle, 129 draw calls, 264k tris, 85.5ms load time, 10-cycle zero-leak audit passed).
  - [x] **Part B0: Multi-Channel Parallel Download Manager:** High-throughput `downloadFile()` with 4 parallel range streams, single-stream fallback, exponential backoff with jitter, SHA-256 verification and lockfile pinning in `scripts/race/downloads.lock.json` (ADR 029). 25 unit tests green in `downloader.test.ts`.
  - [x] **Part B1: SuperTuxKart Item System Port:** Ported probability distributions and algorithms from `data/powerup.xml`, `powerup_manager.cpp`, `flyable.cpp`, and `skidding_ai.cpp` with GPL-2.0+ attribution header; 1000-sum probability table across 8 positions in `itemWeights.race.json`.
  - [x] **Part B2: Dhaka Street Item Database:** 6 canonical items defined in `items.race.db.ts`: Malai Cha (nitro boost), Naga Fuchka (ricocheting rocket), Mishti Doi (spin-out trap), Parasol Shield (projectile deflection), Rickshaw Bell (radial shockwave stun), Ghuri Kite (homing flyer targeting 1st place).
  - [x] **Part B3: Deterministic Item PRNG & Roller:** Seeded Mulberry32 PRNG in `ItemRng.ts` and rank-based weighted roller in `ItemRoller.ts`.
  - [x] **Part B4: Item Boxes & Collision:** Data-driven `items.json` generated by `npm run race:items` with 16 tiffin boxes (3.5s respawn) along Fuller Road Sprint; SHA-256 recorded in `gameplay.lock.json`.
  - [x] **Part B5: HitReaction State Machine:** Deterministic states (`spin_out`, `explosion`, `squash`, `stun`), speed damping, control locks, visual juice offsets (yaw spin, tumble pitch, squash scale), and post-hit invulnerability windows in `HitReaction.ts`.
  - [x] **Part B6: Active World Items Simulation:** Deterministic projectiles, traps, and flyers in `WorldItems.ts`; STK-ported AI item evaluation in `ItemBrain.ts`.
  - [x] **Part B7: Street Hazards:** Crossing rickshaws and fallen Krishnachura petal slicks in `HazardSystem.ts`.
  - [x] **Part B8: HUD & 3D Renderers:** Mario Kart style roulette item slot (`ItemSlotHud.ts`), incoming projectile threat warning (`IncomingWarning.ts`), 3D item visuals (`ItemRenderer.ts`), hazard visuals (`HazardRenderer.ts`), and F8 telemetry overlay (`ItemsDebugOverlay.ts`).
  - [x] **Part B9: Verification & Testing:** 32 unit tests in `race_m5.test.ts` (242/242 tests passing), 30-race Monte-Carlo simulation with items/hazards (99.6% finish rate, monotonic pace, bit-exact determinism), and Playwright E2E automation in `scripts/test_race_m5.js` passing all 9 phases with zero errors.

- [ ] **M6: Championship Cups & Save Data** *(Pending)*
- [ ] **M6: Championship Cups & Save Data** *(Pending)*
- [ ] **M6: Circuit Content & Environmental Themes** *(Pending)*
- [ ] **M7: Overworld Metagame Integration** *(Pending)*
- [ ] **M8: Final Polish, Mobile Optimization & Ship** *(Pending)*
