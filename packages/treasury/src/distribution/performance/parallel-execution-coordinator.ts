import type { IClock } from "../infrastructure/services/clock";
import {
  type ParallelismConfig,
  type DEFAULT_PARALLELISM_CONFIG,
  type BatchStats,
} from "./types";

export interface WorkItem<TInput, TOutput> {
  readonly id: string;
  readonly input: TInput;
}

export interface WorkResult<TInput, TOutput> {
  readonly item: WorkItem<TInput, TOutput>;
  readonly output: TOutput | null;
  readonly error: Error | null;
  readonly durationMs: number;
  readonly success: boolean;
}

export type WorkExecutor<TInput, TOutput> = (
  input: TInput,
) => Promise<TOutput>;

export interface ExecutionReport {
  readonly totalItems: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly totalDurationMs: number;
  readonly avgDurationPerItemMs: number;
  readonly wasAborted: boolean;
  readonly results: readonly WorkResult<unknown, unknown>[];
}

export class ParallelExecutionCoordinator<TInput, TOutput> {
  private readonly _config: ParallelismConfig;
  private _wasAborted = false;

  constructor(
    config: ParallelismConfig,
    private readonly clock: IClock,
  ) {
    this._config = config;
  }

  get config(): ParallelismConfig {
    return this._config;
  }

  get wasAborted(): boolean {
    return this._wasAborted;
  }

  async execute(
    items: readonly WorkItem<TInput, TOutput>[],
    executor: WorkExecutor<TInput, TOutput>,
  ): Promise<ExecutionReport> {
    this._wasAborted = false;
    const startTime = this.clock.nowMs();
    const results: WorkResult<TInput, TOutput>[] = [];
    let successCount = 0;
    let failureCount = 0;

    const successCounter = { value: 0 };
    const failureCounter = { value: 0 };

    if (this._config.preserveOrder) {
      const orderedResults = new Map<string, WorkResult<TInput, TOutput>>();
      const workers: Promise<void>[] = [];
      const semaphore = new Semaphore(this._config.maxConcurrency);

      for (const item of items) {
        await semaphore.acquire();
        if (this._wasAborted) {
          semaphore.release();
          break;
        }
        const worker = this.executeItem(item, executor, orderedResults, successCounter, failureCounter);
        workers.push(worker.then(() => semaphore.release()));
      }

      await Promise.all(workers);

      for (const item of items) {
        const r = orderedResults.get(item.id);
        if (r) results.push(r);
      }
    } else {
      const semaphore = new Semaphore(this._config.maxConcurrency);
      const workers = items.map(async (item) => {
        await semaphore.acquire();
        if (this._wasAborted) {
          semaphore.release();
          return;
        }
        try {
          const r = await this.executeSingle(item, executor);
          results.push(r);
          if (r.success) successCount += 1;
          else failureCount += 1;
        } finally {
          semaphore.release();
        }
      });
      await Promise.all(workers);
    }

    const totalDurationMs = this.clock.nowMs() - startTime;

    return {
      totalItems: items.length,
      successCount: this._countSuccesses(results),
      failureCount: this._countFailures(results),
      totalDurationMs,
      avgDurationPerItemMs: items.length > 0 ? totalDurationMs / items.length : 0,
      wasAborted: this._wasAborted,
      results: results as unknown as readonly WorkResult<unknown, unknown>[],
    };
  }

  abort(): void {
    this._wasAborted = true;
  }

  private async executeItem(
    item: WorkItem<TInput, TOutput>,
    executor: WorkExecutor<TInput, TOutput>,
    resultMap: Map<string, WorkResult<TInput, TOutput>>,
    successRef: { value: number },
    failureRef: { value: number },
  ): Promise<void> {
    const result = await this.executeSingle(item, executor);
    resultMap.set(item.id, result);
    if (result.success) successRef.value += 1;
    else failureRef.value += 1;

    if (!result.success) {
      const totalAttempted = successRef.value + failureRef.value;
      if (totalAttempted > 0) {
        const failureRatio = failureRef.value / totalAttempted;
        if (
          failureRatio >= this._config.abortOnFailureThreshold ||
          (this._config.abortOnFailureCount !== undefined &&
            failureRef.value >= this._config.abortOnFailureCount)
        ) {
          this._wasAborted = true;
        }
      }
    }
  }

  private async executeSingle(
    item: WorkItem<TInput, TOutput>,
    executor: WorkExecutor<TInput, TOutput>,
  ): Promise<WorkResult<TInput, TOutput>> {
    const startTime = this.clock.nowMs();
    try {
      const output = await executor(item.input);
      const durationMs = this.clock.nowMs() - startTime;
      return {
        item,
        output,
        error: null,
        durationMs,
        success: true,
      };
    } catch (error) {
      const durationMs = this.clock.nowMs() - startTime;
      return {
        item,
        output: null,
        error: error instanceof Error ? error : new Error(String(error)),
        durationMs,
        success: false,
      };
    }
  }

  private _countSuccesses(results: readonly WorkResult<TInput, TOutput>[]): number {
    return results.filter((r) => r.success).length;
  }

  private _countFailures(results: readonly WorkResult<TInput, TOutput>[]): number {
    return results.filter((r) => !r.success).length;
  }
}

class Semaphore {
  private _current: number;
  private readonly _queue: (() => void)[] = [];

  constructor(private readonly _max: number) {
    this._current = 0;
  }

  async acquire(): Promise<void> {
    if (this._current < this._max) {
      this._current += 1;
      return;
    }
    return new Promise((resolve) => {
      this._queue.push(resolve);
    });
  }

  release(): void {
    const next = this._queue.shift();
    if (next) {
      next();
    } else {
      this._current = Math.max(0, this._current - 1);
    }
  }
}


