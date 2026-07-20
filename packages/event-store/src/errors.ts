import { DomainError } from '@relcko/errors';

import type { StreamId } from './stream-id';

/**
 * Raised when an append's expected version does not match the current
 * stream version (optimistic concurrency, Playbook 12.3).
 */
export class OptimisticConcurrencyError extends DomainError {
  constructor(
    public readonly streamId: StreamId,
    public readonly expectedVersion: number,
    public readonly actualVersion: number,
  ) {
    super(
      'OPTIMISTIC_CONCURRENCY',
      `Stream ${streamId} expected version ${expectedVersion} but current version is ${actualVersion}`,
      { streamId, expectedVersion, actualVersion },
    );
  }
}

/**
 * Raised when an event cannot be serialized or deserialized at the store
 * boundary.
 */
export class EventSerializationError extends DomainError {
  constructor(
    public readonly eventType: string,
    message: string,
    context?: Record<string, unknown>,
  ) {
    super('EVENT_SERIALIZATION_ERROR', message, { eventType, ...context });
  }
}
