import type { EventBus } from "@relcko/events";
import type { EntityId, Json, Timestamp } from "@relcko/types";
import type { WorkerTask } from "./types";
import { InMemoryPerformanceRepository } from "./repository";
import { ConcurrencyController } from "./concurrency";

export interface WorkerDeps {
  readonly name: string;
  readonly handler: (payload: Record<string, Json>) => Promise<unknown> | unknown;
}

/**
 * Schedules background worker tasks under a bounded concurrency controller.
 * Tasks are persisted in the repository so their lifecycle (queued → running →
 * completed/failed) is observable and idempotent retries are supported.
 */
export class WorkerSchedulingEngine {
  private readonly tasks = new Map<string, WorkerTask>();

  constructor(
    private readonly repository: InMemoryPerformanceRepository,
    private readonly events: EventBus,
    private readonly concurrency: ConcurrencyController,
  ) {}

  enqueue(deps: WorkerDeps, payload: Record<string, Json>, id?: EntityId): WorkerTask {
    const task: WorkerTask = {
      id: id ?? this.repository.newId("task"),
      name: deps.name,
      payload,
      scheduledAt: new Date().toISOString(),
      status: "queued",
      attempts: 0,
    };
    this.tasks.set(task.id, task);
    this.repository.saveWorkerTask(task);
    void this.concurrency.run(() => this.execute(deps, task));
    return task;
  }

  async execute(deps: WorkerDeps, task: WorkerTask): Promise<void> {
    const running: WorkerTask = { ...task, status: "running", startedAt: new Date().toISOString(), attempts: task.attempts + 1 };
    this.tasks.set(task.id, running);
    this.repository.saveWorkerTask(running);
    try {
      await deps.handler(running.payload);
      const done: WorkerTask = { ...running, status: "completed", finishedAt: new Date().toISOString() };
      this.tasks.set(task.id, done);
      this.repository.saveWorkerTask(done);
    } catch (error) {
      const failed: WorkerTask = {
        ...running, status: "failed", finishedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
      this.tasks.set(task.id, failed);
      this.repository.saveWorkerTask(failed);
    }
  }

  get(id: EntityId): WorkerTask | undefined { return this.tasks.get(id); }
  list(): readonly WorkerTask[] { return [...this.tasks.values()]; }
}
