import { describe, expect, it } from 'vitest';

import { centsToNumber, numberToCents } from './primitives';

import type { AmountInCents } from './index';

describe('centsToNumber', () => {
  it('converts cents to number', () => {
    expect(centsToNumber(100 as AmountInCents)).toBe(1);
    expect(centsToNumber(1050 as AmountInCents)).toBe(10.5);
    expect(centsToNumber(0 as AmountInCents)).toBe(0);
  });
});

describe('numberToCents', () => {
  it('converts number to cents', () => {
    expect(numberToCents(1)).toBe(100);
    expect(numberToCents(10.5)).toBe(1050);
    expect(numberToCents(0)).toBe(0);
  });
});
