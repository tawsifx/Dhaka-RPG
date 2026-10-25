# Architectural Decision Records (ADRs)
## Three.js Integration Spike — "Tring-Tring Grand Prix"

**Project:** Totoro & Moon Walker: Chronicles of the Six Realms  
**Milestone:** M1 Architecture & Integration Spike  
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
  - `core/KartController.ts`: 100% pure physics/kinematics math. Operates on pure 2D/3D vectors without importing `three` or `phaser`. Can be instantiated and simulated at arbitrary frequencies in Vitest tests.
  - `core/FixedStepLoop.ts`: Fixed-timestep physics accumulator (default 60 Hz = 16.66ms) with interpolation alpha calculation, spiral-of-death clamp (max 5 substeps), and delta clamping. Zero engine imports.
  - `render/RaceRenderer.ts`: Encapsulates Three.js `WebGLRenderer`, `Scene`, directional & ambient lights, ground plane, fog, window resize handling, and `dispose()`.
  - `render/ChaseCamera.ts`: Spring-arm camera mathematics and FOV kick based on normalized kart speed.
  - `render/PlaceholderKart.ts`: Visual kart model (labeled placeholder box with wheel indicators and orientation marker, with extension hook for external GLTF/GLB loading).
  - `input/RaceInput.ts`: Handles keyboard (WASD/Arrows/Space/Esc) and touch buttons with clean listener detachment.
  - `ui/RaceHud.ts`: DOM HUD overlay displaying speed, bell prompt, exit button, and touch controls for mobile.
  - `debug/RaceDebugOverlay.ts`: F4 real-time telemetry HUD overlay and `window.__race` console developer API.
  - `RickshawRaceEngine.ts`: Lifecycle coordinator orchestrating enter, loop, exit, and complete disposal.
  - `index.ts`: Clean barrel export.

- **Consequences:**  
  - 100% of core physics, simulation loop, and result structures are verifiable via Vitest in milliseconds without mocking WebGL or browser canvases.
  - Clean boundary for Milestone 2+ enhancements (drifting, track colliders, AI competitors, item pickups).
