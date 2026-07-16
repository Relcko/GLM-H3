# Property State Machine — Marketplace Investment Engine

**Companion to:** `MARKETPLACE_INVESTMENT_ENGINE.md`, `INVESTMENT_STATE_MACHINE.md`,
`EVENT_ARCHITECTURE.md`. Architecture only.

Defines the lifecycle of a **Property** (entity 1) as the production lifecycle.
This supersedes the simpler legacy `status` enum (`draft/upcoming/active/
sold_out/closed` in `DOMAIN_MODEL.md`) for the investment engine; the legacy enum
remains valid as a *public browse summary* mapped from these states (see §6).

---

## 1. States (canonical)

| State | Meaning |
|-------|---------|
| `DRAFT` | Property created, internal only. |
| `REVIEW` | Submitted for internal + compliance + valuation review. |
| `APPROVED` | Cleared to raise; rounds can be configured. |
| `FUNDING` | One or more rounds open; investments flowing. |
| `FUNDED` | `sold_tokens == total_tokens` (or hard cap met); raise closed. |
| `OPERATIONAL` | Asset operating; rental/dividend sub-states active. |
| `RENTAL_ACTIVE` | Rent collected (sub-state of OPERATIONAL). |
| `DIVIDEND_ACTIVE` | Distributions scheduled (sub-state of OPERATIONAL). |
| `MAINTENANCE` | Temporary operating pause (sub-state). |
| `PAUSED` | Raising/investing frozen (compliance/ops). |
| `DELISTED` | Removed from marketplace; existing owners retained. |
| `ARCHIVED` | Closed/out of life; read-only historical record. |

`RENTAL_ACTIVE`, `DIVIDEND_ACTIVE`, `MAINTENANCE` are **sub-states** of
`OPERATIONAL` (a property can be Operational + Rental Active, etc.).

---

## 2. Transition diagram

```
[DRAFT] ──submit──▶ [REVIEW] ──approve──▶ [APPROVED]
                                      │
                                      ▼ open round
                                   [FUNDING] ◀──reopen (if not FUNDED)──┐
                                      │                                  │
                                      │ funded                          │
                                      ▼                                  │
                                   [FUNDED] ──activate asset──▶ [OPERATIONAL]
                                                              ├─▶ [RENTAL_ACTIVE]
                                                              ├─▶ [DIVIDEND_ACTIVE]
                                                              └─▶ [MAINTENANCE]
                                      │                │
                            pause ◀──────────────────┘ └────────▶ resume
                                      ▼
                                   [PAUSED] ──resume──▶ (prior state)
                                      │
                                      ▼
                                 [DELISTED] ──archive──▶ [ARCHIVED]
```

---

## 3. Transitions table

| From | To | Trigger | Guard | Emits |
|------|----|---------|-------|-------|
| DRAFT | REVIEW | submit | documents attached | `PropertySubmitted` |
| REVIEW | APPROVED | compliance + valuation pass | KYC/legal/val clear | `PropertyApproved` |
| REVIEW | DRAFT | reject | — | `PropertyRejected` |
| APPROVED | FUNDING | round opens | `total_tokens>0`, caps set | `PropertyFundingStarted` |
| FUNDING | FUNDED | sold == total (hard cap) | supply invariant | `PropertyFunded` |
| FUNDING | PAUSED | freeze | compliance/ops | `PropertyPaused` |
| PAUSED | FUNDING | resume | — | `PropertyResumed` |
| FUNDED | OPERATIONAL | asset activated | SPV + docs + first rent | `PropertyOperational` |
| OPERATIONAL | RENTAL_ACTIVE | rent begins | lease active | `RentalActivated` |
| OPERATIONAL | DIVIDEND_ACTIVE | schedule set | `DividendActivated` | `DividendActivated` |
| OPERATIONAL | MAINTENANCE | maint window | — | `MaintenanceStarted` |
| MAINTENANCE | OPERATIONAL | maint done | — | `MaintenanceEnded` |
| OPERATIONAL | PAUSED | freeze | — | `PropertyPaused` |
| PAUSED | OPERATIONAL | resume | — | `PropertyResumed` |
| any (post-APPROVED) | DELISTED | delist | retained ownership | `PropertyDelisted` |
| DELISTED | ARCHIVED | archive | no active rounds | `PropertyArchived` |
| ARCHIVED | (terminal) | — | read-only | — |

---

## 4. State invariants

- Investments (`INVESTMENT_STATE_MACHINE.md`) only start when property ∈
  {`APPROVED`, `FUNDING`}.
- `available_tokens` may only decrease while `FUNDING`; frozen in `FUNDED`+.
- `PropertyFunded` requires `sold_tokens == total_tokens` (supply invariant).
- `DELISTED`/`ARCHIVED` must not break existing `Ownership` (owners keep claims;
  secondary trading may be restricted per policy).
- Every transition appends `AuditLog`; `PropertyFunded`/`PropertyOperational`/
  `DividendActivated`/`PropertyArchived` emit canonical/extended events consumed
  downstream.

---

## 5. Rounds & funding mechanics (tie to primary market)

A `Round` belongs to a property in `APPROVED`/`FUNDING`:
`{ type: private|whitelist|public, order, soft_cap, hard_cap, min_per_investor,
max_per_investor, starts_at, ends_at, allocationStrategy }`.
- Multiple rounds can be sequenced; later rounds may reprice (new
  `price_per_token` snapshot) — tracked as `PropertyFraction` revisions.
- Oversubscription → `WaitingList` + allocation strategy (auto pro-rata / FIFO /
  manual) as specified in `MARKETPLACE_INVESTMENT_ENGINE.md` §5.

---

## 6. Legacy status mapping (browse summary)

| Engine state(s) | Legacy `status` (DOMAIN_MODEL entity 1) |
|-----------------|------------------------------------------|
| DRAFT / REVIEW | `draft` |
| APPROVED (no open round) | `upcoming` |
| FUNDING | `active` |
| FUNDED (+ OPERATIONAL) | `active` / `sold_out` when no available |
| DELISTED / ARCHIVED | `closed` |

The browse `PropertyCard` (V1.2.0) continues to display the legacy summary; the
engine state is the authoritative internal lifecycle.

---

## 7. Permission & audit

- Transitions owned by **Property Manager** (publish/delist) and **Compliance**
  (approve/freeze), with **Admin** override (audit-logged) per
  `PERMISSION_MODEL.md`.
- `PropertyFunded`, `PropertyOperational`, `DividendActivated`, `PropertyArchived`
  are marketplace extension events (see `MARKETPLACE_EVENT_EXTENSION.md`) that
  drive Global Map layers, Dividend Center, and Portfolio projections.
