import { NoOpLogger } from '@relcko/logger';
import { correlationScope } from '@relcko/telemetry';

import { DuplicateHandlerError, HandlerNotFoundError } from './errors';
import { composePipeline } from './pipeline';

import type { MessageContext } from './pipeline';
import type { PipelineBehavior } from './pipeline';
import type { Query } from '@relcko/application';
import type { Logger } from '@relcko/logger';
import type { EventId } from '@relcko/types';

export interface QueryHandler<TQuery extends Query = Query, TResult = unknown> {
  readonly queryType: string;

  handle(query: TQuery): Promise<TResult>;
}

export interface QueryBus {
  register(handler: QueryHandler): void;

  dispatch<TResult>(query: Query): Promise<TResult>;
}

export interface QueryBusOptions {
  readonly logger?: Logger;
  readonly behaviors?: readonly PipelineBehavior[];
}

export class InProcessQueryBus implements QueryBus {
  private readonly handlers = new Map<string, QueryHandler>();
  private readonly behaviors: PipelineBehavior[] = [];
  private readonly logger: Logger;

  constructor(options?: QueryBusOptions) {
    this.logger = (options?.logger ?? new NoOpLogger()).child('InProcessQueryBus');
    if (options?.behaviors !== undefined) {
      this.behaviors.push(...options.behaviors);
    }
  }

  use(behavior: PipelineBehavior): void {
    this.behaviors.push(behavior);
  }

  register(handler: QueryHandler): void {
    if (this.handlers.has(handler.queryType)) {
      throw new DuplicateHandlerError('query', handler.queryType);
    }
    this.handlers.set(handler.queryType, handler);
  }

  hasHandler(queryType: string): boolean {
    return this.handlers.has(queryType);
  }

  async dispatch<TResult>(query: Query): Promise<TResult> {
    const handler = this.handlers.get(query.type);
    if (handler === undefined) {
      this.logger.warn('Query rejected: no handler registered', {
        queryType: query.type,
        messageId: query.metadata.messageId,
      });
      throw new HandlerNotFoundError('query', query.type);
    }
    const context: MessageContext = {
      kind: 'query',
      messageType: query.type,
      metadata: query.metadata,
    };
    const pipeline = composePipeline(this.behaviors, query, context, () => handler.handle(query));
    return (await correlationScope.run(
      { correlationId: query.metadata.correlationId, causationId: query.metadata.messageId as EventId },
      () => pipeline(),
    )) as TResult;
  }
}
