# Repository Audit: Three.js Integration Spike — "Tring-Tring Grand Prix"

**Date:** October 26, 2026  
**Milestone:** M1 — Architecture & Integration Proof of Concept  
**Branch / Target:** `main` (Cloudflare Pages `moon-walkers-day` & Vercel Mirror)

---

## 1. Executive Summary

This audit establishes the baseline architectural integration points for Milestone 1 of the 3D rickshaw racing mini-game ("Tring-Tring Grand Prix") within *Totoro & Moon Walker: Chronicles of the Six Realms*. 

Milestone 1 demonstrates a lazy-loaded Three.js 3D viewport rendered onto a dedicated `<canvas>` overlay directly above Phaser 3's `#phaser-mount`, launched via the Rickshaw Stand interaction (`x: 1648, y: 816`) in Dhaka Valley. The spike achieves:
- Zero initial bundle growth via dynamic chunking.
- Complete state preservation of Moon Walker, Totoro, NPC schedules, game calendar, and open UI.
- Deterministic cleanup (`dispose()`) of all WebGL and DOM allocations across repeated cycles.

---

## 2. Codebase Integration Points Audit

### 2.1 Scene Lifecycle (`DhakaValleyScene.ts`)
- **Location:** `src/scenes/DhakaValleyScene.ts` (~4,690 lines) coordinating Phaser rendering, physics, world layers, NPC entities, and interactive props.
- **Entry Point:** `registerInteract(1648, 816, 'prop-rickshaw', 'Grand Dhaka Rickshaw Tour 🛺', 92, () => this.interactRickshawTour())`.
  - Currently invokes `RickshawTourEngine.interact(this)`.
  - In M1, this interaction presents a dialogue choice hub via `UI.startDialogue`:
    - Option 1: "Grand Rickshaw Tour (Sightseeing)" — preserves existing `RickshawTourEngine` execution verbatim.
    - Option 2: "Race (Beta) — Tring-Tring Grand Prix 🏁" — triggers dynamic `import()` of `RickshawRaceEngine`, passes current scene, and awaits `RaceResult`.
- **Pause & Resume Lifecycle:**
  - Phaser's scene manager supports `scene.scene.pause()` and `scene.scene.resume()`.
  - Pausing the scene suspends Phaser's internal ticker for `DhakaValleyScene`, freezing physics simulation, particle emitters, camera tweens, and the primary `update(time, delta)` loop.
  - Setting `scene.cutsceneLocked = true` prevents accidental click/interaction re-entry while race initialization/destruction transitions occur.

### 2.2 Time & Living-World Schedule Systems
- **`TimeCalendarSystem.ts` (`src/systems/TimeCalendarSystem.ts`):**
  - Tracks 24-hour day/night clock, season cycles, and time phases (`calculateTimePhase`).
  - Contains native `setPaused(paused: boolean)` method.
  - Calling `timeCalendar.setPaused(true)` guarantees that time does not progress, accumulator does not tick, and minute listeners are not fired during the race.
- **`ScheduleSystem.ts` (`src/systems/ScheduleSystem.ts`):**
  - Drives all 38 NPC autonomous routines across maps with in-house A* navigation (`NpcNavigator.ts`) and stepping controller (`NpcMover.ts`).
  - Its `update()` loop already checks `const isPaused = UI.isOpen() || this.scene.cutsceneLocked;`. When paused or cutscene locked, NPC motion and waypoint progression halt cleanly.
  - Freezing `DhakaValleyScene` ensures NPC world positions, facing directions, and active path steps remain frozen in place without state drift.

### 2.3 Input Handling
- **Phaser Keyboard Input:** `DhakaValleyScene` binds cursors, WASD keys, Space, and number hotbars. When the scene is paused, Phaser disables active key polling on the paused scene, preventing Moon Walker movement.
- **Race Input System (`RaceInput.ts`):**
  - Listens directly to DOM window events (`keydown`, `keyup`) on the window while the race overlay is focused.
  - Standardized bindings: W/↑ (accelerate), S/↓ (brake/reverse), A/D/←/→ (steer), Space (bell), Escape (exit race).
  - Cleanly detaches all event listeners on race shutdown, ensuring keys pass back through to Phaser without lingering stuck key states.

### 2.4 Audio Pipeline (`SoundEngine.ts`)
- **Architecture:** Web Audio API synthesizer + dual HTMLAudioElement streaming decks (`deckA`, `deckB`) connected to `musicBusGain` and `sfxBusGain` for sample-accurate crossfading.
- **Rickshaw SFX:** `SoundEngine.rickshawBell()` already exists, playing `public/assets/audio/rickshaw_bell.wav` (with Web Audio synth dual-tone fallback).
- **Ducking/Restoration:**
  - Add `SoundEngine.duckBGM(ratio, fadeMs)` and `SoundEngine.restoreBGM(fadeMs)` using exponential/linear AudioParam ramps on `musicBusGain`.
  - On race entry, overworld BGM ducks to 15% volume (or pauses); on race exit, volume restores smoothly to the user's configured master music volume.

### 2.5 UI Controller & DOM Overlay (`UIController.ts`)
- **HUD Hierarchy in `index.html`:**
  - `#phaser-mount`: Root container for Phaser WebGL/Canvas (`z-index: 0`).
  - `#top-hud`, `#minimap-panel`, `#bottom-hud`: Overworld DOM elements (`z-index: 100-300`).
  - `#dialogue-overlay`: Fullscreen dialogue overlay (`z-index: 1500`).
- **Race Overlay Mount Strategy:**
  - Mount a dedicated container `#race-container` as a sibling in `document.body` or `#phaser-mount` with `position: fixed; inset: 0; z-index: 1000;`.
  - Contains `<canvas id="race-canvas">`, `#race-hud` (speedometer, lap/exit hints), touch control buttons, and `#race-debug-overlay`.
  - Overworld HUD elements (`#top-hud`, `#minimap-panel`, `#bottom-hud`) are hidden during race mode (`hidden = true`) and unhidden on exit.

### 2.6 Mobile Support (`MobileSupport.ts`)
- **Mobile Compatibility:**
  - Respects `100dvh` CSS viewport sizing, touch action manipulation, screen wake lock (`requestWake()`), and orientation change listener.
  - On mobile/touch devices, `RaceHud` renders prominent on-screen buttons:
    - Left thumb: Steer Left (`◀`), Steer Right (`▶`).
    - Right thumb: Accelerate (`GAS`), Brake/Reverse (`BRAKE`), Bell (`🔔`).
    - Top bar: Exit Race (`ESC / ✖`).

---

## 3. Bundle-Size Baseline & Chunking Strategy

### 3.1 Pre-Spike Production Bundle Baseline
Generated via `npm run build` on Vite 8.3.4 (ESM + Rolldown code-splitting):

| Chunk Name | Output File | Size | Gzip Size | Role |
| :--- | :--- | :--- | :--- | :--- |
| `index.html` | `dist/index.html` | 18.68 kB | 6.88 kB | Entry HTML + SVG icons |
| `index.css` | `dist/assets/index-*.css` | 25.26 kB | 6.14 kB | Global styling & HUD |
| `runtime` | `dist/assets/rolldown-runtime-*.js` | 0.59 kB | 0.36 kB | Rolldown loader runtime |
| `index` | `dist/assets/index-*.js` | 1.58 kB | 0.90 kB | App bootstrap entry |
| `graphics-characters` | `dist/assets/graphics-characters-*.js` | 49.78 kB | 11.29 kB | Procedural character generator |
| `graphics-creatures` | `dist/assets/graphics-creatures-*.js` | 55.31 kB | 12.34 kB | Procedural boss & mob generator |
| `game-systems` | `dist/assets/game-systems-*.js` | 104.60 kB | 35.21 kB | Systems, audio, UI, state |
| `game-db` | `dist/assets/game-db-*.js` | 139.43 kB | 38.47 kB | Databases, schedules, items |
| `graphics-world` | `dist/assets/graphics-world-*.js` | 154.59 kB | 40.32 kB | Tilesets & landmark generators |
| `scene-dhaka` | `dist/assets/scene-dhaka-*.js` | 226.16 kB | 73.21 kB | Main overworld scene |
| `phaser` | `dist/assets/phaser-*.js` | 1,190.68 kB | 317.07 kB | Phaser 3 engine bundle |
| **Total Initial Load** | — | **1,966.07 kB** | **522.19 kB** | Critical page load |

### 3.2 Target Post-Spike Bundle Architecture
- Pin `three` to stable `0.186.1` and `@types/three` to `0.186.0`.
- Three.js (~600 kB minified) and `RickshawRaceEngine` must **NEVER** be statically imported into `main.ts` or `DhakaValleyScene.ts`.
- In `vite.config.ts`, define dedicated Rolldown code-splitting groups:
  ```ts
  {
    name: 'three',
    test: /node_modules[\\/]three/
  },
  {
    name: 'race-engine',
    test: /src[\\/]scenes[\\/]minigames[\\/]race/
  }
  ```
- In `DhakaValleyScene.ts`, load via dynamic `const { RickshawRaceEngine } = await import('./minigames/race/RickshawRaceEngine');`.
- Initial load bundle size MUST remain unchanged within sub-kilobyte variance (only small loader metadata).

---

## 4. Architectural Verification Plan
1. **Module Separation:** Pure math in `KartController.ts` and `FixedStepLoop.ts` with 0 Three.js imports, tested via 15+ Vitest unit tests.
2. **Lifecycle & Memory Proof:** 10 consecutive enter/exit cycles tracked via `renderer.info.memory` (geometries: 0, textures: 0) and DOM node counting.
3. **E2E Playwright Automation:** `scripts/test_race_m1.js` executing navigation to the Rickshaw Stand, dialogue selection, canvas mounting, driving input verification, bell trigger, Esc exit, and overworld state equality assertion.
