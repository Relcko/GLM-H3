import { describe, expect, it } from 'vitest';

import { generateId, partition, groupBy, deepFreeze, isNotNullOrUndefined } from './index';

describe('generateId', () => {
  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe('partition', () => {
  it('splits array by predicate', () => {
    const [even, odd] = partition([1, 2, 3, 4], (n) => n % 2 === 0);
    expect(even).toEqual([2, 4]);
    expect(odd).toEqual([1, 3]);
  });
});

describe('groupBy', () => {
  it('groups items by key', () => {
    const items: { group: string; val: number }[] = [
      { group: 'a', val: 1 },
      { group: 'b', val: 2 },
      { group: 'a', val: 3 },
    ];
    const result = groupBy(items, (i) => i.group);
    expect(result.a).toHaveLength(2);
    expect(result.b).toHaveLength(1);
  });
});

describe('deepFreeze', () => {
  it('freezes nested objects', () => {
    const obj = deepFreeze({ a: { b: 1 } });
    expect(Object.isFrozen(obj)).toBe(true);
    expect(Object.isFrozen(obj.a)).toBe(true);
  });
});

describe('isNotNullOrUndefined', () => {
  it('filters null and undefined', () => {
    const result = [1, null, 2, undefined].filter(isNotNullOrUndefined);
    expect(result).toEqual([1, 2]);
  });
});
