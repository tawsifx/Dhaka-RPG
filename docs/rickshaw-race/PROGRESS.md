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

- [ ] **M5: Dhaka Street Items & Hazards** *(Pending)*
- [ ] **M6: Championship Cups & Save Data** *(Pending)*
- [ ] **M6: Circuit Content & Environmental Themes** *(Pending)*
- [ ] **M7: Overworld Metagame Integration** *(Pending)*
- [ ] **M8: Final Polish, Mobile Optimization & Ship** *(Pending)*
