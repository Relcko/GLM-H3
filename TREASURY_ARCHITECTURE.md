# Treasury Architecture — Relcko Treasury & Dividend Engine (V1.6.0)

**Companion to:** `DOMAIN_MODEL.md` (entities 1–19), `EVENT_ARCHITECTURE.md`
(treasury events), `PAYMENT_SETTLEMENT_ARCHITECTURE.md`, `PERMISSION_MODEL.md`,
`GOVERNANCE_ARCHITECTURE.md`, `GOVERNANCE_ENGINE.md`, `TREASURY_GOVERNANCE.md`,
`NETWORK_ENGINE_ARCHITECTURE.md`, `NFT_ROYALTY_ENGINE.md`. Architecture only.

The Treasury & Dividend Engine is the **financial heart** of Relcko. Every asset
movement — commission payment, dividend distribution, treasury allocation,
buyback, burn, reserve funding, and protocol revenue — passes through it. It is
built for **institutional-grade accounting and auditability**: double-entry
immutable ledgers, multi-sig control, and full event sourcing.

---

## 1. Position in the platform

```
   Marketplace · Network Engine · NFT · Governance · Dividend · Valuation
                          │  (all money flows)
                          ▼
                 TREASURY & DIVIDEND ENGINE
       ┌──────────────────┼───────────────────────┐
    Ledgers (immutable)  Reserves  Buyback/Burn  Reporting  Security
                          │
                          ▼
                 AI Monitoring (health/forecast/risk)
```

No domain moves value except through Treasury settlement (`TreasuryMovementApproved`).

---

## 2. Treasury domains (16 sub-treasuries)

Each is a logical **sub-ledger / account group** under the Treasury root, with its
own purpose, asset mix, and governance policy.

| # | Domain | Purpose |
|---|--------|---------|
| 1 | **Platform Treasury** | central operating treasury; receives protocol revenue. |
| 2 | **Property Treasury** | per-property / SPV(15) funding + operations escrow. |
| 3 | **Reserve Treasury** | holds all reserve sub-funds (see `RESERVE_MANAGEMENT.md`). |
| 4 | **Dividend Treasury** | funds + settles dividend distributions. |
| 5 | **Commission Treasury** | settles agent commissions (Network Engine). |
| 6 | **Reward Treasury** | Network/RLKO/campaign rewards payout. |
| 7 | **Liquidity Treasury** | DEX/AMM liquidity provisioning + rebalancing. |
| 8 | **Insurance Treasury** | insurance claims + risk coverage. |
| 9 | **Emergency Treasury** | lockdown/incident fund; global pause authority. |
| 10 | **Governance Treasury** | DAO-controlled funds (grants, proposals). |
| 11 | **Developer Treasury** | builder grants, ecosystem dev. |
| 12 | **Marketing Treasury** | growth, campaigns, partnerships. |
| 13 | **Operations Treasury** | payroll, infra, protocol expenses. |
| 14 | **Partner Treasury** | strategic-partner settlements. |
| 15 | **Future Expansion Treasury** | new-product war chest. |
| 16 | **Treasury Reserve (root)** | Network Engine fallback + ultimate backstop. |

---

## 3. Treasury assets

Supported asset classes (each with its own balance sub-account):
`RLKO`, `BNB`, `USDT`, `USDC`, `Fiat`, `Property Assets`, `NFT Assets`,
`Stablecoins` (generic), `Future Tokens`, `Cash Equivalents`.
- Crypto/fiat tracked with **FX snapshot** at entry (`PAYMENT_SETTLEMENT_ARCHITECTURE.md`).
- Non-fungible (Property/NFT) tracked at cost + valuation reference.

---

## 4. Treasury operations

| Operation | Description |
|-----------|-------------|
| Deposits / Withdrawals | inbound revenue, outbound payouts (multi-sig). |
| Transfers | between sub-treasuries. |
| Internal Allocation | rule-based split of inflows to domains. |
| Reserve Allocation | funding reserves (% of revenue). |
| Revenue Allocation | marketplace/NFT/investment/fee yield → domains. |
| Property Funding | capital to Property Treasury → SPV. |
| Dividend / Commission Funding | pre-funding payout treasuries. |
| Treasury Rebalancing | asset mix toward policy weights. |
| Yield Allocation | realized yield (`TreasuryYieldRealized`) redistributed. |
| Insurance / Emergency Funding | drawdown from reserves. |
| Grant Allocation | Governance/Developer/Partner grants. |
| Protocol Expenses | operations/marketing spend. |

Every operation produces immutable journal entries (`TREASURY_LEDGER_ENGINE.md`)
and a `TreasuryMovementApproved` (multi-sig) where value leaves a domain.

---

## 5. Revenue sources (feed Platform Treasury)

Marketplace Fees · NFT Marketplace Fees · Investment Fees · Property Management
Fees · Agent Fees · Governance Fees · Subscription Fees · Premium Membership ·
Treasury Yield · Advertising · Strategic Partnerships · Future Revenue Streams.
Each maps to an `AllocationRule` (revenue→domain split).

---

## 6. Integration map

| Domain | Treasury touchpoint |
|--------|---------------------|
| Marketplace | settlement → `TreasuryMovementApproved`; fee revenue. |
| Network Engine | `CommissionPaid` (Commission Treasury); reward payouts; Treasury fallback. |
| NFT | `RoyaltiesPaid` → Treasury Reserve; NFT-holder rewards. |
| Governance | `ProposalExecuted` → Treasury movement; `TREASURY_GOVERNANCE.md`. |
| Dividend Center | `DividendDistributed` funding + settlement. |
| Valuation | NAV basis for property/dividend. |
| AI Copilot | read-only financial monitoring (scoped). |
| Audit | all entries mirrored to Audit Ledger (19). |

---

## 7. Governance integration

Treasury actions are gated by `TREASURY_GOVERNANCE.md` + `GOVERNANCE_ENGINE.md`:
Budget Approval, Treasury Spending, Reserve Usage, Buybacks, Burns, Dividend
Approval, Grant Approval, Emergency Spending. Two-stage gating applies
(`PERMISSION_MODEL.md`): Treasury Manager proposes, multi-sig (≥ m-of-n) or
Governance proposal executes (`ProposalExecuted` → `TreasuryMovementApproved`).

---

## 8. Scalability & integrity

- All movements are **event-sourced**; ledgers are append-only projections.
- Partitioned by domain + asset + time; millions of journal entries supported.
- Real-time reporting via incremental read-models; multi-region + DR via
  replicated event log.
- Every entry reconciles to `AuditLog` (19) and on-chain where applicable.

---

## 9. Document set (this milestone)

- `TREASURY_DOMAIN_MODEL.md` — treasury entities + locked linkage.
- `TREASURY_LEDGER_ENGINE.md` — immutable double-entry ledgers.
- `DIVIDEND_ENGINE.md` — dividend lifecycle + distribution.
- `BUYBACK_AND_BURN_ENGINE.md` — buyback + burn mechanics.
- `RESERVE_MANAGEMENT.md` — reserve sub-funds.
- `PROPERTY_CASHFLOW_ENGINE.md` — per-property cashflow lifecycle.
- `FINANCIAL_REPORTING_ARCHITECTURE.md` — statements + reports.
- `TREASURY_SECURITY_MODEL.md` — controls + emergency.
- `TREASURY_EVENT_EXTENSION.md` — treasury events (additive to `EVENT_ARCHITECTURE.md`).
