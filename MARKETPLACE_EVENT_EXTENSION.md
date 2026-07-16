# Marketplace Event Extension — Marketplace Investment Engine

**Companion to:** `EVENT_ARCHITECTURE.md` (canonical catalog), `MARKETPLACE_INVESTMENT_ENGINE.md`,
`INVESTMENT_STATE_MACHINE.md`, `PROPERTY_STATE_MACHINE.md`. Architecture only.

This document **extends** the canonical event catalog with marketplace-specific
events only. It does not replace `EVENT_ARCHITECTURE.md`; the rules there (transport,
idempotency, ordering, audit mirroring) all apply.

---

## 1. Mandated marketplace events (this milestone)

Each event below lists `producer`, `consumers`, and `payload` fields. All carry the
base envelope `{ eventId, type, aggregateId, occurredAt, actorId, version }`.

### ReservationCreated
- **Producer:** Investment (round requires reservation).
- **Consumers:** WaitingList, Notification, Portfolio (reserved view).
- **Payload:** `investmentId, propertyId, roundId, reservedTokens, ttl`.

### ReservationExpired
- **Producer:** Investment (ttl passed / cancelled).
- **Consumers:** WaitingList (promote next), Property (return available_tokens),
  Notification.
- **Payload:** `investmentId, propertyId, reason`.

### InvestmentAllocated
- **Producer:** Investment (compliance approved).
- **Consumers:** Ownership (mint), Treasury (settlement), Commission, Portfolio.
- **Payload:** `investmentId, investorId, propertyId, fractionId, tokens, amount, pricePerToken`.

### SettlementCompleted
- **Producer:** Payment/Settlement worker.
- **Consumers:** Investment (→ PAID), Escrow/Capital ledgers, Treasury.
- **Payload:** `paymentId, investmentId, method, settledAmount, fxSnapshot, txHash?`.

### OwnershipMinted
- **Producer:** Ownership (on `InvestmentAllocated`).
- **Consumers:** OwnershipBalance projection, Governance (voting power), Portfolio,
  NFT Marketplace (cross), Global Map.
- **Payload:** `investorId, propertyId, fractionId, tokens, txHash?`.
  → also emits canonical `OwnershipUpdated`.

### OwnershipTransferred
- **Producer:** Ownership (secondary `MarketplaceSaleCompleted`).
- **Consumers:** OwnershipBalance, Portfolio, Treasury (settlement), Commission
  (secondary), Governance.
- **Payload:** `fromInvestorId, toInvestorId, propertyId, fractionId, tokens`.

### PropertyFunded
- **Producer:** Property (sold == total / hard cap).
- **Consumers:** Global Map, Marketplace (browse state), Dividend Center (eligible),
  Portfolio.
- **Payload:** `propertyId, totalRaised, timestamp`.

### PropertyOperational
- **Producer:** Property (asset activated).
- **Consumers:** Valuation Engine, Dividend Center, Global Map, Document Vault
  (insurance/financials).
- **Payload:** `propertyId, activatedAt`.

### DividendActivated
- **Producer:** Property / Dividend Center (schedule set).
- **Consumers:** Dividend Center (start schedule), Investors (notification),
  Valuation Engine (yield basis).
- **Payload:** `propertyId, scheduleId, firstDistributionAt`.

### PropertyArchived
- **Producer:** Property (lifecycle end).
- **Consumers:** Marketplace (read-only), Global Map (layer update), Audit/Admin.
- **Payload:** `propertyId, archivedAt, reason`.

---

## 2. Additional marketplace events (supporting)

| Event | Producer | Consumers | Key payload |
|-------|----------|-----------|-------------|
| `InvestmentStarted` | Investment | WaitingList, Notification | investmentId, propertyId, roundId |
| `ComplianceReviewStarted` | Investment | Compliance, AuditLog | investmentId, riskScore |
| `InvestmentRejected` | Investment/Compliance | Refund worker, Notification | investmentId, reason |
| `InvestmentCancelled` | Investment/Investor | WaitingList, Notification | investmentId, reason |
| `RefundInitiated` / `RefundCompleted` | Treasury/Refund worker | Investment, Ledger, Notification | paymentId, amount |
| `RoundOpened` / `RoundClosed` | Property Manager | Marketplace, WaitingList | propertyId, roundId, caps |
| `WaitingListPromoted` | WaitingList | Investment, Notification | investmentId, rank |
| `PropertyPaused` / `PropertyResumed` | Property Manager/Compliance | Marketplace, Global Map | propertyId, reason |
| `PropertyDelisted` | Property Manager/Admin | Marketplace, Ownership (retain), Global Map | propertyId |
| `ValuationUpdated` | Valuation Engine | Portfolio, Map, Governance | propertyId, value, asOf |
| `OfferCreated` / `OfferAccepted` | Secondary market | MarketplaceSale, Escrow | listingId, offerId, price |
| `EscrowHeld` / `EscrowReleased` | Settlement | Ledgers, Treasury | saleId, amount |

---

## 3. Event-flow integration with canonical catalog

The master investment chain (from `EVENT_ARCHITECTURE.md` Flow A) using these
extensions:

```
InvestmentStarted
  → ReservationCreated (if round requires)
  → SettlementCompleted
  → ComplianceReviewStarted
  → InvestmentAllocated
       → OwnershipMinted  ──┐ (canonical OwnershipUpdated)
       → CommissionCalculated ──▶ Network Engine / Campaign
       → TreasurySettlementRequested ──▶ TreasuryMovementApproved
  → PortfolioUpdated
  → GovernanceEligibilityGranted (VotingPowerUpdated)
  → DividendEligibility (on PropertyFunded → DividendActivated)
  → InvestmentComplete
       → NotificationSent
```

Property-level:
```
PropertyApproved → RoundOpened → PropertyFundingStarted
  → (sold==total) PropertyFunded
  → PropertyOperational → DividendActivated / RentalActivated
  → (end) PropertyArchived
```

Secondary:
```
MarketplaceListingCreated → OfferCreated/Accepted
  → EscrowHeld → OwnershipTransferred → EscrowReleased
  → CommissionCalculated (secondary) → SettlementCompleted
```

---

## 4. Cross-module routing (where these events go)

| Module | Marketplace events consumed |
|--------|------------------------------|
| Portfolio | OwnershipMinted, OwnershipTransferred, InvestmentAllocated, ValuationUpdated |
| Treasury | SettlementCompleted, EscrowHeld/Released, RefundCompleted, TreasurySettlementRequested |
| Governance | OwnershipMinted (→ VotingPowerUpdated), PropertyFunded |
| Dividend Center | DividendActivated, PropertyFunded, OwnershipMinted (snapshot) |
| NFT Marketplace | OwnershipMinted (fraction) ↔ NFTMinted (loyalty) |
| Network Engine | CommissionCalculated, ReferralConverted |
| Referral Campaigns | ReferralConverted, CampaignRewardIssued |
| AI Copilot | (read-only, no consume) |
| Document Vault | DocumentVerified (gates), InvestmentCertificate issued |
| Global Property Map | PropertyFunded, PropertyOperational, PropertyArchived, PropertyPaused |
| Admin Portal | ALL (mirror to AuditLog; observability) |

---

## 5. Consistency & governance

- All marketplace events are **additive** to the canonical catalog; consumers
  ignore unknown payload fields (evolution-safe).
- Every marketplace event mirrors to `AuditLog` (entity 19).
- Idempotency key = `eventId` (+ `investmentId`/`propertyId` for downstream
  projections).
- New marketplace events require a registry entry (interface seam) but no code in
  this milestone.
- Versioning: `version` field; breaking changes → new `type` (e.g.
  `OwnershipMintedV2`), old retired after dual-write window (per
  `EVENT_ARCHITECTURE.md` §6).
