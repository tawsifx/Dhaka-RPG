// src/scenes/minigames/race/debug/ReplayRecorder.ts - Deterministic input recorder & golden replay runner
import { RaceActionInput, KartState } from '../../../../types/race.types';
import { KartController } from '../core/KartController';

export interface ReplayFrame {
  dt: number;
  input: RaceActionInput;
}

export interface ReplayData {
  version: 2;
  recordedAt: string;
  archetypeId: string;
  frameCount: number;
  frames: ReplayFrame[];
  finalState?: Partial<KartState>;
}

export class ReplayRecorder {
  private recording = false;
  private frames: ReplayFrame[] = [];
  private playbackIndex = 0;
  private archetypeId = 'balanced';

  isRecording(): boolean {
    return this.recording;
  }

  startRecording(archetypeId = 'balanced'): void {
    this.recording = true;
    this.archetypeId = archetypeId;
    this.frames = [];
  }

  recordFrame(dt: number, input: RaceActionInput): void {
    if (!this.recording) return;
    this.frames.push({
      dt,
      input: { ...input }
    });
  }

  stopRecording(finalState?: KartState): ReplayData {
    this.recording = false;
    return {
      version: 2,
      recordedAt: new Date().toISOString(),
      archetypeId: this.archetypeId,
      frameCount: this.frames.length,
      frames: [...this.frames],
      finalState: finalState
        ? {
            x: finalState.x,
            y: finalState.y,
            z: finalState.z,
            speed: finalState.speed,
            rotation: finalState.rotation
          }
        : undefined
    };
  }

  getFrames(): ReadonlyArray<ReplayFrame> {
    return this.frames;
  }

  exportJSON(finalState?: KartState): string {
    const data = this.stopRecording(finalState);
    return JSON.stringify(data);
  }

  static parseJSON(json: string): ReplayData {
    const data = JSON.parse(json) as ReplayData;
    if (!data.frames || !Array.isArray(data.frames)) {
      throw new Error('Invalid replay format: missing frames array');
    }
    return data;
  }

  /**
   * Runs replay deterministically against a KartController instance.
   * Returns final KartState after all frames are replayed.
   */
  static playHeadless(kart: KartController, replay: ReplayData): KartState {
    for (const frame of replay.frames) {
      kart.update(frame.dt, frame.input);
    }
    return kart.getState();
  }
}
