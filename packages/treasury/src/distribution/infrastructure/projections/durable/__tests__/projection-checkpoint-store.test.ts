import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryProjectionCheckpointStore } from "../projection-checkpoint-store";
import type { ProjectionCheckpoint, GlobalCheckpoint } from "../projection-checkpoint-store";

describe("InMemoryProjectionCheckpointStore", () => {
  let store: InMemoryProjectionCheckpointStore;

  beforeEach(() => {
    store = new InMemoryProjectionCheckpointStore();
  });

  it("saves and loads a checkpoint", async () => {
    const cp: ProjectionCheckpoint = {
      projectionName: "dist_projection",
      position: 100,
      globalPosition: 200,
      version: 1,
      updatedAt: Date.now(),
      eventCount: 50,
    };

    await store.save(cp);
    const loaded = await store.load("dist_projection");
    expect(loaded).not.toBeNull();
    expect(loaded!.projectionName).toBe("dist_projection");
    expect(loaded!.globalPosition).toBe(200);
    expect(loaded!.eventCount).toBe(50);
  });

  it("returns null for unknown projection", async () => {
    const loaded = await store.load("unknown");
    expect(loaded).toBeNull();
  });

  it("deletes a checkpoint", async () => {
    const cp: ProjectionCheckpoint = {
      projectionName: "to_delete", position: 10, globalPosition: 20,
      version: 1, updatedAt: Date.now(), eventCount: 5,
    };
    await store.save(cp);
    expect(await store.load("to_delete")).not.toBeNull();
    await store.delete("to_delete");
    expect(await store.load("to_delete")).toBeNull();
  });

  it("manages global checkpoint", async () => {
    const gc: GlobalCheckpoint = {
      globalPosition: 500,
      version: 1,
      updatedAt: Date.now(),
    };
    await store.saveGlobal(gc);

    const loaded = await store.loadGlobal();
    expect(loaded).not.toBeNull();
    expect(loaded!.globalPosition).toBe(500);
  });

  it("verifyCheckpoint returns valid for correct checkpoint", async () => {
    const cp: ProjectionCheckpoint = {
      projectionName: "valid_proj", position: 100, globalPosition: 200,
      version: 1, updatedAt: Date.now(), eventCount: 50,
    };
    await store.save(cp);

    const result = await store.verifyCheckpoint("valid_proj");
    expect(result.valid).toBe(true);
    expect(result.reason).toBeNull();
  });

  it("verifyCheckpoint returns invalid for missing projection (corrupted checkpoint)", async () => {
    const result = await store.verifyCheckpoint("missing_proj");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("No checkpoint found");
  });

  it("verifyCheckpoint rejects negative eventCount (corrupted checkpoint)", async () => {
    const cp: ProjectionCheckpoint = {
      projectionName: "corrupted", position: 100, globalPosition: 200,
      version: 1, updatedAt: Date.now(), eventCount: -1,
    };
    await store.save(cp);

    const result = await store.verifyCheckpoint("corrupted");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Negative event count");
  });

  it("verifyCheckpoint rejects negative globalPosition (corrupted checkpoint)", async () => {
    const cp: ProjectionCheckpoint = {
      projectionName: "neg_pos", position: 100, globalPosition: -5,
      version: 1, updatedAt: Date.now(), eventCount: 10,
    };
    await store.save(cp);

    const result = await store.verifyCheckpoint("neg_pos");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Negative global position");
  });

  it("getAllProjections returns all registered names", async () => {
    await store.save({ projectionName: "p1", position: 1, globalPosition: 1, version: 1, updatedAt: Date.now(), eventCount: 1 });
    await store.save({ projectionName: "p2", position: 2, globalPosition: 2, version: 1, updatedAt: Date.now(), eventCount: 2 });

    const names = await store.getAllProjections();
    expect(names.sort()).toEqual(["p1", "p2"]);
  });

  it("clear removes all data", async () => {
    await store.save({ projectionName: "p1", position: 1, globalPosition: 1, version: 1, updatedAt: Date.now(), eventCount: 1 });
    await store.saveGlobal({ globalPosition: 100, version: 1, updatedAt: Date.now() });
    await store.clear();

    expect(await store.load("p1")).toBeNull();
    expect(await store.loadGlobal()).toBeNull();
    expect(await store.getAllProjections()).toEqual([]);
  });

  it("atomicUpdate creates or updates checkpoint and updates global", async () => {
    const result = await store.atomicUpdate("proj_a", (current) => ({
      projectionName: "proj_a",
      position: 50,
      globalPosition: 100,
      version: (current?.version ?? 0) + 1,
      updatedAt: Date.now(),
      eventCount: 25,
    }));

    expect(result.projectionName).toBe("proj_a");
    expect(result.globalPosition).toBe(100);
    expect(result.eventCount).toBe(25);

    const global = await store.loadGlobal();
    expect(global!.globalPosition).toBe(100);
  });

  it("atomicUpdate preserves existing data for updates", async () => {
    await store.save({
      projectionName: "proj_b", position: 10, globalPosition: 20,
      version: 1, updatedAt: Date.now(), eventCount: 5,
    });

    await store.atomicUpdate("proj_b", (current) => ({
      ...current!,
      position: 30,
      globalPosition: 40,
      eventCount: 10,
    }));

    const loaded = await store.load("proj_b");
    expect(loaded!.position).toBe(30);
    expect(loaded!.globalPosition).toBe(40);
    expect(loaded!.eventCount).toBe(10);
  });
});
