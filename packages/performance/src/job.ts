import type { EntityId, Json, Timestamp } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { JobRun } from "./types";
import { InMemoryPerformanceRepository } from "./repository";
import { PerformanceEventType, publishPerformanceEvent } from "./events";
import { ConcurrencyController } from "./concurrency";

export interface BackgroundJobSpec {
  readonly kind: string;
  readonly payload: Readonly<Record<string, Json>>;
}

/**
 * Schedules and runs background jobs in bounded concurrency. Each job run is
 * tracked (scheduled → running → completed/failed) and metered. Designed to be
 * driven by an external scheduler in production; this engine owns execution and
 * throughput control only.
 */
export class BackgroundJobOptimizer {
  constructor(
    private readonly repository: InMemoryPerformanceRepository,
    private readonly events: EventBus,
    private readonly concurrency: ConcurrencyController,
  ) {}

  schedule(spec: BackgroundJobSpec, executor: (payload: Record<string, Json>) => Promise<unknown> | unknown): JobRun {
    const run: JobRun = {
      id: this.repository.newId("job"),
      kind: spec.kind,
      status: "scheduled",
      enqueuedAt: new Date().toISOString(),
      itemsProcessed: 0,
    };
    this.repository.saveJobRun(run);
    void this.concurrency.run(() => this.execute(run, spec, executor));
    return run;
  }

  private async execute(run: JobRun, spec: BackgroundJobSpec, executor: (p: Record<string, Json>) => Promise<unknown> | unknown): Promise<void> {
    const running: JobRun = { ...run, status: "running", startedAt: new Date().toISOString() };
    this.repository.saveJobRun(running);
    const start = Date.now();
    try {
      await executor({ ...spec.payload });
      const done: JobRun = {
        ...running, status: "completed", finishedAt: new Date().toISOString(),
        durationMs: Date.now() - start, itemsProcessed: 1,
      };
      this.repository.saveJobRun(done);
      void publishPerformanceEvent(this.events, PerformanceEventType.JobCompleted, { id: done.id, kind: done.kind, durationMs: done.durationMs } as Json);
    } catch (err) {
      const failed: JobRun = {
        ...running, status: "failed", finishedAt: new Date().toISOString(),
        durationMs: Date.now() - start,
        itemsProcessed: 0,
      };
      this.repository.saveJobRun(failed);
      void publishPerformanceEvent(this.events, PerformanceEventType.JobCompleted, { id: failed.id, kind: failed.kind, error: err instanceof Error ? err.message : String(err) });
    }
  }

  get(id: EntityId): JobRun | undefined { return this.repository.getJobRun(id); }
  list(): readonly JobRun[] { return this.repository.listJobRuns(); }
}
