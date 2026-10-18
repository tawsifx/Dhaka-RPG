// src/systems/CombatSystem.ts - 3-hit parasol combos, dash i-frames, Totoro Spirit Roar & Belly Slam
// Migrated 100% intact from game.js
declare const Phaser: any;
import { SoundEngine } from '../audio/SoundEngine';
import { DateState } from '../state/DateState';
import { RPGStats } from '../state/RPGStats';
import { WEAPON_FX } from '../config/items.db';
import { WORLDS_DB } from '../config/worlds.db';
import { UI } from '../ui/UIController';

export class CombatSystem {
  static performPlayerAttack(scene: any) {
    if (UI.isOpen() || scene.cutsceneLocked || !scene.player) return;
    const now = scene.time.now;
    if (now - scene.lastAtkTime < 220) return;

    if (now - scene.lastAtkTime < 650) {
      scene.comboStep = (scene.comboStep + 1) % 3;
    } else {
      scene.comboStep = 0;
    }
    scene.lastAtkTime = now;

    const weaponId = (DateState.equipped && DateState.equipped.weapon) || 'umbrella_blade';
    const wfx = WEAPON_FX[weaponId] || WEAPON_FX.umbrella_blade;
    const baseAngle = Math.atan2(scene.facingVec.y, scene.facingVec.x);
    const px = scene.player.x;
    const py = scene.player.y - 18;

    if (scene.comboStep === 0) {
      // --- COMBO HIT 1: Swift Crescent Slash ---
      SoundEngine.attackSlash();

      // Quick forward lunge & tilt
      const lungeDist = 10;
      scene.tweens.add({
        targets: scene.player,
        x: px + scene.facingVec.x * lungeDist,
        y: scene.player.y + scene.facingVec.y * lungeDist,
        duration: 75,
        yoyo: true,
        ease: 'Quad.easeOut'
      });
      scene.tweens.add({
        targets: scene.player,
        angle: scene.player.flipX ? 14 : -14,
        duration: 70,
        yoyo: true,
        onComplete: () => scene.player.setAngle(0)
      });

      // Luminous Crescent Slash Graphic
      const slashGfx = scene.add.graphics().setDepth(2900);
      slashGfx.lineStyle(6, wfx.color, 0.95);
      slashGfx.beginPath();
      slashGfx.arc(px, py, 46, baseAngle - 0.95, baseAngle + 0.95, false);
      slashGfx.strokePath();

      slashGfx.lineStyle(2.5, wfx.glow, 1);
      slashGfx.beginPath();
      slashGfx.arc(px, py, 46, baseAngle - 0.75, baseAngle + 0.75, false);
      slashGfx.strokePath();

      scene.tweens.add({
        targets: slashGfx,
        scaleX: 1.35,
        scaleY: 1.35,
        alpha: 0,
        duration: 180,
        ease: 'Quad.easeOut',
        onComplete: () => slashGfx.destroy()
      });

      // Flying weapon spark particles
      for (let i = 0; i < 3; i++) {
        const offsetAng = baseAngle + (i - 1) * 0.45;
        const spark = scene.add.text(px + Math.cos(offsetAng) * 28, py + Math.sin(offsetAng) * 28, wfx.sparks[i % wfx.sparks.length], { fontSize: '11px' }).setOrigin(0.5).setDepth(2910);
        scene.tweens.add({
          targets: spark,
          x: px + Math.cos(offsetAng) * 58,
          y: py + Math.sin(offsetAng) * 58,
          alpha: 0,
          scale: 0.4,
          duration: 220,
          onComplete: () => spark.destroy()
        });
      }

      const dmg = RPGStats.getAtk() + Phaser.Math.Between(0, 3);
      CombatSystem.damageEnemiesInRadius(scene, px + scene.facingVec.x * 42, py + scene.facingVec.y * 42, 70, dmg, 24);

    } else if (scene.comboStep === 1) {
      // --- COMBO HIT 2: Piercing Starlight Thrust / Flurry Jab ---
      SoundEngine.attackThrust();

      // Extended lunge & stretch
      const lungeDist = 18;
      scene.tweens.add({
        targets: scene.player,
        x: px + scene.facingVec.x * lungeDist,
        y: scene.player.y + scene.facingVec.y * lungeDist,
        scaleX: scene.player.flipX ? -1.25 : 1.25,
        scaleY: 0.88,
        duration: 90,
        yoyo: true,
        ease: 'Cubic.easeOut',
        onComplete: () => scene.player.setScale(scene.player.flipX ? -1 : 1, 1)
      });

      // Long Piercing Starlight Spear Beam
      const tipX = px + scene.facingVec.x * 74;
      const tipY = py + scene.facingVec.y * 74;
      const thrustGfx = scene.add.graphics().setDepth(2900);
      thrustGfx.lineStyle(7, wfx.color, 0.85);
      thrustGfx.lineBetween(px, py, tipX, tipY);
      thrustGfx.lineStyle(3, wfx.glow, 1);
      thrustGfx.lineBetween(px, py, tipX, tipY);
      thrustGfx.fillStyle(wfx.glow, 1);
      thrustGfx.fillCircle(tipX, tipY, 7);

      scene.tweens.add({
        targets: thrustGfx,
        alpha: 0,
        duration: 200,
        onComplete: () => thrustGfx.destroy()
      });

      // Piercing starburst on impact
      for (let i = 0; i < 4; i++) {
        const sang = (i / 4) * Math.PI * 2;
        const spark = scene.add.text(tipX, tipY, wfx.sparks[0], { fontSize: '12px' }).setOrigin(0.5).setDepth(2910);
        scene.tweens.add({
          targets: spark,
          x: tipX + Math.cos(sang) * 35,
          y: tipY + Math.sin(sang) * 35,
          alpha: 0,
          scale: 0.3,
          duration: 220,
          onComplete: () => spark.destroy()
        });
      }

      const dmg = Math.floor(RPGStats.getAtk() * 1.35) + Phaser.Math.Between(2, 6);
      CombatSystem.damageEnemiesInRadius(scene, tipX, tipY, 68, dmg, 36);

    } else {
      // --- COMBO HIT 3: 360° Starlight Blossom Cyclone (Finisher) ---
      SoundEngine.attackSpin();

      // Full 360-degree whirlwind spin
      scene.tweens.add({
        targets: scene.player,
        angle: scene.player.flipX ? -360 : 360,
        duration: 250,
        ease: 'Cubic.easeInOut',
        onComplete: () => scene.player.setAngle(0)
      });

      scene.cameras.main.shake(130, 0.009);

      // Expanding 360° Blossom Ring
      const ringGfx = scene.add.graphics().setDepth(2900);
      ringGfx.lineStyle(6, wfx.color, 0.95);
      ringGfx.strokeCircle(px, py, 26);
      ringGfx.lineStyle(2.5, wfx.glow, 1);
      ringGfx.strokeCircle(px, py, 22);

      scene.tweens.add({
        targets: ringGfx,
        scaleX: 3.8,
        scaleY: 3.8,
        alpha: 0,
        duration: 320,
        ease: 'Quad.easeOut',
        onComplete: () => ringGfx.destroy()
      });

      // 8-pointed mandala blossom burst
      for (let i = 0; i < 8; i++) {
        const rad = (i / 8) * Math.PI * 2;
        const spark = scene.add.text(px, py, wfx.sparks[i % wfx.sparks.length], { fontSize: '14px' })
          .setOrigin(0.5).setDepth(2950);
        scene.tweens.add({
          targets: spark,
          x: px + Math.cos(rad) * 98,
          y: py + Math.sin(rad) * 98,
          alpha: 0,
          scale: 0.45,
          duration: 320,
          ease: 'Sine.easeOut',
          onComplete: () => spark.destroy()
        });
      }

      const dmg = Math.floor(RPGStats.getAtk() * 1.9) + Phaser.Math.Between(6, 12);
      CombatSystem.damageEnemiesInRadius(scene, px, py, 118, dmg, 48);

      // Totoro Leaf Cyclone Synergy if Totoro is present and nearby
      if (DateState.totoroJoined && scene.totoro && Phaser.Math.Distance.Between(px, py, scene.totoro.x, scene.totoro.y) < 180) {
        CombatSystem.triggerTotoroLeafSynergy(scene);
      }
    }
  }

  /* Totoro Leaf Cyclone Assist: Synced with Combo Finisher */
  static triggerTotoroLeafSynergy(scene: any) {
    SoundEngine.teaClink();
    scene.totoroBusyUntil = scene.time.now + 380;
    scene.tweens.add({
      targets: scene.totoro,
      angle: scene.totoro.flipX ? -22 : 22,
      duration: 110,
      yoyo: true,
      onComplete: () => scene.totoro.setAngle(0)
    });

    const leaf = scene.add.text(scene.totoro.x, scene.totoro.y - 25, '🍃', { fontSize: '18px' })
      .setOrigin(0.5).setDepth(2900);
    const targetX = scene.totoro.x + scene.facingVec.x * 145;
    const targetY = scene.totoro.y + scene.facingVec.y * 145;

    scene.tweens.add({
      targets: leaf,
      x: targetX,
      y: targetY,
      angle: 360,
      scale: 1.5,
      duration: 280,
      ease: 'Quad.easeOut',
      onComplete: () => {
        leaf.destroy();
        CombatSystem.damageEnemiesInRadius(scene, targetX, targetY, 60, Math.floor(RPGStats.getAtk() * 0.8) + 4, 25);
      }
    });
  }

  /* Companion Special Ability: Totoro's Spirit Shockwave Roar (Q or Mobile Roar) */
  static performTotoroRoar(scene: any) {
    if (UI.isOpen() || scene.cutsceneLocked) return;
    if (!DateState.totoroJoined || !scene.totoro) {
      UI.showToast('🐾', 'Partner Needed', 'Meet Totoro at Curzon Hall to unlock companion abilities!');
      return;
    }
    const now = scene.time.now;
    if (now - (scene.lastSkillTime || 0) < 1800) return;
    if (DateState.sp < 14) {
      UI.showToast('💧', 'Low Spirit!', 'Sip TSC Malai Cha or wait for SP to regenerate.');
      return;
    }
    scene.lastSkillTime = now;
    DateState.sp -= 14;
    UI.updateRPGStats();

    scene.totoroBusyUntil = now + 650;
    SoundEngine.totoroRoar();
    scene.cameras.main.shake(180, 0.007);

    // Totoro squash, chest-puff and spirit leap
    scene.tweens.add({
      targets: scene.totoro,
      scaleX: 1.35,
      scaleY: 0.8,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        scene.tweens.add({
          targets: scene.totoro,
          y: scene.totoro.y - 18,
          scaleX: 1.1,
          scaleY: 1.25,
          duration: 150,
          yoyo: true,
          ease: 'Sine.easeOut'
        });
      }
    });

    // Expanding dual spirit shockwave rings
    const ring1 = scene.add.circle(scene.totoro.x, scene.totoro.y - 24, 24, 0x80ffdb, 0.55).setDepth(2800);
    scene.tweens.add({
      targets: ring1,
      radius: 185,
      alpha: 0,
      duration: 420,
      ease: 'Quad.easeOut',
      onComplete: () => ring1.destroy()
    });

    const ring2 = scene.add.circle(scene.totoro.x, scene.totoro.y - 24, 18, 0xfde047, 0.45).setDepth(2801);
    scene.tweens.add({
      targets: ring2,
      radius: 220,
      alpha: 0,
      duration: 500,
      ease: 'Sine.easeOut',
      onComplete: () => ring2.destroy()
    });

    // Swirl of spirit leaves & starlight particles
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const leaf = scene.add.text(scene.totoro.x, scene.totoro.y - 24, i % 2 === 0 ? '🍃' : '✨', { fontSize: '13px' }).setOrigin(0.5).setDepth(2850);
      scene.tweens.add({
        targets: leaf,
        x: scene.totoro.x + Math.cos(angle) * 125,
        y: scene.totoro.y - 24 + Math.sin(angle) * 125,
        alpha: 0,
        scale: 0.4,
        duration: 460,
        onComplete: () => leaf.destroy()
      });
    }

    // Heal & Swiftness Speed Boost for Moon Walker
    DateState.hp = Math.min(DateState.maxHp, DateState.hp + 16);
    DateState.sp = Math.min(DateState.maxSp, DateState.sp + 8);
    UI.updateRPGStats();
    CombatSystem.spawnDamageNumber(scene, scene.player.x, scene.player.y - 50, '+16 HP 💚', '#4ade80');
    scene.swiftnessUntil = now + 3500;

    // Deal heavy AoE magic spirit damage
    const roarDmg = Math.floor(RPGStats.getAtk() * 1.8) + 6;
    CombatSystem.damageEnemiesInRadius(scene, scene.totoro.x, scene.totoro.y, 185, roarDmg, 36);
  }

  /* Companion Special Ability: Totoro's Seismic Belly Slam / Ground Pound (R or Mobile Slam) */
  static performTotoroGroundSlam(scene: any) {
    if (UI.isOpen() || scene.cutsceneLocked) return;
    if (!DateState.totoroJoined || !scene.totoro) {
      UI.showToast('🐾', 'Partner Needed', 'Meet Totoro at Curzon Hall to unlock companion abilities!');
      return;
    }
    const now = scene.time.now;
    if (now - (scene.lastSlamTime || 0) < 2400) return;
    if (DateState.sp < 18) {
      UI.showToast('💧', 'Low Spirit!', 'Sip TSC Malai Cha or wait for SP to regenerate.');
      return;
    }
    scene.lastSlamTime = now;
    DateState.sp -= 18;
    UI.updateRPGStats();

    scene.totoroBusyUntil = now + 1000;

    // Pick leap target: nearest enemy within 240px, or 45px in player facing direction
    let targetX = scene.player.x + scene.facingVec.x * 45;
    let targetY = scene.player.y + scene.facingVec.y * 45;
    let closestDist = 9999;
    scene.enemies.forEach(en => {
      const d = Phaser.Math.Distance.Between(scene.totoro.x, scene.totoro.y, en.x, en.y);
      if (d < 240 && d < closestDist) {
        closestDist = d;
        targetX = en.x;
        targetY = en.y;
      }
    });

    targetX = Phaser.Math.Clamp(targetX, 60, (scene.currentMapW || 2400) - 60);
    targetY = Phaser.Math.Clamp(targetY, 60, (scene.currentMapH || 1800) - 60);

    // Drop landing reticle shadow on ground
    const shadow = scene.add.ellipse(targetX, targetY, 44, 20, 0x111827, 0.45).setDepth(targetY - 1);
    scene.tweens.add({
      targets: shadow,
      scaleX: 1.6,
      scaleY: 1.6,
      alpha: 0.75,
      duration: 380
    });

    // Totoro leaps high into the air with 360 somersault flip
    scene.tweens.add({
      targets: scene.totoro,
      x: targetX,
      y: targetY - 88,
      angle: 360,
      scaleX: 0.9,
      scaleY: 1.25,
      duration: 380,
      ease: 'Sine.easeOut',
      onComplete: () => {
        scene.totoro.setAngle(0);
        scene.totoro.setScale(1.4, 0.9); // Big belly bounce pose!

        // Slam down fast!
        scene.tweens.add({
          targets: scene.totoro,
          y: targetY,
          duration: 130,
          ease: 'Quad.easeIn',
          onComplete: () => {
            shadow.destroy();

            // Screen shake & heavy slam sound
            SoundEngine.totoroSlam();
            scene.cameras.main.shake(250, 0.015);

            // Squash & stretch on impact
            scene.tweens.add({
              targets: scene.totoro,
              scaleX: 1.55,
              scaleY: 0.65,
              duration: 80,
              yoyo: true,
              ease: 'Quad.easeOut',
              onComplete: () => {
                scene.totoro.setScale(1, 1);
              }
            });

            // Shockwave dust ring
            const dustRing = scene.add.circle(targetX, targetY, 20, 0xc2a67e, 0.6).setDepth(targetY - 1);
            scene.tweens.add({
              targets: dustRing,
              radius: 175,
              alpha: 0,
              duration: 420,
              ease: 'Quad.easeOut',
              onComplete: () => dustRing.destroy()
            });

            // Debris & dust puffs
            for (let i = 0; i < 10; i++) {
              const ang = (i / 10) * Math.PI * 2;
              const dist = Phaser.Math.Between(40, 110);
              const puff = scene.add.circle(
                targetX + Math.cos(ang) * 15,
                targetY + Math.sin(ang) * 10,
                Phaser.Math.Between(4, 7),
                i % 2 === 0 ? 0x854d0e : 0xd8c7a0,
                0.7
              ).setDepth(targetY + 2);
              scene.tweens.add({
                targets: puff,
                x: targetX + Math.cos(ang) * dist,
                y: targetY + Math.sin(ang) * (dist * 0.6) - 14,
                scale: 1.8,
                alpha: 0,
                duration: 380,
                onComplete: () => puff.destroy()
              });
            }

            // Deal crushing damage & stun all enemies in radius
            const slamDmg = Math.floor(RPGStats.getAtk() * 2.2) + Phaser.Math.Between(8, 15);
            CombatSystem.damageEnemiesInRadius(scene, targetX, targetY, 175, slamDmg, 45, true);
          }
        });
      }
    });
  }

  /* Backward compatibility for generic skill trigger */
  static performTotoroSkill(scene: any) {
    CombatSystem.performTotoroRoar(scene);
  }

  /* Spawns orbiting dizzy stars around stunned enemy */
  static spawnStunStars(scene: any, en: any) {
    for (let i = 0; i < 3; i++) {
      const star = scene.add.text(en.x, en.y - 45, '⭐', { fontSize: '13px' }).setOrigin(0.5).setDepth(en.y + 10);
      const angleOffset = (i / 3) * Math.PI * 2;
      const startTime = scene.time.now;
      const timer = scene.time.addEvent({
        delay: 30,
        repeat: 70,
        callback: () => {
          if (!en.sprite || !en.sprite.active || !en.stunnedUntil || scene.time.now > en.stunnedUntil) {
            star.destroy();
            timer.remove();
            return;
          }
          const elapsed = (scene.time.now - startTime) * 0.007;
          star.setPosition(en.x + Math.cos(elapsed + angleOffset) * 18, en.y - 46 + Math.sin(elapsed + angleOffset) * 7);
        }
      });
      scene.time.delayedCall(2200, () => {
        if (star && star.active) star.destroy();
      });
    }
  }

  static damageEnemiesInRadius(scene: any, cx: number, cy: number, radius: number, dmg: number, knockback = 26, isStun = false) {
    for (let i = scene.enemies.length - 1; i >= 0; i--) {
      const en = scene.enemies[i];
      const d = Phaser.Math.Distance.Between(cx, cy, en.x, en.y - 20);
      if (d <= radius) {
        en.hp -= dmg;
        SoundEngine.enemyHit();
        CombatSystem.spawnDamageNumber(scene, en.x, en.y - 50, `-${dmg}`, isStun ? '#f59e0b' : '#ffea79');

        if (isStun && !en.isBoss) {
          en.stunnedUntil = scene.time.now + 2200;
          CombatSystem.spawnDamageNumber(scene, en.x, en.y - 70, 'STUNNED! 💫', '#67e8f9');
          CombatSystem.spawnStunStars(scene, en);
        }

        const angle = Phaser.Math.Angle.Between(cx, cy, en.x, en.y);
        en.x = Phaser.Math.Clamp(en.x + Math.cos(angle) * knockback, 60, 2340);
        en.y = Phaser.Math.Clamp(en.y + Math.sin(angle) * knockback, 60, 1740);
        en.sprite.setPosition(en.x, en.y);
        if (en.label) {
          en.label.setPosition(en.x, en.y - (en.isBoss ? 114 : 54));
        }

        if (en.hp <= 0) {
          CombatSystem.handleEnemyDefeated(scene, en, i);
        } else {
          if (en.isBoss) {
            UI.setBossHUD(true, en.name, en.hp, en.maxHp);
          } else {
            en.label.setText(`${en.name} (${en.hp})`);
          }
        }
      }
    }
  }

  static handleEnemyDefeated(scene: any, en: any, idx?: any) {
    en.sprite.destroy();
    en.label.destroy();
    scene.enemies.splice(idx, 1);
    RPGStats.gainXP(en.xp);

    if (en.drop) {
      UI.giveItem(en.drop);
    }

    if (en.isBoss) {
      scene.activeBoss = null;
      UI.setBossHUD(false);
      if (!DateState.defeatedBosses.includes(en.id)) {
        DateState.defeatedBosses.push(en.id);
      }
      const wCfg = WORLDS_DB[DateState.currentWorld];
      if (wCfg && wCfg.nextWorld && !DateState.unlockedWorlds.includes(wCfg.nextWorld)) {
        DateState.unlockedWorlds.push(wCfg.nextWorld);
      }
      if (en.reward) {
        UI.giveItem(en.reward, `Defeated ${en.name} in ${wCfg.name}!`);
      }
      UI.updateQuestText();
      RPGStats.saveGame(this);

      if (en.id === 'boss_astral') {
        UI.startDialogue([
          { speaker: 'Totoro', portrait: '🐾', text: 'Moon Walker! We shattered the Chrono-Fracture Archon! The Six Realms and all our Dhaka Valley memories are safe forever!' },
          { speaker: 'Moon Walker', portrait: '🌙', text: 'From Curzon Hall to the stars of the Astral Realm... best adventure and best date in history!' }
        ], () => UI.showScrapbook());
      }
    }
  }

  static spawnDamageNumber(scene: any, x: number, y: number, text: any, color = '#ffffff') {
    const lbl = scene.add.text(x, y, text, {
      fontFamily: 'Press Start 2P', fontSize: '11px', color, stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(3100);
    scene.tweens.add({
      targets: lbl,
      y: y - 34,
      alpha: 0,
      duration: 650,
      onComplete: () => lbl.destroy()
    });
  }

/* Seven Dynamically Walking Citizens in Dhaka Valley (Including Bestie Anamika!) */

}
