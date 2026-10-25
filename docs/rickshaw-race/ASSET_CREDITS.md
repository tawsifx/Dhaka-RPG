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
- **Rickshaw Bell:** `public/assets/audio/sfx/rickshaw_bell.wav` (CC0 public domain field recording of classic Dhaka cycle-rickshaw bell, integrated via `SoundEngine`).
- **Engine Synthesizer:** Real-time Web Audio API procedural synthesis in `RaceAudio.ts` using a sawtooth oscillator routed through a low-pass biquad filter with speed-proportional frequency scaling (55 Hz to 240 Hz).
- **Drift Screech:** Procedural white-noise audio buffer source routed through a high-Q bandpass filter (1200 Hz).
- **Chimes & Whooshes:** Procedural sine and triangle wave envelopes synthesized at runtime via Web Audio API. Zero external audio file payload.
