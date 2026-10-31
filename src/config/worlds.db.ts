// src/config/worlds.db.ts - Six Explorable Worlds Configuration + Curzon & Farmhouse
// Migrated 100% intact from game.js
import { SoundEngine } from '../audio/SoundEngine';
import { DateState } from '../state/DateState';
import { CURZON_X, CURZON_Y, ARCADE_X, ARCADE_Y } from './constants';

const getUI = (): any => (typeof window !== 'undefined' ? (window as any).UI : null);

export const WORLDS_DB: Record<string, any> = {
  dhaka: {
    id: 'dhaka',
    name: 'World 1: Dhaka Valley',
    subtitle: 'Curzon Hall, TSC, Nilkhet & Dhanmondi Lake',
    theme: 'dhaka',
    groundTex: 'tile-grass',
    pathTex: 'tile-path',
    waterTex: 'tile-water',
    treeTex: 'prop-tree-krishna',
    bgColor: '#68a357',
    minimapColor: '#4c853e',
    petalColor: 0xff6b8b,
    portalPos: { x: 2192, y: 816 },
    nextWorld: 'forest'
  },
  forest: {
    id: 'forest',
    name: 'World 2: Whispering Emerald Forest',
    subtitle: 'Ancient Spirit Groves & Briar Stag Sanctuary',
    theme: 'forest',
    groundTex: 'tile-forest',
    pathTex: 'tile-path-moss',
    waterTex: 'tile-water',
    treeTex: 'prop-tree-emerald',
    bgColor: '#2d5a3c',
    minimapColor: '#244730',
    petalColor: 0x80ffdb,
    portalPos: { x: 2160, y: 912 },
    returnPos: { x: 240, y: 912 },
    nextWorld: 'sunken',
    enemySpec: { name: 'Briar Bogling', tex: 'enemy-slime', hp: 55, atk: 10, xp: 35, drop: 'spirit_dew' },
    bossSpec:  { id: 'boss_forest', name: 'SYLVAN BRIAR STAG (FOREST GUARDIAN)', tex: 'boss-stag', hp: 260, atk: 18, xp: 150, reward: 'seal_forest', x: 1808, y: 912 },
    npcSpec:   { name: 'Elder Banyan Sage', tex: 'npc-sage', portrait: '🌿', x: 528, y: 848,
      lines: [
        'Welcome to the Whispering Emerald Forest, Moon Walker and Totoro! A reality fracture has agitated the Sylvan Briar Stag to the East.',
        'Press J to combo (Jab/Slash/Spin), Hold J or Right-Click to Guard/Parry, K/Shift to Dash with i-frames!',
        'Totoro assists with Q (Spirit Roar stun), E (Belly Slam poise break), and F (Leaf Swiftness). Watch enemy tells: GOLD can be parried, RED must be dodged, and PURPLE requires Totoro!'
      ],
      getDialogue: (scene) => [
        {
          speaker: 'Elder Banyan Sage',
          portrait: '🌿',
          text: 'Greetings, travelers from Dhaka Valley! The ancient banyans of the Whispering Emerald Forest hum with your presence.',
          choices: [
            {
              label: '🦌 "Why has the Sylvan Briar Stag grown agitated?"',
              nextNodes: [
                { speaker: 'Elder Banyan Sage', portrait: '🌿', text: 'The Chrono-Fracture tore through reality, causing memories to shatter into wild thorns. The Stag is simply protecting the grove from the void.' },
                { speaker: 'Totoro', portrait: '🐾', text: 'We will soothe the guardian and seal the fracture! Stand behind me, Moon Walker.' }
              ]
            },
            {
              label: '🌱 "Elder Sage, do you recognize Totoro?"',
              nextNodes: [
                { speaker: 'Elder Banyan Sage', portrait: '🌿', text: 'Indeed! He is the ancient Forest Avatar of Shared Affection. His strength does not come from fury, but from how deeply he cares for you, Moon Walker.' },
                { speaker: 'Moon Walker', portrait: '🌙', text: 'I always knew you were special, Totoro.' },
                { speaker: 'Totoro', portrait: '🐾', text: 'Hearing that from you means more than all the wisdom in the Six Realms.' }
              ]
            },
            {
              label: '✨ Receive Forest Blessing (Heal HP & SP)',
              onPick: () => {
                SoundEngine.itemFanfare();
                DateState.hp = DateState.maxHp;
                DateState.sp = DateState.maxSp;
                getUI()?.updateRPGStats();
                getUI()?.showToast('🌿', 'Forest Blessing!', 'The Elder Sage revitalized your spirit!');
              },
              nextNodes: [
                { speaker: 'Elder Banyan Sage', portrait: '🌿', text: 'May the soothing dew of the emerald canopy restore your strength. Walk in peace, children of Earth and Spirit! (HP & SP Fully Restored!)' }
              ]
            },
            {
              label: '👻 "Elder Sage, what are these restless spirits wandering the grove?"',
              nextNodes: [
                {
                  speaker: 'Elder Banyan Sage',
                  portrait: '🌿',
                  text: DateState.forestSeanceComplete
                    ? 'Through your compassion, Moon Walker and Totoro, the three souls have been granted peace! Ananya no longer weeps alone, Kofil Chacha guides wanderers with warmth, and Prof. Shamsher has recorded the greatest paranormal breakthrough of our age.'
                    : 'The Chrono-Fracture tore through Dhaka’s historical memories, leaving three tragic spirits stranded here: Ananya the Weeping Petni in the north banyan, Kofil Chacha pulling his phantom rickshaw in the southwest marsh, and Prof. Shamsher in the northeast ruins, falling under the hypnotic trance of the Nishi (Night Caller). If you aid all three, gather them at the Ancient Spirit Altar!'
                },
                {
                  speaker: 'Totoro',
                  portrait: '🐾',
                  text: DateState.forestSeanceComplete
                    ? 'The air feels warm and comforting now. Not even the dark briars can scare us!'
                    : 'We will bring solace to these wandering ghosts. Lead the way, Moon Walker!'
                }
              ]
            }
          ]
        }
      ]
    },
    matItem: 'spirit_dew'
  },
  sunken: {
    id: 'sunken',
    name: 'World 3: Sunken Kingdom',
    subtitle: 'Coral Temples, Luminous Tidepools & Lost Relics',
    theme: 'sunken',
    groundTex: 'tile-sunken',
    pathTex: 'tile-path-coral',
    waterTex: 'tile-water',
    treeTex: 'prop-pillar-coral',
    bgColor: '#1f5f78',
    minimapColor: '#184b5e',
    petalColor: 0x7fd4e6,
    portalPos: { x: 2160, y: 912 },
    returnPos: { x: 240, y: 912 },
    nextWorld: 'ember',
    enemySpec: { name: 'Tidepool Crabler', tex: 'enemy-crab', hp: 90, atk: 16, xp: 55, drop: 'coral_shard' },
    bossSpec:  { id: 'boss_sunken', name: 'ABYSSAL CORAL LEVIATHAN', tex: 'boss-leviathan', hp: 420, atk: 24, xp: 240, reward: 'seal_sunken', x: 1808, y: 912 },
    npcSpec:   { name: 'Tidekeeper Marina', tex: 'npc-marina', portrait: '🐚', x: 528, y: 848,
      lines: [
        'Our coastal kingdom sank when the memory fractures began, yet your Dhaka keepsakes resonate with our ancient coral shrines!',
        'Collect Luminous Coral Shards around the tidepools to craft the Coral Tideglaive before challenging the Abyssal Leviathan.'
      ],
      getDialogue: (scene) => [
        {
          speaker: 'Tidekeeper Marina',
          portrait: '🐚',
          text: 'Welcome to the Sunken Kingdom. The luminous coral tidepools have longed for the laughter of surface souls.',
          choices: [
            {
              label: '🌊 "How did this magnificent kingdom sink beneath the waves?"',
              nextNodes: [
                { speaker: 'Tidekeeper Marina', portrait: '🐚', text: 'When the mortals of the outer worlds forgot how to cherish quiet afternoons and sunset walks, the tides rose and swallowed our temples.' },
                { speaker: 'Moon Walker', portrait: '🌙', text: 'In Dhaka, we still sit by Dhanmondi Lake and watch the sunset together every evening.' },
                { speaker: 'Tidekeeper Marina', portrait: '🐚', text: 'I can feel that warmth radiating from your keepsakes. Your bond is literally restoring light to our coral shrines.' }
              ]
            },
            {
              label: '⚔️ "How do we prepare to face the Abyssal Leviathan?"',
              nextNodes: [
                { speaker: 'Tidekeeper Marina', portrait: '🐚', text: 'Gather Luminous Coral Shards from around the tidepools and forge the Coral Tideglaive in your Crafting tab (I). Dash through the waves with K to avoid its tidal vortex!' },
                { speaker: 'Totoro', portrait: '🐾', text: 'And my Spirit Roar (Q/R) will break through its abyssal shields!' }
              ]
            },
            {
              label: '🐚 Receive Tidekeeper’s Ocean Blessing',
              onPick: () => {
                SoundEngine.itemFanfare();
                DateState.hp = DateState.maxHp;
                DateState.sp = DateState.maxSp;
                getUI()?.updateRPGStats();
              },
              nextNodes: [
                { speaker: 'Tidekeeper Marina', portrait: '🐚', text: 'May the crystal waters soothe your wounds. Cleanse the Leviathan and bring peace back to the deep! (HP & SP Fully Restored!)' }
              ]
            }
          ]
        }
      ]
    },
    matItem: 'coral_shard'
  },
  ember: {
    id: 'ember',
    name: 'World 4: Emberfall Highlands',
    subtitle: 'Obsidian Forges, Lava Bridges & Dragon Territory',
    theme: 'ember',
    groundTex: 'tile-ember',
    pathTex: 'tile-path-stone',
    waterTex: 'tile-lava',
    treeTex: 'prop-spire-obsidian',
    bgColor: '#4a251d',
    minimapColor: '#3d1e17',
    petalColor: 0xff9248,
    portalPos: { x: 2160, y: 912 },
    returnPos: { x: 240, y: 912 },
    nextWorld: 'frost',
    enemySpec: { name: 'Cinder Hound', tex: 'enemy-wisp', hp: 135, atk: 22, xp: 80, drop: 'ember_ore' },
    bossSpec:  { id: 'boss_ember', name: 'IGNIS, THE MAGMA DRAKE', tex: 'boss-drake', hp: 620, atk: 32, xp: 360, reward: 'seal_ember', x: 1808, y: 912 },
    npcSpec:   { name: 'Master Blacksmith Kael', tex: 'npc-kael', portrait: '⚒️', x: 528, y: 848,
      lines: [
        'The fires of Emberfall recognize the warmth of Totoro’s spirit! Mine Volcanic Ember Ore to temper the Emberfall Sunblade.',
        'Defeat Ignis the Magma Drake in the eastern caldera to open the Frost Gate!'
      ],
      getDialogue: (scene) => [
        {
          speaker: 'Master Blacksmith Kael',
          portrait: '⚒️',
          text: 'CLANG! Welcome to the Emberfall Highlands! Mind the lava bridges—this caldera burns hotter than dragon breath.',
          choices: [
            {
              label: '🔥 "How does Totoro handle the volcanic heat?"',
              nextNodes: [
                { speaker: 'Master Blacksmith Kael', portrait: '⚒️', text: 'Totoro’s spirit aura absorbs the heat like a warm blanket! In fact, his belly is radiating enough warmth to temper my finest obsidian anvils!' },
                { speaker: 'Totoro', portrait: '🐾', text: 'Haha! It feels just like standing next to Tong-er Mama’s boiling tea kettle on a chilly Dhaka winter morning!' }
              ]
            },
            {
              label: '⚒️ "What weapon should we forge against Ignis the Magma Drake?"',
              nextNodes: [
                { speaker: 'Master Blacksmith Kael', portrait: '⚒️', text: 'Mine Volcanic Ember Ore in the crags and craft the Emberfall Sunblade. Combine it with Moon Walker’s agile parasol strikes!' },
                { speaker: 'Moon Walker', portrait: '🌙', text: 'We will bring down the Magma Drake and clear the path to the Frost Gate!' }
              ]
            },
            {
              label: '🔥 Receive Forge Sparks Blessing',
              onPick: () => {
                SoundEngine.itemFanfare();
                DateState.hp = DateState.maxHp;
                DateState.sp = DateState.maxSp;
                getUI()?.updateRPGStats();
              },
              nextNodes: [
                { speaker: 'Master Blacksmith Kael', portrait: '⚒️', text: 'Here is a hearty draught of forge-fire nectar! Go show that Magma Drake what Dhaka spirit is made of! (HP & SP Fully Restored!)' }
              ]
            }
          ]
        }
      ]
    },
    matItem: 'ember_ore'
  },
  frost: {
    id: 'frost',
    name: 'World 5: Kingdom of Eternal Frost',
    subtitle: 'Frozen Starlight Observatory & Glacier Ruins',
    theme: 'frost',
    groundTex: 'tile-frost',
    pathTex: 'tile-path-ice',
    waterTex: 'tile-water',
    treeTex: 'prop-tree-pine',
    bgColor: '#8ab6d6',
    minimapColor: '#5b88a8',
    petalColor: 0xffffff,
    portalPos: { x: 2160, y: 912 },
    returnPos: { x: 240, y: 912 },
    nextWorld: 'astral',
    enemySpec: { name: 'Glacier Wraith', tex: 'enemy-wraith', hp: 180, atk: 28, xp: 110, drop: 'frost_crystal' },
    bossSpec:  { id: 'boss_frost', name: 'CRYON, WARDEN OF ETERNAL FROST', tex: 'boss-warden', hp: 850, atk: 38, xp: 500, reward: 'seal_frost', x: 1808, y: 912 },
    npcSpec:   { name: 'Astronomer Lyra', tex: 'npc-lyra', portrait: '❄️', x: 528, y: 848,
      lines: [
        'Through our frozen observatory lens, we saw the same four constellations you charted over Dhanmondi Lake!',
        'Totoro is no ordinary spirit—he is the ancient Guardian of Shared Memories, bound to Moon Walker’s heart.',
        'Shatter Cryon’s barrier to ascend to the Astral Realm!'
      ],
      getDialogue: (scene) => [
        {
          speaker: 'Astronomer Lyra',
          portrait: '❄️',
          text: 'Brrr! Welcome to the Kingdom of Eternal Frost. Through my brass telescope, I have watched your journey from the stars.',
          choices: [
            {
              label: '✨ "Did you see the constellations we charted over Dhanmondi Lake?"',
              nextNodes: [
                { speaker: 'Astronomer Lyra', portrait: '❄️', text: 'Yes! The Starry Rickshaw, the Crescent Moon, the Crimson Krishnachura, and the Guardian Spirit. They are burned into the cosmic tapestry forever.' },
                { speaker: 'Totoro', portrait: '🐾', text: 'Hear that, Moon Walker? Our date memories are literally written in the universe!' }
              ]
            },
            {
              label: '☕ Share the memory of hot TSC Malai Cha in the freezing cold',
              onPick: () => {
                SoundEngine.teaClink();
                DateState.hp = DateState.maxHp;
                DateState.sp = DateState.maxSp;
                getUI()?.updateRPGStats();
              },
              nextNodes: [
                { speaker: 'Moon Walker', portrait: '🌙', text: 'Here, Lyra—close your eyes and imagine the aroma of crushed cardamom, thick malai, and warm clay cups on Fuller Road.' },
                { speaker: 'Astronomer Lyra', portrait: '❄️', text: '*(Gasp)*... It is so warm! The chill in my bones just vanished! What a magnificent city Dhaka must be! (HP & SP Fully Restored!)' }
              ]
            },
            {
              label: '🛡️ "How do we break Cryon the Frost Warden’s barrier?"',
              nextNodes: [
                { speaker: 'Astronomer Lyra', portrait: '❄️', text: 'Cryon’s heart is frozen in sorrow. Gather Frost Crystals and forge the Glacial Starlight Mail in your menu (I). Your warmth will shatter his icy shell!' }
              ]
            }
          ]
        }
      ]
    },
    matItem: 'frost_crystal'
  },
  astral: {
    id: 'astral',
    name: 'World 6: The Astral Realm',
    subtitle: 'Floating Celestial Sanctuary & Nexus of Memory',
    theme: 'astral',
    groundTex: 'tile-astral',
    pathTex: 'tile-path-star',
    waterTex: 'tile-water',
    treeTex: 'prop-pillar-astral',
    bgColor: '#1d1438',
    minimapColor: '#160f2b',
    petalColor: 0xf7cb45,
    portalPos: { x: 2160, y: 912 },
    returnPos: { x: 240, y: 912 },
    nextWorld: 'dhaka',
    enemySpec: { name: 'Void Echo', tex: 'enemy-wraith', hp: 230, atk: 34, xp: 150, drop: 'frost_crystal' },
    bossSpec:  { id: 'boss_astral', name: 'CHRONO-FRACTURE ARCHON (FINAL BOSS)', tex: 'boss-archon', hp: 1200, atk: 45, xp: 1000, reward: 'seal_astral', x: 1808, y: 912 },
    npcSpec:   { name: 'Celestial Chronicler', tex: 'npc-chronicler', portrait: '🌟', x: 528, y: 848,
      lines: [
        'Every keepsake you gathered in Dhaka Valley—from the Krishnachura blossom to the Peacekeeper Charm—anchors reality itself.',
        'Awaken the Starlight Crescent Blade in your Crafting tab and vanquish the Chrono-Fracture Archon to seal the realms forever!'
      ],
      getDialogue: (scene) => [
        {
          speaker: 'Celestial Chronicler',
          portrait: '🌟',
          text: 'You stand at the pinnacle of existence: The Astral Sanctuary. The Chrono-Fracture Archon threatens to erase all memories across space and time.',
          choices: [
            {
              label: '📜 "What makes our Dhaka memories so powerful here?"',
              nextNodes: [
                { speaker: 'Celestial Chronicler', portrait: '🌟', text: 'A memory forged in sincere love and shared joy is an indestructible anchor. The Archon can shatter rocks and stars, but it cannot dissolve the joy you two shared under the Krishnachura trees.' },
                { speaker: 'Totoro', portrait: '🐾', text: 'From clay-cup cha to rickshaw bells and stargazing, every second with Moon Walker is eternal.' }
              ]
            },
            {
              label: '⚔️ "How do we awaken the Starlight Crescent Blade?"',
              nextNodes: [
                { speaker: 'Celestial Chronicler', portrait: '🌟', text: 'Combine the seals of the four realms in your Crafting tab (I). It is the ultimate weapon of remembrance.' },
                { speaker: 'Moon Walker', portrait: '🌙', text: 'Totoro and I are ready. We will seal this fracture together!' }
              ]
            },
            {
              label: '🌟 Receive Celestial Chronicle Blessing',
              onPick: () => {
                SoundEngine.itemFanfare();
                DateState.hp = DateState.maxHp;
                DateState.sp = DateState.maxSp;
                getUI()?.updateRPGStats();
              },
              nextNodes: [
                { speaker: 'Celestial Chronicler', portrait: '🌟', text: 'May the eternal light of the cosmos surround you both. Vanquish the Archon and return to Dhaka Valley as legends! (HP & SP Fully Restored!)' }
              ]
            }
          ]
        }
      ]
    },
    matItem: 'frost_crystal'
  },
  curzon_interior: {
    id: 'curzon_interior',
    name: 'Curzon Hall: Faculty of Science',
    subtitle: 'Auditorium, Bose Quantum Lab & Botanical Herbarium',
    theme: 'curzon',
    groundTex: 'tile-curzon-floor',
    pathTex: 'tile-curzon-carpet',
    waterTex: 'tile-water',
    treeTex: 'prop-indoor-fern',
    bgColor: '#1b100d',
    minimapColor: '#5c1d24',
    petalColor: 0xffd580,
    isInterior: true,
    returnPos: { x: CURZON_X, y: CURZON_Y + 32 }
  },
  farmhouse: {
    id: 'farmhouse',
    name: 'Green Meadows Farmhouse 🏡',
    subtitle: 'Chacha Rafiq’s Pastoral Sanctuary & Animal Pastures',
    theme: 'farmhouse',
    groundTex: 'tile-grass',
    pathTex: 'tile-path',
    waterTex: 'tile-water',
    treeTex: 'prop-tree-krishna',
    bgColor: '#4a853e',
    minimapColor: '#366d30',
    petalColor: 0xffe066,
    isActivity: true,
    returnPos: { x: 752, y: 1456 }
  },
  arcade_interior: {
    id: 'arcade_interior',
    name: 'Dhaka Cyber Arcade 🕹️',
    subtitle: 'Retro Cabinets, Rhythm Stages & Claw Machines',
    theme: 'arcade',
    groundTex: 'tile-arcade-floor',
    pathTex: 'tile-arcade-carpet',
    waterTex: 'tile-water',
    treeTex: 'prop-indoor-fern',
    bgColor: '#0f0c1b',
    minimapColor: '#1e113a',
    petalColor: 0x00ffff,
    isInterior: true,
    returnPos: { x: ARCADE_X, y: ARCADE_Y + 48 }
  }
};

if (typeof window !== 'undefined') {
  (window as any).WORLDS_DB = WORLDS_DB;
}
