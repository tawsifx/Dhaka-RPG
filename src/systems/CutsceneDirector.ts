// src/systems/CutsceneDirector.ts - Cinematic Cutscene Choreography, Walk-Cycle Tweening & Expressive FX
import Phaser from 'phaser';
import { LeafWaterAnimator } from './LeafWaterAnimator';

export interface WalkCharacterOptions {
  badge?: Phaser.GameObjects.Text | null;
  badgeOffsetY?: number;
  interactObj?: { x: number; y: number } | null;
  endFacing?: 'down' | 'left' | 'right' | 'up';
  hopAmplitude?: number;
  spawnDust?: boolean;
  onComplete?: () => void;
}

export class CutsceneDirector {
  public static readonly DEFAULT_ZOOM = 1.22;

  /**
   * Displays top and bottom cinematic widescreen letterbox bars
   */
  public static showLetterbox(scene: any, barHeight = 44, duration = 420): void {
    this.hideLetterbox(scene, 0);
    const cam = scene.cameras.main;
    const w = cam.width * 2;
    const topBar = scene.add
      .rectangle(cam.width / 2, -barHeight, w, barHeight * 2, 0x090612, 0.92)
      .setScrollFactor(0)
      .setDepth(2940);
    const botBar = scene.add
      .rectangle(cam.width / 2, cam.height + barHeight, w, barHeight * 2, 0x090612, 0.92)
      .setScrollFactor(0)
      .setDepth(2940);

    scene.__letterboxBars = [topBar, botBar];
    scene.tweens.add({
      targets: topBar,
      y: 0,
      duration,
      ease: 'Cubic.easeOut'
    });
    scene.tweens.add({
      targets: botBar,
      y: cam.height,
      duration,
      ease: 'Cubic.easeOut'
    });
  }

  /**
   * Smoothly retracts and removes active letterbox bars
   */
  public static hideLetterbox(scene: any, duration = 380): void {
    const bars: Phaser.GameObjects.Rectangle[] | undefined = scene.__letterboxBars;
    if (!bars || bars.length === 0) return;
    scene.__letterboxBars = [];
    const cam = scene.cameras?.main;
    if (!cam || duration <= 0) {
      bars.forEach(b => {
        if (b && b.active) b.destroy();
      });
      return;
    }
    const [topBar, botBar] = bars;
    if (topBar && topBar.active) {
      scene.tweens.add({
        targets: topBar,
        y: -90,
        alpha: 0,
        duration,
        ease: 'Cubic.easeIn',
        onComplete: () => topBar.destroy()
      });
    }
    if (botBar && botBar.active) {
      scene.tweens.add({
        targets: botBar,
        y: cam.height + 90,
        alpha: 0,
        duration,
        ease: 'Cubic.easeIn',
        onComplete: () => botBar.destroy()
      });
    }
  }

  /**
   * Smoothly pans and zooms the camera to a focal point while locking cutscene controls
   */
  public static focusCamera(
    scene: any,
    x: number,
    y: number,
    zoom = 1.38,
    duration = 700,
    withLetterbox = true
  ): void {
    if (withLetterbox) {
      this.showLetterbox(scene, 42, Math.min(450, duration));
    }
    const cam = scene.cameras.main;
    cam.stopFollow();
    cam.pan(x, y, duration, 'Sine.easeInOut');
    cam.zoomTo(zoom, duration, 'Sine.easeInOut');
  }

  /**
   * Restores the camera to follow the player at the canonical 1.22 zoom and hides letterbox bars
   */
  public static restoreCamera(scene: any, duration = 600): void {
    this.hideLetterbox(scene, Math.min(420, duration));
    const cam = scene.cameras?.main;
    if (!cam) return;
    cam.zoomTo(this.DEFAULT_ZOOM, duration, 'Sine.easeInOut');
    if (scene.player) {
      cam.pan(scene.player.x, scene.player.y, duration, 'Sine.easeInOut', false, (_c: any, progress: number) => {
        if (progress === 1 && scene.player) {
          cam.startFollow(scene.player, true, 0.1, 0.1);
        }
      });
    }
  }

  /**
   * Moves a character sprite along a path to (targetX, targetY) while playing directional walk-cycle animations,
   * updating depth/badges every frame, and synchronizing with ScheduleSystem on arrival.
   */
  public static walkCharacterTo(
    scene: any,
    sprite: Phaser.GameObjects.Sprite | null | undefined,
    baseTex: string,
    targetX: number,
    targetY: number,
    duration: number,
    opts: WalkCharacterOptions = {}
  ): Phaser.Tweens.Tween | null {
    if (!sprite || !sprite.active) {
      if (opts.onComplete) opts.onComplete();
      return null;
    }

    const startX = sprite.x;
    const startY = sprite.y;
    const dx = targetX - startX;
    const dy = targetY - startY;

    let dir: 'down' | 'left' | 'right' | 'up' = 'down';
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx < 0 ? 'left' : 'right';
    } else if (Math.abs(dy) > 0.5) {
      dir = dy < 0 ? 'up' : 'down';
    }

    // Mark sprite as cutscene-animated so ScheduleSystem & DhakaValleyScene.update don't pause it
    (sprite as any).__cutsceneAnimActive = true;
    sprite.setFlipX(false);

    const walkKey = `${baseTex}-walk-${dir}`;
    const genericWalkKey = `${baseTex}-walk`;
    if (scene.anims.exists(walkKey)) {
      sprite.play(walkKey, true);
    } else if (scene.anims.exists(genericWalkKey)) {
      sprite.play(genericWalkKey, true);
    } else if (typeof scene.getOrCreateWalkAnim === 'function') {
      const fallback = scene.getOrCreateWalkAnim(baseTex, 6);
      if (fallback) sprite.play(fallback, true);
    }

    const badgeOffset = opts.badgeOffsetY ?? 70;
    const hopAmp = opts.hopAmplitude ?? 2.2;
    let lastDustTime = 0;

    return scene.tweens.add({
      targets: sprite,
      x: targetX,
      y: targetY,
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        if (!sprite.active) return;
        const p = tween.progress;
        // Subtle lively step cadence bounce
        const cadenceHop = Math.abs(Math.sin(p * Math.PI * Math.max(4, Math.round(duration / 140)))) * hopAmp;
        sprite.setDepth(sprite.y);
        sprite.setScale(1, 1 + cadenceHop * 0.015);

        if (opts.badge && opts.badge.active) {
          opts.badge.setPosition(sprite.x, sprite.y - badgeOffset - cadenceHop).setDepth(sprite.y + 5);
        }
        if (opts.interactObj) {
          opts.interactObj.x = sprite.x;
          opts.interactObj.y = sprite.y;
        }
        if (sprite === scene.player && scene.playerBadge) {
          scene.playerBadge.setPosition(sprite.x, sprite.y - 70).setDepth(sprite.y + 5);
        }
        if (sprite === scene.totoro && scene.totoroBadge) {
          scene.totoroBadge.setPosition(sprite.x, sprite.y - 54).setDepth(sprite.y + 5);
        }

        const now = scene.time?.now || 0;
        if (opts.spawnDust !== false && now - lastDustTime > 180) {
          lastDustTime = now;
          const dust = scene.add
            .circle(sprite.x + Phaser.Math.Between(-5, 5), sprite.y - 2, 2.2, 0xfef3c7, 0.45)
            .setDepth(Math.max(1, sprite.y - 1));
          scene.tweens.add({
            targets: dust,
            y: dust.y - 8,
            alpha: 0,
            scale: 1.5,
            duration: 280,
            onComplete: () => dust.destroy()
          });
        }
      },
      onComplete: () => {
        if (!sprite.active) {
          if (opts.onComplete) opts.onComplete();
          return;
        }
        (sprite as any).__cutsceneAnimActive = false;
        sprite.setScale(1, 1);
        const finalDir = opts.endFacing || dir;
        if (sprite.anims && sprite.anims.isPlaying) {
          sprite.anims.stop();
        }
        const idleAnim = `${baseTex}-idle-${finalDir}`;
        const dirIdx = finalDir === 'left' ? 1 : finalDir === 'right' ? 2 : finalDir === 'up' ? 3 : 0;
        const idleFrame = `${baseTex}-${dirIdx}`;
        if (scene.anims.exists(idleAnim)) {
          sprite.play(idleAnim);
        } else if (scene.textures.exists(idleFrame)) {
          sprite.setTexture(idleFrame);
        } else if (scene.textures.exists(`${baseTex}-0`)) {
          sprite.setTexture(`${baseTex}-0`);
        }

        if (opts.badge && opts.badge.active) {
          opts.badge.setPosition(targetX, targetY - badgeOffset).setDepth(targetY + 5);
        }
        if (opts.interactObj) {
          opts.interactObj.x = targetX;
          opts.interactObj.y = targetY;
        }
        if (scene.scheduleSystem && typeof scene.scheduleSystem.syncSpritePosition === 'function') {
          scene.scheduleSystem.syncSpritePosition(sprite, targetX, targetY, finalDir);
        }
        if (opts.onComplete) opts.onComplete();
      }
    });
  }

  /**
   * Pops an expressive floating emote bubble above a character with squash-and-stretch reaction
   */
  public static playEmoteReaction(
    scene: any,
    sprite: Phaser.GameObjects.Sprite | { x: number; y: number } | null | undefined,
    emoji: string,
    style: 'hop' | 'double-hop' | 'tremble' | 'pulse' = 'hop'
  ): void {
    if (!sprite) return;
    const x = sprite.x;
    const y = sprite.y;

    const bubble = scene.add
      .text(x, y - 62, emoji, {
        fontSize: '20px',
        padding: { x: 4, y: 2 }
      })
      .setOrigin(0.5, 1)
      .setScale(0.2)
      .setDepth(2850);

    scene.tweens.add({
      targets: bubble,
      scale: 1.15,
      y: y - 82,
      duration: 280,
      ease: 'Back.easeOut',
      onComplete: () => {
        scene.tweens.add({
          targets: bubble,
          y: y - 94,
          alpha: 0,
          delay: 480,
          duration: 340,
          ease: 'Sine.easeIn',
          onComplete: () => bubble.destroy()
        });
      }
    });

    const gameSp = sprite as Phaser.GameObjects.Sprite;
    if (typeof gameSp.setScale === 'function' && gameSp.active) {
      if (style === 'hop' || style === 'double-hop') {
        const baseY = gameSp.y;
        scene.tweens.add({
          targets: gameSp,
          y: baseY - 12,
          scaleX: 0.92,
          scaleY: 1.1,
          duration: 140,
          yoyo: true,
          repeat: style === 'double-hop' ? 1 : 0,
          ease: 'Quad.easeOut',
          onComplete: () => {
            if (gameSp.active) {
              gameSp.y = baseY;
              gameSp.setScale(1, 1);
            }
          }
        });
      } else if (style === 'tremble') {
        const baseX = gameSp.x;
        scene.tweens.add({
          targets: gameSp,
          x: { from: baseX - 3, to: baseX + 3 },
          duration: 55,
          yoyo: true,
          repeat: 5,
          onComplete: () => {
            if (gameSp.active) gameSp.x = baseX;
          }
        });
      } else if (style === 'pulse') {
        scene.tweens.add({
          targets: gameSp,
          scaleX: 1.12,
          scaleY: 1.12,
          duration: 180,
          yoyo: true,
          ease: 'Sine.easeInOut'
        });
      }
    }
  }

  /**
   * Spawns a radial burst of fluttering leaves & blossoms around a point (ideal for Totoro leaps, concerts, confessions)
   */
  public static spawnBlossomSwirl(
    scene: any,
    cx: number,
    cy: number,
    count = 14,
    radius = 68
  ): void {
    const leafKeys = LeafWaterAnimator.getLeafTexturesForWorld(scene, 'dhaka');
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const tex = leafKeys.length > 0 ? Phaser.Math.RND.pick(leafKeys) : null;
      const startR = Phaser.Math.Between(6, 18);
      const endR = radius + Phaser.Math.Between(-14, 26);

      const obj: any = tex
        ? scene.add.sprite(cx + Math.cos(angle) * startR, cy + Math.sin(angle) * startR, tex).setScale(0.95)
        : scene.add.circle(cx, cy, 3, 0xf43f5e, 0.9);
      obj.setDepth(2820);

      const dur = Phaser.Math.Between(700, 1150);
      scene.tweens.add({
        targets: obj,
        alpha: { from: 1, to: 0 },
        duration: dur,
        ease: 'Cubic.easeOut',
        onUpdate: (tween: Phaser.Tweens.Tween) => {
          const p = tween.progress;
          const curAngle = angle + p * 2.2;
          const curR = Phaser.Math.Linear(startR, endR, p);
          obj.x = cx + Math.cos(curAngle) * curR;
          obj.y = cy + Math.sin(curAngle) * curR * 0.75 - Math.sin(p * Math.PI) * 22;
          if (typeof obj.setAngle === 'function') {
            obj.setAngle(p * 260);
            obj.setScale(Math.cos(p * Math.PI * 3) * 0.95, 0.75 + 0.25 * Math.sin(p * Math.PI * 2));
          }
        },
        onComplete: () => obj.destroy()
      });
    }
  }

  /**
   * Spawns expanding concentric shockwave / acoustic rings (for Totoro's Spirit Roar, Heroic Leap, or Concert Chords)
   */
  public static spawnShockwaveRings(
    scene: any,
    cx: number,
    cy: number,
    color = 0x34d399,
    ringCount = 3,
    maxRadius = 110
  ): void {
    for (let i = 0; i < ringCount; i++) {
      scene.time.delayedCall(i * 130, () => {
        const ring = scene.add
          .circle(cx, cy, 10, color, 0)
          .setStrokeStyle(3 - i * 0.5, color, 0.88)
          .setDepth(2810);
        scene.tweens.add({
          targets: ring,
          radius: maxRadius + i * 18,
          scaleX: 1.35,
          scaleY: 0.95,
          alpha: 0,
          duration: 620 + i * 90,
          ease: 'Cubic.easeOut',
          onComplete: () => ring.destroy()
        });
      });
    }
  }
}
