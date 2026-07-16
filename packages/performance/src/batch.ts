import type { EventBus } from "@relcko/events";
import type { Json } from "@relcko/types";
import type { BatchResult } from "./types";
import { BatchProcessingError } from "./errors";
import { InMemoryPerformanceRepository } from "./repository";
import { PerformanceEventType, publishPerformanceEvent } from "./events";
import { ConcurrencyController } from "./concurrency";

/**
 * Processes a large collection in bounded-concurrency batches. Keeps memory flat
 * (no full materialization of all results) and protects downstream systems. Each
 * batch is metered and published as a performance event.
 */
export class BatchProcessingEngine {
  constructor(
    private readonly repository: InMemoryPerformanceRepository,
    private readonly events: EventBus,
    private readonly concurrency: ConcurrencyController,
    private readonly defaultBatchSize = 100,
  ) {}

  async process<T, R>(
    items: readonly T[],
    worker: (item: T, index: number) => Promise<R> | R,
    batchSize = this.defaultBatchSize,
  ): Promise<BatchResult<R>> {
    if (batchSize < 1) throw new BatchProcessingError("batchSize must be >= 1");
    const start = Date.now();
    const results: R[] = new Array(items.length);
    const errors: { index: number; error: string }[] = [];
    let succeeded = 0;
    let processed = 0;

    for (let i = 0; i < items.length; i += batchSize) {
      const slice = items.slice(i, i + batchSize);
      await Promise.all(
        slice.map((item, j) =>
          this.concurrency.run(async () => {
            const index = i + j;
            try {
              results[index] = await worker(item, index);
              succeeded++;
            } catch (err) {
              errors.push({ index, error: err instanceof Error ? err.message : String(err) });
            } finally {
              processed++;
            }
          }),
        ),
      );
      this.repository.recordBatch(slice.length);
      void publishPerformanceEvent(this.events, PerformanceEventType.BatchCompleted, {
        size: slice.length, processed, succeeded, failed: errors.length,
      });
    }

    return {
      processed, succeeded, failed: errors.length, errors, durationMs: Date.now() - start, results,
    };
  }
}
