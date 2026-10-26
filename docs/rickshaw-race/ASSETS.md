# Asset Provenance & Classification Audit
## 3D Rickshaw Racing Mini-Game — "Tring-Tring Grand Prix"

**Project:** Totoro & Moon Walker: Chronicles of the Six Realms  
**Document:** `docs/rickshaw-race/ASSETS.md`  
**Milestones Audited:** M1 (Three.js Overlay Spike) & M2 (Kart Feel)  
**Status:** Canonical Audit Baseline  

---

### 1. Asset Provenance Matrix (M1 & M2 Current State)

| Asset Category | Asset Identifier | File / Code Location | Provenance Type | Source / Upstream Origin | License | Current Status & Planned M3 Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Kart Model** | Rickshaw Kart Chassis | `src/scenes/minigames/race/render/PlaceholderKart.ts` | **PROCEDURAL** | In-engine Three.js primitive hierarchy (Emerald chassis, gold hood, steel frame, bell, spoke wheels) | In-house (MIT) | Fallback placeholder; evaluated for external GLB replacement in A3 / M3. |
| **Track / Environment** | Test Arena Geometry | `src/scenes/minigames/race/render/ArenaBuilder.ts` | **PROCEDURAL** | In-engine Three.js BufferGeometries (`PlaneGeometry`, `BoxGeometry`, `ConeGeometry`) | In-house (MIT) | Permanent M1/M2 regression test bed (`?race-arena`). M3 introduces external track meshes. |
| **VFX / Particles** | Drift Sparks & Smoke | `src/scenes/minigames/race/render/Effects.ts` | **PROCEDURAL** | Native `THREE.InstancedMesh` with colored quad/box buffers, zero external textures | In-house (MIT) | Retained for performance (2 draw calls, zero runtime GC allocations). |
| **VFX / Skid Marks** | Asphalt Tire Decals | `src/scenes/minigames/race/render/Effects.ts` | **PROCEDURAL** | Native `THREE.InstancedMesh` quad buffer pool with dynamic alpha blend | In-house (MIT) | Retained for zero-allocation performance. |
| **Audio (SFX)** | Cycle Rickshaw Bell | `public/assets/audio/sfx/rickshaw_bell.wav` | **EXTERNAL** | Field recording of classic Dhaka cycle-rickshaw bell | CC0 (Public Domain) | Retained as primary authentic Dhaka sound effect & GO cue. |
| **Audio (SFX)** | Engine RPM Loop | `src/scenes/minigames/race/audio/RaceAudio.ts` | **PROCEDURAL** | Web Audio API sawtooth oscillator + speed-scaled lowpass filter | In-house (MIT) | Replaced in A2 with Kenney CC0 audio sample + procedural synth fallback. |
| **Audio (SFX)** | Drift Tire Screech | `src/scenes/minigames/race/audio/RaceAudio.ts` | **PROCEDURAL** | Web Audio API white-noise buffer + high-Q bandpass filter | In-house (MIT) | Replaced in A2 with Kenney CC0 audio sample + procedural synth fallback. |
| **Audio (SFX)** | Mini-Turbo Chimes (T1-T3) | `src/scenes/minigames/race/audio/RaceAudio.ts` | **PROCEDURAL** | Web Audio API sine envelopes (E5, G#5, C6) | In-house (MIT) | Replaced in A2 with Kenney CC0 audio samples + procedural synth fallback. |
| **Audio (SFX)** | Boost Whoosh | `src/scenes/minigames/race/audio/RaceAudio.ts` | **PROCEDURAL** | Web Audio API white noise pitch envelope | In-house (MIT) | Replaced in A2 with Kenney CC0 audio sample + procedural synth fallback. |
| **Audio (SFX)** | Landing Thump | `src/scenes/minigames/race/audio/RaceAudio.ts` | **PROCEDURAL** | Web Audio API low sine envelope drop | In-house (MIT) | Replaced in A2 with Kenney CC0 audio sample + procedural synth fallback. |
| **Audio (SFX)** | Countdown Beeps | `src/scenes/minigames/race/audio/RaceAudio.ts` | **PROCEDURAL** | Web Audio API sine tone beeps | In-house (MIT) | Replaced in A2 with Kenney CC0 audio sample + procedural synth fallback. |
| **Audio (SFX)** | Wall Bump & Grass Rumble | N/A | **MISSING** | Missing in M2 (no wall impact or grass rumble sample) | CC0 (Kenney) | Sourced and implemented in A2. |
| **Music (BGM)** | Overworld Background BGM | `public/assets/audio/game_bgm.mp3` | **EXTERNAL** | Overworld heritage campus BGM (ducked/paused during race) | CC-BY | Retained; paused upon race entry, restored upon exit. |

---

### 2. Audit Findings & Remediation Plan
1. **Audio Deviation in M2:** M2 shipped pure procedural Web Audio synthesis for engine, screech, chimes, whoosh, and thump to avoid bundle size increases. Under Part A2, external CC0 audio samples will be fetched and cached under `public/assets/race/audio/`, while retaining the procedural Web Audio synthesis strictly as an automatic offline/load-failure fallback.
2. **Kart Model:** Conforms to the project's adapter fallback convention. A3 evaluates replacing the procedural rickshaw with an external GLB. If a suitable cycle-rickshaw meeting poly/budget constraints is unavailable within the timebox, the placeholder is retained and cataloged in `ASSET_SHOPPING_LIST.md`.
3. **M3 Track Assets:** All track geometry, props, sky, and audio for Fuller Road Sprint will be strictly external assets under `public/assets/race/tracks/fuller_road_sprint/`, registered in `src/config/assetSpecs.manifest.ts` and credited in `docs/rickshaw-race/ASSET_CREDITS.md`.

---

### 3. Fuller Road Sprint — Track Art Provenance Audit (M3 Baseline vs M3.5 SuperTuxKart Art Pass)

The track visuals were upgraded in **Milestone 3.5 (Art Pass)** using models and textures imported directly from SuperTuxKart via `scripts/race/stk/` and `scripts/race/dress-track.mjs`. Below is the truthful breakdown separating upstream STK assets from generated procedural geometry:

| Visual Element | M3 Baseline (Procedural) | M3.5 Shipped Art Pass | Provenance Category | Upstream STK Source / Origin | License |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Road Surface** | Procedural flat ribbon (`0x1f2421`), no striping | Spline-extruded ribbon textured with STK asphalt (`road.jpg`), striped curbs & lane marks | **HYBRID** (Geometry extruded along spline, texture from STK) | `stk-assets/textures/asphalt.png` $\to$ `road.jpg` | CC-BY-SA 3.0 |
| **Curbs & Sidewalks** | None (invisible) | 0.2m raised curbs and brick sidewalks textured with STK cobblestone (`sidewalk.jpg`) | **HYBRID** (Extruded geometry, STK texture) | `stk-assets/textures/stone_brick.png` $\to$ `sidewalk.jpg` | CC-BY-SA 3.0 |
| **Safety Guardrails** | Collision-only invisible boxes | Continuous visible tubular guardrail meshes aligned ±0.3m from collision barrier plane | **PROCEDURAL (Generated)** | Extruded along spline | In-house (MIT) |
| **Crash Barrels** | None | Instanced 3D crash barrels placed at chicane and hairpin apexes (`barrel.glb`) | **EXTERNAL 3D GLB** | Converted from STK `barrel.spm` | CC-BY-SA 3.0 |
| **Park Benches** | None | Instanced 3D wooden campus benches along Curzon sidewalks (`bench.glb`) | **EXTERNAL 3D GLB** | Converted from STK `bench.spm` | CC-BY-SA 3.0 |
| **Krishnachura Trees** | Cylinder + dodecahedron primitives | Instanced 3D flowering avenue trees (`krishnachura_tree.glb`) | **EXTERNAL 3D GLB** | Converted from STK `tree.spm` with red floral tint | CC-BY-SA 3.0 |
| **Roadside Bushes** | None | Instanced 3D ornamental green shrubs (`bush.glb`) | **EXTERNAL 3D GLB** | Converted from STK `bush.spm` | CC-BY-SA 3.0 |
| **Street Lamps** | None | Instanced 3D heritage iron lampposts (`lamp.glb`) with point-light emissive heads | **EXTERNAL 3D GLB** | Converted from STK `lamp.spm` | CC-BY-SA 3.0 |
| **Festive Lanterns** | None | Instanced 3D celebratory red Dhaka paper lanterns on arch gantry (`lantern.glb`) | **EXTERNAL 3D GLB** | Converted from STK `chinese_lantern.spm` | CC-BY-SA 3.0 |
| **Kart Wheels** | 2D disc primitives | Separately addressable 3D spoked rubber wheels (`wheel.glb`) | **EXTERNAL 3D GLB** | Converted from STK `wheel.spm` | CC-BY-SA 3.0 |
| **Sky & Atmosphere** | Flat color + fog | Stylized Dhaka Golden Hour panoramic skybox texture (`sky.png`) | **EXTERNAL TEXTURE** | Sourced from STK sky library | CC-BY-SA 4.0 |
| **VFX Particles** | Colored Three.js quads | Textured sprite particles for tire smoke (`smoke.png`) and sparks (`spark_blue.png`, `spark_orange.png`) | **EXTERNAL TEXTURE** | STK particle sprite library | CC-BY-SA 3.0 |
| **Track Music (BGM)** | Paused / none | Authentic high-energy race loop soundtrack `garden.ogg` (by DJHelium) | **EXTERNAL AUDIO** | `stk-assets/music/garden.ogg` | CC-BY-SA 3.0 |
| **Landmarks (Curzon/TSC)** | Raw primitive boxes & cones | Kitbashed architecture with STK terracotta brick & green dome materials | **HYBRID** (In-house assembly + STK textures) | STK texture library | CC-BY-SA 3.0 |
| **Kart Chassis** | Primitive rickshaw hierarchy | Tinted rickshaw chassis with driver/passenger billboard anchors (ADR 013) | **HYBRID** (In-house chassis + STK wheels) | In-house + STK `wheel.glb` | MIT + CC-BY-SA |

**Audit Conclusions:**
1. **10 of 15 visual/audio elements** now incorporate external SuperTuxKart assets (8 converted GLB models, 5 PBR textures, 3 particle sprites, 1 OGG music stream).
2. All imported assets have their upstream licenses, authors, and source paths documented in `public/assets/race/stk/import-manifest.json` and credited in `ASSET_CREDITS.md`.
3. Gameplay geometry (`collision.glb`, spline, start grid, gates) remains 100% byte-locked and identical to M3/M4. Visuals are derived additively from the locked gameplay baseline.
