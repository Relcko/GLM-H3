import type { IClock } from "../infrastructure/services/clock";

export interface MetricValue {
  readonly name: string;
  readonly value: number;
  readonly labels: Record<string, string>;
  readonly timestamp: number;
  readonly type: "counter" | "gauge" | "histogram";
}

export interface MetricSnapshot {
  readonly metrics: readonly MetricValue[];
  readonly collectedAt: number;
  readonly source: string;
}

export interface ThroughputMetric {
  readonly opsPerSecond: number;
  readonly windowSeconds: number;
  readonly totalOps: number;
}

export interface LatencyMetric {
  readonly min: number;
  readonly max: number;
  readonly avg: number;
  readonly p50: number;
  readonly p90: number;
  readonly p99: number;
}

export class MetricsExporter {
  private readonly _metrics: MetricValue[] = [];
  private readonly _counters = new Map<string, number>();
  private readonly _gauges = new Map<string, number>();
  private readonly _histograms = new Map<string, number[]>();
  private _exportCount = 0;

  constructor(
    private readonly source: string,
    private readonly clock: IClock,
  ) {}

  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    const key = this.labelKey(name, labels ?? {});
    this._counters.set(key, (this._counters.get(key) ?? 0) + value);
    this._metrics.push({
      name,
      value,
      labels: labels ?? {},
      timestamp: this.clock.nowMs(),
      type: "counter",
    });
  }

  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.labelKey(name, labels ?? {});
    this._gauges.set(key, value);
    this._metrics.push({
      name,
      value,
      labels: labels ?? {},
      timestamp: this.clock.nowMs(),
      type: "gauge",
    });
  }

  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.labelKey(name, labels ?? {});
    const bucket = this._histograms.get(key) ?? [];
    bucket.push(value);
    this._histograms.set(key, bucket);
    this._metrics.push({
      name,
      value,
      labels: labels ?? {},
      timestamp: this.clock.nowMs(),
      type: "histogram",
    });
  }

  getCounterValue(name: string, labels?: Record<string, string>): number {
    return this._counters.get(this.labelKey(name, labels ?? {})) ?? 0;
  }

  getGaugeValue(name: string, labels?: Record<string, string>): number {
    return this._gauges.get(this.labelKey(name, labels ?? {})) ?? 0;
  }

  getHistogramValues(name: string, labels?: Record<string, string>): readonly number[] {
    return this._histograms.get(this.labelKey(name, labels ?? {})) ?? [];
  }

  getCounterNames(): readonly string[] {
    return Array.from(this._counters.keys()).map((k) => k.split("|")[0] ?? k);
  }

  getGaugeNames(): readonly string[] {
    return Array.from(this._gauges.keys()).map((k) => k.split("|")[0] ?? k);
  }

  trackThroughput(name: string, opsPerSecond: number, totalOps: number): void {
    this.setGauge(`${name}_throughput`, opsPerSecond, { unit: "ops_per_sec" });
    this.setGauge(`${name}_total_ops`, totalOps, {});
  }

  trackLatency(name: string, latency: LatencyMetric): void {
    this.setGauge(`${name}_latency_min`, latency.min, { quantile: "min" });
    this.setGauge(`${name}_latency_max`, latency.max, { quantile: "max" });
    this.setGauge(`${name}_latency_avg`, latency.avg, { quantile: "avg" });
    this.setGauge(`${name}_latency_p50`, latency.p50, { quantile: "p50" });
    this.setGauge(`${name}_latency_p90`, latency.p90, { quantile: "p90" });
    this.setGauge(`${name}_latency_p99`, latency.p99, { quantile: "p99" });
  }

  exportSnapshot(): MetricSnapshot {
    this._exportCount += 1;
    return {
      metrics: [...this._metrics],
      collectedAt: this.clock.nowMs(),
      source: this.source,
    };
  }

  exportPrometheus(): string {
    const lines: string[] = [];
    lines.push(`# HELP distribution_operations Metrics from distribution operations`);
    lines.push(`# TYPE distribution_operations gauge`);

    for (const [key, value] of this._gauges) {
      const [name, ...labelPairs] = key.split("|");
      const labels = labelPairs
        .filter((p) => p.includes(":"))
        .map((p) => {
          const [k, v] = p.split(":", 2);
          return `${k}="${v ?? ""}"`;
        })
        .join(",");
      const labelStr = labels ? `{${labels}}` : "";
      lines.push(`distribution_${name}${labelStr} ${value}`);
    }

    for (const [key, value] of this._counters) {
      const [name, ...labelPairs] = key.split("|");
      const labels = labelPairs
        .filter((p) => p.includes(":"))
        .map((p) => {
          const [k, v] = p.split(":", 2);
          return `${k}="${v ?? ""}"`;
        })
        .join(",");
      const labelStr = labels ? `{${labels}}` : "";
      lines.push(`distribution_${name}_total${labelStr} ${value}`);
    }

    for (const [key, values] of this._histograms) {
      const [name] = key.split("|");
      const sorted = [...values].sort((a, b) => a - b);
      lines.push(`# TYPE distribution_${name}_bucket histogram`);
      for (const v of sorted) {
        lines.push(`distribution_${name}_bucket{le="${v}"} ${sorted.filter((x) => x <= v).length}`);
      }
      lines.push(`distribution_${name}_count ${values.length}`);
    }

    return lines.join("\n");
  }

  exportOpenTelemetry(): Record<string, unknown> {
    return {
      resourceMetrics: [
        {
          resource: { attributes: [{ key: "service.name", value: { stringValue: this.source } }] },
          scopeMetrics: [
            {
              scope: { name: "distribution.operations" },
              metrics: this._metrics.map((m) => ({
                name: m.name,
                description: `Distribution metric: ${m.name}`,
                unit: "1",
                [m.type === "histogram" ? "histogram" : m.type === "counter" ? "sum" : "gauge"]: {
                  dataPoints: [
                    {
                      attributes: Object.entries(m.labels).map(([k, v]) => ({
                        key: k,
                        value: { stringValue: v },
                      })),
                      timeUnixNano: BigInt(m.timestamp) * BigInt(1_000_000),
                      asInt: m.type === "histogram" ? undefined : Math.round(m.value),
                      count: m.type === "histogram" ? 1 : undefined,
                    },
                  ],
                },
              })),
            },
          ],
        },
      ],
    };
  }

  reset(): void {
    this._metrics.length = 0;
    this._counters.clear();
    this._gauges.clear();
    this._histograms.clear();
    this._exportCount = 0;
  }

  private labelKey(name: string, labels: Record<string, string>): string {
    const parts = [name];
    for (const [k, v] of Object.entries(labels).sort(([a], [b]) => a.localeCompare(b))) {
      parts.push(`${k}:${v}`);
    }
    return parts.join("|");
  }
}
