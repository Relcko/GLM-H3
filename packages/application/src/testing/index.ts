import type { CommandBus, CommandHandler } from '../bus/command-bus';
import type { HandlerRegistry } from '../bus/handler-registry';
import type { QueryBus, QueryHandler } from '../bus/query-bus';
import type { DomainEventDispatcher } from '../dispatcher/domain-event-dispatcher';
import type { EventPublisher } from '../dispatcher/event-publisher';
import type { Command } from '../message';
import type { Query } from '../message';
import type { DomainEvent, UnitOfWork } from '@relcko/kernel';

export class MockUnitOfWork implements UnitOfWork {
  isActive = false;
  began = false;
  committed = false;
  rolledBack = false;

  begin(): Promise<void> {
    this.isActive = true;
    this.began = true;
    return Promise.resolve();
  }

  commit(): Promise<void> {
    this.isActive = false;
    this.committed = true;
    return Promise.resolve();
  }

  rollback(): Promise<void> {
    this.isActive = false;
    this.rolledBack = true;
    return Promise.resolve();
  }

  async execute<T>(work: () => Promise<T>): Promise<T> {
    this.isActive = true;
    this.began = true;
    try {
      const result = await work();
      this.isActive = false;
      this.committed = true;
      return result;
    } catch (error) {
      this.isActive = false;
      this.rolledBack = true;
      throw error;
    }
  }
}

export class MockPublisher implements EventPublisher {
  readonly published: DomainEvent[] = [];

  publish(event: DomainEvent): Promise<void> {
    this.published.push(event);
    return Promise.resolve();
  }

  publishMany(events: readonly DomainEvent[]): Promise<void> {
    this.published.push(...events);
    return Promise.resolve();
  }
}

export class TestCommandBus implements CommandBus {
  private readonly handlers = new Map<string, CommandHandler<Command, unknown>>();

  register<T extends Command, TResult>(handler: CommandHandler<T, TResult>): void {
    this.handlers.set(handler.commandType, handler);
  }

  async dispatch<TResult>(command: Command): Promise<TResult> {
    const handler = this.handlers.get(command.type);
    if (handler === undefined) {
      throw new Error(`No handler for command '${command.type}'`);
    }
    const raw = await handler.handle(command);
    return raw as TResult;
  }

  hasHandler(commandType: string): boolean {
    return this.handlers.has(commandType);
  }

  clear(): void {
    this.handlers.clear();
  }
}

export class TestQueryBus implements QueryBus {
  private readonly handlers = new Map<string, QueryHandler>();

  register<T extends Query, TResult>(handler: QueryHandler<T, TResult>): void {
    this.handlers.set(handler.queryType, handler);
  }

  async dispatch<TResult>(query: Query): Promise<TResult> {
    const handler = this.handlers.get(query.type);
    if (handler === undefined) {
      throw new Error(`No handler for query '${query.type}'`);
    }
    const raw = await handler.handle(query);
    return raw as TResult;
  }

  hasHandler(queryType: string): boolean {
    return this.handlers.has(queryType);
  }

  clear(): void {
    this.handlers.clear();
  }
}

export class FakeRegistry<T> implements Pick<HandlerRegistry<T>, 'register' | 'resolve' | 'has' | 'clear'> {
  private readonly handlers = new Map<string, T>();

  register(messageType: string, handler: T, _kind: 'command' | 'query'): void {
    this.handlers.set(messageType, handler);
  }

  resolve(messageType: string, _kind: 'command' | 'query'): T {
    const handler = this.handlers.get(messageType);
    if (handler === undefined) {
      throw new Error(`No handler for '${messageType}'`);
    }
    return handler;
  }

  has(messageType: string): boolean {
    return this.handlers.has(messageType);
  }

  clear(): void {
    this.handlers.clear();
  }
}

export class MockDomainEventDispatcher implements DomainEventDispatcher {
  readonly dispatched: DomainEvent[] = [];

  dispatch(events: readonly DomainEvent[]): Promise<void> {
    this.dispatched.push(...events);
    return Promise.resolve();
  }
}
