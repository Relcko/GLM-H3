import crypto from "node:crypto";
import type { ISagaRepository } from "../application/repositories";
import type { UnitOfWorkFactory } from "../infrastructure/persistence/unit-of-work";
import { DistributionSaga } from "../saga/distribution.saga";
import { PaymentOrchestrator, type PaymentBatchResult } from "./payment-orchestrator";
import { TimeoutHandler, type TimedOutRecipient } from "./timeout-handler";

export interface WorkerOptions {
  readonly checkpointInterval: number;
  readonly maxParallelism: number;
  readonly manifestHash: string;
  readonly workerId?: string;
  readonly leaseTtlMs?: number;
}

const DEFAULT_OPTIONS: WorkerOptions = {
  checkpointInterval: 10,
  maxParallelism: 10,
  manifestHash: "default-manifest",
  leaseTtlMs: 30000,
};

function generateWorkerId(): string {
  return `worker-${crypto.randomUUID().slice(0, 8)}`;
}

export interface WorkerRunResult {
  readonly sagasProcessed: number;
  readonly recipientsProcessed: number;
  readonly timeoutsDetected: number;
  readonly checkpointsCreated: number;
  readonly sagaCompleted: boolean;
  readonly sagaFailed: boolean;
}

export class DurableSagaWorker {
  constructor(
    private readonly sagaRepo: ISagaRepository & {
      saveCheckpoint?: (sagaId: unknown, checkpoint: unknown, checkpointIndex: number) => Promise<void>;
    },
    private readonly orchestrator: PaymentOrchestrator,
    private readonly timeoutHandler: TimeoutHandler,
    private readonly uowFactory: UnitOfWorkFactory,
    private readonly options: WorkerOptions = DEFAULT_OPTIONS,
  ) {}

  async processSaga(saga: DistributionSaga): Promise<WorkerRunResult> {
    const result: WorkerRunResult = {
      sagasProcessed: 0,
      recipientsProcessed: 0,
      timeoutsDetected: 0,
      checkpointsCreated: 0,
      sagaCompleted: false,
      sagaFailed: false,
    };

    const workerId = this.options.workerId ?? generateWorkerId();
    const leaseTtlMs = this.options.leaseTtlMs ?? 30000;
    const acquired = await this.sagaRepo.acquire(saga.sagaId, workerId, leaseTtlMs);
    if (!acquired) {
      return result;
    }

    try {
      if (saga.isTerminal) {
        result.sagaCompleted = saga.state === "completed" as never;
        result.sagaFailed = saga.state === "failed" as never;
        return result;
      }

      const timeouts = this.timeoutHandler.checkForTimeouts(saga);
      result.timeoutsDetected = timeouts.length;

      for (const timeout of timeouts) {
        saga.markRecipientFailed(timeout.recipientId);
      }

      if (!saga.hasPendingWork) {
        saga.compensate("All recipients processed");
        saga.complete();
        result.sagaCompleted = true;
        result.sagasProcessed = 1;
        await this.saveAndCheckpoint(saga, result);
        return result;
      }

      const batch = saga.nextBatch(this.options.maxParallelism);
      if (batch.length === 0) {
        result.sagasProcessed = 1;
        await this.saveAndCheckpoint(saga, result);
        return result;
      }

      let batchResult: PaymentBatchResult;
      try {
        batchResult = await this.orchestrator.processBatch(saga, batch, this.options.manifestHash);
        await this.sagaRepo.acquire(saga.sagaId, workerId, leaseTtlMs);
      } catch {
        for (const recipientId of batch) {
          saga.markRecipientFailed(recipientId);
        }
        result.sagasProcessed = 1;
        await this.saveAndCheckpoint(saga, result);
        return result;
      }

      result.sagasProcessed = 1;
      result.recipientsProcessed = batchResult.processed.length;

      if (!saga.hasPendingWork && !saga.isTerminal) {
        saga.compensate("All recipients processed");
        saga.complete();
        result.sagaCompleted = true;
      }

      await this.saveAndCheckpoint(saga, result);

      return result;
    } finally {
      await this.sagaRepo.release(saga.sagaId, workerId);
    }
  }

  private async saveAndCheckpoint(
    saga: DistributionSaga,
    result: WorkerRunResult,
  ): Promise<void> {
    if (saga.getUncommittedEvents().length === 0) return;

    const recipientsSinceLastCheckpoint = saga.paidCount + saga.failedCount + saga.recoveredCount - saga.checkpointAt;
    const shouldCkpt = saga.shouldCheckpoint(recipientsSinceLastCheckpoint, this.options.checkpointInterval);

    const uow = this.uowFactory.create();
    const events = saga.getUncommittedEvents();
    const expectedVersion = saga.version - events.length;
    uow.registerAppend("saga", String(saga.sagaId), events, expectedVersion);

    for (const event of events) {
      uow.registerOutbox(
        String(saga.sagaId),
        event.eventType,
        event,
        `saga:${saga.sagaId}`,
        `outbox:${event.eventId}`,
      );
    }

    const idempotencyKey = `saga:${saga.sagaId}:save:v${saga.version}`;
    uow.registerIdempotency(
      idempotencyKey,
      "saga.save",
      String(saga.sagaId),
      this.options.workerId ?? "durable-saga-worker",
      JSON.stringify({ eventCount: events.length, checkpointAt: saga.checkpointAt }),
      { sagaId: saga.sagaId, version: saga.version },
      events.map((e) => e.eventType),
    );

    await uow.commit();
    saga.markEventsAsCommitted();

    if (shouldCkpt) {
      const ckpt = saga.createCheckpoint(Date.now());
      if (this.sagaRepo.saveCheckpoint) {
        await this.sagaRepo.saveCheckpoint(saga.sagaId, ckpt, saga.checkpointIndex);
      }
      result.checkpointsCreated += 1;
    }

    await this.sagaRepo.save(saga);
  }
}
