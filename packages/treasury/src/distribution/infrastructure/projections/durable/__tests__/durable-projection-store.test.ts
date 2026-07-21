import { describe, it, expect, beforeEach } from "vitest";
import { DistributionProjectionStore, RecipientProjectionStore, ScheduleProjectionStore, ProgressProjectionStore } from "../durable-projection-store";
import type { DistributionProjectionRow } from "../../distribution.projection";
import type { RecipientProjectionRow } from "../../recipient.projection";
import type { ScheduleProjectionRow } from "../../schedule.projection";
import type { ProgressProjectionRow } from "../../progress.projection";

describe("DistributionProjectionStore", () => {
  let store: DistributionProjectionStore;

  beforeEach(() => {
    store = new DistributionProjectionStore();
  });

  it("saves and retrieves a row", async () => {
    const row: DistributionProjectionRow = {
      id: "dist-1" as never,
      distributionType: "dividend" as never,
      status: "draft" as never,
      sourceAccountId: "acct-1",
      totalAmount: 1000n,
      currency: "USD",
      perUnitAmount: null,
      recipientCount: 0,
      materializationManifestHash: null,
      sagaId: null,
      finalTotals: null,
      scheduleId: null,
      snapshotId: null,
      allocationMethod: "pro_rata" as never,
      proposalRef: null,
      createdAt: 1000,
      updatedAt: 1000,
      version: 1,
    };

    const result = await store.save("dist-1", row, 0);
    expect(result.success).toBe(true);
    expect(result.data).not.toBeNull();

    const found = await store.findById("dist-1");
    expect(found).not.toBeNull();
    expect(found!.status).toBe("draft");
  });

  it("rejects version conflict", async () => {
    const row: DistributionProjectionRow = {
      id: "dist-1" as never, distributionType: "dividend" as never,
      status: "draft" as never, sourceAccountId: "acct-1",
      totalAmount: 1000n, currency: "USD", perUnitAmount: null,
      recipientCount: 0, materializationManifestHash: null, sagaId: null,
      finalTotals: null, scheduleId: null, snapshotId: null,
      allocationMethod: "pro_rata" as never, proposalRef: null,
      createdAt: 1000, updatedAt: 1000, version: 1,
    };
    await store.save("dist-1", row, 0);

    const rowV2 = { ...row, status: "approved" as never, version: 2 };
    const result = await store.save("dist-1", rowV2, 0);
    expect(result.success).toBe(false);
    expect(result.error!.type).toBe("version_conflict");
  });

  it("findMany with predicate filters correctly", async () => {
    for (let i = 1; i <= 3; i++) {
      await store.save(`dist-${i}`, {
        id: `dist-${i}` as never, distributionType: "dividend" as never,
        status: i === 1 ? "draft" as never : "approved" as never,
        sourceAccountId: "acct-1", totalAmount: BigInt(i * 1000), currency: "USD",
        perUnitAmount: null, recipientCount: 0, materializationManifestHash: null,
        sagaId: null, finalTotals: null, scheduleId: null, snapshotId: null,
        allocationMethod: "pro_rata" as never, proposalRef: null,
        createdAt: 1000, updatedAt: 1000, version: 1,
      }, 0);
    }

    const drafts = await store.findByStatus("draft" as never);
    expect(drafts).toHaveLength(1);

    const approved = await store.findByStatus("approved" as never);
    expect(approved).toHaveLength(2);
  });

  it("delete removes a row", async () => {
    const row: DistributionProjectionRow = {
      id: "dist-1" as never, distributionType: "dividend" as never,
      status: "draft" as never, sourceAccountId: "acct-1",
      totalAmount: 1000n, currency: "USD", perUnitAmount: null,
      recipientCount: 0, materializationManifestHash: null, sagaId: null,
      finalTotals: null, scheduleId: null, snapshotId: null,
      allocationMethod: "pro_rata" as never, proposalRef: null,
      createdAt: 1000, updatedAt: 1000, version: 1,
    };
    await store.save("dist-1", row, 0);
    expect(await store.findById("dist-1")).not.toBeNull();

    await store.delete("dist-1");
    expect(await store.findById("dist-1")).toBeNull();
  });

  it("reset clears all rows", async () => {
    const row: DistributionProjectionRow = {
      id: "dist-1" as never, distributionType: "dividend" as never,
      status: "draft" as never, sourceAccountId: "acct-1",
      totalAmount: 1000n, currency: "USD", perUnitAmount: null,
      recipientCount: 0, materializationManifestHash: null, sagaId: null,
      finalTotals: null, scheduleId: null, snapshotId: null,
      allocationMethod: "pro_rata" as never, proposalRef: null,
      createdAt: 1000, updatedAt: 1000, version: 1,
    };
    await store.save("dist-1", row, 0);
    expect(await store.count()).toBe(1);

    await store.reset();
    expect(await store.count()).toBe(0);
  });

  it("getVersion returns 0 for unknown id", async () => {
    expect(await store.getVersion("unknown")).toBe(0);
  });

  it("getVersion returns row version", async () => {
    const row: DistributionProjectionRow = {
      id: "dist-1" as never, distributionType: "dividend" as never,
      status: "draft" as never, sourceAccountId: "acct-1",
      totalAmount: 1000n, currency: "USD", perUnitAmount: null,
      recipientCount: 0, materializationManifestHash: null, sagaId: null,
      finalTotals: null, scheduleId: null, snapshotId: null,
      allocationMethod: "pro_rata" as never, proposalRef: null,
      createdAt: 1000, updatedAt: 1000, version: 5,
    };
    await store.save("dist-1", row, 0);
    expect(await store.getVersion("dist-1")).toBe(5);
  });
});

describe("RecipientProjectionStore", () => {
  let store: RecipientProjectionStore;

  beforeEach(() => {
    store = new RecipientProjectionStore();
  });

  it("findByDistributionId and findByInvestorId", async () => {
    const base = {
      investorId: "inv-1", eligibleAmount: 100n, currency: "USD",
      paidAmount: 0n, settlementRef: null, txHash: null,
      failureReason: null, failureCode: null, recoveryAttempts: 0,
      createdAt: 1000, updatedAt: 1000,
    };

    await store.save("r1", {
      id: "r1" as never, distributionId: "d-1" as never, ...base, status: "pending" as never, version: 1,
    } as RecipientProjectionRow, 0);
    await store.save("r2", {
      id: "r2" as never, distributionId: "d-1" as never, investorId: "inv-2",
      eligibleAmount: 200n, currency: "USD", paidAmount: 0n, settlementRef: null,
      txHash: null, failureReason: null, failureCode: null, recoveryAttempts: 0,
      status: "pending" as never, createdAt: 1000, updatedAt: 1000, version: 1,
    } as RecipientProjectionRow, 0);
    await store.save("r3", {
      id: "r3" as never, distributionId: "d-2" as never, ...base, status: "pending" as never, version: 1,
    } as RecipientProjectionRow, 0);

    expect((await store.findByDistributionId("d-1" as never)).length).toBe(2);
    expect((await store.findByInvestorId("inv-1")).length).toBe(2);
    expect((await store.findByStatus("pending" as never)).length).toBe(3);
  });
});

describe("ScheduleProjectionStore", () => {
  let store: ScheduleProjectionStore;

  beforeEach(() => {
    store = new ScheduleProjectionStore();
  });

  it("findByPropertyId and findByStatus", async () => {
    const base = {
      distributionType: "dividend" as never, periodStart: 1000, periodEnd: 2000,
      totalAmount: 5000n, perUnitAmount: null, currency: "USD",
      createdAt: 1000, updatedAt: 1000,
    };

    await store.save("s1", { id: "s1" as never, propertyId: "p1", status: "draft" as never, ...base, version: 1 } as ScheduleProjectionRow, 0);
    await store.save("s2", { id: "s2" as never, propertyId: "p1", status: "executing" as never, ...base, version: 1 } as ScheduleProjectionRow, 0);
    await store.save("s3", { id: "s3" as never, propertyId: "p2", status: "draft" as never, ...base, version: 1 } as ScheduleProjectionRow, 0);

    expect((await store.findByPropertyId("p1")).length).toBe(2);
    expect((await store.findByStatus("draft" as never)).length).toBe(2);
    expect((await store.findByStatus("executing" as never)).length).toBe(1);
  });
});

describe("ProgressProjectionStore", () => {
  let store: ProgressProjectionStore;

  beforeEach(() => {
    store = new ProgressProjectionStore();
  });

  it("saveProgress and findByDistributionId", async () => {
    const row: ProgressProjectionRow = {
      distributionId: "dist-1" as never,
      totalRecipients: 10,
      paidCount: 5,
      failedCount: 1,
      recoveredCount: 0,
      pendingCount: 4,
      percentage: 50,
    };

    await store.saveProgress("dist-1", { ...row, version: 1 });

    const found = await store.findByDistributionId("dist-1" as never);
    expect(found).not.toBeNull();
    expect(found!.paidCount).toBe(5);
    expect(found!.percentage).toBe(50);
  });
});
