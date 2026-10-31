// tests/core/core_architecture.test.ts - Verification of core architecture patterns
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  EventBus,
  TypedEventBus,
  GameStateStack,
  GameState,
  Services,
  ServiceLocator,
  FixedTimestepLoop,
  Entity,
  HealthComponent,
  MovementComponent
} from '../../src/core';

describe('EventBus (Decoupled Signal System)', () => {
  let bus: TypedEventBus;

  beforeEach(() => {
    bus = new TypedEventBus();
  });

  it('subscribes and receives typed event payloads', () => {
    const handler = vi.fn();
    const unsub = bus.on('player:health-changed', handler);

    bus.emit('player:health-changed', { current: 80, max: 100, delta: -20 });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ current: 80, max: 100, delta: -20 });

    unsub();
    bus.emit('player:health-changed', { current: 60, max: 100, delta: -20 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('fires once listeners exactly once', () => {
    const handler = vi.fn();
    bus.once('cutscene:started', handler);

    bus.emit('cutscene:started', { cutsceneId: 'intro_dhaka' });
    bus.emit('cutscene:started', { cutsceneId: 'intro_dhaka_2' });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ cutsceneId: 'intro_dhaka' });
  });

  it('tracks listener counts and clears listeners cleanly', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    bus.on('game:pause', fn1);
    bus.once('game:pause', fn2);

    expect(bus.listenerCount('game:pause')).toBe(2);
    bus.clear('game:pause');
    expect(bus.listenerCount('game:pause')).toBe(0);
  });
});

describe('GameStateStack (Hierarchical FSM & State Stack)', () => {
  let stack: GameStateStack;

  beforeEach(() => {
    stack = new GameStateStack(GameState.GAMEPLAY);
  });

  it('initializes with baseline GAMEPLAY state', () => {
    expect(stack.currentState()).toBe(GameState.GAMEPLAY);
    expect(stack.isGameplayActive()).toBe(true);
    expect(stack.depth()).toBe(1);
  });

  it('pushes DIALOGUE and pauses active gameplay', () => {
    const enterFn = vi.fn();
    const exitFn = vi.fn();

    stack.onEnter(GameState.DIALOGUE, enterFn);
    stack.onExit(GameState.GAMEPLAY, exitFn);

    stack.pushState(GameState.DIALOGUE, { speaker: 'Nadia' });

    expect(exitFn).toHaveBeenCalledWith(GameState.DIALOGUE, GameState.GAMEPLAY, { speaker: 'Nadia' });
    expect(enterFn).toHaveBeenCalledWith(GameState.DIALOGUE, GameState.GAMEPLAY, { speaker: 'Nadia' });
    expect(stack.currentState()).toBe(GameState.DIALOGUE);
    expect(stack.isGameplayActive()).toBe(false);
    expect(stack.depth()).toBe(2);
  });

  it('pops state back to previous state gracefully', () => {
    stack.pushState(GameState.INVENTORY);
    expect(stack.currentState()).toBe(GameState.INVENTORY);

    const popped = stack.popState();
    expect(popped?.state).toBe(GameState.INVENTORY);
    expect(stack.currentState()).toBe(GameState.GAMEPLAY);
    expect(stack.isGameplayActive()).toBe(true);
  });

  it('does not pop below the baseline state', () => {
    const popped = stack.popState();
    expect(popped).toBeUndefined();
    expect(stack.currentState()).toBe(GameState.GAMEPLAY);
  });
});

describe('ServiceLocator (Controlled Global Access)', () => {
  let locator: ServiceLocator;

  beforeEach(() => {
    locator = new ServiceLocator();
  });

  it('registers and retrieves services', () => {
    const mockAudio = { playBGM: vi.fn() };
    locator.register('Audio', mockAudio);

    expect(locator.has('Audio')).toBe(true);
    expect(locator.get('Audio')).toBe(mockAudio);
  });

  it('uses Null Service when real service is not yet registered', () => {
    const nullSave = { save: vi.fn(() => false) };
    locator.registerNullService('SaveSystem', nullSave);

    expect(locator.has('SaveSystem')).toBe(true);
    const saveService = locator.get<typeof nullSave>('SaveSystem');
    expect(saveService.save()).toBe(false);
  });

  it('throws error on unregistered service without null fallback', () => {
    expect(() => locator.get('NonExistentService')).toThrowError(/not registered/);
    expect(locator.tryGet('NonExistentService')).toBeUndefined();
  });
});

describe('FixedTimestepLoop (Glenn Fiedler Accumulator)', () => {
  let loop: FixedTimestepLoop;

  beforeEach(() => {
    loop = new FixedTimestepLoop(1.0 / 60.0, 0.25);
  });

  it('clamps large delta time to prevent spiral-of-death during lag spikes', () => {
    // 2.0 seconds lag spike clamped to max delta 0.25
    expect(loop.clampDelta(2.0)).toBe(0.25);
    // Normal 16ms delta passes through
    expect(loop.clampDelta(0.016)).toBeCloseTo(0.016, 3);
  });

  it('steps physics in fixed discrete increments', () => {
    const stepFn = vi.fn();
    const renderFn = vi.fn();

    // Pass 1/30 second (~33.3ms) -> should produce 2 physics steps of 1/60 (~16.6ms)
    loop.update(1.0 / 30.0, stepFn, renderFn);

    expect(stepFn).toHaveBeenCalledTimes(2);
    expect(stepFn).toHaveBeenCalledWith(1.0 / 60.0);
    expect(renderFn).toHaveBeenCalledTimes(1);
    expect(loop.accumulator).toBeCloseTo(0.0, 5);
  });
});

describe('Entity-Component Composition (ECS Approximation)', () => {
  it('composes entity with HealthComponent and triggers damage/death', () => {
    const player = new Entity('player');
    const health = new HealthComponent(100);
    const diedFn = vi.fn();
    health.onDied = diedFn;

    player.addComponent(health);

    expect(player.hasComponent('health')).toBe(true);
    expect(player.getComponent<HealthComponent>('health')?.currentHealth).toBe(100);

    health.takeDamage(40);
    expect(health.currentHealth).toBe(60);

    health.heal(10);
    expect(health.currentHealth).toBe(70);

    health.takeDamage(100);
    expect(health.currentHealth).toBe(0);
    expect(health.isDead()).toBe(true);
    expect(diedFn).toHaveBeenCalledWith(player);
  });

  it('updates MovementComponent with velocity and delta', () => {
    const player = new Entity('player');
    const mover = new MovementComponent(100, 100, 200);
    player.addComponent(mover);

    mover.setVelocity(100, 0); // 100 px/sec rightward
    player.update(500);        // 500ms

    expect(mover.x).toBe(150);
    expect(mover.y).toBe(100);
  });
});
