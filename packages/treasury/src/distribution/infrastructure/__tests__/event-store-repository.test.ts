import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventStore } from "@relcko/test-utils";
import { BigIntJsonSerializer } from "../services/bigint-serializer";

import { DistributionAggregate } from "../../domain/distribution.aggregate";
import { DistributionRecipientAggregate } from "../../domain/distribution-recipient.aggregate";
import { DistributionScheduleAggregate } from "../../domain/distribution-schedule.aggregate";
import { DistributionSaga } from "../../saga/distribution.saga";
import { DistributionType, AllocationMethod, EligibilityProof, ScheduleStatus } from "../../domain/value-objects";
import type { DistributionId, RecipientId, ScheduleId, SagaId } from "../../domain/value-objects";

import { DistributionEventStoreRepository } from "../event-store/distribution-event-store.repository";
import { RecipientEventStoreRepository } from "../event-store/recipient-event-store.repository";
import { ScheduleEventStoreRepository } from "../event-store/schedule-event-store.repository";
import { SagaEventStoreRepository } from "../event-store/saga-event-store.repository";
import { DistributionNotFoundError, RecipientNotFoundError, DistributionScheduleNotFoundError } from "../../domain/errors";

function makeDistId(id = "dist-1"): DistributionId { return id as unknown as DistributionId; }
function makeRecId(id = "rec-1"): RecipientId { return id as unknown as RecipientId; }
function makeSchedId(id = "sched-1"): ScheduleId { return id as unknown as ScheduleId; }
function makeSagaId(id = "saga-1"): SagaId { return id as unknown as SagaId; }

function makeEligibilityProof(): EligibilityProof {
  return EligibilityProof.create({
    snapshotId: "snap-1", positionIndex: 0, quantity: 100n, perUnitAmount: 10n, hash: "h-1",
  });
}

describe("DistributionEventStoreRepository", () => {
  let eventStore: InMemoryEventStore;
  let repo: DistributionEventStoreRepository;

  beforeEach(() => {
    eventStore = new InMemoryEventStore(new BigIntJsonSerializer());
    repo = new DistributionEventStoreRepository(eventStore);
  });

  it("saves and loads a distribution aggregate", async () => {
    const id = makeDistId("dist-save-1");
    const agg = DistributionAggregate.create(id, {
      distributionType: DistributionType.Dividend,
      sourceAccountId: "acc-1",
      totalAmount: 1000n,
      currency: "USDT",
      allocationMethod: AllocationMethod.ProRata,
    });
    await repo.save(agg);

    const loaded = await repo.findById(id);
    expect(loaded).not.toBeNull();
    expect(loaded!.status).toBe("draft");
    expect(loaded!.totalAmount).toBe(1000n);
  });

  it("throws DistributionNotFoundError for missing aggregate", async () => {
    await expect(repo.getById(makeDistId("nonexistent"))).rejects.toThrow(DistributionNotFoundError);
  });

  it("rejects delete", async () => {
    await expect(repo.delete(makeDistId("dist-1"))).rejects.toThrow("not supported");
  });

  it("persists events and replays them on load", async () => {
    const id = makeDistId("dist-replay");
    const agg = DistributionAggregate.create(id, {
      distributionType: DistributionType.Dividend,
      sourceAccountId: "acc-1",
      totalAmount: 1000n,
      currency: "USDT",
      allocationMethod: AllocationMethod.ProRata,
    });
    await repo.save(agg);

    agg.approve({ approvals: [], approvalEpoch: 1, reservationJournalId: "j-1" });
    await repo.save(agg);

    const loaded = await repo.findById(id);
    expect(loaded!.status).toBe("approved");
    expect(loaded!.version).toBe(2);
  });
});

describe("RecipientEventStoreRepository", () => {
  let eventStore: InMemoryEventStore;
  let repo: RecipientEventStoreRepository;

  beforeEach(() => {
    eventStore = new InMemoryEventStore(new BigIntJsonSerializer());
    repo = new RecipientEventStoreRepository(eventStore);
  });

  it("saves and loads a recipient aggregate", async () => {
    const id = makeRecId("rec-save-1");
    const proof = makeEligibilityProof();
    const agg = DistributionRecipientAggregate.create(id, makeDistId("d-1"), "inv-1", 500n, "USDT", proof);
    await repo.save(agg);

    const loaded = await repo.findById(id);
    expect(loaded).not.toBeNull();
    expect(loaded!.status).toBe("pending");
    expect(loaded!.investorId).toBe("inv-1");
  });

  it("throws RecipientNotFoundError for missing aggregate", async () => {
    await expect(repo.getById(makeRecId("nonexistent"))).rejects.toThrow(RecipientNotFoundError);
  });

  it("finds recipients by distributionId", async () => {
    const distId = makeDistId("d-group");
    const p1 = makeEligibilityProof();
    const p2 = makeEligibilityProof();
    const r1 = DistributionRecipientAggregate.create(makeRecId("r-a"), distId, "inv-1", 100n, "USDT", p1);
    const r2 = DistributionRecipientAggregate.create(makeRecId("r-b"), distId, "inv-2", 200n, "USDT", p2);
    await repo.save(r1);
    await repo.save(r2);

    const found = await repo.findByDistributionId(distId);
    expect(found).toHaveLength(2);
  });

  it("finds recipients by investorId", async () => {
    const distId = makeDistId("d-inv");
    const p = makeEligibilityProof();
    const r1 = DistributionRecipientAggregate.create(makeRecId("r-x"), distId, "inv-99", 100n, "USDT", p);
    await repo.save(r1);

    const found = await repo.findByInvestorId("inv-99");
    expect(found).toHaveLength(1);
  });

  it("rejects delete", async () => {
    await expect(repo.delete(makeRecId("rec-1"))).rejects.toThrow("not supported");
  });
});

describe("ScheduleEventStoreRepository", () => {
  let eventStore: InMemoryEventStore;
  let repo: ScheduleEventStoreRepository;

  beforeEach(() => {
    eventStore = new InMemoryEventStore(new BigIntJsonSerializer());
    repo = new ScheduleEventStoreRepository(eventStore);
  });

  it("saves and loads a schedule aggregate", async () => {
    const id = makeSchedId("sched-save-1");
    const agg = DistributionScheduleAggregate.create(id, {
      distributionType: DistributionType.Dividend,
      propertyId: "prop-1",
      periodStart: 1000,
      periodEnd: 2000,
      totalAmount: 5000n,
      perUnitAmount: 10n,
      currency: "USDT",
    });
    await repo.save(agg);

    const loaded = await repo.findById(id);
    expect(loaded).not.toBeNull();
    expect(loaded!.status).toBe("draft");
  });

  it("throws DistributionScheduleNotFoundError for missing aggregate", async () => {
    await expect(repo.getById(makeSchedId("nonexistent"))).rejects.toThrow(DistributionScheduleNotFoundError);
  });

  it("rejects delete", async () => {
    await expect(repo.delete(makeSchedId("sched-1"))).rejects.toThrow("not supported");
  });

  it("finds schedules by status", async () => {
    const id = makeSchedId("sched-status");
    const agg = DistributionScheduleAggregate.create(id, {
      distributionType: DistributionType.Dividend,
      propertyId: "prop-1",
      periodStart: 1000,
      periodEnd: 2000,
      totalAmount: 5000n,
      perUnitAmount: 10n,
      currency: "USDT",
    });
    await repo.save(agg);

    const draftSchedules = await repo.findByStatus(ScheduleStatus.Draft);
    expect(draftSchedules.length).toBeGreaterThanOrEqual(1);
  });
});

describe("SagaEventStoreRepository", () => {
  let eventStore: InMemoryEventStore;
  let repo: SagaEventStoreRepository;

  beforeEach(() => {
    eventStore = new InMemoryEventStore(new BigIntJsonSerializer());
    repo = new SagaEventStoreRepository(eventStore);
  });

  it("saves and finds saga by sagaId", async () => {
    const sagaId = makeSagaId("saga-test-1");
    const saga = DistributionSaga.start(sagaId, makeDistId("d-1"), ["rec-1", "rec-2"]);
    await repo.save(saga);

    const found = await repo.findBySagaId(sagaId);
    expect(found).not.toBeNull();
    expect(found!.state).toBe("running");
    expect(found!.pendingRecipients).toHaveLength(2);
  });

  it("finds saga by distributionId", async () => {
    const distId = makeDistId("d-saga-find");
    const saga = DistributionSaga.start(makeSagaId("saga-find"), distId, ["rec-1"]);
    await repo.save(saga);

    const found = await repo.findByDistributionId(distId);
    expect(found).not.toBeNull();
  });
});
