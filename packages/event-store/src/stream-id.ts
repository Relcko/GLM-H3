import { ValidationError } from '@relcko/errors';

import type { Brand } from '@relcko/types';

/** Branded identifier of an event stream inside the event store. */
export type StreamId = Brand<string, 'StreamId'>;

/**
 * Brands a raw string as a {@link StreamId} after validation.
 *
 * @param value - raw stream identifier
 * @returns the validated value branded as {@link StreamId}
 * @throws {ValidationError} when the value is empty or blank
 */
export function asStreamId(value: string): StreamId {
  if (value.trim().length === 0) {
    throw new ValidationError('StreamId must be a non-empty string', { value });
  }
  return value as StreamId;
}

/**
 * Builds the canonical stream identifier for an aggregate instance.
 *
 * @param aggregateType - aggregate type name
 * @param aggregateId - aggregate instance identifier
 * @returns stream identifier in the form `{aggregateType}-{aggregateId}`
 * @throws {ValidationError} when either part is empty or blank
 */
export function streamIdFor(aggregateType: string, aggregateId: string): StreamId {
  if (aggregateType.trim().length === 0 || aggregateId.trim().length === 0) {
    throw new ValidationError('aggregateType and aggregateId must be non-empty strings', {
      aggregateType,
      aggregateId,
    });
  }
  return `${aggregateType}-${aggregateId}` as StreamId;
}
