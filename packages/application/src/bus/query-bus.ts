import { DomainError } from '@relcko/errors';

import { HandlerRegistry } from './handler-registry';
import { HandlerExecutionFailedError } from '../errors/application-error';

import type { Query } from '../message';

type AnyQueryHandler = QueryHandler;

export interface QueryHandler<TQuery extends Query = Query, TResult = unknown> {
  readonly queryType: string;
  handle(query: TQuery): Promise<TResult>;
}

export interface QueryBus {
  register<T extends Query, TResult>(handler: QueryHandler<T, TResult>): void;
  dispatch<TResult>(query: Query): Promise<TResult>;
  hasHandler(queryType: string): boolean;
}

export class InMemoryQueryBus implements QueryBus {
  private readonly registry = new HandlerRegistry<AnyQueryHandler>();

  register<T extends Query, TResult>(handler: QueryHandler<T, TResult>): void {
    this.registry.register(handler.queryType, handler, 'query');
  }

  async dispatch<TResult>(query: Query): Promise<TResult> {
    const handler = this.registry.resolve(query.type, 'query');
    try {
      const raw = await handler.handle(query);
      return raw as TResult;
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new HandlerExecutionFailedError(query.type, error as Error);
    }
  }

  hasHandler(queryType: string): boolean {
    return this.registry.has(queryType, 'query');
  }
}
