import { describe, it, expect, beforeEach } from "vitest";
import { ClaimStatus } from "../types";
import { DividendClaimError, ClaimNotFoundError } from "../errors";
import { InMemoryTreasuryRepository } from "../in-memory-repository";
import { TreasuryEventType } from "../events";
import DividendClaimService from "../services/dividend-claim-service";

function createMockEventBus() {
  const events: unknown[] = [];
  return { events, publish: async (e: unknown) => { events.push(e); } };
}

function lastEvent(events: unknown[]): unknown {
  return events[events.length - 1];
}

describe("DividendClaimService - Happy path", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let svc: DividendClaimService;
  const actorId = "actor-1" as never;
  const scheduleId = "schedule-1" as never;
  const investorId = "investor-1" as never;

  beforeEach(() => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    svc = new DividendClaimService(repository, events as never);
  });

  it("Initiated -> Claimed -> Paid -> Completed", async () => {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId, investorId, quantity: 100n, amount: 50000n, currency: "USD",
    });
    expect(claim.status).toBe(ClaimStatus.Initiated);

    const submitted = await svc.submitClaim(actorId as never, claim.id);
    expect(submitted.status).toBe(ClaimStatus.Claimed);
    expect(submitted.claimedAt).toBeDefined();

    const paid = await svc.payClaim(actorId as never, claim.id);
    expect(paid.status).toBe(ClaimStatus.Paid);
    expect(paid.paidAt).toBeDefined();

    const completed = await svc.completeClaim(actorId as never, claim.id);
    expect(completed.status).toBe(ClaimStatus.Completed);
    expect(completed.completedAt).toBeDefined();
  });

  it("Initiated -> Expired", async () => {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId, investorId, quantity: 100n, amount: 50000n, currency: "USD",
    });
    const expired = await svc.expireClaim(actorId as never, claim.id);
    expect(expired.status).toBe(ClaimStatus.Expired);
  });

  it("Claimed -> Disputed -> Reversed", async () => {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId, investorId, quantity: 100n, amount: 50000n, currency: "USD",
    });
    await svc.submitClaim(actorId as never, claim.id);
    const disputed = await svc.disputeClaim(actorId as never, claim.id, "test reason");
    expect(disputed.status).toBe(ClaimStatus.Disputed);
    expect(disputed.reference).toBe("test reason");

    const reversed = await svc.reverseClaim(actorId as never, claim.id);
    expect(reversed.status).toBe(ClaimStatus.Reversed);
  });

  it("Paid -> Reversed", async () => {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId, investorId, quantity: 100n, amount: 50000n, currency: "USD",
    });
    await svc.submitClaim(actorId as never, claim.id);
    await svc.payClaim(actorId as never, claim.id);
    const reversed = await svc.reverseClaim(actorId as never, claim.id);
    expect(reversed.status).toBe(ClaimStatus.Reversed);
    expect(reversed.reversedAt).toBeDefined();
  });

  it("Completed -> Reversed", async () => {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId, investorId, quantity: 100n, amount: 50000n, currency: "USD",
    });
    await svc.submitClaim(actorId as never, claim.id);
    await svc.payClaim(actorId as never, claim.id);
    await svc.completeClaim(actorId as never, claim.id);
    const reversed = await svc.reverseClaim(actorId as never, claim.id);
    expect(reversed.status).toBe(ClaimStatus.Reversed);
  });
});

describe("DividendClaimService - Receipt creation", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let svc: DividendClaimService;
  const actorId = "actor-1" as never;

  beforeEach(() => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    svc = new DividendClaimService(repository, events as never);
  });

  it("creates receipt on submitClaim", async () => {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId: "s1" as never, investorId: "i1" as never, quantity: 100n, amount: 50000n, currency: "USD",
    });
    await svc.submitClaim(actorId as never, claim.id);
    const receipts = repository.listClaimReceiptsByInvestor("i1" as never);
    expect(receipts).toHaveLength(1);
    expect(receipts[0]!.claimId).toBe(claim.id);
    expect(receipts[0]!.acknowledgedAt).toBeDefined();
  });

  it("does not create receipt on non-submit transitions", async () => {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId: "s1" as never, investorId: "i1" as never, quantity: 100n, amount: 50000n, currency: "USD",
    });
    await svc.expireClaim(actorId as never, claim.id);
    const receipts = repository.listClaimReceiptsByInvestor("i1" as never);
    expect(receipts).toHaveLength(0);
  });
});

describe("DividendClaimService - Event publishing", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let svc: DividendClaimService;
  const actorId = "actor-1" as never;

  beforeEach(() => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    svc = new DividendClaimService(repository, events as never);
  });

  it("publishes an event on initiate", async () => {
    await svc.initiateClaim(actorId as never, {
      scheduleId: "s1" as never, investorId: "i1" as never, quantity: 100n, amount: 50000n, currency: "USD",
    });
    expect(events.events.length).toBe(1);
  });

  it("publishes an event on each lifecycle transition", async () => {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId: "s1" as never, investorId: "i1" as never, quantity: 100n, amount: 50000n, currency: "USD",
    });
    await svc.submitClaim(actorId as never, claim.id);
    expect(events.events.length).toBe(2);

    await svc.payClaim(actorId as never, claim.id);
    expect(events.events.length).toBe(3);

    await svc.completeClaim(actorId as never, claim.id);
    expect(events.events.length).toBe(4);
  });

  it("publishes event on expire", async () => {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId: "s1" as never, investorId: "i1" as never, quantity: 100n, amount: 50000n, currency: "USD",
    });
    await svc.expireClaim(actorId as never, claim.id);
    expect(events.events.length).toBe(2);
  });

  it("publishes events on dispute then reverse", async () => {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId: "s1" as never, investorId: "i1" as never, quantity: 100n, amount: 50000n, currency: "USD",
    });
    await svc.submitClaim(actorId as never, claim.id);
    await svc.disputeClaim(actorId as never, claim.id);
    await svc.reverseClaim(actorId as never, claim.id);
    expect(events.events.length).toBe(4);
  });

  it("events array equals total mutation count", async () => {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId: "s1" as never, investorId: "i1" as never, quantity: 100n, amount: 50000n, currency: "USD",
    });
    await svc.submitClaim(actorId as never, claim.id);
    await svc.payClaim(actorId as never, claim.id);
    await svc.completeClaim(actorId as never, claim.id);
    expect(events.events.length).toBe(4);
  });
});

describe("DividendClaimService - Error cases", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let svc: DividendClaimService;
  const actorId = "actor-1" as never;

  beforeEach(() => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    svc = new DividendClaimService(repository, events as never);
  });

  it("submitClaim throws ClaimNotFoundError for non-existent claim", async () => {
    await expect(svc.submitClaim(actorId as never, "no-such-id" as never)).rejects.toThrow(ClaimNotFoundError);
  });

  it("payClaim throws ClaimNotFoundError for non-existent claim", async () => {
    await expect(svc.payClaim(actorId as never, "no-such-id" as never)).rejects.toThrow(ClaimNotFoundError);
  });

  it("completeClaim throws ClaimNotFoundError for non-existent claim", async () => {
    await expect(svc.completeClaim(actorId as never, "no-such-id" as never)).rejects.toThrow(ClaimNotFoundError);
  });

  it("expireClaim throws ClaimNotFoundError for non-existent claim", async () => {
    await expect(svc.expireClaim(actorId as never, "no-such-id" as never)).rejects.toThrow(ClaimNotFoundError);
  });

  it("disputeClaim throws ClaimNotFoundError for non-existent claim", async () => {
    await expect(svc.disputeClaim(actorId as never, "no-such-id" as never)).rejects.toThrow(ClaimNotFoundError);
  });

  it("reverseClaim throws ClaimNotFoundError for non-existent claim", async () => {
    await expect(svc.reverseClaim(actorId as never, "no-such-id" as never)).rejects.toThrow(ClaimNotFoundError);
  });

  it("rejects duplicate submit (already Claimed)", async () => {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId: "s1" as never, investorId: "i1" as never, quantity: 100n, amount: 50000n, currency: "USD",
    });
    await svc.submitClaim(actorId as never, claim.id);
    await expect(svc.submitClaim(actorId as never, claim.id)).rejects.toThrow(DividendClaimError);
  });

  it("rejects double pay (already Paid)", async () => {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId: "s1" as never, investorId: "i1" as never, quantity: 100n, amount: 50000n, currency: "USD",
    });
    await svc.submitClaim(actorId as never, claim.id);
    await svc.payClaim(actorId as never, claim.id);
    await expect(svc.payClaim(actorId as never, claim.id)).rejects.toThrow(DividendClaimError);
  });

  it("rejects transition from Expired", async () => {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId: "s1" as never, investorId: "i1" as never, quantity: 100n, amount: 50000n, currency: "USD",
    });
    await svc.expireClaim(actorId as never, claim.id);
    await expect(svc.submitClaim(actorId as never, claim.id)).rejects.toThrow(DividendClaimError);
    await expect(svc.payClaim(actorId as never, claim.id)).rejects.toThrow(DividendClaimError);
    await expect(svc.completeClaim(actorId as never, claim.id)).rejects.toThrow(DividendClaimError);
  });

  it("rejects transition from Reversed", async () => {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId: "s1" as never, investorId: "i1" as never, quantity: 100n, amount: 50000n, currency: "USD",
    });
    await svc.submitClaim(actorId as never, claim.id);
    await svc.payClaim(actorId as never, claim.id);
    await svc.reverseClaim(actorId as never, claim.id);
    await expect(svc.submitClaim(actorId as never, claim.id)).rejects.toThrow(DividendClaimError);
    await expect(svc.payClaim(actorId as never, claim.id)).rejects.toThrow(DividendClaimError);
    await expect(svc.completeClaim(actorId as never, claim.id)).rejects.toThrow(DividendClaimError);
  });
});

describe("DividendClaimService - Query methods", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let svc: DividendClaimService;
  const actorId = "actor-1" as never;

  beforeEach(() => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    svc = new DividendClaimService(repository, events as never);
  });

  it("getClaim returns undefined for non-existent", () => {
    expect(svc.getClaim("none" as never)).toBeUndefined();
  });

  it("getClaim returns claim after creation", async () => {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId: "s1" as never, investorId: "i1" as never, quantity: 100n, amount: 50000n, currency: "USD",
    });
    const retrieved = svc.getClaim(claim.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(claim.id);
  });

  it("getClaimReceipt exists after submit", async () => {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId: "s1" as never, investorId: "i1" as never, quantity: 100n, amount: 50000n, currency: "USD",
    });
    await svc.submitClaim(actorId as never, claim.id);
    const receipts = svc.listClaimReceiptsByInvestor(claim.investorId);
    expect(receipts).toHaveLength(1);
    const retrieved = svc.getClaimReceipt(receipts[0]!.id);
    expect(retrieved).toBeDefined();
  });
});

describe("DividendClaimService - CAS version synchronization", () => {
  let repository: InMemoryTreasuryRepository;
  let events: ReturnType<typeof createMockEventBus>;
  let svc: DividendClaimService;
  const actorId = "actor-1" as never;

  beforeEach(() => {
    repository = new InMemoryTreasuryRepository();
    events = createMockEventBus();
    svc = new DividendClaimService(repository, events as never);
  });

  it("uses CAS with correct version from fetched claim", async () => {
    const spy = import.meta.vitest ? vi.spyOn(repository, "saveClaim") : null;

    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId: "s1" as never, investorId: "i1" as never, quantity: 100n, amount: 50000n, currency: "USD",
    });

    const stored = repository.getClaim(claim.id)!;
    const v1 = stored.version;

    await svc.submitClaim(actorId as never, claim.id);
    const stored2 = repository.getClaim(claim.id)!;
    expect(stored2.version).toBe(v1 + 1);
  });

  it("version increments on each mutation", async () => {
    const claim = await svc.initiateClaim(actorId as never, {
      scheduleId: "s1" as never, investorId: "i1" as never, quantity: 100n, amount: 50000n, currency: "USD",
    });

    const vInit = repository.getClaim(claim.id)!.version;
    expect(vInit).toBe(1);

    await svc.submitClaim(actorId as never, claim.id);
    expect(repository.getClaim(claim.id)!.version).toBe(2);

    await svc.payClaim(actorId as never, claim.id);
    expect(repository.getClaim(claim.id)!.version).toBe(3);

    await svc.completeClaim(actorId as never, claim.id);
    expect(repository.getClaim(claim.id)!.version).toBe(4);
  });
});
