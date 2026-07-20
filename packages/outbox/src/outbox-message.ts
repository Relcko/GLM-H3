import { DeliveryStatus } from './delivery-status';

import type { EventEnvelope } from '@relcko/events';

/**
 * One entry of the transactional outbox.
 *
 * Messages are written atomically with the state change in the originating
 * bounded context and delivered asynchronously, guaranteeing at-least-once
 * publication (Playbook 2.7).
 */
export interface OutboxMessage {
  /** Unique message identifier. */
  readonly id: string;
  /** Event envelope to deliver. */
  readonly envelope: EventEnvelope;
  /** Current delivery status. */
  readonly status: DeliveryStatus;
  /** Number of delivery attempts made. */
  readonly attempts: number;
  /** Epoch milliseconds when the message was created. */
  readonly createdAt: number;
  /** Epoch milliseconds of the last delivery attempt. */
  readonly lastAttemptAt?: number;
  /** Epoch milliseconds of successful delivery. */
  readonly publishedAt?: number;
  /** Description of the last delivery failure. */
  readonly lastError?: string;
}

/** Options accepted by {@link createOutboxMessage}. */
export interface CreateOutboxMessageOptions {
  /** Explicit message id. Defaults to a generated UUID. */
  readonly id?: string;
  /** Explicit creation timestamp. Defaults to the current time. */
  readonly createdAt?: number;
}

/**
 * Creates a pending outbox message for an envelope.
 *
 * @param envelope - event envelope to deliver
 * @param options - optional id and timestamp overrides
 * @returns the pending outbox message
 */
export function createOutboxMessage(
  envelope: EventEnvelope,
  options?: CreateOutboxMessageOptions,
): OutboxMessage {
  return {
    id: options?.id ?? crypto.randomUUID(),
    envelope,
    status: DeliveryStatus.Pending,
    attempts: 0,
    createdAt: options?.createdAt ?? Date.now(),
  };
}
