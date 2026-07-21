import { ValidationError } from '@relcko/errors';
import { describe, expect, it } from 'vitest';


import { asCorrelationId, generateCorrelationId } from './correlation-id';

describe('correlation-id', () => {
  it('generateCorrelationId_should_return_a_uuid', () => {
    const id = generateCorrelationId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('generateCorrelationId_should_return_unique_values', () => {
    expect(generateCorrelationId()).not.toBe(generateCorrelationId());
  });

  it('asCorrelationId_should_return_the_input_when_valid', () => {
    expect(asCorrelationId('corr-123')).toBe('corr-123');
  });

  it('asCorrelationId_should_throw_when_value_is_blank', () => {
    expect(() => asCorrelationId('')).toThrow(ValidationError);
    expect(() => asCorrelationId('   ')).toThrow(ValidationError);
  });
});
