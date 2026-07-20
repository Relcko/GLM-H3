export type ServiceFactory<T> = (container: Container) => T;

export interface ServiceDefinition<T> {
  factory: ServiceFactory<T>;
  singleton?: boolean;
}

export class Container {
  private readonly factories = new Map<string, ServiceDefinition<unknown>>();
  private readonly instances = new Map<string, unknown>();
  private readonly _parent?: Container;

  constructor(parent?: Container) {
    this._parent = parent;
  }

  register<T>(name: string, factory: ServiceFactory<T>, singleton = true): void {
    this.factories.set(name, { factory, singleton });
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  resolve<T>(name: string): T {
    if (this.instances.has(name)) {
      return this.instances.get(name) as T;
    }

    const definition = this.factories.get(name);
    if (definition) {
      const instance = definition.factory(this);
      if (definition.singleton) {
        this.instances.set(name, instance);
      }
      return instance as T;
    }

    if (this._parent) {
      return this._parent.resolve<T>(name);
    }

    throw new Error(`Service not registered: ${name}`);
  }

  has(name: string): boolean {
    return this.factories.has(name) || (this._parent?.has(name) ?? false);
  }

  createScope(): Container {
    return new Container(this);
  }

  clear(): void {
    this.instances.clear();
  }
}
