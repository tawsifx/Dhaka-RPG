# Asset Credits & Technical Provenance
## 3D Rickshaw Racing Mini-Game — "Tring-Tring Grand Prix"

**Project:** Totoro & Moon Walker: Chronicles of the Six Realms  
**Milestones:** M1 & M2  
**Date:** October 26, 2026

---

### 1. 3D Kart Models & In-Engine SPM Runtime Loader
- **SuperTuxKart SPM Native Loader (`SPMLoader.ts`):** Direct Three.js binary parser for native SuperTuxKart `.spm` models at runtime, eliminating mandatory pre-conversion to glTF:
  - `public/assets/race/stk/spm/tux.spm` — STK Tux mascot kart and textures. License: GNU GPL v3+ / CC-BY-SA 3.0.
  - `public/assets/race/stk/spm/wilber.spm` — STK Wilber mascot kart and textures. License: GNU GPL v3+ / CC-BY-SA 3.0.
  - `public/assets/race/stk/spm/lantern.spm` — STK Chinese red lantern for kart rescue carrier. License: CC-BY-SA 3.0.
  - `public/assets/race/stk/spm/*.spm` — Library props (lamps, benches, trees, bushes, barrels, start gantry, clockwork, waterfall, monorail, gondola, traffic cars).
  - Synchronous procedural rickshaw fallback retained in `PlaceholderKart.ts` for headless test runners.

---

### 2. Particle Systems & VFX
- **Instanced Mesh Particle Pool:** Implemented via `THREE.InstancedMesh` with dynamic matrix and color buffers in `Effects.ts`. Zero external image dependencies required.
  - Drift Sparks: Procedural box particles tinted Blue (`#38bdf8`), Orange (`#f97316`), and Purple (`#a855f7`).
  - Tire Smoke & Off-Road Dust: Procedural grayscale/green puffs.
  - Boost Flames: High-velocity orange/yellow flame particles.
  - Water Splash: Cerulean blue droplets (`#38bdf8`).
  - Skid Marks: Instanced planar quads with dark asphalt alpha blend (`#111827`, opacity 0.45).

---

### 3. Audio & SFX
- **Rickshaw Bell & GO Cue:** `public/assets/audio/sfx/rickshaw_bell.wav` (CC0 public domain field recording of classic Dhaka cycle-rickshaw bell, integrated via `SoundEngine`).
- **Engine Loop:** `public/assets/race/audio/engine_loop.ogg` — Kenney Racing Starter Kit (`engine.ogg`, CC0 1.0 Universal). Pitch and playbackRate modulated dynamically by speed ($0.7\times$ to $2.0\times$).
- **Drift Tire Screech:** `public/assets/race/audio/drift_screech.ogg` — Kenney Racing Starter Kit (`skid.ogg`, CC0 1.0 Universal).
- **Wall Bump & Obstacle Impact:** `public/assets/race/audio/wall_bump.ogg` — Kenney Racing Starter Kit (`impact.ogg`, CC0 1.0 Universal).
- **Landing Thump:** `public/assets/race/audio/landing_thump.ogg` — Kenney 3D Platformer Starter Kit (`land.ogg`, CC0 1.0 Universal).
- **Boost Whoosh:** `public/assets/race/audio/boost_whoosh.ogg` — Kenney 3D Platformer Starter Kit (`jump.ogg`, CC0 1.0 Universal).
- **Countdown Beeps:** `public/assets/race/audio/countdown_beep.ogg` — Kenney Digital Audio Pack (`twoTone1.ogg`, CC0 1.0 Universal).
- **Mini-Turbo Tier 1 Chime:** `public/assets/race/audio/turbo_chime_1.ogg` — Kenney Digital Audio Pack (`twoTone2.ogg`, CC0 1.0 Universal).
- **Mini-Turbo Tier 2 Chime:** `public/assets/race/audio/turbo_chime_2.ogg` — Kenney Digital Audio Pack (`threeTone1.ogg`, CC0 1.0 Universal).
- **Mini-Turbo Tier 3 Chime:** `public/assets/race/audio/turbo_chime_3.ogg` — Kenney Digital Audio Pack (`zapThreeToneUp.ogg`, CC0 1.0 Universal).
- **Grass/Mud Off-Road Rumble:** `public/assets/race/audio/grass_rumble.ogg` — Kenney 3D Platformer Starter Kit (`walking.ogg`, CC0 1.0 Universal).
- **Procedural Synthesizer Fallbacks:** Retained in `RaceAudio.ts` as automatic offline/network-failure fallbacks (sawtooth RPM oscillator, white-noise bandpass filter, and sine envelopes). Zero external dependencies required if samples fail to load.

---

### 4. Fuller Road Sprint Track Art & External Candela City Architecture
- **SuperTuxKart Candela City Complete Environment & Monuments:**
  - **Candela City 3D Metropolis (`candela_city_track.spm` / `candela_city_track.glb`):** Full urban circuit geometry, modern architectural facades, neoclassical pavilions, waterfront arches, and skyline surrounding Fuller Road Sprint. Converted from STK `tracks/candela_city/candela_city_track.spm`. License: CC-BY-SA 3.0 / GNU GPL v3+ (SuperTuxKart Team).
  - **Start/Finish Arch Gantry & Neon Patterns:** `public/assets/race/stk/models/stk_start_sign.glb`, converted from STK `tracks/candela_city/start_sign.spm` and `start_sign_pattern.spm`.
  - **Mechanical Clocktower Monument:** `public/assets/race/stk/models/stk_clockwork.glb`, converted from STK `tracks/candela_city/clockWork_a.spm` and `clockWork_b.spm`.
  - **Glass Observation Elevator Tower:** `public/assets/race/stk/models/stk_elevator.glb`, converted from STK `tracks/candela_city/elevator_a1.spm`.
  - **Caracalla Urban Waterfall Monument:** `public/assets/race/stk/models/stk_waterfall.glb`, converted from STK `tracks/candela_city/caracalla_waterfall.spm`.
  - **Monorail Transit System:** `public/assets/race/stk/models/stk_toy_train.glb`, converted from STK `tracks/candela_city/toy_train.spm`.
  - **Aerial Transport Gondola:** `public/assets/race/stk/models/stk_gondola.glb`, converted from STK `tracks/candela_city/gondola.spm`.
  - **Roadside Traffic Vehicles:** `public/assets/race/stk/models/stk_traffic_car.glb`, converted from STK `tracks/candela_city/car_traffic.spm`.
  - **Flyover Elevated Bridge:** `public/assets/race/stk/models/stk_bridge.glb`, converted from STK Zen Garden `bridge_LOD50.spm`.
  - **Road Asphalt Texture:** `public/assets/race/stk/textures/road.jpg`, sourced from STK Zen Garden `blackRoad.jpg`. Applied with wrapping repeat ($4 \times 40$) to `visual_road`.
  - **Sidewalk Brick Texture:** `public/assets/race/stk/textures/sidewalk.jpg`, sourced from STK Hacienda `hacienda_ground.jpg`. Applied with wrapping repeat ($2 \times 40$) to `visual_sidewalks`.
  - **Skybox Background:** `public/assets/race/stk/textures/sky.png`, sourced from STK Candela City `sky.png`.
  - **Scenery Props:** Converted from STK library models: Modern Street Lamps (`lamp.glb`), Red Lanterns (`lantern.glb`), Park Benches (`bench.glb`), Krishnachura Trees (`krishnachura_tree.glb`), Fitch Barrels (`barrel.glb`), Bushes (`bush.glb`), and Barrier Posts (`post.glb`).
- **Zero Procedural Visual Primitives:** All previous procedural landmark primitives (Curzon boxes/cones, start arch boxes, TSC cylinders/spheres, Shaheed Minar columns) have been completely removed and replaced by authentic SuperTuxKart 3D architectural assets. All gameplay collision and centerline geometry strictly locked (`gameplay.lock.json`).

### 5. Rival Driver Billboards (M4)
- Rival and player billboards sample the project's own existing character sheets (`public/assets/sprites/characters/*.png`; credits remain those recorded for the overworld characters in `GAME_CONTEXT.md` §12). No new art was added. Missing/unusable sheets fall back to a tinted name-tag marker.
- Podium: labeled placeholder blocks (no external model yet; see `ASSET_SHOPPING_LIST.md`).
