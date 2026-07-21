import { describe, it, expect, beforeEach } from "vitest";
import { ProjectionIdempotencyService } from "../projection-idempotency.service";
import { createEnvelope } from "@relcko/events";
import type { EventEnvelope } from "@relcko/events";

function makeEnvelope(eventType: string, aggregateId: string, aggregateVersion: number): EventEnvelope {
  return createEnvelope(
    "distribution",
    aggregateId,
    eventType,
    { some: "data" },
    "corr-id" as never,
    { producer: "test" },
  );
}

describe("ProjectionIdempotencyService", () => {
  let svc: ProjectionIdempotencyService;

  beforeEach(() => {
    svc = new ProjectionIdempotencyService();
  });

  describe("duplicate event detection", () => {
    it("identifies first occurrence as not duplicate", () => {
      expect(svc.isDuplicate("event-1")).toBe(false);
    });

    it("identifies second occurrence as duplicate", () => {
      svc.markProcessed("event-1");
      expect(svc.isDuplicate("event-1")).toBe(true);
    });

    it("multiple distinct events are all unique", () => {
      svc.markProcessed("e1");
      svc.markProcessed("e2");
      expect(svc.isDuplicate("e3")).toBe(false);
    });
  });

  describe("version validation", () => {
    it("accepts first version", () => {
      expect(svc.validateVersion("agg-1", 1)).toBe(true);
    });

    it("accepts increasing versions", () => {
      svc.updateVersion("agg-1", 1);
      expect(svc.validateVersion("agg-1", 2)).toBe(true);
    });

    it("rejects stale (same) version", () => {
      svc.updateVersion("agg-1", 3);
      expect(svc.validateVersion("agg-1", 3)).toBe(false);
    });

    it("rejects older version", () => {
      svc.updateVersion("agg-1", 5);
      expect(svc.validateVersion("agg-1", 3)).toBe(false);
    });
  });

  describe("out-of-order detection", () => {
    it("no out-of-order for first event", () => {
      expect(svc.detectOutOfOrder("agg-1", 1)).toBe(false);
    });

    it("no out-of-order for increasing versions", () => {
      svc.updateVersion("agg-1", 1);
      expect(svc.detectOutOfOrder("agg-1", 2)).toBe(false);
    });

    it("detects out-of-order for non-increasing version", () => {
      svc.updateVersion("agg-1", 5);
      expect(svc.detectOutOfOrder("agg-1", 3)).toBe(true);
    });
  });

  describe("checkEvent integration", () => {
    it("passes for fresh event with new aggregate", () => {
      const env = makeEnvelope("e1", "test.event", "agg-1", 1);
      const result = svc.checkEvent(env);
      expect(result.canProcess).toBe(true);
      expect(result.isDuplicate).toBe(false);
      expect(result.isStaleVersion).toBe(false);
      expect(result.isOutOfOrder).toBe(false);
    });

    it("rejects duplicate event", () => {
      const env = makeEnvelope("test.event", "agg-1", 1);
      const eventId = env.metadata.eventId;
      svc.markProcessed(eventId);
      const result = svc.checkEvent(env);
      expect(result.canProcess).toBe(false);
      expect(result.isDuplicate).toBe(true);
    });

    it("rejects stale version", () => {
      svc.updateVersion("agg-1", 5);
      const env = makeEnvelope("test.event", "agg-1", 3);
      const result = svc.checkEvent(env);
      expect(result.canProcess).toBe(false);
      expect(result.isStaleVersion).toBe(true);
    });

    it("rejects both duplicate and stale", () => {
      const env = makeEnvelope("test.event", "agg-1", 5);
      const eventId = env.metadata.eventId;
      svc.markProcessed(eventId);
      svc.updateVersion("agg-1", 10);

      const result = svc.checkEvent(env);
      expect(result.canProcess).toBe(false);
      expect(result.isDuplicate).toBe(true);
      expect(result.isStaleVersion).toBe(true);
    });

    it("idempotent replay: same events replayed are skipped", () => {
      const env1 = makeEnvelope("test.event", "agg-1", 1);
      const env2 = makeEnvelope("test.event", "agg-1", 2);

      svc.recordProcessed(env1);
      svc.recordProcessed(env2);

      // Replay: same events again
      const check1 = svc.checkEvent(env1);
      expect(check1.canProcess).toBe(false);
      expect(check1.isDuplicate).toBe(true);

      const check2 = svc.checkEvent(env2);
      expect(check2.canProcess).toBe(false);
      expect(check2.isDuplicate).toBe(true);
    });
  });

  describe("recordProcessed", () => {
    it("records event and updates version", () => {
      const env = makeEnvelope("test.event", "agg-1", 0);
      const eventId = env.metadata.eventId;
      svc.recordProcessed(env);

      expect(svc.isDuplicate(eventId)).toBe(true);
      expect(svc.getLatestVersion("agg-1")).toBe(0);
    });

    it("only updates version when higher", () => {
      svc.updateVersion("agg-1", 10);

      const env = makeEnvelope("e2", "test.event", "agg-1", 5);
      svc.recordProcessed(env);

      expect(svc.getLatestVersion("agg-1")).toBe(10);
    });
  });

  describe("clear", () => {
    it("resets all state", () => {
      svc.markProcessed("e1");
      svc.updateVersion("agg-1", 1);
      expect(svc.getProcessedCount()).toBe(1);

      svc.clear();
      expect(svc.getProcessedCount()).toBe(0);
      expect(svc.getLatestVersion("agg-1")).toBe(0);
    });
  });
});
