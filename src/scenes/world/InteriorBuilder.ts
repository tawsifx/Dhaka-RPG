// src/scenes/world/InteriorBuilder.ts - Curzon Hall & Green Meadows Farmhouse Architectural Builder
import { SoundEngine } from '../../audio/SoundEngine';
import { UIController as UI } from '../../ui/UIController';
import { DateState } from '../../state/DateState';
import {
  CURZON_INTERIOR_WIDTH,
  CURZON_INTERIOR_HEIGHT,
  FARMHOUSE_WIDTH,
  FARMHOUSE_HEIGHT,
  ARCADE_INTERIOR_WIDTH,
  ARCADE_INTERIOR_HEIGHT
} from '../../config/constants';
import { ArcadeSlotManager } from '../../systems/arcade/ArcadeSlotManager';
import { ArcadeCutscenes } from '../quests/ArcadeCutscenes';

export class InteriorBuilder {
  /**
   * Constructs Curzon Hall's grand Faculty of Science interior:
   * Bose Quantum Laboratory, Botanical Herbarium, Chemistry lab, and Central Mathematics Dais.
   */
  static buildCurzonInterior(scene: any, spawnPos?: { x: number; y: number }): void {
    if (scene.dhakaTilemap) {
      try {
        if (scene.dhakaTilemap.map) scene.dhakaTilemap.map.destroy();
      } catch (e) {}
      scene.dhakaTilemap = null;
    }
    scene.children.removeAll(true);
    if (scene.obstacles) scene.obstacles.clear(true, true);
    scene.interactables = [];
    scene.wanderers = [];
    scene.enemies = [];
    scene.lampGlows = [];
    scene.activeBoss = null;
    UI.setBossHUD(false);

    SoundEngine.setTheme('dhaka');
    const minLabel = document.getElementById('minimap-world-label');
    if (minLabel) minLabel.textContent = 'Curzon Hall: Faculty of Science';

    const MAP_W = CURZON_INTERIOR_WIDTH, MAP_H = CURZON_INTERIOR_HEIGHT;
    scene.currentMapW = MAP_W;
    scene.currentMapH = MAP_H;
    scene.physics.world.setBounds(0, 0, MAP_W, MAP_H);
    scene.obstacles = scene.physics.add.staticGroup();

    const blockRect = (x: number, y: number, w: number, h: number) => {
      const zone = scene.add.zone(x, y, w, h);
      scene.physics.add.existing(zone, true);
      scene.obstacles.add(zone);
    };

    const addLandmark = (x: number, y: number, tex: string, w: number, h: number) => {
      const sp = scene.add.sprite(x, y, tex).setOrigin(0.5, 1).setDepth(y);
      if (w && h) blockRect(x, y - h / 2, w, h);
      return sp;
    };

    const registerInteract = (x: number, y: number, tex: string | null, name: string, radius: number, onInteract: () => void) => {
      const sp = tex ? scene.add.sprite(x, y, tex).setOrigin(0.5, 1).setDepth(y) : null;
      if (sp && tex && tex.startsWith('npc-')) {
        scene.tweens.add({
          targets: sp,
          scaleY: { from: 1, to: 1.025 },
          duration: 1600 + Math.random() * 400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Math.random() * 500
        });
      }
      const badgeY = sp ? y - sp.height - 8 : y - 58;
      const badge = scene.add.text(x, badgeY, '💬 ' + name, {
        fontFamily: "'Rajdhani', 'Outfit', sans-serif",
        fontSize: '12px',
        fontStyle: 'bold',
        backgroundColor: 'rgba(30, 27, 75, 0.90)',
        color: '#e0e7ff',
        stroke: '#0f0b2e',
        strokeThickness: 3,
        shadow: { offsetX: 0, offsetY: 2, color: 'rgba(0, 0, 0, 0.65)', blur: 4, stroke: true, fill: true },
        padding: { x: 7, y: 3 }
      }).setOrigin(0.5, 1).setDepth(y + 10);
      const entry = { x, y, radius, sprite: sp, badge, name, onInteract };
      scene.interactables.push(entry);
      return entry;
    };

    // 1. Flooring: Polished Heritage Teak Parquet
    scene.add.tileSprite(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, 'tile-curzon-floor').setDepth(0);

    // 2. Velvet Runners
    scene.add.tileSprite(600, 530, 72, 540, 'tile-curzon-carpet').setDepth(1);
    scene.add.tileSprite(330, 500, 480, 56, 'tile-curzon-carpet').setDepth(1);
    scene.add.tileSprite(870, 500, 480, 56, 'tile-curzon-carpet').setDepth(1);
    scene.add.tileSprite(600, 240, 280, 64, 'tile-curzon-carpet').setDepth(1);

    // 3. Walls & Physics Colliders
    scene.add.tileSprite(600, 110, MAP_W, 64, 'tile-curzon-wall').setDepth(110);
    blockRect(600, 75, MAP_W, 90);
    scene.add.tileSprite(16, MAP_H / 2, 32, MAP_H, 'tile-curzon-wall').setDepth(MAP_H / 2);
    blockRect(16, MAP_H / 2, 32, MAP_H);
    scene.add.tileSprite(MAP_W - 16, MAP_H / 2, 32, MAP_H, 'tile-curzon-wall').setDepth(MAP_H / 2);
    blockRect(MAP_W - 16, MAP_H / 2, 32, MAP_H);
    scene.add.tileSprite(270, 868, 540, 64, 'tile-curzon-wall').setDepth(868);
    blockRect(270, 878, 540, 44);
    scene.add.tileSprite(930, 868, 540, 64, 'tile-curzon-wall').setDepth(868);
    blockRect(930, 878, 540, 44);
    blockRect(600, 895, 120, 20);

    scene.add.sprite(600, 864, 'prop-exit-door').setOrigin(0.5, 1).setDepth(864);
    registerInteract(600, 840, null, 'Exit to Curzon Lawn 🚪', 95, () => scene.exitCurzonHall());

    // 4. Central Dais: Auditorium & Mathematics
    scene.add.sprite(600, 95, 'prop-portrait-du').setOrigin(0.5, 1).setDepth(96);
    scene.add.sprite(600, 155, 'prop-blackboard-math').setOrigin(0.5, 1).setDepth(155);
    addLandmark(600, 230, 'prop-podium', 42, 24);
    addLandmark(600, 360, 'prop-chess-table', 52, 28);
    if (!scene.scheduleSystem) {
      registerInteract(645, 362, 'npc-prof-motahar-0', 'Prof. Motahar Hossain (Math & Chess Chair)', 92, () => scene.interactProfMotahar());
    }

    // 5. West Wing: Department of Physics & S.N. Bose Quantum Lab
    scene.add.sprite(180, 95, 'prop-portrait-bose').setOrigin(0.5, 1).setDepth(96);
    scene.add.sprite(320, 155, 'prop-blackboard-bose').setOrigin(0.5, 1).setDepth(155);
    addLandmark(72, 210, 'prop-curzon-bookshelf', 70, 28);
    addLandmark(72, 360, 'prop-curzon-bookshelf', 70, 28);
    addLandmark(72, 520, 'prop-curzon-bookshelf', 70, 28);
    addLandmark(260, 320, 'prop-labdesk', 90, 32);
    addLandmark(260, 480, 'prop-botany-table', 84, 30);
    if (!scene.scheduleSystem) {
      registerInteract(330, 322, 'npc-prof-satyendra-0', 'Prof. Satyendra (Physics Chair)', 92, () => scene.interactProfSatyendra());
      registerInteract(315, 482, 'npc-student-faiza-0', 'Faiza (Physics Undergrad)', 85, () => scene.interactFaizaStudent());
    }

    // 6. East Wing: Botany Herbarium & Chemistry Research Lab
    scene.add.sprite(880, 155, 'prop-blackboard-chem').setOrigin(0.5, 1).setDepth(155);
    addLandmark(1128, 210, 'prop-curzon-bookshelf', 70, 28);
    addLandmark(1128, 360, 'prop-curzon-bookshelf', 70, 28);
    addLandmark(1128, 520, 'prop-curzon-bookshelf', 70, 28);
    addLandmark(940, 320, 'prop-botany-table', 84, 30);
    addLandmark(940, 480, 'prop-labdesk', 90, 32);
    if (!scene.scheduleSystem) {
      registerInteract(875, 322, 'npc-prof-sultana-0', 'Prof. Sultana (Botany Chair)', 92, () => scene.interactProfSultana());
      registerInteract(875, 482, 'npc-dr-kabir-0', 'Dr. Kabir (Chemistry Master)', 92, () => scene.interactDrKabir());
      registerInteract(1010, 482, 'npc-student-tanvir-0', 'Tanvir (Biochemistry Student)', 85, () => scene.interactTanvirStudent());
    }

    // 7. Lighting & Chandeliers
    [
      [360, 250], [840, 250], [600, 440], [360, 620], [840, 620]
    ].forEach(([cx, cy]) => {
      scene.add.sprite(cx, cy, 'prop-curzon-chandelier').setOrigin(0.5, 1).setDepth(cy);
      const glow = scene.add.circle(cx, cy - 18, 70, 0xfde68a, 0.16).setDepth(cy + 1);
      scene.lampGlows.push(glow);
    });

    // 8. Potted Dhaka Ferns
    [
      [145, 680], [475, 680], [725, 680], [1055, 680], [475, 175], [725, 175]
    ].forEach(([fx, fy]) => {
      scene.add.sprite(fx, fy, 'prop-indoor-fern').setOrigin(0.5, 1).setDepth(fy);
    });

    // 9. Floating Golden Dust Motes / Sunlight Beams
    scene.petals = Array.from({ length: 22 }, () => ({
      obj: scene.add.circle(Phaser.Math.Between(70, MAP_W - 70), Phaser.Math.Between(140, MAP_H - 120), 2.5, 0xffe29a, 0.65).setDepth(2400),
      vx: Phaser.Math.FloatBetween(-5, 5),
      vy: Phaser.Math.FloatBetween(-3, -1),
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2)
    }));

    // 10. Architectural Labels
    const labelStyle = {
      fontFamily: 'Rajdhani',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#fff8eb',
      stroke: '#2b1d14',
      strokeThickness: 3.5,
      backgroundColor: 'rgba(28, 20, 16, 0.78)',
      padding: { x: 8, y: 3 },
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 3, fill: true }
    };
    scene.add.text(600, 48, '🏛️ CENTRAL AUDITORIUM & MATHEMATICS DAIS', labelStyle).setOrigin(0.5).setDepth(2000);
    scene.add.text(260, 48, '🔬 BOSE QUANTUM LABORATORY (PHYSICS)', labelStyle).setOrigin(0.5).setDepth(2000);
    scene.add.text(940, 48, '🌿 BOTANICAL HERBARIUM & CHEMISTRY LAB', labelStyle).setOrigin(0.5).setDepth(2000);

    // 11. Spawn Player & Totoro
    const pSpawn = spawnPos || { x: 600, y: 780 };
    scene.player = scene.physics.add.sprite(pSpawn.x, pSpawn.y, 'player-0').setOrigin(0.5, 1);
    const pBoxW = 20;
    const pBoxH = 14;
    scene.player.body.setSize(pBoxW, pBoxH).setOffset((scene.player.width - pBoxW) / 2, scene.player.height - pBoxH);
    scene.player.setCollideWorldBounds(true);
    scene.physics.add.collider(scene.player, scene.obstacles);

    const totoroPos = { x: pSpawn.x - 38, y: pSpawn.y };
    scene.totoro = scene.add.sprite(totoroPos.x, totoroPos.y, 'totoro-0').setOrigin(0.5, 1).setDepth(totoroPos.y);
    scene.totoroBadge = scene.add.text(totoroPos.x, totoroPos.y - 68, '♥ Totoro', {
      fontFamily: 'Rajdhani', fontSize: '13px', fontStyle: 'bold',
      backgroundColor: '#d45779', color: '#ffffff', padding: { x: 8, y: 3 },
      stroke: '#4a1525', strokeThickness: 2.5,
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true }
    }).setOrigin(0.5, 1).setDepth(2100);
    scene.trail = Array(16).fill({ x: scene.player.x, y: scene.player.y });

    scene.interactPrompt = scene.add.text(0, 0, 'SPACE / TAP: Interact', {
      fontFamily: 'Rajdhani', fontSize: '12px', fontStyle: 'bold',
      backgroundColor: 'rgba(253, 245, 230, 0.95)', color: '#2b1d14', padding: { x: 8, y: 3 },
      stroke: '#ffffff', strokeThickness: 1.5,
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true }
    }).setOrigin(0.5, 1).setDepth(3000).setVisible(false);

    scene.ambientOverlay = scene.add.rectangle(0, 0, MAP_W * 2, MAP_H * 2, 0x1a1438, 0)
      .setOrigin(0, 0).setDepth(2500);

    scene.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    scene.cameras.main.startFollow(scene.player, true, 0.1, 0.1);
    if (scene.scheduleSystem) {
      scene.scheduleSystem.initWorldNpcs('curzon_interior');
    }
    UI.updateQuestText();
  }

  /**
   * Constructs Green Meadows Farmhouse:
   * Loam lanes, barn, silo, duck pond, cow pasture, goat pen, chicken coop.
   */
  static buildFarmhouse(scene: any, spawnPos?: { x: number; y: number }): void {
    if (scene.dhakaTilemap) {
      try {
        if (scene.dhakaTilemap.map) scene.dhakaTilemap.map.destroy();
      } catch (e) {}
      scene.dhakaTilemap = null;
    }
    scene.children.removeAll(true);
    if (scene.obstacles) scene.obstacles.clear(true, true);
    scene.interactables = [];
    scene.wanderers = [];
    scene.enemies = [];
    scene.lampGlows = [];
    scene.activeBoss = null;
    UI.setBossHUD(false);

    SoundEngine.setTheme('dhaka');
    const minLabel = document.getElementById('minimap-world-label');
    if (minLabel) minLabel.textContent = 'Green Meadows Farmhouse 🏡';

    const MAP_W = FARMHOUSE_WIDTH, MAP_H = FARMHOUSE_HEIGHT;
    scene.currentMapW = MAP_W;
    scene.currentMapH = MAP_H;
    scene.physics.world.setBounds(0, 0, MAP_W, MAP_H);
    scene.obstacles = scene.physics.add.staticGroup();

    const blockRect = (x: number, y: number, w: number, h: number) => {
      const zone = scene.add.zone(x, y, w, h);
      scene.physics.add.existing(zone, true);
      scene.obstacles.add(zone);
    };

    const addLandmark = (x: number, y: number, tex: string, w: number, h: number) => {
      const sp = scene.add.sprite(x, y, tex).setOrigin(0.5, 1).setDepth(y);
      if (w && h) blockRect(x, y - h / 2, w, h);
      if (tex.includes('tree')) {
        scene.tweens.add({
          targets: sp,
          angle: { from: -1.2, to: 1.2 },
          duration: 2600 + Math.random() * 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      } else if (tex.includes('barn') || tex.includes('silo')) {
        scene.tweens.add({
          targets: sp,
          scaleY: { from: 1, to: 1.01 },
          duration: 3000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
      return sp;
    };

    const registerInteract = (x: number, y: number, tex: string | null, name: string, radius: number, onInteract: () => void) => {
      const sp = tex ? scene.add.sprite(x, y, tex).setOrigin(0.5, 1).setDepth(y) : null;
      if (sp && tex && tex.startsWith('npc-')) {
        if (tex.includes('chicken') || tex.includes('duck')) {
          scene.tweens.add({
            targets: sp,
            y: { from: y, to: y - 2.5 },
            scaleX: { from: 1, to: 1.06 },
            duration: 280,
            yoyo: true,
            repeat: -1,
            repeatDelay: 1400 + Math.random() * 1200,
            ease: 'Quad.easeOut'
          });
        } else if (tex.includes('cow') || tex.includes('goat')) {
          scene.tweens.add({
            targets: sp,
            scaleY: { from: 1, to: 1.03 },
            duration: 1800 + Math.random() * 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        } else {
          scene.tweens.add({
            targets: sp,
            scaleY: { from: 1, to: 1.025 },
            duration: 1600 + Math.random() * 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        }
      }
      const badgeY = sp ? y - sp.height - 8 : y - 58;
      const badge = scene.add.text(x, badgeY, '💬 ' + name, {
        fontFamily: 'Rajdhani', fontSize: '12px', fontStyle: 'bold',
        backgroundColor: 'rgba(21, 128, 61, 0.90)', color: '#fef3c7', padding: { x: 8, y: 3 },
        stroke: '#14532d', strokeThickness: 2.5,
        shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true }
      }).setOrigin(0.5, 1).setDepth(y + 10);
      const entry = { x, y, radius, sprite: sp, badge, name, onInteract };
      scene.interactables.push(entry);
      return entry;
    };

    scene.extraWaterSprites = [];

    // 1. Base Terrain: Lush Pasture Grass
    scene.add.tileSprite(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, 'tile-grass').setDepth(0);

    // 2. Rural Pathways
    scene.add.tileSprite(300, 390, 56, 160, 'tile-path-stepping').setDepth(1.0);
    scene.add.tileSprite(880, 390, 56, 160, 'tile-path-stepping').setDepth(1.0);
    scene.add.tileSprite(780, 570, 56, 180, 'tile-path-stepping').setDepth(1.0);

    scene.add.tileSprite(600, 480, 820, 68, 'tile-path').setDepth(1.1);
    scene.add.tileSprite(600, 446, 820, 12, 'tile-curb-h').setDepth(1.25);
    scene.add.tileSprite(600, 514, 820, 12, 'tile-curb-h').setDepth(1.25);
    scene.add.sprite(192, 480, 'path-cap-stone-w').setOrigin(1, 0.5).setDepth(1.3);
    scene.add.sprite(1008, 480, 'path-cap-stone-e').setOrigin(0, 0.5).setDepth(1.3);
    scene.add.sprite(144, 480, 'prop-stepping-trail-h').setOrigin(1, 0.5).setFlipX(true).setDepth(1.05);
    scene.add.sprite(1056, 480, 'prop-stepping-trail-h').setOrigin(0, 0.5).setDepth(1.05);

    scene.add.tileSprite(600, 530, 88, 560, 'tile-path-dirt').setDepth(1.15);
    scene.add.sprite(600, 252, 'path-cap-dirt-n').setOrigin(0.5, 1).setDepth(1.3);
    scene.add.sprite(600, 808, 'path-cap-dirt-s').setOrigin(0.5, 0).setDepth(1.3);

    scene.add.tileSprite(600, 240, 220, 68, 'tile-path-brick').setDepth(1.2);
    scene.add.sprite(600, 480, 'prop-plaza-medallion').setDepth(1.35);

    // 3. Duckling Pond
    const pondShallow = scene.add.tileSprite(940, 660, 272, 188, 'tile-water-shallow').setDepth(1.0);
    scene.lakeWater = scene.add.tileSprite(940, 660, 228, 144, 'tile-water').setDepth(1.1);
    scene.extraWaterSprites.push(pondShallow);

    scene.add.tileSprite(940, 564, 280, 20, 'tile-bank').setDepth(2.0);
    scene.add.tileSprite(940, 756, 280, 20, 'tile-bank').setDepth(2.0);
    scene.add.tileSprite(804, 660, 20, 196, 'tile-bank').setDepth(2.0);
    scene.add.tileSprite(1076, 660, 20, 196, 'tile-bank').setDepth(2.0);
    scene.add.tileSprite(822, 648, 42, 72, 'tile-ghat-steps-v').setDepth(2.2);
    scene.add.tileSprite(786, 648, 36, 64, 'tile-path-boardwalk').setDepth(2.1);

    [
      { x: 900, y: 625, tex: 'prop-lotus' },
      { x: 995, y: 685, tex: 'prop-lotus' },
      { x: 950, y: 710, tex: 'prop-lilypad' },
      { x: 865, y: 725, tex: 'prop-reeds' },
      { x: 1035, y: 605, tex: 'prop-reeds' }
    ].forEach((fl, idx) => {
      const sp = scene.add.sprite(fl.x, fl.y, fl.tex).setDepth(2.3);
      scene.tweens.add({
        targets: sp,
        y: fl.y + 1.8,
        duration: 1800 + idx * 300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    blockRect(940, 660, 248, 168);

    // 4. Pasture Fences
    scene.add.sprite(220, 360, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(360);
    scene.add.sprite(316, 360, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(360);
    scene.add.sprite(412, 360, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(360);
    blockRect(316, 350, 280, 20);

    scene.add.sprite(780, 360, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(360);
    scene.add.sprite(876, 360, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(360);
    scene.add.sprite(972, 360, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(360);
    blockRect(876, 350, 280, 20);

    scene.add.sprite(220, 620, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(620);
    scene.add.sprite(316, 620, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(620);
    blockRect(268, 610, 190, 20);

    // 5. Farmhouse Barn & Grain Silo
    addLandmark(600, 210, 'prop-farm-barn', 186, 68);
    addLandmark(460, 205, 'prop-farm-silo', 56, 44);

    // Hay Bales & Rural Props
    [
      [360, 220], [740, 220], [780, 215], [380, 680], [710, 680]
    ].forEach(([bx, by]) => {
      scene.add.circle(bx, by, 16, 0xfacc15).setDepth(by);
      scene.add.circle(bx, by - 4, 14, 0xfde047).setDepth(by + 1);
      blockRect(bx, by, 30, 24);
    });

    // 6. Farm Boundary & Shade Trees
    [
      [80, 120], [80, 380], [80, 680], [80, 840],
      [1120, 120], [1120, 380], [1120, 840],
      [320, 120], [880, 120]
    ].forEach(([tx, ty]) => addLandmark(tx, ty, 'prop-tree-krishna', 38, 24));

    scene.add.sprite(600, 850, 'prop-farm-arch').setOrigin(0.5, 1).setDepth(850);
    scene.add.sprite(456, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);
    scene.add.sprite(360, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);
    scene.add.sprite(264, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);
    scene.add.sprite(168, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);

    scene.add.sprite(744, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);
    scene.add.sprite(840, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);
    scene.add.sprite(936, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);
    scene.add.sprite(1032, 850, 'prop-farm-fence').setOrigin(0.5, 1).setDepth(850);

    blockRect(312, 842, 400, 16);
    blockRect(888, 842, 400, 16);
    blockRect(528, 845, 34, 18);
    blockRect(672, 845, 34, 18);

    scene.add.sprite(665, 810, 'prop-farm-sign').setOrigin(0.5, 1).setDepth(810);
    scene.add.sprite(520, 856, 'prop-sunflowers').setOrigin(0.5, 1).setDepth(856);
    scene.add.sprite(680, 856, 'prop-sunflowers').setOrigin(0.5, 1).setDepth(856);
    scene.add.sprite(475, 858, 'prop-farm-haybale').setOrigin(0.5, 1).setDepth(858);
    scene.add.sprite(725, 858, 'prop-farm-haybale').setOrigin(0.5, 1).setDepth(858);

    const farmGlowL = scene.add.circle(520, 798, 44, 0xfde68a, 0.25).setDepth(851);
    const farmGlowR = scene.add.circle(680, 798, 44, 0xfde68a, 0.25).setDepth(851);
    scene.lampGlows.push(farmGlowL, farmGlowR);

    scene.add.circle(600, 840, 22, 0xca8a04, 0.25).setDepth(839);
    scene.add.circle(600, 840, 12, 0xfef08a, 0.35).setDepth(839);

    registerInteract(600, 840, null, 'Return to Dhaka Valley 🚶', 95, () => scene.exitFarmhouse());

    if (!scene.scheduleSystem) {
      registerInteract(580, 340, 'npc-farmer-rafiq-0', 'Chacha Rafiq (Farm Owner)', 95, () => scene.interactFarmerRafiq());
      registerInteract(280, 260, 'npc-cow-0', 'Shuravi the Dairy Cow 🐄', 95, () => scene.interactCowShuravi());
      registerInteract(880, 260, 'npc-goat-0', 'Kalu the Bengal Goat 🐐', 90, () => scene.interactGoatKalu());
      registerInteract(260, 520, 'npc-chicken-0', 'Tuntuni the Hen 🐔', 85, () => scene.interactChickenTuntuni());
      registerInteract(820, 640, 'npc-duck-0', 'Piku the Duckling 🦆', 85, () => scene.interactDuckPiku());
    }

    scene.petals = Array.from({ length: 24 }, () => ({
      obj: scene.add.circle(Phaser.Math.Between(50, MAP_W - 50), Phaser.Math.Between(80, MAP_H - 80), 2.5, 0xfef08a, 0.7).setDepth(2400),
      vx: Phaser.Math.FloatBetween(-6, 6),
      vy: Phaser.Math.FloatBetween(-3, -1),
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2)
    }));

    const farmSignStyle = {
      fontFamily: 'Rajdhani',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#fff3b0',
      stroke: '#241409',
      strokeThickness: 3.5,
      backgroundColor: 'rgba(24, 16, 11, 0.82)',
      padding: { x: 8, y: 3 },
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 3, fill: true }
    };
    scene.add.text(600, 56, 'GREEN MEADOWS FARMHOUSE & BARN 🏡', farmSignStyle).setOrigin(0.5).setDepth(2000);
    scene.add.text(280, 160, 'DAIRY COW PASTURE 🐄', farmSignStyle).setOrigin(0.5).setDepth(2000);
    scene.add.text(880, 160, 'BENGAL GOAT PEN 🐐', farmSignStyle).setOrigin(0.5).setDepth(2000);
    scene.add.text(260, 440, 'CHICKEN COOP 🐔', farmSignStyle).setOrigin(0.5).setDepth(2000);
    scene.add.text(940, 525, 'DUCK POND & MEADOW 🦆', farmSignStyle).setOrigin(0.5).setDepth(2000);

    const pSpawn = spawnPos || { x: 600, y: 780 };
    scene.player = scene.physics.add.sprite(pSpawn.x, pSpawn.y, 'player-0').setOrigin(0.5, 1);
    const pBoxW = 20;
    const pBoxH = 14;
    scene.player.body.setSize(pBoxW, pBoxH).setOffset((scene.player.width - pBoxW) / 2, scene.player.height - pBoxH);
    scene.player.setCollideWorldBounds(true);
    scene.physics.add.collider(scene.player, scene.obstacles);

    const totoroPos = { x: pSpawn.x - 38, y: pSpawn.y };
    scene.totoro = scene.add.sprite(totoroPos.x, totoroPos.y, 'totoro-0').setOrigin(0.5, 1).setDepth(totoroPos.y);
    scene.totoroBadge = scene.add.text(totoroPos.x, totoroPos.y - 68, '♥ Totoro', {
      fontFamily: 'Rajdhani', fontSize: '13px', fontStyle: 'bold',
      backgroundColor: '#15803d', color: '#ffffff', padding: { x: 8, y: 3 },
      stroke: '#052e16', strokeThickness: 2.5,
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true }
    }).setOrigin(0.5, 1).setDepth(2100);
    scene.trail = Array(16).fill({ x: scene.player.x, y: scene.player.y });

    scene.interactPrompt = scene.add.text(0, 0, 'SPACE / TAP: Interact', {
      fontFamily: 'Rajdhani', fontSize: '12px', fontStyle: 'bold',
      backgroundColor: 'rgba(253, 245, 230, 0.95)', color: '#2b1d14', padding: { x: 8, y: 3 },
      stroke: '#ffffff', strokeThickness: 1.5,
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true }
    }).setOrigin(0.5, 1).setDepth(3000).setVisible(false);

    scene.ambientOverlay = scene.add.rectangle(0, 0, MAP_W * 2, MAP_H * 2, 0x1a1438, 0)
      .setOrigin(0, 0).setDepth(2500);

    scene.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    scene.cameras.main.setZoom(1.22);
    scene.cameras.main.startFollow(scene.player, true, 0.1, 0.1);
    if (scene.scheduleSystem) {
      scene.scheduleSystem.initWorldNpcs('farmhouse');
    }
    UI.updateQuestText();
  }

  /**
   * Constructs Dhaka Cyber Arcade Interior:
   * Modular 6-slot arcade cabinet engine, prize crane claw machine, vintage token dispenser,
   * Manager Shanto counter, and ambient neon lighting.
   */
  static buildArcadeInterior(scene: any, spawnPos?: { x: number; y: number }): void {
    if (scene.dhakaTilemap) {
      try {
        if (scene.dhakaTilemap.map) scene.dhakaTilemap.map.destroy();
      } catch (e) {}
      scene.dhakaTilemap = null;
    }
    scene.children.removeAll(true);
    if (scene.obstacles) scene.obstacles.clear(true, true);
    scene.interactables = [];
    scene.wanderers = [];
    scene.enemies = [];
    scene.lampGlows = [];
    scene.activeBoss = null;
    UI.setBossHUD(false);

    SoundEngine.setTheme('dhaka');
    const minLabel = document.getElementById('minimap-world-label');
    if (minLabel) minLabel.textContent = 'Dhaka Cyber Arcade 🕹️';

    const MAP_W = ARCADE_INTERIOR_WIDTH, MAP_H = ARCADE_INTERIOR_HEIGHT;
    scene.currentMapW = MAP_W;
    scene.currentMapH = MAP_H;
    scene.physics.world.setBounds(0, 0, MAP_W, MAP_H);
    scene.obstacles = scene.physics.add.staticGroup();

    const blockRect = (x: number, y: number, w: number, h: number) => {
      const zone = scene.add.zone(x, y, w, h);
      scene.physics.add.existing(zone, true);
      scene.obstacles.add(zone);
    };

    const addLandmark = (x: number, y: number, tex: string, w: number, h: number) => {
      const sp = scene.add.sprite(x, y, tex).setOrigin(0.5, 1).setDepth(y);
      if (w && h) blockRect(x, y - h / 2, w, h);
      return sp;
    };

    const registerInteract = (x: number, y: number, tex: string | null, name: string, radius: number, onInteract: () => void) => {
      const sp = tex ? scene.add.sprite(x, y, tex).setOrigin(0.5, 1).setDepth(y) : null;
      if (sp && tex && tex.startsWith('npc-')) {
        scene.tweens.add({
          targets: sp,
          scaleY: { from: 1, to: 1.025 },
          duration: 1600 + Math.random() * 400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
      const badgeY = sp ? y - sp.height - 8 : y - 58;
      const badge = scene.add.text(x, badgeY, '💬 ' + name, {
        fontFamily: "'Rajdhani', 'Outfit', sans-serif",
        fontSize: '12px',
        fontStyle: 'bold',
        backgroundColor: 'rgba(15, 12, 38, 0.90)',
        color: '#38bdf8',
        stroke: '#050314',
        strokeThickness: 3,
        padding: { x: 7, y: 3 },
        shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 3, fill: true }
      }).setOrigin(0.5, 1).setDepth(2100).setVisible(false);

      const entry = { x, y, radius, onInteract, badge, name };
      scene.interactables.push(entry);
      return entry;
    };

    // 1. Flooring: Obsidian Cyber Tile Base
    scene.add.tileSprite(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, 'tile-arcade-floor').setDepth(0);

    // 2. Retro 90s Laser Carpet Runners
    scene.add.tileSprite(640, 530, 96, 540, 'tile-arcade-carpet').setDepth(1);
    scene.add.tileSprite(384, 460, 480, 64, 'tile-arcade-carpet').setDepth(1);
    scene.add.tileSprite(896, 460, 480, 64, 'tile-arcade-carpet').setDepth(1);
    scene.add.tileSprite(640, 780, 280, 64, 'tile-arcade-carpet').setDepth(1);

    // 3. Walls & Physics Colliders
    scene.add.tileSprite(640, 110, MAP_W, 64, 'tile-arcade-wall').setDepth(110);
    blockRect(640, 75, MAP_W, 90);
    scene.add.tileSprite(16, MAP_H / 2, 32, MAP_H, 'tile-arcade-wall').setDepth(MAP_H / 2);
    blockRect(16, MAP_H / 2, 32, MAP_H);
    scene.add.tileSprite(MAP_W - 16, MAP_H / 2, 32, MAP_H, 'tile-arcade-wall').setDepth(MAP_H / 2);
    blockRect(MAP_W - 16, MAP_H / 2, 32, MAP_H);

    // Bottom Wall with central opening for double exit doors
    scene.add.tileSprite(270, 868, 540, 64, 'tile-arcade-wall').setDepth(868);
    blockRect(270, 878, 540, 44);
    scene.add.tileSprite(1010, 868, 540, 64, 'tile-arcade-wall').setDepth(868);
    blockRect(1010, 878, 540, 44);
    blockRect(640, 895, 120, 20);

    // Double Exit Doors
    scene.add.sprite(640, 864, 'prop-arcade-exit-door').setOrigin(0.5, 1).setDepth(864);
    registerInteract(640, 840, null, 'Exit to Dhaka Valley 🚪', 95, () => scene.exitArcade());

    // 4. Neon Wall Signs
    scene.add.sprite(640, 95, 'prop-arcade-neon-sign').setOrigin(0.5, 1).setDepth(96);
    scene.add.sprite(320, 95, 'prop-arcade-neon-sign').setOrigin(0.5, 1).setDepth(96);
    scene.add.sprite(960, 95, 'prop-arcade-neon-sign').setOrigin(0.5, 1).setDepth(96);

    // 5. Arcade Game Slots (Architecture Ready - Handled by ArcadeSlotManager)
    // Slot 1: Grand Championship DX
    addLandmark(640, 288, 'prop-arcade-cab-deluxe', 120, 48);
    registerInteract(640, 290, null, 'Slot #1: Grand Championship DX 🕹️', 85, () => {
      ArcadeSlotManager.interactWithSlot('slot_grand_championship', scene);
    });

    // Slot 2: Retro Upright Pixel Cabinet A
    addLandmark(280, 352, 'prop-arcade-cab-upright-a', 60, 40);
    registerInteract(280, 354, null, 'Slot #2: Pixel Arcade A 🕹️', 80, () => {
      ArcadeSlotManager.interactWithSlot('slot_retro_pixel_a', scene);
    });

    // Slot 3: Strike Clash DX Fighting Cab
    addLandmark(400, 352, 'prop-arcade-cab-upright-b', 60, 40);
    registerInteract(400, 354, null, 'Slot #3: Super Strike DX ⚔️', 80, () => {
      ArcadeSlotManager.interactWithSlot('slot_fighting_clash', scene);
    });

    // Slot 4: Tabletop Glass Cocktail Table Lounge
    addLandmark(640, 560, 'prop-arcade-cab-cocktail', 90, 44);
    scene.add.sprite(588, 560, 'prop-arcade-stool').setOrigin(0.5, 1).setDepth(560);
    scene.add.sprite(692, 560, 'prop-arcade-stool').setOrigin(0.5, 1).setDepth(560);
    registerInteract(640, 562, null, 'Slot #4: Glass Cocktail Lounge 🍸', 80, () => {
      ArcadeSlotManager.interactWithSlot('slot_cocktail_table', scene);
    });

    // Slot 5: Dance Beat Mania Rhythm Zone
    addLandmark(880, 352, 'prop-arcade-cab-dance', 76, 44);
    registerInteract(880, 354, null, 'Slot #5: Dance Mania Stage 💃', 80, () => {
      ArcadeSlotManager.interactWithSlot('slot_rhythm_beat', scene);
    });

    // Slot 6: Twin Cockpit Force-Feedback Racing
    addLandmark(1040, 352, 'prop-arcade-cab-racing', 108, 48);
    registerInteract(1040, 354, null, 'Slot #6: Dhaka Cyber Speed 🏎️', 85, () => {
      ArcadeSlotManager.interactWithSlot('slot_racing_twin', scene);
    });

    // 6. Arcade Attractions: Token Machine & Claw Machine
    // Token Dispenser
    addLandmark(760, 720, 'prop-arcade-token-dispenser', 36, 32);
    registerInteract(760, 722, null, 'Token Exchange Dispenser 🪙', 75, () => {
      ArcadeCutscenes.playTokenDispenser(scene);
    });

    // Prize Claw Crane Machine
    addLandmark(860, 720, 'prop-arcade-claw', 60, 40);
    registerInteract(860, 722, null, 'Lucky Neon Claw Machine 🧸', 80, () => {
      ArcadeCutscenes.playClawMachineCutscene(scene, 860, 720);
    });

    // 7. Manager Shanto Counter & Station
    blockRect(480, 720, 60, 32);
    registerInteract(520, 724, 'npc-shanto-0', 'Manager Shanto (Arcade Master)', 90, () => {
      SoundEngine.select();
      UI.startDialogue([
        {
          speaker: 'Manager Shanto',
          portrait: '🕹️',
          text: 'Hey there, champions! Welcome to Dhaka Cyber Arcade. Every single machine here is powered by modular software slots.'
        },
        {
          speaker: 'Totoro',
          portrait: '🐾',
          text: 'Can we play games on them, Manager Shanto?'
        },
        {
          speaker: 'Manager Shanto',
          portrait: '🕹️',
          text: 'The architecture is fully built and ready! As soon as Moon Walker registers a custom mini-game via ArcadeSlotManager, the cabinets come alive! In the meantime, feel free to inspect their diagnostics or test your skills on the Lucky Claw Crane!'
        }
      ]);
    });

    // 8. Dynamic Neon Lighting Halos
    [
      [640, 260, 0x00ffff, 90, 0.22],
      [280, 320, 0x00ffff, 70, 0.18],
      [400, 320, 0xff0055, 70, 0.18],
      [640, 540, 0xfde047, 80, 0.18],
      [880, 320, 0xff007f, 75, 0.20],
      [1040, 320, 0x00f0ff, 85, 0.22],
      [860, 680, 0xf43f5e, 70, 0.20],
      [760, 680, 0xf59e0b, 60, 0.16]
    ].forEach(([lx, ly, col, rad, alpha]) => {
      const glow = scene.add.circle(lx, ly, rad, col, alpha).setDepth(ly + 1);
      scene.lampGlows.push(glow);
      scene.tweens.add({
        targets: glow,
        alpha: { from: alpha * 0.7, to: alpha * 1.3 },
        duration: 1200 + Math.random() * 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    // 9. Player & Totoro Spawn
    const pSpawn = spawnPos || { x: 640, y: 800 };
    scene.player = scene.physics.add.sprite(pSpawn.x, pSpawn.y, 'player-0').setOrigin(0.5, 1);
    const pBoxW = 20, pBoxH = 14;
    scene.player.body.setSize(pBoxW, pBoxH).setOffset((scene.player.width - pBoxW) / 2, scene.player.height - pBoxH);
    scene.player.setCollideWorldBounds(true);
    scene.physics.add.collider(scene.player, scene.obstacles);

    const totoroPos = { x: pSpawn.x - 38, y: pSpawn.y };
    scene.totoro = scene.add.sprite(totoroPos.x, totoroPos.y, 'totoro-0').setOrigin(0.5, 1).setDepth(totoroPos.y);
    scene.totoroBadge = scene.add.text(totoroPos.x, totoroPos.y - 68, '♥ Totoro', {
      fontFamily: 'Rajdhani', fontSize: '13px', fontStyle: 'bold',
      backgroundColor: '#15803d', color: '#ffffff', padding: { x: 8, y: 3 },
      stroke: '#052e16', strokeThickness: 2.5,
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true }
    }).setOrigin(0.5, 1).setDepth(2100);
    scene.trail = Array(16).fill({ x: scene.player.x, y: scene.player.y });

    scene.interactPrompt = scene.add.text(0, 0, 'SPACE / TAP: Interact', {
      fontFamily: 'Rajdhani', fontSize: '12px', fontStyle: 'bold',
      backgroundColor: 'rgba(15, 12, 38, 0.95)', color: '#38bdf8', padding: { x: 8, y: 3 },
      stroke: '#050314', strokeThickness: 1.5,
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true }
    }).setOrigin(0.5, 1).setDepth(3000).setVisible(false);

    scene.ambientOverlay = scene.add.rectangle(0, 0, MAP_W * 2, MAP_H * 2, 0x09071c, 0.15)
      .setOrigin(0, 0).setDepth(2500);

    scene.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    scene.cameras.main.setZoom(1.22);
    scene.cameras.main.startFollow(scene.player, true, 0.1, 0.1);

    if (scene.scheduleSystem) {
      scene.scheduleSystem.initWorldNpcs('arcade_interior');
    }
    UI.updateQuestText();

    // Trigger First Interior Entrance Cutscene if not explored yet!
    if (!DateState.arcadeInteriorExplored) {
      scene.time.delayedCall(300, () => {
        ArcadeCutscenes.playFirstInteriorCutscene(scene);
      });
    }
  }
}
