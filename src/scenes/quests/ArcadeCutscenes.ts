// src/scenes/quests/ArcadeCutscenes.ts - Cutscenes for Dhaka Cyber Arcade Discovery, Entry & Diagnostics
import { DateState } from '../../state/DateState';
import { SoundEngine } from '../../audio/SoundEngine';
import { UIController as UI } from '../../ui/UIController';
import { ArcadeGameSlot, ArcadeSlotManager } from '../../systems/arcade/ArcadeSlotManager';

export class ArcadeCutscenes {
  /**
   * Exterior Discovery Cutscene: Plays when player first interacts with or approaches the Arcade facade.
   */
  static playArcadeDiscoveryCutscene(scene: any, onComplete?: () => void): void {
    if (DateState.arcadeDiscovered) {
      if (onComplete) onComplete();
      return;
    }

    scene.cutsceneLocked = true;
    SoundEngine.starChime();

    // Camera pans up to the glowing neon marquee
    const cam = scene.cameras.main;
    const origFollow = cam._follow;
    cam.stopFollow();

    cam.pan(1312, 680, 700, 'Sine.easeInOut', false, (_cam: any, progress: number) => {
      if (progress === 1) {
        // Totoro excited bounce
        if (scene.totoro) {
          scene.tweens.add({
            targets: scene.totoro,
            y: scene.totoro.y - 18,
            duration: 180,
            yoyo: true,
            repeat: 2,
            ease: 'Quad.easeOut'
          });
        }

        UI.startDialogue([
          {
            speaker: 'Totoro',
            portrait: '🐾',
            text: 'WHOA! Look at those blinding neon lights and that giant glowing joystick sign! What is this place, Moon Walker?!'
          },
          {
            speaker: 'Moon Walker',
            portrait: '🌙',
            text: 'It’s the legendary Dhaka Cyber Arcade! Back in the day, students from Dhaka University, BUET, and Elephant Road would crowd into parlors like this after exams.'
          },
          {
            speaker: 'Totoro',
            portrait: '🐾',
            text: 'I can hear electronic beeps, chiptune beats, and clinking metal from outside! Can we go inside? Please, please?!'
          },
          {
            speaker: 'Moon Walker',
            portrait: '🌙',
            text: 'Of course! Look, someone dropped a velvet pouch of 5 shiny brass Cyber Tokens on the doorstep. Let’s head in!'
          }
        ], () => {
          DateState.arcadeDiscovered = true;
          DateState.arcadeTokens = (DateState.arcadeTokens || 0) + 5;
          if (!DateState.inventory.includes('arcade_token')) {
            DateState.inventory.push('arcade_token');
          }
          DateState.itemCounts = DateState.itemCounts || {};
          DateState.itemCounts['arcade_token'] = (DateState.itemCounts['arcade_token'] || 0) + 5;

          UI.showToast('🪙', '+5 Arcade Tokens!', 'Discovered Dhaka Cyber Arcade tokens!');
          SoundEngine.itemFanfare();

          // Smoothly pan back to player
          if (scene.player) {
            cam.pan(scene.player.x, scene.player.y, 500, 'Sine.easeInOut', false, (_c: any, p: number) => {
              if (p === 1) {
                if (origFollow) cam.startFollow(origFollow, true, 0.08, 0.08);
                scene.cutsceneLocked = false;
                if (onComplete) onComplete();
              }
            });
          } else {
            scene.cutsceneLocked = false;
            if (onComplete) onComplete();
          }
        });
      }
    });
  }

  /**
   * Interior Grand Entrance Cutscene: Plays when Moon Walker first enters the arcade interior.
   */
  static playFirstInteriorCutscene(scene: any, onComplete?: () => void): void {
    if (DateState.arcadeInteriorExplored) {
      if (onComplete) onComplete();
      return;
    }

    scene.cutsceneLocked = true;
    SoundEngine.levelUp();

    const cam = scene.cameras.main;
    const origFollow = cam._follow;
    cam.stopFollow();

    // Pan across the glowing arcade floor to Manager Shanto
    cam.pan(640, 360, 900, 'Sine.easeInOut', false, (_cam: any, progress: number) => {
      if (progress === 1) {
        UI.startDialogue([
          {
            speaker: 'Manager Shanto',
            portrait: '🕹️',
            text: 'Welcome, Welcome to Dhaka Cyber Arcade! Step right onto the retro carpet, folks! Freshly waxed floors and crisp CRT monitors!'
          },
          {
            speaker: 'Totoro',
            portrait: '🐾',
            text: '*Sniffs the air* It smells like warm capacitors, bubblegum, and victory! Look at the row of fighting cabs and that giant dual racing setup!'
          },
          {
            speaker: 'Manager Shanto',
            portrait: '🕹️',
            text: 'Every single cabinet in here runs on our modular Game Slot Architecture. The motherboards are fully wired, power supplies humming, and controllers calibrated.'
          },
          {
            speaker: 'Moon Walker',
            portrait: '🌙',
            text: 'So if we want to add custom mini-games later, we just register them directly into any open cabinet slot?'
          },
          {
            speaker: 'Manager Shanto',
            portrait: '🕹️',
            text: 'Exactly! Plug your game into `ArcadeSlotManager.registerGame()`, and the cabinet boots right up. In the meantime, inspect any machine to run hardware diagnostics or try the claw crane!'
          }
        ], () => {
          DateState.arcadeInteriorExplored = true;
          if (scene.player) {
            cam.pan(scene.player.x, scene.player.y, 600, 'Sine.easeInOut', false, (_c: any, p: number) => {
              if (p === 1) {
                if (origFollow) cam.startFollow(origFollow, true, 0.08, 0.08);
                scene.cutsceneLocked = false;
                if (onComplete) onComplete();
              }
            });
          } else {
            scene.cutsceneLocked = false;
            if (onComplete) onComplete();
          }
        });
      }
    });
  }

  /**
   * Diagnostic Cutscene for unpopulated Game Slots.
   * Gives full architectural clarity to the user and confirms the slot is ready for their custom games.
   */
  static playCabinetTestCutscene(scene: any, slot: ArcadeGameSlot): void {
    scene.cutsceneLocked = true;
    SoundEngine.select();

    // Screen flash simulation
    const flash = scene.add.rectangle(slot.x, slot.y - 20, 48, 36, 0x00ffff, 0.8).setDepth(200);
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 350,
      onComplete: () => flash.destroy()
    });

    UI.startDialogue([
      {
        speaker: 'Cabinet OS [BIOS v2.4]',
        portrait: '📟',
        text: `>>> HARDWARE DIAGNOSTIC REPORT <<<\nSlot ID: [${slot.id}]\nChassis: ${slot.name}\nGenre: ${slot.genre}\nStatus: STANDBY (Architecture Ready)`
      },
      {
        speaker: 'Moon Walker',
        portrait: '🌙',
        text: `The motherboard is active! Resolution: ${slot.width}x${slot.height}px cabinet footprint. Controller harness: ${slot.cabinetStyle.toUpperCase()} format.`
      },
      {
        speaker: 'Totoro',
        portrait: '🐾',
        text: `*Click-clack click-clack* The Sanwa joystick and buttons feel ultra smooth! Moon Walker, when you code a new game, we can plug it right into [${slot.id}]!`
      },
      {
        speaker: 'System Note',
        portrait: '💡',
        text: `Developers: To mount a game here, call:\nArcadeSlotManager.registerGame('${slot.id}', {\n  name: 'Your Game',\n  launch: (scene) => { ... }\n});`
      }
    ], () => {
      scene.cutsceneLocked = false;
    });
  }

  /**
   * Claw Machine Interactive Cutscene: Spend 1 token to grab a prize.
   */
  static playClawMachineCutscene(scene: any, clawX: number, clawY: number): void {
    if (!DateState.arcadeTokens || DateState.arcadeTokens < 1) {
      UI.startDialogue([
        {
          speaker: 'Neon Claw Machine',
          portrait: '🏗️',
          text: 'INSERT TOKEN! (You do not have any arcade tokens. Talk to Manager Shanto or use the Token Dispenser!)'
        }
      ]);
      return;
    }

    scene.cutsceneLocked = true;
    DateState.arcadeTokens -= 1;
    if (DateState.itemCounts && DateState.itemCounts['arcade_token']) {
      DateState.itemCounts['arcade_token'] = Math.max(0, DateState.itemCounts['arcade_token'] - 1);
    }
    SoundEngine.select();

    // Create an animated claw head descending
    const clawHead = scene.add.rectangle(clawX, clawY - 30, 16, 12, 0xff00ff).setDepth(150);
    const clawString = scene.add.line(0, 0, clawX, clawY - 48, clawX, clawY - 30, 0xffffff, 0.8).setOrigin(0, 0).setDepth(149);

    scene.tweens.add({
      targets: [clawHead, clawString],
      y: '+=24',
      duration: 600,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        clawHead.destroy();
        clawString.destroy();

        if (!DateState.arcadeClawWon) {
          DateState.arcadeClawWon = true;
          if (!DateState.inventory.includes('plushie_totoro')) {
            DateState.inventory.push('plushie_totoro');
          }
          DateState.itemCounts = DateState.itemCounts || {};
          DateState.itemCounts['plushie_totoro'] = 1;
          SoundEngine.itemFanfare();

          UI.startDialogue([
            {
              speaker: 'Claw Machine',
              portrait: '🏗️',
              text: '*CLANK!* The mechanical crane locked onto a fluffy neon prize and successfully dropped it through the prize chute!'
            },
            {
              speaker: 'Totoro',
              portrait: '🐾',
              text: 'LOOK! IT’S A NEON ARCADE PLUSHIE OF ME! IT’S ROUND AND FUZZY AND BEAUTIFUL!'
            },
            {
              speaker: 'Moon Walker',
              portrait: '🌙',
              text: 'Haha, it looks just like you, Totoro! This is going right into our keepsake collection.'
            }
          ], () => {
            UI.showToast('🧸', 'Rare Prize Won!', 'Neon Arcade Totoro Plushie added to keepsakes!');
            scene.cutsceneLocked = false;
          });
        } else {
          SoundEngine.starChime();
          UI.startDialogue([
            {
              speaker: 'Claw Machine',
              portrait: '🏗️',
              text: '*BZZT!* The claw snatched some neon candies and nostalgic stickers! (Tokens remaining: ' + DateState.arcadeTokens + ')'
            },
            {
              speaker: 'Totoro',
              portrait: '🐾',
              text: 'Yum! Sweet tamarind candy drops! Good job with the joystick, Moon Walker!'
            }
          ], () => {
            scene.cutsceneLocked = false;
          });
        }
      }
    });
  }

  /**
   * Token Dispenser Cutscene: Exchange or receive tokens.
   */
  static playTokenDispenser(scene: any): void {
    SoundEngine.select();
    UI.startDialogue([
      {
        speaker: 'Brass Token Dispenser',
        portrait: '🪙',
        text: `TOKENS AVAILABLE: ${DateState.arcadeTokens || 0}\nInsert 10 Taka note to exchange for 5 brass Cyber Arcade tokens?`,
        choices: [
          {
            label: '🪙 Exchange 10 Taka for 5 Tokens',
            nextNodes: [
              {
                speaker: 'Brass Token Dispenser',
                portrait: '🪙',
                text: '*CHUNK-CHUNK-CLINK-CLINK!* 5 shiny brass tokens tumble into the brass tray!',
                onPick: () => {
                  DateState.arcadeTokens = (DateState.arcadeTokens || 0) + 5;
                  if (!DateState.inventory.includes('arcade_token')) {
                    DateState.inventory.push('arcade_token');
                  }
                  DateState.itemCounts = DateState.itemCounts || {};
                  DateState.itemCounts['arcade_token'] = (DateState.itemCounts['arcade_token'] || 0) + 5;
                  SoundEngine.itemFanfare();
                  UI.showToast('🪙', '+5 Tokens', `You now have ${DateState.arcadeTokens} tokens!`);
                }
              }
            ]
          },
          {
            label: '❌ Step Away',
            nextNodes: []
          }
        ]
      }
    ]);
  }
}

if (typeof window !== 'undefined') {
  (window as any).ArcadeCutscenes = ArcadeCutscenes;
}
