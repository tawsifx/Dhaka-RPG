declare const Phaser: any;
// src/systems/WeatherSystem.ts - Kalbaishakhi monsoon rain, puddles, thunder, fireflies, & wind gusts
import { SoundEngine } from '../audio/SoundEngine';
import { UI } from '../ui/UIController';

export class WeatherSystem {
  private isRaining = false;
  private monsoonTriggered = false;

  getIsRaining(): boolean {
    return this.isRaining;
  }

  triggerMonsoonEvent(scene: any): void {
    this.monsoonTriggered = true;
    this.isRaining = true;
    if (SoundEngine && SoundEngine.thunder) SoundEngine.thunder();
    if (scene.cameras && scene.cameras.main) {
      scene.cameras.main.flash(450, 230, 240, 255);
    }

    // Fade in puddles
    if (scene.puddles && scene.tweens) {
      scene.puddles.forEach((p: any) => scene.tweens.add({ targets: p, alpha: 0.85, duration: 2000 }));
    }
    if (scene.taroLeaf) scene.taroLeaf.setVisible(true);

    UI.showToast('⛈️', 'Kalbaishakhi Monsoon!', 'A sudden warm Dhaka shower sweeps over campus!');
    UI.startDialogue([
      { speaker: 'Totoro', portrait: '🐾', text: 'Whoa! The sky opened up! Classic Dhaka Kalbaishakhi rain! Here Moon Walker, huddle close under this giant taro leaf!' },
      { speaker: 'Moon Walker', portrait: '🌙', text: 'It smells just like wet red earth (shondha matir gondho)... Good thing you are wide enough to block all the rain drops, Totoro!' }
    ]);

    // Automatically clear the storm after 50 seconds
    if (scene.time) {
      scene.time.delayedCall(50000, () => {
        if (this.isRaining) {
          this.stopMonsoonEvent(scene);
          UI.showToast('⛅', 'Skies Clearing!', 'The monsoon clouds roll past Fuller Road.');
        }
      });
    }
  }

  stopMonsoonEvent(scene: any): void {
    this.isRaining = false;
    if (scene.taroLeaf) scene.taroLeaf.setVisible(false);
    if (scene.puddles && scene.tweens) {
      scene.puddles.forEach((p: any) => scene.tweens.add({ targets: p, alpha: 0, duration: 3000 }));
    }
    if (scene.rainGraphics) scene.rainGraphics.clear();
  }

  spawnPuddleSplash(scene: any, x: number, y: number): void {
    if (!scene || !scene.add) return;
    const ring = scene.add.circle(x, y + 10, 4, 0xffffff, 0.4).setDepth(20);
    if (scene.tweens) {
      scene.tweens.add({
        targets: ring,
        scaleX: 2.8,
        scaleY: 1.4,
        alpha: 0,
        duration: 380,
        onComplete: () => ring.destroy()
      });
    }
  }

  triggerPetalWindGust(scene: any): void {
    if (!scene || !scene.player || !scene.add || !scene.tweens) return;
    const px = scene.player.x;
    const py = scene.player.y;
    const count = 18;

    for (let i = 0; i < count; i++) {
      const offsetX = Phaser.Math.Between(-350, -100);
      const offsetY = Phaser.Math.Between(-250, 250);
      const petal = scene.add.circle(px + offsetX, py + offsetY, Phaser.Math.Between(2, 3), 0xff4d6d, 0.85).setDepth(1500);

      scene.tweens.add({
        targets: petal,
        x: petal.x + Phaser.Math.Between(400, 650),
        y: petal.y + Phaser.Math.Between(-80, 140),
        alpha: { from: 0.9, to: 0 },
        scaleX: { from: 1, to: 0.4 },
        duration: Phaser.Math.Between(1400, 2200),
        ease: 'Cubic.easeOut',
        onComplete: () => petal.destroy()
      });
    }
  }
}
