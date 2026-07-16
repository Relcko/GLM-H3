# Migration Strategy — V1.1.1 (Framework-Agnostic)

Goal: port the **business domain** of the legacy marketplace (Laravel 12 + Inertia v2 +
React 19 + Vite 7 + Tailwind v4 + wagmi v3/viem v2 + Hardhat) into the Relcko target
(Next 16 + Tailwind v3 + RainbowKit + wagmi v2 + Foundry) **without** writing app code.
This document defines phases, order, risk handling, and verification gates only.

Constraint recap: **architecture deliverables only** — DOMAIN_MODEL.md,
ENTITY_RELATIONSHIP.md, MIGRATION_STRATEGY.md. No React components, no routes, no API
endpoints, no migration files are generated here.

---

## 0. Divergence map (must resolve before porting logic)

| Concern | Legacy | Target | Action |
|---------|--------|--------|--------|
| Web3 stack | wagmi v3 / viem v2 | wagmi v2 / viem | Re-implement wallet + tx verification against wagmi v2 API surface |
| CSS | Tailwind v4 | Tailwind v3 | Do not carry v4-only syntax; target styling is UI-frozen anyway |
| Wallet auth | `walletLogin` (no sig verify) | RainbowKit + SIWE | Replace with signature-verified login (nonce/expiry/domain) |
| Tokenization | Hardhat (RWAProperty ERC1155, MockUSDT) | Foundry | Re-deploy + verify contracts; keep ERC1155 model |
| Config | committed `.env` DB password | secret store | Rotate + externalize before any data move |

---

## 1. Phase plan (ordered)

### Phase A — Security & config hardening (pre-condition)
- Rotate the committed legacy DB password; externalize secrets (vault/env sealed).
- Add a Wallet signature-verification module spec (SIWE: nonce, expiry, domain binding,
  replay protection). Legacy `walletLogin` is forgeable — this is the #1 risk.
- Define on-chain `tx_hash` verification as a required step for every Payment/Transaction
  (legacy trusted client-supplied hashes).
- Document KYC/AML and SPV legal requirements (new compliance layer).

### Phase B — Domain type & model extraction
- Adopt DOMAIN_MODEL.md (19 entities) + ENTITY_RELATIONSHIP.md as the canonical model.
- Build a framework-agnostic schema/type layer (the persistence-agnostic contract).
- Mark NEW entities for fresh implementation: SPV, Rewards, AuditLog.
- Mark orphan-fix entities: Rewards (legacy never created Dividends), KYC (broken
  `isPending()`), Documents (open download), Wallet (no sig verify), Transaction
  (missing fiat entries), Commission (webhook path missed primary-purchase).

### Phase C — Persistence / backend port (A/B safe)
- Stand up the target data store mirroring the 19-entity model with the relationship
  matrix as the FK/edge contract.
- Backfill: Investors (from Users), Properties, PropertyFractions, Investments,
  MarketplaceListing/Sale, Ownership (recompute), Referrals, Agents, Commissions, KYC,
  Documents.
- Enforce invariants (Section 4 of ER doc) at write time: money conservation,
  ownership supply, listing price cap, single commission rate source.
- Run legacy + target side-by-side (A/B); reconcile Portfolios vs ledger before cutover.

### Phase D — Chain & tokenization hardening
- Port RWAProperty ERC1155 + payment token to Foundry; verify deployment.
- Bind Wallet login to on-chain address with verified signature.
- Make MarketplaceSale on-chain-anchored (legacy was off-chain only).
- Wire Rewards distribution (snapshot Ownership, prorate, append Transactions).

### Phase E — Affiliate & compliance completion
- Implement Commission for BOTH webhook and admin confirm paths (legacy gap).
- Implement Agent withdrawal + payout lifecycle.
- Implement KYC approval gating on Investment when `kyc_required`.
- Lock Documents behind authorized access (no open download).

### Phase F — Audit & verification layer
- Implement AuditLog append on every mutation; Transaction on every value move.
- Add reconciliation job: Portfolio totals == Transaction ledger == Ownership sums.
- CI gate: build + typecheck + targeted lint (carry RC20.1/1.0.1 green baseline).

---

## 2. Risk register (from V1.1.0 audit)

| Risk | Legacy evidence | Mitigation (this strategy) |
|------|-----------------|----------------------------|
| Forgeable wallet login | `walletLogin` no sig verify | Phase A SIWE + Phase D binding |
| Unverified tx_hash | trusted client-supplied | Phase A verification requirement |
| Off-chain marketplace | sale not anchored on chain | Phase D on-chain sale |
| Committed secrets | DB password in `.env` | Phase A rotate + externalize |
| Stack divergence | wagmi v3 vs v2, TW v4 vs v3 | Phase 0 re-implement on target APIs |
| Orphaned Dividends | models + reads, never created | Phase B/D first-class Rewards |
| Broken KYC status | `isPending()` dead code | Phase E correct status machine |
| Open document download | `/documents/{id}/download` | Phase E authorized access |
| Silent balance mutation | `User.addBalance` no ledger | Phase C/F invariant + AuditLog |
| Commission gap | webhook path missed primary | Phase E both paths |

---

## 3. Verification gates

- **Gate A:** secrets rotated; SIWE spec + tx verification spec reviewed.
- **Gate B:** 19-entity model accepted; NEW/orphan entities scoped.
- **Gate C:** backfill reconciles (ownership supply invariant holds); A/B diff clean.
- **Gate D:** contracts deployed/verified; on-chain sale + login binding proven.
- **Gate E:** affiliate + KYC + documents behaviors pass domain tests.
- **Gate F:** AuditLog + reconciliation job green; CI (build/tsc/lint) green.

---

## 4. Cutover checklist (post-strategy, pre-launch)

- [ ] Legacy data frozen; final backfill + reconcile run.
- [ ] DNS / traffic shift to target after A/B parity confirmed.
- [ ] Legacy `.env` revoked; old DB credentials disabled.
- [ ] Monitoring on reconciliation job + failed-verification alerts.

---

*No application code is produced by this document. It is the ordered, risk-aware plan
for realizing DOMAIN_MODEL.md + ENTITY_RELATIONSHIP.md on the Relcko target stack.*
