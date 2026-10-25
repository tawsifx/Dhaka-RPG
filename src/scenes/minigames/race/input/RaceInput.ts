// src/scenes/minigames/race/input/RaceInput.ts - Action-map input manager (Keyboard, Gamepad API & Touch)
import { RaceActionInput } from '../../../../types/race.types';

export class RaceInput {
  private keysDown: Set<string> = new Set();
  private bellRequested = false;
  private exitRequested = false;
  private resetRequested = false;

  // Touch & Virtual Action state
  private virtualThrottle = 0;
  private virtualBrake = 0;
  private virtualSteer = 0;
  private virtualDrift = false;
  private virtualLookBehind = false;
  private virtualTrick = false;
  private autoAccelerate = false;

  // Gamepad state
  private activeGamepadIndex: number | null = null;
  private readonly stickDeadzone = 0.15;

  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onGamepadConnectedBound: (e: GamepadEvent) => void;
  private onGamepadDisconnectedBound: (e: GamepadEvent) => void;

  constructor() {
    this.onKeyDownBound = this.onKeyDown.bind(this);
    this.onKeyUpBound = this.onKeyUp.bind(this);
    this.onGamepadConnectedBound = this.onGamepadConnected.bind(this);
    this.onGamepadDisconnectedBound = this.onGamepadDisconnected.bind(this);

    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    window.addEventListener('gamepadconnected', this.onGamepadConnectedBound);
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnectedBound);
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keysDown.add(e.code);

    if (e.code === 'Space') {
      this.bellRequested = true;
      e.preventDefault();
    } else if (e.code === 'Escape') {
      this.exitRequested = true;
      e.preventDefault();
    } else if (e.code === 'KeyR') {
      this.resetRequested = true;
      e.preventDefault();
    } else if (
      e.code === 'ArrowUp' ||
      e.code === 'ArrowDown' ||
      e.code === 'ArrowLeft' ||
      e.code === 'ArrowRight' ||
      e.code === 'ShiftLeft' ||
      e.code === 'ShiftRight'
    ) {
      e.preventDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keysDown.delete(e.code);
  }

  private onGamepadConnected(e: GamepadEvent): void {
    this.activeGamepadIndex = e.gamepad.index;
  }

  private onGamepadDisconnected(e: GamepadEvent): void {
    if (this.activeGamepadIndex === e.gamepad.index) {
      this.activeGamepadIndex = null;
    }
  }

  // ── Touch / Virtual Controls API ───────────────────────────────────────────
  setAutoAccelerate(enabled: boolean): void {
    this.autoAccelerate = enabled;
  }

  isAutoAccelerate(): boolean {
    return this.autoAccelerate;
  }

  toggleAutoAccelerate(): boolean {
    this.autoAccelerate = !this.autoAccelerate;
    return this.autoAccelerate;
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

  setVirtualDrift(active: boolean): void {
    this.virtualDrift = active;
  }

  setVirtualLookBehind(active: boolean): void {
    this.virtualLookBehind = active;
  }

  setVirtualTrick(active: boolean): void {
    this.virtualTrick = active;
  }

  triggerBell(): void {
    this.bellRequested = true;
  }

  triggerExit(): void {
    this.exitRequested = true;
  }

  triggerReset(): void {
    this.resetRequested = true;
  }

  /**
   * Samples keyboard, touch, and connected gamepad to build consolidated action input.
   */
  poll(): RaceActionInput {
    // 1. Keyboard mappings
    const keyW = this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp');
    const keyS = this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown');
    const keyA = this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft');
    const keyD = this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight');
    const keyShift =
      this.keysDown.has('ShiftLeft') ||
      this.keysDown.has('ShiftRight') ||
      this.keysDown.has('KeyK');
    const keyC = this.keysDown.has('KeyC');

    let kbThrottle = keyW ? 1.0 : 0.0;
    let kbBrake = keyS ? 1.0 : 0.0;
    let kbSteer = (keyD ? 1.0 : 0.0) - (keyA ? 1.0 : 0.0);
    let kbDrift = keyShift;
    let kbLookBehind = keyC;

    // 2. Gamepad API sampling
    let padThrottle = 0;
    let padBrake = 0;
    let padSteer = 0;
    let padDrift = false;
    let padBell = false;
    let padLookBehind = false;
    let padExit = false;

    if (navigator.getGamepads) {
      const pads = navigator.getGamepads();
      const gp = this.activeGamepadIndex !== null ? pads[this.activeGamepadIndex] : pads[0];
      if (gp && gp.connected) {
        // Left stick X axis
        const axisX = gp.axes[0] || 0;
        if (Math.abs(axisX) > this.stickDeadzone) {
          const norm = (Math.abs(axisX) - this.stickDeadzone) / (1 - this.stickDeadzone);
          // Cubic response curve for fine center precision
          padSteer = Math.sign(axisX) * Math.pow(norm, 2.5);
        }

        // D-pad steering fallback
        if (gp.buttons[14]?.pressed) padSteer = -1.0;
        if (gp.buttons[15]?.pressed) padSteer = 1.0;

        // Triggers & Face Buttons
        // Right Trigger (7) or Button A (0) = Throttle
        padThrottle = Math.max(gp.buttons[7]?.value || 0, gp.buttons[0]?.pressed ? 1.0 : 0);

        // Left Trigger (6) or Button X (2) = Brake
        padBrake = Math.max(gp.buttons[6]?.value || 0, gp.buttons[2]?.pressed ? 1.0 : 0);

        // Right Bumper (5) or Left Bumper (4) = Drift
        padDrift = Boolean(gp.buttons[5]?.pressed || gp.buttons[4]?.pressed);

        // Button B (1) = Bell
        if (gp.buttons[1]?.pressed) padBell = true;

        // Button Y (3) = Look Behind
        if (gp.buttons[3]?.pressed) padLookBehind = true;

        // Start button (9) = Exit
        if (gp.buttons[9]?.pressed) padExit = true;
      }
    }

    // 3. Consolidated Action Mapping
    let throttle = Math.max(
      kbThrottle,
      this.virtualThrottle,
      padThrottle,
      this.autoAccelerate ? 1.0 : 0.0
    );

    // If braking, override auto-accelerate
    const brake = Math.max(kbBrake, this.virtualBrake, padBrake);
    if (brake > 0.1 && this.autoAccelerate && kbThrottle === 0 && padThrottle === 0 && this.virtualThrottle === 0) {
      throttle = 0;
    }

    const steer =
      Math.abs(this.virtualSteer) > 0.01
        ? this.virtualSteer
        : Math.abs(padSteer) > 0.01
        ? padSteer
        : kbSteer;

    const drift = kbDrift || this.virtualDrift || padDrift;
    const lookBehind = kbLookBehind || this.virtualLookBehind || padLookBehind;
    const trick = this.virtualTrick || drift;

    const bell = this.bellRequested || padBell;
    this.bellRequested = false;

    const exit = this.exitRequested || padExit;
    this.exitRequested = false;

    const reset = this.resetRequested;
    this.resetRequested = false;

    return {
      throttle,
      brake,
      steer,
      drift,
      bell,
      lookBehind,
      trick,
      exit,
      reset
    };
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    window.removeEventListener('gamepadconnected', this.onGamepadConnectedBound);
    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnectedBound);
    this.keysDown.clear();
  }
}
