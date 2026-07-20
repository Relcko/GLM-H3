import { NoOpLogger } from '@relcko/logger';

import type { MessageContext, PipelineBehavior } from '../pipeline';
import type { Logger } from '@relcko/logger';

/**
 * Pipeline behavior logging start, success, and failure of every message
 * with correlation context (Playbook 8.5).
 */
export class LoggingBehavior implements PipelineBehavior {
  private readonly logger: Logger;

  /**
   * @param logger - structured logger; defaults to a no-op logger
   */
  constructor(logger?: Logger) {
    this.logger = (logger ?? new NoOpLogger()).child('LoggingBehavior');
  }

  async handle<TResult>(
    _message: unknown,
    context: MessageContext,
    next: () => Promise<TResult>,
  ): Promise<TResult> {
    const start = performance.now();
    this.logger.info('Handling message', {
      kind: context.kind,
      messageType: context.messageType,
      messageId: context.metadata.messageId,
      correlationId: context.metadata.correlationId,
    });
    try {
      const result = await next();
      this.logger.info('Message handled', {
        kind: context.kind,
        messageType: context.messageType,
        messageId: context.metadata.messageId,
        correlationId: context.metadata.correlationId,
        durationMs: performance.now() - start,
      });
      return result;
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Message failed', failure, {
        kind: context.kind,
        messageType: context.messageType,
        messageId: context.metadata.messageId,
        correlationId: context.metadata.correlationId,
        durationMs: performance.now() - start,
      });
      throw failure;
    }
  }
}
