// src/systems/CombatSystem.ts - Overhauled Data-Driven Combat Engine for Totoro & Moon Walker
// Implements 3-hit combos, input buffering, parasol parry/guard, dash i-frames/perfect dodge,
// Totoro 4-pip Bond abilities, enemy poise/stagger, and readable telegraphed boss encounters.

import Phaser from 'phaser';
import { SoundEngine } from '../audio/SoundEngine';
import { DateState } from '../state/DateState';
import { RPGStats } from '../state/RPGStats';
import { WEAPON_FX } from '../config/items.db';
import { WORLDS_DB } from '../config/worlds.db';
import { UI } from '../ui/UIController';
import { ATTACKS_DB, AttackDef, TelegraphColor } from '../config/attacks.db';

export interface CombatEntity {
  isBoss: boolean;
  id?: string;
  name: string;
  baseTex: string;
  sprite: Phaser.GameObjects.Sprite;
  label?: Phaser.GameObjects.Text;
  poiseBar?: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  hp: number;
  maxHp: number;
  poise: number;
  maxPoise: number;
  atk: number;
  xp: number;
  drop?: string;
  reward?: string;
  speed: number;
  lastHitPlayer?: number;
  stunnedUntil?: number;
  staggeredUntil?: number;
  currentAttack?: AttackDef | null;
  attackPhase?: 'idle' | 'windup' | 'active' | 'recovery';
  phaseTimer?: number;
  telegraphGfx?: Phaser.GameObjects.Graphics;
  telegraphStartTime?: number;
  phase2Triggered?: boolean;
}

export class CombatSystem {
  private static inputBuffer: { action: 'attack' | 'dash' | 'parry'; time: number } | null = null;
  private static readonly INPUT_BUFFER_WINDOW_MS = 150;

  // =========================================================================
  // 1. PLAYER COMBAT: COMBOS, INPUT BUFFER & AIM ASSIST
  // =========================================================================

  /**
   * Perform player attack with 3-hit combo branching, input buffering, and soft aim assist
   */
  static performPlayerAttack(scene: any): void {
    if (UI.isOpen() || scene.cutsceneLocked || !scene.player) return;
    const now = scene.time.now;

    // If currently performing an attack, buffer the input
    if (scene.isAttacking) {
      if (scene.attackPhase === 'windup' || scene.attackPhase === 'active') {
        this.inputBuffer = { action: 'attack', time: now };
        return;
      }
      // In recovery: check if we can cancel into next combo step
      const currentAtk = scene.currentAttackDef as AttackDef;
      if (currentAtk && currentAtk.cancelInto && currentAtk.cancelInto.length > 0) {
        // Can cancel recovery into next attack
      } else {
        this.inputBuffer = { action: 'attack', time: now };
        return;
      }
    }

    // Determine combo step: reset if idle > 600ms
    if (now - (scene.lastAtkTime || 0) > 600) {
      scene.comboStep = 0;
    } else {
      scene.comboStep = ((scene.comboStep || 0) + 1) % 3;
    }
    scene.lastAtkTime = now;

    // Map combo step to AttackDef
    const attackIds = ['player_jab', 'player_slash', 'player_spin'];
    const atkDef = ATTACKS_DB[attackIds[scene.comboStep]] || ATTACKS_DB.player_jab;
    scene.currentAttackDef = atkDef;

    // Soft Aim Assist: steer slightly towards nearest enemy within 60px
    CombatSystem.applyAimAssist(scene, 60);

    // Execute attack with frame data
    CombatSystem.executePlayerAttackDef(scene, atkDef);
  }

  /**
   * Steer facingVec toward closest enemy within assistRadius
   */
  private static applyAimAssist(scene: any, assistRadius: number): void {
    if (!scene.enemies || scene.enemies.length === 0) return;
    const px = scene.player.x;
    const py = scene.player.y;

    let closestDist = assistRadius;
    let targetEnemy: any = null;

    for (const en of scene.enemies) {
      const d = Phaser.Math.Distance.Between(px, py, en.x, en.y);
      if (d < closestDist) {
        closestDist = d;
        targetEnemy = en;
      }
    }

    if (targetEnemy) {
      const dx = targetEnemy.x - px;
      const dy = targetEnemy.y - py;
      const mag = Math.hypot(dx, dy) || 1;
      // Blend 60% towards enemy for natural soft lock
      scene.facingVec.x = scene.facingVec.x * 0.4 + (dx / mag) * 0.6;
      scene.facingVec.y = scene.facingVec.y * 0.4 + (dy / mag) * 0.6;
      const finalMag = Math.hypot(scene.facingVec.x, scene.facingVec.y) || 1;
      scene.facingVec.x /= finalMag;
      scene.facingVec.y /= finalMag;
    }
  }

  /**
   * Execute player attack with windup, active hitbox, recovery, lunges, and audio/vfx
   */
  private static executePlayerAttackDef(scene: any, atk: AttackDef): void {
    scene.isAttacking = true;
    scene.attackPhase = 'windup';

    const weaponId = (DateState.equipped && DateState.equipped.weapon) || 'umbrella_blade';
    const wfx = WEAPON_FX[weaponId] || WEAPON_FX.umbrella_blade;
    const baseAngle = Math.atan2(scene.facingVec.y, scene.facingVec.x);
    const px = scene.player.x;
    const py = scene.player.y - 18;

    // Windup lunge
    const lungeDist = atk.id === 'player_jab' ? 10 : atk.id === 'player_slash' ? 14 : 0;
    if (lungeDist > 0) {
      scene.tweens.add({
        targets: scene.player,
        x: px + scene.facingVec.x * lungeDist,
        y: scene.player.y + scene.facingVec.y * lungeDist,
        duration: atk.windupMs,
        yoyo: true,
        ease: 'Quad.easeOut'
      });
    }

    // Play attack sound
    if (atk.sfx === 'slash') SoundEngine.attackSlash();
    else if (atk.sfx === 'thrust') SoundEngine.attackThrust();
    else if (atk.sfx === 'spin') SoundEngine.attackSpin();

    // Active phase timer
    scene.time.delayedCall(atk.windupMs, () => {
      if (!scene.player) return;
      scene.attackPhase = 'active';

      // Visual weapon FX
      if (atk.id === 'player_jab') {
        CombatSystem.renderJabFX(scene, px, py, baseAngle, wfx);
      } else if (atk.id === 'player_slash') {
        CombatSystem.renderSlashFX(scene, px, py, baseAngle, wfx);
      } else if (atk.id === 'player_spin') {
        CombatSystem.renderSpinFX(scene, px, py, wfx);
      }

      // Check damage in hitbox
      const hitCount = CombatSystem.checkPlayerHitbox(scene, atk);

      // Landed hits grant a small amount of bond (+0.1 pips)
      if (hitCount > 0) {
        RPGStats.addBond(0.1 * hitCount);
      }

      // If spin finisher (3rd hit), trigger Totoro assist tackle!
      if (atk.id === 'player_spin') {
        CombatSystem.triggerTotoroAssistTackle(scene);
      }

      // Recovery phase timer
      scene.time.delayedCall(atk.activeMs, () => {
        scene.attackPhase = 'recovery';

        // Check if buffer has next action
        scene.time.delayedCall(atk.recoveryMs * 0.6, () => {
          if (CombatSystem.inputBuffer && CombatSystem.inputBuffer.action === 'attack') {
            const buf = CombatSystem.inputBuffer;
            CombatSystem.inputBuffer = null;
            if (scene.time.now - buf.time < CombatSystem.INPUT_BUFFER_WINDOW_MS) {
              scene.isAttacking = false;
              CombatSystem.performPlayerAttack(scene);
              return;
            }
          }
        });

        scene.time.delayedCall(atk.recoveryMs, () => {
          scene.isAttacking = false;
          scene.attackPhase = 'idle';
        });
      });
    });
  }

  // =========================================================================
  // 2. PLAYER DEFENSE: PARASOL PARRY, GUARD & PERFECT DODGE
  // =========================================================================

  /**
   * Start Parasol Guard / Parry
   */
  static startGuard(scene: any): void {
    if (UI.isOpen() || scene.cutsceneLocked || !scene.player) return;
    DateState.isGuarding = true;
    DateState.parryActiveUntil = scene.time.now + 150; // 150ms perfect parry window

    // Visual golden parry aura
    const aura = scene.add.circle(scene.player.x, scene.player.y - 18, 32, 0xfacc15, 0.45).setDepth(scene.player.depth + 1);
    scene.tweens.add({
      targets: aura,
      scaleX: 1.4,
      scaleY: 1.4,
      alpha: 0,
      duration: 180,
      onComplete: () => aura.destroy()
    });

    SoundEngine.select();
  }

  /**
   * Stop Parasol Guard
   */
  static stopGuard(scene: any): void {
    DateState.isGuarding = false;
    DateState.parryActiveUntil = 0;
  }

  /**
   * Perform Player Dash with 200ms i-frames, 500ms cooldown, and perfect dodge
   */
  static performPlayerDash(scene: any): void {
    if (UI.isOpen() || scene.cutsceneLocked || !scene.player) return;
    const now = scene.time.now;

    // 500ms dash cooldown
    if (now < (DateState.dashCooldownUntil || 0)) return;
    if (DateState.sp < 15) {
      UI.showToast('💧', 'Low Spirit!', 'Need 15 SP to dash.');
      return;
    }

    DateState.sp -= 15;
    DateState.dashCooldownUntil = now + 500;
    scene.dashUntil = now + 200; // 200ms i-frames
    UI.updateRPGStats();

    // Dash cancels any attack recovery
    scene.isAttacking = false;
    scene.attackPhase = 'idle';

    SoundEngine.dashWhoosh();

    const dirX = scene.facingVec ? scene.facingVec.x : 0;
    const dirY = scene.facingVec ? scene.facingVec.y : 1;
    const mag = Math.hypot(dirX, dirY) || 1;
    const normX = dirX / mag;
    const normY = dirY / mag;

    const px = scene.player.x;
    const py = scene.player.y;

    // Ghost trail particles
    for (let i = 0; i < 3; i++) {
      scene.time.delayedCall(i * 50, () => {
        if (!scene.player) return;
        const ghost = scene.add.sprite(scene.player.x, scene.player.y, scene.player.texture.key)
          .setOrigin(0.5, 1)
          .setAlpha(0.6)
          .setDepth(scene.player.depth - 1)
          .setFlipX(scene.player.flipX)
          .setTint(0x80ffdb);
        scene.tweens.add({
          targets: ghost,
          alpha: 0,
          scaleX: 0.85,
          duration: 160,
          onComplete: () => ghost.destroy()
        });
      });
    }

    // Perfect Dodge Check: if dashing through an active enemy attack in the final 100ms of telegraph
    CombatSystem.checkPerfectDodge(scene, px, py);

    const dashDistance = 95;
    const targetX = px + normX * dashDistance;
    const targetY = py + normY * dashDistance;

    const mapW = (scene.physics && scene.physics.world && scene.physics.world.bounds && scene.physics.world.bounds.width) || 2400;
    const mapH = (scene.physics && scene.physics.world && scene.physics.world.bounds && scene.physics.world.bounds.height) || 1600;
    const clampedX = Phaser.Math.Clamp(targetX, 40, mapW - 40);
    const clampedY = Phaser.Math.Clamp(targetY, 60, mapH - 40);

    scene.tweens.add({
      targets: scene.player,
      x: clampedX,
      y: clampedY,
      duration: 160,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        if (scene.player && scene.player.body) {
          scene.player.body.reset(scene.player.x, scene.player.y);
        }
      }
    });
  }

  /**
   * Check if player executed a perfect dodge through an enemy telegraph
   */
  private static checkPerfectDodge(scene: any, px: number, py: number): void {
    if (!scene.enemies) return;
    const now = scene.time.now;

    for (const en of scene.enemies) {
      if (en.attackPhase === 'windup' && en.currentAttack && en.currentAttack.telegraph) {
        const d = Phaser.Math.Distance.Between(px, py, en.x, en.y);
        if (d < 110) {
          const elapsed = now - (en.telegraphStartTime || 0);
          const remaining = en.currentAttack.windupMs - elapsed;
          // Perfect dodge: within final 100ms of telegraph
          if (remaining <= 100 && remaining >= -20) {
            RPGStats.addBond(1.0); // +1 Bond Pip
            DateState.timeDilationUntil = now + 250; // 0.25s time dilation
            CombatSystem.spawnDamageNumber(scene, px, py - 60, 'PERFECT DODGE! 💨✨', '#38bdf8');
            SoundEngine.itemFanfare();
            break;
          }
        }
      }
    }
  }

  // =========================================================================
  // 3. TOTORO COMPANION: BOND-POWERED ASSIST SYSTEM
  // =========================================================================

  /**
   * Totoro Spirit Roar (Q, 1 Pip): AoE stun 2.2s in 140px, breaks shields, interrupts PURPLE attacks
   */
  static performTotoroRoar(scene: any): void {
    if (UI.isOpen() || scene.cutsceneLocked) return;
    if (!DateState.totoroJoined || !scene.totoro) {
      UI.showToast('🐾', 'Partner Needed', 'Meet Totoro at Curzon Hall to unlock companion abilities!');
      return;
    }

    if (!RPGStats.spendBond(1.0)) {
      UI.showToast('🐾', 'Need 1 Bond Pip!', 'Land combo hits, parry attacks, or stay close to Totoro!');
      return;
    }

    const now = scene.time.now;
    scene.totoroBusyUntil = now + 650;
    SoundEngine.totoroRoar();
    scene.cameras.main.shake(200, 0.012);

    // Totoro squash, chest-puff and spirit leap
    scene.tweens.add({
      targets: scene.totoro,
      scaleX: 1.35,
      scaleY: 0.8,
      duration: 100,
      yoyo: true
    });

    // Expanding purple spirit roar ring
    const ring = scene.add.circle(scene.totoro.x, scene.totoro.y - 24, 24, 0xa855f7, 0.6).setDepth(2800);
    scene.tweens.add({
      targets: ring,
      radius: 140,
      alpha: 0,
      duration: 380,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy()
    });

    // Damage & Interrupt enemies in 140px
    const atk = ATTACKS_DB.totoro_roar;
    CombatSystem.damageEnemiesInRadius(scene, scene.totoro.x, scene.totoro.y, 140, atk, true);
  }

  /**
   * Totoro Seismic Belly Slam (E, 2 Pips): Ground-pound shockwave, heavy poise damage, creates safe stagger window
   */
  static performTotoroGroundSlam(scene: any): void {
    if (UI.isOpen() || scene.cutsceneLocked) return;
    if (!DateState.totoroJoined || !scene.totoro) {
      UI.showToast('🐾', 'Partner Needed', 'Meet Totoro at Curzon Hall to unlock companion abilities!');
      return;
    }

    if (!RPGStats.spendBond(2.0)) {
      UI.showToast('🐾', 'Need 2 Bond Pips!', 'Land combo hits or perfect parry to build Bond!');
      return;
    }

    const now = scene.time.now;
    scene.totoroBusyUntil = now + 900;

    // Pick leap target: nearest enemy within 240px, or 45px ahead
    let targetX = scene.player.x + scene.facingVec.x * 45;
    let targetY = scene.player.y + scene.facingVec.y * 45;
    let closestDist = 9999;
    scene.enemies.forEach((en: any) => {
      const d = Phaser.Math.Distance.Between(scene.totoro.x, scene.totoro.y, en.x, en.y);
      if (d < 240 && d < closestDist) {
        closestDist = d;
        targetX = en.x;
        targetY = en.y;
      }
    });

    // Drop landing reticle shadow
    const shadow = scene.add.ellipse(targetX, targetY, 44, 20, 0x111827, 0.45).setDepth(targetY - 1);
    scene.tweens.add({
      targets: shadow,
      scaleX: 1.6,
      scaleY: 1.6,
      alpha: 0.75,
      duration: 350
    });

    // High leap and heavy slam
    scene.tweens.add({
      targets: scene.totoro,
      x: targetX,
      y: targetY - 80,
      scaleX: 0.9,
      scaleY: 1.25,
      duration: 350,
      ease: 'Sine.easeOut',
      onComplete: () => {
        scene.tweens.add({
          targets: scene.totoro,
          y: targetY,
          duration: 120,
          ease: 'Quad.easeIn',
          onComplete: () => {
            shadow.destroy();
            SoundEngine.totoroSlam();
            scene.cameras.main.shake(250, 0.016);

            // Shockwave dust ring
            const dust = scene.add.circle(targetX, targetY, 20, 0xc2a67e, 0.65).setDepth(targetY - 1);
            scene.tweens.add({
              targets: dust,
              radius: 160,
              alpha: 0,
              duration: 400,
              ease: 'Quad.easeOut',
              onComplete: () => dust.destroy()
            });

            // Heavy poise damage + stagger
            const atk = ATTACKS_DB.totoro_slam;
            CombatSystem.damageEnemiesInRadius(scene, targetX, targetY, 160, atk, true);
          }
        });
      }
    });
  }

  /**
   * Totoro Leaf Gust / Swiftness (F, 1 Pip): +40% speed for 6s, clears ground hazards
   */
  static performTotoroLeafGust(scene: any): void {
    if (UI.isOpen() || scene.cutsceneLocked) return;
    if (!DateState.totoroJoined || !scene.totoro) return;

    if (!RPGStats.spendBond(1.0)) {
      UI.showToast('🐾', 'Need 1 Bond Pip!', 'Build Bond with Moon Walker to use Leaf Gust!');
      return;
    }

    const now = scene.time.now;
    scene.swiftnessUntil = now + 6000; // 6s speed boost
    SoundEngine.teaClink();

    // Leaf flurry forward
    for (let i = 0; i < 8; i++) {
      const leaf = scene.add.text(scene.totoro.x, scene.totoro.y - 20, '🍃', { fontSize: '16px' })
        .setOrigin(0.5).setDepth(2900);
      const angle = (i / 8) * Math.PI * 2;
      scene.tweens.add({
        targets: leaf,
        x: scene.totoro.x + Math.cos(angle) * 110,
        y: scene.totoro.y + Math.sin(angle) * 110,
        alpha: 0,
        scale: 1.4,
        duration: 350,
        onComplete: () => leaf.destroy()
      });
    }

    UI.showToast('🍃', 'Leaf Swiftness (+40% SPD)', 'Speed boosted for 6 seconds!');
  }

  /**
   * Totoro Combo Assist Tackle (Free, automatic on 3rd combo hit)
   */
  static triggerTotoroAssistTackle(scene: any): void {
    if (!DateState.totoroJoined || !scene.totoro) return;
    const d = Phaser.Math.Distance.Between(scene.player.x, scene.player.y, scene.totoro.x, scene.totoro.y);
    if (d > 220) return; // Must be reasonably close

    const targetX = scene.player.x + scene.facingVec.x * 55;
    const targetY = scene.player.y + scene.facingVec.y * 55;

    SoundEngine.dashWhoosh();
    scene.tweens.add({
      targets: scene.totoro,
      x: targetX,
      y: targetY,
      duration: 140,
      ease: 'Quad.easeOut',
      onComplete: () => {
        const atk = ATTACKS_DB.totoro_assist_tackle;
        CombatSystem.damageEnemiesInRadius(scene, targetX, targetY, 75, atk, false);
      }
    });
  }

  // =========================================================================
  // 4. HITBOX CHECK & DAMAGE APPLICATION WITH POISE / STAGGER
  // =========================================================================

  /**
   * Check player attack hitbox against active enemies
   */
  private static checkPlayerHitbox(scene: any, atk: AttackDef): number {
    if (!scene.enemies || scene.enemies.length === 0) return 0;
    let hitCount = 0;
    const px = scene.player.x;
    const py = scene.player.y - 18;

    for (let i = scene.enemies.length - 1; i >= 0; i--) {
      const en = scene.enemies[i] as CombatEntity;
      const d = Phaser.Math.Distance.Between(px, py, en.x, en.y - 20);

      let inHitbox = false;
      if (atk.hitbox.shape === 'circle') {
        inHitbox = d <= (atk.hitbox.radius || 80);
      } else if (atk.hitbox.shape === 'arc' || atk.hitbox.shape === 'cone') {
        if (d <= (atk.hitbox.radius || 60)) {
          const angleToEnemy = Math.atan2(en.y - py, en.x - px);
          const facingAngle = Math.atan2(scene.facingVec.y, scene.facingVec.x);
          let diff = Math.abs(angleToEnemy - facingAngle);
          while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
          const maxDiff = (Phaser.Math.DegToRad(atk.hitbox.angleDeg || 90)) / 2;
          inHitbox = diff <= maxDiff;
        }
      }

      if (inHitbox) {
        hitCount++;
        CombatSystem.applyDamageToEnemy(scene, en, i, atk);
      }
    }

    return hitCount;
  }

  /**
   * Apply damage, poise damage, stagger, hit-stop, and knockback to an enemy
   */
  static applyDamageToEnemy(scene: any, en: CombatEntity, idx: number, atk: AttackDef): void {
    const isStaggered = en.staggeredUntil && scene.time.now < en.staggeredUntil;
    const damageMult = isStaggered ? atk.damageMult * 1.5 : atk.damageMult;

    // Hyperbolic RPG damage formula
    const rawDmg = RPGStats.calculateDamage(RPGStats.getAtk(), 0, damageMult);
    en.hp = Math.max(0, en.hp - rawDmg);

    // Poise damage
    en.poise = Math.max(0, (en.poise || en.maxPoise) - atk.poiseDamage);

    SoundEngine.enemyHit();

    // Hit-stop effect (frame freeze feeling)
    if (atk.hitStopMs > 0) {
      en.sprite.setTint(0xffffff);
      scene.time.delayedCall(atk.hitStopMs, () => {
        if (en.sprite && en.sprite.active) en.sprite.clearTint();
      });
    }

    // Camera shake
    if (atk.shake) {
      scene.cameras.main.shake(atk.shake.duration, atk.shake.intensity);
    }

    // Knockback
    const angle = Phaser.Math.Angle.Between(scene.player.x, scene.player.y, en.x, en.y);
    en.x += Math.cos(angle) * (atk.knockback || 20);
    en.y += Math.sin(angle) * (atk.knockback || 20);
    en.sprite.setPosition(en.x, en.y);

    // Damage Number
    const labelColor = isStaggered ? '#f43f5e' : '#fde047';
    CombatSystem.spawnDamageNumber(scene, en.x, en.y - 50, `-${rawDmg}${isStaggered ? ' (1.5x CRIT!)' : ''}`, labelColor);

    // Check Poise Break / Stagger
    if (en.poise <= 0) {
      en.staggeredUntil = scene.time.now + 1500; // 1.5s stagger
      CombatSystem.spawnDamageNumber(scene, en.x, en.y - 70, 'STAGGERED! 💫', '#67e8f9');
      CombatSystem.spawnStunStars(scene, en);
      if (en.isBoss) {
        en.currentAttack = ATTACKS_DB.stag_dazed_stagger;
        en.attackPhase = 'windup';
        en.telegraphStartTime = scene.time.now;
        en.phaseTimer = scene.time.now + 1500;
        CombatSystem.createTelegraphDecal(scene, en, en.currentAttack.telegraph);
      }
    }

    // Check defeat
    if (en.hp <= 0) {
      CombatSystem.handleEnemyDefeated(scene, en, idx);
    } else {
      CombatSystem.updateEnemyHUD(scene, en);
    }
  }

  /**
   * Damage all enemies in an area
   */
  static damageEnemiesInRadius(scene: any, cx: number, cy: number, radius: number, atk: AttackDef, canInterrupt = false): void {
    if (!scene.enemies) return;
    for (let i = scene.enemies.length - 1; i >= 0; i--) {
      const en = scene.enemies[i] as CombatEntity;
      const d = Phaser.Math.Distance.Between(cx, cy, en.x, en.y - 20);
      if (d <= radius) {
        // Stun enemies if attack is totoro roar (2.2s AoE stun per §4)
        if (atk.id === 'totoro_roar') {
          en.stunnedUntil = scene.time.now + 2200;
          CombatSystem.spawnStunStars(scene, en);
        }
        // Interrupt purple attack tell
        if (canInterrupt && en.attackPhase === 'windup' && (en.currentAttack?.totoroInterrupt || en.currentAttack?.telegraph?.color === 'purple')) {
          CombatSystem.interruptEnemyAttack(scene, en);
        }
        CombatSystem.applyDamageToEnemy(scene, en, i, atk);
      }
    }
  }

  /**
   * Interrupt a PURPLE telegraphed attack
   */
  static interruptEnemyAttack(scene: any, en: CombatEntity): void {
    if (en.telegraphGfx) {
      en.telegraphGfx.clear();
      en.telegraphGfx.destroy();
      en.telegraphGfx = undefined;
    }
    en.attackPhase = 'idle';
    en.currentAttack = null;
    en.stunnedUntil = scene.time.now + 2200;
    en.staggeredUntil = scene.time.now + 1500;
    CombatSystem.spawnDamageNumber(scene, en.x, en.y - 75, 'INTERRUPTED! ⚡', '#c084fc');
    SoundEngine.totoroRoar();
  }

  // =========================================================================
  // 5. ENEMY & BOSS AI ENGINE: TELEGRAPHED READABLE ATTACKS
  // =========================================================================

  /**
   * Frame update for all active enemies and bosses
   */
  static updateEnemies(scene: any, time: number, delta: number): void {
    if (!scene.enemies || UI.isOpen() || scene.cutsceneLocked) return;

    const px = scene.player.x;
    const py = scene.player.y;

    // Passive Bond generation: +0.05 pips per second when standing close to Totoro (< 70px)
    if (DateState.totoroJoined && scene.totoro) {
      const distToTotoro = Phaser.Math.Distance.Between(px, py, scene.totoro.x, scene.totoro.y);
      if (distToTotoro < 70) {
        RPGStats.addBond(0.05 * (delta / 1000));
      }
    }

    scene.enemies.forEach((en: CombatEntity, idx: number) => {
      const dist = Phaser.Math.Distance.Between(px, py, en.x, en.y);
      const detectRange = en.isBoss ? 440 : 250;

      // Update Boss HUD with Poise Bar
      if (en.isBoss) {
        UI.setBossHUD(dist < 540, en.name, en.hp, en.maxHp, en.poise || 1, en.maxPoise || 1);
      }

      // 1. Staggered / Stunned state: frozen, cannot move or attack
      if (en.staggeredUntil && time < en.staggeredUntil) {
        en.sprite.setAngle(Math.sin(time * 0.02) * 8);
        const staggerAnim = `${en.baseTex}-stagger`;
        if (scene.anims.exists(staggerAnim) && (!en.sprite.anims.isPlaying || en.sprite.anims.currentAnim?.key !== staggerAnim)) {
          en.sprite.play(staggerAnim, true);
        }
        if (en.telegraphGfx && en.currentAttack && en.currentAttack.telegraph) {
          const elapsed = time - (en.telegraphStartTime || 0);
          const progress = Math.min(1.0, elapsed / 1500);
          CombatSystem.updateTelegraphFill(en.telegraphGfx, en.x, en.y, en.currentAttack.telegraph, progress);
        }
        return;
      } else if (en.staggeredUntil) {
        en.staggeredUntil = 0;
        en.poise = en.maxPoise; // Restore poise after stagger recovery
        en.sprite.setAngle(0);
        if (en.telegraphGfx) {
          en.telegraphGfx.clear();
          en.telegraphGfx.destroy();
          en.telegraphGfx = undefined;
        }
        en.currentAttack = null;
        en.attackPhase = 'idle';
        const walkAnim = scene.anims.exists(`${en.baseTex}-walk`) ? `${en.baseTex}-walk` : `anim-${en.baseTex}`;
        if (scene.anims.exists(walkAnim)) {
          en.sprite.play(walkAnim, true);
        }
      }

      // 2. Active Attack State Machine
      if (en.attackPhase && en.attackPhase !== 'idle') {
        CombatSystem.processEnemyAttackPhase(scene, en, time, px, py);
        return;
      }

      // 3. Movement & Attack Decision
      if (dist < detectRange && dist > 38) {
        // Chase player
        const dx = px - en.x;
        const dy = py - en.y;
        const step = (en.speed * delta) / 1000;
        en.x += (dx / dist) * step;
        en.y += (dy / dist) * step;
        en.sprite.setFlipX(dx < -1);

        const walkAnim = scene.anims.exists(`${en.baseTex}-walk`) ? `${en.baseTex}-walk` : `anim-${en.baseTex}`;
        if (scene.anims.exists(walkAnim) && (!en.sprite.anims.isPlaying || en.sprite.anims.currentAnim?.key !== walkAnim)) {
          en.sprite.play(walkAnim, true);
        }
      } else if (dist <= 65) {
        // In attack range: trigger telegraphed attack
        CombatSystem.triggerEnemyAttack(scene, en, time);
      } else if (!en.isBoss) {
        // Patrol orbit around home
        const patrolAng = time * 0.0012 + idx * 1.7;
        const tx = en.homeX + Math.cos(patrolAng) * 28;
        const ty = en.homeY + Math.sin(patrolAng) * 18;
        en.x += (tx - en.x) * 0.03;
        en.y += (ty - en.y) * 0.03;

        const walkAnim = scene.anims.exists(`${en.baseTex}-walk`) ? `${en.baseTex}-walk` : `anim-${en.baseTex}`;
        if (scene.anims.exists(walkAnim) && (!en.sprite.anims.isPlaying || en.sprite.anims.currentAnim?.key !== walkAnim)) {
          en.sprite.play(walkAnim, true);
        }
      }

      // Sprite depth and label positioning
      en.sprite.setPosition(en.x, en.y).setDepth(en.y);
      if (en.label) {
        en.label.setPosition(en.x, en.y - (en.isBoss ? 114 : 54)).setDepth(en.y + 5);
      }
    });
  }

  /**
   * Pick and initiate a telegraphed attack for an enemy or boss
   */
  private static triggerEnemyAttack(scene: any, en: CombatEntity, time: number): void {
    if (time - (en.lastHitPlayer || 0) < 1800) return;
    en.lastHitPlayer = time;

    let atk: AttackDef;

    if (en.isBoss) {
      // Sylvan Briar Stag Boss AI:
      // Phase 1 (> 50% HP): alternate between Antler Sweep (GOLD) and Trample (RED)
      // Phase 2 (<= 50% HP): trigger Nature Barrier Charge (PURPLE)!
      const hpPercent = en.hp / en.maxHp;
      if (hpPercent <= 0.5 && !en.phase2Triggered) {
        en.phase2Triggered = true;
        atk = ATTACKS_DB.stag_nature_barrier_charge;
        UI.showToast('⚠️', 'BOSS ENRAGED!', 'Sylvan Briar Stag is gathering thorny energy! Interrupt with Totoro Roar (Q)!');
      } else if (Math.random() > 0.5) {
        atk = ATTACKS_DB.stag_antler_sweep; // GOLD parryable
      } else {
        atk = ATTACKS_DB.stag_briar_trample; // RED dodge-only
      }
    } else {
      // Briar Bogling Mob AI: alternates between Spore Hop (GOLD) and Thorn Burst (RED)
      atk = Math.random() > 0.5 ? ATTACKS_DB.bogling_spore_hop : ATTACKS_DB.bogling_thorn_burst;
    }

    en.currentAttack = atk;
    en.attackPhase = 'windup';
    en.phaseTimer = time + atk.windupMs;
    en.telegraphStartTime = time;

    const attackAnim = `${en.baseTex}-attack`;
    if (scene.anims.exists(attackAnim)) {
      en.sprite.play(attackAnim, true);
    }

    // Create telegraph graphic decal
    if (atk.telegraph) {
      CombatSystem.createTelegraphDecal(scene, en, atk.telegraph);
    }
  }

  /**
   * Process active attack phases: windup -> active -> recovery
   */
  private static processEnemyAttackPhase(scene: any, en: CombatEntity, time: number, px: number, py: number): void {
    if (!en.currentAttack) return;
    const atk = en.currentAttack;

    // WINDUP: update telegraph fill
    if (en.attackPhase === 'windup') {
      if (en.telegraphGfx && atk.telegraph) {
        const elapsed = time - (en.telegraphStartTime || 0);
        const progress = Math.min(1.0, elapsed / atk.windupMs);
        CombatSystem.updateTelegraphFill(en.telegraphGfx, en.x, en.y, atk.telegraph, progress);
      }

      if (time >= (en.phaseTimer || 0)) {
        // Windup complete: destroy telegraph and transition to ACTIVE
        if (en.telegraphGfx) {
          en.telegraphGfx.clear();
          en.telegraphGfx.destroy();
          en.telegraphGfx = undefined;
        }

        en.attackPhase = 'active';
        en.phaseTimer = time + atk.activeMs;

        const attackAnim = `${en.baseTex}-attack`;
        if (scene.anims.exists(attackAnim)) {
          en.sprite.play(attackAnim, true);
        }

        // Check if attack strikes player
        CombatSystem.checkEnemyAttackHitOnPlayer(scene, en, atk, px, py);
      }
    } else if (en.attackPhase === 'active') {
      if (time >= (en.phaseTimer || 0)) {
        en.attackPhase = 'recovery';
        en.phaseTimer = time + atk.recoveryMs;
      }
    } else if (en.attackPhase === 'recovery') {
      if (time >= (en.phaseTimer || 0)) {
        en.attackPhase = 'idle';
        en.currentAttack = null;
        const idleAnim = scene.anims.exists(`${en.baseTex}-idle`) ? `${en.baseTex}-idle` : `anim-${en.baseTex}`;
        if (scene.anims.exists(idleAnim)) {
          en.sprite.play(idleAnim, true);
        }
      }
    }
  }

  /**
   * Check if enemy strike hits player, taking parry/guard/dash into account
   */
  private static checkEnemyAttackHitOnPlayer(scene: any, en: CombatEntity, atk: AttackDef, px: number, py: number): void {
    const d = Phaser.Math.Distance.Between(en.x, en.y, px, py);
    const radius = atk.hitbox.radius || (atk.hitbox.width ? atk.hitbox.width / 2 : 55);

    if (d <= radius) {
      const now = scene.time.now;

      // 1. Invulnerable during Dash
      if (scene.dashUntil && now < scene.dashUntil) {
        return;
      }

      // 2. Perfect Parry Check (within 150ms of guard start)
      if (DateState.isGuarding && now < (DateState.parryActiveUntil || 0) && atk.parryable) {
        // SUCCESSFUL PERFECT PARRY!
        SoundEngine.itemFanfare();
        SoundEngine.select();
        scene.cameras.main.shake(160, 0.012);

        // Stagger attacker for 1.2s and deal poise damage
        en.staggeredUntil = now + 1200;
        en.poise = Math.max(0, (en.poise || en.maxPoise) - 30);
        CombatSystem.spawnDamageNumber(scene, en.x, en.y - 70, 'PARRIED! 🛡️⚡', '#facc15');
        CombatSystem.spawnStunStars(scene, en);

        // Player reward: +10 SP, +1 Bond Pip
        DateState.sp = Math.min(DateState.maxSp, DateState.sp + 10);
        RPGStats.addBond(1.0);
        UI.updateRPGStats();
        return;
      }

      // 3. Regular Guard: blocks 70% damage (unless RED attack)
      let damageFactor = 1.0;
      if (DateState.isGuarding) {
        if (atk.dodgeOnly) {
          // RED attack penetrates guard!
          CombatSystem.spawnDamageNumber(scene, px, py - 40, 'GUARD BROKEN! 💥', '#ef4444');
        } else {
          damageFactor = 0.3; // Blocks 70% damage
          DateState.sp = Math.max(0, DateState.sp - 8);
          SoundEngine.select();
        }
      }

      // Calculate hyperbolic damage
      const rawDmg = Math.round(RPGStats.calculateDamage(en.atk, RPGStats.getDef(), atk.damageMult) * damageFactor);
      DateState.hp = Math.max(0, DateState.hp - rawDmg);
      SoundEngine.playerHurt();
      CombatSystem.spawnDamageNumber(scene, px, py - 54, `-${rawDmg}`, damageFactor < 1 ? '#60a5fa' : '#ff4d6d');
      UI.updateRPGStats();

      // Check player knockout -> Soft revival by Totoro
      if (DateState.hp <= 0) {
        CombatSystem.handlePlayerKnockout(scene);
      }
    }
  }

  /**
   * Handle soft retry on knockout
   */
  private static handlePlayerKnockout(scene: any): void {
    DateState.hp = DateState.maxHp;
    DateState.sp = DateState.maxSp;
    UI.updateRPGStats();
    const spawnPos = DateState.currentWorld === 'dhaka' ? { x: 480, y: 1380 } : { x: 340, y: 900 };
    scene.player.setPosition(spawnPos.x, spawnPos.y);
    if (scene.player.body) scene.player.body.reset(spawnPos.x, spawnPos.y);
    if (scene.totoro) scene.totoro.setPosition(spawnPos.x, spawnPos.y);
    UI.showToast('🐾', 'Totoro Rescued You!', 'Restored to full health at the realm entrance.');
  }

  // =========================================================================
  // 6. TELEGRAPH DECAL RENDERING ENGINE (GOLD, RED, PURPLE, BLUE)
  // =========================================================================

  private static createTelegraphDecal(scene: any, en: CombatEntity, tele: any): void {
    if (en.telegraphGfx) {
      en.telegraphGfx.clear();
      en.telegraphGfx.destroy();
    }
    en.telegraphGfx = scene.add.graphics().setDepth(en.y - 5);
  }

  private static updateTelegraphFill(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, tele: any, progress: number): void {
    gfx.clear();

    const colorHexMap: Record<TelegraphColor, number> = {
      gold: 0xfacc15,
      red: 0xef4444,
      purple: 0xa855f7,
      blue: 0x38bdf8
    };
    const col = colorHexMap[tele.color as TelegraphColor] || 0xffffff;

    // 1. Base Outline & Warning Background
    gfx.lineStyle(2.5, col, 0.85);
    gfx.fillStyle(col, 0.15);

    if (tele.shape === 'circle') {
      const r = tele.radius || 45;
      gfx.strokeCircle(cx, cy, r);
      gfx.fillCircle(cx, cy, r);
      // Sweep fill
      gfx.fillStyle(col, 0.45);
      gfx.fillCircle(cx, cy, r * progress);
    } else if (tele.shape === 'ring') {
      const r = tele.radius || 50;
      gfx.strokeCircle(cx, cy, r);
      gfx.lineStyle(4, col, 0.4 + progress * 0.5);
      gfx.strokeCircle(cx, cy, r * progress);
    } else if (tele.shape === 'line') {
      const w = tele.width || 160;
      const h = tele.height || 50;
      gfx.strokeRect(cx - w / 2, cy - h / 2, w, h);
      gfx.fillRect(cx - w / 2, cy - h / 2, w, h);
      // Progress sweep
      gfx.fillStyle(col, 0.5);
      gfx.fillRect(cx - w / 2, cy - h / 2, w * progress, h);
    } else if (tele.shape === 'cone') {
      const r = tele.radius || 80;
      gfx.strokeCircle(cx, cy, r);
      gfx.fillStyle(col, 0.4);
      gfx.fillCircle(cx, cy, r * progress);
    }
  }

  // =========================================================================
  // 7. VISUAL & AUDIO FEEDBACK HELPERS
  // =========================================================================

  private static renderJabFX(scene: any, px: number, py: number, baseAngle: number, wfx: any): void {
    const slashGfx = scene.add.graphics().setDepth(2900);
    slashGfx.lineStyle(5, wfx.color, 0.95);
    slashGfx.beginPath();
    slashGfx.arc(px, py, 46, baseAngle - 0.75, baseAngle + 0.75, false);
    slashGfx.strokePath();

    scene.tweens.add({
      targets: slashGfx,
      scaleX: 1.25,
      scaleY: 1.25,
      alpha: 0,
      duration: 150,
      onComplete: () => slashGfx.destroy()
    });
  }

  private static renderSlashFX(scene: any, px: number, py: number, baseAngle: number, wfx: any): void {
    const tipX = px + scene.facingVec.x * 68;
    const tipY = py + scene.facingVec.y * 68;
    const slashGfx = scene.add.graphics().setDepth(2900);
    slashGfx.lineStyle(6, wfx.color, 0.9);
    slashGfx.lineBetween(px, py, tipX, tipY);
    slashGfx.fillStyle(wfx.glow, 1);
    slashGfx.fillCircle(tipX, tipY, 6);

    scene.tweens.add({
      targets: slashGfx,
      alpha: 0,
      duration: 180,
      onComplete: () => slashGfx.destroy()
    });
  }

  private static renderSpinFX(scene: any, px: number, py: number, wfx: any): void {
    const ringGfx = scene.add.graphics().setDepth(2900);
    ringGfx.lineStyle(6, wfx.color, 0.95);
    ringGfx.strokeCircle(px, py, 26);

    scene.tweens.add({
      targets: ringGfx,
      scaleX: 3.5,
      scaleY: 3.5,
      alpha: 0,
      duration: 280,
      ease: 'Quad.easeOut',
      onComplete: () => ringGfx.destroy()
    });
  }

  static spawnStunStars(scene: any, en: CombatEntity): void {
    for (let i = 0; i < 3; i++) {
      const star = scene.add.text(en.x, en.y - 45, '⭐', { fontSize: '13px' }).setOrigin(0.5).setDepth(en.y + 10);
      const angleOffset = (i / 3) * Math.PI * 2;
      const startTime = scene.time.now;
      const timer = scene.time.addEvent({
        delay: 30,
        repeat: 50,
        callback: () => {
          if (!en.sprite || !en.sprite.active || !en.staggeredUntil || scene.time.now > en.staggeredUntil) {
            star.destroy();
            timer.remove();
            return;
          }
          const elapsed = (scene.time.now - startTime) * 0.007;
          star.setPosition(en.x + Math.cos(elapsed + angleOffset) * 18, en.y - 46 + Math.sin(elapsed + angleOffset) * 7);
        }
      });
    }
  }

  static spawnDamageNumber(scene: any, x: number, y: number, text: any, color = '#ffffff'): void {
    const lbl = scene.add.text(x, y, text, {
      fontFamily: 'Rajdhani', fontSize: '15px', fontStyle: 'bold', color, stroke: '#000000', strokeThickness: 3.5,
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 3, fill: true }
    }).setOrigin(0.5).setDepth(3100);
    scene.tweens.add({
      targets: lbl,
      y: y - 34,
      alpha: 0,
      duration: 650,
      onComplete: () => lbl.destroy()
    });
  }

  private static updateEnemyHUD(scene: any, en: CombatEntity): void {
    if (en.isBoss) {
      UI.setBossHUD(true, en.name, en.hp, en.maxHp, en.poise || 1, en.maxPoise || 1);
    } else if (en.label) {
      en.label.setText(`${en.name} (${en.hp}) [Poise: ${en.poise}]`);
    }
  }

  static handleEnemyDefeated(scene: any, en: CombatEntity, idx?: any): void {
    if (en.telegraphGfx) en.telegraphGfx.destroy();
    en.sprite.destroy();
    if (en.label) en.label.destroy();
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
      RPGStats.saveGame(scene);

      if (en.id === 'boss_astral') {
        UI.startDialogue([
          { speaker: 'Totoro', portrait: '🐾', text: 'Moon Walker! We shattered the Chrono-Fracture Archon! The Six Realms and all our Dhaka Valley memories are safe forever!' },
          { speaker: 'Moon Walker', portrait: '🌙', text: 'From Curzon Hall to the stars of the Astral Realm... best adventure and best date in history!' }
        ], () => UI.showScrapbook());
      }
    }
  }
}
