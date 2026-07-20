import { describe, expect, it } from 'vitest';

import { DefaultValidationPipeline } from './validation-pipeline';
import { ValidationFailedError } from '../errors/application-error';

import type { Validator } from './validation-pipeline';

describe('DefaultValidationPipeline', () => {
  it('passes when all validators succeed', async () => {
    const pipeline = new DefaultValidationPipeline();
    const alwaysPass: Validator<{ x: number }> = { validate() { return []; } };
    await expect(pipeline.execute({ x: 1 }, [alwaysPass])).resolves.toBeUndefined();
  });

  it('collects errors from validators', async () => {
    const pipeline = new DefaultValidationPipeline();
    const failMin: Validator<{ x: number }> = {
      validate(p) { return p.x < 10 ? ['must be >= 10'] : []; },
    };
    const failMax: Validator<{ x: number }> = {
      validate(p) { return p.x > 100 ? ['must be <= 100'] : []; },
    };
    await expect(pipeline.execute({ x: 5 }, [failMin, failMax])).rejects.toThrow(ValidationFailedError);
  });

  it('aggregates multiple error messages', async () => {
    const pipeline = new DefaultValidationPipeline();
    const err1: Validator<Record<string, unknown>> = { validate() { return ['error one']; } };
    const err2: Validator<Record<string, unknown>> = { validate() { return ['error two']; } };
    try {
      await pipeline.execute({}, [err1, err2]);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationFailedError);
      const e = error as ValidationFailedError;
      expect(e.context.errors).toEqual(['error one', 'error two']);
    }
  });

  it('handles async validators', async () => {
    const pipeline = new DefaultValidationPipeline();
    const asyncValidator: Validator<Record<string, unknown>> = {
      async validate() {
        await Promise.resolve();
        return ['async error'];
      },
    };
    await expect(pipeline.execute({}, [asyncValidator])).rejects.toThrow(ValidationFailedError);
  });

  it('passes with empty validators list', async () => {
    const pipeline = new DefaultValidationPipeline();
    await expect(pipeline.execute({ anything: 'goes' }, [])).resolves.toBeUndefined();
  });

  it('collects errors from mixed sync and async validators', async () => {
    const pipeline = new DefaultValidationPipeline();
    const sync: Validator<Record<string, unknown>> = { validate() { return ['sync fail']; } };
    const asyncValidator: Validator<Record<string, unknown>> = {
      async validate() {
        await Promise.resolve();
        return ['async fail'];
      },
    };
    try {
      await pipeline.execute({}, [sync, asyncValidator]);
      expect.unreachable('should have thrown');
    } catch (error) {
      const e = error as ValidationFailedError;
      expect(e.context.errors).toContain('sync fail');
      expect(e.context.errors).toContain('async fail');
    }
  });
});
