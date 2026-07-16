# Commission Engine — Relcko Network Engine (RNE)

**Companion to:** `NETWORK_ENGINE_ARCHITECTURE.md`, `NETWORK_TREE_MODEL.md`,
`AGENT_RANK_SYSTEM.md`, `DOMAIN_MODEL.md` (entity 11 Commission, 12 Agent).
Architecture only.

Defines every commission type, how each is calculated, how override commissions
route through the compressed upline, the Treasury fallback, recovery of compressed
commissions, and the immutable audit trail.

---

## 1. Commission types

| Type | Earner | Condition | Source value |
|------|--------|-----------|--------------|
| **Personal** | sponsoring agent of the buyer | qualifying direct sale | base rate × personal multiplier |
| **Team override** | ACTIVE upline agents (compressed) | downline qualifying sale | override rate × rank override multiplier, per level |
| **Rank bonus** | agent on reaching/maintaining rank | rank achievement / period | fixed or % of volume by rank |
| **Referral campaign bonus** | agent in active campaign | `ReferralConverted` in campaign | campaign-defined reward |
| **Leadership bonus** | eligible senior ranks (active) | treasury leadership pool | pool share by tier |
| **NFT bonus** | agent | NFT ownership/achievement events | NFT-score-linked reward |
| **Governance bonus** | agent | governance participation | governance-score reward |
| **Treasury fallback** | Treasury Reserve | no ACTIVE upline for override | receives compressed override |

---

## 2. Calculation rules

### Personal commission
```
personal = saleValue × Agent.commission_rate × rankPersonalMultiplier(agent)
```
Always paid to the buyer's sponsor (principle 2), regardless of that agent's
active status. `commission_rate` (entity 12) remains the **single authoritative
base rate** (`ENTITY_RELATIONSHIP.md` rule 4).

### Team override
```
for each level L in override tiers (e.g., L1..L5):
    rate_L = overrideSchedule[L] × rankOverrideMultiplier(agent_at_level)
    target = routeOverride(sourceAgent, L)      # NETWORK_TREE_MODEL §5
    if target == TREASURY_RESERVE:
        emit OverrideRoutedToTreasury
    else:
        credit target override = saleValue × rate_L
```
Override is paid **only** to ACTIVE upline agents; inactive upline is skipped via
compression. Each level is independent.

### Rank / Leadership / NFT / Governance bonuses
Derived from `AGENT_RANK_SYSTEM.md` multipliers, `Rewards` (entity 16) schedules,
NFT score, and governance score. These are **periodic** (not per-sale) except NFT
bonus which may be event-driven.

---

## 3. Compression & routing (recap)

- Override routing uses `routeOverride()` from `NETWORK_TREE_MODEL.md` §5.
- Inactive upline is **skipped**, not removed; the next ACTIVE upline receives the
  tier's override.
- If no ACTIVE upline → **Treasury Reserve** (`OverrideRoutedToTreasury`).
- Every routing decision logged as `CompressionEvent` (compressed-from,
  received-by, level, amount).

---

## 4. Treasury fallback

The **Treasury Reserve** is the root node of the network tree. When compression
reaches the root with no ACTIVE sponsor, the override amount is booked to Treasury
Reserve (recorded, never lost). Treasury may later redistribute via leadership
pools at its discretion (governance-controlled), but the fallback credit itself is
non-discretionary and audited.

---

## 5. Commission recovery

- While an agent is inactive, override that would have routed to them is
  compressed to their ACTIVE upline (recorded as **Lost Override** for them).
- On a new qualifying direct sale, the agent becomes ACTIVE (principle 8) and
  future override routes to them again.
- **Recovery is forward-only**: historical compressed commissions are NOT
  retroactively re-credited. `RecoveryEvent` marks the boundary; the dashboard
  reports **Recovered Override** = override volume now attributable going forward
  that previously would have been compressed past them.
- Rationale: prevents manipulation (brief reactivation to claw back history) and
  keeps the ledger append-only.

---

## 6. Commission lifecycle & status

```
CALCULATED → APPROVED → PAID | HELD | REVERSED
```
- `CommissionCalculated` (RNE) → `CommissionApproved` (compliance/anti-fraud) →
  `CommissionPaid` (Treasury settlement, `PAYMENT_SETTLEMENT_ARCHITECTURE.md`).
- `HELD`: pending cooling period / dispute.
- `REVERSED`: refund or cancellation → disqualifies the sale; any paid commission
  is clawed back via offsetting entry (never edited).
- Every transition mirrored to `AuditLog` (entity 19).

---

## 7. Historical audit

- `Commission` (entity 11) records: `type`, `agentId`, `referralId`,
  `sourceSaleId`, `generationRuleId`, `compressedFromAgentId?`, `status`,
  `amount`, `currency`, `createdAt`.
- `CompressionEvent` + `RecoveryEvent` provide full traceability of every routed
  and recovered override.
- No commission record is ever updated in place; corrections are offsetting
  entries (append-only integrity, `ENTITY_RELATIONSHIP.md` rule 2).

---

## 8. Integration

| Consumer | Uses |
|----------|------|
| Treasury | settles `CommissionPaid`; holds Treasury Reserve fallback. |
| Agent dashboard | Pending/Paid commission, Lost/Recovered override. |
| Leaderboard | commission totals as a metric. |
| Referral Campaign | campaign bonus issuance. |
| Governance | governance bonus basis. |
| NFT Marketplace | NFT bonus basis. |
| AI Copilot | read-only commission explainability. |
