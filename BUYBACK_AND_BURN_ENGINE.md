# Buyback & Burn Engine — Relcko Treasury & Dividend Engine (V1.6.0)

**Companion to:** `TREASURY_ARCHITECTURE.md`, `TREASURY_LEDGER_ENGINE.md`,
`TREASURY_GOVERNANCE.md`, `GOVERNANCE_ENGINE.md`. Architecture only.

Defines buyback programs and burn mechanics for **RLKO** (and future tokens):
sources of funds, execution paths, supply reduction tracking, and deflation
reporting. All value movements are journaled and governance-gated.

---

## 1. Buyback types

| Type | Trigger | Funding source |
|------|---------|---------------|
| **Scheduled Buyback** | recurring program (e.g., monthly from revenue). | AllocationRule → Treasury/Revenue. |
| **Market Buyback** | opportunistic, market conditions. | Liquidity/Treasury. |
| **Governance Buyback** | DAO-approved proposal. | `ProposalExecuted` → Treasury. |
| **Emergency Buyback** | stability/incident response. | Emergency Treasury (dual-control). |
| **Revenue Buyback** | % of protocol revenue. | Revenue Allocation rule. |

All buybacks require approval: multi-sig (Treasury Manager + approvers) or
Governance proposal (`ProposalExecuted` → `TreasuryMovementApproved`).

---

## 2. Buyback execution

```
BuybackProgram approved (governance/multi-sig)
   → fund from source domain → TreasuryMovementApproved
   → execute acquisition (market/OTC) of RLKO/Future Token
   → acquired tokens moved to Buyback/Burn custody
   → TreasuryBalanced (rebalance if needed)
   → BuybackExecuted event + JournalEntry (debit Treasury, credit acquired-asset)
```

- Execution may be market (DEX/AMM via Liquidity Treasury) or OTC.
- FX snapshot at acquisition; recorded in JournalEntry.

---

## 3. Burn types

| Type | Trigger | Authority |
|------|---------|-----------|
| **Scheduled Burn** | recurring (e.g., post-buyback burn). | Treasury policy. |
| **Governance Burn** | DAO proposal. | `ProposalExecuted`. |
| **Emergency Burn** | incident/rollback (rare). | Emergency Treasury dual-control. |

Burn **permanently removes** tokens from supply (sent to burn address / destroyed
mechanism). Each burn is final and auditable.

---

## 4. Supply reduction & deflation tracking

- **Supply Reduction** = cumulative burned − minted (net). Tracked in a
  `TokenSupply` read-model.
- **Deflation Tracking:** periodic `SupplyReduction` metric = total burned / total
  ever minted; reported in Treasury Health + financial reports.
- **Historical Burn Reports:** append-only burn ledger (Burn TR-9) with reason,
  amount, authority, txRef.

---

## 5. Treasury rebalancing

- After buyback/burn, `TreasuryBalanced` re-aligns domain asset weights toward
  policy (Liquidity/Treasury rebalance). Uses `TreasuryRebalanced` (canonical)
  where applicable.
- Rebalancing never affects locked reserves without governance.

---

## 6. Integration

| Domain | Touchpoint |
|--------|------------|
| Treasury | funding + `TreasuryMovementApproved`. |
| Governance | `ProposalExecuted` for governance buyback/burn. |
| Liquidity Treasury | market execution. |
| Ledger | immutable JournalEntry + Burn/Supply records. |
| AI Copilot | deflation/supply forecast (read-only). |

---

## 7. Scalability & integrity

- Buyback/burn programs are low-frequency, batched; journaling is per-execution.
- Supply metrics are incremental counters (cheap updates).
- At scale: burn ledger partitioned by program + time; supply snapshots periodic
  for audit proofs.
