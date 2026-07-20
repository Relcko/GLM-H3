import { createProperty, PropertyStatus, type Property } from "@relcko/domain-core";
import type { EntityId } from "@relcko/types";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import { Action } from "@relcko/permission";
import { MarketplaceAuthorization, type Principal, subjectId } from "../authorization";
import { MarketplaceEventType, publishMarketplaceEvent } from "../events";
import { validateCreateProperty, validateUpdateProperty } from "../validation";
import type { MarketplaceRepository } from "../repository";
import { PropertyNotFoundError } from "../errors";
import type { EligibilityResult, PropertyMetrics, SearchQuery, SearchResult } from "../types";
import type { EligibilityContext } from "./eligibility";
import { PropertyAvailabilityEngine } from "./availability";
import { PropertyEligibilityEngine } from "./eligibility";
import { PropertyMetricsEngine } from "./metrics";
import { PropertyStateMachine } from "./state-machine";
import { PropertyDocumentsService } from "./documents";
import { PropertyMediaService } from "./media";
import { PropertyTimelineService } from "./timeline";
import { PropertyAnalyticsService } from "./analytics";
import { PropertySearchService } from "./search";

/**
 * Property domain service. Owns the lifecycle orchestration of a property and
 * exposes the property sub-services (documents, media, timeline, analytics,
 * search). All business state stays in the frozen `Property` entity; workflow
 * steps are expressed through events and the canonical state machine.
 */
export class PropertyService {
  readonly documents: PropertyDocumentsService;
  readonly media: PropertyMediaService;
  readonly timeline: PropertyTimelineService;
  readonly analytics: PropertyAnalyticsService;
  readonly searchService: PropertySearchService;

  private readonly stateMachine = new PropertyStateMachine();
  private readonly availability = new PropertyAvailabilityEngine();
  private readonly metricsEngine = new PropertyMetricsEngine();
  private readonly eligibility = new PropertyEligibilityEngine();

  constructor(
    private readonly repository: MarketplaceRepository,
    private readonly auth: MarketplaceAuthorization,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {
    this.documents = new PropertyDocumentsService(repository, auth, events, logger);
    this.media = new PropertyMediaService(repository, auth, events, logger);
    this.timeline = new PropertyTimelineService(repository, events, logger);
    this.analytics = new PropertyAnalyticsService(repository, events);
    this.searchService = new PropertySearchService(repository, auth);
  }

  async create(principal: Principal, input: unknown): Promise<Property> {
    this.auth.assert(principal, Action.PublishProperty);
    const v = validateCreateProperty(input);
    const property = createProperty(v);
    this.repository.saveProperty(property);
    await publishMarketplaceEvent(this.events, MarketplaceEventType.PropertyCreated, property.id, subjectId(principal) as EntityId, {
      slug: property.slug,
      name: property.name,
      assetType: property.assetType,
    });
    await this.timeline.record(principal, property.id, MarketplaceEventType.PropertyCreated, { slug: property.slug });
    return property;
  }

  get(id: string): Property {
    return this.require(id);
  }

  getBySlug(slug: string): Property {
    const p = this.repository.getPropertyBySlug(slug);
    if (!p) throw new PropertyNotFoundError(slug);
    return p;
  }

  list(): Property[] {
    return this.repository.listProperties();
  }

  async update(principal: Principal, id: string, patch: unknown): Promise<Property> {
    this.auth.assert(principal, Action.PublishProperty);
    const p = this.require(id);
    const v = validateUpdateProperty(patch);
    const updated: Property = {
      ...p,
      ...v,
      updatedAt: new Date().toISOString(),
    };
    this.repository.saveProperty(updated);
    await publishMarketplaceEvent(this.events, MarketplaceEventType.PropertyUpdated, id as EntityId, subjectId(principal) as EntityId, {
      fields: Object.keys(v),
    });
    await this.timeline.record(principal, id as EntityId, MarketplaceEventType.PropertyUpdated, { fields: Object.keys(v) });
    return updated;
  }

  async publish(principal: Principal, id: string): Promise<Property> {
    return this.transition(principal, id, PropertyStatus.Upcoming, MarketplaceEventType.PropertyPublished);
  }

  async activate(principal: Principal, id: string): Promise<Property> {
    return this.transition(principal, id, PropertyStatus.Active, MarketplaceEventType.PropertyActivated);
  }

  async close(principal: Principal, id: string): Promise<Property> {
    return this.transition(principal, id, PropertyStatus.Closed, MarketplaceEventType.PropertyClosed);
  }

  private async transition(
    principal: Principal,
    id: string,
    next: PropertyStatus,
    event: string,
  ): Promise<Property> {
    this.auth.assert(principal, Action.PublishProperty);
    const p = this.require(id);
    const updated = this.stateMachine.transition(p, next);
    this.repository.saveProperty(updated);
    await publishMarketplaceEvent(this.events, event, id as EntityId, subjectId(principal) as EntityId, {
      from: p.status,
      to: updated.status,
    });
    await publishMarketplaceEvent(this.events, MarketplaceEventType.PropertyStatusChanged, id as EntityId, subjectId(principal) as EntityId, {
      from: p.status,
      to: updated.status,
    });
    await this.timeline.record(principal, id as EntityId, event, { from: p.status, to: updated.status });
    return updated;
  }

  /** Workflow step: request review (no business-state change). */
  async submitForReview(principal: Principal, id: string): Promise<void> {
    this.require(id);
    await this.timeline.record(principal, id as EntityId, MarketplaceEventType.PropertySubmittedForReview, {});
    await publishMarketplaceEvent(this.events, MarketplaceEventType.PropertySubmittedForReview, id as EntityId, subjectId(principal) as EntityId, {});
  }

  /** Workflow step: approve review (no business-state change). */
  async approveReview(principal: Principal, id: string): Promise<void> {
    this.auth.assert(principal, Action.PublishProperty);
    this.require(id);
    await this.timeline.record(principal, id as EntityId, MarketplaceEventType.PropertyReviewApproved, {});
    await publishMarketplaceEvent(this.events, MarketplaceEventType.PropertyReviewApproved, id as EntityId, subjectId(principal) as EntityId, {});
  }

  /** Workflow step: reject review (no business-state change). */
  async rejectReview(principal: Principal, id: string): Promise<void> {
    this.auth.assert(principal, Action.PublishProperty);
    this.require(id);
    await this.timeline.record(principal, id as EntityId, MarketplaceEventType.PropertyReviewRejected, {});
    await publishMarketplaceEvent(this.events, MarketplaceEventType.PropertyReviewRejected, id as EntityId, subjectId(principal) as EntityId, {});
  }

  getMetrics(id: string): PropertyMetrics {
    const p = this.require(id);
    const investors = new Set(this.repository.listInvestmentsByProperty(id as EntityId).map((i) => i.investorId));
    return this.metricsEngine.compute(p, investors.size);
  }

  getAvailability(id: string) {
    const p = this.require(id);
    return {
      remainingAllocation: this.availability.remainingAllocationValue(p),
      availableFractions: this.availability.availableFractions(p),
      isAvailable: this.availability.isAvailable(p),
    };
  }

  checkEligibility(id: string, ctx: EligibilityContext): EligibilityResult {
    return this.eligibility.check(this.require(id), ctx);
  }

  async search(principal: Principal, query: SearchQuery): Promise<SearchResult> {
    return this.searchService.search(principal, query);
  }

  private require(id: string): Property {
    const p = this.repository.getProperty(id as EntityId);
    if (!p) throw new PropertyNotFoundError(id);
    return p;
  }
}
