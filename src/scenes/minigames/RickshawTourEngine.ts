// src/scenes/minigames/RickshawTourEngine.ts - Grand Dhaka Rickshaw Tour Simulation Engine
import { DateState } from '../../state/DateState';
import { RPGStats } from '../../state/RPGStats';
import { SoundEngine } from '../../audio/SoundEngine';
import { UIController as UI } from '../../ui/UIController';
import { ITEMS_DB } from '../../config/items.db';

export class RickshawTourEngine {
  /**
   * Interactive prompt check for starting the tour.
   */
  static interact(scene: any): void {
    if (!DateState.totoroJoined) {
      UI.startDialogue([{ speaker: 'Moon Walker', portrait: '🌙', text: 'I should get Totoro from Curzon Hall before taking the Grand Dhaka Rickshaw Tour!' }]);
      return;
    }
    SoundEngine.rickshawBell();
    UI.startDialogue([
      { speaker: 'Totoro', portrait: '🐾', text: 'Tring-Tring! Ready for our Grand Hood-Down Rickshaw Tour across Dhaka? We will cruise past Fuller Road Fountain, TSC, Aparajeyo Bangla, and down to Dhanmondi Lake!' },
      { speaker: 'Totoro', portrait: '🐾', text: 'Dhaka traffic is full of surprises: goats, cats and cows will wander onto the road. Ring the bell with SPACE (or tap the screen) when they are close to clear a path. Perfect timing earns bonus points!' }
    ], () => this.startTour(scene));
  }

  /**
   * Initializes and launches the animated tour.
   */
  static startTour(scene: any): void {
    const rs = scene.rickshawSprite;
    if (!rs || !rs.active || !scene.player || !scene.totoro) return;
    scene.cutsceneLocked = true;
    const home = { x: rs.x, y: rs.y };
    const legs = [
      { x: 1060, y: 820,  msg: 'Cruising past Fuller Road Fountain... Dhaka traffic is the best excuse to sit a little closer.' },
      { x: 480,  y: 820,  msg: 'Turning up the University avenue under the Krishnachura canopy...' },
      { x: 480,  y: 320,  msg: 'Passing TSC and Aparajeyo Bangla! Hear the acoustic guitars in the evening air?' },
      { x: 1520, y: 320,  msg: 'Gliding past Nilkhet and Ramna toward the eastern promenade...' },
      { x: 1520, y: 1295, msg: 'Arrived at Dhanmondi Lake Pier! Look at the telescope and lanterns waiting on the water.' }
    ];
    let totalLen = 0, cx = home.x, cy = home.y;
    legs.forEach(l => { totalLen += Math.hypot(l.x - cx, l.y - cy); cx = l.x; cy = l.y; });

    const entry = scene.interactables.find((i: any) => i.sprite === rs);
    if (entry && entry.badge) entry.badge.setVisible(false);
    const ov = scene.ambientOverlay;

    const R: any = scene.rickTour = {
      active: true, x: home.x, y: home.y, px: home.x, py: home.y, heading: 1, dir: { x: -1, y: 0 },
      speed: 0, t: 0, leg: null, legStart: 0, travelled: 0, totalLen,
      score: 0, combo: 0, bestCombo: 0, cleared: 0, perfects: 0, bonks: 0, photos: 0, total: 0,
      jolt: 0, bellReadyAt: 0, nextDust: 0, nextLine: 0, nextScan: 0,
      obstacles: [], waved: new Set(), entry,
      ambient: ov && ov.active ? { col: ov.fillColor, a: ov.fillAlpha } : null
    };

    R.over = scene.add.sprite(home.x, home.y, rs.texture.key).setOrigin(0.5, 1);
    if (R.over.setCrop) R.over.setCrop(0, Math.round(rs.height * 0.47), rs.width, Math.round(rs.height * 0.39));
    R.scoreTxt = scene.add.text(home.x, home.y, '', {
      fontFamily: "'Rajdhani', sans-serif", fontSize: '13px', fontStyle: 'bold', color: '#fff8eb', stroke: '#2b1d14', strokeThickness: 3.5
    }).setOrigin(0.5, 1).setDepth(3200);
    R.prompt = scene.add.text(home.x, home.y, '🔔 TRING!  SPACE / TAP', {
      fontFamily: "'Rajdhani', sans-serif", fontSize: '12px', fontStyle: 'bold', color: '#1a1008', backgroundColor: '#f7cb45', padding: { x: 8, y: 4 }
    }).setOrigin(0.5, 1).setDepth(3200).setVisible(false);

    scene.player.body.enable = false;
    R.bellFn = () => this.ringBell(scene);
    scene.input.keyboard.on('keydown-SPACE', R.bellFn);
    scene.input.keyboard.on('keydown-E', R.bellFn);
    scene.input.on('pointerdown', R.bellFn);

    scene.spawnDamageNumber(home.x, home.y - 130, '🔔 SPACE / TAP = bell!', '#ffe27a');
    SoundEngine.rickshawBell();

    const alive = () => scene.rickTour === R && R.active && rs.active;
    let idx = 0;
    const runLeg = () => {
      if (!alive()) return;
      if (idx >= legs.length) { this.finishTour(scene, R, home, legs[legs.length - 1]); return; }
      const wp = legs[idx++];
      const dx = wp.x - R.x, dy = wp.y - R.y, dist = Math.hypot(dx, dy) || 1;
      R.dir = { x: dx / dist, y: dy / dist };
      if (Math.abs(dx) > Math.abs(dy) * 0.5) R.heading = dx < 0 ? -1 : 1;
      R.obstacles = R.obstacles.filter((o: any) => !o.done);
      this.spawnObstacles(scene, R, dist);
      R.leg = wp; R.legStart = scene.time.now;
      SoundEngine.rickshawBell();
      scene.tweens.add({
        targets: R, x: wp.x, y: wp.y, duration: Math.round(dist / 250 * 1000), ease: 'Sine.easeInOut',
        onComplete: () => {
          if (!alive()) return;
          R.leg = null;
          this.stopMoment(scene, R);
          UI.startDialogue([{ speaker: 'Totoro (In the Rickshaw)', portrait: '🛺', text: wp.msg }], () => runLeg());
        }
      });
    };
    runLeg();
  }

  static spawnObstacles(scene: any, ROrLeg: any, maybeDist?: number): void {
    const R: any = scene.rickTour || ROrLeg;
    const dist = maybeDist ?? (ROrLeg && typeof ROrLeg.x === 'number' ? Math.hypot(ROrLeg.x - R.x, ROrLeg.y - R.y) : 600);
    const icons = ['🐐', '🐈', '🐄', '🐓', '🚲', '🐕'];
    (dist < 650 ? [0.55] : [0.4, 0.72]).forEach(f => {
      const ox = R.x + R.dir.x * dist * f, oy = R.y + R.dir.y * dist * f;
      const icon = icons[R.total % icons.length];
      R.total++;
      const sh = scene.add.ellipse(ox, oy - 2, 30, 10, 0x000000, 0.25).setDepth(oy - 1);
      const sp = scene.add.text(ox, oy, icon, { fontSize: '34px' }).setOrigin(0.5, 1).setDepth(oy).setScale(0);
      const mark = scene.add.text(ox, oy - 46, '❗', { fontSize: '20px' }).setOrigin(0.5, 1).setDepth(oy + 2).setVisible(false);
      scene.tweens.add({ targets: sp, scale: 1, duration: 260, ease: 'Back.easeOut' });
      R.obstacles.push({ sp, sh, mark, x: ox, y: oy, ahead: 9999, done: false });
    });
  }

  static ringBell(scene: any): void {
    const R: any = scene.rickTour;
    if (!R || !R.active || !R.leg || UI.isOpen()) return;
    const now = scene.time.now;
    if (now - R.legStart < 350 || now < R.bellReadyAt) return;
    R.bellReadyAt = now + 240;
    SoundEngine.rickshawBell();
    const ring = scene.add.circle(R.x, R.y - 70, 14, 0xf7cb45, 0).setStrokeStyle(3, 0xf7cb45, 0.9).setDepth(3150);
    scene.tweens.add({ targets: ring, scale: 4.5, alpha: 0, duration: 420, onComplete: () => ring.destroy() });
    scene.wanderers.forEach((w: any) => {
      if (w.sprite && w.sprite.active && Math.hypot(w.x - R.x, w.y - R.y) < 170) {
        scene.tweens.add({ targets: w.sprite, y: w.sprite.y - 9, duration: 120, yoyo: true });
      }
    });
    let target: any = null, best = 1e9;
    let nearby = false;
    R.obstacles.forEach((o: any) => {
      if (o.done) return;
      if (o.ahead < 330 && o.ahead > 0) nearby = true;
      if (o.ahead >= 40 && o.ahead <= 200 && o.ahead < best) { best = o.ahead; target = o; }
    });
    if (target) {
      this.clearObstacle(scene, R, target, target.ahead >= 80 && target.ahead <= 150);
    } else if (nearby) {
      R.combo = 0;
      R.bellReadyAt = now + 1000;
      scene.spawnDamageNumber(R.x, R.y - 104, 'Mistimed! 🔔', '#ffb3b3');
    }
  }

  static clearObstacle(scene: any, ROrO: any, oOrPerfect: any, maybePerfect?: boolean): void {
    const R: any = maybePerfect !== undefined ? ROrO : scene.rickTour;
    const o: any = maybePerfect !== undefined ? oOrPerfect : ROrO;
    const perfect: boolean = maybePerfect !== undefined ? maybePerfect : Boolean(oOrPerfect);
    o.done = true;
    if (o.mark) o.mark.destroy();
    const base = perfect ? 20 : 10;
    const gain = Math.round(base * (1 + Math.min(R.combo, 5) * 0.25));
    R.score += gain; R.combo++; R.cleared++;
    if (perfect) R.perfects++;
    R.bestCombo = Math.max(R.bestCombo, R.combo);
    const side = Math.random() < 0.5 ? -1 : 1, lx = -R.dir.y * side, ly = R.dir.x * side;
    scene.tweens.add({ targets: o.sp, x: o.x + lx * 80, y: o.y + ly * 80 - 14, angle: 360 * side, alpha: 0, duration: 520, ease: 'Quad.easeOut', onComplete: () => o.sp.destroy() });
    scene.tweens.add({ targets: o.sh, x: o.x + lx * 80, y: o.y + ly * 80, alpha: 0, duration: 520, ease: 'Quad.easeOut', onComplete: () => o.sh.destroy() });
    scene.spawnDamageNumber(R.x, R.y - 104, `${perfect ? 'PERFECT!' : 'NICE!'} +${gain}${R.combo >= 3 ? '  x' + R.combo : ''}`, perfect ? '#ffe27a' : '#9be7ff');
    if (perfect) {
      SoundEngine.heartUp();
      for (let i = 0; i < 4; i++) {
        const hx = R.x + (i - 1.5) * 20, h = scene.add.text(hx, R.y - 80, '💖', { fontSize: '16px' }).setOrigin(0.5).setDepth(3150);
        scene.tweens.add({ targets: h, y: h.y - 46 - i * 6, alpha: 0, duration: 750, delay: i * 60, onComplete: () => h.destroy() });
      }
    } else {
      SoundEngine.select();
    }
  }

  static bonk(scene: any, ROrO: any, maybeO?: any): void {
    const R: any = maybeO !== undefined ? ROrO : scene.rickTour;
    const o: any = maybeO !== undefined ? maybeO : ROrO;
    o.done = true;
    if (o.mark) o.mark.destroy();
    R.combo = 0; R.bonks++; R.jolt = 1;
    scene.cameras.main.shake(140, 0.005);
    SoundEngine.blip(150, 'square');
    const side = Math.random() < 0.5 ? -1 : 1, lx = -R.dir.y * side, ly = R.dir.x * side;
    scene.tweens.add({ targets: o.sp, x: o.x + lx * 110, y: o.y + ly * 110 - 30, angle: 720 * side, alpha: 0, duration: 600, ease: 'Quad.easeOut', onComplete: () => o.sp.destroy() });
    scene.tweens.add({ targets: o.sh, x: o.x + lx * 110, y: o.y + ly * 110, alpha: 0, duration: 600, ease: 'Quad.easeOut', onComplete: () => o.sh.destroy() });
    scene.spawnDamageNumber(R.x, R.y - 104, 'BONK! 😵', '#ff7b7b');
    const quips = ['Mind the goat!', 'Hold on tight!', 'Ouch, Dhaka traffic!', 'Tring sooner next time!'];
    scene.spawnDamageNumber(scene.totoro.x, scene.totoro.y - 100, quips[R.bonks % quips.length], '#ffffff');
  }

  static stopMoment(scene: any, ROrCaption?: any, maybeCaption?: string): void {
    const R: any = scene.rickTour || ROrCaption;
    const caption: string | undefined = typeof ROrCaption === 'string' ? ROrCaption : maybeCaption;
    scene.cameras.main.flash(200, 255, 244, 214);
    SoundEngine.cameraShutter();
    R.photos++;
    scene.spawnDamageNumber(R.x, R.y - 120, '📸 Snap!', '#ffffff');
    if (caption) {
      UI.showToast('🛺', 'Dhaka Postcard', caption);
    }
    R.obstacles.forEach((o: any) => {
      if (o.done) return;
      o.done = true;
      if (o.mark) o.mark.destroy();
      scene.tweens.add({ targets: [o.sp, o.sh], alpha: 0, duration: 200, onComplete: () => { o.sp.destroy(); o.sh.destroy(); } });
    });
  }

  static updateTour(scene: any, time: number, delta: number): void {
    this.update(scene, time, delta);
  }

  static update(scene: any, time: number, delta: number): void {
    const R: any = scene.rickTour, rs: any = scene.rickshawSprite;
    if (!R || !R.active || !rs || !rs.active || !R.over || !R.over.active) return;
    const dt = Math.min(delta, 50) / 1000;
    if (dt <= 0) return;
    R.t += dt;
    const moved = Math.hypot(R.x - R.px, R.y - R.py);
    R.px = R.x; R.py = R.y;
    R.travelled += moved;
    R.speed += (moved / dt - R.speed) * Math.min(1, dt * 8);
    const sn = Math.min(1, R.speed / 360);

    const h = R.heading, flip = h < 0;
    R.jolt = Math.max(0, R.jolt - dt * 2.8);
    const shx = (Math.random() - 0.5) * 6 * R.jolt, shy = (Math.random() - 0.5) * 4 * R.jolt;
    const bob = (Math.sin(R.t * 24) * 1.1 - Math.abs(Math.sin(R.t * 5.3)) * 1.8) * sn;
    const lean = -0.04 * h * sn + Math.sin(R.t * 2.6) * 0.008 + 0.09 * R.jolt * h;
    const cs = Math.cos(lean), sl = Math.sin(lean);
    const bx = R.x + shx, by = R.y + bob + shy;
    const rel = (rx: number, ry: number) => ({ x: bx + rx * h * cs - ry * sl, y: by + rx * h * sl + ry * cs });
    rs.setPosition(bx, by).setRotation(lean).setFlipX(flip).setDepth(by);
    R.over.setPosition(bx, by).setRotation(lean).setFlipX(flip).setDepth(by + 2);
    const ps = rel(-18, -20), ts = rel(4, -14);
    scene.player.setPosition(ps.x, ps.y).setDepth(by + 0.5).setFlipX(flip).setTexture('player-0');
    scene.totoro.setPosition(ts.x, ts.y).setDepth(by + 1).setFlipX(flip).setTexture(`totoro-${Math.floor(time / (R.speed > 30 ? 160 : 420)) % 2}`);
    if (scene.totoroBadge) scene.totoroBadge.setPosition(ts.x, ts.y - 80);

    if (R.speed > 70 && time > R.nextDust) {
      R.nextDust = time + 85;
      const w = rel(-21, 0);
      const puff = scene.add.circle(w.x, w.y - 2, 4 + Math.random() * 2, 0xd8c7a0, 0.5).setDepth(by - 1);
      scene.tweens.add({ targets: puff, x: puff.x - R.dir.x * 18, y: puff.y - R.dir.y * 18 - 8, scale: 2.4, alpha: 0, duration: 520, onComplete: () => puff.destroy() });
    }
    if (R.speed > 300 && time > R.nextLine) {
      R.nextLine = time + 70;
      const horiz = Math.abs(R.dir.x) > Math.abs(R.dir.y), off = (Math.random() - 0.5) * 70;
      const lx = bx - R.dir.x * 70 + (horiz ? 0 : off), ly = by - 30 - R.dir.y * 70 + (horiz ? off * 0.5 : 0);
      const ln = scene.add.rectangle(lx, ly, horiz ? 30 : 2, horiz ? 2 : 30, 0xffffff, 0.5).setDepth(by + 3);
      scene.tweens.add({ targets: ln, x: lx - R.dir.x * 40, y: ly - R.dir.y * 40, alpha: 0, duration: 260, onComplete: () => ln.destroy() });
    }

    let inWindow = false;
    R.obstacles.forEach((o: any) => {
      if (o.done) return;
      o.ahead = (o.x - R.x) * R.dir.x + (o.y - R.y) * R.dir.y;
      o.mark.setVisible(o.ahead < 330 && o.ahead > 0).setScale(1 + 0.15 * Math.sin(R.t * 12));
      if (o.ahead >= 40 && o.ahead <= 200) inWindow = true;
      if (R.leg && o.ahead < 22) this.bonk(scene, R, o);
    });
    R.prompt.setVisible(inWindow).setPosition(bx, by - 150).setScale(1 + 0.06 * Math.sin(R.t * 14));
    R.scoreTxt.setText(`★ ${R.score}${R.combo >= 2 ? '   COMBO x' + R.combo : ''}`).setPosition(bx, by - 128);

    if (time > R.nextScan) {
      R.nextScan = time + 250;
      const cheers = ['👋', '😄', '🎶', '📸', '😲'];
      scene.wanderers.forEach((w: any) => {
        if (!w.sprite || !w.sprite.active || R.waved.has(w) || Math.hypot(w.x - R.x, w.y - R.y) > 140) return;
        R.waved.add(w);
        const e = scene.add.text(w.x, w.y - 64, cheers[R.waved.size % cheers.length], { fontSize: '22px' }).setOrigin(0.5, 1).setDepth(3100);
        scene.tweens.add({ targets: e, y: e.y - 28, alpha: 0, duration: 900, onComplete: () => e.destroy() });
      });
    }

    if (R.ambient && scene.ambientOverlay && scene.ambientOverlay.active) {
      const lc = (c1: number, c2: number, t: number) => {
        const r = Math.round(((c1 >> 16) & 255) + (((c2 >> 16) & 255) - ((c1 >> 16) & 255)) * t);
        const g = Math.round(((c1 >> 8) & 255) + (((c2 >> 8) & 255) - ((c1 >> 8) & 255)) * t);
        const b = Math.round((c1 & 255) + ((c2 & 255) - (c1 & 255)) * t);
        return (r << 16) | (g << 8) | b;
      };
      const p = Math.min(1, R.travelled / R.totalLen);
      const t1 = Math.min(1, p / 0.6), t2 = Math.max(0, (p - 0.6) / 0.4);
      scene.ambientOverlay.setFillStyle(p < 0.6 ? lc(0xf7b050, 0xe0607a, t1) : lc(0xe0607a, 0x6a4a9a, t2), p < 0.6 ? 0.03 + 0.14 * t1 : 0.17 + 0.07 * t2);
    }
  }

  static finishTour(scene: any, R: any, home: { x: number; y: number }, lastStop: { x: number; y: number }): void {
    const rs = scene.rickshawSprite;
    R.active = false;
    scene.input.keyboard.off('keydown-SPACE', R.bellFn);
    scene.input.keyboard.off('keydown-E', R.bellFn);
    scene.input.off('pointerdown', R.bellFn);
    [R.over, R.scoreTxt, R.prompt].forEach((o: any) => { if (o && o.active) o.destroy(); });
    R.obstacles.forEach((o: any) => [o.sp, o.sh, o.mark].forEach((x: any) => { if (x && x.active) x.destroy(); }));
    if (R.entry && R.entry.badge && R.entry.badge.active) R.entry.badge.setVisible(true);
    if (R.ambient && scene.ambientOverlay && scene.ambientOverlay.active) scene.ambientOverlay.setFillStyle(R.ambient.col, R.ambient.a);

    SoundEngine.rickshawBell();
    rs.setPosition(home.x, home.y).setRotation(0).setFlipX(false).setDepth(home.y);
    scene.player.setFlipX(false).setPosition(lastStop.x, lastStop.y).setDepth(lastStop.y);
    scene.player.body.enable = true;
    scene.player.body.reset(lastStop.x, lastStop.y);
    scene.totoro.setFlipX(false).setPosition(lastStop.x - 38, lastStop.y).setDepth(lastStop.y);
    if (scene.totoroBadge) scene.totoroBadge.setPosition(scene.totoro.x, scene.totoro.y - 68);
    scene.trail = Array(16).fill({ x: scene.player.x, y: scene.player.y });
    scene.rickTour = null;
    scene.cutsceneLocked = false;

    if (!DateState.rickshawTourDone) {
      DateState.rickshawTourDone = true;
      DateState.memories.push({ emoji: '🛺', title: 'Grand Dhaka Rickshaw Tour', note: 'Cruised hood-down from Fuller Road to TSC and Dhanmondi Lake.' });
      scene.advanceDateProgress();
    }

    const ratio = R.total ? R.cleared / R.total : 0;
    const rank = (ratio >= 0.9 && R.bonks === 0 && R.perfects >= Math.ceil(R.total * 0.5)) ? { l: 'S', t: 'Dhaka Rickshaw Legend 🏆', item: 'doi', xp: 60 }
      : ratio >= 0.7 ? { l: 'A', t: 'Tring-Tring Pro 🔔', item: 'fuchka', xp: 40 }
      : ratio >= 0.45 ? { l: 'B', t: 'Street-Smart Rider 🛺', item: 'cha', xp: 25 }
      : { l: 'C', t: 'Cheerful Tourist 🌸', item: null, xp: 10 };
    const prevBest = DateState.rickshawBest || 0;
    let rewardLine: string;
    if (R.score > prevBest) {
      DateState.rickshawBest = R.score;
      RPGStats.gainXP(rank.xp);
      if (rank.item) UI.giveItem(rank.item);
      rewardLine = `New best score! +${rank.xp} XP${rank.item ? ' and a ' + ITEMS_DB[rank.item].name : ''}.`;
    } else {
      rewardLine = prevBest ? `Your best is ${prevBest}. Beat it to earn another treat!` : 'Ring the bell on your next ride to earn treats!';
    }
    UI.startDialogue([
      { speaker: 'Totoro', portrait: '🐾', text: `Tour report: ${R.cleared}/${R.total} road hazards cleared (${R.perfects} perfect bells), best combo x${R.bestCombo}, ${R.photos} photos snapped. Final score: ${R.score}!` },
      { speaker: 'Totoro', portrait: '🐾', text: `Rank ${rank.l}: ${rank.t}. ${rewardLine}` },
      { speaker: 'Totoro', portrait: '🐾', text: 'That rickshaw tour was magical. Look out onto the wooden pier to the right: my Brass Stargazing Telescope is set up right by the water!' }
    ]);
  }
}
