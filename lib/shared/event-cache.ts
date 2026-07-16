export type CacheInvalidationStrategy = "invalidate" | "stale-mark" | "background-refresh" | "patch";

export interface CacheInvalidationRule {
  eventTypes: string[];
  strategy: CacheInvalidationStrategy;
  targetQueryKeys: string[];
}

export const INVALIDATION_RULES: CacheInvalidationRule[] = [
  {
    eventTypes: ["investment-completed", "sale-completed", "property-published", "ownership-updated"],
    strategy: "stale-mark",
    targetQueryKeys: ["marketplace", "investments", "portfolio"],
  },
  {
    eventTypes: ["dividend-distributed", "treasury-movement", "reserve-updated"],
    strategy: "stale-mark",
    targetQueryKeys: ["treasury", "portfolio-income"],
  },
  {
    eventTypes: ["proposal-created", "vote-cast", "proposal-executed"],
    strategy: "background-refresh",
    targetQueryKeys: ["governance"],
  },
  {
    eventTypes: ["referral-created", "commission-calculated", "commission-paid", "rank-changed"],
    strategy: "stale-mark",
    targetQueryKeys: ["network", "commissions", "leaderboard"],
  },
  {
    eventTypes: ["incident-opened", "incident-resolved", "emergency-mode-changed"],
    strategy: "invalidate",
    targetQueryKeys: ["admin", "operations"],
  },
  {
    eventTypes: ["kyc-status-changed"],
    strategy: "invalidate",
    targetQueryKeys: ["identity", "kyc"],
  },
  {
    eventTypes: ["session-expired", "session-revoked", "permission-changed"],
    strategy: "invalidate",
    targetQueryKeys: ["session"],
  },
];

export function getInvalidationRules(eventType: string): CacheInvalidationRule[] {
  return INVALIDATION_RULES.filter((rule) => rule.eventTypes.includes(eventType));
}
