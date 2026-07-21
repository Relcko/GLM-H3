import { describe, expect, it } from 'vitest';

import { EventSerializationError, OptimisticConcurrencyError } from './errors';
import { asStreamId } from './stream-id';

describe('OptimisticConcurrencyError', () => {
  it('should_expose_code_stream_and_versions', () => {
    const streamId = asStreamId('Counter-counter-1');
    const error = new OptimisticConcurrencyError(streamId, 3, 5);

    expect(error.code).toBe('OPTIMISTIC_CONCURRENCY');
    expect(error.streamId).toBe(streamId);
    expect(error.expectedVersion).toBe(3);
    expect(error.actualVersion).toBe(5);
    expect(error.message).toContain('Counter-counter-1');
    expect(error.context).toMatchObject({ expectedVersion: 3, actualVersion: 5 });
  });
});

describe('EventSerializationError', () => {
  it('should_expose_code_event_type_and_context', () => {
    const error = new EventSerializationError('CounterIncremented', 'bad payload', { detail: 'x' });

    expect(error.code).toBe('EVENT_SERIALIZATION_ERROR');
    expect(error.eventType).toBe('CounterIncremented');
    expect(error.message).toBe('bad payload');
    expect(error.context).toMatchObject({ eventType: 'CounterIncremented', detail: 'x' });
  });
});
