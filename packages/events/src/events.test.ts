import { describe, expect, it, vi } from "vitest";
import { ValidationError } from "@relcko/error";
import {
  createEnvelope,
  createEventBus,
  markDeadLetter,
  validateEnvelope,
  withRetry,
} from "@relcko/events";

describe("event envelope", () => {
  it("creates a fully-populated envelope with generated ids", () => {
    const e = createEnvelope({
      type: "InvestmentConfirmed",
      aggregateId: "inv_1" as never,
      actorId: "actor_1" as never,
      payload: { tokens: 5 },
    });
    expect(e.eventId).toBeDefined();
    expect(e.correlationId).toBeDefined();
    expect(e.traceId).toBeDefined();
    expect(e.version).toBe(1);
  });

  it("validates and rejects malformed envelopes", () => {
    expect(() => validateEnvelope({ foo: "bar" })).toThrow(ValidationError);
  });

  it("tracks retry metadata immutably", () => {
    const e = createEnvelope({ type: "x", aggregateId: "a" as never, actorId: "b" as never, payload: {} });
    const retried = withRetry(e, "boom", 3);
    expect(retried.retry?.attempts).toBe(1);
    expect(retried.retry?.maxAttempts).toBe(3);
    expect(e.retry).toBeUndefined();
    expect(markDeadLetter(e).deadLettered).toBe(true);
  });
});

describe("in-memory event bus", () => {
  it("delivers events to subscribers at-least-once", async () => {
    const bus = createEventBus();
    const seen: string[] = [];
    bus.subscribe("Ping", (env) => {
      seen.push(env.type);
    });
    await bus.publish(createEnvelope({ type: "Ping", aggregateId: "a" as never, actorId: "b" as never, payload: {} }));
    expect(seen).toEqual(["Ping"]);
  });

  it("deduplicates by eventId (idempotency)", async () => {
    const bus = createEventBus();
    let count = 0;
    bus.subscribe("Ping", () => {
      count += 1;
    });
    const env = createEnvelope({ type: "Ping", aggregateId: "a" as never, actorId: "b" as never, payload: {} });
    const r1 = await bus.publish(env);
    const r2 = await bus.publish(env);
    expect(r1.deduped).toBe(false);
    expect(r2.deduped).toBe(true);
    expect(count).toBe(1);
  });

  it("retries failing handlers then dead-letters", async () => {
    const bus = createEventBus({ maxAttempts: 2 });
    const handler = vi.fn().mockRejectedValue(new Error("fail"));
    bus.subscribe("Boom", handler);
    const onDeadLetter = vi.fn();
    const bus2 = createEventBus({ maxAttempts: 2, onDeadLetter });
    bus2.subscribe("Boom", handler);
    await bus2.publish(createEnvelope({ type: "Boom", aggregateId: "a" as never, actorId: "b" as never, payload: {} }));
    expect(handler).toHaveBeenCalledTimes(2);
    expect(onDeadLetter).toHaveBeenCalledTimes(1);
    expect(bus2.deadLetters()).toHaveLength(1);
  });

  it("replay performs a genuine delivery attempt (bypasses deduplication)", async () => {
    const bus = createEventBus({ maxAttempts: 2 });
    let deliveryCount = 0;
    bus.subscribe("Poison", () => {
      deliveryCount++;
      throw new Error("always fails");
    });
    const env = createEnvelope({ type: "Poison", aggregateId: "a" as never, actorId: "b" as never, payload: {} });
    await bus.publish(env);
    expect(bus.deadLetters()).toHaveLength(1);
    // Replay — must not be deduped despite same eventId
    const results = await bus.replayDeadLetters();
    expect(results).toHaveLength(1);
    expect(results[0].deduped).toBe(false);
    expect(deliveryCount).toBeGreaterThan(1);
  });

  it("replay preserves original eventId, correlationId, traceId and audit metadata", async () => {
    const bus = createEventBus({ maxAttempts: 1 });
    bus.subscribe("Audit", () => { throw new Error("fail"); });
    const env = createEnvelope({
      type: "Audit",
      aggregateId: "agg_1" as never,
      actorId: "act_1" as never,
      payload: { auditKey: "value" },
    });
    const originalEventId = env.eventId;
    const originalCorrelationId = env.correlationId;
    const originalTraceId = env.traceId;
    await bus.publish(env);
    const dlEntry = bus.deadLetters()[0];
    expect(dlEntry.envelope.eventId).toBe(originalEventId);
    expect(dlEntry.envelope.correlationId).toBe(originalCorrelationId);
    expect(dlEntry.envelope.traceId).toBe(originalTraceId);
    expect(dlEntry.envelope.payload).toEqual({ auditKey: "value" });
  });

  it("deduplication still works for new publishes after replay", async () => {
    const bus = createEventBus({ maxAttempts: 1 });
    let count = 0;
    bus.subscribe("Ping", () => { count++; throw new Error("fail"); });
    const env = createEnvelope({ type: "Ping", aggregateId: "a" as never, actorId: "b" as never, payload: {} });
    await bus.publish(env);
    await bus.replayDeadLetters();
    // A brand-new publish with the same envelope should still be deduped
    const r = await bus.publish(env);
    expect(r.deduped).toBe(true);
  });

  it("subscriber exception propagates to PublishResult as error", async () => {
    const bus = createEventBus({ maxAttempts: 1 });
    bus.subscribe("Fail", () => { throw new Error("domain error"); });
    const r = await bus.publish(createEnvelope({ type: "Fail", aggregateId: "a" as never, actorId: "b" as never, payload: {} }));
    expect(r.delivered).toBe(false);
    expect(r.deadLettered).toBe(true);
    expect(r.subscriberResults[0].ok).toBe(false);
    expect(r.subscriberResults[0].error).toBe("domain error");
  });

  it("retry count equals maxAttempts before dead-lettering", async () => {
    const bus = createEventBus({ maxAttempts: 5 });
    bus.subscribe("RetryMe", () => { throw new Error("nope"); });
    await bus.publish(createEnvelope({ type: "RetryMe", aggregateId: "a" as never, actorId: "b" as never, payload: {} }));
    expect(bus.deadLetters()[0].attempts).toBe(5);
  });

  it("dead-letter entry stores error message and timestamp", async () => {
    const bus = createEventBus({ maxAttempts: 1 });
    bus.subscribe("Err", () => { throw new Error("specific error"); });
    await bus.publish(createEnvelope({ type: "Err", aggregateId: "a" as never, actorId: "b" as never, payload: {} }));
    const dl = bus.deadLetters()[0];
    expect(dl.error).toBe("specific error");
    expect(dl.routedAt).toBeDefined();
    expect(new Date(dl.routedAt).getTime()).not.toBeNaN();
  });

  it("replay preserves event ordering within a batch", async () => {
    const bus = createEventBus({ maxAttempts: 1 });
    const order: string[] = [];
    bus.subscribe("Ord", (env) => {
      order.push(env.eventId as string);
      throw new Error("fail");
    });
    const e1 = createEnvelope({ type: "Ord", aggregateId: "a" as never, actorId: "b" as never, payload: { seq: 1 } });
    const e2 = createEnvelope({ type: "Ord", aggregateId: "a" as never, actorId: "b" as never, payload: { seq: 2 } });
    await bus.publish(e1);
    await bus.publish(e2);
    order.length = 0;
    await bus.replayDeadLetters();
    expect(order[0]).toBe(e1.eventId);
    expect(order[1]).toBe(e2.eventId);
  });
});
