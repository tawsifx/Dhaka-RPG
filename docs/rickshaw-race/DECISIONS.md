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
