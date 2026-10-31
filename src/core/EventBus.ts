// src/core/EventBus.ts - Decoupled, strongly-typed publish/subscribe event system
// Pattern: EventBus (Decoupled Signal System from game-arch-patterns)

import type { GameState } from './GameStateStack';

export type CoreGameEvents = {
  // Game lifecycle & state
  'game:state-changed': { oldState: GameState; newState: GameState; context?: any };
  'game:pause': { isPaused: boolean };

  // Player & Stats
  'player:health-changed': { current: number; max: number; delta: number };
  'player:sp-changed': { current: number; max: number; delta: number };
  'player:level-up': { newLevel: number; stats: any };
  'player:death': { x: number; y: number };
  'player:moved': { x: number; y: number; facing: { x: number; y: number } };

  // Combat
  'combat:attack': { weapon: string; damage: number; target?: any };
  'combat:hit': { target: any; damage: number; isCrit: boolean };
  'combat:boss-defeated': { bossId: string };

  // Inventory & Items
  'inventory:item-added': { itemId: string; count: number };
  'inventory:item-used': { itemId: string };

  // Dialogue & Cutscenes
  'dialogue:opened': { speaker?: string; text?: string };
  'dialogue:closed': { speaker?: string };
  'cutscene:started': { cutsceneId: string };
  'cutscene:ended': { cutsceneId: string };

  // World, Weather & Time
  'world:transition-started': { fromWorld: string; toWorld: string };
  'world:transition-completed': { world: string };
  'time:tick': { hour: number; minute: number; season: string; day: number };
  'weather:changed': { isRaining: boolean; isMonsoon: boolean };

  // Minigames & Quests
  'minigame:launched': { minigameId: string };
  'minigame:closed': { minigameId: string; results?: any };
  'quest:stage-updated': { questId: string; stage: number };
};

type EventListener<T> = (data: T) => void;

export class TypedEventBus {
  private _listeners: Map<string, Set<EventListener<any>>> = new Map();
  private _onceListeners: Map<string, Set<EventListener<any>>> = new Map();

  /**
   * Subscribe to a typed event. Returns an unsubscribe function.
   */
  public on<K extends keyof CoreGameEvents>(
    event: K,
    listener: EventListener<CoreGameEvents[K]>
  ): () => void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(listener);

    return () => this.off(event, listener);
  }

  /**
   * Subscribe to a typed event once.
   */
  public once<K extends keyof CoreGameEvents>(
    event: K,
    listener: EventListener<CoreGameEvents[K]>
  ): () => void {
    if (!this._onceListeners.has(event)) {
      this._onceListeners.set(event, new Set());
    }
    this._onceListeners.get(event)!.add(listener);

    return () => {
      const set = this._onceListeners.get(event);
      if (set) set.delete(listener);
    };
  }

  /**
   * Unsubscribe a listener from a typed event.
   */
  public off<K extends keyof CoreGameEvents>(
    event: K,
    listener: EventListener<CoreGameEvents[K]>
  ): void {
    const regular = this._listeners.get(event);
    if (regular) regular.delete(listener);

    const once = this._onceListeners.get(event);
    if (once) once.delete(listener);
  }

  /**
   * Dispatch a typed event to all active listeners.
   */
  public emit<K extends keyof CoreGameEvents>(event: K, data: CoreGameEvents[K]): void {
    const regular = this._listeners.get(event);
    if (regular && regular.size > 0) {
      // Iterate over a snapshot in case listeners unsubscribe during emit
      for (const listener of Array.from(regular)) {
        try {
          listener(data);
        } catch (err) {
          console.error(`[EventBus] Error in listener for event "${String(event)}":`, err);
        }
      }
    }

    const once = this._onceListeners.get(event);
    if (once && once.size > 0) {
      const snapshot = Array.from(once);
      this._onceListeners.delete(event);
      for (const listener of snapshot) {
        try {
          listener(data);
        } catch (err) {
          console.error(`[EventBus] Error in once listener for event "${String(event)}":`, err);
        }
      }
    }
  }

  /**
   * Returns listener count for a specific event or total listeners.
   */
  public listenerCount(event?: keyof CoreGameEvents): number {
    if (event) {
      const regCount = this._listeners.get(event)?.size ?? 0;
      const onceCount = this._onceListeners.get(event)?.size ?? 0;
      return regCount + onceCount;
    }

    let total = 0;
    for (const set of this._listeners.values()) total += set.size;
    for (const set of this._onceListeners.values()) total += set.size;
    return total;
  }

  /**
   * Clear listeners for an event, or all listeners if event is omitted.
   */
  public clear(event?: keyof CoreGameEvents): void {
    if (event) {
      this._listeners.delete(event);
      this._onceListeners.delete(event);
    } else {
      this._listeners.clear();
      this._onceListeners.clear();
    }
  }
}

/** Global singleton EventBus instance */
export const EventBus = new TypedEventBus();
