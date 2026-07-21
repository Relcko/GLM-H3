import { describe, it, expect, vi, beforeEach } from "vitest";
import { DurableSagaWorker, type WorkerOptions } from "../durable-saga-worker";
import { DistributionSaga } from "../../saga/distribution.saga";
import { PaymentOutcome } from "../payment-classifier";
import type { SagaId, DistributionId } from "../../domain/value-objects";
import type { ISagaRepository } from "../../application/repositories";
import type { PaymentOrchestrator } from "../payment-orchestrator";
import type { TimeoutHandler } from "../timeout-handler";
import type { UnitOfWorkFactory } from "../../infrastructure/persistence/unit-of-work";

function makeSagaId(seed = "saga-1"): SagaId { return seed as unknown as SagaId; }
function makeDistId(seed = "dist-1"): DistributionId { return seed as unknown as DistributionId; }
function makeRecipients(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `rec-${i + 1}`);
}

describe("DurableSagaWorker", () => {
  let sagaRepo: ISagaRepository & { saveCheckpoint: ReturnType<typeof vi.fn> };
  let mockOrchestrator: PaymentOrchestrator;
  let mockTimeoutHandler: TimeoutHandler;
  let uowFactory: UnitOfWorkFactory;
  let worker: DurableSagaWorker;
  let savedSagas: Map<string, DistributionSaga>;

  const options: WorkerOptions = {
    checkpointInterval: 2,
    maxParallelism: 10,
    manifestHash: "test-manifest",
  };

  function makeUowMock() {
    return {
      registerAppend: vi.fn(),
      registerOutbox: vi.fn(),
      registerIdempotency: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn(),
      get committed() { return false; },
      get rolledBack() { return false; },
      get hasPendingWork() { return false; },
    };
  }

  beforeEach(() => {
    savedSagas = new Map();

    sagaRepo = {
      save: vi.fn(async (saga: DistributionSaga) => {
        savedSagas.set(String(saga.sagaId), saga);
      }),
      findBySagaId: vi.fn(async (id: SagaId) => savedSagas.get(String(id)) ?? null),
      findByDistributionId: vi.fn(),
      saveCheckpoint: vi.fn(),
      acquire: vi.fn().mockResolvedValue(true),
      release: vi.fn().mockResolvedValue(undefined),
    };

    uowFactory = {
      create: vi.fn().mockReturnValue(makeUowMock()),
    };

    mockTimeoutHandler = {
      checkForTimeouts: vi.fn().mockReturnValue([]),
      hasTimeouts: vi.fn().mockReturnValue(false),
    } as unknown as TimeoutHandler;

    mockOrchestrator = {
      processBatch: vi.fn(),
    } as unknown as PaymentOrchestrator;

    worker = new DurableSagaWorker(
      sagaRepo,
      mockOrchestrator,
      mockTimeoutHandler,
      uowFactory,
      options,
    );
  });

  describe("processSaga", () => {
    it("processes pending recipients via orchestrator", async () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(3));
      vi.mocked(mockOrchestrator.processBatch).mockImplementation(async (s) => {
        s.markRecipientPaid("rec-1");
        s.markRecipientPaid("rec-2");
        return {
          processed: [
            { recipientId: "rec-1", outcome: PaymentOutcome.Success, settlementRef: "ref-1", txHash: "0x1", errorCode: null, retrySchedule: null },
            { recipientId: "rec-2", outcome: PaymentOutcome.Success, settlementRef: "ref-2", txHash: "0x2", errorCode: null, retrySchedule: null },
          ],
          lifecycleEvents: [],
        };
      });

      const result = await worker.processSaga(saga);
      expect(result.sagasProcessed).toBe(1);
      expect(result.recipientsProcessed).toBe(2);
      expect(saga.paidCount).toBe(2);
      expect(sagaRepo.save).toHaveBeenCalled();
    });

    it("handles timeout detection before batch processing", async () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(2));
      saga.nextBatch(2);

      vi.mocked(mockTimeoutHandler.checkForTimeouts).mockReturnValue([
        { sagaId: saga.sagaId, distributionId: saga.distributionId, recipientId: "rec-1", elapsedMs: 9999, timeoutMs: 1, timedOutAt: Date.now() },
      ]);
      vi.mocked(mockOrchestrator.processBatch).mockImplementation(async () => ({
        processed: [],
        lifecycleEvents: [],
      }));

      const result = await worker.processSaga(saga);
      expect(result.timeoutsDetected).toBe(1);
      expect(saga.failedCount).toBe(1);
    });

    it("completes saga when all recipients processed", async () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(1));
      vi.mocked(mockOrchestrator.processBatch).mockImplementation(async (s) => {
        s.markRecipientPaid("rec-1");
        return {
          processed: [
            { recipientId: "rec-1", outcome: PaymentOutcome.Success, settlementRef: "ref-1", txHash: "0x1", errorCode: null, retrySchedule: null },
          ],
          lifecycleEvents: [],
        };
      });

      const result = await worker.processSaga(saga);
      expect(result.sagaCompleted).toBe(true);
      expect(result.sagaFailed).toBe(false);
    });

    it("does nothing for terminal sagas", async () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(1));
      saga.nextBatch();
      saga.markRecipientPaid("rec-1");
      saga.compensate("done");
      saga.complete();

      const result = await worker.processSaga(saga);
      expect(result.sagaCompleted).toBe(true);
      expect(mockOrchestrator.processBatch).not.toHaveBeenCalled();
    });

    it("handles orchestrator exceptions gracefully", async () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(2));
      vi.mocked(mockOrchestrator.processBatch).mockRejectedValue(new Error("Unexpected error"));

      const result = await worker.processSaga(saga);
      expect(result.recipientsProcessed).toBe(0);
      expect(sagaRepo.save).toHaveBeenCalled();
    });

    it("creates checkpoint at configured interval", async () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(5));
      vi.mocked(mockOrchestrator.processBatch).mockImplementation(async (s) => {
        for (let i = 1; i <= 3; i++) {
          s.markRecipientPaid(`rec-${i}`);
        }
        return {
          processed: Array.from({ length: 3 }, (_, i) => ({
            recipientId: `rec-${i + 1}`,
            outcome: PaymentOutcome.Success as const,
            settlementRef: `ref-${i + 1}`,
            txHash: `0x${i + 1}`,
            errorCode: null,
            retrySchedule: null,
          })),
          lifecycleEvents: [],
        };
      });

      const result = await worker.processSaga(saga);
      expect(result.checkpointsCreated).toBe(1);
      expect(sagaRepo.saveCheckpoint).toHaveBeenCalled();
    });

    it("handles saga with in-flight but no pending recipients (completes)", async () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(2));
      saga.nextBatch(2);
      saga.markRecipientPaid("rec-1");
      saga.markRecipientPaid("rec-2");

      vi.mocked(mockOrchestrator.processBatch).mockImplementation(async () => ({
        processed: [],
        lifecycleEvents: [],
      }));

      const result = await worker.processSaga(saga);
      expect(result.recipientsProcessed).toBe(0);
      expect(result.sagaCompleted).toBe(true);
    });

    it("skips saga when acquire fails (another worker holds lease)", async () => {
      sagaRepo.acquire = vi.fn().mockResolvedValue(false);
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(3));

      const result = await worker.processSaga(saga);
      expect(result.sagasProcessed).toBe(0);
      expect(result.recipientsProcessed).toBe(0);
      expect(mockOrchestrator.processBatch).not.toHaveBeenCalled();
      expect(sagaRepo.release).not.toHaveBeenCalled();
    });

    it("renews lease after successful batch processing", async () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(3));
      vi.mocked(mockOrchestrator.processBatch).mockImplementation(async (s) => {
        s.markRecipientPaid("rec-1");
        s.markRecipientPaid("rec-2");
        return {
          processed: [
            { recipientId: "rec-1", outcome: PaymentOutcome.Success, settlementRef: "ref-1", txHash: "0x1", errorCode: null, retrySchedule: null },
            { recipientId: "rec-2", outcome: PaymentOutcome.Success, settlementRef: "ref-2", txHash: "0x2", errorCode: null, retrySchedule: null },
          ],
          lifecycleEvents: [],
        };
      });

      const acquireSpy = vi.mocked(sagaRepo.acquire);
      acquireSpy.mockResolvedValue(true);

      await worker.processSaga(saga);

      expect(acquireSpy).toHaveBeenCalledTimes(2);
      expect(acquireSpy.mock.calls[0]![0]).toBe(saga.sagaId);
      expect(acquireSpy.mock.calls[1]![0]).toBe(saga.sagaId);
      expect(sagaRepo.release).toHaveBeenCalledTimes(1);
    });

    it("uses unique worker ID when none provided", async () => {
      const workerWithNoId = new DurableSagaWorker(
        sagaRepo,
        mockOrchestrator,
        mockTimeoutHandler,
        uowFactory,
        { checkpointInterval: 2, maxParallelism: 10, manifestHash: "test-manifest" },
      );

      const saga = DistributionSaga.start(makeSagaId("unique-id-test"), makeDistId(), makeRecipients(1));
      vi.mocked(mockOrchestrator.processBatch).mockImplementation(async (s) => {
        s.markRecipientPaid("rec-1");
        return {
          processed: [{ recipientId: "rec-1", outcome: PaymentOutcome.Success, settlementRef: "ref-1", txHash: "0x1", errorCode: null, retrySchedule: null }],
          lifecycleEvents: [],
        };
      });

      sagaRepo.acquire = vi.fn().mockResolvedValue(true);
      await workerWithNoId.processSaga(saga);

      const workerIdArg1 = vi.mocked(sagaRepo.acquire).mock.calls[0]![1];
      expect(workerIdArg1).toMatch(/^worker-/);
      expect(String(workerIdArg1)).not.toBe("worker-default");
    });
  });
});
