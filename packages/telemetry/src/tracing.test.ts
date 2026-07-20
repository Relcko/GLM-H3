import { describe, expect, it } from 'vitest';

import { InMemoryTracer, NoOpTracer } from './tracing';

describe('InMemoryTracer', () => {
  it('startSpan_should_generate_trace_and_span_ids', () => {
    const tracer = new InMemoryTracer();
    const span = tracer.startSpan('operation');

    expect(span.context.traceId).toBeDefined();
    expect(span.context.spanId).toBeDefined();
    expect(span.context.parentSpanId).toBeUndefined();
    expect(span.ended).toBe(false);
  });

  it('withSpan_should_end_the_span_and_record_it', () => {
    const tracer = new InMemoryTracer();

    const result = tracer.withSpan('operation', (span) => {
      span.setAttribute('key', 'value');
      return 42;
    });

    expect(result).toBe(42);
    const finished = tracer.finishedSpans();
    expect(finished).toHaveLength(1);
    expect(finished[0]?.name).toBe('operation');
    expect(finished[0]?.status).toBe('ok');
    expect(finished[0]?.attributes).toEqual({ key: 'value' });
    expect(finished[0]?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('withSpan_should_record_exceptions_and_rethrow', () => {
    const tracer = new InMemoryTracer();
    const failure = new Error('boom');

    expect(() =>
      tracer.withSpan('failing', () => {
        throw failure;
      }),
    ).toThrow(failure);

    const finished = tracer.finishedSpans();
    expect(finished).toHaveLength(1);
    expect(finished[0]?.status).toBe('error');
    expect(finished[0]?.events.some((event) => event.name === 'exception')).toBe(true);
  });

  it('nested_withSpan_should_link_parent_and_share_the_trace', () => {
    const tracer = new InMemoryTracer();

    tracer.withSpan('parent', (parent) => {
      tracer.withSpan('child', (child) => {
        expect(child.context.parentSpanId).toBe(parent.context.spanId);
        expect(child.context.traceId).toBe(parent.context.traceId);
      });
    });

    expect(tracer.finishedSpans().map((span) => span.name)).toEqual(['child', 'parent']);
  });

  it('startSpan_should_use_an_explicit_parent_context_when_provided', () => {
    const tracer = new InMemoryTracer();
    const parent = tracer.startSpan('parent');
    const child = tracer.startSpan('child', { parent: parent.context });

    expect(child.context.parentSpanId).toBe(parent.context.spanId);
    expect(child.context.traceId).toBe(parent.context.traceId);
  });

  it('mutations_after_end_should_be_ignored', () => {
    const tracer = new InMemoryTracer();
    const span = tracer.startSpan('operation');

    span.end();
    span.setAttribute('late', 'value');
    span.recordException(new Error('late'));
    span.end();

    const finished = tracer.finishedSpans();
    expect(finished).toHaveLength(1);
    expect(finished[0]?.attributes).toEqual({});
    expect(finished[0]?.events).toHaveLength(0);
    expect(finished[0]?.status).toBe('ok');
  });
});

describe('NoOpTracer', () => {
  it('should_execute_the_wrapped_function', () => {
    const tracer = new NoOpTracer();
    expect(tracer.withSpan('op', () => 'done')).toBe('done');
  });

  it('should_tolerate_all_span_operations', () => {
    const tracer = new NoOpTracer();
    const span = tracer.startSpan('op');

    expect(() => {
      span.setAttribute('k', 'v');
      span.addEvent('evt');
      span.recordException(new Error('x'));
      span.setStatus('error');
      span.end();
    }).not.toThrow();
    expect(span.ended).toBe(true);
  });
});
