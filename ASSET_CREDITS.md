# Asset Credits & Third-Party Licenses

This project incorporates third-party art, 3D models, textures, audio, and VFX assets under permissive and Creative Commons licenses. All credits, authors, upstream repositories, and applicable license texts are documented below in compliance with each upstream license.

---

## 1. SuperTuxKart (STK) Assets — Fuller Road Sprint Art Pass (M3.5)

The 3D racing mini-game is powered by **MarioKart64JS**, a browser-based recreation of Mario Kart 64 in Three.js with Wii 3D karts and synthesized Web Audio.

- **Upstream Repository**: [https://svn.code.sf.net/p/supertuxkart/code/stk-assets](https://svn.code.sf.net/p/supertuxkart/code/stk-assets)
- **Website**: [https://supertuxkart.net](https://supertuxkart.net)
- **License Directory**: `public/assets/race/stk/licenses/`
- **Import Manifest**: `public/assets/race/stk/import-manifest.json`

### Asset Table

| Asset ID | Role / Usage in Fuller Road Sprint | Authors | Upstream License | License Document |
| :--- | :--- | :--- | :--- | :--- |
| **stk_modernStreetLamp** | Street lamp posts along Fuller Road sidewalks | Jean-Manuel Clémençon (*Samuncle*) | CC-BY-SA 4.0 | [CC-BY-SA-4.0.txt](public/assets/race/stk/licenses/CC-BY-SA-4.0.txt) |
| **stk_chineseRedLantern** | Festive hanging red lanterns at start arch & landmarks | Jean-Manuel Clémençon (*Samuncle*) | CC-BY-SA 4.0 | [CC-BY-SA-4.0.txt](public/assets/race/stk/licenses/CC-BY-SA-4.0.txt) |
| **stk_bench** | University of Dhaka campus benches | Jean-Manuel Clémençon (*Samuncle*) | CC-BY-SA 4.0 | [CC-BY-SA-4.0.txt](public/assets/race/stk/licenses/CC-BY-SA-4.0.txt) |
| **stk_autumnTree** | Krishnachura canopy avenue (tinted flame red-orange) | Jean-Manuel Clémençon (*Samuncle*) | CC-BY-SA 4.0 | [CC-BY-SA-4.0.txt](public/assets/race/stk/licenses/CC-BY-SA-4.0.txt) |
| **stk_autumnSmallBush** | Campus boundary shrubs and flower beds | Jean-Manuel Clémençon (*Samuncle*) | CC-BY-SA 4.0 | [CC-BY-SA-4.0.txt](public/assets/race/stk/licenses/CC-BY-SA-4.0.txt) |
| **stk_asianWoodPost** | Roadside boundary bollards | Jean-Manuel Clémençon (*Samuncle*) | CC-BY-SA 4.0 | [CC-BY-SA-4.0.txt](public/assets/race/stk/licenses/CC-BY-SA-4.0.txt) |
| **stk_fitchBarrel** | Crash cushion barrels at chicane entries | Jean-Manuel Clémençon (*Samuncle*) | CC-BY-SA 4.0 | [CC-BY-SA-4.0.txt](public/assets/race/stk/licenses/CC-BY-SA-4.0.txt) |
| **stk_candelaSky** | Candela City sunset skybox panorama | Jean-Manuel Clémençon / DR04 | CC-BY-SA 3.0 | [CC-BY-SA-3.0.txt](public/assets/race/stk/licenses/CC-BY-SA-3.0.txt) |
| **stk_zengardenRoad** | Zen Garden asphalt road textures | SuperTuxKart Team | CC-BY-SA 3.0 | [CC-BY-SA-3.0.txt](public/assets/race/stk/licenses/CC-BY-SA-3.0.txt) |
| **stk_haciendaGround** | Brick sidewalk paving & boost arrow meshes | Claude Werner (*bollen*) | CC-BY-SA 3.0 | [CC-BY-SA-3.0.txt](public/assets/race/stk/licenses/CC-BY-SA-3.0.txt) |
| **stk_tuxWheel** | Articulated rickshaw kart wheels | Julian Schönbächler (*XGhost*) | CC-BY-SA 3.0 | [CC-BY-SA-3.0.txt](public/assets/race/stk/licenses/CC-BY-SA-3.0.txt) |
| **stk_vfxParticles** | Blue/orange drift sparks, smoke, boost flames | Jean-Manuel Clémençon (*Samuncle*) | CC-BY-SA 4.0 | [CC-BY-SA-4.0.txt](public/assets/race/stk/licenses/CC-BY-SA-4.0.txt) |
| **stk_musicGarden** | Fuller Road Sprint race loop audio (`garden.ogg`) | DJHelium | CC-BY-SA 3.0 | [CC-BY-SA-3.0.txt](public/assets/race/stk/licenses/CC-BY-SA-3.0.txt) |

---

## 2. Other Third-Party Assets

- **Kenney Assets**: Particle textures and UI icons (CC0 1.0 Universal).
- **Phaser 3**: Phaser game engine (MIT License).
- **Three.js**: 3D library (MIT License).

---

## 3. SuperTuxKart Code & Algorithmic Design (Milestone 5 Items & AI)

Portions of the item probabilities, AI item evaluation heuristics, and projectile kinematics are derived and ported to deterministic TypeScript from **SuperTuxKart**:

- **Upstream Repository**: [https://github.com/supertuxkart/stk-code](https://github.com/supertuxkart/stk-code)
- **License**: GNU General Public License v2.0 or later (GPL-2.0+)
- **Components Ported**:
  - `data/powerup.xml`: 1000-sum probability distribution across 8 positions (ported into `src/config/itemWeights.race.json`).
  - `src/items/powerup_manager.cpp`: Item collection, roulette cooldown timer, and probability scaling.
  - `src/items/flyable.cpp`: Projectile flight constants, wall bounce mechanics, and homing kite tracking.
  - `src/karts/controller/skidding_ai.cpp`: AI item usage decision logic, forward targeting cone angle/distance thresholds, and defensive rear-firing checks (ported into `src/scenes/minigames/race/ai/ItemBrain.ts`).
  - `src/animations/explosion_animation.cpp`: Hit reaction pitch tumble and speed scrub constants (ported into `src/scenes/minigames/race/core/HitReaction.ts`).

---

## 4. Totoro 3D Reference Model (Ghibli Drivers)

The 3D model for Totoro (`public/wii/totoro/model.dae`, `tools/character-pipeline/totoro_ref.glb`) is based on open-source community 3D references:

- **Upstream Repository**: `https://github.com/aaaa1597/react-r3f-tutorial016` (`public/models/Totoro.glb`)
- **Download Pipeline**: Acquired via multi-channel parallel download manager (`scripts/lib/parallel-download.mjs`).
- **Processing**: Posed in Blender for kart seating (arms rotated to wheel rim, feet forward into footwell, reclined torso, seat contact origin at `Y = 0.00`), optimized into a single manifold static mesh, UV-mapped to `totoro_all.png`, and exported to Collada `.dae`.
