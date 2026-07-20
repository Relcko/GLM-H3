# Agent Rank System — Relcko Network Engine (RNE)

**Companion to:** `NETWORK_ENGINE_ARCHITECTURE.md`, `NETWORK_TREE_MODEL.md`,
`COMMISSION_ENGINE.md`. Architecture only.

Defines the **9-rank ladder**, the qualification criteria for each rank, and the
privileges attached to each rank. Ranks are **lifetime-earned** and never
auto-demoted (principle 6: rank remains when inactive); an agent may only move
**up** by meeting the next rank's thresholds.

---

## 1. Ranks (ascending)

| # | Rank | Tier |
|---|------|------|
| 1 | **Associate** | Entry |
| 2 | **Senior Associate** | Entry |
| 3 | **Bronze** | Mid |
| 4 | **Silver** | Mid |
| 5 | **Gold** | Senior |
| 6 | **Platinum** | Senior |
| 7 | **Diamond** | Elite |
| 8 | **Elite** | Elite |
| 9 | **Legend** | Top |

All ranks require the agent to be **ACTIVE** (rolling 30-day window) to be
*eligible* for the rank's commission multipliers and privileges, **except** that
the rank title itself is retained during inactivity (principle 6). Privileges that
are gated on ACTIVE status are noted below as "(active)".

---

## 2. Qualification criteria (per rank)

| Rank | Personal Sales | Monthly Team Turnover | Lifetime Turnover | ACTIVE required | Direct recruits (min) |
|------|---------------|----------------------|-------------------|-----------------|------------------------|
| Associate | 1 qualifying | — | — | yes | 0 |
| Senior Associate | 5 | — | — | yes | 1 |
| Bronze | 15 | 50K | 100K | yes | 3 |
| Silver | 40 | 200K | 500K | yes | 8 |
| Gold | 100 | 750K | 2M | yes | 20 |
| Platinum | 250 | 2M | 8M | yes | 50 |
| Diamond | 600 | 6M | 25M | yes | 120 |
| Elite | 1,500 | 15M | 75M | yes | 300 |
| Legend | 4,000 | 40M | 200M | yes | 750 |

Values are **configurable** defaults; thresholds are evaluated against the
`QualifiedSaleLog` (only qualifying sales count) and the team volume derived from
the network tree (`NETWORK_TREE_MODEL.md`).

- **Personal Sales** = count of the agent's own qualifying direct sales.
- **Monthly Team Turnover** = sum of qualifying sale value across the agent's
  downline in the trailing calendar month.
- **Lifetime Turnover** = cumulative qualifying sale value across the agent's
  downline for all time.
- **ACTIVE required** = rank multipliers/privileges apply only while ACTIVE
  (principle 3/6).

---

## 3. Rank privileges

Each rank carries:

| Privilege | Meaning |
|-----------|---------|
| **Commission multiplier** | multiplier applied to personal + override commissions (see `COMMISSION_ENGINE.md`). |
| **NFT badge** | a soulbound/achievement NFT minted on rank achievement (feeds NFT score + NFT Marketplace). |
| **Governance multiplier** | weight applied to the agent's voting power / governance bonus. |
| **Exclusive property access** | early/pre-allocation access to selected marketplace properties (Global Property Map). |
| **Marketplace fee discounts** | reduced platform fees on the agent's own investments/trades. |
| **Treasury incentives** | eligibility for treasury-funded leadership pools / bonuses. |

### Privilege matrix (illustrative defaults)

| Rank | Personal mult | Override mult | Gov mult | Fee discount | Exclusive access | NFT badge |
|------|--------------|--------------|----------|--------------|------------------|-----------|
| Associate | 1.00× | 1.00× | 1.00× | 0% | no | Associate |
| Senior Associate | 1.05× | 1.05× | 1.00× | 0% | no | Senior |
| Bronze | 1.10× | 1.10× | 1.05× | 5% | no | Bronze |
| Silver | 1.15× | 1.15× | 1.10× | 10% | limited | Silver |
| Gold | 1.20× | 1.20× | 1.20× | 15% | yes | Gold |
| Platinum | 1.30× | 1.25× | 1.30× | 20% | yes | Platinum |
| Diamond | 1.40× | 1.30× | 1.50× | 25% | yes | Diamond |
| Elite | 1.50× | 1.35× | 1.75× | 30% | priority | Elite |
| Legend | 1.75× | 1.50× | 2.00× | 35% | priority+pre | Legend |

All multipliers active only while the agent is ACTIVE; on inactivity they revert
to the base (1.00×) for new credits but the **rank title and lifetime stats are
retained**. Treasury incentives (leadership pools) require ACTIVE.

---

## 4. Rank evaluation & achievement

- Rank is **evaluated incrementally** on each qualifying sale and on each monthly
  volume snapshot.
- Promotion is **monotonic**: an agent moves up when thresholds for the next rank
  are met; never down.
- On achievement → `RankAchieved` event + NFT badge mint request + `AuditLog`.
- Rank history (`RankHistory { agentId, rankId, achievedAt, triggeredBy }`) is
  append-only (no demotion edits).

---

## 5. Integration

- **Commission Engine** consumes rank multipliers for personal/override/bonus math.
- **Governance** consumes governance multiplier for voting weight + governance
  bonus.
- **NFT Marketplace** mints/recognizes rank badges (NFT score).
- **Global Property Map** enforces exclusive property access.
- **Treasury** funds leadership pools for eligible ranks.
- **Marketplace** applies fee discounts to the agent's transactions.

---

## 6. Scalability

- Rank evaluation is a pure function over `QualifiedSaleLog` + team tree
  aggregates; recomputed incrementally, cached per agent, invalidated on new
  qualifying sale or monthly rollover.
- At 100K agents, rank aggregates are maintained as rolling counters per subtree.
