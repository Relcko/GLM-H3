/** Label set attached to a metric series. */
export type MetricLabels = Record<string, string>;

/**
 * Monotonically increasing counter metric.
 */
export interface Counter {
  /**
   * Increments the counter.
   *
   * @param value - increment amount (must be >= 0), defaults to 1
   * @param labels - label set identifying the series
   */
  inc(value?: number, labels?: MetricLabels): void;
}

/**
 * Point-in-time gauge metric.
 */
export interface Gauge {
  /**
   * Sets the gauge to an absolute value.
   *
   * @param value - new gauge value
   * @param labels - label set identifying the series
   */
  set(value: number, labels?: MetricLabels): void;

  /**
   * Increments the gauge.
   *
   * @param delta - increment amount, defaults to 1
   * @param labels - label set identifying the series
   */
  inc(delta?: number, labels?: MetricLabels): void;

  /**
   * Decrements the gauge.
   *
   * @param delta - decrement amount, defaults to 1
   * @param labels - label set identifying the series
   */
  dec(delta?: number, labels?: MetricLabels): void;
}

/**
 * Distribution metric counting observations into configurable buckets.
 */
export interface Histogram {
  /**
   * Records an observation.
   *
   * @param value - observed value
   * @param labels - label set identifying the series
   */
  observe(value: number, labels?: MetricLabels): void;
}

/** Options accepted when creating a {@link Histogram}. */
export interface HistogramOptions {
  /** Human-readable metric description. */
  readonly description?: string;
  /** Ascending bucket upper bounds (le semantics). Defaults provided. */
  readonly buckets?: readonly number[];
}

/** Immutable snapshot of one histogram series. */
export interface HistogramSeriesSnapshot {
  /** Total number of observations. */
  readonly count: number;
  /** Sum of all observed values. */
  readonly sum: number;
  /** Bucket upper bound to cumulative observation count. */
  readonly buckets: ReadonlyMap<number, number>;
}

/** Immutable snapshot of every series collected by a provider. */
export interface MetricsSnapshot {
  /** Series key to counter value. */
  readonly counters: ReadonlyMap<string, number>;
  /** Series key to gauge value. */
  readonly gauges: ReadonlyMap<string, number>;
  /** Series key to histogram snapshot. */
  readonly histograms: ReadonlyMap<string, HistogramSeriesSnapshot>;
}

/**
 * Metrics factory. Implementations bridge to a metrics backend; the default
 * {@link InMemoryMetricsProvider} keeps series in process memory.
 */
export interface MetricsProvider {
  /**
   * Returns the counter registered under name, creating it on first use.
   *
   * @param name - metric name (snake_case)
   * @param description - human-readable description
   */
  counter(name: string, description?: string): Counter;

  /**
   * Returns the gauge registered under name, creating it on first use.
   *
   * @param name - metric name (snake_case)
   * @param description - human-readable description
   */
  gauge(name: string, description?: string): Gauge;

  /**
   * Returns the histogram registered under name, creating it on first use.
   *
   * @param name - metric name (snake_case)
   * @param options - histogram configuration
   */
  histogram(name: string, options?: HistogramOptions): Histogram;
}

const DEFAULT_BUCKETS: readonly number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

function seriesKey(name: string, labels?: MetricLabels): string {
  if (labels === undefined || Object.keys(labels).length === 0) {
    return name;
  }
  const suffix = Object.keys(labels)
    .sort()
    .map((key) => `${key}=${labels[key] ?? ''}`)
    .join(',');
  return `${name}{${suffix}}`;
}

class InMemoryCounter implements Counter {
  readonly series = new Map<string, number>();

  constructor(readonly name: string) {}

  inc(value = 1, labels?: MetricLabels): void {
    const key = seriesKey(this.name, labels);
    this.series.set(key, (this.series.get(key) ?? 0) + value);
  }
}

class InMemoryGauge implements Gauge {
  readonly series = new Map<string, number>();

  constructor(readonly name: string) {}

  set(value: number, labels?: MetricLabels): void {
    this.series.set(seriesKey(this.name, labels), value);
  }

  inc(delta = 1, labels?: MetricLabels): void {
    const key = seriesKey(this.name, labels);
    this.series.set(key, (this.series.get(key) ?? 0) + delta);
  }

  dec(delta = 1, labels?: MetricLabels): void {
    const key = seriesKey(this.name, labels);
    this.series.set(key, (this.series.get(key) ?? 0) - delta);
  }
}

interface HistogramSeries {
  count: number;
  sum: number;
  buckets: Map<number, number>;
}

class InMemoryHistogram implements Histogram {
  readonly series = new Map<string, HistogramSeries>();
  readonly buckets: readonly number[];

  constructor(
    readonly name: string,
    buckets?: readonly number[],
  ) {
    this.buckets = [...(buckets ?? DEFAULT_BUCKETS)].sort((a, b) => a - b);
  }

  observe(value: number, labels?: MetricLabels): void {
    const key = seriesKey(this.name, labels);
    let target = this.series.get(key);
    if (target === undefined) {
      target = { count: 0, sum: 0, buckets: new Map(this.buckets.map((bound) => [bound, 0])) };
      this.series.set(key, target);
    }
    target.count += 1;
    target.sum += value;
    for (const bound of this.buckets) {
      if (value <= bound) {
        target.buckets.set(bound, (target.buckets.get(bound) ?? 0) + 1);
      }
    }
  }
}

/**
 * Dependency-free {@link MetricsProvider} keeping all series in memory.
 * Suitable for tests, local development, and as a scrape source for a
 * metrics exporter bridge.
 */
export class InMemoryMetricsProvider implements MetricsProvider {
  private readonly counters = new Map<string, InMemoryCounter>();
  private readonly gauges = new Map<string, InMemoryGauge>();
  private readonly histograms = new Map<string, InMemoryHistogram>();

  counter(name: string, _description?: string): Counter {
    let metric = this.counters.get(name);
    if (metric === undefined) {
      metric = new InMemoryCounter(name);
      this.counters.set(name, metric);
    }
    return metric;
  }

  gauge(name: string, _description?: string): Gauge {
    let metric = this.gauges.get(name);
    if (metric === undefined) {
      metric = new InMemoryGauge(name);
      this.gauges.set(name, metric);
    }
    return metric;
  }

  histogram(name: string, options?: HistogramOptions): Histogram {
    let metric = this.histograms.get(name);
    if (metric === undefined) {
      metric = new InMemoryHistogram(name, options?.buckets);
      this.histograms.set(name, metric);
    }
    return metric;
  }

  /**
   * Returns an immutable snapshot of every collected series.
   *
   * @returns point-in-time copy of all counters, gauges, and histograms
   */
  snapshot(): MetricsSnapshot {
    const counters = new Map<string, number>();
    for (const metric of this.counters.values()) {
      for (const [key, value] of metric.series) {
        counters.set(key, value);
      }
    }
    const gauges = new Map<string, number>();
    for (const metric of this.gauges.values()) {
      for (const [key, value] of metric.series) {
        gauges.set(key, value);
      }
    }
    const histograms = new Map<string, HistogramSeriesSnapshot>();
    for (const metric of this.histograms.values()) {
      for (const [key, value] of metric.series) {
        histograms.set(key, {
          count: value.count,
          sum: value.sum,
          buckets: new Map(value.buckets),
        });
      }
    }
    return { counters, gauges, histograms };
  }
}

class NoOpCounter implements Counter {
  inc(_value?: number, _labels?: MetricLabels): void {}
}

class NoOpGauge implements Gauge {
  set(_value: number, _labels?: MetricLabels): void {}
  inc(_delta?: number, _labels?: MetricLabels): void {}
  dec(_delta?: number, _labels?: MetricLabels): void {}
}

class NoOpHistogram implements Histogram {
  observe(_value: number, _labels?: MetricLabels): void {}
}

/**
 * {@link MetricsProvider} that discards every observation. Useful when
 * metrics are disabled by configuration.
 */
export class NoOpMetricsProvider implements MetricsProvider {
  private readonly noOpCounter = new NoOpCounter();
  private readonly noOpGauge = new NoOpGauge();
  private readonly noOpHistogram = new NoOpHistogram();

  counter(_name: string, _description?: string): Counter {
    return this.noOpCounter;
  }

  gauge(_name: string, _description?: string): Gauge {
    return this.noOpGauge;
  }

  histogram(_name: string, _options?: HistogramOptions): Histogram {
    return this.noOpHistogram;
  }
}
