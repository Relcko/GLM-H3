import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { PerformanceModuleContext } from "@relcko/performance";
import { MarketplaceAuthorization, type Principal } from "./authorization";
import type { MarketplaceRepository } from "./repository";
import { PropertyService } from "./property/service";
import { InvestmentService } from "./investment/service";
import { ListingService } from "./listing/service";
import { CollectionsService } from "./collections/service";

/**
 * Marketplace domain service. The top-level orchestrator that wires the
 * repository, shared EventBus, shared Permission Engine and logger into the
 * domain services. This is the single composition root for the marketplace
 * backend; transport/API layers consume this, never the packages directly.
 */
export interface MarketplaceDeps {
  readonly repository: MarketplaceRepository;
  readonly eventBus: EventBus;
  readonly authorization?: MarketplaceAuthorization;
  readonly logger?: Logger;
  readonly performance?: PerformanceModuleContext;
}

export class Marketplace {
  readonly properties: PropertyService;
  readonly investments: InvestmentService;
  readonly listings: ListingService;
  readonly collections: CollectionsService;
  readonly authorization: MarketplaceAuthorization;
  readonly performance?: PerformanceModuleContext;

  constructor(deps: MarketplaceDeps) {
    this.authorization = deps.authorization ?? new MarketplaceAuthorization();
    this.performance = deps.performance;
    this.properties = new PropertyService(deps.repository, this.authorization, deps.eventBus, deps.logger);
    this.investments = new InvestmentService(deps.repository, this.authorization, deps.eventBus, deps.logger);
    this.listings = new ListingService(deps.repository, this.authorization, deps.eventBus, deps.logger);
    this.collections = new CollectionsService(deps.repository, this.authorization, deps.eventBus, deps.logger);
  }
}

export function createMarketplace(deps: MarketplaceDeps): Marketplace {
  return new Marketplace(deps);
}

export type { Principal };
