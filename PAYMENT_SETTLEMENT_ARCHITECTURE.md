# Payment & Settlement Architecture — Marketplace Investment Engine

**Companion to:** `MARKETPLACE_INVESTMENT_ENGINE.md`, `INVESTMENT_STATE_MACHINE.md`,
`OWNERSHIP_MODEL.md`, `EVENT_ARCHITECTURE.md`. Architecture only.

Covers the `Payment` entity (entity 18) extended for multi-method, multi-currency
investing, plus the settlement lifecycle that bridges a paid investment to
confirmed ownership.

---

## 1. Payment methods

| Method | Settlement asset | Notes |
|--------|-----------------|-------|
| **BNB** | native (chain gas token) | on-chain; tx_hash verified. |
| **USDT** | stablecoin (6 decimals in target chain) | primary stable; ERC20/`safeTransfer`. |
| **USDC** | stablecoin | alternate stable. |
| **RLKO** | Relcko token | possible discount / utility; on-chain. |
| **Bank transfer** | fiat (off-ledger) | via PSP/webhook; reconciled to `Payment`. |
| **Future stablecoins** | pluggable | new method = new adapter, no schema break. |

Design rule: methods are **adapters** behind a `PaymentAdapter` interface; adding
one never touches the investment state machine.

---

## 2. Multi-currency pricing & FX

- **Display currency:** investor's locale currency (USD/EUR/GBP/…) for UI only.
- **Settlement currency:** the method's asset (USDT/USDC/BNB/RLKO/fiat).
- **Price per fraction** is quoted in the property's base currency (usually USD);
  the amount owed in settlement asset is computed at a **frozen exchange-rate
  snapshot** taken at `ReservationConfirmed`.
- `ExchangeRateSnapshot { from, to, rate, source, timestamp }` stored on the
  `Payment` so the conversion is auditable and reproducible (no post-hoc drift).
- Amount invariant (from `INVESTMENT_STATE_MACHINE.md` §4): `settled_amount ==
  tokens * price_per_token` converted via the snapshot rate.

---

## 3. Settlement states

| State | Meaning |
|-------|---------|
| `INITIATED` | payment session created. |
| `PENDING` | awaiting on-chain confirmation / PSP webhook. |
| `SETTLING` | confirmed, moving through escrow → ledger. |
| `SETTLED` | value received; `SettlementCompleted` emitted. |
| `FAILED` | on-chain revert / PSP decline. |
| `REFUNDED` | reversed post-settlement (offsetting `Transaction`). |
| `EXPIRED` | not completed within `payment_ttl`. |

---

## 4. Settlement flow (primary)

```
ReservationConfirmed
   └─▶ Payment INITIATED (FX snapshot taken)
         └─▶ Investor pays (BNB/USDT/USDC/RLKO/bank)
               └─▶ PENDING (on-chain verify OR PSP webhook)
                     └─▶ SETTLING → escrow hold → capital ledger
                           └─▶ SETTLED → emits SettlementCompleted
                                 └─▶ Investment PAID → Compliance Review
```

- **On-chain methods:** `tx_hash` is **verified on-chain** (legacy trusted it
  blindly — fixed per `MIGRATION_STRATEGY.md` Phase A).
- **Bank transfer:** PSP webhook settles fiat into the treasury account, then a
  `Payment` is marked `SETTLED` (mirrors the on-chain path; no special-case in
  the state machine).
- Settlement is **idempotent** keyed by `Payment.id` + `tx_hash`.

---

## 5. Escrow & ledgers

- During `SETTLING`, funds sit in the **Escrow Ledger** (category `escrow`) until
  `OwnershipMinted` confirms the allocation; then released to the **Capital
  Ledger** (category `capital`) / **Treasury Ledger**.
- Secondary sales: buyer funds → escrow → on `OwnershipTransferred` released to
  seller minus **Commission** (category `commission`).
- Every state change appends `Transaction` (immutable) + `AuditLog`.

---

## 6. Failed settlements & refunds

- **FAILED before SETTLED:** no ownership; investor notified; `Investment`
  returns to `AWAITING_PAYMENT` (retry) or `REFUNDED`/`CANCELLED`.
- **REFUNDED after SETTLED:** offsetting `Transaction` (never delete); releases
  escrow/capital; `Ownership` reclaimed if already allocated; emits
  `RefundCompleted` + `NotificationSent`.
- Refund routing returns to **original method** where possible (on-chain →
  on-chain; bank → bank).

---

## 7. Integration

- **Treasury:** `SettlementCompleted` → `TreasurySettlementRequested` →
  `TreasuryMovementApproved` (multi-sig per `PERMISSION_MODEL.md`).
- **Commission:** settlement of an investment/sale triggers `CommissionCalculated`
  → Network Engine attribution.
- **Ownership:** `SETTLED` is the gate to `OwnershipMinted`.
- **Tax Ledger:** settled fiat/stable recorded for withholding + `TaxDocument`.
- **Document Vault:** payment proof linked to Investment Certificate.

---

## 8. Scalability & safety

- Payment adapters are stateless + horizontally scaled.
- Settlement workers are async, idempotent, partitioned by `Payment.id`.
- FX snapshots cached + versioned; rate source redundancy.
- Reconciliation: `Escrow + Capital + Commission + Refunds == Investment Ledger`
  (continuous; alerts on divergence).
- PSP/webhook endpoints are authorized + replay-protected.
