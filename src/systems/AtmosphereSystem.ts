// src/systems/AtmosphereSystem.ts - Pokémon HGSS & Stardew Valley Time-of-Day, Weather Lighting & Point-Light Halos
import Phaser from 'phaser';
import { TimeOfDay, WeatherType } from '../types/stardew.types';

export interface LightHaloSource {
  x: number;
  y: number;
  radius: number;
  color: number;
  intensity: number;
  pulseSpeed?: number;
  graphics?: Phaser.GameObjects.Arc;
}

export class AtmosphereSystem {
  private scene: Phaser.Scene;
  private ambientOverlay: Phaser.GameObjects.Rectangle | null = null;
  private lightSources: LightHaloSource[] = [];
  private currentPhase: TimeOfDay = 'afternoon';
  private currentWeather: WeatherType = 'sunny';
  private currentShadowConfig = { skewX: 0, scaleY: 0.8, alpha: 0.3 };
  private fireflies: Phaser.GameObjects.Arc[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Initializes the ambient overlay rectangle attached to camera viewport
   */
  init(): void {
    const cam = this.scene.cameras.main;
    const w = cam.width * 2;
    const h = cam.height * 2;

    this.ambientOverlay = this.scene.add
      .rectangle(0, 0, w, h, 0xffffff, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2900); // Below HUD (3000+) but above all game entities

    this.updateLighting(this.currentPhase, this.currentWeather, true);
  }

  /**
   * Register a warm point-light source (Edison bulbs, streetlamps, lantern rowboat, etc.)
   */
  registerLight(
    x: number,
    y: number,
    radius = 58,
    color = 0xfde68a,
    baseIntensity = 0.65,
    pulseSpeed = 0.003
  ): LightHaloSource {
    const halo = this.scene.add
      .circle(x, y, radius, color, 0)
      .setDepth(Math.max(y + 2, 2800));

    const source: LightHaloSource = {
      x,
      y,
      radius,
      color,
      intensity: baseIntensity,
      pulseSpeed,
      graphics: halo
    };

    this.lightSources.push(source);
    return source;
  }

  /**
   * Smoothly transitions lighting, color grading, and shadow parameters based on time phase and weather
   */
  updateLighting(phase: TimeOfDay, weather: WeatherType = 'sunny', immediate = false): void {
    this.currentPhase = phase;
    this.currentWeather = weather;

    let targetColor = 0xffffff;
    let targetAlpha = 0.0;
    let lightAlphaMultiplier = 0.1;
    let shadowSkewX = 0;
    let shadowScaleY = 0.8;
    let shadowAlpha = 0.3;

    // 1. Time-of-Day Color Grading & Shadow Math
    switch (phase) {
      case 'dawn':
        targetColor = 0xfbcfe8; // Soft peach-lavender dawn
        targetAlpha = 0.18;
        lightAlphaMultiplier = 0.45;
        shadowSkewX = -0.4;
        shadowScaleY = 1.25;
        shadowAlpha = 0.25;
        break;

      case 'morning':
        targetColor = 0xfef9c3; // Crisp golden Dhaka morning sunlight
        targetAlpha = 0.05;
        lightAlphaMultiplier = 0.1;
        shadowSkewX = -0.3;
        shadowScaleY = 1.1;
        shadowAlpha = 0.32;
        break;

      case 'afternoon':
        targetColor = 0xffedd5; // High noon warm amber
        targetAlpha = 0.04;
        lightAlphaMultiplier = 0.05;
        shadowSkewX = 0.05;
        shadowScaleY = 0.72; // Tight short vertical shadows
        shadowAlpha = 0.36;
        break;

      case 'sunset':
        targetColor = 0xf97316; // Rich Kalbaishakhi golden hour twilight
        targetAlpha = 0.32;
        lightAlphaMultiplier = 0.75;
        shadowSkewX = 0.55; // Long dramatic eastern shadows
        shadowScaleY = 1.45;
        shadowAlpha = 0.4;
        break;

      case 'night':
        targetColor = 0x1e1b4b; // Deep indigo starlight night
        targetAlpha = 0.54;
        lightAlphaMultiplier = 0.95;
        shadowSkewX = 0.0;
        shadowScaleY = 0.85;
        shadowAlpha = 0.22;
        break;

      case 'midnight':
        targetColor = 0x0f172a; // Mystic midnight navy
        targetAlpha = 0.64;
        lightAlphaMultiplier = 1.0;
        shadowSkewX = 0.0;
        shadowScaleY = 0.85;
        shadowAlpha = 0.18;
        break;
    }

    // 2. Weather Overrides (Kalbaishakhi Monsoon Storm)
    if (weather === 'monsoon' || weather === 'storm') {
      targetColor = 0x1e293b; // Heavy slate monsoon rain clouds
      targetAlpha = 0.58;
      lightAlphaMultiplier = 0.85;
      shadowSkewX = 0.0;
      shadowScaleY = 0.75;
      shadowAlpha = 0.15; // Diffuse overcast shadows
    }

    this.currentShadowConfig = {
      skewX: shadowSkewX,
      scaleY: shadowScaleY,
      alpha: shadowAlpha
    };

    if (this.ambientOverlay) {
      if (immediate) {
        this.ambientOverlay.setFillStyle(targetColor, targetAlpha);
      } else {
        this.scene.tweens.add({
          targets: this.ambientOverlay,
          alpha: targetAlpha,
          duration: 3000,
          ease: 'Sine.easeInOut',
          onStart: () => {
            this.ambientOverlay?.setFillStyle(targetColor, this.ambientOverlay.alpha);
          }
        });
      }
    }

    // Update light halos
    for (const light of this.lightSources) {
      if (!light.graphics) continue;
      const targetHaloAlpha = light.intensity * lightAlphaMultiplier;

      if (immediate) {
        light.graphics.setAlpha(targetHaloAlpha);
      } else {
        this.scene.tweens.add({
          targets: light.graphics,
          alpha: targetHaloAlpha,
          duration: 2500,
          ease: 'Sine.easeInOut'
        });
      }
    }

    // Manage fireflies during evening/night/twilight
    const shouldHaveFireflies = ['sunset', 'night', 'midnight'].includes(phase) && weather !== 'storm';
    this.setFirefliesActive(shouldHaveFireflies);
  }

  /**
   * Spawns or fades out floating bioluminescent fireflies
   */
  private setFirefliesActive(active: boolean): void {
    if (active && this.fireflies.length === 0) {
      const cam = this.scene.cameras.main;
      const count = 16;

      for (let i = 0; i < count; i++) {
        const x = Phaser.Math.Between(200, 2300);
        const y = Phaser.Math.Between(200, 1700);
        const ff = this.scene.add.circle(x, y, 2.5, 0xa7f3d0, 0).setDepth(2850);
        this.fireflies.push(ff);

        this.scene.tweens.add({
          targets: ff,
          alpha: { from: 0, to: Phaser.Math.FloatBetween(0.4, 0.85) },
          duration: Phaser.Math.Between(1500, 3000),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    } else if (!active && this.fireflies.length > 0) {
      this.fireflies.forEach(ff => {
        this.scene.tweens.add({
          targets: ff,
          alpha: 0,
          duration: 2000,
          onComplete: () => ff.destroy()
        });
      });
      this.fireflies = [];
    }
  }

  /**
   * Per-frame update: applies organic breathing pulse to Edison bulbs & streetlights
   */
  update(time: number, _delta: number): void {
    for (const light of this.lightSources) {
      if (!light.graphics || light.graphics.alpha <= 0.05) continue;
      const pulse = Math.sin(time * (light.pulseSpeed || 0.003)) * 0.06;
      light.graphics.setScale(1.0 + pulse);
    }

    // Drift fireflies in soft organic Lissajous curves
    for (let i = 0; i < this.fireflies.length; i++) {
      const ff = this.fireflies[i];
      if (!ff.active) continue;
      ff.x += Math.sin(time * 0.001 + i) * 0.4;
      ff.y += Math.cos(time * 0.0012 + i * 2) * 0.35;
    }
  }

  /**
   * Get current dynamic shadow parameters for entity shadow rendering
   */
  getShadowConfig(): { skewX: number; scaleY: number; alpha: number } {
    return { ...this.currentShadowConfig };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.ambientOverlay) {
      this.ambientOverlay.destroy();
      this.ambientOverlay = null;
    }
    this.lightSources.forEach(l => l.graphics?.destroy());
    this.lightSources = [];
    this.fireflies.forEach(f => f.destroy());
    this.fireflies = [];
  }
}
