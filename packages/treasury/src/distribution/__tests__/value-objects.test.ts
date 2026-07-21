import { describe, it, expect } from "vitest";
import { Money, EligibilityProof, FinalTotals, DistributionStatus, RecipientStatus, ScheduleStatus, RecoveryStrategy, AllocationMethod, DistributionType, SagaState } from "../domain/value-objects";

describe("Money", () => {
  it("creates from minor units", () => {
    const m = Money.fromMinor(1000n, "USDT");
    expect(m.amount).toBe(1000n);
    expect(m.currency).toBe("USDT");
  });

  it("creates with constructor", () => {
    const m = new Money(50000n, "USD");
    expect(m.amount).toBe(50000n);
    expect(m.currency).toBe("USD");
  });

  it("is equal when same amount and currency", () => {
    const a = Money.fromMinor(1000n, "USDT");
    const b = Money.fromMinor(1000n, "USDT");
    expect(a.equals(b)).toBe(true);
  });

  it("is not equal when amount differs", () => {
    const a = Money.fromMinor(1000n, "USDT");
    const b = Money.fromMinor(2000n, "USDT");
    expect(a.equals(b)).toBe(false);
  });

  it("is not equal when currency differs", () => {
    const a = Money.fromMinor(1000n, "USDT");
    const b = Money.fromMinor(1000n, "USD");
    expect(a.equals(b)).toBe(false);
  });

  it("is not equal to null", () => {
    const m = Money.fromMinor(1000n, "USDT");
    expect(m.equals(null)).toBe(false);
  });

  it("is not equal to undefined", () => {
    const m = Money.fromMinor(1000n, "USDT");
    expect(m.equals(undefined)).toBe(false);
  });

  it("is not equal to a different value object type", () => {
    const m = Money.fromMinor(1000n, "USDT");
    const totals = new FinalTotals({ totalDistributed: 1000n, totalFailed: 0n, totalRecovered: 0n, paidCount: 1, failedCount: 0, recoveredCount: 0, writeOffAmount: 0n });
    expect(m.equals(totals)).toBe(false);
  });
});

describe("EligibilityProof", () => {
  it("creates with data", () => {
    const proof = EligibilityProof.create({ snapshotId: "snap-1", positionIndex: 0, quantity: 100n, perUnitAmount: 500n, hash: "abc123" });
    expect(proof.snapshotId).toBe("snap-1");
    expect(proof.positionIndex).toBe(0);
    expect(proof.quantity).toBe(100n);
    expect(proof.perUnitAmount).toBe(500n);
    expect(proof.hash).toBe("abc123");
  });

  it("is equal when data matches", () => {
    const a = EligibilityProof.create({ snapshotId: "snap-1", positionIndex: 0, quantity: 100n, perUnitAmount: 500n, hash: "abc123" });
    const b = EligibilityProof.create({ snapshotId: "snap-1", positionIndex: 0, quantity: 100n, perUnitAmount: 500n, hash: "abc123" });
    expect(a.equals(b)).toBe(true);
  });

  it("is not equal when position index differs", () => {
    const a = EligibilityProof.create({ snapshotId: "snap-1", positionIndex: 0, quantity: 100n, perUnitAmount: 500n, hash: "abc123" });
    const b = EligibilityProof.create({ snapshotId: "snap-1", positionIndex: 1, quantity: 100n, perUnitAmount: 500n, hash: "abc123" });
    expect(a.equals(b)).toBe(false);
  });
});

describe("FinalTotals", () => {
  it("creates with data", () => {
    const totals = new FinalTotals({ totalDistributed: 100000n, totalFailed: 500n, totalRecovered: 0n, paidCount: 99, failedCount: 1, recoveredCount: 0, writeOffAmount: 0n });
    expect(totals.totalDistributed).toBe(100000n);
    expect(totals.paidCount).toBe(99);
    expect(totals.writeOffAmount).toBe(0n);
  });

  it("is equal when data matches", () => {
    const a = new FinalTotals({ totalDistributed: 100000n, totalFailed: 500n, totalRecovered: 0n, paidCount: 99, failedCount: 1, recoveredCount: 0, writeOffAmount: 0n });
    const b = new FinalTotals({ totalDistributed: 100000n, totalFailed: 500n, totalRecovered: 0n, paidCount: 99, failedCount: 1, recoveredCount: 0, writeOffAmount: 0n });
    expect(a.equals(b)).toBe(true);
  });

  it("is not equal when totals differ", () => {
    const a = new FinalTotals({ totalDistributed: 100000n, totalFailed: 500n, totalRecovered: 0n, paidCount: 99, failedCount: 1, recoveredCount: 0, writeOffAmount: 0n });
    const b = new FinalTotals({ totalDistributed: 99999n, totalFailed: 500n, totalRecovered: 0n, paidCount: 99, failedCount: 1, recoveredCount: 0, writeOffAmount: 0n });
    expect(a.equals(b)).toBe(false);
  });
});

describe("DistributionStatus", () => {
  it("has all expected enum values", () => {
    expect(DistributionStatus.Draft).toBe("draft");
    expect(DistributionStatus.Approved).toBe("approved");
    expect(DistributionStatus.RecipientsMaterialized).toBe("recipients_materialized");
    expect(DistributionStatus.Executing).toBe("executing");
    expect(DistributionStatus.Completed).toBe("completed");
    expect(DistributionStatus.Failed).toBe("failed");
    expect(DistributionStatus.Cancelled).toBe("cancelled");
  });

  it("has exactly 7 statuses", () => {
    expect(Object.values(DistributionStatus).length).toBe(7);
  });
});

describe("RecipientStatus", () => {
  it("has all expected enum values", () => {
    expect(RecipientStatus.Pending).toBe("pending");
    expect(RecipientStatus.Paid).toBe("paid");
    expect(RecipientStatus.Failed).toBe("failed");
    expect(RecipientStatus.Recovered).toBe("recovered");
  });

  it("has exactly 4 statuses", () => {
    expect(Object.values(RecipientStatus).length).toBe(4);
  });
});

describe("ScheduleStatus", () => {
  it("has all expected enum values", () => {
    expect(ScheduleStatus.Draft).toBe("draft");
    expect(ScheduleStatus.Scheduled).toBe("scheduled");
    expect(ScheduleStatus.Executing).toBe("executing");
    expect(ScheduleStatus.Completed).toBe("completed");
    expect(ScheduleStatus.Cancelled).toBe("cancelled");
  });

  it("has exactly 5 statuses", () => {
    expect(Object.values(ScheduleStatus).length).toBe(5);
  });
});

describe("RecoveryStrategy", () => {
  it("has all expected enum values", () => {
    expect(RecoveryStrategy.ReAttempt).toBe("re_attempt");
    expect(RecoveryStrategy.Manual).toBe("manual");
    expect(RecoveryStrategy.WriteOff).toBe("write_off");
  });

  it("has exactly 3 strategies", () => {
    expect(Object.values(RecoveryStrategy).length).toBe(3);
  });
});

describe("AllocationMethod", () => {
  it("has all expected enum values", () => {
    expect(AllocationMethod.ProRata).toBe("pro_rata");
    expect(AllocationMethod.Fixed).toBe("fixed");
    expect(AllocationMethod.Tiered).toBe("tiered");
  });

  it("has exactly 3 methods", () => {
    expect(Object.values(AllocationMethod).length).toBe(3);
  });
});

describe("DistributionType", () => {
  it("has all expected enum values", () => {
    expect(DistributionType.Dividend).toBe("dividend");
    expect(DistributionType.RevenueShare).toBe("revenue_share");
    expect(DistributionType.Buyback).toBe("buyback");
  });

  it("has exactly 3 types", () => {
    expect(Object.values(DistributionType).length).toBe(3);
  });
});

describe("SagaState", () => {
  it("has all expected enum values", () => {
    expect(SagaState.Running).toBe("running");
    expect(SagaState.Suspended).toBe("suspended");
    expect(SagaState.Compensating).toBe("compensating");
    expect(SagaState.Completed).toBe("completed");
    expect(SagaState.Failed).toBe("failed");
  });

  it("has exactly 5 states", () => {
    expect(Object.values(SagaState).length).toBe(5);
  });
});
