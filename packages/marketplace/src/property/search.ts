import type { Property } from "@relcko/domain-core";
import type { SearchQuery, SearchResult } from "../types";
import { Action } from "@relcko/permission";
import type { Principal } from "../authorization";
import { MarketplaceAuthorization } from "../authorization";
import { validateSearchQuery } from "../validation";
import type { MarketplaceRepository } from "../repository";

/**
 * Search index abstraction. The marketplace searches over the frozen
 * `Property` entities stored in the repository; this index compiles them into a
 * queryable structure. A real deployment can swap the in-memory implementation
 * for an external index (Elasticsearch/Algolia) without changing the service.
 */
export interface MarketplaceSearchIndex {
  index(properties: readonly Property[]): void;
  search(query: SearchQuery): Property[];
}

function fundingPct(p: Property): number {
  return p.totalTokens === 0n ? 0 : Number((p.soldTokens * 10_000n) / p.totalTokens) / 100;
}

function matches(p: Property, q: SearchQuery): boolean {
  if (q.assetType !== undefined && p.assetType !== q.assetType) return false;
  if (q.status !== undefined && p.status !== q.status) return false;
  if (q.availableOnly && p.availableTokens <= 0n) return false;

  const loc = p.location.toLowerCase();
  if (q.country && !loc.includes(q.country.toLowerCase())) return false;
  if (q.region && !loc.includes(q.region.toLowerCase())) return false;
  if (q.city && !loc.includes(q.city.toLowerCase())) return false;

  if (q.keyword) {
    const kw = q.keyword.toLowerCase();
    const hay = `${p.name} ${p.slug} ${p.description}`.toLowerCase();
    if (!hay.includes(kw)) return false;
  }

  const fp = fundingPct(p);
  if (q.roiMin !== undefined && p.expectedRoi < q.roiMin) return false;
  if (q.roiMax !== undefined && p.expectedRoi > q.roiMax) return false;
  if (q.yieldMin !== undefined && p.rentalYield < q.yieldMin) return false;
  if (q.yieldMax !== undefined && p.rentalYield > q.yieldMax) return false;
  if (q.fundingMin !== undefined && fp < q.fundingMin) return false;
  if (q.fundingMax !== undefined && fp > q.fundingMax) return false;
  if (q.minInvestmentMax !== undefined) {
    const major = Number(p.minInvestment.amount) / 10 ** 6;
    if (major > q.minInvestmentMax) return false;
  }
  return true;
}

function sortProperties(items: Property[], q: SearchQuery): Property[] {
  const sort = q.sort ?? "createdAt";
  const dir = q.order === "asc" ? 1 : -1;
  const value = (p: Property): number | string => {
    switch (sort) {
      case "funding":
        return fundingPct(p);
      case "roi":
        return p.expectedRoi;
      case "yield":
        return p.rentalYield;
      case "tokenPrice":
        return Number(p.tokenPrice.amount);
      case "createdAt":
      default:
        return p.createdAt;
    }
  };
  return [...items].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (typeof va === "string" || typeof vb === "string") {
      return String(va).localeCompare(String(vb)) * dir;
    }
    return (va - vb) * dir;
  });
}

export class InMemorySearchIndex implements MarketplaceSearchIndex {
  private docs: Property[] = [];
  index(properties: readonly Property[]): void {
    this.docs = [...properties];
  }
  search(query: SearchQuery): Property[] {
    const filtered = this.docs.filter((p) => matches(p, query));
    return sortProperties(filtered, query);
  }
}

export class PropertySearchService {
  constructor(
    private readonly repository: MarketplaceRepository,
    private readonly auth: MarketplaceAuthorization,
    private readonly index: MarketplaceSearchIndex = new InMemorySearchIndex(),
  ) {}

  async search(principal: Principal, query: SearchQuery): Promise<SearchResult> {
    this.auth.assert(principal, Action.Browse);
    const validated = validateSearchQuery(query);
    this.index.index(this.repository.listProperties());
    const all = this.index.search(validated);
    const page = validated.page ?? 0;
    const pageSize = validated.pageSize ?? (all.length || 1);
    const start = page * pageSize;
    return {
      items: all.slice(start, start + pageSize),
      total: all.length,
      page,
      pageSize,
    };
  }
}
