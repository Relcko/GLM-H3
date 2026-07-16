import { describe, it, expect } from "vitest";
import { INVALIDATION_RULES, getInvalidationRules } from "@/lib/shared/event-cache";

describe("event-cache", () => {
  it("has invalidation rules defined", () => {
    expect(INVALIDATION_RULES.length).toBeGreaterThan(0);
  });

  it("gets rules for known event types", () => {
    const rules = getInvalidationRules("investment-completed");
    expect(rules.length).toBe(1);
    expect(rules[0].strategy).toBe("stale-mark");
  });

  it("returns empty array for unknown event types", () => {
    const rules = getInvalidationRules("unknown-event");
    expect(rules).toHaveLength(0);
  });

  it("each rule has required fields", () => {
    for (const rule of INVALIDATION_RULES) {
      expect(rule.eventTypes.length).toBeGreaterThan(0);
      expect(rule.targetQueryKeys.length).toBeGreaterThan(0);
      expect(["invalidate", "stale-mark", "background-refresh", "patch"]).toContain(rule.strategy);
    }
  });
});
