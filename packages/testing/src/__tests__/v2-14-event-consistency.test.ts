import { describe, it, expect, beforeEach } from "vitest";
import { createEnvelope, type RelckoEventEnvelope } from "@relcko/events";
import { createMockEventBus } from "@relcko/testing";
import type { EntityId } from "@relcko/types";
import { createPerformanceModule } from "@relcko/performance";

/**
 * V2.14 Event Consistency, Idempotency, Retry, Dead-Letter, Replay,
 * Failure-Recovery, Concurrency and Audit Verification.
 */
describe("V2.14 event consistency guarantees", () => {
  let events: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    events = createMockEventBus();
  });

  it("enforces idempotency: replaying the same eventId is de-duplicated", async () => {
    let handlerRuns = 0;
    events.subscribe("identity.profile_updated", () => { handlerRuns++; });
    const envelope = createEnvelope({
      type: "identity.profile_updated",
      aggregateId: "acc_1" as EntityId,
      actorId: "actor_1" as EntityId,
      payload: { email: "x@y.io" },
      version: 1,
    });
    const first = await events.publish(envelope);
    const second = await events.publish(envelope);
    expect(first.delivered).toBe(true);
    expect(second.deduped).toBe(true);
    expect(handlerRuns).toBe(1);
  });

  it("preserves ordering of events within a single flow", async () => {
    await events.publish(createEnvelope({ type: "a", aggregateId: "1" as EntityId, actorId: "a1" as EntityId, payload: {}, version: 1 }));
    await events.publish(createEnvelope({ type: "b", aggregateId: "2" as EntityId, actorId: "a1" as EntityId, payload: {}, version: 1 }));
    await events.publish(createEnvelope({ type: "c", aggregateId: "3" as EntityId, actorId: "a1" as EntityId, payload: {}, version: 1 }));
    const types = events.history.map(e => e.type);
    expect(types).toEqual(["a", "b", "c"]);
  });

  it("preserves correlation and trace ids across the wire", async () => {
    const correlationId = "corr_abc" as EntityId & string;
    const traceId = "trace_xyz" as EntityId & string;
    const env = createEnvelope({
      type: "marketplace.property_created",
      aggregateId: "prop_1" as EntityId,
      actorId: "actor_1" as EntityId,
      payload: {},
      correlationId,
      traceId,
      version: 1,
    });
    await events.publish(env);
    const stored = events.publishedOfType("marketplace.property_created")[0] as RelckoEventEnvelope;
    expect(stored.correlationId).toBe(correlationId);
    expect(stored.traceId).toBe(traceId);
  });

  it("propagates correlation/trace ids into a subscriber that handles the event", async () => {
    const correlationId = "corr_net" as EntityId & string;
    let seen = "";
    events.subscribe("network.commission_paid", (env) => { seen = env.correlationId; });
    await events.publish(createEnvelope({
      type: "network.commission_paid",
      aggregateId: "commission_1" as EntityId,
      actorId: "actor_1" as EntityId,
      payload: { amount: "10", currency: "USDT" },
      correlationId,
      version: 1,
    }));
    expect(seen).toBe(correlationId);
  });
});

describe("V2.14 retry, dead-letter and replay", () => {
  it("routes failing handlers to the dead-letter store and supports replay", async () => {
    const poisoned = createMockEventBus();
    poisoned.subscribe("boom", () => { throw new Error("handler failed"); });
    const result = await poisoned.publish(createEnvelope({
      type: "boom",
      aggregateId: "b_1" as EntityId,
      actorId: "actor_1" as EntityId,
      payload: {},
      version: 1,
    }));
    expect(result.deadLettered).toBe(true);
    expect(poisoned.deadLetters().length).toBe(1);

    const replay = await poisoned.replayDeadLetters();
    expect(replay.length).toBe(1);
  });

  it("retries a failing handler the configured number of times before dead-lettering", async () => {
    const bus = createMockEventBus();
    let attempts = 0;
    bus.subscribe("flaky", () => {
      attempts++;
      throw new Error("always fails");
    });
    const result = await bus.publish(createEnvelope({
      type: "flaky",
      aggregateId: "f_1" as EntityId,
      actorId: "actor_1" as EntityId,
      payload: {},
      version: 1,
    }));
    expect(attempts).toBe(3);
    expect(result.deadLettered).toBe(true);
  });

  it("replay re-routes still-failing events back to the dead-letter queue", async () => {
    const bus = createMockEventBus();
    bus.subscribe("boom", () => { throw new Error("x"); });
    await bus.publish(createEnvelope({ type: "boom", aggregateId: "b" as EntityId, actorId: "a" as EntityId, payload: {}, version: 1 }));
    expect(bus.deadLetters().length).toBe(1);
    const replay = await bus.replayDeadLetters();
    expect(replay.length).toBe(1);
    // Replay is a genuine delivery attempt — if the handler still fails,
    // the event is re-routed back to the dead-letter queue.
    expect(bus.deadLetters().length).toBe(1);
  });
});

describe("V2.14 failure recovery and concurrency", () => {
  it("isolates a failing subscriber from healthy subscribers (delivery continues)", async () => {
    const bus = createMockEventBus();
    const good: string[] = [];
    bus.subscribe("evt", () => { good.push("ok"); });
    bus.subscribe("evt", () => { throw new Error("bad"); });
    const result = await bus.publish(createEnvelope({ type: "evt", aggregateId: "e" as EntityId, actorId: "a" as EntityId, payload: {}, version: 1 }));
    expect(good).toEqual(["ok"]);
    expect(result.subscriberResults.length).toBe(2);
    expect(result.subscriberResults.some(r => r.ok && r.type === "evt")).toBe(true);
  });

  it("handles concurrent publishes without lost events", async () => {
    const bus = createMockEventBus();
    let count = 0;
    bus.subscribe("tick", () => { count++; });
    await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        bus.publish(createEnvelope({ type: "tick", aggregateId: `t${i}` as EntityId, actorId: "a" as EntityId, payload: {}, version: 1 })),
      ),
    );
    expect(count).toBe(50);
  });
});

describe("V2.14 audit completeness", () => {
  it("records every domain event in the canonical bus history for audit", async () => {
    const bus = createMockEventBus();
    const recorded: string[] = [];
    bus.subscribeAll((env) => { recorded.push(env.type); });
    await bus.publish(createEnvelope({ type: "identity.login", aggregateId: "u1" as EntityId, actorId: "u1" as EntityId, payload: {}, version: 1 }));
    await bus.publish(createEnvelope({ type: "investment.completed", aggregateId: "i1" as EntityId, actorId: "u1" as EntityId, payload: {}, version: 1 }));
    expect(recorded).toContain("identity.login");
    expect(recorded).toContain("investment.completed");
  });
});

describe("V2.14 performance integration", () => {
  it("observes canonical events for throughput without altering behavior", async () => {
    const bus = createMockEventBus();
    const perf = createPerformanceModule({ events: bus, autoStart: true });
    await bus.publish(createEnvelope({ type: "identity.login", aggregateId: "u1" as EntityId, actorId: "u1" as EntityId, payload: {}, version: 1 }));
    const snap = perf.performance.snapshot();
    expect(snap.health).toBe("healthy");
    const metrics = perf.performance.analytics.metrics();
    expect(Array.isArray(metrics)).toBe(true);
    perf.performance.stop();
  });

  it("records a metric only (no behavior change) for cross-domain events", async () => {
    const bus = createMockEventBus();
    const perf = createPerformanceModule({ events: bus, autoStart: false });
    perf.performance.analytics.recordMetric("treasury.investment_settled", 1, "event", "event_throughput");
    const snap = perf.performance.snapshot();
    expect(snap.health).toBe("healthy");
  });
});
