import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventStore } from "@relcko/test-utils";
import { createEnvelope } from "@relcko/events";
import type { EventEnvelope } from "@relcko/events";
import { BigIntJsonSerializer } from "../../../services/bigint-serializer";
import { ProjectionReplayService } from "../projection-replay.service";
import { InMemoryProjectionCheckpointStore } from "../projection-checkpoint-store";
import { DistributionProjection } from "../../distribution.projection";
import { RecipientProjection } from "../../recipient.projection";
import { ProgressProjection } from "../../progress.projection";

function makeEnvelope(eventType: string, aggregateId: string, payload: unknown): EventEnvelope {
  return createEnvelope(
    eventType.startsWith("treasury.recipient") ? "recipient" : eventType.startsWith("treasury.distribution.schedule") ? "schedule" : "distribution",
    aggregateId,
    eventType,
    payload,
    "corr-replay" as never,
    { producer: "test" },
  );
}

describe("ProjectionReplayService", () => {
  let eventStore: InMemoryEventStore;
  let checkpointStore: InMemoryProjectionCheckpointStore;
  let deserializer: BigIntJsonSerializer;
  let replaySvc: ProjectionReplayService;
  let projection: DistributionProjection;

  beforeEach(() => {
    eventStore = new InMemoryEventStore(new BigIntJsonSerializer());
    checkpointStore = new InMemoryProjectionCheckpointStore();
    deserializer = new BigIntJsonSerializer();
    replaySvc = new ProjectionReplayService(eventStore, checkpointStore, deserializer);
    projection = new DistributionProjection();
  });

  describe("replayAll", () => {
    it("replays entire event store history", async () => {
      const env1 = makeEnvelope("treasury.distribution.created", "dist-1", {
        distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
      });
      const env2 = makeEnvelope("treasury.distribution.created", "dist-2", {
        distributionType: "dividend", sourceAccountId: "acc-2", totalAmount: 2000n, currency: "USDT", allocationMethod: "pro_rata",
      });

      await eventStore.append("distribution-dist-1" as never, [env1], { expectedVersion: 0 });
      await eventStore.append("distribution-dist-2" as never, [env2], { expectedVersion: 0 });

      const result = await replaySvc.replayAll(projection, "distribution_projection");
      expect(result.totalEvents).toBe(2);
      expect(result.processed).toBe(2);
      expect(result.completed).toBe(true);

      expect(projection.findById("dist-1" as never)).not.toBeNull();
      expect(projection.findById("dist-2" as never)).not.toBeNull();
      expect(projection.findMany()).toHaveLength(2);
    });

    it("handles empty event store", async () => {
      const result = await replaySvc.replayAll(projection, "distribution_projection");
      expect(result.totalEvents).toBe(0);
      expect(result.processed).toBe(0);
      expect(result.completed).toBe(true);
    });

    it("skips non-matching event types", async () => {
      const env = createEnvelope("recipient", "rec-1", "treasury.recipient.materialized", { distributionId: "d-1", investorId: "i-1", eligibleAmount: 100n, currency: "USDT" }, "corr" as never, { producer: "test" });
      await eventStore.append("recipient-rec-1" as never, [env], { expectedVersion: 0 });

      const result = await replaySvc.replayAll(projection, "distribution_projection");
      expect(result.totalEvents).toBe(1);
      expect(result.processed).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it("replay entire history produces consistent projection", async () => {
      const env1 = makeEnvelope("treasury.distribution.created", "dist-c", {
        distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
      });
      const env2 = makeEnvelope("treasury.distribution.approved", "dist-c", { approvals: [] });

      await eventStore.append("distribution-dist-c" as never, [env1], { expectedVersion: 0 });
      await eventStore.append("distribution-dist-c" as never, [env2], { expectedVersion: 1 });

      await replaySvc.replayAll(projection, "distribution_projection");
      const row = projection.findById("dist-c" as never);
      expect(row).not.toBeNull();
      expect(row!.status).toBe("approved");
    });
  });

  describe("replayStream", () => {
    it("replays events for a single aggregate stream", async () => {
      const env1 = makeEnvelope("treasury.distribution.created", "dist-stream", {
        distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
      });
      const env2 = makeEnvelope("treasury.distribution.approved", "dist-stream", { approvals: [] });

      const streamId = "dist-dist-stream";
      await eventStore.append(streamId as never, [env1], { expectedVersion: 0 });
      await eventStore.append(streamId as never, [env2], { expectedVersion: 1 });

      const result = await replaySvc.replayStream(projection, "distribution_projection", "dist-stream");
      expect(result.processed).toBe(2);
      expect(result.completed).toBe(true);

      const row = projection.findById("dist-stream" as never);
      expect(row!.status).toBe("approved");
    });

    it("handles empty stream", async () => {
      const result = await replaySvc.replayStream(projection, "distribution_projection", "non-existent");
      expect(result.totalEvents).toBe(0);
      expect(result.processed).toBe(0);
    });
  });

  describe("replayFromCheckpoint", () => {
    it("replays events from a given checkpoint position", async () => {
      const env1 = makeEnvelope("treasury.distribution.created", "dist-cp", {
        distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
      });
      await eventStore.append("distribution-dist-cp" as never, [env1], { expectedVersion: 0 });

      const env2 = makeEnvelope("treasury.distribution.approved", "dist-cp", { approvals: [] });
      await eventStore.append("distribution-dist-cp" as never, [env2], { expectedVersion: 1 });

      await checkpointStore.save({
        projectionName: "distribution_projection",
        position: 0,
        globalPosition: 1,
        version: 1,
        updatedAt: Date.now(),
        eventCount: 1,
      });

      const result = await replaySvc.replayFromCheckpoint(projection, "distribution_projection");
      expect(result.processed).toBe(1);
    });

    it("replays all events when no checkpoint exists (same as replayAll)", async () => {
      const env1 = makeEnvelope("treasury.distribution.created", "dist-nocp", {
        distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
      });
      await eventStore.append("distribution-dist-nocp" as never, [env1], { expectedVersion: 0 });

      const result = await replaySvc.replayFromCheckpoint(projection, "distribution_projection");
      expect(result.processed).toBe(1);
    });
  });

  describe("resumeReplay", () => {
    it("resumes from checkpoint when one exists", async () => {
      const env1 = makeEnvelope("treasury.distribution.created", "dist-res", {
        distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
      });
      const env2 = makeEnvelope("treasury.distribution.approved", "dist-res", { approvals: [] });

      await eventStore.append("distribution-dist-res" as never, [env1], { expectedVersion: 0 });
      await eventStore.append("distribution-dist-res" as never, [env2], { expectedVersion: 1 });

      await checkpointStore.save({
        projectionName: "distribution_projection",
        position: 0,
        globalPosition: 1,
        version: 1,
        updatedAt: Date.now(),
        eventCount: 1,
      });

      const result = await replaySvc.resumeReplay(projection, "distribution_projection");
      expect(result.processed).toBe(1);
      expect(result.fromPosition).toBe(1);
    });

    it("starts full replay when no checkpoint exists", async () => {
      const env1 = makeEnvelope("treasury.distribution.created", "dist-nockpt", {
        distributionType: "dividend", sourceAccountId: "acc-1", totalAmount: 1000n, currency: "USDT", allocationMethod: "pro_rata",
      });
      await eventStore.append("distribution-dist-nockpt" as never, [env1], { expectedVersion: 0 });

      const result = await replaySvc.resumeReplay(projection, "distribution_projection");
      expect(result.processed).toBe(1);
    });
  });

  describe("validateReplay", () => {
    it("validates when checkpoint matches expected count", async () => {
      await checkpointStore.save({
        projectionName: "dist_proj", position: 100, globalPosition: 200,
        version: 1, updatedAt: Date.now(), eventCount: 50,
      });

      const result = await replaySvc.validateReplay(projection, "dist_proj", 50);
      expect(result.valid).toBe(true);
    });

    it("returns invalid when no checkpoint exists", async () => {
      const result = await replaySvc.validateReplay(projection, "missing_proj", 10);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("No checkpoint found");
    });

    it("returns invalid when event count does not match", async () => {
      await checkpointStore.save({
        projectionName: "partial_proj", position: 50, globalPosition: 100,
        version: 1, updatedAt: Date.now(), eventCount: 30,
      });

      const result = await replaySvc.validateReplay(projection, "partial_proj", 100);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("30/100");
    });
  });
});
