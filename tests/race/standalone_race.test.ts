// tests/race/standalone_race.test.ts - Unit and headless integration test for Standalone Race Harness
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Standalone 3D Race Harness', () => {
  it('provides standalone race.html with dev control strip and entry script', () => {
    const htmlPath = path.resolve('race.html');
    expect(fs.existsSync(htmlPath)).toBe(true);

    const content = fs.readFileSync(htmlPath, 'utf8');
    expect(content).toContain('id="race-dev-bar"');
    expect(content).toContain('id="sel-track"');
    expect(content).toContain('id="sel-tier"');
    expect(content).toContain('id="chk-items"');
    expect(content).toContain('id="btn-restart"');
    expect(content).toContain('src="/src/race-dev.ts"');
  });

  it('provides src/race-dev.ts with standalone harness logic', () => {
    const tsPath = path.resolve('src/race-dev.ts');
    expect(fs.existsSync(tsPath)).toBe(true);

    const content = fs.readFileSync(tsPath, 'utf8');
    expect(content).toContain('startStandaloneRace');
    expect(content).toContain('RickshawRaceEngine');
  });

  it('configures dev:race script in package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
    expect(pkg.scripts['dev:race']).toBe('vite --open /race.html');
  });

  it('configures race.html in vite.config.ts multi-page inputs', () => {
    const viteConfig = fs.readFileSync(path.resolve('vite.config.ts'), 'utf8');
    expect(viteConfig).toContain('race.html');
  });
});
