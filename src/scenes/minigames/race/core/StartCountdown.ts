// src/scenes/minigames/race/core/StartCountdown.ts - Pure 3-2-1-GO countdown & rocket start timing window
import { CountdownPhase, CountdownState } from '../../../../types/race.types';
import { KartConfig } from '../../../../types/race.types';
import { DEFAULT_KART_CONFIG } from '../../../../config/race.config';

export interface CountdownTickResult {
  state: CountdownState;
  justSaidGo: boolean;
  startBoostTriggered: boolean;
  stallTriggered: boolean;
}

export class StartCountdown {
  private config: KartConfig;
  private state: CountdownState = {
    phase: 'waiting',
    count: 3,
    timer: 0,
    canDrive: true,
    stalled: false,
    stallTimer: 0
  };

  private throttlePressedEarly = false;
  private perfectWindowHit = false;
  private goSignalled = false;

  constructor(config: Partial<KartConfig> = {}) {
    this.config = { ...DEFAULT_KART_CONFIG, ...config };
  }

  setConfig(config: Partial<KartConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getState(): Readonly<CountdownState> {
    return { ...this.state };
  }

  isDrivingAllowed(): boolean {
    return this.state.canDrive && !this.state.stalled;
  }

  isStalled(): boolean {
    return this.state.stalled;
  }

  start(): void {
    this.state = {
      phase: 'ready',
      count: 3,
      timer: 0,
      canDrive: false,
      stalled: false,
      stallTimer: 0
    };
    this.throttlePressedEarly = false;
    this.perfectWindowHit = false;
    this.goSignalled = false;
  }

  update(dt: number, throttleInput: number): CountdownTickResult {
    let justSaidGo = false;
    let startBoostTriggered = false;
    let stallTriggered = false;

    // Handle active stall countdown
    if (this.state.stalled) {
      this.state.stallTimer -= dt;
      if (this.state.stallTimer <= 0) {
        this.state.stalled = false;
        this.state.stallTimer = 0;
      }
    }

    if (this.state.phase === 'finished' || this.state.phase === 'waiting') {
      return {
        state: this.getState(),
        justSaidGo: false,
        startBoostTriggered: false,
        stallTriggered: false
      };
    }

    this.state.timer += dt;
    const t = this.state.timer;

    // Early acceleration tracking (before the perfect window)
    const goTime = 3.0; // 3.0s is GO!
    const windowStart = goTime - this.config.countdownPerfectWindowMs / 1000;
    const windowEnd = goTime + this.config.countdownPerfectWindowMs / 1000;

    if (t < windowStart && throttleInput > 0.2) {
      this.throttlePressedEarly = true;
    }

    if (t >= windowStart && t <= windowEnd && throttleInput > 0.3 && !this.throttlePressedEarly) {
      this.perfectWindowHit = true;
    }

    // Step state progression
    if (t < 1.0) {
      this.state.phase = 'ready';
      this.state.count = 3;
    } else if (t < 2.0) {
      this.state.phase = 'ready';
      this.state.count = 2;
    } else if (t < 3.0) {
      this.state.phase = 'set';
      this.state.count = 1;
    } else if (t < 4.2) {
      this.state.phase = 'go';
      this.state.count = 0;
      this.state.canDrive = true;

      if (!this.goSignalled) {
        this.goSignalled = true;
        justSaidGo = true;

        if (this.throttlePressedEarly) {
          // Engine stall spin-out penalty
          this.state.stalled = true;
          this.state.stallTimer = this.config.countdownStallDurationSec;
          stallTriggered = true;
        } else if (this.perfectWindowHit || throttleInput > 0.3) {
          // Perfect timing rocket start boost
          startBoostTriggered = true;
        }
      }
    } else {
      this.state.phase = 'finished';
      this.state.canDrive = true;
    }

    return {
      state: this.getState(),
      justSaidGo,
      startBoostTriggered,
      stallTriggered
    };
  }

  skipToDrive(): void {
    this.state.phase = 'finished';
    this.state.count = 0;
    this.state.canDrive = true;
    this.state.stalled = false;
    this.state.stallTimer = 0;
  }
}
