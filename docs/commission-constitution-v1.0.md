# RELCKO Commission Constitution v1.0

**Status:** Ratified  
**Classification:** Governing Document — RELCKO Compensation System  
**Authority:** Office of the Chief Business Architect  
**Date:** July 2026  
**Supersedes:** All prior commission policy documents  

---

## Preamble

This Constitution establishes the immutable business rules governing every commission paid by RELCKO to its agents. It is the single source of truth for compensation. No implementation, no software system, no administrative action, and no informal policy may contradict the articles herein.

Every commission dollar paid by RELCKO must be traceable to a specific article in this Constitution. Any commission that cannot be so traced shall be deemed unauthorized and must be reversed.

This Constitution is the business foundation. Implementation follows this Constitution. Not the reverse.

---

## Part I — Philosophy

### Article 1 — Purpose of Commissions

Commissions exist to align the interests of agents with the interests of RELCKO. An agent is compensated only when they create value that RELCKO can measure. The measurement is a qualified property sale.

The commission system has three business objectives:

1. **Acquire customers.** Direct commissions reward agents for bringing property buyers into the RELCKO ecosystem.
2. **Build the network.** Override commissions reward agents for recruiting, training, and retaining productive agents in their downline.
3. **Sustain quality.** Activity requirements ensure that only actively producing agents share in override pools.

### Article 2 — Fairness Principles

1. **Equal work, equal pay.** Two agents with the same rank who transact the same volume earn the same commission. No discretionary adjustments.
2. **Known economics.** Every agent can compute their own commission from publicly published rates and their own transaction history. No hidden formulas.
3. **No retroactive harm.** An agent's commission rate is fixed at transaction time. A subsequent rate change never reduces a past commission.
4. **Permanent ownership.** An agent who acquires a customer owns that customer permanently. No administrative action can retroactively transfer a customer's past commission stream.

### Article 3 — Transparency Principles

1. Every commission line item is visible to the earning agent.
2. Every compression event is visible to both the compressed agent and the receiving agent.
3. Every commission adjustment is visible to the affected agent with the reason recorded.
4. The rate table for every rank is published.
5. The qualification criteria for every rank is published.
6. The activity window duration is published.
7. Any agent may request a complete explanation of any commission line item and receive one within 30 days.

---

## Part II — The Constitution

### Title I — Money

**Article 4 — Monetary Determinism**

All commission amounts are whole units of the system base currency. Fractions do not exist. Division producing a fractional result is truncated to the nearest whole unit. There is no rounding pool, no residual distribution, and no floating-point arithmetic.

This rule admits no exception.

**Article 5 — Computation Determinism**

A commission computation performed today and the same computation performed one year from now, given identical input, produce identical output. The engine does not consult wall-clock time, random numbers, or any non-deterministic source during computation.

**Article 6 — Audit Trace**

Every commission line item records the rate, the basis, the formula, the rank of the earning agent at transaction time, and the identity of every upstream agent in the override chain. A regulator must be able to reconstruct any commission from three pieces of information: the transaction ID, the date, and the rate table in effect on that date.

---

### Title II — Customer Ownership

**Article 7 — Permanence of Ownership**

Customer ownership is permanent. Once a customer is assigned to an agent, that customer belongs to that agent for the lifetime of the customer's relationship with RELCKO. The following events do NOT change customer ownership:

- The agent becomes inactive.
- The agent is demoted in rank.
- The agent is terminated from the network.
- The agent's sponsor relationship changes.
- The agent fails to qualify for any period.

This rule admits no exception except as provided in Article 8.

**Article 8 — Exclusive Grounds for Transfer**

Customer ownership may be transferred only under the following circumstances, each of which requires a documented administrative action signed by two authorized administrators:

1. **Death of the agent.** Ownership passes to the agent's designated successor or, if none, to the agent's upline sponsor.
2. **Fraud.** A customer was assigned to an agent through fraudulent means. Both the fraud and the assignment must be independently verified.
3. **Legal order.** A court or regulatory body orders the transfer.
4. **Corporate dissolution.** The agent entity is dissolved. Ownership passes to the agent's upline sponsor.
5. **Mutual agreement.** The customer requests a specific agent change and both the releasing and receiving agent consent in writing.

**Article 9 — Transfer Effects**

Upon a valid transfer:

1. The new agent receives all future commission streams from the transferred customer.
2. Past commissions earned by the previous agent are NOT adjusted, reversed, or reclaimed.
3. The transfer event is recorded with the identities of both agents, both approving administrators, the reason, and the date.
4. The transferred customer's ownership history is permanently recorded.

**Article 10 — Merged Accounts**

If two customers merge (marriage, corporate merger, joint purchase), the owning agent is the agent who owned the customer with the earliest verified sale. If neither customer has a verified sale, the owning agent is the agent who owned the majority of the transaction volume.

---

### Title III — Commission Types

**Article 11 — Direct Commission**

Direct commission is earned by the agent who owns the customer at the time of a qualified property sale.

Formula:

```
DirectCommission = floor(TransactionAmount × DirectRate ÷ 10000)
```

The DirectRate is a function of the agent's rank at transaction time.

Direct commission is earned regardless of the agent's activity status. An inactive agent earns direct commission. A suspended agent earns direct commission (held until suspension lifts). A terminated agent earns direct commission on transactions completed before the termination effective date.

Direct commission is never compressed.

**Article 12 — Override Commission**

Override commission is earned by upline agents on transactions by downline agents.

Formula:

```
OverrideRate = UplineRankRate − TransactionAgentRankRate
OverrideCommission = floor(TransactionAmount × OverrideRate ÷ 10000)
```

If OverrideRate is zero or negative, no override commission is earned for that level on that transaction.

Override commission is earned only if the upline agent is ACTIVE at the time of the commission run. Override commission is subject to compression (Title IV).

**Article 13 — Bonus Commission**

Bonus commission is awarded for meeting specific performance criteria beyond individual transactions. Bonus criteria are published at the beginning of the bonus period and are not changed retroactively.

Bonuses are paid in addition to direct and override commissions. Bonuses do not affect override calculations of upline agents.

**Article 14 — Campaign Commission**

Campaign commissions are time-limited incentives with specific qualification rules published at campaign launch. Campaign rules may suspend or modify standard commission rates for the campaign duration. Campaign modifications apply prospectively only.

**Article 15 — Reward Commission**

Rewards are non-commission compensation for milestones (rank achievement, tenure, recruitment targets). Rewards are paid separately from commissions and are not included in override calculations.

**Article 16 — Special Incentives**

RELKCO may from time to time offer special incentives. Each special incentive:

1. Must be published before the incentive period begins.
2. Must have published qualification criteria.
3. Must not modify historical commissions.
4. Must not modify active customer ownership.
5. Must expire on a published date.

---

### Title IV — Override Compression

**Article 17 — Compression Principle**

When an agent is INACTIVE, override commissions that would have flowed to that agent instead flow to the nearest qualified ACTIVE upline. This is called compression.

Compression exists to ensure that override commissions always reach an actively producing agent. It is not a penalty on the inactive agent; it is a guarantee that the network continues to function during inactivity.

**Article 18 — Compression Rules**

1. Compression applies only to override commissions, never to direct commissions.
2. Compression applies only when an agent is INACTIVE at the time of the commission run.
3. The compressed override is computed using the receiving agent's rank rate, not the inactive agent's rank rate.
4. The compression is recorded with the identity of the inactive agent who would have received the commission absent compression.
5. Multiple consecutive inactive levels are compressed to the nearest active agent at any depth.
6. If no active agent exists upline of a chain of inactive agents, the override for that chain is retained by RELCKO (unclaimed).

**Article 19 — Temporary Compression**

When an agent becomes ACTIVE after a period of inactivity, compression for that agent ceases immediately upon reactivation. No retroactive adjustment is made for the period of inactivity. The compressed commissions during inactivity are permanently retained by the agents who received them.

**Article 20 — Maximum Override Depth**

Override commissions extend to a maximum depth of N levels from the transacting agent. Depth is measured in the number of edges in the sponsor tree, not in compressed depth. Levels beyond the maximum depth receive zero override.

The maximum depth is a configurable parameter with a default of ten levels.

---

### Title V — Qualification

**Article 21 — Activity Qualification**

An agent is ACTIVE if and only if:

1. The agent has at least one qualified property sale (settlement status `ledger_posted`).
2. The agent's last qualified sale occurred within the activity window of the current date.

The activity window is a configurable duration with a default of 365 calendar days.

**Article 22 — Grace Period**

An agent whose activity window expires enters a grace period of 30 calendar days. During the grace period, the agent remains ACTIVE for qualification purposes. If a qualified sale occurs during the grace period, the activity window resets from the new sale date. If no qualified sale occurs, the agent becomes INACTIVE at the end of the grace period.

**Article 23 — Reactivation**

An INACTIVE agent becomes ACTIVE upon the first qualified property sale after inactivity. The agent's activity window resets from the new sale date. All customer ownership is restored immediately upon reactivation. Override commissions resume from the date of reactivation, not retroactively.

**Article 24 — Minimum Production**

RELKCO may establish minimum production requirements for certain ranks. An agent who fails to meet minimum production for the required period may be subject to demotion under Title VI. Minimum production requirements are published.

---

### Title VI — Rank

**Article 25 — Rank Principle**

Rank is the hierarchical position of an agent that determines commission rates and override eligibility. Rank is earned through production and sustained through continued production.

**Article 26 — Promotion**

An agent is promoted to the next rank upon meeting all published qualification requirements for that rank within the qualification period. An agent may not skip ranks. Promotion takes effect immediately upon qualification. The promoted agent's commission rate applies to all transactions occurring after the promotion effective date.

**Article 27 — Rank Protection**

An agent who is promoted to a rank holds that rank for a minimum of one full qualification period, regardless of subsequent production. After the protection period, the agent is subject to demotion if retention requirements are not met.

**Article 28 — Demotion**

An agent is demoted one rank level when the agent fails to meet the retention requirements for the current rank. Demotion does not skip ranks; an agent is demoted exactly one level per evaluation period. Demotion does not retroactively affect commissions earned before the demotion effective date.

**Article 29 — Historical Rank**

An agent's rank at the time of each transaction is permanently recorded. Future rank changes do not retroactively modify commission rates for past transactions.

**Article 30 — Rank Inheritance**

If an agent is promoted, the agent's existing customers are not affected. If an agent is demoted, the agent's existing customers are not affected. Rank changes affect future commission rates only.

---

### Title VII — Conflict Resolution

**Article 31 — Duplicate Customer**

If two agents claim the same customer, ownership is determined by the first verified qualified property sale by that customer. The agent through whom that sale occurred is the owning agent. If no verified sale exists, ownership is determined by the earliest customer registration date.

**Article 32 — Duplicate Sponsor**

An agent may have exactly one sponsor. If two agents claim to have sponsored the same agent, the first verified sponsor relationship recorded in the system governs. A sponsor relationship is verified when the sponsored agent's first qualified sale is processed.

**Article 33 — Merged Agents**

If two agents merge into a single entity (individual or corporate), the surviving entity retains the customer ownership and sponsor position of the higher-ranked agent. Unless otherwise specified in the merger agreement, the other agent's customer ownership transfers according to Article 8.

**Article 34 — Transaction Reversals**

When a transaction is reversed:

1. The direct commission for that transaction is reversed.
2. All override commissions for that transaction are reversed up the chain.
3. Reversals propagate through compression identically to original commissions.
4. The reversal creates a new commission line item with a negative amount, linked to the original commission line item.
5. Original commission line items remain in the audit trail (immutable history).

**Article 35 — Refunds**

A refund that reduces the transaction amount proportionally reduces the associated direct and override commissions. The reduction is computed by re-applying the original rates to the refunded amount.

**Article 36 — Chargebacks**

A chargeback is treated as a full transaction reversal under Article 34.

**Article 37 — Retroactive Settlement**

If a transaction was settled after the commission run for its period, the commission is computed in the next available commission run. The rate is the agent's rank at original transaction time, not at the delayed settlement time.

---

### Title VIII — Financial Interaction

**Article 38 — RNE Ownership**

RNE owns:

1. All commission calculations and formulas.
2. All rank assignments and rank rate tables.
3. All customer-to-agent ownership records.
4. All agent status determinations.
5. All compression decisions.

**Article 39 — Financial Core Ownership**

The Financial Core owns:

1. All monetary movements and ledger entries.
2. All payment provider interactions.
3. All payout creation and execution.
4. All transaction settlement lifecycle.

**Article 40 — Boundary**

RNE produces commission amounts as integers (cents) with no currency conversion, no tax withholding, no payment routing instructions, and no timing guarantees. The Financial Core consumes these amounts and executes payouts through its established pipelines.

**Article 41 — What RNE Must Never Do**

RNE must never:

1. Disburse funds.
2. Call a payment provider.
3. Modify a ledger entry.
4. Create or modify a payment reference.
5. Settle or reverse a transaction.
6. Modify inventory.

---

### Title IX — Audit

**Article 42 — Complete Traceability**

Every commission line item must be traceable to the exact transaction, rate table, rank assignment, and compression decision that produced it. The trace must be computable from three data points: the line item ID, the run date, and the rate table version.

**Article 43 — Commission Explainability**

Every agent is entitled to a complete explanation of any commission line item. The explanation must include:

1. The source transaction.
2. The rate applied.
3. The rank of the agent at transaction time.
4. Whether compression was applied.
5. If compressed, the original recipient.
6. The formula and the computation.

**Article 44 — Historical Reconstruction**

A qualified auditor must be able to reconstruct any historical commission run from:

1. The transaction event stream.
2. The rate table history.
3. The rank assignment history.
4. The agent status history.

All four sources must be available for the full retention period.

**Article 45 — Retention Period**

All commission records are retained for a minimum of seven years from the date of creation. After seven years, records may be archived to cold storage but must remain retrievable within 30 days for an additional seven years.

---

### Title X — Future Compatibility

**Article 46 — Marketplace Integration**

When a property marketplace is introduced, marketplace transactions are treated identically to standard transactions for commission purposes. The marketplace introduces no new commission types and modifies no existing commission rules.

**Article 47 — NFT and Tokenization**

Commissions earned from tokenized property transactions are computed identically to standard property transactions. The tokenization layer is invisible to the commission engine.

**Article 48 — International Expansion**

When RELCKO expands internationally:

1. Commission rates may vary by jurisdiction.
2. The commission engine applies the rate table of the jurisdiction where the property is located.
3. Customer ownership rules are uniform across all jurisdictions.
4. Currency conversion is handled by the Financial Core, not by RNE.

**Article 49 — Multi-Currency**

RNE operates exclusively in the system base currency. Any currency conversion required for international transactions is performed by the Financial Core before commission computation.

**Article 50 — Enterprise Accounts**

Enterprise accounts (corporate customers with multiple properties and multiple agents) are governed by a separate enterprise agreement. The enterprise agreement may modify:

1. Commission rates.
2. Minimum production requirements.
3. Activity window duration.

The enterprise agreement may NOT modify:

1. Customer ownership permanence.
2. Override compression rules.
3. Audit traceability requirements.

**Article 51 — Artificial Intelligence**

AI systems may consume commission data for:

1. Agent performance predictions.
2. Churn analysis.
3. Campaign optimization.
4. Anomaly detection.

AI systems may NOT:

1. Determine commission amounts.
2. Modify rate tables.
3. Transfer customer ownership.
4. Override any calculation governed by this Constitution.

---

## Part III — Configurable Parameters

The following parameters are configurable. All other rules in this Constitution are fixed.

| Parameter | Default | Range | Notes |
|---|---|---|---|
| Activity window duration (Article 21) | 365 days | 90–730 days | May vary by rank |
| Grace period duration (Article 22) | 30 days | 0–90 days | |
| Maximum override depth (Article 20) | 10 levels | 3–20 levels | |
| Rank protection period (Article 27) | 1 qualification period | 0–4 periods | |
| Rank retention threshold (Article 28) | 70% of promotion requirement | 50%–100% | |
| Commission retention period (Article 45) | 7 years | 5–10 years | |
| Minimum production for rank (Article 24) | Varies by rank | Configurable per rank | |
| Rate tables | Varies by rank | Configurable per rank | Changes published 30 days before effective |

---

## Part IV — Open Questions

The following business decisions remain open and must be resolved before implementation begins:

1. **Maximum override depth.** What is the correct default? Ten levels is reasonable for a network of millions, but should the depth be uniform or vary by rank?
2. **Activity window by rank.** Should higher-ranking agents have longer activity windows? A National Director who takes a sabbatical is different from an Associate who stops producing.
3. **Inactivity grace period.** Is 30 calendar days sufficient, or should it vary by tenure? A ten-year veteran may deserve a longer grace period than a new agent.
4. **Minimum production for retention.** Should this be a percentage of the promotion requirement (recommended) or an absolute value? Percentage scales naturally as the business grows.
5. **Rank protection period.** Should protection be one full qualification period, or should it be a fixed duration? Fixed duration is simpler; period-based aligns with other qualification logic.
6. **Customer transfer without consent.** Should a customer be able to request transfer without the releasing agent's consent? If so, what prevents abuse?
7. **Commission reversal on chargeback.** Should chargeback fees be passed to the earning agent? This is currently unaddressed and may require a separate policy.
8. **International rank unification.** Should an agent's rank be global or jurisdiction-specific? A top performer in a small market may not meet the same threshold in a large market.
9. **Enterprise override rates.** Should enterprise agents participate in the standard override pool, or should they have a separate pool? This affects recruitment incentives.
10. **AI oversight.** Who reviews AI-generated recommendations that affect commission policy? This must be defined before AI integration begins.

---

## Part V — Signatures

This Constitution is ratified by:

_________________________________
Chief Business Architect

_________________________________
Chief Executive Officer

_________________________________
Chief Financial Officer

_________________________________
General Counsel

---

## Appendix: Version History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | July 2026 | Chief Business Architect | Initial ratification |

---

*This Constitution governs all commission payments made by RELCKO. Any question of interpretation shall be resolved by the Office of the Chief Business Architect in consultation with General Counsel. Amendments require approval of the CEO and CFO.*

*The commission engine implementation shall be audited against this Constitution before deployment to production.*
