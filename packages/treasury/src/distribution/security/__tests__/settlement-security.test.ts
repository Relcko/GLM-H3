import { describe, it, expect, beforeEach } from "vitest";
import { SettlementSecurityService, SETTLEMENT_REF_PATTERN } from "../settlement-security.service";
import type { SettlementRefValidationRequest } from "../settlement-security.service";
import type { IHashService } from "../../infrastructure/services/hash-service";
import type { IClock } from "../../infrastructure/services/clock";

function makeHashService(): IHashService {
  return {
    sha256: (input: string) => {
      let hash = 0;
      for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
      }
      return Math.abs(hash).toString(16).padStart(61, "0").slice(0, 61);
    },
    verify: (input: string, hash: string) => {
      let h = 0;
      for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        h = ((h << 5) - h) + char;
        h |= 0;
      }
      return hash === Math.abs(h).toString(16).padStart(61, "0").slice(0, 61);
    },
  };
}

function makeClock(fixedNow: number = 1_000_000_000_000): IClock {
  return { now: () => new Date(fixedNow), nowMs: () => fixedNow };
}

function makeRef(distributionId: string, recipientId: string, manifestHash: string, hashService: IHashService): string {
  const hash = hashService.sha256(`${distributionId}:${recipientId}:${manifestHash}`);
  return `stl:${hash}`;
}

describe("SettlementSecurityService", () => {
  let hashService: IHashService;
  let clock: IClock;
  let svc: SettlementSecurityService;

  beforeEach(() => {
    hashService = makeHashService();
    clock = makeClock();
    svc = new SettlementSecurityService(hashService, clock);
  });

  describe("computeSettlementRef", () => {
    it("generates a deterministic ref with stl: prefix", () => {
      const ref1 = svc.computeSettlementRef("dist-1", "rec-1", "hash-1");
      const ref2 = svc.computeSettlementRef("dist-1", "rec-1", "hash-1");
      expect(ref1).toBe(ref2);
      expect(ref1.startsWith("stl:")).toBe(true);
      expect(ref1.length).toBe("stl:".length + 61);
    });

    it("changes with different inputs", () => {
      const ref1 = svc.computeSettlementRef("dist-1", "rec-1", "hash-1");
      const ref2 = svc.computeSettlementRef("dist-1", "rec-2", "hash-1");
      expect(ref1).not.toBe(ref2);
    });
  });

  describe("validateRefFormat", () => {
    it("accepts valid server-generated ref", () => {
      const ref = makeRef("d1", "r1", "h1", hashService);
      expect(svc.validateRefFormat(ref)).toBe(true);
    });

    it("rejects ref without stl: prefix", () => {
      expect(svc.validateRefFormat("no-prefix")).toBe(false);
    });

    it("rejects ref with wrong length after prefix", () => {
      expect(svc.validateRefFormat("stl:short")).toBe(false);
    });

    it("rejects ref with non-hex chars", () => {
      expect(svc.validateRefFormat("stl:" + "x".repeat(61))).toBe(false);
    });
  });

  describe("validateRefSource", () => {
    it("accepts server source", () => {
      expect(svc.validateRefSource("server")).toBe(true);
    });

    it("rejects client source", () => {
      expect(svc.validateRefSource("client")).toBe(false);
    });
  });

  describe("validateRefUniqueness", () => {
    it("accepts unseen ref", () => {
      const ref = makeRef("d1", "r1", "h1", hashService);
      expect(svc.validateRefUniqueness(ref)).toBe(true);
    });

    it("rejects duplicate ref", () => {
      const ref = makeRef("d1", "r1", "h1", hashService);
      svc.markRefSeen(ref);
      expect(svc.validateRefUniqueness(ref)).toBe(false);
    });
  });

  describe("validateBeforePayment (integration)", () => {
    it("accepts valid server-generated ref", () => {
      const ref = svc.computeSettlementRef("dist-1", "rec-1", "manifest-1");
      const request: SettlementRefValidationRequest = {
        settlementRef: ref,
        distributionId: "dist-1",
        recipientId: "rec-1",
        manifestHash: "manifest-1",
        source: "server",
      };
      const result = svc.validateBeforePayment(request);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeNull();
    });

    it("rejects client-supplied ref", () => {
      const ref = svc.computeSettlementRef("dist-1", "rec-1", "manifest-1");
      const request: SettlementRefValidationRequest = {
        settlementRef: ref,
        distributionId: "dist-1",
        recipientId: "rec-1",
        manifestHash: "manifest-1",
        source: "client",
      };
      const result = svc.validateBeforePayment(request);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("must be generated server-side");
    });

    it("rejects invalid ref format", () => {
      const request: SettlementRefValidationRequest = {
        settlementRef: "invalid-ref",
        distributionId: "dist-1",
        recipientId: "rec-1",
        manifestHash: "manifest-1",
        source: "server",
      };
      const result = svc.validateBeforePayment(request);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("format invalid");
    });

    it("rejects ref that does not match computed value", () => {
      const ref = svc.computeSettlementRef("dist-1", "rec-1", "manifest-1");
      const request: SettlementRefValidationRequest = {
        settlementRef: ref,
        distributionId: "dist-1",
        recipientId: "rec-2",
        manifestHash: "manifest-1",
        source: "server",
      };
      const result = svc.validateBeforePayment(request);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("does not match computed value");
    });

    it("rejects duplicate settlement ref", () => {
      const ref = svc.computeSettlementRef("dist-1", "rec-1", "manifest-1");
      const firstRequest: SettlementRefValidationRequest = {
        settlementRef: ref,
        distributionId: "dist-1",
        recipientId: "rec-1",
        manifestHash: "manifest-1",
        source: "server",
      };
      const firstResult = svc.validateBeforePayment(firstRequest);
      expect(firstResult.valid).toBe(true);

      const secondRequest: SettlementRefValidationRequest = {
        settlementRef: ref,
        distributionId: "dist-1",
        recipientId: "rec-1",
        manifestHash: "manifest-1",
        source: "server",
      };
      const secondResult = svc.validateBeforePayment(secondRequest);
      expect(secondResult.valid).toBe(false);
      expect(secondResult.reason).toContain("already been used");
    });

    it("emits SettlementVerifiedEvent on success", () => {
      const ref = svc.computeSettlementRef("dist-1", "rec-1", "manifest-1");
      const request: SettlementRefValidationRequest = {
        settlementRef: ref,
        distributionId: "dist-1",
        recipientId: "rec-1",
        manifestHash: "manifest-1",
        source: "server",
      };
      svc.validateBeforePayment(request);
      const events = svc.uncommittedEvents;
      const verified = events.find((e) => e.eventType === "treasury.security.settlement.verified");
      expect(verified).toBeDefined();
    });

    it("emits SettlementRejectedEvent on failure", () => {
      const request: SettlementRefValidationRequest = {
        settlementRef: "invalid-ref",
        distributionId: "dist-1",
        recipientId: "rec-1",
        manifestHash: "manifest-1",
        source: "server",
      };
      svc.validateBeforePayment(request);
      const events = svc.uncommittedEvents;
      const rejected = events.find((e) => e.eventType === "treasury.security.settlement.rejected");
      expect(rejected).toBeDefined();
    });
  });

  describe("clearSeenRefs", () => {
    it("resets seen refs state", () => {
      const ref = makeRef("d1", "r1", "h1", hashService);
      svc.markRefSeen(ref);
      expect(svc.validateRefUniqueness(ref)).toBe(false);
      svc.clearSeenRefs();
      expect(svc.validateRefUniqueness(ref)).toBe(true);
    });
  });

  describe("SETTLEMENT_REF_PATTERN", () => {
    it("matches valid ref", () => {
      const ref = "stl:" + "a".repeat(61);
      expect(SETTLEMENT_REF_PATTERN.test(ref)).toBe(true);
    });

    it("rejects ref without prefix", () => {
      expect(SETTLEMENT_REF_PATTERN.test("no-prefix")).toBe(false);
    });

    it("rejects ref with incorrect length", () => {
      expect(SETTLEMENT_REF_PATTERN.test("stl:" + "a".repeat(60))).toBe(false);
      expect(SETTLEMENT_REF_PATTERN.test("stl:" + "a".repeat(62))).toBe(false);
    });

    it("rejects ref with non-hex chars", () => {
      expect(SETTLEMENT_REF_PATTERN.test("stl:" + "z".repeat(61))).toBe(false);
    });
  });
});
