# Investment State Machine — Marketplace Investment Engine

**Companion to:** `MARKETPLACE_INVESTMENT_ENGINE.md`, `PROPERTY_STATE_MACHINE.md`,
`EVENT_ARCHITECTURE.md`. Architecture only.

This defines the lifecycle of a single **Investment** (entity 3). It is the
operational counterpart to the property lifecycle: a property can be `Funding`
while many `Investment` records flow through these states.

---

## 1. States (canonical)

| State | Meaning | Entry trigger |
|-------|---------|---------------|
| `PENDING` | Investment created, not yet reserved. | `Investment Started` |
| `RESERVED` | Allocation held for investor (round/scarcity). | `ReservationCreated` |
| `AWAITING_PAYMENT` | Reservation confirmed; payment expected. | payment session opened |
| `PAID` | Payment settled (see `PAYMENT_SETTLEMENT_ARCHITECTURE.md`). | `SettlementCompleted` |
| `COMPLIANCE_REVIEW` | KYC/AML/SoF under review. | auto after `PAID` (or manual) |
| `APPROVED` | Compliance passed; allocation finalized. | `InvestmentAllocated` |
| `REJECTED` | Compliance failed; no allocation. | manual/auto rejection |
| `CANCELLED` | Investor or system cancelled pre-settlement. | cancel action |
| `REFUNDED` | Funds returned (post-paid reversal). | refund worker |
| `COMPLETED` | Ownership allocated, ledgers + downstream updated. | `Investment Complete` |

---

## 2. Transition diagram

```
            Investment Started
                   │
                   ▼
              [ PENDING ]
                   │  reservation required?
       ┌───────────┴───────────┐
       │ no                    │ yes
       ▼                      ▼
[AWAITING_PAYMENT]      [ RESERVED ] ──reservation confirmed──▶ [AWAITING_PAYMENT]
       │                      │
       │                      │ reservation expired / cancelled
       │                      ▼
       │                  [ CANCELLED ]
       ▼
[AWAITING_PAYMENT] ──payment settled──▶ [ PAID ]
       │  payment failed
       ▼
   [ REFUNDED ]  (or back to AWAITING_PAYMENT if retry allowed)
       ▲
       │  expired without payment
       └──[ CANCELLED ] (treated as EXPIRED; see §5)

[ PAID ] ──▶ [ COMPLIANCE_REVIEW ]
               │                │
         approved           rejected
               ▼                ▼
        [ APPROVED ]      [ REJECTED ] ──▶ [ REFUNDED ]
               │
               ▼  InvestmentAllocated
        ┌─────────────────────────────────────────────┐
        │ Ownership Allocation → Fraction Mint Ready   │
        │ → Portfolio Updated → Commission Generated    │
        │ → Treasury Settlement → Dividend/Gov Eligibility│
        └─────────────────────────────────────────────┘
               ▼
         [ COMPLETED ]
```

---

## 3. Transitions table

| From | To | Trigger | Guard | Emits |
|------|----|---------|-------|-------|
| — | PENDING | Investment Started | wallet verified (SIWE); property in `Funding`/`Approved` | `InvestmentStarted` |
| PENDING | RESERVED | allocation scarce / round requires reservation | `round.allocationStrategy` set; `available_tokens > 0` | `ReservationCreated` |
| PENDING | AWAITING_PAYMENT | open allocation | available | (internal) |
| RESERVED | AWAITING_PAYMENT | reservation confirmed | within `reservation_ttl` | `ReservationConfirmed` |
| RESERVED | CANCELLED | cancel / `ReservationExpired` | ttl passed | `ReservationExpired` |
| AWAITING_PAYMENT | PAID | `SettlementCompleted` | `tx_hash` verified; amount == `tokens*price` | `SettlementCompleted` |
| AWAITING_PAYMENT | CANCELLED | cancel / expired | ttl passed | `InvestmentCancelled` (EXPIRED) |
| AWAITING_PAYMENT | REFUNDED | payment failed + no retry | settlement failed | `PaymentFailed` |
| PAID | COMPLIANCE_REVIEW | enter review | KYC status (approved or start review) | `ComplianceReviewStarted` |
| COMPLIANCE_REVIEW | APPROVED | review passed | KYC/AML/SoF clear; risk score OK | `InvestmentAllocated` |
| COMPLIANCE_REVIEW | REJECTED | review failed | any blocker | `InvestmentRejected` |
| REJECTED | REFUNDED | auto-refund | — | `RefundInitiated` |
| APPROVED | COMPLETED | post-allocation chain done | Ownership + ledgers written | `InvestmentComplete` |
| any pre-PAID | CANCELLED | user/system cancel | not yet settled | `InvestmentCancelled` |
| PAID+ | REFUNDED | reversal | compliance reject / dispute | `RefundCompleted` |

---

## 4. State invariants

- `tokens <= property.available_tokens` at `APPROVED` (no oversell).
- `amount == tokens * fraction.price_per_token` (price fixed at reservation).
- Once `PAID`, money moves only via `REFUNDED` (offsetting `Transaction`), never
  edit.
- `APPROVED → COMPLETED` is irreversible except via `REFUNDED` with full audit.
- `REJECTED`/`CANCELLED`/`REFUNDED` are terminal; no transition out.

---

## 5. Expiry & waiting list

- `RESERVED` and `AWAITING_PAYMENT` carry a `reservation_ttl`. On timeout →
  `ReservationExpired` (or `InvestmentCancelled` with `reason=EXPIRED`), the held
  allocation returns to `available_tokens`, and the next `WaitingList` entry (if
  oversubscribed) is promoted.
- Oversubscription handling is owned by the **Round** (primary market), not the
  individual Investment: when a round hits `hard_cap`, new investments queue to
  `WaitingList`; on any `CANCELLED`/`REFUNDED`, the slot is offered to the top of
  the list per `allocationStrategy` (auto pro-rata / FIFO / manual).

---

## 6. Event linkage (to EVENT_ARCHITECTURE.md)

The investment lifecycle produces these canonical + extended events:
`InvestmentStarted`, `ReservationCreated`, `ReservationExpired`,
`SettlementCompleted`, `ComplianceReviewStarted`, `InvestmentAllocated`,
`InvestmentRejected`, `InvestmentCancelled`, `RefundInitiated`, `RefundCompleted`,
`InvestmentComplete`. On `InvestmentAllocated` the engine also emits
`OwnershipMinted` → `OwnershipUpdated` (consumed by Portfolio, Governance,
Treasury, Network Engine) per the master flow in `EVENT_ARCHITECTURE.md` Flow A.

---

## 7. Permission & audit

- Every transition is server-side authorized via `PermissionService`
  (`PERMISSION_MODEL.md`): only Investor (own), Compliance (review), Admin
  (override w/ `AuditLog`).
- Each transition appends `AuditLog`; each value move appends `Transaction`.
- `EXPIRED`/`CANCELLED`/`REFUNDED` always emit `NotificationSent` to the investor.
