// src/systems/player/PlayerBehaviors.ts - Dynamic Player Lifecycle, Idle Quirks, Weather & Companion Interactions
import Phaser from 'phaser';
import { DateState } from '../../state/DateState';
import { SoundEngine } from '../../audio/SoundEngine';

export type PlayerState = 'idle' | 'walking' | 'running' | 'farming' | 'resting' | 'emoting';

export class PlayerBehaviors {
  private scene: any;
  private idleTimeMs: number = 0;
  private lastBehaviorTime: number = 0;
  private activeEmote?: Phaser.GameObjects.Text;
  private parasolOverlay?: Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics;
  private state: PlayerState = 'idle';
  private stepParticleTimer: number = 0;
  private companionInteractionCooldown: number = 0;

  private get player(): Phaser.Physics.Arcade.Sprite {
    return this.scene.player;
  }

  constructor(scene: any) {
    this.scene = scene;
  }

  /**
   * Main update loop called every frame from DhakaValleyScene.update()
   */
  update(time: number, deltaMs: number, isMoving: boolean, facingDir: string): void {
    if (!this.player || !this.player.active) return;

    if (isMoving) {
      this.handleMovementEffects(time, deltaMs, facingDir);
    } else {
      this.handleIdleBehaviors(time, deltaMs, facingDir);
    }

    // Update active emote position if one exists
    if (this.activeEmote && this.activeEmote.active) {
      this.activeEmote.setPosition(this.player.x, this.player.y - this.player.height - 12);
    }

    // Weather reaction: parasol during rain
    this.updateRainParasol();
  }

  /**
   * Handle particle dust, footsteps, and movement trails while walking
   */
  private handleMovementEffects(time: number, deltaMs: number, facingDir: string): void {
    this.state = 'walking';
    this.idleTimeMs = 0;

    // Reset idle scale
    if (this.player.scaleY !== 1) {
      this.player.setScale(1, 1);
    }

    this.stepParticleTimer += deltaMs;
    if (this.stepParticleTimer > 240) {
      this.stepParticleTimer = 0;
      this.spawnFootstepParticle(facingDir);
    }
  }

  /**
   * Handle dynamic breathing, look-around, and ambient quirks while stationary
   */
  private handleIdleBehaviors(time: number, deltaMs: number, facingDir: string): void {
    this.idleTimeMs += deltaMs;

    // 1. Subtle rhythmic breathing cadence
    const breathCycle = Math.sin(time * 0.0035);
    const scaleY = 1 + breathCycle * 0.025; // 2.5% subtle vertical stretch
    this.player.setScale(1, scaleY);

    // 2. Companion Bonding: When standing near Totoro
    if (DateState.totoroJoined && this.scene.totoro && time > this.companionInteractionCooldown) {
      const distToTotoro = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        this.scene.totoro.x, this.scene.totoro.y
      );

      if (distToTotoro < 90 && this.idleTimeMs > 2500) {
        this.triggerCompanionBond(time);
        return;
      }
    }

    // 3. Ambient Idle Quirks: trigger every 5-8 seconds of standing still
    if (this.idleTimeMs > 3000 && time - this.lastBehaviorTime > 6000) {
      this.lastBehaviorTime = time;
      this.triggerRandomIdleQuirk(facingDir);
    }
  }

  /**
   * Spawns small dust puff or water ripple at player's feet
   */
  private spawnFootstepParticle(facingDir: string): void {
    const px = this.player.x;
    const py = this.player.y;
    const isRaining = this.scene.isRaining || false;

    if (isRaining) {
      // Small water splash ripple
      const ripple = this.scene.add.ellipse(px, py + 2, 8, 4, 0x88ccff, 0.45).setDepth(py - 2);
      this.scene.tweens.add({
        targets: ripple,
        scaleX: 2.2,
        scaleY: 2.2,
        alpha: 0,
        duration: 280,
        onComplete: () => ripple.destroy()
      });
    } else {
      // Warm campus stone/grass dust speck
      const offsetX = (Math.random() - 0.5) * 6;
      const dust = this.scene.add.circle(px + offsetX, py + 1, 2, 0xe8dfcf, 0.5).setDepth(py - 2);
      this.scene.tweens.add({
        targets: dust,
        y: py - 6,
        alpha: 0,
        duration: 320,
        ease: 'Sine.easeOut',
        onComplete: () => dust.destroy()
      });
    }
  }

  /**
   * Triggers a whimsical idle quirk (glance, melody humming, suspender adjustment)
   */
  private triggerRandomIdleQuirk(facingDir: string): void {
    const quirks = ['hum_melody', 'look_around', 'stretch', 'flower_thought', 'tea_craving'];
    const choice = quirks[Math.floor(Math.random() * quirks.length)];

    switch (choice) {
      case 'hum_melody':
        this.showEmote('♪', 2000);
        this.scene.tweens.add({
          targets: this.player,
          y: this.player.y - 3,
          duration: 160,
          yoyo: true,
          repeat: 1
        });
        break;

      case 'flower_thought':
        this.showEmote('🌸', 2200);
        break;

      case 'tea_craving':
        this.showEmote('☕', 2000);
        break;

      case 'stretch':
        this.showEmote('✨', 1800);
        this.scene.tweens.add({
          targets: this.player,
          scaleY: 1.06,
          scaleX: 0.96,
          duration: 300,
          yoyo: true
        });
        break;

      case 'look_around':
        // Quick glance left or right then return
        const tempKey = facingDir === 'left' ? 'player-idle-right' : 'player-idle-left';
        if (this.scene.anims.exists(tempKey)) {
          this.player.play(tempKey);
          this.scene.time.delayedCall(700, () => {
            const originalKey = `player-idle-${facingDir}`;
            if (this.state === 'idle' && this.scene.anims.exists(originalKey)) {
              this.player.play(originalKey);
            }
          });
        }
        break;
    }
  }

  /**
   * Companion bond interaction between Moon Walker and Totoro
   */
  private triggerCompanionBond(time: number): void {
    this.companionInteractionCooldown = time + 14000; // Cooldown 14s

    // Moon Walker waves / smiles at Totoro
    this.showEmote('♥', 2400);

    // Totoro reacts happily: bounces with joy and emits hearts
    if (this.scene.totoro) {
      const totoro = this.scene.totoro;
      this.scene.tweens.add({
        targets: totoro,
        y: totoro.y - 10,
        duration: 180,
        yoyo: true,
        repeat: 1,
        ease: 'Quad.easeOut',
        onComplete: () => {
          // Spawn little affection heart floating up from Totoro
          const heart = this.scene.add.text(totoro.x, totoro.y - totoro.height - 10, '💖', {
            fontSize: '14px'
          }).setOrigin(0.5, 1).setDepth(totoro.y + 20);

          this.scene.tweens.add({
            targets: heart,
            y: heart.y - 20,
            alpha: 0,
            duration: 1200,
            onComplete: () => heart.destroy()
          });
        }
      });
    }
  }

  /**
   * Displays floating retro speech bubble emote above Moon Walker
   */
  showEmote(emoji: string, durationMs: number = 2000): void {
    if (this.activeEmote && this.activeEmote.active) {
      this.activeEmote.destroy();
    }

    const emote = this.scene.add.text(
      this.player.x,
      this.player.y - this.player.height - 12,
      emoji,
      {
        fontSize: '13px',
        backgroundColor: 'rgba(26, 18, 12, 0.88)',
        padding: { x: 5, y: 3 },
        color: '#fff'
      }
    ).setOrigin(0.5, 1).setDepth(this.player.y + 20);

    this.activeEmote = emote;

    // Gentle pop-in and fade-out tween
    emote.setScale(0.5);
    this.scene.tweens.add({
      targets: emote,
      scaleX: 1,
      scaleY: 1,
      y: emote.y - 6,
      duration: 180,
      ease: 'Back.easeOut'
    });

    if (this.scene.time?.delayedCall) {
      this.scene.time.delayedCall(durationMs - 300, () => {
        if (emote.active) {
          this.scene.tweens.add({
            targets: emote,
            alpha: 0,
            y: emote.y - 10,
            duration: 300,
            onComplete: () => emote.destroy()
          });
        }
      });
    }
  }

  /**
   * Dynamic Parasol during rain: Moon Walker stays shielded from the rain
   */
  private updateRainParasol(): void {
    const isRaining = this.scene.isRaining || false;

    if (isRaining) {
      if (!this.parasolOverlay) {
        // Create protective amber-yellow parasol canopy above Moon Walker
        const g = this.scene.add.graphics().setDepth(this.player.y + 2);
        this.parasolOverlay = g;
      }

      if (this.parasolOverlay && (this.parasolOverlay as any).clear) {
        const g = this.parasolOverlay as Phaser.GameObjects.Graphics;
        g.clear();
        const px = this.player.x;
        const py = this.player.y - this.player.height + 4;
        g.setDepth(this.player.y + 2);

        // Draw cute golden-yellow parasol arch with white scallops
        g.fillStyle(0xf5a623, 0.95);
        g.beginPath();
        g.arc(px, py, 14, Math.PI, 0, false);
        g.closePath();
        g.fillPath();

        // Parasol handle
        g.lineStyle(2, 0x4a2e12, 1);
        g.lineBetween(px, py, px, py + 12);

        // Parasol tip
        g.fillStyle(0x4a2e12, 1);
        g.fillCircle(px, py - 14, 2);
      }
    } else {
      if (this.parasolOverlay) {
        this.parasolOverlay.destroy();
        this.parasolOverlay = undefined;
      }
    }
  }

  /**
   * Dynamic Farming Animation: Hoe Swing with dirt particles
   */
  triggerHoeAction(tileCol: number, tileRow: number): void {
    const targetX = tileCol * 32 + 16;
    const targetY = tileRow * 32 + 16;

    // Hoe impact sound & soil dust
    SoundEngine.step('path');
    this.scene.tweens.add({
      targets: this.player,
      y: this.player.y - 4,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        // Spawn soil dust burst
        for (let i = 0; i < 5; i++) {
          const p = this.scene.add.circle(
            targetX + (Math.random() - 0.5) * 16,
            targetY + (Math.random() - 0.5) * 16,
            2,
            0x5a3d28,
            0.8
          ).setDepth(targetY + 1);

          this.scene.tweens.add({
            targets: p,
            y: p.y - 12,
            alpha: 0,
            duration: 250,
            onComplete: () => p.destroy()
          });
        }
      }
    });
  }

  /**
   * Dynamic Farming Animation: Watering crops with arc droplets
   */
  triggerWaterAction(tileCol: number, tileRow: number): void {
    const targetX = tileCol * 32 + 16;
    const targetY = tileRow * 32 + 16;

    SoundEngine.waterSplash();

    // Spray water droplet particles
    for (let i = 0; i < 6; i++) {
      const drop = this.scene.add.circle(this.player.x, this.player.y - 12, 2, 0x4fc3f7, 0.9).setDepth(targetY + 5);
      const destX = targetX + (Math.random() - 0.5) * 14;
      const destY = targetY + (Math.random() - 0.5) * 14;

      this.scene.tweens.add({
        targets: drop,
        x: destX,
        y: destY,
        duration: 220 + i * 30,
        ease: 'Quad.easeIn',
        onComplete: () => {
          drop.destroy();
          // Small ground water ring
          const ring = this.scene.add.ellipse(destX, destY, 6, 3, 0x81d4fa, 0.6).setDepth(destY);
          this.scene.tweens.add({
            targets: ring,
            scaleX: 1.8,
            scaleY: 1.8,
            alpha: 0,
            duration: 200,
            onComplete: () => ring.destroy()
          });
        }
      });
    }
  }

  /**
   * Dynamic Harvesting Action: Crop item tossed in air and collected
   */
  triggerHarvestAction(cropName: string, tileCol: number, tileRow: number): void {
    const targetX = tileCol * 32 + 16;
    const targetY = tileRow * 32 + 16;

    SoundEngine.harvestCrop();
    this.showEmote('🧺', 1800);

    // Harvest sparkle burst
    for (let i = 0; i < 6; i++) {
      const spk = this.scene.add.text(
        targetX + (Math.random() - 0.5) * 16,
        targetY - 8 + (Math.random() - 0.5) * 12,
        '✨',
        { fontSize: '11px' }
      ).setDepth(targetY + 10);

      this.scene.tweens.add({
        targets: spk,
        y: spk.y - 24,
        alpha: 0,
        duration: 400 + i * 50,
        onComplete: () => spk.destroy()
      });
    }
  }

  destroy(): void {
    if (this.activeEmote && this.activeEmote.active) {
      this.activeEmote.destroy();
    }
    if (this.parasolOverlay && (this.parasolOverlay as any).destroy) {
      this.parasolOverlay.destroy();
    }
  }
}
