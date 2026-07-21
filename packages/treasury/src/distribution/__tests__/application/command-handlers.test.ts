import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Command } from "@relcko/application";

import { DistributionAggregate } from "../../domain/distribution.aggregate";
import { DistributionRecipientAggregate } from "../../domain/distribution-recipient.aggregate";
import { DistributionScheduleAggregate } from "../../domain/distribution-schedule.aggregate";
import { DistributionSaga } from "../../saga/distribution.saga";
import {
  DistributionStatus,
  ScheduleStatus,
  RecipientStatus,
  DistributionType,
  AllocationMethod,
  EligibilityProof,
  RecoveryStrategy,
} from "../../domain/value-objects";
import type { DistributionId, RecipientId, ScheduleId, SagaId } from "../../domain/value-objects";
import type { FinalTotals } from "../../domain/value-objects";
import type { DomainEvent } from "@relcko/kernel";

import {
  CreateDistributionHandler,
  ApproveDistributionHandler,
  CancelDistributionHandler,
  MaterializeDistributionRecipientsHandler,
  ExecuteDistributionHandler,
  CompleteDistributionHandler,
  FailDistributionHandler,
  ReconcileDistributionHandler,
  ProcessRecipientPaymentHandler,
  FailRecipientPaymentHandler,
  RecoverRecipientPaymentHandler,
  CreateScheduleHandler,
  ActivateScheduleHandler,
  CloseScheduleHandler,
  createDistributionCommandHandlers,
  type CreateDistributionPayload,
  type ApproveDistributionPayload,
  type CancelDistributionPayload,
  type MaterializeDistributionRecipientsPayload,
  type ExecuteDistributionPayload,
  type CompleteDistributionPayload,
  type FailDistributionPayload,
  type ReconcileDistributionPayload,
  type ProcessRecipientPaymentPayload,
  type FailRecipientPaymentPayload,
  type RecoverRecipientPaymentPayload,
  type CreateSchedulePayload,
  type ActivateSchedulePayload,
  type CloseSchedulePayload,
  type DistributionCommandDeps,
  type RecipientEntry,
} from "../../application/command-handlers";

function makeId(id = "dist-1"): DistributionId {
  return id as unknown as DistributionId;
}
function makeRecId(id = "rec-1"): RecipientId {
  return id as unknown as RecipientId;
}
function makeSchedId(id = "sched-1"): ScheduleId {
  return id as unknown as ScheduleId;
}
function makeSagaId(id = "saga-1"): SagaId {
  return id as unknown as SagaId;
}

function makeCommand<T>(type: string, payload: T, causationId?: string): Command<T> {
  return {
    type,
    payload,
    metadata: {
      messageId: `msg-${Date.now()}`,
      correlationId: "corr-1" as never,
      causationId,
      timestamp: Date.now(),
    },
  } as Command<T>;
}

function makeFinalTotals(
  totalDistributed = 1000n,
  totalFailed = 0n,
  totalRecovered = 0n,
  paidCount = 1,
  failedCount = 0,
  recoveredCount = 0,
  writeOffAmount = 0n,
): FinalTotals {
  return new (class extends Object {
    readonly totalDistributed = totalDistributed;
    readonly totalFailed = totalFailed;
    readonly totalRecovered = totalRecovered;
    readonly paidCount = paidCount;
    readonly failedCount = failedCount;
    readonly recoveredCount = recoveredCount;
    readonly writeOffAmount = writeOffAmount;
  })() as unknown as FinalTotals;
}

function makeEligibilityProof(): EligibilityProof {
  return EligibilityProof.create({
    snapshotId: "snap-1",
    positionIndex: 0,
    quantity: 100n,
    perUnitAmount: 10n,
    hash: "proof-hash-1",
  });
}

// ─── Mock Infrastructure ────────────────────────────────────────────────

function createMockDeps(): {
  deps: DistributionCommandDeps;
  storage: {
    distributions: Map<string, DistributionAggregate>;
    recipients: Map<string, DistributionRecipientAggregate>;
    schedules: Map<string, DistributionScheduleAggregate>;
    sagas: Map<string, DistributionSaga>;
    idempotency: Map<string, unknown>;
    outbox: Array<{ aggregateId: string; eventType: string; eventPayload: unknown }>;
  };
} {
  const storage = {
    distributions: new Map<string, DistributionAggregate>(),
    recipients: new Map<string, DistributionRecipientAggregate>(),
    schedules: new Map<string, DistributionScheduleAggregate>(),
    sagas: new Map<string, DistributionSaga>(),
    idempotency: new Map<string, unknown>(),
    outbox: [] as Array<{ aggregateId: string; eventType: string; eventPayload: unknown }>,
  };

  const deps: DistributionCommandDeps = {
    distributionRepo: {
      findById: async (id: DistributionId) => storage.distributions.get(String(id)) ?? null,
      getById: async (id: DistributionId) => {
        const agg = storage.distributions.get(String(id));
        if (!agg) throw new Error(`Distribution ${id} not found`);
        return agg;
      },
      save: async (agg: DistributionAggregate) => {
        storage.distributions.set(String(agg.id), agg);
        agg.markEventsAsCommitted();
      },
      delete: async (id: DistributionId) => { storage.distributions.delete(String(id)); },
      findByScheduleId: async () => [],
    },
    recipientRepo: {
      findById: async (id: RecipientId) => storage.recipients.get(String(id)) ?? null,
      getById: async (id: RecipientId) => {
        const agg = storage.recipients.get(String(id));
        if (!agg) throw new Error(`Recipient ${id} not found`);
        return agg;
      },
      save: async (agg: DistributionRecipientAggregate) => {
        storage.recipients.set(String(agg.id), agg);
        agg.markEventsAsCommitted();
      },
      delete: async (id: RecipientId) => { storage.recipients.delete(String(id)); },
      findByDistributionId: async (distId: DistributionId) =>
        Array.from(storage.recipients.values()).filter(
          (r) => String(r.distributionId) === String(distId),
        ),
      findByInvestorId: async () => [],
      findByDistributionAndInvestor: async () => null,
    },
    scheduleRepo: {
      findById: async (id: ScheduleId) => storage.schedules.get(String(id)) ?? null,
      getById: async (id: ScheduleId) => {
        const agg = storage.schedules.get(String(id));
        if (!agg) throw new Error(`Schedule ${id} not found`);
        return agg;
      },
      save: async (agg: DistributionScheduleAggregate) => {
        storage.schedules.set(String(agg.id), agg);
        agg.markEventsAsCommitted();
      },
      delete: async (id: ScheduleId) => { storage.schedules.delete(String(id)); },
      findByPropertyId: async () => [],
      findByStatus: async () => [],
    },
    sagaRepo: {
      save: async (saga: DistributionSaga) => {
        storage.sagas.set(String(saga.sagaId), saga);
        saga.markEventsAsCommitted();
      },
      findBySagaId: async (id: SagaId) => storage.sagas.get(String(id)) ?? null,
      findByDistributionId: async (distId: DistributionId) =>
        Array.from(storage.sagas.values()).find(
          (s) => String(s.distributionId) === String(distId),
        ) ?? null,
    },
    idempotencyLedger: {
      record: async (key, commandType, aggregateId, actorId, requestHash, responsePayload, responseStatus, producedEvents) => {
        storage.idempotency.set(key, { responsePayload, responseStatus });
      },
      get: async (key: string) => {
        const entry = storage.idempotency.get(key);
        if (!entry) return null;
        return entry as never;
      },
      exists: async (key: string) => storage.idempotency.has(key),
    },
    outbox: {
      add: async (aggregateId, eventType, eventPayload, originatingIdempotencyKey, deliveredIdempotencyKey) => {
        storage.outbox.push({ aggregateId, eventType, eventPayload });
      },
      markDelivered: async () => {},
      getPending: async () => [],
    },
  };

  return { deps, storage };
}

// ─── CreateDistributionHandler ──────────────────────────────────────────

describe("CreateDistributionHandler", () => {
  it("creates a distribution and returns its ID", async () => {
    const { deps, storage } = createMockDeps();

    const handler = new CreateDistributionHandler(deps);
    const payload: CreateDistributionPayload = {
      distributionType: DistributionType.Dividend,
      sourceAccountId: "acc-1",
      totalAmount: 1000n,
      currency: "USDT",
      allocationMethod: AllocationMethod.ProRata,
    };

    const result = await handler.handle(makeCommand("treasury.distribution.create", payload));

    expect(result.distributionId).toBeDefined();
    expect(storage.distributions.size).toBe(1);
    expect(storage.outbox.length).toBe(1);

    const saved = storage.distributions.get(result.distributionId)!;
    expect(saved.status).toBe(DistributionStatus.Draft);
  });

  it("returns cached result on idempotent request", async () => {
    const { deps, storage } = createMockDeps();

    const idempotencyKey = "idem-1";
    storage.idempotency.set(idempotencyKey, {
      responsePayload: { distributionId: "cached-dist-1" },
      responseStatus: "success",
    });

    const handler = new CreateDistributionHandler(deps);
    const payload: CreateDistributionPayload = {
      distributionType: DistributionType.Dividend,
      sourceAccountId: "acc-1",
      totalAmount: 1000n,
      currency: "USDT",
      allocationMethod: AllocationMethod.ProRata,
    };

    const result = await handler.handle(
      makeCommand("treasury.distribution.create", payload, idempotencyKey),
    );

    expect(result.distributionId).toBe("cached-dist-1");
    expect(storage.distributions.size).toBe(0);
  });

  it("publishes creation event to outbox", async () => {
    const { deps, storage } = createMockDeps();

    const handler = new CreateDistributionHandler(deps);
    const payload: CreateDistributionPayload = {
      distributionType: DistributionType.Dividend,
      sourceAccountId: "acc-1",
      totalAmount: 1000n,
      currency: "USDT",
      allocationMethod: AllocationMethod.ProRata,
    };

    await handler.handle(makeCommand("treasury.distribution.create", payload));

    expect(storage.outbox.length).toBe(1);
    expect(storage.outbox[0].eventType).toBe("treasury.distribution.created");
  });
});

// ─── ApproveDistributionHandler ─────────────────────────────────────────

describe("ApproveDistributionHandler", () => {
  it("approves a draft distribution", async () => {
    const { deps, storage } = createMockDeps();

    const id = makeId("dist-1");
    const agg = DistributionAggregate.create(id, {
      distributionType: DistributionType.Dividend,
      sourceAccountId: "acc-1",
      totalAmount: 1000n,
      currency: "USDT",
      allocationMethod: AllocationMethod.ProRata,
    });
    agg.markEventsAsCommitted();
    storage.distributions.set(String(id), agg);

    const handler = new ApproveDistributionHandler(deps);
    const payload: ApproveDistributionPayload = {
      distributionId: id,
      approvals: [],
      approvalEpoch: 1,
      reservationJournalId: "journal-1",
    };

    await handler.handle(makeCommand("treasury.distribution.approve", payload));

    const saved = storage.distributions.get(String(id))!;
    expect(saved.status).toBe(DistributionStatus.Approved);
  });

  it("rejects invalid state transition", async () => {
    const { deps, storage } = createMockDeps();

    const id = makeId("dist-1");
    const agg = DistributionAggregate.create(id, {
      distributionType: DistributionType.Dividend,
      sourceAccountId: "acc-1",
      totalAmount: 1000n,
      currency: "USDT",
      allocationMethod: AllocationMethod.ProRata,
    });
    agg.markEventsAsCommitted();
    agg.cancel("test", "actor-1");
    agg.markEventsAsCommitted();
    storage.distributions.set(String(id), agg);

    const handler = new ApproveDistributionHandler(deps);
    const payload: ApproveDistributionPayload = {
      distributionId: id,
      approvals: [],
      approvalEpoch: 1,
      reservationJournalId: "journal-1",
    };

    await expect(
      handler.handle(makeCommand("treasury.distribution.approve", payload)),
    ).rejects.toThrow();
  });
});

// ─── CancelDistributionHandler ──────────────────────────────────────────

describe("CancelDistributionHandler", () => {
  it("cancels a draft distribution", async () => {
    const { deps, storage } = createMockDeps();

    const id = makeId("dist-1");
    const agg = DistributionAggregate.create(id, {
      distributionType: DistributionType.Dividend,
      sourceAccountId: "acc-1",
      totalAmount: 1000n,
      currency: "USDT",
      allocationMethod: AllocationMethod.ProRata,
    });
    agg.markEventsAsCommitted();
    storage.distributions.set(String(id), agg);

    const handler = new CancelDistributionHandler(deps);
    const payload: CancelDistributionPayload = {
      distributionId: id,
      reason: "changed mind",
      cancelledBy: "actor-1",
    };

    await handler.handle(makeCommand("treasury.distribution.cancel", payload));

    const saved = storage.distributions.get(String(id))!;
    expect(saved.status).toBe(DistributionStatus.Cancelled);
  });
});

// ─── MaterializeDistributionRecipientsHandler ───────────────────────────

describe("MaterializeDistributionRecipientsHandler", () => {
  it("materializes recipients for an approved distribution", async () => {
    const { deps, storage } = createMockDeps();

    const id = makeId("dist-1");
    const agg = DistributionAggregate.create(id, {
      distributionType: DistributionType.Dividend,
      sourceAccountId: "acc-1",
      totalAmount: 1000n,
      currency: "USDT",
      allocationMethod: AllocationMethod.ProRata,
    });
    agg.markEventsAsCommitted();
    agg.approve({ approvals: [] }, 1, "journal-1");
    agg.markEventsAsCommitted();
    storage.distributions.set(String(id), agg);

    const handler = new MaterializeDistributionRecipientsHandler(deps);
    const recipients: RecipientEntry[] = [
      {
        recipientId: makeRecId("rec-1"),
        investorId: "inv-1",
        eligibleAmount: 500n,
        currency: "USDT",
        proof: {
          snapshotId: "snap-1",
          positionIndex: 0,
          quantity: 50n,
          perUnitAmount: 10n,
          hash: "hash-1",
        },
      },
      {
        recipientId: makeRecId("rec-2"),
        investorId: "inv-2",
        eligibleAmount: 500n,
        currency: "USDT",
        proof: {
          snapshotId: "snap-1",
          positionIndex: 1,
          quantity: 50n,
          perUnitAmount: 10n,
          hash: "hash-2",
        },
      },
    ];

    const payload: MaterializeDistributionRecipientsPayload = {
      distributionId: id,
      snapshotId: "snap-1",
      eligibilityRuleId: null,
      recipients,
    };

    await handler.handle(
      makeCommand("treasury.distribution.materialize_recipients", payload),
    );

    const saved = storage.distributions.get(String(id))!;
    expect(saved.status).toBe(DistributionStatus.RecipientsMaterialized);
    expect(storage.recipients.size).toBe(2);
  });
});

// ─── ExecuteDistributionHandler ─────────────────────────────────────────

describe("ExecuteDistributionHandler", () => {
  it("starts execution and creates a saga", async () => {
    const { deps, storage } = createMockDeps();

    const id = makeId("dist-1");
    const agg = DistributionAggregate.create(id, {
      distributionType: DistributionType.Dividend,
      sourceAccountId: "acc-1",
      totalAmount: 1000n,
      currency: "USDT",
      allocationMethod: AllocationMethod.ProRata,
    });
    agg.markEventsAsCommitted();
    agg.approve({ approvals: [] }, 1, "journal-1");
    agg.markEventsAsCommitted();
    agg.materializeRecipients("snap-1", 1000n, 2, "manifest-hash");
    agg.markEventsAsCommitted();
    storage.distributions.set(String(id), agg);

    const rec1 = DistributionRecipientAggregate.create(
      makeRecId("rec-1"), id, "inv-1", 500n, "USDT", makeEligibilityProof(),
    );
    rec1.markEventsAsCommitted();
    storage.recipients.set("rec-1", rec1);

    const rec2 = DistributionRecipientAggregate.create(
      makeRecId("rec-2"), id, "inv-2", 500n, "USDT", makeEligibilityProof(),
    );
    rec2.markEventsAsCommitted();
    storage.recipients.set("rec-2", rec2);

    const handler = new ExecuteDistributionHandler(deps);
    const payload: ExecuteDistributionPayload = {
      distributionId: id,
    };

    const result = await handler.handle(makeCommand("treasury.distribution.execute", payload));

    expect(result.sagaId).toBeDefined();
    const saved = storage.distributions.get(String(id))!;
    expect(saved.status).toBe(DistributionStatus.Executing);
    expect(storage.sagas.size).toBe(1);
  });
});

// ─── CompleteDistributionHandler ────────────────────────────────────────

describe("CompleteDistributionHandler", () => {
  it("completes a distribution and saga", async () => {
    const { deps, storage } = createMockDeps();

    const id = makeId("dist-1");
    const sagaId = makeSagaId("saga-1");
    const agg = DistributionAggregate.create(id, {
      distributionType: DistributionType.Dividend,
      sourceAccountId: "acc-1",
      totalAmount: 1000n,
      currency: "USDT",
      allocationMethod: AllocationMethod.ProRata,
    });
    agg.markEventsAsCommitted();
    agg.approve({ approvals: [] }, 1, "journal-1");
    agg.markEventsAsCommitted();
    agg.materializeRecipients("snap-1", 1000n, 1, "manifest-hash");
    agg.markEventsAsCommitted();
    agg.execute({}, sagaId);
    agg.markEventsAsCommitted();
    storage.distributions.set(String(id), agg);

    const saga = DistributionSaga.start(sagaId, id, ["rec-1"]);
    saga.markEventsAsCommitted();
    storage.sagas.set(String(sagaId), saga);

    const handler = new CompleteDistributionHandler(deps);
    const payload: CompleteDistributionPayload = {
      distributionId: id,
      finalTotals: makeFinalTotals(1000n),
      sagaId,
    };

    await handler.handle(makeCommand("treasury.distribution.complete", payload));

    const saved = storage.distributions.get(String(id))!;
    expect(saved.status).toBe(DistributionStatus.Completed);
  });
});

// ─── FailDistributionHandler ────────────────────────────────────────────

describe("FailDistributionHandler", () => {
  it("fails a distribution and saga", async () => {
    const { deps, storage } = createMockDeps();

    const id = makeId("dist-1");
    const sagaId = makeSagaId("saga-1");
    const agg = DistributionAggregate.create(id, {
      distributionType: DistributionType.Dividend,
      sourceAccountId: "acc-1",
      totalAmount: 1000n,
      currency: "USDT",
      allocationMethod: AllocationMethod.ProRata,
    });
    agg.markEventsAsCommitted();
    agg.approve({ approvals: [] }, 1, "journal-1");
    agg.markEventsAsCommitted();
    agg.materializeRecipients("snap-1", 1000n, 1, "manifest-hash");
    agg.markEventsAsCommitted();
    agg.execute({}, sagaId);
    agg.markEventsAsCommitted();
    storage.distributions.set(String(id), agg);

    const saga = DistributionSaga.start(sagaId, id, ["rec-1"]);
    saga.markEventsAsCommitted();
    storage.sagas.set(String(sagaId), saga);

    const handler = new FailDistributionHandler(deps);
    const payload: FailDistributionPayload = {
      distributionId: id,
      finalTotals: makeFinalTotals(500n, 500n, 0n, 1, 1),
      sagaId,
      reason: "payment gateway error",
    };

    await handler.handle(makeCommand("treasury.distribution.fail", payload));

    const saved = storage.distributions.get(String(id))!;
    expect(saved.status).toBe(DistributionStatus.Failed);
  });
});

// ─── ReconcileDistributionHandler ───────────────────────────────────────

describe("ReconcileDistributionHandler", () => {
  it("reconciles a distribution", async () => {
    const { deps, storage } = createMockDeps();

    const id = makeId("dist-1");
    const agg = DistributionAggregate.create(id, {
      distributionType: DistributionType.Dividend,
      sourceAccountId: "acc-1",
      totalAmount: 1000n,
      currency: "USDT",
      allocationMethod: AllocationMethod.ProRata,
    });
    agg.markEventsAsCommitted();
    storage.distributions.set(String(id), agg);

    const handler = new ReconcileDistributionHandler(deps);
    const payload: ReconcileDistributionPayload = {
      distributionId: id,
      expectedTotal: 1000n,
      actualTotal: 1000n,
    };

    const result = await handler.handle(
      makeCommand("treasury.distribution.reconcile", payload),
    );

    expect(result.reconciled).toBe(true);
    expect(result.discrepancy).toBe(0n);

    const mismatchResult = await handler.handle(
      makeCommand("treasury.distribution.reconcile", {
        ...payload,
        actualTotal: 900n,
      }),
    );

    expect(mismatchResult.reconciled).toBe(false);
    expect(mismatchResult.discrepancy).toBe(100n);
  });
});

// ─── ProcessRecipientPaymentHandler ─────────────────────────────────────

describe("ProcessRecipientPaymentHandler", () => {
  it("processes a recipient payment and updates saga", async () => {
    const { deps, storage } = createMockDeps();

    const distId = makeId("dist-1");
    const recId = makeRecId("rec-1");
    const sagaId = makeSagaId("saga-1");

    const recipient = DistributionRecipientAggregate.create(
      recId, distId, "inv-1", 500n, "USDT", makeEligibilityProof(),
    );
    recipient.markEventsAsCommitted();
    storage.recipients.set(String(recId), recipient);

    const saga = DistributionSaga.start(sagaId, distId, ["rec-1"]);
    saga.nextBatch(10);
    saga.markEventsAsCommitted();
    storage.sagas.set(String(sagaId), saga);

    const handler = new ProcessRecipientPaymentHandler(deps);
    const payload: ProcessRecipientPaymentPayload = {
      distributionId: distId,
      recipientId: recId,
      amount: 500n,
      currency: "USDT",
      settlementRef: "settle-1",
      txHash: "0xabc",
    };

    await handler.handle(
      makeCommand("treasury.distribution.process_recipient_payment", payload),
    );

    const saved = storage.recipients.get(String(recId))!;
    expect(saved.status).toBe(RecipientStatus.Paid);
  });
});

// ─── FailRecipientPaymentHandler ────────────────────────────────────────

describe("FailRecipientPaymentHandler", () => {
  it("fails a recipient payment and updates saga", async () => {
    const { deps, storage } = createMockDeps();

    const distId = makeId("dist-1");
    const recId = makeRecId("rec-1");
    const sagaId = makeSagaId("saga-1");

    const recipient = DistributionRecipientAggregate.create(
      recId, distId, "inv-1", 500n, "USDT", makeEligibilityProof(),
    );
    recipient.markEventsAsCommitted();
    storage.recipients.set(String(recId), recipient);

    const saga = DistributionSaga.start(sagaId, distId, ["rec-1"]);
    saga.nextBatch(10);
    saga.markEventsAsCommitted();
    storage.sagas.set(String(sagaId), saga);

    const handler = new FailRecipientPaymentHandler(deps);
    const payload: FailRecipientPaymentPayload = {
      distributionId: distId,
      recipientId: recId,
      amount: 500n,
      currency: "USDT",
      reason: "insufficient funds",
      errorCode: "ERR_INSUFFICIENT_FUNDS",
    };

    await handler.handle(
      makeCommand("treasury.distribution.fail_recipient_payment", payload),
    );

    const saved = storage.recipients.get(String(recId))!;
    expect(saved.status).toBe(RecipientStatus.Failed);
  });
});

// ─── RecoverRecipientPaymentHandler ─────────────────────────────────────

describe("RecoverRecipientPaymentHandler", () => {
  it("recovers a failed recipient payment", async () => {
    const { deps, storage } = createMockDeps();

    const distId = makeId("dist-1");
    const recId = makeRecId("rec-1");
    const sagaId = makeSagaId("saga-1");

    const recipient = DistributionRecipientAggregate.create(
      recId, distId, "inv-1", 500n, "USDT", makeEligibilityProof(),
    );
    recipient.markEventsAsCommitted();
    recipient.fail(distId, "inv-1", 500n, "USDT", "timeout", "ERR_TIMEOUT");
    recipient.markEventsAsCommitted();
    storage.recipients.set(String(recId), recipient);

    const saga = DistributionSaga.start(sagaId, distId, [String(recId)]);
    saga.nextBatch(10);
    saga.markEventsAsCommitted();
    storage.sagas.set(String(sagaId), saga);

    const handler = new RecoverRecipientPaymentHandler(deps);
    const payload: RecoverRecipientPaymentPayload = {
      distributionId: distId,
      recipientId: recId,
      amount: 500n,
      currency: "USDT",
      settlementRef: "settle-retry-1",
      strategy: RecoveryStrategy.ReAttempt,
    };

    await handler.handle(
      makeCommand("treasury.distribution.recover_recipient_payment", payload),
    );

    const saved = storage.recipients.get(String(recId))!;
    expect(saved.status).toBe(RecipientStatus.Recovered);
  });
});

// ─── CreateScheduleHandler ──────────────────────────────────────────────

describe("CreateScheduleHandler", () => {
  it("creates a schedule", async () => {
    const { deps, storage } = createMockDeps();

    const handler = new CreateScheduleHandler(deps);
    const payload: CreateSchedulePayload = {
      distributionType: DistributionType.Dividend,
      propertyId: "prop-1",
      periodStart: 1000,
      periodEnd: 2000,
      totalAmount: 5000n,
      perUnitAmount: 10n,
      currency: "USDT",
    };

    const result = await handler.handle(
      makeCommand("treasury.distribution.create_schedule", payload),
    );

    expect(result.scheduleId).toBeDefined();
    expect(storage.schedules.size).toBe(1);

    const saved = storage.schedules.get(result.scheduleId)!;
    expect(saved.status).toBe(ScheduleStatus.Draft);
  });
});

// ─── ActivateScheduleHandler ────────────────────────────────────────────

describe("ActivateScheduleHandler", () => {
  it("activates a schedule", async () => {
    const { deps, storage } = createMockDeps();

    const schedId = makeSchedId("sched-1");
    const sched = DistributionScheduleAggregate.create(schedId, {
      distributionType: DistributionType.Dividend,
      propertyId: "prop-1",
      periodStart: 1000,
      periodEnd: 2000,
      totalAmount: 5000n,
      perUnitAmount: 10n,
      currency: "USDT",
    });
    sched.markEventsAsCommitted();
    storage.schedules.set(String(schedId), sched);

    const handler = new ActivateScheduleHandler(deps);
    const payload: ActivateSchedulePayload = {
      scheduleId: schedId,
      activatedBy: "actor-1",
    };

    await handler.handle(makeCommand("treasury.distribution.activate_schedule", payload));

    const saved = storage.schedules.get(String(schedId))!;
    expect(saved.status).toBe(ScheduleStatus.Executing);
  });
});

// ─── CloseScheduleHandler ───────────────────────────────────────────────

describe("CloseScheduleHandler", () => {
  it("closes a schedule", async () => {
    const { deps, storage } = createMockDeps();

    const schedId = makeSchedId("sched-1");
    const sched = DistributionScheduleAggregate.create(schedId, {
      distributionType: DistributionType.Dividend,
      propertyId: "prop-1",
      periodStart: 1000,
      periodEnd: 2000,
      totalAmount: 5000n,
      perUnitAmount: 10n,
      currency: "USDT",
    });
    sched.markEventsAsCommitted();
    sched.activate({ activatedBy: "actor-1" });
    sched.markEventsAsCommitted();
    storage.schedules.set(String(schedId), sched);

    const handler = new CloseScheduleHandler(deps);
    const payload: CloseSchedulePayload = {
      scheduleId: schedId,
      closedBy: "actor-1",
      reason: "completed",
    };

    await handler.handle(makeCommand("treasury.distribution.close_schedule", payload));

    const saved = storage.schedules.get(String(schedId))!;
    expect(saved.status).toBe(ScheduleStatus.Completed);
  });
});

// ─── Idempotency ────────────────────────────────────────────────────────

describe("Idempotency behavior across handlers", () => {
  it("skips processing when idempotency key matches across different handlers", async () => {
    const { deps, storage } = createMockDeps();

    const idempotencyKey = "idem-create-dist";
    storage.idempotency.set(idempotencyKey, {
      responsePayload: { distributionId: "cached-dist-1" },
      responseStatus: "success",
    });

    const handler = new CreateDistributionHandler(deps);
    const payload: CreateDistributionPayload = {
      distributionType: DistributionType.Dividend,
      sourceAccountId: "acc-1",
      totalAmount: 1000n,
      currency: "USDT",
      allocationMethod: AllocationMethod.ProRata,
    };

    const result = await handler.handle(
      makeCommand("treasury.distribution.create", payload, idempotencyKey),
    );

    expect(result.distributionId).toBe("cached-dist-1");
    expect(storage.distributions.size).toBe(0);
    expect(storage.outbox.length).toBe(0);
  });
});

// ─── Event Publication ──────────────────────────────────────────────────

describe("Event publication through outbox", () => {
  it("publishes events for each command", async () => {
    const { deps, storage } = createMockDeps();

    const id = makeId("dist-1");
    const agg = DistributionAggregate.create(id, {
      distributionType: DistributionType.Dividend,
      sourceAccountId: "acc-1",
      totalAmount: 1000n,
      currency: "USDT",
      allocationMethod: AllocationMethod.ProRata,
    });
    agg.markEventsAsCommitted();
    storage.distributions.set(String(id), agg);

    const handler = new ApproveDistributionHandler(deps);
    const payload: ApproveDistributionPayload = {
      distributionId: id,
      approvals: [],
      approvalEpoch: 1,
      reservationJournalId: "journal-1",
    };

    await handler.handle(makeCommand("treasury.distribution.approve", payload));

    const published = storage.outbox;
    expect(published.length).toBeGreaterThan(0);
    expect(published.some((e) => e.eventType === "treasury.distribution.approved")).toBe(true);
  });
});

// ─── Factory ────────────────────────────────────────────────────────────

describe("createDistributionCommandHandlers", () => {
  it("creates all command handlers", () => {
    const { deps } = createMockDeps();
    const handlers = createDistributionCommandHandlers(deps);

    expect(handlers.length).toBe(14);
    expect(handlers.map((h) => h.commandType)).toContain("treasury.distribution.create");
    expect(handlers.map((h) => h.commandType)).toContain("treasury.distribution.approve");
    expect(handlers.map((h) => h.commandType)).toContain("treasury.distribution.cancel");
    expect(handlers.map((h) => h.commandType)).toContain("treasury.distribution.execute");
    expect(handlers.map((h) => h.commandType)).toContain("treasury.distribution.complete");
    expect(handlers.map((h) => h.commandType)).toContain("treasury.distribution.fail");
    expect(handlers.map((h) => h.commandType)).toContain("treasury.distribution.reconcile");
    expect(handlers.map((h) => h.commandType)).toContain("treasury.distribution.create_schedule");
    expect(handlers.map((h) => h.commandType)).toContain("treasury.distribution.activate_schedule");
    expect(handlers.map((h) => h.commandType)).toContain("treasury.distribution.close_schedule");
  });
});
