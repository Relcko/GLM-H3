# Implementation Roadmap — Relcko Ecosystem

**Companion to:** `RELCKO_ECOSYSTEM_ARCHITECTURE.md`, `MODULE_DEPENDENCY_MAP.md`,
`EVENT_ARCHITECTURE.md`, `PERMISSION_MODEL.md`.

This is a **sequencing plan**, not an implementation spec. It defines *what order*
modules ship in, *why*, and *which locked artifacts each phase consumes*. No code.

---

## 0. Guiding constraints

- Existing modules are **LOCKED** and **not modified**: v1.0.1 app, Legacy Audit,
  Domain Model, ER Model, Migration Strategy, Marketplace Foundation (V1.2.0).
- Every new module reuses the V1.2.0 folder contract (`domain/ types/ mock/
  hooks/ utils/ components/`) and the event bus / permission service.
- Each phase ends with: build green, typecheck green, lint green, and the
  event/permission contracts for that phase documented.

---

## Phase 1 — Foundation (DONE)
**Shipped:** v1.0.1 · Marketplace browsing (V1.2.0).

**Outcome:** Proved the feature-module shape + design system; established the
`/marketplace` route and the 13 browsing components. No invest yet.

**Consumes:** DOMAIN_MODEL.md (Property/PropertyFraction/SPV), RC18–RC20 design
system, `CinematicShell`.

---

## Phase 2 — Close the primary loop (P2)

**Goal:** an investor can KYC, invest, hold, and see it everywhere.

| Module | Work | Depends on |
|--------|------|-----------|
| Marketplace (invest) | `Investment` flow, KYC gate, `Ownership` mint, `Payment` settlement, `Commission` | Shared Identity/Ledger |
| Document Vault | upload/verify/KYC intake, authorized download (fix legacy open download) | Documents entity |
| Portfolio | `PortfolioRecomputed` projection from Ownership/Transaction | Marketplace invest |
| Compliance/KYC | `KYC` status machine (fix legacy broken `isPending`) | Identity |

**Exit criteria:** `InvestmentConfirmed → OwnershipUpdated → PortfolioRecomputed →
CommissionCalculated` chain live end-to-end (per EVENT_ARCHITECTURE Flow A).

---

## Phase 3 — Money & income (P3)

| Module | Work | Depends on |
|--------|------|-----------|
| Treasury | multi-sig accounts, `TreasuryMovement`, settlement workers, yield records | P2 payments |
| Dividend Center | `DividendSchedule` + point-in-time `Ownership` snapshot + distribution + tax docs | P2 Ownership |
| Network Engine (Agents) | onboarding, teams, attribution, performance | P2 Referral/Commission |

**Exit criteria:** dividends distribute from Treasury; agent commissions pay out;
all via events + `AuditLog`.

---

## Phase 4 — Decentralization & growth (P4)

| Module | Work | Depends on |
|--------|------|-----------|
| Governance | proposals, voting (power from Ownership snapshot), timelock execution | P2 Ownership, P3 Treasury |
| Referral Campaign Manager | campaigns, reward rules, leaderboards | P3 Network Engine |
| NFT Marketplace | ERC721 mints, listings, royalties | P2 Identity, P3 Treasury |

**Exit criteria:** a governance proposal can move Treasury funds; campaigns issue
rewards; NFT royalties flow to Treasury.

---

## Phase 5 — Experience & operations maturity (P5)

| Module | Work | Depends on |
|--------|------|-----------|
| AI Copilot | read-only assistant over projections, policy-bounded | All read models |
| Global Property Map | geocode + public/authed layers + region aggregation | P2 Property |
| Admin Portal | orchestration console over all modules, emergency controls | All phases |

**Exit criteria:** unified admin with full `AuditLog`; map discovery; Copilot
answers scoped to role.

---

## Milestone table

| Milestone | Modules | Unblocks |
|-----------|---------|----------|
| M1 (done) | Marketplace browse | Design-system proof |
| M2 | Marketplace invest, KYC, Vault, Portfolio | Primary loop |
| M3 | Treasury, Dividend, Network Engine | Income + payouts |
| M4 | Governance, Campaigns, NFT | Decentralization + growth |
| M5 | Copilot, Map, Admin | Maturity + ops |

---

## Risk-managed sequencing rules

1. **Never ship a projection before its source.** Portfolio/Treasury/Governance
   projections only after the events they consume exist (P2 before P3/P4).
2. **Two-stage gating before any real funds.** Treasury multi-sig + Governance
   timelock must exist before mainnet value moves (P3 gate, P4 execution).
3. **Audit from day one.** `AuditLog` + `PermissionService` are Phase-2
   infrastructure, not Phase-5 polish.
4. **Blockchain as seam.** Each phase declares chain hooks but defers on-chain
   until the off-chain path + invariants are proven (per MIGRATION_STRATEGY
   Phase D).
5. **No cross-module imports.** Enforce the dependency rule (MODULE_DEPENDENCY_MAP
   §5) in CI lint so future modules can't create rewrite-inducing coupling.

---

## Definition of done (per module)

- [ ] `domain/` entities + invariants match DOMAIN_MODEL conventions.
- [ ] Emits/consumes only canonical events (`EVENT_ARCHITECTURE.md`).
- [ ] Permission checks via `PermissionService` (server-side).
- [ ] Every mutation → `AuditLog`; every value move → `Transaction`.
- [ ] Blockchain + API declared as interface seams (no premature impl).
- [ ] Build / typecheck / lint green; design system reused (no new visual language).
- [ ] Added to `MODULE_DEPENDENCY_MAP.md` + roadmap tracking.
