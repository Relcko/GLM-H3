import type { DistributionSaga } from "../saga/distribution.saga";
import type { IClock } from "../infrastructure/services/clock";
import {
  type BatchConfig,
  type BatchStats,
  DEFAULT_BATCH_CONFIG,
} from "./types";

export interface BatchResult {
  readonly batch: readonly string[];
  readonly stats: BatchStats;
  readonly isComplete: boolean;
  readonly remainingCount: number;
}

export class DistributionBatchEngine {
  private _currentBatchSize: number;
  private _consecutiveSuccesses = 0;
  private _consecutiveFailures = 0;
  private _totalBatchesProcessed = 0;
  private _totalItemsProcessed = 0;

  constructor(
    private readonly config: BatchConfig = DEFAULT_BATCH_CONFIG,
    private readonly clock: IClock,
  ) {
    this._currentBatchSize = config.initialBatchSize;
  }

  get currentBatchSize(): number {
    return this._currentBatchSize;
  }

  get totalBatchesProcessed(): number {
    return this._totalBatchesProcessed;
  }

  get totalItemsProcessed(): number {
    return this._totalItemsProcessed;
  }

  nextBatch(saga: DistributionSaga): BatchResult {
    const startTime = this.clock.nowMs();
    const batch = saga.nextBatch(this._currentBatchSize);
    const elapsed = this.clock.nowMs() - startTime;

    if (batch.length === 0) {
      return {
        batch: [],
        stats: {
          batchSize: 0,
          successCount: 0,
          failureCount: 0,
          totalTimeMs: elapsed,
          avgTimePerItemMs: 0,
          adaptiveSize: this._currentBatchSize,
        },
        isComplete: !saga.hasPendingWork || saga.isTerminal,
        remainingCount: saga.pendingRecipients.length + saga.inFlightRecipients.length,
      };
    }

    this._totalBatchesProcessed += 1;
    this._totalItemsProcessed += batch.length;

    const remaining = saga.pendingRecipients.length + saga.inFlightRecipients.length;

    return {
      batch,
      stats: {
        batchSize: batch.length,
        successCount: 0,
        failureCount: 0,
        totalTimeMs: elapsed,
        avgTimePerItemMs: batch.length > 0 ? elapsed / batch.length : 0,
        adaptiveSize: this._currentBatchSize,
      },
      isComplete: remaining === 0 || saga.isTerminal,
      remainingCount: remaining,
    };
  }

  adaptBatchSize(successRate: number): number {
    this._totalBatchesProcessed += 0;

    if (successRate >= this.config.successThresholdForStepUp) {
      this._consecutiveSuccesses += 1;
      this._consecutiveFailures = 0;
      if (this._consecutiveSuccesses >= 2) {
        this._currentBatchSize = Math.min(
          this._currentBatchSize + this.config.adaptiveStepUp,
          this.config.maxBatchSize,
        );
        this._consecutiveSuccesses = 0;
      }
    } else {
      this._consecutiveFailures += 1;
      this._consecutiveSuccesses = 0;
      this._currentBatchSize = Math.max(
        this._currentBatchSize - this.config.adaptiveStepDown,
        this.config.minBatchSize,
      );
    }

    return this._currentBatchSize;
  }

  getChunkedBatches(saga: DistributionSaga): readonly (readonly string[])[] {
    const chunkSize = this.config.chunkSize ?? this._currentBatchSize;
    const fullBatch = saga.nextBatch(this._currentBatchSize);
    if (fullBatch.length === 0) return [];

    const chunks: string[][] = [];
    for (let i = 0; i < fullBatch.length; i += chunkSize) {
      chunks.push(fullBatch.slice(i, i + chunkSize));
    }
    return chunks;
  }

  resumeFromCheckpoint(saga: DistributionSaga, checkpointBatchSize: number): BatchResult {
    this._currentBatchSize = Math.max(
      this.config.minBatchSize,
      Math.min(checkpointBatchSize, this.config.maxBatchSize),
    );
    const remaining = saga.pendingRecipients.length + saga.inFlightRecipients.length;
    if (remaining === 0 || saga.isTerminal) {
      return {
        batch: [],
        stats: {
          batchSize: 0,
          successCount: 0,
          failureCount: 0,
          totalTimeMs: 0,
          avgTimePerItemMs: 0,
          adaptiveSize: this._currentBatchSize,
        },
        isComplete: true,
        remainingCount: remaining,
      };
    }
    return this.nextBatch(saga);
  }

  reset(): void {
    this._currentBatchSize = this.config.initialBatchSize;
    this._consecutiveSuccesses = 0;
    this._consecutiveFailures = 0;
    this._totalBatchesProcessed = 0;
    this._totalItemsProcessed = 0;
  }
}
