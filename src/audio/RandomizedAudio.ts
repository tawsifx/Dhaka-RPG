// src/audio/RandomizedAudio.ts - Machine-Gun Effect Prevention & Micro-Variations

import { AudioBusName, RandomizedAudioConfig } from './types';
import { AudioBusLayout } from './AudioBusLayout';
import { AudioPool } from './AudioPool';

export class RandomizedAudio {
  private static lastIndices: Map<string, number> = new Map();

  /**
   * Generates a random float in range [min, max]
   */
  public static randRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  /**
   * Calculates random pitch factor between pitchRange[0] and pitchRange[1] (default: 0.9 - 1.1)
   */
  public static getRandomPitch(range: [number, number] = [0.9, 1.1]): number {
    return RandomizedAudio.randRange(range[0], range[1]);
  }

  /**
   * Calculates random linear gain multiplier from a dB variance range (default: -3dB to 0dB)
   */
  public static getRandomVolumeLinear(rangeDb: [number, number] = [-3.0, 0.0]): number {
    const randomDb = RandomizedAudio.randRange(rangeDb[0], rangeDb[1]);
    return AudioBusLayout.dbToLinear(randomDb);
  }

  /**
   * Chooses an index from an array of variants, guaranteeing no immediate consecutive repeats.
   */
  public static pickVariantIndex(groupKey: string, variantCount: number): number {
    if (variantCount <= 1) return 0;
    const last = RandomizedAudio.lastIndices.get(groupKey) ?? -1;
    let next = Math.floor(Math.random() * variantCount);
    if (next === last) {
      next = (next + 1) % variantCount;
    }
    RandomizedAudio.lastIndices.set(groupKey, next);
    return next;
  }

  /**
   * Plays a sound from a set of AudioBuffers with randomized pitch, volume variance, and repeat suppression.
   */
  public static playVariedBuffer(
    groupKey: string,
    buffers: AudioBuffer[],
    config: RandomizedAudioConfig = {},
    baseVolume = 1.0,
    priority = 1.0
  ): void {
    if (!buffers || buffers.length === 0) return;

    const variantIdx = RandomizedAudio.pickVariantIndex(groupKey, buffers.length);
    const chosenBuffer = buffers[variantIdx];

    const pitchRange = config.pitchRange ?? [0.9, 1.1];
    const volumeRangeDb = config.volumeRangeDb ?? [-3.0, 0.0];
    const bus: AudioBusName = config.bus ?? 'SFX';

    const pitch = RandomizedAudio.getRandomPitch(pitchRange);
    const volumeMult = RandomizedAudio.getRandomVolumeLinear(volumeRangeDb);
    const finalVolume = baseVolume * volumeMult;

    AudioPool.getInstance().playBuffer(chosenBuffer, {
      volume: finalVolume,
      pitch,
      bus,
      priority,
    });
  }
}
