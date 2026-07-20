# Agent Performance Model — Relcko Network Engine (RNE)

**Companion to:** `NETWORK_ENGINE_ARCHITECTURE.md`, `NETWORK_TREE_MODEL.md`,
`COMMISSION_ENGINE.md`, `LEADERBOARD_ENGINE.md`. Architecture only.

Defines the **Agent Dashboard read-model**: a composed, real-time projection of an
agent's status, activity, team, commissions, overrides, and ranking. Like
`Portfolio` (entity 9, a read model), the Agent Performance Model is **derived** —
it stores no source of truth, only projections recomputed from immutable logs.

---

## 1. Dashboard fields (required by spec)

| Field | Source / derivation |
|-------|---------------------|
| **Current Status** | Agent.status (ACTIVE / INACTIVE). |
| **Active Until** | Agent.activeUntil (rolling 30-day window). |
| **Days Remaining** | max(0, activeUntil − now). |
| **Current Rank** | Agent.rankId (`AGENT_RANK_SYSTEM.md`). |
| **Next Rank** | next rank + gap to thresholds. |
| **Personal Sales** | count of own qualifying sales (`QualifiedSaleLog`). |
| **Team Sales** | qualifying sale count across downline. |
| **Monthly Volume** | trailing-month downline turnover. |
| **Lifetime Volume** | all-time downline turnover. |
| **Active Team** | downline agents/investors currently ACTIVE. |
| **Inactive Team** | downline nodes currently INACTIVE (still counted). |
| **Pending Commission** | sum of Commission in CALCULATED/APPROVED/HELD. |
| **Paid Commission** | sum of Commission in PAID. |
| **Lost Override** | override compressed past this agent while inactive (`CompressionEvent` where receivedBy ≠ this agent and compressedFrom = this agent). |
| **Recovered Override** | override now attributable after reactivation (`RecoveryEvent`). |
| **Leaderboard Position** | position in current periods (`LEADERBOARD_ENGINE.md`). |
| **Performance Score** | composite score from Leaderboard Engine. |

---

## 2. Computation model

```
AgentPerformanceModel(agentId) =
  read Agent(agentId)                    # status, activeUntil, rankId, sponsorId
  + aggregate QualifiedSaleLog(agentId, downline)
  + aggregate Commission(agentId)        # by status
  + aggregate CompressionEvent(agentId)  # lost/recovered
  + read LeaderboardSnapshot(agentId)    # position + score
  + read NetworkTree(agentId)           # active/inactive team counts
```

- Recomputed **on demand** and **incrementally on events** (`CommissionPaid`,
  `RankAchieved`, `AgentActivated/Deactivated`, `LeaderboardUpdated`,
  `CompressionEvent`).
- Cached per agent; invalidated on any contributing event (event-driven refresh).

---

## 3. Status & active-window visualization

- `Days Remaining` drives the "stay active" prompt. When 0 → status flips to
  INACTIVE (`AgentDeactivated`), personal commissions continue, override stops,
  compression engages.
- A new qualifying direct sale → `AgentActivated`, `activeUntil = now + 30d`,
  override resumes (`RecoveryEvent`).

---

## 4. Team composition

- **Active Team / Inactive Team** counts are derived from the downline via the
  network tree; used for retention metric and team-volume thresholds (rank
  qualification).
- Inactive team members still count toward lifetime volume and recruitment totals
  (principle 6: lifetime stats never decrease).

---

## 5. Override accounting

- **Lost Override** = sum of override amounts where this agent was the
  `compressedFromAgentId` (i.e., skipped because inactive) during inactivity.
- **Recovered Override** = the forward-looking volume that now routes to them
  after reactivation (from `RecoveryEvent`); historical lost override is NOT
  reversed (see `COMMISSION_ENGINE.md` §5).

---

## 6. Permission scoping

- Agent sees only their own model.
- Admin/Compliance see any agent's model (audit + support).
- AI Copilot answers are scoped to the requesting agent's own data.

---

## 7. Integration

| Module | Use |
|--------|-----|
| Commission Engine | pending/paid/lost/recovered figures. |
| Network Tree | team counts. |
| Leaderboard | position + score. |
| Rank System | current/next rank + gaps. |
| Treasury | payout status. |
| AI Copilot | read-only explainability. |

---

## 8. Scalability

- Model is a projection over pre-aggregated rollups (same as Leaderboard).
- Incremental event-driven refresh keeps it real-time without full recompute.
- At 100K agents, per-agent projection is cheap; rollups computed in batch.
