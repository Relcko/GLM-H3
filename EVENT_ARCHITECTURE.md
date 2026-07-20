# Event Architecture — Relcko Ecosystem

**Companion to:** `RELCKO_ECOSYSTEM_ARCHITECTURE.md`, `MODULE_DEPENDENCY_MAP.md`.
**Rule:** Cross-module effects happen ONLY through these events. No module calls
another module's services directly.

---

## 1. Transport & guarantees

- **Bus type:** durable, append-only event log (one logical stream per aggregate
  domain; fanned out to subscribers). Pluggable adapter (in-process now; managed
  broker later). Interface seam only — no implementation in this milestone.
- **Delivery:** at-least-once → consumers MUST be idempotent (keyed by
  `eventId` + aggregate id).
- **Ordering:** per-aggregate causal order guaranteed; cross-aggregate order is
  eventual. Projections tolerate reordering via idempotent apply.
- **Schema:** each event = `{ eventId, type, aggregateId, occurredAt, actorId,
  version, payload }`. `payload` is the only module-specific part.
- **Exactly-once business effect:** achieved by idempotency keys, never by the bus.
- **Audit:** every event is mirrored into `AuditLog` (entity 19) for compliance.

---

## 2. Canonical event catalog

### Property lifecycle
- `PropertyPublished` (Property Manager) → Map, Marketplace, Vault.
- `PropertyDelisted` / `PropertyPaused` → Marketplace, Map, Portfolio.

### Investment & ownership
- `InvestmentInitiated` → Marketplace.
- `InvestmentConfirmed` → `OwnershipUpdated` (+`Transaction`), Portfolio, Governance.
- `InvestmentFailed` / `InvestmentRefunded` → Treasury, Transaction.

### Secondary market
- `MarketplaceListingCreated` → Marketplace.
- `MarketplaceSaleCompleted` → `OwnershipUpdated` (delta), Commission, Portfolio, Treasury.
- `MarketplaceSaleCancelled`.

### NFT
- `NFTMinted`, `NFTListed`, `NFTSold`, `NFTTransferred`, `RoyaltiesPaid`.

### Network / agents / referrals
- `AgentOnboarded`, `AgentStatusChanged`.
- `ReferralCreated`, `ReferralConverted` (on invest) → Network Engine, Campaign, Commission.
- `AgentTaskCompleted`.
- `ReferralCampaignLaunched`, `CampaignRewardIssued`, `LeaderboardUpdated`.

### Commission & money
- `CommissionCalculated`, `CommissionApproved`, `CommissionPaid` → Treasury, Agent.
- `PaymentSettled` → Transaction, Treasury.

### Treasury
- `TreasuryDeposit`, `TreasuryWithdrawal`, `TreasuryRebalanced`,
  `TreasuryYieldRealized`, `TreasuryMovementApproved` (multi-sig).

### Governance
- `GovernanceProposalCreated`, `VoteCast`, `ProposalExecuted`,
  `VotingPowerUpdated`, `GovernanceParameterChanged`.

### Dividends
- `DividendScheduled`, `DividendDistributed`, `DividendClaimed`, `TaxDocumentIssued`.

### Documents & compliance
- `DocumentUploaded`, `DocumentVerified`, `DocumentAccessed`, `AccessGranted`.
- `KYCSubmitted`, `KYCApproved`, `KYCRejected`.
- `ComplianceFlagRaised`, `ComplianceResolved`.

### Portfolio & read models
- `PortfolioRecomputed`, `PortfolioRebalanced` (derived — emitted by projection
  workers after source events).

### Identity & wallet
- `WalletLinked`, `WalletVerified` (SIWE).

### AI Copilot
- `CopilotQueryReceived`, `CopilotAnswerIssued`, `CopilotPolicyViolation`.

### Map
- `PropertyGeocoded`, `GeoRegionComputed`, `MapLayerUpdated`.

### System / admin
- `AdminActionLogged` (wraps mutations), `RoleChanged`, `SystemPaused`,
  `AlertRaised`, `NotificationSent`.

---

## 3. Primary end-to-end flows

### Flow A — Primary investment (the master chain)
```
InvestmentConfirmed
   ├─▶ OwnershipUpdated          (mint/transfer fractions)
   │     ├─▶ PortfolioRecomputed
   │     └─▶ VotingPowerUpdated  (Governance projection)
   ├─▶ Transaction (ledger)
   ├─▶ CommissionCalculated      (agent attribution)
   │     └─▶ (async) CommissionPaid → TreasuryMovementApproved
   ├─▶ ReferralConverted         (if referred)
   │     └─▶ CampaignRewardIssued (Referral Campaign Mgr)
   └─▶ NotificationSent
```

### Flow B — Secondary sale
```
MarketplaceSaleCompleted
   ├─▶ OwnershipUpdated (delta transfer)
   │     ├─▶ PortfolioRecomputed
   │     └─▶ VotingPowerUpdated
   ├─▶ CommissionCalculated (secondary rate)
   └─▶ TreasuryMovementApproved (settlement)
```

### Flow C — Dividend
```
DividendScheduled
   ├─▶ Ownership snapshot (point-in-time, immutable)
   └─▶ DividendDistributed
         ├─▶ TreasuryMovementApproved (funding)
         ├─▶ Transaction
         ├─▶ PortfolioRecomputed
         ├─▶ TaxDocumentIssued
         └─▶ NotificationSent
```

### Flow D — Governance
```
GovernanceProposalCreated
   ├─▶ VoteCast* (many)
   │     └─▶ VotingPowerUpdated (per vote, from Ownership snapshot)
   ├─▶ ProposalExecuted
         ├─▶ TreasuryMovementApproved  (if financial)
         ├─▶ GovernanceParameterChanged (if params)
         └─▶ NotificationSent
```

### Flow E — Compliance/KYC gate
```
KYCSubmitted → KYCApproved (or Rejected)
   └─ (Approved) unblocks: InvestmentConfirmed eligibility
```

### Flow F — Agent referral conversion
```
ReferralCreated (on signup with code)
   └─▶ ReferralConverted (on first InvestmentConfirmed)
         ├─▶ CommissionCalculated
         ├─▶ CampaignRewardIssued (if in campaign)
         └─▶ LeaderboardUpdated
```

---

## 4. Subscriber responsibilities (who listens)

| Subscriber | Listens for | Effect (idempotent) |
|------------|-------------|---------------------|
| **Portfolio** | OwnershipUpdated, DividendDistributed, NFTTransferred, VotingPowerUpdated, CommissionPaid | Recompute investor projection. |
| **Treasury** | CommissionPaid, DividendDistributed, ProposalExecuted, MarketplaceSaleCompleted | Settle movements (multi-sig). |
| **Governance** | OwnershipUpdated | Recompute voting power snapshot. |
| **Network Engine** | ReferralConverted | Attribute + score agents. |
| **Referral Campaign** | ReferralConverted | Issue rewards + leaderboard. |
| **Notification** | NotificationSent, AlertRaised, KYCApproved/Rejected, DividendDistributed | Deliver alerts. |
| **Admin / Audit** | ALL | Mirror to `AuditLog`; observability. |
| **Global Map** | PropertyPublished/Delisted, PropertyGeocoded | Update layers/regions. |
| **Document Vault** | KYCSubmitted, DocumentUploaded | Queue verification. |

---

## 5. Event → projection contract

Read models (Portfolio, Leaderboard, VotingPower, Region stats) are **derived**:
they subscribe, apply deltas idempotently, and can be fully rebuilt by replaying
the event log from `aggregateId`. Any projection corruption = rebuild from log,
never manual fix.

---

## 6. Versioning & evolution

- `version` field on every event enables safe schema evolution.
- Additive payload fields only; consumers ignore unknown fields.
- Breaking changes → new `type` (e.g. `InvestmentConfirmedV2`), old retired after
  dual-write window.
- Event schema registry (interface seam) stores canonical definitions; no code here.

---

## 7. Failure handling

- **Poison event:** routed to dead-letter; aggregate paused; `AlertRaised`.
- **Out-of-order:** projection applies if causal deps present, else buffers.
- **Duplicate:** idempotency key (`eventId`) drops replay.
- **Downstream outage:** events retained; replay on recovery (at-least-once).
