import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventStore } from "@relcko/test-utils";
import { InMemoryCheckpointStore } from "@relcko/projections";
import { createEnvelope } from "@relcko/events";
import { BigIntJsonSerializer } from "../services/bigint-serializer";
import type { EventEnvelope } from "@relcko/events";
import type { CorrelationId } from "@relcko/types";

import { DistributionProjection } from "../projections/distribution.projection";
import { RecipientProjection } from "../projections/recipient.projection";
import { ScheduleProjection } from "../projections/schedule.projection";
import { ProgressProjection } from "../projections/progress.projection";
import { ProjectionDispatcher } from "../projections/projection-dispatcher";
import { DistributionType, AllocationMethod } from "../../domain/value-objects";

const corrId = "corr-test" as unknown as CorrelationId;

function makeEnvelope(eventType: string, aggregateId: string, payload: unknown): EventEnvelope {
  return createEnvelope(
    eventType.startsWith("treasury.recipient") ? "recipient" : eventType.startsWith("treasury.distribution.schedule") ? "schedule" : "distribution",
    aggregateId,
    eventType,
    payload,
    corrId,
    { producer: "test" },
  );
}

describe("DistributionProjection", () => {
  let projection: DistributionProjection;

  beforeEach(() => {
    projection = new DistributionProjection();
  });

  it("tracks distribution lifecycle events", async () => {
    const id = "dist-1";

    await projection.handle(makeEnvelope(
      "treasury.distribution.created", id,
      { distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata" },
    ));

    let row = projection.findById(id as never);
    expect(row).not.toBeNull();
    expect(row!.status).toBe("draft");

    await projection.handle(makeEnvelope(
      "treasury.distribution.approved", id,
      { approvals: [] },
    ));

    row = projection.findById(id as never);
    expect(row!.status).toBe("approved");

    await projection.handle(makeEnvelope(
      "treasury.distribution.recipients_materialized", id,
      { recipientCount: 5, manifestHash: "abc" },
    ));

    row = projection.findById(id as never);
    expect(row!.status).toBe("recipients_materialized");
    expect(row!.recipientCount).toBe(5);

    await projection.handle(makeEnvelope(
      "treasury.distribution.execution_started", id,
      { sagaId: "saga-1" },
    ));

    row = projection.findById(id as never);
    expect(row!.status).toBe("executing");

    await projection.handle(makeEnvelope(
      "treasury.distribution.execution_finalized", id,
      { finalStatus: "Completed", finalTotals: { totalDistributed: 1000n, totalFailed: 0n, totalRecovered: 0n, paidCount: 1, failedCount: 0, recoveredCount: 0, writeOffAmount: 0n } },
    ));

    row = projection.findById(id as never);
    expect(row!.status).toBe("completed");
  });

  it("handles cancel event", async () => {
    const id = "dist-cancel";
    await projection.handle(makeEnvelope("treasury.distribution.created", id, { distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 100n, currency: "USDT", allocationMethod: "pro_rata" }));
    await projection.handle(makeEnvelope("treasury.distribution.cancelled", id, { reason: "test" }));
    expect(projection.findById(id as never)!.status).toBe("cancelled");
  });

  it("resets projection", async () => {
    const id = "dist-reset";
    await projection.handle(makeEnvelope("treasury.distribution.created", id, { distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 100n, currency: "USDT", allocationMethod: "pro_rata" }));
    expect(projection.findMany()).toHaveLength(1);
    await projection.reset();
    expect(projection.findMany()).toHaveLength(0);
  });
});

describe("RecipientProjection", () => {
  let projection: RecipientProjection;

  beforeEach(() => {
    projection = new RecipientProjection();
  });

  it("tracks recipient lifecycle", async () => {
    const id = "rec-1";

    await projection.handle(makeEnvelope(
      "treasury.recipient.materialized", id,
      { distributionId: "dist-1", investorId: "inv-1", eligibleAmount: 500n, currency: "USDT" },
    ));

    let row = projection.findById(id as never);
    expect(row).not.toBeNull();
    expect(row!.status).toBe("pending");

    await projection.handle(makeEnvelope(
      "treasury.recipient.paid", id,
      { amount: 500n, settlementRef: "ref-1" },
    ));

    row = projection.findById(id as never);
    expect(row!.status).toBe("paid");
    expect(row!.paidAmount).toBe(500n);
  });

  it("filters by distributionId", async () => {
    await projection.handle(makeEnvelope("treasury.recipient.materialized", "r1", { distributionId: "d-1", investorId: "i-1", eligibleAmount: 100n, currency: "USDT" }));
    await projection.handle(makeEnvelope("treasury.recipient.materialized", "r2", { distributionId: "d-1", investorId: "i-2", eligibleAmount: 200n, currency: "USDT" }));
    await projection.handle(makeEnvelope("treasury.recipient.materialized", "r3", { distributionId: "d-2", investorId: "i-3", eligibleAmount: 300n, currency: "USDT" }));

    expect(projection.findByDistributionId("d-1" as never)).toHaveLength(2);
    expect(projection.findByDistributionId("d-2" as never)).toHaveLength(1);
  });

  it("resets correctly", async () => {
    await projection.handle(makeEnvelope("treasury.recipient.materialized", "r1", { distributionId: "d-1", investorId: "i-1", eligibleAmount: 100n, currency: "USDT" }));
    expect(projection.findAll()).toHaveLength(1);
    await projection.reset();
    expect(projection.findAll()).toHaveLength(0);
  });
});

describe("ScheduleProjection", () => {
  let projection: ScheduleProjection;

  beforeEach(() => {
    projection = new ScheduleProjection();
  });

  it("tracks schedule lifecycle", async () => {
    const id = "sched-1";
    await projection.handle(makeEnvelope("treasury.distribution.schedule.created", id, {
      distributionType: "dividend", propertyId: "prop-1", periodStart: 1000, periodEnd: 2000,
      totalAmount: 5000n, perUnitAmount: 10n, currency: "USDT",
    }));
    expect(projection.findById(id as never)!.status).toBe("draft");

    await projection.handle(makeEnvelope("treasury.distribution.schedule.activated", id, { activatedBy: "admin" }));
    expect(projection.findById(id as never)!.status).toBe("executing");

    await projection.handle(makeEnvelope("treasury.distribution.schedule.closed", id, { closedBy: "admin", reason: "done" }));
    expect(projection.findById(id as never)!.status).toBe("completed");
  });
});

describe("ProgressProjection", () => {
  let projection: ProgressProjection;

  beforeEach(() => {
    projection = new ProgressProjection();
  });

  it("computes progress from recipient events", async () => {
    const distId = "dist-progress";
    const basePayload = { distributionId: distId, investorId: "inv-1", eligibleAmount: 100n, currency: "USDT" };

    await projection.handle(makeEnvelope("treasury.recipient.materialized", "r1", basePayload));
    await projection.handle(makeEnvelope("treasury.recipient.materialized", "r2", basePayload));
    await projection.handle(makeEnvelope("treasury.recipient.materialized", "r3", basePayload));

    let progress = projection.findByDistributionId(distId as never);
    expect(progress).not.toBeNull();
    expect(progress!.totalRecipients).toBe(3);
    expect(progress!.paidCount).toBe(0);

    await projection.handle(makeEnvelope("treasury.recipient.paid", "r1", { distributionId: distId, amount: 100n, settlementRef: "ref-1" }));
    await projection.handle(makeEnvelope("treasury.recipient.paid", "r2", { distributionId: distId, amount: 100n, settlementRef: "ref-2" }));

    progress = projection.findByDistributionId(distId as never);
    expect(progress!.paidCount).toBe(2);
    expect(progress!.percentage).toBeCloseTo(66.67, 1);
  });
});

describe("ProjectionDispatcher", () => {
  let eventStore: InMemoryEventStore;
  let checkpointStore: InMemoryCheckpointStore;
  let dispatcher: ProjectionDispatcher;
  let distributionProjection: DistributionProjection;

  beforeEach(() => {
    eventStore = new InMemoryEventStore(new BigIntJsonSerializer());
    checkpointStore = new InMemoryCheckpointStore();
    const deserializer = new BigIntJsonSerializer();
    dispatcher = new ProjectionDispatcher(eventStore, checkpointStore, deserializer);
    distributionProjection = new DistributionProjection();
    dispatcher.register(distributionProjection);
  });

  it("dispatches events to registered projections", async () => {
    const env = makeEnvelope("treasury.distribution.created", "dist-dispatch", {
      distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
    });
    await eventStore.append("distribution-dist-dispatch" as never, [env], { expectedVersion: 0 });

    const result = await dispatcher.catchUp("distribution_projection");
    expect(result.processed).toBeGreaterThanOrEqual(1);

    const row = distributionProjection.findById("dist-dispatch" as never);
    expect(row).not.toBeNull();
    expect(row!.status).toBe("draft");
  });

  it("replays projections from scratch", async () => {
    const env = makeEnvelope("treasury.distribution.created", "dist-replay", {
      distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
    });
    await eventStore.append("distribution-dist-replay" as never, [env], { expectedVersion: 0 });

    await dispatcher.catchUp("distribution_projection");
    expect(distributionProjection.findMany()).toHaveLength(1);

    await dispatcher.replay("distribution_projection");
    expect(distributionProjection.findMany()).toHaveLength(1);
  });
});
