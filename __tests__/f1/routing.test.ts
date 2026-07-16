import { describe, it, expect } from "vitest";
import { matchRoute, getPortalFromPath, PUBLIC_ROUTES, INVESTOR_ROUTES, AGENT_ROUTES, ADMIN_ROUTES } from "@/lib/shared/routing";

describe("routing", () => {
  describe("matchRoute", () => {
    it("matches public routes", () => {
      const route = matchRoute("/marketplace");
      expect(route?.path).toBe("/marketplace");
      expect(route?.guard).toBe("public");
    });

    it("matches parameterized routes", () => {
      const route = matchRoute("/marketplace/property/123");
      expect(route?.path).toBe("/marketplace/property/:propertyId");
    });

    it("matches investor routes", () => {
      const route = matchRoute("/investor/dashboard");
      expect(route?.path).toBe("/investor/dashboard");
      expect(route?.guard).toBe("authenticated");
    });

    it("matches agent routes", () => {
      const route = matchRoute("/agent/leads/lead-1");
      expect(route?.path).toBe("/agent/leads/:leadId");
    });

    it("matches admin routes", () => {
      const route = matchRoute("/admin/emergency-controls");
      expect(route?.path).toBe("/admin/emergency-controls");
      expect(route?.elevatedRequired).toBe(true);
    });

    it("returns undefined for unknown routes", () => {
      expect(matchRoute("/unknown")).toBeUndefined();
    });

    it("handles query strings", () => {
      const route = matchRoute("/investor?tab=portfolio");
      expect(route?.path).toBe("/investor");
    });
  });

  describe("getPortalFromPath", () => {
    it("detects investor portal", () => {
      expect(getPortalFromPath("/investor/dashboard")).toBe("investor");
    });

    it("detects agent portal", () => {
      expect(getPortalFromPath("/agent/leads")).toBe("agent");
    });

    it("detects admin portal", () => {
      expect(getPortalFromPath("/admin/users")).toBe("admin");
    });

    it("returns public for root", () => {
      expect(getPortalFromPath("/")).toBe("public");
    });
  });

  describe("route configurations", () => {
    it("has public routes defined", () => {
      expect(PUBLIC_ROUTES.length).toBeGreaterThan(0);
    });

    it("has investor routes defined", () => {
      expect(INVESTOR_ROUTES.length).toBeGreaterThan(0);
    });

    it("has agent routes defined", () => {
      expect(AGENT_ROUTES.length).toBeGreaterThan(0);
    });

    it("has admin routes defined", () => {
      expect(ADMIN_ROUTES.length).toBeGreaterThan(0);
    });
  });
});
