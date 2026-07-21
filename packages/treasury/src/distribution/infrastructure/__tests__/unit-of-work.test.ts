import { describe, it, expect, vi, beforeEach } from "vitest";
import { InMemoryEventStore } from "@relcko/test-utils";
import { OptimisticConcurrencyError, streamIdFor } from "@relcko/event-store";
import { DistributionAggregate } from "../../domain/distribution.aggregate";
import { DistributionType, AllocationMethod } from "../../domain/value-objects";
import type { DistributionId } from "../../domain/value-objects";
import { InMemoryOutbox } from "../persistence/outbox";
import { InMemoryIdempotencyLedger } from "../persistence/idempotency-ledger";
import { BigIntJsonSerializer } from "../services/bigint-serializer";
import { UnitOfWork, DefaultUnitOfWorkFactory, UnitOfWorkError } from "../persistence/unit-of-work";

function makeDistId(id = "dist-1"): DistributionId {
  return id as unknown as DistributionId;
}

function makeAggregate(id: DistributionId): DistributionAggregate {
  return DistributionAggregate.create(id, {
    distributionType: DistributionType.Dividend,
    sourceAccountId: "acc-1",
    totalAmount: 1000n,
    currency: "USDT",
    allocationMethod: AllocationMethod.ProRata,
  });
}

describe("UnitOfWork", () => {
  let eventStore: InMemoryEventStore;
  let outbox: InMemoryOutbox;
  let idempotencyLedger: InMemoryIdempotencyLedger;
  let serializer: BigIntJsonSerializer;
  let uow: UnitOfWork;

  beforeEach(() => {
    eventStore = new InMemoryEventStore(new BigIntJsonSerializer());
    outbox = new InMemoryOutbox();
    idempotencyLedger = new InMemoryIdempotencyLedger();
    uow = new UnitOfWork(eventStore, outbox, idempotencyLedger);
  });

  it("appends events atomically on commit", async () => {
    const agg = makeAggregate(makeDistId("dist-uow-1"));
    const events = agg.getUncommittedEvents();
    const expectedVersion = agg.version - events.length;

    uow.registerAppend(agg.aggregateType, String(agg.id), events, expectedVersion);
    expect(uow.hasPendingWork).toBe(true);

    await uow.commit();
    expect(uow.committed).toBe(true);

    const loaded = await eventStore.load(streamIdFor("distribution", "dist-uow-1"));
    expect(loaded.events.length).toBe(1);
  });

  it("commits outbox entries alongside events", async () => {
    const agg = makeAggregate(makeDistId("dist-uow-2"));
    const events = agg.getUncommittedEvents();
    const expectedVersion = agg.version - events.length;

    uow.registerAppend(agg.aggregateType, String(agg.id), events, expectedVersion);
    uow.registerOutbox("dist-uow-2", "treasury.distribution.created", { data: "test" }, "key-1", "outbox:e1");

    await uow.commit();
    const pending = await outbox.getPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].eventType).toBe("treasury.distribution.created");
  });

  it("records idempotency alongside events and outbox", async () => {
    const agg = makeAggregate(makeDistId("dist-uow-3"));
    const events = agg.getUncommittedEvents();

    uow.registerAppend(agg.aggregateType, String(agg.id), events, 0);
    uow.registerOutbox("dist-uow-3", "treasury.distribution.created", { data: "test" }, "key-3", "outbox:e3");
    uow.registerIdempotency("key-3", "treasury.distribution.create", "dist-uow-3", "actor-1", "hash", { id: "test" }, ["treasury.distribution.created"]);

    await uow.commit();

    const record = await idempotencyLedger.get("key-3");
    expect(record).not.toBeNull();
    expect(record!.commandType).toBe("treasury.distribution.create");
  });

  it("rolls back on optimistic concurrency error", async () => {
    const agg1 = makeAggregate(makeDistId("dist-conflict"));
    const events1 = agg1.getUncommittedEvents();
    const expectedVersion1 = agg1.version - events1.length;

    uow.registerAppend(agg1.aggregateType, String(agg1.id), events1, expectedVersion1);
    await uow.commit();
    expect(uow.committed).toBe(true);

    const uow2 = new UnitOfWork(eventStore, outbox, idempotencyLedger);
    const agg2 = makeAggregate(makeDistId("dist-conflict"));

    const realAppend = eventStore.append.bind(eventStore);
    vi.spyOn(eventStore, "append").mockImplementation(async () => {
      throw new OptimisticConcurrencyError("stream-dist-conflict", 1, 2);
    });

    uow2.registerAppend(agg2.aggregateType, String(agg2.id), agg2.getUncommittedEvents(), 0);
    uow2.registerOutbox("dist-conflict", "treasury.distribution.created", { data: "bad" }, "key-conflict", "outbox:bad");

    await expect(uow2.commit()).rejects.toThrow(OptimisticConcurrencyError);
    expect(uow2.rolledBack).toBe(true);
  });

  it("rejects double commit", async () => {
    const agg = makeAggregate(makeDistId("dist-double"));
    const events = agg.getUncommittedEvents();

    uow.registerAppend(agg.aggregateType, String(agg.id), events, 0);
    await uow.commit();

    await expect(uow.commit()).rejects.toThrow(UnitOfWorkError);
  });

  it("rejects operations after rollback", async () => {
    await uow.rollback();
    expect(() =>
      uow.registerAppend("distribution", "test", [], 0),
    ).toThrow(UnitOfWorkError);
  });

  it("handles empty commit gracefully", async () => {
    await expect(uow.commit()).resolves.not.toThrow();
    expect(uow.committed).toBe(true);
  });

  it("appends multiple aggregates in one commit", async () => {
    const agg1 = makeAggregate(makeDistId("dist-multi-1"));
    const agg2 = makeAggregate(makeDistId("dist-multi-2"));
    const events1 = agg1.getUncommittedEvents();
    const events2 = agg2.getUncommittedEvents();

    uow.registerAppend(agg1.aggregateType, String(agg1.id), events1, 0);
    uow.registerAppend(agg2.aggregateType, String(agg2.id), events2, 0);

    await uow.commit();

    const loaded1 = await eventStore.load(streamIdFor("distribution", "dist-multi-1"));
    const loaded2 = await eventStore.load(streamIdFor("distribution", "dist-multi-2"));
    expect(loaded1.events.length).toBe(1);
    expect(loaded2.events.length).toBe(1);
  });

  it("does not write outbox if event append fails", async () => {
    const uow2 = new UnitOfWork(eventStore, outbox, idempotencyLedger);

    vi.spyOn(eventStore, "append").mockImplementation(async () => {
      throw new Error("Simulated store failure");
    });

    uow2.registerAppend("distribution", "dist-fail-outbox", makeAggregate(makeDistId("dist-fail-outbox")).getUncommittedEvents(), 0);
    uow2.registerOutbox("dist-fail-outbox", "treasury.distribution.created", { data: "should-not-appear" }, "key-fail", "outbox:fail");

    await expect(uow2.commit()).rejects.toThrow("Simulated store failure");
    expect(uow2.rolledBack).toBe(true);

    const pending = await outbox.getPending();
    expect(pending.filter((r) => r.eventType === "treasury.distribution.created").length).toBe(0);
  });

  it("records unacknowledged append when event store succeeds but outbox fails", async () => {
    const reconciliationEntries: unknown[] = [];
    const uow2 = new UnitOfWork(eventStore, outbox, idempotencyLedger, (entry) => {
      reconciliationEntries.push(entry);
    });

    const distId = makeDistId("dist-recon");
    const agg = makeAggregate(distId);

    uow2.registerAppend(agg.aggregateType, String(agg.id), agg.getUncommittedEvents(), 0);
    uow2.registerOutbox(String(distId), "treasury.distribution.created", { data: "boom" }, "key-recon", "outbox:recon");

    vi.spyOn(outbox, "add").mockImplementation(async () => {
      throw new Error("Outbox write failure");
    });

    await expect(uow2.commit()).rejects.toThrow("Outbox write failure");
    expect(uow2.rolledBack).toBe(true);
    expect(reconciliationEntries).toHaveLength(1);
    const entry = reconciliationEntries[0] as Record<string, unknown>;
    expect(entry).toMatchObject({
      aggregateType: "distribution",
      eventCount: 1,
      failedPhase: "outbox",
    });
  });

  it("records unacknowledged append when event store and outbox succeed but idempotency fails", async () => {
    const reconciliationEntries: unknown[] = [];
    const uow2 = new UnitOfWork(eventStore, outbox, idempotencyLedger, (entry) => {
      reconciliationEntries.push(entry);
    });

    const agg = makeAggregate(makeDistId("dist-recon-idem"));
    uow2.registerAppend(agg.aggregateType, String(agg.id), agg.getUncommittedEvents(), 0);
    uow2.registerOutbox("dist-recon-idem", "treasury.distribution.created", { data: "test" }, "key-recon-idem", "outbox:recon-idem");
    uow2.registerIdempotency("key-recon-idem", "test.command", "dist-recon-idem", "actor", "hash", {}, []);

    vi.spyOn(idempotencyLedger, "record").mockImplementation(async () => {
      throw new Error("Idempotency write failure");
    });

    await expect(uow2.commit()).rejects.toThrow("Idempotency write failure");
    expect(uow2.rolledBack).toBe(true);
    expect(reconciliationEntries).toHaveLength(1);
    const entry = reconciliationEntries[0] as Record<string, unknown>;
    expect(entry).toMatchObject({
      aggregateType: "distribution",
      failedPhase: "idempotency",
    });
  });

  it("does not record reconciliation when event store fails before outbox", async () => {
    const reconciliationEntries: unknown[] = [];
    const uow2 = new UnitOfWork(eventStore, outbox, idempotencyLedger, (entry) => {
      reconciliationEntries.push(entry);
    });

    const agg = makeAggregate(makeDistId("dist-no-recon"));
    uow2.registerAppend(agg.aggregateType, String(agg.id), agg.getUncommittedEvents(), 0);

    vi.spyOn(eventStore, "append").mockImplementation(async () => {
      throw new Error("Event store failure");
    });

    await expect(uow2.commit()).rejects.toThrow("Event store failure");
    expect(reconciliationEntries).toHaveLength(0);
  });
});

describe("DefaultUnitOfWorkFactory", () => {
  it("creates a UnitOfWork backed by the injected stores", () => {
    const eventStore = new InMemoryEventStore();
    const outbox = new InMemoryOutbox();
    const ledger = new InMemoryIdempotencyLedger();
    const factory = new DefaultUnitOfWorkFactory(eventStore, outbox, ledger);

    const uow = factory.create();
    expect(uow).toBeInstanceOf(UnitOfWork);
    expect(uow.committed).toBe(false);
  });

  it("exposes unacknowledged appends from factory", async () => {
    const eventStore = new InMemoryEventStore(new BigIntJsonSerializer());
    const outbox = new InMemoryOutbox();
    const ledger = new InMemoryIdempotencyLedger();
    const factory = new DefaultUnitOfWorkFactory(eventStore, outbox, ledger);

    const agg = makeAggregate(makeDistId("dist-factory-recon"));
    const uow = factory.create();
    uow.registerAppend(agg.aggregateType, String(agg.id), agg.getUncommittedEvents(), 0);
    uow.registerOutbox("dist-factory-recon", "treasury.distribution.created", { data: "boom" }, "key-factory", "outbox:factory");

    vi.spyOn(outbox, "add").mockImplementation(async () => {
      throw new Error("Outbox failure");
    });

    await expect(uow.commit()).rejects.toThrow("Outbox failure");

    const unacknowledged = factory.getUnacknowledgedAppends();
    expect(unacknowledged).toHaveLength(1);
    expect(unacknowledged[0]!.aggregateType).toBe("distribution");
    expect(unacknowledged[0]!.eventCount).toBeGreaterThan(0);
    expect(unacknowledged[0]!.failedPhase).toBe("outbox");
  });

  it("clears unacknowledged appends", async () => {
    const eventStore = new InMemoryEventStore(new BigIntJsonSerializer());
    const outbox = new InMemoryOutbox();
    const ledger = new InMemoryIdempotencyLedger();
    const factory = new DefaultUnitOfWorkFactory(eventStore, outbox, ledger);

    const agg = makeAggregate(makeDistId("dist-clear-recon"));
    const uow = factory.create();
    uow.registerAppend(agg.aggregateType, String(agg.id), agg.getUncommittedEvents(), 0);
    uow.registerOutbox("dist-clear-recon", "treasury.distribution.created", { data: "boom" }, "key-clear", "outbox:clear");

    vi.spyOn(outbox, "add").mockImplementation(async () => {
      throw new Error("Outbox failure");
    });

    await expect(uow.commit()).rejects.toThrow("Outbox failure");
    expect(factory.getUnacknowledgedAppends()).toHaveLength(1);

    factory.clearUnacknowledgedAppends();
    expect(factory.getUnacknowledgedAppends()).toHaveLength(0);
  });
});
