import { describe, expect, it } from "vitest";
import {
  getMarketplacePropertyDetail,
  relatedSlugsFor,
  resolveProperties,
} from "./detail";
import { getMarketplaceProperties } from "./properties";

describe("property detail generator", () => {
  it("returns null for unknown slug", () => {
    expect(getMarketplacePropertyDetail("does-not-exist")).toBeNull();
  });

  it("builds a full detail projection for a known slug", () => {
    const detail = getMarketplacePropertyDetail("azure-harbour-residences");
    expect(detail).not.toBeNull();
    expect(detail!.slug).toBe("azure-harbour-residences");
    expect(detail!.amenities.length).toBeGreaterThan(0);
    expect(detail!.documents.length).toBeGreaterThan(0);
    expect(detail!.timeline.length).toBeGreaterThan(0);
    expect(detail!.faq.length).toBeGreaterThan(0);
    expect(detail!.risk.level).toBeTruthy();
    expect(detail!.ownership.tokenStandard).toBe("ERC-1155");
    expect(detail!.relatedSlugs.length).toBeGreaterThan(0);
  });

  it("flags SPV-backed assets with an SPV agreement document", () => {
    const detail = getMarketplacePropertyDetail("azure-harbour-residences");
    expect(detail!.hasSpv).toBe(true);
    expect(detail!.documents.some((d) => d.category === "legal" && d.title.includes("SPV"))).toBe(
      true
    );
  });

  it("computes risk level from occupancy", () => {
    const low = getMarketplacePropertyDetail("azure-harbour-residences"); // 94% occupancy, active
    expect(low!.risk.level).toBe("low");
    const elevated = getMarketplacePropertyDetail("provence-olive-domain"); // 82% occupancy
    expect(elevated!.risk.level).toBe("elevated");
  });

  it("builds related slugs preferring same asset type", () => {
    const all = getMarketplaceProperties();
    const base = all.find((p) => p.slug === "sonoma-vineyard-estate")!; // land
    const related = relatedSlugsFor(base, all, 3);
    expect(related.length).toBeLessThanOrEqual(3);
    // the only 'land' property other than itself should rank first
    const otherLand = all.find((p) => p.assetType === "land" && p.id !== base.id);
    if (otherLand) expect(related[0]).toBe(otherLand.slug);
  });

  it("resolves related slugs to properties", () => {
    const detail = getMarketplacePropertyDetail("kingsway-logistics-park")!;
    const related = resolveProperties(detail.relatedSlugs);
    expect(related.length).toBe(detail.relatedSlugs.length);
  });
});
