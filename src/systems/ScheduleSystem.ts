// src/systems/ScheduleSystem.ts - Living-World NPC Behavior Engine Orchestrator
import Phaser from 'phaser';
import { SoundEngine } from '../audio/SoundEngine';
import { GameDB } from '../config/databaseIndex';
import { NPC_SCHEDULES_DB } from '../config/npcSchedules.db';
import { WORLDS_DB } from '../config/worlds.db';
import { NpcDebugOverlay } from '../debug/NpcDebugOverlay';
import { DateState } from '../state/DateState';
import { RPGStats } from '../state/RPGStats';
import { GridTile, MapId, NpcScheduleDef, ScheduleContext, tileToPx } from '../types/npc.types';
import { UI } from '../ui/UIController';
import { NpcBehaviors } from './npc/NpcBehaviors';
import { NpcMover } from './npc/NpcMover';
import { NpcNavigator, TerrainCostProvider } from './npc/NpcNavigator';
import { OffscreenSimulator } from './npc/OffscreenSimulator';
import { resolveCurrentStop, resolveScheduleVariant } from './npc/ScheduleResolver';
import { TimeCalendarSystem } from './TimeCalendarSystem';

export interface ActiveNpcEntity {
  id: string;
  def: NpcScheduleDef;
  mover: NpcMover;
  sprite: Phaser.GameObjects.Sprite;
  badge: Phaser.GameObjects.Text;
  baseTex: string;
  onInteract: () => void;
  interactObj?: any;
  currentActivity?: string;
  idleTimer?: number;
  lineIdx?: number;
}

export interface NpcRoamData {
  anchorTile: GridTile;
  nextRoamTime: number;
  pauseDurationSec: number;
  roamRadius: number;
  isVendor: boolean;
  isSleeping: boolean;
}

const ANAMIKA_CONVERSATIONS = [
  [
    { speaker: 'Anamika', portrait: '🥙', text: 'Moon Walker!! Wait up! I literally just walked past TSC looking for you. Look at you and Totoro strolling together—my heart cannot handle how cute you two are!' },
    { speaker: 'Moon Walker', portrait: '🌙', text: 'Anamika! We were just exploring campus. Wait, is that a Star Kebab takeaway bag in your hand already?! We had a pact to go together!' },
    { speaker: 'Anamika', portrait: '🥙', text: 'Relax, bestie, this is just a warm-up leg roast! Our official Star Kebab mutton kacchi, brain masala, and cold falooda date at Dhanmondi is still 100% on for tomorrow!' },
    { speaker: 'Totoro', portrait: '🐾', text: 'Did someone say Star Kebab mutton kacchi and falooda? Anamika, you are officially my favorite friend of Moon Walker.' }
  ],
  [
    { speaker: 'Anamika', portrait: '📱', text: '*Sighs at her phone screen*... Shuvra just called me from Barishal. He is standing on the deck of the Sadarghat-bound launch watching the Kirtankhola River.' },
    { speaker: 'Moon Walker', portrait: '🌙', text: 'Aww, how is Shuvra doing in Barishal? Is he taking the night launch to Dhaka this weekend?' },
    { speaker: 'Anamika', portrait: '🥺', text: 'Yes! He promised to bring a whole tin of Barishal’s famous Guthia Sandesh and Balam rice when his launch docks at Sadarghat at 6 AM.' },
    { speaker: 'Moon Walker', portrait: '🌙', text: 'And let me guess—the second Shuvra steps off the launch, the four of us are heading straight to Star Kebab for breakfast parathas, khichuri, and beef seekh?' },
    { speaker: 'Anamika', portrait: '🥙', text: 'You know me better than I know myself! Shuvra already said he is paying for the extra falooda.' }
  ],
  [
    { speaker: 'Anamika', portrait: '🥙', text: 'Okay, real talk: remember last month at Star Kebab when we laughed so hard over Shuvra’s Barishal slang that you nearly spilled borhani on the waiter?' },
    { speaker: 'Moon Walker', portrait: '🌙', text: 'Hey! You were the one doing a dramatic impression of Shuvra arguing with a launch cabin master!' },
    { speaker: 'Totoro', portrait: '🐾', text: 'Wait, I need to hear this entire story over clay-cup cha. Does Shuvra really defend Barishal launches like a matter of national pride?' },
    { speaker: 'Anamika', portrait: '😂', text: 'Totoro, do NOT get Shuvra started on Barishal launches unless you have three hours to spare and a full plate of Star Kebab beef chap in front of you!' }
  ],
  [
    { speaker: 'Anamika', portrait: '💌', text: 'Shuvra just texted: "Tell Moon Walker and Totoro that next time they visit Barishal, floating guava market tour and river hilsa are on me!"' },
    { speaker: 'Moon Walker', portrait: '🌙', text: 'Tell Shuvra it is a deal! Though until he gets back from Barishal, I am keeping you company on every Star Kebab run.' },
    { speaker: 'Totoro', portrait: '🐾', text: 'Long-distance from Dhaka to Barishal takes real devotion. Shuvra sounds like a solid guy, Anamika!' }
  ]
];

const ARIF_CONVERSATIONS = [
  [
    { speaker: 'Arif (DU Physics Senior)', portrait: '🎓', text: 'I was supposed to be deriving Schrödinger’s wave equation at the Science Library, yet the Krishnachura breeze on Fuller Road pulled me out here.' },
    { speaker: 'Totoro', portrait: '🐾', text: 'According to my calculations, walking beside Moon Walker increases local happiness by 1000%.' }
  ],
  [
    { speaker: 'Arif (DU Physics Senior)', portrait: '🎓', text: 'Did you notice the shimmering spacetime anomaly at the East end of Fuller Road? My magnetometer went crazy near it!' },
    { speaker: 'Moon Walker', portrait: '🌙', text: 'That is the Realm Fracture Portal! Totoro and I are planning to investigate it together.' }
  ],
  [
    { speaker: 'Arif (DU Physics Senior)', portrait: '🎓', text: 'Curzon Hall’s red bricks have seen a hundred monsoons, yet every afternoon under these trees feels brand new.' },
    { speaker: 'Totoro', portrait: '🐾', text: 'Especially when you have the right lab partner holding your hand.' }
  ],
  [
    { speaker: 'Arif (DU Physics Senior)', portrait: '🎓', text: 'Pro-tip from a final-year senior: two cups of Tong-er Mama’s cardamom Malai Cha can solve more problems than any textbook.' }
  ]
];

const NADIA_CONVERSATIONS = [
  [
    { speaker: 'Nadia (Charukola Sketcher)', portrait: '🖌️', text: 'Hold that pose for five seconds! A girl in a yellow polo and amber suspender skirt walking beside a giant forest spirit is pure Studio Ghibli magic!' },
    { speaker: 'Totoro', portrait: '🐾', text: 'Make sure you get my good side—and draw Chibi-Totoro on top of my head too!' }
  ],
  [
    { speaker: 'Nadia (Charukola Sketcher)', portrait: '🖌️', text: 'We stayed up all night painting alpana and terracotta murals along the Charukola wall. Have you two painted your clay mugs yet?' },
    { speaker: 'Moon Walker', portrait: '🌙', text: 'Charukola always has the warmest colors in Dhaka. We love stopping by the banyan trees there!' }
  ],
  [
    { speaker: 'Nadia (Charukola Sketcher)', portrait: '🖌️', text: 'Look at the contrast between the crimson Krishnachura petals and the old red bricks of Curzon Hall. Dhaka in love is a living canvas.' }
  ],
  [
    { speaker: 'Nadia (Charukola Sketcher)', portrait: '🖌️', text: 'I sketched your silhouettes in charcoal! If you ever frame it, title it "Chronicles of Fuller Road."' }
  ]
];

const MIMI_CONVERSATIONS = [
  [
    { speaker: 'Mimi (Campus Ginger Cat)', portrait: '🐱', text: 'Mrr-meow! (Mimi figure-eights around your ankles and stares up at Totoro’s giant cream belly like it is the ultimate nap cloud.)' },
    { speaker: 'Totoro', portrait: '🐾', text: 'Look, Moon Walker, Mimi approves of us! Can we make her our official TSC mascot?' }
  ],
  [
    { speaker: 'Mimi (Campus Ginger Cat)', portrait: '🐱', text: 'Purrrrr... (Mimi gently taps your hand with a white-socked paw, politely inquiring if you brought any leftover Star Kebab roast from Anamika.)' },
    { speaker: 'Moon Walker', portrait: '🌙', text: 'Haha, Mimi has the most refined food radar on the entire Dhaka University campus!' }
  ],
  [
    { speaker: 'Mimi (Campus Ginger Cat)', portrait: '🐱', text: 'Mew! (Mimi bats playfully at the dangling pink blossom on Chibi-Totoro’s miniature fishing line, then curls her tail happily.)' }
  ],
  [
    { speaker: 'Mimi (Campus Ginger Cat)', portrait: '🐱', text: 'Prrrr-chirp! (Mimi stretches in the warm afternoon sunbeam and gives you a slow, affectionate cat-blink.)' }
  ]
];

const BAKI_CONVERSATIONS = [
  [
    { speaker: 'Baki Bhai (Nilkhet Poet)', portrait: '📜', text: '"In a city of ten million rickshaw bells, one quiet glance across a clay teacup says everything." I just composed that for you two!' },
    { speaker: 'Totoro', portrait: '🐾', text: 'Write that down in my notebook, Baki Bhai! I need lines like that whenever Moon Walker smiles at me.' }
  ],
  [
    { speaker: 'Baki Bhai (Nilkhet Poet)', portrait: '📜', text: 'Jibanananda Das once wrote of Banalata Sen of Natore, yet today I see the poetry of Dhaka walking right past Aparajeyo Bangla.' },
    { speaker: 'Moon Walker', portrait: '🌙', text: 'Nilkhet’s old book alleys and Baki Bhai’s verses make the whole afternoon feel timeless.' }
  ],
  [
    { speaker: 'Baki Bhai (Nilkhet Poet)', portrait: '📜', text: 'When you buy a second-hand poetry book in Nilkhet, check the margins—sometimes previous lovers left pressed Krishnachura petals inside.' }
  ],
  [
    { speaker: 'Baki Bhai (Nilkhet Poet)', portrait: '📜', text: '"From the arches of Curzon to the lanterns of Dhanmondi Lake, may your footsteps always rhyme."' }
  ]
];

const SAMI_CONVERSATIONS = [
  [
    { speaker: 'Sami (Street Photographer)', portrait: '📸', text: '*Click-shutter!* Caught a 50mm prime candid of you two! The way Totoro looks at you when you are laughing is pure magazine-cover material.' },
    { speaker: 'Totoro', portrait: '🐾', text: 'Guilty as charged. How am I supposed to look anywhere else when Moon Walker is right here?' }
  ],
  [
    { speaker: 'Sami (Street Photographer)', portrait: '📸', text: 'Golden hour light bouncing off the Fuller Road fountain and Dhanmondi Lake is every Dhaka street photographer’s dream.' },
    { speaker: 'Moon Walker', portrait: '🌙', text: 'Save a copy of that photo for our Chronicle Scrapbook, Sami!' }
  ],
  [
    { speaker: 'Sami (Street Photographer)', portrait: '📸', text: '*Click!* I also snapped a photo of your friend Anamika earlier—she was proudly holding up a Star Kebab parcel while on video call with Barishal!' }
  ],
  [
    { speaker: 'Sami (Street Photographer)', portrait: '📸', text: 'If you two take the painted rickshaw tour at dusk, wave at my lens when you pass the fountain plaza!' }
  ]
];

const TANIA_CONVERSATIONS = [
  [
    { speaker: 'Tania (Dhanmondi Jogger)', portrait: '👟', text: 'Phew! Three laps around Ramna and Dhanmondi Lake! Every couple on the wooden pier tonight looks like they are in a romantic movie.' },
    { speaker: 'Totoro', portrait: '🐾', text: 'We are saving the lantern rowboat at the tip of the pier for our grand finale!' }
  ],
  [
    { speaker: 'Tania (Dhanmondi Jogger)', portrait: '👟', text: 'Someone set up a brass stargazing telescope on the Dhanmondi Lake pier! The evening breeze just cleared the sky.' }
  ],
  [
    { speaker: 'Tania (Dhanmondi Jogger)', portrait: '👟', text: 'My cardio routine is 50% jogging and 50% resisting the urge to stop at Mama’s Naga Fuchka cart and Old Dhaka Mishti Doi.' },
    { speaker: 'Moon Walker', portrait: '🌙', text: 'Life is too short to skip Naga fuchka and Bogurar Mishti Doi, Tania!' }
  ],
  [
    { speaker: 'Tania (Dhanmondi Jogger)', portrait: '👟', text: 'Keep hydrated, you two! If you head into the Eastern Portal, make sure you have plenty of TSC Malai Cha in your bag.' }
  ]
];

export class ScheduleSystem {
  private scene: any;
  private navigator: NpcNavigator;
  private simulator: OffscreenSimulator;
  private debugOverlay?: NpcDebugOverlay;
  private activeNpcs: Map<string, ActiveNpcEntity> = new Map();
  private roamStates: Map<string, NpcRoamData> = new Map();
  private unsubscribeTime?: () => void;
  private unsubscribeWeather?: () => void;
  private unsubscribeDay?: () => void;

  constructor(scene: any) {
    this.scene = scene;

    // 1. Terrain cost provider linked to farming system
    const costProvider: TerrainCostProvider = {
      isBlocked: (c, r, mapId) => {
        // Check map bounds
        if (mapId === 'dhaka' || mapId === 'forest' || mapId === 'sunken' || mapId === 'ember' || mapId === 'frost' || mapId === 'astral') {
          if (c < 0 || c >= 80 || r < 0 || r >= 60) return true;
        } else {
          if (c < 0 || c >= 40 || r < 0 || r >= 30) return true;
        }

        // Prevent NPCs from walking into water bodies while allowing bridges and piers
        if (mapId === 'dhaka') {
          // Dhanmondi Lake Pier (walkable)
          const onPier = c >= 48 && c <= 60 && r >= 40 && r <= 42;
          // Arched Stone & Teakwood Canal Bridge (walkable)
          const onCanalBridge = c >= 59 && c <= 63 && r >= 23 && r <= 27;
          if (!onPier && !onCanalBridge) {
            // Main Lake Basin (1568..2400, 1056..1800)
            if (c >= 49 && c <= 75 && r >= 33 && r <= 56) return true;
            // Northern Lake Cove (1728..2400, 928..1056)
            if (c >= 54 && c <= 75 && r >= 29 && r <= 33) return true;
            // Southern Lake Inlet (1440..1568, 1504..1800)
            if (c >= 45 && c <= 49 && r >= 47 && r <= 56) return true;
            // Upper Ramna Lotus Pond (1856..2080, 384..528)
            if (c >= 58 && c <= 65 && r >= 12 && r <= 16) return true;
            // Ramna-Dhanmondi Serpentine Canal (1920..2000, 528..928)
            if (c >= 60 && c <= 62 && r >= 16 && r <= 29) return true;
            // Curzon Botanical Lotus Pond (1088..1344, 1248..1408)
            if (c >= 34 && c <= 42 && r >= 39 && r <= 44) return true;
          }
        } else if (mapId === 'farmhouse') {
          // Farmhouse Duck Pond (800..1080, 570..760)
          if (c >= 25 && c <= 34 && r >= 17 && r <= 24) return true;
        }

        // Check if farm cell has growing crop
        if (scene.farming && typeof scene.farming.getCell === 'function') {
          const cell = scene.farming.getCell(c, r);
          if (cell && cell.crop !== null) return true;
        }
        return false;
      },
      getCost: (c, r) => {
        if (scene.farming && typeof scene.farming.getCell === 'function') {
          const cell = scene.farming.getCell(c, r);
          if (cell && cell.isTilled) return 999.0; // Heavily avoid tilled soil
        }
        return 1.0;
      }
    };

    this.navigator = new NpcNavigator(costProvider);
    this.simulator = new OffscreenSimulator(this.navigator);

    if (scene.timeCalendar) {
      this.bindCalendarEvents(scene.timeCalendar);
      this.debugOverlay = new NpcDebugOverlay(scene, scene.timeCalendar);
    }
  }

  private bindCalendarEvents(tc: TimeCalendarSystem): void {
    // Re-plan on minute changes if any NPC reached a scheduled departure
    this.unsubscribeTime = tc.subscribeMinute(() => {
      this.evaluateSchedules();
    });

    // Re-plan on weather change (e.g. sudden monsoon rain)
    this.unsubscribeWeather = tc.subscribeWeather(() => {
      this.evaluateSchedules(true);
    });

    // Re-plan on day start
    this.unsubscribeDay = tc.subscribeDay(() => {
      this.navigator.invalidateCache();
      this.evaluateSchedules(true);
    });
  }

  destroy(): void {
    if (this.unsubscribeTime) this.unsubscribeTime();
    if (this.unsubscribeWeather) this.unsubscribeWeather();
    if (this.unsubscribeDay) this.unsubscribeDay();
    this.activeNpcs.clear();
    this.roamStates.clear();
  }

  /**
   * Initializes NPCs for the current active world map.
   * Uses OffscreenSimulator to analytically place every NPC that belongs on this map right now.
   */
  initWorldNpcs(worldId: MapId): void {
    this.activeNpcs.clear();
    this.roamStates.clear();
    if (this.debugOverlay) this.debugOverlay.unregisterAll();

    const tc: TimeCalendarSystem = this.scene.timeCalendar;
    const date = tc ? tc.getDate() : { season: 'spring' as const, day: 1, hour: 12, minute: 0, weather: 'sunny' as const };
    const totalMinutes = tc ? tc.getTotalMinutes() : 720;
    const dayOfWeek = tc ? tc.getDayOfWeek() : 'mon';

    const ctx: ScheduleContext = {
      hour: Math.floor(totalMinutes / 60),
      minute: totalMinutes % 60,
      totalMinutes,
      season: date.season,
      day: date.day,
      dayOfWeek,
      weather: date.weather,
      isRaining: date.weather === 'rainy' || date.weather === 'monsoon' || date.weather === 'storm',
      affection: DateState.hearts || 0,
      questFlags: DateState,
      activeOverride: DateState.npcOverrides ? DateState.npcOverrides[worldId] : null
    };

    // Filter which NPCs should currently appear on this map using the O(1) map index
    const candidateNpcs = GameDB.getNpcsForMap(worldId);
    const listToCheck = candidateNpcs.length > 0 ? candidateNpcs : Object.values(NPC_SCHEDULES_DB);
    listToCheck.forEach(def => {
      const placement = this.simulator.simulatePlacement(def, ctx);

      if (placement.map === worldId) {
        this.spawnNpcOnMap(def, placement);
      }
    });
  }

  private getNpcHeadbarStyle(id: string): { bg: string; color: string; stroke: string } {
    if (id === 'anamika') return { bg: 'rgba(15, 118, 110, 0.92)', color: '#fff3a1', stroke: '#042f2e' };
    if (['tong_er_mama', 'naga_fuchka', 'mishti_doi', 'phulwali', 'nilkhet_boiwala', 'clay_artist', 'chacha_rafiq'].includes(id)) {
      return { bg: 'rgba(120, 53, 15, 0.90)', color: '#fef3c7', stroke: '#451a03' };
    }
    if (['arif', 'prof_motahar', 'prof_satyendra', 'faiza', 'prof_sultana', 'dr_kabir', 'tanvir'].includes(id)) {
      return { bg: 'rgba(30, 27, 75, 0.90)', color: '#e0e7ff', stroke: '#0f0b2e' };
    }
    if (['nadia', 'tsc_singer', 'apshora', 'sami'].includes(id)) {
      return { bg: 'rgba(112, 26, 117, 0.90)', color: '#fae8ff', stroke: '#3b0764' };
    }
    if (id === 'tania') return { bg: 'rgba(194, 65, 12, 0.90)', color: '#ffedd5', stroke: '#431407' };
    if (['mimi', 'shuravi_cow', 'kalu_goat', 'tuntuni_hen', 'piku_duck'].includes(id)) {
      return { bg: 'rgba(21, 128, 61, 0.90)', color: '#dcfce7', stroke: '#052e16' };
    }
    if (['ananya_ghost', 'kofil_chacha', 'prof_shamsher', 'elder_banyan_sage', 'tidekeeper_marina', 'blacksmith_kael', 'astronomer_lyra', 'celestial_chronicler'].includes(id)) {
      return { bg: 'rgba(76, 29, 149, 0.90)', color: '#f3e8ff', stroke: '#2e1065' };
    }
    if (['ahona', 'rakin', 'salat', 'enan', 'mehjabin', 'iman'].includes(id)) {
      return { bg: 'rgba(159, 18, 57, 0.90)', color: '#ffe4e6', stroke: '#4c0519' };
    }
    return { bg: 'rgba(24, 24, 27, 0.88)', color: '#f7efe2', stroke: '#09090b' };
  }

  private getRoamProfile(npcId: string): { roamRadius: number; pauseDurationSec: number; isVendor: boolean } {
    // Street Vendors stay close to their carts/stalls, stepping 1 tile side to side to tend wares
    if (['tong_er_mama', 'nilkhet_boiwala', 'naga_fuchka', 'mishti_doi', 'clay_artist', 'chacha_rafiq'].includes(npcId)) {
      return { roamRadius: 1, pauseDurationSec: 3.5, isVendor: true };
    }
    // High-cardio jogger: continuous active running across wide park loops with brief pauses
    if (npcId === 'tania') {
      return { roamRadius: 8, pauseDurationSec: 0.8, isVendor: false };
    }
    // Sami the photographer: strolls 4-5 tiles around plazas and vantage points
    if (npcId === 'sami') {
      return { roamRadius: 5, pauseDurationSec: 2.0, isVendor: false };
    }
    // Phulwali: weaves garlands and walks around the flower promenade
    if (npcId === 'phulwali') {
      return { roamRadius: 3, pauseDurationSec: 2.0, isVendor: false };
    }
    // Active walking citizens, artists, seniors, students
    if (['nadia', 'arif', 'baki_bhai', 'mimi', 'anamika', 'ahona', 'apshora', 'rakin', 'salat', 'enan', 'mehjabin', 'iman', 'tsc_singer'].includes(npcId)) {
      return { roamRadius: 4, pauseDurationSec: 2.2, isVendor: false };
    }
    // Academic scholars, professors, researchers in labs & Curzon gardens
    if (['prof_motahar', 'prof_satyendra', 'faiza', 'prof_sultana', 'dr_kabir', 'tanvir'].includes(npcId)) {
      return { roamRadius: 3, pauseDurationSec: 3.0, isVendor: false };
    }
    // Farm & park domestic animals
    if (['shuravi_cow', 'kalu_goat', 'tuntuni_hen', 'piku_duck'].includes(npcId)) {
      return { roamRadius: 3, pauseDurationSec: 1.5, isVendor: false };
    }
    // Night spirits & mystics
    if (['ananya_ghost', 'kofil_chacha', 'prof_shamsher'].includes(npcId)) {
      return { roamRadius: 3, pauseDurationSec: 2.5, isVendor: false };
    }
    // Default for any realm or other NPC
    return { roamRadius: 3, pauseDurationSec: 2.5, isVendor: false };
  }

  private spawnNpcOnMap(def: NpcScheduleDef, placement: any): void {
    const baseTex = this.mapNpcIdToTexture(def.npcId);
    const px = tileToPx(placement.tile.col, placement.tile.row);

    const sprite = this.scene.add.sprite(px.x, px.y, `${baseTex}-0`).setOrigin(0.5, 1).setDepth(px.y);

    const hStyle = this.getNpcHeadbarStyle(def.npcId);
    const badge = this.scene.add.text(px.x, px.y - sprite.height - 6, `💬 ${def.displayName}`, {
      fontFamily: "'Rajdhani', 'Outfit', sans-serif",
      fontSize: '12px',
      fontStyle: 'bold',
      backgroundColor: hStyle.bg,
      color: hStyle.color,
      stroke: hStyle.stroke,
      strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 2, color: 'rgba(0, 0, 0, 0.65)', blur: 4, stroke: true, fill: true },
      padding: { x: 7, y: 3 }
    }).setOrigin(0.5, 1).setDepth(px.y + 5);

    const mover = new NpcMover(placement.tile, placement.facing, def.movement);

    const entity: ActiveNpcEntity = {
      id: def.npcId,
      def,
      mover,
      sprite,
      badge,
      baseTex,
      currentActivity: placement.activity || 'none',
      onInteract: () => this.handleNpcInteraction(def.npcId, entity)
    };

    // Initialize dynamic ambient roaming state
    const roamConfig = this.getRoamProfile(def.npcId);
    const initialRoamTime = ((this.scene.time?.now || 0) / 1000) + (Math.random() * 2.0) + 0.5;
    this.roamStates.set(def.npcId, {
      anchorTile: { col: placement.tile.col, row: placement.tile.row },
      nextRoamTime: initialRoamTime,
      pauseDurationSec: roamConfig.pauseDurationSec,
      roamRadius: roamConfig.roamRadius,
      isVendor: roamConfig.isVendor,
      isSleeping: placement.activity === 'sleep'
    });

    // Special bindings for quest interactions and scene references
    if (def.npcId === 'anamika') this.scene.anamikaWanderer = entity;
    if (def.npcId === 'ahona') {
      this.scene.ahona = sprite;
      this.scene.rivalBadge = badge;
    }
    if (def.npcId === 'apshora') {
      this.scene.apshora = sprite;
      this.scene.apshoraBadge = badge;
    }
    if (def.npcId === 'rakin') {
      this.scene.rakin = sprite;
      this.scene.rakinBadge = badge;
    }
    if (def.npcId === 'salat' || def.npcId === 'mehjabin') {
      this.scene.salat = sprite;
      this.scene.salatBadge = badge;
      this.scene.mehjabin = sprite;
      this.scene.mehjabinBadge = badge;
    }
    if (def.npcId === 'enan' || def.npcId === 'iman') {
      this.scene.enan = sprite;
      this.scene.enanBadge = badge;
      this.scene.iman = sprite;
      this.scene.imanBadge = badge;
    }

    this.activeNpcs.set(def.npcId, entity);
    if (this.debugOverlay) {
      this.debugOverlay.registerActiveEntity(def.npcId, entity);
    }

    if (this.scene.wanderers) {
      this.scene.wanderers.push(entity);
    }

    // Register with scene interactables list
    const interactObj = {
      x: mover.x,
      y: mover.y,
      radius: 80,
      sprite,
      badge,
      name: def.displayName,
      onInteract: entity.onInteract
    };
    entity.interactObj = interactObj;

    if (def.npcId === 'ahona') this.scene.rivalInteract = interactObj;
    if (def.npcId === 'apshora') this.scene.apshoraInteract = interactObj;
    if (def.npcId === 'rakin') this.scene.rakinInteract = interactObj;
    if (def.npcId === 'salat' || def.npcId === 'mehjabin') {
      this.scene.salatInteract = interactObj;
      this.scene.mehjabinInteract = interactObj;
    }
    if (def.npcId === 'enan' || def.npcId === 'iman') {
      this.scene.enanInteract = interactObj;
      this.scene.imanInteract = interactObj;
    }

    if (this.scene.interactables) {
      this.scene.interactables.push(interactObj);
    }
  }

  private mapNpcIdToTexture(id: string): string {
    const map: Record<string, string> = {
      tong_er_mama: 'npc-tea',
      tania: 'npc-jogger',
      sami: 'npc-photo',
      arif: 'npc-walker1',
      nadia: 'npc-walker2',
      mimi: 'npc-cat',
      baki_bhai: 'npc-walker3',
      tsc_singer: 'npc-guitar',
      clay_artist: 'npc-artist',
      nilkhet_boiwala: 'npc-books',
      phulwali: 'npc-phulwali',
      naga_fuchka: 'npc-fuchka',
      mishti_doi: 'npc-doi',
      anamika: 'npc-anamika',
      ahona: 'npc-ahona',
      rakin: 'npc-rakin',
      apshora: 'npc-apshora',
      salat: 'npc-mehjabin',
      mehjabin: 'npc-mehjabin',
      enan: 'npc-iman',
      iman: 'npc-iman',
      prof_motahar: 'npc-prof-motahar',
      prof_satyendra: 'npc-prof-satyendra',
      faiza: 'npc-student-faiza',
      prof_sultana: 'npc-prof-sultana',
      dr_kabir: 'npc-dr-kabir',
      tanvir: 'npc-student-tanvir',
      chacha_rafiq: 'npc-farmer-rafiq',
      shuravi_cow: 'npc-cow',
      kalu_goat: 'npc-goat',
      tuntuni_hen: 'npc-chicken',
      piku_duck: 'npc-duck',
      elder_banyan_sage: 'npc-sage',
      ananya_ghost: 'npc-ananya-ghost',
      kofil_chacha: 'npc-kofil-ghost',
      prof_shamsher: 'npc-shamsher-investigator',
      tidekeeper_marina: 'npc-marina',
      blacksmith_kael: 'npc-kael',
      astronomer_lyra: 'npc-lyra',
      celestial_chronicler: 'npc-chronicler'
    };

    return map[id] || 'npc-walker1';
  }

  private evaluateSchedules(force = false): void {
    const tc: TimeCalendarSystem = this.scene.timeCalendar;
    if (!tc) return;

    const date = tc.getDate();
    const totalMinutes = tc.getTotalMinutes();
    const dayOfWeek = tc.getDayOfWeek();
    const currentWorld: MapId = DateState.currentWorld || 'dhaka';

    const ctx: ScheduleContext = {
      hour: date.hour,
      minute: date.minute,
      totalMinutes,
      season: date.season,
      day: date.day,
      dayOfWeek,
      weather: date.weather,
      isRaining: date.weather === 'rainy' || date.weather === 'monsoon' || date.weather === 'storm',
      affection: DateState.hearts || 0,
      questFlags: DateState,
      activeOverride: DateState.npcOverrides ? DateState.npcOverrides[currentWorld] : null
    };

    this.activeNpcs.forEach(ent => {
      const variant = resolveScheduleVariant(ent.def, ctx);
      const stopRes = resolveCurrentStop(variant, totalMinutes);

      ent.currentActivity = stopRes.currentStop.activity || 'none';
      const roam = this.roamStates.get(ent.id);
      if (roam) {
        roam.isSleeping = stopRes.currentStop.activity === 'sleep';
      }

      // If scheduled stop is on the current map and destination tile is different from current tile
      if (stopRes.currentStop.map === currentWorld) {
        const destTile = stopRes.currentStop.tile;
        const curTile = ent.mover.currentTile;

        // If scheduled destination anchor changed, update anchorTile and pathfind there
        if (roam && (roam.anchorTile.col !== destTile.col || roam.anchorTile.row !== destTile.row)) {
          roam.anchorTile = { col: destTile.col, row: destTile.row };
          const path = this.navigator.findPath(currentWorld, curTile, destTile);
          if (path && path.length > 1) {
            ent.mover.setPath(path);
          }
        } else if (force && (destTile.col !== curTile.col || destTile.row !== curTile.row)) {
          if (!ent.mover.hasActivePath()) {
            const path = this.navigator.findPath(currentWorld, curTile, destTile);
            if (path && path.length > 1) {
              ent.mover.setPath(path);
            }
          }
        } else if (!ent.mover.hasActivePath() && ent.mover.state !== 'interacting') {
          // At destination: orient to scheduled facing if vendor or idle
          if (stopRes.currentStop.facing && ent.mover.facing !== stopRes.currentStop.facing && (!roam || roam.isVendor)) {
            ent.mover.facing = stopRes.currentStop.facing;
          }
        }
      }
    });
  }

  update(time: number, deltaMs: number): void {
    const deltaSec = deltaMs / 1000;
    const currentTimeSec = (this.scene.time?.now || time || 0) / 1000;
    const px = this.scene.player ? this.scene.player.x : 0;
    const py = this.scene.player ? this.scene.player.y : 0;
    const isPaused = UI.isOpen() || this.scene.cutsceneLocked;

    this.activeNpcs.forEach(ent => {
      const mover = ent.mover;

      // Automatically restore movement state when dialogue closes
      if (mover.state === 'interacting' && !UI.isOpen()) {
        mover.endInteraction();
      }

      if (isPaused) {
        if (
          ent.sprite.anims &&
          ent.sprite.anims.isPlaying &&
          (!ent.sprite.anims.currentAnim || ent.sprite.anims.currentAnim.key !== 'rakin-guitar-strum')
        ) {
          ent.sprite.anims.pause();
        }
        return;
      }

      // Check player proximity for talk freeze or look-at
      const distToPlayer = Math.hypot(px - mover.x, py - mover.y);
      if (distToPlayer < 64 && !mover.hasActivePath()) {
        mover.noticePlayer(px, py);
      }

      // Advance movement
      const res = mover.update(deltaSec, targetTile => {
        // Check if player occupies next tile
        const playerTileCol = Math.floor(px / 32);
        const playerTileRow = Math.floor(py / 32);
        return targetTile.col === playerTileCol && targetTile.row === playerTileRow;
      });

      // Update Phaser sprite position and depth
      ent.sprite.setPosition(mover.x, mover.y).setDepth(mover.y);
      if (ent.interactObj) {
        ent.interactObj.x = mover.x;
        ent.interactObj.y = mover.y;
      }

      // Goal arrival transition to idle & schedule next roam
      if (res.reachedGoal) {
        mover.state = 'idle';
        const roam = this.roamStates.get(ent.id);
        if (roam) {
          roam.nextRoamTime = currentTimeSec + roam.pauseDurationSec + (Math.random() * 1.5);
        }
      }

      // Dynamic Ambient Roaming Loop: Keeps NPCs walking most of the time!
      const roam = this.roamStates.get(ent.id);
      if (
        roam &&
        !roam.isSleeping &&
        mover.state !== 'interacting' &&
        !mover.hasActivePath() &&
        currentTimeSec >= roam.nextRoamTime
      ) {
        const currentWorld: MapId = (this.scene.currentWorldId || DateState.currentWorld || 'dhaka') as MapId;
        const anchor = roam.anchorTile;
        const curTile = mover.currentTile;
        const maxCols = (currentWorld === 'dhaka' || currentWorld === 'forest' || currentWorld === 'sunken' || currentWorld === 'ember' || currentWorld === 'frost' || currentWorld === 'astral') ? 80 : 40;
        const maxRows = (currentWorld === 'dhaka' || currentWorld === 'forest' || currentWorld === 'sunken' || currentWorld === 'ember' || currentWorld === 'frost' || currentWorld === 'astral') ? 60 : 30;

        let foundPath: GridTile[] | null = null;
        const attempts = 8;
        const r = roam.roamRadius;

        for (let attempt = 0; attempt < attempts; attempt++) {
          const dc = Math.floor(Math.random() * (2 * r + 1)) - r;
          const dr = Math.floor(Math.random() * (2 * r + 1)) - r;
          if (dc === 0 && dr === 0) continue;

          const targetCol = anchor.col + dc;
          const targetRow = anchor.row + dr;

          if (targetCol === curTile.col && targetRow === curTile.row) continue;
          if (targetCol < 1 || targetCol >= maxCols - 1 || targetRow < 1 || targetRow >= maxRows - 1) continue;

          // Check terrain obstacle / collision
          if (this.navigator['costProvider'] && this.navigator['costProvider'].isBlocked(targetCol, targetRow, currentWorld)) {
            continue;
          }

          // Check player position (don't walk onto player)
          const playerTileCol = Math.floor(px / 32);
          const playerTileRow = Math.floor(py / 32);
          if (targetCol === playerTileCol && targetRow === playerTileRow) continue;

          const path = this.navigator.findPath(currentWorld, curTile, { col: targetCol, row: targetRow });
          if (path && path.length > 1) {
            foundPath = path;
            break;
          }
        }

        if (foundPath) {
          mover.setPath(foundPath);
        } else {
          roam.nextRoamTime = currentTimeSec + 1.5;
        }
      }

      // Handle walk animations vs idle frames
      if (mover.state === 'walking') {
        if (ent.sprite.scaleY !== 1) ent.sprite.setScale(1, 1);
        ent.sprite.setFlipX(false);
        const walkKey = `${ent.baseTex}-walk-${mover.facing}`;
        if (this.scene.anims.exists(walkKey)) {
          if (!ent.sprite.anims.isPlaying || ent.sprite.anims.currentAnim.key !== walkKey) {
            ent.sprite.play(walkKey);
          }
        } else {
          const fallbackAnim = this.scene.getOrCreateWalkAnim ? this.scene.getOrCreateWalkAnim(ent.baseTex, 4) : null;
          if (fallbackAnim && (!ent.sprite.anims.isPlaying || ent.sprite.anims.currentAnim.key !== fallbackAnim)) {
            ent.sprite.play(fallbackAnim);
          }
        }
      } else {
        ent.sprite.setFlipX(false);
        const idleAnimKey = `${ent.baseTex}-idle-${mover.facing}`;
        if (this.scene.anims.exists(idleAnimKey)) {
          if (!ent.sprite.anims.isPlaying || ent.sprite.anims.currentAnim.key !== idleAnimKey) {
            ent.sprite.play(idleAnimKey);
          }
        } else {
          if (ent.sprite.anims && ent.sprite.anims.isPlaying) {
            ent.sprite.anims.stop();
          }
          const dirIndex = mover.facing === 'left' ? 1 : mover.facing === 'right' ? 2 : mover.facing === 'up' ? 3 : 0;
          const idleTex = `${ent.baseTex}-${dirIndex}`;
          if (this.scene.textures.exists(idleTex)) {
            ent.sprite.setTexture(idleTex);
          } else {
            ent.sprite.setTexture(`${ent.baseTex}-0`);
          }
        }
        // Dynamic rhythmic idle breathing
        const timeSec = (this.scene.time?.now || 0) * 0.003;
        const breath = Math.sin(timeSec + mover.x * 0.1) * 0.02;
        ent.sprite.setScale(1, 1 + breath);
      }

      // Update badge position and activity emoji
      const isWalking = mover.state === 'walking';
      const actId = (isWalking && ent.id === 'tania') ? 'jog_stretch' : (ent.currentActivity || 'none');
      const activityEmoji = NpcBehaviors.getActivityEmoji(actId as any);
      const badgePrefix = isWalking ? '🚶 ' : (activityEmoji ? `${activityEmoji} ` : '💬 ');
      ent.badge.setText(`${badgePrefix}${ent.def.displayName}`);
      ent.badge.setPosition(mover.x, mover.y - ent.sprite.height - 6).setDepth(mover.y + 5);

      // Handle blocked repath
      if (res.needsRepath) {
        this.evaluateSchedules(true);
      }
    });

    if (this.debugOverlay) {
      this.debugOverlay.update();
    }
  }

  /**
   * Dispatches interaction to the appropriate quest or dialogue handler.
   */
  private handleNpcInteraction(id: string, ent: ActiveNpcEntity): void {
    RPGStats.gainXP(15);
    const px = this.scene.player ? this.scene.player.x : 0;
    const py = this.scene.player ? this.scene.player.y : 0;

    ent.mover.startInteraction(px, py);

    // Call scene's specific date activity or quest method if one exists
    switch (id) {
      case 'tong_er_mama':
        if (typeof this.scene.interactTeaStall === 'function') {
          this.scene.interactTeaStall();
          return;
        }
        break;
      case 'naga_fuchka':
        if (typeof this.scene.interactFuchkaCart === 'function') {
          this.scene.interactFuchkaCart();
          return;
        }
        break;
      case 'mishti_doi':
        if (typeof this.scene.interactDoiCart === 'function') {
          this.scene.interactDoiCart();
          return;
        }
        break;
      case 'phulwali':
        if (typeof this.scene.interactFlowerCart === 'function') {
          this.scene.interactFlowerCart();
          return;
        }
        break;
      case 'nilkhet_boiwala':
        if (typeof this.scene.interactBookStall === 'function') {
          this.scene.interactBookStall();
          return;
        }
        break;
      case 'clay_artist':
        if (typeof this.scene.interactCharukola === 'function') {
          this.scene.interactCharukola();
          return;
        }
        break;
      case 'tsc_singer':
        if (typeof this.scene.interactGuitarist === 'function') {
          this.scene.interactGuitarist();
          return;
        }
        break;
      case 'ahona':
        if (typeof this.scene.interactAhonaApshora === 'function') {
          this.scene.interactAhonaApshora();
          return;
        }
        break;
      case 'apshora':
        if (DateState.apshoraQuestStage >= 2 && DateState.apshoraQuestStage < 4 && typeof this.scene.interactApshoraAnamikaStudio === 'function') {
          this.scene.interactApshoraAnamikaStudio();
          return;
        } else if (DateState.apshoraQuestStage >= 4 && typeof this.scene.interactApshoraSolo === 'function') {
          this.scene.interactApshoraSolo();
          return;
        } else if (typeof this.scene.interactAhonaApshora === 'function') {
          this.scene.interactAhonaApshora();
          return;
        }
        break;
      case 'rakin':
        if (typeof this.scene.interactRakin === 'function') {
          this.scene.interactRakin();
          return;
        }
        break;
      case 'mehjabin':
      case 'salat':
        if (typeof this.scene.interactMehjabin === 'function') {
          this.scene.interactMehjabin();
          return;
        } else if (typeof this.scene.interactSalat === 'function') {
          this.scene.interactSalat();
          return;
        }
        break;
      case 'iman':
      case 'enan':
        if (typeof this.scene.interactIman === 'function') {
          this.scene.interactIman();
          return;
        } else if (typeof this.scene.interactEnan === 'function') {
          this.scene.interactEnan();
          return;
        }
        break;
      case 'chacha_rafiq':
        if (typeof this.scene.interactFarmerRafiq === 'function') {
          this.scene.interactFarmerRafiq();
          return;
        }
        break;
      case 'shuravi_cow':
        if (typeof this.scene.interactCowShuravi === 'function') {
          this.scene.interactCowShuravi();
          return;
        }
        break;
      case 'kalu_goat':
        if (typeof this.scene.interactGoatKalu === 'function') {
          this.scene.interactGoatKalu();
          return;
        }
        break;
      case 'tuntuni_hen':
        if (typeof this.scene.interactChickenTuntuni === 'function') {
          this.scene.interactChickenTuntuni();
          return;
        }
        break;
      case 'piku_duck':
        if (typeof this.scene.interactDuckPiku === 'function') {
          this.scene.interactDuckPiku();
          return;
        }
        break;
      case 'prof_motahar':
        if (typeof this.scene.interactProfMotahar === 'function') {
          this.scene.interactProfMotahar();
          return;
        }
        break;
      case 'prof_satyendra':
        if (typeof this.scene.interactProfSatyendra === 'function') {
          this.scene.interactProfSatyendra();
          return;
        }
        break;
      case 'faiza':
        if (typeof this.scene.interactFaizaStudent === 'function') {
          this.scene.interactFaizaStudent();
          return;
        }
        break;
      case 'prof_sultana':
        if (typeof this.scene.interactProfSultana === 'function') {
          this.scene.interactProfSultana();
          return;
        }
        break;
      case 'dr_kabir':
        if (typeof this.scene.interactDrKabir === 'function') {
          this.scene.interactDrKabir();
          return;
        }
        break;
      case 'tanvir':
        if (typeof this.scene.interactTanvirStudent === 'function') {
          this.scene.interactTanvirStudent();
          return;
        }
        break;
      case 'ananya_ghost':
        if (typeof this.scene.interactAnanyaGhost === 'function') {
          this.scene.interactAnanyaGhost();
          return;
        }
        break;
      case 'kofil_chacha':
        if (typeof this.scene.interactKofilGhost === 'function') {
          this.scene.interactKofilGhost();
          return;
        }
        break;
      case 'prof_shamsher':
        if (typeof this.scene.interactShamsherNishi === 'function') {
          this.scene.interactShamsherNishi();
          return;
        }
        break;
      case 'anamika': {
        SoundEngine.heartUp();
        const curIdx = ent.lineIdx || 0;
        const nextConv = ANAMIKA_CONVERSATIONS[curIdx % ANAMIKA_CONVERSATIONS.length];
        UI.startDialogue([
          {
            speaker: 'Anamika',
            portrait: '🥙',
            text: 'Moon Walker!! Bestie! Look at you and Totoro strolling together—my heart cannot handle how cute you two are! What’s the scoop?',
            choices: [
              ...(DateState.apshoraQuestStage === 1 ? [{
                label: '👗 "Anamika! Apshora wants to meet you—she has an incredible fashion startup vision!"',
                onPick: () => {
                  if (typeof this.scene.playApshoraAnamikaPitchCutscene === 'function') {
                    this.scene.playApshoraAnamikaPitchCutscene();
                  }
                }
              }] : []),
              ...(DateState.apshoraQuestStage === 2 ? [{
                label: '✨ "How is the debut \'Nodi O Jamdani\' collection coming along, Anamika?"',
                onPick: () => {
                  if (typeof this.scene.interactApshoraAnamikaStudio === 'function') {
                    this.scene.interactApshoraAnamikaStudio();
                  }
                }
              }] : []),
              ...(DateState.apshoraQuestStage === 3 ? [{
                label: '🎉 "The runway is set! Let us begin the Grand Debut Exhibition at Curzon Hall!"',
                onPick: () => {
                  if (typeof this.scene.playApshoraExhibitionCutscene === 'function') {
                    this.scene.playApshoraExhibitionCutscene();
                  }
                }
              }] : []),
              ...(DateState.apshoraQuestStage >= 4 ? [{
                label: '👑 "To Dhaka\'s most celebrated fashion visionary duo! How are the London & Paris orders?"',
                nextNodes: [
                  { speaker: 'Anamika', portrait: '🥙', text: 'Girl, our email inbox crashed three times today! Curators from London, Paris, and Dubai want exclusive showcase rights for "Nodi O Jamdani"!' },
                  { speaker: 'Anamika', portrait: '✨', text: 'Shuvra called me from Barishal in tears of joy—our advance orders just guaranteed steady living wages for thirty rural handloom artisan families for the entire year!' },
                  { speaker: 'Moon Walker', portrait: '🌙', text: 'You and Apshora didn’t just build a brand, Anamika. You changed lives.' },
                  { speaker: 'Totoro', portrait: '🐾', text: 'True victory is lifting everyone up along the way. We are so proud of both of you!' }
                ]
              }] : []),
              {
                label: '🥙 "What is in that Star Kebab parcel right now, Anamika?"',
                nextNodes: [
                  { speaker: 'Anamika', portrait: '🥙', text: 'Fresh grilled parathas, spiced mutton seekh kebabs, and two chilled faloodas! I was testing it to make sure tomorrow’s group feast is top tier!' },
                  { speaker: 'Moon Walker', portrait: '🌙', text: '"Testing" by eating an entire leg roast beforehand? Bestie, you are legendary.' },
                  { speaker: 'Totoro', portrait: '🐾', text: 'Can confirm, the smoky kebab aroma drifting from that bag is mesmerizing.' }
                ]
              },
              {
                label: '🚢 "Any updates on Shuvra and his Barishal launch journey?"',
                nextNodes: [
                  { speaker: 'Anamika', portrait: '📱', text: 'Oh girl, you won’t believe it! Shuvra called me from the launch cabin. The launch was delayed for two hours because of river fog near Chandpur!' },
                  { speaker: 'Anamika', portrait: '😂', text: 'And he was guarding his tin of Barishal Guthia Sandesh with his life under his pillow so the cabin mates wouldn’t eat it!' },
                  { speaker: 'Moon Walker', portrait: '🌙', text: 'A man who guards sweets through river fog for his girl is a keeper, Anamika.' },
                  { speaker: 'Anamika', portrait: '🥺', text: 'Right?! His launch docks at Sadarghat at 6 AM, and we are going straight to Star Kebab for breakfast!' }
                ]
              },
              {
                label: '🏆 "Settle this debate: The Ultimate Dhaka Date Food Ranking!"',
                nextNodes: [
                  { speaker: 'Anamika', portrait: '🏆', text: 'Okay, hear me out: 1. Star Kebab Mutton Kacchi with Borhani. 2. Mama’s Extra-Spicy Naga Fuchka. 3. TSC Matir Bhaar Malai Cha. 4. Bogurar Mishti Doi.' },
                  { speaker: 'Totoro', portrait: '🐾', text: 'I vote we eat all four in a single afternoon with Moon Walker!' },
                  { speaker: 'Anamika', portrait: '👏', text: 'Totoro, you get it! Moon Walker, hold onto this guy forever!' }
                ]
              },
              {
                label: '✨ "Bestie high-five & energy boost!"',
                onPick: () => {
                  SoundEngine.itemFanfare();
                  DateState.sp = DateState.maxSp;
                  UI.updateRPGStats();
                  UI.showToast('💖', 'Bestie Power!', 'Anamika gave you an energy boost! SP fully restored!');
                },
                nextNodes: [
                  { speaker: 'Anamika', portrait: '✨', text: '*SLAP!* Ultimate bestie high-five! You two go conquer the Six Realms and have the best date ever! (SP Fully Restored!)' },
                  { speaker: 'Moon Walker', portrait: '🌙', text: 'Love you, Anamika! See you at Star Kebab tomorrow!' }
                ]
              },
              {
                label: '💬 "Bestie catch-up! What\'s the latest news on campus?"',
                onPick: () => {
                  ent.lineIdx = curIdx + 1;
                },
                nextNodes: nextConv
              }
            ]
          }
        ]);
        return;
      }
      case 'mimi': {
        SoundEngine.catMeow();
        DateState.sideQuests.sq_cat_fish = true;
        const curIdx = ent.lineIdx || 0;
        const nextConv = MIMI_CONVERSATIONS[curIdx % MIMI_CONVERSATIONS.length];
        UI.startDialogue([
          {
            speaker: 'Mimi (Campus Ginger Cat)',
            portrait: '🐱',
            text: 'Mrr-meow! (Mimi figure-eights around your ankles and stares up at Totoro’s giant fluffy tummy with big curious green eyes.)',
            choices: [
              {
                label: '🐟 Offer Mimi a crunchy snack bite',
                onPick: () => {
                  SoundEngine.catMeow();
                  DateState.hp = Math.min(DateState.maxHp, DateState.hp + 20);
                  UI.updateRPGStats();
                  UI.showToast('🐱', 'Mimi is Delighted!', 'Mimi gave you a good luck purr! (+20 HP)');
                },
                nextNodes: [
                  { speaker: 'Mimi (Campus Ginger Cat)', portrait: '🐱', text: '*Nom nom nom!* Purrrrrr! (Mimi happily devours the treat, then nuzzles her forehead against your palm.)' },
                  { speaker: 'Totoro', portrait: '🐾', text: 'Aww, look at her! Chibi-Totoro wants to give her a little ear scratch too!' }
                ]
              },
              {
                label: '🐾 Scratch Mimi under her chin and behind her soft ears',
                onPick: () => SoundEngine.catMeow(),
                nextNodes: [
                  { speaker: 'Mimi (Campus Ginger Cat)', portrait: '🐱', text: 'Prrr-chirp! (Mimi closes her eyes, tips her chin up into your hand, and emits a motorboat purr that can be heard across Fuller Road.)' },
                  { speaker: 'Moon Walker', portrait: '🌙', text: 'Meeting Mimi is officially the softest highlight of campus.' }
                ]
              },
              {
                label: '🧶 Let Chibi-Totoro play with Mimi',
                nextNodes: [
                  { speaker: 'Mimi (Campus Ginger Cat)', portrait: '🐱', text: 'Meow! (Mimi playfully pats at Chibi-Totoro’s leafy fishing line, rolling onto her back in the warm grass.)' },
                  { speaker: 'Totoro', portrait: '🐾', text: 'They are best friends now! Can we bring her with us into the Astral Realm?' }
                ]
              },
              {
                label: '💬 Listen to Mimi purr in the afternoon sun',
                onPick: () => {
                  ent.lineIdx = curIdx + 1;
                },
                nextNodes: nextConv
              }
            ]
          }
        ]);
        return;
      }
      case 'baki_bhai': {
        DateState.sideQuests.sq_poet_rhyme = true;
        const curIdx = ent.lineIdx || 0;
        const nextConv = BAKI_CONVERSATIONS[curIdx % BAKI_CONVERSATIONS.length];
        UI.startDialogue([
          {
            speaker: 'Baki Bhai (Nilkhet Poet)',
            portrait: '📜',
            text: 'Ah, Moon Walker and Totoro! The very air around Fuller Road turns into rhythm when you two walk together. What verse seeks your ear?',
            choices: [
              {
                label: '📖 "Baki Bhai, improvise a couplet for us!"',
                onPick: () => SoundEngine.select(),
                nextNodes: [
                  { speaker: 'Baki Bhai (Nilkhet Poet)', portrait: '📜', text: '"Dhaka may have ten million crowded streets and endless rain,\nYet in your quiet footsteps, all of time begins again."' },
                  { speaker: 'Totoro', portrait: '🐾', text: 'Writing that down in my memory journal right now. That is pure gold, Baki Bhai!' },
                  { speaker: 'Moon Walker', portrait: '🌙', text: 'Nilkhet’s poets really are the heart of Dhaka.' }
                ]
              },
              {
                label: '📚 "What is your secret to finding hidden gems in Nilkhet?"',
                nextNodes: [
                  { speaker: 'Baki Bhai (Nilkhet Poet)', portrait: '📜', text: 'Never look for pristine covers. The best books are the weathered ones—where someone forty years ago underlined a sentence and left a dried rose petal.' },
                  { speaker: 'Moon Walker', portrait: '🌙', text: 'That is exactly why picking books for each other is our favorite tradition.' }
                ]
              },
              {
                label: '📜 "Recite another poem from the streets of Dhaka, Baki Bhai!"',
                onPick: () => {
                  ent.lineIdx = curIdx + 1;
                },
                nextNodes: nextConv
              }
            ]
          }
        ]);
        return;
      }
      case 'sami': {
        DateState.sideQuests.sq_photo_pose = true;
        const curIdx = ent.lineIdx || 0;
        const nextConv = SAMI_CONVERSATIONS[curIdx % SAMI_CONVERSATIONS.length];
        UI.startDialogue([
          {
            speaker: 'Sami (Street Photographer)',
            portrait: '📸',
            text: '*Click!* The natural golden light on Fuller Road is sublime right now. Let me take an official couple photo of you two for your Chronicle Scrapbook!',
            choices: [
              {
                label: '🌅 Romantic Sunset Gaze (Hold Totoro’s hand & smile)',
                onPick: () => {
                  SoundEngine.cameraShutter();
                  if (this.scene.cameras && this.scene.cameras.main) {
                    this.scene.cameras.main.flash(350, 255, 255, 255);
                  }
                  UI.showToast('📸', 'Photo Captured!', 'A warm romantic snapshot was added to your memories!');
                },
                nextNodes: [
                  { speaker: 'Sami (Street Photographer)', portrait: '📸', text: '*FLASH!* Magnificent! The way the golden hour catches the Beli garland on your wrist and Totoro’s smile is pure magazine-cover perfection.' },
                  { speaker: 'Totoro', portrait: '🐾', text: 'Frame this one immediately, Moon Walker!' }
                ]
              },
              {
                label: '✌️ Playful Peace Sign & Goofy Totoro Faces',
                onPick: () => {
                  SoundEngine.cameraShutter();
                  if (this.scene.cameras && this.scene.cameras.main) {
                    this.scene.cameras.main.flash(350, 255, 255, 255);
                  }
                },
                nextNodes: [
                  { speaker: 'Sami (Street Photographer)', portrait: '📸', text: '*FLASH!* Haha! Totoro stuck his tongue out while Chibi-Totoro made bunny ears! That is going straight into Dhaka campus history!' },
                  { speaker: 'Moon Walker', portrait: '🌙', text: 'Hahaha, that is 100% going on our scrapbook cover!' }
                ]
              },
              {
                label: '⚔️ Heroic Realm Guardians Stance',
                onPick: () => {
                  SoundEngine.cameraShutter();
                  if (this.scene.cameras && this.scene.cameras.main) {
                    this.scene.cameras.main.flash(350, 255, 255, 255);
                  }
                },
                nextNodes: [
                  { speaker: 'Sami (Street Photographer)', portrait: '📸', text: '*FLASH!* Incredible dynamic tension! Moon Walker with her parasol and Totoro standing tall like the legendary Forest Guardian!' },
                  { speaker: 'Totoro', portrait: '🐾', text: 'The Six Realms do not stand a chance against us!' }
                ]
              },
              {
                label: '📸 "Any stories from your candid shots today, Sami?"',
                onPick: () => {
                  ent.lineIdx = curIdx + 1;
                },
                nextNodes: nextConv
              }
            ]
          }
        ]);
        return;
      }
      case 'arif': {
        const curIdx = ent.lineIdx || 0;
        const nextConv = ARIF_CONVERSATIONS[curIdx % ARIF_CONVERSATIONS.length];
        UI.startDialogue([
          {
            speaker: 'Arif (DU Physics Senior)',
            portrait: '🎓',
            text: 'Greetings, Moon Walker and Totoro! I just took a break from the Science Library. What query brings you to the realm of science?',
            choices: [
              {
                label: '🧮 "Have you calculated the physics equation of love yet, Arif?"',
                nextNodes: [
                  { speaker: 'Arif (DU Physics Senior)', portrait: '🎓', text: 'F = G * (m1 * m2) / r^2... Except whenever you and Totoro stand next to each other, the gravitational attraction defies classical mechanics and generates infinite happiness!' },
                  { speaker: 'Totoro', portrait: '🐾', text: 'See? Even physics proves we belong together!' }
                ]
              },
              {
                label: '🌀 "What do your sensors say about the Eastern Spacetime Fracture?"',
                nextNodes: [
                  { speaker: 'Arif (DU Physics Senior)', portrait: '🎓', text: 'It is a stable Einstein-Rosen bridge leading to higher dimensional planes! My advice: stock up on Tong-er Mama’s Malai Cha before venturing through.' },
                  { speaker: 'Moon Walker', portrait: '🌙', text: 'Good advice—tea is the ultimate universal constant!' }
                ]
              },
              {
                label: '🎓 "How are your physics studies going today, Arif?"',
                onPick: () => {
                  ent.lineIdx = curIdx + 1;
                },
                nextNodes: nextConv
              }
            ]
          }
        ]);
        return;
      }
      case 'nadia': {
        const curIdx = ent.lineIdx || 0;
        const nextConv = NADIA_CONVERSATIONS[curIdx % NADIA_CONVERSATIONS.length];
        UI.startDialogue([
          {
            speaker: 'Nadia (Charukola Sketcher)',
            portrait: '🖌️',
            text: 'Look at that palette! The amber of Moon Walker’s skirt, the crimson Krishnachura canopy, and the gentle slate-gray of Totoro... What can I sketch for you two?',
            choices: [
              {
                label: '🎨 "Show us your latest sketchbook drawing of us!"',
                onPick: () => SoundEngine.brushStroke(),
                nextNodes: [
                  { speaker: 'Nadia (Charukola Sketcher)', portrait: '🖌️', text: '*Shows sketchbook page* See? A quick charcoal study of you two laughing by the Fuller Road fountain. The expression in Totoro’s eyes says everything.' },
                  { speaker: 'Totoro', portrait: '🐾', text: 'Can I hang this in our forest hollow? It is beautiful, Nadia!' }
                ]
              },
              {
                label: '🎭 "What motif are you working on for Pohela Boishakh?"',
                nextNodes: [
                  { speaker: 'Nadia (Charukola Sketcher)', portrait: '🖌️', text: 'A giant paper-mâché Forest Spirit mask inspired by Totoro, surrounded by golden sun rays and floral alpana!' },
                  { speaker: 'Moon Walker', portrait: '🌙', text: 'The Mangal Shobhajatra parade is going to look spectacular this year!' }
                ]
              },
              {
                label: '🖌️ "What else has caught your artistic eye today, Nadia?"',
                onPick: () => {
                  ent.lineIdx = curIdx + 1;
                },
                nextNodes: nextConv
              }
            ]
          }
        ]);
        return;
      }
      case 'tania': {
        const curIdx = ent.lineIdx || 0;
        const nextConv = TANIA_CONVERSATIONS[curIdx % TANIA_CONVERSATIONS.length];
        UI.startDialogue([
          {
            speaker: 'Tania (Dhanmondi Jogger)',
            portrait: '👟',
            text: 'Phew! Lap four around Dhanmondi Lake complete! How is the grand date going, you two?',
            choices: [
              {
                label: '🏃‍♀️ "Tania, how do you resist stopping at the fuchka cart every lap?"',
                nextNodes: [
                  { speaker: 'Tania (Dhanmondi Jogger)', portrait: '👟', text: 'Who said I resist?! My secret training method is: run 3km, reward myself with 10 Naga fuchkas and a clay cup of Mishti Doi!' },
                  { speaker: 'Moon Walker', portrait: '🌙', text: 'Now THAT is the kind of balanced workout plan I can get behind!' },
                  { speaker: 'Totoro', portrait: '🐾', text: 'Cardio powered by tamarind tok and sweet curd. Pure genius.' }
                ]
              },
              {
                label: '🌊 "How is the lake view tonight?"',
                nextNodes: [
                  { speaker: 'Tania (Dhanmondi Jogger)', portrait: '👟', text: 'The water is completely still, reflecting the paper lanterns on the pier. The stargazing telescope is all set up—definitely do not miss it!' }
                ]
              },
              {
                label: '👟 "How is the evening jog along the lake, Tania?"',
                onPick: () => {
                  ent.lineIdx = curIdx + 1;
                },
                nextNodes: nextConv
              }
            ]
          }
        ]);
        return;
      }
      case 'elder_banyan_sage':
      case 'tidekeeper_marina':
      case 'blacksmith_kael':
      case 'astronomer_lyra':
      case 'celestial_chronicler': {
        const curWorld = DateState.currentWorld || 'forest';
        const wCfg = this.scene.wCfg || WORLDS_DB[curWorld];
        if (wCfg && wCfg.npcSpec) {
          if (typeof wCfg.npcSpec.getDialogue === 'function') {
            UI.startDialogue(wCfg.npcSpec.getDialogue(this.scene));
            return;
          } else if (Array.isArray(wCfg.npcSpec.lines) && wCfg.npcSpec.lines.length > 0) {
            UI.startDialogue([{ speaker: wCfg.npcSpec.name, portrait: wCfg.npcSpec.portrait, text: wCfg.npcSpec.lines[0] }]);
            return;
          }
        }
        break;
      }
    }

    // Default friendly greeting
    UI.startDialogue([
      {
        speaker: ent.def.displayName,
        portrait: '💬',
        text: `Greetings, Moon Walker and Totoro! A beautiful day across Dhaka Valley.`
      }
    ]);
  }

  /**
   * Backwards compatibility helper for existing scene calls.
   */
  static createWanderingCitizens(scene: any): void {
    if (scene.scheduleSystem && typeof scene.scheduleSystem.initWorldNpcs === 'function') {
      scene.scheduleSystem.initWorldNpcs(DateState.currentWorld || 'dhaka');
    }
  }
}
