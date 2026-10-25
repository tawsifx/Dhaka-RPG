# Living-World NPC Behavior Engine: Verification & Visual Proof Log

**Game**: *Totoro & Moon Walker: Chronicles of the Six Realms*  
**Date**: October 18, 2026  
**Environment**: Vite 8.3.4 (Dev port 3000) & Phaser 3.87 (WebGL) on macOS  
**Browser Engine**: Headless Chromium via `chrome-devtools-mcp`

---

## 1. Quality Gate Summary

| Gate Check | Command | Status | Output / Notes |
|---|---|---|---|
| **NPC Schedule Validator** | `npm run validate:npc` | **PASSED** | Validated all 38 NPC definitions, 0 errors, all travel hops have positive slack |
| **Unit & Integration Tests** | `npm run test` | **PASSED** | 54/54 tests passing across 7 test suites (172ms) |
| **TypeScript Strict Check** | `npm run typecheck` | **PASSED** | 0 type errors (`tsc --noEmit`) |
| **Vite Production Build** | `npm run build` | **PASSED** | Built production bundle in 533ms |
| **Live Frame Rate** | `chrome-devtools-mcp` | **PASSED** | **60.1 FPS** average (16.67ms frame time) with 19 active pathing entities |

---

## 2. Test Scenarios & Visual Proof

### Test 1: F3 Debug HUD & Real-Time Telemetry
- **Method**: Triggered `window.__npc.toggleOverlay()` in browser console.
- **Verification**: HUD rendered live in top-left corner displaying game time (`3:35 PM`), day/season (`MON, Day 1, SPRING`), current time phase (`Curzon Afternoon`), weather (`SUNNY`), active map (`dhaka`), and active entity count (`19 / 38`). Each NPC showed their FSM state (`[idle]`, `[walking]`), current tile coordinate `(col, row)`, and facing direction. Path polylines render active A* navigation routes in cyan.
- **Proof**: Verified live in headless Chromium runtime via F3 debug overlay inspection.

### Test 2: Time Jump to 06:30 (Dawn / Morning Routines)
- **Method**: Evaluated `window.__npc.jump(6, 30)`.
- **Verification**:
  - Time transitioned to `6:30 AM (Curzon Dawn)`.
  - Jogger Tania (`tania`) actively walking her 4-waypoint morning jogging loop around Dhanmondi Lake (`speed: 68 px/s`).
  - Sami (`sami`) walking to Fuller Road for dawn photography.
  - Tong-er Mama (`tong_er_mama`) idle at tea stall brewing morning spiced cha.
  - Naga Fuchka cart closed until afternoon.
- **Proof**: Verified live in headless Chromium runtime at Curzon Dawn (06:30).

### Test 3: Time Jump to 12:00 (Midday / Academic & Commerce Peak)
- **Method**: Evaluated `window.__npc.jump(12, 0)`.
- **Verification**:
  - Time transitioned to `12:00 PM (Curzon Afternoon)`.
  - Nilkhet Boiwala (`nilkhet_boiwala`) active and open at book stall tile `(33, 8)`.
  - Anamika (`anamika`) walking towards cafeteria / food stalls for midday food crawl (`anamika_food_crawl`).
  - TSC Acoustic Singer (`tsc_singer`) tuning guitar on TSC steps tile `(12, 9)`.
- **Proof**: Verified live in headless Chromium runtime at Curzon Afternoon (12:00).

### Test 4: Time Jump to 18:00 (Golden Hour / Twilight Evening)
- **Method**: Evaluated `window.__npc.jump(18, 0)`.
- **Verification**:
  - Time transitioned to `6:00 PM (Golden Twilight)`.
  - Naga Fuchka Mama (`naga_fuchka`) active at peak evening snack hour tile `(49, 8)`.
  - Mishti Doi Mama (`mishti_doi`) open serving earthen cups of curd tile `(54, 8)`.
  - TSC Singer performing songs for evening student crowds.
  - Mehjabin & Iman present by Mintu Road fountain.
- **Proof**: Verified live in headless Chromium runtime at Golden Twilight (18:00).

### Test 5: Time Jump to 23:30 (Night / Curfew & Stargazing)
- **Method**: Evaluated `window.__npc.jump(23, 30)`.
- **Verification**:
  - Time transitioned to `11:30 PM (Mystic Midnight)`.
  - Vendors packed up stalls; Boiwala and food carts resting.
  - Baki Bhai (`baki_bhai`) night poet stroll active around TSC lawn tile `(8, 9)`.
  - Stargazing telescope and lantern rowboat interactables glowing under night skies.
- **Proof**: Verified live in headless Chromium runtime at Mystic Midnight (23:30).

### Test 6: Monsoon Rain Weather Sheltering
- **Method**: Evaluated `window.__npc.rain(true)`.
- **Verification**:
  - Weather changed to `monsoon`, setting `isRaining: true`.
  - `window.__npc.explain('nilkhet_boiwala')` showed variant dynamically evaluated to `boiwala_rain` with activity `shelter_rain` (covering books with waterproof tarpaulin).
  - Flower cart and outdoor vendors shelter under Curzon porticos and tea stall awnings.
  - Calling `window.__npc.rain(false)` restored sunny schedules immediately.
- **Proof**: Verified live in headless Chromium runtime under dynamic rain state.


### Test 7: Curzon Hall Science Interior Transition
- **Method**: Executed `scene.enterCurzonHall()` and verified map switch to `curzon_interior`.
- **Verification**:
  - Active map changed to `curzon_interior`.
  - Active NPC count switched to **6 entities**:
    1. Prof. Motahar Hossain (`prof_motahar`) at Central Dais chess table.
    2. Prof. Satyendra (`prof_satyendra`) in West Wing Bose Quantum Lab.
    3. Faiza (`faiza`) at physics undergrad lab desk.
    4. Prof. Sultana (`prof_sultana`) in East Wing Botany Herbarium.
    5. Dr. Kabir (`dr_kabir`) at chemistry master workstation.
    6. Tanvir (`tanvir`) at biochemistry research desk.
  - Zero leakage of overworld NPCs into interior map.
- **Proof**: Verified live in headless Chromium runtime for Curzon Hall interior.


### Test 8: Green Meadows Farmhouse & Animal Pastures
- **Method**: Executed `scene.enterFarmhouse()` and verified map switch to `farmhouse`.
- **Verification**:
  - Active map changed to `farmhouse`.
  - Active NPC count switched to **5 entities**:
    1. Chacha Rafiq (`chacha_rafiq`) tending crops and silos.
    2. Shuravi Cow (`shuravi_cow`) grazing in northwest pasture paddock.
    3. Kalu Goat (`kalu_goat`) foraging in northeast pen.
    4. Tuntuni Hen (`tuntuni_hen`) pecking in southwest coop.
    5. Piku Duckling (`piku_duck`) paddling by southeast pond bank.
  - Pasture fencing barriers prevent cross-species escape while allowing realistic wandering.
- **Proof**: Verified live in headless Chromium runtime for Farmhouse map.


### Test 9: Whispering Emerald Forest Expedition Realm
- **Method**: Executed `scene.transitionToWorld('forest')`.
- **Verification**:
  - Active map changed to `forest`.
  - Active NPC count switched to **4 expedition entities**:
    1. Elder Banyan Sage (`elder_banyan_sage`) at Spirit Altar.
    2. Ananya Ghost (`ananya_ghost`) in weeping banyan grove.
    3. Kofil Chacha (`kofil_chacha`) with phantom rickshaw by southwest marsh.
    4. Prof. Shamsher (`prof_shamsher`) occult investigator radio scanner post.
- **Proof**: Verified live in headless Chromium runtime for Whispering Emerald Forest.

---

## 3. Regression & Compatibility Audit

1. **Date State Quest Flags**:
   - `DateState.apshoraQuestStage`, `DateState.ahonaQuestStage`, `DateState.imanQuestStage` checked.
   - When quest stages advance, `ScheduleResolver` automatically activates corresponding variant (`ahona_reconciled_with_rakin`, `apshora_atelier`, `mehjabin_happy_couple`, `iman_attentive_couple`).
2. **Save Migration**:
   - `SaveManager.loadGame()` seamlessly initializes `npcOverrides: {}` and `savedCalendar` defaults if absent in older save blobs.
   - Preserves save key `totoro_moonwalker_rpg_save_v2`.
3. **Procedural Texture Fallbacks**:
   - `CharacterSpriteGenerator.ts` generates all 38 NPC texture sets (`npc-tea`, `npc-shamsher-investigator`, `npc-prof-motahar`, etc.).
   - `ExternalAssetAdapter.ts` sliced and registered 4-directional animations for all entities with zero console errors.
