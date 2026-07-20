# Leaderboard Engine — Relcko Network Engine (RNE)

**Companion to:** `NETWORK_ENGINE_ARCHITECTURE.md`, `AGENT_RANK_SYSTEM.md`,
`REWARDS_AND_INCENTIVES.md`. Architecture only.

Defines the leaderboard periods, the metrics tracked, composite scoring, snapshot
generation, and privacy/permission scoping. Leaderboards are **read models**
computed from immutable aggregates — they never mutate source data.

---

## 1. Periods

| Period | Window | Refresh |
|--------|--------|---------|
| **Weekly** | rolling 7 days | daily snapshot |
| **Monthly** | calendar month | daily + month-end final |
| **Quarterly** | calendar quarter | daily + quarter-end final |
| **Yearly** | calendar year | daily + year-end final |
| **Lifetime** | all time | incremental on each event |

Each period maintains its own ranking; "Lifetime" is monotonic and never resets.

---

## 2. Metrics tracked (per agent, per period)

| Metric | Source |
|--------|--------|
| **Sales** | count of agent's own qualifying direct sales (`QualifiedSaleLog`). |
| **Turnover** | sum of qualifying sale value across the agent's downline. |
| **Recruitment** | count of new direct agents recruited (active Referral of agent-type). |
| **Retention** | % of downline customers/agents still active in period. |
| **Growth** | period-over-period delta in turnover. |
| **Commissions** | total commission earned (personal + override + bonuses). |
| **NFT score** | aggregate of achievement NFTs + NFT Marketplace engagement. |
| **Governance score** | voting participation + proposals + governance bonus activity. |

All metrics use **qualifying** sales only (see `NETWORK_ENGINE_ARCHITECTURE.md`
§4) — disqualified sales never appear.

---

## 3. Composite scoring (Performance Score)

A weighted composite used for the master ranking:

```
PerformanceScore =
    w1·norm(Sales) + w2·norm(Turnover) + w3·norm(Recruitment)
  + w4·norm(Retention) + w5·norm(Growth) + w6·norm(Commissions)
  + w7·norm(NFTscore) + w8·norm(GovernanceScore)
```

- `norm()` = min-max normalization within the period's cohort.
- Weights are configurable; defaults emphasize Turnover + Commissions + Growth.
- Separate **category leaderboards** exist for each single metric (e.g., top
  Recruiter, top NFT, top Governance) in addition to the composite.

---

## 4. Snapshot model

`LeaderboardSnapshot { period, asOf, rankIndex, agentId, metricValues{},
performanceScore, position }` — generated per period, stored as an immutable
projection. `LeaderboardUpdated` event signals consumers (Campaign Engine,
Recognition, AI Copilot).

- Recomputation is incremental: a new qualifying sale updates only affected
  agents' snapshots within the open periods.
- Finalized snapshots (month/quarter/year end) are frozen for audit.

---

## 5. Permission & privacy scoping

- Agents see their own position + adjacent ranks (±N) + top-N public board.
- Compliance/Admin see full boards (audit).
- **PII minimization**: public leaderboards show handle/rank, not wallet/KYC
  identity (fixes legacy open-data gap, `MIGRATION_STRATEGY.md` Phase E).
- AI Copilot answers are scoped to the requesting actor's visibility.

---

## 6. Integration

| Module | Use |
|--------|-----|
| Recognition system | top boards + spotlights. |
| Referral Campaign Engine | campaign leaderboards + rewards. |
| Rewards | leadership pools + quarterly bonuses reference rankings. |
| Agent Dashboard | `Leaderboard Position`. |
| AI Copilot | read-only explanations. |
| Treasury | validates pool eligibility from rankings. |

---

## 7. Scalability

- Metrics are pre-aggregated rollups per agent per period; snapshots computed from
  rollups (not full scans).
- At 100K agents × 5 periods, snapshots are partitioned by period + cohort;
  incremental updates keep compute bounded.
- Frozen historical snapshots enable trend analysis without recompute.
