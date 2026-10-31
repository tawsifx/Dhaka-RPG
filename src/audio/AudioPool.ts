// src/audio/AudioPool.ts - Fixed-Size Preallocated Voice Pool with Priority Stealing

import { AudioBusName, AudioVoice } from './types';
import { AudioBusLayout } from './AudioBusLayout';

export class AudioPool {
  private static instance: AudioPool | null = null;
  public static readonly POOL_SIZE = 16;

  private voices: AudioVoice[] = [];
  private busLayout: AudioBusLayout;

  private constructor() {
    this.busLayout = AudioBusLayout.getInstance();
    this.initPool();
  }

  public static getInstance(): AudioPool {
    if (!AudioPool.instance) {
      AudioPool.instance = new AudioPool();
    }
    return AudioPool.instance;
  }

  private initPool(): void {
    const ctx = this.busLayout.getContext();
    if (!ctx) return;

    for (let i = 0; i < AudioPool.POOL_SIZE; i++) {
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(1.0, ctx.currentTime);
      const defaultBus = this.busLayout.getBus('SFX');
      if (defaultBus) gainNode.connect(defaultBus);

      this.voices.push({
        id: i,
        sourceNode: null,
        gainNode,
        busName: 'SFX',
        priority: 0,
        isPlaying: false,
        startTime: 0,
      });
    }
  }

  /**
   * Plays an AudioBuffer using a pooled voice channel.
   * If all channels are busy, steals the voice with the lowest priority.
   */
  public playBuffer(
    buffer: AudioBuffer,
    options: {
      volume?: number;
      pitch?: number;
      bus?: AudioBusName;
      priority?: number;
    } = {}
  ): AudioVoice | null {
    const ctx = this.busLayout.getContext();
    if (!ctx) return null;

    if (this.voices.length === 0) {
      this.initPool();
    }

    const {
      volume = 1.0,
      pitch = 1.0,
      bus = 'SFX',
      priority = 1.0,
    } = options;

    // 1. Find free voice
    let voiceIdx = this.voices.findIndex(v => !v.isPlaying);

    // 2. If pool is exhausted, steal the lowest priority active voice
    if (voiceIdx === -1) {
      let lowestPriority = Infinity;
      let oldestTime = Infinity;

      for (let i = 0; i < this.voices.length; i++) {
        const v = this.voices[i];
        if (v.priority < lowestPriority || (v.priority === lowestPriority && v.startTime < oldestTime)) {
          lowestPriority = v.priority;
          oldestTime = v.startTime;
          voiceIdx = i;
        }
      }

      // If lowest active priority is higher than requested, drop sound
      if (lowestPriority > priority) {
        return null;
      }

      // Stop previous sound on stolen voice
      const stolen = this.voices[voiceIdx];
      if (stolen.sourceNode) {
        try {
          stolen.sourceNode.stop();
          stolen.sourceNode.disconnect();
        } catch {}
        stolen.sourceNode = null;
      }
    }

    const voice = this.voices[voiceIdx];

    // Re-route bus if target bus differs from voice's current bus
    if (voice.busName !== bus) {
      try {
        voice.gainNode.disconnect();
        const targetBus = this.busLayout.getBus(bus);
        if (targetBus) {
          voice.gainNode.connect(targetBus);
        }
        voice.busName = bus;
      } catch {}
    }

    // Configure Voice Gain
    const now = ctx.currentTime;
    voice.gainNode.gain.cancelScheduledValues(now);
    voice.gainNode.gain.setValueAtTime(Math.max(0.0001, Math.min(1.0, volume)), now);

    // Create & Configure BufferSourceNode
    const srcNode = ctx.createBufferSource();
    srcNode.buffer = buffer;
    srcNode.playbackRate.setValueAtTime(Math.max(0.2, Math.min(3.0, pitch)), now);
    srcNode.connect(voice.gainNode);

    voice.sourceNode = srcNode;
    voice.priority = priority;
    voice.isPlaying = true;
    voice.startTime = now;

    srcNode.onended = () => {
      if (voice.sourceNode === srcNode) {
        voice.isPlaying = false;
        voice.priority = 0;
        voice.sourceNode = null;
        try {
          srcNode.disconnect();
        } catch {}
      }
    };

    srcNode.start(0);
    return voice;
  }

  public getActiveVoicesCount(): number {
    return this.voices.filter(v => v.isPlaying).length;
  }
}
