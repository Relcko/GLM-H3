import { describe, expect, it } from 'vitest';

import { InMemoryMetricsProvider, NoOpMetricsProvider } from './metrics';

describe('InMemoryMetricsProvider', () => {
  it('counter_should_increment_by_one_by_default', () => {
    const metrics = new InMemoryMetricsProvider();
    const counter = metrics.counter('events_total');

    counter.inc();
    counter.inc();
    counter.inc(3);

    expect(metrics.snapshot().counters.get('events_total')).toBe(5);
  });

  it('counter_should_track_labelled_series_independently', () => {
    const metrics = new InMemoryMetricsProvider();
    const counter = metrics.counter('events_total');

    counter.inc(1, { type: 'A' });
    counter.inc(2, { type: 'B' });
    counter.inc(4, { type: 'A' });

    const snapshot = metrics.snapshot();
    expect(snapshot.counters.get('events_total{type=A}')).toBe(5);
    expect(snapshot.counters.get('events_total{type=B}')).toBe(2);
  });

  it('counter_should_return_the_same_instance_for_the_same_name', () => {
    const metrics = new InMemoryMetricsProvider();
    expect(metrics.counter('same')).toBe(metrics.counter('same'));
  });

  it('gauge_should_support_set_inc_and_dec', () => {
    const metrics = new InMemoryMetricsProvider();
    const gauge = metrics.gauge('active_workers');

    gauge.set(10);
    gauge.inc();
    gauge.inc(4);
    gauge.dec(3);

    expect(metrics.snapshot().gauges.get('active_workers')).toBe(12);
  });

  it('histogram_should_count_observations_into_buckets', () => {
    const metrics = new InMemoryMetricsProvider();
    const histogram = metrics.histogram('latency_seconds', { buckets: [0.1, 0.5, 1] });

    histogram.observe(0.05);
    histogram.observe(0.3);
    histogram.observe(0.9);
    histogram.observe(5);

    const series = metrics.snapshot().histograms.get('latency_seconds');
    expect(series?.count).toBe(4);
    expect(series?.sum).toBeCloseTo(6.25);
    expect(series?.buckets.get(0.1)).toBe(1);
    expect(series?.buckets.get(0.5)).toBe(2);
    expect(series?.buckets.get(1)).toBe(3);
  });

  it('histogram_should_sort_unsorted_bucket_configuration', () => {
    const metrics = new InMemoryMetricsProvider();
    const histogram = metrics.histogram('sizes', { buckets: [10, 1, 5] });

    histogram.observe(0.5);

    const series = metrics.snapshot().histograms.get('sizes');
    expect(series?.buckets.get(1)).toBe(1);
    expect(series?.buckets.get(5)).toBe(1);
    expect(series?.buckets.get(10)).toBe(1);
  });

  it('snapshot_should_be_isolated_from_later_observations', () => {
    const metrics = new InMemoryMetricsProvider();
    const counter = metrics.counter('events_total');

    counter.inc();
    const snapshot = metrics.snapshot();
    counter.inc();

    expect(snapshot.counters.get('events_total')).toBe(1);
    expect(metrics.snapshot().counters.get('events_total')).toBe(2);
  });
});

describe('NoOpMetricsProvider', () => {
  it('should_accept_all_operations_without_throwing', () => {
    const metrics = new NoOpMetricsProvider();

    expect(() => {
      metrics.counter('c').inc(1, { a: 'b' });
      metrics.gauge('g').set(1);
      metrics.gauge('g').inc();
      metrics.gauge('g').dec();
      metrics.histogram('h').observe(1);
    }).not.toThrow();
  });
});
