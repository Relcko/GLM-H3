import { describe, it, expect } from "vitest";
import { DistributionRecipientAggregate } from "../domain/distribution-recipient.aggregate";
import { type DistributionId, type RecipientId, RecipientStatus, EligibilityProof } from "../domain/value-objects";
import { DistributionInvalidStatusError, RecipientAlreadyPaidError, RecipientPaymentFailedError, RecoveryExhaustedError, RecoveryNotPossibleError } from "../domain/errors";
import type { DomainEvent } from "@relcko/kernel";

function makeId(seed = "rec-1"): RecipientId {
  return seed as unknown as RecipientId;
}

function makeDistId(seed = "dist-1"): DistributionId {
  return seed as unknown as DistributionId;
}

function makeProof(): EligibilityProof {
  return EligibilityProof.create({ snapshotId: "snap-1", positionIndex: 0, quantity: 100n, perUnitAmount: 500n, hash: "proof-abc" });
}

function makeRecipient(id?: RecipientId): DistributionRecipientAggregate {
  return DistributionRecipientAggregate.create(
    id ?? makeId(),
    makeDistId(),
    "investor-1",
    50000n,
    "USD",
    makeProof(),
  );
}

describe("DistributionRecipientAggregate", () => {
  describe("materialize (create)", () => {
    it("creates with Pending status", () => {
      const rec = makeRecipient();
      expect(rec.status).toBe(RecipientStatus.Pending);
      expect(rec.version).toBe(1);
      expect(rec.getUncommittedEvents()).toHaveLength(1);
    });
  });

  describe("pay", () => {
    it("transitions Pending -> Paid", () => {
      const rec = makeRecipient();
      rec.pay({
        distributionId: makeDistId(),
        investorId: "investor-1",
        amount: 50000n,
        currency: "USD",
        settlementRef: "settle-1",
      });
      expect(rec.status).toBe(RecipientStatus.Paid);
      expect(rec.version).toBe(2);
    });

    it("rejects pay from Paid", () => {
      const rec = makeRecipient();
      rec.pay({ distributionId: makeDistId(), investorId: "investor-1", amount: 50000n, currency: "USD", settlementRef: "settle-1" });
      expect(() =>
        rec.pay({ distributionId: makeDistId(), investorId: "investor-1", amount: 50000n, currency: "USD", settlementRef: "settle-2" }),
      ).toThrow(DistributionInvalidStatusError);
    });

    it("rejects pay when amount exceeds eligible amount", () => {
      const rec = makeRecipient();
      expect(() =>
        rec.pay({ distributionId: makeDistId(), investorId: "investor-1", amount: 99999n, currency: "USD", settlementRef: "settle-1" }),
      ).toThrow(RecipientPaymentFailedError);
    });

    it("rejects pay from Recovered", () => {
      const rec = makeRecipient();
      rec.pay({ distributionId: makeDistId(), investorId: "investor-1", amount: 50000n, currency: "USD", settlementRef: "settle-1" });
      expect(
        () => rec.pay({ distributionId: makeDistId(), investorId: "investor-1", amount: 50000n, currency: "USD", settlementRef: "settle-2" }),
      ).toThrow(DistributionInvalidStatusError);
    });
  });

  describe("fail", () => {
    it("transitions Pending -> Failed", () => {
      const rec = makeRecipient();
      rec.fail(makeDistId(), "investor-1", 50000n, "USD", "Insufficient funds", "INSUFFICIENT_FUNDS");
      expect(rec.status).toBe(RecipientStatus.Failed);
      expect(rec.version).toBe(2);
    });

    it("rejects fail from Paid", () => {
      const rec = makeRecipient();
      rec.pay({ distributionId: makeDistId(), investorId: "investor-1", amount: 50000n, currency: "USD", settlementRef: "settle-1" });
      expect(() => rec.fail(makeDistId(), "investor-1", 50000n, "USD", "late", "LATE")).toThrow(DistributionInvalidStatusError);
    });
  });

  describe("recover", () => {
    it("transitions Failed -> Recovered", () => {
      const rec = makeRecipient();
      rec.fail(makeDistId(), "investor-1", 50000n, "USD", "timeout", "PROVIDER_TIMEOUT");
      rec.recover({ distributionId: makeDistId(), strategy: "re_attempt" as never }, "settle-recovered");
      expect(rec.status).toBe(RecipientStatus.Recovered);
      expect(rec.version).toBe(3);
    });

    it("rejects recover from Pending (never failed)", () => {
      const rec = makeRecipient();
      expect(() => rec.recover({ distributionId: makeDistId(), strategy: "re_attempt" as never }, "settle-r")).toThrow(DistributionInvalidStatusError);
    });

    it("rejects recover from Paid", () => {
      const rec = makeRecipient();
      rec.pay({ distributionId: makeDistId(), investorId: "investor-1", amount: 50000n, currency: "USD", settlementRef: "settle-1" });
      expect(() => rec.recover({ distributionId: makeDistId(), strategy: "re_attempt" as never }, "settle-r")).toThrow(DistributionInvalidStatusError);
    });

    it("rejects recover when exhausted", () => {
      const rec = makeRecipient();
      rec.fail(makeDistId(), "inv-1", 50000n, "USD", "e1", "ERR");
      rec.recover({ distributionId: makeDistId(), strategy: "re_attempt" as never }, "sr-1");
      expect(rec.status).toBe(RecipientStatus.Recovered);
    });
  });

  describe("retry (re-fail)", () => {
    it("allows retry on Failed state (self-loop)", () => {
      const rec = makeRecipient();
      rec.fail(makeDistId(), "inv-1", 50000n, "USD", "timeout", "PROVIDER_TIMEOUT");
      rec.retry(makeDistId(), "inv-1", 50000n, "USD", "timeout again", "PROVIDER_TIMEOUT");
      expect(rec.status).toBe(RecipientStatus.Failed);
      expect(rec.version).toBe(3);
    });

    it("rejects retry from Pending", () => {
      const rec = makeRecipient();
      expect(() => rec.retry(makeDistId(), "inv-1", 50000n, "USD", "err", "ERR")).toThrow(RecoveryNotPossibleError);
    });

    it("rejects retry from Paid", () => {
      const rec = makeRecipient();
      rec.pay({ distributionId: makeDistId(), investorId: "inv-1", amount: 50000n, currency: "USD", settlementRef: "s-1" });
      expect(() => rec.retry(makeDistId(), "inv-1", 50000n, "USD", "err", "ERR")).toThrow(RecoveryNotPossibleError);
    });

    it("exhausts retry attempts after 3 fails", () => {
      const rec = makeRecipient();
      for (let i = 0; i < 3; i++) {
        rec.fail(makeDistId(), "inv-1", 50000n, "USD", `attempt ${i + 1}`, "ERR");
        if (i < 2) {
          rec.retry(makeDistId(), "inv-1", 50000n, "USD", `retry ${i + 1}`, "ERR");
        }
      }
      expect(() => rec.retry(makeDistId(), "inv-1", 50000n, "USD", "final", "ERR")).toThrow(RecoveryExhaustedError);
    });
  });

  describe("loadFromHistory (event replay)", () => {
    it("reconstructs full lifecycle", () => {
      const original = makeRecipient(makeId("replay-1"));
      original.pay({ distributionId: makeDistId(), investorId: "inv-1", amount: 50000n, currency: "USD", settlementRef: "s-1" });

      const events = [...original.getUncommittedEvents()] as DomainEvent[];
      original.markEventsAsCommitted();

      const replayed = DistributionRecipientAggregate.loadFromHistory(makeId("replay-1"), events);
      expect(replayed.status).toBe(RecipientStatus.Paid);
      expect(replayed.version).toBe(2);
    });

    it("replays fail-recover lifecycle", () => {
      const original = makeRecipient(makeId("replay-2"));
      original.fail(makeDistId(), "inv-1", 50000n, "USD", "err", "ERR");
      original.recover({ distributionId: makeDistId(), strategy: "re_attempt" as never }, "sr-1");

      const events = [...original.getUncommittedEvents()] as DomainEvent[];
      original.markEventsAsCommitted();

      const replayed = DistributionRecipientAggregate.loadFromHistory(makeId("replay-2"), events);
      expect(replayed.status).toBe(RecipientStatus.Recovered);
      expect(replayed.version).toBe(3);
    });

    it("replays fail-retry-fail lifecycle", () => {
      const original = makeRecipient(makeId("replay-3"));
      original.fail(makeDistId(), "inv-1", 50000n, "USD", "e1", "ERR");
      original.retry(makeDistId(), "inv-1", 50000n, "USD", "e2", "ERR");
      original.pay({ distributionId: makeDistId(), investorId: "inv-1", amount: 50000n, currency: "USD", settlementRef: "s-final" });

      const events = [...original.getUncommittedEvents()] as DomainEvent[];
      original.markEventsAsCommitted();

      const replayed = DistributionRecipientAggregate.loadFromHistory(makeId("replay-3"), events);
      expect(replayed.status).toBe(RecipientStatus.Paid);
      expect(replayed.version).toBe(4);
    });
  });

  describe("version tracking", () => {
    it("increments version through pay lifecycle", () => {
      const rec = makeRecipient();
      expect(rec.version).toBe(1);
      rec.pay({ distributionId: makeDistId(), investorId: "inv-1", amount: 50000n, currency: "USD", settlementRef: "s-1" });
      expect(rec.version).toBe(2);
    });

    it("increments version through fail-recover lifecycle", () => {
      const rec = makeRecipient();
      rec.fail(makeDistId(), "inv-1", 50000n, "USD", "e1", "ERR");
      expect(rec.version).toBe(2);
      rec.recover({ distributionId: makeDistId(), strategy: "re_attempt" as never }, "sr-1");
      expect(rec.version).toBe(3);
    });
  });
});
