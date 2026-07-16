import { describe, it, expect } from "vitest";
import {
  TokenBucketRateLimiter,
  CsrfProtection,
  DeviceFingerprintService,
} from "./security";

describe("TokenBucketRateLimiter", () => {
  it("allows up to capacity then blocks", () => {
    const limiter = new TokenBucketRateLimiter(3, 0); // no refill
    expect(limiter.consume("k").allowed).toBe(true);
    expect(limiter.consume("k").allowed).toBe(true);
    expect(limiter.consume("k").allowed).toBe(true);
    const blocked = limiter.consume("k");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("isolates keys", () => {
    const limiter = new TokenBucketRateLimiter(1, 0);
    expect(limiter.consume("a").allowed).toBe(true);
    expect(limiter.consume("b").allowed).toBe(true);
    expect(limiter.consume("a").allowed).toBe(false);
  });
});

describe("CsrfProtection", () => {
  it("accepts matching tokens and rejects mismatches", () => {
    const csrf = new CsrfProtection();
    const token = csrf.issueToken();
    expect(token).toHaveLength(64);
    expect(csrf.verify(token, token)).toBe(true);
    expect(csrf.verify(token, token + "x")).toBe(false);
    expect(csrf.verify("", token)).toBe(false);
  });
});

describe("DeviceFingerprintService", () => {
  it("is stable for identical inputs and differs by signal", () => {
    const svc = new DeviceFingerprintService();
    const a = svc.compute({ userAgent: "UA", ip: "1.1.1.1" });
    const b = svc.compute({ userAgent: "UA", ip: "1.1.1.1" });
    const c = svc.compute({ userAgent: "UA", ip: "2.2.2.2" });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
