// src/scenes/minigames/race/audio/RaceAudio.ts - Web Audio synthesizer & SFX layer for kart feel
import { SoundEngine } from '../../../../audio/SoundEngine';
import { KartState, CountdownState } from '../../../../types/race.types';

export class RaceAudio {
  private ctx: AudioContext | null = null;
  private engineGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private driftGain: GainNode | null = null;
  private driftNoiseNode: AudioNode | null = null;

  private lastTier = 0;
  private wasBoosting = false;
  private wasAirborne = false;
  private lastCountdownCount = -1;

  constructor() {
    this.initAudio();
  }

  private initAudio(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      this.ctx = new AudioContextClass();

      // 1. Engine Sound (Sawtooth wave through low-pass filter)
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(65, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, this.ctx.currentTime);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();

      // 2. Drift Screech Noise Synth
      this.driftGain = this.ctx.createGain();
      this.driftGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

      // Create white noise buffer for tire friction
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;
      whiteNoise.start();

      const driftFilter = this.ctx.createBiquadFilter();
      driftFilter.type = 'bandpass';
      driftFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
      driftFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

      whiteNoise.connect(driftFilter);
      driftFilter.connect(this.driftGain);
      this.driftGain.connect(this.ctx.destination);
      this.driftNoiseNode = whiteNoise;
    } catch {
      // Audio context disabled or restricted by user interaction policy
    }
  }

  playBeep(freq: number, durationSec: number): void {
    if (!this.ctx) return;
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
    if (!this.ctx) return;
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
    if (!this.ctx) return;
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

  update(kart: KartState, countdown?: CountdownState): void {
    if (!this.ctx) return;

    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;

      // 1. Countdown beeps
      if (countdown && countdown.phase === 'ready' && countdown.count !== this.lastCountdownCount) {
        this.lastCountdownCount = countdown.count;
        if (countdown.count === 3 || countdown.count === 2 || countdown.count === 1) {
          this.playBeep(440, 0.15); // A4 beep
        }
      }

      // 2. Engine RPM Pitch scaling
      if (this.engineOsc && this.engineGain) {
        const speedRatio = Math.max(0, Math.min(1.5, Math.abs(kart.speed) / 28.0));
        const targetFreq = 55 + speedRatio * 180 + (kart.boost.active ? 60 : 0);
        this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);

        const targetGain = Math.abs(kart.speed) > 0.5 ? 0.06 : 0.02;
        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05);
      }

      // 3. Drift Screech Gain scaling
      if (this.driftGain) {
        const isDrifting = kart.drift && kart.drift.isDrifting && Math.abs(kart.speed) > 6;
        const targetDriftGain = isDrifting ? 0.08 : 0.0;
        this.driftGain.gain.setTargetAtTime(targetDriftGain, now, 0.08);

        // Tier-up chime trigger
        if (kart.drift && kart.drift.tier > this.lastTier) {
          const tier = kart.drift.tier;
          const chimeFreq = tier === 1 ? 659.25 : tier === 2 ? 830.61 : 1046.5; // E5, G#5, C6
          this.playBeep(chimeFreq, 0.2);
        }
        this.lastTier = kart.drift ? kart.drift.tier : 0;
      }

      // 4. Boost activation sound
      if (kart.boost.active && !this.wasBoosting) {
        this.playWhoosh();
      }
      this.wasBoosting = kart.boost.active;

      // 5. Landing thump
      if (this.wasAirborne && (!kart.air || !kart.air.isAirborne)) {
        this.playThump();
      }
      this.wasAirborne = Boolean(kart.air && kart.air.isAirborne);
    } catch {
      // Audio processing catch
    }
  }

  dispose(): void {
    try {
      if (this.engineOsc) {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      }
      if (this.driftNoiseNode && (this.driftNoiseNode as any).stop) {
        (this.driftNoiseNode as any).stop();
        this.driftNoiseNode.disconnect();
      }
      if (this.ctx) {
        this.ctx.close();
      }
    } catch {
      // Ignore dispose errors
    }
    this.ctx = null;
    this.engineGain = null;
    this.engineOsc = null;
    this.driftGain = null;
  }
}
