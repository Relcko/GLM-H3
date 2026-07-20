import { describe, expect, it } from "vitest";
import {
  addMoney,
  allocate,
  formatMoney,
  money,
  moneyFromMinor,
  multiplyMoney,
  subtractMoney,
} from "@relcko/utils";
import { collect, err, isErr, isOk, ok } from "@relcko/utils";
import { generateId, generateNonce } from "@relcko/utils";
import { Currency } from "@relcko/types";

describe("money", () => {
  it("builds from major units with correct minor-unit precision", () => {
    const m = money(12.5, Currency.USDT);
    expect(m.amount).toBe(12_500_000n); // USDT = 6 decimals
    expect(m.currency).toBe(Currency.USDT);
  });

  it("adds and subtracts same currency", () => {
    const a = money(10, Currency.USDT);
    const b = money(3, Currency.USDT);
    expect(addMoney(a, b).amount).toBe(13_000_000n);
    expect(subtractMoney(a, b).amount).toBe(7_000_000n);
  });

  it("rejects negative and mismatched currency", () => {
    expect(() => money(-1, Currency.USDT)).toThrow();
    expect(() => subtractMoney(money(1, Currency.USDT), money(2, Currency.USDT))).toThrow();
    expect(() => addMoney(money(1, Currency.USDT), money(1, Currency.USDC))).toThrow();
  });

  it("multiplies and allocates proportionally", () => {
    const m = money(100, Currency.USDT);
    expect(multiplyMoney(m, 0.1).amount).toBe(10_000_000n);
    const parts = allocate(money(100, Currency.USDT), [1, 1, 1]);
    expect(parts.map((p) => p.amount)).toEqual([33_333_334n, 33_333_333n, 33_333_333n]);
  });

  it("formats human-readable output", () => {
    expect(formatMoney(moneyFromMinor(12_500_000n, Currency.USDT))).toBe("12.5 USDT");
  });
});

describe("result", () => {
  it("models ok/err and collectors", () => {
    expect(isOk(ok(1))).toBe(true);
    expect(isErr(err("boom"))).toBe(true);
    const collected = collect([ok(1), ok(2)]);
    expect(collected.ok && collected.value).toEqual([1, 2]);
    expect(isErr(collect([ok(1), err("x")]))).toBe(true);
  });
});

describe("ids", () => {
  it("generates unique uuids and nonces", () => {
    expect(generateId("x")).not.toBe(generateId("x"));
    expect(generateNonce(8).length).toBe(16);
  });
});
