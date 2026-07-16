# Network Tree Model — Relcko Network Engine (RNE)

**Companion to:** `NETWORK_ENGINE_ARCHITECTURE.md`, `DOMAIN_MODEL.md` (entities 10
Referral, 12 Agent). Architecture only.

Defines the **relationship graph** that underpins all network credit: who sponsors
whom, how the upline/downline are derived, how override commissions route when an
agent is inactive (dynamic compression), and how lifetime ownership, compression
history, and recovery history are recorded.

---

## 1. Sponsor link (the only permanent edge)

The **sponsor** of an investor is the Agent on that investor's **single active
Referral** (entity 10: "only one active Referral per referred Investor").
Therefore:

- An investor has **exactly one** sponsoring agent for life.
- The sponsor link changes **only via administrator intervention** (principle 1).
- Every marketplace investment by that investor attributes personal commission to
  the sponsor.

The **agent–agent** edge is the `sponsorId` pointer on Agent (entity 12,
RNE extension): agent A's sponsor is the agent who recruited A. This forms the
**agent hierarchy** used for override routing.

---

## 2. Tree vocabulary

| Term | Definition |
|------|------------|
| **Sponsor** | the agent who recruited a given agent (parent in agent hierarchy); for an investor, the agent on their active Referral. |
| **Upline** | the ordered chain of sponsoring agents from a node up to the root (founder/admin). |
| **Downline** | all agents and investors recursively sponsored beneath a node. |
| **Depth** | distance from root; default max depth 10 for override eligibility (configurable). |
| **Direct (frontline)** | agents/investors one edge below a node. |
| **Lifetime ownership** | the investor–sponsor link persists forever; counts toward the sponsor's lifetime stats even if the sponsor is inactive. |

---

## 3. Tree construction

```
ROOT (Treasury Reserve / Founder)
  └─ Agent A (sponsorId = ROOT)
       ├─ Agent B (sponsorId = A)        ← direct downline of A
       │    └─ Agent C (sponsorId = B)
       └─ Investor I1 (active Referral → A)   ← customer of A (lifetime)
            └─ Investor I2 (active Referral → A)
       └─ Agent D (sponsorId = A)
            └─ Investor I3 (active Referral → D)
```

- Agent subtree = all descendant agents + their customers.
- "Team" of an agent = their entire downline (agents + customers).
- "Active team" = downline nodes currently ACTIVE; "Inactive team" = downline
  nodes currently INACTIVE (still counted for volume/retention metrics).

---

## 4. Compression (dynamic override routing)

**Rule (principle 7):** Team override commissions require the upline agent to be
**ACTIVE**. If an upline agent is **INACTIVE**, the override for their downline is
**compressed upward** — traverse the upline until the nearest **ACTIVE** sponsor is
found; that sponsor receives the override. If no ACTIVE sponsor exists, the
**Treasury Reserve** receives it.

```
Example: C's customer invests (qualifying sale).
  Normal:   C → B → A   (override to B, then A, by level)
  If B is INACTIVE:
     B's override is COMPRESSED to nearest ACTIVE upline ⇒ A.
     C still earns PERSONAL commission (always paid).
  If B and A both INACTIVE:
     Compressed to ROOT (Treasury Reserve).
```

Key points:
- **Compression does NOT change the tree.** The `sponsorId`/Referral edges are
  immutable (principle 1). Compression is a **payout-time routing decision**.
- Each level's override is routed independently; an inactive agent is "skipped"
  for that level's override, not removed.
- Compression is computed deterministically from the current active flags at the
  moment of `CommissionCalculated`.

---

## 5. Override routing algorithm

```
function routeOverride(sourceAgent, level):
    node = sourceAgent.sponsor
    while node != ROOT:
        if node.status == ACTIVE and depth(node) <= MAX_DEPTH:
            return node            # receives this level's override
        node = node.sponsor        # skip inactive → compress upward
    return TREASURY_RESERVE        # no active upline
```

- `level` = the override tier (e.g., L1 immediate upline, L2 next, …).
- Each tier routes separately; different tiers may land on different agents
  (e.g., L1 compressed to A, L2 already at A or higher).
- Result is logged as `CompressionEvent` with `compressedFromAgentId`,
  `receivedByAgentId` (or TREASURY), `level`, `amount`.

---

## 6. Dynamic routing vs static

| Aspect | Static (legacy) | RNE dynamic |
|--------|-----------------|-------------|
| Tree edges | mutable on churn | immutable |
| Override target | fixed upline | recomputed each payout from active flags |
| Inactive agent | keeps override or breaks | override compressed upward; personal kept |
| Recovery | manual | automatic on next qualified sale |

---

## 7. Lifetime ownership

- Investor→sponsor link is permanent (principle 1). All of the investor's future
  qualifying sales credit the same sponsor's **personal** commission for life,
  regardless of the sponsor's active status.
- Lifetime statistics (personal sales, lifetime volume, rank, recruited count)
  are **never decremented** by inactivity.

---

## 8. Compression history

`CompressionEvent { commissionId, fromAgentId, receivedByAgentId|null, level,
amount, routedAt, ruleVersion }` — append-only; powers audit, recovery, and
dispute resolution. Surfaced in agent dashboard as **Lost Override** (when an
agent is the compressed-from node) and **Recovered Override** (when recovered).

---

## 9. Recovery history

When an inactive agent makes a **new qualified direct sale**:
- status → ACTIVE; `activeUntil` = now + 30 days (principle 8).
- Future override now routes to them again (no tree change).
- `RecoveryEvent { agentId, triggeredBySaleId, recoveredAt, newActiveUntil }`
  recorded.
- **Recovered Override** = the override volume that would have been compressed
  past them during inactivity, now attributable again going forward (historical
  compressed commissions are NOT retroactively re-credited; only future routing
  changes). This is reported as **Recovered Override** in the dashboard.

---

## 10. Integrity & anti-abuse hooks

- Circular sponsorship is impossible: a new `sponsorId` assignment is rejected if
  it would create a cycle (see `ANTI_FRAUD_MODEL.md`).
- Depth cap prevents infinite/abusive deep chains.
- All routing decisions are deterministic and replayable from `CompressionEvent`
  + agent status snapshots.
