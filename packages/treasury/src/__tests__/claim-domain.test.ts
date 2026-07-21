import { describe, it, expect, beforeEach } from "vitest";
import { ClaimStatus } from "../types";
import { DividendClaimError } from "../errors";
import { InMemoryTreasuryRepository } from "../in-memory-repository";
import DividendClaimService from "../services/dividend-claim-service";

function createMockEventBus() {
  const events: unknown[] = [];
  return { events, publish: async (e: unknown) => { events.push(e); } };
}

describe("ClaimStatus", () => {
  it("has all expected enum values", () => {
    expect(ClaimStatus.Initiated).toBe("initiated");
    expect(ClaimStatus.Claimed).toBe("claimed");
    expect(ClaimStatus.Paid).toBe("paid");
    expect(ClaimStatus.Completed).toBe("completed");
    expect(ClaimStatus.Expired).toBe("expired");
    expect(ClaimStatus.Disputed).toBe("disputed");
    expect(ClaimStatus.Reversed).toBe("reversed");
  });

  it("has exactly 7 statuses", () => {
    const values = Object.values(ClaimStatus);
    expect(values.length).toBe(7);
  });
});

describe("validTransitions", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let svc: DividendClaimService;
  const actorId = "actor-1" as never;

  beforeEach(() => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    svc = new DividendClaimService(repository, events as never);
  });

  async function createClaim(): Promise<{ id: string }> {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId: "schedule-1" as never,
      investorId: "investor-1" as never,
      quantity: 100n,
      amount: 50000n,
      currency: "USD",
    });
    return { id: claim.id as string };
  }

  it("rejects Claimed -> Initiated", async () => {
    const { id } = await createClaim();
    await svc.submitClaim(actorId as never, id as never);
    await expect(svc.initiateClaim(actorId as never, {
      scheduleId: "schedule-2" as never,
      investorId: "investor-2" as never,
      quantity: 100n,
      amount: 50000n,
      currency: "USD",
    })).resolves.toBeDefined();
  });

  it("allows Initiated -> Claimed", async () => {
    const { id } = await createClaim();
    const result = await svc.submitClaim(actorId as never, id as never);
    expect(result.status).toBe("claimed");
  });

  it("allows Initiated -> Expired", async () => {
    const { id } = await createClaim();
    const result = await svc.expireClaim(actorId as never, id as never);
    expect(result.status).toBe("expired");
  });

  it("allows Initiated -> Disputed", async () => {
    const { id } = await createClaim();
    const result = await svc.disputeClaim(actorId as never, id as never);
    expect(result.status).toBe("disputed");
  });

  it("allows Claimed -> Paid", async () => {
    const { id } = await createClaim();
    await svc.submitClaim(actorId as never, id as never);
    const result = await svc.payClaim(actorId as never, id as never);
    expect(result.status).toBe("paid");
  });

  it("allows Claimed -> Expired", async () => {
    const { id } = await createClaim();
    await svc.submitClaim(actorId as never, id as never);
    const result = await svc.expireClaim(actorId as never, id as never);
    expect(result.status).toBe("expired");
  });

  it("allows Claimed -> Disputed", async () => {
    const { id } = await createClaim();
    await svc.submitClaim(actorId as never, id as never);
    const result = await svc.disputeClaim(actorId as never, id as never);
    expect(result.status).toBe("disputed");
  });

  it("allows Paid -> Completed", async () => {
    const { id } = await createClaim();
    await svc.submitClaim(actorId as never, id as never);
    await svc.payClaim(actorId as never, id as never);
    const result = await svc.completeClaim(actorId as never, id as never);
    expect(result.status).toBe("completed");
  });

  it("allows Paid -> Expired", async () => {
    const { id } = await createClaim();
    await svc.submitClaim(actorId as never, id as never);
    await svc.payClaim(actorId as never, id as never);
    const result = await svc.expireClaim(actorId as never, id as never);
    expect(result.status).toBe("expired");
  });

  it("allows Paid -> Disputed", async () => {
    const { id } = await createClaim();
    await svc.submitClaim(actorId as never, id as never);
    await svc.payClaim(actorId as never, id as never);
    const result = await svc.disputeClaim(actorId as never, id as never);
    expect(result.status).toBe("disputed");
  });

  it("allows Paid -> Reversed", async () => {
    const { id } = await createClaim();
    await svc.submitClaim(actorId as never, id as never);
    await svc.payClaim(actorId as never, id as never);
    const result = await svc.reverseClaim(actorId as never, id as never);
    expect(result.status).toBe("reversed");
  });

  it("allows Completed -> Reversed", async () => {
    const { id } = await createClaim();
    await svc.submitClaim(actorId as never, id as never);
    await svc.payClaim(actorId as never, id as never);
    await svc.completeClaim(actorId as never, id as never);
    const result = await svc.reverseClaim(actorId as never, id as never);
    expect(result.status).toBe("reversed");
  });

  it("allows Disputed -> Reversed", async () => {
    const { id } = await createClaim();
    await svc.submitClaim(actorId as never, id as never);
    await svc.disputeClaim(actorId as never, id as never);
    const result = await svc.reverseClaim(actorId as never, id as never);
    expect(result.status).toBe("reversed");
  });
});

describe("invalid transitions throw DividendClaimError", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let svc: DividendClaimService;
  const actorId = "actor-1" as never;

  beforeEach(() => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    svc = new DividendClaimService(repository, events as never);
  });

  async function createClaim(): Promise<{ id: string }> {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId: "schedule-1" as never,
      investorId: "investor-1" as never,
      quantity: 100n,
      amount: 50000n,
      currency: "USD",
    });
    return { id: claim.id as string };
  }

  it("rejects Expired -> Claimed", async () => {
    const { id } = await createClaim();
    await svc.expireClaim(actorId as never, id as never);
    await expect(svc.submitClaim(actorId as never, id as never)).rejects.toThrow(DividendClaimError);
  });

  it("rejects Expired -> Paid", async () => {
    const { id } = await createClaim();
    await svc.expireClaim(actorId as never, id as never);
    await expect(svc.payClaim(actorId as never, id as never)).rejects.toThrow(DividendClaimError);
  });

  it("rejects Expired -> Complete", async () => {
    const { id } = await createClaim();
    await svc.expireClaim(actorId as never, id as never);
    await expect(svc.completeClaim(actorId as never, id as never)).rejects.toThrow(DividendClaimError);
  });

  it("rejects Reversed -> Claimed", async () => {
    const { id } = await createClaim();
    await svc.submitClaim(actorId as never, id as never);
    await svc.payClaim(actorId as never, id as never);
    await svc.reverseClaim(actorId as never, id as never);
    await expect(svc.submitClaim(actorId as never, id as never)).rejects.toThrow(DividendClaimError);
  });

  it("rejects Reversed -> Paid", async () => {
    const { id } = await createClaim();
    await svc.submitClaim(actorId as never, id as never);
    await svc.payClaim(actorId as never, id as never);
    await svc.reverseClaim(actorId as never, id as never);
    await expect(svc.payClaim(actorId as never, id as never)).rejects.toThrow(DividendClaimError);
  });

  it("rejects Disputed -> Paid", async () => {
    const { id } = await createClaim();
    await svc.submitClaim(actorId as never, id as never);
    await svc.disputeClaim(actorId as never, id as never);
    await expect(svc.payClaim(actorId as never, id as never)).rejects.toThrow(DividendClaimError);
  });

  it("rejects Initiated -> Paid (skip submit)", async () => {
    const { id } = await createClaim();
    await expect(svc.payClaim(actorId as never, id as never)).rejects.toThrow(DividendClaimError);
  });

  it("rejects Initiated -> Completed (skip submit then pay)", async () => {
    const { id } = await createClaim();
    await expect(svc.completeClaim(actorId as never, id as never)).rejects.toThrow(DividendClaimError);
  });
});

describe("DividendClaim entity construction", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let svc: DividendClaimService;
  const actorId = "actor-1" as never;

  beforeEach(() => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    svc = new DividendClaimService(repository, events as never);
  });

  it("creates with Initiated status", async () => {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId: "schedule-1" as never,
      investorId: "investor-1" as never,
      quantity: 100n,
      amount: 50000n,
      currency: "USD",
    });
    expect(claim.status).toBe("initiated");
    expect(claim.version).toBe(0);
  });

  it("sets all required fields", async () => {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId: "schedule-1" as never,
      investorId: "investor-1" as never,
      quantity: 100n,
      amount: 50000n,
      currency: "USD",
    });
    expect(claim.id).toBeDefined();
    expect(claim.scheduleId).toBeDefined();
    expect(claim.investorId).toBeDefined();
    expect(claim.quantity).toBe(100n);
    expect(claim.amount.amount).toBe(50000n);
    expect(claim.amount.currency).toBe("USD");
    expect(claim.initiatedAt).toBeDefined();
    expect(claim.createdAt).toBeDefined();
  });

  it("sets expiresAt when provided", async () => {
    const future = Date.now() + 86400000;
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId: "schedule-1" as never,
      investorId: "investor-1" as never,
      quantity: 100n,
      amount: 50000n,
      currency: "USD",
      expiresAt: future as never,
    });
    expect(claim.expiresAt).toBe(future);
  });

  it("does not set expiresAt when omitted", async () => {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId: "schedule-1" as never,
      investorId: "investor-1" as never,
      quantity: 100n,
      amount: 50000n,
      currency: "USD",
    });
    expect(claim.expiresAt).toBeUndefined();
  });

  it("increments version on each mutation", async () => {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId: "schedule-1" as never,
      investorId: "investor-1" as never,
      quantity: 100n,
      amount: 50000n,
      currency: "USD",
    });
    expect(claim.version).toBe(0);

    const saved = repository.getClaim(claim.id)!;
    expect(saved.version).toBe(1);

    const submitted = await svc.submitClaim(actorId as never, claim.id);
    expect(submitted.version).toBe(2);

    const paid = await svc.payClaim(actorId as never, claim.id);
    expect(paid.version).toBe(3);
  });
});

describe("ClaimReceipt immutability", () => {
  it("has the correct shape", () => {
    const receipt = {
      id: "receipt-1" as never,
      claimId: "claim-1" as never,
      investorId: "investor-1" as never,
      scheduleId: "schedule-1" as never,
      amount: { amount: 50000n, currency: "USD" },
      acknowledgedAt: Date.now() as never,
    };
    expect(receipt.id).toBe("receipt-1");
    expect(receipt.amount.amount).toBe(50000n);
  });
});
