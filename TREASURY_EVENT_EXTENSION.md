# Treasury Event Extension — Relcko Treasury & Dividend Engine (V1.6.0)

**Companion to:** `TREASURY_ARCHITECTURE.md`, `EVENT_ARCHITECTURE.md` (canonical
catalog), `MARKETPLACE_EVENT_EXTENSION.md`, `NFT_EVENT_EXTENSION.md`,
`COMMISSION_FLOW_DIAGRAM.md`. Architecture only.

This document **extends** the canonical `EVENT_ARCHITECTURE.md` with treasury &
dividend events only. It does not replace the locked catalog; the rules there
(transport, idempotency, ordering, audit mirroring) all apply. The locked file
already declares `TreasuryDeposit`, `TreasuryWithdrawal`, `TreasuryRebalanced`,
`TreasuryYieldRealized`, `TreasuryMovementApproved`, `DividendScheduled`,
`DividendDistributed`, `DividendClaimed`, `TaxDocumentIssued`, `CommissionPaid`,
`ProposalExecuted` — these are reaffirmed here and expanded with producer/
consumer mapping, plus the additional treasury events requested for this milestone.

---

## 1. Reaffirmed locked treasury events

| Event | Producer | Consumers |
|-------|----------|-----------|
| `TreasuryDeposit` / `TreasuryWithdrawal` | Treasury | Ledger, Audit |
| `TreasuryRebalanced` | Treasury | Ledger, AI (health) |
| `TreasuryYieldRealized` | Treasury | Ledger, Allocation |
| `TreasuryMovementApproved` | Treasury (multi-sig/Governance) | All value movers, Ledger, Audit |
| `DividendScheduled` / `DividendDistributed` / `DividendClaimed` | Dividend | Investor, Ledger, Tax, Portfolio |
| `TaxDocumentIssued` | Tax | Investor, Document Vault |
| `CommissionPaid` | Treasury | Agent Ledger, Network Engine, Audit |
| `ProposalExecuted` | Governance | Treasury (if financial), Ledger |

---

## 2. New treasury events (this milestone)

Each lists `producer`, `consumers`, core `payload`.

### TreasuryFunded
- **Producer:** Treasury (revenue/allocation). **Consumers:** Dividend/Commission/
  Reserve domains, Ledger. **Payload:** `domainId, asset, amount, sourceRef`.

### TreasuryAllocated
- **Producer:** Treasury (AllocationRule). **Consumers:** target domains, Ledger,
  AI. **Payload:** `ruleId, splits[], totalAmount`.

### ReserveUpdated
- **Producer:** Reserve Management. **Consumers:** Ledger, AI (reserve health),
  Alert. **Payload:** `reserveId, type, balance, targetBps, delta`.

### DividendCalculated
- **Producer:** Dividend Engine. **Consumers:** Dividend (PENDING), Ledger,
  Governance (approve). **Payload:** `dividendId, propertyId, cycle, poolAmount,
  eligibleCount`.

### DividendApproved
- **Producer:** Treasury/Governance. **Consumers:** Dividend (APPROVED), Funding.
  **Payload:** `dividendId, approvedBy, policyRef`.

### CommissionSettled
- **Producer:** Treasury (on `CommissionPaid`). **Consumers:** Agent Ledger,
  Network Engine, Ledger. **Payload:** `commissionId, agentId, amount, status`.

### BuybackExecuted
- **Producer:** Buyback/Burn Engine. **Consumers:** Ledger, Supply model, AI.
  **Payload:** `buybackId, asset, amount, sourceFunding, txRef`.

### BurnExecuted
- **Producer:** Buyback/Burn Engine. **Consumers:** Ledger, Supply/Deflation
  model, AI. **Payload:** `burnId, asset, amount, authority, txRef`.

### TreasuryBalanced
- **Producer:** Treasury (post rebalance/buyback). **Consumers:** Ledger, AI
  (health). **Payload:** `domainId, beforeWeights, afterWeights`.

### EmergencyReserveUsed
- **Producer:** Reserve/Emergency. **Consumers:** Ledger, Audit, Alert, AI.
  **Payload:** `reserveId, amount, reason, authority`.

### InsuranceTriggered
- **Producer:** Reserve (claim validated). **Consumers:** Ledger, Audit, Tax.
  **Payload:** `claimId, reserveId, payout, beneficiary`.

### FinancialAuditCompleted
- **Producer:** Audit/Reporting. **Consumers:** Audit Ledger, Compliance, AI,
  Reporting. **Payload:** `auditId, period, invariantsPassed, signatureRef`.

---

## 3. Cross-module routing (treasury events)

| Module | Treasury events consumed |
|--------|--------------------------|
| Ledger Engine | ALL (JournalEntry source). |
| Dividend Center | DividendCalculated/Approved/Distributed, TreasuryFunded. |
| Network Engine | CommissionSettled, CommissionPaid, TreasuryFunded (rewards). |
| NFT | RoyaltiesPaid → TreasuryAllocated; NFT holder rewards. |
| Governance | ProposalExecuted, TreasuryMovementApproved, DividendApproved. |
| Reserve | ReserveUpdated, EmergencyReserveUsed, InsuranceTriggered. |
| Buyback/Burn | BuybackExecuted, BurnExecuted, TreasuryBalanced. |
| AI Copilot | TreasuryAllocated, ReserveUpdated, TreasuryBalanced, FinancialAuditCompleted (read-only). |
| Audit | ALL (mirror to AuditLedger 19). |
| Admin Portal | ALL (observability). |

---

## 4. Event-flow integration

Revenue → allocation:
```
Revenue received → TreasuryDeposit → TreasuryAllocated (AllocationRule splits)
   → ReserveUpdated (reserve funding) / TreasuryFunded (dividend/commission)
```

Dividend:
```
DividendCalculated → DividendApproved → TreasuryFunded
   → DividendScheduled → DividendDistributed → TreasuryMovementApproved
   → Investor Ledger + TaxDocumentIssued → DividendClaimed
```

Buyback/burn:
```
BuybackExecuted → TreasuryMovementApproved → TreasuryBalanced
   → BurnExecuted → Supply/Deflation updated
```

Emergency:
```
Incident → EmergencyReserveUsed → Ledger + Alert
Insurance claim → InsuranceTriggered → Ledger + Tax
```

---

## 5. Consistency & governance

- All treasury events are **additive** to the canonical catalog; consumers ignore
  unknown payload fields (evolution-safe).
- Every event mirrors to `AuditLog` (19).
- Idempotency key = `eventId` (+ `dividendId`/`buybackId`/`burnId` for downstream
  projections).
- New treasury events require a registry entry (interface seam) but no code in
  this milestone.
- Versioning: `version` field; breaking changes → new `type`, old retired after a
  dual-write window (per `EVENT_ARCHITECTURE.md` §6 evolution rules).
