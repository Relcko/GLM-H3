import { describe, it, expect, beforeEach } from "vitest";
import { createInMemoryInvestmentEngineRepository } from "../in-memory-repository";
import { SecurityGuard } from "../security/guard";
import { ReplayError, DoubleSubmitError, ChainVerificationError } from "../errors";

describe("SecurityGuard", () => {
  let repo: ReturnType<typeof createInMemoryInvestmentEngineRepository>;
  let guard: SecurityGuard;

  beforeEach(() => {
    repo = createInMemoryInvestmentEngineRepository();
    guard = new SecurityGuard(repo);
  });

  it("prevents replay of processed events", () => {
    guard.checkReplay("event-1");
    expect(() => guard.checkReplay("event-1")).toThrow(ReplayError);
  });

  it("allows first-time events", () => {
    expect(() => guard.checkReplay("event-1")).not.toThrow();
    expect(() => guard.checkReplay("event-2")).not.toThrow();
  });

  it("prevents double submit with same idempotency key", () => {
    guard.checkDoubleSubmit("key-1");
    expect(() => guard.checkDoubleSubmit("key-1")).toThrow(DoubleSubmitError);
  });

  it("allows different idempotency keys", () => {
    guard.checkDoubleSubmit("key-1");
    expect(() => guard.checkDoubleSubmit("key-2")).not.toThrow();
  });

  it("verifies chain ID match", () => {
    expect(() => guard.verifyChain(97, 97)).not.toThrow();
    expect(() => guard.verifyChain(97, 56)).toThrow(ChainVerificationError);
  });

  it("verifies signatures", () => {
    const verifyFn = (message: string, signature: string, address: string) => {
      return signature === "valid_sig" && address === "0xcorrect";
    };

    expect(() => guard.verifySignature("msg", "valid_sig", "0xcorrect", verifyFn)).not.toThrow();
    expect(() => guard.verifySignature("msg", "bad_sig", "0xcorrect", verifyFn)).toThrow("Signature does not match");
  });
});
