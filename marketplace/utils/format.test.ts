import { describe, expect, it } from "vitest";
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
} from "./format";

describe("format", () => {
  it("formats currency without decimals", () => {
    expect(formatCurrency(50)).toBe("$50");
    expect(formatCurrency(1234567)).toBe("$1,234,567");
  });

  it("formats compact currency", () => {
    expect(formatCompactCurrency(48_000_000)).toBe("$48M");
  });

  it("formats numbers with grouping", () => {
    expect(formatNumber(647600)).toBe("647,600");
  });

  it("formats percentages with configurable precision", () => {
    expect(formatPercent(11.4)).toBe("11.4%");
    expect(formatPercent(94, 0)).toBe("94%");
  });
});
