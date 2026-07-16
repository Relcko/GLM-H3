# NFT Marketplace Architecture — Relcko NFT Marketplace (V1.4.0)

**Companion to:** `DOMAIN_MODEL.md` (entities 1–19), `EVENT_ARCHITECTURE.md`
(NFT events), `OWNERSHIP_MODEL.md`, `NETWORK_ENGINE_ARCHITECTURE.md`,
`PERMISSION_MODEL.md`, `RELCKO_ECOSYSTEM_ARCHITECTURE.md`. Architecture only — no
UI, React, API, Solidity, or migration.

The NFT Marketplace is **not** an image marketplace. It is the **digital ownership
layer for the entire Relcko ecosystem**: every representation of ownership,
reputation, achievement, governance, membership, identity, and future utility
lives here as a tokenized asset.

---

## 1. Position in the platform

```
                 RELCKO CORE DOMAINS
   Marketplace · Portfolio · Governance · Treasury · Network Engine · AI Copilot
                                    ▲
                          ┌─────────┴──────────┐
                          │   NFT MARKETPLACE  │  ← digital ownership layer
                          └─────────┬──────────┘
   represents: ownership, identity, KYC, rank, achievement, membership,
              governance power, access, documents, events, partnerships
```

Every other domain **reads** NFT state to grant utility (fee discounts, voting
power, exclusive access, commission bonuses) and **writes** NFT state on lifecycle
events (mint on rank-up, burn on redemption, transfer on sale).

---

## 2. Core principles

1. **One ownership layer.** All ecosystem credentials and ownership are NFTs —
   there is no parallel non-tokenized credential store for these concerns.
2. **Compliance-first.** Transferability is a property of the token *standard*, not
   an afterthought; regulated assets are non-transferable or compliance-gated.
3. **Soulbound where due.** Identity, KYC, accreditation, rank, achievement, agent
   license, and document verification are **non-transferable** (soulbound).
4. **Reconciliation.** On-chain token state is the source of truth; off-chain
   records must reconcile to it (fixes legacy DB↔chain divergence).
5. **Composable utility.** An NFT's utility is derived by other domains via events
   + read models, never by tightly coupled logic.
6. **Immutable audit.** Every mint/transfer/burn/upgrade mirrors to `AuditLog`
   (entity 19).

---

## 3. Token standard families (framework-agnostic)

| Family | Transferability | Use |
|--------|-----------------|-----|
| **T — Transferable** | free transfer | property fractions, membership, access, collectibles |
| **S — Soulbound** | non-transferable | identity, KYC, accreditation, rank, achievement, agent license, document verification, event (PoA) |
| **D — Divisible / Semi-fungible** | transferable in units | fractional ownership, rental/dividend entitlement units |
| **L — Lockable / Compliance** | transferable but gated | property ownership, exclusive allocation, voting power (KYC/whitelist/geo) |

All families share a common metadata envelope (hash-anchored) and a common
lifecycle state machine (`NFT_STATE_MACHINE.md`).

---

## 4. Document set (this milestone)

| Doc | Scope |
|-----|-------|
| `NFT_DOMAIN_MODEL.md` | NFT-domain entities + linkage to locked 1–19. |
| `NFT_TYPES.md` | the 19 NFT categories, standard + lifecycle + utility. |
| `NFT_STATE_MACHINE.md` | mint/list/sell/transfer/burn/redeem/upgrade lifecycle. |
| `NFT_OWNERSHIP_MODEL.md` | property & fractional ownership representation + verification. |
| `NFT_TRANSFER_MODEL.md` | transfer kinds, restrictions, validation, royalty, freeze. |
| `NFT_MARKETPLACE_ENGINE.md` | primary/secondary/auction/offer/collections. |
| `NFT_ROYALTY_ENGINE.md` | royalties, fees, treasury, burn/upgrade/fusion/evolution, dynamic metadata. |
| `NFT_SECURITY_MODEL.md` | fraud, counterfeit, duplicate, blacklist, freeze, recovery, emergency. |
| `NFT_EVENT_EXTENSION.md` | NFT events extending `EVENT_ARCHITECTURE.md`. |

---

## 5. Integration map

| Domain | NFT touchpoint |
|--------|----------------|
| Marketplace | Fractional Ownership NFT ↔ `Ownership` (7)/`PropertyFraction` (2); Property Ownership NFT ↔ `SPV` (15). |
| Portfolio | NFT holdings compose into investor view; `NFTTransferred` recomputes. |
| Governance | Governance NFT + Voting Power NFT drive `VotingPowerUpdated`. |
| Treasury | royalty + marketplace-fee allocation; emergency controls. |
| Network Engine | Rank/Achievement/Agent License NFTs; NFT bonus + NFT score. |
| AI Copilot | read-only NFT explainability (scoped). |
| Dividend Center | Dividend/Rental Income NFT entitlement to distributions. |
| Global Property Map | Property Access / Ownership NFT gate map layers. |
| Document Vault | Document Verification / KYC NFT attestations. |
| Campaign Engine | achievement/event NFT rewards. |

---

## 6. Scalability & integrity

- Token ledger partitioned by collection; metadata in content-addressed storage
  with on-chain hash.
- All state changes are event-sourced; read models (Portfolio, Leaderboard,
  Network NFT score) are recomputed incrementally.
- Compliance gating is a pure predicate evaluated at transfer time (no state
  mutation of the tree, mirroring Network Engine's compression approach).
- At 100K assets × millions of transfers, partitioning + rollups keep compute
  bounded; audit trail append-only.

---

## 7. Event extension

NFT events are defined in `NFT_EVENT_EXTENSION.md` as an **additive extension** to
the locked `EVENT_ARCHITECTURE.md` (which already declares `NFTMinted`,
`NFTListed`, `NFTSold`, `NFTTransferred`, `RoyaltiesPaid`). The locked file is not
modified.
