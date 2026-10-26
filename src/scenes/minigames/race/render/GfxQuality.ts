/**
 * GfxQuality.ts
 * Graphics quality preset manager for Tring-Tring Grand Prix (Milestone 3.5).
 * Supports URL param ?race-gfx=low|med|high with automatic fallback.
 */

export type GfxQualityLevel = 'low' | 'med' | 'high';

export interface GfxSettings {
  level: GfxQualityLevel;
  shadows: boolean;
  maxAnisotropy: number;
  propDensity: number; // 0.0 to 1.0
  particleMultiplier: number;
  enableBloomDecals: boolean;
}

export class GfxQuality {
  private static currentLevel: GfxQualityLevel = 'high';

  static getLevel(): GfxQualityLevel {
    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('race-gfx')?.toLowerCase();
      if (q === 'low' || q === 'med' || q === 'high') {
        this.currentLevel = q as GfxQualityLevel;
      }
    }
    return this.currentLevel;
  }

  static setLevel(level: GfxQualityLevel): void {
    this.currentLevel = level;
  }

  static getSettings(): GfxSettings {
    const level = this.getLevel();
    switch (level) {
      case 'low':
        return {
          level: 'low',
          shadows: false,
          maxAnisotropy: 1,
          propDensity: 0.35,
          particleMultiplier: 0.25,
          enableBloomDecals: false
        };
      case 'med':
        return {
          level: 'med',
          shadows: true,
          maxAnisotropy: 4,
          propDensity: 0.70,
          particleMultiplier: 0.60,
          enableBloomDecals: true
        };
      case 'high':
      default:
        return {
          level: 'high',
          shadows: true,
          maxAnisotropy: 8,
          propDensity: 1.0,
          particleMultiplier: 1.0,
          enableBloomDecals: true
        };
    }
  }
}
