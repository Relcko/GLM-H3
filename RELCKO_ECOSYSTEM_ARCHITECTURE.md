# Relcko Ecosystem Master Architecture — V1.2.1

**Status:** Architecture only. No implementation code, no UI, no Next.js pages.
**Baseline (LOCKED):** v1.0.1 release · Legacy Marketplace Audit · Domain Model (19
entities) · Entity Relationship Model · Migration Strategy · Marketplace
Foundation (V1.2.0, browsing only).

This document is the **single source of truth for module design** before any further
implementation. Every future module must integrate through the shared platform
layer described here so that no future rewrite is required.

---

## 0. Design principles

1. **Domain-first.** Every module exposes a `domain/` layer (entities + invariants)
   derived from the locked `DOMAIN_MODEL.md`. UI is a thin projection of domain.
2. **One feature-module shape.** The Marketplace Foundation (V1.2.0) established the
   canonical folder contract: `domain/`, `types/`, `mock/`, `hooks/`, `utils/`,
   `components/`. Every new module reuses this shape so tooling, lint, and testing
   stay uniform.
3. **Event-driven by default.** Cross-module effects happen via the event bus
   (see `EVENT_ARCHITECTURE.md`), never via direct cross-module calls.
4. **Read models are derived, not stored.** Portfolio, Agent dashboards, Treasury
   summaries, and Governance voting power are all projections recomputed from the
   append-only `Transaction` + `AuditLog` ledger.
5. **Money & ownership are sacred.** All value movement appends a `Transaction`;
   all state mutation appends an `AuditLog` (carried over from MIGRATION_STRATEGY
   invariants).
6. **Two-stage gating.** Sensitive operations (treasury movement, governance
   execution, role changes) require on-chain / multi-sig + off-chain `AuditLog`,
   never a single actor.
7. **Blockchain is a pluggable adapter.** Each module declares *Future Blockchain
   Hooks* and *Future API Hooks*; today they are interface seams, not code.

---

## 1. Platform / shared layer (used by all 12 modules)

| Layer | What it provides | Origin |
|-------|------------------|--------|
| **Identity & Wallet** | `Investor`, `Wallet` (SIWE-verified), `KYC` | Domain Model entities 4, 17, 13 |
| **Ledger & Audit** | `Transaction` (immutable), `AuditLog` (append-only) | Domain Model entities 9, 19 |
| **Property core** | `Property`, `PropertyFraction`, `SPV`, `Ownership`, `Documents` | Domain Model entities 1, 2, 15, 7, 14 |
| **Money movement** | `Payment`, `Commission`, `Referral` | Domain Model entities 18, 11, 10 |
| **Design system** | RC18–RC20 glass/card/typography/motion primitives | Existing app + `marketplace/components` |
| **Feature shell** | `CinematicShell`, `MarketplaceLayout` pattern (reused per module) | Existing |
| **Event bus** | `EVENT_ARCHITECTURE.md` canonical catalog | New (this milestone) |
| **Permission service** | `PERMISSION_MODEL.md` role + scope engine | New (this milestone) |
| **Notification service** | consumes events → in-app / email / on-chain alerts | New (this milestone) |

Modules depend **only** on the shared layer + the event bus, never on each other
directly. This is what keeps integrations clean.

---

## 2. Module catalog

| # | Module | Depends on (shared) | Adds entities |
|---|--------|---------------------|---------------|
| 1 | Marketplace | Property core, Identity, Ledger | (extends `Investment`, `MarketplaceListing`, `MarketplaceSale`) |
| 2 | NFT Marketplace | Property core, Identity, Ledger | `PropertyNFT`, `NFTListing`, `NFTHolding` |
| 3 | Relcko Network Engine (Agents) | Identity, `Agent`, `Referral`, `Commission` | `AgentTask`, `AgentTeam`, `CampaignAttribution` |
| 4 | Governance | Identity, Ledger | `Proposal`, `Vote`, `VotingPower`, `GovParameter` |
| 5 | Treasury | Ledger, `Payment`, Governance | `TreasuryAccount`, `TreasuryMovement`, `YieldRecord` |
| 6 | Portfolio | Property core, `Ownership`, `Transaction` | (read-model; `Portfolio` entity exists) |
| 7 | Document Vault | `Documents`, Identity, Compliance | `VaultFolder`, `AccessGrant`, `VerificationRecord` |
| 8 | Dividend Center | `Rewards`, `Ownership`, Ledger | `DividendSchedule`, `DividendPayment`, `TaxDocument` |
| 9 | AI Copilot | all read models | `CopilotSession`, `CopilotMemory`, `CopilotPolicy` |
| 10 | Global Property Map | Property core, `Documents` | `GeoRegion`, `PropertyCoordinate`, `MapLayer` |
| 11 | Referral Campaign Manager | `Referral`, `Commission`, Network Engine | `Campaign`, `CampaignReward`, `Leaderboard` |
| 12 | Admin Portal | all modules (read) + Permission service | no new entities (orchestration only) |

---

## 3. Module specifications

> Each section follows the locked template: Purpose · Responsibilities · Entities ·
> Relationships · Permissions · Events · Services · Shared Components ·
> Integration Points · Future Blockchain Hooks · Future API Hooks · Security ·
> Scalability.

---

### 3.1 Marketplace

- **Purpose:** Primary + secondary trading of fractional real-world property
  (extends the V1.2.0 browse foundation with investing + listing/selling).
- **Responsibilities:** publish/`active` properties (via Property Manager); run
  primary `Investment` flow; run secondary `MarketplaceListing`/`MarketplaceSale`;
  enforce KYC + min_investment + available_supply; compute `Commission`; append
  `Transaction` + `AuditLog`.
- **Entities (extend):** `Investment` (entity 3), `MarketplaceListing` (entity 5),
  `MarketplaceSale` (entity 6), `Ownership` (entity 7). Reuse `Property`,
  `PropertyFraction`, `SPV`, `Payment`, `Commission`, `Referral`, `Wallet`,
  `Transaction`, `AuditLog`.
- **Relationships:** Investment → Property/Fraction → Ownership + Transaction;
  Sale → Listing → Ownership delta; Sale/Investment → Commission → Agent.
- **Permissions:** Anonymous (browse), Investor (invest/list/sell), Property
  Manager (publish/delist), Compliance (freeze listing), Admin (override w/ audit).
- **Events:** `InvestmentConfirmed`, `MarketplaceSaleCompleted`, `OwnershipUpdated`,
  `CommissionCalculated`, `KYCApproved`, `PropertyPublished`.
- **Services:** `InvestmentService`, `SecondaryMarketService`, `ListingService`,
  `PriceDiscoveryService`.
- **Shared Components:** `PropertyCard`, `PropertyBadge`, `PropertyStats`,
  `PropertyProgress`, `BookmarkButton`, `MarketplaceFilters`, `MarketplaceGrid`,
  `MarketplaceLayout` (reuse from V1.2.0).
- **Integration Points:** Dividend Center (ownership → payouts), Portfolio
  (holdings), Treasury (settlement), Governance (voting power), Network Engine
  (commission), Document Vault (legal docs).
- **Future Blockchain Hooks:** `confirmInvestment(onchain mint)`, `settleSale(onchain
  transfer)`, `verifyTxHash(onchain)`, ERC1155 `safeTransferFrom`.
- **Future API Hooks:** `POST /marketplace/invest`, `GET /properties/:id`,
  `POST /listings`, `POST /sales/:id/settle`.
- **Security:** SIWE wallet verify (no address-only login), tx_hash on-chain
  verify, KYC gate, price-cap invariant (listing ≤ current_value), supply
  invariant (no oversell).
- **Scalability:** read replicas for browse; write path async via event bus;
  idempotent settlement keyed by `Investment.id` / `MarketplaceSale.id`.

---

### 3.2 NFT Marketplace

- **Purpose:** Trade property-backed NFTs (collectible / proof-of-ownership /
  loyalty / achievement tokens) distinct from fungible fractions.
- **Responsibilities:** mint `PropertyNFT` (e.g., milestone/loyalty or property
  title art); list/buy/sell; transfer; royalties to Treasury/Artist.
- **Entities (new):** `PropertyNFT` (id, property_id, token_standard ERC721,
  metadata_uri, edition, owner_id), `NFTListing` (id, nft_id, price, currency,
  status), `NFTHolding` (id, investor_id, nft_id, acquired_at).
- **Relationships:** PropertyNFT → Property (optional linkage); NFTListing →
  PropertyNFT → NFTHolding; sale → Payment → Transaction.
- **Permissions:** Investor (mint if eligible, list/buy), Property Manager (official
  mints), Admin (delist abusive).
- **Events:** `NFTMinted`, `NFTListed`, `NFTSold`, `NFTTransferred`,
  `RoyaltiesPaid`.
- **Services:** `NFTMintService`, `NFTMarketplaceService`, `RoyaltyService`.
- **Shared Components:** reuse `MarketplaceLayout`/`MarketplaceGrid` patterns;
  `PropertyCard` variant `NFTCard`.
- **Integration Points:** Treasury (royalties), Portfolio (holdings view), Marketplace
  (cross-promotion), Dividend Center (loyalty perks).
- **Future Blockchain Hooks:** ERC721 mint/transfer, `tokenURI` metadata,
  on-chain royalty standard (EIP-2981), marketplace escrow contract.
- **Future API Hooks:** `POST /nft/mint`, `GET /nft/:id`, `POST /nft/listings`.
- **Security:** metadata integrity (hash-pinned), prevent counterfeit mints (only
  Property Manager role or approved contract), royalty enforcement on-chain.
- **Scalability:** NFT indexer for fast ownership queries; off-chain metadata CDN
  with on-chain hash verification.

---

### 3.3 Relcko Network Engine (Agents)

- **Purpose:** Orchestrate the agent/affiliate workforce — onboarding, tasking,
  team structure, and performance — that drives referrals and commissions.
- **Responsibilities:** agent onboarding + tiering; task/goal assignment;
  downline team graphs; attribution of referrals to agents; performance scoring.
- **Entities (extend):** `Agent` (entity 12), `Referral` (entity 10), `Commission`
  (entity 11). New: `AgentTask` (id, agent_id, type, target, status, reward),
  `AgentTeam` (id, parent_agent_id, child_agent_id, level), `CampaignAttribution`
  (id, referral_id, campaign_id, agent_id, credit).
- **Relationships:** Agent → Referrals → Investor; Agent → Team (self-referential);
  Task → Agent → Referral; Attribution → Campaign (module 11).
- **Permissions:** Agent (own tasks/referrals), Senior Agent (team view),
  Network Manager (via Admin), Compliance (audit).
- **Events:** `AgentOnboarded`, `AgentStatusChanged`, `ReferralCreated`,
  `ReferralConverted`, `AgentTaskCompleted`, `CommissionCalculated`.
- **Services:** `AgentService`, `AttributionService`, `TeamGraphService`,
  `PerformanceService`.
- **Shared Components:** reuse dashboard read-models; `AgentCard`, `TeamTree`
  (future components).
- **Integration Points:** Referral Campaign Manager (attribution), Commission
  (payouts), Marketplace (conversion on invest), Treasury (payout settlement),
  Portfolio (agent's referred investors).
- **Future Blockchain Hooks:** on-chain agent registry, referral codes as
  smart-contract links, commission streamed via payment token.
- **Future API Hooks:** `POST /agents/onboard`, `GET /agents/:id/team`,
  `POST /agents/:id/tasks`.
- **Security:** anti-fraud attribution (no self-referral loops), commission rate
  single-source (`agent.commission_rate`), audit every status change.
- **Scalability:** team graph in a graph store; attribution computed asynchronously
  via events; idempotent referral→agent link.

---

### 3.4 Governance

- **Purpose:** On-chain + off-chain decision making for protocol parameters,
  treasury policy, and property actions.
- **Responsibilities:** proposal lifecycle; voting (token-weighted by `Ownership`);
  execution of passed proposals; parameter registry.
- **Entities (new):** `Proposal` (id, type, payload, status, quorum, deadline),
  `Vote` (id, proposal_id, investor_id, weight, choice), `VotingPower` (derived:
  investor_id → weight from Ownership + staking), `GovParameter` (key, value,
  version).
- **Relationships:** Vote → Proposal → Investor; VotingPower derived from
  `Ownership` + staking; Proposal execution → Treasury / Property Manager actions.
- **Permissions:** Investor (propose if threshold, vote), Governance Manager
  (configure, execute), Admin (emergency pause w/ multi-sig).
- **Events:** `GovernanceProposalCreated`, `VoteCast`, `ProposalExecuted`,
  `VotingPowerUpdated`, `GovernanceParameterChanged`.
- **Services:** `ProposalService`, `VotingService`, `ExecutionService`,
  `VotingPowerService` (projection from Ownership).
- **Shared Components:** `ProposalCard`, `VotePanel` (future).
- **Integration Points:** Treasury (execution moves funds), Marketplace (parameter
  changes e.g. fees), Portfolio (voting power display), Network Engine (agent
  councils).
- **Future Blockchain Hooks:** governor contract (vote/execute), on-chain tally,
  timelock, `VotingPower` from ERC1155 balances.
- **Future API Hooks:** `POST /governance/proposals`, `POST /governance/vote`,
  `POST /governance/execute`.
- **Security:** one-vote-per-weight (no double count), timelock on execution,
  multi-sig for sensitive params, tamper-evident proposal payloads.
- **Scalability:** voting power as a recomputed projection; snapshot at proposal
  creation (like Dividend snapshot) to avoid drift.

---

### 3.5 Treasury

- **Purpose:** Custody, movement, and yield management of platform + SPV funds.
- **Responsibilities:** multi-sig accounts; deposit/withdraw/rebalance; record
  yield; settle commissions/payouts; enforce two-stage gating.
- **Entities (new):** `TreasuryAccount` (id, spv_id?, chain_id, address, purpose),
  `TreasuryMovement` (id, account_id, type, amount, currency, tx_hash, status,
  approvers[]), `YieldRecord` (id, account_id, period, amount, source).
- **Relationships:** TreasuryAccount → SPV (per-property custody); Movement →
  Payment/Commission/Treasury; Yield → Account; Movement requires Governance
  approval for large values.
- **Permissions:** Treasury Manager (initiate), Governance (approve large), Admin
  (multi-sig keyholder), Compliance (read + flag).
- **Events:** `TreasuryDeposit`, `TreasuryWithdrawal`, `TreasuryRebalanced`,
  `TreasuryYieldRealized`, `TreasuryMovementApproved`.
- **Services:** `TreasuryService`, `MultiSigService`, `YieldService`,
  `SettlementService`.
- **Shared Components:** `TreasuryCard`, `MovementTable` (future).
- **Integration Points:** Marketplace (settlement), Dividend Center (payouts),
  Commission (agent payouts), Governance (execution), Network Engine (rewards).
- **Future Blockchain Hooks:** multi-sig wallet (Gnosis-safe style), on-chain
  yield strategies, `tx_hash` verification, stablecoin rails.
- **Future API Hooks:** `POST /treasury/move`, `GET /treasury/accounts`,
  `POST /treasury/yield`.
- **Security:** multi-sig + timelock, segregation of duties, every movement appends
  `Transaction` + `AuditLog`, velocity limits, anomaly alerts.
- **Scalability:** append-only movement ledger; balances as projections;
  asynchronous settlement workers.

---

### 3.6 Portfolio

- **Purpose:** The investor's unified view of all holdings, value, performance, and
  claims across every module.
- **Responsibilities:** aggregate `Ownership` (fractions), `NFTHolding`, Dividend
  history, Governance voting power, Referral/Commission earnings, Treasury claims.
- **Entities:** `Portfolio` (entity 8, read-model). No new stored entities; it is a
  projection over `Ownership`, `Transaction`, `Rewards`, `NFTHolding`, `Vote`.
- **Relationships:** composes Investor's Ownerships, Investments, Transactions,
  Rewards, NFTs, Votes, Commissions.
- **Permissions:** Investor (own portfolio), Agent (referred investors' summaries),
  Admin/Compliance (read with audit).
- **Events:** `PortfolioRecomputed`, `PortfolioRebalanced` (consumes
  OwnershipUpdated, DividendDistributed, NFTTransferred, VotingPowerUpdated).
- **Services:** `PortfolioProjectionService` (recompute on events).
- **Shared Components:** reuse `PortfolioKPI`, `RewardsCard`, dashboard widgets
  already in app.
- **Integration Points:** every module feeds it; it is the canonical "my assets"
  surface.
- **Future Blockchain Hooks:** balances pulled from chain (ERC1155/ERC721) to
  reconcile projections.
- **Future API Hooks:** `GET /portfolio`, `GET /portfolio/performance`.
- **Security:** strict ownership scoping (investor can only read own); server-side
  enforcement, never client-trusted.
- **Scalability:** event-driven recompute (no full scans); cached projections per
  investor; incremental updates.

---

### 3.7 Document Vault

- **Purpose:** Secure, access-controlled storage of legal, KYC, SPV, and title
  documents with verification.
- **Responsibilities:** upload, classify, access-grant, verify, audit access;
  KYC document intake.
- **Entities (extend):** `Documents` (entity 14). New: `VaultFolder` (id, owner_id,
  type), `AccessGrant` (id, document_id, grantee_id, scope, expires_at),
  `VerificationRecord` (id, document_id, verifier_id, status, method).
- **Relationships:** Document → Property/SPV/Investor; AccessGrant → Document →
  Grantee; VerificationRecord → Document → Compliance Officer.
- **Permissions:** Investor (own docs), Property Manager (property docs), Compliance
  (verify + access), Admin (override w/ audit).
- **Events:** `DocumentUploaded`, `DocumentVerified`, `DocumentAccessed`,
  `AccessGranted`, `KYCSubmitted`, `KYCApproved`, `KYCRejected`.
- **Services:** `VaultService`, `AccessControlService`, `VerificationService`.
- **Shared Components:** secure download component (authorized endpoint — fixes
  legacy open `/documents/{id}/download`).
- **Integration Points:** KYC (Marketplace/Compliance), SPV (legal), Treasury
  (custody docs), Admin (audit), Global Map (title deeds).
- **Future Blockchain Hooks:** document hash anchored on-chain (notary),
  verifiable credentials for KYC.
- **Future API Hooks:** `POST /vault/upload`, `GET /vault/:id` (authorized),
  `POST /vault/:id/verify`.
- **Security:** no open download; signed/authorized URLs; encryption at rest;
  full access audit; PII segregation (KYC docs never public).
- **Scalability:** object storage + CDN with signed URLs; access grants indexed for
  fast authorization.

---

### 3.8 Dividend Center

- **Purpose:** Schedule and distribute income (rent/yield) to fraction holders.
- **Responsibilities:** create `Rewards` schedule (entity 16 exists as NEW);
  snapshot `Ownership`; compute per-investor payout; distribute; issue tax docs.
- **Entities (extend):** `Rewards`/`DividendSchedule` (entity 16), `DividendPayment`
  (entity 16 payment), new `TaxDocument` (id, investor_id, period, amount, url).
- **Relationships:** DividendSchedule → Property → Ownership (snapshot) →
  DividendPayment → Investor → Transaction; TaxDocument → Investor.
- **Permissions:** Treasury Manager (fund schedule), Investor (claim/view),
  Compliance (read).
- **Events:** `DividendScheduled`, `DividendDistributed`, `DividendClaimed`,
  `TaxDocumentIssued`.
- **Services:** `DividendService`, `SnapshotService`, `DistributionService`,
  `TaxService`.
- **Shared Components:** reuse `RewardsCard`, `TransactionTimeline` widgets.
- **Integration Points:** Treasury (funding), Portfolio (history), Ownership
  (snapshot), Document Vault (tax docs), Marketplace (property source).
- **Future Blockchain Hooks:** on-chain dividend (payment token stream), Merkle
  airdrop, snapshot block height.
- **Future API Hooks:** `POST /dividends/schedule`, `GET /dividends/:id`,
  `POST /dividends/:id/claim`.
- **Security:** snapshot immutability (no mid-distribution drift), idempotent
  payout, tax doc integrity.
- **Scalability:** snapshot once per schedule; batch distribution workers;
  per-investor payout idempotency keyed by (schedule_id, investor_id).

---

### 3.9 AI Copilot

- **Purpose:** Context-aware assistant that helps investors/agents navigate and
  understand the platform using read-model data (no write authority by default).
- **Responsibilities:** answer property/portfolio/governance questions; summarize;
  guide flows; respect permission scopes; cite sources.
- **Entities (new):** `CopilotSession` (id, investor_id, started_at),
  `CopilotMemory` (id, session_id, key, value), `CopilotPolicy` (id, scope,
  allowed_tools, redaction_rules).
- **Relationships:** Session → Investor; Memory → Session; Policy → Role scope.
- **Permissions:** role-scoped data access (Investor sees own; Agent sees team
  aggregates; Admin full). No write tools unless explicitly granted.
- **Events:** `CopilotQueryReceived`, `CopilotAnswerIssued`, `CopilotPolicyViolation`.
- **Services:** `CopilotOrchestrationService`, `RetrievalService`, `PolicyService`.
- **Shared Components:** chat dock (future), reused design-system primitives.
- **Integration Points:** reads Portfolio, Marketplace, Governance, Dividend,
  Document Vault (RAG), Network Engine (agent help).
- **Future Blockchain Hooks:** verify on-chain facts (ownership, proposals) before
  answering; signed attestations.
- **Future API Hooks:** `POST /copilot/chat`, `GET /copilot/history`.
- **Security:** no PII leakage across roles, redaction policy, no unauthorized
  write tools, audit of queries, human-in-the-loop for actions.
- **Scalability:** stateless inference with cached embeddings; per-tenant rate
  limits; streaming responses.

---

### 3.10 Global Property Map

- **Purpose:** Geographic discovery of all properties and SPVs on an interactive
  world map with public + private layers.
- **Responsibilities:** geocode properties; region aggregation; public layer
  (browse) + authed layer (portfolio/ownership pins); link to Marketplace.
- **Entities (new):** `GeoRegion` (id, name, bounds, stats), `PropertyCoordinate`
  (id, property_id, lat, lng, zoom), `MapLayer` (id, type, visibility_scope).
- **Relationships:** PropertyCoordinate → Property; GeoRegion → many
  PropertyCoordinates; MapLayer → properties/docs.
- **Permissions:** Anonymous (public layer), Investor (own pins), Property Manager
  (edit coords), Admin (layers).
- **Events:** `PropertyGeocoded`, `GeoRegionComputed`, `MapLayerUpdated`.
- **Services:** `GeoService`, `RegionAggregationService`, `MapRenderService`.
- **Shared Components:** map shell (future), reuse `PropertyCard` for popovers.
- **Integration Points:** Marketplace (entry), Document Vault (title deeds),
  Portfolio (owned pins), SPV (jurisdiction).
- **Future Blockchain Hooks:** on-chain property registry coordinates; ZK
  location proofs (optional privacy).
- **Future API Hooks:** `GET /map/properties`, `POST /map/geocode`.
- **Security:** don't leak owner identities on public layer; blur exact coords for
  private holdings; rate-limit tile requests.
- **Scalability:** tile/CDN caching, region pre-aggregation, spatial index
  (PostGIS/equivalent).

---

### 3.11 Referral Campaign Manager

- **Purpose:** Run time-boxed referral/affiliate campaigns with rules, rewards, and
  leaderboards.
- **Responsibilities:** create `Campaign`; define reward rules; attribute
  conversions; issue rewards; show leaderboards.
- **Entities (new):** `Campaign` (id, name, rules, reward_type, start, end,
  status), `CampaignReward` (id, campaign_id, referral_id, agent_id, amount,
  status), `Leaderboard` (derived: campaign_id → agent rankings).
- **Relationships:** Campaign → CampaignReward → Referral → Agent; attribution via
  Network Engine `CampaignAttribution`.
- **Permissions:** Governance/Admin (create), Agent (participate + view rank),
  Senior Agent (team rank).
- **Events:** `ReferralCampaignLaunched`, `CampaignRewardIssued`,
  `LeaderboardUpdated`, `ReferralConverted`.
- **Services:** `CampaignService`, `RewardRuleService`, `LeaderboardService`.
- **Shared Components:** `CampaignCard`, `LeaderboardTable` (future).
- **Integration Points:** Network Engine (attribution), Commission (rewards),
  Treasury (payout), Marketplace (conversion source).
- **Future Blockchain Hooks:** on-chain reward distribution, campaign registry.
- **Future API Hooks:** `POST /campaigns`, `GET /campaigns/:id/leaderboard`.
- **Security:** rule tamper-resistance, no retroactive self-referral, audit of
  reward issuance.
- **Scalability:** campaign evaluation as async event workers; leaderboard as
  recomputed projection.

---

### 3.12 Admin Portal

- **Purpose:** Unified, audited operations console spanning every module (read +
  constrained write). No new domain entities — pure orchestration.
- **Responsibilities:** user/role management (bounded), content & property ops,
  compliance queue, treasury/governance initiation (multi-sig), observability,
  configuration, emergency controls.
- **Entities:** none new; operates on all module entities via services.
- **Relationships:** reads/writes every module through its services + permission
  service; every action appends `AuditLog`.
- **Permissions:** Administrator + Super Administrator (highest), but all
  sensitive acts still require the two-stage gating of Treasury/Governance.
- **Events:** `AdminActionLogged` (wraps all mutations), `ComplianceFlagRaised`,
  `SystemPaused`, `RoleChanged`.
- **Services:** `AdminOrchestrationService`, `ObservabilityService`,
  `ConfigService`, `EmergencyService`.
- **Shared Components:** reuse dashboard `GridLayout`, `AdminDashboard`,
  `DocsFAQ`, error boundaries already present.
- **Integration Points:** every module; the Permission service; the event bus;
  Notification service.
- **Future Blockchain Hooks:** multi-sig keyholder coordination, on-chain pause
  guardian.
- **Future API Hooks:** `POST /admin/:module/action` (policy-enforced).
- **Security:** least-privilege by default, full `AuditLog`, break-glass with
  alerting, separation of duties, no single-actor fund movement.
- **Scalability:** read-heavy dashboards backed by projections; action bus
  async; audit log append-only partitioned by time.

---

## 4. Consistency rules (apply to all modules)

- Every module folder = `domain/ types/ mock/ hooks/ utils/ components/`.
- Every state mutation → `AuditLog`; every value move → `Transaction`.
- All cross-module effects → event bus, never direct calls.
- Read models are recomputed projections, never authoritative stores.
- Permission checks are server-side, never client-trusted.
- Blockchain/API are interface seams declared per module; not implemented here.

See `MODULE_DEPENDENCY_MAP.md`, `EVENT_ARCHITECTURE.md`, `PERMISSION_MODEL.md`,
`IMPLEMENTATION_ROADMAP.md` for the supporting detail.
