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

### 3. Fuller Road Sprint — Track Art Provenance Audit (M4 Part A2, REPORT ONLY)

Audit method: read `scripts/race/build-track.mjs` (the only producer of `visual.glb` / `collision.glb`) and the race renderer. **Result: every visual element of the track is PROCEDURAL** (Three.js primitives emitted by an offline script). Nothing is sourced from an external asset pack, contradicting the M3 external-art rule and the wording of ADR 016. The files are small (visual 200.4 kB / 1,316 m lap) precisely because they contain only a handful of boxes, cones and cylinders. No art was replaced in M4 (explicitly out of scope); the shortfalls are catalogued in `ASSET_SHOPPING_LIST.md` and the remediation is ADR 017.

| Visual element | What actually ships | Where produced | Provenance | Source / original file | Credit |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Road surface | Flat ribbon along the spline, single dark `MeshStandardMaterial` (`0x1f2421`), **no centre striping despite the code comment**, fixed 16 m width (ignores per-point spline widths) | `createRoadRibbon()` in `build-track.mjs` | **PROCEDURAL** | — | In-house (MIT) |
| Curbs | **None** (not present in `visual.glb`) | — | **MISSING** | — | — |
| Sidewalks / verges | **None**; infield is the hidden collision grass plane / renderer ground | — | **MISSING** | — | — |
| Barriers / walls | **Collision-only** (`wall_barrier` boxes every ~19 m, **not rendered**, with gaps between posts) | `createWallBarriers()` | **PROCEDURAL (invisible)** | — | In-house (MIT) |
| Landmark: Curzon Hall | 12 box pillars + cone "domes" + one arch box (`matCurzonBrick`, `matCurzonKiosk`) | `createCurzonPillars()` | **PROCEDURAL** | — | In-house (MIT) |
| Landmark: TSC rotunda | Cylinder + cone + 6 umbrella cones/poles | `tscRotunda` block | **PROCEDURAL** | — | In-house (MIT) |
| Trees (Krishnachura) | 7 trunk cylinders + dodecahedron foliage, uniform colour | `avenueTrees` block | **PROCEDURAL** | — | In-house (MIT) |
| Flyover bridge | 4 pier cylinders; the deck is the road ribbon itself | `bridgePiers` | **PROCEDURAL** | — | In-house (MIT) |
| Petal boost pads | Emissive amber planes | `matPetalPadVisual` | **PROCEDURAL** | — | In-house (MIT) |
| Props (cones, signage, crowd, lanterns on poles) | **None** | — | **MISSING** | — | — |
| Sky | Flat `Color(0xbfe3f7)` background + `FogExp2` | `RaceRenderer.ts` | **PROCEDURAL** | — | In-house (MIT) |
| Paper lantern (rescue) | **No visual exists** — `RescueSystem` only teleports; "paper-lantern rescue" is a name, not an asset | — | **MISSING** | — | — |
| Kart | Primitive rickshaw hierarchy | `PlaceholderKart.ts` | **PROCEDURAL** (ADR 013) | — | In-house (MIT) |
| Race SFX | 8 Kenney `.ogg` samples + `rickshaw_bell.wav` | `public/assets/race/audio/` | **EXTERNAL** | Kenney Racing/Digital Audio packs, project field recording | CC0 (see `ASSET_CREDITS.md`) |
| Track music | Overworld `game_bgm.mp3` is paused; no per-track music | — | **MISSING** (per-track music is out of scope until later milestone) | — | — |

**Findings**
1. 0 of 11 visual elements are external. 4 expected elements (curbs, sidewalks, props, lantern) do not exist at all, and the barriers are invisible.
2. The road ribbon ignores spline width control points (hairpin declared 22 m wide is built 16 m wide), and collision barriers have gaps — both are M3 defects that affect AI line planning (M4 racing line deliberately stays inside the 16 m ribbon with a safety margin).
3. No track-sourcing ADR and no GLB budget/compression ADR existed; both are now recorded (ADR 017, ADR 018).
