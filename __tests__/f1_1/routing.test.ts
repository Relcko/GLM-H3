import { describe, it, expect } from "vitest";
import { matchRoute, getPortalFromPath, INVESTOR_ROUTES } from "@/lib/shared/routing";
import { INVESTOR_NAV_ITEMS } from "@/lib/investor/navigation";

const INVESTOR_PATHS = [
  "/investor/dashboard",
  "/investor/portfolio",
  "/investor/marketplace",
  "/investor/investments",
  "/investor/nfts",
  "/investor/governance",
  "/investor/treasury-history",
  "/investor/ai-advisor",
  "/investor/documents",
  "/investor/notifications",
  "/investor/wallet",
  "/investor/settings",
  "/investor/kyc",
];

describe("F1.1 Routing Validation", () => {
  describe("investor routes are defined in routing config", () => {
    INVESTOR_PATHS.forEach((path) => {
      it(`matches route: ${path}`, () => {
        const route = matchRoute(path);
        expect(route).toBeDefined();
        expect(route?.guard).toBe("authenticated");
      });
    });
  });

  describe("investor routes exist in INVESTOR_ROUTES config", () => {
    INVESTOR_PATHS.forEach((path) => {
      it(`has route config for: ${path}`, () => {
        const found = INVESTOR_ROUTES.find((r) => r.path === path);
        expect(found).toBeDefined();
      });
    });
  });

  describe("getPortalFromPath", () => {
    INVESTOR_PATHS.forEach((path) => {
      it(`identifies ${path} as investor portal`, () => {
        expect(getPortalFromPath(path)).toBe("investor");
      });
    });
  });

  describe("INVESTOR_NAV_ITEMS", () => {
    it("all nav items have valid hrefs", () => {
      INVESTOR_NAV_ITEMS.forEach((item) => {
        expect(item.href).toBeDefined();
        expect(item.href).toMatch(/^\/investor\//);
      });
    });

    it("all nav item routes are in INVESTOR_ROUTES", () => {
      INVESTOR_NAV_ITEMS.forEach((item) => {
        const found = INVESTOR_ROUTES.find((r) => r.path === item.href);
        expect(found, `Nav item "${item.label}" href "${item.href}" not found in INVESTOR_ROUTES`).toBeDefined();
      });
    });

    it("investor root /investor is a valid route", () => {
      const route = matchRoute("/investor");
      expect(route).toBeDefined();
      expect(route?.guard).toBe("authenticated");
    });
  });
});
