/**
 * Detail projection generator for the marketplace mock dataset.
 *
 * Produces the secondary surfaces (documents, amenities, lifecycle timeline,
 * FAQ, risk disclosure, ownership structure) deterministically from the base
 * property attributes. This is display seed data only — no business logic,
 * no validation, no duplication of backend rules. The backend contract remains
 * `MarketplacePropertyDetail`; this module is the swap point for a real API.
 */

import type {
  AssetType,
  FaqItem,
  OwnershipStructure,
  PropertyAmenityGroup,
  PropertyDocument,
  PropertyStatus,
  PropertyTimelineEvent,
  RiskDisclosure,
} from "@/marketplace/domain";
import type {
  MarketplaceProperty,
  MarketplacePropertyDetail,
} from "@/marketplace/types";
import { getMarketplaceProperties } from "./properties";

const AMENITIES_BY_TYPE: Record<AssetType, PropertyAmenityGroup[]> = {
  residential: [
    {
      category: "Building",
      items: [
        "Concierge",
        "Fitness Centre",
        "Rooftop Terrace",
        "Underground Parking",
        "Smart Home Controls",
      ],
    },
    {
      category: "Services",
      items: ["Housekeeping", "Private Marina Access", "24/7 Security"],
    },
    {
      category: "Sustainability",
      items: ["Solar Pre-wiring", "Greywater Recycling", "EV Charging"],
    },
  ],
  commercial: [
    {
      category: "Building",
      items: [
        "Loading Bays",
        "Fiber Connectivity",
        "On-site Management",
        "Staff Amenities",
      ],
    },
    {
      category: "Services",
      items: ["24/7 Security", "Facilities Management", "Concierge Reception"],
    },
    {
      category: "Sustainability",
      items: ["EV Charging", "LED Lighting", "BMS Controls"],
    },
  ],
  land: [
    {
      category: "Estate",
      items: ["Gated Access", "Irrigation", "Worker Housing", "Solar Power"],
    },
    {
      category: "Hospitality",
      items: ["Cellar Door", "Tasting Room", "Farm Stay Villa"],
    },
    {
      category: "Operations",
      items: ["Equipment Shed", "Cold Storage", "Estate Road Network"],
    },
  ],
};

function buildDocuments(
  slug: string,
  hasSpv: boolean,
  status: PropertyStatus
): PropertyDocument[] {
  const docs: PropertyDocument[] = [
    {
      id: `${slug}-prospectus`,
      title: "Investment Prospectus",
      category: "financial",
      kind: "PDF",
      sizeLabel: "2.4 MB",
      url: `https://docs.relcko.com/${slug}/prospectus.pdf`,
      public: true,
    },
    {
      id: `${slug}-valuation`,
      title: "Independent Valuation Report",
      category: "financial",
      kind: "PDF",
      sizeLabel: "1.8 MB",
      url: `https://docs.relcko.com/${slug}/valuation.pdf`,
      public: true,
    },
    {
      id: `${slug}-title`,
      title: "Title Deed Verification",
      category: "legal",
      kind: "PDF",
      sizeLabel: "0.9 MB",
      url: `https://docs.relcko.com/${slug}/title.pdf`,
      public: true,
    },
    {
      id: `${slug}-insurance`,
      title: "Property & Title Insurance Certificate",
      category: "compliance",
      kind: "PDF",
      sizeLabel: "0.6 MB",
      url: `https://docs.relcko.com/${slug}/insurance.pdf`,
      public: false,
    },
    {
      id: `${slug}-audit`,
      title: "Annual Audit Summary",
      category: "compliance",
      kind: "PDF",
      sizeLabel: "1.1 MB",
      url: `https://docs.relcko.com/${slug}/audit.pdf`,
      public: status !== "upcoming",
    },
  ];
  if (hasSpv) {
    docs.push({
      id: `${slug}-spv`,
      title: "SPV Formation & Governing Agreement",
      category: "legal",
      kind: "PDF",
      sizeLabel: "1.3 MB",
      url: `https://docs.relcko.com/${slug}/spv-agreement.pdf`,
      public: true,
    });
  }
  return docs;
}

function buildTimeline(
  createdAt: string,
  updatedAt: string,
  status: PropertyStatus
): PropertyTimelineEvent[] {
  const acquired = createdAt;
  const offering =
    status === "upcoming" ? updatedAt : createdAt;
  const operational =
    status === "active" || status === "sold_out" || status === "closed"
      ? updatedAt
      : "";

  const events: PropertyTimelineEvent[] = [
    {
      date: acquired,
      title: "Asset Acquisition",
      description: "Property acquired and onboarded to the Relcko pipeline.",
      status: "done",
    },
    {
      date: acquired,
      title: "SPV Formation",
      description: "Dedicated special-purpose vehicle established for the asset.",
      status: "done",
    },
    {
      date: offering,
      title: "Tokenization & Listing",
      description: "Property tokenized and published to the marketplace.",
      status: status === "upcoming" ? "active" : "done",
    },
  ];

  if (status === "active" || status === "sold_out" || status === "closed") {
    events.push({
      date: updatedAt,
      title: "Funding Milestone Reached",
      description: "Primary allocation opened to verified investors.",
      status: "done",
    });
  }
  if (operational) {
    events.push({
      date: operational,
      title: "Operational & Distribution",
      description: "Asset operational; distributions streamed to holders.",
      status: status === "closed" ? "done" : "active",
    });
  }
  return events;
}

function buildFaq(name: string): FaqItem[] {
  return [
    {
      question: `What exactly do I own in ${name}?`,
      answer:
        "Your tokens represent fractional legal beneficial ownership of the SPV that holds the asset. Holdings are verifiable on-chain at any time.",
    },
    {
      question: "How are returns distributed?",
      answer:
        "Rental income and realized gains are streamed to your wallet in stablecoin, proportional to your token holdings, on a monthly cadence.",
    },
    {
      question: "What is the minimum investment?",
      answer:
        "Ownership is accessible from a single fraction. The minimum is shown on the investment panel and enforced at checkout.",
    },
    {
      question: "Can I exit before maturity?",
      answer:
        "Yes — the secondary market lets you list fractions at any time. Settlement is global and near-instant, subject to KYC.",
    },
  ];
}

function buildRisk(
  occupancy: number,
  status: PropertyStatus
): RiskDisclosure {
  let level: RiskDisclosure["level"] = "low";
  if (status === "upcoming") level = "moderate";
  else if (occupancy < 85) level = "elevated";

  const items: string[] = [
    "Property values are subject to local market cycles and currency movement.",
    "Distributions depend on tenancy and operating performance.",
    "Regulatory treatment of tokenized ownership varies by jurisdiction.",
  ];
  if (status === "upcoming") {
    items.unshift("Offering has not yet opened; allocations are not guaranteed.");
  }
  if (occupancy < 85) {
    items.unshift("Current occupancy is below the portfolio average.");
  }

  return {
    level,
    summary:
      level === "low"
        ? "Well-leased, operational asset with stable cash flows."
        : level === "moderate"
          ? "Pre-offering asset; returns contingent on successful funding."
          : "Asset carries elevated vacancy exposure relative to the portfolio.",
    items,
  };
}

function buildOwnership(
  hasSpv: boolean,
  spvLegalName: string,
  jurisdiction: string,
  registrationNumber: string,
  beneficialHolders: number
): OwnershipStructure {
  return {
    model: hasSpv
      ? "SPV-backed fractional title"
      : "Direct fractional title",
    spvLegalName: hasSpv ? spvLegalName : "—",
    jurisdiction: hasSpv ? jurisdiction : "—",
    registrationNumber: hasSpv ? registrationNumber : "—",
    beneficialHolders,
    tokenStandard: "ERC-1155",
    custody: "Institutional qualified custody with on-chain attestations.",
  };
}

function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Resolve a single property's full detail projection, or null. */
export function getMarketplacePropertyDetail(
  slug: string
): MarketplacePropertyDetail | null {
  const all = getMarketplaceProperties();
  const base = all.find((p) => p.slug === slug);
  if (!base) return null;

  const holders = 120 + (stableHash(slug) % 1800);

  return {
    ...base,
    amenities: AMENITIES_BY_TYPE[base.assetType],
    documents: buildDocuments(base.slug, base.hasSpv, base.status),
    timeline: buildTimeline(base.createdAt, base.updatedAt, base.status),
    faq: buildFaq(base.name),
    risk: buildRisk(base.occupancy, base.status),
    ownership: buildOwnership(
      base.hasSpv,
      base.spv?.legal_name ?? "",
      base.spv?.jurisdiction ?? "",
      base.spv?.registration_number ?? "",
      holders
    ),
    relatedSlugs: relatedSlugsFor(base, all),
  };
}

/** Slugs of up to `limit` related properties (same type first, then others). */
export function relatedSlugsFor(
  base: MarketplaceProperty,
  all: MarketplaceProperty[],
  limit = 3
): string[] {
  const sameType = all
    .filter((p) => p.id !== base.id && p.assetType === base.assetType)
    .map((p) => p.slug);
  const others = all
    .filter((p) => p.id !== base.id && p.assetType !== base.assetType)
    .map((p) => p.slug);
  return [...sameType, ...others].slice(0, limit);
}

/** Resolve a list of slugs to full properties (for related sections). */
export function resolveProperties(
  slugs: string[]
): MarketplaceProperty[] {
  const all = getMarketplaceProperties();
  return slugs
    .map((s) => all.find((p) => p.slug === s))
    .filter((p): p is MarketplaceProperty => p != null);
}
