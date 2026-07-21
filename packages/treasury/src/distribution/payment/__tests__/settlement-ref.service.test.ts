import { describe, it, expect } from "vitest";
import { SettlementReferenceService, SETTLEMENT_REF_LENGTH } from "../settlement-ref.service";

describe("SettlementReferenceService", () => {
  const service = new SettlementReferenceService();

  it("generates deterministic references for same inputs", () => {
    const ref1 = service.computeSettlementRef("dist-1", "rec-1", "hash-abc");
    const ref2 = service.computeSettlementRef("dist-1", "rec-1", "hash-abc");
    expect(ref1).toBe(ref2);
  });

  it("produces different references for different recipients", () => {
    const ref1 = service.computeSettlementRef("dist-1", "rec-1", "hash-abc");
    const ref2 = service.computeSettlementRef("dist-1", "rec-2", "hash-abc");
    expect(ref1).not.toBe(ref2);
  });

  it("produces different references for different distributions", () => {
    const ref1 = service.computeSettlementRef("dist-1", "rec-1", "hash-abc");
    const ref2 = service.computeSettlementRef("dist-2", "rec-1", "hash-abc");
    expect(ref1).not.toBe(ref2);
  });

  it("produces different references for different manifest hashes", () => {
    const ref1 = service.computeSettlementRef("dist-1", "rec-1", "hash-abc");
    const ref2 = service.computeSettlementRef("dist-1", "rec-1", "hash-xyz");
    expect(ref1).not.toBe(ref2);
  });

  it("returns a hex string of correct length", () => {
    const ref = service.computeSettlementRef("dist-1", "rec-1", "hash-abc");
    expect(ref).toMatch(/^[a-f0-9]+$/);
    expect(ref.length).toBe(SETTLEMENT_REF_LENGTH);
  });
});
