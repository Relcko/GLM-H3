import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { PermissionResolver } from "@relcko/permission";
import type { PerformanceModuleContext } from "@relcko/performance";
import type { NftRepository } from "./repository";
import { InMemoryNftRepository } from "./in-memory-repository";

import { NftService } from "./nft/service";
import { CollectionService } from "./collection/service";
import { MetadataService } from "./metadata/service";
import { MintService } from "./mint/service";
import { TransferService } from "./transfer/service";
import { ListingService } from "./listing/service";
import { OfferService } from "./offer/service";
import { AuctionService } from "./auction/service";
import { RoyaltyService } from "./royalty/service";
import { VerificationService } from "./verification/service";
import { ActivityService } from "./activity/service";
import { AnalyticsService } from "./analytics/service";
import { MediaService } from "./media/service";
import { SearchService } from "./search/service";
import { PortfolioAdapter } from "./portfolio/adapter";

export class NftMarketplace {
  constructor(
    public readonly nftService: NftService,
    public readonly collectionService: CollectionService,
    public readonly metadataService: MetadataService,
    public readonly mintService: MintService,
    public readonly transferService: TransferService,
    public readonly listingService: ListingService,
    public readonly offerService: OfferService,
    public readonly auctionService: AuctionService,
    public readonly royaltyService: RoyaltyService,
    public readonly verificationService: VerificationService,
    public readonly activityService: ActivityService,
    public readonly analyticsService: AnalyticsService,
    public readonly mediaService: MediaService,
    public readonly searchService: SearchService,
    public readonly portfolioAdapter: PortfolioAdapter,
    public readonly events: EventBus,
    public readonly performance?: PerformanceModuleContext,
  ) {}
}

export interface NftMarketplaceOptions {
  repository?: NftRepository;
  events: EventBus;
  logger?: Logger;
  permission?: PermissionResolver;
  performance?: PerformanceModuleContext;
}

export function createNftMarketplace(options: NftMarketplaceOptions): NftMarketplace {
  const repository = options.repository ?? new InMemoryNftRepository();
  const { events, logger } = options;

  const nftService = new NftService(repository, events, logger);
  const collectionService = new CollectionService(repository, events, logger);
  const metadataService = new MetadataService(repository, events, logger);
  const mintService = new MintService(repository, events, logger);
  const transferService = new TransferService(repository, events, logger);
  const listingService = new ListingService(repository, events, logger);
  const offerService = new OfferService(repository, events, logger);
  const auctionService = new AuctionService(repository, events, logger);
  const royaltyService = new RoyaltyService(repository, events, logger);
  const verificationService = new VerificationService(repository, events, logger);
  const activityService = new ActivityService(repository, logger);
  const analyticsService = new AnalyticsService(repository, logger);
  const mediaService = new MediaService(repository, logger);
  const searchService = new SearchService(repository, logger);
  const portfolioAdapter = new PortfolioAdapter(repository, logger);

  return new NftMarketplace(
    nftService,
    collectionService,
    metadataService,
    mintService,
    transferService,
    listingService,
    offerService,
    auctionService,
    royaltyService,
    verificationService,
    activityService,
    analyticsService,
    mediaService,
    searchService,
    portfolioAdapter,
    events,
    options.performance,
  );
}
