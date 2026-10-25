// src/scenes/minigames/race/audio/RaceAudio.ts - Sample-based audio layer with procedural synth fallback
import { SoundEngine } from '../../../../audio/SoundEngine';
import { KartState, CountdownState } from '../../../../types/race.types';

export interface RaceAudioSampleMap {
  engineLoop: AudioBuffer | null;
  driftScreech: AudioBuffer | null;
  wallBump: AudioBuffer | null;
  landingThump: AudioBuffer | null;
  boostWhoosh: AudioBuffer | null;
  countdownBeep: AudioBuffer | null;
  chime1: AudioBuffer | null;
  chime2: AudioBuffer | null;
  chime3: AudioBuffer | null;
  grassRumble: AudioBuffer | null;
}

export class RaceAudio {
  private ctx: AudioContext | null = null;

  // External sample buffers
  private samples: RaceAudioSampleMap = {
    engineLoop: null,
    driftScreech: null,
    wallBump: null,
    landingThump: null,
    boostWhoosh: null,
    countdownBeep: null,
    chime1: null,
    chime2: null,
    chime3: null,
    grassRumble: null,
  };

  // Active loop sources
  private engineSource: AudioBufferSourceNode | null = null;
  private engineGain: GainNode | null = null;
  private driftSource: AudioBufferSourceNode | null = null;
  private driftGain: GainNode | null = null;
  private grassSource: AudioBufferSourceNode | null = null;
  private grassGain: GainNode | null = null;

  // Procedural synth fallbacks
  private synthEngineOsc: OscillatorNode | null = null;
  private synthEngineGain: GainNode | null = null;
  private synthDriftNoise: AudioBufferSourceNode | null = null;
  private synthDriftGain: GainNode | null = null;

  private lastTier = 0;
  private wasBoosting = false;
  private wasAirborne = false;
  private lastCountdownCount = -1;
  private wasColliding = false;
  private isDisposed = false;

  constructor() {
    this.initAudio();
  }

  private initAudio(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      this.ctx = new AudioContextClass();

      // Master engine gain
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      this.engineGain.connect(this.ctx.destination);

      // Master drift gain
      this.driftGain = this.ctx.createGain();
      this.driftGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.driftGain.connect(this.ctx.destination);

      // Master grass rumble gain
      this.grassGain = this.ctx.createGain();
      this.grassGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.grassGain.connect(this.ctx.destination);

      // Initialize procedural synth fallbacks immediately so audio works before samples finish loading
      this.initSynthFallbacks();

      // Asynchronously load external CC0 audio samples
      this.loadExternalSamples();
    } catch {
      // Audio context disabled or restricted by user interaction policy
    }
  }

  private initSynthFallbacks(): void {
    if (!this.ctx) return;
    try {
      // Procedural Sawtooth Engine Synth Fallback
      this.synthEngineOsc = this.ctx.createOscillator();
      this.synthEngineOsc.type = 'sawtooth';
      this.synthEngineOsc.frequency.setValueAtTime(65, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, this.ctx.currentTime);

      this.synthEngineGain = this.ctx.createGain();
      this.synthEngineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      this.synthEngineOsc.connect(filter);
      filter.connect(this.synthEngineGain);
      if (this.engineGain) {
        this.synthEngineGain.connect(this.engineGain);
      }
      this.synthEngineOsc.start();

      // Procedural White Noise Drift Synth Fallback
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      this.synthDriftNoise = this.ctx.createBufferSource();
      this.synthDriftNoise.buffer = noiseBuffer;
      this.synthDriftNoise.loop = true;
      this.synthDriftNoise.start();

      const driftFilter = this.ctx.createBiquadFilter();
      driftFilter.type = 'bandpass';
      driftFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
      driftFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

      this.synthDriftGain = this.ctx.createGain();
      this.synthDriftGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      this.synthDriftNoise.connect(driftFilter);
      driftFilter.connect(this.synthDriftGain);
      if (this.driftGain) {
        this.synthDriftGain.connect(this.driftGain);
      }
    } catch {
      // Synth fallback initialization error
    }
  }

  private async loadExternalSamples(): Promise<void> {
    if (!this.ctx) return;

    const sampleFiles: Array<[keyof RaceAudioSampleMap, string]> = [
      ['engineLoop', 'assets/race/audio/engine_loop.ogg'],
      ['driftScreech', 'assets/race/audio/drift_screech.ogg'],
      ['wallBump', 'assets/race/audio/wall_bump.ogg'],
      ['landingThump', 'assets/race/audio/landing_thump.ogg'],
      ['boostWhoosh', 'assets/race/audio/boost_whoosh.ogg'],
      ['countdownBeep', 'assets/race/audio/countdown_beep.ogg'],
      ['chime1', 'assets/race/audio/turbo_chime_1.ogg'],
      ['chime2', 'assets/race/audio/turbo_chime_2.ogg'],
      ['chime3', 'assets/race/audio/turbo_chime_3.ogg'],
      ['grassRumble', 'assets/race/audio/grass_rumble.ogg'],
    ];

    await Promise.all(
      sampleFiles.map(async ([key, url]) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const arrayBuffer = await res.arrayBuffer();
          if (this.isDisposed || !this.ctx) return;
          const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
          this.samples[key] = audioBuffer;

          // If engine loop sample loaded successfully, activate sample loop and silence synth engine
          if (key === 'engineLoop') {
            this.startSampleEngineLoop(audioBuffer);
          } else if (key === 'driftScreech') {
            this.startSampleDriftLoop(audioBuffer);
          } else if (key === 'grassRumble') {
            this.startSampleGrassLoop(audioBuffer);
          }
        } catch {
          // Keep synth fallback active on network/decode failure
        }
      })
    );
  }

  private startSampleEngineLoop(buffer: AudioBuffer): void {
    if (!this.ctx || !this.engineGain || this.isDisposed) return;
    try {
      if (this.engineSource) {
        this.engineSource.stop();
        this.engineSource.disconnect();
      }
      this.engineSource = this.ctx.createBufferSource();
      this.engineSource.buffer = buffer;
      this.engineSource.loop = true;
      this.engineSource.playbackRate.setValueAtTime(0.8, this.ctx.currentTime);
      this.engineSource.connect(this.engineGain);
      this.engineSource.start();

      // Mute synth engine oscillator since sample is running
      if (this.synthEngineGain) {
        this.synthEngineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
    } catch {
      // Keep synth active on failure
    }
  }

  private startSampleDriftLoop(buffer: AudioBuffer): void {
    if (!this.ctx || !this.driftGain || this.isDisposed) return;
    try {
      if (this.driftSource) {
        this.driftSource.stop();
        this.driftSource.disconnect();
      }
      this.driftSource = this.ctx.createBufferSource();
      this.driftSource.buffer = buffer;
      this.driftSource.loop = true;
      this.driftSource.connect(this.driftGain);
      this.driftSource.start();

      // Mute synth drift noise since sample is running
      if (this.synthDriftGain) {
        this.synthDriftGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
    } catch {
      // Keep synth active
    }
  }

  private startSampleGrassLoop(buffer: AudioBuffer): void {
    if (!this.ctx || !this.grassGain || this.isDisposed) return;
    try {
      if (this.grassSource) {
        this.grassSource.stop();
        this.grassSource.disconnect();
      }
      this.grassSource = this.ctx.createBufferSource();
      this.grassSource.buffer = buffer;
      this.grassSource.loop = true;
      this.grassSource.playbackRate.setValueAtTime(1.2, this.ctx.currentTime);
      this.grassSource.connect(this.grassGain);
      this.grassSource.start();
    } catch {
      // Ignore
    }
  }

  private playBufferOneShot(buffer: AudioBuffer | null, volume = 0.25): boolean {
    if (!this.ctx || !buffer || this.isDisposed) return false;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      source.connect(gain);
      gain.connect(this.ctx.destination);
      source.start();
      return true;
    } catch {
      return false;
    }
  }

  playBeep(freq: number, durationSec: number): void {
    if (!this.ctx || this.isDisposed) return;
    // Attempt external sample first
    if (this.samples.countdownBeep && this.playBufferOneShot(this.samples.countdownBeep, 0.2)) {
      return;
    }

    // Procedural sine beep fallback
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + durationSec);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + durationSec);
    } catch {
      // Ignore audio failure
    }
  }

  playWhoosh(): void {
    if (!this.ctx || this.isDisposed) return;
    // Attempt external boost whoosh sample first
    if (this.samples.boostWhoosh && this.playBufferOneShot(this.samples.boostWhoosh, 0.28)) {
      return;
    }

    // Procedural pitch whoosh fallback
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(750, this.ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.45);
    } catch {
      // Ignore
    }
  }

  playThump(): void {
    if (!this.ctx || this.isDisposed) return;
    // Attempt external landing thump sample first
    if (this.samples.landingThump && this.playBufferOneShot(this.samples.landingThump, 0.35)) {
      return;
    }

    // Procedural low-frequency drop fallback
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch {
      // Ignore
    }
  }

  playWallBump(): void {
    if (!this.ctx || this.isDisposed) return;
    if (this.samples.wallBump && this.playBufferOneShot(this.samples.wallBump, 0.3)) {
      return;
    }
    // Fallback: brief low-pitch impact
    this.playThump();
  }

  playBell(): void {
    SoundEngine.rickshawBell();
  }

  update(kart: KartState, countdown?: CountdownState): void {
    if (!this.ctx || this.isDisposed) return;

    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;

      // 1. Countdown beeps & GO bell cue
      if (countdown && countdown.phase === 'ready' && countdown.count !== this.lastCountdownCount) {
        this.lastCountdownCount = countdown.count;
        if (countdown.count === 3 || countdown.count === 2 || countdown.count === 1) {
          this.playBeep(440, 0.15); // A4 beep
        }
      } else if (countdown && countdown.phase === 'go' && this.lastCountdownCount !== 0) {
        this.lastCountdownCount = 0;
        this.playBell(); // Rickshaw bell on GO!
      }

      const speedRatio = Math.max(0, Math.min(1.5, Math.abs(kart.speed) / 28.0));

      // 2. Engine RPM Modulation
      if (this.engineGain) {
        const targetGain = Math.abs(kart.speed) > 0.5 ? 0.08 : 0.03;
        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05);

        // If sample source is active, modulate playback rate
        if (this.engineSource) {
          const targetRate = 0.7 + speedRatio * 1.3 + (kart.boost.active ? 0.3 : 0);
          this.engineSource.playbackRate.setTargetAtTime(targetRate, now, 0.05);
        } else if (this.synthEngineOsc && this.synthEngineGain) {
          // Modulate synth oscillator frequency
          const targetFreq = 55 + speedRatio * 180 + (kart.boost.active ? 60 : 0);
          this.synthEngineOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);
          this.synthEngineGain.gain.setTargetAtTime(targetGain, now, 0.05);
        }
      }

      // 3. Drift Screech Gain scaling
      if (this.driftGain) {
        const isDrifting = kart.drift && kart.drift.isDrifting && Math.abs(kart.speed) > 6;
        const targetDriftGain = isDrifting ? 0.12 : 0.0;
        this.driftGain.gain.setTargetAtTime(targetDriftGain, now, 0.08);

        // If sample source is active, modulate pitch slightly by speed
        if (this.driftSource) {
          this.driftSource.playbackRate.setTargetAtTime(0.9 + speedRatio * 0.3, now, 0.08);
        }

        // Tier-up chime trigger
        if (kart.drift && kart.drift.tier > this.lastTier) {
          const tier = kart.drift.tier;
          if (tier === 1) {
            if (!this.playBufferOneShot(this.samples.chime1, 0.25)) this.playBeep(659.25, 0.2); // E5
          } else if (tier === 2) {
            if (!this.playBufferOneShot(this.samples.chime2, 0.28)) this.playBeep(830.61, 0.2); // G#5
          } else if (tier >= 3) {
            if (!this.playBufferOneShot(this.samples.chime3, 0.32)) this.playBeep(1046.5, 0.25); // C6
          }
        }
        this.lastTier = kart.drift ? kart.drift.tier : 0;
      }

      // 4. Off-road grass rumble loop
      if (this.grassGain && this.grassSource) {
        const isOffroad = (kart.surface === 'grass' || kart.surface === 'mud') && Math.abs(kart.speed) > 3;
        const targetGrassGain = isOffroad ? 0.15 : 0.0;
        this.grassGain.gain.setTargetAtTime(targetGrassGain, now, 0.08);
      }

      // 5. Boost activation sound
      if (kart.boost.active && !this.wasBoosting) {
        this.playWhoosh();
      }
      this.wasBoosting = kart.boost.active;

      // 6. Landing thump
      if (this.wasAirborne && (!kart.air || !kart.air.isAirborne)) {
        this.playThump();
      }
      this.wasAirborne = Boolean(kart.air && kart.air.isAirborne);
    } catch {
      // Audio processing catch
    }
  }

  dispose(): void {
    this.isDisposed = true;
    try {
      if (this.engineSource) {
        this.engineSource.stop();
        this.engineSource.disconnect();
      }
      if (this.driftSource) {
        this.driftSource.stop();
        this.driftSource.disconnect();
      }
      if (this.grassSource) {
        this.grassSource.stop();
        this.grassSource.disconnect();
      }
      if (this.synthEngineOsc) {
        this.synthEngineOsc.stop();
        this.synthEngineOsc.disconnect();
      }
      if (this.synthDriftNoise) {
        this.synthDriftNoise.stop();
        this.synthDriftNoise.disconnect();
      }
      if (this.ctx) {
        this.ctx.close();
      }
    } catch {
      // Ignore dispose errors
    }
    this.ctx = null;
    this.engineGain = null;
    this.driftGain = null;
    this.grassGain = null;
    this.engineSource = null;
    this.driftSource = null;
    this.grassSource = null;
    this.synthEngineOsc = null;
    this.synthEngineGain = null;
    this.synthDriftNoise = null;
    this.synthDriftGain = null;
  }
}
