// src/scenes/minigames/race/track/RaceStateMachine.ts - Full race lifecycle state machine
import { RacePhase } from '../../../../types/race.types';

export interface RaceStateMachineListener {
  onPhaseChange?: (oldPhase: RacePhase, newPhase: RacePhase) => void;
  onFinalLap?: () => void;
  onRaceFinished?: () => void;
}

export class RaceStateMachine {
  private phase: RacePhase = 'loading';
  private phaseTimer = 0;
  private introDurationSec: number;
  private isFinalLap = false;
  private listeners: RaceStateMachineListener[] = [];

  constructor(introDurationSec = 2.0) {
    this.introDurationSec = introDurationSec;
  }

  addListener(listener: RaceStateMachineListener): void {
    this.listeners.push(listener);
  }

  getPhase(): RacePhase {
    return this.phase;
  }

  getPhaseTimer(): number {
    return this.phaseTimer;
  }

  isRacing(): boolean {
    return this.phase === 'racing';
  }

  isFinished(): boolean {
    return this.phase === 'finished' || this.phase === 'results';
  }

  transitionTo(newPhase: RacePhase): void {
    if (this.phase === newPhase) return;
    const oldPhase = this.phase;
    this.phase = newPhase;
    this.phaseTimer = 0;

    for (const listener of this.listeners) {
      listener.onPhaseChange?.(oldPhase, newPhase);
    }
  }

  notifyTrackLoaded(): void {
    if (this.phase === 'loading') {
      this.transitionTo('intro');
    }
  }

  notifyCountdownStart(): void {
    if (this.phase === 'intro') {
      this.transitionTo('countdown');
    }
  }

  startCountdown(): void {
    this.transitionTo('countdown');
  }

  finish(): void {
    this.transitionTo('finished');
    for (const listener of this.listeners) {
      listener.onRaceFinished?.();
    }
  }

  notifyGo(): void {
    if (this.phase === 'countdown') {
      this.transitionTo('racing');
    }
  }

  notifyFinalLap(): void {
    if (!this.isFinalLap) {
      this.isFinalLap = true;
      for (const listener of this.listeners) {
        listener.onFinalLap?.();
      }
    }
  }

  notifyFinish(): void {
    if (this.phase === 'racing') {
      this.transitionTo('finished');
      for (const listener of this.listeners) {
        listener.onRaceFinished?.();
      }
    }
  }

  showResults(): void {
    if (this.phase === 'finished') {
      this.transitionTo('results');
    }
  }

  update(dt: number): void {
    this.phaseTimer += dt;

    // Automatic transition from intro to countdown after intro duration
    if (this.phase === 'intro' && this.phaseTimer >= this.introDurationSec) {
      this.transitionTo('countdown');
    }

    // Automatic transition from finished to results after 3 seconds
    if (this.phase === 'finished' && this.phaseTimer >= 3.0) {
      this.transitionTo('results');
    }
  }

  reset(): void {
    this.phase = 'loading';
    this.phaseTimer = 0;
    this.isFinalLap = false;
  }
}
