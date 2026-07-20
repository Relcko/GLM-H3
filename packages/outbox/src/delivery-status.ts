/**
 * Delivery lifecycle of an outbox message.
 *
 * Pending -> Published (success) or Pending (retryable failure, attempts
 * incremented) or Failed (attempts exhausted; requires intervention per
 * Playbook 6.2).
 */
export enum DeliveryStatus {
  /** Waiting to be picked up by the processor. */
  Pending = 'pending',
  /** Currently being delivered by a processor. */
  Processing = 'processing',
  /** Successfully delivered to the transport. */
  Published = 'published',
  /** Delivery exhausted all attempts; manual intervention required. */
  Failed = 'failed',
}
