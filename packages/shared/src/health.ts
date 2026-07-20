export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResult {
  readonly status: HealthStatus;
  readonly component: string;
  readonly message?: string;
  readonly latencyMs?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface HealthCheckable {
  readonly componentName: string;
  check(): Promise<HealthCheckResult>;
}

export class HealthChecker {
  private readonly checks: HealthCheckable[] = [];

  register(checkable: HealthCheckable): void {
    this.checks.push(checkable);
  }

  async runAll(): Promise<HealthCheckResult[]> {
    const results = await Promise.allSettled(
      this.checks.map(async (check) => {
        const start = performance.now();
        try {
          const result = await check.check();
          return {
            ...result,
            latencyMs: performance.now() - start,
          };
        } catch (error) {
          return {
            status: 'unhealthy' as HealthStatus,
            component: check.componentName,
            message: error instanceof Error ? error.message : 'Unknown error',
            latencyMs: performance.now() - start,
          };
        }
      }),
    );

    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        status: 'unhealthy' as HealthStatus,
        component: 'unknown',
        message: 'Health check execution failed',
      };
    });
  }

  async getAggregateStatus(): Promise<HealthStatus> {
    const results = await this.runAll();
    if (results.some((r) => r.status === 'unhealthy')) {
      return 'unhealthy';
    }
    if (results.some((r) => r.status === 'degraded')) {
      return 'degraded';
    }
    return 'healthy';
  }
}
