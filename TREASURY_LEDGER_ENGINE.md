# Treasury Ledger Engine — Relcko Treasury & Dividend Engine (V1.6.0)

**Companion to:** `TREASURY_ARCHITECTURE.md`, `TREASURY_DOMAIN_MODEL.md`,
`DOMAIN_MODEL.md` (9 Transaction, 19 AuditLog), `EVENT_ARCHITECTURE.md`.
Architecture only.

Defines the **immutable financial ledgers** and the double-entry journaling rule
that makes every asset movement auditable. This is the accounting backbone.

---

## 1. Ledger inventory (immutable)

| Ledger | Scope |
|--------|-------|
| **General Ledger** | all domain movements, consolidated. |
| **Treasury Ledger** | TreasuryDomain accounts + balances. |
| **Commission Ledger** | agent commissions (Network Engine, entity 11). |
| **Dividend Ledger** | dividend cycles + payouts (entity 16 Rewards). |
| **Property Ledger** | per-property cashflow (entity 1 Property). |
| **Investor Ledger** | per-investor dividends/returns/taxes. |
| **Agent Ledger** | per-agent commissions/overrides/recoveries. |
| **NFT Ledger** | NFT mint/royalty/fee flows. |
| **Governance Ledger** | DAO spends/grants (`ProposalExecuted`). |
| **Audit Ledger** | tamper-evident mirror of all entries (entity 19). |
| **Tax Ledger** | tax obligations/withholdings per entity. |
| **Settlement Ledger** | payment settlements (entity 18 Payment). |
| **Reserve Ledger** | reserve fund movements. |
| **Insurance Ledger** | insurance premiums/claims. |

Each ledger is a **partition** of the same immutable `JournalEntry` stream, tagged
by `ledgerId`.

---

## 2. Journal entry (double-entry)

```
JournalEntry {
  entryId, ledgerId, accountId,
  direction: DEBIT | CREDIT,
  asset, amount, fxSnapshotRef,
  refEvent (source event id),
  counterEntryId (the balancing line),
  timestamp, actorId
}
```

**Invariant (double-entry):** for every movement, total debits = total credits
across the affected ledgers. An unbalanced batch is rejected at write time.

---

## 3. Writing a movement

```
TreasuryMovement requested
   → validate via TREASURY_SECURITY_MODEL (limits, multi-sig)
   → produce N JournalEntry lines (≥2, balanced)
   → append to immutable stream
   → update derived balances (TreasuryBalance) incrementally
   → mirror to Audit Ledger (19)
   → emit TreasuryMovementApproved (if outbound/value-moving)
```

- Append-only: entries are never edited or deleted. Corrections create
  **offsetting** entries (e.g., reversal + reissue). This is the institutional
  audit guarantee.
- Idempotency key = source `eventId` + `refEvent` to prevent double-posting.

---

## 4. Ledger reconciliation

- **Intra-ledger:** debits = credits per batch.
- **Cross-ledger:** Treasury Ledger total = sum of domain ledgers.
- **On-chain:** crypto movements reconcile to chain state (fixes legacy DB↔chain
  divergence; mirrors `MarketplaceSale` settle-on-chain rule).
- **FX:** each entry carries its `fxSnapshotRef`; reporting converts at entry-time
  rate, not live rate, for audit stability.
- Periodic `FinancialAuditCompleted` validates balances.

---

## 5. Specialized ledgers

- **Commission Ledger:** tagged to Agent (12) + Referral (10); credits on
  `CommissionPaid`, reversals on clawback.
- **Dividend Ledger:** credits on `DividendDistributed`; per-cycle totals.
- **Investor Ledger:** aggregates an investor's inflows (dividends, royalties,
  referral rewards) + tax withholdings → Investor Statements.
- **Tax Ledger:** per `TaxRecord` (TR-13); drives `TaxDocumentIssued`.
- **Reserve/Insurance Ledgers:** funding (allocation) + drawdown (emergency/
  insurance trigger).

---

## 6. Privacy & access

- Read access by role (`PERMISSION_MODEL.md`): Investor sees own Investor Ledger;
  Agent sees own Agent Ledger; Compliance/Auditor/Super Admin see all; AI Copilot
  scoped to read-only aggregates.
- PII-minimized in shared ledgers (handle/entity ref, not raw KYC).

---

## 7. Scalability

- Single append-only `JournalEntry` store partitioned by ledger + time.
- Derived balances are incremental projections (cheap per-movement update).
- At millions of investors × millions of entries: partitioning + rollups; audit
  proofs via Merkle-style periodic snapshots.
- Disaster recovery: replicated event log enables full rebuild of any ledger from
  the immutable stream.
