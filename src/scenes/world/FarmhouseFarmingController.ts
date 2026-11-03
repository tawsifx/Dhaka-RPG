// src/scenes/world/FarmhouseFarmingController.ts - Stardew Valley-scale interactive farming engine inside the Farmhouse
import Phaser from 'phaser';
import { FarmingSystem } from '../../systems/FarmingSystem';
import { CROPS_DB } from '../../config/crops.db';
import { RPGStats } from '../../state/RPGStats';
import { DateState } from '../../state/DateState';
import { SoundEngine } from '../../audio/SoundEngine';

export type FarmTool = 'hoe' | 'water' | 'seed' | 'scythe';

export interface PlotRegion {
  name: string;
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
}

export class FarmhouseFarmingController {
  private scene: any;
  private farmingSystem: FarmingSystem;

  // Visual Groups & Sprites
  private soilSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private cropSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private timberBorders: Phaser.GameObjects.GameObject[] = [];
  private reticleGraphics!: Phaser.GameObjects.Graphics;
  private reticleTooltip!: Phaser.GameObjects.Text;

  // Tool State & UI
  private activeTool: FarmTool = 'hoe';
  private activeSeedId: string = 'sylhet_tea';
  private hotbarContainer!: Phaser.GameObjects.Container;
  private hotbarSlots: { bg: Phaser.GameObjects.Rectangle; icon: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image; text: Phaser.GameObjects.Text; badge?: Phaser.GameObjects.Text }[] = [];
  private seedDrawerContainer: Phaser.GameObjects.Container | null = null;
  private keyListeners: { [key: string]: Phaser.Input.Keyboard.Key } = {};
  private pointerDownListener?: (pointer: Phaser.Input.Pointer) => void;

  // Designated Farm Plot Regions inside Farmhouse
  public readonly PLOT_REGIONS: PlotRegion[] = [
    { name: 'West Garden Bed', minCol: 11, maxCol: 16, minRow: 9, maxRow: 13 },
    { name: 'East Garden Bed', minCol: 21, maxCol: 26, minRow: 9, maxRow: 13 }
  ];

  constructor(scene: any) {
    this.scene = scene;
    this.farmingSystem = scene.farmingSystem;
  }

  init(): void {
    if (!this.farmingSystem) {
      this.farmingSystem = new FarmingSystem(40, 30);
      this.scene.farmingSystem = this.farmingSystem;
    }

    // Restore saved grid state if available
    if (DateState.farmGrid && Array.isArray(DateState.farmGrid)) {
      this.farmingSystem.importGrid(DateState.farmGrid);
    }

    // Configure tillable boundaries for the designated garden beds
    this.farmingSystem.setTillableBounds(this.PLOT_REGIONS);

    this.buildGardenBedDecorations();
    this.renderAllTiles();
    this.createReticle();
    this.createHotbarUI();
    this.setupInputs();
  }

  private getKey(col: number, row: number): string {
    return `${col},${row}`;
  }

  /**
   * Builds rustic timber wooden borders and garden loam ground under the agricultural beds.
   */
  private buildGardenBedDecorations(): void {
    for (const plot of this.PLOT_REGIONS) {
      const leftX = plot.minCol * 32;
      const rightX = (plot.maxCol + 1) * 32;
      const topY = plot.minRow * 32;
      const bottomY = (plot.maxRow + 1) * 32;
      const width = rightX - leftX;
      const height = bottomY - topY;
      const centerX = leftX + width / 2;
      const centerY = topY + height / 2;

      // Dark rich loam backing
      const loam = this.scene.add.rectangle(centerX, centerY, width + 4, height + 4, 0x2b1d14, 0.45)
        .setDepth(1.05);
      this.timberBorders.push(loam);

      // Wooden border outline
      const border = this.scene.add.graphics().setDepth(1.12);
      border.lineStyle(3, 0x5c3d2e, 0.95);
      border.strokeRect(leftX - 2, topY - 2, width + 4, height + 4);
      border.lineStyle(1.5, 0x8b5a2b, 0.7);
      border.strokeRect(leftX - 4, topY - 4, width + 8, height + 8);
      this.timberBorders.push(border);

      // Wooden corner posts
      const corners = [
        [leftX - 2, topY - 2],
        [rightX + 2, topY - 2],
        [leftX - 2, bottomY + 2],
        [rightX + 2, bottomY + 2]
      ];
      for (const [cx, cy] of corners) {
        const post = this.scene.add.circle(cx, cy, 3.5, 0x3d2817).setDepth(1.14);
        this.timberBorders.push(post);
      }

      // Decorative Plot Signboard
      const signText = this.scene.add.text(centerX, topY - 14, `🌾 ${plot.name}`, {
        fontFamily: 'Rajdhani',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: 'rgba(35, 23, 14, 0.85)',
        padding: { x: 6, y: 2 }
      }).setOrigin(0.5, 1).setDepth(2000);
      this.timberBorders.push(signText);
    }
  }

  /**
   * Renders all tilled soil and growing crop sprites from the FarmingSystem grid.
   */
  public renderAllTiles(): void {
    // Clear old visual sprites
    for (const s of this.soilSprites.values()) s.destroy();
    this.soilSprites.clear();
    for (const c of this.cropSprites.values()) c.destroy();
    this.cropSprites.clear();

    for (let col = 0; col < 40; col++) {
      for (let row = 0; row < 30; row++) {
        const cell = this.farmingSystem.getCell(col, row);
        if (!cell) continue;

        if (cell.isTilled) {
          this.updateSoilSprite(col, row);
        }
        if (cell.crop) {
          this.updateCropSprite(col, row);
        }
      }
    }
  }

  /**
   * Computes Wang 4-bit neighbor connectivity (0-15) for seamless connected tilled soil.
   */
  private getSoilBitmask(col: number, row: number): number {
    let mask = 0;
    const n = this.farmingSystem.getCell(col, row - 1);
    const e = this.farmingSystem.getCell(col + 1, row);
    const s = this.farmingSystem.getCell(col, row + 1);
    const w = this.farmingSystem.getCell(col - 1, row);

    if (n && n.isTilled) mask |= 1;
    if (e && e.isTilled) mask |= 2;
    if (s && s.isTilled) mask |= 4;
    if (w && w.isTilled) mask |= 8;
    return mask;
  }

  /**
   * Creates or updates a tilled soil tile sprite at (col, row).
   */
  public updateSoilSprite(col: number, row: number): void {
    const key = this.getKey(col, row);
    const cell = this.farmingSystem.getCell(col, row);
    if (!cell || !cell.isTilled) {
      if (this.soilSprites.has(key)) {
        this.soilSprites.get(key)!.destroy();
        this.soilSprites.delete(key);
      }
      return;
    }

    const worldX = col * 32 + 16;
    const worldY = row * 32 + 16;
    const texKey = cell.isWatered ? 'tilled-dirt-dark' : 'tilled-dirt';
    const frameIndex = this.getSoilBitmask(col, row);

    let sprite = this.soilSprites.get(key);
    if (!sprite) {
      // Texture check fallback
      const validTex = this.scene.textures.exists(texKey) ? texKey : 'tile-path-dirt';
      sprite = this.scene.add.sprite(worldX, worldY, validTex, frameIndex)
        .setDisplaySize(32, 32)
        .setDepth(1.18);
      this.soilSprites.set(key, sprite);
    } else {
      sprite.setTexture(texKey, frameIndex);
      sprite.setDisplaySize(32, 32);
    }
  }

  /**
   * Refreshes neighboring soil sprites when a tile is tilled or cleared so borders connect smoothly.
   */
  private refreshNeighbors(col: number, row: number): void {
    const coords = [
      [col, row],
      [col, row - 1],
      [col + 1, row],
      [col, row + 1],
      [col - 1, row]
    ];
    for (const [c, r] of coords) {
      this.updateSoilSprite(c, r);
    }
  }

  /**
   * Creates or updates the crop sprite on a cell based on growth stage and maturity.
   */
  public updateCropSprite(col: number, row: number): void {
    const key = this.getKey(col, row);
    const cell = this.farmingSystem.getCell(col, row);

    if (!cell || !cell.crop) {
      if (this.cropSprites.has(key)) {
        this.cropSprites.get(key)!.destroy();
        this.cropSprites.delete(key);
      }
      return;
    }

    const crop = cell.crop;
    const worldX = col * 32 + 16;
    const worldY = row * 32 + 28;

    // Determine texture key based on cropId and stage
    let cropTex = `crop-${crop.cropId}-stage-${Math.min(crop.currentStage, 4)}`;
    if (crop.isReadyForHarvest) {
      if (crop.cropId === 'sylhet_tea' && this.scene.textures.exists('crop-sylhet_tea-harvest')) {
        cropTex = 'crop-sylhet_tea-harvest';
      } else if (this.scene.textures.exists(`crop-${crop.cropId}-stage-4`)) {
        cropTex = `crop-${crop.cropId}-stage-4`;
      } else if (this.scene.textures.exists(`crop-${crop.cropId}-crop`)) {
        cropTex = `crop-${crop.cropId}-crop`;
      }
    }

    if (!this.scene.textures.exists(cropTex)) {
      // Fallback to any stage or procedural
      cropTex = this.scene.textures.exists(`crop-${crop.cropId}-crop`)
        ? `crop-${crop.cropId}-crop`
        : 'prop-sunflowers';
    }

    let sprite = this.cropSprites.get(key);
    if (!sprite) {
      sprite = this.scene.add.sprite(worldX, worldY, cropTex)
        .setOrigin(0.5, 0.95)
        .setDisplaySize(28, 38)
        .setDepth(worldY + 4);
      this.cropSprites.set(key, sprite);

      // Gentle organic idle wind sway
      this.scene.tweens.add({
        targets: sprite,
        angle: { from: -1.5, to: 1.5 },
        duration: 1600 + Math.random() * 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    } else {
      sprite.setTexture(cropTex);
      sprite.setDisplaySize(28, 38);
    }

    // Harvest readiness bounce & glow
    if (crop.isReadyForHarvest) {
      this.scene.tweens.add({
        targets: sprite,
        y: worldY - 3,
        duration: 650,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  /**
   * Initializes the HUD Hotbar docked at the bottom center of the screen.
   */
  private createHotbarUI(): void {
    const camW = this.scene.scale.width;
    const camH = this.scene.scale.height;
    const barW = 260;
    const barH = 58;
    const posX = camW / 2;
    const posY = camH - 42;

    this.hotbarContainer = this.scene.add.container(posX, posY).setScrollFactor(0).setDepth(3100);

    // Dark glass backing
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a120c, 0.88);
    bg.fillRoundedRect(-barW / 2, -barH / 2, barW, barH, 10);
    bg.lineStyle(2, 0xd97706, 0.9);
    bg.strokeRoundedRect(-barW / 2, -barH / 2, barW, barH, 10);
    this.hotbarContainer.add(bg);

    const tools: { type: FarmTool; keyNum: string; label: string; iconKey: string }[] = [
      { type: 'hoe', keyNum: '1', label: 'Hoe', iconKey: 'tool-hoe' },
      { type: 'water', keyNum: '2', label: 'Can', iconKey: 'tool-can' },
      { type: 'seed', keyNum: '3', label: 'Seeds', iconKey: `crop-${this.activeSeedId}-seed` },
      { type: 'scythe', keyNum: '4', label: 'Scythe', iconKey: 'tool-scythe' }
    ];

    const slotSize = 46;
    const spacing = 58;
    const startX = -((tools.length - 1) * spacing) / 2;

    this.hotbarSlots = [];

    tools.forEach((t, idx) => {
      const slotX = startX + idx * spacing;
      const slotBg = this.scene.add.rectangle(slotX, 0, slotSize, slotSize, 0x2b1d14, 0.7)
        .setStrokeStyle(1.5, 0x78350f, 0.8)
        .setInteractive({ useHandCursor: true });

      const iconTex = this.scene.textures.exists(t.iconKey) ? t.iconKey : 'prop-sunflowers';
      const icon = this.scene.add.image(slotX, -4, iconTex).setDisplaySize(28, 28);

      const numText = this.scene.add.text(slotX - slotSize / 2 + 5, slotSize / 2 - 13, t.keyNum, {
        fontFamily: 'Rajdhani',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fde68a'
      });

      const labelText = this.scene.add.text(slotX, slotSize / 2 - 8, t.label, {
        fontFamily: 'Rajdhani',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#d1d5db'
      }).setOrigin(0.5, 1);

      this.hotbarContainer.add([slotBg, icon, numText, labelText]);

      let badge: Phaser.GameObjects.Text | undefined;
      if (t.type === 'seed') {
        const seedCount = this.getSeedCount(this.activeSeedId);
        badge = this.scene.add.text(slotX + slotSize / 2 - 4, -slotSize / 2 + 4, `x${seedCount}`, {
          fontFamily: 'Rajdhani',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#ffffff',
          backgroundColor: '#047857',
          padding: { x: 3, y: 1 }
        }).setOrigin(1, 0);
        this.hotbarContainer.add(badge);
      }

      slotBg.on('pointerdown', () => {
        if (t.type === 'seed' && this.activeTool === 'seed') {
          this.toggleSeedDrawer();
        } else {
          this.setActiveTool(t.type);
        }
      });

      this.hotbarSlots.push({ bg: slotBg, icon, text: labelText, badge });
    });

    this.updateHotbarVisuals();
  }

  public setActiveTool(tool: FarmTool): void {
    this.activeTool = tool;
    SoundEngine.step('wood');
    this.updateHotbarVisuals();
    if (tool !== 'seed' && this.seedDrawerContainer) {
      this.seedDrawerContainer.destroy();
      this.seedDrawerContainer = null;
    }
  }

  public setActiveSeed(seedId: string): void {
    this.activeSeedId = seedId;
    const seedSlot = this.hotbarSlots[2];
    if (seedSlot) {
      const seedTex = `crop-${seedId}-seed`;
      if (this.scene.textures.exists(seedTex)) {
        seedSlot.icon.setTexture(seedTex);
      }
      if (seedSlot.badge) {
        seedSlot.badge.setText(`x${this.getSeedCount(seedId)}`);
      }
      const cropDef = CROPS_DB[seedId];
      if (cropDef) {
        seedSlot.text.setText(cropDef.name.split(' ')[0]);
      }
    }
    if (this.seedDrawerContainer) {
      this.seedDrawerContainer.destroy();
      this.seedDrawerContainer = null;
    }
    SoundEngine.step('grass');
  }

  private updateHotbarVisuals(): void {
    const toolOrder: FarmTool[] = ['hoe', 'water', 'seed', 'scythe'];
    this.hotbarSlots.forEach((slot, idx) => {
      const isSelected = toolOrder[idx] === this.activeTool;
      if (isSelected) {
        slot.bg.setStrokeStyle(3, 0xfacc15, 1);
        slot.bg.setFillStyle(0x451a03, 0.95);
        slot.text.setColor('#fef08a');
      } else {
        slot.bg.setStrokeStyle(1.5, 0x78350f, 0.7);
        slot.bg.setFillStyle(0x2b1d14, 0.75);
        slot.text.setColor('#9ca3af');
      }
    });

    // Update seed count badge
    const seedSlot = this.hotbarSlots[2];
    if (seedSlot && seedSlot.badge) {
      seedSlot.badge.setText(`x${this.getSeedCount(this.activeSeedId)}`);
    }
  }

  /**
   * Toggles the sleek Floating Seed Drawer above the Hotbar.
   */
  public toggleSeedDrawer(): void {
    if (this.seedDrawerContainer) {
      this.seedDrawerContainer.destroy();
      this.seedDrawerContainer = null;
      return;
    }

    const camW = this.scene.scale.width;
    const camH = this.scene.scale.height;
    const drawerW = 340;
    const drawerH = 76;
    const posX = camW / 2;
    const posY = camH - 110;

    this.seedDrawerContainer = this.scene.add.container(posX, posY).setScrollFactor(0).setDepth(3200);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x140e0a, 0.94);
    bg.fillRoundedRect(-drawerW / 2, -drawerH / 2, drawerW, drawerH, 8);
    bg.lineStyle(1.5, 0xf59e0b, 0.9);
    bg.strokeRoundedRect(-drawerW / 2, -drawerH / 2, drawerW, drawerH, 8);
    this.seedDrawerContainer.add(bg);

    const title = this.scene.add.text(0, -drawerH / 2 + 8, 'SELECT HEIRLOOM SEED PACKET 🌱', {
      fontFamily: 'Rajdhani',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#fef08a'
    }).setOrigin(0.5, 0);
    this.seedDrawerContainer.add(title);

    const cropKeys = Object.keys(CROPS_DB);
    const itemW = 44;
    const startX = -((cropKeys.length - 1) * itemW) / 2;

    cropKeys.forEach((cropId, idx) => {
      const itemX = startX + idx * itemW;
      const itemY = 8;
      const count = this.getSeedCount(cropId);
      const isSelected = cropId === this.activeSeedId;

      const itemBg = this.scene.add.rectangle(itemX, itemY, 38, 38, isSelected ? 0x78350f : 0x24140b, 0.8)
        .setStrokeStyle(isSelected ? 2 : 1, isSelected ? 0xfacc15 : 0x5c3d2e)
        .setInteractive({ useHandCursor: true });

      const seedTex = `crop-${cropId}-seed`;
      const icon = this.scene.add.image(itemX, itemY - 3, this.scene.textures.exists(seedTex) ? seedTex : 'prop-sunflowers')
        .setDisplaySize(24, 24);

      const countLabel = this.scene.add.text(itemX, itemY + 12, `x${count}`, {
        fontFamily: 'Rajdhani',
        fontSize: '10px',
        fontStyle: 'bold',
        color: count > 0 ? '#86efac' : '#ef4444'
      }).setOrigin(0.5, 1);

      this.seedDrawerContainer!.add([itemBg, icon, countLabel]);

      itemBg.on('pointerdown', () => {
        this.setActiveSeed(cropId);
      });
    });
  }

  private getSeedCount(cropId: string): number {
    const cropDef = CROPS_DB[cropId];
    if (!cropDef) return 0;
    return (DateState.itemCounts && DateState.itemCounts[cropDef.seedItemId]) || 0;
  }

  /**
   * Initializes the 32x32 visual reticle and action tooltip.
   */
  private createReticle(): void {
    this.reticleGraphics = this.scene.add.graphics().setDepth(2400);
    this.reticleTooltip = this.scene.add.text(0, 0, '', {
      fontFamily: 'Rajdhani',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(20, 14, 10, 0.88)',
      padding: { x: 6, y: 2 }
    }).setOrigin(0.5, 1).setDepth(2410).setVisible(false);
  }

  /**
   * Sets up keyboard number keys (1-4) and direct canvas click handling for farming actions.
   */
  private setupInputs(): void {
    if (this.scene.input && this.scene.input.keyboard) {
      this.keyListeners['1'] = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
      this.keyListeners['2'] = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
      this.keyListeners['3'] = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
      this.keyListeners['4'] = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR);

      this.keyListeners['1'].on('down', () => this.setActiveTool('hoe'));
      this.keyListeners['2'].on('down', () => this.setActiveTool('water'));
      this.keyListeners['3'].on('down', () => {
        if (this.activeTool === 'seed') {
          this.toggleSeedDrawer();
        } else {
          this.setActiveTool('seed');
        }
      });
      this.keyListeners['4'].on('down', () => this.setActiveTool('scythe'));
    }

    // Direct click/tap on farm tiles
    this.pointerDownListener = (pointer: Phaser.Input.Pointer) => {
      // Ignore click if clicking hotbar area
      if (pointer.y > this.scene.scale.height - 70) return;
      const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const targetCol = Math.floor(worldPoint.x / 32);
      const targetRow = Math.floor(worldPoint.y / 32);

      // Check distance to player (reach limit of 2.6 tiles)
      const dist = Phaser.Math.Distance.Between(this.scene.player.x, this.scene.player.y, worldPoint.x, worldPoint.y);
      if (dist < 88) {
        this.executeToolAction(targetCol, targetRow);
      }
    };
    this.scene.input.on('pointerdown', this.pointerDownListener);
  }

  /**
   * Updates reticle position and validity highlight every game frame.
   */
  public update(): void {
    if (!this.reticleGraphics) return;
    this.reticleGraphics.clear();

    if (DateState.currentWorld !== 'farmhouse' || !this.scene.player) {
      this.reticleTooltip.setVisible(false);
      return;
    }

    // Determine targeted tile (facing tile in front of player)
    const facing = this.scene.facingVec || { x: 0, y: 1 };
    const targetCol = Math.floor((this.scene.player.x + facing.x * 24) / 32);
    const targetRow = Math.floor((this.scene.player.y + facing.y * 24) / 32);

    const cell = this.farmingSystem.getCell(targetCol, targetRow);
    const tileX = targetCol * 32;
    const tileY = targetRow * 32;

    if (!cell) {
      this.reticleTooltip.setVisible(false);
      return;
    }

    let color = 0xffffff;
    let tooltip = '';
    let isValid = false;

    if (this.activeTool === 'hoe') {
      if (cell.isTillable && !cell.isTilled) {
        color = 0x4ade80;
        tooltip = '⛏️ Till Soil';
        isValid = true;
      } else {
        color = 0x9ca3af;
      }
    } else if (this.activeTool === 'water') {
      if (cell.isTilled && !cell.isWatered) {
        color = 0x38bdf8;
        tooltip = '💧 Water Soil';
        isValid = true;
      } else if (cell.isTilled && cell.isWatered) {
        color = 0x60a5fa;
        tooltip = '💧 Soil Moist';
      } else {
        color = 0x9ca3af;
      }
    } else if (this.activeTool === 'seed') {
      const cropDef = CROPS_DB[this.activeSeedId];
      const count = this.getSeedCount(this.activeSeedId);
      if (cell.isTilled && cell.crop === null) {
        if (count > 0) {
          color = 0xfacc15;
          tooltip = `🌱 Plant ${cropDef ? cropDef.name.split(' ')[0] : 'Seed'}`;
          isValid = true;
        } else {
          color = 0xef4444;
          tooltip = '❌ Out of Seeds';
        }
      } else {
        color = 0x9ca3af;
      }
    } else if (this.activeTool === 'scythe') {
      if (cell.crop && cell.crop.isReadyForHarvest) {
        const cropDef = CROPS_DB[cell.crop.cropId];
        color = 0xfbbf24;
        tooltip = `🧺 Harvest ${cropDef ? cropDef.name.split(' ')[0] : 'Crop'}!`;
        isValid = true;
      } else if (cell.crop) {
        color = 0x9ca3af;
        tooltip = `🌿 Growing (${cell.crop.currentStage}/${CROPS_DB[cell.crop.cropId]?.growth.stages || 4})`;
      } else {
        color = 0x9ca3af;
      }
    }

    // Render corner bracket reticle
    const bLen = 8;
    this.reticleGraphics.lineStyle(isValid ? 2.5 : 1.5, color, isValid ? 0.95 : 0.55);

    // Top-Left
    this.reticleGraphics.moveTo(tileX, tileY + bLen);
    this.reticleGraphics.lineTo(tileX, tileY);
    this.reticleGraphics.lineTo(tileX + bLen, tileY);

    // Top-Right
    this.reticleGraphics.moveTo(tileX + 32 - bLen, tileY);
    this.reticleGraphics.lineTo(tileX + 32, tileY);
    this.reticleGraphics.lineTo(tileX + 32, tileY + bLen);

    // Bottom-Left
    this.reticleGraphics.moveTo(tileX, tileY + 32 - bLen);
    this.reticleGraphics.lineTo(tileX, tileY + 32);
    this.reticleGraphics.lineTo(tileX + bLen, tileY + 32);

    // Bottom-Right
    this.reticleGraphics.moveTo(tileX + 32 - bLen, tileY + 32);
    this.reticleGraphics.lineTo(tileX + 32, tileY + 32);
    this.reticleGraphics.lineTo(tileX + 32, tileY + 32 - bLen);

    this.reticleGraphics.strokePath();

    if (tooltip && isValid) {
      this.reticleTooltip.setText(tooltip);
      this.reticleTooltip.setPosition(tileX + 16, tileY - 4);
      this.reticleTooltip.setVisible(true);
    } else {
      this.reticleTooltip.setVisible(false);
    }
  }

  /**
   * Executes the active tool action at the targeted tile coordinate.
   */
  public executeToolAction(col: number, row: number): boolean {
    const cell = this.farmingSystem.getCell(col, row);
    if (!cell) return false;

    // Lock combat attacks during active farming tool action
    this.scene.isFarmingAction = true;
    if (this.scene.farmingActionTimer && typeof this.scene.farmingActionTimer.remove === 'function') {
      this.scene.farmingActionTimer.remove();
    }
    if (this.scene.time && typeof this.scene.time.delayedCall === 'function') {
      this.scene.farmingActionTimer = this.scene.time.delayedCall(350, () => {
        this.scene.isFarmingAction = false;
      });
    } else {
      this.scene.farmingActionTimer = setTimeout(() => {
        this.scene.isFarmingAction = false;
      }, 350);
    }

    if (this.activeTool === 'hoe') {
      if (!cell.isTilled && cell.isTillable) {
        if (this.farmingSystem.tillSoil(col, row)) {
          if (this.scene.playerBehaviors) this.scene.playerBehaviors.triggerHoeAction(col, row);
          this.refreshNeighbors(col, row);
          this.saveState();
          return true;
        }
      }
    } else if (this.activeTool === 'water') {
      if (cell.isTilled && !cell.isWatered) {
        if (this.farmingSystem.waterSoil(col, row)) {
          if (this.scene.playerBehaviors) this.scene.playerBehaviors.triggerWaterAction(col, row);
          this.updateSoilSprite(col, row);
          this.saveState();
          return true;
        }
      }
    } else if (this.activeTool === 'seed') {
      if (cell.isTilled && cell.crop === null) {
        const cropDef = CROPS_DB[this.activeSeedId];
        if (!cropDef) return false;
        const seedItem = cropDef.seedItemId;

        if (RPGStats.hasItem(seedItem, 1)) {
          RPGStats.removeItem(seedItem, 1);
          if (this.farmingSystem.plantCrop(col, row, this.activeSeedId)) {
            SoundEngine.step('grass');
            this.updateCropSprite(col, row);
            this.updateHotbarVisuals();
            this.saveState();

            // Planting sparkle
            const pX = col * 32 + 16;
            const pY = row * 32 + 16;
            for (let i = 0; i < 4; i++) {
              const spk = this.scene.add.circle(pX, pY, 2, 0x86efac, 0.9).setDepth(pY + 10);
              this.scene.tweens.add({
                targets: spk,
                x: pX + (Math.random() - 0.5) * 16,
                y: pY - 14 - Math.random() * 8,
                alpha: 0,
                duration: 350,
                onComplete: () => spk.destroy()
              });
            }
            return true;
          }
        } else {
          SoundEngine.blip(180, 'sawtooth');
          this.scene.playerBehaviors?.showEmote('❌', 1200);
        }
      }
    } else if (this.activeTool === 'scythe') {
      if (cell.crop && cell.crop.isReadyForHarvest) {
        const cropId = cell.crop.cropId;
        const harvestResult = this.farmingSystem.harvestCrop(col, row);
        if (harvestResult.success) {
          if (this.scene.playerBehaviors) this.scene.playerBehaviors.triggerHarvestAction(cropId, col, row);
          this.updateCropSprite(col, row);
          this.saveState();
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Advances the calendar day: ticks growth for all watered crops, dries soil, updates visuals.
   */
  public advanceDay(): void {
    const isRaining = Boolean(this.scene.isRaining);
    const tickResult = this.farmingSystem.dailyGrowthTick(isRaining);
    this.renderAllTiles();
    this.saveState();

    SoundEngine.heartUp();
    const banner = this.scene.add.text(
      this.scene.scale.width / 2,
      72,
      `☀️ DAWN OF A NEW DAY 🌾\nCrops Watered: ${tickResult.cropsWatered} | Matured: ${tickResult.cropsMatured}`,
      {
        fontFamily: 'Rajdhani',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fef08a',
        align: 'center',
        backgroundColor: 'rgba(26, 18, 12, 0.94)',
        padding: { x: 16, y: 8 }
      }
    ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(3500);

    this.scene.tweens.add({
      targets: banner,
      y: 84,
      duration: 350,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 2400,
      onComplete: () => banner.destroy()
    });
  }

  private saveState(): void {
    DateState.farmGrid = this.farmingSystem.exportGrid();
  }

  public destroy(): void {
    this.saveState();
    if (this.hotbarContainer) this.hotbarContainer.destroy();
    if (this.seedDrawerContainer) this.seedDrawerContainer.destroy();
    if (this.reticleGraphics) this.reticleGraphics.destroy();
    if (this.reticleTooltip) this.reticleTooltip.destroy();

    for (const b of this.timberBorders) b.destroy();
    this.timberBorders = [];
    for (const s of this.soilSprites.values()) s.destroy();
    this.soilSprites.clear();
    for (const c of this.cropSprites.values()) c.destroy();
    this.cropSprites.clear();

    for (const k of Object.values(this.keyListeners)) {
      if (k) k.removeAllListeners();
    }
    this.keyListeners = {};

    if (this.pointerDownListener && this.scene.input) {
      this.scene.input.off('pointerdown', this.pointerDownListener);
      this.pointerDownListener = undefined;
    }
  }
}
