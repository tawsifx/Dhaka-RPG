// tests/arcade/brawler.test.ts - Unit tests for Arcade Slot Manager & Brawler Engine
import { describe, it, expect } from 'vitest';
import { ArcadeSlotManager } from '../../src/systems/arcade/ArcadeSlotManager';
import { BrawlerEngine } from '../../src/scenes/minigames/brawler/BrawlerEngine';
import fs from 'fs';
import path from 'path';

describe('Arcade Brawler Integration Tests', () => {
  it('initializes all 6 arcade slots in ArcadeSlotManager', () => {
    const slots = ArcadeSlotManager.getAllSlots();
    expect(slots.length).toBe(6);
    const ids = slots.map((s) => s.id);
    expect(ids).toContain('slot_grand_championship');
    expect(ids).toContain('slot_retro_pixel_a');
    expect(ids).toContain('slot_fighting_clash');
    expect(ids).toContain('slot_cocktail_table');
    expect(ids).toContain('slot_rhythm_beat');
    expect(ids).toContain('slot_racing_twin');
  });

  it('registers Super Battle Strike DX: Moon Walker & Totoro into slot_fighting_clash', () => {
    BrawlerEngine.register();
    const slot = ArcadeSlotManager.getSlot('slot_fighting_clash');
    expect(slot).toBeDefined();
    expect(slot?.isInstalled).toBe(true);
    expect(slot?.name).toContain('Super Battle Strike DX: Moon Walker & Totoro');
    expect(slot?.genre).toContain('Beat-\'Em-Up');
    expect(typeof slot?.launch).toBe('function');
  });

  it('provides launch and exit methods on BrawlerEngine', () => {
    expect(typeof BrawlerEngine.launch).toBe('function');
    expect(typeof BrawlerEngine.exit).toBe('function');
    expect(typeof BrawlerEngine.register).toBe('function');
  });

  it('contains valid adapted dialogue in dialog1.json referencing Moon Walker and Totoro', () => {
    const dialogPath = path.resolve(__dirname, '../../public/brawler/assets/dialogs/dialog1.json');
    expect(fs.existsSync(dialogPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(dialogPath, 'utf8'));
    expect(Array.isArray(content)).toBe(true);
    const textCombined = content.map((d: any) => d.text).join(' ');
    expect(textCombined).toContain('Moon Walker');
    expect(textCombined).toContain('Totoro');
    expect(textCombined).toContain('Fuller Road');
  });

  it('verifies brawler sprites atlas and bundle exist in public directory', () => {
    const spritesPng = path.resolve(__dirname, '../../public/brawler/assets/sprites/sprites.png');
    const spritesJson = path.resolve(__dirname, '../../public/brawler/assets/sprites/sprites.json');
    const bundleJs = path.resolve(__dirname, '../../public/brawler/brawler.bundle.js');
    const phaserJs = path.resolve(__dirname, '../../public/brawler/phaser.min.js');

    expect(fs.existsSync(spritesPng)).toBe(true);
    expect(fs.existsSync(spritesJson)).toBe(true);
    expect(fs.existsSync(bundleJs)).toBe(true);
    expect(fs.existsSync(phaserJs)).toBe(true);
  });
});
