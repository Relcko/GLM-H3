# Rewards and Incentives — Relcko Network Engine (RNE)

**Companion to:** `NETWORK_ENGINE_ARCHITECTURE.md`, `AGENT_RANK_SYSTEM.md`,
`COMMISSION_ENGINE.md`, `DOMAIN_MODEL.md` (entity 16 Rewards). Architecture only.

Rewards are **non-commission incentives** — periodic bonuses, experiences, RLKO
token rewards, NFT achievements, marketplace perks, exclusive allocations, and
leadership pools. They complement (do not replace) the commission engine and are
credited through the `Rewards` entity (16) and campaign engine.

---

## 1. Incentive catalog

| Incentive | Cadence | Basis | Active-gate |
|-----------|---------|-------|-------------|
| **Monthly bonus** | monthly | personal + team volume tiers | yes |
| **Quarterly bonus** | quarterly | rank + sustained volume | yes |
| **Luxury travel** | annual / milestone | top leaderboard + rank | yes |
| **RLKO rewards** | event/periodic | RLKO holding + network activity | yes |
| **NFT achievements** | event-driven | milestone badges (rank/volume/recruit) | no (badge retained) |
| **Marketplace discounts** | ongoing | rank fee discount (`AGENT_RANK_SYSTEM.md`) | yes |
| **Exclusive allocations** | per property | rank-gated pre-access (`Global Property Map`) | yes |
| **Leadership pools** | quarterly | treasury-funded share by senior rank | yes |
| **Recognition system** | continuous | leaderboard + milestone showcases | no |

---

## 2. Reward sources & flows

```
QUALIFYING SALE / PERIOD EVENT
   ├─ Commission Engine  → personal / override / bonus commissions
   └─ Rewards Engine     → incentive credits
        ├─ Rewards entity (16) issuance (RLKO / stablecoin / points)
        ├─ NFT Marketplace → achievement NFT mint (badge)
        ├─ Global Property Map → exclusive allocation grant
        ├─ Marketplace → fee-discount application
        └─ Treasury → leadership pool funding (governance-approved)
```

- `IncentiveCredited` event emitted per reward; mirrored to `AuditLog` (19).
- Reward payouts settle via Treasury (`PAYMENT_SETTLEMENT_ARCHITECTURE.md`) using
  the same multi-sig + FX snapshot discipline as commissions.

---

## 3. RLKO rewards

- RLKO (platform token) rewards are granted for network activity: recruiting,
  volume, governance participation, and NFT engagement.
- Reward amount scales with rank multipliers and a configurable RLKO emission
  budget (treasury-controlled, governance-approved).
- RLKO rewards may be **staked** (Staking module) or held; they are NOT a
  commission and carry no ownership of property.

---

## 4. NFT achievements

- Achievement NFTs are minted on: rank achievement, volume milestones, recruitment
  milestones, and governance tenure.
- They are **soulbound** (non-transferable) recognition tokens; they feed the
  agent's **NFT score** (`LEADERBOARD_ENGINE.md`) and may unlock NFT Marketplace
  perks.
- Badge retention is lifetime (principle 6); utility (e.g., fee discounts) is
  active-gated.

---

## 5. Leadership pools (Treasury-funded)

- A treasury-funded pool, allocated quarterly, shared among eligible senior ranks
  (Platinum+) who are ACTIVE.
- Share weight = function of rank tier + qualified team volume + retention.
- Governed by Treasury/Governance; distribution is a `Rewards` issuance +
  `IncentiveCredited`.

---

## 6. Recognition system

- Continuous showcase of top performers (leaderboards), milestone anniversaries,
  and rank achievements.
- Read-only feeds into Agent Dashboard, AI Copilot (scoped), and public
  leaderboards (privacy-aware).

---

## 7. Integration

| Module | Reward touchpoint |
|--------|-------------------|
| Treasury | funds + settles all reward payouts; leadership pools. |
| NFT Marketplace | mints/recognizes achievement NFTs. |
| Global Property Map | enforces exclusive allocations. |
| Marketplace | applies fee discounts. |
| Governance | approves RLKO emission budget + leadership pools. |
| Staking | RLKO rewards stakeable. |
| AI Copilot | explains rewards (read-only, scoped). |
| Referral Campaign Engine | campaign bonuses feed here. |

---

## 8. Scalability & integrity

- Rewards are computed from the same `QualifiedSaleLog` + rank + score aggregates
  as commissions; idempotent and replayable.
- Emission budgets are capped; overspend blocked at Treasury.
- All reward credits are append-only via `Rewards` (16) + `AuditLog` (19).
- At 100K agents, incentive batches run per period (monthly/quarterly) over
  pre-aggregated rollups.
