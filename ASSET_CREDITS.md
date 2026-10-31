# Asset Credits & Third-Party Licenses

This project incorporates third-party art, 3D models, textures, audio, and VFX assets under permissive and Creative Commons licenses. All credits, authors, upstream repositories, and applicable license texts are documented below in compliance with each upstream license.

---

## 1. Totoro Kart 3D Racing Engine (MarioKart64JS)

The 3D racing mini-game is powered by **MarioKart64JS / Totoro Kart**, a browser-based recreation of retro kart racing in Three.js with Wii 3D karts, Satsuki & Totoro Ghibli drivers, and synthesized Web Audio:

- **Technology**: Three.js WebGL renderer, custom kinematics, 16 Grand Prix circuits + 4 Battle Arenas, and Web Audio API engine/music synthesis.
- **Wii 3D Karts & Drivers**: Satsuki (Moon Walker), Totoro, Mario, Luigi, Peach, Toad, Yoshi, DK, Wario, and Bowser.
- **Engine Manual**: Documented in `KART_GAME_CONTEXT.md` and `docs/mariokart64/`.

---

## 2. General Third-Party Engines & Libraries

- **Kenney Assets**: Particle textures, UI icons, and audio elements (CC0 1.0 Universal).
- **Phaser 3**: Phaser 2D game engine (MIT License).
- **Three.js**: 3D WebGL graphics library (MIT License).

---

## 3. Crazy Taxi (Boing Taxi) by Ruteshisu

The 3D driving arcade simulator in Dhaka Cyber Arcade (`slot_racing_twin`) is adapted and localized from **Crazy Taxi** (Boing Taxi) by Ruteshisu:
- **Upstream Repository**: [https://github.com/Ruteshisu/CrazyTaxi](https://github.com/Ruteshisu/CrazyTaxi)
- **Author**: Ruteshisu
- **Integration**: Localized to English and themed for Dhaka Date RPG (featuring Moon Walker as driver, Totoro as co-pilot companion, and Dhaka university characters as passengers).
- **Audio & 3D**: Self-contained Three.js procedural geometry and Web Audio API real-time sound synthesis.

---

## 4. Totoro 3D Reference Model (Ghibli Drivers)

The 3D model for Totoro (`public/wii/totoro/model.dae`, `tools/character-pipeline/totoro_ref.glb`) is based on open-source community 3D references:

- **Upstream Repository**: `https://github.com/aaaa1597/react-r3f-tutorial016` (`public/models/Totoro.glb`)
- **Download Pipeline**: Acquired via multi-channel parallel download manager (`scripts/lib/parallel-download.mjs`).
- **Processing**: Posed in Blender for kart seating (arms rotated to wheel rim, feet forward into footwell, reclined torso, seat contact origin at `Y = 0.00`), optimized into a single manifold static mesh, UV-mapped to `totoro_all.png`, and exported to Collada `.dae`.

---

## 5. KickPunch / Game-Off-2017 Beat-'Em-Up Arcade Assets

- **Upstream Repository**: [https://github.com/kenamick/game-off-2017](https://github.com/kenamick/game-off-2017)
- **Authors**: Alexey Vishnyakov (*n3tn0de*), Carlos Braga (*charliiee*), Pavel Antonov (*PsyBack*), Petar Petrov (*petarov*), Will Tonna (*lampeight*)
- **License**: MIT License ([LICENSE](public/brawler/assets/sprites/LICENSE))
- **Usage**: Retro 2D Beat-'Em-Up Arcade Cabinet mounted in Dhaka Cyber Arcade (`slot_fighting_clash`), adapted with custom Dhaka Valley campus storylines, dialogues, and custom sprites for Moon Walker and Totoro.

---

## 6. Dhaka Cyber Arcade Exterior & Interior Assets (Kenney CC0)

The Dhaka Cyber Arcade exterior building and interior arcade machines, attractions, furniture, and characters are derived from Kenney's CC0 asset collections:

- **Upstream Libraries**:
  - **Kenney Mini Arcade**: `https://kenney.nl/assets/mini-arcade`
  - **Kenney City Kit - Commercial**: `https://kenney.nl/assets/city-kit-commercial`
  - **Kenney Open Source Mirror**: `https://github.com/shorepine/kenney`
- **Author**: Kenney (Kenney Vleugels - [kenney.nl](https://kenney.nl))
- **License**: Creative Commons CC0 1.0 Universal (Public Domain).
- **Download Pipeline**: Acquired via workspace multi-channel parallel download manager (`scripts/lib/parallel-download.mjs`) from `raw.githubusercontent.com/shorepine/kenney/master/3d/` with SHA-256 verification.
- **Render Pipeline**: Processed through Three.js orthographic 2.5D rendering pipeline (`scripts/build-arcade-assets.mjs` & `scripts/build-arcade-composites.mjs`) with sRGB color encoding, cyberpunk directional and rim lighting, animated neon marquee frames, and antialiased transparency for the 2D Phaser engine.
- **Included Assets**:
  - Exterior: `prop_arcade_0.png` through `prop_arcade_3.png` (Animated 4-frame neon marquee commercial building facade)
  - Upright Cabinets: `prop_arcade_cab_upright_a.png` (Retro Pixel A), `prop_arcade_cab_upright_b.png` (Super Strike DX)
  - Tournament Stage: `prop_arcade_cab_deluxe.png` (Grand Championship DX Dual-Station)
  - Driving Simulator: `prop_arcade_cab_racing.png` (Dhaka Speed twin cockpit simulator)
  - Lounge Table: `prop_arcade_cab_cocktail.png` (Glass-top cocktail lounge cabinet) & `prop_arcade_stool.png` (Chrome bar stool)
  - Rhythm & Sports: `prop_arcade_cab_dance.png` (Dance Mania stage), `prop_arcade_airhockey.png` (Air hockey table), `prop_arcade_basketball.png` (Basketball shootout), `prop_arcade_pinball.png` (Pinball table)
  - Prizes & Refreshments: `prop_arcade_claw.png` (Lucky Claw machine), `prop_arcade_token_dispenser.png` (Token machine), `prop_arcade_wheel.png` (Fortune spin wheel), `prop_arcade_vending.png` (Soda vending machine)
  - Staff & Counter: `prop_arcade_cash_register.png`, `npc_shanto_0.png` & `npc_shanto_1.png` (Manager Shanto), `npc_gamer_0.png` & `npc_gamer_1.png` (Arcade visitors)
  - Flooring & Walls: `tile_arcade_floor.png` (Obsidian cyber tile), `tile_arcade_carpet.png` (Retro 90s laser carpet), `tile_arcade_wall.png` (Acoustic slate with neon conduit pipes)

