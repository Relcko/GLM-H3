import { describe, it, expect } from "vitest";

describe("shared types", () => {
  it("KYCState type has expected values", () => {
    const states = ["not-started", "in-progress", "submitted", "under-review", "approved", "rejected", "remediation-required"] as const;
    expect(states).toContain("approved");
    expect(states).toContain("rejected");
  });

  it("AuthState type has expected values", () => {
    const states = ["anonymous", "authenticated", "elevated", "impersonating", "expired", "locked"] as const;
    expect(states).toContain("anonymous");
    expect(states).toContain("authenticated");
  });

  it("WalletState type has expected values", () => {
    const states = ["disconnected", "connecting", "connected", "wrong-network", "signing", "verified", "error"] as const;
    expect(states).toContain("connected");
    expect(states).toContain("disconnected");
  });
});
