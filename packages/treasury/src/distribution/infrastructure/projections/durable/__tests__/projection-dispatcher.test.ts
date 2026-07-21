import { describe, it, expect, beforeEach, vi } from "vitest";
import { InMemoryEventStore } from "@relcko/test-utils";
import { createEnvelope } from "@relcko/events";
import type { EventEnvelope } from "@relcko/events";
import type { Projection } from "@relcko/projections";
import { BigIntJsonSerializer } from "../../../services/bigint-serializer";
import { DurableProjectionDispatcher } from "../projection-dispatcher";
import { InMemoryProjectionCheckpointStore } from "../projection-checkpoint-store";
import { DistributionProjection } from "../../distribution.projection";
import { RecipientProjection } from "../../recipient.projection";

function makeEnvelope(eventType: string, aggregateId: string, payload: unknown, extra?: Partial<EventEnvelope["metadata"]>): EventEnvelope {
  return createEnvelope(
    eventType.startsWith("treasury.recipient") ? "recipient" : "distribution",
    aggregateId,
    eventType,
    payload,
    "corr-test" as never,
    { producer: "test" },
  );
}

describe("DurableProjectionDispatcher", () => {
  let eventStore: InMemoryEventStore;
  let checkpointStore: InMemoryProjectionCheckpointStore;
  let deserializer: BigIntJsonSerializer;
  let dispatcher: DurableProjectionDispatcher;
  let projection: DistributionProjection;

  beforeEach(() => {
    eventStore = new InMemoryEventStore(new BigIntJsonSerializer());
    checkpointStore = new InMemoryProjectionCheckpointStore();
    deserializer = new BigIntJsonSerializer();
    dispatcher = new DurableProjectionDispatcher(eventStore, checkpointStore, deserializer, { maxRetries: 2, baseDelayMs: 10 });
    projection = new DistributionProjection();
    dispatcher.register(projection);
  });

  it("registers a projection", () => {
    expect(dispatcher.getProjection("distribution_projection")).toBeDefined();
    expect(dispatcher.getProjection("nonexistent")).toBeUndefined();
  });

  it("dispatchSingle processes a matching event", async () => {
    const env = makeEnvelope("treasury.distribution.created", "dist-1", {
      distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
    });
    const result = await dispatcher.dispatchSingle("distribution_projection", env);
    expect(result.processed).toBe(true);
    expect(result.error).toBeNull();

    const row = projection.findById("dist-1" as never);
    expect(row).not.toBeNull();
  });

  it("dispatchSingle returns error for missing projection", async () => {
    const env = makeEnvelope("treasury.distribution.created", "dist-1", { distributionType: "dividend" });
    const result = await dispatcher.dispatchSingle("missing_proj", env);
    expect(result.processed).toBe(false);
    expect(result.error).toContain("not registered");
  });

  it("dispatchSingle skips non-matching event type", async () => {
    const env = makeEnvelope("unrelated.event", "agg-1", {});
    const result = await dispatcher.dispatchSingle("distribution_projection", env);
    expect(result.processed).toBe(false);
    expect(result.error).toBeNull();
  });

  it("dispatchSingle rejects duplicate event", async () => {
    const env = makeEnvelope("treasury.distribution.created", "dist-dup", {
      distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
    });
    await dispatcher.dispatchSingle("distribution_projection", env);
    const result = await dispatcher.dispatchSingle("distribution_projection", env);
    expect(result.processed).toBe(false);
    expect(result.error).toContain("Duplicate event");
  });

  it("dispatchBatch processes events in order", async () => {
    const envelopes = [
      makeEnvelope("treasury.distribution.created", "dist-1", {
        distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
      }),
      makeEnvelope("treasury.distribution.approved", "dist-1", { approvals: [] }),
    ];

    const result = await dispatcher.dispatchBatch("distribution_projection", envelopes);
    expect(result.processed).toBe(2);
    expect(result.skipped).toBe(0);

    const row = projection.findById("dist-1" as never);
    expect(row!.status).toBe("approved");
  });

  it("dispatcher retries on failure (declining projection)", async () => {
    let callCount = 0;
    const failOnceProjection: Projection = {
      name: "fail_once",
      handledEventTypes: ["test.event"],
      handle: vi.fn(async () => {
        callCount += 1;
        if (callCount === 1) throw new Error("First attempt failed");
      }),
      reset: vi.fn(),
    };
    dispatcher.register(failOnceProjection);

    const env = createEnvelope("test", "agg-1", "test.event", {}, "corr" as never, { producer: "test" });
    const result = await dispatcher.dispatchSingle("fail_once", env);
    expect(result.processed).toBe(true);
    expect(result.error).toBeNull();
    expect(callCount).toBe(2);
  });

  it("dispatcher gives up after exhausting retries", async () => {
    const alwaysFailProjection: Projection = {
      name: "always_fail",
      handledEventTypes: ["test.event"],
      handle: vi.fn(async () => { throw new Error("Always fails"); }),
      reset: vi.fn(),
    };
    dispatcher.register(alwaysFailProjection);

    const env = createEnvelope("test", "agg-1", "test.event", {}, "corr" as never, { producer: "test" });
    const result = await dispatcher.dispatchSingle("always_fail", env);
    expect(result.processed).toBe(false);
    expect(result.error).toContain("Failed after 2 retries");
  });

  it("catchUp processes events from event store", async () => {
    const env = makeEnvelope("treasury.distribution.created", "dist-cu", {
      distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
    });
    await eventStore.append("distribution-dist-cu" as never, [env], { expectedVersion: 0 });

    const result = await dispatcher.catchUp("distribution_projection");
    expect(result.processed).toBeGreaterThanOrEqual(1);

    const row = projection.findById("dist-cu" as never);
    expect(row).not.toBeNull();
    expect(row!.status).toBe("draft");
  });

  it("replay resets and reprocesses events", async () => {
    const env = makeEnvelope("treasury.distribution.created", "dist-rp", {
      distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
    });
    await eventStore.append("distribution-dist-rp" as never, [env], { expectedVersion: 0 });

    await dispatcher.catchUp("distribution_projection");
    expect(projection.findMany()).toHaveLength(1);

    await dispatcher.replay("distribution_projection");
    expect(projection.findMany()).toHaveLength(1);
  });

  it("catchUpAll processes all registered projections", async () => {
    const recipientProj = new RecipientProjection();
    dispatcher.register(recipientProj);

    const env = makeEnvelope("treasury.distribution.created", "dist-all", {
      distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
    });
    await eventStore.append("distribution-dist-all" as never, [env], { expectedVersion: 0 });

    const results = await dispatcher.catchUpAll();
    expect(Object.keys(results).length).toBeGreaterThanOrEqual(2);
    expect(results["distribution_projection"]).toBeDefined();
  });
});
