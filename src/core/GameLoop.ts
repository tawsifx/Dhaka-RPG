// src/core/GameLoop.ts - Fixed timestep physics accumulator loop
// Pattern: Fixed Timestep Game Loop with Accumulator from game-arch-patterns
// Based on Glenn Fiedler's "Fix Your Timestep!" (2004)

export class FixedTimestepLoop {
  public static readonly DEFAULT_PHYSICS_DELTA: number = 1.0 / 60.0; // 60Hz
  public static readonly DEFAULT_MAX_DELTA: number = 0.25;          // 250ms clamp to avoid spiral-of-death

  private _physicsDelta: number;
  private _maxDelta: number;
  private _accumulator: number = 0.0;
  private _alpha: number = 0.0;

  constructor(
    physicsDelta: number = FixedTimestepLoop.DEFAULT_PHYSICS_DELTA,
    maxDelta: number = FixedTimestepLoop.DEFAULT_MAX_DELTA
  ) {
    this._physicsDelta = physicsDelta;
    this._maxDelta = maxDelta;
  }

  /**
   * Clamp a variable frame delta to prevent spiral-of-death during lag or tab blur.
   */
  public clampDelta(deltaSeconds: number): number {
    return Math.min(Math.max(0, deltaSeconds), this._maxDelta);
  }

  /**
   * Run the fixed timestep integration loop with rendering interpolation.
   */
  public update(
    rawDeltaSeconds: number,
    physicsStepCallback: (stepDelta: number) => void,
    renderInterpolateCallback?: (alpha: number) => void
  ): void {
    const frameTime = this.clampDelta(rawDeltaSeconds);
    this._accumulator += frameTime;

    // Consume accumulated time in discrete deterministic physics chunks
    while (this._accumulator >= this._physicsDelta) {
      physicsStepCallback(this._physicsDelta);
      this._accumulator -= this._physicsDelta;
    }

    // Alpha interpolation fraction for rendering between physics ticks
    this._alpha = this._accumulator / this._physicsDelta;
    if (renderInterpolateCallback) {
      renderInterpolateCallback(this._alpha);
    }
  }

  public get alpha(): number {
    return this._alpha;
  }

  public get accumulator(): number {
    return this._accumulator;
  }

  public reset(): void {
    this._accumulator = 0.0;
    this._alpha = 0.0;
  }
}

/** Global standard GameLoop instance */
export const GameLoop = new FixedTimestepLoop();
