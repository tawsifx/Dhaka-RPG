import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SoundEngine } from '../src/audio/SoundEngine';

describe('SoundEngine — Ohona Song Cutscene Audio Management', () => {
  beforeEach(() => {
    SoundEngine.stopBGM();
    SoundEngine.setTheme('dhaka');
  });

  afterEach(() => {
    SoundEngine.stopBGM();
  });

  it('restores ambient theme after playOhonaSong is stopped', () => {
    // Start normal background music
    SoundEngine.playBGM();
    expect(SoundEngine.getCurrentTrack().id).toBe('totoro_theme');

    // Concert starts: plays Ohona song
    SoundEngine.playOhonaSong(15);
    expect(SoundEngine.getCurrentTrack().id).toBe('ohona_song');

    // Concert ends: stops Ohona song
    SoundEngine.stopOhonaSong();
    expect(SoundEngine.getCurrentTrack().id).toBe('totoro_theme');
  });

  it('restores muted state if BGM was off prior to cutscene', () => {
    // Ensure BGM is off
    SoundEngine.stopBGM();

    // Cutscene triggers Ohona song
    SoundEngine.playOhonaSong(15);
    expect(SoundEngine.getCurrentTrack().id).toBe('ohona_song');

    // Cutscene ends
    SoundEngine.stopOhonaSong();

    // Track ID is reset to world theme and music is stopped
    expect(SoundEngine.getCurrentTrack().id).toBe('totoro_theme');
  });

  it('handles calling stopOhonaSong when ohona_song is not currently playing safely', () => {
    SoundEngine.playBGM();
    expect(SoundEngine.getCurrentTrack().id).toBe('totoro_theme');

    // Should not crash or unexpectedly alter track
    SoundEngine.stopOhonaSong();
    expect(SoundEngine.getCurrentTrack().id).toBe('totoro_theme');
  });
});
