import type { Role } from "@relcko/types";

export type RouteGuardType = "public" | "authenticated" | "role-based" | "kyc-gate" | "wallet-required" | "elevated";

export interface RouteConfig {
  path: string;
  guard: RouteGuardType;
  requiredRoles?: Role[];
  featureFlag?: string;
  kycRequired?: boolean;
  walletRequired?: boolean;
  elevatedRequired?: boolean;
}

export const PUBLIC_ROUTES: RouteConfig[] = [
  { path: "/", guard: "public" },
  { path: "/marketplace", guard: "public" },
  { path: "/marketplace/property/:propertyId", guard: "public" },
  { path: "/presale", guard: "public" },
  { path: "/about", guard: "public" },
  { path: "/blog", guard: "public" },
  { path: "/support", guard: "public" },
  { path: "/contact", guard: "public" },
];

export const INVESTOR_ROUTES: RouteConfig[] = [
  { path: "/investor", guard: "authenticated", kycRequired: true },
  { path: "/investor/dashboard", guard: "authenticated" },
  { path: "/investor/portfolio", guard: "authenticated" },
  { path: "/investor/portfolio/holdings", guard: "authenticated" },
  { path: "/investor/portfolio/performance", guard: "authenticated" },
  { path: "/investor/portfolio/income", guard: "authenticated" },
  { path: "/investor/marketplace", guard: "authenticated" },
  { path: "/investor/marketplace/property/:propertyId", guard: "authenticated" },
  { path: "/investor/investments", guard: "authenticated" },
  { path: "/investor/investments/:investmentId", guard: "authenticated" },
  { path: "/investor/kyc", guard: "authenticated" },
  { path: "/investor/kyc/identity", guard: "authenticated" },
  { path: "/investor/kyc/address", guard: "authenticated" },
  { path: "/investor/kyc/documents", guard: "authenticated" },
  { path: "/investor/kyc/review", guard: "authenticated" },
  { path: "/investor/kyc/status", guard: "authenticated" },
  { path: "/investor/nfts", guard: "authenticated" },
  { path: "/investor/nfts/:nftId", guard: "authenticated" },
  { path: "/investor/governance", guard: "authenticated" },
  { path: "/investor/governance/proposal/:proposalId", guard: "authenticated" },
  { path: "/investor/treasury-history", guard: "authenticated" },
  { path: "/investor/ai-advisor", guard: "authenticated" },
  { path: "/investor/documents", guard: "authenticated" },
  { path: "/investor/documents/:documentId", guard: "authenticated" },
  { path: "/investor/notifications", guard: "authenticated" },
  { path: "/investor/wallet", guard: "authenticated", walletRequired: true },
  { path: "/investor/settings", guard: "authenticated" },
];

export const AGENT_ROUTES: RouteConfig[] = [
  { path: "/agent", guard: "authenticated" },
  { path: "/agent/dashboard", guard: "authenticated" },
  { path: "/agent/customers", guard: "authenticated" },
  { path: "/agent/customers/:customerId", guard: "authenticated" },
  { path: "/agent/leads", guard: "authenticated" },
  { path: "/agent/leads/:leadId", guard: "authenticated" },
  { path: "/agent/referral-network", guard: "authenticated" },
  { path: "/agent/referral-network/agent/:agentId", guard: "authenticated" },
  { path: "/agent/commissions", guard: "authenticated" },
  { path: "/agent/commissions/:commissionId", guard: "authenticated" },
  { path: "/agent/performance", guard: "authenticated" },
  { path: "/agent/rewards", guard: "authenticated" },
  { path: "/agent/leaderboard", guard: "authenticated" },
  { path: "/agent/ai-sales-assistant", guard: "authenticated" },
  { path: "/agent/documents", guard: "authenticated" },
  { path: "/agent/settings", guard: "authenticated" },
];

export const ADMIN_ROUTES: RouteConfig[] = [
  { path: "/admin", guard: "authenticated" },
  { path: "/admin/executive-dashboard", guard: "authenticated" },
  { path: "/admin/users", guard: "authenticated" },
  { path: "/admin/users/:userId", guard: "authenticated" },
  { path: "/admin/properties", guard: "authenticated" },
  { path: "/admin/properties/:propertyId", guard: "authenticated" },
  { path: "/admin/marketplace", guard: "authenticated" },
  { path: "/admin/marketplace/property/:propertyId", guard: "authenticated" },
  { path: "/admin/treasury", guard: "authenticated", elevatedRequired: true },
  { path: "/admin/treasury/movement/:movementId", guard: "authenticated", elevatedRequired: true },
  { path: "/admin/governance", guard: "authenticated" },
  { path: "/admin/governance/proposal/:proposalId", guard: "authenticated" },
  { path: "/admin/compliance", guard: "authenticated" },
  { path: "/admin/kyc-aml", guard: "authenticated" },
  { path: "/admin/operations", guard: "authenticated" },
  { path: "/admin/monitoring", guard: "authenticated" },
  { path: "/admin/ai-control-center", guard: "authenticated" },
  { path: "/admin/audit-logs", guard: "authenticated" },
  { path: "/admin/feature-flags", guard: "authenticated", elevatedRequired: true },
  { path: "/admin/emergency-controls", guard: "authenticated", elevatedRequired: true },
  { path: "/admin/system-configuration", guard: "authenticated", elevatedRequired: true },
];

export const ALL_ROUTES: RouteConfig[] = [...PUBLIC_ROUTES, ...INVESTOR_ROUTES, ...AGENT_ROUTES, ...ADMIN_ROUTES];

export function matchRoute(path: string): RouteConfig | undefined {
  const cleanPath = path.split("?")[0].split("#")[0];
  return ALL_ROUTES.find((route) => {
    const pattern = route.path.replace(/:(\w+)/g, "[^/]+");
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(cleanPath);
  });
}

export function getPortalFromPath(path: string): "public" | "investor" | "agent" | "admin" | null {
  if (path.startsWith("/investor")) return "investor";
  if (path.startsWith("/agent")) return "agent";
  if (path.startsWith("/admin")) return "admin";
  return "public";
}
