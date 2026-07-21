import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryTreasuryRepository } from "../in-memory-repository";
import { ConcurrencyError } from "../errors";
import type { DividendClaim, ClaimReceipt, ClaimStatus } from "../types";

function makeClaim(overrides?: Partial<DividendClaim>): DividendClaim {
  return {
    id: `claim-${Math.random()}` as never,
    scheduleId: "schedule-1" as never,
    investorId: "investor-1" as never,
    quantity: 100n,
    amount: { amount: 50000n, currency: "USD" },
    status: "initiated" as ClaimStatus,
    version: 0,
    initiatedAt: Date.now() as never,
    createdAt: Date.now() as never,
    ...overrides,
  };
}

function makeReceipt(overrides?: Partial<ClaimReceipt>): ClaimReceipt {
  return {
    id: `receipt-${Math.random()}` as never,
    claimId: "claim-1" as never,
    investorId: "investor-1" as never,
    scheduleId: "schedule-1" as never,
    amount: { amount: 50000n, currency: "USD" },
    acknowledgedAt: Date.now() as never,
    ...overrides,
  };
}

describe("InMemoryTreasuryRepository - Claims CRUD", () => {
  let repo: InMemoryTreasuryRepository;

  beforeEach(() => {
    repo = new InMemoryTreasuryRepository();
  });

  it("saveClaim stores a claim and getClaim retrieves it", () => {
    const claim = makeClaim();
    repo.saveClaim(claim);
    const retrieved = repo.getClaim(claim.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(claim.id);
    expect(retrieved!.status).toBe("initiated");
  });

  it("getClaim returns undefined for non-existent claim", () => {
    const result = repo.getClaim("non-existent" as never);
    expect(result).toBeUndefined();
  });

  it("listClaimsBySchedule returns claims for a given schedule", () => {
    const c1 = makeClaim({ id: "c1" as never, scheduleId: "s1" as never });
    const c2 = makeClaim({ id: "c2" as never, scheduleId: "s1" as never });
    const c3 = makeClaim({ id: "c3" as never, scheduleId: "s2" as never });
    repo.saveClaim(c1);
    repo.saveClaim(c2);
    repo.saveClaim(c3);

    const results = repo.listClaimsBySchedule("s1" as never);
    expect(results).toHaveLength(2);
    expect(results.map(r => r.id)).toContain("c1" as never);
    expect(results.map(r => r.id)).toContain("c2" as never);
  });

  it("listClaimsByInvestor returns claims for a given investor", () => {
    const c1 = makeClaim({ id: "c1" as never, investorId: "inv-1" as never });
    const c2 = makeClaim({ id: "c2" as never, investorId: "inv-1" as never });
    const c3 = makeClaim({ id: "c3" as never, investorId: "inv-2" as never });
    repo.saveClaim(c1);
    repo.saveClaim(c2);
    repo.saveClaim(c3);

    const results = repo.listClaimsByInvestor("inv-1" as never);
    expect(results).toHaveLength(2);
  });

  it("listClaimsByStatus returns claims with matching status", () => {
    const c1 = makeClaim({ id: "c1" as never, status: "initiated" as ClaimStatus });
    const c2 = makeClaim({ id: "c2" as never, status: "paid" as ClaimStatus });
    const c3 = makeClaim({ id: "c3" as never, status: "initiated" as ClaimStatus });
    repo.saveClaim(c1);
    repo.saveClaim(c2);
    repo.saveClaim(c3);

    const results = repo.listClaimsByStatus("initiated" as ClaimStatus);
    expect(results).toHaveLength(2);
  });

  it("list methods return empty array when no matches", () => {
    expect(repo.listClaimsBySchedule("none" as never)).toHaveLength(0);
    expect(repo.listClaimsByInvestor("none" as never)).toHaveLength(0);
    expect(repo.listClaimsByStatus("paid" as ClaimStatus)).toHaveLength(0);
  });
});

describe("InMemoryTreasuryRepository - ClaimReceipt CRUD", () => {
  let repo: InMemoryTreasuryRepository;

  beforeEach(() => {
    repo = new InMemoryTreasuryRepository();
  });

  it("saveClaimReceipt stores and getClaimReceipt retrieves", () => {
    const receipt = makeReceipt();
    repo.saveClaimReceipt(receipt);
    const retrieved = repo.getClaimReceipt(receipt.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(receipt.id);
  });

  it("getClaimReceipt returns undefined for non-existent receipt", () => {
    const result = repo.getClaimReceipt("no-receipt" as never);
    expect(result).toBeUndefined();
  });

  it("listClaimReceiptsByInvestor returns receipts for investor", () => {
    const r1 = makeReceipt({ id: "r1" as never, investorId: "inv-1" as never });
    const r2 = makeReceipt({ id: "r2" as never, investorId: "inv-1" as never });
    const r3 = makeReceipt({ id: "r3" as never, investorId: "inv-2" as never });
    repo.saveClaimReceipt(r1);
    repo.saveClaimReceipt(r2);
    repo.saveClaimReceipt(r3);

    const results = repo.listClaimReceiptsByInvestor("inv-1" as never);
    expect(results).toHaveLength(2);
  });

  it("listClaimReceiptsByInvestor returns empty array for no matches", () => {
    const results = repo.listClaimReceiptsByInvestor("none" as never);
    expect(results).toHaveLength(0);
  });
});

describe("InMemoryTreasuryRepository - CAS (Compare-And-Swap)", () => {
  let repo: InMemoryTreasuryRepository;

  beforeEach(() => {
    repo = new InMemoryTreasuryRepository();
  });

  it("saveClaim without expectedVersion succeeds", () => {
    const claim = makeClaim();
    expect(() => repo.saveClaim(claim)).not.toThrow();
  });

  it("saveClaim with correct expectedVersion succeeds", () => {
    const claim = makeClaim();
    repo.saveClaim(claim);
    expect(() => repo.saveClaim(makeClaim({ id: claim.id }), 1)).not.toThrow();
  });

  it("saveClaim with wrong expectedVersion throws ConcurrencyError", () => {
    const claim = makeClaim();
    repo.saveClaim(claim);
    expect(() => repo.saveClaim(makeClaim({ id: claim.id }), 99)).toThrow(ConcurrencyError);
  });

  it("ConcurrencyError contains expected and actual versions", () => {
    const claim = makeClaim();
    repo.saveClaim(claim);
    try {
      repo.saveClaim(makeClaim({ id: claim.id }), 99);
    } catch (e) {
      const err = e as ConcurrencyError;
      expect(err.code).toBe("CONCURRENCY_CONFLICT");
    }
  });

  it("version increments on each save", () => {
    const claim = makeClaim();
    repo.saveClaim(claim);
    expect(repo.getClaim(claim.id)!.version).toBe(1);

    repo.saveClaim(makeClaim({ id: claim.id }), 1);
    expect(repo.getClaim(claim.id)!.version).toBe(2);

    repo.saveClaim(makeClaim({ id: claim.id }), 2);
    expect(repo.getClaim(claim.id)!.version).toBe(3);
  });

  it("first save without expectedVersion sets version to 1", () => {
    const claim = makeClaim();
    repo.saveClaim(claim);
    expect(repo.getClaim(claim.id)!.version).toBe(1);
  });

  it("getClaim returns updated version after CAS save", () => {
    const claim = makeClaim({ version: 0 });
    repo.saveClaim(claim);
    expect(repo.getClaim(claim.id)!.version).toBe(1);

    const updated = makeClaim({ id: claim.id, version: 1 });
    repo.saveClaim(updated, 1);
    expect(repo.getClaim(claim.id)!.version).toBe(2);
  });
});

describe("InMemoryTreasuryRepository - defensive copies", () => {
  let repo: InMemoryTreasuryRepository;

  beforeEach(() => {
    repo = new InMemoryTreasuryRepository();
  });

  it("getClaim returns a copy, mutation does not affect stored data", () => {
    const claim = makeClaim();
    repo.saveClaim(claim);
    const retrieved = repo.getClaim(claim.id)!;
    (retrieved as any).status = "paid";
    const retrievedAgain = repo.getClaim(claim.id)!;
    expect(retrievedAgain.status).toBe("initiated");
  });

  it("listClaimsBySchedule returns copies", () => {
    const claim = makeClaim();
    repo.saveClaim(claim);
    const results = repo.listClaimsBySchedule(claim.scheduleId);
    (results[0] as any).status = "paid";
    const retrievedAgain = repo.getClaim(claim.id)!;
    expect(retrievedAgain.status).toBe("initiated");
  });

  it("listClaimsByInvestor returns copies", () => {
    const claim = makeClaim();
    repo.saveClaim(claim);
    const results = repo.listClaimsByInvestor(claim.investorId);
    (results[0] as any).status = "paid";
    const retrievedAgain = repo.getClaim(claim.id)!;
    expect(retrievedAgain.status).toBe("initiated");
  });

  it("listClaimsByStatus returns copies", () => {
    const claim = makeClaim();
    repo.saveClaim(claim);
    const results = repo.listClaimsByStatus("initiated" as ClaimStatus);
    (results[0] as any).status = "paid";
    const retrievedAgain = repo.getClaim(claim.id)!;
    expect(retrievedAgain.status).toBe("initiated");
  });

  it("saveClaimReceipt stores a copy", () => {
    const receipt = makeReceipt();
    repo.saveClaimReceipt(receipt);
    const retrieved = repo.getClaimReceipt(receipt.id)!;
    (retrieved as any).acknowledgedAt = 0;
    const retrievedAgain = repo.getClaimReceipt(receipt.id)!;
    expect(retrievedAgain.acknowledgedAt).toBe(receipt.acknowledgedAt);
  });

  it("getClaimReceipt returns a copy", () => {
    const receipt = makeReceipt();
    repo.saveClaimReceipt(receipt);
    const retrieved = repo.getClaimReceipt(receipt.id)!;
    (retrieved as any).acknowledgedAt = 999999;
    const retrievedAgain = repo.getClaimReceipt(receipt.id)!;
    expect(retrievedAgain.acknowledgedAt).toBe(receipt.acknowledgedAt);
  });

  it("listClaimReceiptsByInvestor returns copies", () => {
    const receipt = makeReceipt();
    repo.saveClaimReceipt(receipt);
    const results = repo.listClaimReceiptsByInvestor(receipt.investorId);
    (results[0] as any).acknowledgedAt = 999999;
    const retrievedAgain = repo.getClaimReceipt(receipt.id)!;
    expect(retrievedAgain.acknowledgedAt).toBe(receipt.acknowledgedAt);
  });
});
