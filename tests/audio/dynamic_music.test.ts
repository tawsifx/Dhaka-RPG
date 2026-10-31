import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  AudioBusLayout,
  AudioPool,
  RandomizedAudio,
  DynamicMusicSystem,
  SoundEngine,
  MusicState,
} from '../../src/audio';

describe('AudioBusLayout — 5-Bus Architecture & Decibel Ducking', () => {
  let busLayout: AudioBusLayout;

  beforeEach(() => {
    busLayout = AudioBusLayout.getInstance();
  });

  it('converts linear and decibel values accurately', () => {
    expect(AudioBusLayout.linearToDb(1.0)).toBeCloseTo(0, 4);
    expect(AudioBusLayout.dbToLinear(0)).toBeCloseTo(1.0, 4);
    expect(AudioBusLayout.dbToLinear(-6)).toBeCloseTo(0.501, 2);
    expect(AudioBusLayout.dbToLinear(-12)).toBeCloseTo(0.251, 2);
    expect(AudioBusLayout.linearToDb(0.251188643150958)).toBeCloseTo(-12, 1);
  });

  it('maintains independent volumes for all 5 audio buses', () => {
    busLayout.setBusVolume('Master', 0.8);
    busLayout.setBusVolume('Music', 0.7);
    busLayout.setBusVolume('SFX', 0.9);
    busLayout.setBusVolume('Voice', 0.95);
    busLayout.setBusVolume('Ambient', 0.65);

    expect(busLayout.getBusVolume('Master')).toBe(0.8);
    expect(busLayout.getBusVolume('Music')).toBe(0.7);
    expect(busLayout.getBusVolume('SFX')).toBe(0.9);
    expect(busLayout.getBusVolume('Voice')).toBe(0.95);
    expect(busLayout.getBusVolume('Ambient')).toBe(0.65);

    const all = busLayout.getAllVolumes();
    expect(all.master).toBe(0.8);
    expect(all.music).toBe(0.7);
    expect(all.sfx).toBe(0.9);
    expect(all.voice).toBe(0.95);
    expect(all.ambient).toBe(0.65);
  });

  it('handles decibel-based bus volume assignment', () => {
    busLayout.setBusVolumeDb('Music', -6.0);
    expect(busLayout.getBusVolumeDb('Music')).toBeCloseTo(-6.0, 1);
  });

  it('applies ducking and restores pre-ducked base volume', () => {
    busLayout.setBusVolume('Music', 0.85);
    busLayout.duckMusic(-12.0, 0.3);
    // Restoration brings it back to base
    busLayout.unduckMusic(0.5);
    expect(busLayout.getBusVolume('Music')).toBe(0.85);
  });
});

describe('RandomizedAudio — Anti-Machine-Gun Effect & Variance', () => {
  it('generates pitch variations within expected bounds', () => {
    for (let i = 0; i < 50; i++) {
      const pitch = RandomizedAudio.getRandomPitch([0.9, 1.1]);
      expect(pitch).toBeGreaterThanOrEqual(0.9);
      expect(pitch).toBeLessThanOrEqual(1.1);
    }
  });

  it('generates volume linear multipliers within decibel bounds', () => {
    const minLinear = AudioBusLayout.dbToLinear(-3.0);
    const maxLinear = AudioBusLayout.dbToLinear(0.0);

    for (let i = 0; i < 50; i++) {
      const vol = RandomizedAudio.getRandomVolumeLinear([-3.0, 0.0]);
      expect(vol).toBeGreaterThanOrEqual(minLinear - 0.001);
      expect(vol).toBeLessThanOrEqual(maxLinear + 0.001);
    }
  });

  it('prevents consecutive duplicate variants in multi-sample groups', () => {
    let last = -1;
    for (let i = 0; i < 30; i++) {
      const chosen = RandomizedAudio.pickVariantIndex('footstep_grass', 4);
      expect(chosen).toBeGreaterThanOrEqual(0);
      expect(chosen).toBeLessThan(4);
      if (last !== -1) {
        expect(chosen).not.toBe(last);
      }
      last = chosen;
    }
  });
});

describe('DynamicMusicSystem — Vertical Remixing & Interactive States', () => {
  let musicSystem: DynamicMusicSystem;

  beforeEach(() => {
    musicSystem = DynamicMusicSystem.getInstance();
    musicSystem.setMusicState('EXPLORATION');
    musicSystem.stopBGM();
  });

  afterEach(() => {
    musicSystem.stopBGM();
  });

  it('initializes in EXPLORATION state with correct stem weights', () => {
    expect(musicSystem.getMusicState()).toBe('EXPLORATION');

    const matrix = DynamicMusicSystem.STEM_LEVELS;
    expect(matrix.melody.EXPLORATION).toBeGreaterThan(0.8);
    expect(matrix.ambient.EXPLORATION).toBeGreaterThan(0.7);
    expect(matrix.percussion.EXPLORATION).toBe(0.0);
    expect(matrix.intense.EXPLORATION).toBe(0.0);
  });

  it('transitions through TENSION, COMBAT, and BOSS states dynamically', () => {
    musicSystem.setMusicState('TENSION');
    expect(musicSystem.getMusicState()).toBe('TENSION');

    musicSystem.setMusicState('COMBAT');
    expect(musicSystem.getMusicState()).toBe('COMBAT');

    musicSystem.setMusicState('BOSS');
    expect(musicSystem.getMusicState()).toBe('BOSS');

    const matrix = DynamicMusicSystem.STEM_LEVELS;
    // In BOSS state, percussion and intensity are at 100%
    expect(matrix.percussion.BOSS).toBe(1.0);
    expect(matrix.intense.BOSS).toBe(1.0);
  });

  it('translates combat intensity values into appropriate music states', () => {
    musicSystem.setCombatIntensity(0.0);
    expect(musicSystem.getMusicState()).toBe('EXPLORATION');

    musicSystem.setCombatIntensity(0.2);
    expect(musicSystem.getMusicState()).toBe('TENSION');

    musicSystem.setCombatIntensity(0.6);
    expect(musicSystem.getMusicState()).toBe('COMBAT');

    musicSystem.setCombatIntensity(0.95);
    expect(musicSystem.getMusicState()).toBe('BOSS');
  });

  it('switches tracks via seamless crossfade and respects auto-theme', () => {
    musicSystem.playBGM('totoro_theme');
    expect(musicSystem.getCurrentTrack().id).toBe('totoro_theme');

    musicSystem.crossFadeToTrack('spirited_away');
    expect(musicSystem.getCurrentTrack().id).toBe('spirited_away');

    musicSystem.setTheme('sunken');
    expect(musicSystem.getCurrentTrack().id).toBe('dhaka_adventure');
  });
});

describe('SoundEngine Facade — Modern Integration Verification', () => {
  beforeEach(() => {
    SoundEngine.stopBGM();
    SoundEngine.setTheme('dhaka');
  });

  afterEach(() => {
    SoundEngine.stopBGM();
  });

  it('exposes modern dynamic music state and ducking APIs', () => {
    SoundEngine.setMusicState('COMBAT');
    expect(SoundEngine.getMusicState()).toBe('COMBAT');

    SoundEngine.setCombatIntensity(0.85);
    expect(SoundEngine.getMusicState()).toBe('BOSS');
    expect(SoundEngine.getCombatIntensity()).toBe(0.85);

    // Test ducking calls without error
    expect(() => SoundEngine.duckMusic(-12, 0.3)).not.toThrow();
    expect(() => SoundEngine.unduckMusic(0.5)).not.toThrow();
  });

  it('plays randomized footsteps and SFX without errors', () => {
    expect(() => SoundEngine.step('grass')).not.toThrow();
    expect(() => SoundEngine.step('pier')).not.toThrow();
    expect(() => SoundEngine.step('path')).not.toThrow();
    expect(() => SoundEngine.step('puddle')).not.toThrow();

    expect(() => SoundEngine.attackSlash()).not.toThrow();
    expect(() => SoundEngine.enemyHit()).not.toThrow();
    expect(() => SoundEngine.totoroRoar()).not.toThrow();
    expect(() => SoundEngine.blip(520, 'sine')).not.toThrow();
  });
});
