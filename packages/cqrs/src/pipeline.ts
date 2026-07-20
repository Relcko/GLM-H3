import type { MessageKind } from './errors';
import type { MessageMetadata } from './message';

/**
 * Context describing the message currently flowing through the pipeline.
 */
export interface MessageContext {
  /** Whether the message is a command or a query. */
  readonly kind: MessageKind;
  /** Message type name used for routing. */
  readonly messageType: string;
  /** Metadata of the message in flight. */
  readonly metadata: MessageMetadata;
}

/**
 * Pipeline behavior wrapping command/query execution.
 *
 * Behaviors form an ordered chain around the terminal handler: calling next
 * invokes the rest of the pipeline; throwing aborts it. Built-in behaviors:
 * {@link ValidationBehavior}, {@link LoggingBehavior},
 * {@link MetricsBehavior}, {@link RetryBehavior}.
 */
export interface PipelineBehavior {
  /**
   * Executes the behavior.
   *
   * @typeParam TResult - result type produced downstream
   * @param message - the message in flight (narrow inside the behavior)
   * @param context - message routing context
   * @param next - remainder of the pipeline
   * @returns the downstream result
   */
  handle<TResult>(
    message: unknown,
    context: MessageContext,
    next: () => Promise<TResult>,
  ): Promise<TResult>;
}

/**
 * Composes behaviors around a terminal handler invocation.
 *
 * @param behaviors - behaviors in registration order (first = outermost)
 * @param message - the message in flight
 * @param context - message routing context
 * @param terminal - terminal handler invocation
 * @returns the composed pipeline
 */
export function composePipeline(
  behaviors: readonly PipelineBehavior[],
  message: unknown,
  context: MessageContext,
  terminal: () => Promise<unknown>,
): () => Promise<unknown> {
  return behaviors.reduceRight<() => Promise<unknown>>(
    (next, behavior) => () => behavior.handle(message, context, next),
    terminal,
  );
}
