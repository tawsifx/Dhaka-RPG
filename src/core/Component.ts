// src/core/Component.ts - ECS Component Composition Primitives
// Pattern: ECS Approximation / Composition Pattern from game-arch-patterns

export interface IEntity {
  id: string;
  addComponent(component: IComponent): this;
  getComponent<T extends IComponent>(id: string): T | undefined;
  hasComponent(id: string): boolean;
  removeComponent(id: string): void;
  update(delta: number): void;
  destroy(): void;
}

export interface IComponent {
  id: string;
  enabled: boolean;
  entity?: IEntity;
  init?(entity: IEntity): void;
  update?(delta: number): void;
  destroy?(): void;
}

export class Entity implements IEntity {
  public id: string;
  private _components: Map<string, IComponent> = new Map();

  constructor(id: string) {
    this.id = id;
  }

  public addComponent(component: IComponent): this {
    component.entity = this;
    this._components.set(component.id, component);
    if (component.init) {
      component.init(this);
    }
    return this;
  }

  public getComponent<T extends IComponent>(id: string): T | undefined {
    return this._components.get(id) as T | undefined;
  }

  public hasComponent(id: string): boolean {
    return this._components.has(id);
  }

  public removeComponent(id: string): void {
    const comp = this._components.get(id);
    if (comp) {
      if (comp.destroy) comp.destroy();
      comp.entity = undefined;
      this._components.delete(id);
    }
  }

  public update(delta: number): void {
    for (const comp of this._components.values()) {
      if (comp.enabled && comp.update) {
        comp.update(delta);
      }
    }
  }

  public destroy(): void {
    for (const comp of this._components.values()) {
      if (comp.destroy) comp.destroy();
      comp.entity = undefined;
    }
    this._components.clear();
  }
}

/**
 * Standard HealthComponent with damage, healing, and death callbacks
 */
export class HealthComponent implements IComponent {
  public id: string = 'health';
  public enabled: boolean = true;
  public entity?: IEntity;

  public maxHealth: number;
  private _currentHealth: number;

  public onHealthChanged?: (oldHealth: number, newHealth: number) => void;
  public onDied?: (entity: IEntity) => void;

  constructor(maxHealth: number = 100) {
    this.maxHealth = maxHealth;
    this._currentHealth = maxHealth;
  }

  public get currentHealth(): number {
    return this._currentHealth;
  }

  public set currentHealth(value: number) {
    const old = this._currentHealth;
    this._currentHealth = Math.max(0, Math.min(value, this.maxHealth));
    if (this.onHealthChanged && old !== this._currentHealth) {
      this.onHealthChanged(old, this._currentHealth);
    }
    if (this._currentHealth <= 0 && this.onDied && this.entity) {
      this.onDied(this.entity);
    }
  }

  public takeDamage(amount: number): void {
    this.currentHealth -= Math.max(0, amount);
  }

  public heal(amount: number): void {
    this.currentHealth += Math.max(0, amount);
  }

  public isDead(): boolean {
    return this._currentHealth <= 0;
  }
}

/**
 * Standard MovementComponent with position, velocity, and speed
 */
export class MovementComponent implements IComponent {
  public id: string = 'movement';
  public enabled: boolean = true;
  public entity?: IEntity;

  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public speed: number = 120;

  constructor(x: number = 0, y: number = 0, speed: number = 120) {
    this.x = x;
    this.y = y;
    this.speed = speed;
  }

  public update(delta: number): void {
    this.x += (this.vx * delta) / 1000;
    this.y += (this.vy * delta) / 1000;
  }

  public setVelocity(vx: number, vy: number): void {
    this.vx = vx;
    this.vy = vy;
  }

  public stop(): void {
    this.vx = 0;
    this.vy = 0;
  }
}
