# Network Engine Architecture — Relcko Network Engine (RNE)

**Companion to:** `DOMAIN_MODEL.md` (entities 10 Referral, 11 Commission, 12 Agent,
16 Rewards, 19 AuditLog), `EVENT_ARCHITECTURE.md` (network + commission events),
`PERMISSION_MODEL.md` (Agent role), `MARKETPLACE_INVESTMENT_ENGINE.md`, and the
ecosystem docs. Architecture only — no UI, React, API, or migration.

The Network Engine (RNE) is one of the **core domains** of Relcko, equal in
standing to Marketplace, NFT Marketplace, Portfolio, Governance, Treasury,
Dividend Center, and AI Copilot. It is **not a referral program**; it is a
lifetime relationship engine binding investors, agents, marketplace investments,
NFT ownership, governance participation, commissions, rankings, incentives, and
treasury rewards into one unified platform.

---

## 1. Position in the platform

```
                 RELCKO PLATFORM (core domains)
   ┌──────────┬──────────┬──────────┬──────────┬──────────┐
   │Marketplace│ NFT Mkt  │Portfolio │Governance│ Treasury │
   └─────┬────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┘
         │ invest  │ own NFT │ hold    │ vote    │ settle  │
         └─────────┴─────────┴─────────┴─────────┴─────────┘
                       ▲ all feed attribution
                 ┌─────┴──────────┐
                 │ NETWORK ENGINE │  (relationship + commission + rank)
                 └─────┬──────────┘
         ┌─────────────┼───────────────────┐
   Referral Campaign │ Dividend │ AI Copilot │ Document Vault │ Global Map
```

RNE is the **attribution and reward layer**: every economic event in the platform
(investment, sale, NFT transfer, dividend, governance action, RLKO stake) can
produce network effects (commission, rank progress, leaderboard movement,
incentive credit).

---

## 2. Core principles (locked business rules)

1. **Single sponsor for life.** Every investor permanently belongs to exactly one
   sponsoring agent. Customer ownership never changes except through
   **administrator intervention**.
2. **Personal commissions always paid.** A qualifying sale always credits the
   sponsor's personal commission regardless of active/inactive status.
3. **Team override requires ACTIVE status.** Override (downline) commissions are
   paid only when the upline agent is ACTIVE.
4. **ACTIVE is earned.** ACTIVE status is earned through **qualified direct
   sales**.
5. **Rolling 30-day window.** Each qualified direct sale extends `ActiveUntil` by
   another rolling 30 days.
6. **Inactivity preserves.** When an agent goes inactive: customers remain, rank
   remains, lifetime statistics remain, personal commissions continue, team
   override stops.
7. **Dynamic compression.** While inactive, the agent's team override commission
   is **compressed upward** — traverse the sponsor hierarchy until the nearest
   ACTIVE sponsor; that sponsor receives the override. If none exists, the
   **Treasury Reserve** receives it.
8. **Recovery on new sale.** When an inactive agent makes a new qualified direct
   sale: status → ACTIVE immediately, `ActiveUntil` resets to a rolling 30 days,
   team override eligibility resumes.

These principles override any legacy referral behavior. The legacy `Agent`
(entity 12) is extended (not replaced) into a full network node.

---

## 3. Domain entity mapping

RNE builds on the locked entities and adds **network structures** (logical
models, no schema here):

| Locked entity | RNE use |
|---------------|---------|
| **Agent** (12) | extended with: `status` (ACTIVE/INACTIVE), `activeUntil`, `rankId`, `sponsorId` (upline agent), `joinedAt`. `commission_rate` remains the authoritative base personal rate. |
| **Referral** (10) | the **sponsor link**: one active Referral per Investor ⇒ that Agent is the investor's permanent sponsor. |
| **Commission** (11) | extended with `type` (personal/override/rank/campaign/leadership/nft/governance), `generationRuleId`, `compressedFromAgentId?`, `status`. |
| **Rewards** (16) | incentive/bonus payouts (monthly/quarterly/rank/leadership/NFT/governance) credited from RNE. |
| **AuditLog** (19) | every commission, compression, rank change, recovery, and override routing is audited. |

New logical structures introduced by RNE (to be formalized in later milestones):
`NetworkNode` (agent + sponsor pointer), `RankHistory`, `CompressionEvent`,
`RecoveryEvent`, `LeaderboardSnapshot`, `OverrideLedger`, `QualifiedSaleLog`.

---

## 4. Qualified sale (gate for all network credit)

A sale qualifies for **any** network credit (personal/override/rank/campaign) only
when **ALL** are true:

- Buyer passed **KYC** (entity KYC verified)
- **Payment settled** (Payment in settled state, `PAYMENT_SETTLEMENT_ARCHITECTURE.md`)
- **Property ownership allocated** (`OwnershipMinted`/`InvestmentAllocated`)
- **Cooling period completed** (configurable post-settlement window)
- **Minimum configurable value** reached (per-round/property threshold)
- **No refund** (no `RefundCompleted` for that investment)
- **No cancellation** (investment not `InvestmentCancelled`/`InvestmentRejected`)

A sale failing any condition yields **zero** network credit and is recorded in
`QualifiedSaleLog` as disqualified with reason.

---

## 5. RNE event set (extension to `EVENT_ARCHITECTURE.md`)

RNE consumes the locked network events (`ReferralCreated`, `ReferralConverted`,
`CommissionCalculated/Approved/Paid`, `AgentOnboarded`, `AgentStatusChanged`,
`CampaignRewardIssued`, `LeaderboardUpdated`) and introduces:

| Event | Producer | Purpose |
|-------|----------|---------|
| `AgentActivated` | RNE | qualified sale reset active window |
| `AgentDeactivated` | RNE | rolling window expired |
| `OverrideCompressed` | RNE | upward routing due to inactive upline |
| `OverrideRoutedToTreasury` | RNE | no active upline |
| `RankAchieved` | RNE | agent reached new rank |
| `CommissionRecovered` | RNE | inactive→active recovery re-credits override |
| `IncentiveCredited` | RNE | bonus/reward issued |

These are additive to the canonical catalog (per `EVENT_ARCHITECTURE.md` §6
evolution rules); the locked file is not modified here.

---

## 6. Integration map

| Module | RNE touchpoint |
|--------|----------------|
| Marketplace | `InvestmentAllocated`/`OwnershipMinted` → qualified-sale evaluation → commission. |
| NFT Marketplace | NFTTransferred → NFT bonus + NFT score. |
| Portfolio | investor projection shows sponsored customers (agent view). |
| Governance | VotingPowerUpdated / proposal vote → governance bonus + governance score. |
| Treasury | `CommissionPaid`, override settlement, Treasury Reserve fallback, incentive payout. |
| Dividend Center | dividend eligibility feeds retention/team volume metrics. |
| AI Copilot | read-only answers on rank/commission/team (scoped to actor). |
| Document Vault | agent KYC/agreement docs; audit trail. |
| Global Property Map | exclusive property access per rank. |
| Referral Campaign Engine / Campaign Engine | `ReferralConverted` → campaign bonus + leaderboard. |

---

## 7. Scalability & integrity

- Network tree is a pointer graph (each agent stores `sponsorId`); traversal is
  bounded by max depth (configurable, default 10).
- Compression is **computed at payout time**, not by mutating the tree — the
  sponsor link never changes (principle 1). Compression history is logged.
- Commission ledger is append-only; recovery produces offsetting entries, never
  edits.
- All RNE mutations mirror to `AuditLog` (entity 19).
- At 100K agents × 1M investors, the tree + commission ledger are partitioned by
  sponsor subtree; projections (leaderboard, dashboard) are recomputed
  incrementally.

---

## 8. Document set (this milestone)

- `NETWORK_TREE_MODEL.md` — sponsor/downline/upline, compression, routing.
- `AGENT_RANK_SYSTEM.md` — 9 ranks and qualification.
- `COMMISSION_ENGINE.md` — all commission types + compression + recovery.
- `REWARDS_AND_INCENTIVES.md` — bonuses, RLKO, NFT, travel, pools.
- `LEADERBOARD_ENGINE.md` — periods + metrics + scoring.
- `AGENT_PERFORMANCE_MODEL.md` — agent dashboard read-model.
- `ANTI_FRAUD_MODEL.md` — fraud vectors + controls.
- `COMMISSION_FLOW_DIAGRAM.md` — end-to-end flow diagrams.
