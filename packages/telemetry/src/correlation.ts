import { AsyncLocalStorage } from 'node:async_hooks';

import type { CorrelationId, EventId } from '@relcko/types';

/**
 * Ambient correlation context for the current execution flow.
 *
 * The correlation id ties every log line, metric, span, and event of one
 * logical operation together (Playbook 8.5). The causation id references the
 * event that caused the current flow, forming an auditable chain.
 */
export interface CorrelationContext {
  /** Correlation identifier of the current logical operation. */
  readonly correlationId: CorrelationId;
  /** Identifier of the event that caused the current flow, when any. */
  readonly causationId?: EventId;
}

/**
 * Async-local correlation scope.
 *
 * Propagates {@link CorrelationContext} across async boundaries without
 * threading it through every call signature. Event bus, CQRS, and worker
 * runtimes wrap handler execution in {@link CorrelationScope.run}.
 */
export class CorrelationScope {
  private readonly storage = new AsyncLocalStorage<CorrelationContext>();

  /**
   * Executes fn within the given correlation context. Nested runs shadow the
   * outer context and restore it on completion.
   *
   * @typeParam T - return type of the wrapped function
   * @param context - correlation context to activate
   * @param fn - function to execute within the context
   * @returns the result of fn
   */
  public run<T>(context: CorrelationContext, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  /**
   * Returns the active correlation context.
   *
   * @returns the current context, or undefined outside any scope
   */
  public current(): CorrelationContext | undefined {
    return this.storage.getStore();
  }

  /**
   * Returns the correlation id of the active context.
   *
   * @returns the current correlation id, or undefined outside any scope
   */
  public currentCorrelationId(): CorrelationId | undefined {
    return this.storage.getStore()?.correlationId;
  }
}

/** Shared process-wide {@link CorrelationScope} instance. */
export const correlationScope: CorrelationScope = new CorrelationScope();
