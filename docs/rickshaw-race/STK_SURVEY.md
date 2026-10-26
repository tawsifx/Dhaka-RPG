# SuperTuxKart (STK) Asset Survey — Fuller Road Sprint Art Pass

This document catalogs all SuperTuxKart assets evaluated and acquired for Milestone 3.5 of the "Tring-Tring Grand Prix" 3D rickshaw racing mini-game in *Totoro & Moon Walker: Chronicles of the Six Realms*.

Source repository: [SuperTuxKart Assets (SourceForge SVN)](https://svn.code.sf.net/p/supertuxkart/code/stk-assets) & [stk-code](https://github.com/supertuxkart/stk-code)

---

## 1. Candidate Asset Inventory

| Category | Source STK Path | Formats | Author(s) | License | Role in Fuller Road Sprint |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Track Dressing: Lamps** | `library/hd_modernStreetLamp_a/` | `.spm`, `.png`, `.xml` | Jean-Manuel Clémençon (Samuncle) | CC-BY-SA 4.0 | Street lamp posts aligned every 25m along Fuller Road sidewalks |
| **Track Dressing: Lanterns** | `library/hd_chineseRedLantern_a/` | `.spm`, `.png`, `.xml` | Jean-Manuel Clémençon (Samuncle) | CC-BY-SA 4.0 | Dhaka celebratory red hanging lanterns strung along the start/finish arch & landmarks |
| **Track Dressing: Benches** | `library/stklib_bench_a/` | `.spm`, `.xml` | Jean-Manuel Clémençon (Samuncle) | CC-BY-SA 4.0 | University of Dhaka campus park benches along Fuller Road sidewalk |
| **Track Dressing: Trees** | `library/stklib_autumnTree_a/` | `.spm`, `.xml` | Jean-Manuel Clémençon (Samuncle) | CC-BY-SA 4.0 | Krishnachura avenue canopy trees tinted fiery flame red/orange (`#d32f2f`) |
| **Track Dressing: Shrubs** | `library/stklib_autumnSmallBush_a/` | `.spm` | Jean-Manuel Clémençon (Samuncle) | CC-BY-SA 4.0 | Roadside flower/shrub beds between sidewalk and campus fence |
| **Track Dressing: Posts** | `library/stklib_asianWoodPost_a/` | `.spm` | Jean-Manuel Clémençon (Samuncle) | CC-BY-SA 4.0 | Roadside bollards & boundary posts |
| **Track Dressing: Barrels** | `library/stklib_fitchBarrel_a/` | `.spm` | Jean-Manuel Clémençon (Samuncle) | CC-BY-SA 4.0 | Trackside crash barrels at chicane entries |
| **Track Architecture: Bridge** | `tracks/zengarden/bridge_LOD50.spm` | `.spm`, `.jpg` | STK Team | CC-BY-SA 4.0 / GPL | Flyover deck, support pillars and arch structures |
| **Skybox: Candela Sunset** | `tracks/candela_city/sky.png` (+ top/side) | `.png` | Jean-Manuel Clémençon / DR04 | CC-BY-SA 3.0 / 4.0 | Warm tropical Dhaka sunset / dusk skybox with gradient hemisphere |
| **Track Textures: Road** | `tracks/zengarden/blackRoad.jpg` | `.jpg` | STK Team | CC-BY-SA 3.0 | Asphalt road surface with fine aggregate detail |
| **Track Textures: Sidewalk** | `tracks/hacienda/hacienda_ground.jpg` | `.jpg` | Claude Werner (bollen) | CC-BY-SA 3.0 | Dhaka brick herringbone pedestrian sidewalks and curbs |
| **Track Textures: Mud/Puddles**| `tracks/ravenbridge_mansion/swamp_water.png` | `.png` | Jean-Manuel Clémençon | CC-BY-SA 4.0 | Puddle/mud hazard surface decals |
| **Boost Visuals: Chevron** | `tracks/hacienda/boost_arrows.spm` | `.spm` | Claude Werner (bollen) | CC-BY-SA 3.0 | Animated boost pad luminous arrow chevron |
| **Kart Wheels** | `karts/tux/wheel-front-left.spm`, `wheel.png` | `.spm`, `.png` | Julian Schönbächler (XGhost) | CC-BY-SA 3.0 | High-quality rickshaw kart articulated spoke wheels (front steer, rear spin) |
| **VFX Particles** | `textures/gfx_sparkBlue_a.png`, `gfx_sparkFire_a.png`, `smoke.png` | `.png`, `.xml` | Jean-Manuel Clémençon | CC-BY-SA 4.0 | Mini-turbo blue/orange sparks, tire burnout smoke, boost fire trails, water splash |
| **Music Loop** | `music/garden.ogg` | `.ogg` (3.0 MB) | DJHelium | CC-BY-SA 3.0 | High-energy Asian flute + rhythm race loop for Fuller Road Sprint |

---

## 2. Licensing Compliance Plan

1. **Credit Retention**: All original author credits, source links, and license statements are extracted by `scripts/race/stk/build-credits.mjs` into `public/assets/race/stk/import-manifest.json` and appended to `ASSET_CREDITS.md`.
2. **License Text Distribution**: Complete verbatim license files are stored under `public/assets/race/stk/licenses/`:
   - `CC-BY-SA-4.0.txt`
   - `CC-BY-SA-3.0.txt`
   - `GPL-2.0.txt`
3. **Derived Art Invariants**:
   - Converted glTF binaries (`.glb`) and textures are optimized for WebGL.
   - Gameplay geometry (`collision.glb`) is byte-identical and locked via SHA-256 in `gameplay.lock.json`. Visual assets derive purely from the gameplay geometry.
