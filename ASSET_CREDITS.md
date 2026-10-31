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
- **Integration**: Localized to English and themed for Dhaka Date RPG (featuring Totoro as the active 3D driver posed via Blender MCP, Moon Walker as co-pilot companion, and Dhaka university characters as passengers).
- **Audio & 3D**: Self-contained Three.js simulation, streamlined 3D navigation arrow, and Web Audio API real-time sound synthesis.

---

## 4. Totoro 3D Reference Model (Ghibli Drivers)

The 3D model for Totoro (`public/wii/totoro/model.dae`, `tools/character-pipeline/totoro_ref.glb`) is based on open-source community 3D references:

- **Upstream Repository**: `https://github.com/aaaa1597/react-r3f-tutorial016` (`public/models/Totoro.glb`)
- **Download Pipeline**: Acquired via multi-channel parallel download manager (`scripts/lib/parallel-download.mjs`).
- **Processing**: Posed in Blender for kart seating (arms rotated to wheel rim, feet forward into footwell, reclined torso, seat contact origin at `Y = 0.00`), optimized into a single manifold static mesh, UV-mapped to `totoro_all.png`, and exported to Collada `.dae`.
- **Crazy Taxi Integration**: Posed and scaled in Blender via Blender MCP for convertible cab driving posture (`tools/character-pipeline/totoro_driver.blend`, `public/crazytaxi/assets/totoro_driver.glb`), exported as compact WebGL geometry buffer (`public/crazytaxi/js/models/totoro_data.js`).

---

## 5. KickPunch / Game-Off-2017 Beat-'Em-Up Arcade Assets

- **Upstream Repository**: [https://github.com/kenamick/game-off-2017](https://github.com/kenamick/game-off-2017)
- **Authors**: Alexey Vishnyakov (*n3tn0de*), Carlos Braga (*charliiee*), Pavel Antonov (*PsyBack*), Petar Petrov (*petarov*), Will Tonna (*lampeight*)
- **License**: MIT License ([LICENSE](public/brawler/assets/sprites/LICENSE))
- **Usage**: Retro 2D Beat-'Em-Up Arcade Cabinet mounted in Dhaka Cyber Arcade (`slot_fighting_clash`), adapted with custom Dhaka Valley campus storylines, dialogues, and custom sprites for Moon Walker and Totoro.

---

## 6. Tuxemon 2D Pixel Art Interior & Furniture Tilesets

- **Upstream Repository**: [https://github.com/Tuxemon/Tuxemon](https://github.com/Tuxemon/Tuxemon)
- **Authors**: George, ArMM1998, Redshrike, Isaiah658, Kelvin Shadewing, and Tuxemon Contributors
- **License**: CC-BY-SA 3.0 / GPL 3.0
- **Acquisition**: Multi-channel parallel download manager (`scripts/lib/parallel-download.mjs`)
- **Usage**: Dhaka Cyber Arcade interior floorings, structural walls, counters, tech electronics, and furniture matching the authentic Pokémon Gen 2-4 / Tuxemon 2D aesthetic.

---

## 7. 80s Retro 2D Arcade Tile Set by RUOK

- **Source**: [OpenGameArt.org — 80s Arcade Tile Set](https://opengameart.org/content/80s-arcade-tile-set)
- **Author**: RUOK
- **License**: CC0 1.0 Universal (Public Domain)
- **Acquisition**: Multi-channel parallel download manager (`scripts/lib/parallel-download.mjs`)
- **Usage**: Dhaka Cyber Arcade retro upright cabinets, gumball/token dispenser, foosball and pool game tables, whack-a-mole stations, neon carpet runners, and vintage bar counter.

---

## 8. Animated 2D Pixel Arcade Cabinets by Regret

- **Source**: [OpenGameArt.org — Animated Arcade Cabinets](https://opengameart.org/content/animated-blue-arcade-cabinet)
- **Author**: Regret
- **License**: CC0 1.0 Universal (Public Domain)
- **Acquisition**: Multi-channel parallel download manager (`scripts/lib/parallel-download.mjs`)
- **Usage**: Dhaka Cyber Arcade tournament cabinets and active animated game screens (`sBlueArcade_strip4`, `sGreenArcade_strip9`, `sRedArcade_strip16`).
