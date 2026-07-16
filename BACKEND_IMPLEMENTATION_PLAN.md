# Backend Implementation Plan — Relcko Platform (V1.9.0)

**Companion to:** `UNIFIED_IMPLEMENTATION_BLUEPRINT.md`, `IMPLEMENTATION_DEPENDENCY_GRAPH.md`. Backend build order + per-area spec references. Planning only; no code.

All backend areas inherit: server-side permission enforcement (`PERMISSION_MODEL.md`), append-only audit (`AUDIT_ARCHITECTURE.md`), event-driven integration (`EVENT_ARCHITECTURE.md`), two-stage gating for value (`PERMISSION_MODEL.md §6`).

---

## 1. Build order

```
1. Authentication (Identity/Wallet)
2. Marketplace
3. Investments
4. NFT
5. Portfolio
6. Treasury
7. Governance
8. Network Engine
9. Documents
10. Notifications
11. AI
12. Administration
```

> Security/Compliance/Risk/Fraud are **cross-cutting** and wired into every area (auth, audit, permission, PII, monitoring) rather than built as a separate late step. Their dedicated completion milestone is V2.8 (`IMPLEMENTATION_ROADMAP_V2.md`).

---

## 2. Per-area plan

### 2.1 Authentication (`services/identity`)
- **Specs:** `IDENTITY_AND_ACCESS_MODEL.md`, `SECURITY_ARCHITECTURE.md §2.1–2.5`, `PERMISSION_MODEL.md`.
- **Build:** Wallet (SIWE verify, nonce/expiry/domain) + Email + MFA + Passkeys + Hardware Keys; Institutional/Corporate accounts; Delegated Access; Guardian Recovery; Session Security.
- **Rules:** no address-only trust; 1 wallet per KYC identity; server-side `authorize()`.
- **Events:** `IdentityVerified`, `PermissionGranted/Revoked`, `RiskScoreChanged` (via Risk worker).
- **Depends on:** Core Platform (shared). Nothing else blocks it.

### 2.2 Marketplace (`services/marketplace`)
- **Specs:** `MARKETPLACE_INVESTMENT_ENGINE.md`, `MARKETPLACE_EVENT_EXTENSION.md`, `PROPERTY_STATE_MACHINE.md`, `VALUATION_ENGINE.md`, `RELCKO_ECOSYSTEM_ARCHITECTURE.md §3.1`.
- **Build:** property publish/active, browse, primary `Investment` flow (extends here), secondary `MarketplaceListing`/`MarketplaceSale`, price/supply invariants, commission trigger.
- **Rules:** KYC + min_investment + available_supply; listing ≤ current_value; every value move → `Transaction` + `AuditLog`.
- **Events:** `PropertyPublished`, `InvestmentConfirmed`, `MarketplaceSaleCompleted`, `CommissionCalculated`.
- **Depends on:** Auth, Document Vault (legal docs), Permission, Audit.

### 2.3 Investments (`services/marketplace` + `services/ownership`)
- **Specs:** `MARKETPLACE_INVESTMENT_ENGINE.md`, `PAYMENT_SETTLEMENT_ARCHITECTURE.md`, `OWNERSHIP_MODEL.md`.
- **Build:** invest confirm → `OwnershipUpdated` (avg cost basis single implementation) → `Transaction` → commission (both webhook + admin paths, fixing legacy gap) → referral convert.
- **Rules:** amount = tokens × price_per_token; tx_hash on-chain verified; no oversell.
- **Events:** `InvestmentConfirmed`, `OwnershipUpdated`, `CommissionCalculated`, `ReferralConverted`.
- **Depends on:** Marketplace, Payment settlement, Network Engine (attribution).

### 2.4 NFT (`services/nft`)
- **Specs:** `NFT_MARKETPLACE_ARCHITECTURE.md`, `NFT_DOMAIN_MODEL.md`, `NFT_TYPES.md`, `NFT_TRANSFER_MODEL.md`, `NFT_STATE_MACHINE.md`, `NFT_OWNERSHIP_MODEL.md`, `NFT_ROYALTY_ENGINE.md`, `NFT_SECURITY_MODEL.md`, `NFT_EVENT_EXTENSION.md`.
- **Build:** mint/transfer/list/buy/sell, royalties (EIP-2981), counterfeit/ownership/freeze/blacklist, metadata hash-anchor.
- **Rules:** `sourceRef` uniqueness; on-chain owner source of truth; transfer predicate rejects frozen/non-compliant.
- **Events:** `NFTMinted`, `NFTListed`, `NFTSold`, `NFTTransferred`, `RoyaltiesPaid`, `NFTFrozen`.
- **Depends on:** Auth, Document Vault (verification), Compliance (gating), Treasury (royalties).

### 2.5 Portfolio (`services/portfolio`)
- **Specs:** `RELCKO_ECOSYSTEM_ARCHITECTURE.md §3.6`, `DOMAIN_MODEL.md` (Portfolio 8), `EVENT_ARCHITECTURE.md §5`.
- **Build:** projection worker over `Ownership`/`Transaction`/`Rewards`/`NFTs`/`Votes`/`Commissions`; incremental recompute.
- **Rules:** derived only; reconcile with ledger; strict `OWN` scoping.
- **Events (derived):** `PortfolioRecomputed`.
- **Depends on:** Ownership, Dividend, NFT, Governance (voting power), Network (earnings).

### 2.6 Treasury (`services/treasury`)
- **Specs:** `TREASURY_ARCHITECTURE.md`, `TREASURY_LEDGER_ENGINE.md`, `TREASURY_EVENT_EXTENSION.md`, `RESERVE_MANAGEMENT.md`, `TREASURY_SECURITY_MODEL.md`.
- **Build:** multi-sig accounts, deposit/withdraw/rebalance, yield record, settlement, limits, emergency lockdown.
- **Rules:** ≥2 approvers; threshold → Governance; destination whitelist; corrections offsetting; `SystemPaused` on lockdown.
- **Events:** `TreasuryDeposit`, `TreasuryWithdrawal`, `TreasuryRebalanced`, `TreasuryYieldRealized`, `TreasuryMovementApproved`.
- **Depends on:** Ledger, Payment, Governance (execution), Commission/Dividend (payouts).

### 2.7 Governance (`services/governance`)
- **Specs:** `GOVERNANCE_ARCHITECTURE.md`, `EVENT_ARCHITECTURE.md` (Governance events).
- **Build:** proposal lifecycle, voting (token-weighted from `Ownership`+staking), timelock, parameter registry, execution.
- **Rules:** one-vote-per-weight; snapshot at creation; tamper-evident payload; multi-sig + timelock for sensitive.
- **Events:** `GovernanceProposalCreated`, `VoteCast`, `ProposalExecuted`, `VotingPowerUpdated`, `GovernanceParameterChanged`.
- **Depends on:** Auth, Ledger, Treasury (execution), Portfolio (voting power projection).

### 2.8 Network Engine (`services/network`)
- **Specs:** `NETWORK_ENGINE_ARCHITECTURE.md`, `NETWORK_TREE_MODEL.md`, `AGENT_RANK_SYSTEM.md`, `AGENT_PERFORMANCE_MODEL.md`, `COMMISSION_ENGINE.md`, `ANTI_FRAUD_MODEL.md`.
- **Build:** onboarding/tiering, tasks, team graph (acyclic), referral attribution, performance scoring, commission (single `agent.commission_rate`), clawback.
- **Rules:** no self-referral/cycle; forward-only recovery; qualified-sale gate; audit every status change.
- **Events:** `AgentOnboarded`, `ReferralCreated`, `ReferralConverted`, `CommissionCalculated/Approved/Paid`, `AgentTaskCompleted`.
- **Depends on:** Auth, Marketplace (conversion), Treasury (payout), Fraud (signals).

### 2.9 Documents (`services/documents`)
- **Specs:** `DOCUMENT_MANAGEMENT_ARCHITECTURE.md`, `COMPLIANCE_ARCHITECTURE.md`.
- **Build:** upload/classify/access-grant/verify/audit; KYC intake; signed URLs; PII segregation.
- **Rules:** no open download; encryption at rest; PII access audited; verification by Compliance (human).
- **Events:** `DocumentUploaded`, `DocumentVerified`, `DocumentAccessed`, `AccessGranted`, `KYCSubmitted/Approved/Rejected`.
- **Depends on:** Auth, Compliance, Privacy.

### 2.10 Notifications (`services/notifications`)
- **Specs:** `RELCKO_ECOSYSTEM_ARCHITECTURE.md §1` (Notification service), `EVENT_ARCHITECTURE.md` (`NotificationSent`, `AlertRaised`).
- **Build:** consume notify/alert events → in-app/email/on-chain; preference + rate limits; role-scoped.
- **Rules:** idempotent delivery; never a source of business state.
- **Events:** `NotificationSent`.
- **Depends on:** all modules (consumer).

### 2.11 AI (`services/ai`)
- **Specs:** `AI_PLATFORM_ARCHITECTURE.md` + 9 AI companions.
- **Build order (internal):** Knowledge Layer (ingest) → Memory Layer → Explainability boundary → engines (Investor/Marketplace first) → remaining engines → agentic + model registry.
- **Rules:** advisory-only; explainability envelope mandatory; no value-moving events; `AIModelUpdated` on change.
- **Events:** `AIRecommendationGenerated`, `AIForecastGenerated`, `AIFraudDetected`, `AIRiskDetected`, `AIAlertRaised`, `KnowledgeIndexed`, `MemoryUpdated`.
- **Depends on:** all read models + events (consumer); Security (PII), Audit.

### 2.12 Administration (`services/admin`)
- **Specs:** `RELCKO_ECOSYSTEM_ARCHITECTURE.md §3.12`, `PERMISSION_MODEL.md §7`.
- **Build:** orchestration over all services; user/role mgmt (bounded), content/property ops, compliance queue, treasury/governance initiation (multi-sig), observability, config, emergency.
- **Rules:** least-privilege; full `AuditLog`; break-glass with alert; no single-actor fund movement.
- **Events:** `AdminActionLogged`, `ComplianceFlagRaised`, `SystemPaused`, `RoleChanged`.
- **Depends on:** every module (orchestration only).

---

## 3. Cross-cutting integration (applies to all areas)

- **Permission:** `authorize(actor, action, resource, context)` at route + service + event-handler (`PERMISSION_MODEL.md §5`).
- **Audit:** every mutation → `AuditLog` (19) + relevant event.
- **Security events:** emit `RiskScoreChanged`/`FraudDetected`/`ThreatDetected`/`PermissionGranted/Revoked`/`SecretRotated`/`EmergencyLockdown` as applicable (`SECURITY_EVENT_EXTENSION.md`).
- **Privacy:** PII segregated/minimized/retained per `PRIVACY_MODEL.md`.
- **No duplicates:** each rule implemented once in its owning service; others call it via event/API, never re-implement.
