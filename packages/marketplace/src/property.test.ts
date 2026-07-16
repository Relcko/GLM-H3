import { describe, it, expect } from "vitest";
import { AssetType, PropertyStatus } from "@relcko/domain-core";
import { MarketplaceEventType } from "./events";
import { ANON, createActiveProperty, eid, INVESTOR, MANAGER, makeMarketplace, makePropertyInput } from "./test-helpers";

describe("PropertyService", () => {
  it("creates a property (Draft) and emits property.created", async () => {
    const { mp, bus } = makeMarketplace();
    const p = await mp.properties.create(MANAGER(), makePropertyInput());
    expect(p.status).toBe(PropertyStatus.Draft);
    expect(bus.publishedOfType(MarketplaceEventType.PropertyCreated).length).toBe(1);
  });

  it("publishes and activates through the frozen lifecycle", async () => {
    const { mp } = makeMarketplace();
    const p = await mp.properties.create(MANAGER(), makePropertyInput());
    const published = await mp.properties.publish(MANAGER(), p.id);
    expect(published.status).toBe(PropertyStatus.Upcoming);
    const active = await mp.properties.activate(MANAGER(), p.id);
    expect(active.status).toBe(PropertyStatus.Active);
  });

  it("emits workflow events without changing business state (review)", async () => {
    const { mp, bus } = makeMarketplace();
    const p = await mp.properties.create(MANAGER(), makePropertyInput());
    await mp.properties.submitForReview(MANAGER(), p.id);
    await mp.properties.approveReview(MANAGER(), p.id);
    expect(p.status).toBe(PropertyStatus.Draft);
    expect(bus.publishedOfType(MarketplaceEventType.PropertyReviewApproved).length).toBe(1);
  });

  it("computes metrics and funding percentage", async () => {
    const { mp } = makeMarketplace();
    const p = await createActiveProperty(mp);
    const m = mp.properties.getMetrics(p.id);
    expect(m.fundingPct).toBe(0);
    expect(m.availableFractions).toBe(10_000n);
    expect(m.investorCount).toBe(0);
  });

  it("rejects ineligible investments via the eligibility engine", async () => {
    const { mp } = makeMarketplace();
    const p = await createActiveProperty(mp);
    const result = mp.properties.checkEligibility(p.id, {
      tokens: 11_000n,
      amount: { amount: 11_000n * 100n * 1_000_000n, currency: p.totalValue.currency },
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons.some((r) => r.includes("available supply"))).toBe(true);
  });

  it("searches by keyword and asset type", async () => {
    const { mp } = makeMarketplace();
    await createActiveProperty(mp, MANAGER(), { slug: "villa-a", name: "Villa A", description: "A villa property" });
    await createActiveProperty(mp, MANAGER(), {
      slug: "loft-b",
      name: "Loft B",
      description: "A loft property",
      assetType: AssetType.Commercial,
    });
    const byKeyword = await mp.properties.search(ANON(), { keyword: "villa" });
    expect(byKeyword.total).toBe(1);
    const byType = await mp.properties.search(ANON(), { assetType: AssetType.Commercial });
    expect(byType.total).toBe(1);
  });

  it("attaches private documents (discipline-gated) and public media", async () => {
    const { mp } = makeMarketplace();
    const p = await createActiveProperty(mp);
    await mp.properties.documents.add(MANAGER(), {
      propertyId: p.id,
      category: "legal",
      filename: "title.pdf",
      url: "https://example.com/title.pdf",
      size: 1234,
    });
    expect(mp.properties.documents.list(ANON(), p.id).length).toBe(0);
    expect(mp.properties.documents.list(MANAGER(), p.id, true).length).toBe(1);
    const media = await mp.properties.media.add(MANAGER(), { propertyId: p.id, kind: "image", url: "https://example.com/a.png" });
    expect(mp.properties.media.list(p.id).length).toBe(1);
    expect(media.kind).toBe("image");
  });

  it("records timeline and analytics on view", async () => {
    const { mp } = makeMarketplace();
    const p = await createActiveProperty(mp);
    await mp.properties.analytics.recordView(INVESTOR(), p.id, eid("acc_investor"));
    expect(mp.properties.analytics.get(p.id).views).toBe(1);
    expect(mp.properties.timeline.list(p.id).length).toBeGreaterThan(0);
  });
});
