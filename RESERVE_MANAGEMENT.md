# Reserve Management — Relcko Treasury & Dividend Engine (V1.6.0)

**Companion to:** `TREASURY_ARCHITECTURE.md`, `TREASURY_DOMAIN_MODEL.md` (TR-6
ReserveFund), `TREASURY_LEDGER_ENGINE.md`, `TREASURY_SECURITY_MODEL.md`.
Architecture only.

Defines the reserve sub-funds, their funding, drawdown triggers, health metrics,
and the emergency/insurance flows. Reserves are the risk backstop of the platform.

---

## 1. Reserve types (7)

| Type | Purpose |
|------|---------|
| **Emergency Reserve** | incident/lockdown fund; funds `EmergencyReserveUsed`. |
| **Insurance Reserve** | covers insurance claims; triggers `InsuranceTriggered`. |
| **Liquidity Reserve** | DEX/AMM + settlement liquidity backstop. |
| **Operational Reserve** | payroll/infra continuity. |
| **Property Reserve** | per-property capex/void/AR reserve. |
| **Protocol Reserve** | protocol-level risk + upgrade fund. |
| **Risk Reserve** | generic risk coverage (tail events). |

All live under the **Reserve Treasury** domain (TR-1 #3) as `ReserveFund` (TR-6)
records. The **Treasury Reserve (root)** (TR-1 #16) is the ultimate backstop
(also Network Engine override fallback).

---

## 2. Funding (allocation)

- Each reserve has a `targetBps` of qualifying revenue (AllocationRule) → funded
  automatically on revenue (`TreasuryAllocated` → Reserve Ledger).
- `ReserveUpdated` emitted when a fund's balance/target changes.
- Funding is non-discretionary for mandated reserves (Emergency/Insurance/
  Liquidity) per policy; optional reserves (Property/Protocol/Risk) per governance.

---

## 3. Drawdown triggers

| Trigger | Event | Authority |
|---------|-------|-----------|
| Emergency incident | `EmergencyReserveUsed` | Emergency Treasury dual-control / Super Admin. |
| Insurance claim | `InsuranceTriggered` | Insurance Treasury + Compliance. |
| Liquidity stress | Liquidity drawdown | Treasury Manager + multi-sig. |
| Operational shortfall | Operational drawdown | Treasury Manager. |
| Property need | Property Reserve drawdown | Property Manager + Treasury. |

Drawdowns produce `TreasuryMovement` (debit Reserve Ledger) + JournalEntry; large
drawdowns require governance (`ProposalExecuted`).

---

## 4. Reserve health

```
Reserve Health (per fund) =
   currentBalance / targetBalance          (coverage)
   + liquidityRatio (liquid vs locked)
   + drawdownVelocity (recent usage)
Aggregate → Treasury Health (reporting)
```

- Below-threshold funds raise `AlertRaised` (canonical) → Compliance/Treasury.
- Replenishment prioritized by severity (Emergency > Insurance > Liquidity).

---

## 5. Emergency & insurance flows

```
INCIDENT
   → Emergency Treasury dual-control
   → EmergencyReserveUsed (debit Emergency Reserve)
   → funds deployed (e.g., compensation, stabilization)
   → JournalEntry + AuditLedger(19)

INSURANCE CLAIM
   → InsuranceTriggered (claim validated by Compliance)
   → Insurance Reserve pays out
   → JournalEntry + Tax Ledger (if applicable)
```

---

## 6. Integration

| Domain | Touchpoint |
|--------|------------|
| Treasury | funding + drawdown settlement. |
| Security | emergency lockdown authority. |
| Network Engine | Treasury Reserve override fallback. |
| Governance | reserve usage approvals. |
| AI Copilot | reserve forecast + risk alerts (read-only). |
| Audit | all movements mirrored. |

---

## 7. Scalability

- Reserve funds are balance read-models over Reserve Ledger entries.
- Health computed incrementally on each `ReserveUpdated`.
- At scale: per-fund partitions; alerts batched; audit proofs periodic.
