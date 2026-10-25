// src/scenes/minigames/race/input/RaceInput.ts - Consolidated keyboard, touch & gamepad input
import { KartInput } from '../../../../types/race.types';

export class RaceInput {
  private keysDown: Set<string> = new Set();
  private bellRequested = false;
  private exitRequested = false;

  // Touch / Virtual inputs
  private virtualThrottle = 0;
  private virtualBrake = 0;
  private virtualSteer = 0;

  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;

  constructor() {
    this.onKeyDownBound = this.onKeyDown.bind(this);
    this.onKeyUpBound = this.onKeyUp.bind(this);

    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keysDown.add(e.code);

    if (e.code === 'Space') {
      this.bellRequested = true;
      e.preventDefault();
    } else if (e.code === 'Escape') {
      this.exitRequested = true;
      e.preventDefault();
    } else if (
      e.code === 'ArrowUp' ||
      e.code === 'ArrowDown' ||
      e.code === 'ArrowLeft' ||
      e.code === 'ArrowRight'
    ) {
      e.preventDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keysDown.delete(e.code);
  }

  setVirtualThrottle(val: number): void {
    this.virtualThrottle = Math.max(0, Math.min(1, val));
  }

  setVirtualBrake(val: number): void {
    this.virtualBrake = Math.max(0, Math.min(1, val));
  }

  setVirtualSteer(val: number): void {
    this.virtualSteer = Math.max(-1, Math.min(1, val));
  }

  triggerBell(): void {
    this.bellRequested = true;
  }

  triggerExit(): void {
    this.exitRequested = true;
  }

  poll(): KartInput {
    // Keyboard inputs
    const isW = this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp');
    const isS = this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown');
    const isA = this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft');
    const isD = this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight');

    const keyThrottle = isW ? 1 : 0;
    const keyBrake = isS ? 1 : 0;
    const keySteer = (isD ? 1 : 0) - (isA ? 1 : 0);

    const throttle = Math.max(keyThrottle, this.virtualThrottle);
    const brake = Math.max(keyBrake, this.virtualBrake);
    const steer = Math.abs(this.virtualSteer) > 0 ? this.virtualSteer : keySteer;

    const bell = this.bellRequested;
    this.bellRequested = false;

    const exit = this.exitRequested;
    this.exitRequested = false;

    return {
      throttle,
      brake,
      steer,
      bell,
      exit
    };
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    this.keysDown.clear();
  }
}
