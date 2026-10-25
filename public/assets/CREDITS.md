# 📜 Asset Credits & Attribution Log

> Records provenance, authors, source URLs, licenses, and dates for all external sprites and tilesets integrated into *Totoro & Moon Walker: Chronicles of the Six Realms*.
> Conforms to CC-BY 3.0, CC-BY 4.0, CC0 / Public Domain, and licensed usage terms.

---

## 🎭 Characters & Companions

### 1. Satsuki Kusakabe (Moon Walker)
- **Slot ID**: `player` (`player-0`, `player-1`, `player-2`, `player-3`)
- **File**: `public/assets/sprites/characters/moon_walker.png`
- **Native Dimensions**: 128×256 px (32×64 px per frame, 4×4 grid)
- **Author**: Custom commissioned HGSS-style sprite sheet for Satsuki Kusakabe
- **License**: CC-BY 4.0 (Tawsif & AI Collaboration)
- **Date**: October 18, 2026
- **Description**: 4-direction walk cycles (Down, Left, Right, Up) in authentic Pokémon HeartGold/SoulSilver 16-bit retro aesthetic.

### 2. Totoro (Forest Spirit Companion)
- **Slot ID**: `totoro` (`totoro-0`, `totoro-1`, `totoro-2`, `totoro-3`)
- **File**: `public/assets/sprites/characters/totoro.png`
- **Native Dimensions**: 272×304 px (68×76 px per frame, 4×4 grid)
- **Author**: Custom commissioned HGSS follower Pokémon-style sprite sheet
- **License**: CC-BY 4.0 (Tawsif & AI Collaboration)
- **Date**: October 18, 2026
- **Description**: Giant slate-grey forest spirit with cream chevron-marked belly and leaf umbrella.

### 3. Nadia (Female Painter & Sketcher)
- **Slot ID**: `npc_walker2`
- **File**: `public/assets/sprites/characters/npc_walker2.png`
- **Native Dimensions**: 128×192 px (32×48 px per frame, 4×4 grid)
- **Author**: trchar overworld character pack
- **License**: CC0 / Public Domain
- **Date**: October 19, 2026
- **Description**: Young female artist with beret and art satchel for Charukola Fine Arts campus.

---

## 👾 Biome Enemies & Guardian Bosses (Integrated External Art)

### 4. Briar Bogling (Moss Slime Mob)
- **Slot ID**: `enemy-slime`
- **File**: `public/assets/sprites/enemies/briar_bogling.png`
- **Animation Timing**: `public/assets/sprites/enemies/briar_bogling.anim.json`
- **Dimensions**: 256×256 px (64×64 px per frame, 4×4 grid)
- **Author**: Calciumtrice / cyberkrishna (OpenGameArt) (repacked & aligned by AI pair)
- **Source URL**: https://opengameart.org/content/pixel-art-animated-slime (cyberkrishna pets mirror)
- **License**: CC0 1.0 Universal (Public Domain Dedication)
- **Date**: October 19, 2026 (Repacked to 4x4 on October 25, 2026)
- **Layout & Timing**:
  - Row 0 (frames 0-3): Idle breathing
  - Row 1 (frames 4-7): Hop / Walk stride
  - Row 2 (frames 8-11): Leap strike / Spore burst (hitbox frames 9-11)
  - Row 3 (frames 12-15): Squish stagger / dizzy recoil

---

## 🎨 Title Screen Background Artwork

### Studio Ghibli 'My Neighbor Totoro' Scenic Slideshow
- **Files**: `public/assets/backgrounds/totoro_scene_1.jpg` through `totoro_scene_5.jpg`
- **Native Dimensions**: 1376×768 px (16:9 widescreen)
- **Scenes**:
  1. *The Rainy Bus Stop*: Totoro holding a leaf umbrella beside Moon Walker at twilight.
  2. *Moonlit Dance of the Grove*: Totoro and Moon Walker under a full moon with glowing fireflies.
  3. *The Great Camphor Tree*: Massive mossy roots with sunbeams filtering through the forest canopy.
  4. *Windy Sunset Meadow*: Golden hour hillside overlooking scenic countryside valley.
  5. *Flight Above the Night Clouds*: Moonlit cloudscape ride atop a spinning wooden top.
- **License**: Non-commercial artistic asset generated for private fan project.
- **Date**: October 25, 2026

---

## 🎵 Special Audio & Vocal Tracks

### 1. 'Ohona' (Ahona's Theme & Concert Song)
- **File**: `public/assets/audio/ohona_song.mp3`
- **Usage**: Plays from 20s during high-affection interactions with Ahona, and from 15s during Rakin's acoustic guitar lakeside concert cutscene.
- **Date**: October 24, 2026

---

### 5. Sylvan Briar Stag (Forest Guardian Boss)
- **Slot ID**: `boss-stag`
- **File**: `public/assets/sprites/bosses/sylvan_briar_stag.png`
- **Animation Timing**: `public/assets/sprites/bosses/sylvan_briar_stag.anim.json`
- **Dimensions**: 512×512 px (128×128 px per frame, 4×4 grid)
- **Author**: Pokémon Showdown Animated Sprite Archive (Sawsbuck Gen 5)
- **Source URL**: https://play.pokemonshowdown.com/sprites/ani/sawsbuck.gif
- **License**: Fair Use / Fan Educational Game Asset Archive
- **Date**: October 19, 2026
- **Layout & Timing**:
  - Row 0 (frames 0-3): Majestic idle stance with glowing emerald antlers
  - Row 1 (frames 4-7): Regal bounding gallop / stride
  - Row 2 (frames 8-11): Sweeping antler charge / nature barrier surge (hitbox frames 9-11)
  - Row 3 (frames 12-15): Dazed stagger / poise break recoil

---

## 🕹️ Mobile Touch Action Icons
- **Files**: `public/assets/icons/atk.svg`, `act.svg`, `dash.svg`, `roar.svg`, `slam.svg`
- **Authors**: Lorc and Skoll
- **Source URL**: https://game-icons.net
- **License**: CC-BY 3.0 (Creative Commons Attribution 3.0 Unported)
- **Date**: October 25, 2026
- **Mapping**:
  - `atk.svg`: Crossed swords icon for basic attack & combo strikes
  - `act.svg`: Conversation bubbles for NPC dialogues and object interaction
  - `dash.svg`: Sprinting figure for evasion dash
  - `roar.svg`: Acoustic sonic shockwaves for Totoro Spirit Roar
  - `slam.svg`: Ground impact seismic shockwaves for Totoro Belly Slam

---

## ⚔️ Remaining Combat Slots (In Shopping List Pipeline)
The following slots are tracked in `ASSET_SHOPPING_LIST.md` and render labeled fallback placeholders through `ExternalAssetAdapter` until external CC0/CC-BY packs are ingested:
- `enemy-crab` (Tidepool Crabler - World 3 Sunken)
- `enemy-wisp` (Cinder Hound - World 4 Ember)
- `enemy-wraith` (Glacier Wraith - World 5 Frost & World 6 Astral)
- `boss-leviathan` (Abyssal Coral Leviathan - Sunken Guardian)
- `boss-drake` (Ignis, the Magma Drake - Ember Guardian)
- `boss-warden` (Cryon, Warden of Eternal Frost - Frost Guardian)
- `boss-archon` (Chrono-Fracture Archon - Final Boss)
