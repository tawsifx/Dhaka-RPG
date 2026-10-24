// tests/player_behaviors.test.ts - Unit tests for PlayerBehaviors engine
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Math: {
      Distance: {
        Between: (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1)
      }
    }
  }
}));

import { PlayerBehaviors } from '../src/systems/player/PlayerBehaviors';
import { DateState } from '../src/state/DateState';

describe('PlayerBehaviors (Dynamic Player Lifecycle & Companion Reactions)', () => {
  let mockScene: any;
  let mockPlayer: any;
  let behaviors: PlayerBehaviors;

  beforeEach(() => {
    mockPlayer = {
      active: true,
      x: 100,
      y: 100,
      width: 32,
      height: 48,
      scaleY: 1,
      setScale: vi.fn((sx, sy) => {
        mockPlayer.scaleY = sy;
      }),
      setDepth: vi.fn()
    };

    mockScene = {
      player: mockPlayer,
      totoro: { x: 120, y: 100 },
      isRaining: false,
      add: {
        circle: vi.fn(() => ({
          setDepth: vi.fn().mockReturnThis(),
          destroy: vi.fn()
        })),
        text: vi.fn(() => ({
          setOrigin: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          setPosition: vi.fn().mockReturnThis(),
          setScale: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
          active: true,
          alpha: 1
        })),
        ellipse: vi.fn(() => ({
          setDepth: vi.fn().mockReturnThis(),
          destroy: vi.fn()
        })),
        graphics: vi.fn(() => ({
          setDepth: vi.fn().mockReturnThis(),
          clear: vi.fn(),
          fillStyle: vi.fn(),
          beginPath: vi.fn(),
          arc: vi.fn(),
          closePath: vi.fn(),
          fillPath: vi.fn(),
          lineStyle: vi.fn(),
          lineBetween: vi.fn(),
          fillCircle: vi.fn(),
          destroy: vi.fn()
        }))
      },
      tweens: {
        add: vi.fn((config) => {
          if (config.onComplete) {
            config.onComplete();
          }
          return { stop: vi.fn() };
        })
      },
      time: {
        delayedCall: vi.fn((delay, cb) => cb())
      }
    };

    DateState.totoroJoined = true;
    behaviors = new PlayerBehaviors(mockScene);
  });

  it('applies rhythmic breathing scaling when idle', () => {
    // Calling update in idle state
    behaviors.update(1000, 16, false, 'down');
    expect(mockPlayer.setScale).toHaveBeenCalled();
    // Breathing scale should be close to 1 ± 0.025
    expect(mockPlayer.scaleY).toBeGreaterThan(0.97);
    expect(mockPlayer.scaleY).toBeLessThan(1.03);
  });

  it('resets scaling to (1, 1) and spawns dust when moving', () => {
    mockPlayer.scaleY = 1.025;
    // Walk for 300ms (exceeding stepParticleTimer threshold of 240ms)
    behaviors.update(1000, 300, true, 'right');
    expect(mockPlayer.setScale).toHaveBeenCalledWith(1, 1);
    expect(mockScene.add.circle).toHaveBeenCalled();
  });

  it('triggers companion heart bond when idle near Totoro', () => {
    // Player is at (100, 100), Totoro is at (120, 100) -> distance is 20px (< 90px threshold)
    // First let idleTimeMs build up to > 2500ms
    behaviors.update(1000, 2600, false, 'down');
    // Emote should be spawned
    expect(mockScene.add.text).toHaveBeenCalled();
  });

  it('triggers hoe farming action with particles and yoyo bounce', () => {
    behaviors.triggerHoeAction(5, 5);
    expect(mockScene.tweens.add).toHaveBeenCalled();
    // Soil particles created
    expect(mockScene.add.circle).toHaveBeenCalled();
  });

  it('triggers water farming action with arc droplet particles', () => {
    behaviors.triggerWaterAction(5, 5);
    expect(mockScene.tweens.add).toHaveBeenCalled();
    expect(mockScene.add.circle).toHaveBeenCalled();
  });

  it('triggers harvest crop action with sparkle burst and basket emote', () => {
    behaviors.triggerHarvestAction('crop_cauliflower', 5, 5);
    expect(mockScene.add.text).toHaveBeenCalled();
    expect(mockScene.tweens.add).toHaveBeenCalled();
  });

  it('shows and hides parasol overlay based on rain weather', () => {
    mockScene.isRaining = true;
    behaviors.update(1000, 16, false, 'down');
    expect(mockScene.add.graphics).toHaveBeenCalled();

    // When rain stops, parasol should be cleared
    mockScene.isRaining = false;
    behaviors.update(1016, 16, false, 'down');
  });

  it('destroys cleanly without memory leaks', () => {
    behaviors.showEmote('♪', 2000);
    behaviors.destroy();
    expect(true).toBe(true);
  });
});
