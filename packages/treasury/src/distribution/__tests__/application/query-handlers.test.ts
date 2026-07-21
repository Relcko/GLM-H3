import { describe, it, expect, beforeEach } from "vitest";
import type { Query } from "@relcko/application";

import {
  DistributionStatus,
  DistributionType,
  ScheduleStatus,
  RecipientStatus,
  AllocationMethod,
} from "../../domain/value-objects";
import type { DistributionId, RecipientId, ScheduleId, SagaId } from "../../domain/value-objects";
import type { FinalTotals } from "../../domain/value-objects";

import {
  GetDistributionHandler,
  ListDistributionsHandler,
  GetDistributionProgressHandler,
  GetSagaStateHandler,
  GetRecipientHandler,
  ListRecipientsByDistributionHandler,
  ListRecipientsByInvestorHandler,
  GetScheduleHandler,
  ListSchedulesByPropertyHandler,
  ListSchedulesByStatusHandler,
  ListAllSchedulesHandler,
  createDistributionQueryHandlers,
  type DistributionQueryDeps,
  type GetDistributionPayload,
  type ListDistributionsPayload,
  type GetDistributionProgressPayload,
  type GetSagaStatePayload,
  type GetRecipientPayload,
  type ListRecipientsByDistributionPayload,
  type ListRecipientsByInvestorPayload,
  type GetSchedulePayload,
  type ListSchedulesByPropertyPayload,
  type ListSchedulesByStatusPayload,
} from "../../application/query-handlers";

import type {
  DistributionReadModel,
  DistributionProgressReadModel,
  SagaStateReadModel,
  RecipientReadModel,
  ScheduleReadModel,
} from "../../application/repositories";

function makeId(id = "dist-1"): DistributionId { return id as unknown as DistributionId; }
function makeRecId(id = "rec-1"): RecipientId { return id as unknown as RecipientId; }
function makeSchedId(id = "sched-1"): ScheduleId { return id as unknown as ScheduleId; }
function makeSagaId(id = "saga-1"): SagaId { return id as unknown as SagaId; }

function makeQuery<T>(type: string, payload: T): Query<T> {
  return {
    type,
    payload,
    metadata: {
      messageId: `msg-${Date.now()}`,
      correlationId: "corr-1" as never,
      timestamp: Date.now(),
    },
  } as Query<T>;
}

function makeDistributionReadModel(
  id: DistributionId = makeId(),
  status: DistributionStatus = DistributionStatus.Draft,
): DistributionReadModel {
  return {
    id,
    distributionType: DistributionType.Dividend,
    status,
    sourceAccountId: "acc-1",
    totalAmount: 1000n,
    currency: "USDT",
    perUnitAmount: null,
    recipientCount: 0,
    materializationManifestHash: null,
    sagaId: null,
    finalTotals: null,
    scheduleId: null,
    snapshotId: null,
    allocationMethod: AllocationMethod.ProRata,
    proposalRef: null,
    createdAt: 1000,
    updatedAt: 1000,
  };
}

function makeRecipientReadModel(
  id: RecipientId = makeRecId(),
  status: RecipientStatus = RecipientStatus.Pending,
): RecipientReadModel {
  return {
    id,
    distributionId: makeId(),
    investorId: "inv-1",
    eligibleAmount: 500n,
    currency: "USDT",
    status,
    paidAmount: 0n,
    settlementRef: null,
    txHash: null,
    failureReason: null,
    recoveryAttempts: 0,
  };
}

function makeScheduleReadModel(
  id: ScheduleId = makeSchedId(),
  status: ScheduleStatus = ScheduleStatus.Draft,
): ScheduleReadModel {
  return {
    id,
    distributionType: DistributionType.Dividend,
    propertyId: "prop-1",
    periodStart: 1000,
    periodEnd: 2000,
    totalAmount: 5000n,
    perUnitAmount: 10n,
    currency: "USDT",
    status,
    distributionIds: [],
    createdAt: 1000,
    updatedAt: 1000,
  };
}

function makeSagaStateReadModel(
  sagaId: SagaId = makeSagaId(),
): SagaStateReadModel {
  return {
    sagaId,
    distributionId: makeId(),
    state: "running" as never,
    pendingRecipients: ["rec-1", "rec-2"],
    inFlightRecipients: [],
    paidCount: 0,
    failedCount: 0,
    recoveredCount: 0,
    checkpointAt: 0,
    recoveryPolicyId: null,
    startedAt: 1000,
    updatedAt: 1000,
    version: 1,
  };
}

// ─── Mock Query Repositories ────────────────────────────────────────────

function createMockQueryDeps(seedData?: {
  distributions?: DistributionReadModel[];
  recipients?: RecipientReadModel[];
  schedules?: ScheduleReadModel[];
  sagaStates?: SagaStateReadModel[];
}): DistributionQueryDeps {
  const distributions = new Map<string, DistributionReadModel>();
  const recipients = new Map<string, RecipientReadModel>();
  const schedules = new Map<string, ScheduleReadModel>();
  const sagaStates = new Map<string, SagaStateReadModel>();

  if (seedData) {
    for (const d of seedData.distributions ?? []) {
      distributions.set(String(d.id), d);
    }
    for (const r of seedData.recipients ?? []) {
      recipients.set(String(r.id), r);
    }
    for (const s of seedData.schedules ?? []) {
      schedules.set(String(s.id), s);
    }
    for (const s of seedData.sagaStates ?? []) {
      sagaStates.set(String(s.sagaId), s);
    }
  }

  return {
    distributionQueryRepo: {
      findById: async (id: DistributionId) => distributions.get(String(id)) ?? null,
      findMany: async (criteria) => {
        let results = Array.from(distributions.values());
        if (criteria?.status) {
          results = results.filter((d) => d.status === criteria.status);
        }
        if (criteria?.distributionType) {
          results = results.filter((d) => d.distributionType === criteria.distributionType);
        }
        return results;
      },
    },
    recipientQueryRepo: {
      findById: async (id: RecipientId) => recipients.get(String(id)) ?? null,
      findByDistributionId: async (distId: DistributionId) =>
        Array.from(recipients.values()).filter(
          (r) => String(r.distributionId) === String(distId),
        ),
      findByInvestorId: async (investorId: string) =>
        Array.from(recipients.values()).filter((r) => r.investorId === investorId),
    },
    sagaQueryRepo: {
      findBySagaId: async (id: SagaId) => sagaStates.get(String(id)) ?? null,
      findByDistributionId: async (distId: DistributionId) =>
        Array.from(sagaStates.values()).find(
          (s) => String(s.distributionId) === String(distId),
        ) ?? null,
    },
    scheduleQueryRepo: {
      findById: async (id: ScheduleId) => schedules.get(String(id)) ?? null,
      findByPropertyId: async (propertyId: string) =>
        Array.from(schedules.values()).filter((s) => s.propertyId === propertyId),
      findByStatus: async (status: ScheduleStatus) =>
        Array.from(schedules.values()).filter((s) => s.status === status),
      findMany: async () => Array.from(schedules.values()),
    },
  };
}

// ─── GetDistributionHandler ─────────────────────────────────────────────

describe("GetDistributionHandler", () => {
  it("returns a distribution by ID", async () => {
    const dist = makeDistributionReadModel(makeId("dist-1"), DistributionStatus.Approved);
    const deps = createMockQueryDeps({ distributions: [dist] });

    const handler = new GetDistributionHandler(deps);
    const payload: GetDistributionPayload = { distributionId: makeId("dist-1") };

    const result = await handler.handle(makeQuery("treasury.distribution.get_distribution", payload));

    expect(result).not.toBeNull();
    expect(result!.id).toBe(makeId("dist-1"));
    expect(result!.status).toBe(DistributionStatus.Approved);
  });

  it("returns null for unknown distribution", async () => {
    const deps = createMockQueryDeps();

    const handler = new GetDistributionHandler(deps);
    const payload: GetDistributionPayload = { distributionId: makeId("unknown") };

    const result = await handler.handle(makeQuery("treasury.distribution.get_distribution", payload));

    expect(result).toBeNull();
  });
});

// ─── ListDistributionsHandler ───────────────────────────────────────────

describe("ListDistributionsHandler", () => {
  it("returns all distributions", async () => {
    const dists = [
      makeDistributionReadModel(makeId("dist-1"), DistributionStatus.Draft),
      makeDistributionReadModel(makeId("dist-2"), DistributionStatus.Approved),
    ];
    const deps = createMockQueryDeps({ distributions: dists });

    const handler = new ListDistributionsHandler(deps);
    const result = await handler.handle(
      makeQuery<ListDistributionsPayload>("treasury.distribution.list_distributions", {}),
    );

    expect(result.length).toBe(2);
  });

  it("filters distributions by status", async () => {
    const dists = [
      makeDistributionReadModel(makeId("dist-1"), DistributionStatus.Draft),
      makeDistributionReadModel(makeId("dist-2"), DistributionStatus.Approved),
    ];
    const deps = createMockQueryDeps({ distributions: dists });

    const handler = new ListDistributionsHandler(deps);
    const result = await handler.handle(
      makeQuery<ListDistributionsPayload>("treasury.distribution.list_distributions", {
        criteria: { status: DistributionStatus.Draft },
      }),
    );

    expect(result.length).toBe(1);
    expect(result[0].status).toBe(DistributionStatus.Draft);
  });
});

// ─── GetDistributionProgressHandler ─────────────────────────────────────

describe("GetDistributionProgressHandler", () => {
  it("returns progress for a distribution with recipients", async () => {
    const dist = makeDistributionReadModel(makeId("dist-1"));
    const recipients = [
      makeRecipientReadModel(makeRecId("r1"), RecipientStatus.Paid),
      makeRecipientReadModel(makeRecId("r2"), RecipientStatus.Paid),
      makeRecipientReadModel(makeRecId("r3"), RecipientStatus.Failed),
      makeRecipientReadModel(makeRecId("r4"), RecipientStatus.Pending),
    ];
    const deps = createMockQueryDeps({ distributions: [dist], recipients });

    const handler = new GetDistributionProgressHandler(deps);
    const payload: GetDistributionProgressPayload = { distributionId: makeId("dist-1") };

    const result = await handler.handle(
      makeQuery("treasury.distribution.get_progress", payload),
    );

    expect(result).not.toBeNull();
    expect(result!.totalRecipients).toBe(4);
    expect(result!.paidCount).toBe(2);
    expect(result!.failedCount).toBe(1);
    expect(result!.pendingCount).toBe(1);
  });

  it("returns null for unknown distribution", async () => {
    const deps = createMockQueryDeps();

    const handler = new GetDistributionProgressHandler(deps);
    const payload: GetDistributionProgressPayload = { distributionId: makeId("unknown") };

    const result = await handler.handle(
      makeQuery("treasury.distribution.get_progress", payload),
    );

    expect(result).toBeNull();
  });
});

// ─── GetSagaStateHandler ────────────────────────────────────────────────

describe("GetSagaStateHandler", () => {
  it("returns saga state by sagaId", async () => {
    const sagaState = makeSagaStateReadModel(makeSagaId("saga-1"));
    const deps = createMockQueryDeps({ sagaStates: [sagaState] });

    const handler = new GetSagaStateHandler(deps);
    const payload: GetSagaStatePayload = { sagaId: makeSagaId("saga-1") };

    const result = await handler.handle(
      makeQuery("treasury.distribution.get_saga_state", payload),
    );

    expect(result).not.toBeNull();
    expect(result!.sagaId).toBe(makeSagaId("saga-1"));
  });

  it("returns saga state by distributionId", async () => {
    const distId = makeId("dist-1");
    const sagaState = makeSagaStateReadModel(makeSagaId("saga-1"));
    const deps = createMockQueryDeps({ sagaStates: [sagaState] });

    const handler = new GetSagaStateHandler(deps);
    const payload: GetSagaStatePayload = { distributionId: distId };

    const result = await handler.handle(
      makeQuery("treasury.distribution.get_saga_state", payload),
    );

    expect(result).not.toBeNull();
  });

  it("returns null with no criteria", async () => {
    const deps = createMockQueryDeps();

    const handler = new GetSagaStateHandler(deps);
    const payload: GetSagaStatePayload = {};

    const result = await handler.handle(
      makeQuery("treasury.distribution.get_saga_state", payload),
    );

    expect(result).toBeNull();
  });
});

// ─── Recipient Query Handlers ───────────────────────────────────────────

describe("GetRecipientHandler", () => {
  it("returns a recipient by ID", async () => {
    const rec = makeRecipientReadModel(makeRecId("rec-1"), RecipientStatus.Paid);
    const deps = createMockQueryDeps({ recipients: [rec] });

    const handler = new GetRecipientHandler(deps);
    const payload: GetRecipientPayload = { recipientId: makeRecId("rec-1") };

    const result = await handler.handle(makeQuery("treasury.distribution.get_recipient", payload));

    expect(result).not.toBeNull();
    expect(result!.status).toBe(RecipientStatus.Paid);
  });

  it("returns null for unknown recipient", async () => {
    const deps = createMockQueryDeps();

    const handler = new GetRecipientHandler(deps);
    const payload: GetRecipientPayload = { recipientId: makeRecId("unknown") };

    const result = await handler.handle(makeQuery("treasury.distribution.get_recipient", payload));

    expect(result).toBeNull();
  });
});

describe("ListRecipientsByDistributionHandler", () => {
  it("lists recipients for a distribution", async () => {
    const distId = makeId("dist-1");
    const recipients = [
      { ...makeRecipientReadModel(makeRecId("r1")), distributionId: distId },
      { ...makeRecipientReadModel(makeRecId("r2")), distributionId: distId },
    ];
    const deps = createMockQueryDeps({ recipients });

    const handler = new ListRecipientsByDistributionHandler(deps);
    const payload: ListRecipientsByDistributionPayload = { distributionId: distId };

    const result = await handler.handle(
      makeQuery("treasury.distribution.list_recipients_by_distribution", payload),
    );

    expect(result.length).toBe(2);
  });
});

describe("ListRecipientsByInvestorHandler", () => {
  it("lists recipients for an investor", async () => {
    const recipients = [
      { ...makeRecipientReadModel(makeRecId("r1")), investorId: "inv-1" },
    ];
    const deps = createMockQueryDeps({ recipients });

    const handler = new ListRecipientsByInvestorHandler(deps);
    const payload: ListRecipientsByInvestorPayload = { investorId: "inv-1" };

    const result = await handler.handle(
      makeQuery("treasury.distribution.list_recipients_by_investor", payload),
    );

    expect(result.length).toBe(1);
  });
});

// ─── Schedule Query Handlers ────────────────────────────────────────────

describe("GetScheduleHandler", () => {
  it("returns a schedule by ID", async () => {
    const sched = makeScheduleReadModel(makeSchedId("sched-1"), ScheduleStatus.Executing);
    const deps = createMockQueryDeps({ schedules: [sched] });

    const handler = new GetScheduleHandler(deps);
    const payload: GetSchedulePayload = { scheduleId: makeSchedId("sched-1") };

    const result = await handler.handle(makeQuery("treasury.distribution.get_schedule", payload));

    expect(result).not.toBeNull();
    expect(result!.status).toBe(ScheduleStatus.Executing);
  });
});

describe("ListSchedulesByPropertyHandler", () => {
  it("lists schedules by property", async () => {
    const schedules = [
      { ...makeScheduleReadModel(makeSchedId("s1")), propertyId: "prop-1" },
      { ...makeScheduleReadModel(makeSchedId("s2")), propertyId: "prop-1" },
    ];
    const deps = createMockQueryDeps({ schedules });

    const handler = new ListSchedulesByPropertyHandler(deps);
    const payload: ListSchedulesByPropertyPayload = { propertyId: "prop-1" };

    const result = await handler.handle(
      makeQuery("treasury.distribution.list_schedules_by_property", payload),
    );

    expect(result.length).toBe(2);
  });
});

describe("ListSchedulesByStatusHandler", () => {
  it("lists schedules by status", async () => {
    const schedules = [
      { ...makeScheduleReadModel(makeSchedId("s1")), status: ScheduleStatus.Draft },
      { ...makeScheduleReadModel(makeSchedId("s2")), status: ScheduleStatus.Draft },
    ];
    const deps = createMockQueryDeps({ schedules });

    const handler = new ListSchedulesByStatusHandler(deps);
    const payload: ListSchedulesByStatusPayload = { status: ScheduleStatus.Draft };

    const result = await handler.handle(
      makeQuery("treasury.distribution.list_schedules_by_status", payload),
    );

    expect(result.length).toBe(2);
  });
});

describe("ListAllSchedulesHandler", () => {
  it("lists all schedules", async () => {
    const schedules = [
      makeScheduleReadModel(makeSchedId("s1")),
      makeScheduleReadModel(makeSchedId("s2")),
    ];
    const deps = createMockQueryDeps({ schedules });

    const handler = new ListAllSchedulesHandler(deps);

    const result = await handler.handle(
      makeQuery<Record<string, never>>("treasury.distribution.list_all_schedules", {}),
    );

    expect(result.length).toBe(2);
  });
});

// ─── Factory ────────────────────────────────────────────────────────────

describe("createDistributionQueryHandlers", () => {
  it("creates all query handlers", () => {
    const deps = createMockQueryDeps();
    const handlers = createDistributionQueryHandlers(deps);

    expect(handlers.length).toBe(11);
    expect(handlers.map((h) => h.queryType)).toContain("treasury.distribution.get_distribution");
    expect(handlers.map((h) => h.queryType)).toContain("treasury.distribution.list_distributions");
    expect(handlers.map((h) => h.queryType)).toContain("treasury.distribution.get_progress");
    expect(handlers.map((h) => h.queryType)).toContain("treasury.distribution.get_saga_state");
    expect(handlers.map((h) => h.queryType)).toContain("treasury.distribution.get_recipient");
    expect(handlers.map((h) => h.queryType)).toContain("treasury.distribution.get_schedule");
    expect(handlers.map((h) => h.queryType)).toContain("treasury.distribution.list_all_schedules");
  });
});
