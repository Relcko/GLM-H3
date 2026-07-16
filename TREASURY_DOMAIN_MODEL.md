# Treasury Domain Model — Relcko Treasury & Dividend Engine (V1.6.0)

**Companion to:** `TREASURY_ARCHITECTURE.md`, `DOMAIN_MODEL.md` (entities 1–19),
`EVENT_ARCHITECTURE.md`. Architecture only.

Defines the **treasury-domain entities** and their relationships to the locked
`DOMAIN_MODEL.md` entities (1 Property … 19 AuditLog). Treasury entities are
numbered **TR-1 … TR-N** to avoid colliding with the locked 1–19 inventory.

---

## 1. Entity inventory (treasury domain)

| ID | Entity | Notes |
|----|--------|-------|
| TR-1 | **TreasuryDomain** | one of the 16 sub-treasuries; policy + limits. |
| TR-2 | **TreasuryAccount** | a sub-account within a domain (per asset). |
| TR-3 | **TreasuryBalance** | current balance per account (derived read-model). |
| TR-4 | **TreasuryMovement** | an immutable journal/transfer record. |
| TR-5 | **AllocationRule** | revenue→domain split rule. |
| TR-6 | **ReserveFund** | a reserve sub-fund (Emergency/Insurance/…). |
| TR-7 | **Dividend** | a dividend distribution cycle. |
| TR-8 | **Buyback** | a buyback program/execution. |
| TR-9 | **Burn** | a burn event. |
| TR-10 | **JournalEntry** | double-entry ledger line (see `TREASURY_LEDGER_ENGINE.md`). |
| TR-11 | **FinancialReport** | a generated report (statement/audit). |
| TR-12 | **TreasuryLimit** | per-domain limits (withdrawal/risk/exposure). |
| TR-13 | **TaxRecord** | per-entity tax obligation/withholding. |

---

## 2. Entities & locked linkages

### TR-1 TreasuryDomain
`{ id, kind (16 kinds), policyRef, governingBody (TREASURY_GOVERNANCE/Governance),
multiSigRef, createdAt }`

### TR-2 TreasuryAccount
`{ id, domainId, asset, address? (hot/cold), custodian, status }`
- One account per (domain, asset). Crypto accounts reference hot/cold wallet
  addresses (`TREASURY_SECURITY_MODEL.md`).

### TR-3 TreasuryBalance
`{ accountId, asset, amount, lastReconciledAt, fxSnapshotRef }` — derived from
`TreasuryMovement` stream (read-model, not source of truth).

### TR-4 TreasuryMovement
`{ id, domainId, fromAccount, toAccount, asset, amount, kind, fxSnapshot,
refEvent, approvedBy (multi-sig), status, createdAt }`
- Mirrors canonical `TreasuryMovementApproved`.

### TR-5 AllocationRule
`{ id, source (revenue type), splits:[{domainId, bps}], effectiveFrom }`
- Single source of revenue split (no competing config — mirrors
  `ENTITY_RELATIONSHIP.md` rule 4).

### TR-6 ReserveFund
`{ id, type (7 reserve types), domainId=Reserve, targetBps, currentBalance,
status }`

### TR-7 Dividend
`{ id, propertyId(1)/sourceRef, cycle, state (9 states), totalAmount, currency,
scheduledAt, createdAt }` — lifecycle in `DIVIDEND_ENGINE.md`.

### TR-8 Buyback / TR-9 Burn
`{ id, kind, sourceFunding (treasury/revenue/governance), asset, amount,
executedAt, txRef?, approvedBy }`

### TR-10 JournalEntry
`{ id, ledgerId, accountId, debit/credit, asset, amount, fxSnapshot, refEvent,
timestamp, actor }` — double-entry (`TREASURY_LEDGER_ENGINE.md`).

### TR-13 TaxRecord
`{ id, entityRef (Investor 4 / Agent 12 / Treasury), period, amount, currency,
withholding, documentRef }` — feeds Tax Ledger + `TaxDocumentIssued`.

---

## 3. Relationship diagram (text)

```
TreasuryDomain 1 ──< TreasuryAccount (many, per asset)
TreasuryAccount 1 ──1 TreasuryBalance (derived)
TreasuryMovement 1..* ──> JournalEntry (double-entry)
AllocationRule ──▶ TreasuryDomain (splits)
ReserveFund ──▶ TreasuryDomain(Reserve)
Dividend ──▶ Property(1)/SPV(15); ──▶ JournalEntry (funding+dist)
Buyback/Burn ──▶ TreasuryDomain; ──▶ JournalEntry
All movements ──▶ AuditLog(19)
TaxRecord ──▶ Investor(4)/Agent(12); ──▶ Tax Ledger
```

---

## 4. Key integrity rules (cross-entity)

1. Every `TreasuryMovement` produces **balanced** `JournalEntry` pairs
   (debit = credit) across ledgers.
2. `AllocationRule` is the single source of revenue splits.
3. Outbound value (withdrawal/transfer out of a domain) requires
   `TreasuryMovementApproved` via multi-sig or Governance (`ProposalExecuted`).
4. `TreasuryBalance` is derived only; never updated in place (recompute from
   movements).
5. FX snapshot at entry; all reporting converts via the snapshot for that entry.
6. Every mutation mirrors to `AuditLog` (19); corrections are offsetting entries.

---

## 5. Aggregation & derivation

- **Treasury Health** = function of domain balances, reserve coverage, liquidity
  ratio, exposure limits.
- **Investor Ledger** = projection of an investor's dividends/commissions/taxes
  from JournalEntries tagged to that investor.
- **Property Ledger** = per-property cashflow entries.
- All derived read-models recomputed incrementally from the immutable movement
  stream.

---

## 6. Integration

Consumed by Dividend, Network Engine, NFT, Governance, Valuation, AI Copilot,
Audit, and Financial Reporting (see `TREASURY_ARCHITECTURE.md` §6).
