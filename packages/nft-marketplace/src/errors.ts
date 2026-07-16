import { ErrorCategory, RelckoError } from "@relcko/error";

export class NftMarketplaceError extends RelckoError {
  constructor(message: string, code = "NFT_MARKETPLACE_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, ErrorCategory.Domain, 422, { metadata });
  }
}

export class NftNotFoundError extends NftMarketplaceError {
  constructor(id: string) {
    super(`NFT ${id} not found`, "NFT_NOT_FOUND", { id });
  }
}

export class CollectionNotFoundError extends NftMarketplaceError {
  constructor(id: string) {
    super(`Collection ${id} not found`, "COLLECTION_NOT_FOUND", { id });
  }
}

export class ListingNotFoundError extends NftMarketplaceError {
  constructor(id: string) {
    super(`Listing ${id} not found`, "LISTING_NOT_FOUND", { id });
  }
}

export class OfferNotFoundError extends NftMarketplaceError {
  constructor(id: string) {
    super(`Offer ${id} not found`, "OFFER_NOT_FOUND", { id });
  }
}

export class AuctionNotFoundError extends NftMarketplaceError {
  constructor(id: string) {
    super(`Auction ${id} not found`, "AUCTION_NOT_FOUND", { id });
  }
}

export class MintEligibilityError extends NftMarketplaceError {
  readonly reasons: readonly string[];
  constructor(message: string, reasons: readonly string[], metadata?: RelckoError["metadata"]) {
    super(message, "MINT_ELIGIBILITY_FAILED", { ...metadata, reasons });
    this.reasons = reasons;
  }
}

export class MintError extends NftMarketplaceError {
  constructor(message: string, code = "MINT_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, metadata);
  }
}

export class MintFailedError extends NftMarketplaceError {
  constructor(nftId: string, reason: string) {
    super(`Mint failed for NFT ${nftId}: ${reason}`, "MINT_FAILED", { nftId, reason });
  }
}

export class TransferError extends NftMarketplaceError {
  constructor(message: string, metadata?: RelckoError["metadata"]) {
    super(message, "TRANSFER_ERROR", metadata);
  }
}

export class ListingError extends NftMarketplaceError {
  constructor(message: string, code = "LISTING_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, metadata);
  }
}

export class OfferError extends NftMarketplaceError {
  constructor(message: string, code = "OFFER_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, metadata);
  }
}

export class AuctionError extends NftMarketplaceError {
  constructor(message: string, code = "AUCTION_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, metadata);
  }
}

export class VerificationError extends NftMarketplaceError {
  constructor(message: string, code = "VERIFICATION_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, metadata);
  }
}

export class MetadataError extends NftMarketplaceError {
  constructor(message: string, code = "METADATA_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, metadata);
  }
}

export class RoyaltyError extends NftMarketplaceError {
  constructor(message: string, code = "ROYALTY_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, metadata);
  }
}

export class AnalyticsError extends NftMarketplaceError {
  constructor(message: string, code = "ANALYTICS_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, metadata);
  }
}

export class SearchError extends NftMarketplaceError {
  constructor(message: string, code = "SEARCH_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, metadata);
  }
}

export class MediaError extends NftMarketplaceError {
  constructor(message: string, code = "MEDIA_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, metadata);
  }
}

export class PortfolioError extends NftMarketplaceError {
  constructor(message: string, code = "PORTFOLIO_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, metadata);
  }
}

export class ActivityError extends NftMarketplaceError {
  constructor(message: string, code = "ACTIVITY_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, metadata);
  }
}
