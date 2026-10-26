# Asset Credits & Technical Provenance
## 3D Rickshaw Racing Mini-Game — "Tring-Tring Grand Prix"

**Project:** Totoro & Moon Walker: Chronicles of the Six Realms  
**Milestones:** M1 & M2  
**Date:** October 26, 2026

---

### 1. 3D Meshes & Procedural Geometry
- **Rickshaw Kart Chassis:** Custom procedural Three.js hierarchy modeled in `PlaceholderKart.ts` conforming to the project's external-asset fallback convention.
  - Emerald Green chassis body (`#15803d`)
  - Amber Gold passenger hood canopy (`#f59e0b`)
  - Crimson padded seat bench (`#b91c1c`)
  - Dark Steel cycle frame & handlebar (`#1e293b`)
  - Yellow Rickshaw Bell (`#facc15`)
  - 3-Wheel rubber tires with chrome spoke pivots
- **Arena Track & Terrain:** Built procedurally in `ArenaBuilder.ts` using native Three.js buffer geometries (`PlaneGeometry`, `RingGeometry`, `CircleGeometry`, `BoxGeometry`, `ConeGeometry`).

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

### 4. Fuller Road Sprint Track Art (M3, audited in M4 A2)
- **All track visuals are procedural** (`scripts/race/build-track.mjs`, in-house, MIT): road ribbon, Curzon Hall pillars/kiosk domes, TSC rotunda, Krishnachura trees, flyover piers, petal pads. **No third-party asset is used in `visual.glb` or `collision.glb`.** See `ASSETS.md` §3 and ADR 017 for the remediation plan.

### 5. Rival Driver Billboards (M4)
- Rival and player billboards sample the project's own existing character sheets (`public/assets/sprites/characters/*.png`; credits remain those recorded for the overworld characters in `GAME_CONTEXT.md` §12). No new art was added. Missing/unusable sheets fall back to a tinted name-tag marker.
- Podium: labeled placeholder blocks (no external model yet; see `ASSET_SHOPPING_LIST.md`).
