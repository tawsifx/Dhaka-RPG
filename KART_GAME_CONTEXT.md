# KART_GAME_CONTEXT.md — 3D Kart Racing Engine ("Totoro Kart", formerly MarioKart64JS)
> **Canonical System Documentation & Reference Manual for the 3D Kart Subsystem**
> *Totoro & Moon Walker: Chronicles of the Six Realms RPG*

---

## 1. Executive Summary & Architecture

The 3D kart racing minigame in this project is powered by **Totoro Kart** (formerly MarioKart64JS), a complete, faithful browser-based reconstruction of *Mario Kart 64* built with **Three.js (v0.186.1)**, modern ES Modules, and the Web Audio API. It completely replaces the previous prototype and integrates into the Dhaka Date RPG both as an in-world interactive minigame and as a dedicated standalone web game.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Totoro Kart Architecture                      │
├────────────────────────────────────────────────────────────────────────┤
│ • Core Runtime: Three.js 0.186.1 (WebGLRenderer, PCF Shadows, Stencil) │
│ • Resolution / CAS Sharpening: 1× (240p), 2× (480p), 4× (960p), Native │
│ • Dual Kart Presentation:                                              │
│     - Retro 2.5D Billboard Sprites (authentic N64 64×64 texture atlas) │
│     - Wii 3D Standard Karts (toggle via '3' key or ?3d=3d URL flag)    │
│ • Courses: All 16 Grand Prix circuits across 4 cups + 4 Battle Arenas   │
│ • Drivers: 8 classic drivers across Small, Medium, Large weight classes│
│ • Item Engine: Full 15-item inventory with authentic roulette RNG      │
│ • Audio: Low-latency Web Audio MIDI/sequence synthesis & driver voices │
│ • Network: Peer-to-peer WebRTC split-screen multiplayer (2–4 players)  │
│ • RPG Lifecycle: Non-destructive overlay mount, pauses 2D world & BGM  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Integration with Dhaka Date RPG

### 2.1 Launch Point in the 2D World
* **Location:** Fuller Roadway (`x: 1648, y: 816`) at the painted cycle rickshaw stand in [`src/scenes/DhakaValleyScene.ts`](file:///Users/tawsifx/Desktop/dhaka-date-rpg/src/scenes/DhakaValleyScene.ts#L3616-L3622).
* **Choice Hub:**
  1. `"🛺 Grand Rickshaw Tour (Sightseeing)"`: 2D automated scenic tour across Dhaka Valley.
  2. `"🏁 Race — Grand Prix (Totoro Kart)"`: Launches the 3D kart racing engine.

### 2.2 In-Game Overlay Lifecycle ([`RickshawRaceEngine.ts`](file:///Users/tawsifx/Desktop/dhaka-date-rpg/src/scenes/minigames/race/RickshawRaceEngine.ts))
When launched from the RPG:
1. **State Freezing:**
   - Pauses the Phaser 2D scene: `scene.scene.pause()`.
   - Pauses in-game time calendar: `scene.timeCalendar.setPaused(true)`.
   - Pauses ambient audio & BGM: `scene.sound.pauseAll()`.
2. **Modal Mounting:**
   - Creates a full-screen `#mk64-race-overlay` `<div>` (z-index `999999`).
   - Embeds `/race.html` via a high-performance iframe with hardware acceleration.
   - Injects a top-right `✕ Close Race` button and binds the `Escape` key.
3. **Disposal & Unpause:**
   - Removing the overlay unpauses Phaser (`scene.scene.resume()`), unpauses the time calendar, and resumes background music without memory leaks.

### 2.3 Standalone Harness ([`race.html`](file:///Users/tawsifx/Desktop/dhaka-date-rpg/race.html))
The engine can be played as a standalone game:
* **Development Command:** `npm run dev:race` (opens `http://localhost:5173/race.html`).
* **Production Route:** Directly accessible at `/race.html`.
* Includes a top-bar `← Return to RPG` shortcut.

---

## 3. Game Modes & Engine CC Classes

### 3.1 Race Modes
* **Mario GP (`mario_gp`):** 3-lap Grand Prix circuit against 7 AI drivers. Automatically selects 2 primary CPU rivals according to authentic N64 tables (`pickRivals`).
* **VS Mode (`vs`):** Race against customized CPU opponents.
* **Time Trials (`time_trials`):** Solo time trial racing at 100cc speeds with 3 triple mushrooms awarded. Saves personal best times to `localStorage`.
* **Battle Mode (`battle`):** Arena combat across 4 battle maps with 3 balloons per kart. No laps; survival rules apply.

### 3.2 Engine Classes & Speed Scaling
Speed is scaled via `ccSpeedScale(cc, character)` in [`src/scenes/minigames/race/kart.js`](file:///Users/tawsifx/Desktop/dhaka-date-rpg/src/scenes/minigames/race/kart.js):
* **50cc (`CC_INDEX[50]`):** Gentle beginner handling (scale factor $\approx 0.82$).
* **100cc (`CC_INDEX[100]`):** Standard speed class (scale factor $\approx 0.91$).
* **150cc (`CC_INDEX[150]`):** High-speed pro class (scale factor $1.00$ for balanced drivers, $>1.0$ for speed specialists).
* **Extra / Mirror Mode (`extra`):** 100cc physics with horizontally flipped camera projection matrices (`mirrorCamera`). Camera-facing billboards invert themselves so text and character art remain un-mirrored.
* **Battle Class (`CC_BATTLE`):** Uniform top speed ($245 \text{ units/s}$) across all drivers for arena balance.

---

## 4. Track & Course Directory (20 Total)

All 16 Grand Prix courses and 4 Battle Arenas are defined in [`src/scenes/minigames/race/track.js`](file:///Users/tawsifx/Desktop/dhaka-date-rpg/src/scenes/minigames/race/track.js). Course geometry and metadata are loaded on-demand from `public/mk64/<course-dir>/course.json`.

| Cup | Course ID | Directory (`public/mk64/`) | Laps | Course Hazards & Features |
| :--- | :--- | :--- | :--- | :--- |
| **Mushroom** | `luigi` | `luigi-raceway` | 3 | Classic starter circuit, grandstands, hot air balloon |
| **Mushroom** | `moomoo` | `moo-moo-farm` | 3 | Farm fences, pasture terrain, animated jumping Monty Moles |
| **Mushroom** | `koopa` | `koopa-troopa-beach` | 3 | Sand dunes, ocean tide water friction, ramp shortcut cave, crabs |
| **Mushroom** | `kalimari` | `kalimari-desert` | 3 | Desert tracks, level crossings, moving Steam Train & carriages |
| **Flower** | `toad` | `toads-turnpike` | 3 | Night highway, dynamic moving highway traffic (trucks & cars) |
| **Flower** | `frappe` | `frappe-snowland` | 3 | Snow surface, giant Mario snowman, animated mini snowmen |
| **Flower** | `choco` | `choco-mountain` | 3 | Bumpy mountain trails, guardrail-free cliffs, falling boulders |
| **Flower** | `mario` | `mario-raceway` | 3 | Piranha plants, sandy shoulders, wide sweeping drift turns |
| **Star** | `wario` | `wario-stadium` | 3 | Massive indoor dirt stadium, moguls, big air crossover jumps |
| **Star** | `sherbet` | `sherbet-land` | 3 | Slick ice physics, ice cave, waddling & sliding penguins |
| **Star** | `royal` | `royal-raceway` | 3 | Piranha plants, river jump boost pad, Peach's Castle grounds |
| **Star** | `bowser` | `bowsers-castle` | 3 | Moving bridge, slamming Thwomps, dungeon halls, lava pits |
| **Special** | `dk` | `dks-jungle-parkway` | 3 | Jungle palm trees, paddle-boat ferry, giant canyon suspension jump |
| **Special** | `yoshi` | `yoshi-valley` | 3 | Maze paths, unknown standings HUD, giant rolling Yoshi Egg |
| **Special** | `banshee` | `banshee-boardwalk` | 3 | Nighttime wooden boardwalk, no guardrails, spooky Bats |
| **Special** | `rainbow` | `rainbow-road` | 3 | Neon character signs, smiling Chain Chomps, undulating track |
| **Battle** | `big-donut` | `big-donut` | Arena | Circular lava rim, donut-shaped center platform |
| **Battle** | `block-fort` | `block-fort` | Arena | 4 colored multi-story towers (Red, Yellow, Green, Blue) with bridges |
| **Battle** | `double-deck` | `double-deck` | Arena | Two-tiered open arena with ramp connections |
| **Battle** | `skyscraper` | `skyscraper` | Arena | Rooftop arena with open pit center and perimeter falls |

---

## 5. Driver Roster & Weight Categories

Defined in [`src/scenes/minigames/race/kart.js`](file:///Users/tawsifx/Desktop/dhaka-date-rpg/src/scenes/minigames/race/kart.js), [`kart3d.js`](file:///Users/tawsifx/Desktop/dhaka-date-rpg/src/scenes/minigames/race/kart3d.js), and [`main.js`](file:///Users/tawsifx/Desktop/dhaka-date-rpg/src/scenes/minigames/race/main.js):

| Driver | Weight Class | Chassis / Model | Top Speed | Handling / Acceleration | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Satsuki Kusakabe** | `medium` | `kart/medium/` (`body_satsuki.png`) | Balanced | Benchmark balanced stats (inherits Mario's stats, 119.41 cm) | **Active (Primary)** |
| **Totoro** | `large` | `kart/large/` (`body_totoro.png`) | High | High top speed, strong momentum, wide frame (inherits DK's stats, 145.26 cm) | **Active (Primary)** |
| **Luigi** | `medium` | `kart/medium/` (`body_lg.png`) | Balanced | Agile steering with balanced top speed | Active |
| **Peach** | `medium` | `kart/medium/` (`body_pc.png`) | Balanced | High acceleration, smooth drift arcs | Active |
| **Toad** | `small` | `kart/small/` (`body_ko.png`) | Moderate | Ultra-responsive turning, rapid initial acceleration | Active |
| **Yoshi** | `medium` | `kart/medium/` (`body_ys.png`) | High | Quick acceleration, off-road recovery bonus | Active |
| **Wario** | `large` | `kart/large/` (`body_wr.png`) | High | Heavy mass, pushes lighter karts on contact | Active |
| **Bowser** | `large` | `kart/large/` (`body_kp.png`) | Highest | Maximum top speed, highest mass, slow start recovery | Active |
| *Mario* | `medium` | `kart/medium/` (`body_mr.png`) | Balanced | Preserved in `CHARS` and assets for seamless rollback | *Rollback Reserve* |
| *Donkey Kong* | `large` | `kart/large/` (`body_dk.png`) | High | Preserved in `CHARS` and assets for seamless rollback | *Rollback Reserve* |

*(Driver 3D pipeline tools, blend files, and reproducible scripts are located in `tools/character-pipeline/`).*

---

## 6. Physics & Driving Kinematics

1. **Fixed-Step Simulation Loop:** Physics runs at 60Hz inside `Kart.update(dt, input, karts)` with alpha pose interpolation (`blendPoses`) for jitter-free rendering.
2. **Kart Kinematics:**
   - Direction vectors: Tangent (`T`), Up normal (`U`), Right lateral (`R`), and track curvature $\kappa$.
   - Speed is converted to real-world velocity via `speedKmh(v)`.
3. **Hop & Drift System:**
   - Pressing **Space** (or Gamepad LB/RB) initiates a small hop.
   - Turning during a hop engages a drift lock.
   - Counter-steering while drifting charges the mini-turbo. Releasing drift triggers an instantaneous acceleration burst.
4. **Kart-to-Kart Bump Collisions (`bumpKarts`):**
   - Bounding boxes ($3.4\text{m} \times 2.1\text{m}$) computed along the route frame.
   - Pushes karts apart along the axis of minimum penetration.
   - Heavy karts (Bowser, DK) shove lighter karts (Toad, Peach) off-line upon collision.
5. **Lakitu Rescue:**
   - Falling off the track, driving deep out of bounds, or drowning in water triggers Lakitu's fishing rod animation.
   - The kart is hoisted and gently placed back on the center of the track near the last valid checkpoint.

---

## 7. Items & Hazard Architecture ([`items.js`](file:///Users/tawsifx/Desktop/dhaka-date-rpg/src/scenes/minigames/race/items.js))

### 7.1 Item Inventory
* **Banana / Banana Bunch:** Dropped behind as a hazard or thrown forward (via `Q` or stick-up). Causes instant 360° spin-out.
* **Green Shell / Triple Green Shell:** Straight ballistic projectile. Bounces off track barriers up to 5 times.
* **Red Shell / Triple Red Shell:** Homing missile that tracks the kart ahead following track spline geometry.
* **Blue Spiny Shell (`blue_shell`):** High-speed winged shell that bypasses the pack and detonates on the 1st-place leader.
* **Mushroom / Triple Mushroom / Super Mushroom:** Instant nitro speed boosts.
* **Star (`star`):** Invincibility, maximum speed boost, rainbow chassis effect, and spin-out immunity.
* **Thunderbolt (`thunder_bolt`):** Strikes all rival karts, shrinking them and halving their speed for 8 seconds.
* **Boo (`boo`):** Turns the user invisible/intangible and steals an item from an opponent.
* **Fake Item Box (`fake_item_box`):** Stationary explosive hazard disguised as a normal item box.

### 7.2 Track Obstacles & Hazards
* **Piranha Plants:** Snap at karts taking tight inner apex turns on Mario & Royal Raceway.
* **Thwomps:** Ascend and slam down into the stone floor of Bowser's Castle.
* **Trains & Cars:** Moving obstacles on Kalimari Desert and Toad's Turnpike with solid bounding box collisions.

---

## 8. Visual & Rendering Pipeline

1. **Dual Character Representation:**
   * **Retro 2.5D Mode (Default):** Pre-rendered 64×64 billboard sprites sampled dynamically based on the viewing angle of the chase camera (`kartSpriteFrame`).
   * **Wii 3D Mode:** Pressing `3` replaces all driver sprites with 3D Collada (`.dae`) models, adds real-time PCF shadow-map projection onto track surfaces, dynamic front tire steering lock (`0.45 rad`), and velocity-based wheel spin.
2. **Resolution & Sharpness Presets (Key `G`):**
   * `1x` (240p): Authentic pixelated N64 texture sampling.
   * `2x` (480p): Contrast Adaptive Sharpening (CAS) applied via [`src/scenes/minigames/race/sharpen.js`](file:///Users/tawsifx/Desktop/dhaka-date-rpg/src/scenes/minigames/race/sharpen.js).
   * `4x` (960p) & `Native`: Full-resolution display with high-resolution texture tiers from `public/mk64-hd/`.
3. **Instanced Particle Pools:**
   * Smoke puffs and exhaust flames rendered via [`smoke.js`](file:///Users/tawsifx/Desktop/dhaka-date-rpg/src/scenes/minigames/race/smoke.js).

---

## 9. Audio Subsystem ([`audio.js`](file:///Users/tawsifx/Desktop/dhaka-date-rpg/src/scenes/minigames/race/audio.js))

* **Sequence Synthesizer (`m64.js`, `m64-worklet.js`):** Parses original N64 sequence ROM tables (`public/mk64/audio/tbl.bin`) to generate authentic music channels in real time via an `AudioWorklet`.
* **Dynamic Vehicle SFX:** Engine RPM pitch shifts with velocity, tire drift screech, boost whooshes, and crash sounds.
* **Driver Voice Clips:** Authentic digitized character audio banks for item throws, spin-outs, and victories.

---

## 10. Extending the Roster: Satsuki & Totoro

A dedicated step-by-step engineering specification for importing Studio Ghibli characters into the 3D engine is provided in:
👉 **[`docs/mariokart64/CHARACTER_MODELING_SPEC.md`](file:///Users/tawsifx/Desktop/dhaka-date-rpg/docs/mariokart64/CHARACTER_MODELING_SPEC.md)**

### Quick Reference:
* **Satsuki:**
  * Class: `small` or `medium`
  * Chassis: `kart/medium/` with livery `body_satsuki.png`
  * Model Folder: `public/wii/satsuki/model.dae`
  * Seat Offset in `kart3d.js`: `[0.06, -0.10]`
* **Totoro:**
  * Class: `large` (Heavyweight class)
  * Chassis: `kart/large/` with livery `body_totoro.png`
  * Model Folder: `public/wii/totoro/model.dae`
  * Seat Offset in `kart3d.js`: `[0.14, 0.04]`

---

## 11. Controls & Action-Map

| Action | Keyboard (Standard PC) | Gamepad (Standard) | Mobile / Touch |
| :--- | :--- | :--- | :--- |
| **Accelerate** | `W` / `ArrowUp` | Button `A` / Right Trigger | On-screen gas pedal |
| **Brake / Reverse** | `S` / `ArrowDown` | Button `B` / Left Trigger | On-screen brake pedal |
| **Steering** | `A` / `D` or `ArrowLeft` / `ArrowRight` | Left Thumbstick (horizontal) | On-screen left/right arrows |
| **Hop / Drift** | `Space` / `Shift` / `Z` | Button `LB` / `RB` | On-screen drift icon |
| **Use Item** | `E` / `Ctrl` / `X` / `F` | Button `X` / `Y` | On-screen item icon |
| **Throw Item Ahead**| Hold `W` / `Up` + release Item, or `Q` | Left Stick Up + Button `X` | Hold up + Item |
| **Drop Item Behind**| Hold `S` / `Down` + release Item | Left Stick Down + Button `X` | Hold down + Item |
| **Restart Race** | `R` / `Delete` / `Backspace` | Button `Start` | Restart button |
| **Pause / Course Menu**| `Escape` / `M` | Button `Start` / `Back` | Menu button |
| **Toggle Music** | `N` | — | Settings menu |
| **Toggle Wii 3D Karts**| Key `3` | — | Settings menu |
| **Cycle Resolution** | Key `G` | — | Settings menu |
| **Toggle Physics Mode**| Key `J` (Jumps / Glue) | — | Settings menu |
| **Exit to RPG** | `Escape` / Top-right button | Button `Back` / `Select` | Top-right `✕ Close Race` |

---

## 12. File Inventory & Repository Layout

```
dhaka-date-rpg/
├── KART_GAME_CONTEXT.md         # This canonical specification file
├── race.html                    # Standalone full-page MarioKart64JS entry point
├── src/scenes/minigames/race/   # Core Three.js Racing Engine Source
│   ├── main.js                  # Engine entry, game loop, camera, menus, HUD
│   ├── track.js                 # 16 GP courses + 4 battle maps definitions & loaders
│   ├── kart.js                  # Kinematics, 2D sprites, AI rivals, collision response
│   ├── kart3d.js                # Wii 3D kart assembler, tire spin, steering knuckles
│   ├── items.js                 # Item box logic, roulette RNG, shell physics
│   ├── audio.js                 # Web Audio synthesizer manager & sound playback
│   ├── m64.js & m64-worklet.js  # AudioWorklet sequence decoder
│   ├── lakitu.js & lakitu3d.js  # Referee countdown, lap counter, fishing rescue
│   ├── hd.js & sharpen.js       # Resolution presets & CAS sharpening filter
│   ├── net.js                   # WebRTC P2P multiplayer transport
│   ├── smoke.js                 # Exhaust smoke particle pools
│   ├── hazards:                 # Specific course dynamic obstacle modules
│   │   ├── train.js, traffic.js, piranha.js, thwomp.js, snowmen.js,
│   │   ├── penguins.js, chomps.js, crabs.js, hedgehogs.js, yoshi-egg.js,
│   │   └── balloon.js, ferry.js, foliage.js, neon.js, props.js, flag.js
│   ├── RickshawRaceEngine.ts    # Bridge & lifecycle coordinator for DhakaValleyScene
│   └── index.ts                 # Clean barrel export
├── public/                      # Static Game Assets
│   ├── mk64/                    # Authentic N64 course models, textures, sounds, items
│   ├── wii/                     # Mario Kart Wii 3D standard karts & character meshes
│   ├── title3d/                 # 3D title screen assets
│   └── mk64-hd/                 # High-definition (2×/4×) texture replacement packs
├── tests/race/
│   └── mariokart64.test.ts      # Unit tests for CC speed, tracks, items, and rivals
└── docs/mariokart64/
    ├── README.md                # Subsystem overview
    └── CHARACTER_MODELING_SPEC.md # 3D Satsuki & Totoro modeling guidelines
```

---

## 13. Testing & Verification Commands

Per workspace rules, testing for the 3D kart subsystem is strictly scoped:

```bash
# 1. Run 3D Kart Subsystem Unit Tests
npm run test:race

# 2. Verify TypeScript Compiler Integrity
npm run typecheck

# 3. Verify Production Vite Bundling
npm run build

# 4. Launch Standalone Dev Server
npm run dev:race
```
