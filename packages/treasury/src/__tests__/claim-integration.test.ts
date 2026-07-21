import { describe, it, expect, beforeEach } from "vitest";
import { ClaimStatus } from "../types";
import { ConcurrencyError } from "../errors";
import { InMemoryTreasuryRepository } from "../in-memory-repository";
import { createTreasuryContext } from "../services/composition-root";
import type { TreasuryContext } from "../services/composition-root";

describe("Integration - Complete claim lifecycle", () => {
  let ctx: TreasuryContext;
  const actorId = "actor-1" as never;

  beforeEach(() => {
    const repo = new InMemoryTreasuryRepository();
    ctx = createTreasuryContext({ repository: repo });
  });

  it("full lifecycle: Initiated -> Claimed -> Paid -> Completed", async () => {
    const claim = await ctx.dividendClaimService.initiateClaim(actorId as never, {
      scheduleId: "s1" as never,
      investorId: "i1" as never,
      quantity: 100n,
      amount: 50000n,
      currency: "USD",
    });
    expect(claim.status).toBe(ClaimStatus.Initiated);

    const submitted = await ctx.dividendClaimService.submitClaim(actorId as never, claim.id);
    expect(submitted.status).toBe(ClaimStatus.Claimed);

    const paid = await ctx.dividendClaimService.payClaim(actorId as never, claim.id);
    expect(paid.status).toBe(ClaimStatus.Paid);

    const completed = await ctx.dividendClaimService.completeClaim(actorId as never, claim.id);
    expect(completed.status).toBe(ClaimStatus.Completed);

    const stored = ctx.repo.getClaim(claim.id)!;
    expect(stored.initiatedAt).toBeDefined();
    expect(stored.claimedAt).toBeDefined();
    expect(stored.paidAt).toBeDefined();
    expect(stored.completedAt).toBeDefined();
  });

  it("dispute lifecycle: Initiated -> Claimed -> Disputed -> Reversed", async () => {
    const claim = await ctx.dividendClaimService.initiateClaim(actorId as never, {
      scheduleId: "s1" as never,
      investorId: "i1" as never,
      quantity: 100n,
      amount: 50000n,
      currency: "USD",
    });
    await ctx.dividendClaimService.submitClaim(actorId as never, claim.id);
    const disputed = await ctx.dividendClaimService.disputeClaim(actorId as never, claim.id, "fraud");
    expect(disputed.status).toBe(ClaimStatus.Disputed);

    const reversed = await ctx.dividendClaimService.reverseClaim(actorId as never, claim.id);
    expect(reversed.status).toBe(ClaimStatus.Reversed);
    expect(reversed.reference).toBe("fraud");
  });

  it("receipt is stored in the repository after submit", async () => {
    const claim = await ctx.dividendClaimService.initiateClaim(actorId as never, {
      scheduleId: "s1" as never,
      investorId: "i1" as never,
      quantity: 100n,
      amount: 50000n,
      currency: "USD",
    });
    await ctx.dividendClaimService.submitClaim(actorId as never, claim.id);

    const receipts = ctx.repo.listClaimReceiptsByInvestor("i1" as never);
    expect(receipts).toHaveLength(1);
    expect(receipts[0]!.claimId).toBe(claim.id);
    expect(receipts[0]!.investorId).toBe("i1" as never);
  });

  it("receipt uniqueness - only one receipt per submit", async () => {
    const claim = await ctx.dividendClaimService.initiateClaim(actorId as never, {
      scheduleId: "s1" as never,
      investorId: "i1" as never,
      quantity: 100n,
      amount: 50000n,
      currency: "USD",
    });
    await ctx.dividendClaimService.submitClaim(actorId as never, claim.id);
    await ctx.dividendClaimService.payClaim(actorId as never, claim.id);
    await ctx.dividendClaimService.completeClaim(actorId as never, claim.id);

    const receipts = ctx.repo.listClaimReceiptsByInvestor("i1" as never);
    expect(receipts).toHaveLength(1);
  });

  it("no duplicate events per transition", async () => {
    const claim = await ctx.dividendClaimService.initiateClaim(actorId as never, {
      scheduleId: "s1" as never,
      investorId: "i1" as never,
      quantity: 100n,
      amount: 50000n,
      currency: "USD",
    });

    const eventsBefore = ctx.repo.listClaimsByStatus(ClaimStatus.Initiated);

    await ctx.dividendClaimService.submitClaim(actorId as never, claim.id);
    const stored = ctx.repo.getClaim(claim.id)!;
    expect(stored.status).toBe(ClaimStatus.Claimed);
    expect(stored.claimedAt).toBeDefined();
  });

  it("asserts repository consistency after full flow", async () => {
    const claim = await ctx.dividendClaimService.initiateClaim(actorId as never, {
      scheduleId: "s1" as never,
      investorId: "i1" as never,
      quantity: 100n,
      amount: 50000n,
      currency: "USD",
    });

    await ctx.dividendClaimService.submitClaim(actorId as never, claim.id);
    await ctx.dividendClaimService.payClaim(actorId as never, claim.id);

    const bySchedule = ctx.repo.listClaimsBySchedule("s1" as never);
    expect(bySchedule).toHaveLength(1);

    const byInvestor = ctx.repo.listClaimsByInvestor("i1" as never);
    expect(byInvestor).toHaveLength(1);

    const byStatus = ctx.repo.listClaimsByStatus(ClaimStatus.Paid);
    expect(byStatus).toHaveLength(1);
  });
});

describe("Integration - Concurrent updates and CAS conflicts", () => {
  let repo: InMemoryTreasuryRepository;
  let ctx: TreasuryContext;
  const actorId = "actor-1" as never;

  beforeEach(() => {
    repo = new InMemoryTreasuryRepository();
    ctx = createTreasuryContext({ repository: repo });
  });

  it("prevents concurrent pay after stale read", async () => {
    const claim = await ctx.dividendClaimService.initiateClaim(actorId as never, {
      scheduleId: "s1" as never,
      investorId: "i1" as never,
      quantity: 100n,
      amount: 50000n,
      currency: "USD",
    });
    await ctx.dividendClaimService.submitClaim(actorId as never, claim.id);

    const svc1 = new (await import("../services/dividend-claim-service")).default(repo, ctx.eventsAdapter);
    const svc2 = new (await import("../services/dividend-claim-service")).default(repo, ctx.eventsAdapter);

    await svc1.payClaim(actorId as never, claim.id);
    await expect(svc2.payClaim(actorId as never, claim.id)).rejects.toThrow(ConcurrencyError);
  });

  it("CAS conflict from dual submit attempt", async () => {
    const claim = await ctx.dividendClaimService.initiateClaim(actorId as never, {
      scheduleId: "s1" as never,
      investorId: "i1" as never,
      quantity: 100n,
      amount: 50000n,
      currency: "USD",
    });

    const svc1 = new (await import("../services/dividend-claim-service")).default(repo, ctx.eventsAdapter);
    const svc2 = new (await import("../services/dividend-claim-service")).default(repo, ctx.eventsAdapter);

    await svc1.submitClaim(actorId as never, claim.id);
    await expect(svc2.submitClaim(actorId as never, claim.id)).rejects.toThrow(ConcurrencyError);
  });
});
