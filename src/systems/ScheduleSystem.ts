// src/systems/ScheduleSystem.ts - NPC waypoint pathfinding & time-of-day behavior routines
// Migrated 100% intact from game.js
declare const Phaser: any;
import { SoundEngine } from '../audio/SoundEngine';
import { DateState } from '../state/DateState';
import { RPGStats } from '../state/RPGStats';
import { UI } from '../ui/UIController';

export class ScheduleSystem {
  static createWanderingCitizens(scene: any) {
    const specs = [
      {
        name: 'Anamika', baseTex: 'npc-anamika', portrait: '🥙', isAnamika: true,
        waypoints: [{ x: 640, y: 780 }, { x: 980, y: 780 }, { x: 980, y: 540 }, { x: 640, y: 540 }],
        speed: 50,
        conversations: [
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
        ]
      },
      {
        name: 'Arif (DU Physics Senior)', baseTex: 'npc-walker1', portrait: '🎓',
        waypoints: [{ x: 480, y: 1180 }, { x: 480, y: 520 }, { x: 780, y: 520 }, { x: 480, y: 520 }],
        speed: 55,
        conversations: [
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
        ]
      },
      {
        name: 'Nadia (Charukola Sketcher)', baseTex: 'npc-walker2', portrait: '🖌️',
        waypoints: [{ x: 340, y: 820 }, { x: 820, y: 820 }],
        speed: 48,
        conversations: [
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
        ]
      },
      {
        name: 'Mimi (Campus Ginger Cat)', baseTex: 'npc-cat', portrait: '🐱', isCat: true,
        waypoints: [{ x: 260, y: 380 }, { x: 540, y: 380 }, { x: 540, y: 260 }, { x: 260, y: 260 }],
        speed: 42,
        conversations: [
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
        ]
      },
      {
        name: 'Baki Bhai (Nilkhet Poet)', baseTex: 'npc-walker3', portrait: '📜', isPoet: true,
        waypoints: [{ x: 620, y: 320 }, { x: 1380, y: 320 }],
        speed: 46,
        conversations: [
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
        ]
      },
      {
        name: 'Sami (Street Photographer)', baseTex: 'npc-photo', portrait: '📸', isPhoto: true,
        waypoints: [{ x: 1520, y: 420 }, { x: 1520, y: 1120 }],
        speed: 54,
        conversations: [
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
        ]
      },
      {
        name: 'Tania (Dhanmondi Jogger)', baseTex: 'npc-jogger', portrait: '👟',
        waypoints: [{ x: 1150, y: 820 }, { x: 1680, y: 820 }, { x: 1680, y: 1180 }, { x: 1150, y: 1180 }],
        speed: 68,
        conversations: [
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
        ]
      }
    ];

    specs.forEach(s => {
      const start = s.waypoints[0];
      const sp = scene.add.sprite(start.x, start.y, `${s.baseTex}-0`).setOrigin(0.5, 1).setDepth(start.y);
      const animKey = scene.getOrCreateWalkAnim(s.baseTex, 4);
      if (animKey) sp.play(animKey);
      const badge = scene.add.text(start.x, start.y - sp.height - 6, '💬 ' + s.name, {
        fontFamily: 'Outfit', fontSize: '11px', fontStyle: 'bold',
        backgroundColor: s.isAnamika ? 'rgba(19, 78, 74, 0.92)' : 'rgba(31,30,28,0.75)',
        color: s.isAnamika ? '#fff3a1' : '#f7efe2',
        padding: { x: 5, y: 2 }
      }).setOrigin(0.5, 1).setDepth(start.y + 5);

      const wObj = {
        ...s,
        sprite: sp,
        badge,
        wpIdx: 1 % s.waypoints.length,
        lineIdx: 0,
        x: start.x,
        y: start.y,
        radius: 82,
        onInteract: () => {
          RPGStats.gainXP(15);

          // 1. Bestie Anamika Interactive Dialogue Hub
          if (s.isAnamika) {
            SoundEngine.heartUp();
            UI.startDialogue([
              {
                speaker: 'Anamika',
                portrait: '🥙',
                text: 'Moon Walker!! Bestie! Look at you and Totoro strolling together—my heart cannot handle how cute you two are! What’s the scoop?',
                choices: [
                  ...(DateState.apshoraQuestStage === 1 ? [{
                    label: '👗 "Anamika! Apshora wants to meet you—she has an incredible fashion startup vision!"',
                    onPick: () => scene.playApshoraAnamikaPitchCutscene()
                  }] : []),
                  ...(DateState.apshoraQuestStage === 2 ? [{
                    label: '✨ "How is the debut \'Nodi O Jamdani\' collection coming along, Anamika?"',
                    onPick: () => scene.interactApshoraAnamikaStudio()
                  }] : []),
                  ...(DateState.apshoraQuestStage === 3 ? [{
                    label: '🎉 "The runway is set! Let us begin the Grand Debut Exhibition at Curzon Hall!"',
                    onPick: () => scene.playApshoraExhibitionCutscene()
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
                  }
                ]
              }
            ]);
            return;
          }

          // 2. Mimi the Campus Ginger Cat Interactive Options
          if (s.isCat) {
            SoundEngine.catMeow();
            DateState.sideQuests.sq_cat_fish = true;
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
                  }
                ]
              }
            ]);
            return;
          }

          // 3. Baki Bhai (Nilkhet Poet)
          if (s.isPoet) {
            DateState.sideQuests.sq_poet_rhyme = true;
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
                  }
                ]
              }
            ]);
            return;
          }

          // 4. Sami (Street Photographer)
          if (s.isPhoto) {
            DateState.sideQuests.sq_photo_pose = true;
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
                      scene.cameras.main.flash(350, 255, 255, 255);
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
                      scene.cameras.main.flash(350, 255, 255, 255);
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
                      scene.cameras.main.flash(350, 255, 255, 255);
                    },
                    nextNodes: [
                      { speaker: 'Sami (Street Photographer)', portrait: '📸', text: '*FLASH!* Incredible dynamic tension! Moon Walker with her parasol and Totoro standing tall like the legendary Forest Guardian!' },
                      { speaker: 'Totoro', portrait: '🐾', text: 'The Six Realms do not stand a chance against us!' }
                    ]
                  }
                ]
              }
            ]);
            return;
          }

          // 5. Arif (Physics Senior)
          if (s.name.includes('Arif')) {
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
                  }
                ]
              }
            ]);
            return;
          }

          // 6. Nadia (Charukola Sketcher)
          if (s.name.includes('Nadia')) {
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
                  }
                ]
              }
            ]);
            return;
          }

          // 7. Tania (Dhanmondi Jogger)
          if (s.name.includes('Tania')) {
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
                  }
                ]
              }
            ]);
            return;
          }

          // Fallback standard conversations
          const conv = s.conversations[wObj.lineIdx % s.conversations.length];
          wObj.lineIdx++;
          UI.startDialogue(conv);
        }
      };

      if (s.isAnamika) scene.anamikaWanderer = wObj;
      scene.wanderers.push(wObj);
      scene.interactables.push(wObj);
    });
  }
}
