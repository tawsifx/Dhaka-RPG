// src/scenes/minigames/race/ai/AiRng.ts - Pure, deterministic, serializable PRNG (Mulberry32)
export class AiRng {
  private state: number;

  constructor(seed = 1337) {
    this.state = seed >>> 0;
  }

  seed(seed: number): void {
    this.state = seed >>> 0;
  }

  getState(): number {
    return this.state;
  }

  setState(state: number): void {
    this.state = state >>> 0;
  }

  /**
   * Generates a pseudo-random 32-bit float in [0, 1)
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a pseudo-random integer in [min, max] inclusive
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generates a pseudo-random float in [min, max)
   */
  nextFloat(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}
