import { describe, it, expect, beforeEach, vi } from "vitest";
import type { ITreasuryAdapter } from "../../infrastructure/adapters/treasury-adapter.interface";
import type { IClock } from "../../infrastructure/services/clock";
import type { IUuidProvider } from "../../infrastructure/services/uuid-provider";
import { TreasuryReservationService, DEFAULT_RESERVATION_TTL_MS } from "../treasury-reservation.service";
import { InsufficientReservedFundsError } from "../../domain/errors";

function makeClock(fixedNow: number = 1_000_000_000_000): IClock {
  return {
    now: () => new Date(fixedNow),
    nowMs: () => fixedNow,
  };
}

function makeUuid(seed = 1): IUuidProvider {
  let counter = seed;
  return { generate: () => `uuid-${counter++}` };
}

describe("TreasuryReservationService", () => {
  let treasuryAdapter: ITreasuryAdapter;
  let clock: IClock;
  let uuid: IUuidProvider;
  let svc: TreasuryReservationService;
  const NOW = 1_000_000_000_000;

  beforeEach(() => {
    treasuryAdapter = {
      reserveFunds: vi.fn().mockResolvedValue(undefined),
      releaseFunds: vi.fn().mockResolvedValue(undefined),
      getBalance: vi.fn().mockResolvedValue(1_000_000n),
    };
    clock = makeClock(NOW);
    uuid = makeUuid();
    svc = new TreasuryReservationService({ treasuryAdapter, clock, uuid });
  });

  describe("reserve", () => {
    it("creates an active reservation", async () => {
      const record = await svc.reserve({
        distributionId: "dist-1",
        accountId: "acct-1",
        amount: 500_000n,
        currency: "USD",
        journalId: "journal-1",
        ttlMs: DEFAULT_RESERVATION_TTL_MS,
      });

      expect(record.status).toBe("active");
      expect(record.distributionId).toBe("dist-1");
      expect(record.amount).toBe(500_000n);
      expect(record.expiresAt).toBe(NOW + DEFAULT_RESERVATION_TTL_MS);
      expect(svc.uncommittedEvents.length).toBeGreaterThan(0);
    });

    it("throws InsufficientReservedFundsError when balance is too low", async () => {
      vi.mocked(treasuryAdapter.getBalance).mockResolvedValue(100_000n);

      await expect(
        svc.reserve({
          distributionId: "dist-2",
          accountId: "acct-1",
          amount: 500_000n,
          currency: "USD",
          journalId: "journal-1",
          ttlMs: DEFAULT_RESERVATION_TTL_MS,
        }),
      ).rejects.toThrow(InsufficientReservedFundsError);
    });

    it("calls treasury adapter reserveFunds", async () => {
      await svc.reserve({
        distributionId: "dist-3",
        accountId: "acct-2",
        amount: 300_000n,
        currency: "EUR",
        journalId: "journal-2",
        ttlMs: 60_000,
      });

      expect(treasuryAdapter.reserveFunds).toHaveBeenCalledWith({
        accountId: "acct-2",
        amount: 300_000n,
        currency: "EUR",
        journalId: "journal-2",
        reference: "reserve:dist-3",
      });
    });
  });

  describe("verifyReservation", () => {
    it("returns valid for active matching reservation", async () => {
      await svc.reserve({
        distributionId: "dist-1",
        accountId: "acct-1",
        amount: 500_000n,
        currency: "USD",
        journalId: "journal-1",
        ttlMs: DEFAULT_RESERVATION_TTL_MS,
      });

      const result = await svc.verifyReservation("dist-1", 500_000n, "USD");
      expect(result.valid).toBe(true);
      expect(result.reason).toBeNull();
    });

    it("returns invalid when no reservation found", async () => {
      const result = await svc.verifyReservation("dist-missing", 100n, "USD");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("No reservation found");
    });

    it("returns invalid on amount mismatch", async () => {
      await svc.reserve({
        distributionId: "dist-1",
        accountId: "acct-1",
        amount: 500_000n,
        currency: "USD",
        journalId: "journal-1",
        ttlMs: DEFAULT_RESERVATION_TTL_MS,
      });

      const result = await svc.verifyReservation("dist-1", 999_999n, "USD");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("amount mismatch");
    });

    it("returns invalid on currency mismatch", async () => {
      await svc.reserve({
        distributionId: "dist-1",
        accountId: "acct-1",
        amount: 500_000n,
        currency: "USD",
        journalId: "journal-1",
        ttlMs: DEFAULT_RESERVATION_TTL_MS,
      });

      const result = await svc.verifyReservation("dist-1", 500_000n, "EUR");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("currency mismatch");
    });

    it("returns invalid when reservation is expired (time-dependent)", async () => {
      let currentTime = NOW;
      const mutableClock: IClock = { now: () => new Date(currentTime), nowMs: () => currentTime };
      const mutableSvc = new TreasuryReservationService({ treasuryAdapter, clock: mutableClock, uuid });

      await mutableSvc.reserve({
        distributionId: "dist-1",
        accountId: "acct-1",
        amount: 500_000n,
        currency: "USD",
        journalId: "journal-1",
        ttlMs: 100,
      });

      currentTime = NOW + 10_000;

      const result = await mutableSvc.verifyReservation("dist-1", 500_000n, "USD");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("expired");
    });

    it("returns invalid for consumed reservation", async () => {
      await svc.reserve({
        distributionId: "dist-1",
        accountId: "acct-1",
        amount: 500_000n,
        currency: "USD",
        journalId: "journal-1",
        ttlMs: DEFAULT_RESERVATION_TTL_MS,
      });

      await svc.consumeReservation("dist-1");
      const result = await svc.verifyReservation("dist-1", 500_000n, "USD");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("already consumed");
    });

    it("returns invalid for released reservation", async () => {
      await svc.reserve({
        distributionId: "dist-1",
        accountId: "acct-1",
        amount: 500_000n,
        currency: "USD",
        journalId: "journal-1",
        ttlMs: DEFAULT_RESERVATION_TTL_MS,
      });

      await svc.releaseReservation("dist-1", "test release");
      const result = await svc.verifyReservation("dist-1", 500_000n, "USD");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("already released");
    });
  });

  describe("releaseReservation", () => {
    it("releases an active reservation", async () => {
      await svc.reserve({
        distributionId: "dist-1",
        accountId: "acct-1",
        amount: 500_000n,
        currency: "USD",
        journalId: "journal-1",
        ttlMs: DEFAULT_RESERVATION_TTL_MS,
      });

      await svc.releaseReservation("dist-1", "manual release");

      const reservation = svc.getReservation("dist-1");
      expect(reservation?.status).toBe("released");
      expect(reservation?.releasedAt).toBe(NOW);
      expect(treasuryAdapter.releaseFunds).toHaveBeenCalled();
    });

    it("does nothing for unknown distribution", async () => {
      await svc.releaseReservation("dist-unknown", "test");
      expect(treasuryAdapter.releaseFunds).not.toHaveBeenCalled();
    });
  });

  describe("consumeReservation", () => {
    it("consumes an active reservation", async () => {
      await svc.reserve({
        distributionId: "dist-1",
        accountId: "acct-1",
        amount: 500_000n,
        currency: "USD",
        journalId: "journal-1",
        ttlMs: DEFAULT_RESERVATION_TTL_MS,
      });

      await svc.consumeReservation("dist-1");
      const reservation = svc.getReservation("dist-1");
      expect(reservation?.status).toBe("consumed");
      expect(reservation?.consumedAt).toBe(NOW);
    });

    it("throws for already consumed reservation", async () => {
      await svc.reserve({
        distributionId: "dist-1",
        accountId: "acct-1",
        amount: 500_000n,
        currency: "USD",
        journalId: "journal-1",
        ttlMs: DEFAULT_RESERVATION_TTL_MS,
      });

      await svc.consumeReservation("dist-1");
      await expect(svc.consumeReservation("dist-1")).rejects.toThrow("cannot be consumed");
    });

    it("throws for unknown distribution", async () => {
      await expect(svc.consumeReservation("dist-unknown")).rejects.toThrow("No reservation to consume");
    });
  });

  describe("expireStaleReservations", () => {
    it("expires past-due reservations", async () => {
      let currentTime = NOW;
      const mutableClock: IClock = { now: () => new Date(currentTime), nowMs: () => currentTime };
      const mutableSvc = new TreasuryReservationService({ treasuryAdapter, clock: mutableClock, uuid });

      await mutableSvc.reserve({
        distributionId: "dist-1",
        accountId: "acct-1",
        amount: 100n,
        currency: "USD",
        journalId: "j-1",
        ttlMs: 100,
      });

      currentTime = NOW + 10_000;

      const count = mutableSvc.expireStaleReservations();
      expect(count).toBe(1);

      const reservation = mutableSvc.getReservation("dist-1");
      expect(reservation?.status).toBe("expired");
    });
  });

  describe("getReservation", () => {
    it("returns null for unknown distribution", () => {
      expect(svc.getReservation("dist-unknown")).toBeNull();
    });

    it("returns the reservation for a known distribution", async () => {
      await svc.reserve({
        distributionId: "dist-1",
        accountId: "acct-1",
        amount: 500_000n,
        currency: "USD",
        journalId: "j-1",
        ttlMs: DEFAULT_RESERVATION_TTL_MS,
      });

      const r = svc.getReservation("dist-1");
      expect(r).not.toBeNull();
      expect(r!.amount).toBe(500_000n);
    });
  });
});
