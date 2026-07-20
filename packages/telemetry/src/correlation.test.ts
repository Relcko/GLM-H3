import { describe, expect, it } from 'vitest';

import { CorrelationScope, correlationScope } from './correlation';

import type { CorrelationContext } from './correlation';
import type { CorrelationId, EventId } from '@relcko/types';

const context = (correlationId: string, causationId?: string): CorrelationContext => ({
  correlationId: correlationId as CorrelationId,
  ...(causationId !== undefined ? { causationId: causationId as EventId } : {}),
});

describe('CorrelationScope', () => {
  it('current_should_return_undefined_outside_any_scope', () => {
    const scope = new CorrelationScope();
    expect(scope.current()).toBeUndefined();
    expect(scope.currentCorrelationId()).toBeUndefined();
  });

  it('run_should_make_the_context_available_inside_the_scope', () => {
    const scope = new CorrelationScope();
    const ctx = context('corr-1', 'evt-9');

    const observed = scope.run(ctx, () => scope.current());

    expect(observed).toEqual(ctx);
    expect(scope.current()).toBeUndefined();
  });

  it('run_should_restore_the_outer_context_after_a_nested_scope', () => {
    const scope = new CorrelationScope();

    scope.run(context('outer'), () => {
      scope.run(context('inner'), () => {
        expect(scope.currentCorrelationId()).toBe('inner');
      });
      expect(scope.currentCorrelationId()).toBe('outer');
    });
  });

  it('run_should_propagate_context_across_async_boundaries', async () => {
    const scope = new CorrelationScope();

    const observed = await scope.run(context('corr-async'), async () => {
      await Promise.resolve();
      return scope.currentCorrelationId();
    });

    expect(observed).toBe('corr-async');
  });

  it('correlationScope_should_be_a_shared_instance', () => {
    correlationScope.run(context('shared-1'), () => {
      expect(correlationScope.currentCorrelationId()).toBe('shared-1');
    });
  });
});
