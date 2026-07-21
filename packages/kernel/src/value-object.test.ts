import { describe, expect, it } from 'vitest';

import { ValueObject } from './value-object';

class Money extends ValueObject {
  constructor(
    readonly amountInCents: number,
    readonly currency: string,
  ) {
    super();
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.amountInCents, this.currency];
  }
}

class Percentage extends ValueObject {
  constructor(readonly value: number) {
    super();
  }

  protected getEqualityComponents(): Iterable<unknown> {
    return [this.value];
  }
}

describe('ValueObject', () => {
  it('equals_should_return_true_when_all_components_match', () => {
    expect(new Money(1000, 'USD').equals(new Money(1000, 'USD'))).toBe(true);
  });

  it('equals_should_return_false_when_a_component_differs', () => {
    expect(new Money(1000, 'USD').equals(new Money(1001, 'USD'))).toBe(false);
    expect(new Money(1000, 'USD').equals(new Money(1000, 'EUR'))).toBe(false);
  });

  it('equals_should_return_false_when_types_differ', () => {
    expect(new Money(10, 'USD').equals(new Percentage(10))).toBe(false);
  });

  it('equals_should_return_false_when_other_is_null_or_undefined', () => {
    const money = new Money(1000, 'USD');
    expect(money.equals(null)).toBe(false);
    expect(money.equals(undefined)).toBe(false);
  });
});
