import { ValidationError } from '@relcko/errors';
import { systemClock } from '@relcko/kernel';
import { NoOpLogger } from '@relcko/logger';

import type { OutboxMessage } from './outbox-message';
import type { OutboxPublisher } from './outbox-publisher';
import type { OutboxRepository } from './outbox-repository';
import type { Clock } from '@relcko/kernel';
import type { Logger } from '@relcko/logger';

/** Outcome counters of one processor batch. */
export interface OutboxBatchResult {
  /** Messages picked up from the repository. */
  readonly fetched: number;
  /** Messages delivered successfully. */
  readonly published: number;
  /** Messages that failed but remain pending for retry. */
  readonly retried: number;
  /** Messages permanently failed after exhausting attempts. */
  readonly failed: number;
}

/** Dependencies of {@link OutboxProcessor}. */
export interface OutboxProcessorDeps {
  /** Outbox persistence. */
  readonly repository: OutboxRepository;
  /** Transport port. */
  readonly publisher: OutboxPublisher;
  /** Clock used for attempt/publish timestamps. Defaults to the system clock. */
  readonly clock?: Clock;
  /** Structured logger. Defaults to a no-op logger. */
  readonly logger?: Logger;
  /** Maximum messages per batch. Defaults to 100. */
  readonly batchSize?: number;
  /** Maximum delivery attempts before a message is marked failed. Defaults to 3 (Playbook 2.4). */
  readonly maxAttempts?: number;
}

const EMPTY_RESULT: OutboxBatchResult = { fetched: 0, published: 0, retried: 0, failed: 0 };
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_INTERVAL_MS = 1_000;

/**
 * Polling outbox processor (Playbook 6.2).
 *
 * Fetches pending messages in batches, delivers them through the
 * {@link OutboxPublisher}, and records the outcome per message:
 * published, retried later, or permanently failed. Delivery is
 * at-least-once; consumers must be idempotent (Playbook 2.7).
 * {@link OutboxProcessor.processBatch} is re-entrancy-safe and public so
 * tests and custom drivers can trigger batches deterministically.
 *
 * Single-process only: the processor relies on the repository's in-memory
 * claim semantics. Multi-instance deployments require a durable outbox
 * repository (e.g. Postgres) with shared lease/claim support.
 */
export class OutboxProcessor {
  private readonly repository: OutboxRepository;
  private readonly publisher: OutboxPublisher;
  private readonly clock: Clock;
  private readonly logger: Logger;
  private readonly batchSize: number;
  private readonly maxAttempts: number;
  private timer: NodeJS.Timeout | undefined;
  private processing = false;

  constructor(deps: OutboxProcessorDeps) {
    this.repository = deps.repository;
    this.publisher = deps.publisher;
    this.clock = deps.clock ?? systemClock;
    this.logger = (deps.logger ?? new NoOpLogger()).child('OutboxProcessor');
    this.batchSize = deps.batchSize ?? DEFAULT_BATCH_SIZE;
    this.maxAttempts = deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    if (!Number.isInteger(this.batchSize) || this.batchSize < 1) {
      throw new ValidationError('batchSize must be a positive integer', {
        batchSize: this.batchSize,
      });
    }
    if (!Number.isInteger(this.maxAttempts) || this.maxAttempts < 1) {
      throw new ValidationError('maxAttempts must be a positive integer', {
        maxAttempts: this.maxAttempts,
      });
    }
  }

  /** True while a polling timer is active. */
  get isRunning(): boolean {
    return this.timer !== undefined;
  }

  /**
   * Processes one batch of pending messages. Concurrent invocations are
   * ignored and return an empty result.
   *
   * @returns per-outcome counters of the batch
   */
  async processBatch(): Promise<OutboxBatchResult> {
    if (this.processing) {
      return EMPTY_RESULT;
    }
    this.processing = true;
    try {
      const messages = await this.repository.fetchPending(this.batchSize);
      let published = 0;
      let retried = 0;
      let failed = 0;
      for (const message of messages) {
        const outcome = await this.deliver(message);
        if (outcome === 'published') {
          published += 1;
        } else if (outcome === 'retried') {
          retried += 1;
        } else {
          failed += 1;
        }
      }
      return { fetched: messages.length, published, retried, failed };
    } finally {
      this.processing = false;
    }
  }

  /**
   * Starts polling on a fixed interval. Safe to call multiple times. The
   * timer keeps the process alive; call {@link OutboxProcessor.stop} to
   * release it.
   *
   * @param intervalMs - polling interval in milliseconds (default 1000)
   * @throws {ValidationError} when the interval is not positive
   */
  start(intervalMs: number = DEFAULT_INTERVAL_MS): void {
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
      throw new ValidationError('intervalMs must be positive', { intervalMs });
    }
    if (this.timer !== undefined) {
      return;
    }
    this.timer = setInterval(() => {
      void this.processBatch();
    }, intervalMs);
  }

  /** Stops polling. */
  stop(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private async deliver(message: OutboxMessage): Promise<'published' | 'retried' | 'failed'> {
    try {
      await this.publisher.publish(message);
      await this.repository.markPublished(message.id, this.clock.nowMs());
      return 'published';
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      if (message.attempts + 1 >= this.maxAttempts) {
        await this.repository.markFailed(message.id, errorText, this.clock.nowMs());
        this.logger.error(
          'Outbox message exhausted delivery attempts',
          error instanceof Error ? error : new Error(errorText),
          { messageId: message.id, attempts: message.attempts + 1 },
        );
        return 'failed';
      }
      await this.repository.recordAttempt(message.id, errorText, this.clock.nowMs());
      this.logger.warn('Outbox message delivery failed, will retry', {
        messageId: message.id,
        attempts: message.attempts + 1,
      });
      return 'retried';
    }
  }
}
