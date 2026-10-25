# Milestone 2 Verification Report & Feel Checklist
## 3D Rickshaw Racing Mini-Game — "Tring-Tring Grand Prix"

**Project:** Totoro & Moon Walker: Chronicles of the Six Realms  
**Milestone:** M2 Kart Feel — Drift, Mini-Turbo, Boost, Surfaces & Air  
**Status:** 100% Verified & Approved  
**Date:** October 26, 2026

---

### 1. Mario Kart Feel Verification Checklist

| Mechanic | Implementation | Mario Kart Target Feel | Verification Status |
| :--- | :--- | :--- | :--- |
| **Hop-to-Drift** | $0.22\text{m}$ vertical hop for $0.16\text{s}$, locks steering direction sign | Snappy hop initiates drift into tight arc; prevents accidental drift flailing | **VERIFIED** (Test 3 & E2E Step 2) |
| **Visual Slip Angle** | Chassis rotates $+18^\circ$ inward relative to velocity travel direction | Readable drift stance; visually telegraphs drift commitment | **VERIFIED** (Test 5 & Screenshot) |
| **Drift Tightening** | Steering into drift tightens arc to $\times 1.6$; counter-steer widens to $\times 0.6$ | Satisfying line control around chicanes and hairpins | **VERIFIED** (Test 6 & E2E Step 2) |
| **3-Tier Mini-Turbo** | Tier 1 (Blue $\ge 85$), Tier 2 (Orange $\ge 195$), Tier 3 (Purple $\ge 340$) | Reached at $2.0$–$2.4\text{s}$ on reference corner; rewarding boost payout | **VERIFIED** (Tests 7–11 & E2E Step 2) |
| **Boost Priority** | Stronger boost preempts weaker; durations refresh up to $3.5\text{s}$ cap | No accidental downgrades; stacking feels punchy and continuous | **VERIFIED** (Tests 16–22 & E2E Step 3) |
| **Countdown Rocket Start** | $200\text{ms}$ window around GO grants boost; early throttle causes engine stall | High-risk/high-reward starting line tension | **VERIFIED** (Tests 40–45 & E2E Step 1) |
| **Surface Zones** | Grass: $65\%$ speed, $1.8\times$ friction; Mud: $40\%$ speed, $2.5\times$ friction | Punishing off-road terrain requiring strategic pathing | **VERIFIED** (Tests 23–29 & E2E Step 3) |
| **Boost Shielding** | Active boost maintains $100\%$ speed on grass and mud | Enables Mario Kart-style off-road shortcuts with boost | **VERIFIED** (E2E Step 3: $48.6\text{ u/s}$) |
| **Ramp Launch & Air Trick** | Launch velocity based on speed and ramp angle; trick spin grants boost on landing | Airborne tricking turns jumps into momentum builders | **VERIFIED** (Tests 30–35 & E2E Step 4) |
| **Collision Response** | Glancing scrapes retain $>92\%$ speed; head-on crashes bounce back and cut speed | Grazing walls doesn't kill flow; hard crashes penalize | **VERIFIED** (Tests 36–39) |
| **Wall Scrapes Slide (f)** | Glancing wall impacts ($< 40^\circ$) slide along tangent without canceling drift | Brushing walls sustains momentum smoothly around corners | **VERIFIED** (Test 38 & 39) |
| **Camera Stability (g)** | Spring-arm exponential lerp smoothing (`posLag: 8.5`, `rotLag: 6.5`) with look-ahead | Camera never jitters or clips through track geometry | **VERIFIED** (E2E Step 5) |
| **Reduced Motion (h)** | Accessibility mode `reducedMotion: true` disables screen shake trauma | Honors accessibility user preferences without affecting gameplay | **VERIFIED** (ChaseCamera unit test) |
| **Camera Juice** | Lateral drift sway, speed FOV kick, look-behind view (Key C), landing shake | Dynamic framing enhances sense of speed and weight | **VERIFIED** (E2E Step 4 & 5) |
| **Action-Map Input** | Keyboard (WASD/Shift/C), Gamepad (cubic curve), Mobile Touch (Drift/Auto-Accel) | Snappy controls across all supported input devices | **VERIFIED** (E2E Step 6) |

---

### 2. Verification Screenshot Artifacts

#### A. Tier 3 Drift Sparks & Slip Angle (Purple Sparks)
![M2 Drift Sparks](/docs/rickshaw-race/m2_drift_sparks.png)
*Demonstrates the emerald rickshaw kart locked into a powerslide with outward slip angle, glowing purple Tier 3 mini-turbo sparks emitting from the rear wheels, tire smoke, and skid mark decals.*

#### B. Jump Ramp Launch & 360° Air Trick
![M2 Ramp Jump](/docs/rickshaw-race/m2_ramp_jump.png)
*Demonstrates the kart airborne following a ramp launch at $24\text{ m/s}$, executing a 360° air trick spin prior to clean landing boost activation.*

#### C. F5 Live Tuning Drawer & Presets
![M2 Tuning Drawer](/docs/rickshaw-race/m2_tuning_drawer.png)
*Demonstrates the in-game developer tuning drawer with live sliders, instant physics config application, preset buttons ("Snappy", "Floaty", "Heavy"), and JSON export.*

---

### 3. Automated Test Suite Summary

- **Vitest Pure Logic Suite:** **177 / 177 tests passing** (51 new M2 unit tests):
  - `DriftSystem`: 15 tests
  - `BoostSystem`: 7 tests
  - `SurfaceModel`: 7 tests
  - `AirModel`: 6 tests
  - `CollisionWorld`: 4 tests
  - `StartCountdown`: 6 tests
  - `ReplayRecorder` & Determinism: 2 tests
  - `KartStats` & Config Sanity: 4 tests
- **Playwright E2E Suite (`npm run test:race:m2`):** **10 / 10 steps passing** (Start countdown, drift tiers, surfaces, ramp jump, tuning drawer, touch emulation, particle budget, 10 enter/exit cycles, overworld state preservation).
- **Regression Suite:** All 126 pre-existing tests + `npm run test:race:m1` passing 100%.

---

### 4. Milestone 3 Architecture Recommendation: Rapier vs Three-Mesh-BVH

For Milestone 3 (Track Pipeline, 3D Mesh Surfaces & Collisions), we evaluated two primary candidate technologies:

1. **Option A: Rapier.js (WASM Rigid Body Physics Engine)**
   - *Pros:* Complete 3D physics with trimesh colliders, raycasting, and character controller.
   - *Cons:* Adds $\sim 1.8\text{ MB}$ WASM payload; requires asynchronous WASM module instantiation; rigid body vehicles often feel floaty or oscillate on complex geometry; non-trivial state serialization for replays.

2. **Option B: Three-Mesh-BVH (Bounding Volume Hierarchy for Three.js Geometry)**
   - *Pros:*
     - Tiny bundle size ($\sim 32\text{ kB}$ minified vs $1.8\text{ MB}$ for Rapier).
     - Pure JavaScript/Three.js integration; zero WASM loading hurdles.
     - Ultra-fast raycasting and sphere/capsule casting directly against Three.js track meshes ($> 500\text{ queries/ms}$).
     - Directly implements our `ISurfaceQuery` (raycast ground to query vertex colors/material properties for surface type) and `ICollisionWorld` (sphere/capsule sweep for track boundaries and curbs).
     - Preserves our proven, 100% deterministic pure kinematic master integrator (`KartController.ts`).

> [!TIP]
> **Recommendation for M3:** **Three-Mesh-BVH**. It perfectly matches the architectural foundation established in M1 & M2, delivers lightning-fast ray/sphere casting for track geometry, and preserves our snappy Mario Kart feel without the bloated weight or floaty instability of a WASM rigid-body engine.
