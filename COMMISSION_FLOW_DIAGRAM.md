# Commission Flow Diagram — Relcko Network Engine (RNE)

**Companion to:** `NETWORK_ENGINE_ARCHITECTURE.md`, `NETWORK_TREE_MODEL.md`,
`COMMISSION_ENGINE.md`, `AGENT_RANK_SYSTEM.md`. Architecture only.

End-to-end **ASCII flow diagrams** for the core commission/override/recovery
flows. Arrows show event/data flow across modules. All events reference the
locked `EVENT_ARCHITECTURE.md` set plus the RNE extension events.

---

## A. Qualified sale → Personal + Override commission

```
Marketplace: InvestmentAllocated
            → OwnershipMinted (ownership allocated)
Payment:    SettlementCompleted (payment settled)
KYC:        passed (verified)
                              │
                              ▼
RNE:  evaluate QualifiedSaleGate
      (KYC ✓ ∧ settled ✓ ∧ allocated ✓ ∧ cooling ✓ ∧ min ✓ ∧ no refund ✓ ∧ no cancel ✓)
                              │
              ┌───────────────┴───────────────┐
              │ TRUE                          │ FALSE
              ▼                               ▼
   QualifiedSaleLog ← SALE          QualifiedSaleLog ← DISQUALIFIED (reason)
              │                               │
              ▼                               ▼
   ReferralConverted (buyer's sponsor)   (no commission; zero credit)
              │
              ▼
   CommissionCalculated (PERSONAL → buyer's sponsor, always paid)
              │
              ▼  for each override level L:
   routeOverride(sourceAgent, L)            [NETWORK_TREE_MODEL §5]
        ├─ ACTIVE upline  → CommissionCalculated (OVERRIDE → that agent)
        └─ INACTIVE upline → skip (compress upward)
              │
              └─ no ACTIVE upline → OverrideRoutedToTreasury (Treasury Reserve)
              │
              ▼
   CompressionEvent logged (from / receivedBy / level / amount)
              │
              ▼
   CommissionApproved → CommissionPaid (Treasury settlement)
```

---

## B. Override compression (inactive upline)

```
Downline qualifying sale at agent C (C is INACTIVE)
   L1 override normally → C
        C INACTIVE ⇒ compress upward
        routeOverride(C, L1):
           node = C.sponsor = B
           B INACTIVE? ⇒ skip
           node = B.sponsor = A
           A ACTIVE? ⇒ YES ⇒ OVERRIDE → A
   L2 override normally → B
        B INACTIVE ⇒ compress
        routeOverride(B, L2):
           node = B.sponsor = A
           A ACTIVE ⇒ OVERRIDE → A
   If A also INACTIVE ⇒ OverrideRoutedToTreasury

   CompressionEvent{ from=C, receivedBy=A, level=L1 }
   CompressionEvent{ from=B, receivedBy=A, level=L2 }
   (C reports Lost Override; A reports gained override)
```

Tree edges **unchanged** — compression is payout-time routing only.

---

## C. Recovery (inactive → active)

```
Agent X INACTIVE (override compressed to upline Y)
   │
   ▼  X makes a NEW qualifying direct sale
ReferralConverted (X is sponsor of buyer)
   │
   ▼
RNE: AgentActivated
   status      = ACTIVE
   activeUntil = now + 30d
   RecoveryEvent{ agentId=X, triggeredBySaleId, recoveredAt }
   │
   ▼  future downline overrides now route to X again
   (historical compressed override NOT re-credited — forward-only)
   Agent dashboard: Recovered Override = forward volume now attributable to X
```

---

## D. Rank achievement → privileges

```
QualifiedSaleLog / monthly volume snapshot
   │
   ▼  evaluate AGENT_RANK_SYSTEM thresholds (monotonic up)
RankAchieved (new rank)
   │
   ├─ NFT badge mint request → NFT Marketplace (NFT score ↑)
   ├─ governance multiplier active (if ACTIVE) → Governance
   ├─ fee discount active (if ACTIVE) → Marketplace
   ├─ exclusive access active (if ACTIVE) → Global Property Map
   ├─ treasury incentive eligibility (if ACTIVE) → Treasury
   └─ RankHistory append (immutable)
```

---

## E. Campaign bonus flow

```
ReferralCreated (signup with agent code)
   │
   ▼  first InvestmentConfirmed
ReferralConverted
   │
   ├─ CommissionCalculated (personal)         → Commission Engine
   └─ CampaignRewardIssued (if in active campaign)
          │
          ▼
       Rewards Engine → IncentiveCredited → Rewards (16) / LeaderboardUpdated
```

---

## F. Full cross-module chain (investment → network)

```
Marketplace  InvestmentAllocated ─┐
Payment      SettlementCompleted  ├─► RNE QualifiedSaleGate ─► ReferralConverted
KYC          passed              ─┘            │
                                             ├─► CommissionCalculated (personal)
                                             ├─► routeOverride → override(s) / Treasury
                                             ├─► RankAchieved? (thresholds)
                                             ├─► LeaderboardUpdated (metrics)
                                             ├─► IncentiveCredited? (campaign/rewards)
                                             └─► AuditLog (all)
                                             │
Treasury     CommissionApproved → CommissionPaid (multi-sig + FX snapshot)
NFT Mkt      NFT badge on RankAchieved
Governance   governance bonus on participation
Global Map   exclusive allocation by rank
AI Copilot   read-only explainability (scoped)
```

---

## G. State summary

| State change | Trigger | Effect on commissions |
|--------------|---------|-----------------------|
| ACTIVE → INACTIVE | activeUntil expires | personal continues; override compressed up; Treasury fallback if none. |
| INACTIVE → ACTIVE | new qualifying sale | override resumes; recovery forward-only. |
| Sale disqualified | any gate fails | zero credit; prior paid → clawback (offset entry). |
| Rank up | thresholds met | multipliers/privileges apply (if ACTIVE). |
