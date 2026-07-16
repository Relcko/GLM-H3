# Dividend Engine — Relcko Treasury & Dividend Engine (V1.6.0)

**Companion to:** `TREASURY_ARCHITECTURE.md`, `TREASURY_LEDGER_ENGINE.md`,
`OWNERSHIP_MODEL.md`, `VALUATION_ENGINE.md`, `PROPERTY_CASHFLOW_ENGINE.md`.
Architecture only.

Defines the dividend distribution engine: income sources, the 9 dividend states,
eligibility, calculation, funding, distribution, and tax handling. Dividends are
the investor-return layer; every payout is journaled immutably.

---

## 1. Dividend income sources

| Source | Basis |
|--------|-------|
| **Rental Income** | property rent (Property Cashflow). |
| **Capital Gain** | property appreciation / sale proceeds. |
| **Property Sale Distribution** | net proceeds on disposal. |
| **Treasury Rewards** | treasury yield allocated to holders. |
| **Governance Rewards** | governance participation rewards. |
| **NFT Holder Rewards** | NFT (dividend/rental) entitlement. |
| **Agent Rewards** | network agent bonuses (separate ledger, cross-ref). |
| **Partner Rewards** | strategic-partner distributions. |
| **Campaign Rewards** | referral/campaign bonuses. |
| **Special Rewards** | ad-hoc (e.g., milestone) distributions. |

Eligibility is derived from `Ownership` (7) holdings (fractional) and NFT dividend
entitlements (`NFT_OWNERSHIP_MODEL.md`), snapshotted at `DividendScheduled`.

---

## 2. Dividend states (lifecycle)

```
PENDING → APPROVED → FUNDED → SCHEDULED → DISTRIBUTED → CLAIMED
   │         │                        │            │
   │         │                        │            └─ EXPIRED (unclaimed)
   │         │                        └─ CANCELLED
   └─ CANCELLED
        └─ RECOVERED (reclaimed after expiry/cancel)
```

| State | Meaning |
|-------|---------|
| **Pending** | calculated, awaiting approval. |
| **Approved** | governance/treasury approval (`DividendApproved`). |
| **Funded** | Dividend Treasury pre-funded (`TreasuryFunded`). |
| **Scheduled** | distribution date set (`DividendScheduled`). |
| **Distributed** | payouts sent (`DividendDistributed`). |
| **Claimed** | investor claimed (`DividendClaimed`). |
| **Expired** | claim window passed. |
| **Cancelled** | voided pre-distribution. |
| **Recovered** | unclaimed/expired funds reclaimed to Treasury. |

---

## 3. Calculation & eligibility

```
per property cycle:
  Net Income = Rental Income − Expenses − Reserve Allocation   [PROPERTY_CASHFLOW_ENGINE]
  Dividend Pool = Net Income × distribution_policy%
  per investor:
     entitlement = ownership_fraction (or NFT entitlementBps) × Dividend Pool
     (snapshotted at DividendScheduled)
  DividendCalculated → Dividend (TR-7) created in PENDING
```

- Uses `VALUATION_ENGINE.md` NAV where distribution is yield-based.
- Eligibility snapshot is immutable post-`Scheduled` (no retroactive changes).
- Minimum payout threshold; below-threshold amounts accrue or roll to next cycle.

---

## 4. Funding & distribution

```
DividendCalculated (PENDING)
   → DividendApproved (governance/treasury)
   → TreasuryFunded (Dividend Treasury pre-funded)   [FUNDED]
   → DividendScheduled (date set)                    [SCHEDULED]
   → on date: per-investor payout via Payment(18) + TreasuryMovementApproved
        → DividendDistributed                         [DISTRIBUTED]
        → Investor Ledger + Tax Ledger updated
        → TaxDocumentIssued (if taxable)
   → investor claims (auto or manual) → DividendClaimed
   → unclaimed after window → Expired → Recovered to Treasury
```

- Distribution settles per `PAYMENT_SETTLEMENT_ARCHITECTURE.md` (FX snapshot,
  multi-sig for treasury movement).
- Agent/campaign/partner rewards route to their own ledgers (cross-ref, not the
  investor dividend pool).

---

## 5. Tax handling

- Each distribution generates a `TaxRecord` (TR-13) per investor: withholding per
  jurisdiction, reported to Tax Ledger.
- `TaxDocumentIssued` (canonical) delivered to investor; mirrored to Document
  Vault.
- Recovered (expired) funds are not re-taxed on reclaim (Treasury internal).

---

## 6. Integration

| Domain | Touchpoint |
|--------|------------|
| Treasury | funding + settlement (`TreasuryMovementApproved`). |
| Property Cashflow | net income input. |
| Ownership / NFT | eligibility snapshot. |
| Valuation | NAV basis. |
| Governance | `DividendApproved` (if governance-gated). |
| Network Engine | agent/campaign reward cross-ref. |
| Document Vault | tax documents. |
| AI Copilot | dividend forecast (read-only). |

---

## 7. Scalability

- Per-cycle calculation is a batch over ownership/NFT snapshots (pre-aggregated).
- Distribution is per-investor writes into the immutable ledger; parallelizable.
- At millions of investors, cycles run per property with sharded payout workers;
  claim state tracked incrementally.
