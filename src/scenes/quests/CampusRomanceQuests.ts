// src/scenes/quests/CampusRomanceQuests.ts - Narrative Campus Romance Quests Engine (Ahona, Rakin, Salat, Enan, Apshora, Anamika)
import { DateState } from '../../state/DateState';
import { RPGStats } from '../../state/RPGStats';
import { SoundEngine } from '../../audio/SoundEngine';
import { UIController as UI } from '../../ui/UIController';

export class CampusRomanceQuests {
  /* =========================================================================
   *  AHONA & RAKIN RECONCILIATION & ACOUSTIC CONCERT
   * ========================================================================= */
  static interactAhonaApshora(scene: any): void {
    if (!DateState.totoroJoined) {
      UI.startDialogue([
        { speaker: 'Ahona', portrait: '😒', text: 'Oh look, Apshora, is that Moon Walker walking all by herself near Fuller Road?' },
        { speaker: 'Moon Walker', portrait: '🌙', text: '(Ahona and Apshora are looking for trouble... Let me go meet Totoro at Curzon Hall first!)' }
      ]);
      return;
    }

    if (!DateState.bulliesDefeated) {
      scene.cutsceneLocked = true;
      SoundEngine.alertExclaim();
      scene.tweens.add({ targets: [scene.ahona, scene.apshora], y: '-=10', duration: 120, yoyo: true });

      UI.startDialogue([
        { speaker: 'Ahona', portrait: '😒', text: 'Well, well, look who is strolling past Fuller Road. Where do you think you are going, Moon Walker?' },
        { speaker: 'Apshora', portrait: '🙄', text: 'Honestly, carrying around street flowers and old Nilkhet books? We were just saying how ridiculous...' },
        { speaker: 'Totoro (Stepping In Front)', portrait: '🐾', text: 'Hold on right there. Take one step back and watch how you speak to her.' }
      ], () => {
        SoundEngine.totoroRoar();
        scene.tweens.add({
          targets: scene.totoro,
          x: scene.ahona.x + 20,
          y: scene.ahona.y + 24,
          scaleX: 1.34,
          scaleY: 1.34,
          duration: 280,
          ease: 'Back.easeOut',
          onComplete: () => {
            scene.cameras.main.shake(230, 0.006);
            UI.startDialogue([
              { speaker: 'Totoro', portrait: '🐾', text: 'Moon Walker has more kindness, grace, and brilliance in her little finger than both of you combined. If either of you ever tries to disrespect her again, you will answer to me.' },
              { speaker: 'Ahona', portrait: '😨', text: 'Eek! W-why is he so huge and intimidating?! Apshora, did the ground just shake?!' },
              { speaker: 'Apshora', portrait: '😰', text: 'W-we are sorry, Moon Walker! Come on Ahona, let us run to the Ramna Park bench!' }
            ], () => {
              SoundEngine.scurryAway();
              scene.tweens.add({ targets: scene.totoro, scaleX: 1, scaleY: 1, duration: 250 });
              scene.tweens.add({
                targets: scene.ahona,
                x: 1290,
                y: 480,
                duration: 950,
                ease: 'Cubic.easeOut'
              });
              scene.tweens.add({
                targets: scene.apshora,
                x: 1335,
                y: 480,
                duration: 950,
                ease: 'Cubic.easeOut'
              });
              scene.tweens.add({
                targets: scene.rivalBadge,
                x: 1312,
                y: 412,
                duration: 950,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                  scene.ahona.setPosition(1290, 480).setDepth(480);
                  scene.apshora.setPosition(1335, 480).setDepth(480);
                  scene.rivalBadge.setPosition(1312, 412).setText('😢 Ahona (Crying on Bench)');
                  scene.rivalInteract.x = 1312;
                  scene.rivalInteract.y = 480;
                  scene.rivalInteract.name = 'Check on Crying Ahona';
                  DateState.bulliesDefeated = true;
                  DateState.ahonaQuestStage = 1;
                  scene.cutsceneLocked = false;
                  UI.giveItem('shield', 'Totoro stepped in and sent Ahona & Apshora running.');
                  scene.advanceDateProgress();
                }
              });
            });
          }
        });
      });
      return;
    }

    if (DateState.ahonaQuestStage === 1) {
      UI.startDialogue([
        { speaker: 'Apshora', portrait: '😟', text: 'Moon Walker, please do not let Totoro roar at us again! Ahona has been crying on this bench for ten minutes...' },
        { speaker: 'Ahona (Sniffling)', portrait: '😢', text: 'I am really sorry for being so mean to you earlier, Moon Walker. The truth is... my boyfriend Rakin and I had a terrible argument at TSC this afternoon.' },
        {
          speaker: 'Ahona',
          portrait: '😢',
          text: 'He walked off toward Nilkhet Book Lane and has not answered my texts. When I saw how sweet and protective Totoro was with you, I got bitter and jealous and took it out on you.',
          choices: [
            {
              label: '"Hey, dry your tears. I saw Rakin near Nilkhet, I will go talk to him for you!"',
              nextNodes: [
                { speaker: 'Ahona', portrait: '🥺', text: 'Wait... you would actually help me after how awful I was to you? You really are as kind as Totoro said.' },
                { speaker: 'Totoro', portrait: '🐾', text: 'See? That is my Moon Walker. Let us walk up to Nilkhet Book Lane (North-Center) and talk some sense into Rakin!' }
              ]
            },
            {
              label: '"Apology accepted, Ahona. Everyone deserves a second chance at love."',
              nextNodes: [
                { speaker: 'Apshora', portrait: '🥺', text: 'Thank you, Moon Walker! Rakin was last seen pacing around between Aparajeyo Bangla and Nilkhet Book Lane.' }
              ]
            }
          ]
        }
      ], () => {
        DateState.ahonaQuestStage = 2;
        scene.rivalBadge.setText('🥺 Ahona (Waiting for Rakin)');
        scene.rakinBadge.setText('❗ Rakin (Talk to Him!)');
        UI.updateQuestText();
      });
      return;
    }

    if (DateState.ahonaQuestStage === 2) {
      UI.startDialogue([
        { speaker: 'Ahona', portrait: '🥺', text: 'Did you find Rakin near Nilkhet Book Lane yet? He usually wears his navy-blue Panjabi when we have a date...' },
        { speaker: 'Apshora', portrait: '😟', text: 'Please hurry, Moon Walker! I have run out of tissues for her.' }
      ]);
      return;
    }

    if (DateState.ahonaQuestStage === 3) {
      this.playAhonaRakinReunionCutscene(scene);
      return;
    }

    SoundEngine.playOhonaSong(20);
    if (scene.ahona) {
      const note = scene.add.text(scene.ahona.x, scene.ahona.y - 68, '♪ 💖 ♫', {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '15px',
        color: '#fef08a',
        stroke: '#1e1b4b',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(2400);
      scene.tweens.add({
        targets: note,
        y: note.y - 28,
        alpha: 0,
        duration: 1400,
        ease: 'Sine.easeOut',
        onComplete: () => note.destroy()
      });
    }

    scene.reunionVisits = (scene.reunionVisits || 0) + 1;
    UI.startDialogue([
      {
        speaker: 'Ahona (Happy & Humming ♪)',
        portrait: '😊',
        text: '♪ "Ohona..." ♪ Moon Walker! Totoro! Whenever you come by, my heart feels so light and happy! Who would you like to chat with on our bench?',
        choices: [
          {
            label: '🎸 Watch Rakin’s Surprise Guitar Concert for Ahona! (Sing "Ohona" from 0:15)',
            onPick: () => this.playRakinConcertForAhonaCutscene(scene)
          },
          {
            label: '🌹 Talk with Ahona (Reconciliation reflections & "Ohona" song)',
            onPick: () => {
              SoundEngine.playOhonaSong(20);
              UI.startDialogue([
                { speaker: 'Ahona', portrait: '😊', text: 'Do you hear this song, Moon Walker? It is "Ohona" by Subconscious—every time I am happy with Rakin, this melody plays in my head!' },
                { speaker: 'Ahona', portrait: '🥺', text: 'When I saw how gently Totoro treats you, it made me realize I was projecting all my insecurities onto you. You showed me that real love is about patience, trust, and lifting each other up.' },
                { speaker: 'Moon Walker', portrait: '🌙', text: 'Seeing you smile and hearing your song makes the whole campus brighter, Ahona!' }
              ]);
            }
          },
          {
            label: '💌 Talk with Rakin (Apology letters & acoustic guitar serenade)',
            nextNodes: [
              { speaker: 'Rakin', portrait: '💌', text: 'Moon Walker, Ahona cried happy tears when she read the letter! And whenever I play "Ohona" for her on my acoustic guitar, her smile lights up all of Ramna Park.' },
              { speaker: 'Totoro', portrait: '🐾', text: 'Told you, brother! A sincere apology, holding hands, and a heartfelt guitar serenade solves 100% of arguments.' },
              { speaker: 'Rakin', portrait: '🎸', text: 'Anytime you want to hear the live concert again, just ask us or talk to me directly!' }
            ]
          },
          ...(DateState.apshoraQuestStage === 0 ? [{
            label: '👗 Talk with Apshora (Her secret dreams & bold ambitions)',
            onPick: () => this.interactApshoraSolo(scene)
          }] : []),
          ...(DateState.apshoraQuestStage === 1 ? [{
            label: '👗 Talk with Apshora ("Did you introduce me to Anamika yet?")',
            onPick: () => this.interactApshoraSolo(scene)
          }] : []),
          ...(DateState.apshoraQuestStage >= 4 ? [{
            label: '👑 Talk with Apshora (Celebrated Fashion Mogul & London Gala)',
            onPick: () => this.interactApshoraSolo(scene)
          }] : []),
          ...(DateState.apshoraQuestStage >= 2 && DateState.apshoraQuestStage < 4 ? [{
            label: '✨ "Where is Apshora?" (Working at Charukola Atelier)',
            nextNodes: [
              { speaker: 'Ahona', portrait: '😊', text: 'Apshora is at Charukola Fine Arts with your bestie Anamika! They are working day and night on their debut fashion collection!' },
              { speaker: 'Rakin', portrait: '👔', text: 'I’ve never seen Apshora this inspired and driven. You should go visit their atelier on Charukola lawn!' }
            ]
          }] : [])
        ]
      }
    ]);
  }

  static interactRakin(scene: any): void {
    if (DateState.ahonaQuestStage < 2) {
      UI.startDialogue([
        { speaker: 'Rakin', portrait: '😔', text: '*Sigh*... I bought this bouquet of red roses and wrote an apology letter with a wax seal, yet I am too scared I ruined everything with Ahona...' },
        { speaker: 'Totoro', portrait: '🐾', text: 'Hang in there, brother. Something tells me we will be helping you deliver that letter very soon.' }
      ]);
      return;
    }

    if (DateState.ahonaQuestStage === 2) {
      UI.startDialogue([
        { speaker: 'Rakin', portrait: '😔', text: 'Excuse me... I have been pacing outside Nilkhet in my best navy Panjabi for an hour. I said something stubborn during a silly argument with my girlfriend Ahona, and now I am afraid she hates me.' },
        {
          speaker: 'Moon Walker',
          portrait: '🌙',
          text: 'Rakin! Ahona does not hate you at all. She is sitting on the Ramna Park bench right now crying because she misses you!',
          choices: [
            {
              label: '"Take those red roses and that apology letter to the Ramna bench right now!"',
              nextNodes: [{ speaker: 'Rakin', portrait: '😳', text: 'She is waiting at the Ramna Park bench?! Thank you so much, Moon Walker! I am running there right now!' }]
            },
            {
              label: '"Pro tip from Totoro: give her the roses and hold her hand immediately."',
              nextNodes: [{ speaker: 'Totoro', portrait: '🐾', text: 'Works 100% of the time, brother. Go on, we will meet you at the Ramna bench!' }]
            }
          ]
        }
      ], () => {
        DateState.ahonaQuestStage = 3;
        scene.cutsceneLocked = true;
        scene.tweens.add({
          targets: [scene.rakin, scene.rakinBadge],
          x: 1255,
          y: 480,
          duration: 1400,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            scene.rakin.setPosition(1255, 480).setDepth(480);
            scene.rakinBadge.setPosition(1255, 412).setText('💌 Rakin');
            scene.rakinInteract.x = 1255;
            scene.rakinInteract.y = 480;
            scene.cutsceneLocked = false;
            this.playAhonaRakinReunionCutscene(scene);
          }
        });
      });
      return;
    }

    if (DateState.ahonaQuestStage >= 4) {
      this.playRakinConcertForAhonaCutscene(scene);
      return;
    }

    this.playAhonaRakinReunionCutscene(scene);
  }

  static playAhonaRakinReunionCutscene(scene: any): void {
    if (DateState.ahonaQuestStage === 4) {
      this.interactAhonaApshora(scene);
      return;
    }
    scene.cutsceneLocked = true;
    scene.cameras.main.pan(1290, 470, 700, 'Sine.easeInOut');

    scene.time.delayedCall(750, () => {
      SoundEngine.heartUp();
      UI.startDialogue([
        { speaker: 'Rakin', portrait: '💌', text: 'Ahona! I was such an idiot earlier at TSC. I brought you fresh red roses, your favorite book from Nilkhet, and wrote everything I was too shy to say.' },
        { speaker: 'Ahona', portrait: '😭', text: 'Rakin! No, it was my fault. I was so miserable without you that I was rude to Moon Walker, and she still came all the way to Nilkhet to bring you back to me!' },
        { speaker: 'Apshora', portrait: '🥺', text: 'Moon Walker, Totoro... we owe you two the biggest apology. Please take this Peacekeeper Letter Charm as our thank-you gift!' },
        { speaker: 'Rakin', portrait: '🎸', text: 'And wait—Ahona, don’t move! I brought my acoustic guitar and set up a surprise mini-concert right here at Ramna Park just to sing your song for you!' }
      ], () => {
        DateState.ahonaQuestStage = 4;
        scene.rivalBadge.setText('💑 Ahona, Rakin & Apshora');
        scene.rakinBadge.setVisible(false);
        UI.giveItem('charm', 'Helped Ahona and her boyfriend Rakin reconcile at Ramna Park.');
        scene.advanceDateProgress();
        scene.time.delayedCall(350, () => {
          this.playRakinConcertForAhonaCutscene(scene);
        });
      });
    });
  }

  static playRakinConcertForAhonaCutscene(scene: any): void {
    scene.cutsceneLocked = true;

    const stageX = scene.ahona ? scene.ahona.x - 18 : 1272;
    const stageY = scene.ahona ? scene.ahona.y + 8 : 488;
    const ahonaX = stageX + 46;
    const ahonaY = stageY;

    if (scene.ahona) {
      scene.ahona.setPosition(ahonaX, ahonaY).setDepth(ahonaY).setFlipX(true);
    }
    if (scene.rakin) {
      scene.rakin.setPosition(stageX, stageY).setDepth(stageY + 2).setFlipX(false).setVisible(true);
    }
    if (scene.apshora && DateState.apshoraQuestStage < 2) {
      scene.apshora.setPosition(ahonaX + 34, ahonaY + 6).setDepth(ahonaY + 6).setFlipX(true);
    }

    const stageProps: any[] = [];

    const rug = scene.add.graphics().setDepth(stageY - 40);
    rug.fillStyle(0x7f1d1d, 0.92);
    rug.fillRoundedRect(stageX - 42, stageY - 22, 84, 34, 6);
    rug.lineStyle(2, 0xfacc15, 0.9);
    rug.strokeRoundedRect(stageX - 38, stageY - 19, 76, 28, 4);
    rug.fillStyle(0xfef08a, 0.35);
    rug.fillCircle(stageX, stageY - 5, 11);
    stageProps.push(rug);

    const spotlight = scene.add.circle(stageX + 16, stageY - 14, 92, 0xfde047, 0.14)
      .setScale(1.3, 0.72)
      .setDepth(stageY - 39);
    scene.tweens.add({
      targets: spotlight,
      alpha: { from: 0.10, to: 0.22 },
      scaleX: { from: 1.25, to: 1.38 },
      duration: 900,
      yoyo: true,
      repeat: -1
    });
    stageProps.push(spotlight);

    const stageGear = scene.add.graphics().setDepth(stageY + 3);
    stageGear.lineStyle(2.5, 0x451a03, 1);
    stageGear.lineBetween(stageX - 48, stageY, stageX - 48, stageY - 78);
    stageGear.lineBetween(stageX + 86, stageY, stageX + 86, stageY - 78);
    stageGear.lineStyle(1.2, 0x78350f, 0.9);
    stageGear.beginPath();
    stageGear.moveTo(stageX - 48, stageY - 74);
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const lx = Phaser.Math.Linear(stageX - 48, stageX + 86, t);
      const sag = Math.sin(t * Math.PI) * 14;
      const ly = stageY - 74 + sag;
      stageGear.lineTo(lx, ly);
    }
    stageGear.strokePath();
    for (let i = 1; i < 8; i++) {
      const t = i / 8;
      const lx = Phaser.Math.Linear(stageX - 48, stageX + 86, t);
      const ly = stageY - 74 + Math.sin(t * Math.PI) * 14;
      const col = i % 2 === 0 ? 0xfef08a : 0xf472b6;
      stageGear.fillStyle(col, 0.35);
      stageGear.fillCircle(lx, ly + 3, 6);
      stageGear.fillStyle(0xffffff, 0.95);
      stageGear.fillCircle(lx, ly + 3, 2.2);
    }
    stageGear.fillStyle(0x451a03, 1);
    stageGear.fillRoundedRect(stageX - 36, stageY - 22, 18, 20, 2);
    stageGear.lineStyle(1.2, 0xd97706, 1);
    stageGear.strokeRoundedRect(stageX - 36, stageY - 22, 18, 20, 2);
    stageGear.fillStyle(0x1c1917, 1);
    stageGear.fillCircle(stageX - 27, stageY - 11, 5.5);
    stageGear.fillStyle(0x1e293b, 1);
    stageGear.fillEllipse(stageX + 16, stageY + 1, 10, 4);
    stageGear.lineStyle(1.8, 0x94a3b8, 1);
    stageGear.lineBetween(stageX + 16, stageY + 1, stageX + 14, stageY - 32);
    stageGear.fillStyle(0xfacc15, 1);
    stageGear.fillEllipse(stageX + 13, stageY - 34, 4.5, 6);
    stageProps.push(stageGear);

    const concertBanner = scene.add.text(stageX + 18, stageY - 86, '🎸 RAKIN’S LIVE CONCERT FOR AHONA ♪', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#fef08a',
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      padding: { x: 8, y: 4 },
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(2450);
    stageProps.push(concertBanner);

    scene.cameras.main.stopFollow();
    scene.cameras.main.pan(stageX + 18, stageY - 18, 750, 'Sine.easeInOut');
    scene.cameras.main.zoomTo(1.18, 850, 'Sine.easeInOut');

    if (!scene.anims.exists('rakin-guitar-strum')) {
      scene.anims.create({
        key: 'rakin-guitar-strum',
        frames: [
          { key: 'npc-rakin-guitar-0' },
          { key: 'npc-rakin-guitar-1' }
        ],
        frameRate: 4.5,
        repeat: -1
      });
    }

    if (scene.rakin) {
      scene.rakin.play('rakin-guitar-strum');
    }

    SoundEngine.guitarChord();
    SoundEngine.playOhonaSong(15);
    UI.showToast('🎸', 'Now Playing: "Ohona" (Live Concert)', 'Rakin is singing "Ohona" with his acoustic guitar from 0:15 for Ahona!');

    const rakinSway = scene.rakin ? scene.tweens.add({
      targets: scene.rakin,
      angle: { from: -2.5, to: 2.5 },
      y: stageY - 2,
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    }) : null;

    const ahonaSway = scene.ahona ? scene.tweens.add({
      targets: scene.ahona,
      angle: { from: 2, to: -2 },
      y: ahonaY - 3,
      duration: 480,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    }) : null;

    const noteSymbols = ['♪', '♫', '🎼', '🎸', '💖', '✨', '🌸'];
    const noteTimer = scene.time.addEvent({
      delay: 380,
      loop: true,
      callback: () => {
        const isRakin = Math.random() < 0.65;
        const bx = isRakin ? stageX + Phaser.Math.Between(-10, 14) : ahonaX + Phaser.Math.Between(-8, 8);
        const by = (isRakin ? stageY : ahonaY) - 48;
        const sym = isRakin
          ? noteSymbols[Phaser.Math.Between(0, 3)]
          : noteSymbols[Phaser.Math.Between(4, 6)];
        const note = scene.add.text(bx, by, sym, {
          fontFamily: 'Outfit, sans-serif',
          fontSize: isRakin ? '16px' : '14px',
          color: isRakin ? '#fde047' : '#f472b6',
          stroke: '#0f172a',
          strokeThickness: 3
        }).setOrigin(0.5).setDepth(2460);
        scene.tweens.add({
          targets: note,
          x: bx + Phaser.Math.Between(-18, 22),
          y: by - Phaser.Math.Between(28, 46),
          alpha: 0,
          duration: 1250,
          ease: 'Sine.easeOut',
          onComplete: () => note.destroy()
        });
      }
    });

    scene.time.delayedCall(800, () => {
      UI.startDialogue([
        {
          speaker: 'Rakin (Strumming Acoustic Guitar 🎸)',
          portrait: '🎸',
          text: '*Taps the microphone and strums a warm acoustic chord* "Testing, one, two... Everyone at Ramna Park, this concert is dedicated to the girl who owns my entire heart—Ahona."'
        },
        {
          speaker: 'Ahona (Blushing & Beaming)',
          portrait: '🥺',
          text: 'Rakin!! You set up fairy lights, a stage rug, and brought your acoustic guitar here?! Wait... I know this chord progression!'
        },
        {
          speaker: 'Rakin (Singing "Ohona" Live ♪)',
          portrait: '🎶',
          text: '♪ *Singing with his guitar from the 0:15 verse* — "Ohona... every melody I ever learned was just another way of calling your name under the Dhaka sky..." ♪'
        },
        {
          speaker: 'Ahona (Happy Tears & Swaying)',
          portrait: '😍',
          text: '♪ He is really singing "Ohona" for me!! Moon Walker, Totoro, listen to him play! I have never felt this happy in my whole life!'
        },
        {
          speaker: 'Totoro',
          portrait: '🐾',
          text: '*Sways happily to the acoustic guitar beat* Now THAT is how you put on a concert! Look at the whole park glowing with musical notes!'
        },
        {
          speaker: 'Moon Walker',
          portrait: '🌙',
          text: 'Your voice and guitar sound incredible, Rakin! And seeing Ahona this happy makes the music even more magical.'
        }
      ], () => {
        noteTimer.remove(false);
        if (rakinSway) rakinSway.stop();
        if (ahonaSway) ahonaSway.stop();
        if (scene.rakin) {
          scene.rakin.stop();
          scene.rakin.setAngle(0).setY(stageY).setTexture('npc-rakin-0');
          if (DateState.ahonaQuestStage >= 4 && !scene.scheduleSystem) {
            scene.rakinBadge.setVisible(false);
          }
        }
        if (scene.ahona) {
          scene.ahona.setAngle(0).setY(ahonaY);
        }
        stageProps.forEach((p: any) => {
          scene.tweens.add({
            targets: p,
            alpha: 0,
            duration: 500,
            onComplete: () => p.destroy()
          });
        });

        scene.cameras.main.zoomTo(1.0, 600, 'Sine.easeInOut');
        scene.cameras.main.startFollow(scene.player, true, 0.1, 0.1);
        scene.cutsceneLocked = false;
      });
    });
  }

  /* =========================================================================
   *  ENAN & SALAT COUPLE DATE QUESTLINE & CUTSCENES
   * ========================================================================= */
  static interactSalat(scene: any): void {
    if (!DateState.totoroJoined) {
      UI.startDialogue([
        { speaker: 'Salat', portrait: '🌸', text: 'Oh hello! Are you looking for your partner? I saw a huge, cuddly forest spirit waiting by the Krishnachura tree at Curzon Hall!' }
      ]);
      return;
    }

    if (DateState.enanQuestStage === 0) {
      SoundEngine.heartUp();
      UI.startDialogue([
        {
          speaker: 'Salat',
          portrait: '🌸',
          text: 'Moon Walker! Oh, it really is you! And is that... Totoro?! You two are literally the most enchanting couple in all of Dhaka!'
        },
        {
          speaker: 'Moon Walker',
          portrait: '🌙',
          text: 'Thank you, Salat! We have been exploring the valley together today.'
        },
        {
          speaker: 'Salat',
          portrait: '🌸',
          text: 'I have been watching you two from across the fountain... you look so genuinely happy and in love. You see that handsome guy over there in the navy silk Panjabi? That is Enan, my boyfriend.'
        },
        {
          speaker: 'Salat',
          portrait: '🌸',
          text: 'We have been together for two years since our first year at DU... but lately, he is so consumed by his job and client spreadsheets that we haven’t had a real date in months.'
        },
        {
          speaker: 'Salat',
          portrait: '✨',
          text: 'I just had the most wonderful idea: what if we go on a Double Couple Date together?! Enan and me, and Moon Walker and Totoro! We could walk under the Ramna trees, drink hot clay-cup Malai Cha, and take photos under the lanterns!',
          choices: [
            {
              label: '🌸 "That sounds like an amazing idea, Salat! Double date of the century!"',
              nextNodes: [
                {
                  speaker: 'Salat',
                  portrait: '🌸',
                  text: 'Really?! Oh, thank you! Moon Walker, please propose this scenario to Totoro so he is ready! And I will run over to Enan right now and tell him to put his laptop away!'
                },
                {
                  speaker: 'Moon Walker',
                  portrait: '🌙',
                  text: 'Go get him, Salat! We will watch from right here.'
                }
              ]
            },
            {
              label: '🍵 "Count us in! Totoro loves hot tea and sweet treats."',
              nextNodes: [
                {
                  speaker: 'Salat',
                  portrait: '✨',
                  text: 'Hooray! Moon Walker, let Totoro know our plan! I am going to tell Enan the great news right now!'
                }
              ]
            }
          ]
        }
      ], () => {
        DateState.enanQuestStage = 1;
        this.playEnanExcusesCutscene(scene);
      });
      return;
    }

    if (DateState.enanQuestStage === 1) {
      this.playEnanExcusesCutscene(scene);
      return;
    }

    if (DateState.enanQuestStage === 2) {
      SoundEngine.blip(340, 'sine');
      UI.startDialogue([
        {
          speaker: 'Salat (Crying)',
          portrait: '😭',
          text: '*Sniffles and wipes her tears* Did you see that, Moon Walker? He didn’t even look up from his phone. Not even for five seconds...'
        },
        {
          speaker: 'Salat',
          portrait: '💔',
          text: 'He called Totoro an "oversized forest spirit"... and said taking two hours for a date is "lost productivity". Am I just an interruption to his schedule now?'
        },
        {
          speaker: 'Salat',
          portrait: '🥺',
          text: 'When we first started dating on Curzon lawn, Enan wasn’t like this at all. He used to write silly rhymes on the back of exam papers. Once, during a Kalbaishakhi storm, he waited forty minutes in the soaking rain at TSC just to bring me hot tea because he knew I had a migraine.'
        },
        {
          speaker: 'Salat',
          portrait: '😭',
          text: 'Now all he sees are deadlines, quarterly targets, and billable hours. Does he even remember the boy he used to be? If work is all that matters to him, why are we even together?!',
          choices: [
            {
              label: '🌸 "Don’t give up on him yet, Salat. Let me tell Totoro—his ancient spirit wisdom can melt any stubborn heart!"',
              nextNodes: [
                {
                  speaker: 'Salat',
                  portrait: '🥺',
                  text: 'You think Totoro can reach him? Enan was so dismissive... but maybe an ancient forest avatar can shake him awake.'
                },
                {
                  speaker: 'Salat',
                  portrait: '🥺',
                  text: 'Please, Moon Walker... tell Totoro what happened. I just want my sweet, caring Enan back.'
                }
              ]
            },
            {
              label: '🫂 "You deserve to be loved and prioritized, Salat. We are going to give Enan a serious wake-up call."',
              nextNodes: [
                {
                  speaker: 'Salat',
                  portrait: '🥺',
                  text: 'Thank you... hearing you say that means the world. Please talk to Totoro, Moon Walker. Maybe he can make Enan realize what he is throwing away.'
                }
              ]
            }
          ]
        }
      ], () => {
        DateState.enanQuestStage = 3;
        if (scene.salatBadge) scene.salatBadge.setText('🥺 Salat (Hoping Totoro Can Help)');
        UI.updateQuestText();
        UI.showToast('💬', 'Talk to Totoro!', 'Tell Totoro about Enan’s excuses (Click Partner button or press E near Totoro)!');
      });
      return;
    }

    if (DateState.enanQuestStage === 3) {
      UI.startDialogue([
        {
          speaker: 'Salat',
          portrait: '🥺',
          text: 'Moon Walker, please talk to Totoro right beside you! Tell him how Enan is hiding behind his work excuses. I am praying Totoro can make him understand.'
        }
      ]);
      return;
    }

    if (DateState.enanQuestStage === 4) {
      UI.startDialogue([
        {
          speaker: 'Salat',
          portrait: '🥺',
          text: 'Totoro agreed to talk to Enan?! Oh, Moon Walker... I hope Enan listens. Please go confront him at Mintu Road!'
        }
      ]);
      return;
    }

    if (DateState.enanQuestStage >= 5) {
      SoundEngine.heartUp();
      UI.startDialogue([
        {
          speaker: 'Salat',
          portrait: '🌸',
          text: 'Moon Walker! Look at him—Enan hasn’t touched his phone once since our double date! He even tied fresh Beli flowers around my wrist.'
        },
        {
          speaker: 'Enan',
          portrait: '👔',
          text: 'And I am taking her to dinner at Dhanmondi Lake every Friday from now on. Totoro’s words will stay in my heart forever.'
        },
        {
          speaker: 'Totoro',
          portrait: '🐾',
          text: 'That is the spirit, Enan! The true wealth of Dhaka is the love we share under the night sky.'
        }
      ]);
    }
  }

  static playEnanExcusesCutscene(scene: any): void {
    scene.cutsceneLocked = true;
    scene.cameras.main.pan(1060, 750, 600, 'Sine.easeInOut');

    scene.time.delayedCall(650, () => {
      scene.tweens.add({
        targets: [scene.salat, scene.salatBadge],
        x: 1105,
        y: 736,
        duration: 750,
        ease: 'Power1',
        onComplete: () => {
          SoundEngine.blip(480, 'sine');
          UI.startDialogue([
            {
              speaker: 'Salat',
              portrait: '🌸',
              text: 'Enan, jaan! Look who is here—Moon Walker and Totoro! They agreed to go on a Double Couple Date with us tonight!'
            },
            {
              speaker: 'Enan (Glued to Phone)',
              portrait: '💼',
              text: '*Tapping furiously on his phone, without even looking up* ...Salat, please. I told you three times today, my quarterly project deliverables are due tomorrow morning at 9 AM, and I have thirty-four unread client emails.'
            },
            {
              speaker: 'Salat',
              portrait: '🥺',
              text: 'Enan, you promised me last week! It’s just two hours... we can have tea at TSC, walk by the lake, and double date with them!'
            },
            {
              speaker: 'Enan',
              portrait: '💼',
              text: 'Two hours?! Salat, do you know how much productivity that is? I don’t have time to go on a picnic date with an oversized forest spirit and an umbrella girl right now. Be reasonable! Maybe next month.'
            },
            {
              speaker: 'Salat',
              portrait: '💔',
              text: '...Next month? Enan, that’s what you said last month. And the month before that.'
            },
            {
              speaker: 'Enan',
              portrait: '💼',
              text: 'I am working for our future, Salat! Why can’t you understand that?! *turns his back coldly, continuing to type*'
            }
          ], () => {
            SoundEngine.blip(260, 'sine');
            scene.tweens.add({
              targets: [scene.salat, scene.salatBadge],
              x: 965,
              duration: 800,
              ease: 'Sine.easeInOut',
              onComplete: () => {
                DateState.enanQuestStage = 2;
                if (scene.salatBadge) scene.salatBadge.setText('😢 Salat (Crying by Fountain)');
                if (scene.enanBadge) scene.enanBadge.setText('📱 Enan (Glued to Screen)');
                scene.cameras.main.startFollow(scene.player, true, 0.1, 0.1);
                scene.cutsceneLocked = false;
                UI.updateQuestText();
                UI.showToast('😢', 'Salat is Heartbroken', 'Enan gave excuses and brushed her off. Go comfort Salat!');
              }
            });
          });
        }
      });
    });
  }

  static interactEnan(scene: any): void {
    if (!DateState.totoroJoined) {
      UI.startDialogue([
        { speaker: 'Enan', portrait: '💼', text: '*Typing on phone* Not right now, please. I am swamped with urgent project emails.' }
      ]);
      return;
    }

    if (DateState.enanQuestStage < 4) {
      SoundEngine.blip(300, 'square');
      UI.startDialogue([
        {
          speaker: 'Enan (Buried in Work)',
          portrait: '💼',
          text: 'Look, if you’re here to ask for directions or sell something, I don’t have time. I have thirty-four client emails to draft before my morning presentation.'
        },
        {
          speaker: 'Moon Walker',
          portrait: '🌙',
          text: '(Enan is completely trapped in his phone screen... Salat was right. We need Totoro’s wisdom to snap him out of this.)'
        }
      ]);
      return;
    }

    if (DateState.enanQuestStage === 4) {
      this.playTotoroSwaysEnanCutscene(scene);
      return;
    }

    if (DateState.enanQuestStage >= 5) {
      this.interactSalat(scene);
    }
  }

  static playTotoroSwaysEnanCutscene(scene: any): void {
    scene.cutsceneLocked = true;
    scene.cameras.main.pan(1110, 750, 700, 'Sine.easeInOut');

    scene.time.delayedCall(750, () => {
      scene.tweens.add({
        targets: scene.totoro,
        x: 1105,
        y: 736,
        duration: 500,
        ease: 'Sine.easeOut',
        onComplete: () => {
          SoundEngine.totoroRoar();
          for (let i = 0; i < 8; i++) {
            const petal = scene.add.circle(scene.totoro.x, scene.totoro.y - 30, 4, 0xff6b8b, 0.9).setDepth(2500);
            scene.tweens.add({
              targets: petal,
              x: scene.totoro.x + Phaser.Math.Between(-60, 60),
              y: scene.totoro.y - Phaser.Math.Between(40, 100),
              alpha: 0,
              duration: 1200,
              onComplete: () => petal.destroy()
            });
          }

          UI.startDialogue([
            {
              speaker: 'Enan',
              portrait: '💼',
              text: 'Listen, I already told Salat, I don’t have time to chit-chat with—'
            },
            {
              speaker: 'Totoro',
              portrait: '🐾',
              text: 'Enan. Put down that glowing rectangle in your hands.'
            },
            {
              speaker: 'Enan',
              portrait: '😳',
              text: '*Startled by Totoro’s deep, resonant spirit voice* ...W-what? Look, I am on the clock!'
            },
            {
              speaker: 'Totoro',
              portrait: '🐾',
              text: 'Tell me, Enan... when your brief mortal days beneath this Dhaka sky draw to an end, which memory will keep your spirit warm? The thirty-four emails you replied to at midnight? Or the sound of Salat’s laughter when the evening breeze carried the scent of Beli flowers through her hair?'
            },
            {
              speaker: 'Enan',
              portrait: '😳',
              text: '*His hand trembles, lowering his phone* ...I... I...'
            },
            {
              speaker: 'Totoro',
              portrait: '🐾',
              text: 'She stood by that fountain in tears. She was remembering a young man in an embroidered Panjabi who once stood forty minutes in the freezing Kalbaishakhi rain at TSC just to bring her ten-taka tea. Where did that boy go, Enan? Did you trade his soul for a promotion?'
            },
            {
              speaker: 'Moon Walker',
              portrait: '🌙',
              text: 'She isn’t asking for the world, Enan. She is asking for you. Work will never hold your hand when you are lonely, and a spreadsheet will never love you back.'
            },
            {
              speaker: 'Enan',
              portrait: '🥺',
              text: '*Tears well up in Enan’s eyes* What... what on earth have I been doing? She was standing right in front of me, hurting, and I was treating her love like a nuisance.'
            },
            {
              speaker: 'Enan',
              portrait: '🥺',
              text: 'I was so terrified of falling behind in life that I forgot why I wanted to succeed in the first place—to give her a happy life. But I was losing her in the process.'
            }
          ], () => {
            scene.tweens.add({
              targets: [scene.enan, scene.enanBadge],
              x: 865,
              duration: 600,
              ease: 'Power2',
              onComplete: () => {
                SoundEngine.heartUp();
                UI.startDialogue([
                  {
                    speaker: 'Enan',
                    portrait: '🥺',
                    text: 'Salat! Salat, look at me. I was an arrogant, blind fool. I am so deeply sorry. Work means nothing if I lose you. Please forgive me.'
                  },
                  {
                    speaker: 'Salat',
                    portrait: '😭',
                    text: 'Enan... you really put your phone away? You came back to me?'
                  },
                  {
                    speaker: 'Enan',
                    portrait: '🥺',
                    text: 'I came back, and I am never letting work get between us again. Tonight is completely for us.'
                  },
                  {
                    speaker: 'Salat',
                    portrait: '🌸',
                    text: '*Embraces Enan with joyful tears* Oh, Enan! I love you so much!'
                  },
                  {
                    speaker: 'Enan',
                    portrait: '👔',
                    text: 'Moon Walker, Totoro... you saved my relationship tonight. Will you please do us the greatest honor and join our Double Couple Date right this moment?!'
                  },
                  {
                    speaker: 'Totoro',
                    portrait: '🐾',
                    text: 'Grrr-oooh! That is what we came here for! Let the Double Couple Date begin!'
                  }
                ], () => {
                  DateState.enanQuestStage = 5;
                  this.playDoubleDateCutscene(scene);
                });
              }
            });
          });
        }
      });
    });
  }

  static playDoubleDateCutscene(scene: any): void {
    scene.cutsceneLocked = true;
    scene.cameras.main.pan(1060, 750, 600, 'Sine.easeInOut');

    scene.salat.setPosition(1045, 750).setDepth(750);
    scene.enan.setPosition(1080, 750).setDepth(750);
    scene.salatBadge.setPosition(1062, 685).setText('💑 Enan & Salat (Happy Couple)');
    if (scene.enanBadge) scene.enanBadge.setVisible(false);

    scene.player.setPosition(1010, 750);
    scene.totoro.setPosition(975, 750);

    for (let i = 0; i < 16; i++) {
      const heart = scene.add.text(
        Phaser.Math.Between(970, 1090),
        Phaser.Math.Between(750, 790),
        i % 2 === 0 ? '♥' : '🌸',
        { fontSize: '14px', color: '#ff69b4' }
      ).setDepth(2600);
      scene.tweens.add({
        targets: heart,
        y: heart.y - Phaser.Math.Between(30, 70),
        alpha: 0,
        duration: 1800,
        delay: i * 80,
        onComplete: () => heart.destroy()
      });
    }

    SoundEngine.itemFanfare();
    UI.startDialogue([
      {
        speaker: 'Enan',
        portrait: '👔',
        text: 'Tong-er Mama just delivered four fresh clay cups of steaming Malai Cha, and I bought a full pot of Bogurar Mishti Doi! Salat, have the first spoonful.'
      },
      {
        speaker: 'Salat',
        portrait: '🌸',
        text: 'Mmm! Sweet, chilled, and ten times better because we are all here together. Look at us—the greatest double date in Dhaka history!'
      },
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: '*Slurps cha happily* Sharing warmth, laughter, and four beating hearts under the city lights. This is the true soul of Dhaka!'
      },
      {
        speaker: 'Moon Walker',
        portrait: '🌙',
        text: 'A toast to love that never gives up! Say cheese for the camera!'
      },
      {
        speaker: 'Enan & Salat',
        portrait: '💑',
        text: '*Smiling together hand-in-hand* CHEESE! 📸'
      }
    ], () => {
      UI.giveItem('double_date_polaroid', 'Went on a memorable Double Couple Date with Enan, Salat, and Totoro.');
      RPGStats.gainXP(80);
      DateState.hearts = Math.min(5, DateState.hearts + 1);
      DateState.hp = DateState.maxHp;
      DateState.sp = DateState.maxSp;
      DateState.memories.push({
        emoji: '📸',
        title: 'Four-Hearts Double Couple Date',
        note: 'Totoro swayed Enan to put down his phone. Celebrated love with cha and mishti doi.'
      });

      SoundEngine.levelUp();
      UI.updateRPGStats();
      UI.updateHearts(DateState.hearts);
      UI.updateQuestText();
      UI.showToast('📸', 'Double Date Polaroid Keepsake!', 'Four-Hearts Double Date Polaroid added to bag! (+80 XP, +1 Heart)');

      scene.cameras.main.startFollow(scene.player, true, 0.1, 0.1);
      scene.cutsceneLocked = false;
    });
  }

  /* =========================================================================
   *  APSHORA & ANAMIKA: AMBITION & HERITAGE COUTURE SAGA
   * ========================================================================= */
  static interactApshoraSolo(scene: any): void {
    if (!DateState.totoroJoined) {
      UI.startDialogue([
        { speaker: 'Apshora', portrait: '💅', text: 'Moon Walker! Are you exploring campus? Have you seen Totoro at Curzon Hall yet?' }
      ]);
      return;
    }

    if (DateState.apshoraQuestStage === 0) {
      SoundEngine.heartUp();
      UI.startDialogue([
        {
          speaker: 'Apshora',
          portrait: '💅',
          text: 'Moon Walker! Come closer for a moment. Ahona and Rakin are over there murmuring love poetry... but to be completely honest, seeing them reconcile made me look at my own life.'
        },
        {
          speaker: 'Apshora',
          portrait: '🥺',
          text: 'I’ve spent months being the sidekick in everyone else’s relationship drama—holding Ahona’s tissues, giving fashion commentary, and playing the sassy best friend. But that is not all I am.'
        },
        {
          speaker: 'Moon Walker',
          portrait: '🌙',
          text: 'You’ve always had incredible style, Apshora. What is on your mind?'
        },
        {
          speaker: 'Apshora',
          portrait: '✨',
          text: 'I have a burning ambition, Moon Walker. Look around Dhaka: malls are stuffed with imported synthetic fast-fashion, while our generational Jamdani master-weavers in Sonargaon and handloom artisans in Barishal are going out of business.'
        },
        {
          speaker: 'Apshora',
          portrait: '🔥',
          text: 'I want to build Dhaka’s most daring cultural luxury fashion house: "Nodi O Jamdani" (River & Jamdani Collective)! Avant-garde silk capes, tailored Jamdani power-blazers, and handloom stoles woven with Bengali river poetry. I have the business plan, the retail capital, and the hunger to win. But I need an artistic visionary partner who understands regional folklore, village weavers, and natural dyes.',
          choices: [
            {
              label: '🎨 "Apshora! You HAVE to meet my bestie Anamika at Charukola!"',
              nextNodes: [
                { speaker: 'Moon Walker', portrait: '🌙', text: 'My best friend Anamika is a fine-arts prodigy at Charukola! Her boyfriend Shuvra is in Barishal with direct artisan launch links, and she has secret sketchbooks filled with river ballads and water-lily textile patterns!' },
                { speaker: 'Apshora', portrait: '😳', text: 'Wait... THAT Anamika?! The charismatic girl who bargains like a warrior at Nilkhet bookstalls and knows the river launch routes?! She is an artistic genius!' },
                { speaker: 'Apshora', portrait: '✨', text: 'Moon Walker, please take me to her! Introduce us right away—I can feel that this is going to be the turning point of my life!' }
              ]
            },
            {
              label: '🌟 "Your ambition is inspiring, Apshora. Anamika is the exact co-founder you need."',
              nextNodes: [
                { speaker: 'Apshora', portrait: '🥰', text: 'Thank you for believing in me, Moon Walker! Let us go find Anamika near Charukola / campus right now. Let’s create history together!' }
              ]
            }
          ]
        }
      ], () => {
        DateState.apshoraQuestStage = 1;
        if (scene.apshoraBadge) scene.apshoraBadge.setText('👗 Apshora (Wants to Meet Anamika)');
        UI.updateQuestText();
        UI.showToast('👗', 'Apshora’s Ambition Sparked!', 'Find Anamika walking near Charukola or Fuller Road (x:640 y:780) to introduce them!');
      });
      return;
    }

    if (DateState.apshoraQuestStage === 1) {
      UI.startDialogue([
        {
          speaker: 'Apshora',
          portrait: '✨',
          text: 'Moon Walker! Did you spot Anamika yet? I have my business portfolio and fabric swatches ready in my bag. Let’s talk to her whenever you’re near her!'
        }
      ]);
      return;
    }

    if (DateState.apshoraQuestStage >= 2 && DateState.apshoraQuestStage < 4) {
      this.interactApshoraAnamikaStudio(scene);
      return;
    }

    if (DateState.apshoraQuestStage >= 4) {
      SoundEngine.heartUp();
      UI.startDialogue([
        {
          speaker: 'Apshora',
          portrait: '👑',
          text: 'Moon Walker! Totoro! Look at this headline in the Dhaka Tribune: "Apshora & Anamika’s Nodi O Jamdani Sells Out Debut Collection in 48 Hours!"'
        },
        {
          speaker: 'Apshora',
          portrait: '🥰',
          text: 'Our handloom weavers in Sonargaon and Barishal just received full health insurance and 3x living wage bonuses thanks to our global orders. I went from being the sidekick to leading a national heritage movement... all because you believed in my spark.'
        },
        {
          speaker: 'Totoro',
          portrait: '🐾',
          text: 'True brilliance cannot be dimmed, Apshora. You carved your own path with honor and power!'
        },
        {
          speaker: 'Moon Walker',
          portrait: '🌙',
          text: 'You and Anamika are true inspirations to every dreamer in Dhaka!'
        }
      ]);
    }
  }

  static playApshoraAnamikaPitchCutscene(scene: any): void {
    scene.cutsceneLocked = true;

    let targetX = 640;
    let targetY = 780;
    if (scene.anamikaWanderer && scene.anamikaWanderer.sprite) {
      targetX = scene.anamikaWanderer.sprite.x;
      targetY = scene.anamikaWanderer.sprite.y;
    }

    scene.cameras.main.pan(targetX, targetY, 650, 'Sine.easeInOut');

    scene.time.delayedCall(700, () => {
      scene.apshora.setPosition(targetX - 70, targetY).setDepth(targetY);
      scene.tweens.add({
        targets: scene.apshora,
        x: targetX - 35,
        duration: 600,
        ease: 'Power1',
        onComplete: () => {
          SoundEngine.heartUp();

          for (let i = 0; i < 8; i++) {
            const star = scene.add.text(targetX - 18, targetY - 40, '✨', { fontSize: '13px' }).setDepth(2600);
            scene.tweens.add({
              targets: star,
              x: star.x + Phaser.Math.Between(-35, 35),
              y: star.y - Phaser.Math.Between(20, 50),
              alpha: 0,
              duration: 1200,
              delay: i * 70,
              onComplete: () => star.destroy()
            });
          }

          UI.startDialogue([
            {
              speaker: 'Moon Walker',
              portrait: '🌙',
              text: 'Anamika! Stop eating that Star Kebab mutton kebab for just three minutes. I want to introduce you to Apshora.'
            },
            {
              speaker: 'Anamika',
              portrait: '🥙',
              text: 'Huh?! Apshora?! The style queen of Fuller Road? Wait, why are you two looking at me like you’re about to announce a national revolution?!'
            },
            {
              speaker: 'Apshora',
              portrait: '✨',
              text: 'Because we ARE, Anamika. I’ve seen your sketches and heard about your ties to the Barishal river weavers through Shuvra. Dhaka is losing its soul to cheap synthetic fast-fashion while our generational Jamdani weavers are abandoned.'
            },
            {
              speaker: 'Apshora (Delivering Her Pitch)',
              portrait: '🔥',
              text: 'I have the seed capital, marketing strategy, and brand blueprint for an ultra-luxury cultural fashion house: "Nodi O Jamdani". But clothes without soul are just cloth. I need an artistic genius who knows Bengali river ballads, handloom block prints, and natural botanical dyes. Will you co-found this brand with me?'
            },
            {
              speaker: 'Anamika',
              portrait: '😳',
              text: '*Her eyes light up, dropping her takeaway parcel in shock* ...Are you serious?! Apshora, look at this sketchbook! I have spent two years secretly designing water-lily Jacquard borders, Jamdani power-stoles, and Jibanananda Das poetry calligraphy along silk hemlines!'
            },
            {
              speaker: 'Anamika',
              portrait: '😭',
              text: 'My professors said nobody in high fashion would fund rural handloom artisans! They said Dhaka only cares about foreign brand rip-offs!'
            },
            {
              speaker: 'Apshora',
              portrait: '✨',
              text: 'Then we are going to prove every single one of them wrong. Together. You design the soul and direct the artisans; I will run operations, sourcing, and take our runway to London and Paris.'
            },
            {
              speaker: 'Anamika',
              portrait: '🎉',
              text: 'YES! A thousand times YES! Partner! Shuvra’s launch docks from Barishal tomorrow morning—I’ll have him load three sacks of handspun organic yarn and river indigo dyes!'
            },
            {
              speaker: 'Totoro',
              portrait: '🐾',
              text: 'Roaaar! When two determined, brilliant women unite their spirits, the rivers themselves dance in celebration!'
            },
            {
              speaker: 'Moon Walker',
              portrait: '🌙',
              text: 'I knew you two were destined to be an unstoppable creative duo. Let’s get to work!'
            }
          ], () => {
            DateState.apshoraQuestStage = 2;

            scene.apshora.setPosition(320, 785).setDepth(785);
            if (scene.apshoraBadge) {
              scene.apshoraBadge.setPosition(320, 720).setText('✨ Apshora & Anamika Atelier');
              scene.apshoraBadge.setVisible(true);
            }
            if (scene.apshoraInteract) {
              scene.apshoraInteract.x = 320;
              scene.apshoraInteract.y = 785;
              scene.apshoraInteract.name = 'Visit Apshora & Anamika Atelier';
              scene.apshoraInteract.onInteract = () => this.interactApshoraAnamikaStudio(scene);
            }

            scene.cameras.main.startFollow(scene.player, true, 0.1, 0.1);
            scene.cutsceneLocked = false;
            UI.updateQuestText();
            UI.showToast('👗', 'Apshora & Anamika Atelier Founded!', 'Visit their design studio at Charukola Fine Arts (West, x:320 y:785) to review their debut collection!');
          });
        }
      });
    });
  }

  static interactApshoraAnamikaStudio(scene: any): void {
    SoundEngine.heartUp();

    if (DateState.apshoraQuestStage === 2) {
      UI.startDialogue([
        {
          speaker: 'Apshora',
          portrait: '✨',
          text: 'Moon Walker! Totoro! Welcome to our creative atelier! Anamika and I haven’t slept in 48 hours, and it was worth every second.'
        },
        {
          speaker: 'Anamika',
          portrait: '🎨',
          text: 'Shuvra’s launch arrived from Barishal at dawn packed with pure riverine cotton and natural indigo! And Prof. Sultana from Curzon Hall gave us centennial Krishnachura petals for our deep red dye!'
        },
        {
          speaker: 'Apshora',
          portrait: '👗',
          text: 'We are crafting the showstopper centerpiece for our grand debut runway. Moon Walker, you and Totoro have Dhaka’s purest aesthetic taste. Which design philosophy should define our centerpiece?',
          choices: [
            {
              label: '🌌 "A Royal Midnight-Violet Silk Stole woven with Golden Jamdani Paisleys."',
              nextNodes: [
                { speaker: 'Apshora', portrait: '✨', text: 'Perfection! Pure Rajshahi mulberry silk steeped in twilight violet, edged with 24k gold Jamdani thread. It embodies royal resilience!' },
                { speaker: 'Anamika', portrait: '🎨', text: 'I am sketching the gold-thread river borders right now! It looks breathtaking under the lamplight!' }
              ]
            },
            {
              label: '🌊 "A River-Indigo Handloom Cape inscribed with Jibanananda Das Barishal Poetry."',
              nextNodes: [
                { speaker: 'Anamika', portrait: '🥺', text: 'Yes! "Abar ashibo phire, Dhanshiriti-r teere..." The words of our southern rivers woven into luxury haute-couture!' },
                { speaker: 'Apshora', portrait: '✨', text: 'International curators will lose their minds over this level of literary storytelling!' }
              ]
            },
            {
              label: '🌺 "A Krishnachura-Crimson Organza Trench with Antique Silver Zari Embroidery."',
              nextNodes: [
                { speaker: 'Apshora', portrait: '🔥', text: 'Bold, fiery, and unapologetic! The exact red of Curzon Hall blossoms in springtime!' },
                { speaker: 'Anamika', portrait: '🎨', text: 'Prof. Sultana and Dr. Kabir are going to cheer from the front row when they see this!' }
              ]
            }
          ]
        },
        {
          speaker: 'Apshora',
          portrait: '👑',
          text: 'The debut collection is officially finalized! The runway has been erected under the historic red-brick colonnade of Curzon Hall. Are you ready to attend the Grand Debut Runway Exhibition?',
          choices: [
            {
              label: '🎉 "Let’s start the Grand Runway Exhibition at Curzon Hall right now!"',
              onPick: () => {
                DateState.apshoraQuestStage = 3;
                this.playApshoraExhibitionCutscene(scene);
              }
            },
            {
              label: '⏳ "Give me a minute to explore campus, then we’ll begin!"',
              nextNodes: [
                { speaker: 'Apshora', portrait: '✨', text: 'Take your time, Moon Walker! We’ll be waiting at Curzon Hall courtyard whenever you’re ready!' }
              ]
            }
          ]
        }
      ], () => {
        if (DateState.apshoraQuestStage === 2) {
          DateState.apshoraQuestStage = 3;
          if (scene.apshoraBadge) scene.apshoraBadge.setText('🎉 Apshora (Runway Ready at Curzon Hall)');
          UI.updateQuestText();
        }
      });
      return;
    }

    if (DateState.apshoraQuestStage === 3) {
      UI.startDialogue([
        {
          speaker: 'Apshora',
          portrait: '👑',
          text: 'The spotlights are glowing across Curzon Hall courtyard, and the critics have taken their seats! Shall we launch the show?',
          choices: [
            {
              label: '🎉 "Commence the Grand Runway Debut Exhibition!"',
              onPick: () => this.playApshoraExhibitionCutscene(scene)
            },
            {
              label: '⏳ "Just taking a final walk around the lawn first."',
              nextNodes: [
                { speaker: 'Anamika', portrait: '🎨', text: 'Hurry back, bestie! This night is going to redefine Dhaka!' }
              ]
            }
          ]
        }
      ]);
    }
  }

  static playApshoraExhibitionCutscene(scene: any): void {
    scene.cutsceneLocked = true;

    const runwayX = 420;
    const runwayY = 1310;
    scene.cameras.main.pan(runwayX, runwayY, 800, 'Sine.easeInOut');

    scene.time.delayedCall(850, () => {
      scene.player.setPosition(runwayX - 95, runwayY + 20);
      scene.totoro.setPosition(runwayX - 125, runwayY + 20);
      scene.apshora.setPosition(runwayX, runwayY - 20).setDepth(runwayY + 10);

      const runwayParticles: any[] = [];
      for (let i = 0; i < 24; i++) {
        const item = i % 4 === 0 ? '✨' : (i % 4 === 1 ? '⭐' : (i % 4 === 2 ? '🧣' : '🌸'));
        const p = scene.add.text(
          Phaser.Math.Between(runwayX - 110, runwayX + 110),
          Phaser.Math.Between(runwayY - 60, runwayY + 40),
          item,
          { fontSize: '15px' }
        ).setDepth(2650);
        scene.tweens.add({
          targets: p,
          y: p.y - Phaser.Math.Between(40, 90),
          alpha: 0,
          scaleX: 1.4,
          scaleY: 1.4,
          duration: 2200,
          delay: i * 75,
          onComplete: () => p.destroy()
        });
        runwayParticles.push(p);
      }

      SoundEngine.itemFanfare();
      scene.cameras.main.flash(350, 255, 245, 220);

      UI.startDialogue([
        {
          speaker: 'Dhaka Arts Emcee',
          portrait: '🎙️',
          text: 'Distinguished faculty, honored critics, and citizens of Dhaka! Welcome to the historic runway debut of "NODI O JAMDANI", founded by Apshora & Anamika!'
        },
        {
          speaker: 'Runway Narrator',
          portrait: '✨',
          text: '*Music swells as models glide down the red carpet beneath Curzon Hall’s glowing red-brick arches, draped in midnight-violet Rajshahi silks, shimmering gold Jamdani cloaks, and river-indigo stoles.*'
        },
        {
          speaker: 'Prof. Satyendra',
          portrait: '🔬',
          text: 'Fascinating! The optical interference of the pure gold zari and indigo thread creates a quantum harmonic sheen unlike anything in industrial textiles!'
        },
        {
          speaker: 'Prof. Sultana',
          portrait: '🌿',
          text: 'And the botanical dye stability from Curzon’s Krishnachura petals is breathtaking! A triumph of Bengali natural sciences and aesthetic design!'
        },
        {
          speaker: 'Ahona (Applauding Wildly)',
          portrait: '😭',
          text: 'Apshora!! Look at her, Rakin! Look at my best friend! She isn’t standing on any sideline anymore—she owns the entire world tonight!'
        },
        {
          speaker: 'Rakin & Enan',
          portrait: '👏',
          text: 'Bravo! Absolutely sensational work!'
        },
        {
          speaker: 'Apshora (At the Spotlight Mic)',
          portrait: '👑',
          text: 'Thank you, everyone! Growing up as girls in Dhaka, we are so often conditioned to keep our dreams modest—to stay quiet, follow in someone else’s footsteps, and never dare to take up space.'
        },
        {
          speaker: 'Apshora',
          portrait: '🔥',
          text: 'Tonight proves that our heritage is not a relic to hide away in museum boxes. It is alive, it is powerful, and when women join hands with fierce ambition and authentic artistry, nothing on earth can stop us!'
        },
        {
          speaker: 'Anamika',
          portrait: '🎨',
          text: 'And our rural weavers in Barishal and Sonargaon will never be exploited by middlemen again! We weave with honor, fair pay, and pure Bengali pride!'
        },
        {
          speaker: 'International Fashion Curator',
          portrait: '🌍',
          text: 'Outstanding! The South Asian Cultural Council is placing an immediate order for thirty complete ensembles to headline the London Fashion Gala next month!'
        },
        {
          speaker: 'Apshora & Anamika',
          portrait: '🥰',
          text: '*Gasping with tears of triumph and tightly embracing each other as flashbulbs burst across the runway*'
        },
        {
          speaker: 'Apshora (Walking up to Moon Walker)',
          portrait: '👑',
          text: 'Moon Walker... none of this would have happened if you hadn’t believed in my ambition and connected me to Anamika. You saw the fire in me when I was just a bitter girl on a bench. Please accept the crown jewel of our debut collection: Apshora’s Royal Heritage Silk Stole.'
        },
        {
          speaker: 'Totoro',
          portrait: '🐾',
          text: 'A wondrous achievement born of perseverance and sisterhood. May your creations touch every corner of the earth!'
        }
      ], () => {
        DateState.apshoraQuestStage = 4;
        UI.giveItem('apshora_silk_stole', 'Awarded by Apshora & Anamika at their triumphant Curzon Hall debut runway.');
        RPGStats.gainXP(90);
        DateState.sp = DateState.maxSp;
        DateState.hearts = Math.min(5, DateState.hearts + 1);

        DateState.memories.push({
          emoji: '🧣',
          title: 'Apshora & Anamika’s Heritage Triumph',
          note: 'Witnessed Apshora’s ambitious dream ignite into Dhaka’s premiere cultural fashion revolution alongside Anamika.'
        });

        SoundEngine.levelUp();
        UI.updateRPGStats();
        UI.updateHearts(DateState.hearts);
        UI.updateQuestText();
        UI.showToast('🧣', 'Apshora’s Silk Stole Acquired!', 'Royal Heritage Silk Stole added to bag! (+8 ATK, +8 DEF, +90 XP)');

        scene.apshora.setPosition(1345, 480).setDepth(480);
        if (scene.apshoraBadge) {
          scene.apshoraBadge.setPosition(1345, 412).setText('👑 Apshora (Celebrated Fashion Mogul)');
          scene.apshoraBadge.setVisible(true);
        }
        if (scene.apshoraInteract) {
          scene.apshoraInteract.x = 1345;
          scene.apshoraInteract.y = 480;
          scene.apshoraInteract.name = 'Talk to Fashion Mogul Apshora';
          scene.apshoraInteract.onInteract = () => this.interactApshoraSolo(scene);
        }

        scene.cameras.main.startFollow(scene.player, true, 0.1, 0.1);
        scene.cutsceneLocked = false;
      });
    });
  }
}
