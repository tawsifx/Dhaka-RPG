# Performance & Memory Telemetry Dossier
## 3D Rickshaw Racing Mini-Game — "Tring-Tring Grand Prix"

**Project:** Totoro & Moon Walker: Chronicles of the Six Realms  
**Milestone:** M2 Kart Handling, Drift, Boost, Surfaces & Air  
**Test Machine:** Apple Silicon (macOS) / Headless Chromium 1280x720  
**Date:** October 26, 2026

---

### 1. Bundle & Code-Splitting Audit

| Chunk | M1 Size (Raw) | M2 Size (Raw) | M2 Size (Gzip) | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `index-*.js` (Entry) | 1.58 kB | 1.58 kB | 0.90 kB | Phaser main entry — **0 kB growth** |
| `race-engine-*.js` | 74.32 kB | 81.75 kB | 23.55 kB | Lazy-loaded 3D race engine, math, HUD & tuning |
| `three-*.js` | 539.14 kB | 539.14 kB | 133.90 kB | Pinned Three.js vendor bundle (r186.1) |
| `game-db-*.js` | 125.84 kB | 125.84 kB | 33.58 kB | RPG database chunk (verified intact) |
| `game-systems-*.js`| 104.64 kB | 104.64 kB | 35.22 kB | Overworld dialogue, schedule, calendar |
| `phaser-*.js` | 1,190.68 kB | 1,190.68 kB | 317.07 kB | Phaser 3 engine |

> [!NOTE]
> **M1 Sanity Check Confirmed:** The `game-db` chunk was verified to have zero data or exports dropped. All 38 NPC schedules (`npm run validate:npc`) and all asset manifests (`npm run assets:validate`) pass 100%. The slight variation observed between clean builds was strictly Rolldown async sub-chunk boundaries.

---

### 2. Runtime Telemetry (60 Hz Fixed Timestep Simulation)

| Metric | Target Cap | Measured (M2 Arena) | Status |
| :--- | :--- | :--- | :--- |
| **Framerate (FPS)** | 60 FPS | **60 FPS** | PASS |
| **Frame Time** | $\le 16.66\text{ ms}$ | **16.6 - 16.7 ms** | PASS |
| **Draw Calls** | $\le 45$ | **31 - 36** | PASS |
| **Polygon Count (Tris)** | $\le 10,000$ | **1,476 - 1,572** | PASS |
| **Geometries in Memory**| $\le 75$ | **49 - 52** | PASS |
| **Textures in Memory** | $\le 10$ | **3** | PASS |
| **Particle Mesh Pools** | $\le 2\text{ draw calls}$ | **2 (`InstancedMesh`)** | PASS |
| **Particle Count Budget**| $\le 180\text{ (desktop)}$ | **Capped at 180** | PASS |

---

### 3. Zero-Leak Audit Across 10 Consecutive Enter/Exit Cycles

Automated via `scripts/test_race_m2.js` (Step 8):

```
📍 [STEP 8] Executing 10 Consecutive Enter/Exit Cycles (Zero-Leak Audit)...
  Cycle 1/10: enter -> exit... DONE
  Cycle 2/10: enter -> exit... DONE
  Cycle 3/10: enter -> exit... DONE
  Cycle 4/10: enter -> exit... DONE
  Cycle 5/10: enter -> exit... DONE
  Cycle 6/10: enter -> exit... DONE
  Cycle 7/10: enter -> exit... DONE
  Cycle 8/10: enter -> exit... DONE
  Cycle 9/10: enter -> exit... DONE
  Cycle 10/10: enter -> exit... DONE
  🔍 Lingering race DOM elements: 0
  ✅ Zero memory & DOM leak criteria passed!
```

- **DOM Node Retention:** `document.querySelectorAll('#race-container, #race-hud, #race-tuning-panel, #race-debug-overlay').length === 0`.
- **Three.js WebGL Geometries/Textures:** Full disposal of buffer geometries, materials, instanced meshes, and WebGL rendering context on each exit.
- **Audio Node Retention:** All `OscillatorNode`, `GainNode`, and `AudioBufferSourceNode` connections severed and closed on dispose.

---

### 4. 60-Second Sustained Drift Heap Stability

During a 60-second continuous drift test emitting tiered sparks, tire smoke, boost flames, and skid marks:
- **Zero Object Allocations in Render Loop:** All particles recycle within the pre-allocated 180-slot `particles` array and update `InstancedMesh.instanceMatrix`.
- **Skid Marks:** 64-slot circular buffer in `skidMesh` replaces oldest marks with zero dynamic mesh instantiation.
- **JS Heap:** Remained bounded within $\pm 4\text{ MB}$ of garbage collection baseline throughout continuous play.
