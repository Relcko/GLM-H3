import type { OutboxMessage } from './outbox-message';

/**
 * Outbox persistence contract.
 *
 * Implementations must throw {@link NotFoundError} from @relcko/errors when
 * a status-transition method references an unknown message id, and must
 * persist attempt counts and timestamps so delivery survives restarts.
 */
export interface OutboxRepository {
  /**
   * Persists a new outbox message.
   *
   * @param message - message to store (typically Pending)
   */
  save(message: OutboxMessage): Promise<void>;

  /**
   * Fetches the oldest pending messages.
   *
   * @param limit - maximum number of messages to return
   * @returns pending messages ordered by createdAt ascending
   */
  fetchPending(limit: number): Promise<readonly OutboxMessage[]>;

  /**
   * Marks a message as successfully delivered.
   *
   * @param id - message identifier
   * @param publishedAt - epoch milliseconds of the delivery
   * @throws {NotFoundError} when the message id is unknown
   */
  markPublished(id: string, publishedAt: number): Promise<void>;

  /**
   * Records a failed delivery attempt, keeping the message pending for a
   * later retry.
   *
   * @param id - message identifier
   * @param error - failure description
   * @param attemptedAt - epoch milliseconds of the attempt
   * @throws {NotFoundError} when the message id is unknown
   */
  recordAttempt(id: string, error: string, attemptedAt: number): Promise<void>;

  /**
   * Marks a message as permanently failed (attempts exhausted).
   *
   * @param id - message identifier
   * @param error - failure description
   * @param failedAt - epoch milliseconds of the final attempt
   * @throws {NotFoundError} when the message id is unknown
   */
  markFailed(id: string, error: string, failedAt: number): Promise<void>;

  /**
   * Atomically claims pending messages for processing by a specific instance.
   * Claimed messages are excluded from fetchPending until released or the
   * lease expires.
   *
   * @param limit - maximum number of messages to claim
   * @param instanceId - unique identifier of the processing instance
   * @param leaseTtlMs - lease duration in milliseconds
   * @returns claimed messages ordered by createdAt ascending
   */
  claimPending(limit: number, instanceId: string, leaseTtlMs: number): Promise<readonly OutboxMessage[]>;

  /**
   * Releases a previously claimed message back to pending status.
   *
   * @param id - message identifier
   * @throws {NotFoundError} when the message id is unknown
   */
  releaseClaim(id: string): Promise<void>;

  /**
   * Extends the lease on a claimed message.
   *
   * @param id - message identifier
   * @param instanceId - processing instance extending the lease
   * @throws {NotFoundError} when the message id is unknown
   */
  heartbeatClaim(id: string, instanceId: string): Promise<void>;
}
