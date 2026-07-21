import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventStore } from "@relcko/test-utils";
import { streamIdFor } from "@relcko/event-store";
import { DistributionSaga } from "../../saga/distribution.saga";
import { BigIntJsonSerializer } from "../services/bigint-serializer";
import { SagaEventStoreRepository } from "../event-store/saga-event-store.repository";
import { InMemorySagaSnapshotStore } from "../persistence/saga-snapshot-store";
import type { SagaId, DistributionId } from "../../domain/value-objects";

function makeSagaId(seed = "saga-1"): SagaId {
  return seed as unknown as SagaId;
}
function makeDistId(seed = "dist-1"): DistributionId {
  return seed as unknown as DistributionId;
}
function makeRecipients(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `rec-${i + 1}`);
}

function sagaStreamId(sagaId: SagaId): ReturnType<typeof streamIdFor> {
  return streamIdFor("saga", String(sagaId));
}

describe("Saga durability (event persistence + snapshot recovery)", () => {
  let eventStore: InMemoryEventStore;
  let snapshotStore: InMemorySagaSnapshotStore;
  let repo: SagaEventStoreRepository;

  beforeEach(() => {
    eventStore = new InMemoryEventStore(new BigIntJsonSerializer());
    snapshotStore = new InMemorySagaSnapshotStore();
    repo = new SagaEventStoreRepository(eventStore, snapshotStore);
  });

  describe("event persistence", () => {
    it("persists saga events to event store on save", async () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(3));
      await repo.save(saga);

      const stream = await eventStore.load(sagaStreamId(saga.sagaId));
      expect(stream.events.length).toBeGreaterThanOrEqual(1);
      expect((stream.events[0] as unknown as { eventType: string }).eventType).toBe("treasury.distribution.saga.started");
    });

    it("persists multiple saga events on state transitions", async () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(2));
      await repo.save(saga);

      saga.nextBatch();
      saga.markRecipientPaid("rec-1");
      saga.markRecipientPaid("rec-2");
      saga.compensate("all done");
      saga.complete();
      await repo.save(saga);

      const stream = await eventStore.load(sagaStreamId(saga.sagaId));
      expect(stream.events.length).toBeGreaterThanOrEqual(3);
      const types = stream.events.map((e) => (e as unknown as { eventType: string }).eventType);
      expect(types.filter((t) => t.startsWith("treasury.distribution.saga.")).length).toBe(3);
    });

    it("persists checkpoint events to event store", async () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(10));
      saga.nextBatch(3);
      saga.markRecipientPaid("rec-1");
      saga.markRecipientPaid("rec-2");
      await repo.save(saga);

      const ckpt = saga.createCheckpoint(42);
      await repo.saveCheckpoint(saga.sagaId, ckpt, saga.checkpointIndex);
      await repo.save(saga);

      const stream = await eventStore.load(sagaStreamId(saga.sagaId));
      const ckptEvents = stream.events.filter(
        (e) => (e as unknown as { eventType: string }).eventType === "treasury.distribution.saga.checkpoint",
      );
      expect(ckptEvents.length).toBe(1);
    });
  });

  describe("snapshot recovery", () => {
    it("recovers saga from snapshot after cache clear", async () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(5));
      saga.nextBatch(2);
      saga.markRecipientPaid("rec-1");
      saga.markRecipientPaid("rec-2");
      await repo.save(saga);

      const ckpt = saga.createCheckpoint(50);
      await repo.saveCheckpoint(saga.sagaId, ckpt, saga.checkpointIndex);
      await repo.save(saga);

      repo.clearCache();

      const recovered = await repo.findBySagaId(saga.sagaId);
      expect(recovered).not.toBeNull();
      expect(recovered!.paidCount).toBe(2);
      expect(recovered!.state).toBe("running");
    });

    it("recovers saga with pending and in-flight recipients intact", async () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(5));
      saga.nextBatch(3);
      saga.markRecipientPaid("rec-1");
      await repo.save(saga);

      const ckpt = saga.createCheckpoint(25);
      await repo.saveCheckpoint(saga.sagaId, ckpt, saga.checkpointIndex);

      saga.markRecipientPaid("rec-2");
      await repo.save(saga);

      const ckpt2 = saga.createCheckpoint(50);
      await repo.saveCheckpoint(saga.sagaId, ckpt2, saga.checkpointIndex);
      await repo.save(saga);

      repo.clearCache();

      const recovered = await repo.findBySagaId(saga.sagaId);
      expect(recovered).not.toBeNull();
      expect(recovered!.pendingRecipients.length).toBe(2);
      expect(recovered!.paidCount).toBe(2);
    });

    it("finds saga by distributionId after crash recovery", async () => {
      const distId = makeDistId("dist-crash-recovery");
      const saga = DistributionSaga.start(makeSagaId("saga-crash"), distId, makeRecipients(3));
      saga.nextBatch(3);
      saga.markRecipientPaid("rec-1");
      await repo.save(saga);

      const ckpt = saga.createCheckpoint(10);
      await repo.saveCheckpoint(saga.sagaId, ckpt, saga.checkpointIndex);
      await repo.save(saga);

      repo.clearCache();

      const recovered = await repo.findByDistributionId(distId);
      expect(recovered).not.toBeNull();
      expect(recovered!.paidCount).toBe(1);
    });

    it("continues processing after recovery", async () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(3));
      saga.nextBatch(2);
      saga.markRecipientPaid("rec-1");
      await repo.save(saga);

      const ckpt = saga.createCheckpoint(30);
      await repo.saveCheckpoint(saga.sagaId, ckpt, saga.checkpointIndex);
      await repo.save(saga);

      repo.clearCache();

      const recovered = await repo.findBySagaId(saga.sagaId);
      expect(recovered).not.toBeNull();
      expect(recovered!.hasPendingWork).toBe(true);

      const batch = recovered!.nextBatch();
      expect(batch.length).toBeGreaterThan(0);
      recovered!.markRecipientPaid(batch[0]!);

      await repo.save(recovered!);

      const stream = await eventStore.load(sagaStreamId(recovered!.sagaId));
      const sagaEventTypes = stream.events.map((e) => (e as unknown as { eventType: string }).eventType);
      const sagaEvents = sagaEventTypes.filter((t) => t.startsWith("treasury.distribution.saga."));
      expect(sagaEvents.length).toBeGreaterThanOrEqual(2);
    });

    it("returns null when no snapshot or cache available", async () => {
      const saga = DistributionSaga.start(makeSagaId(), makeDistId(), makeRecipients(3));
      await repo.save(saga);

      repo.clearCache();
      snapshotStore.clear();

      const result = await repo.findBySagaId(saga.sagaId);
      expect(result).toBeNull();
    });
  });
});
