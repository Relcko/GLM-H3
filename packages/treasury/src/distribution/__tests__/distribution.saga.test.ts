import { describe, it, expect } from "vitest";
import { DistributionSaga } from "../saga/distribution.saga";
import { SagaStateModel } from "../saga/saga-state.model";
import { type SagaId, type DistributionId, SagaState } from "../domain/value-objects";
import { SagaInvalidStatusError } from "../domain/errors";

function makeSagaId(seed = "saga-1"): SagaId {
  return seed as unknown as SagaId;
}

function makeDistId(seed = "dist-1"): DistributionId {
  return seed as unknown as DistributionId;
}

function makeRecipients(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `rec-${i + 1}`);
}

describe("DistributionSaga", () => {
  describe("start", () => {
    it("creates a saga in Running state", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(3));
      expect(saga.state).toBe(SagaState.Running);
      expect(saga.version).toBe(1);
      expect(saga.pendingRecipients).toHaveLength(3);
      expect(saga.inFlightRecipients).toHaveLength(0);
      expect(saga.totalRecipients).toBe(3);
      expect(saga.isTerminal).toBe(false);
      expect(saga.hasPendingWork).toBe(true);
    });

    it("emits a DistributionSagaStartedEvent", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(2));
      const events = saga.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]!.eventType).toBe("treasury.distribution.saga.started");
    });

    it("rejects start with empty recipient list", () => {
      expect(() => DistributionSaga.start(makeSagaId(), makeDistId(), [])).toThrow("empty recipient list");
    });

    it("accepts custom saga options", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(5), {
        perRecipientTimeoutMs: 60000,
        maxParallelism: 20,
        recoveryPolicyId: "manual-escalation",
      });
      expect(saga.perRecipientTimeoutMs).toBe(60000);
      expect(saga.maxParallelism).toBe(20);
      expect(saga.recoveryPolicyId).toBe("manual-escalation");
    });
  });

  describe("recipient management", () => {
    it("moves recipients from pending to in-flight via nextBatch", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(5));
      const batch = saga.nextBatch(3);
      expect(batch).toHaveLength(3);
      expect(batch).toEqual(["rec-1", "rec-2", "rec-3"]);
      expect(saga.pendingRecipients).toHaveLength(2);
      expect(saga.inFlightRecipients).toHaveLength(3);
    });

    it("does not exceed maxParallelism", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(5), { maxParallelism: 2 });
      const batch1 = saga.nextBatch();
      expect(batch1).toHaveLength(2);
      const batch2 = saga.nextBatch();
      expect(batch2).toHaveLength(0);
    });

    it("returns empty batch when no pending recipients remain", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(1));
      saga.nextBatch();
      saga.markRecipientPaid("rec-1");
      const batch = saga.nextBatch();
      expect(batch).toHaveLength(0);
    });

    it("returns empty batch when not in Running state", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(3));
      saga.nextBatch();
      saga.markRecipientPaid("rec-1");
      saga.markRecipientPaid("rec-2");
      saga.markRecipientPaid("rec-3");
      saga.compensate("all done");
      saga.complete();
      const batch = saga.nextBatch();
      expect(batch).toHaveLength(0);
    });

    it("marks recipient as paid", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(1));
      saga.nextBatch();
      saga.markRecipientPaid("rec-1");
      expect(saga.paidCount).toBe(1);
      expect(saga.inFlightRecipients).toHaveLength(0);
    });

    it("marks recipient as failed", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(1));
      saga.nextBatch();
      saga.markRecipientFailed("rec-1");
      expect(saga.failedCount).toBe(1);
    });

    it("marks recipient as recovered", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(1));
      saga.nextBatch();
      saga.markRecipientRecovered("rec-1");
      expect(saga.recoveredCount).toBe(1);
    });

    it("throws when completing recipient not in flight", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(1));
      expect(() => saga.markRecipientPaid("rec-999")).toThrow("not in flight");
    });

    it("tracks hasPendingWork correctly", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(2));
      expect(saga.hasPendingWork).toBe(true);
      saga.nextBatch();
      saga.markRecipientPaid("rec-1");
      saga.markRecipientPaid("rec-2");
      expect(saga.hasPendingWork).toBe(false);
    });
  });

  describe("state transitions", () => {
    it("transitions Running -> Compensating -> Completed (all resolved)", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(2));
      saga.nextBatch();
      saga.markRecipientPaid("rec-1");
      saga.markRecipientPaid("rec-2");
      saga.compensate("evaluating results");
      expect(saga.state).toBe(SagaState.Compensating);
      saga.complete();
      expect(saga.state).toBe(SagaState.Completed);
      expect(saga.isTerminal).toBe(true);
    });

    it("transitions Running -> Compensating -> Failed (unrecoverable)", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(2));
      saga.nextBatch();
      saga.markRecipientFailed("rec-1");
      saga.markRecipientFailed("rec-2");
      saga.compensate("failures need resolution");
      saga.fail("unrecoverable failures");
      expect(saga.state).toBe(SagaState.Failed);
      expect(saga.isTerminal).toBe(true);
    });

    it("transitions Running -> Suspended", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(3));
      saga.suspend("circuit breaker open");
      expect(saga.state).toBe(SagaState.Suspended);
    });

    it("transitions Suspended -> Compensating", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(3));
      saga.suspend("provider timeout");
      saga.compensate("retry after backoff");
      expect(saga.state).toBe(SagaState.Compensating);
    });

    it("rejects Running -> Completed (invalid transition)", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(2));
      expect(() => saga.complete()).toThrow(SagaInvalidStatusError);
    });

    it("rejects Running -> Failed (invalid transition)", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(2));
      expect(() => saga.fail("direct fail")).toThrow(SagaInvalidStatusError);
    });

    it("rejects Suspended -> Completed (invalid transition)", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(2));
      saga.suspend("provider error");
      expect(() => saga.complete()).toThrow(SagaInvalidStatusError);
    });

    it("rejects Completed -> any (terminal)", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(2));
      saga.nextBatch();
      saga.markRecipientPaid("rec-1");
      saga.markRecipientPaid("rec-2");
      saga.compensate("done");
      saga.complete();
      expect(() => saga.suspend("late")).toThrow(SagaInvalidStatusError);
      expect(() => saga.compensate("late")).toThrow(SagaInvalidStatusError);
    });

    it("rejects Failed -> any (terminal)", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(2));
      saga.nextBatch();
      saga.markRecipientFailed("rec-1");
      saga.markRecipientFailed("rec-2");
      saga.compensate("review");
      saga.fail("unrecoverable");
      expect(() => saga.suspend("late")).toThrow(SagaInvalidStatusError);
    });
  });

  describe("checkpoint", () => {
    it("creates checkpoint and updates state", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(5));
      saga.nextBatch(3);
      saga.markRecipientPaid("rec-1");
      saga.markRecipientPaid("rec-2");

      const ckpt = saga.createCheckpoint(42);
      expect(ckpt.sagaId).toBe(saga.sagaId);
      expect(ckpt.globalPosition).toBe(42);
      expect(ckpt.stateData.paidCount).toBe(2);
      expect(ckpt.stateData.inFlightRecipients).toHaveLength(1);
      expect(saga.checkpointAt).toBe(42);
      expect(saga.checkpointIndex).toBe(1);
    });

    it("increments checkpointIndex on subsequent checkpoints", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(10));
      saga.createCheckpoint(10);
      expect(saga.checkpointIndex).toBe(1);
      saga.createCheckpoint(25);
      expect(saga.checkpointIndex).toBe(2);
    });

    it("emits a DistributionSagaCheckpointEvent", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(3));
      saga.createCheckpoint(5);
      const events = saga.getUncommittedEvents();
      const checkpointEvents = events.filter(
        (e) => e.eventType === "treasury.distribution.saga.checkpoint",
      );
      expect(checkpointEvents).toHaveLength(1);
    });

    it("shouldCheckpoint returns true based on interval", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(100));
      expect(saga.shouldCheckpoint(50, 50)).toBe(true);
      expect(saga.shouldCheckpoint(25, 50)).toBe(false);
    });
  });

  describe("resume", () => {
    it("resumes saga from checkpoint state", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(5));
      saga.nextBatch(2);
      saga.markRecipientPaid("rec-1");
      saga.createCheckpoint(100);

      const stateData = saga["_state"].snapshot();
      const checkpointIndex = saga.checkpointIndex;
      const resumed = DistributionSaga.resume(makeSagaId(), stateData, checkpointIndex);

      expect(resumed.state).toBe(SagaState.Running);
      expect(resumed.pendingRecipients).toHaveLength(3);
      expect(resumed.paidCount).toBe(1);
      expect(resumed.checkpointAt).toBe(100);
      expect(resumed.checkpointIndex).toBe(1);
      expect(resumed.hasPendingWork).toBe(true);
    });

    it("resumed saga can continue processing", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(3));
      saga.nextBatch(2);
      saga.markRecipientPaid("rec-1");
      const ckpt = saga.createCheckpoint(50);

      const resumed = DistributionSaga.resume(
        makeSagaId(),
        ckpt.stateData,
        1,
      );

      expect(resumed.pendingRecipients).toHaveLength(1);
      expect(resumed.inFlightRecipients).toHaveLength(1);

      resumed.markRecipientPaid("rec-2");
      const nextBatch = resumed.nextBatch();
      expect(nextBatch).toHaveLength(1);
      resumed.markRecipientPaid(nextBatch[0]!);
      expect(resumed.paidCount).toBe(3);
      expect(resumed.hasPendingWork).toBe(false);
    });

    it("resumed saga preserves event emission on new transitions", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(2));
      saga.nextBatch();
      saga.markRecipientPaid("rec-1");
      saga.markRecipientPaid("rec-2");
      const ckpt = saga.createCheckpoint(100);

      const resumed = DistributionSaga.resume(makeSagaId(), ckpt.stateData, 1);
      resumed.compensate("resumed and evaluating");
      resumed.complete();

      const events = resumed.getUncommittedEvents();
      expect(events).toHaveLength(2);
      expect(events[0]!.eventType).toBe("treasury.distribution.saga.compensated");
      expect(events[1]!.eventType).toBe("treasury.distribution.saga.completed");
    });
  });

  describe("event emission", () => {
    it("emits events for each state transition", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(2));
      expect(saga.getUncommittedEvents()).toHaveLength(1);

      saga.nextBatch();
      saga.markRecipientPaid("rec-1");
      saga.markRecipientPaid("rec-2");
      saga.compensate("evaluating");
      expect(saga.getUncommittedEvents()).toHaveLength(2);

      saga.complete();
      expect(saga.getUncommittedEvents()).toHaveLength(3);

      const types = saga.getUncommittedEvents().map((e) => e.eventType);
      expect(types).toContain("treasury.distribution.saga.started");
      expect(types).toContain("treasury.distribution.saga.compensated");
      expect(types).toContain("treasury.distribution.saga.completed");
    });

    it("markEventsAsCommitted clears pending events", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(2));
      expect(saga.getUncommittedEvents()).toHaveLength(1);
      saga.markEventsAsCommitted();
      expect(saga.getUncommittedEvents()).toHaveLength(0);
    });

    it("preserves events after markEventsAsCommitted on new transitions", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(2));
      saga.markEventsAsCommitted();
      saga.suspend("issue");
      expect(saga.getUncommittedEvents()).toHaveLength(1);
      expect(saga.getUncommittedEvents()[0]!.eventType).toBe("treasury.distribution.saga.suspended");
    });
  });

  describe("recovery lifecycle", () => {
    it("handles fail -> suspend -> compensate -> complete flow", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(3));

      saga.nextBatch(3);
      saga.markRecipientPaid("rec-1");
      saga.markRecipientFailed("rec-2");
      saga.markRecipientFailed("rec-3");

      saga.suspend("payment provider error for 2 recipients");
      expect(saga.state).toBe(SagaState.Suspended);

      saga.compensate("operator initiated recovery");
      expect(saga.state).toBe(SagaState.Compensating);

      saga.complete();
      expect(saga.state).toBe(SagaState.Completed);
      expect(saga.paidCount).toBe(1);
      expect(saga.failedCount).toBe(2);
    });

    it("handles fail -> suspend -> compensate -> fail (unrecoverable)", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(2));
      saga.nextBatch();
      saga.markRecipientFailed("rec-1");
      saga.markRecipientFailed("rec-2");
      saga.suspend("all failed");
      saga.compensate("attempting recovery but still unrecoverable");
      saga.fail("cannot recover any recipients");
      expect(saga.state).toBe(SagaState.Failed);
      expect(saga.isTerminal).toBe(true);
    });
  });

  describe("settlementRef and idempotencyKey", () => {
    it("computes deterministic settlementRef", () => {
      const ref1 = DistributionSaga.computeSettlementRef("dist-1", "rec-1", "hash-abc");
      const ref2 = DistributionSaga.computeSettlementRef("dist-1", "rec-1", "hash-abc");
      expect(ref1).toBe(ref2);
      expect(ref1.length).toBe(64);
    });

    it("produces different settlementRef for different recipients", () => {
      const ref1 = DistributionSaga.computeSettlementRef("dist-1", "rec-1", "hash-abc");
      const ref2 = DistributionSaga.computeSettlementRef("dist-1", "rec-2", "hash-abc");
      expect(ref1).not.toBe(ref2);
    });

    it("computes idempotencyKey in correct format", () => {
      const key = DistributionSaga.computeIdempotencyKey("saga-1", "settlement-ref-123");
      expect(key).toBe("saga:saga-1:settlement-ref-123");
    });
  });

  describe("SagaStateModel", () => {
    it("tracks totalProcessed correctly", () => {
      const state = SagaStateModel.create(makeSagaId(), makeDistId(), makeRecipients(5), null);
      expect(state.totalProcessed).toBe(0);

      state.moveToInFlight("rec-1");
      state.completeRecipient("rec-1", "paid");
      expect(state.totalProcessed).toBe(1);

      state.moveToInFlight("rec-2");
      state.completeRecipient("rec-2", "failed");
      expect(state.totalProcessed).toBe(2);
    });

    it("rejects moving non-pending recipient to in-flight", () => {
      const state = SagaStateModel.create(makeSagaId(), makeDistId(), makeRecipients(2), null);
      expect(() => state.moveToInFlight("rec-999")).toThrow("not in pending set");
    });

    it("rejects completing non-in-flight recipient", () => {
      const state = SagaStateModel.create(makeSagaId(), makeDistId(), makeRecipients(2), null);
      expect(() => state.completeRecipient("rec-1", "paid")).toThrow("not in flight");
    });

    it("snapshot produces identical copy", () => {
      const state = SagaStateModel.create(makeSagaId(), makeDistId(), makeRecipients(3), "pol-recovery");
      state.moveToInFlight("rec-1");
      state.completeRecipient("rec-1", "paid");

      const data = state.snapshot();
      expect(data.paidCount).toBe(1);
      expect(data.pendingRecipients).toHaveLength(2);
      expect(data.recoveryPolicyId).toBe("pol-recovery");
      expect(data.version).toBe(1);
    });
  });

  describe("full lifecycle integration", () => {
    it("completes a 10-recipient distribution end-to-end", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(10), {
        maxParallelism: 3,
      });

      while (saga.hasPendingWork) {
        const batch = saga.nextBatch();
        for (const recipientId of batch) {
          saga.markRecipientPaid(recipientId);
        }
      }

      saga.compensate("all recipients processed");
      saga.complete();

      expect(saga.paidCount).toBe(10);
      expect(saga.failedCount).toBe(0);
      expect(saga.state).toBe(SagaState.Completed);
      expect(saga.isTerminal).toBe(true);
    });

    it("handles mixed results with checkpoint and resume", () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(5));

      saga.nextBatch(3);
      saga.markRecipientPaid("rec-1");
      saga.markRecipientPaid("rec-2");
      saga.markRecipientFailed("rec-3");

      const ckpt1 = saga.createCheckpoint(50);

      const resumed = DistributionSaga.resume(makeSagaId(), ckpt1.stateData, saga.checkpointIndex);
      const batch = resumed.nextBatch();
      expect(batch).toHaveLength(2);
      resumed.markRecipientPaid("rec-4");
      resumed.markRecipientFailed("rec-5");

      resumed.compensate("checking results");
      expect(resumed.paidCount).toBe(3);
      expect(resumed.failedCount).toBe(2);

      resumed.complete();
      expect(resumed.state).toBe(SagaState.Completed);
    });
  });
});
