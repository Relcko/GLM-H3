import { describe, expect, it } from "vitest";
import {
  asAddress,
  asEntityId,
  asTxHash,
  isAddress,
  isEntityId,
  isTxHash,
} from "@relcko/types";

describe("branded types", () => {
  it("accepts valid entity ids", () => {
    expect(isEntityId("prop_1234")).toBe(true);
    expect(isEntityId("not valid!")).toBe(false);
  });

  it("brands an entity id", () => {
    expect(asEntityId("abc-123")).toBe("abc-123");
    expect(() => asEntityId("")).toThrow();
  });

  it("validates addresses case-insensitively", () => {
    const addr = "0xAbC1230000000000000000000000000000000001";
    expect(isAddress(addr)).toBe(true);
    expect(asAddress(addr)).toBe(addr.toLowerCase());
    expect(isAddress("0x123")).toBe(false);
  });

  it("validates 64-char tx hashes", () => {
    const hash = "0x" + "a".repeat(64);
    expect(isTxHash(hash)).toBe(true);
    expect(isTxHash("0x" + "a".repeat(10))).toBe(false);
    expect(asTxHash(hash)).toBe(hash);
  });
});
