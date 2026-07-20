# Ownership Model — Marketplace Investment Engine

**Companion to:** `MARKETPLACE_INVESTMENT_ENGINE.md`, `ENTITY_RELATIONSHIP.md`,
`EVENT_ARCHITECTURE.md`. Architecture only.

Ownership is the **single source of truth** for who owns what, and the engine's
most important invariant. This document defines every ownership form, the
ledger that records them, and reconciliation against the chain.

---

## 1. The authoritative record: `Ownership` (entity 7)

`Ownership` is the canonical off-chain ledger of fraction balances. Every
acquisition (primary `InvestmentAllocated`) and transfer (secondary
`OwnershipTransferred`) writes an **append-only** `Ownership` event; the current
balance = fold of events for `(investor_id, property_id)`.

```
OwnershipEvent {
  eventId, investor_id, property_id, fraction_id,
  type: ALLOCATE | TRANSFER_IN | TRANSFER_OUT | RECLAIM,
  quantity, reason, tx_hash?, occurredAt, actorId
}
```

Current balance view = `OwnershipBalance(investor_id, property_id)` projection
(idempotent, rebuildable).

---

## 2. Ownership forms

| Form | Definition | Backing |
|------|------------|---------|
| **Fraction ownership** | fungible ERC1155 fractions of a Property (`PropertyFraction`, entity 2). Primary investable unit. `quantity` = tokens held. | On-chain token balance (mirror). |
| **NFT ownership** | non-fungible ERC721 (loyalty / title-art / achievement). Distinct from fractions; see NFT Marketplace module. | On-chain NFT balance. |
| **SPV ownership** | The Property is legally held by an `SPV` (entity 15); investors own *claims* on the SPV via fractions. The SPV is the legal owner; fractions are the economic owner proxy. | Legal agreement + on-chain fraction. |
| **Corporate ownership** | `Investor` is a company (KYC type = corporate). Same fraction model, different compliance/limits. | Fraction + corporate KYC. |
| **Joint ownership** | multiple `Investor`s share one economic position via a `JointOwnership` record (one or many `OwnershipBalance` rows aggregated). | Fractions split across wallets/records. |
| **Institutional ownership** | large-ticket `Investor` (institutional KYC) with higher caps, possibly direct SPV share class. | Fraction / SPV share class. |

> All forms reduce to **fraction balances** in the ledger; NFT/SPV/corporate/
> joint/institutional are *interpretation layers* + compliance metadata, not
> separate stores. This keeps reconciliation trivial.

---

## 3. Ownership history

- **Append-only event log** (`OwnershipEvent` stream) = full provenance per
  fraction: minted (primary), transferred (secondary), reclaimed (refund),
  burned (property close).
- Exposes "who owned what, when, why" for audit, tax, and dispute resolution.
- Never edited; corrections are offsetting events (`RECLAIM` then re-`ALLOCATE`).

---

## 4. Ownership snapshots

Point-in-time immutable copies used by other engines:
- **Dividend snapshot:** at `DividendScheduled`, snapshot balances → prorated
  payout (prevents mid-distribution drift).
- **Valuation snapshot:** at `VALUATION` time → NAV per holder.
- **Governance snapshot:** at `GovernanceProposalCreated` → voting power.
- **Tax snapshot:** year-end → `TaxDocument` basis.

Snapshots are *derived* (never authoritative) and keyed by `(context, block_or_timestamp)`.

---

## 5. Ownership transfers (secondary)

`MarketplaceSaleCompleted` → emits `OwnershipTransferred`:
- `TRANSFER_OUT` on seller balance, `TRANSFER_IN` on buyer balance.
- Atomic with `SettlementCompleted` (escrow release) + `Commission` (secondary).
- Partial sale = `quantity < held`; full sale = all held.
- Limit/market/offer/negotiation mechanics in
  `MARKETPLACE_INVESTMENT_ENGINE.md` §6.

---

## 6. Ownership reconciliation

Continuous two-way reconciliation between the ledger and the chain:

```
Ledger balance (investor, property)
        ⟷  on-chain ERC1155 balanceOf(investor, token_id)
```

- **Reconciler worker** compares per `(investor, property)` on a schedule +
  after every `OwnershipMinted`/`OwnershipTransferred`.
- Divergence → `ComplianceFlagRaised` (alert) + `AuditLog` entry; ledger remains
  authoritative for business logic, chain is the verifiable proof.
- Guarantees: `sum(OwnershipBalance per property) == PropertyFraction.total_supply
  - burned` (supply invariant from `ENTITY_RELATIONSHIP.md` §4).
- At scale: reconcile by `property_id` partition; sample + full sweeps.

---

## 7. Integration touchpoints

| Consumer | Uses ownership for |
|----------|--------------------|
| Portfolio | composes all `OwnershipBalance` per investor. |
| Governance | voting power from snapshot. |
| Dividend Center | payout from snapshot. |
| Treasury | settlement moves value between owners. |
| NFT Marketplace | fractional vs NFT holdings both shown. |
| Network Engine | referred investors' ownership for agent stats. |
| Document Vault | ownership certificates (Investment Certificates). |
| Global Property Map | authed "my pins" layer. |
| AI Copilot | read-only answers about holdings. |
| Admin Portal | oversight + freeze (audit-logged). |

All read the `OwnershipBalance` projection, never the raw event stream directly.

---

## 8. Scalability

- `OwnershipEvent` stream is event-sourced, partitioned by `property_id`.
- `OwnershipBalance` is a CQRS read model, recomputed incrementally, cached with
  event-driven invalidation.
- Supports millions of records: balance lookups are O(1) on the projection;
  history is append-only and archive-friendly.
- Reconciliation is async + partitioned; never blocks writes.
