import { describe, expect, it } from 'vitest';

import { Specification, specification } from './specification';

class IsPositive extends Specification<number> {
  public isSatisfiedBy(candidate: number): boolean {
    return candidate > 0;
  }
}

class IsEven extends Specification<number> {
  public isSatisfiedBy(candidate: number): boolean {
    return candidate % 2 === 0;
  }
}

describe('Specification', () => {
  it('isSatisfiedBy_should_evaluate_the_wrapped_rule', () => {
    expect(new IsPositive().isSatisfiedBy(1)).toBe(true);
    expect(new IsPositive().isSatisfiedBy(-1)).toBe(false);
  });

  it('and_should_require_both_specifications', () => {
    const spec = new IsPositive().and(new IsEven());
    expect(spec.isSatisfiedBy(2)).toBe(true);
    expect(spec.isSatisfiedBy(3)).toBe(false);
    expect(spec.isSatisfiedBy(-2)).toBe(false);
  });

  it('or_should_require_at_least_one_specification', () => {
    const spec = new IsPositive().or(new IsEven());
    expect(spec.isSatisfiedBy(3)).toBe(true);
    expect(spec.isSatisfiedBy(-2)).toBe(true);
    expect(spec.isSatisfiedBy(-3)).toBe(false);
  });

  it('not_should_negate_the_specification', () => {
    const spec = new IsPositive().not();
    expect(spec.isSatisfiedBy(-1)).toBe(true);
    expect(spec.isSatisfiedBy(1)).toBe(false);
  });

  it('specification_should_wrap_a_plain_predicate', () => {
    const isLarge = specification((value: number) => value > 100);
    expect(isLarge.and(new IsEven()).isSatisfiedBy(102)).toBe(true);
    expect(isLarge.isSatisfiedBy(10)).toBe(false);
  });
});
