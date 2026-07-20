import type { EventEnvelope } from '@relcko/events';

/**
 * Projection contract (Playbook 6.3).
 *
 * A projection folds events into a read model. Implementations must be:
 *
 * - Idempotent: handling the same event twice produces the same state
 *   (Playbook 2.7 - at-least-once delivery is the contract).
 * - Deterministic: the same event stream always produces the same state
 *   (Playbook 2.6).
 * - Rebuildable: {@link Projection.reset} plus a full replay restores the
 *   read model from the event stream, the source of truth.
 *
 * Naming follows Playbook 8.1: PascalCase + Projection suffix.
 */
export interface Projection {
  /** Unique projection name used for checkpointing. */
  readonly name: string;

  /**
   * Event types this projection handles. An empty list means all events.
   */
  readonly handledEventTypes: readonly string[];

  /**
   * Folds one event into the read model.
   *
   * @param envelope - event to apply
   */
  handle(envelope: EventEnvelope): Promise<void>;

  /**
   * Clears the read model so the projection can be rebuilt from scratch.
   */
  reset(): Promise<void>;
}
