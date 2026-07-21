import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventStore } from "@relcko/test-utils";
import { createEnvelope } from "@relcko/events";
import { BigIntJsonSerializer } from "../services/bigint-serializer";

import { DistributionProjection } from "../projections/distribution.projection";
import { RecipientProjection } from "../projections/recipient.projection";
import { ScheduleProjection } from "../projections/schedule.projection";
import { ProgressProjection } from "../projections/progress.projection";
import { ProjectionDispatcher } from "../projections/projection-dispatcher";
import { InMemoryCheckpointStore } from "@relcko/projections";

describe("Read model consistency", () => {
  let eventStore: InMemoryEventStore;
  let checkpointStore: InMemoryCheckpointStore;
  let dispatcher: ProjectionDispatcher;
  let distributionProjection: DistributionProjection;
  let recipientProjection: RecipientProjection;
  let scheduleProjection: ScheduleProjection;
  let progressProjection: ProgressProjection;
  const corrId = "corr-rm" as never;

  beforeEach(() => {
    eventStore = new InMemoryEventStore(new BigIntJsonSerializer());
    checkpointStore = new InMemoryCheckpointStore();
    const deserializer = new BigIntJsonSerializer();
    dispatcher = new ProjectionDispatcher(eventStore, checkpointStore, deserializer);

    distributionProjection = new DistributionProjection();
    recipientProjection = new RecipientProjection();
    scheduleProjection = new ScheduleProjection();
    progressProjection = new ProgressProjection();

    dispatcher.register(distributionProjection);
    dispatcher.register(recipientProjection);
    dispatcher.register(scheduleProjection);
    dispatcher.register(progressProjection);
  });

  it("distribution projection is consistent after replay", async () => {
    const e1 = createEnvelope("distribution", "dist-c", "treasury.distribution.created", {
      distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
    }, corrId, { producer: "test" });
    const e2 = createEnvelope("distribution", "dist-c", "treasury.distribution.approved", { approvals: [] }, corrId, { producer: "test" });

    await eventStore.append("distribution-dist-c" as never, [e1, e2], { expectedVersion: 0 });

    await dispatcher.catchUpAll();

    const row = distributionProjection.findById("dist-c" as never);
    expect(row).not.toBeNull();
    expect(row!.status).toBe("approved");
  });

  it("recipient counts match across projections", async () => {
    const distId = "dist-mat";
    const e1 = createEnvelope("distribution", distId, "treasury.distribution.created", {
      distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 300n, currency: "USDT", allocationMethod: "pro_rata",
    }, corrId, { producer: "test" });

    await eventStore.append(`distribution-${distId}` as never, [e1], { expectedVersion: 0 });

    const r1 = createEnvelope("recipient", "r-a", "treasury.recipient.materialized", {
      distributionId: distId, investorId: "i-1", eligibleAmount: 100n, currency: "USDT",
    }, corrId, { producer: "test" });
    const r2 = createEnvelope("recipient", "r-b", "treasury.recipient.materialized", {
      distributionId: distId, investorId: "i-2", eligibleAmount: 200n, currency: "USDT",
    }, corrId, { producer: "test" });

    await eventStore.append("recipient-r-a" as never, [r1], { expectedVersion: 0 });
    await eventStore.append("recipient-r-b" as never, [r2], { expectedVersion: 0 });

    const e2 = createEnvelope("distribution", distId, "treasury.distribution.recipients_materialized", {
      recipientCount: 2, manifestHash: "hash-1", snapshotId: "snap-1", totalEligibleAmount: 300n, materializedAt: Date.now(),
    }, corrId, { producer: "test" });
    await eventStore.append(`distribution-${distId}` as never, [e2], { expectedVersion: 1 });

    await dispatcher.catchUpAll();

    const distRow = distributionProjection.findById(distId as never);
    expect(distRow!.recipientCount).toBe(2);

    const rcpts = recipientProjection.findByDistributionId(distId as never);
    expect(rcpts).toHaveLength(2);

    const progress = progressProjection.findByDistributionId(distId as never);
    expect(progress!.totalRecipients).toBe(2);
    expect(progress!.paidCount).toBe(0);
  });

  it("progress projection matches recipient states", async () => {
    const distId = "dist-prog";
    const basePayload = { distributionId: distId, investorId: "i-1", eligibleAmount: 100n, currency: "USDT" };

    const r1 = createEnvelope("recipient", "r-p1", "treasury.recipient.materialized", basePayload, corrId, { producer: "test" });
    const r2 = createEnvelope("recipient", "r-p2", "treasury.recipient.materialized", basePayload, corrId, { producer: "test" });
    const r3 = createEnvelope("recipient", "r-p3", "treasury.recipient.materialized", basePayload, corrId, { producer: "test" });

    await eventStore.append("recipient-r-p1" as never, [r1], { expectedVersion: 0 });
    await eventStore.append("recipient-r-p2" as never, [r2], { expectedVersion: 0 });
    await eventStore.append("recipient-r-p3" as never, [r3], { expectedVersion: 0 });

    const paid1 = createEnvelope("recipient", "r-p1", "treasury.recipient.paid", { distributionId: distId, amount: 100n, settlementRef: "sr1" }, corrId, { producer: "test" });
    const paid2 = createEnvelope("recipient", "r-p2", "treasury.recipient.paid", { distributionId: distId, amount: 100n, settlementRef: "sr2" }, corrId, { producer: "test" });
    await eventStore.append("recipient-r-p1" as never, [paid1], { expectedVersion: 1 });
    await eventStore.append("recipient-r-p2" as never, [paid2], { expectedVersion: 1 });

    await dispatcher.catchUpAll();

    const rcptRows = recipientProjection.findByDistributionId(distId as never);
    const paidRows = rcptRows.filter((r) => r.status === "paid");
    expect(paidRows).toHaveLength(2);

    const progress = progressProjection.findByDistributionId(distId as never);
    expect(progress!.paidCount).toBe(2);
    expect(progress!.totalRecipients).toBe(3);
  });
});
