# Phase 0: Living-World NPC Behavior Engine — Current-State Audit

**Project**: *Totoro & Moon Walker: Chronicles of the Six Realms*  
**Date**: October 18, 2026  
**Auditor**: Systems & Gameplay Architecture Agent  

---

## 1. Executive Summary

This audit assesses the current state of NPC instantiation, movement, time exposure, collision, and frame costs across the codebase prior to the design and implementation of the data-driven living-world NPC behavior engine.

---

## 2. NPC Placement & Movement Architecture (Current Baseline)

### 2.1 The Two Disconnected Tiers
Currently, NPCs exist in two completely disconnected architectural paradigms:

1. **Wandering Pedestrians (7 Entities)**:
   - Handled by `src/systems/ScheduleSystem.ts` via `ScheduleSystem.createWanderingCitizens(scene)`.
   - Entities: `Anamika`, `Arif`, `Nadia`, `Mimi the Cat`, `Baki Bhai`, `Sami`, `Tania`.
   - Movement: Driven by a hardcoded array of `waypoints: [{x, y}, ...]` with fixed patrol loops.
   - Frame Loop: Handled directly in `DhakaValleyScene.update()` (lines 6663–6715). Each frame, `dx / dist * step` linearly moves the sprite towards `waypoints[w.wpIdx]`.
   - Pathfinding: **None**. Movement cuts straight through obstacles and terrain. If an obstacle exists between two waypoints, the NPC clips through or must be manually routed around it in the waypoint definitions.
   - Facing / Animations: Dynamically calculated based on the dominant axis (`Math.abs(dx) > Math.abs(dy)`), selecting `${w.baseTex}-walk-${dir}`.
   - Interactions: If Moon Walker is within 68 pixels or UI dialogue is open, the NPC pauses movement and resets texture to `${w.baseTex}-0`.

2. **Stationary Overworld & Interior NPCs (31 Entities)**:
   - Handled via `registerInteract(x, y, tex, name, radius, onInteract)` inside `DhakaValleyScene.ts` (`buildWorld`, `buildCurzonInterior`, `buildFarmhouse`).
   - Entities:
     - Dhaka Overworld Vendors & Citizens (12): `Tong-er Mama`, `TSC Acoustic Singer`, `Charukola Clay Artist`, `Nilkhet Boiwala`, `Phulwali`, `Mama's Naga Fuchka`, `Pabnar Mishti Doi`, `Ahona`, `Apshora`, `Rakin`, `Mehjabin`, `Iman`.
     - Curzon Hall Interior (6): `Prof. Motahar Hossain`, `Prof. Satyendra (S.N. Bose)`, `Faiza`, `Prof. Sultana`, `Dr. Kabir`, `Tanvir`.
     - Green Meadows Farmhouse & Pastoral Animals (5): `Chacha Rafiq`, `Shuravi (Cow)`, `Kalu (Goat)`, `Tuntuni (Hen)`, `Piku (Duckling)`.
     - Expedition Realms Sages & Spirits (8): `Elder Banyan Sage`, `Ananya the Weeping Petni`, `Kofil Chacha`, `Prof. Shamsher`, `Tidekeeper Marina`, `Master Blacksmith Kael`, `Astronomer Lyra`, `Celestial Chronicler`.
   - Movement: **Completely static**. Sprites stand on fixed coordinates; some play a looping idle walk animation via `getOrCreateWalkAnim()`, creating a "running in place" appearance.
   - Schedules: **None**. NPCs remain at their exact coordinates 24 hours a day, through rain, sunshine, dawn, and midnight.

---

## 3. Clock & Calendar System (`TimeCalendarSystem.ts`)

### 3.1 Data Structures
The game clock is maintained in `src/systems/TimeCalendarSystem.ts`:
- **State**: `CalendarDate` containing `year` (1+), `season` (`'spring' | 'summer' | 'monsoon' | 'autumn' | 'winter'`), `day` (1–28), `hour` (0–23), `minute` (0–59), `timePhase` (`'dawn' | 'morning' | 'afternoon' | 'sunset' | 'night' | 'midnight'`), and `weather` (`'sunny' | 'breezy' | 'rainy' | 'monsoon' | 'storm' | 'foggy'`).
- **Time Ratio**: Defaults to 1 real second = 1 in-game minute (`minuteTickAccumulator += (deltaMs / 1000) * timeScale`). 1 in-game day (1440 minutes) = 24 real minutes.

### 3.2 Notification & Event Model
- Currently exposes basic single callbacks:
  - `onMinute(callback: (date: CalendarDate) => void)`
  - `onDay(callback: (date: CalendarDate) => void)`
  - `onSeasonCallback(season: Season, year: number)`
- **Deficiencies Identified**:
  - No standard `EventEmitter` with pub/sub listener arrays. Setting a callback overwrites any existing listener.
  - No `phaseChanged` event emitter (it silently recalculates `timePhase` during `advanceMinute()`).
  - No `weatherChanged` event emitter.
  - No built-in `getDayOfWeek()` helper (days are 1–28, equivalent to a 4-week month of 7 days: Monday through Sunday).
  - Time continues ticking during cutscenes and dialogue unless explicitly paused.

---

## 4. Seasonal Cycle Audit

- **Crops Manifest (`src/config/crops.db.ts`)**:
  - Rajshahi Mango: `summer`
  - Sylhet Tea: `spring`, `monsoon`, `autumn`
  - Golden Valley Jute: `monsoon`
  - Bogurar Potato: `winter`
  - Dinajpur Litchi: `summer`
  - Rangpur Tobacco Leaf: `winter`
  - Sreemangal Pineapple: `summer`, `monsoon`
- **TimeCalendarSystem Implementation**:
  - Confirmed: `const cycle: Season[] = ['spring', 'summer', 'monsoon', 'autumn', 'winter'];`
- **Finding**: The game features an authentic **5-season Bengal calendar** (Spring/Basanta, Summer/Grishma, Monsoon/Barsha, Autumn/Sharat, Winter/Sheet). All NPC schedules must natively support these 5 seasons.

---

## 5. Collision & Terrain Representation

1. **Static Obstacles (`this.obstacles`)**:
   - Stored in a Phaser static physics group: `this.obstacles = this.physics.add.staticGroup()`.
   - Walls, fences, buildings, stalls, and lake banks are registered as Arcade physics static zones: `blockRect(x, y, w, h)`.
   - Only collides with `this.player` (`this.physics.add.collider(this.player, this.obstacles)`). Wanderers currently bypass `this.obstacles` entirely.
2. **Tilemap & Autotiling**:
   - `DhakaValleyScene.buildDhakaTilemap()` builds a 80×60 tile grid (2560×1920 px) with 32×32 tiles.
   - Paved roads (`tile-path`), grass (`tile-grass`), water (`tile-water`), and flower beds exist across distinct tile sprites and layers.
3. **Farming Soil Grid (`FarmingSystem.ts`)**:
   - Tracks dynamic 32×32 cells via `Map<string, FarmGridCell>`.
   - Contains flags: `isTillable`, `isTilled`, `isWatered`, `crop`.
   - **Critical Rule**: Stardew Valley rules dictate that NPCs must never walk over tilled soil or growing crops. A* pathfinding must register `isTilled` cells and active crops as impassable or heavily penalized tiles.

---

## 6. Per-Frame Scene Update Cost Analysis

In `DhakaValleyScene.update(time, delta)`:
- `timeCalendar.update(delta)`: ~0.02 ms.
- `atmosphere.update(time, delta)`: ~0.10 ms (color tweening and light halo positioning).
- `rainGraphics`: Batched lines when raining, ~0.40 ms.
- Ambient audio / evening light loops: ~0.15 ms.
- Floating petals & water animation: ~0.20 ms.
- Wanderers loop (7 entities): ~0.25 ms.
- Enemies loop: ~0.35 ms.
- Player movement & physics: ~0.30 ms.
- Total baseline frame duration: **~1.77 ms – 3.20 ms** (headroom of >13 ms before breaching the 16.6 ms 60 FPS budget).

### Performance Risk & Mitigation:
Running naive A* pathfinding for 20+ active NPCs on an 80×60 grid (4,800 nodes) every frame would trigger massive GC pressure and frame stutter.
**Mitigation Strategy for Engine**:
1. Path requests must be queued with a strict per-frame budget (max 1–2 full A* evaluations per frame).
2. Static path segments must be cached per `(map, fromTile, toTile)`.
3. Offscreen NPCs must **never** run frame-by-frame pathfinding; their positions will be resolved analytically upon map transition.

---

## 7. NPC Count Reconciliation (`GAME_CONTEXT.md` §5)

### Audit Findings:
- Section 5 of `GAME_CONTEXT.md` was titled: `5. Complete Overworld Character Directory (32 NPCs)`.
- However, the list of entries under §5 is numbered from 1 to 38.
- Exact breakdown from code and documentation:
  1. **Dhaka Valley Overworld Citizens & Vendors**: 19 NPCs
     - 7 Wanderers: Anamika, Arif, Nadia, Mimi the Cat, Baki Bhai, Sami, Tania.
     - 7 Vendors & Artists: Tong-er Mama, TSC Singer, Charukola Clay Artist, Nilkhet Boiwala, Phulwali, Mama's Naga Fuchka, Pabnar Mishti Doi.
     - 5 Relationship NPCs: Ahona, Apshora, Rakin, Mehjabin, Iman.
  2. **Curzon Hall Science Interior**: 6 NPCs
     - Prof. Motahar Hossain, Prof. Satyendra (Bose), Faiza, Prof. Sultana, Dr. Kabir, Tanvir.
  3. **Green Meadows Farmhouse Pastoral NPCs & Animals**: 5 Entities
     - Chacha Rafiq, Shuravi (Cow), Kalu (Goat), Tuntuni (Hen), Piku (Duckling).
  4. **Expedition Realms Sages, Ghosts & Guardians**: 8 Entities
     - Elder Banyan Sage, Ananya the Weeping Petni, Kofil Chacha, Prof. Shamsher, Tidekeeper Marina, Master Blacksmith Kael, Astronomer Lyra, Celestial Chronicler.

**Conclusion**: The true count is exactly **38 NPCs / Entities**. The title "32 NPCs" was an outdated remnant from before the farmhouse pastoral animals (4) and the two student researchers (Faiza, Tanvir) were introduced.

**Action**: Reconcile the title in `GAME_CONTEXT.md` §5 to `Complete Overworld Character Directory (38 NPCs & Entities)`.
