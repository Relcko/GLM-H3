import { describe, it, expect } from "vitest";
import {
  initiateClaimAction,
  submitClaimAction,
  payClaimAction,
  completeClaimAction,
  expireClaimAction,
  disputeClaimAction,
  reverseClaimAction,
  getClaimAction,
  listClaimsByScheduleAction,
  listClaimsByStatusAction,
} from "../claim-actions";
import { FinancialError } from "../errors";

const actorId = "test-actor";

describe("Claim API Adapter - Happy path", () => {
  let claimId: string;

  it("initiateClaimAction creates a claim and returns ClaimResponse DTO", async () => {
    const result = await initiateClaimAction(
      {
        scheduleId: "schedule-1",
        investorId: "investor-1",
        quantity: "100",
        amount: "50000",
        currency: "USD",
      },
      actorId,
    );

    expect(result.id).toBeDefined();
    expect(result.scheduleId).toBe("schedule-1");
    expect(result.investorId).toBe("investor-1");
    expect(result.quantity).toBe("100");
    expect(result.amount).toBe("50000");
    expect(result.currency).toBe("USD");
    expect(result.status).toBe("initiated");
    expect(result.version).toBeGreaterThanOrEqual(0);
    expect(result.initiatedAt).toBeGreaterThan(0);
    expect(result.createdAt).toBeGreaterThan(0);

    claimId = result.id;
  });

  it("submitClaimAction transitions to claimed", async () => {
    const result = await submitClaimAction(claimId, actorId);
    expect(result.id).toBe(claimId);
    expect(result.status).toBe("claimed");
    expect(result.claimedAt).toBeGreaterThan(0);
  });

  it("payClaimAction transitions to paid", async () => {
    const result = await payClaimAction(claimId, actorId);
    expect(result.id).toBe(claimId);
    expect(result.status).toBe("paid");
    expect(result.paidAt).toBeGreaterThan(0);
  });

  it("completeClaimAction transitions to completed", async () => {
    const result = await completeClaimAction(claimId, actorId);
    expect(result.id).toBe(claimId);
    expect(result.status).toBe("completed");
    expect(result.completedAt).toBeGreaterThan(0);
  });
});

describe("Claim API Adapter - Alternative paths", () => {
  let claimId: string;

  it("initiate -> expire", async () => {
    const claim = await initiateClaimAction(
      { scheduleId: "s2", investorId: "i2", quantity: "50", amount: "25000", currency: "USD" },
      actorId,
    );
    claimId = claim.id;

    const expired = await expireClaimAction(claimId, actorId);
    expect(expired.status).toBe("expired");
  });
});

describe("Claim API Adapter - Dispute -> Reverse", () => {
  let claimId: string;

  it("initiate -> submit -> dispute", async () => {
    const claim = await initiateClaimAction(
      { scheduleId: "s3", investorId: "i3", quantity: "75", amount: "37500", currency: "USD" },
      actorId,
    );
    claimId = claim.id;

    await submitClaimAction(claimId, actorId);

    const disputed = await disputeClaimAction(claimId, actorId, "customer complaint");
    expect(disputed.status).toBe("disputed");
    expect(disputed.reference).toBe("customer complaint");
  });

  it("reverse disputed claim", async () => {
    const reversed = await reverseClaimAction(claimId, actorId);
    expect(reversed.status).toBe("reversed");
    expect(reversed.reversedAt).toBeGreaterThan(0);
  });
});

describe("Claim API Adapter - Query methods", () => {
  let claimId: string;

  it("getClaimAction returns undefined for non-existent", async () => {
    const result = getClaimAction("non-existent");
    expect(result).toBeUndefined();
  });

  it("getClaimAction returns claim by ID", async () => {
    const claim = await initiateClaimAction(
      { scheduleId: "s4", investorId: "i4", quantity: "200", amount: "100000", currency: "USD" },
      actorId,
    );
    claimId = claim.id;

    const retrieved = getClaimAction(claimId);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(claimId);
    expect(retrieved!.status).toBe("initiated");
  });

  it("listClaimsByScheduleAction returns matching claims", async () => {
    const results = listClaimsByScheduleAction("s4");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every(c => c.scheduleId === "s4")).toBe(true);
  });

  it("listClaimsByStatusAction returns matching claims", async () => {
    const results = listClaimsByStatusAction("initiated");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every(c => c.status === "initiated")).toBe(true);
  });
});

describe("Claim API Adapter - Error translation", () => {
  it("returns FinancialError(404) for non-existent claim operation", async () => {
    try {
      await submitClaimAction("no-such-claim", actorId);
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(FinancialError);
      expect((error as FinancialError).statusCode).toBe(404);
    }
  });

  it("returns FinancialError(422) for invalid state transition", async () => {
    const claim = await initiateClaimAction(
      { scheduleId: "s5", investorId: "i5", quantity: "10", amount: "5000", currency: "USD" },
      actorId,
    );
    try {
      await payClaimAction(claim.id, actorId);
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(FinancialError);
      expect((error as FinancialError).statusCode).toBe(422);
    }
  });

  it("returns FinancialError(409) for CAS conflict", async () => {
    const claim = await initiateClaimAction(
      { scheduleId: "s6", investorId: "i6", quantity: "10", amount: "5000", currency: "USD" },
      actorId,
    );
    await submitClaimAction(claim.id, actorId);
    await payClaimAction(claim.id, actorId);

    try {
      await payClaimAction(claim.id, actorId);
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(FinancialError);
      expect((error as FinancialError).statusCode).toBe(409);
    }
  });
});
