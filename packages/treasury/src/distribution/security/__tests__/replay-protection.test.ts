import { describe, it, expect, beforeEach, vi } from "vitest";
import { ReplayProtectionService, MAX_TIMESTAMP_AGE_MS } from "../replay-protection.service";
import type { ReplayValidationRequest } from "../replay-protection.service";
import type { IClock } from "../../infrastructure/services/clock";
import type { IIdempotencyLedger } from "../../saga/idempotency-ledger.interface";

function makeClock(fixedNow: number = 1_000_000_000_000): IClock {
  return { now: () => new Date(fixedNow), nowMs: () => fixedNow };
}

function makeRequest(overrides?: Partial<ReplayValidationRequest>): ReplayValidationRequest {
  return {
    nonce: "nonce-1",
    timestamp: 1_000_000_000_000,
    expiresAt: 2_000_000_000_000,
    commandDigest: "cd:abc123",
    approvalDigest: null,
    settlementRef: "stl:" + "a".repeat(61),
    idempotencyKey: null,
    correlationId: "corr-1",
    ...overrides,
  };
}

function makeLedger(): IIdempotencyLedger {
  const store = new Map<string, boolean>();
  return {
    exists: vi.fn(async (key: string) => store.has(key)),
    save: vi.fn(async (key: string) => { store.set(key, true); }),
    get: vi.fn(async (key: string) => store.get(key) ? { result: "processed" } : null),
  } as unknown as IIdempotencyLedger;
}

describe("ReplayProtectionService", () => {
  let clock: IClock;
  let svc: ReplayProtectionService;
  const NOW = 1_000_000_000_000;

  beforeEach(() => {
    clock = makeClock(NOW);
    svc = new ReplayProtectionService(clock);
  });

  describe("validateNonce", () => {
    it("accepts a fresh nonce", () => {
      expect(svc.validateNonce("fresh-nonce")).toBe(true);
    });

    it("rejects a duplicate nonce", () => {
      svc.validateNonce("dup-nonce");
      expect(svc.validateNonce("dup-nonce")).toBe(false);
    });

    it("rejects empty nonce", () => {
      expect(svc.validateNonce("")).toBe(false);
    });
  });

  describe("validateTimestamp", () => {
    it("accepts a recent timestamp", () => {
      expect(svc.validateTimestamp(NOW - 1000)).toBe(true);
    });

    it("rejects a timestamp in the far past", () => {
      expect(svc.validateTimestamp(NOW - MAX_TIMESTAMP_AGE_MS - 10_000)).toBe(false);
    });

    it("rejects a timestamp in the far future (skew > 5s)", () => {
      expect(svc.validateTimestamp(NOW + 10_000)).toBe(false);
    });

    it("rejects NaN timestamp", () => {
      expect(svc.validateTimestamp(NaN)).toBe(false);
    });

    it("rejects zero timestamp", () => {
      expect(svc.validateTimestamp(0)).toBe(false);
    });

    it("rejects negative timestamp", () => {
      expect(svc.validateTimestamp(-100)).toBe(false);
    });
  });

  describe("validateExpiry", () => {
    it("passes when no expiry set", () => {
      expect(svc.validateExpiry(null)).toBe(true);
    });

    it("passes when not expired", () => {
      expect(svc.validateExpiry(2_000_000_000_000)).toBe(true);
    });

    it("fails when expired", () => {
      expect(svc.validateExpiry(500_000_000_000)).toBe(false);
    });
  });

  describe("validateCommandDigest", () => {
    it("accepts a fresh digest", () => {
      expect(svc.validateCommandDigest("cd:fresh")).toBe(true);
    });

    it("rejects a duplicate digest", () => {
      svc.validateCommandDigest("cd:dup");
      expect(svc.validateCommandDigest("cd:dup")).toBe(false);
    });

    it("rejects empty digest", () => {
      expect(svc.validateCommandDigest("")).toBe(false);
    });
  });

  describe("validateApprovalDigest", () => {
    it("passes when null", () => {
      expect(svc.validateApprovalDigest(null, new Set())).toBe(true);
    });

    it("rejects duplicate approval digest", () => {
      const seen = new Set<string>();
      svc.validateApprovalDigest("ad:first", seen);
      expect(svc.validateApprovalDigest("ad:first", seen)).toBe(false);
    });

    it("rejects empty approval digest", () => {
      expect(svc.validateApprovalDigest("", new Set())).toBe(false);
    });
  });

  describe("validateSettlementRef", () => {
    it("passes when null", () => {
      expect(svc.validateSettlementRef(null)).toBe(true);
    });

    it("accepts a valid server-side ref", () => {
      const ref = "stl:" + "b".repeat(61);
      expect(svc.validateSettlementRef(ref)).toBe(true);
    });

    it("rejects a ref without prefix", () => {
      expect(svc.validateSettlementRef("no-prefix")).toBe(false);
    });

    it("rejects duplicate ref", () => {
      const ref = "stl:" + "c".repeat(61);
      svc.validateSettlementRef(ref);
      expect(svc.validateSettlementRef(ref)).toBe(false);
    });
  });

  describe("validateIdempotency", () => {
    it("passes when null", async () => {
      expect(await svc.validateIdempotency(null)).toBe(true);
    });

    it("passes when no ledger configured", async () => {
      expect(await svc.validateIdempotency("some-key")).toBe(true);
    });

    it("rejects when idempotency key already exists", async () => {
      const ledger = makeLedger();
      const svcWithLedger = new ReplayProtectionService(clock, ledger);
      const key = "existing-key";
      await ledger.save(key);
      expect(await svcWithLedger.validateIdempotency(key)).toBe(false);
    });

    it("passes when idempotency key does not exist", async () => {
      const ledger = makeLedger();
      const svcWithLedger = new ReplayProtectionService(clock, ledger);
      expect(await svcWithLedger.validateIdempotency("fresh-key")).toBe(true);
    });
  });

  describe("computeCommandDigest", () => {
    it("produces a deterministic digest", () => {
      const input = { commandType: "treasury.distribution.create", payloadHash: "hash1", nonce: "n1", timestamp: 1_000_000 };
      const d1 = svc.computeCommandDigest(input);
      const d2 = svc.computeCommandDigest(input);
      expect(d1).toBe(d2);
    });

    it("changes with different nonce", () => {
      const input1 = { commandType: "treasury.distribution.create", payloadHash: "hash1", nonce: "n1", timestamp: 1_000_000 };
      const input2 = { commandType: "treasury.distribution.create", payloadHash: "hash1", nonce: "n2", timestamp: 1_000_000 };
      expect(svc.computeCommandDigest(input1)).not.toBe(svc.computeCommandDigest(input2));
    });
  });

  describe("validateAll (integration)", () => {
    it("passes a valid request", async () => {
      const req = makeRequest();
      const result = await svc.validateAll(req);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeNull();
    });

    it("rejects duplicate nonce", async () => {
      const req = makeRequest();
      await svc.validateAll(req);
      const result = await svc.validateAll(req);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("already seen");
    });

    it("rejects stale timestamp", async () => {
      const req = makeRequest({ timestamp: NOW - MAX_TIMESTAMP_AGE_MS - 100_000 });
      const result = await svc.validateAll(req);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Timestamp");
    });

    it("rejects expired request", async () => {
      const req = makeRequest({ expiresAt: NOW - 10_000 });
      const result = await svc.validateAll(req);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("expired");
    });

    it("rejects duplicate command digest", async () => {
      const req = makeRequest({ nonce: "n1", commandDigest: "cd:dup1" });
      await svc.validateAll(req);
      const req2 = makeRequest({ nonce: "n2", commandDigest: "cd:dup1" });
      const result = await svc.validateAll(req2);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("already processed");
    });

    it("rejects duplicate settlement ref", async () => {
      const ref = "stl:" + "d".repeat(61);
      const req1 = makeRequest({ nonce: "n1", commandDigest: "cd:1", settlementRef: ref });
      await svc.validateAll(req1);
      const req2 = makeRequest({ nonce: "n2", commandDigest: "cd:2", settlementRef: ref });
      const result = await svc.validateAll(req2);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("already used");
    });

    it("rejects duplicate idempotency key", async () => {
      const ledger = makeLedger();
      const svcWithLedger = new ReplayProtectionService(clock, ledger);
      const key = "idem-key-1";
      await ledger.save(key);

      const req = makeRequest({ nonce: "n1", commandDigest: "cd:1", idempotencyKey: key });
      const result = await svcWithLedger.validateAll(req);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("already processed");
    });

    it("detects duplicate approval digest", async () => {
      const req = makeRequest({
        nonce: "n1",
        commandDigest: "cd:1",
        approvalDigest: "ad:first",
      });
      const result1 = await svc.validateAll(req);
      expect(result1.valid).toBe(true);

      const req2 = makeRequest({
        nonce: "n2",
        commandDigest: "cd:2",
        approvalDigest: "ad:first",
      });
      const result2 = await svc.validateAll(req2);
      expect(result2.valid).toBe(false);
    });
  });

  describe("state tracking", () => {
    it("hasSeenNonce returns true for seen nonce", () => {
      svc.validateNonce("seen-it");
      expect(svc.hasSeenNonce("seen-it")).toBe(true);
      expect(svc.hasSeenNonce("not-seen")).toBe(false);
    });

    it("hasSeenDigest returns true for seen digest", () => {
      svc.validateCommandDigest("cd:seen");
      expect(svc.hasSeenDigest("cd:seen")).toBe(true);
    });

    it("clear resets state", () => {
      svc.validateNonce("n1");
      svc.validateCommandDigest("cd:1");
      svc.markSettlementRefSeen("stl:ref1");
      svc.clear();
      expect(svc.hasSeenNonce("n1")).toBe(false);
      expect(svc.hasSeenDigest("cd:1")).toBe(false);
      expect(svc.isSettlementRefDuplicate("stl:ref1")).toBe(false);
    });
  });
});
