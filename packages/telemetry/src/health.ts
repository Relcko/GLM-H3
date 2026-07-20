import { HealthChecker } from '@relcko/shared';

import type { HealthCheckable, HealthCheckResult, HealthStatus } from '@relcko/shared';

/**
 * Aggregated health report of the platform runtime.
 */
export interface HealthReport {
  /** Worst status across all registered components. */
  readonly status: HealthStatus;
  /** Per-component results. */
  readonly components: readonly HealthCheckResult[];
  /** Time the report was produced. */
  readonly checkedAt: Date;
  /** Milliseconds since the aggregator was created. */
  readonly uptimeMs: number;
  /** Platform version attached to the report. */
  readonly version: string;
}

/** Options accepted by {@link HealthAggregator}. */
export interface HealthAggregatorOptions {
  /** Platform version reported in every health report. */
  readonly version?: string;
  /** Epoch milliseconds used as uptime origin. Defaults to creation time. */
  readonly startedAt?: number;
}

/**
 * Health aggregation (Playbook 6.6).
 *
 * Collects {@link HealthCheckable} components, executes their checks, and
 * aggregates an overall status: any unhealthy component makes the system
 * unhealthy; otherwise any degraded component makes it degraded.
 */
export class HealthAggregator {
  private readonly checker = new HealthChecker();
  private readonly startedAt: number;
  private readonly version: string;

  constructor(options?: HealthAggregatorOptions) {
    this.version = options?.version ?? 'unknown';
    this.startedAt = options?.startedAt ?? Date.now();
  }

  /**
   * Registers a component health check.
   *
   * @param checkable - component to include in every report
   */
  register(checkable: HealthCheckable): void {
    this.checker.register(checkable);
  }

  /**
   * Executes all registered checks and builds the aggregated report.
   *
   * @returns aggregated health report
   */
  async check(): Promise<HealthReport> {
    const components = await this.checker.runAll();
    return {
      status: aggregateStatus(components),
      components,
      checkedAt: new Date(),
      uptimeMs: Date.now() - this.startedAt,
      version: this.version,
    };
  }
}

function aggregateStatus(components: readonly HealthCheckResult[]): HealthStatus {
  if (components.some((component) => component.status === 'unhealthy')) {
    return 'unhealthy';
  }
  if (components.some((component) => component.status === 'degraded')) {
    return 'degraded';
  }
  return 'healthy';
}
