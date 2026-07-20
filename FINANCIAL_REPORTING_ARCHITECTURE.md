# Financial Reporting Architecture — Relcko Treasury & Dividend Engine (V1.6.0)

**Companion to:** `TREASURY_ARCHITECTURE.md`, `TREASURY_LEDGER_ENGINE.md`,
`DIVIDEND_ENGINE.md`, `RESERVE_MANAGEMENT.md`. Architecture only.

Defines the **reporting layer**: institutional-grade statements and reports,
generated as read-models over the immutable ledgers. Reports are point-in-time
projections; the ledgers remain the source of truth.

---

## 1. Report catalog

| Report | Basis |
|--------|-------|
| **Income Statement** | revenue − expenses across domains (period). |
| **Balance Sheet** | assets (TR-2 balances) − liabilities − equity. |
| **Cash Flow** | inflows/outflows by operation (period). |
| **Treasury Health** | domain balances, reserve coverage, liquidity, exposure. |
| **Reserve Health** | per-fund coverage + drawdown velocity. |
| **Property Performance** | per-property income/expense/Net Income/ROI. |
| **Agent Commission Report** | per-agent commissions/overrides/recoveries. |
| **Dividend Report** | per-cycle pool, payouts, claimed/expired/recovered. |
| **Governance Spending** | DAO spends/grants (`ProposalExecuted`). |
| **Audit Reports** | ledger integrity + reconciliation proofs. |
| **Investor Statements** | per-investor dividends/returns/taxes. |
| **Tax Reports** | per-entity `TaxRecord` (TR-13) aggregation. |

---

## 2. Generation model

```
Report request (role-scoped)
   → read from immutable JournalEntry stream (filtered by ledger/entity/period)
   → apply FX snapshot conversion (entry-time rate)
   → aggregate into statement structure
   → sign/version the report (append-only FinancialReport TR-11)
   → deliver (investor statement → Document Vault; audit → Auditor)
```

- Reports are **derived**, never mutate ledgers.
- Real-time reports read latest incremental projections; periodic (monthly/
  quarterly/yearly) reports are frozen snapshots for audit.

---

## 3. Institutional auditing

- Every report cites the `JournalEntry` ids it aggregates (traceability).
- `FinancialAuditCompleted` validates ledger invariants (debits=credits,
  reserve coverage, reconciliation) and signs the audit report.
- Audit Ledger (entity 19) provides tamper-evident history; periodic Merkle
  snapshots enable third-party verification.

---

## 4. Investor & tax statements

- **Investor Statements:** per-investor dividends, capital returns, NFT/agent
  rewards, tax withholdings. Delivered via Document Vault + `TaxDocumentIssued`.
- **Tax Reports:** jurisdiction-aware aggregation from Tax Ledger; supports
  withholding proof and year-end summaries.

---

## 5. Privacy & access

| Report | Visibility |
|--------|-----------|
| Investor Statement | investor (own only). |
| Agent Commission Report | agent (own) / Compliance (all). |
| Treasury/Reserve Health | Treasury/Governance/Super Admin. |
| Audit Reports | Auditor / Compliance / Super Admin. |
| Property Performance | Property Manager / Treasury / Investor (own property). |

AI Copilot answers are scoped to the requesting actor's visibility.

---

## 6. Scalability

- Reports are computed over indexed ledger partitions (by ledger + period).
- Incremental projections keep real-time dashboards cheap; heavy periodic reports
  run in batch.
- At millions of investors, per-investor statements are sharded by entity; audit
  proofs use periodic snapshots, not full scans.
- Multi-region: replicated ledger enables local report generation with DR.
