import {
  applyInvestmentToSupply,
  AssetType,
  createProperty,
  type Property,
  PropertyStatus,
} from "@relcko/domain-core";
import {
  createDocument,
  DocumentCategory,
  type Documents,
} from "@relcko/domain-core";
import {
  createInMemoryMarketplaceRepository,
  type MarketplaceRepository,
  type PropertyAnalytics,
  PropertyMetricsEngine,
  PropertyService,
  PropertySearchService,
  MediaKind,
  type MediaAsset,
  type PropertyMetrics,
  type PropertyTimelineEvent,
  type SearchQuery,
  type SearchResult,
} from "@relcko/marketplace";
import { InMemoryEventBus } from "@relcko/events";
import { MarketplaceAuthorization, anonymousSubject } from "@relcko/marketplace";
import { addressSchema } from "@relcko/validation";
import { generateId } from "@relcko/utils";
import { Currency, Role, type EntityId } from "@relcko/types";

const MANAGER: EntityId = "sys_marketplace" as EntityId;
const CONTRACT = addressSchema.parse("0x0000000000000000000000000000000000000000");
const PLACEHOLDER = (n: number) => `/marketplace/property-${String(n).padStart(2, "0")}.svg`;

interface Seed {
  slug: string;
  name: string;
  description: string;
  location: string; // "City, Region, Country"
  assetType: AssetType;
  totalValue: number;
  tokenPrice: number;
  roi: number;
  rentalYield: number;
  appreciationRate: number;
  minInvestment: number;
  soldPct: number;
  blockchain: string;
  tokenId: string;
  imageCount: number;
  spv: string;
  docs: ReadonlyArray<{ category: DocumentCategory; filename: string }>;
}

const SEED: ReadonlyArray<Seed> = [
  {
    slug: "marbella-villa",
    name: "Marbella Cliffside Villa",
    description: "A Mediterranean villa with panoramic sea views, within a gated resort community on the Costa del Sol.",
    location: "Marbella, Andalusia, Spain",
    assetType: AssetType.Residential,
    totalValue: 2_400_000,
    tokenPrice: 120,
    roi: 8.4,
    rentalYield: 5.6,
    appreciationRate: 3.1,
    minInvestment: 120,
    soldPct: 0.62,
    blockchain: "ethereum",
    tokenId: "101",
    imageCount: 6,
    spv: "Relcko Marbella SPV S.L.",
    docs: [
      { category: DocumentCategory.Title, filename: "Title Deed.pdf" },
      { category: DocumentCategory.Legal, filename: "SPV Constitution.pdf" },
      { category: DocumentCategory.Financial, filename: "Financial Model.pdf" },
    ],
  },
  {
    slug: "lisbon-loft",
    name: "Lisbon Riverside Loft",
    description: "A restored industrial loft in Lisbon's design district, steps from the Tagus riverfront.",
    location: "Lisbon, Lisbon, Portugal",
    assetType: AssetType.Residential,
    totalValue: 980_000,
    tokenPrice: 98,
    roi: 7.9,
    rentalYield: 4.9,
    appreciationRate: 3.4,
    minInvestment: 98,
    soldPct: 0,
    blockchain: "ethereum",
    tokenId: "102",
    imageCount: 6,
    spv: "Relcko Lisboa SPV Lda.",
    docs: [
      { category: DocumentCategory.Title, filename: "Title Deed.pdf" },
      { category: DocumentCategory.Financial, filename: "Financial Model.pdf" },
    ],
  },
  {
    slug: "london-mews",
    name: "Kensington Mews House",
    description: "A Grade II listed mews house in one of London's most sought-after garden squares.",
    location: "London, England, United Kingdom",
    assetType: AssetType.Residential,
    totalValue: 5_200_000,
    tokenPrice: 260,
    roi: 6.2,
    rentalYield: 3.8,
    appreciationRate: 2.6,
    minInvestment: 260,
    soldPct: 0.88,
    blockchain: "ethereum",
    tokenId: "103",
    imageCount: 6,
    spv: "Relcko London SPV Ltd.",
    docs: [
      { category: DocumentCategory.Title, filename: "Title Deed.pdf" },
      { category: DocumentCategory.Legal, filename: "SPV Constitution.pdf" },
      { category: DocumentCategory.Inspection, filename: "Survey Report.pdf" },
    ],
  },
  {
    slug: "nyc-penthouse",
    name: "Manhattan Skyline Penthouse",
    description: "A full-floor penthouse with wrap-around terrace and uninterrupted views of the Manhattan skyline.",
    location: "New York, New York, United States",
    assetType: AssetType.Residential,
    totalValue: 8_900_000,
    tokenPrice: 320,
    roi: 5.8,
    rentalYield: 3.4,
    appreciationRate: 2.9,
    minInvestment: 320,
    soldPct: 0,
    blockchain: "ethereum",
    tokenId: "104",
    imageCount: 6,
    spv: "Relcko NY SPV LLC",
    docs: [
      { category: DocumentCategory.Title, filename: "Title Deed.pdf" },
      { category: DocumentCategory.Financial, filename: "Financial Model.pdf" },
    ],
  },
  {
    slug: "berlin-office",
    name: "Berlin Mitte Creative Office",
    description: "A LEED-certified creative office building anchored by long-term corporate tenants in Mitte.",
    location: "Berlin, Berlin, Germany",
    assetType: AssetType.Commercial,
    totalValue: 3_600_000,
    tokenPrice: 150,
    roi: 7.1,
    rentalYield: 5.1,
    appreciationRate: 2.4,
    minInvestment: 150,
    soldPct: 0.45,
    blockchain: "ethereum",
    tokenId: "105",
    imageCount: 6,
    spv: "Relcko Berlin SPV GmbH",
    docs: [
      { category: DocumentCategory.Legal, filename: "SPV Constitution.pdf" },
      { category: DocumentCategory.Financial, filename: "Financial Model.pdf" },
      { category: DocumentCategory.Inspection, filename: "Technical Due Diligence.pdf" },
    ],
  },
  {
    slug: "amsterdam-hq",
    name: "Amsterdam Canal HQ",
    description: "A canal-house headquarters with mixed retail and office occupancy in the UNESCO canal belt.",
    location: "Amsterdam, North Holland, Netherlands",
    assetType: AssetType.Commercial,
    totalValue: 4_100_000,
    tokenPrice: 175,
    roi: 6.7,
    rentalYield: 4.6,
    appreciationRate: 2.8,
    minInvestment: 175,
    soldPct: 0,
    blockchain: "ethereum",
    tokenId: "106",
    imageCount: 6,
    spv: "Relcko Amsterdam SPV B.V.",
    docs: [
      { category: DocumentCategory.Title, filename: "Title Deed.pdf" },
      { category: DocumentCategory.Legal, filename: "SPV Constitution.pdf" },
    ],
  },
  {
    slug: "tokyo-retail",
    name: "Tokyo Ginza Retail",
    description: "A flagship retail unit in Ginza with a blue-chip tenant on a 10-year triple-net lease.",
    location: "Tokyo, Tokyo, Japan",
    assetType: AssetType.Commercial,
    totalValue: 6_700_000,
    tokenPrice: 210,
    roi: 6.4,
    rentalYield: 4.2,
    appreciationRate: 2.2,
    minInvestment: 210,
    soldPct: 0.73,
    blockchain: "ethereum",
    tokenId: "107",
    imageCount: 6,
    spv: "Relcko Tokyo SPV KK",
    docs: [
      { category: DocumentCategory.Legal, filename: "SPV Constitution.pdf" },
      { category: DocumentCategory.Financial, filename: "Financial Model.pdf" },
    ],
  },
  {
    slug: "dubai-tower",
    name: "Dubai Marina Tower Residence",
    description: "A branded residence in Dubai Marina with resort amenities and a managed rental program.",
    location: "Dubai, Dubai, United Arab Emirates",
    assetType: AssetType.Residential,
    totalValue: 3_100_000,
    tokenPrice: 165,
    roi: 9.1,
    rentalYield: 6.4,
    appreciationRate: 3.6,
    minInvestment: 165,
    soldPct: 0,
    blockchain: "ethereum",
    tokenId: "108",
    imageCount: 6,
    spv: "Relcko Dubai SPV Ltd.",
    docs: [
      { category: DocumentCategory.Title, filename: "Title Deed.pdf" },
      { category: DocumentCategory.Financial, filename: "Financial Model.pdf" },
    ],
  },
  {
    slug: "paris-boutique",
    name: "Paris Le Marais Boutique",
    description: "A boutique retail and upper-floor residence on a historic Le Marais street.",
    location: "Paris, Île-de-France, France",
    assetType: AssetType.Commercial,
    totalValue: 2_800_000,
    tokenPrice: 140,
    roi: 6.0,
    rentalYield: 4.0,
    appreciationRate: 2.7,
    minInvestment: 140,
    soldPct: 0.3,
    blockchain: "ethereum",
    tokenId: "109",
    imageCount: 6,
    spv: "Relcko Paris SPV SAS",
    docs: [
      { category: DocumentCategory.Title, filename: "Title Deed.pdf" },
      { category: DocumentCategory.Legal, filename: "SPV Constitution.pdf" },
    ],
  },
];

interface MarketplaceData {
  repository: MarketplaceRepository;
  propertyService: PropertyService;
  searchService: PropertySearchService;
}

function seed(repository: MarketplaceRepository): void {
  SEED.forEach((s, idx) => {
    const images = Array.from({ length: s.imageCount }, (_, i) => PLACEHOLDER(idx * s.imageCount + i + 1));
    const property = createProperty({
      slug: s.slug,
      name: s.name,
      description: s.description,
      location: s.location,
      assetType: s.assetType,
      totalValue: s.totalValue,
      tokenPrice: s.tokenPrice,
      totalTokens: 10_000n,
      currency: Currency.USDT,
      expectedRoi: s.roi,
      rentalYield: s.rentalYield,
      appreciationRate: s.appreciationRate,
      minInvestment: s.minInvestment,
      blockchain: s.blockchain,
      contractAddress: CONTRACT,
      tokenId: s.tokenId,
      images,
      spvId: `spv_${s.slug}` as EntityId,
    });
    repository.saveProperty(property);

    if (s.soldPct > 0) {
      const sold = BigInt(Math.floor(Number(property.totalTokens) * s.soldPct));
      repository.saveProperty(applyInvestmentToSupply(property, sold));
    }

    // Media
    images.forEach((url, i) => {
      const media: MediaAsset = {
        id: generateId("media"),
        propertyId: property.id,
        kind: i === 0 ? MediaKind.Image : i === images.length - 1 ? MediaKind.FloorPlan : MediaKind.Image,
        url,
        title: i === 0 ? `${s.name} — hero` : i === images.length - 1 ? `${s.name} — floor plan` : `${s.name} — gallery ${i}`,
        uploadedBy: MANAGER,
        uploadedAt: new Date(Date.UTC(2025, 0, 10 + idx)).toISOString(),
      };
      repository.saveMedia(media);
    });

    // Documents
    s.docs.forEach((d, i) => {
      const doc: Documents = createDocument({
        propertyId: property.id,
        uploaderId: MANAGER,
        category: d.category,
        filename: d.filename,
        url: `#${d.filename}`,
        size: 120_000 + i * 40_000,
        isPublic: true,
      });
      repository.saveDocument(doc);
    });

    // Timeline
    const timeline: ReadonlyArray<Omit<PropertyTimelineEvent, "id" | "propertyId" | "actorId">> = [
      { type: "property.listed", occurredAt: new Date(Date.UTC(2025, 0, 12 + idx)).toISOString(), payload: { status: "active" } },
      { type: "property.verified", occurredAt: new Date(Date.UTC(2025, 0, 15 + idx)).toISOString(), payload: { kyc: "approved" } },
      { type: "property.funded", occurredAt: new Date(Date.UTC(2025, 1, 2 + idx)).toISOString(), payload: { pct: s.soldPct } },
    ];
    timeline.forEach((e) => {
      const event: PropertyTimelineEvent = { id: generateId("tle"), propertyId: property.id, actorId: MANAGER, ...e };
      repository.saveTimelineEvent(event);
    });

    // Engagement signal
    const views = 20 + idx * 17;
    for (let v = 0; v < views; v++) repository.recordView(property.id);
  });
}

const GLOBAL_KEY = Symbol.for("relcko.marketplace.data");

function getData(): MarketplaceData {
  const g = globalThis as unknown as Record<symbol, MarketplaceData | undefined>;
  if (g[GLOBAL_KEY]) return g[GLOBAL_KEY] as MarketplaceData;

  const repository = createInMemoryMarketplaceRepository();
  seed(repository);
  const auth = new MarketplaceAuthorization();
  const bus = new InMemoryEventBus();
  const propertyService = new PropertyService(repository, auth, bus);
  const searchService = new PropertySearchService(repository, auth);
  const data: MarketplaceData = { repository, propertyService, searchService };
  g[GLOBAL_KEY] = data;
  return data;
}

export function listProperties(): Property[] {
  return getData().repository.listProperties();
}

export function getPropertyBySlug(slug: string): Property | undefined {
  return getData().repository.getPropertyBySlug(slug);
}

export function getPropertyById(id: string): Property | undefined {
  return getData().repository.getProperty(id as EntityId);
}

export function getMetrics(id: string): PropertyMetrics {
  return getData().propertyService.getMetrics(id);
}

export function getMedia(id: string): MediaAsset[] {
  return getData().repository.listMediaByProperty(id as EntityId);
}

export function getDocuments(id: string): Documents[] {
  return getData().repository.listDocumentsByProperty(id as EntityId).filter((d) => d.isPublic);
}

export function getTimeline(id: string): PropertyTimelineEvent[] {
  return getData().repository.listTimeline(id as EntityId);
}

export function getAnalytics(id: string): PropertyAnalytics {
  return getData().repository.getAnalytics(id as EntityId);
}

export function getRelated(property: Property, limit = 3): Property[] {
  return getData()
    .repository.listProperties()
    .filter((p) => p.id !== property.id && (p.assetType === property.assetType || p.location.endsWith(property.location.split(",").slice(-1)[0])))
    .slice(0, limit);
}

export async function searchMarketplace(query: SearchQuery): Promise<SearchResult> {
  return getData().searchService.search(anonymousSubject(), query);
}

export const MARKETPLACE_MANAGER_ROLE = Role.PropertyManager;
export { PropertyMetricsEngine };
