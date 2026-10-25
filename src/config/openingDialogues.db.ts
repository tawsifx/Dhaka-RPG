// src/config/openingDialogues.db.ts
// Dynamic Opening Dialogue & Interaction Database for Totoro & Moon Walker
// Provides varied, culturally rich, atmospheric opening scenarios that rotate dynamically on each reload.

export interface DialogueChoiceNode {
  label: string;
  onPick?: () => void;
  nextNodes?: Array<{
    speaker: string;
    portrait: string;
    text: string;
  }>;
}

export interface OpeningDialogueNode {
  speaker: string;
  portrait: string;
  text: string;
  choices?: DialogueChoiceNode[];
}

export interface OpeningScenarioDef {
  id: string;
  title: string;
  theme: 'romance' | 'cozy' | 'playful' | 'adventure' | 'poetic' | 'rainy';
  badgeText: string;
  promptText: string;
  weatherAffinity?: 'rain' | 'clear' | 'any';
  timeAffinity?: 'morning' | 'afternoon' | 'sunset' | 'night' | 'any';
  rewardItemId: string;
  rewardDescription: string;
  dialogueNodes: OpeningDialogueNode[];
}

export const OPENING_SCENARIOS_DB: Record<string, OpeningScenarioDef> = {
  krishnachura_blossom: {
    id: 'krishnachura_blossom',
    title: 'The Crimson Canopy Rehearsal',
    theme: 'romance',
    badgeText: '❗ Totoro (Holding Blossom 🌸)',
    promptText: 'SPACE / TAP: Meet Totoro! 🌸',
    weatherAffinity: 'clear',
    timeAffinity: 'any',
    rewardItemId: 'flower',
    rewardDescription: 'Bright crimson Krishnachura blossom plucked fresh from the Curzon canopy.',
    dialogueNodes: [
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'Moon Walker! You made it! I was standing under this Krishnachura tree rehearsing how to act cool, and I immediately forgot every line the second you smiled.'
      },
      {
        speaker: 'Moon Walker',
        portrait: '🌙',
        text: 'You brought Chibi-Totoro on your head AND a crimson blossom? That is already cooler than any speech, Totoro.'
      },
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'I saved the brightest Krishnachura flower for your hair. Ready to explore Dhaka University, Ramna, Dhanmondi Lake, and the shimmering portals beyond?',
        choices: [
          {
            label: "Duh, 100% yes. Let's walk together!",
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: "Best answer in Dhaka history! Lead the way, Moon Walker! I'm walking right behind you wherever you go."
              }
            ]
          },
          {
            label: 'Only if you hold my hand in Dhaka traffic and share your food.',
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: "Hand-holding is mandatory, and you get first dibs on every plate—even when we meet Anamika for Star Kebab!"
              }
            ]
          }
        ]
      }
    ]
  },

  matir_bhaar_cha: {
    id: 'matir_bhaar_cha',
    title: 'Cardamom Malai Cha Surprise',
    theme: 'cozy',
    badgeText: '❗ Totoro (Holding Warm Cha ☕)',
    promptText: 'SPACE / TAP: Share Warm Tea ☕',
    weatherAffinity: 'any',
    timeAffinity: 'morning',
    rewardItemId: 'item_malai_cha',
    rewardDescription: 'Aromatic cardamom-infused Malai Cha in an earthen clay cup from Tong-er Mama.',
    dialogueNodes: [
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'Moon Walker! Careful, watch your step! I got here twenty minutes early and ran to Tong-er Mama for two steaming matir bhaars of Malai Cha!'
      },
      {
        speaker: 'Moon Walker',
        portrait: '🌙',
        text: 'Look at you balancing clay cups with giant paws! Is that thick clotted malai and freshly crushed cardamom on top?'
      },
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'Extra malai, double cardamom, and zero spills! Tong-er Mama said tea tastes sweetest when shared under Curzon red bricks on a fresh date morning.',
        choices: [
          {
            label: 'Take a warm sip together right now before we walk!',
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: '*sips contentedly* Aah! Sweet, warm, and creamy. Now our date has authentic Dhaka energy! Lead on, Moon Walker!'
              }
            ]
          },
          {
            label: 'Hold mine while I tie my hair with a crimson ribbon.',
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: 'Carefully guarded! Not a single drop will spill while you get ready. You look breathtaking today.'
              }
            ]
          }
        ]
      }
    ]
  },

  rainy_leaf_umbrella: {
    id: 'rainy_leaf_umbrella',
    title: 'The Giant Taro Leaf Canopy',
    theme: 'rainy',
    badgeText: '❗ Totoro (Taro Leaf Umbrella 🍃)',
    promptText: 'SPACE / TAP: Step Under Leaf 🍃',
    weatherAffinity: 'rain',
    timeAffinity: 'any',
    rewardItemId: 'flower',
    rewardDescription: 'Curzon lotus leaf petal with glistening rain droplets.',
    dialogueNodes: [
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'Moon Walker! Quick, get under my leaf! A gentleman forest spirit never lets his favorite person get caught in the Dhaka weather without shelter.'
      },
      {
        speaker: 'Moon Walker',
        portrait: '🌙',
        text: 'Look at this gigantic colocasia leaf! Did you pick this from the Curzon botanical pond just for us?'
      },
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'Hand-picked with Chibi-Totoro! It serves dual duty: Kalbaishakhi rain umbrella AND golden afternoon sunshade. Ready to stroll under our private leafy roof?',
        choices: [
          {
            label: 'Snuggle close under the giant leaf.',
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: '*purrs warmly with a big toothy grin* Perfect shelter. The rain can drum all day on our leaf and we will just keep smiling.'
              }
            ]
          },
          {
            label: 'Only if Chibi-Totoro gets front-row umbrella seats too.',
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: 'Chibi is already nestled on my left ear munching an acorn! Room for all three of us on this campus tour.'
              }
            ]
          }
        ]
      }
    ]
  },

  nilkhet_poetry_anthology: {
    id: 'nilkhet_poetry_anthology',
    title: 'The Nilkhet Vintage Poetry Hunt',
    theme: 'poetic',
    badgeText: '❗ Totoro (Vintage Book 📚)',
    promptText: 'SPACE / TAP: Inspect Antique Book 📚',
    weatherAffinity: 'any',
    timeAffinity: 'afternoon',
    rewardItemId: 'book_poetry',
    rewardDescription: 'Vintage second-hand poetry anthology with handwritten campus love couplets.',
    dialogueNodes: [
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'Moon Walker! Look what the Nilkhet Boiwala handed me while I was waiting for you under the arches!'
      },
      {
        speaker: 'Moon Walker',
        portrait: '🌙',
        text: 'An antique leather-bound poetry anthology? Let me see the cover... Jibanananda Das and Kazi Nazrul Islam!'
      },
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'Someone decades ago pressed golden Shimul petals right inside the page about walking along Fuller Road at twilight. Shall we read a couplet before we start?',
        choices: [
          {
            label: 'Read me the marked poem out loud, Totoro!',
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: '"For thousands of years I have walked the paths of the earth... yet every road brought me right here to your smile, Moon Walker."'
              }
            ]
          },
          {
            label: "Let's press our own Krishnachura petal on the next page!",
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: "A permanent keepsake for today! Let's tuck a crimson petal inside and make this our official chronicle."
              }
            ]
          }
        ]
      }
    ]
  },

  secret_rickshaw_map: {
    id: 'secret_rickshaw_map',
    title: 'The Grand Dhaka Tour Blueprint',
    theme: 'adventure',
    badgeText: '❗ Totoro (Secret Street Map 🗺️)',
    promptText: 'SPACE / TAP: Check Food Map 🗺️',
    weatherAffinity: 'any',
    timeAffinity: 'any',
    rewardItemId: 'flower',
    rewardDescription: 'Colorful hand-drawn napkin map tracing the route to Dhaka date street food.',
    dialogueNodes: [
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'Moon Walker! Behold: The Master Route of Dhaka Romance! I spent all morning drawing it with charcoal and hibiscus petal pigment.'
      },
      {
        speaker: 'Moon Walker',
        portrait: '🌙',
        text: 'Let me inspect this... Curzon Hall lawn, Fuller Road chai adda, fiery Naga Fuchka, Charukola terracotta, and rowboats on Dhanmondi Lake?'
      },
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'Every legendary stop marked with tiny hearts, plus emergency detour arrows to Star Kebab! Ready to conquer the route together?',
        choices: [
          {
            label: 'The map is masterfully plotted! First stop: Rickshaw tour!',
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: 'Rhythmic rickshaw bells, here we come! Taka in pocket, wind in our hair, and Moon Walker leading the adventure!'
              }
            ]
          },
          {
            label: 'I love that eighty percent of your romantic map is food stalls.',
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: '*pats round tummy proudly* A well-fed forest spirit is a romantic forest spirit! Quality food equals quality romance.'
              }
            ]
          }
        ]
      }
    ]
  },

  charukola_terracotta_paint: {
    id: 'charukola_terracotta_paint',
    title: 'The Charukola Fine Arts Clay Prank',
    theme: 'playful',
    badgeText: '❗ Totoro (Clay & Paint 🎨)',
    promptText: 'SPACE / TAP: Greet Artisan Totoro 🎨',
    weatherAffinity: 'any',
    timeAffinity: 'afternoon',
    rewardItemId: 'keepsake_painted_mug',
    rewardDescription: 'Handcrafted terracotta clay cup with colorful Boishakhi alpana painted by Totoro.',
    dialogueNodes: [
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'Moon Walker! Don\'t look at my nose! Nadia and the fine arts students at Charukola invited me to try pottery painting and things got... enthusiastic.'
      },
      {
        speaker: 'Moon Walker',
        portrait: '🌙',
        text: '*bursts out laughing* You have white rice-paste alpana swirls on both ears and wet red clay on your tummy chevrons! You look utterly adorable!'
      },
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'I was trying to paint a portrait of you on this earthen clay mug! See? The smile is accurate, even if the eyes are a little lopsided. What do you think?',
        choices: [
          {
            label: "Dab a smudge of clay on Moon Walker's cheek so we match!",
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: '*gently dabs your cheek with a painted paw* Ha! Now we are both certified Charukola campus artists. Partners in clay and mischief!'
              }
            ]
          },
          {
            label: 'Gently wipe the paint off his nose and hug him.',
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: '*blushes warmly and purrs* You have the gentlest hands in Dhaka. Let\'s keep this mug safe in our bag forever.'
              }
            ]
          }
        ]
      }
    ]
  },

  stargazing_brass_telescope: {
    id: 'stargazing_brass_telescope',
    title: 'The Celestial Rickshaw Constellation',
    theme: 'poetic',
    badgeText: '❗ Totoro (Brass Telescope 🔭)',
    promptText: 'SPACE / TAP: Chart Starlight 🔭',
    weatherAffinity: 'clear',
    timeAffinity: 'sunset',
    rewardItemId: 'flower',
    rewardDescription: 'Curzon Krishnachura petal kissed by the twilight sky.',
    dialogueNodes: [
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'Moon Walker! Look through this brass telescope! Astronomer Lyra whispered that tonight the ancient Dhaka constellations will burn with extra brilliance.'
      },
      {
        speaker: 'Moon Walker',
        portrait: '🌙',
        text: 'The Starry Rickshaw and the Crescent Moon? I thought those were only old folk legends!'
      },
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'They align directly above Dhanmondi Lake pier at twilight. But until the stars awaken, the brightest light on this entire campus is standing right in front of me.',
        choices: [
          {
            label: 'Promise we will watch the constellations from the rowboat tonight.',
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: 'A sacred forest spirit promise! Floating lanterns on calm water with starlight mirrored around us.'
              }
            ]
          },
          {
            label: 'You are becoming quite the smooth talker, Totoro!',
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: 'Dhaka campus air has that effect on people—especially when holding hands with Moon Walker!'
              }
            ]
          }
        ]
      }
    ]
  },

  chibi_totoro_acorn_scramble: {
    id: 'chibi_totoro_acorn_scramble',
    title: 'Chibi-Totoro Acorn Scramble',
    theme: 'playful',
    badgeText: '❗ Totoro (Acorn Surprise 🌰)',
    promptText: 'SPACE / TAP: Catch Chibi-Totoro! 🌰',
    weatherAffinity: 'any',
    timeAffinity: 'any',
    rewardItemId: 'flower_beli_garland',
    rewardDescription: 'Fragrant white Beli garland strung with fresh flowers by Chibi-Totoro.',
    dialogueNodes: [
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'Moon Walker, catch him! Chibi found an enchanted golden acorn near the Curzon botanical garden and he is zooming in circles!'
      },
      {
        speaker: 'Moon Walker',
        portrait: '🌙',
        text: 'Gotcha, little guy! *scoops up Chibi-Totoro into her arms* Aww, look! He brought a hand-woven Beli flower garland wrapped around his tummy!'
      },
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'He wanted to drape the garland around your wrist himself, but he got stage fright the second your footsteps clicked along the brick pavement.',
        choices: [
          {
            label: "Drape half the garland on Moon Walker and half on Totoro's ear!",
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: '*wiggles ears joyfully* Fragrant white Beli flowers! Now the whole campus will know we are on a grand date together.'
              }
            ]
          },
          {
            label: 'Tickle Chibi-Totoro under the chin and thank him.',
            nextNodes: [
              {
                speaker: 'Totoro',
                portrait: '🐾',
                text: 'Chibi is purring at maximum volume! He votes that we head straight to Nilkhet for poetry and snacks!'
              }
            ]
          }
        ]
      }
    ]
  }
};

/**
 * Companion re-engagement dialogue variants when reloading with Totoro already joined.
 */
export const COMPANION_RELOAD_DIALOGUES: Array<{
  id: string;
  condition?: (time: string, weather: boolean) => boolean;
  nodes: OpeningDialogueNode[];
}> = [
  {
    id: 'companion_dhaka_spring',
    nodes: [
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'Moon Walker! The Krishnachura blossoms are drifting in the breeze. Where should our paws carry us next?'
      },
      {
        speaker: 'Moon Walker',
        portrait: '🌙',
        text: 'Anywhere with you, Totoro. Let\'s check the quest scroll or stroll toward Fuller Road!'
      }
    ]
  },
  {
    id: 'companion_chai_craving',
    nodes: [
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'I can smell Tong-er Mama\'s cardamom chai wafting from Fuller Road! My tummy is making hungry spirit noises.'
      },
      {
        speaker: 'Moon Walker',
        portrait: '🌙',
        text: 'You never let a tea stall go unvisited, do you? Lead the way, my big fuzzy companion.'
      }
    ]
  },
  {
    id: 'companion_rain_shelter',
    condition: (_t, isRain) => isRain,
    nodes: [
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'The Kalbaishakhi rain is singing against the red Curzon bricks. Stay dry under my leafy umbrella, Moon Walker.'
      },
      {
        speaker: 'Moon Walker',
        portrait: '🌙',
        text: 'Holding hands in the rain is classic Dhaka romance. Nothing can stop our date!'
      }
    ]
  },
  {
    id: 'companion_portal_readiness',
    nodes: [
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'My spirit claws are sharpened and my pouch is full of seeds and tea. Whether we stroll Dhaka or brave the Six Realms, I\'ve got your back!'
      },
      {
        speaker: 'Moon Walker',
        portrait: '🌙',
        text: 'With you beside me, Totoro, even the Chrono-Fracture doesn\'t feel frightening.'
      }
    ]
  },
  {
    id: 'companion_evening_stargaze',
    nodes: [
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: 'Look at the golden light reflecting on Dhanmondi Lake shore! We should get a wooden rowboat before the lanterns fade.'
      },
      {
        speaker: 'Moon Walker',
        portrait: '🌙',
        text: 'That rowboat finale was made for us. Let\'s make sure we visit the pier tonight!'
      }
    ]
  }
];
