// src/core/Services.ts - Controlled Service Locator pattern
// Pattern: Service Locator (Autoload Pattern from game-arch-patterns)

import { EventBus } from './EventBus';
import { StateStack } from './GameStateStack';

export class ServiceLocator {
  private _registry: Map<string, any> = new Map();
  private _nullRegistry: Map<string, any> = new Map();

  constructor() {
    // Register primary core singletons by default
    this.register('EventBus', EventBus);
    this.register('StateStack', StateStack);
  }

  /**
   * Register a service instance under a unique string name.
   */
  public register<T>(name: string, service: T): void {
    if (!service) {
      console.warn(`[Services] Registering null or undefined service: "${name}"`);
    }
    this._registry.set(name, service);
  }

  /**
   * Register a fallback Null Object service when real service is uninitialized.
   */
  public registerNullService<T>(name: string, nullService: T): void {
    this._nullRegistry.set(name, nullService);
  }

  /**
   * Retrieve a service. Throws error if unregistered and no null fallback exists.
   */
  public get<T>(name: string): T {
    if (this._registry.has(name)) {
      return this._registry.get(name) as T;
    }

    if (this._nullRegistry.has(name)) {
      return this._nullRegistry.get(name) as T;
    }

    throw new Error(`[Services] Service not registered and no null-service provided: "${name}"`);
  }

  /**
   * Try retrieving a service without throwing.
   */
  public tryGet<T>(name: string): T | undefined {
    if (this._registry.has(name)) {
      return this._registry.get(name) as T;
    }
    if (this._nullRegistry.has(name)) {
      return this._nullRegistry.get(name) as T;
    }
    return undefined;
  }

  /**
   * Check if a service or null fallback is registered.
   */
  public has(name: string): boolean {
    return this._registry.has(name) || this._nullRegistry.has(name);
  }

  /**
   * Remove a registered service.
   */
  public unregister(name: string): void {
    this._registry.delete(name);
  }

  /**
   * Reset registry back to initial core services.
   */
  public reset(): void {
    this._registry.clear();
    this._nullRegistry.clear();
    this.register('EventBus', EventBus);
    this.register('StateStack', StateStack);
  }
}

/** Global Services locator instance */
export const Services = new ServiceLocator();
