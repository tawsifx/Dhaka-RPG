// src/audio/SoundEngine.ts - Modern Web Audio API Engine with 5-Bus Architecture, Dynamic Music System & AudioPool
declare const Phaser: any;

import { AudioBusName, MusicState, BGMTrack } from './types';
import { AudioBusLayout } from './AudioBusLayout';
import { AudioPool } from './AudioPool';
import { RandomizedAudio } from './RandomizedAudio';
import { DynamicMusicSystem } from './DynamicMusicSystem';

export type { AudioBusName, MusicState, BGMTrack };
export { AudioBusLayout } from './AudioBusLayout';
export { AudioPool } from './AudioPool';
export { RandomizedAudio } from './RandomizedAudio';
export { DynamicMusicSystem } from './DynamicMusicSystem';

export const SoundEngine = (() => {
  const busLayout = AudioBusLayout.getInstance();
  const audioPool = AudioPool.getInstance();
  const musicSystem = DynamicMusicSystem.getInstance();

  let sharedNoiseBuffer: AudioBuffer | null = null;
  const sfxBufferCache = new Map<string, AudioBuffer>();
  const sfxLoadingPromises = new Map<string, Promise<AudioBuffer | null>>();

  const SFX_MAP: Record<string, string> = {
    slash: 'assets/audio/sfx/slash.wav',
    thrust: 'assets/audio/sfx/thrust.wav',
    spin: 'assets/audio/sfx/spin.wav',
    dash: 'assets/audio/sfx/dash.wav',
    enemy_hit: 'assets/audio/sfx/enemy_hit.wav',
    player_hurt: 'assets/audio/sfx/player_hurt.wav',
    level_up: 'assets/audio/sfx/level_up.wav',
    totoro_roar: 'assets/audio/sfx/totoro_roar.wav',
    totoro_slam: 'assets/audio/sfx/totoro_slam.wav',
    tea_clink: 'assets/audio/sfx/tea_clink.wav',
    crunch_fuchka: 'assets/audio/sfx/crunch_fuchka.wav',
    rickshaw_bell: 'assets/audio/sfx/rickshaw_bell.wav',
    water_splash: 'assets/audio/sfx/water_splash.wav',
    portal_warp: 'assets/audio/sfx/portal_warp.wav',
    select: 'assets/audio/sfx/select.wav',
    item_get: 'assets/audio/sfx/item_get.wav'
  };

  function getCtx(): AudioContext | null {
    return busLayout.getContext();
  }

  function getSharedNoiseBuffer(c: AudioContext): AudioBuffer {
    if (!sharedNoiseBuffer || sharedNoiseBuffer.sampleRate !== c.sampleRate) {
      const length = c.sampleRate * 2;
      sharedNoiseBuffer = c.createBuffer(1, length, c.sampleRate);
      const data = sharedNoiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return sharedNoiseBuffer;
  }

  function loadSfxBuffer(key: string, src: string, c: AudioContext): Promise<AudioBuffer | null> {
    if (sfxBufferCache.has(key)) {
      return Promise.resolve(sfxBufferCache.get(key)!);
    }
    if (sfxLoadingPromises.has(key)) {
      return sfxLoadingPromises.get(key)!;
    }
    if (typeof fetch === 'undefined') {
      return Promise.resolve(null);
    }

    const promise = fetch(src)
      .then(res => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then(buf => c.decodeAudioData(buf))
      .then(decoded => {
        sfxBufferCache.set(key, decoded);
        sfxLoadingPromises.delete(key);
        return decoded;
      })
      .catch(() => {
        sfxLoadingPromises.delete(key);
        return null;
      });

    sfxLoadingPromises.set(key, promise);
    return promise;
  }

  function playExternalSfx(key: string, volMult = 1.0, bus: AudioBusName = 'SFX', priority = 1.0): boolean {
    const src = SFX_MAP[key];
    if (!src) return false;

    const c = getCtx();
    if (!c) return false;

    const cached = sfxBufferCache.get(key);
    if (cached) {
      audioPool.playBuffer(cached, { volume: volMult, bus, priority });
      return true;
    }

    loadSfxBuffer(key, src, c).then(buf => {
      if (buf) {
        audioPool.playBuffer(buf, { volume: volMult, bus, priority });
      }
    });
    return true;
  }

  function tone(
    freq: number,
    freqEnd: number | null,
    type: OscillatorType,
    dur: number,
    vol = 0.08,
    delay = 0,
    bus: AudioBusName = 'SFX'
  ): void {
    const c = getCtx();
    if (!c || freq <= 0) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd && freqEnd !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    }
    const peak = Math.max(0.0002, vol);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    const busGain = busLayout.getBus(bus) || c.destination;
    osc.connect(gain);
    gain.connect(busGain);

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
    };

    osc.start(t0);
    osc.stop(t0 + dur + 0.015);
  }

  function noiseBurst(dur: number, cutoff = 700, vol = 0.05, delay = 0, bus: AudioBusName = 'SFX'): void {
    const c = getCtx();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const buf = getSharedNoiseBuffer(c);
    const playDur = Math.min(dur, buf.duration);
    const maxOffset = Math.max(0, buf.duration - playDur - 0.01);
    const offset = maxOffset > 0 ? Math.random() * maxOffset : 0;

    const src = c.createBufferSource();
    src.buffer = buf;

    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t0);

    const gain = c.createGain();
    gain.gain.setValueAtTime(Math.max(0.0002, vol), t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + playDur);

    const busGain = busLayout.getBus(bus) || c.destination;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(busGain);

    src.onended = () => {
      try {
        src.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch {}
    };

    src.start(t0, offset, playDur);
  }

  return {
    unlock: () => getCtx(),
    isBGMOn: () => musicSystem.isBGMOn(),

    // Dynamic Music System Integration
    playMenuBGM: () => musicSystem.playMenuBGM(),
    fadeOutMenuBGM: (durationMs = 320, callback?: () => void) => musicSystem.fadeOutMenuBGM(durationMs, callback),
    playBGM: (trackId: string | null = null) => musicSystem.playBGM(trackId),
    stopBGM: () => musicSystem.stopBGM(),
    toggleBGM: () => musicSystem.toggleBGM(),
    setTheme: (theme: string) => musicSystem.setTheme(theme),
    playTrack: (trackId: string, manual = true, startTimeSec?: number) => musicSystem.playTrack(trackId, manual, startTimeSec),
    playOhonaSong: (startTimeSec = 20) => musicSystem.playOhonaSong(startTimeSec),
    stopOhonaSong: (restoreTheme = true) => musicSystem.stopOhonaSong(restoreTheme),
    setAutoTheme: (auto: boolean) => musicSystem.setAutoTheme(auto),
    getCurrentTrack: () => musicSystem.getCurrentTrack(),
    getAllTracks: () => musicSystem.getAllTracks(),
    isAutoThemeEnabled: () => musicSystem.isAutoThemeEnabled(),

    // Interactive Dynamic Music States & Stems
    setMusicState: (state: MusicState, fadeTimeSec = 1.5) => musicSystem.setMusicState(state, fadeTimeSec),
    getMusicState: () => musicSystem.getMusicState(),
    setCombatIntensity: (intensity: number) => musicSystem.setCombatIntensity(intensity),
    getCombatIntensity: () => musicSystem.getCombatIntensity(),
    transitionAtNextBar: (bpm = 112, currentBeat = 0, onBarTransition: () => void = () => {}) =>
      musicSystem.transitionAtNextBar(bpm, currentBeat, onBarTransition),

    // Subsystem Accessors
    getDynamicMusicSystem: () => musicSystem,
    getAudioBusLayout: () => busLayout,
    getAudioPool: () => audioPool,

    // Bus Volumes & Decibel Controls
    setVolumes: (m: number, s: number) => {
      busLayout.setBusVolume('Music', m);
      busLayout.setBusVolume('SFX', s);
    },
    getVolumes: () => ({
      musicVol: busLayout.getBusVolume('Music'),
      sfxVol: busLayout.getBusVolume('SFX'),
    }),
    setBusVolume: (bus: AudioBusName, vol: number) => busLayout.setBusVolume(bus, vol),
    getBusVolume: (bus: AudioBusName) => busLayout.getBusVolume(bus),
    getAllBusVolumes: () => busLayout.getAllVolumes(),

    // Smart Music Ducking
    duckBGM: (ratio = 0.2, fadeMs = 300): void => {
      const db = AudioBusLayout.linearToDb(Math.max(0.01, ratio));
      busLayout.duckMusic(db, fadeMs / 1000);
    },
    restoreBGM: (fadeMs = 300): void => {
      busLayout.unduckMusic(fadeMs / 1000);
    },
    duckMusic: (duckDb = -12.0, durationSec = 0.3): void => {
      busLayout.duckMusic(duckDb, durationSec);
    },
    unduckMusic: (durationSec = 0.5): void => {
      busLayout.unduckMusic(durationSec);
    },

    // Atmospheric SFX & Anti-Machine-Gun Randomized Footsteps
    step: (surface = 'grass') => {
      const sfxVol = busLayout.getBusVolume('SFX');
      const pitchVariance = RandomizedAudio.getRandomPitch([0.92, 1.08]);
      const volMultiplier = RandomizedAudio.getRandomVolumeLinear([-2.5, 0.0]);
      const effectiveVol = sfxVol * volMultiplier;

      if (surface === 'puddle') {
        noiseBurst(0.06, 950 * pitchVariance, 0.08 * effectiveVol, 0, 'Ambient');
      } else if (surface === 'pier') {
        const baseFreq = 110 + RandomizedAudio.randRange(-10, 15);
        tone(baseFreq * pitchVariance, (baseFreq / 2) * pitchVariance, 'triangle', 0.06, 0.065 * effectiveVol, 0, 'Ambient');
      } else if (surface === 'path') {
        const baseFreq = 280 + RandomizedAudio.randRange(-25, 35);
        tone(baseFreq * pitchVariance, (baseFreq / 2) * pitchVariance, 'sine', 0.035, 0.038 * effectiveVol, 0, 'Ambient');
      } else {
        noiseBurst(0.045, 550 * pitchVariance, 0.032 * effectiveVol, 0, 'Ambient');
      }
    },

    thunder: () => {
      const sfxVol = busLayout.getBusVolume('SFX');
      noiseBurst(0.9, 280, 0.22, 0, 'Ambient');
      tone(85, 28, 'sawtooth', 0.95, 0.15 * sfxVol, 0.06, 'Ambient');
      tone(55, 20, 'triangle', 1.25, 0.18 * sfxVol, 0.12, 'Ambient');
    },

    blip: (pitch = 480, wave: OscillatorType | string = 'sine') => {
      const voiceVol = busLayout.getBusVolume('Voice');
      const pitchJitter = pitch + RandomizedAudio.randRange(-20, 25);
      tone(pitchJitter, pitch, wave as OscillatorType, 0.04, 0.045 * voiceVol, 0, 'Voice');
    },

    select: () => {
      playExternalSfx('select', 0.85, 'SFX', 2.0);
      tone(540, 790, 'triangle', 0.05, 0.04 * busLayout.getBusVolume('SFX'), 0, 'SFX');
    },

    attackSlash: () => {
      playExternalSfx('slash', 0.95, 'SFX', 1.5);
      noiseBurst(0.08, 1500, 0.05, 0, 'SFX');
    },

    attackThrust: () => {
      playExternalSfx('thrust', 0.95, 'SFX', 1.5);
      noiseBurst(0.06, 2400, 0.05, 0, 'SFX');
    },

    attackSpin: () => {
      playExternalSfx('spin', 1.0, 'SFX', 1.5);
      noiseBurst(0.12, 1100, 0.06, 0.01, 'SFX');
    },

    dashWhoosh: () => {
      playExternalSfx('dash', 0.9, 'SFX', 1.2);
      noiseBurst(0.08, 900, 0.04, 0, 'SFX');
    },

    enemyHit: () => {
      playExternalSfx('enemy_hit', 1.0, 'SFX', 2.0);
      tone(220, 95, 'square', 0.07, 0.05 * busLayout.getBusVolume('SFX'), 0, 'SFX');
    },

    playerHurt: () => {
      playExternalSfx('player_hurt', 1.0, 'Voice', 2.5);
      tone(185, 80, 'sawtooth', 0.12, 0.06 * busLayout.getBusVolume('Voice'), 0, 'Voice');
    },

    portalWarp: () => {
      playExternalSfx('portal_warp', 1.0, 'SFX', 2.0);
      const sfxVol = busLayout.getBusVolume('SFX');
      [330, 440, 554.37, 659.25, 880].forEach((f, i) => tone(f, f * 1.15, 'triangle', 0.15, 0.04 * sfxVol, i * 0.05, 'SFX'));
    },

    levelUp: () => {
      playExternalSfx('level_up', 1.0, 'Voice', 3.0);
      const sfxVol = busLayout.getBusVolume('SFX');
      [440, 554.37, 659.25, 880, 1046.5].forEach((f, i) => tone(f, f, 'triangle', 0.2, 0.05 * sfxVol, i * 0.07, 'Voice'));
    },

    alertExclaim: () => {
      const voiceVol = busLayout.getBusVolume('Voice');
      tone(620, 980, 'square', 0.09, 0.085 * voiceVol, 0, 'Voice');
      tone(980, 1180, 'square', 0.14, 0.085 * voiceVol, 0.08, 'Voice');
    },

    totoroRoar: () => {
      playExternalSfx('totoro_roar', 1.0, 'Voice', 2.8);
      tone(135, 62, 'sawtooth', 0.25, 0.08 * busLayout.getBusVolume('Voice'), 0, 'Voice');
    },

    totoroSlam: () => {
      playExternalSfx('totoro_slam', 1.0, 'SFX', 2.5);
      noiseBurst(0.25, 220, 0.12, 0.02, 'SFX');
    },

    scurryAway: () => {
      const sfxVol = busLayout.getBusVolume('SFX');
      [0, 0.07, 0.14, 0.21, 0.28].forEach((d, i) => {
        tone(320 + i * 75, 480 + i * 80, 'triangle', 0.055, 0.07 * sfxVol, d, 'SFX');
      });
    },

    teaClink: () => {
      playExternalSfx('tea_clink', 0.95, 'SFX', 1.2);
      tone(1120, 1080, 'sine', 0.05, 0.04 * busLayout.getBusVolume('SFX'), 0, 'SFX');
    },

    crunchFuchka: () => {
      playExternalSfx('crunch_fuchka', 1.0, 'SFX', 1.2);
      noiseBurst(0.06, 1200, 0.04, 0, 'SFX');
    },

    guitarChord: () => {
      const sfxVol = busLayout.getBusVolume('SFX');
      [261.63, 329.63, 392.00, 493.88, 659.25].forEach((f, i) => {
        tone(f, f * 0.998, 'triangle', 0.55, 0.08 * sfxVol, i * 0.055, 'Ambient');
      });
    },

    starChime: () => {
      const sfxVol = busLayout.getBusVolume('SFX');
      [587.33, 880, 1174.66, 1567.98].forEach((f, i) => {
        tone(f, f * 1.01, 'sine', 0.32, 0.09 * sfxVol, i * 0.065, 'Ambient');
      });
    },

    catMeow: () => {
      const voiceVol = busLayout.getBusVolume('Voice');
      tone(680, 920, 'triangle', 0.14, 0.09 * voiceVol, 0, 'Voice');
      tone(920, 540, 'sine', 0.22, 0.09 * voiceVol, 0.13, 'Voice');
    },

    cameraShutter: () => {
      const sfxVol = busLayout.getBusVolume('SFX');
      noiseBurst(0.04, 1800, 0.12, 0, 'SFX');
      tone(1200, 600, 'sine', 0.05, 0.07 * sfxVol, 0.04, 'SFX');
    },

    brushStroke: () => {
      const sfxVol = busLayout.getBusVolume('SFX');
      noiseBurst(0.11, 900, 0.06, 0, 'SFX');
      tone(440, 660, 'sine', 0.12, 0.06 * sfxVol, 0.04, 'SFX');
    },

    waterSplash: () => {
      playExternalSfx('water_splash', 0.95, 'SFX', 1.5);
      noiseBurst(0.15, 480, 0.04, 0, 'SFX');
    },

    waterDroplet: () => {
      tone(1200 + Math.random() * 400, 680, 'sine', 0.045, 0.045 * busLayout.getBusVolume('SFX'), 0, 'Ambient');
    },

    cricketChirp: () => {
      const ambVol = busLayout.getBusVolume('Ambient');
      [0, 0.035, 0.07].forEach((d) => {
        tone(4600 + Math.random() * 250, 4300, 'sine', 0.016, 0.012 * ambVol, d, 'Ambient');
      });
    },

    distantRickshawBell: () => {
      const ambVol = busLayout.getBusVolume('Ambient');
      tone(1820, 1800, 'sine', 0.12, 0.02 * ambVol, 0, 'Ambient');
      tone(2720, 2680, 'triangle', 0.11, 0.015 * ambVol, 0.025, 'Ambient');
      tone(1820, 1800, 'sine', 0.12, 0.02 * ambVol, 0.11, 'Ambient');
    },

    rickshawBell: () => {
      playExternalSfx('rickshaw_bell', 0.95, 'SFX', 1.5);
      tone(1760, 1740, 'sine', 0.1, 0.04 * busLayout.getBusVolume('SFX'), 0, 'SFX');
    },

    itemFanfare: () => {
      playExternalSfx('item_get', 0.95, 'SFX', 2.8);
      const sfxVol = busLayout.getBusVolume('SFX');
      [523.25, 587.33, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, f, 'triangle', 0.18, 0.05 * sfxVol, i * 0.085, 'SFX'));
    },

    harvestCrop: () => {
      const sfxVol = busLayout.getBusVolume('SFX');
      tone(523.25, 659.25, 'triangle', 0.12, 0.08 * sfxVol, 0, 'SFX');
      tone(783.99, 1046.5, 'sine', 0.18, 0.06 * sfxVol, 0.06, 'SFX');
    },

    heartUp: () => {
      const sfxVol = busLayout.getBusVolume('SFX');
      [440, 554.37, 659.25, 880].forEach((f, i) => {
        tone(f, f * 1.01, 'sine', 0.22, 0.1 * sfxVol, i * 0.07, 'SFX');
      });
    },

    spookyChime: () => {
      const sfxVol = busLayout.getBusVolume('SFX');
      [311.13, 369.99, 440.00, 587.33].forEach((f, i) => {
        tone(f, f * 0.98, 'sine', 0.65, 0.07 * sfxVol, i * 0.09, 'Ambient');
      });
    },

    bellToll: () => {
      const sfxVol = busLayout.getBusVolume('SFX');
      tone(440, 436, 'triangle', 0.85, 0.12 * sfxVol, 0, 'Ambient');
      tone(880, 874, 'sine', 0.65, 0.08 * sfxVol, 0.02, 'Ambient');
      tone(220, 218, 'sine', 1.1, 0.14 * sfxVol, 0.04, 'Ambient');
    },

    radioStatic: () => {
      const sfxVol = busLayout.getBusVolume('SFX');
      noiseBurst(0.35, 3200, 0.1, 0, 'Ambient');
      tone(520, 580, 'sawtooth', 0.22, 0.05 * sfxVol, 0.08, 'Ambient');
      tone(680, 480, 'square', 0.18, 0.04 * sfxVol, 0.2, 'Ambient');
    },

    ghostWhisper: () => {
      const sfxVol = busLayout.getBusVolume('SFX');
      tone(180, 240, 'sine', 0.9, 0.08 * sfxVol, 0, 'Ambient');
      tone(240, 160, 'triangle', 0.9, 0.06 * sfxVol, 0.25, 'Ambient');
    }
  };
})();

if (typeof window !== 'undefined') {
  (window as any).SoundEngine = SoundEngine;
}
