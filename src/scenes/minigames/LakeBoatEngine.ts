// src/scenes/minigames/LakeBoatEngine.ts - Dhanmondi Lake Rowboat Tour & Floating Lanterns Simulation
import { DateState } from '../../state/DateState';
import { SoundEngine } from '../../audio/SoundEngine';
import { UIController as UI } from '../../ui/UIController';

export class LakeBoatEngine {
  /**
   * Initializes the layered lantern rowboat sprite and associated light/reflection objects.
   */
  static createBoat(scene: any, x: number, y: number): Phaser.GameObjects.Sprite {
    const B: any = scene.lakeBoat = {
      x, y, homeX: x, homeY: y, heading: 1, touring: false,
      rowTarget: 0, rowAmt: 0, phase: 0, t: 0, nextRipple: 0, nextWake: 0, rollKick: 0
    };
    B.lanterns = [{ rx: -51, ry: -19 }, { rx: 63, ry: -19 }];
    B.shadow = scene.add.ellipse(x, y + 26, 150, 28, 0x07233a, 0.34).setDepth(3.4);
    B.ring = scene.add.ellipse(x, y + 24, 176, 58, 0xffffff, 0).setStrokeStyle(2, 0xcdeffa, 0.4).setDepth(3.5);
    B.refl = B.lanterns.map(() => scene.add.ellipse(x, y + 58, 14, 34, 0xffb347, 0.18).setBlendMode(Phaser.BlendModes.ADD).setDepth(3.6));
    B.oarFar = scene.add.sprite(x, y, 'prop-oar').setOrigin(0.17, 0.5).setDepth(4.2);
    scene.boatSprite = scene.add.sprite(x, y, 'prop-boat').setOrigin(0.5, 0.5).setDepth(4);
    B.front = scene.add.sprite(x, y, 'prop-boat-front').setOrigin(0.5, 0.5);
    B.oarNear = scene.add.sprite(x, y, 'prop-oar').setOrigin(0.17, 0.5);
    B.glows = B.lanterns.map(() => scene.add.circle(x, y, 30, 0xffb347, 0.28).setBlendMode(Phaser.BlendModes.ADD).setDepth(4.6));
    B.cores = B.lanterns.map(() => scene.add.circle(x, y, 8, 0xfff1b0, 0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(4.7));
    B.rope = scene.add.graphics().setDepth(4.1);
    this.updateBoat(scene, 0, 0);
    return scene.boatSprite;
  }

  static updateBoat(scene: any, time: number, delta: number): void {
    const B: any = scene.lakeBoat;
    if (!B || !scene.boatSprite || !scene.boatSprite.active) return;
    const dt = Math.min(delta, 50) / 1000, h = B.heading, flip = h < 0;
    B.t += dt;
    B.rowAmt += (B.rowTarget - B.rowAmt) * Math.min(1, dt * 4);
    B.phase += dt * (Math.PI * 2 / 1.5) * B.rowAmt;

    const bob = Math.sin(B.t * 1.7) * (B.touring ? 1.7 : 1.1);
    const roll = Math.sin(B.t * 1.25 + 0.6) * (B.touring ? 0.024 : 0.012) + B.rollKick;
    const cs = Math.cos(roll), sn = Math.sin(roll);
    const bx = B.x, by = B.y + bob;
    const rel = (rx: number, ry: number) => ({ x: bx + rx * h * cs - ry * sn, y: by + rx * h * sn + ry * cs });

    scene.boatSprite.setPosition(bx, by).setRotation(roll).setFlipX(flip);
    B.front.setPosition(bx, by).setRotation(roll).setFlipX(flip).setDepth(by + 26);
    B.shadow.setPosition(bx, B.y + 26);
    B.ring.setPosition(bx, B.y + 24).setScale(1 + Math.sin(B.t * 1.4) * 0.025, 1 + Math.sin(B.t * 1.4 + 1) * 0.04).setAlpha(0.7 + 0.3 * Math.sin(B.t * 2));

    B.lanterns.forEach((l: any, i: number) => {
      const p = rel(l.rx, l.ry);
      const fl = 0.27 + Math.sin(B.t * 9 + i * 2.1) * 0.05 + Math.sin(B.t * 23 + i) * 0.03;
      B.glows[i].setPosition(p.x, p.y).setAlpha(fl).setScale(1 + Math.sin(B.t * 7 + i) * 0.04);
      B.cores[i].setPosition(p.x, p.y).setAlpha(fl + 0.2);
      B.refl[i].setPosition(p.x + Math.sin(B.t * 2.2 + i) * 3, by + 58).setAlpha(0.12 + (fl - 0.2)).setScale(1 + Math.sin(B.t * 3 + i) * 0.15, 1);
    });

    const pFar = rel(-12, -21), pNear = rel(-12, 20);
    const s = Math.sin(B.phase), wet = Math.max(0, Math.min(1, -Math.cos(B.phase) * 1.4)), ra = B.rowAmt;
    let aFar = -100 + (30 * s + 10) * ra, aNear = 100 - (30 * s + 10) * ra;
    if (flip) { aFar = 180 - aFar; aNear = 180 - aNear; }
    const sy = 1 - (1 - (0.75 + 0.25 * wet)) * ra;
    B.oarFar.setPosition(pFar.x, pFar.y).setAngle(aFar).setScale(1, sy).setFlipY(flip).setDepth(4.2);
    B.oarNear.setPosition(pNear.x, pNear.y).setAngle(aNear).setScale(1, sy).setFlipY(flip).setDepth(by + 27);

    if (ra > 0.35 && wet > 0.55 && time > B.nextRipple) {
      B.nextRipple = time + 360;
      ([[pFar, aFar], [pNear, aNear]] as any[]).forEach(([p, a]: any[]) => {
        const r = Number(a) * Math.PI / 180;
        this.spawnWaterRipple(scene, Number((p as any).x) + Math.cos(r) * 52, Number((p as any).y) + Math.sin(r) * 52, 18, 0);
      });
    }
    if (B.touring && ra > 0.3 && time > B.nextWake) {
      B.nextWake = time + 170;
      const st = rel(-70, 26);
      this.spawnWaterRipple(scene, st.x, st.y, 26, -h * 26);
    }

    B.rope.clear();
    if (!B.touring) {
      const st = rel(-66, 12), x0 = 1934, y0 = 1346;
      const cx = (x0 + st.x) / 2, cy = Math.max(y0, st.y) + 8;
      B.rope.lineStyle(2, 0xd9c08a, 1).beginPath().moveTo(x0, y0);
      for (let k = 1; k <= 10; k++) {
        const t = k / 10, u = 1 - t;
        B.rope.lineTo(u * u * x0 + 2 * u * t * cx + t * t * st.x, u * u * y0 + 2 * u * t * cy + t * t * st.y);
      }
      B.rope.strokePath();
      B.rope.fillStyle(0x3a2210, 1).fillCircle(x0, y0, 2.6);
    }

    if (B.touring && scene.player && scene.totoro) {
      const ps = rel(-22, 24), ts = rel(24, 24);
      scene.player.setPosition(ps.x, ps.y).setDepth(ps.y).setFlipX(flip).setTexture('player-0');
      scene.totoro.setPosition(ts.x, ts.y).setDepth(ts.y).setFlipX(flip).setTexture(`totoro-${Math.floor(time / 450) % 2}`);
      if (scene.totoroBadge) scene.totoroBadge.setPosition(ts.x, ts.y - 66);
    }
  }

  static spawnWaterRipple(scene: any, x: number, y: number, w: number, driftX: number): void {
    const e = scene.add.ellipse(x, y, w, w * 0.38, 0xffffff, 0).setStrokeStyle(1.5, 0xe6f7ff, 0.6).setDepth(3.7);
    scene.tweens.add({ targets: e, scaleX: 2.6, scaleY: 2.6, alpha: 0, x: x + (driftX || 0), duration: 800, ease: 'Sine.easeOut', onComplete: () => e.destroy() });
  }

  static releaseSkyLanterns(scene: any, B: any): void {
    for (let i = 0; i < 7; i++) {
      scene.time.delayedCall(i * 330, () => {
        if (scene.lakeBoat !== B || !scene.boatSprite || !scene.boatSprite.active) return;
        const x = B.x + Phaser.Math.Between(-46, 46), y = B.y - 24 + Phaser.Math.Between(-8, 8);
        const lan = scene.add.sprite(x, y, 'prop-skylantern').setDepth(2500);
        const glow = scene.add.circle(x, y, 22, 0xffb347, 0.3).setBlendMode(Phaser.BlendModes.ADD).setDepth(2499);
        const dx = Phaser.Math.Between(-40, 60), dy = Phaser.Math.Between(190, 280);
        scene.tweens.add({ targets: [lan, glow], x: `+=${dx}`, y: `-=${dy}`, duration: 3800, ease: 'Sine.easeOut' });
        scene.tweens.add({ targets: [lan, glow], alpha: 0, delay: 2000, duration: 1800, onComplete: () => { lan.destroy(); glow.destroy(); } });
        this.spawnWaterRipple(scene, x, B.y + 30, 20, 0);
      });
    }
  }

  static runTour(scene: any, onDone: () => void): void {
    const B: any = scene.lakeBoat;
    if (!B || !scene.boatSprite || !scene.boatSprite.active) { onDone(); return; }
    const alive = () => scene.lakeBoat === B && scene.boatSprite && scene.boatSprite.active;
    scene.cutsceneLocked = true;
    SoundEngine.waterSplash();
    const origPX = scene.player.x, origPY = scene.player.y;
    B.touring = true; B.heading = 1; B.rowTarget = 1; B.x = B.homeX; B.y = B.homeY;

    const leg = (x: number, y: number, duration: number, ease: string, next: () => void) => {
      if (!alive()) return;
      scene.tweens.add({ targets: B, x, y, duration, ease, onComplete: () => { if (alive() && next) next(); } });
    };
    const finish = () => {
      B.touring = false; B.rowTarget = 0; B.heading = 1; B.x = B.homeX; B.y = B.homeY;
      SoundEngine.waterSplash();
      scene.player.setPosition(origPX, origPY).setFlipX(false);
      scene.totoro.setPosition(origPX - 38, origPY).setFlipX(false);
      if (scene.totoroBadge) scene.totoroBadge.setPosition(scene.totoro.x, scene.totoro.y - 66);
      scene.cutsceneLocked = false;
      onDone();
    };

    leg(2150, 1424, 2300, 'Sine.easeInOut', () => {
      leg(2262, 1512, 2000, 'Sine.easeInOut', () => {
        B.rowTarget = 0;
        this.releaseSkyLanterns(scene, B);
        UI.showToast('🏮', 'Lantern Release', 'Totoro lights a floating lantern for every place you visited together.');
        scene.tweens.add({
          targets: B, x: B.x + 14, y: B.y + 6, duration: 3200, ease: 'Sine.easeInOut',
          onComplete: () => {
            if (!alive()) return;
            B.heading = -1; B.rowTarget = 1; B.rollKick = 0.12;
            scene.tweens.add({ targets: B, rollKick: 0, duration: 900, ease: 'Sine.easeOut' });
            leg(2118, 1430, 2100, 'Sine.easeInOut', () => {
              leg(B.homeX, B.homeY, 1900, 'Sine.easeOut', finish);
            });
          }
        });
      });
    });
  }

  static interact(scene: any): void {
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Moon Walker', portrait: '🌙', text: 'The lake pier is glowing... I cannot wait to bring Totoro here!' }]);
      return;
    }

    UI.startDialogue([
      { speaker: 'Totoro', portrait: '🐾', text: 'Look at how the lanterns reflect across Dhanmondi Lake, Moon Walker. Shall we take this wooden rowboat out onto the water?' }
    ], () => {
      this.runTour(scene, () => {
        UI.startDialogue([
          {
            speaker: 'Totoro',
            portrait: '🐾',
            text: 'Slow ripples on the water, slower goodbyes. From Curzon Hall to TSC, putting Ahona and Apshora in their place, helping Ahona and Rakin reconcile, and stargazing on the pier...'
          },
          {
            speaker: 'Totoro',
            portrait: '🐾',
            text: 'The smog hides the stars over Dhaka, yet you are still the brightest thing in my entire sky. After all this... do you love me? 🥺',
            choices: [
              {
                label: 'Duh, 100% yes! 💖',
                nextNodes: [
                  { speaker: 'Totoro', portrait: '🐾', text: 'Then it is official: 0.0 km away, permanent resident in Moon Walker’s heart. And now, let us step through the East Fuller Road Portal to explore the Six Realms together!' }
                ]
              },
              {
                label: 'Yes, from Curzon Hall all the way to the Astral Realm 🌙',
                nextNodes: [
                  { speaker: 'Totoro', portrait: '🐾', text: 'Best date in Dhaka history. Come here: unlimited forehead kisses, cha dates, and realm adventures for life!' }
                ]
              }
            ]
          }
        ], () => {
          if (!DateState.confessionDone) {
            DateState.confessionDone = true;
            DateState.memories.push({ emoji: '⛵', title: 'Dhanmondi Lake Confession', note: 'Rowed under the lanterns and said 100% yes.' });
            scene.advanceDateProgress();
          }
          UI.showScrapbook();
        });
      });
    });
  }

  static interactPier(scene: any): void {
    this.interact(scene);
  }
}
