export type MetricTags = Readonly<Record<string, string | number | boolean>>;

export interface Metrics {
  increment(name: string, value?: number, tags?: MetricTags): void;
  gauge(name: string, value: number, tags?: MetricTags): void;
  /** Record a timing/histogram observation (value in seconds). */
  record(name: string, value: number, tags?: MetricTags): void;
}

/** No-op metrics — safe default when no collector is wired. */
export class NoopMetrics implements Metrics {
  increment(): void {}
  gauge(): void {}
  record(): void {}
}

export function createNoopMetrics(): Metrics {
  return new NoopMetrics();
}
