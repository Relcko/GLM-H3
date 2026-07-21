import { describe, it, expect } from "vitest";
import { CryptoUuidProvider } from "../services/uuid-provider";
import { CryptoHashService } from "../services/hash-service";
import { SystemClock } from "../services/clock";

describe("CryptoUuidProvider", () => {
  const provider = new CryptoUuidProvider();

  it("generates a valid UUID", () => {
    const uuid = provider.generate();
    expect(uuid).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("generates unique values", () => {
    const uuids = new Set(Array.from({ length: 100 }, () => provider.generate()));
    expect(uuids.size).toBe(100);
  });
});

describe("CryptoHashService", () => {
  const svc = new CryptoHashService();

  it("produces a SHA-256 hash", () => {
    const hash = svc.sha256("test");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("verifies hash correctly", () => {
    const hash = svc.sha256("hello");
    expect(svc.verify("hello", hash)).toBe(true);
    expect(svc.verify("world", hash)).toBe(false);
  });

  it("same input produces same hash", () => {
    const h1 = svc.sha256("input");
    const h2 = svc.sha256("input");
    expect(h1).toBe(h2);
  });
});

describe("SystemClock", () => {
  const clock = new SystemClock();

  it("returns current date", () => {
    const d = clock.now();
    expect(d).toBeInstanceOf(Date);
    expect(d.getTime()).toBeGreaterThan(0);
  });

  it("returns ms timestamp", () => {
    const ms = clock.nowMs();
    expect(ms).toBeGreaterThan(0);
    expect(Number.isInteger(ms)).toBe(true);
  });
});
