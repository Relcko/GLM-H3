import { DuplicateHandlerError, UnknownCommandError, UnknownQueryError } from '../errors/application-error';

export interface HandlerEntry<T> {
  readonly messageType: string;
  readonly kind: 'command' | 'query';
  readonly handler: T;
}

type RegistryKey = string;

function key(messageType: string, kind: 'command' | 'query'): RegistryKey {
  return `${kind}:${messageType}`;
}

export class HandlerRegistry<T> {
  private readonly handlers = new Map<RegistryKey, T>();

  public register(messageType: string, handler: T, kind: 'command' | 'query'): void {
    const k = key(messageType, kind);
    if (this.handlers.has(k)) {
      throw new DuplicateHandlerError(kind, messageType);
    }
    this.handlers.set(k, handler);
  }

  public resolve(messageType: string, kind: 'command' | 'query'): T {
    const k = key(messageType, kind);
    const handler = this.handlers.get(k);
    if (handler === undefined) {
      if (kind === 'command') {
        throw new UnknownCommandError(messageType);
      }
      throw new UnknownQueryError(messageType);
    }
    return handler;
  }

  public has(messageType: string, kind?: 'command' | 'query'): boolean {
    if (kind !== undefined) {
      return this.handlers.has(key(messageType, kind));
    }
    return this.handlers.has(key(messageType, 'command')) || this.handlers.has(key(messageType, 'query'));
  }

  public entries(): readonly HandlerEntry<T>[] {
    return Array.from(this.handlers.entries()).map(([k, handler]) => {
      const colonIndex = k.indexOf(':');
      return {
        messageType: k.slice(colonIndex + 1),
        kind: k.slice(0, colonIndex) as 'command' | 'query',
        handler,
      };
    });
  }

  public clear(): void {
    this.handlers.clear();
  }

  public get size(): number {
    return this.handlers.size;
  }
}
