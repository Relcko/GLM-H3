import { ValidationError } from '@relcko/errors';

import type { CorrelationId } from '@relcko/types';

/**
 * Generates a new unique correlation identifier.
 *
 * @returns a RFC-4122 UUID branded as {@link CorrelationId}
 */
export function generateCorrelationId(): CorrelationId {
  return crypto.randomUUID() as CorrelationId;
}

/**
 * Brands an existing string as a {@link CorrelationId} after validation.
 *
 * @param value - raw correlation id string (e.g. received from an inbound header)
 * @returns the validated value branded as {@link CorrelationId}
 * @throws {ValidationError} when the value is empty or blank
 */
export function asCorrelationId(value: string): CorrelationId {
  if (value.trim().length === 0) {
    throw new ValidationError('CorrelationId must be a non-empty string', { value });
  }
  return value as CorrelationId;
}
