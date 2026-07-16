import { describe, it, expect } from "vitest";
import { COLOR_TOKEN, TYPOGRAPHY_TOKEN, SPACING_TOKEN, ELEVATION_TOKEN, MOTION_TOKEN, RADIUS_TOKEN, Z_TOKEN } from "@/lib/shared/tokens";

describe("design tokens", () => {
  describe("COLOR_TOKEN", () => {
    it("has brand tokens", () => {
      expect(COLOR_TOKEN.brand.primary).toBe("var(--color-brand-primary)");
      expect(COLOR_TOKEN.brand.accent).toBe("var(--color-brand-accent)");
    });

    it("has surface tokens", () => {
      expect(COLOR_TOKEN.surface.base).toBe("var(--color-surface-base)");
    });

    it("has financial tokens", () => {
      expect(COLOR_TOKEN.financial.positive).toBe("var(--color-financial-positive)");
      expect(COLOR_TOKEN.financial.caution).toBe("var(--color-financial-caution)");
      expect(COLOR_TOKEN.financial.negative).toBe("var(--color-financial-negative)");
    });

    it("has severity tokens", () => {
      expect(COLOR_TOKEN.severity.critical).toBe("var(--color-severity-critical)");
    });

    it("has chart tokens", () => {
      expect(COLOR_TOKEN.chart.categorical).toHaveLength(5);
      expect(COLOR_TOKEN.chart.sequential).toHaveLength(5);
    });
  });

  describe("TYPOGRAPHY_TOKEN", () => {
    it("has family tokens", () => {
      expect(TYPOGRAPHY_TOKEN.family.sans).toBe("var(--font-family-sans)");
      expect(TYPOGRAPHY_TOKEN.family.mono).toBe("var(--font-family-mono)");
    });

    it("has size tokens", () => {
      expect(TYPOGRAPHY_TOKEN.size.body).toBe("var(--font-size-body)");
      expect(TYPOGRAPHY_TOKEN.size.display).toBe("var(--font-size-display)");
    });
  });

  describe("SPACING_TOKEN", () => {
    it("has stack tokens", () => {
      expect(SPACING_TOKEN.stack.xs).toBe("var(--spacing-stack-xs)");
      expect(SPACING_TOKEN.stack.xl).toBe("var(--spacing-stack-xl)");
    });

    it("has section tokens", () => {
      expect(SPACING_TOKEN.section.lg).toBe("var(--spacing-section-lg)");
    });
  });

  describe("ELEVATION_TOKEN", () => {
    it("has elevation tokens", () => {
      expect(ELEVATION_TOKEN.base).toBe("var(--elevation-base)");
      expect(ELEVATION_TOKEN.emergency).toBe("var(--elevation-emergency)");
    });
  });

  describe("MOTION_TOKEN", () => {
    it("has duration tokens", () => {
      expect(MOTION_TOKEN.duration.fast).toBe("var(--motion-duration-fast)");
      expect(MOTION_TOKEN.duration.slow).toBe("var(--motion-duration-slow)");
    });
  });

  describe("RADIUS_TOKEN", () => {
    it("has radius tokens", () => {
      expect(RADIUS_TOKEN.sm).toBe("var(--radius-sm)");
      expect(RADIUS_TOKEN.full).toBe("var(--radius-full)");
    });
  });
});
