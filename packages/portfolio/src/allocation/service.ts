import type { EntityId, Money } from "@relcko/types";
import { Currency } from "@relcko/types";
import { nowIso } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { PortfolioRepository } from "../repository";
import type {
  AllocationResult,
  AssetAllocationEntry,
  GeographicAllocationEntry,
  PropertyTypeAllocationEntry,
  PortfolioHolding,
} from "../types";
import { PortfolioEventType, publishPortfolioEvent } from "../events";
import { AllocationError } from "../errors";

export class AllocationEngine {
  private allocationCache = new Map<string, AllocationResult>();

  constructor(
    private readonly repository: PortfolioRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  computeAllocation(actorId: EntityId, investorId: EntityId): AllocationResult {
    const holdings = this.repository.listHoldingsByInvestor(investorId);

    const assetAllocation = this.getAssetAllocation(holdings);
    const geographicAllocation = this.computeGeographicAllocation(holdings);
    const propertyTypeAllocation = this.computePropertyTypeAllocation(holdings);
    const diversificationScore = this.getDiversificationScore(assetAllocation);

    const result: AllocationResult = {
      assetAllocation,
      geographicAllocation,
      propertyTypeAllocation,
      diversificationScore,
    };

    this.allocationCache.set(investorId as string, result);

    publishPortfolioEvent(this.events, PortfolioEventType.PortfolioAllocationComputed, investorId, actorId, {
      investorId: investorId as string,
      diversificationScore,
    });

    return result;
  }

  getAssetAllocation(holdings: readonly PortfolioHolding[]): AssetAllocationEntry[] {
    const totals = new Map<string, bigint>();
    let totalValue = 0n;
    const currencies = new Map<string, Currency>();

    for (const h of holdings) {
      const key = h.assetType;
      totals.set(key, (totals.get(key) ?? 0n) + h.currentValue.amount);
      totalValue += h.currentValue.amount;
      currencies.set(key, h.currentValue.currency);
    }

    return Array.from(totals.entries())
      .map(([category, value]) => ({
        category,
        value: { amount: value, currency: currencies.get(category) ?? Currency.USDC },
        percentage: totalValue > 0n ? Number((value * 10000n) / totalValue) / 100 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }

  getDiversificationScore(allocations: readonly AssetAllocationEntry[]): number {
    if (allocations.length === 0) return 0;
    const ideal = 100 / allocations.length;
    let deviation = 0;
    for (const a of allocations) {
      deviation += Math.abs(a.percentage - ideal);
    }
    const score = 100 - deviation / 2;
    return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
  }

  getAllocation(investorId: EntityId): AllocationResult | undefined {
    return this.allocationCache.get(investorId as string);
  }

  private computeGeographicAllocation(holdings: readonly PortfolioHolding[]): GeographicAllocationEntry[] {
    const regionMap = new Map<string, { value: bigint; currency: Currency }>();
    const regionPatterns: Record<string, RegExp> = {
      "North America": /(US|USA|United States|Canada|North America|NY|CA|TX|FL)/i,
      "Europe": /(EU|Europe|UK|Germany|France|Spain|Italy|London|Berlin|Paris|Zurich)/i,
      "Asia Pacific": /(Asia|APAC|Singapore|Hong Kong|Tokyo|Sydney|Australia|Japan)/i,
      "Middle East": /(Middle East|Dubai|UAE|Saudi|Qatar|Abu Dhabi)/i,
      "Latin America": /(Latin America|Brazil|Mexico|Argentina|Colombia|Chile)/i,
    };

    for (const h of holdings) {
      let matched = false;
      for (const [region, pattern] of Object.entries(regionPatterns)) {
        if (pattern.test(h.name)) {
          const existing = regionMap.get(region) ?? { value: 0n, currency: h.currentValue.currency };
          regionMap.set(region, {
            value: existing.value + h.currentValue.amount,
            currency: h.currentValue.currency,
          });
          matched = true;
          break;
        }
      }
      if (!matched) {
        const existing = regionMap.get("Unknown") ?? { value: 0n, currency: h.currentValue.currency };
        regionMap.set("Unknown", {
          value: existing.value + h.currentValue.amount,
          currency: h.currentValue.currency,
        });
      }
    }

    const totalValue = Array.from(regionMap.values()).reduce((s, v) => s + v.value, 0n);
    return Array.from(regionMap.entries())
      .map(([region, { value, currency }]) => ({
        region,
        value: { amount: value, currency },
        percentage: totalValue > 0n ? Number((value * 10000n) / totalValue) / 100 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }

  private computePropertyTypeAllocation(holdings: readonly PortfolioHolding[]): PropertyTypeAllocationEntry[] {
    const typeMap = new Map<string, { value: bigint; currency: Currency }>();
    const typePatterns: Record<string, RegExp> = {
      Residential: /(Residential|Apartment|Condo|House|Home|Villa|Townhouse)/i,
      Commercial: /(Commercial|Office|Retail|Shop|Warehouse|Industrial|Strip Mall)/i,
      Land: /(Land|Plot|Vacant|Development|Raw Land)/i,
      "Mixed Use": /(Mixed Use|Mixed-Use|Multi-Family|Multifamily)/i,
      NFT: /(NFT|Digital|Token|Virtual|Collectible)/i,
    };

    for (const h of holdings) {
      if (h.assetType === "nft" || h.assetType === "fraction") {
        const key = h.assetType === "nft" ? "NFT" : "Fractional";
        const existing = typeMap.get(key) ?? { value: 0n, currency: h.currentValue.currency };
        typeMap.set(key, {
          value: existing.value + h.currentValue.amount,
          currency: h.currentValue.currency,
        });
        continue;
      }

      let matched = false;
      for (const [type, pattern] of Object.entries(typePatterns)) {
        if (type === "NFT") continue;
        if (pattern.test(h.name)) {
          const existing = typeMap.get(type) ?? { value: 0n, currency: h.currentValue.currency };
          typeMap.set(type, {
            value: existing.value + h.currentValue.amount,
            currency: h.currentValue.currency,
          });
          matched = true;
          break;
        }
      }
      if (!matched) {
        const existing = typeMap.get("Other") ?? { value: 0n, currency: h.currentValue.currency };
        typeMap.set("Other", {
          value: existing.value + h.currentValue.amount,
          currency: h.currentValue.currency,
        });
      }
    }

    const totalValue = Array.from(typeMap.values()).reduce((s, v) => s + v.value, 0n);
    return Array.from(typeMap.entries())
      .map(([propertyType, { value, currency }]) => ({
        propertyType,
        value: { amount: value, currency },
        percentage: totalValue > 0n ? Number((value * 10000n) / totalValue) / 100 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }
}
