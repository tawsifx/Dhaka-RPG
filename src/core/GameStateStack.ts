// src/core/GameStateStack.ts - Hierarchical state stack FSM
// Pattern: Game State Stack from game-arch-patterns

import { EventBus } from './EventBus';

export enum GameState {
  MAIN_MENU = 'MAIN_MENU',
  GAMEPLAY = 'GAMEPLAY',
  PAUSE = 'PAUSE',
  INVENTORY = 'INVENTORY',
  DIALOGUE = 'DIALOGUE',
  CUTSCENE = 'CUTSCENE',
  MINIGAME = 'MINIGAME',
  COMBAT = 'COMBAT',
  GAME_OVER = 'GAME_OVER'
}

export interface StateStackEntry {
  state: GameState;
  context?: any;
  timestamp: number;
}

export type StateChangeHandler = (newState: GameState, oldState: GameState, context?: any) => void;

export class GameStateStack {
  private _stack: StateStackEntry[] = [];
  private _defaultState: GameState = GameState.GAMEPLAY;
  private _enterHandlers: Map<GameState, StateChangeHandler[]> = new Map();
  private _exitHandlers: Map<GameState, StateChangeHandler[]> = new Map();

  constructor(initialState: GameState = GameState.GAMEPLAY) {
    this._defaultState = initialState;
    this.pushState(initialState);
  }

  /**
   * Push a new state onto the stack.
   */
  public pushState(state: GameState, context?: any): void {
    const oldState = this.currentState();
    const entry: StateStackEntry = {
      state,
      context,
      timestamp: Date.now()
    };

    if (oldState !== state) {
      this._triggerExit(oldState, state, context);
    }

    this._stack.push(entry);
    this._triggerEnter(state, oldState, context);

    EventBus.emit('game:state-changed', {
      oldState,
      newState: state,
      context
    });
  }

  /**
   * Pop the current top state off the stack.
   */
  public popState(): StateStackEntry | undefined {
    if (this._stack.length <= 1) {
      // Don't pop below baseline state
      return undefined;
    }

    const popped = this._stack.pop();
    if (!popped) return undefined;

    const current = this.currentState();
    this._triggerExit(popped.state, current, popped.context);
    this._triggerEnter(current, popped.state, this.currentContext());

    EventBus.emit('game:state-changed', {
      oldState: popped.state,
      newState: current,
      context: this.currentContext()
    });

    return popped;
  }

  /**
   * Replace the current top state without stacking.
   */
  public replaceState(state: GameState, context?: any): void {
    const oldState = this.currentState();
    if (this._stack.length > 0) {
      this._triggerExit(oldState, state, context);
      this._stack.pop();
    }

    this._stack.push({
      state,
      context,
      timestamp: Date.now()
    });

    this._triggerEnter(state, oldState, context);

    EventBus.emit('game:state-changed', {
      oldState,
      newState: state,
      context
    });
  }

  /**
   * Return the current active state.
   */
  public currentState(): GameState {
    return this._stack.length > 0 ? this._stack[this._stack.length - 1].state : this._defaultState;
  }

  /**
   * Return context attached to the current state.
   */
  public currentContext(): any {
    return this._stack.length > 0 ? this._stack[this._stack.length - 1].context : undefined;
  }

  /**
   * Check if a specific state is currently active or in the stack.
   */
  public isInState(state: GameState): boolean {
    return this.currentState() === state;
  }

  /**
   * Returns true if gameplay simulations (physics, movements, time) should run.
   */
  public isGameplayActive(): boolean {
    const curr = this.currentState();
    return curr === GameState.GAMEPLAY || curr === GameState.COMBAT;
  }

  /**
   * Register lifecycle hook for entering a state.
   */
  public onEnter(state: GameState, handler: StateChangeHandler): () => void {
    if (!this._enterHandlers.has(state)) {
      this._enterHandlers.set(state, []);
    }
    this._enterHandlers.get(state)!.push(handler);

    return () => {
      const list = this._enterHandlers.get(state);
      if (list) {
        const idx = list.indexOf(handler);
        if (idx !== -1) list.splice(idx, 1);
      }
    };
  }

  /**
   * Register lifecycle hook for exiting a state.
   */
  public onExit(state: GameState, handler: StateChangeHandler): () => void {
    if (!this._exitHandlers.has(state)) {
      this._exitHandlers.set(state, []);
    }
    this._exitHandlers.get(state)!.push(handler);

    return () => {
      const list = this._exitHandlers.get(state);
      if (list) {
        const idx = list.indexOf(handler);
        if (idx !== -1) list.splice(idx, 1);
      }
    };
  }

  /**
   * Reset stack back to base state.
   */
  public reset(baselineState: GameState = this._defaultState): void {
    this._stack = [{
      state: baselineState,
      timestamp: Date.now()
    }];
  }

  /**
   * Stack depth.
   */
  public depth(): number {
    return this._stack.length;
  }

  private _triggerEnter(newState: GameState, oldState: GameState, context?: any): void {
    const handlers = this._enterHandlers.get(newState);
    if (handlers) {
      for (const h of handlers) {
        try {
          h(newState, oldState, context);
        } catch (e) {
          console.error(`[GameStateStack] Error in onEnter for state ${newState}:`, e);
        }
      }
    }
  }

  private _triggerExit(oldState: GameState, newState: GameState, context?: any): void {
    const handlers = this._exitHandlers.get(oldState);
    if (handlers) {
      for (const h of handlers) {
        try {
          h(newState, oldState, context);
        } catch (e) {
          console.error(`[GameStateStack] Error in onExit for state ${oldState}:`, e);
        }
      }
    }
  }
}

/** Global singleton GameStateStack instance */
export const StateStack = new GameStateStack(GameState.GAMEPLAY);
