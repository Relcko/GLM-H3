import type { EventEnvelope } from '@relcko/events';

/**
 * A single event dispatch passing through the middleware pipeline.
 */
export interface EventDispatch {
  /** Envelope being dispatched. */
  readonly envelope: EventEnvelope;
  /** Consumer group of the subscriber receiving the dispatch. */
  readonly consumerGroup: string;
}

/**
 * Event bus middleware.
 *
 * Middleware wraps handler execution in registration order. Calling next
 * continues the pipeline; resolving without calling next short-circuits the
 * dispatch (the handler is skipped). Throwing propagates the error into the
 * retry/dead-letter flow.
 */
export type EventBusMiddleware = (
  dispatch: EventDispatch,
  next: () => Promise<void>,
) => Promise<void>;
