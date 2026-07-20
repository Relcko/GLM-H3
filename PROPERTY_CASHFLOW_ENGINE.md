# Property Cashflow Engine — Relcko Treasury & Dividend Engine (V1.6.0)

**Companion to:** `TREASURY_ARCHITECTURE.md`, `DIVIDEND_ENGINE.md`,
`VALUATION_ENGINE.md`, `PROPERTY_STATE_MACHINE.md`, `DOMAIN_MODEL.md` (1 Property,
15 SPV). Architecture only.

Defines the **complete per-property cashflow lifecycle** from investor funds to
investor distribution. This is the operational cashflow that feeds the Dividend
Engine and the Property Ledger.

---

## 1. Cashflow lifecycle (canonical)

```
Investor Funds
   ↓
Escrow                        (capital held pending settlement)
   ↓
Property Funding             (capital → Property Treasury → SPV(15))
   ↓
Operations                   (management, maintenance, capex)
   ↓
Rental Income                (tenant rent collected)
   ↓
Expenses                     (opex, fees, debt service, tax)
   ↓
Reserve Allocation           (Property Reserve funding)
   ↓
Net Income                   (Rental − Expenses − Reserve)
   ↓
Dividend Calculation         (Net Income × distribution policy)
   ↓
Treasury Verification        (Treasury verifies funding + balances)
   ↓
Investor Distribution        (DividendDistributed → Investor Ledger)
```

Each stage is a **node** that emits ledger entries; the chain is the property's
cashflow graph.

---

## 2. Stage detail

| Stage | Action | Ledger impact |
|-------|--------|--------------|
| Investor Funds | capital in from investors | Settlement Ledger (credit Property Treasury). |
| Escrow | hold until `SettlementCompleted` | Settlement Ledger (held). |
| Property Funding | release to SPV(15) | Property Ledger (debit escrow, credit SPV). |
| Operations | management spend | Property Ledger (expense). |
| Rental Income | rent received | Property Ledger (income). |
| Expenses | opex/fees/tax | Property Ledger (expense). |
| Reserve Allocation | fund Property Reserve | Reserve Ledger (Property). |
| Net Income | computed | Property Ledger (net). |
| Dividend Calculation | `DividendCalculated` | Dividend Ledger (pending). |
| Treasury Verification | `TreasuryFunded` + reconciliation | Treasury Ledger. |
| Investor Distribution | `DividendDistributed` | Investor Ledger + Tax Ledger. |

---

## 3. Reconciliation & valuation

- **Net Income** must reconcile: Rental Income − Expenses − Reserve = Net Income
  (invariant checked at `Treasury Verification`).
- **NAV** (`VALUATION_ENGINE.md`) informs capital-gain distributions and
  performance reporting.
- Mismatch at verification → `ComplianceFlagRaised` + hold distribution until
  resolved.

---

## 4. Multi-currency & FX

- Rental income may be in local fiat; converted via FX snapshot at entry
  (`PAYMENT_SETTLEMENT_ARCHITECTURE.md`).
- Distribution currency follows investor preference where supported; FX risk
  borne per policy (reserve hedges optional).

---

## 5. Integration

| Domain | Touchpoint |
|--------|------------|
| Treasury | escrow/funding/verification settlement. |
| Dividend | Net Income → Dividend Engine. |
| Valuation | NAV basis. |
| Reserve | Property Reserve funding. |
| Network Engine | agent commission on funding (cross-ref). |
| NFT | Property/Fractional Ownership NFT reconciliation. |
| Audit | every stage mirrored to Audit Ledger. |

---

## 6. Scalability

- Per-property ledger is a partition of JournalEntry stream.
- Cashflow computed per property cycle (batch); reconciliation incremental.
- At 100K properties, per-property partitions + rollups feed aggregate Treasury
  Health and Property Performance reporting.
