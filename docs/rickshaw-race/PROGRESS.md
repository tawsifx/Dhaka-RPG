# Master Progress & Milestone Checklist
## 3D Rickshaw Racing Mini-Game — "Tring-Tring Grand Prix"

**Architecture:** Three.js + Vite Dynamic Code-Splitting + Fixed-Timestep Physics  
**Host Game:** Totoro & Moon Walker: Chronicles of the Six Realms  
**Last Updated:** October 26, 2026

---

### Milestone Roadmap Overview

- [x] **M1: Three.js Integration Spike (Current Milestone)**
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
  - [x] Comprehensive Vitest unit test suite (15+ new tests) and Playwright E2E automation.

- [ ] **M2: Kart Handling, Drift & Feel** *(Pending)*
  - [ ] Power-slide / drift mechanic with counter-steering slip angle.
  - [ ] 3-tier mini-turbo boost sparks (blue, orange, purple).
  - [ ] Suspension bounce and wheel roll / yaw animations.
  - [ ] Dynamic engine pitch audio based on kart velocity.
  - [ ] Tire skid marks and dust particle systems.

- [ ] **M3: Track Pipeline & Collisions** *(Pending)*
  - [ ] Modular track mesh generation / spline path extrusion.
  - [ ] Track surface classification (asphalt, dirt, cobblestone, water puddle).
  - [ ] Wall and guardrail collision response (raycast or capsule/OBB).
  - [ ] Checkpoint gating and reverse-direction warning.
  - [ ] Lap timer and split-time tracking.

- [ ] **M4: AI Opponents & Race Director** *(Pending)*
  - [ ] Path-following AI karts with rubber-banding / catch-up logic.
  - [ ] Avoidance behavior and overtaking lines.
  - [ ] Placement tracker (1st through 8th place).
  - [ ] Pre-race countdown (3-2-1-GO!) and finish line fanfare.

- [ ] **M5: Dhaka Street Items & Hazards** *(Pending)*
  - [ ] Mystery Item Boxes (Chai pot, Chai cup spill, Naga chili boost, stray rickshaw bell sonic blast).
  - [ ] Wandering street obstacles (goats, cows, street dogs, waterlogged potholes).
  - [ ] Shield and projectile item mechanics.

- [ ] **M6: Circuit Content & Environmental Themes** *(Pending)*
  - [ ] Track 1: *Fuller Roadway Circuit* (Curzon Hall, Krishnachura trees, TSC roundabout).
  - [ ] Track 2: *Old Dhaka Heritage Maze* (Shakhari Bazaar, narrow alleys, lantern-lit streets).
  - [ ] Track 3: *Dhanmondi Lakefront Grand Prix* (Bridges, lakeside curves, floating lanterns).
  - [ ] Custom Bengali rickshaw hood art decals and driver skins.

- [ ] **M7: Overworld Metagame Integration** *(Pending)*
  - [ ] Rickshaw Grand Prix championship cups (Krishnachura Cup, Buriganga Cup, Curzon Trophy).
  - [ ] Currency rewards (৳ Taka), Affection Hearts boost, and unique keepsakes.
  - [ ] Garage customization: chassis tuning, hood paint, bell sound unlocks.

- [ ] **M8: Final Polish, Mobile Optimization & Ship** *(Pending)*
  - [ ] Level-of-detail (LOD) and shader fallbacks for low-end mobile devices.
  - [ ] Ghost replay saving and time-trial leaderboard in IndexedDB.
  - [ ] Full accessibility and gamepad support (Standard Gamepad API).
  - [ ] Production deployment across Cloudflare Pages and Vercel.
