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

- [ ] **M3: Track Pipeline & 3D Collisions** *(Next Milestone)*
  - [ ] Track mesh extrusion / Catmull-Rom spline road generator.
  - [ ] Surface query integration via `three-mesh-bvh` (implementing `ISurfaceQuery`).
  - [ ] Boundary wall & curb collision response (implementing `ICollisionWorld`).
  - [ ] Checkpoint gating, lap tracking, wrong-way detection.
  - [ ] Minimap HUD integration with 2D track radar and player dot.

- [ ] **M4: AI Opponents & Race Director** *(Pending)*
- [ ] **M5: Dhaka Street Items & Hazards** *(Pending)*
- [ ] **M6: Circuit Content & Environmental Themes** *(Pending)*
- [ ] **M7: Overworld Metagame Integration** *(Pending)*
- [ ] **M8: Final Polish, Mobile Optimization & Ship** *(Pending)*
