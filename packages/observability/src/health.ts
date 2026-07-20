export enum HealthStatus {
  Healthy = "healthy",
  Degraded = "degraded",
  Unhealthy = "unhealthy",
}

export interface HealthCheckResult {
  readonly status: HealthStatus;
  readonly detail?: string;
  readonly latencyMs?: number;
}

export interface HealthReport {
  readonly status: HealthStatus;
  readonly checks: ReadonlyArray<{ readonly name: string } & HealthCheckResult>;
  readonly computedAt: string;
}

export type CheckRecord = { readonly name: string } & HealthCheckResult;

export interface HealthCheck {
  readonly name: string;
  check(): Promise<HealthCheckResult> | HealthCheckResult;
}

/** Aggregates independent health checks into a single platform report. */
export class HealthRegistry {
  private readonly checks = new Map<string, HealthCheck>();

  register(check: HealthCheck): void {
    this.checks.set(check.name, check);
  }

  unregister(name: string): void {
    this.checks.delete(name);
  }

  async aggregate(): Promise<HealthReport> {
    const results: CheckRecord[] = [];
    for (const check of this.checks.values()) {
      const start = Date.now();
      try {
        const result = await check.check();
        results.push({ name: check.name, ...result, latencyMs: result.latencyMs ?? Date.now() - start });
      } catch (err) {
        results.push({
          name: check.name,
          status: HealthStatus.Unhealthy,
          detail: err instanceof Error ? err.message : String(err),
          latencyMs: Date.now() - start,
        });
      }
    }
    const status = results.some((r) => r.status === HealthStatus.Unhealthy)
      ? HealthStatus.Unhealthy
      : results.some((r) => r.status === HealthStatus.Degraded)
        ? HealthStatus.Degraded
        : HealthStatus.Healthy;
    return { status, checks: results, computedAt: new Date().toISOString() };
  }
}

export function createHealthRegistry(): HealthRegistry {
  return new HealthRegistry();
}
