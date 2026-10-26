# Architectural Decision Records (ADRs)
## Three.js Integration Spike — "Tring-Tring Grand Prix"

**Project:** Totoro & Moon Walker: Chronicles of the Six Realms  
**Milestones:** M1 Architecture Spike & M2 Kart Feel  
**Status:** Approved & Implemented

---

### ADR 001: Dedicated `<canvas>` Overlay Architecture vs. Alternatives

- **Context:**  
  The game requires a 3D kart racing mini-game ("Tring-Tring Grand Prix") accessible seamlessly from the 2D overworld (`DhakaValleyScene.ts`) at the Rickshaw Stand (`x: 1648, y: 816`). Four architectural patterns were evaluated:
  1. *Phaser WebGL Custom Pipeline / External Texture Rendering:* Attempting to render Three.js into an offscreen frame buffer and blit it to a Phaser texture.
  2. *Single Shared Canvas with Context Switching:* Reusing Phaser's WebGL context for Three.js.
  3. *Child iframe / Independent Web Page:* Launching the 3D race inside a sandboxed iframe or separate HTML page.
  4. *Dedicated `<canvas>` Overlay Container:* Mounting an independent `<canvas>` element inside a high-z-index `#race-container` directly on top of the Phaser viewport, pausing Phaser during the race, and completely unmounting/disposing the overlay on exit.

- **Decision:**  
  We choose **Option 4: Dedicated `<canvas>` Overlay Container**.
  - *Context Isolation:* Three.js gets its own dedicated WebGL2 rendering context without corrupting or conflicting with Phaser's internal shader programs, texture units, batching pipeline, or blend modes.
  - *Zero Initial Bundle Impact:* Dynamically importing `RickshawRaceEngine` allows Vite/Rolldown to split Three.js and all 3D assets into independent chunks that load on demand.
  - *Clean Lifecycle & Disposal:* When the race ends, Three.js geometries, materials, and textures are explicitly disposed of, the WebGL context is lost gracefully via `renderer.dispose()`, and the DOM container is removed, resetting memory to baseline.
  - *Performance:* Avoids expensive per-frame pixel copying between WebGL contexts (which Option 1 would require).
  - *State Preservation:* Unlike Option 3 (separate page), Moon Walker's position, Totoro's trail, weather, in-game calendar, and quest state remain in memory in `DhakaValleyScene`, resuming instantaneously.

- **Consequences:**  
  - Requires clean handling of z-index and DOM layering so HUD and touch controls sit above the 3D canvas.
  - Requires clean event listener attachment and detachment on window/canvas so input does not bleed between Phaser and Three.js.

---

### ADR 002: Overworld State Freezing Strategy (Time, Schedules, and Physics)

- **Context:**  
  When entering the race, Moon Walker's position, Totoro's follower trail, in-game clock, weather, active NPC positions and routines, and UI state must not change during the race. Upon exit, the player must return to the exact moment and position they left.

- **Decision:**  
  We employ a three-tier pause strategy:
  1. **Phaser Scene Pause:** Call `scene.scene.pause()` on `DhakaValleyScene`. This suspends Phaser's game step for the scene, stopping Phaser's internal physics updates, animation tweens, and `scene.update()`.
  2. **Explicit TimeCalendar Pause:** Invoke `scene.timeCalendar.setPaused(true)`. This prevents the accumulator inside `TimeCalendarSystem` from advancing the clock, changing daylight/atmosphere phases, or triggering minute/day change callbacks.
  3. **Schedule & Cutscene Lock:** Set `scene.cutsceneLocked = true`. This prevents any accidental interaction triggers during transition frames.
  
  On race exit (`RaceResult` received):
  1. `scene.timeCalendar.setPaused(false)`
  2. `scene.cutsceneLocked = false`
  3. `scene.scene.resume()`
  4. Overworld BGM volume is restored via `SoundEngine.restoreBGM()`.

- **Consequences:**  
  - In-game clock does not advance during the race. (Design choice: Rickshaw Racing is an arcade mini-game diversion; freezing overworld time prevents the player from accidentally missing scheduled NPC appointments or nightfall while racing).
  - NPC entities maintain their exact coordinates and facing directions.

---

### ADR 003: Three.js Version Selection & Dependency Pinning

- **Context:**  
  The 3D engine must support modern WebGL2 rendering, PBR materials, GLTF/GLB loading (for optional external models), shadow maps, fog, and clean tree-shaking under Vite 8 and Rolldown.

- **Decision:**  
  Pin `three` to version `0.186.1` and `@types/three` to `0.186.0` in `package.json`.
  - Version `0.186.1` is the current latest stable production release on npm.
  - Provides first-class ESM module imports (`three`, `three/addons/...`).
  - Supports modern `renderer.info.memory` telemetry to assert zero memory leaks in automated tests.
  - Fully compatible with Vite 8's Rolldown chunking and tree-shaking.

- **Consequences:**  
  - Added ~600 kB minified payload to project dependencies, but strictly isolated into lazy-loaded async chunks (`dist/assets/three-*.js` and `dist/assets/race-engine-*.js`).
  - Zero growth on initial page load.

---

### ADR 004: Modular Architecture & Pure Logic Separation

- **Context:**  
  Per Non-Negotiable Rule 5 and v4.0.0 layout conventions, race mechanics must be decoupled from rendering and browser DOM to allow unit testing without a headless WebGL context.

- **Decision:**  
  Adopt the following decomposed structure in `src/scenes/minigames/race/`:
  - `types/race.types.ts`: Pure TypeScript types (`RaceResult`, `KartState`, `KartInput`, `KartConfig`, `RaceTelemetry`).
  - `config/race.config.ts`: Pure numerical configuration constants (top speeds, acceleration rates, friction coefficients, camera offsets).
  - `core/KartController.ts`: 100% pure physics/kinematics math. Operates on pure 2D/3D vectors without importing `three` or `phaser`.
  - `core/FixedStepLoop.ts`: Fixed-timestep physics accumulator (default 60 Hz = 16.66ms) with interpolation alpha calculation.
  - `render/RaceRenderer.ts`: Encapsulates Three.js `WebGLRenderer`, `Scene`, lights, ground, fog, and resize handling.
  - `render/ChaseCamera.ts`: Spring-arm camera mathematics and FOV kick.
  - `render/PlaceholderKart.ts`: Visual kart model conforming to adapter fallback convention.
  - `input/RaceInput.ts`: Handles keyboard, gamepad, and touch buttons.
  - `ui/RaceHud.ts`: DOM HUD overlay.
  - `debug/RaceDebugOverlay.ts`: F4 real-time telemetry HUD overlay and `window.__race` console developer API.
  - `RickshawRaceEngine.ts`: Lifecycle coordinator.

---

### ADR 005: Kinematic Drift & Slip-Angle Model vs. Rigid-Body Simulation

- **Context:**  
  In M2, the kart must achieve authentic Mario Kart arcade feel (snappy, responsive, readable). Full rigid-body physics engines (e.g. Rapier or Cannon.js) introduce floaty suspension oscillation, roll-overs, wheel-ground contact jitter, and nondeterministic behavior.
- **Decision:**  
  Implement a pure analytical kinematic drift model in `DriftSystem.ts`:
  1. **Hop Phase:** On pressing drift above threshold speed with steering input, a vertical hop is initiated (`driftHopHeight = 0.22m, driftHopDuration = 0.16s`).
  2. **Direction Lock:** The drift direction sign (`-1` or `+1`) is locked for the entire duration of the drift.
  3. **Visual Slip Angle:** The visual chassis yaw offset $\beta$ is computed via exponential lerp toward $\pm \theta_{\text{slip}}$ ($18^\circ = 0.314\text{ rad}$), while the velocity vector follows the arc.
  4. **Arc Tightening / Counter-Steering:** Player steer input tightens the arc ($\times 1.6$) or widens/counter-steers ($\times 0.6$).
  5. **Cancel Conditions:** Applied braking, dropping below 5 m/s, or becoming airborne immediately cancels drift with zero boost.
- **Consequences:**  
  Snappy, instant, 100% deterministic arcade kart feel without WASM rigid-body overhead.

---

### ADR 006: 3-Tier Mini-Turbo Charge & Priority Boost State Machine

- **Context:**  
  Mario Kart 8 Deluxe features 3 tiers of mini-turbo (Blue, Orange, Purple) that reward sustaining a drift through corners. Multiple boost sources (mini-turbo, boost pads, start rocket boost, air trick landing) can trigger concurrently.
- **Decision:**  
  1. Implement `DriftSystem` 3-tier accumulation:
     - Tier 1: Blue sparks at charge $\ge 35$ (Boost: $+30\%$ speed for 0.8s)
     - Tier 2: Orange sparks at charge $\ge 75$ (Boost: $+50\%$ speed for 1.4s)
     - Tier 3: Purple sparks at charge $\ge 120$ (Boost: $+75\%$ speed for 2.2s)
  2. Implement unified priority state machine in `BoostSystem.ts`:
     - A stronger boost preempts an active weaker boost.
     - An equal-strength boost extends the active duration up to a hard cap of 3.5 seconds.
     - A weaker boost never downgrades an active stronger boost.
- **Consequences:**  
  Predictable, rewarding boost pacing with clear visual and audio feedback.

---

### ADR 007: Analytic Surface Zone Query Interface (`ISurfaceQuery`)

- **Context:**  
  The test arena features varying surfaces (Asphalt, Grass, Mud, Puddles, Boost Pads, Jump Ramps). In M3, tracks will use 3D meshes with BVH queries. In M2, we need pure unit-testable surfaces without mesh dependencies.
- **Decision:**  
  Create pure `ISurfaceQuery` interface:
  ```ts
  export interface ISurfaceQuery {
    query(x: number, z: number): SurfaceQueryResult;
  }
  ```
  Implement `AnalyticSurfaceModel` using 2D axis-aligned bounding boxes (AABBs) and circles with zone priorities and cooldown timers for boost pads. Active boost shields the kart against grass and mud slowdowns.
- **Consequences:**  
  M3 track mesh queries can drop in seamlessly by implementing `ISurfaceQuery` without modifying a single line of `KartController` code.

---

### ADR 008: Analytic Collision Resolution & Normal/Tangential Decomposition

- **Context:**  
  Karts must collide against arena perimeter barriers and slalom cones. Collisions must differentiate between glancing slides (grazing a wall) and head-on crashes (bouncing back with speed penalty and drift cancellation).
- **Decision:**  
  Create `ICollisionWorld` and `AnalyticCollisionWorld`:
  - Kart represented as circle of radius $R = 0.75\text{ m}$.
  - Collision penetration pushes kart along collision normal $\mathbf{n}$.
  - Velocity decomposed into normal $\mathbf{v}_n = (\mathbf{v} \cdot \mathbf{n})\mathbf{n}$ and tangential $\mathbf{v}_t = \mathbf{v} - \mathbf{v}_n$.
  - Glancing scrape (impact angle $< 40^\circ$): retains $\ge 92\%$ tangential speed without canceling drift.
  - Head-on crash (impact angle $\ge 40^\circ$): reflects with restitution $e = 0.25$, cuts forward speed by $40\%$, cancels active drift, and triggers camera shake.
- **Consequences:**  
  Satisfying wall response without tunneling or getting stuck on corners.

---

### ADR 009: Pooled Particle Systems using `THREE.InstancedMesh`

- **Context:**  
  Particle effects (drift sparks, tire smoke, boost flame exhaust, water puddle splashes, skid marks) are vital for juice. Creating individual `THREE.Mesh` or `THREE.Sprite` objects causes garbage collection stalls and excessive draw calls.
- **Decision:**  
  Implement `RaceEffects` with a single `THREE.InstancedMesh` for particles (budget 180 on desktop, 80 on mobile) and a second `THREE.InstancedMesh` for skid marks (64 quads).
  - All matrices updated via `setMatrixAt` and `instanceMatrix.needsUpdate = true`.
  - Particle colors updated per instance via `setColorAt`.
  - Zero dynamic allocations inside the render loop.
- **Consequences:**  
  Renders up to 240 particles and skid marks in just 2 draw calls at constant 60 FPS.

---

### ADR 010: Consolidated Action-Map Input Layer (`RaceActionInput`)

- **Context:**  
  The player controls the kart via keyboard, physical gamepads (Xbox, PlayStation), or mobile touch screens.
- **Decision:**  
  Consolidate all inputs into `RaceActionInput`:
  - Keyboard: WASD / Arrows, Shift / K (drift/trick), Space (bell), C (look-behind), R (reset), Esc (exit).
  - Gamepad API: Left stick with deadzone (0.15) and cubic response curve ($\text{norm}^{2.5}$), RT/A accelerate, LT/X brake, RB/LB drift, B bell, Y look-behind, Start exit. Hot-plug event listeners.
  - Mobile Touch: Steering zones, dedicated Drift button, Auto-Accelerate toggle, Bell button, Brake button, Throttle button with `touch-action: none`.
- **Consequences:**  
  Clean input abstraction; player can seamlessly switch between keyboard, gamepad, and touch controls.

---

### ADR 011: Live Tuning Drawer (F5 / `?race-tune`) & Deterministic Golden Replay

- **Context:**  
  Gameplay feel design requires rapid iteration on 15+ kinematic constants without recompiling.
- **Decision:**  
  1. Build `RaceTuningPanel` toggled via `F5` key or `?race-tune` URL query. Features live sliders for speed, acceleration, braking, friction, handling, drift rates, boost strengths, and gravity with instant updates to `KartController`. Includes "Copy config as JSON", "Reset to defaults", and 3 presets ("Arcade Snappy", "Floaty", "Heavy").
  2. Build `ReplayRecorder` which logs frame `{ dt, input }` and replays them headlessly to assert bit-for-bit determinism in automated CI test runs.
- **Consequences:**  
  Instant runtime feel tuning for designers and guaranteed regression safety via deterministic replay.

---

### ADR 012: External Sample-Based Audio Pipeline with Procedural Fallbacks (Supersedes M2 Procedural-Only Audio)

- **Context:**  
  In M2, audio was synthesized via Web Audio oscillators and noise buffers to maintain zero external audio file payload. However, procedural sound lacks the warmth, grit, and punch of real vehicle foley (engine loops, tire skids, physical impacts, distinct chime timbres), and violates the external-audio policy (§0+).
- **Decision:**  
  Transition `RaceAudio` to a hybrid sample-first architecture:
  1. Load external CC0 audio samples asynchronously from `public/assets/race/audio/` (Kenney Racing Starter Kit, Kenney 3D Platformer, Kenney Digital Audio, and authentic Dhaka `rickshaw_bell.wav`).
  2. Implement continuous loop nodes (`AudioBufferSourceNode`) for engine RPM (with `playbackRate` scaled from $0.7\times$ to $2.0\times$ by velocity), drift screech, and grass/mud off-road rumble.
  3. Implement one-shot triggers for countdown ticks, mini-turbo tier chimes (Tier 1/2/3), boost whoosh, landing thump, and wall collision impact.
  4. Retain the procedural Web Audio synthesis network strictly as an automatic fallback: if any audio sample fails to load or decode (or before network requests resolve), the engine oscillator and noise generator run smoothly without dropping audio or throwing errors.
- **Consequences:**  
  Authentic arcade racing audio juice with rich foley, satisfying impact feedback, zero initial bundle growth (audio files are static assets fetched on race mount), and 100% offline resilience via procedural fallback.

---

### ADR 013: Retaining Procedural Placeholder Rickshaw Kart Pending Authentic 3D GLB Asset

- **Context:**  
  Milestone 3 evaluated replacing the primitive-built rickshaw kart (`PlaceholderKart.ts`) with an external 3D GLB model. Required constraints: authentic Dhaka 3-wheel cycle rickshaw silhouette (with passenger hood canopy and decorative tin-plate rear art), separately addressable nodes for front/rear wheels and steering handlebar fork, origin pivot at ground center $(0,0,0)$, $\le 8,000$ triangles, and $\le 1.0\text{ MB}$ file size.
- **Decision:**  
  A search of open-source repositories (Kenney, Quaternius, Poly Pizza) yielded standard 4-wheel cars, trucks, and 2-wheel motorcycles, but no authentic Dhaka 3-wheel cycle rickshaws with properly rigged, separately addressable wheel and handlebar nodes under the strict triangle budget.
  We decide to retain the current procedural hierarchy in `PlaceholderKart.ts` conforming to the project's adapter fallback convention (`ExternalAssetAdapter`), and catalog the high-fidelity 3D rickshaw requirement in `docs/rickshaw-race/ASSET_SHOPPING_LIST.md`.
  - The placeholder provides full dynamic functionality: front wheel steering yaw, independent 3-wheel rolling rotation, chassis roll into corners, pitch on acceleration/braking/air, 360° air trick flips, and authentic Dhaka color coding (emerald `#15803d`, amber `#f59e0b`, crimson `#b91c1c`).
  - Zero asset loading delay and zero bundle footprint impact.
- **Consequences:**  
  Full kinematic and visual feedback remains intact; artists or future milestones can drop an external `rickshaw_kart.glb` into `public/assets/models/` without code changes.

---

### ADR 014: `three-mesh-bvh` Geometry Ray & Sphere Collision Acceleration (Benchmark & Approval)

- **Context:**  
  Milestone 3 requires moving from flat 2D analytic surface models to true 3D mesh-based tracks with multi-level elevation (such as flyovers, banked turns, and ramps), as well as complex wall boundaries. The query system must support fast downward ground raycasting (for ground height snapping, surface material detection, and normal orientation) and sphere/capsule sweeps for wall collisions.
  Candidate technologies: Rapier.js (WASM physics engine) vs `three-mesh-bvh`.
- **Decision:**  
  We officially approve and pin **`three-mesh-bvh@0.9.16`** (compatible with `three@0.186.1`, peer `>= 0.159.0`).
  Before committing to integration, empirical micro-benchmarks were executed (`scripts/race/benchmark-bvh.mjs`) on representative track meshes ($15,000$ triangles) and high-density stress meshes ($39,760$ triangles):
  1. **BVH Construction:** $10.14\text{ ms}$ on desktop, estimated $\sim 40.5\text{ ms}$ under 4× CPU throttling. (Budget was $\le 150\text{ ms}$ desktop / $\le 600\text{ ms}$ throttled).
  2. **Ground Raycast Throughput (`raycastFirst`):** $2.04\text{ }\mu\text{s}$ per query ($491\text{ queries/ms}$).
  3. **Sphere Sweep Throughput (`shapecast`):** $1.42\text{ }\mu\text{s}$ per query ($703\text{ queries/ms}$).
  4. **Combined Query Cost per 60 Hz Step:** $3.46\text{ }\mu\text{s}$ ($0.0035\text{ ms}$), consuming only **$1.4\%$** of the $0.25\text{ ms}$ budget limit.
- **Consequences:**  
  Avoids the $1.8\text{ MB}$ WASM overhead of Rapier, eliminates asynchronous WASM compilation, runs headlessly in Vitest/Node, and natively executes directly against Three.js geometry buffers with sub-microsecond query performance.

---

### ADR 015: Purity Refinement — Headless Math & Geometry Allowance in Pure Subsystems

- **Context:**  
  In M1 and M2, pure subsystems (`KartController`, `FixedStepLoop`, `DriftSystem`) strictly avoided any `three` imports. In M3, spatial queries (`BvhGroundQuery`, `BvhCollisionWorld`, `TrackSpline`) require 3D vectors, matrices, rays, spheres, boxes, and BVH acceleration trees.
- **Decision:**  
  Refine the architectural Purity Invariant (Rule 4):
  - Pure gameplay modules (`track/`, `core/`, `spline`, `laps`, `rescue`, `autopilot`, `bvh queries`) must remain **100% DOM-free and WebGL-free**, running headlessly in Node/Vitest without a browser or headless canvas mock.
  - They **MAY import Three.js math and geometry classes** (`THREE.Vector3`, `THREE.Ray`, `THREE.Sphere`, `THREE.Box3`, `THREE.BufferGeometry`) and `three-mesh-bvh`.
  - Rendering and DOM components (`TrackRenderer`, `ChaseCamera`, `RaceHud`, `RaceMinimap`) consume state produced by the pure modules and never own simulation state.
- **Consequences:**  
  Allows rich 3D vector and spline operations across headless tests and simulation without introducing any WebGL or DOM dependencies into the core engine.

---

### ADR 016: Data-Driven Track Pipeline, Checkpoints, and Rescue Protocol

- **Context:**  
  Milestone 3 evolves the racing mini-game from a flat analytic test arena into full 3D multi-surface circuits with elevation, flyover bridges, jump ramps, shortcuts, and wall collisions. We require a standardized track format, strict lap validation preventing cheat reversing or corner cutting, and a graceful rescue system when karts fall off ledges or get stuck.
- **Decision:**  
  1. **Dual-GLB Track Architecture:**  
     Each track defines `track.json` along with two GLB meshes:
     - `visual.glb`: Visual road ribbons, curbs, sidewalks, Dhaka landmark facades (Curzon Hall, Shaheed Minar, TSC), trees, and paper lanterns.
     - `collision.glb`: Optimized collision geometry partitioned by surface types (`road_asphalt`, `road_brick`, `offroad_grass`, `offroad_mud`, `wall`, `boost_pad`, `jump_ramp`).
     Tracks are compiled offline via `scripts/race/build-track.mjs` which extrudes spline profiles and places external prop instances.
  2. **Track Validation and Lap Tracking:**  
     - Continuous segment-plane gate intersections with directional normal alignment ($\vec{d} \cdot \vec{n} > 0$).
     - Ordered sequential checkpoint gates with optional `groupId` support for branching shortcut routes.
     - Anti-cheat logic: backward gate crossings are rejected; lap increment requires passing all mandatory gates in sequence.
  3. **Paper-Lantern Rescue System:**  
     - Fall detection via kill plane threshold ($y < -10\text{ m}$).
     - Stuck detection via throttle persistence with near-zero displacement ($\ge 3.5\text{ s}$).
     - Immediate respawn to the last verified checkpoint center with safe heading, zeroed velocity, and $1.5\text{ s}$ invulnerability.
- **Consequences:**  
  Deterministic lap tracking, robust multi-elevation driving, and full crash/fall recovery with zero game freezes or soft locks.

---

### ADR 017: Track Art Sourcing — Honest Status of Fuller Road Sprint (Retroactive, M4 Part A2)

- **Context:**  
  The M3 prompt required all track visuals, props, sky, kart and sounds to come from external assets, with offline scripts allowed only to *assemble* external pieces. ADR 016 described `visual.glb` as containing landmark facades, trees and "external prop instances". The M4 provenance audit (`ASSETS.md` §3) found that `build-track.mjs` emits only Three.js primitives: the track art is 100% procedural, curbs/sidewalks/props/lantern are missing, and no sourcing decision was ever recorded.
- **Decision:**  
  1. Correct the record: Fuller Road Sprint ships with **procedural placeholder art**, which is the explicitly allowed *labeled placeholder* fallback only in spirit — it is a standing violation of the external-art rule.  
  2. Do **not** replace art in M4 (out of scope). Catalogue the shortages in `ASSET_SHOPPING_LIST.md` (road/curb/sidewalk texture set, Curzon Hall façade, TSC rotunda, Krishnachura trees, flyover deck, barrier rails, sky/skybox, paper-lantern drone, props) with candidate sources (Kenney City/Racing kits, Quaternius, Poly Haven CC0).  
  3. Gameplay-relevant geometry (collision, spline, gates) is independent of visuals, so the art pass can happen without touching AI tuning, provided the road ribbon width and barrier layout are preserved or the racing line is rebuilt (`npm run race:line`).
- **Consequences:**  
  Docs now match reality; M5/M6 art pass has a concrete checklist; AI/balance work in M4 is unaffected.

---

### ADR 018: GLB Budget & Compression Policy (Retroactive, M4 Part A2)

- **Context:**  
  The M3 prompt asked for a GLB budget/compression decision; none was recorded. Current payload: `visual.glb` 200.4 kB, `collision.glb` 258.2 kB, `track.json` ~10 kB (468 kB total; target ≤ 8 MB).
- **Decision:**  
  Budgets (enforced by `race:validate`): collision GLB ≤ 1 MB and ≤ 40,000 triangles, visual GLB ≤ 8 MB, total ≤ 8 MB. **No Draco/Meshopt compression today**: payloads are ~6% of budget, Draco would add a ~280 kB WASM decoder (more than the entire current track), and meshopt would add decoder code to the lazy `three` chunk for no measurable load-time win. Revisit (prefer **meshopt + KTX2/WebP textures**) when textured external art pushes `visual.glb` past ~2 MB. `collision.glb` is never compressed (the BVH needs raw positions and parse time matters on throttled mobile).
- **Consequences:**  
  Simple loader, zero decoder cost; a clear trigger for adding compression with the art pass.

---

### ADR 019: Pure Pursuit Racing Line & Curvature-Aware AI Steering (M4)

- **Context:**  
  Rival karts need to drive realistically, smoothly hitting corner apexes, braking before sharp hairpins, and initiating drift on high-speed bends, without using physics shortcuts, teleports, or separate kinematics.
- **Decision:**  
  1. Offline generation (`scripts/race/build-racing-line.mjs`): Emits an optimal smoothed racing line into `track.json` with lateral offsets (outside-inside-outside apex trajectory), target cornering speeds derived from lateral grip ($a_{\text{lat}} \approx 14\text{ m/s}^2$), and ideal drift zones.
  2. Pure pursuit tracking (`AiDriver.ts`): Dynamic lookahead distance $L = 6.0 + 0.45 \times \text{speed}$; proportional steering targeting racing line lookahead; curvature braking if heading error $> 0.45$ rad or current speed exceeds local target speed; anti-stuck reverse recovery.
  3. Strict Fairness: AI drivers emit the exact same `RaceActionInput` actions as human players and run through the exact same `KartController` physics pipeline.
- **Consequences:**  
  AI drivers corner smoothly, drift when appropriate, recover from barriers, and produce realistic racing lap times (58s - 64s).

---

### ADR 020: Multi-Kart Collision Resolution & Mass Asymmetry (M4)

- **Context:**  
  With 8 karts racing together on a narrow track, karts must physically interact: bump, push, and bounce without overlapping, glitching, or passing through each other.
- **Decision:**  
  Implement pure, deterministic multi-kart collision in `KartCollisionSystem.ts`:
  1. Pairwise sphere checks ($r_A + r_B = 1.8\text{m}$) in ascending $(i, j)$ index order for determinism.
  2. Mass asymmetry: Inverted mass ratios ($w_A = m_B / (m_A + m_B)$) push lighter karts further when colliding with heavy karts (e.g. Baki Bhai's Juggernaut at 1.45 vs Iman's Breeze at 0.80).
  3. Impulse & restitution: Arcade restitution $e = 0.35$ separates colliding karts without spring ping-pong.
  4. Speed scrub: Trailing karts scrub 12% speed upon rear-ending a lead kart.
  5. Hard impact drift cancellation: Relative impact velocities $> 10.0\text{ m/s}$ cancel drift and reset turbo charge.
  6. Multi-level flyover isolation: Karts on different vertical levels ($|\Delta y| > 2.0\text{m}$) strictly ignore each other.
- **Consequences:**  
  Arcade-feeling physical bumping, tactical weight advantages, and robust flyover bridge separation.

---

### ADR 021: Bounded Transparent Rubber-Banding Policy (M4)

- **Context:**  
  Rubber-banding in racing games can easily feel cheap or unfair if karts teleport or accelerate to impossible speeds. We need tight, competitive pack racing while maintaining complete competitive integrity.
- **Decision:**  
  Implement pure `RubberBand.ts` with strict mathematical bounds:
  1. **Player Invariant:** The human player ALWAYS receives exactly $1.000$ (0.0% assist or handicap).
  2. **Bounded AI Speed Modifier:** Strictly capped between $[0.94, 1.06]$ (max $\pm 6\%$ top speed adjustment).
  3. **Linear Distance Ramp:** Modifier ramps over $60\text{m}$ gap to the player.
  4. **Zero Physics Bypassing:** No teleport catch-up, no infinite grip, no sudden speed bursts. Fully transparent and visible in F7 debug telemetry.
- **Consequences:**  
  Competitive pack racing where rivals stay grouped (within 10-25s spread across 3 laps), but player skill is 100% decisive.

---

### ADR 022: 2.5D Sprite Billboard Driver & Instanced Rival Rendering (M4)

- **Context:**  
  Rendering 8 fully animated 3D character models on low-power mobile devices risks frame drops and violates our asset policy. We have authentic 2D character spritesheets for Moon Walker and all NPCs.
- **Decision:**  
  1. Mario Kart 64 style 2.5D billboard drivers (`BillboardDriver.ts`): A quad mounted on the rickshaw saddle displaying the driver's authentic character spritesheet. The texture row is dynamically selected based on the relative angle between the kart heading and camera yaw (Down for front view, Up for back view, Left/Right for flanks) with `NearestFilter` for crisp pixel-art.
  2. 3D Karts: Distinct body and canopy colors per driver matching their lore profile (Tania crimson red, Baki Bhai gold, etc.).
  3. Floating Projected Name Tags: Lightweight HTML badges projected from 3D coordinates to screen space with distance attenuation.
- **Consequences:**  
  Charming retro aesthetic, lightweight WebGL overhead, zero procedural art generation, and seamless integration with overworld sprites.

---

### ADR 023: Player Physics Independence Across Difficulty Tiers (M3.5 Part A2)

- **Context:**  
  The three race difficulty tiers (*Gorom Cha*, *Beshi Gorom*, and *Naga Jhal*) specify scaled pace and characteristics (analogous to 50cc, 100cc, and 150cc in Mario Kart). We must guarantee that player kart physics remain bit-for-bit invariant regardless of selected difficulty.
- **Decision:**  
  1. `RaceSession` instantiates player `KartController` strictly with `DEFAULT_PLAYER_DRIVER.stats` (`topSpeed: 28.0 m/s`, `acceleration: 17.5 m/s²`, `handling: 2.8 rad/s`, `weight: 1.0`).
  2. Difficulty multipliers (`speedMultiplier`, `accelMultiplier`, `skillMultiplier`, `maxDriftTier`, `mistakeMultiplier`, `reactionLatencySec`) are passed exclusively to `AiDriver` instances.
  3. Unit test added in `tests/race/race_m4.test.ts` verifying player state (position, velocity, rotation, drift mechanics) is bit-identical across all three difficulty tiers over continuous simulated input sequences.
- **Consequences:**  
  Guaranteed fairness: player control feel is never secretly throttled or artificially sped up. Difficulty strictly tunes rival competitiveness.

---

### ADR 024: Pure Node SPM Binary Converter vs Headless Blender (M3.5 Part B2)

- **Context:**  
  SuperTuxKart models are stored in a proprietary binary `.spm` (SuperTuxKart Mesh) format. Using a headless Blender script requires installing Blender binary (~500MB) on CI/development environments, which violates our lightweight build requirements.
- **Decision:**  
  Implement a pure TypeScript/Node.js SPM binary parser and converter (`scripts/race/stk/spm-reader.mjs` and `convert-mesh.mjs`):
  1. Parse SPM header (`"SP"`, version, meshType `0=SPMS, 1=SPMA, 2=SPMN`, flags, float32 bounding box).
  2. Unpack materials string table.
  3. Decode vertex attributes: 12-byte float32 positions, 4-byte 10-10-10-2 MiniGLM packed normals, float16 IEEE 754 half-precision UVs, and vertex colors.
  4. Perform handedness transform (Irrlicht left-handed to glTF/Three.js right-handed): invert Z (`z = -z`), flip V (`v = 1.0 - v`), and reverse triangle winding (`[i0, i2, i1]`).
  5. Convert directly to Three.js `BufferGeometry` and export glTF 2.0 binary (`.glb`) via `GLTFExporter` in Node.
- **Consequences:**  
  Zero external Python/Blender runtime dependencies; converts STK models in under 5ms per mesh with sub-millimeter precision.

---

### ADR 025: Track Dressing Pipeline & Visual/Collision Geometry Separation (M3.5 Part B3)

- **Context:**  
  The Fuller Road Sprint track visuals in M3 were procedural Three.js primitives. The M3.5 art pass requires dressing the circuit with authentic SuperTuxKart textures, curbs, sidewalks, flyover architecture, and kitbashed Dhaka landmarks without altering gameplay physics.
- **Decision:**  
  1. **Strict Gameplay Lock Invariant:** `collision.glb`, centerline spline, checkpoints, gates, and racing line are permanently locked and verified via SHA-256 hashes in `gameplay.lock.json`.
  2. Declarative dressing engine (`scripts/race/dress-track.mjs`, `npm run race:dress`):
     - Derives `visual.glb` purely from the locked centerline spline and track definition.
     - Extrudes textured asphalt road ribbons with curbs, sidewalks, and boundary barrier rails (±0.3m from collision walls).
     - Kitbashes iconic Dhaka landmarks (Curzon Hall red-brick verandas, TSC green-domed rotunda, Central Shaheed Minar monument).
     - Places start/finish arch gantry with bilingual banner and celebratory red lanterns.
  3. Emits `props.json` cataloging coordinates and orientations for instanced roadside scenery.
- **Consequences:**  
  Visuals are 100% derived from gameplay geometry. Upgrading visual aesthetics never causes physics collision drift, ensuring all prior M2/M3/M4 goldens and replay runs stay green.

---

### ADR 026: Instanced Scenery Prop Rendering via `PropInstancer` & Quality Scalability (M3.5 Part B3/B7)

- **Context:**  
  Placing hundreds of roadside props (street lamps, park benches, trees, flowerbeds, crash barrels) as individual scene graph nodes would cause draw call explosions and stutter on lower-end mobile hardware.
- **Decision:**  
  1. Implement `PropInstancer.ts` consuming `props.json` and grouping identical STK models into `THREE.InstancedMesh` instances.
  2. Single draw call per prop type (lamps, trees, benches, barrels, lanterns).
  3. Quality scaling via `GfxQuality.ts` (`?race-gfx=low|med|high`):
     - `high`: 100% prop density, full shadows, full particle counts.
     - `med`: 70% prop density, shadows enabled, balanced particles.
     - `low`: 35% prop density (decorative shrubs/barrels omitted), shadows disabled, minimal particles.
- **Consequences:**  
  Maintains smooth 60 FPS performance across desktop and mobile while rendering over 130 rich scenery props along Fuller Road.

---

### ADR 029: Multi-Channel Parallel Download Manager with Chunked Range Requests (M5 Part B0)

- **Context:**  
  External asset fetching for 3D race tracks and models (e.g. tracks, sound files, meshes > 256 KB) required high-throughput, resilient downloads with fallback support for servers without HTTP range support, retry handling on flaky connections, SHA-256 verification, and strict lockfile pinning.
- **Decision:**  
  1. Implement `scripts/lib/parallel-download.mjs` providing `downloadFile()` with:
     - `Accept-Ranges: bytes` probe via `probeUrl()`.
     - Chunked downloads across 4 concurrent channels for range-supporting servers.
     - Fallback to streaming single-stream download when ranges are unsupported (`501/416` or no header).
     - Exponential backoff retry with jitter up to `maxRetries = 3`.
     - SHA-256 integrity verification against expected hash or writing to `scripts/race/downloads.lock.json`.
  2. Implement CLI runner `scripts/race/download.mjs` (`npm run race:dl`) and benchmark runner `scripts/race/download-benchmark.mjs` (`npm run race:dl:bench`).
  3. Integrated with `scripts/race/stk/fetch-stk.mjs` to eliminate all ad-hoc downloading.
- **Consequences:**  
  Zero flake downloads across build steps and CI, verified with 25 unit tests in `tests/race/downloader.test.ts`.

---

### ADR 030: Dhaka Street Items & Hazards Ported from SuperTuxKart (M5 Part B)

- **Context:**  
  To introduce Mario Kart / SuperTuxKart style dynamic racing combat, we needed a robust item system (pickups, weights, projectiles, stationary traps, shields, homing flyers, hit reactions, and AI decision logic) customized for Dhaka street racing aesthetics while preserving strict gameplay invariance when items and hazards are disabled (`RaceRules { itemsEnabled: false, hazardsEnabled: false }`).
- **Decision:**  
  1. **SuperTuxKart C++ Architecture Port:** Ported probability distributions and algorithms from SuperTuxKart's `data/powerup.xml`, `powerup_manager.cpp`, `flyable.cpp`, and `skidding_ai.cpp`.
  2. **1000-Sum Rank-Based Distribution:** Implemented in `src/config/itemWeights.race.json` across 8 positions (Rank 1: heavy defensive bias with 35% Mishti Doi, 25% Parasol Shield, 0% Ghuri Kite; Rank 8: catch-up bias with 45% Malai Cha, 25% Ghuri Kite).
  3. **Dhaka Street Item Theming (`items.race.db.ts`):**
     - *Malai Cha:* +6.0 m/s sustained nitro boost for 2.5s.
     - *Naga Fuchka:* Ballistic red-chili projectile (35 m/s, forward or backward, 3 wall bounces).
     - *Mishti Doi:* Stationary sweet yogurt trap causing spin-out.
     - *Parasol Shield:* 7.5s protective dome deflecting 1 projectile.
     - *Rickshaw Bell:* Radial sonic shockwave stunning rivals within 6m.
     - *Ghuri Kite:* Homing kite flyer targeting 1st place leader with 38 m/s speed and explosion hit.
  4. **Item Boxes & Hazards:** Data-driven `items.json` generated by `npm run race:items` with 16 tiffin boxes (3.5s respawn) and street hazards (crossing rickshaws, fallen Krishnachura flower petal slicks).
  5. **HitReaction State Machine (`HitReaction.ts`):** Deterministic states (`spin_out`, `explosion`, `squash`, `stun`), speed damping, control locks, visual juice offsets (yaw spin, tumble pitch, squash scale), and post-hit invulnerability windows.
  6. **AI ItemBrain (`ItemBrain.ts`):** Ported from STK `skidding_ai.cpp` with forward projectile targeting cone ($< 38$m, $|\Delta\theta| < 0.38$ rad), backward defense ($< 16$m, $|\Delta\theta| < 0.30$ rad), and shield deployment on incoming threat.
  7. **Strict Gameplay Invariance:** When `itemsEnabled = false`, zero item allocations occur, keeping all M2/M3/M4 goldens bit-identical.
- **Consequences:**  
  30-race Monte-Carlo balancing simulation achieves 99.6% field completion with active items/hazards, strict tier monotonicity, and determinism. Verified by 32 unit tests in `race_m5.test.ts` and 9-phase E2E Playwright test in `test_race_m5.js`.






