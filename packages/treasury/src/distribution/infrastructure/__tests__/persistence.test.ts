import { describe, it, expect, beforeEach } from "vitest";
import { DistributionSaga } from "../../saga/distribution.saga";
import type { SagaId, DistributionId } from "../../domain/value-objects";

import { InMemoryIdempotencyLedger } from "../persistence/idempotency-ledger";
import { InMemoryOutbox } from "../persistence/outbox";
import { InMemorySagaPersistence } from "../persistence/saga-persistence";
import { InMemoryCheckpointStore } from "../persistence/checkpoint-persistence";

function makeSagaId(id = "saga-1"): SagaId { return id as unknown as SagaId; }
function makeDistId(id = "dist-1"): DistributionId { return id as unknown as DistributionId; }

describe("InMemoryIdempotencyLedger", () => {
  let ledger: InMemoryIdempotencyLedger;

  beforeEach(() => {
    ledger = new InMemoryIdempotencyLedger();
  });

  it("records and retrieves idempotency entries", async () => {
    await ledger.record("key-1", "treasury.distribution.create", "agg-1", "actor-1", "hash-1", { result: "ok" }, "success", ["evt-1"]);
    const entry = await ledger.get("key-1");
    expect(entry).not.toBeNull();
    expect(entry!.commandType).toBe("treasury.distribution.create");
    expect(entry!.responsePayload).toEqual({ result: "ok" });
  });

  it("returns null for missing key", async () => {
    const entry = await ledger.get("nonexistent");
    expect(entry).toBeNull();
  });

  it("checks existence correctly", async () => {
    await ledger.record("key-2", "test", "agg-2", "actor-2", "hash-2", null, "ok", []);
    expect(await ledger.exists("key-2")).toBe(true);
    expect(await ledger.exists("key-missing")).toBe(false);
  });

  it("supports clear and count", async () => {
    await ledger.record("k1", "t", "a", "act", "h", {}, "ok", []);
    await ledger.record("k2", "t", "a", "act", "h", {}, "ok", []);
    expect(ledger.count()).toBe(2);
    ledger.clear();
    expect(ledger.count()).toBe(0);
  });
});

describe("InMemoryOutbox", () => {
  let outbox: InMemoryOutbox;

  beforeEach(() => {
    outbox = new InMemoryOutbox();
  });

  it("adds outbox records", async () => {
    await outbox.add("agg-1", "treasury.distribution.created", { data: "test" }, "idem-1", "del-idem-1");
    expect(outbox.count()).toBe(1);
  });

  it("tracks pending records", async () => {
    await outbox.add("agg-1", "event-1", {}, "idem-1", "del-idem-1");
    const pending = await outbox.getPending();
    expect(pending).toHaveLength(1);
  });

  it("marks records as delivered", async () => {
    await outbox.add("agg-1", "event-1", {}, "idem-1", "del-idem-1");
    const pending = await outbox.getPending();
    await outbox.markDelivered(pending[0]!.outboxId);

    const remaining = await outbox.getPending();
    expect(remaining).toHaveLength(0);
  });

  it("supports clear", async () => {
    await outbox.add("agg-1", "e1", {}, "ik", "dk");
    await outbox.add("agg-2", "e2", {}, "ik", "dk");
    expect(outbox.count()).toBe(2);
    outbox.clear();
    expect(outbox.count()).toBe(0);
  });
});

describe("InMemorySagaPersistence", () => {
  let persistence: InMemorySagaPersistence;

  beforeEach(() => {
    persistence = new InMemorySagaPersistence();
  });

  it("saves and retrieves saga by sagaId", async () => {
    const saga = DistributionSaga.start(makeSagaId(), makeDistId(), ["rec-1", "rec-2"]);
    await persistence.save(saga);

    const found = await persistence.findBySagaId(makeSagaId());
    expect(found).not.toBeNull();
    expect(found!.pendingRecipients).toHaveLength(2);
  });

  it("finds saga by distributionId", async () => {
    const distId = makeDistId("dist-saga");
    const saga = DistributionSaga.start(makeSagaId("saga-find"), distId, ["rec-1"]);
    await persistence.save(saga);

    const found = await persistence.findByDistributionId(distId);
    expect(found).not.toBeNull();
    expect(found!.sagaId).toBe("saga-find");
  });

  it("returns null for unknown sagas", async () => {
    expect(await persistence.findBySagaId(makeSagaId("unknown"))).toBeNull();
  });

  it("clear removes all sagas", async () => {
    const saga = DistributionSaga.start(makeSagaId(), makeDistId(), ["rec-1"]);
    await persistence.save(saga);
    expect(persistence.count()).toBe(1);
    persistence.clear();
    expect(persistence.count()).toBe(0);
  });
});

describe("InMemoryCheckpointStore", () => {
  let store: InMemoryCheckpointStore;

  beforeEach(() => {
    store = new InMemoryCheckpointStore();
  });

  it("saves and loads checkpoints", async () => {
    await store.save({ projectionName: "test_proj", position: 42, updatedAt: Date.now() });
    const ckpt = await store.load("test_proj");
    expect(ckpt).not.toBeNull();
    expect(ckpt!.position).toBe(42);
  });

  it("returns null for missing checkpoints", async () => {
    expect(await store.load("nonexistent")).toBeNull();
  });

  it("deletes checkpoints", async () => {
    await store.save({ projectionName: "del_test", position: 1, updatedAt: Date.now() });
    expect(await store.load("del_test")).not.toBeNull();
    await store.delete("del_test");
    expect(await store.load("del_test")).toBeNull();
  });

  it("clear removes all checkpoints", async () => {
    await store.save({ projectionName: "p1", position: 1, updatedAt: Date.now() });
    await store.save({ projectionName: "p2", position: 2, updatedAt: Date.now() });
    expect(store.count()).toBe(2);
    store.clear();
    expect(store.count()).toBe(0);
  });
});
