import { DomainError, ErrorCategory, RelckoError } from "@relcko/error";

/**
 * Marketplace error hierarchy. Every class extends the shared `RelckoError`
 * (via `MarketplaceError`) so the boundary layer serializes them uniformly and
 * they compose with the frozen error packages.
 */

export class MarketplaceError extends RelckoError {
  constructor(message: string, code = "MARKETPLACE_VIOLATION", metadata?: RelckoError["metadata"]) {
    super(message, code, ErrorCategory.Domain, 422, { metadata });
  }
}

export class NotFoundError extends MarketplaceError {
  constructor(entity: string, id: string) {
    super(`${entity} ${id} not found`, "NOT_FOUND", { entity, id });
  }
}

export class PropertyNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("Property", id);
  }
}

export class InvestmentNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("Investment", id);
  }
}

export class ListingNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("Listing", id);
  }
}

export class SaleNotFoundError extends NotFoundError {
  constructor(id: string) {
    super("Sale", id);
  }
}

export class OwnershipNotFoundError extends NotFoundError {
  constructor(investorId: string, propertyId: string) {
    super("Ownership", `${investorId}:${propertyId}`);
  }
}

export class EligibilityError extends MarketplaceError {
  readonly reasons: readonly string[];
  constructor(message: string, reasons: readonly string[], metadata?: RelckoError["metadata"]) {
    super(message, "INVESTMENT_INELIGIBLE", { ...metadata, reasons });
    this.reasons = reasons;
  }
}

export class CollectionError extends MarketplaceError {
  constructor(message: string, code = "COLLECTION_ERROR", metadata?: RelckoError["metadata"]) {
    super(message, code, metadata);
  }
}

export class SupplyError extends DomainError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, "MARKETPLACE_SUPPLY", metadata);
  }
}
