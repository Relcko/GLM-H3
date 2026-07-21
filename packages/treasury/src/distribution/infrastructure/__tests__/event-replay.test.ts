import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventStore } from "@relcko/test-utils";
import { createEnvelope } from "@relcko/events";
import { reconstructDomainEvents } from "../event-store/domain-event-reconstructor";
import { BigIntJsonSerializer } from "../services/bigint-serializer";
import type { CorrelationId } from "@relcko/types";

const corrId = "corr-replay" as unknown as CorrelationId;

describe("Domain event reconstruction", () => {
  let eventStore: InMemoryEventStore;

  beforeEach(() => {
    eventStore = new InMemoryEventStore(new BigIntJsonSerializer());
  });

  it("round-trips domain events through store and reconstruction", async () => {
    const env = createEnvelope(
      "distribution", "dist-1",
      "treasury.distribution.created",
      { distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata" },
      corrId,
      { producer: "test" },
    );
    const env2 = createEnvelope(
      "distribution", "dist-1",
      "treasury.distribution.approved",
      { approvals: [] },
      corrId,
      { producer: "test" },
    );

    const streamId = "distribution-dist-1" as never;
    await eventStore.append(streamId, [env], { expectedVersion: 0 });
    await eventStore.append(streamId, [env2], { expectedVersion: 1 });

    const stream = await eventStore.load(streamId);
    expect(stream.version).toBe(2);

    const domainEvents = reconstructDomainEvents(stream.events);
    expect(domainEvents).toHaveLength(2);
    expect(domainEvents[0]!.eventType).toBe("treasury.distribution.created");
    expect(domainEvents[0]!.aggregateVersion).toBe(1);
    expect(domainEvents[1]!.eventType).toBe("treasury.distribution.approved");
    expect(domainEvents[1]!.aggregateVersion).toBe(2);
  });

  it("reconstructs events with sequential versions", async () => {
    const envelopes = [1, 2, 3].map((v) =>
      createEnvelope(
        "distribution", "dist-seq",
        "treasury.distribution.created",
        { version: v },
        corrId,
        { producer: "test" },
      ),
    );

    const streamId = "distribution-dist-seq" as never;
    await eventStore.append(streamId, envelopes, { expectedVersion: 0 });

    const stream = await eventStore.load(streamId);
    const events = reconstructDomainEvents(stream.events);
    expect(events.map((e) => e.aggregateVersion)).toEqual([1, 2, 3]);
  });
});
