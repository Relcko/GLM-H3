# Relcko Platform — Implementation Report (V2.2.0)

**Module:** `@relcko/marketplace` (Marketplace Backend)
**Date:** 2026-07-15
**Status:** ✅ Complete — typecheck green, lint clean, 32 tests passing, 88% coverage
**Depends on:** V2.0.0 foundation (frozen) + V2.1.0 identity (frozen)

---

## 1. Objective

Deliver the **Marketplace product module** as the next stage of the Relcko platform, building exclusively on the frozen V1.9 architecture and the shared `@relcko/*` packages already delivered in V2.0.0 and V2.1.0.

The marketplace introduces:
- **Primary market** — property tokenization, fractional investment, ownership ledger.
- **Secondary market** — peer-to-peer listings and sales between investors.
- **Property enrichment** — documents, media, timeline, analytics, metrics, search.
- **User collections** — bookmarks, favorites, watchlist, recently viewed.

Deliberately **out of scope for V2.2** (per frozen scope): blockchain/on-chain writes, wallet purchases, NFT minting, treasury, governance, AI, network engine, any frontend, database, and API route layers.

---

## 2. Architecture Decisions (Critical)

> The V1.9 architecture is **permanently frozen**. No architectural, domain-model, or business-rule changes are permitted, and no domain model is duplicated.

### 2.1 Lifecycle is the FROZEN domain-core lifecycle — exclusively

A clarification discrepancy existed between the mission brief (which described a 9-state property lifecycle and an 8-state investment lifecycle) and the frozen `domain-core`. Per explicit instruction, **the frozen `domain-core` lifecycle is the single source of truth**:

| Aggregate | States (frozen `domain-core`) | Transition engine reused |
|-----------|-------------------------------|--------------------------|
| `Property` | `draft → upcoming → active → sold_out / closed` | `transitionProperty` |
| `Investment` | `pending → processing → confirmed / failed → refunded` | `transitionInvestment` |
| `MarketplaceListing` | `active → sold / cancelled / expired` | `transitionListing` |
| `MarketplaceSale` | `pending → completed / failed / refunded` | `transitionSale` |
| `Ownership` | `active → transferred / liquidated` | `transitionOwnership` |

**No new marketplace-specific lifecycle enums were introduced.** The richer operational workflows implied by the mission (compliance review, approval gates, reservation holds, settlement, dispute handling) are expressed **only as canonical events and orchestration**, never as new persisted business states. This keeps the model consistent with `DOMAIN_MODEL.md` and `EVENT_ARCHITECTURE.md`.

### 2.2 Shared-package reuse (no duplication)

Every reusable capability is imported from a frozen package:

| Concern | Package | Reused symbols |
|---------|---------|----------------|
| Core domain | `@relcko/domain-core` | `Property`, `Investment`, `MarketplaceListing`, `MarketplaceSale`, `Ownership`, `Document`, `PropertyStatus`, `InvestmentStatus`, `ListingStatus`, `SaleStatus`, `OwnershipStatus`, `ListingType`, `DocumentCategory`, `createProperty`, `createInvestment`, `createOwnership`, `createListing`, `createSale`, `createDocument`, `applyInvestmentToSupply`, `computeAvgCostBasis`, `transitionProperty`, `transitionInvestment` |
| Events | `@relcko/events` | `EventBus`, `InMemoryEventBus`, `createEnvelope`, `RelckoEventEnvelope` |
| Validation | `@relcko/validation` | `parseWith`, `entityIdSchema`, `addressSchema`, `currencySchema`, `moneySchema` |
| Errors | `@relcko/error` | `DomainError`, `ValidationError`, `PermissionError`, `RelckoError`, `ErrorCategory` |
| Permissions | `@relcko/permission` | `Action`, `PermissionResolver`, `subjectFromAccount`, `POLICIES`, `Role`, `ScopeType` |
| Identity | `@relcko/identity` | `Account`, `subjectFromAccount` |
| Money / ids | `@relcko/utils` | `money`, `generateId`, `decimalsFor`, `nowIso` |
| Logging | `@relcko/logging` | `Logger`, `LogLevel`, `createLogger` |
| Testing | `@relcko/testing` | `MockEventBus`, `MockPermissionResolver` |

`@relcko/security`, `@relcko/config`, `@relcko/env`, `@relcko/observability` are present in the monorepo and available but are **not exercised** by this module's logic surface.

### 2.3 Permission model

Authorization reuses `@relcko/permission` without modification:
- `Action.Invest` and `Action.ListSell` are `ScopeType.Own` → the acting subject must equal the resource owner (`investorId` / `sellerId`).
- Investment mutations assert `subjectId(principal)` against `investment.investorId`.
- Listing mutations (`create` / `cancel` / `markSold` / `expire` / `completeSale`) assert against `listing.sellerId`.
- Property creation / publish / document / media / update require `Action.PublishProperty`; search uses `Action.Browse`.

Denials throw `PermissionError` from `@relcko/error`.

### 2.4 Money & precision

- Stablecoins (`USDT`, `USDC`) use **6 decimals**; native chain value uses **18 decimals** (`@relcko/utils/money`).
- Eligibility requires `amount.minor === tokenPrice.minor * tokens` and `amount.minor >= minInvestment.minor`.
- All monetary inputs are entered in major units and converted via `money()` at the boundary.

### 2.5 Side-effect channel

The shared `EventBus` is the **only** side-effect channel. Every state-changing operation publishes a canonical `MarketplaceEventType` envelope (`source: "relcko.marketplace"`).

---

## 3. Deliverables — File Map

`packages/marketplace/src/` (22 source files, ~2,140 LOC; 9 test files, ~425 LOC).

| File | Responsibility |
|------|----------------|
| `index.ts` | Public barrel export |
| `marketplace.ts` | `Marketplace` facade + `createMarketplace` factory (wires repository, bus, resolver, logger) |
| `errors.ts` | `MarketplaceError` hierarchy (`NotFound*`, `EligibilityError`, `CollectionError`, `SupplyError`) |
| `types.ts` | Marketplace-only value types (`MediaAsset`, `Bookmark`, `Favorite`, `WatchlistEntry`, `RecentlyViewedEntry`, `PropertyTimelineEvent`, `PropertyAnalytics`, `PropertyMetrics`, `EligibilityResult`, `SearchQuery`, `SearchResult`) |
| `events.ts` | `MarketplaceEventType` catalog (~30 canonical events) + `publishMarketplaceEvent` |
| `authorization.ts` | `Principal`, `MarketplaceAuthorization`, `toSubject`, `subjectId`, `anonymousSubject` |
| `validation.ts` | Zod request schemas (`createProperty`, `updateProperty`, `reserveInvestment`, `createListing`, `completeSale`, `searchQuery`, `addDocument`, `addMedia`, `watchlist`, `collectionItem`) + `validate*` helpers |
| `repository.ts` | `MarketplaceRepository` interface + `InMemoryMarketplaceRepository` |
| `property/state-machine.ts` | `PropertyStateMachine` wrapping frozen `transitionProperty` (`PropertyWorkflow`) |
| `property/availability.ts` | `PropertyAvailabilityEngine` (remaining allocation, available fractions, reserve) |
| `property/metrics.ts` | `PropertyMetricsEngine.compute` (funding %, sold %, avg cost basis) |
| `property/eligibility.ts` | `PropertyEligibilityEngine.check` (amount vs `tokenPrice * tokens`, min investment, status) |
| `property/search.ts` | `PropertySearchService` + in-memory index (keyword / assetType / status / price / ROI filters) |
| `property/documents.ts` | `PropertyDocumentsService` (CRUD over `createDocument`) |
| `property/media.ts` | `PropertyMediaService` |
| `property/timeline.ts` | `PropertyTimelineService` |
| `property/analytics.ts` | `PropertyAnalyticsService` (views, interest, search impressions) |
| `property/service.ts` | `PropertyService` composing the sub-services above |
| `investment/state-machine.ts` | `InvestmentStateMachine` wrapping frozen `transitionInvestment` (`InvestmentWorkflow`) |
| `investment/service.ts` | `InvestmentService` (reserve → confirm → markFunded → settle → cancel → fail → refund; issues `Ownership` via `createOwnership` + `applyInvestmentToSupply`) |
| `listing/service.ts` | `ListingService` (create → cancel / markSold / expire / completeSale; adjusts `Ownership` + `computeAvgCostBasis`) |
| `collections/service.ts` | `CollectionsService` (bookmark / favorite / watchlist / recently viewed with owner-scoping) |

### Test files
`state-machines.test.ts`, `property.test.ts`, `investment.test.ts`, `listing.test.ts`, `collections.test.ts`, `authorization.test.ts`, `validation.test.ts`, `events.test.ts`, `integration.test.ts` (end-to-end primary + secondary flow), plus `test-helpers.ts`.

---

## 4. Event Catalog (canonical `MarketplaceEventType`)

Primary market: `PropertyCreated`, `PropertyPublished`, `PropertyActivated`, `PropertyClosed`, `PropertySoldOut`, `InvestmentReserved`, `InvestmentConfirmed`, `InvestmentFunded`, `InvestmentSettled`, `InvestmentCancelled`, `InvestmentFailed`, `InvestmentRefunded`, `OwnershipCreated`, `OwnershipTransferred`, `OwnershipLiquidated`.

Secondary market: `ListingCreated`, `ListingCancelled`, `ListingMarkedSold`, `ListingExpired`, `SaleInitiated`, `SaleCompleted`, `SaleFailed`, `SaleRefunded`.

Enrichment & collections: `PropertyDocumentAdded`, `PropertyDocumentRemoved`, `PropertyMediaAdded`, `PropertyMediaRemoved`, `PropertyTimelineEventRecorded`, `PropertyViewed`, `PropertyAnalyticsUpdated`, `PropertyBookmarked`, `PropertyUnbookmarked`, `PropertyFavorited`, `PropertyUnfavorited`, `WatchlistEntryAdded`, `WatchlistEntryRemoved`, `RecentlyViewedRecorded`, `SearchPerformed`, `EligibilityChecked`.

---

## 5. Validation Results

| Check | Command | Result |
|-------|---------|--------|
| Typecheck (all packages) | `npx tsc -p tsconfig.packages.json --noEmit` | ✅ exit 0 |
| Lint (marketplace) | `npx eslint "packages/marketplace/**/*.ts"` | ✅ exit 0 |
| Unit / integration | `npx vitest run packages/marketplace` | ✅ 9 files, **32 tests passing** |
| Coverage (marketplace/src) | `vitest --coverage` | ✅ 88.36% stmts · 86.48% branches · 66.27% funcs |

Tests cover: frozen state-machine transitions (positive + illegal), property creation/activation/search/documents/media/timeline/analytics, full investment reserve→confirm→settle→ownership, listing→sale→ownership transfer, collection owner-scoping denials, permission denials (non-manager create, non-investor invest), request-schema validation rejects, and canonical event publication through the shared `MockEventBus`.

---

## 6. Monorepo Integration

`@relcko/marketplace` was wired into the root `tsconfig.json` path aliases and `vitest.config.ts` aliases, consistent with the existing `@relcko/identity` wiring. No other package was modified.

---

## 7. Status & Next Steps

**V2.2.0 marketplace backend is complete and verified.** Recommended follow-ups (outside V2.2 scope):
- Persisted `MarketplaceRepository` implementation (Postgres/event-sourced) behind the existing interface.
- API route layer (tRPC/REST) and OpenAPI spec reusing the frozen `validation` schemas.
- Orchestration services that consume the new canonical events for compliance, settlement, and notifications.
- Frontend marketplace UI consuming the documented types.

See also: `IMPLEMENTATION_REPORT_V2_0.md`, `IMPLEMENTATION_REPORT_V2_1.md`, and the frozen specs `RELCKO_ECOSYSTEM_ARCHITECTURE.md`, `DOMAIN_MODEL.md`, `EVENT_ARCHITECTURE.md`, `PERMISSION_MODEL.md`, `IDENTITY_AND_ACCESS_MODEL.md`.
