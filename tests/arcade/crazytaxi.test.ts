// tests/arcade/crazytaxi.test.ts - Unit tests for Dhaka Crazy Taxi arcade integration
import { describe, it, expect } from 'vitest';
import { ArcadeSlotManager } from '../../src/systems/arcade/ArcadeSlotManager';
import { CrazyTaxiEngine } from '../../src/scenes/minigames/crazytaxi/CrazyTaxiEngine';
import fs from 'fs';
import path from 'path';

describe('Dhaka Crazy Taxi Arcade Integration Tests', () => {
  it('registers Dhaka Crazy Taxi into slot_racing_twin in ArcadeSlotManager', () => {
    CrazyTaxiEngine.register();
    const slot = ArcadeSlotManager.getSlot('slot_racing_twin');
    expect(slot).toBeDefined();
    expect(slot?.isInstalled).toBe(true);
    expect(slot?.name).toContain('Dhaka Crazy Taxi');
    expect(slot?.cabinetStyle).toBe('racing');
    expect(typeof slot?.launch).toBe('function');
  });

  it('provides launch and exit methods on CrazyTaxiEngine', () => {
    expect(typeof CrazyTaxiEngine.launch).toBe('function');
    expect(typeof CrazyTaxiEngine.exit).toBe('function');
    expect(typeof CrazyTaxiEngine.register).toBe('function');
  });

  it('verifies crazytaxi HTML files and assets exist in public directory', () => {
    const rootHtml = path.resolve(__dirname, '../../crazytaxi.html');
    const pubHtml = path.resolve(__dirname, '../../public/crazytaxi.html');
    const indexHtml = path.resolve(__dirname, '../../public/crazytaxi/index.html');
    const threeMinJs = path.resolve(__dirname, '../../public/crazytaxi/lib/three.min.js');
    const gameJs = path.resolve(__dirname, '../../public/crazytaxi/js/game.js');
    const modelsJs = path.resolve(__dirname, '../../public/crazytaxi/js/models/models.js');
    const fareJs = path.resolve(__dirname, '../../public/crazytaxi/js/systems/fare.js');

    expect(fs.existsSync(rootHtml)).toBe(true);
    expect(fs.existsSync(pubHtml)).toBe(true);
    expect(fs.existsSync(indexHtml)).toBe(true);
    expect(fs.existsSync(threeMinJs)).toBe(true);
    expect(fs.existsSync(gameJs)).toBe(true);
    expect(fs.existsSync(modelsJs)).toBe(true);
    expect(fs.existsSync(fareJs)).toBe(true);
  });

  it('verifies models.js includes Moon Walker driver and Totoro 3D model', () => {
    const modelsJs = path.resolve(__dirname, '../../public/crazytaxi/js/models/models.js');
    const code = fs.readFileSync(modelsJs, 'utf8');

    // Totoro model method
    expect(code).toContain('totoro(o)');
    // Moon Walker driver styling
    expect(code).toContain('Moon Walker');
    expect(code).toContain('DHAKA TAXI');
    expect(code).toContain('DHAKA-GA 11-2026');
  });

  it('verifies fare.js features Dhaka passengers with authentic destinations and quotes', () => {
    const fareJs = path.resolve(__dirname, '../../public/crazytaxi/js/systems/fare.js');
    const code = fs.readFileSync(fareJs, 'utf8');

    expect(code).toContain('DHAKA_CHARACTERS');
    expect(code).toContain('Anamika');
    expect(code).toContain('Ahona');
    expect(code).toContain('Apshora');
    expect(code).toContain('Rakin');
    expect(code).toContain('Star Kebab');
    expect(code).toContain('Curzon Hall');
    expect(code).toContain('Charukola Art');
    expect(code).toContain('CRAZY SPEED!!');
  });

  it('verifies HUD and gags use English callouts', () => {
    const gagsJs = path.resolve(__dirname, '../../public/crazytaxi/js/entities/gags.js');
    const gagsCode = fs.readFileSync(gagsJs, 'utf8');
    expect(gagsCode).toContain('BOING!');
    expect(gagsCode).toContain('SPIN CYCLE!');
    expect(gagsCode).toContain('STRIKE!');

    const hudJs = path.resolve(__dirname, '../../public/crazytaxi/js/ui/hud.js');
    const hudCode = fs.readFileSync(hudJs, 'utf8');
    expect(hudCode).toContain('ART POINTS');
    expect(hudCode).toContain('FARE');
    expect(hudCode).toContain('PASSENGER ON BOARD!');
  });
});
