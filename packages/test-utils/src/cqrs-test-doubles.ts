import { createCommand, createQuery } from '@relcko/cqrs';

import type { Command, Query } from '@relcko/cqrs';
import type { CommandHandler, MessageContext, PipelineBehavior, QueryHandler } from '@relcko/cqrs';
import type { CorrelationId } from '@relcko/types';

/** Fixed correlation id used by CQRS test doubles. */
export const TEST_CORRELATION_ID = 'test-correlation-id' as CorrelationId;

/**
 * Creates a command with a fixed test correlation id.
 *
 * @typeParam TPayload - command payload type
 * @param commandType - command type name
 * @param payload - command payload
 * @returns the command
 */
export function createTestCommand<TPayload>(commandType: string, payload: TPayload): Command<TPayload> {
  return createCommand(commandType, payload, TEST_CORRELATION_ID, { timestamp: 0 });
}

/**
 * Creates a query with a fixed test correlation id.
 *
 * @typeParam TPayload - query payload type
 * @param queryType - query type name
 * @param payload - query payload
 * @returns the query
 */
export function createTestQuery<TPayload>(queryType: string, payload: TPayload): Query<TPayload> {
  return createQuery(queryType, payload, TEST_CORRELATION_ID, { timestamp: 0 });
}

/**
 * Command handler test double recording every received command and
 * answering through a programmable responder.
 *
 * @typeParam TCommand - command type handled
 * @typeParam TResult - result type produced
 */
export class SpyCommandHandler<TCommand extends Command = Command, TResult = unknown>
  implements CommandHandler<TCommand, TResult>
{
  readonly commandType: string;
  private readonly responder?: (command: TCommand) => TResult | Promise<TResult>;
  private readonly received: TCommand[] = [];

  /**
   * @param commandType - command type to handle
   * @param responder - optional responder producing the result
   */
  constructor(commandType: string, responder?: (command: TCommand) => TResult | Promise<TResult>) {
    this.commandType = commandType;
    this.responder = responder;
  }

  handle(command: TCommand): Promise<TResult> {
    this.received.push(command);
    if (this.responder !== undefined) {
      return Promise.resolve(this.responder(command));
    }
    return Promise.resolve(undefined as TResult);
  }

  /**
   * Returns every received command in order.
   *
   * @returns copy of the received commands
   */
  receivedCommands(): readonly TCommand[] {
    return [...this.received];
  }

  /**
   * Returns the number of received commands.
   *
   * @returns call count
   */
  callCount(): number {
    return this.received.length;
  }
}

/**
 * Query handler test double recording every received query and answering
 * through a programmable responder.
 *
 * @typeParam TQuery - query type handled
 * @typeParam TResult - result type produced
 */
export class SpyQueryHandler<TQuery extends Query = Query, TResult = unknown>
  implements QueryHandler<TQuery, TResult>
{
  readonly queryType: string;
  private readonly responder?: (query: TQuery) => TResult | Promise<TResult>;
  private readonly received: TQuery[] = [];

  /**
   * @param queryType - query type to handle
   * @param responder - optional responder producing the result
   */
  constructor(queryType: string, responder?: (query: TQuery) => TResult | Promise<TResult>) {
    this.queryType = queryType;
    this.responder = responder;
  }

  handle(query: TQuery): Promise<TResult> {
    this.received.push(query);
    if (this.responder !== undefined) {
      return Promise.resolve(this.responder(query));
    }
    return Promise.resolve(undefined as TResult);
  }

  /**
   * Returns every received query in order.
   *
   * @returns copy of the received queries
   */
  receivedQueries(): readonly TQuery[] {
    return [...this.received];
  }

  /**
   * Returns the number of received queries.
   *
   * @returns call count
   */
  callCount(): number {
    return this.received.length;
  }
}

/**
 * Pipeline behavior test double recording its position in the execution
 * order on a shared trace array.
 */
export class RecordingBehavior implements PipelineBehavior {
  private readonly name: string;
  private readonly trace: string[];
  private readonly contexts: MessageContext[] = [];

  /**
   * @param name - label recorded in the trace
   * @param trace - shared array receiving `${name}:before` / `${name}:after` entries
   */
  constructor(name: string, trace: string[]) {
    this.name = name;
    this.trace = trace;
  }

  async handle<TResult>(
    _message: unknown,
    context: MessageContext,
    next: () => Promise<TResult>,
  ): Promise<TResult> {
    this.trace.push(`${this.name}:before`);
    this.contexts.push(context);
    try {
      return await next();
    } finally {
      this.trace.push(`${this.name}:after`);
    }
  }

  /**
   * Returns the message contexts observed by this behavior.
   *
   * @returns copy of the observed contexts
   */
  observedContexts(): readonly MessageContext[] {
    return [...this.contexts];
  }
}
