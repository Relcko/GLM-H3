# Smart Contract Implementation Plan — Relcko Platform (V1.9.0)

**Companion to:** `UNIFIED_IMPLEMENTATION_BLUEPRINT.md`, `MONOREPO_PRODUCTION_STRUCTURE.md` (`contracts/`). Contract build order + upgradeability/emergency. Planning only; no Solidity.

Relcko v1.0.1 is **already production** with deployed contracts. This plan covers **V2.0 contract work**: extensions, new modules, security modules, upgradeability, and emergency controls — built against the locked specs. No architectural changes.

---

## 1. Build order

```
1.  RLKO Token
2.  Treasury
3.  Property Registry
4.  Property NFT
5.  Fraction NFT
6.  Marketplace
7.  Commission
8.  Dividend
9.  Governance
10. Voting
11. Staking Upgrade
12. Security Modules
13. Upgradeability
14. Emergency Controls
```

Each step depends on the prior for shared access-control, registry, and upgrade primitives.

---

## 2. Per-contract plan

### 2.1 RLKO Token
- **Spec:** token standards referenced across Dividend/Treasury/Staking.
- **Build:** ERC20-equivalent with capped supply, permit, snapshots for voting; governance + staking hooks.
- **Rules:** single source of truth for token; no duplicate mint logic.
- **Depends on:** upgradeability primitive (§13) for safe deploy.

### 2.2 Treasury
- **Spec:** `TREASURY_ARCHITECTURE.md`, `TREASURY_LEDGER_ENGINE.md`, `TREASURY_SECURITY_MODEL.md`.
- **Build:** multi-sig custody, hot/cold accounts, withdrawal thresholds, destination whitelist, yield recording, emergency pause.
- **Rules:** ≥2 approvers; threshold → Governance; `SystemPaused` on lockdown; corrections via offsetting on-chain entries where possible.
- **Depends on:** RLKO Token, Governance (execution), Security Modules.

### 2.3 Property Registry
- **Spec:** `DOMAIN_MODEL.md` (Property 1, SPV 15), `RELCKO_ECOSYSTEM_ARCHITECTURE.md §3.1/§3.10`.
- **Build:** on-chain registry of properties/SPVs; coordinates + jurisdiction; linkage to fractions/NFTs.
- **Rules:** 1:1 Property↔Fraction; metadata hash-anchored; registry is reference, not override of business state.
- **Depends on:** upgradeability.

### 2.4 Property NFT
- **Spec:** `NFT_DOMAIN_MODEL.md`, `NFT_MARKETPLACE_ARCHITECTURE.md`, `NFT_ROYALTY_ENGINE.md`.
- **Build:** ERC721 property-backed NFTs (title/loyalty/achievement); metadata URI + hash; royalty (EIP-2981).
- **Rules:** `sourceRef` uniqueness; counterfeit prevention; verified minter only.
- **Depends on:** Property Registry, Security Modules (freeze/blacklist).

### 2.5 Fraction NFT
- **Spec:** `DOMAIN_MODEL.md` (PropertyFraction 2), `OWNERSHIP_MODEL.md`, `MARKETPLACE_INVESTMENT_ENGINE.md`.
- **Build:** ERC1155 fractions; `safeTransferFrom` settlement; supply invariants; price in payment-token minor units (fix legacy USDT 6-decimal bug).
- **Rules:** `available_supply = total_supply − Σ Ownership`; no oversell; on-chain verified.
- **Depends on:** Property Registry, Marketplace, Treasury (settlement).

### 2.6 Marketplace
- **Spec:** `MARKETPLACE_INVESTMENT_ENGINE.md`, `MARKETPLACE_EVENT_EXTENSION.md`, `PAYMENT_SETTLEMENT_ARCHITECTURE.md`.
- **Build:** primary invest + secondary listing/sale; escrow; platform fee (default 1%); buyer/seller commission hooks.
- **Rules:** KYC gate off-chain; price cap; supply invariant; `tx_hash` verified.
- **Depends on:** Fraction NFT, Commission, Treasury.

### 2.7 Commission
- **Spec:** `COMMISSION_ENGINE.md`, `NETWORK_ENGINE_ARCHITECTURE.md`.
- **Build:** commission accrual/approval/withdrawal; single `agent.commission_rate`; forward-only recovery; clawback.
- **Rules:** amount = base × rate/100 (recomputed on-chain/server); no retroactive compressed override.
- **Depends on:** Marketplace, Treasury (payout), Network (attribution).

### 2.8 Dividend
- **Spec:** `DIVIDEND_ENGINE.md`, `FINANCIAL_REPORTING_ARCHITECTURE.md`.
- **Build:** schedule, snapshot (block height), per-token payout, Merkle airdrop, tax-doc linkage.
- **Rules:** snapshot immutability; idempotent per (schedule, investor); tax-doc integrity.
- **Depends on:** Fraction NFT (ownership snapshot), Treasury (funding).

### 2.9 Governance
- **Spec:** `GOVERNANCE_ARCHITECTURE.md`.
- **Build:** governor (propose/vote/execute), timelock, parameter registry, multi-sig for sensitive.
- **Rules:** one-vote-per-weight; tamper-evident payload; execution gated by timelock + multi-sig.
- **Depends on:** Voting, Treasury (execution), Security Modules.

### 2.10 Voting
- **Spec:** `GOVERNANCE_ARCHITECTURE.md` (VotingPower from Ownership + staking).
- **Build:** voting-power derivation (ERC1155/ERC721 balances + staking), snapshot at proposal.
- **Rules:** recomputed projection; no double count; snapshot avoids drift.
- **Depends on:** Fraction NFT, Property NFT, Staking.

### 2.11 Staking Upgrade
- **Spec:** staking specs from V1.0.1 (existing), extended for voting power.
- **Build:** upgrade staking to feed VotingPower + reward streaming; keep backward compat.
- **Rules:** no retroactive re-credit; dual-control config.
- **Depends on:** RLKO Token, Voting.

### 2.12 Security Modules
- **Spec:** `SECURITY_ARCHITECTURE.md`, `TREASURY_SECURITY_MODEL.md`, `NFT_SECURITY_MODEL.md`, `IDENTITY_AND_ACCESS_MODEL.md`.
- **Build:** access-control (role/scope on-chain where needed), freeze/blacklist (NFT/treasury), rate-limit guards, pause guardian, key/custody modules.
- **Rules:** no single actor can unilaterally move funds; freeze set by authorized multisig.
- **Depends on:** all contracts above.

### 2.13 Upgradeability
- **Spec:** architecture frozen; upgrade per `SECURITY_ARCHITECTURE.md` (infra) + governance.
- **Build:** proxy (UUPS/transparent) + access-controlled upgrade; timelock on upgrade; dual-write window for event schema (`EVENT_ARCHITECTURE.md §6`).
- **Rules:** upgrades require governance approval; no silent logic change; rollback path.
- **Depends on:** Security Modules.

### 2.14 Emergency Controls
- **Spec:** `TREASURY_SECURITY_MODEL.md §4`, `NFT_SECURITY_MODEL.md §5`, `SECURITY_EVENT_EXTENSION.md` (`EmergencyLockdown`).
- **Build:** global + per-domain circuit breakers; `EmergencyLockdown` → `SystemPaused` + freezes; dual-control + alert; break-glass cooldown.
- **Rules:** halts value paths only; recovery requires re-authorization (multi-sig); all actions audited.
- **Depends on:** Security Modules, Upgradeability.

---

## 3. Cross-cutting contract rules

- **Money/ownership sacred:** all value movement appends ledger/audit equivalent on-chain + off-chain.
- **Two-stage gating:** treasury/governance execute only via multi-sig/timelock (`PERMISSION_MODEL.md §6`).
- **No duplicate rules:** each invariant implemented once; shared via libraries (`contracts/lib`).
- **Verification:** every deployment verified; `tx_hash` checks; metadata hash-anchored.
- **Architecture frozen:** contract changes require governance-approved revision; no ad-hoc logic.

---

## 4. Migration note

Existing v1.0.1 contracts remain authoritative. V2.0 contracts deploy as extensions/new modules; cutover via `MIGRATION_STRATEGY.md` + `IMPLEMENTATION_ROADMAP_V2.md` (V3.0 Mainnet Launch). On-chain state migration is dual-written and reconciled, never edited in place.
