import { ValidationError } from '@relcko/errors';
import { describe, expect, it } from 'vitest';


import { asStreamId, streamIdFor } from './stream-id';

describe('asStreamId', () => {
  it('should_return_the_input_when_valid', () => {
    expect(asStreamId('Counter-counter-1')).toBe('Counter-counter-1');
  });

  it('should_throw_when_value_is_blank', () => {
    expect(() => asStreamId('')).toThrow(ValidationError);
    expect(() => asStreamId('   ')).toThrow(ValidationError);
  });
});

describe('streamIdFor', () => {
  it('should_combine_aggregate_type_and_id', () => {
    expect(streamIdFor('Counter', 'counter-1')).toBe('Counter-counter-1');
  });

  it('should_throw_when_a_part_is_blank', () => {
    expect(() => streamIdFor('', 'counter-1')).toThrow(ValidationError);
    expect(() => streamIdFor('Counter', ' ')).toThrow(ValidationError);
  });
});
