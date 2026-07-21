import { describe, it, expect } from "vitest";
import { DistributionAggregate } from "../domain/distribution.aggregate";
import { type DistributionId, DistributionStatus, FinalTotals, AllocationMethod, DistributionType } from "../domain/value-objects";
import { DistributionInvalidStatusError, DistributionManifestMismatchError, DistributionNotMaterializedError, DistributionAlreadyFinalizedError } from "../domain/errors";
import type { DomainEvent } from "@relcko/kernel";

function makeId(seed = "dist-1"): DistributionId {
  return seed as unknown as DistributionId;
}

function makeDistribution(id?: DistributionId): DistributionAggregate {
  return DistributionAggregate.create(id ?? makeId(), {
    distributionType: DistributionType.Dividend,
    sourceAccountId: "acct-1",
    totalAmount: 100000n,
    currency: "USD",
    perUnitAmount: 500n,
    allocationMethod: AllocationMethod.ProRata,
    metadata: { reason: "Q3 dividend" },
  });
}

function materializedDistribution(id?: DistributionId): DistributionAggregate {
  const dist = makeDistribution(id);
  const dId = id ?? makeId();
  dist.approve({ approvals: [{ approverId: "approver-1", keyId: "key-1", signature: "sig-1", signedAt: Date.now() }] }, 1, "journal-1");
  dist.materializeRecipients("snap-1", 100000n, 100, "hash-valid");
  return dist;
}

describe("DistributionAggregate", () => {
  describe("create", () => {
    it("creates with Draft status", () => {
      const dist = makeDistribution();
      expect(dist.status).toBe(DistributionStatus.Draft);
      expect(dist.version).toBe(1);
      expect(dist.getUncommittedEvents()).toHaveLength(1);
    });

    it("sets all required fields from creation data", () => {
      const dist = DistributionAggregate.create(makeId("dist-full"), {
        distributionType: DistributionType.RevenueShare,
        sourceAccountId: "acct-rev",
        totalAmount: 50000n,
        currency: "USDT",
        perUnitAmount: undefined,
        allocationMethod: AllocationMethod.Fixed,
        metadata: { key: "val" },
      });
      const event = dist.getUncommittedEvents()[0]!;
      const eventData = (event as unknown as { data: Record<string, unknown> }).data;
      expect(eventData).toMatchObject({
        distributionType: DistributionType.RevenueShare,
        sourceAccountId: "acct-rev",
        totalAmount: 50000n,
        currency: "USDT",
      });
    });
  });

  describe("approve", () => {
    it("transitions Draft -> Approved", () => {
      const dist = makeDistribution();
      dist.approve({ approvals: [{ approverId: "a1", keyId: "k1", signature: "s1", signedAt: Date.now() }] }, 1, "journal-1");
      expect(dist.status).toBe(DistributionStatus.Approved);
      expect(dist.version).toBe(2);
    });

    it("rejects approve from Approved", () => {
      const dist = makeDistribution();
      dist.approve({ approvals: [{ approverId: "a1", keyId: "k1", signature: "s1", signedAt: Date.now() }] }, 1, "journal-1");
      expect(() =>
        dist.approve({ approvals: [{ approverId: "a2", keyId: "k2", signature: "s2", signedAt: Date.now() }] }, 2, "journal-2"),
      ).toThrow(DistributionInvalidStatusError);
    });

    it("rejects approve from Executing", () => {
      const dist = materializedDistribution();
      dist.execute({ sagaOptions: {} }, "saga-1" as unknown as never);
      expect(() =>
        dist.approve({ approvals: [{ approverId: "a1", keyId: "k1", signature: "s1", signedAt: Date.now() }] }, 1, "journal-1"),
      ).toThrow(DistributionInvalidStatusError);
    });

    it("rejects approve from Completed", () => {
      const dist = materializedDistribution();
      dist.execute({ sagaOptions: {} }, "saga-1" as unknown as never);
      dist.complete(new FinalTotals({ totalDistributed: 100000n, totalFailed: 0n, totalRecovered: 0n, paidCount: 100, failedCount: 0, recoveredCount: 0, writeOffAmount: 0n }), "saga-1" as unknown as never);
      expect(() =>
        dist.approve({ approvals: [{ approverId: "a1", keyId: "k1", signature: "s1", signedAt: Date.now() }] }, 1, "journal-1"),
      ).toThrow(DistributionInvalidStatusError);
    });
  });

  describe("materializeRecipients", () => {
    it("transitions Approved -> RecipientsMaterialized", () => {
      const dist = makeDistribution();
      dist.approve({ approvals: [{ approverId: "a1", keyId: "k1", signature: "s1", signedAt: Date.now() }] }, 1, "journal-1");
      dist.materializeRecipients("snap-1", 100000n, 50, "manifest-hash");
      expect(dist.status).toBe(DistributionStatus.RecipientsMaterialized);
      expect(dist.materializationManifestHash).toBe("manifest-hash");
      expect(dist.recipientCount).toBe(50);
      expect(dist.version).toBe(3);
    });

    it("rejects materialize from Draft", () => {
      const dist = makeDistribution();
      expect(() => dist.materializeRecipients("snap-1", 100000n, 50, "hash")).toThrow(DistributionInvalidStatusError);
    });

    it("rejects when totalEligibleAmount does not match totalAmount", () => {
      const dist = makeDistribution();
      dist.approve({ approvals: [{ approverId: "a1", keyId: "k1", signature: "s1", signedAt: Date.now() }] }, 1, "journal-1");
      expect(() => dist.materializeRecipients("snap-1", 99999n, 50, "hash")).toThrow(DistributionManifestMismatchError);
    });

    it("rejects materialize from Executing", () => {
      const dist = materializedDistribution();
      dist.execute({ sagaOptions: {} }, "saga-1" as unknown as never);
      expect(() => dist.materializeRecipients("snap-2", 100000n, 100, "hash-2")).toThrow(DistributionInvalidStatusError);
    });
  });

  describe("execute", () => {
    it("transitions RecipientsMaterialized -> Executing", () => {
      const dist = materializedDistribution();
      dist.execute({ sagaOptions: {} }, "saga-1" as unknown as never);
      expect(dist.status).toBe(DistributionStatus.Executing);
      expect(dist.version).toBe(4);
    });

    it("rejects execute from Draft", () => {
      const dist = makeDistribution();
      expect(() => dist.execute({ sagaOptions: {} }, "saga-1" as unknown as never)).toThrow(DistributionInvalidStatusError);
    });

    it("rejects execute from Approved (no materialization)", () => {
      const dist = makeDistribution();
      dist.approve({ approvals: [{ approverId: "a1", keyId: "k1", signature: "s1", signedAt: Date.now() }] }, 1, "journal-1");
      expect(() => dist.execute({ sagaOptions: {} }, "saga-1" as unknown as never)).toThrow(DistributionInvalidStatusError);
    });

    it("rejects execute from Executing (already started)", () => {
      const dist = materializedDistribution();
      dist.execute({ sagaOptions: {} }, "saga-1" as unknown as never);
      expect(() => dist.execute({ sagaOptions: {} }, "saga-2" as unknown as never)).toThrow(DistributionInvalidStatusError);
    });

    it("rejects execute from Completed", () => {
      const dist = materializedDistribution();
      dist.execute({ sagaOptions: {} }, "saga-1" as unknown as never);
      dist.complete(new FinalTotals({ totalDistributed: 100000n, totalFailed: 0n, totalRecovered: 0n, paidCount: 100, failedCount: 0, recoveredCount: 0, writeOffAmount: 0n }), "saga-1" as unknown as never);
      expect(() => dist.execute({ sagaOptions: {} }, "saga-2" as unknown as never)).toThrow(DistributionInvalidStatusError);
    });
  });

  describe("complete", () => {
    it("transitions Executing -> Completed with valid final totals", () => {
      const dist = materializedDistribution();
      dist.execute({ sagaOptions: {} }, "saga-1" as unknown as never);
      dist.complete(
        new FinalTotals({ totalDistributed: 100000n, totalFailed: 0n, totalRecovered: 0n, paidCount: 100, failedCount: 0, recoveredCount: 0, writeOffAmount: 0n }),
        "saga-1" as unknown as never,
      );
      expect(dist.status).toBe(DistributionStatus.Completed);
      expect(dist.version).toBe(5);
    });

    it("accepts partial completion with writeOff", () => {
      const dist = materializedDistribution();
      dist.execute({ sagaOptions: {} }, "saga-1" as unknown as never);
      dist.complete(
        new FinalTotals({ totalDistributed: 99000n, totalFailed: 500n, totalRecovered: 0n, paidCount: 98, failedCount: 2, recoveredCount: 0, writeOffAmount: 500n }),
        "saga-1" as unknown as never,
      );
      expect(dist.status).toBe(DistributionStatus.Completed);
      expect(dist.finalTotals!.totalDistributed).toBe(99000n);
    });

    it("rejects complete from Draft", () => {
      const dist = makeDistribution();
      expect(() =>
        dist.complete(new FinalTotals({ totalDistributed: 100000n, totalFailed: 0n, totalRecovered: 0n, paidCount: 100, failedCount: 0, recoveredCount: 0, writeOffAmount: 0n }), "saga-1" as unknown as never),
      ).toThrow(DistributionInvalidStatusError);
    });

    it("rejects complete with mismatching final totals sum", () => {
      const dist = materializedDistribution();
      dist.execute({ sagaOptions: {} }, "saga-1" as unknown as never);
      expect(() =>
        dist.complete(new FinalTotals({ totalDistributed: 50000n, totalFailed: 0n, totalRecovered: 0n, paidCount: 50, failedCount: 0, recoveredCount: 0, writeOffAmount: 0n }), "saga-1" as unknown as never),
      ).toThrow(DistributionAlreadyFinalizedError);
    });

    it("rejects complete from Completed (already finalized)", () => {
      const dist = materializedDistribution();
      dist.execute({ sagaOptions: {} }, "saga-1" as unknown as never);
      dist.complete(new FinalTotals({ totalDistributed: 100000n, totalFailed: 0n, totalRecovered: 0n, paidCount: 100, failedCount: 0, recoveredCount: 0, writeOffAmount: 0n }), "saga-1" as unknown as never);
      expect(() =>
        dist.complete(new FinalTotals({ totalDistributed: 100000n, totalFailed: 0n, totalRecovered: 0n, paidCount: 100, failedCount: 0, recoveredCount: 0, writeOffAmount: 0n }), "saga-1" as unknown as never),
      ).toThrow(DistributionInvalidStatusError);
    });
  });

  describe("fail", () => {
    it("transitions Executing -> Failed with valid totals", () => {
      const dist = materializedDistribution();
      dist.execute({ sagaOptions: {} }, "saga-1" as unknown as never);
      dist.fail(
        new FinalTotals({ totalDistributed: 0n, totalFailed: 100000n, totalRecovered: 0n, paidCount: 0, failedCount: 100, recoveredCount: 0, writeOffAmount: 0n }),
        "saga-1" as unknown as never,
      );
      expect(dist.status).toBe(DistributionStatus.Failed);
    });

    it("rejects fail from Draft", () => {
      const dist = makeDistribution();
      expect(() =>
        dist.fail(new FinalTotals({ totalDistributed: 0n, totalFailed: 100000n, totalRecovered: 0n, paidCount: 0, failedCount: 100, recoveredCount: 0, writeOffAmount: 0n }), "saga-1" as unknown as never),
      ).toThrow(DistributionInvalidStatusError);
    });
  });

  describe("cancel", () => {
    it("cancels from Draft", () => {
      const dist = makeDistribution();
      dist.cancel("changed mind", "manager-1");
      expect(dist.status).toBe(DistributionStatus.Cancelled);
    });

    it("cancels from Approved", () => {
      const dist = makeDistribution();
      dist.approve({ approvals: [{ approverId: "a1", keyId: "k1", signature: "s1", signedAt: Date.now() }] }, 1, "journal-1");
      dist.cancel("board decision", "board-1");
      expect(dist.status).toBe(DistributionStatus.Cancelled);
    });

    it("cancels from RecipientsMaterialized", () => {
      const dist = materializedDistribution();
      dist.cancel("snapshot error", "manager-1");
      expect(dist.status).toBe(DistributionStatus.Cancelled);
    });

    it("rejects cancel from Executing", () => {
      const dist = materializedDistribution();
      dist.execute({ sagaOptions: {} }, "saga-1" as unknown as never);
      expect(() => dist.cancel("want to", "manager-1")).toThrow(DistributionInvalidStatusError);
    });

    it("rejects cancel from Completed", () => {
      const dist = materializedDistribution();
      dist.execute({ sagaOptions: {} }, "saga-1" as unknown as never);
      dist.complete(new FinalTotals({ totalDistributed: 100000n, totalFailed: 0n, totalRecovered: 0n, paidCount: 100, failedCount: 0, recoveredCount: 0, writeOffAmount: 0n }), "saga-1" as unknown as never);
      expect(() => dist.cancel("too late", "manager-1")).toThrow(DistributionInvalidStatusError);
    });
  });

  describe("reconcile", () => {
    it("produces a reconciled event with match", () => {
      const dist = makeDistribution();
      dist.reconcile(100000n, 100000n);
      expect(dist.version).toBe(2);
    });

    it("produces a reconciled event with discrepancy", () => {
      const dist = makeDistribution();
      dist.reconcile(100000n, 99999n);
      expect(dist.version).toBe(2);
    });
  });

  describe("loadFromHistory (event replay)", () => {
    it("reconstructs state from events", () => {
      const original = makeDistribution(makeId("replay-1"));
      original.approve({ approvals: [{ approverId: "a1", keyId: "k1", signature: "s1", signedAt: Date.now() }] }, 1, "j-1");
      original.materializeRecipients("snap-1", 100000n, 50, "hash-1");
      original.execute({ sagaOptions: {} }, "saga-1" as unknown as never);
      original.complete(new FinalTotals({ totalDistributed: 100000n, totalFailed: 0n, totalRecovered: 0n, paidCount: 50, failedCount: 0, recoveredCount: 0, writeOffAmount: 0n }), "saga-1" as unknown as never);

      const events = [...original.getUncommittedEvents()] as DomainEvent[];
      original.markEventsAsCommitted();

      const replayed = DistributionAggregate.loadFromHistory(makeId("replay-1"), events);
      expect(replayed.status).toBe(DistributionStatus.Completed);
      expect(replayed.version).toBe(5);
      expect((replayed as unknown as { materializationManifestHash: string | null }).materializationManifestHash).toBe("hash-1");
      expect((replayed as unknown as { recipientCount: number }).recipientCount).toBe(50);
    });

    it("replays cancel flow", () => {
      const original = makeDistribution(makeId("replay-cancel"));
      original.cancel("reason", "actor");
      const events = [...original.getUncommittedEvents()] as DomainEvent[];
      original.markEventsAsCommitted();

      const replayed = DistributionAggregate.loadFromHistory(makeId("replay-cancel"), events);
      expect(replayed.status).toBe(DistributionStatus.Cancelled);
      expect(replayed.version).toBe(2);
    });

    it("replays fail flow", () => {
      const original = materializedDistribution(makeId("replay-fail"));
      original.execute({ sagaOptions: {} }, "saga-1" as unknown as never);
      original.fail(new FinalTotals({ totalDistributed: 0n, totalFailed: 100000n, totalRecovered: 0n, paidCount: 0, failedCount: 100, recoveredCount: 0, writeOffAmount: 0n }), "saga-1" as unknown as never);
      const events = [...original.getUncommittedEvents()] as DomainEvent[];
      original.markEventsAsCommitted();

      const replayed = DistributionAggregate.loadFromHistory(makeId("replay-fail"), events);
      expect(replayed.status).toBe(DistributionStatus.Failed);
    });
  });

  describe("version tracking", () => {
    it("increments version through full lifecycle", () => {
      const dist = makeDistribution();
      expect(dist.version).toBe(1);
      dist.approve({ approvals: [{ approverId: "a1", keyId: "k1", signature: "s1", signedAt: Date.now() }] }, 1, "j-1");
      expect(dist.version).toBe(2);
      dist.materializeRecipients("snap-1", 100000n, 100, "hash");
      expect(dist.version).toBe(3);
      dist.execute({ sagaOptions: {} }, "saga-1" as unknown as never);
      expect(dist.version).toBe(4);
      dist.complete(new FinalTotals({ totalDistributed: 100000n, totalFailed: 0n, totalRecovered: 0n, paidCount: 100, failedCount: 0, recoveredCount: 0, writeOffAmount: 0n }), "saga-1" as unknown as never);
      expect(dist.version).toBe(5);
    });

    it("tracks uncommitted events count", () => {
      const dist = makeDistribution();
      expect(dist.getUncommittedEvents()).toHaveLength(1);

      dist.approve({ approvals: [{ approverId: "a1", keyId: "k1", signature: "s1", signedAt: Date.now() }] }, 1, "j-1");
      expect(dist.getUncommittedEvents()).toHaveLength(2);

      dist.markEventsAsCommitted();
      expect(dist.getUncommittedEvents()).toHaveLength(0);
    });
  });

  describe("state machine exhaustiveness (all valid transitions)", () => {
    it("covers all 7 valid transitions", () => {
      const cases: Array<{ from: DistributionStatus; to: DistributionStatus; act: (d: DistributionAggregate) => void }> = [
        { from: DistributionStatus.Draft, to: DistributionStatus.Approved, act: (d) => d.approve({ approvals: [] }, 1, "j-1") },
        { from: DistributionStatus.Draft, to: DistributionStatus.Cancelled, act: (d) => d.cancel("x", "u") },
        { from: DistributionStatus.Approved, to: DistributionStatus.RecipientsMaterialized, act: (d) => d.materializeRecipients("s", (d as unknown as { totalAmount: bigint }).totalAmount, 1, "h") },
        { from: DistributionStatus.Approved, to: DistributionStatus.Cancelled, act: (d) => { d.cancel("x", "u"); } },
        { from: DistributionStatus.RecipientsMaterialized, to: DistributionStatus.Executing, act: (d) => d.execute({ sagaOptions: {} }, "s" as unknown as never) },
        { from: DistributionStatus.RecipientsMaterialized, to: DistributionStatus.Cancelled, act: (d) => d.cancel("x", "u") },
        { from: DistributionStatus.Executing, to: DistributionStatus.Completed, act: (d) => d.complete(new FinalTotals({ totalDistributed: 100000n, totalFailed: 0n, totalRecovered: 0n, paidCount: 1, failedCount: 0, recoveredCount: 0, writeOffAmount: 0n }), "s" as unknown as never) },
      ];
      for (const tc of cases) {
        const dist = makeDistribution();
        if (tc.from === DistributionStatus.Draft) {
          expect(() => tc.act(dist)).not.toThrow();
        } else if (tc.from === DistributionStatus.Approved) {
          dist.approve({ approvals: [] }, 1, "j-1");
          expect(() => tc.act(dist)).not.toThrow();
        } else if (tc.from === DistributionStatus.RecipientsMaterialized) {
          materializedDistribution().getUncommittedEvents();
          const d2 = materializedDistribution();
          d2.markEventsAsCommitted();
          expect(() => tc.act(d2)).not.toThrow();
        } else if (tc.from === DistributionStatus.Executing) {
          const d2 = materializedDistribution();
          d2.markEventsAsCommitted();
          d2.execute({ sagaOptions: {} }, "s" as unknown as never);
          expect(() => tc.act(d2)).not.toThrow();
        }
      }
    });
  });
});
