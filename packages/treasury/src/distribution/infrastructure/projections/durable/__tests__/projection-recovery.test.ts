import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventStore } from "@relcko/test-utils";
import { createEnvelope } from "@relcko/events";
import type { EventEnvelope } from "@relcko/events";
import { BigIntJsonSerializer } from "../../../services/bigint-serializer";
import { ProjectionRecoveryService } from "../projection-recovery.service";
import { InMemoryProjectionCheckpointStore } from "../projection-checkpoint-store";
import { DistributionProjection } from "../../distribution.projection";
import { RecipientProjection } from "../../recipient.projection";

function makeEnvelope(eventType: string, aggregateId: string, payload: unknown): EventEnvelope {
  return createEnvelope(
    eventType.startsWith("treasury.recipient") ? "recipient" : "distribution",
    aggregateId,
    eventType,
    payload,
    "corr-recovery" as never,
    { producer: "test" },
  );
}

describe("ProjectionRecoveryService", () => {
  let eventStore: InMemoryEventStore;
  let checkpointStore: InMemoryProjectionCheckpointStore;
  let deserializer: BigIntJsonSerializer;
  let recoverySvc: ProjectionRecoveryService;
  let projection: DistributionProjection;

  beforeEach(() => {
    eventStore = new InMemoryEventStore(new BigIntJsonSerializer());
    checkpointStore = new InMemoryProjectionCheckpointStore();
    deserializer = new BigIntJsonSerializer();
    recoverySvc = new ProjectionRecoveryService(eventStore, checkpointStore, deserializer);
    projection = new DistributionProjection();
  });

  describe("recoverProjection", () => {
    it("recovers projection from checkpoint", async () => {
      const env1 = makeEnvelope("treasury.distribution.created", "dist-rec", {
        distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
      });
      await eventStore.append("distribution-dist-rec" as never, [env1], { expectedVersion: 0 });

      const env2 = makeEnvelope("treasury.distribution.approved", "dist-rec", { approvals: [] });
      await eventStore.append("distribution-dist-rec" as never, [env2], { expectedVersion: 1 });

      // Process first event, save checkpoint
      const firstEnv = deserializer.deserialize((await eventStore.load("distribution-dist-rec" as never)).events[0] as never);
      await projection.handle(firstEnv);

      await checkpointStore.save({
        projectionName: "distribution_projection",
        position: 0,
        globalPosition: 1,
        version: 1,
        updatedAt: Date.now(),
        eventCount: 1,
      });

      const result = await recoverySvc.recoverProjection(projection, "distribution_projection");
      expect(result.recovered).toBe(true);
      expect(result.processed).toBe(1);
      expect(result.fromCheckpoint).toBe(1);
    });

    it("handles corrupted checkpoint by resetting and full replay", async () => {
      const env1 = makeEnvelope("treasury.distribution.created", "dist-cc", {
        distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
      });
      await eventStore.append("distribution-dist-cc" as never, [env1], { expectedVersion: 0 });

      // Save corrupted checkpoint
      await checkpointStore.save({
        projectionName: "distribution_projection",
        position: -1,
        globalPosition: -5,
        version: 1,
        updatedAt: Date.now(),
        eventCount: -1,
      });

      const result = await recoverySvc.recoverProjection(projection, "distribution_projection");
      expect(result.recovered).toBe(true);
      expect(result.processed).toBe(1); // full replay from 0
    });

    it("recovers projection with no prior checkpoint (restart recovery)", async () => {
      const env = makeEnvelope("treasury.distribution.created", "dist-restart", {
        distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
      });
      await eventStore.append("distribution-dist-restart" as never, [env], { expectedVersion: 0 });

      const result = await recoverySvc.recoverProjection(projection, "distribution_projection");
      expect(result.recovered).toBe(true);
      expect(result.processed).toBe(1);
      expect(result.fromCheckpoint).toBe(0);
    });
  });

  describe("partialReplay", () => {
    it("replays all events from version 0 for an aggregate", async () => {
      const env1 = makeEnvelope("treasury.distribution.created", "dist-partial", {
        distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
      });
      const env2 = makeEnvelope("treasury.distribution.approved", "dist-partial", { approvals: [] });

      const streamId = "dist-dist-partial";
      await eventStore.append(streamId as never, [env1], { expectedVersion: 0 });
      await eventStore.append(streamId as never, [env2], { expectedVersion: 1 });

      const result = await recoverySvc.partialReplay(projection, "distribution_projection", "dist-partial", 0);
      expect(result.recovered).toBe(true);
      expect(result.processed).toBe(2);

      const row = projection.findById("dist-partial" as never);
      expect(row!.status).toBe("approved");
    });

    it("handles empty partial replay when no events match version", async () => {
      const env = makeEnvelope("treasury.distribution.created", "dist-no-partial", {
        distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
      });
      await eventStore.append("distribution-dist-no-partial" as never, [env], { expectedVersion: 0 });

      const result = await recoverySvc.partialReplay(projection, "distribution_projection", "dist-no-partial", 999);
      expect(result.processed).toBe(0);
    });
  });

  describe("validateCheckpoint", () => {
    it("validates existing checkpoint", async () => {
      await checkpointStore.save({
        projectionName: "valid_proj", position: 100, globalPosition: 200,
        version: 1, updatedAt: Date.now(), eventCount: 50,
      });

      const result = await recoverySvc.validateCheckpoint("valid_proj");
      expect(result.valid).toBe(true);
    });

    it("detects missing checkpoint", async () => {
      const result = await recoverySvc.validateCheckpoint("missing_proj");
      expect(result.valid).toBe(false);
    });
  });

  describe("verifyProjection", () => {
    it("verifies projection has rows matching events", async () => {
      const env = makeEnvelope("treasury.distribution.created", "dist-ver", {
        distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
      });
      await eventStore.append("distribution-dist-ver" as never, [env], { expectedVersion: 0 });

      await projection.handle(deserializer.deserialize((await eventStore.load("distribution-dist-ver" as never)).events[0] as never));

      await checkpointStore.save({
        projectionName: "distribution_projection",
        position: 1, globalPosition: 1,
        version: 1, updatedAt: Date.now(), eventCount: 1,
      });

      const result = await recoverySvc.verifyProjection(projection, "distribution_projection");
      expect(result.verified).toBe(true);
      expect(result.rowCount).toBe(1);
    });

    it("detects projection with rows but no checkpoint", async () => {
      const env = makeEnvelope("treasury.distribution.created", "dist-no-cp", {
        distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
      });
      await eventStore.append("distribution-dist-no-cp" as never, [env], { expectedVersion: 0 });
      await projection.handle(deserializer.deserialize((await eventStore.load("distribution-dist-no-cp" as never)).events[0] as never));

      const result = await recoverySvc.verifyProjection(projection, "distribution_projection");
      expect(result.verified).toBe(true);
      expect(result.rowCount).toBe(1);
    });
  });

  describe("compareWithSource", () => {
    it("matches when checkpoint event count equals store events", async () => {
      const env = makeEnvelope("treasury.distribution.created", "dist-comp", {
        distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
      });
      await eventStore.append("distribution-dist-comp" as never, [env], { expectedVersion: 0 });

      await checkpointStore.save({
        projectionName: "distribution_projection",
        position: 1, globalPosition: 1,
        version: 1, updatedAt: Date.now(), eventCount: 1,
      });

      const result = await recoverySvc.compareWithSource(projection, "distribution_projection");
      expect(result.verified).toBe(true);
    });

    it("detects count mismatch", async () => {
      const env = makeEnvelope("treasury.distribution.created", "dist-mismatch", {
        distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
      });
      await eventStore.append("distribution-dist-mismatch" as never, [env], { expectedVersion: 0 });

      const env2 = makeEnvelope("treasury.distribution.approved", "dist-mismatch", { approvals: [] });
      await eventStore.append("distribution-dist-mismatch" as never, [env2], { expectedVersion: 1 });

      await checkpointStore.save({
        projectionName: "distribution_projection",
        position: 1, globalPosition: 1,
        version: 1, updatedAt: Date.now(), eventCount: 1,
      });

      const result = await recoverySvc.compareWithSource(projection, "distribution_projection");
      expect(result.verified).toBe(false);
      expect(result.reason).toContain("1/2");
    });
  });
});
