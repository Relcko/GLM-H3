import { describe, expect, it } from 'vitest';

import { Failure, Result, Success } from './result';

describe('Result', () => {
  describe('ok', () => {
    it('creates a Success result', () => {
      const r = Result.ok(42);
      expect(r.isSuccess()).toBe(true);
      expect(r.isFailure()).toBe(false);
      expect(r.getOrThrow()).toBe(42);
    });

    it('freezes the instance', () => {
      const r = Result.ok(42);
      expect(Object.isFrozen(r)).toBe(true);
    });
  });

  describe('fail', () => {
    it('creates a Failure result', () => {
      const error = new Error('boom');
      const r = Result.fail(error);
      expect(r.isSuccess()).toBe(false);
      expect(r.isFailure()).toBe(true);
      expect(r.getError()).toBe(error);
    });

    it('throws when getOrThrow is called', () => {
      const r = Result.fail(new Error('boom'));
      expect(() => r.getOrThrow()).toThrow('boom');
    });

    it('freezes the instance', () => {
      const r = Result.fail(new Error('boom'));
      expect(Object.isFrozen(r)).toBe(true);
    });
  });

  describe('Success.getError', () => {
    it('throws when called on success', () => {
      const r = Result.ok(42);
      expect(() => r.getError()).toThrow('Cannot get error from Success result');
    });
  });

  describe('map', () => {
    it('transforms a Success value', () => {
      const r = Result.ok(42).map((x) => x * 2);
      expect(r.getOrThrow()).toBe(84);
    });

    it('skips transformation on Failure', () => {
      const r: Result<string, string> = Result.fail<string, string>('err').map((x) => x.toUpperCase());
      expect(r.getError()).toBe('err');
    });
  });

  describe('flatMap', () => {
    it('chains successful computations', () => {
      const r = Result.ok(10).flatMap((x) => Result.ok(x * 3));
      expect(r.getOrThrow()).toBe(30);
    });

    it('short-circuits on failure', () => {
      const r: Result<number, string> = Result.ok<number, string>(10).flatMap(() => Result.fail('fail'));
      expect(r.isFailure()).toBe(true);
      expect(r.getError()).toBe('fail');
    });
  });

  describe('mapError', () => {
    it('transforms error on Failure', () => {
      const r = Result.fail<number, string>('err').mapError((e) => `mapped: ${e}`);
      expect(r.getError()).toBe('mapped: err');
    });

    it('does not affect Success', () => {
      const r: Result<number, string> = Result.ok<number, string>(42).mapError((e: string) => `mapped: ${e}`);
      expect(r.getOrThrow()).toBe(42);
    });
  });

  describe('combine', () => {
    it('collects all values when all succeed', () => {
      const results = [Result.ok(1), Result.ok(2), Result.ok(3)];
      const combined = Result.combine(results);
      expect(combined.getOrThrow()).toEqual([1, 2, 3]);
    });

    it('returns first failure', () => {
      const results: Result<number, string>[] = [Result.ok(1), Result.fail('fail'), Result.ok(3)];
      const combined = Result.combine(results);
      expect(combined.isFailure()).toBe(true);
      expect(combined.getError()).toBe('fail');
    });
  });

  describe('type narrowing', () => {
    it('narrows Success with isSuccess', () => {
      const r: Result<number, string> = Result.ok<number, string>(42);
      expect(r.isSuccess()).toBe(true);
      if (r.isSuccess()) {
        expect(r.getOrThrow()).toBe(42);
      }
    });

    it('narrows Failure with isFailure', () => {
      const r = Result.fail('err');
      if (r.isFailure()) {
        expect(r.getError()).toBe('err');
      }
    });
  });

  describe('Success class', () => {
    it('is an instance of Result and Success', () => {
      const r = Result.ok(42);
      expect(r).toBeInstanceOf(Result);
      expect(r).toBeInstanceOf(Success);
    });
  });

  describe('Failure class', () => {
    it('is an instance of Result and Failure', () => {
      const r = Result.fail('err');
      expect(r).toBeInstanceOf(Result);
      expect(r).toBeInstanceOf(Failure);
    });
  });
});
