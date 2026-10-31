// src/audio/AudioBusLayout.ts - 5-Bus Audio Graph (Master -> Music, SFX, Voice, Ambient) & Ducking

import { AudioBusName, BusVolumeConfig } from './types';

export class AudioBusLayout {
  private static instance: AudioBusLayout | null = null;

  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private buses: Map<AudioBusName, GainNode> = new Map();
  private busVolumes: BusVolumeConfig = {
    master: 1.0,
    music: 0.85,
    sfx: 0.90,
    voice: 0.95,
    ambient: 0.75,
  };

  private isDucked = false;
  private baseMusicVol = 0.85;

  private constructor() {
    this.initContextListeners();
  }

  public static getInstance(): AudioBusLayout {
    if (!AudioBusLayout.instance) {
      AudioBusLayout.instance = new AudioBusLayout();
    }
    return AudioBusLayout.instance;
  }

  public static linearToDb(linear: number): number {
    return 20 * Math.log10(Math.max(0.00001, linear));
  }

  public static dbToLinear(db: number): number {
    return Math.pow(10, db / 20);
  }

  public getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx({ latencyHint: 'interactive' });
      } catch {
        this.ctx = new AudioCtx();
      }

      this.buildAudioGraph();
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private buildAudioGraph(): void {
    if (!this.ctx) return;

    // 1. Master Output Gain
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(this.busVolumes.master, this.ctx.currentTime);
    this.buses.set('Master', masterGain);

    // 2. Dynamics Compressor on Master for punchy, distortion-free mixing
    if (this.ctx.createDynamicsCompressor) {
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -12;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 3;
      this.compressor.attack.value = 0.005;
      this.compressor.release.value = 0.15;
      masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);
    } else {
      masterGain.connect(this.ctx.destination);
    }

    // 3. Sub-Buses: Music, SFX, Voice, Ambient
    const subBuses: Array<{ name: AudioBusName; vol: number }> = [
      { name: 'Music', vol: this.busVolumes.music },
      { name: 'SFX', vol: this.busVolumes.sfx },
      { name: 'Voice', vol: this.busVolumes.voice },
      { name: 'Ambient', vol: this.busVolumes.ambient },
    ];

    for (const { name, vol } of subBuses) {
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(vol, this.ctx.currentTime);
      gainNode.connect(masterGain);
      this.buses.set(name, gainNode);
    }

    this.baseMusicVol = this.busVolumes.music;
  }

  public getBus(bus: AudioBusName): GainNode | null {
    this.getContext();
    return this.buses.get(bus) || null;
  }

  public setBusVolume(bus: AudioBusName, linear: number): void {
    const clamped = Math.max(0, Math.min(1, linear));
    if (bus === 'Master') this.busVolumes.master = clamped;
    else if (bus === 'Music') {
      this.busVolumes.music = clamped;
      if (!this.isDucked) this.baseMusicVol = clamped;
    } else if (bus === 'SFX') this.busVolumes.sfx = clamped;
    else if (bus === 'Voice') this.busVolumes.voice = clamped;
    else if (bus === 'Ambient') this.busVolumes.ambient = clamped;

    const gainNode = this.getBus(bus);
    if (gainNode && this.ctx) {
      const now = this.ctx.currentTime;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setTargetAtTime(clamped, now, 0.02);
    }
  }

  public getBusVolume(bus: AudioBusName): number {
    if (bus === 'Master') return this.busVolumes.master;
    if (bus === 'Music') return this.busVolumes.music;
    if (bus === 'SFX') return this.busVolumes.sfx;
    if (bus === 'Voice') return this.busVolumes.voice;
    return this.busVolumes.ambient;
  }

  public setBusVolumeDb(bus: AudioBusName, db: number): void {
    this.setBusVolume(bus, AudioBusLayout.dbToLinear(db));
  }

  public getBusVolumeDb(bus: AudioBusName): number {
    return AudioBusLayout.linearToDb(this.getBusVolume(bus));
  }

  public getAllVolumes(): BusVolumeConfig {
    return { ...this.busVolumes };
  }

  /**
   * Duck music when important voice dialogue or loud action plays.
   * e.g., -12dB over 0.3 seconds.
   */
  public duckMusic(duckDb = -12.0, durationSec = 0.3): void {
    const musicGain = this.getBus('Music');
    if (!musicGain || !this.ctx) return;

    this.isDucked = true;
    const duckLinear = AudioBusLayout.dbToLinear(duckDb);
    const targetGain = Math.max(0.0001, this.baseMusicVol * duckLinear);

    const now = this.ctx.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(musicGain.gain.value, now);
    musicGain.gain.linearRampToValueAtTime(targetGain, now + durationSec);
  }

  /**
   * Smoothly restores music volume to its pre-ducked base volume over durationSec.
   */
  public unduckMusic(durationSec = 0.5): void {
    const musicGain = this.getBus('Music');
    if (!musicGain || !this.ctx) return;

    this.isDucked = false;
    const targetGain = Math.max(0.0001, this.baseMusicVol);

    const now = this.ctx.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(musicGain.gain.value, now);
    musicGain.gain.linearRampToValueAtTime(targetGain, now + durationSec);
  }

  private initContextListeners(): void {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      this.getContext();
    };
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => {
      window.addEventListener(ev, unlock, { once: true, passive: true });
    });

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) {
          if (this.ctx.state === 'running') {
            this.ctx.suspend().catch(() => {});
          }
        } else if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      });
    }
  }
}
