import type { IClock } from "../infrastructure/services/clock";
import type { OperationLogger } from "./operation-logger";
import type { HealthCheckService, HealthReport } from "./health-check.service";
import type { MetricsExporter } from "./metrics-exporter";
import type { DeadLetterQueue } from "./dead-letter-queue";

export enum LifecyclePhase {
  Initializing = "initializing",
  Starting = "starting",
  Running = "running",
  Draining = "draining",
  Flushing = "flushing",
  Stopped = "stopped",
  Failed = "failed",
}

export interface LifecycleReport {
  readonly phase: LifecyclePhase;
  readonly healthy: boolean;
  readonly healthReport: HealthReport | null;
  readonly uptimeMs: number;
  readonly startedAt: number;
  readonly drainProgress: DrainProgress | null;
}

export interface DrainProgress {
  readonly workersRemaining: number;
  readonly checkpointsFlushed: boolean;
  readonly projectionsFlushed: boolean;
  readonly metricsFlushed: boolean;
}

export interface Flushable {
  flush(): Promise<void>;
  readonly name: string;
}

export interface Drainable {
  drain(): Promise<void>;
  readonly remaining: number;
  readonly name: string;
}

export class LifecycleManager {
  private _phase: LifecyclePhase = LifecyclePhase.Initializing;
  private readonly _startedAt: number;
  private _drainProgress: DrainProgress | null = null;
  private readonly _flushables: Flushable[] = [];
  private readonly _drainables: Drainable[] = [];

  constructor(
    private readonly healthService: HealthCheckService,
    private readonly metricsExporter: MetricsExporter,
    private readonly deadLetterQueue: DeadLetterQueue,
    private readonly logger: OperationLogger,
    private readonly clock: IClock,
  ) {
    this._startedAt = this.clock.nowMs();
  }

  get phase(): LifecyclePhase {
    return this._phase;
  }

  get uptimeMs(): number {
    return this.clock.nowMs() - this._startedAt;
  }

  registerFlushable(flushable: Flushable): void {
    this._flushables.push(flushable);
  }

  registerDrainable(drainable: Drainable): void {
    this._drainables.push(drainable);
  }

  async startup(): Promise<LifecycleReport> {
    this._phase = LifecyclePhase.Starting;
    this.logger.info("Lifecycle starting", { phase: this._phase });

    const healthReport = await this.healthService.checkAll();
    const isHealthy = healthReport.overall !== "failed";

    if (!isHealthy) {
      this._phase = LifecyclePhase.Failed;
      this.logger.error("Startup validation failed", {
        failedChecks: String(healthReport.failedCount),
        degradedChecks: String(healthReport.degradedCount),
      });
      return this.buildReport(healthReport);
    }

    this._phase = LifecyclePhase.Running;
    this.logger.info("Lifecycle running", { phase: this._phase });
    return this.buildReport(healthReport);
  }

  async warmup(): Promise<void> {
    if (this._phase !== LifecyclePhase.Running) return;
    this.logger.info("Warmup started");
    this.metricsExporter.setGauge("warmup", 1, { status: "in_progress" });
    this.metricsExporter.setGauge("warmup", 0, { status: "complete" });
    this.logger.info("Warmup complete");
  }

  async shutdown(): Promise<LifecycleReport> {
    this._phase = LifecyclePhase.Draining;
    this.logger.info("Shutdown started", { phase: this._phase });

    const healthReport = await this.healthService.checkAll();

    await this.drainWorkers();
    await this.flushCheckpoints();
    await this.flushProjections();
    await this.flushMetrics();

    this._phase = LifecyclePhase.Stopped;
    this.logger.info("Shutdown complete", { phase: this._phase });

    return this.buildReport(healthReport);
  }

  async drainWorkers(): Promise<void> {
    this._phase = LifecyclePhase.Draining;
    let totalRemaining = 0;
    for (const drainable of this._drainables) {
      try {
        this.logger.info(`Draining ${drainable.name}`, { remaining: String(drainable.remaining) });
        await drainable.drain();
        totalRemaining += drainable.remaining;
      } catch (err) {
        this.logger.error(`Error draining ${drainable.name}`, err instanceof Error ? err : undefined);
      }
    }
    this._drainProgress = {
      workersRemaining: totalRemaining,
      checkpointsFlushed: false,
      projectionsFlushed: false,
      metricsFlushed: false,
    };
    this.logger.info("Worker drain complete", { remaining: String(totalRemaining) });
  }

  async flushCheckpoints(): Promise<void> {
    this._phase = LifecyclePhase.Flushing;
    for (const flushable of this._flushables) {
      if (flushable.name.includes("checkpoint") || flushable.name.includes("Checkpoint")) {
        try {
          await flushable.flush();
        } catch (err) {
          this.logger.error(`Error flushing ${flushable.name}`, err instanceof Error ? err : undefined);
        }
      }
    }
    if (this._drainProgress) {
      this._drainProgress.checkpointsFlushed = true;
    }
    this.logger.info("Checkpoint flush complete");
  }

  async flushProjections(): Promise<void> {
    for (const flushable of this._flushables) {
      if (flushable.name.includes("projection") || flushable.name.includes("Projection")) {
        try {
          await flushable.flush();
        } catch (err) {
          this.logger.error(`Error flushing ${flushable.name}`, err instanceof Error ? err : undefined);
        }
      }
    }
    if (this._drainProgress) {
      this._drainProgress.projectionsFlushed = true;
    }
    this.logger.info("Projection flush complete");
  }

  async flushMetrics(): Promise<void> {
    this.metricsExporter.exportSnapshot();
    if (this._drainProgress) {
      this._drainProgress.metricsFlushed = true;
    }
    this.logger.info("Metrics flush complete");
  }

  getReport(): LifecycleReport {
    return {
      phase: this._phase,
      healthy: this._phase !== LifecyclePhase.Failed,
      healthReport: this.healthService.lastReport,
      uptimeMs: this.uptimeMs,
      startedAt: this._startedAt,
      drainProgress: this._drainProgress,
    };
  }

  private buildReport(healthReport: HealthReport): LifecycleReport {
    return {
      phase: this._phase,
      healthy: healthReport.overall !== "failed",
      healthReport,
      uptimeMs: this.uptimeMs,
      startedAt: this._startedAt,
      drainProgress: this._drainProgress,
    };
  }
}
