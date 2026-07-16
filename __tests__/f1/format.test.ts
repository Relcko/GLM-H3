import { describe, it, expect } from "vitest";
import { formatCurrency, formatPercent, formatDate, formatRelativeTime, shortenAddress } from "@/lib/shared/format";

describe("format", () => {
  describe("formatCurrency", () => {
    it("formats USD", () => {
      expect(formatCurrency(1234.5)).toBe("$1,234.50");
    });

    it("formats EUR", () => {
      expect(formatCurrency(99.9, "EUR", "de-DE")).toBe("99,90\u00a0\u20ac");
    });
  });

  describe("formatPercent", () => {
    it("formats percentage", () => {
      expect(formatPercent(0.1234)).toBe("12.34%");
    });
  });

  describe("shortenAddress", () => {
    it("shortens ethereum address", () => {
      expect(shortenAddress("0x7f3E3E3E3E3E3E3E3E3E3E3E3E3E3E3E3E3E3E3E")).toBe("0x7f3E...3E3E");
    });

    it("handles empty string", () => {
      expect(shortenAddress("")).toBe("");
    });
  });

  describe("formatRelativeTime", () => {
    it("returns 'just now' for recent time", () => {
      expect(formatRelativeTime(new Date())).toBe("just now");
    });
  });
});
