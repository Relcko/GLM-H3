# Valuation Engine — Marketplace Investment Engine

**Companion to:** `MARKETPLACE_INVESTMENT_ENGINE.md`, `OWNERSHIP_MODEL.md`,
`EVENT_ARCHITECTURE.md`. Architecture only.

The Valuation Engine produces every number an investor sees about performance:
initial/market/independent valuation, NAV, historical series, ROI, Rental Yield,
Capital Growth, IRR, and projected cashflow. It is a **read/compute layer** over
`Property`, `Ownership` snapshots, `Transaction`, and `Rewards` — it stores
valuations as a time series and derives metrics on demand.

---

## 1. Valuation types

| Type | Source | Cadence |
|------|--------|---------|
| **Initial valuation** | at `PropertyApproved` (prospectus / appraisal). | once |
| **Market valuation** | platform model from comps + on-chain activity + demand. | continuous/periodic |
| **Independent valuation** | third-party appraiser (`Valuation Report` doc). | scheduled (e.g. quarterly) |
| **NAV** | net asset value of the whole property/SPV at a point. | per snapshot |
| **Historical valuation** | time series of any of the above. | append-only |
| **Projected valuation** | forecast model (growth + yield assumptions). | on demand |

`ValuationRecord { property_id, type, value, currency, as_of, source_ref, method }`
appended; never edited.

---

## 2. Core metrics (computed, not stored)

Derived from `Ownership` snapshots + `ValuationRecord` + `Rewards`/`Transaction`:

- **ROI** = (realized + unrealized gain + distributions) / invested capital.
  Mirrors `Property.expected_roi` (entity 1) as the *target*; actual computed
  from ledgers.
- **Rental Yield** = annual rent (from `RENTAL_ACTIVE`) / held value. Mirrors
  `Property.rental_yield`.
- **Capital Growth** = (current NAV − initial valuation) / initial valuation.
  Mirrors `Property.appreciation_rate`.
- **IRR** = internal rate of return over the investor's cashflow series
  (investments out, distributions in, sale/exit in).
- **Projected Cashflow** = model of future rent + exit, discounted.

All metrics are computed **per investor** from their `OwnershipBalance` snapshot
× property metrics (so a holder of 0.1% sees their share of every figure).

---

## 3. NAV computation

```
NAV(property, as_of) = latest ValuationRecord(property, as_of)
                        − liabilities (outstanding debt/SPV obligations)
Property NAV per fraction = NAV / total_tokens
Investor NAV = sum(ownership_fraction_i * NAV(property_i))
Portfolio NAV = sum(Investor NAV)
```

NAV is recomputed as a **read-model** on each `ValuationRecord` append and on
ownership changes (via events). Used by Portfolio and Governance (voting power
may weight by NAV).

---

## 4. Performance time series

- `ValuationRecord` stream → historical charts (value, ROI, yield over time).
- Snapshots align with `Ownership` snapshots (dividend/governance/tax) so a point
  in time is internally consistent.
- All series are immutable appends; "corrections" are new records with a later
  `as_of` + `source_ref` (auditable).

---

## 5. Valuation → other engines

| Consumer | Uses |
|----------|------|
| Portfolio | NAV, ROI, yield, IRR displays. |
| Dividend Center | distribution base (NAV or rent). |
| Governance | voting power weighting (optional NAV-weight). |
| Treasury | asset value for rebalancing. |
| Document Vault | Valuation Reports + Financial Statements. |
| AI Copilot | answers performance questions (read-only). |
| Global Property Map | region aggregate valuations. |

---

## 6. Integration & events

- New `ValuationRecord` (independent) often accompanies `PropertyOperational` /
  `DividendActivated` cadence.
- Emits `ValuationUpdated` (extension event) so Portfolio/NFT/Map projections
  refresh.
- Drives `Investment Certificate` basis in Document Vault (cost vs current NAV).

---

## 7. Scalability & integrity

- Valuations stored as append-only time series, partitioned by `property_id`.
- Metrics are pure functions over snapshots → trivially cacheable + recomputable.
- Independent valuations require `Document Verification` (compliance) before
  publication to investors.
- Discrepancy between market and independent valuation beyond a threshold →
  `ComplianceFlagRaised` (操控 alert).
- At 100K properties × daily valuations = millions of records; time-series store
  + pre-aggregated rollups.
