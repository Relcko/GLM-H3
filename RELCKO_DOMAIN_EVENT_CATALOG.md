# RELCKO Domain Event Catalog v1.0

**Status:** Architecture Authority — Ratified
**Companion documents:** RELCKO_EVENT_CONSTITUTION.md, RELCKO_ECOSYSTEM_ARCHITECTURE.md, EVENT_ARCHITECTURE.md, NETWORK_ENGINE_ARCHITECTURE.md, COMMISSION_ENGINE.md

**Authority:** This catalog is the authoritative registry of every domain event in the RELCKO platform. No event may be produced, consumed, or referenced outside this catalog. Every service, bounded context, engineer, auditor, AI system, and integration must use only events defined herein.

**Constitutional compliance:** Every event defined in this catalog conforms to the RELCKO_EVENT_CONSTITUTION.md — immutability, idempotency, replayability, traceability, and all constitutional articles.
# RELCKO Domain Event Catalog v1.0

**Status:** Architecture Authority — Ratified
**Companion documents:** `RELCKO_EVENT_CONSTITUTION.md`, `RELCKO_ECOSYSTEM_ARCHITECTURE.md`, `EVENT_ARCHITECTURE.md`, `NETWORK_ENGINE_ARCHITECTURE.md`, `COMMISSION_ENGINE.md`

**Authority:** This catalog is the authoritative registry of every domain event in the RELCKO platform. No event may be produced, consumed, or referenced outside this catalog. Every service, bounded context, engineer, auditor, AI system, and integration must use only events defined herein.

**Constitutional compliance:** Every event defined in this catalog conforms to the `RELCKO_EVENT_CONSTITUTION.md` — immutability, idempotency, replayability, traceability, and all constitutional articles.

## Bounded Context Index

| # | Bounded Context | Section |
|---|-----------------|---------|
| 1 | Agent | S1 |
| 2 | Network | S2 |
| 3 | Commission | S3 |
| 4 | Qualification | S4 |
| 5 | Campaign | S5 |
| 6 | Property | S6 |
| 7 | Primary Investment | S7 |
| 8 | Secondary Market | S8 |
| 9 | Payment and Settlement | S9 |
| 10 | Ownership | S10 |
| 11 | Portfolio | S11 |
| 12 | NFT | S12 |
| 13 | Dividend | S13 |
| 14 | Reward | S14 |
| 15 | Treasury | S15 |
| 16 | Reserve | S16 |
| 17 | Buyback and Burn | S17 |
| 18 | Governance | S18 |
| 19 | Identity and Wallet | S19 |
| 20 | Compliance | S20 |
| 21 | Security | S21 |
| 22 | Risk | S22 |
| 23 | AI | S23 |
| 24 | Document | S24 |
| 25 | Administration | S25 |
| 26 | Audit | S26 |
| 27 | Map | S27 |
| 28 | Valuation | S28 |
| 29 | Notification | S29 |
| 30 | System | S30 |

---
## S1 - Agent Bounded Context

---

### AgentRegistered

**Purpose:** Records the onboarding of a new agent into the RELCKO network.

**Bounded Context:** Agent

**Aggregate:** Agent

**Producer:** Network Engine

**Consumers:** Agent Dashboard, Commission Engine, Referral Campaign, Leaderboard, Admin, Audit

**Trigger:** Agent registration form completed and KYC submitted

**Preconditions:** Investor identity verified; wallet linked; unique referral code generated

**Postconditions:** Agent record created in PENDING status; ActiveUntil unset; commission rate initialized

**Business Meaning:** An investor has been granted agent status with a unique referral code and commission rate. The agent is not yet ACTIVE.

**Event Category:** Core

**Ordering Requirements:** Per-agent strict ordering by version

**Idempotency Requirements:** Keyed by eventId + agentId; duplicate registration rejected

**Replay Requirements:** Full replay reconstructs agent registry from origin

**Versioning Rules:** Additive payload fields only; breaking changes require new event type

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Actor identity, timestamp, referral code, commission rate must be logged

**Failure Handling:** Schema validation failure to reject before publish; registration failure to AdminActionLogged

**Related Events:** AgentActivated, AgentDeactivated, AgentStatusChanged

**Notes:** Agent status is PENDING until first qualifying direct sale triggers AgentActivated. Commission rate is set at registration and is the authoritative base rate for all future commissions.

---

### AgentActivated

**Purpose:** Records that an agent has met the qualifying direct sale threshold and is now ACTIVE.

**Bounded Context:** Agent

**Aggregate:** Agent

**Producer:** Network Engine

**Consumers:** Commission Engine (override eligibility), Rank Evaluator, Agent Dashboard, Leaderboard, Audit

**Trigger:** A qualifying direct sale completed by the agent

**Preconditions:** Agent status is PENDING or INACTIVE; qualifying sale verified (KYC, settlement, cooling, minimum value, no refund/cancellation)

**Postconditions:** Agent status becomes ACTIVE; ActiveUntil set to now + 30 days; override commission eligibility resumes

**Business Meaning:** The agent has earned active status through a qualifying sale. Team override commissions now route to this agent.

**Event Category:** Core

**Ordering Requirements:** Per-agent; must follow AgentRegistered or AgentDeactivated

**Idempotency Requirements:** Keyed by eventId; if already ACTIVE, extend ActiveUntil without duplicate effect

**Replay Requirements:** Replay correctly recomputes the active window timeline

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Triggering sale ID, previous status, new ActiveUntil

**Failure Handling:** Non-deterministic date computation must use the event timestamp, not wall clock

**Related Events:** AgentRegistered, AgentDeactivated, CommissionCalculated

**Notes:** Rolling 30-day window per the RNE constitution. Each new qualifying sale extends the window.

---

### AgentDeactivated

**Purpose:** Records that an agent active window has expired without a new qualifying sale.

**Bounded Context:** Agent

**Aggregate:** Agent

**Producer:** Network Engine (scheduler or event-driven evaluation)

**Consumers:** Commission Engine (stop override routing), Agent Dashboard, Rank Evaluator, Audit

**Trigger:** ActiveUntil timestamp passed with no new qualifying direct sale

**Preconditions:** Agent status is ACTIVE; ActiveUntil less than now; no pending qualifying sale

**Postconditions:** Agent status becomes INACTIVE; team override compression activated; personal commission eligibility retained; rank title retained

**Business Meaning:** The agent is no longer actively earning. Override commissions now compress upward to the next ACTIVE upline. Personal commissions on the agent own direct sales continue.

**Event Category:** Core

**Ordering Requirements:** Per-agent; must follow AgentActivated

**Idempotency Requirements:** Keyed by eventId; evaluate based on event timestamp not wall clock during replay

**Replay Requirements:** Replay must not use wall clock for expiry determination - use event order and ActiveUntil computed from prior events

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Deactivation reason (expired/administrative), previous ActiveUntil, last qualifying sale reference

**Failure Handling:** Scheduler failure to deactivation delayed; compensated on next evaluation cycle; AlertRaised if backlog exceeds threshold

**Related Events:** AgentActivated, OverrideCompressed

**Notes:** Inactivity preserves rank, lifetime stats, personal commissions, and downline tree. Only override eligibility is affected.

---

### AgentStatusChanged

**Purpose:** Records an administrative change to an agent status (suspended, terminated, reactivated).

**Bounded Context:** Agent

**Aggregate:** Agent

**Producer:** Admin Portal / Compliance Officer

**Consumers:** Commission Engine, Agent Dashboard, Network Engine, Referral Campaign, Audit

**Trigger:** Admin action or compliance decision

**Preconditions:** Actor has Administrator or Compliance Officer role; reason provided

**Postconditions:** Agent status updated; commission eligibility may change; override routing may change

**Business Meaning:** An agent participation has been administratively modified.

**Event Category:** Business

**Ordering Requirements:** Per-agent strict ordering

**Idempotency Requirements:** Keyed by eventId; status transition validated before apply

**Replay Requirements:** Replay reconstructs agent status timeline

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Previous status, new status, actor identity, reason, evidence references

**Failure Handling:** Unauthorized actor to reject before publish

**Related Events:** AgentActivated, AgentDeactivated, ComplianceFlagRaised

**Notes:** SUSPENDED is a temporary hold; TERMINATED is final. Terminated agents stop earning on all future transactions.

---
### AgentEnteredGracePeriod

**Purpose:** Records that an agent is approaching deactivation and has entered a grace notification period.

**Bounded Context:** Agent

**Aggregate:** Agent

**Producer:** Network Engine

**Consumers:** Notification Service, Agent Dashboard, Audit

**Trigger:** ActiveUntil minus gracePeriod threshold reached with no qualifying sale

**Preconditions:** Agent is ACTIVE; ActiveUntil minus now less than gracePeriod; no prior grace event active

**Postconditions:** Grace notification sent; agent dashboard shows grace warning

**Business Meaning:** The agent has a limited window to make a qualifying sale before deactivation.

**Event Category:** Business

**Ordering Requirements:** Per-agent; advisory only

**Idempotency Requirements:** Keyed by eventId + gracePeriod identifier; one grace notification per deactivation cycle

**Replay Requirements:** Grace notifications suppressed during replay unless replay is for notification delivery

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard (90 days)

**Audit Requirements:** Agent ID, remaining days, grace period configuration

**Failure Handling:** Notification failure to logged; retry via notification service

**Related Events:** AgentDeactivated, AgentActivated

**Notes:** Notification is advisory; it does not affect state computation. During full replays, notification events are not re-dispatched.

---

### AgentTaskCompleted

**Purpose:** Records that an agent has completed a required task (training, onboarding, compliance).

**Bounded Context:** Agent

**Aggregate:** Agent

**Producer:** Agent Portal / Training System

**Consumers:** Compliance Engine, Commission Engine, Agent Dashboard, Audit

**Trigger:** Agent completes a required task

**Preconditions:** Task defined and assigned to agent; agent has accepted or been assigned the task

**Postconditions:** Task marked complete; agent qualification progress updated; compliance check may advance

**Business Meaning:** The agent has fulfilled a platform or compliance requirement.

**Event Category:** Business

**Ordering Requirements:** Per-agent eventual

**Idempotency Requirements:** Keyed by eventId + taskId; each task completed at most once

**Replay Requirements:** Replay reconstructs agent task completion timeline

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard (365 days)

**Audit Requirements:** Agent ID, task ID, task type, completion timestamp, evidence reference

**Failure Handling:** Task already completed to idempotent; invalid task to reject

**Related Events:** AgentStatusChanged, ComplianceFlagRaised

**Notes:** Tasks are defined by Administration or Compliance. Completion is a prerequisite for certain status changes.

---

### RankAchieved

**Purpose:** Records that an agent has achieved a new rank in the RNE 9-rank ladder.

**Bounded Context:** Agent

**Aggregate:** Agent (rank attribute)

**Producer:** Network Engine / Rank Evaluator

**Consumers:** Agent Dashboard, Commission Engine (multiplier update), NFT Marketplace (badge mint), Leaderboard, Global Property Map (access grant), Governance (multiplier update), Audit

**Trigger:** Agent met qualifications for a higher rank

**Preconditions:** Agent is ACTIVE; rank thresholds met for the next rank; not already at or above the achieved rank

**Postconditions:** Agent rank updated; commission multipliers recalculated; NFT badge minting triggered; privileges activated; governance multiplier updated

**Business Meaning:** The agent has been promoted. All rank privileges, multipliers, and access rights are now in effect.

**Event Category:** Core

**Ordering Requirements:** Per-agent strict; monotonic version sequence

**Idempotency Requirements:** Keyed by eventId + agentId + rankId; each rank achieved at most once

**Replay Requirements:** Replay must re-evaluate rank thresholds deterministically from qualifying sale data

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Agent ID, previous rank, new rank, qualification criteria met, timestamp

**Failure Handling:** Rank evaluation failure to rank not updated; AlertRaised; administrative override via AdminActionLogged

**Related Events:** AgentActivated, AgentRegistered, NFTMinted (badge), LeaderboardUpdated

**Notes:** Rank is lifetime-earned and never demoted (RNE Principle 6). An inactive agent retains the rank title but loses multipliers.

---

### RankDemoted

**Purpose:** Reserved for administrative rank correction. Normal rank movement is always upward only (monotonic).

**Bounded Context:** Agent

**Aggregate:** Agent (rank attribute)

**Producer:** Admin Portal (exceptional)

**Consumers:** Agent Dashboard, Commission Engine, NFT Marketplace, Governance, Audit

**Trigger:** Administrative correction due to erroneous previous promotion or fraud

**Preconditions:** Authorized actor (Super Administrator); compelling evidence of rank error; governance notification

**Postconditions:** Agent rank corrected; multipliers, privileges, and access rights adjusted

**Business Meaning:** A rank error has been administratively corrected. This is exceptional.

**Event Category:** Business (Exceptional)

**Ordering Requirements:** Per-agent strict

**Idempotency Requirements:** Keyed by eventId; one demotion per correction

**Replay Requirements:** Replay applies demotion as a corrective event

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Agent ID, previous rank, new rank, reason, evidence, actor identity, governance approval

**Failure Handling:** Unauthorized actor to reject before publish

**Related Events:** RankAchieved, AdminActionLogged

**Notes:** Reserved for exceptional use only. Standard rank movement is always upward.

---

### QualificationAchieved

**Purpose:** Records that an agent has met a specific qualification milestone that may not correspond to a full rank change.

**Bounded Context:** Agent

**Aggregate:** Agent (qualification tracking)

**Producer:** Network Engine

**Consumers:** Agent Dashboard, Leaderboard, Campaign Engine, Audit

**Trigger:** Agent reached a qualification milestone defined in the rank system or campaign rules

**Preconditions:** Milestone threshold met; milestone is not a rank promotion (those use RankAchieved)

**Postconditions:** Milestone recorded; leaderboard may update; campaign progress may advance

**Business Meaning:** A specific numeric milestone has been achieved, contributing to progress tracking and leaderboard scoring.

**Event Category:** Business

**Ordering Requirements:** Per-agent eventual

**Idempotency Requirements:** Keyed by eventId + agentId + milestoneId; each milestone achieved at most once

**Replay Requirements:** Replay re-evaluates milestones from qualifying sale data

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard (365 days)

**Audit Requirements:** Agent ID, milestone type, threshold value, current value, timestamp

**Failure Handling:** Milestone evaluation is side-effect-safe; no action on failure

**Related Events:** RankAchieved, LeaderboardUpdated, IncentiveCredited

**Notes:** Milestones are building blocks for rank evaluation, campaign progress, and leaderboard scoring.

---

---
## S2 - Network Bounded Context

---
### ReferralCreated

**Purpose:** Records that an investor registered using an agent referral code, creating a permanent sponsor link.

**Bounded Context:** Network

**Aggregate:** Referral

**Producer:** Network Engine

**Consumers:** Commission Engine, Agent Dashboard, Referral Campaign, Audit

**Trigger:** Investor registration with a valid agent referral code

**Preconditions:** Referral code belongs to an ACTIVE or INACTIVE agent; investor has no existing active referral; no self-referral (investor not equal agent); identity duplication check passed

**Postconditions:** Permanent referral link established between investor and agent; commission eligibility created on future qualifying sales

**Business Meaning:** A customer is permanently attributed to the sponsoring agent. This relationship is lifelong and never changes except by admin intervention.

**Event Category:** Core

**Ordering Requirements:** Per-referral strict ordering; per-agent eventual consistency

**Idempotency Requirements:** Keyed by eventId + referralId; duplicate registration with same code rejected

**Replay Requirements:** Full replay reconstructs the entire referral graph

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Referrer agent ID, referred investor ID, referral code, timestamp, IP, identity verification method

**Failure Handling:** Anti-fraud validation (self-referral, duplicate, circular) to reject with FraudDetected event; AlertRaised on pattern

**Related Events:** ReferralConverted, CommissionCalculated, AgentActivated

**Notes:** The single-sponsor-for-life principle is a constitutional rule (RNE Principle 1). Only administrator intervention can change a referral.

---

### ReferralConverted

**Purpose:** Records that a referred investor has completed their first qualifying investment, converting the referral from pending to active.

**Bounded Context:** Network

**Aggregate:** Referral

**Producer:** Network Engine

**Consumers:** Commission Engine (trigger commission), Referral Campaign, Agent Dashboard, Leaderboard, Audit

**Trigger:** First qualifying investment by the referred investor (InvestmentAllocated + all qualifying sale conditions met)

**Preconditions:** Referral link exists and is in pending or active status; investor passed KYC; payment settled; ownership allocated; cooling period passed; minimum value met; no refund/cancellation

**Postconditions:** Referral status becomes active; commission generated for the agent; campaign attribution evaluated; leaderboard metrics updated

**Business Meaning:** The referral has materialized into an economic event. The agent network has generated value.

**Event Category:** Core

**Ordering Requirements:** Per-referral strict ordering; must follow ReferralCreated

**Idempotency Requirements:** Keyed by eventId + referralId + investmentId; each investment triggers conversion at most once

**Replay Requirements:** Replay must re-evaluate qualifying conditions purely from event data; no external state queries

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Referral ID, investment ID, property ID, amount, commission generated, campaign attribution

**Failure Handling:** Disqualified investment (refund later) to CommissionReversed compensates; no ReferralConverted retraction

**Related Events:** ReferralCreated, CommissionCalculated, CampaignRewardIssued, AgentActivated

**Notes:** The converted referral is the primary trigger for downstream commission generation.

---
### OverrideCompressed

**Purpose:** Records that an override commission intended for an inactive agent was compressed upward to the next ACTIVE upline agent.

**Bounded Context:** Network

**Aggregate:** Commission (override routing)

**Producer:** Network Engine

**Consumers:** Agent Dashboard (compression report), Commission Engine, Override Ledger, Audit

**Trigger:** Commission calculation detected that the downline agent direct upline is INACTIVE; compression routing executed

**Preconditions:** A sale generated override commission; the target level agent is INACTIVE; an ACTIVE upline exists (otherwise to OverrideRoutedToTreasury)

**Postconditions:** Override amount credited to the compressed-to agent; compressed-from agent lost override recorded; compression audit trail appended

**Business Meaning:** Value that would have flowed to an inactive upline is redirected to the nearest active upline. This preserves network incentive integrity.

**Event Category:** Core

**Ordering Requirements:** Per-sale; must follow CommissionCalculated

**Idempotency Requirements:** Keyed by eventId + saleId + level; compression is computed deterministically from the tree state at sale time

**Replay Requirements:** Replay must reconstruct the tree state at the original sale timestamp, not the current tree state

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Compressed-from agent ID, compressed-to agent ID, level, amount, reason (inactive), sale reference

**Failure Handling:** Routing to a non-existent agent to OverrideRoutedToTreasury fallback; tree integrity validated before routing

**Related Events:** CommissionCalculated, OverrideRoutedToTreasury, CommissionRecovered

**Notes:** Compression is a constitutional mechanism (RNE Principle 7). The compressed-from agent lost override is tracked for dashboard visibility but is never retroactively recovered.

---

### OverrideRoutedToTreasury

**Purpose:** Records that an override commission could not be routed to any ACTIVE upline and was credited to the Treasury Reserve instead.

**Bounded Context:** Network

**Aggregate:** Commission (Treasury routing)

**Producer:** Network Engine

**Consumers:** Treasury (Reserve), Override Ledger, Audit

**Trigger:** Compression walk reached the root of the network tree with no ACTIVE sponsor

**Preconditions:** All upline agents at the given override level are INACTIVE; no ACTIVE agent found at any higher level; compression exhausted

**Postconditions:** Override amount credited to Treasury Reserve; Treasury Reserve ledger updated; audit trail appended

**Business Meaning:** The network tree at that level has no active participants, so the value flows to the platform central reserve as the ultimate backstop.

**Event Category:** Core

**Ordering Requirements:** Per-sale; must follow CommissionCalculated

**Idempotency Requirements:** Keyed by eventId + saleId + level; deterministic routing

**Replay Requirements:** Replay reconstructs routing from the sale-time tree state

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Override level, amount, sale reference, compressed-from chain (all skipped agents), Treasury Reserve credit

**Failure Handling:** Treasury Reserve routing failure to AlertRaised; manual override via AdminActionLogged

**Related Events:** OverrideCompressed, CommissionCalculated, ReserveUpdated

**Notes:** Treasury Reserve is the constitutional root node. The amount is recorded and never lost.

---
### CommissionRecovered

**Purpose:** Records the boundary point at which an agent who was previously inactive becomes ACTIVE and begins receiving override commissions again.

**Bounded Context:** Network

**Aggregate:** Agent (recovery tracking)

**Producer:** Network Engine

**Consumers:** Agent Dashboard (recovery report), Commission Engine, Override Ledger, Audit

**Trigger:** An INACTIVE agent makes a qualifying direct sale, triggering AgentActivated

**Preconditions:** Agent is INACTIVE; qualifying direct sale verified

**Postconditions:** Recovery event recorded; agent status becomes ACTIVE; future override commissions route to this agent; no retroactive re-crediting of historical compressed commissions

**Business Meaning:** The agent has re-earned active status. The system marks the recovery boundary for forward-looking commission routing.

**Event Category:** Business

**Ordering Requirements:** Per-agent; must follow AgentActivated

**Idempotency Requirements:** Keyed by eventId; one recovery per deactivation cycle

**Replay Requirements:** Replay reconstructs recovery timeline from agent state

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Agent ID, deactivation event reference, activation event reference, total lost override during inactive period (read-only metric)

**Failure Handling:** None; recovery is a side effect of AgentActivated

**Related Events:** AgentActivated, OverrideCompressed, AgentDeactivated

**Notes:** Recovery is forward-only per RNE Principle 8. Historical compressed commissions during the inactive period are NOT retroactively re-credited.

---

### IncentiveCredited

**Purpose:** Records that a non-commission incentive (bonus, reward, leadership pool share) has been credited to an agent.

**Bounded Context:** Network

**Aggregate:** Reward

**Producer:** Rewards Engine / Campaign Engine

**Consumers:** Agent Dashboard, Treasury, Ledger, Audit

**Trigger:** Periodic bonus calculation, campaign reward issuance, leadership pool distribution, NFT achievement

**Preconditions:** Agent is eligible per incentive rules; reward budget available; governance approval obtained (where required)

**Postconditions:** Reward amount credited to agent pending earnings; Treasury liability recorded; reward ledger updated

**Business Meaning:** The agent has earned a non-commission incentive for network activity, rank, or achievement.

**Event Category:** Core

**Ordering Requirements:** Per-agent eventual; per-incentive-batch strict

**Idempotency Requirements:** Keyed by eventId + rewardId; batch idempotency required

**Replay Requirements:** Replay recomputes incentive credits from the same qualifying sale and rank data; budget-aware

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Agent ID, incentive type, amount, basis reference, budget source, governance approval reference

**Failure Handling:** Budget exceeded to IncentiveCredited rejected; AlertRaised; Treasury Manager notified

**Related Events:** CommissionCalculated, AgentActivated, CampaignRewardIssued, RewardGranted

**Notes:** Incentives are non-commission by definition. They do not affect the commission_rate or override calculations. See REWARDS_AND_INCENTIVES.md.

---

---
## S3 - Commission Bounded Context
---

### CommissionCalculated

**Purpose:** Records that a commission has been calculated for an agent based on a qualifying sale.

**Bounded Context:** Commission

**Aggregate:** Commission

**Producer:** Network Engine / Commission Engine

**Consumers:** Treasury (pending settlement), Agent Dashboard, Override Ledger, Audit

**Trigger:** A qualifying sale completed; all qualifying conditions met (KYC, settlement, ownership, cooling, minimum value, no refund/cancellation)

**Preconditions:** Sale reference exists; agent identified via referral link; commission rate determined; qualifying conditions verified; compression routing computed

**Postconditions:** Commission record created in CALCULATED status; agent pending earnings increased; audit trail appended

**Business Meaning:** An agent has earned commission on a qualifying transaction. The amount is deterministic and auditable.

**Event Category:** Core

**Ordering Requirements:** Per-sale strict ordering; per-agent eventual

**Idempotency Requirements:** Keyed by eventId + saleId + agentId + commissionType; each combination calculated at most once

**Replay Requirements:** Replay must recompute commission deterministically from sale value, commission rate, and rank multipliers at time of sale

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Sale reference, agent ID, commission type (personal/override/rank/campaign), amount, rate, multiplier, compression chain (if override)

**Failure Handling:** Calculation error to CommissionCalculated not emitted; AlertRaised; manual intervention

**Related Events:** CommissionApproved, CommissionPaid, OverrideCompressed, CommissionReversed

**Notes:** Commission is always calculated server-side. The commission_rate from the Agent entity is the single authoritative base rate.

---

### CommissionApproved

**Purpose:** Records that a calculated commission has passed compliance and anti-fraud review and is approved for payment.

**Bounded Context:** Commission

**Aggregate:** Commission

**Producer:** Compliance / Commission Engine (auto-approval if below threshold)

**Consumers:** Treasury (scheduling), Agent Dashboard, Audit

**Trigger:** Compliance review passed; anti-fraud checks cleared; cooling period elapsed

**Preconditions:** Commission is in CALCULATED status; compliance review completed (auto or manual); no fraud flags raised

**Postconditions:** Commission status becomes APPROVED; queued for Treasury settlement; agent can see the approved amount

**Business Meaning:** The commission has been validated and is ready for settlement.

**Event Category:** Business

**Ordering Requirements:** Per-commission strict; must follow CommissionCalculated

**Idempotency Requirements:** Keyed by eventId; commission is approved at most once

**Replay Requirements:** Replay must replay compliance decisions from event data; auto-approval threshold is deterministic

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Commission ID, approver identity (system or human), approval rule reference, fraud check results

**Failure Handling:** Fraud detected to CommissionRejected instead of approved

**Related Events:** CommissionCalculated, CommissionPaid, CommissionRejected

**Notes:** Commissions below a configurable threshold may be auto-approved. Manual approval required above threshold.

---

### CommissionRejected

**Purpose:** Records that a commission failed compliance or anti-fraud review and will not be paid.

**Bounded Context:** Commission

**Aggregate:** Commission

**Producer:** Compliance / Commission Engine

**Consumers:** Agent Dashboard, Audit

**Trigger:** Compliance review or anti-fraud check failed

**Preconditions:** Commission is in CALCULATED status; compliance or fraud check determined disqualification

**Postconditions:** Commission status becomes REJECTED; no payment scheduled; agent notified

**Business Meaning:** The commission was invalidated due to compliance, fraud, or policy violation.

**Event Category:** Business

**Ordering Requirements:** Per-commission strict; must follow CommissionCalculated

**Idempotency Requirements:** Keyed by eventId; one rejection per commission

**Replay Requirements:** Replay reproduces rejection decision from the same evidence

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Commission ID, rejecting actor, reason, evidence references, appeal path

**Failure Handling:** N/A - terminal state

**Related Events:** CommissionCalculated, FraudDetected, ComplianceRejected

**Notes:** A rejected commission may be appealed (human process). On appeal success, a new CommissionCalculated is emitted.

---

### CommissionPaid

**Purpose:** Records that an approved commission has been settled and paid to the agent.

**Bounded Context:** Commission

**Aggregate:** Commission

**Producer:** Treasury / Settlement Service

**Consumers:** Agent Dashboard, Agent Ledger, Network Engine, Referral Campaign, Ledger, Audit

**Trigger:** Treasury settlement completed for the commission batch

**Preconditions:** Commission is in APPROVED status; Treasury funds available; payment settlement confirmed

**Postconditions:** Commission status becomes PAID; agent withdrawn earnings increased; Treasury ledger updated; Transaction appended

**Business Meaning:** The agent has been paid. The commission lifecycle is complete.

**Event Category:** Core

**Ordering Requirements:** Per-commission strict; must follow CommissionApproved

**Idempotency Requirements:** Keyed by eventId + commissionId; each commission paid at most once

**Replay Requirements:** Replay must not re-execute actual payment; payment status is restored from snapshot

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Commission ID, payment method, settlement amount, currency, tx_hash, FX snapshot reference, Treasury movement reference

**Failure Handling:** Settlement failure to CommissionPaid not emitted; AlertRaised; Treasury retry policy

**Related Events:** CommissionApproved, CommissionSettled, TreasuryMovementApproved, PaymentSettled

**Notes:** Payment may be batched per agent per period.

---

### CommissionReversed

**Purpose:** Records that a previously paid or approved commission has been reversed due to refund, cancellation, or fraud clawback.

**Bounded Context:** Commission

**Aggregate:** Commission

**Producer:** Network Engine / Treasury / Compliance

**Consumers:** Agent Dashboard, Agent Ledger, Treasury, Audit

**Trigger:** Underlying investment refunded or cancelled; fraud detected post-payment; compliance reversal order

**Preconditions:** Commission exists in PAID or APPROVED status; reversal reason validated

**Postconditions:** Commission status becomes REVERSED; offsetting entry created in Agent Ledger and Treasury; agent balance adjusted

**Business Meaning:** The commission is voided. Value is clawed back via offsetting entry (never mutation).

**Event Category:** Business

**Ordering Requirements:** Per-commission strict; must follow CommissionCalculated

**Idempotency Requirements:** Keyed by eventId; one reversal per commission; reversal of a REVERSED commission is rejected

**Replay Requirements:** Replay must apply reversal as an offsetting projection, never as a deletion

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Commission ID, reversal reason (refund/cancellation/fraud/compliance), source event reference, amount, offsetting transaction reference

**Failure Handling:** Clawback failure to AlertRaised; manual Treasury intervention via AdminActionLogged

**Related Events:** RefundCompleted, InvestmentRejected, InvestmentCancelled, FraudDetected, CommissionPaid

**Notes:** Reversal is an append-only operation. The original CommissionCalculated and CommissionPaid events remain immutable.

---

### CommissionAdjusted

**Purpose:** Records a manual adjustment to a commission amount (increase or decrease) due to an administrative correction.

**Bounded Context:** Commission

**Aggregate:** Commission

**Producer:** Admin Portal

**Consumers:** Agent Dashboard, Agent Ledger, Treasury, Audit

**Trigger:** Admin identifies commission calculation error and issues adjustment

**Preconditions:** Commission exists; adjustment reason provided; authorized actor (Administrator or above)

**Postconditions:** Commission amount modified via offsetting adjustment; agent pending/paid balance corrected; audit trail appended

**Business Meaning:** A commission calculation was incorrect and has been administratively corrected.

**Event Category:** Business

**Ordering Requirements:** Per-commission strict

**Idempotency Requirements:** Keyed by eventId; one adjustment per commission per reason

**Replay Requirements:** Replay must apply adjustment as an offsetting projection

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Commission ID, previous amount, new amount, delta, reason, actor identity, approval reference

**Failure Handling:** Unauthorized actor to reject before publish

**Related Events:** CommissionCalculated, CommissionReversed

**Notes:** Adjustments are exceptional and audit-logged. The original commission event is never modified.

---

### CommissionRefundAdjusted

**Purpose:** Records the commission impact of a partial refund on the underlying investment.

**Bounded Context:** Commission

**Aggregate:** Commission

**Producer:** Network Engine

**Consumers:** Agent Dashboard, Agent Ledger, Treasury, Audit

**Trigger:** Partial refund processed on an investment that generated commission

**Preconditions:** Investment partially refunded; original commission exists and was paid or approved

**Postconditions:** Commission amount proportionally reduced via offsetting entry; agent balance adjusted

**Business Meaning:** A partial refund has reduced the commissionable sale value, so commission is proportionally clawed back.

**Event Category:** Business

**Ordering Requirements:** Per-commission strict; must follow RefundCompleted

**Idempotency Requirements:** Keyed by eventId + refundId; one adjustment per refund event

**Replay Requirements:** Replay computes proportional adjustment from refund amount

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Commission ID, refund ID, original amount, adjusted amount, refund proportion, investment reference

**Failure Handling:** Commission already reversed to adjustment not applicable

**Related Events:** RefundCompleted, CommissionCalculated, CommissionReversed

**Notes:** Proportional adjustment ensures the agent commission correctly reflects the net economic value.

---

### CommissionRunStarted

**Purpose:** Records the beginning of a batch commission calculation run.

**Bounded Context:** Commission

**Aggregate:** Commission Run

**Producer:** Commission Engine

**Consumers:** Observability, Admin, Audit

**Trigger:** Scheduled or manual commission run initiated

**Preconditions:** No concurrent commission run active for the same scope

**Postconditions:** Run started; qualifying sales evaluated; per-agent commission calculation in progress

**Business Meaning:** A batch processing cycle has begun. Individual CommissionCalculated events will follow.

**Event Category:** System

**Ordering Requirements:** Per-run strict; chronological

**Idempotency Requirements:** Keyed by eventId + runId; run started at most once

**Replay Requirements:** Replay skips batch run events; individual commission events are sufficient

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard (90 days)

**Audit Requirements:** Run ID, scope (period/agent group), start timestamp, trigger (scheduled/manual)

**Failure Handling:** Run start failure to CommissionRunFailed emitted; retry policy

**Related Events:** CommissionRunCompleted, CommissionRunFailed, CommissionCalculated

**Notes:** Batch runs process all qualifying sales within a period.

---

### CommissionRunCompleted

**Purpose:** Records the successful completion of a batch commission calculation run.

**Bounded Context:** Commission

**Aggregate:** Commission Run

**Producer:** Commission Engine

**Consumers:** Observability, Admin, Treasury, Audit

**Trigger:** All qualifying sales in the run scope processed; all CommissionCalculated events emitted

**Preconditions:** CommissionRunStarted exists for this run; all sales within scope evaluated

**Postconditions:** Run marked complete; summary statistics available; downstream services can proceed

**Business Meaning:** The batch commission cycle completed successfully.

**Event Category:** System

**Ordering Requirements:** Per-run; must follow CommissionRunStarted

**Idempotency Requirements:** Keyed by runId; duplicate completion suppressed

**Replay Requirements:** Replay skips run events

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard (90 days)

**Audit Requirements:** Run ID, total commissions calculated, total amount, agent count, duration

**Failure Handling:** Partial failure to CommissionRunFailed

**Related Events:** CommissionRunStarted, CommissionRunFailed

**Notes:** Summary event for observability. The authoritative commission records are individual CommissionCalculated events.

---

### CommissionRunFailed

**Purpose:** Records that a batch commission calculation run encountered an unrecoverable error.

**Bounded Context:** Commission

**Aggregate:** Commission Run

**Producer:** Commission Engine

**Consumers:** Observability, Admin, Alert, Audit

**Trigger:** Unrecoverable error during batch commission processing

**Preconditions:** CommissionRunStarted exists; error condition met

**Postconditions:** Run marked failed; AlertRaised; manual intervention required; no commission events committed for unprocessed sales

**Business Meaning:** The commission batch could not complete. Human investigation required.

**Event Category:** System

**Ordering Requirements:** Per-run; must follow CommissionRunStarted

**Idempotency Requirements:** Keyed by runId; one failure event per run

**Replay Requirements:** Replay skips run events

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard (90 days)

**Audit Requirements:** Run ID, failure reason, error details, sales processed before failure checkpoint

**Failure Handling:** N/A - this is the failure event

**Related Events:** CommissionRunStarted, CommissionRunCompleted, AlertRaised

**Notes:** After recovery, a new run is started. The failed run already-emitted CommissionCalculated events remain valid.

---

### CommissionHeld

**Purpose:** Records that a commission payment has been temporarily withheld pending compliance review or dispute resolution.

**Bounded Context:** Commission

**Aggregate:** Commission

**Producer:** Compliance / Commission Engine

**Consumers:** Agent Dashboard, Treasury, Audit

**Trigger:** Compliance flag, dispute, or administrative hold on the commission

**Preconditions:** Commission is in APPROVED status; hold reason provided

**Postconditions:** Commission status becomes HELD; payment suspended; agent notified

**Event Category:** Business

**Ordering Requirements:** Per-commission strict

**Idempotency Requirements:** Keyed by eventId; held at most once per commission

**Security Classification:** Confidential

**Retention Classification:** Permanent

---

### CommissionReleased

**Purpose:** Records that a previously held commission has been released and is available for payment.

**Bounded Context:** Commission

**Aggregate:** Commission

**Producer:** Compliance / Commission Engine

**Consumers:** Agent Dashboard, Treasury, Audit

**Trigger:** Hold conditions resolved; compliance review cleared

**Preconditions:** Commission is in HELD status; hold reason resolved

**Postconditions:** Commission status becomes APPROVED; queued for payment

**Event Category:** Business

**Ordering Requirements:** Per-commission strict; must follow CommissionHeld

**Idempotency Requirements:** Keyed by eventId; released at most once per hold

**Security Classification:** Confidential

**Retention Classification:** Permanent

---

### CommissionRateChanged

**Purpose:** Records that an agent commission rate has been updated.

**Bounded Context:** Commission

**Aggregate:** CommissionRate

**Producer:** Admin Portal / Governance

**Consumers:** Commission Engine, Agent Dashboard, Audit

**Trigger:** Admin or governance changes the agent commission rate

**Preconditions:** Authorized actor; rate within allowed bounds

**Postconditions:** Commission rate updated; future commissions calculated at new rate

**Event Category:** Business

**Ordering Requirements:** Per-agent strict by effective date

**Idempotency Requirements:** Keyed by eventId; one rate change per version

**Security Classification:** Confidential

**Retention Classification:** Permanent

---

### OverrideRouteChanged

**Purpose:** Records a change to the override commission routing configuration for an agent or team.

**Bounded Context:** Commission

**Aggregate:** OverrideRoute

**Producer:** Admin Portal / Commission Engine

**Consumers:** Commission Engine, Agent Dashboard, Audit

**Trigger:** Team restructuring, agent status change, or admin reconfiguration

**Preconditions:** Valid override route defined; target agent ACTIVE

**Postconditions:** Override route updated; future overrides follow new route

**Event Category:** Business

**Ordering Requirements:** Per-agent strict

**Idempotency Requirements:** Keyed by eventId; one route change per version

**Security Classification:** Confidential

**Retention Classification:** Permanent

---

### BonusCalculated

**Purpose:** Records that a bonus amount has been calculated for an agent based on rank, leadership, or campaign performance.

**Bounded Context:** Commission

**Aggregate:** Commission (bonus type)

**Producer:** Commission Engine

**Consumers:** Agent Dashboard, Treasury, Audit

**Trigger:** Bonus qualification period ends; bonus criteria met

**Preconditions:** Agent met bonus criteria; bonus budget available

**Postconditions:** Bonus amount calculated; queued for approval and payment

**Event Category:** Business

**Ordering Requirements:** Per-agent per-period

**Idempotency Requirements:** Keyed by eventId + periodId

**Security Classification:** Confidential

**Retention Classification:** Permanent

---

### BonusPaid

**Purpose:** Records that a calculated bonus has been paid to the agent.

**Bounded Context:** Commission

**Aggregate:** Commission (bonus type)

**Producer:** Treasury / Settlement Service

**Consumers:** Agent Dashboard, Audit

**Trigger:** Bonus approved and Treasury settlement completed

**Preconditions:** Bonus is in APPROVED status; funds available

**Postconditions:** Bonus status becomes PAID; agent balance increased

**Event Category:** Core

**Ordering Requirements:** Per-bonus strict

**Idempotency Requirements:** Keyed by eventId; paid at most once

**Security Classification:** Confidential

**Retention Classification:** Permanent

---
---
## S4 - Qualification Bounded Context

**Purpose:** Determine whether a sale qualifies for commission attribution.

---

### QualifyingSaleVerified

**Purpose:** Records that a sale has passed all qualification checks (KYC, settlement, cooling period, minimum value) and qualifies for commission attribution.

**Bounded Context:** Qualification

**Aggregate:** QualifyingSale

**Producer:** Qualifying Service

**Consumers:** Commission Engine, Agent Dashboard, S3 Commission, Audit

**Trigger:** Sale event received; all qualification checks passed; cooling period completed

**Preconditions:** Payment settled; KYC approved; cooling period elapsed; minimum value met; no refund or cancellation

**Postconditions:** Sale marked as qualifying; commission calculation triggered; agent qualification metrics updated

**Business Meaning:** An economic event is now eligible for commission generation.

**Event Category:** Core

**Ordering Requirements:** Per-sale strict ordering by event timestamp

**Idempotency Requirements:** Keyed by saleId + eventId; each sale qualified at most once

**Replay Requirements:** Replay re-evaluates all qualification conditions deterministically from event data

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Sale ID, property ID, agent ID, investor ID, amount, qualification criteria met, timestamps

**Failure Handling:** Qualification check failure to sale held in pending queue; retry on condition changes

**Related Events:** CommissionCalculated, CoolingPeriodEnded, QualifyingCriteriaUpdated, AgentActivated

**Notes:** This event is the primary trigger for commission generation in S3 Commission. Multiple qualification checks run in sequence.

---

### QualifyingCriteriaUpdated

**Purpose:** Records a change to the criteria that determine whether a sale qualifies for commission.

**Bounded Context:** Qualification

**Aggregate:** QualifyingCriteria

**Producer:** Admin Portal / Governance

**Consumers:** Qualifying Service, Commission Engine, Audit

**Trigger:** Admin or governance updates minimum value, cooling period duration, or other qualification parameters

**Preconditions:** Authorized actor; criteria change governance-approved (if required)

**Postconditions:** Qualification criteria updated; existing pending sales re-evaluated against new criteria (if retroactive flag set)

**Business Meaning:** The rules for what constitutes a qualifying sale have changed.

**Event Category:** Business

**Ordering Requirements:** Global eventual consistency

**Idempotency Requirements:** Keyed by eventId + criteriaVersion; update applied exactly once per version

**Replay Requirements:** Replay applies criteria changes in order; pending sales at criteria change boundary re-evaluated

**Versioning Rules:** Additive fields only; retroactive flag controls re-evaluation scope

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Previous criteria, new criteria, changed fields, effective date, retroactive flag, actor identity

**Failure Handling:** Invalid criteria to reject before publish; pending sale re-evaluation is async

**Related Events:** QualifyingSaleVerified, GovernanceParameterUpdated

**Notes:** Criteria changes are versioned and may be applied retroactively or prospectively only. Retroactive changes trigger re-evaluation of all pending sales at the criteria boundary.

---

### CoolingPeriodEnded

**Purpose:** Records that the mandatory cooling period for a sale has elapsed, allowing the next qualification step to proceed.

**Bounded Context:** Qualification

**Aggregate:** QualifyingSale

**Producer:** Qualifying Service (scheduler or timer)

**Consumers:** Qualifying Service, Commission Engine, Audit

**Trigger:** Cooling period timer elapsed for a pending sale

**Preconditions:** Sale is in COOLING status; cooling period started at sale timestamp; cooling duration elapsed

**Postconditions:** Sale status becomes COOLED; qualification checks proceed to next step

**Business Meaning:** The legally-mandated cooling-off period has passed. The sale is no longer subject to unconditional cancellation.

**Event Category:** Business

**Ordering Requirements:** Per-sale strict; must follow QualifyingSaleVerified

**Idempotency Requirements:** Keyed by saleId + eventId; cooling ends at most once per sale

**Replay Requirements:** Replay computes cooling end from sale timestamp + cooling duration (event timestamp, not wall clock)

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard (90 days warm, permanent for compliance)

**Audit Requirements:** Sale ID, cooling start timestamp, cooling end timestamp, cooling duration configuration

**Failure Handling:** Timer failure to re-evaluated on next scheduler tick; AlertRaised if backlog exceeds threshold

**Related Events:** QualifyingSaleVerified, QualifyingCriteriaUpdated

**Notes:** Cooling period duration is a configurable parameter managed by QualifyingCriteriaUpdated. Jurisdiction-specific cooling rules may override the default.

---

### CoolingPeriodExtended

**Purpose:** Records that the cooling period for a sale has been extended due to regulatory requirements or compliance review.

**Bounded Context:** Qualification

**Aggregate:** QualifyingSale

**Producer:** Compliance Officer / System

**Consumers:** Qualifying Service, Agent Dashboard, Commission Engine, Audit

**Trigger:** Compliance requirement, regulatory hold, or manual extension by authorized compliance officer

**Preconditions:** Sale is in COOLING or PENDING status; reason for extension provided; authorized actor

**Postconditions:** Cooling period end recalculated; sale remains in pending qualification; all downstream processing delayed

**Business Meaning:** A regulatory or compliance condition requires additional time before the sale can be confirmed as qualifying.

**Event Category:** Business (Exceptional)

**Ordering Requirements:** Per-sale strict

**Idempotency Requirements:** Keyed by saleId + eventId; extension applied once per request

**Replay Requirements:** Replay applies extension with original reason and duration; does not re-trigger notifications

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Sale ID, original cooling end, new cooling end, extension reason, actor identity, compliance case reference

**Failure Handling:** Duplicate extension to logged and ignored

**Related Events:** CoolingPeriodEnded, ComplianceFlagRaised

**Notes:** Extensions are exceptional and must be justified. Extended cooling does not reset qualification checks already passed.

---
---
## S5 - Campaign Bounded Context
---

### ReferralCampaignLaunched

**Purpose:** Records that a new referral campaign has been created and activated.

**Bounded Context:** Campaign

**Aggregate:** Campaign

**Producer:** Admin Portal / Governance

**Consumers:** Network Engine, Agent Dashboard, Leaderboard, Notification, Audit

**Trigger:** Campaign created by Admin or Governance approval; start date reached

**Preconditions:** Campaign rules defined; reward budget allocated; start and end dates set; governance approval obtained (if required)

**Postconditions:** Campaign is active; agents can participate; conversion tracking enabled; leaderboard initialized

**Business Meaning:** A time-boxed incentive campaign is now live. Agent referrals during the campaign period may earn additional rewards.

**Event Category:** Business

**Ordering Requirements:** Per-campaign strict

**Idempotency Requirements:** Keyed by campaignId; campaign launched at most once

**Replay Requirements:** Replay must respect campaign time boundaries (use event timestamp, not wall clock)

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Campaign ID, ruleset, reward parameters, budget, budget source, start/end timestamps, approver identity

**Failure Handling:** Budget allocation failure to campaign launch rejected; AlertRaised

**Related Events:** CampaignRewardIssued, LeaderboardUpdated, ReferralConverted

**Notes:** Campaign evaluation is deterministic given the qualifying sale log and campaign rules.

---

### CampaignEnded

**Purpose:** Records that a referral campaign has ended.

**Bounded Context:** Campaign

**Aggregate:** Campaign

**Producer:** Campaign Engine (scheduler)

**Consumers:** Network Engine, Agent Dashboard, Leaderboard, Reward Engine, Audit

**Trigger:** Campaign end date reached; or campaign manually ended by Admin

**Preconditions:** Campaign is active; end condition met

**Postconditions:** Campaign status becomes ENDED; final leaderboard snapshot frozen; rewards calculated for distribution

**Business Meaning:** The campaign period is over. Final results are computed and rewards are queued.

**Event Category:** Business

**Ordering Requirements:** Per-campaign; must follow ReferralCampaignLaunched

**Idempotency Requirements:** Keyed by campaignId; campaign ended at most once

**Replay Requirements:** Replay must compute end from absolute timestamps, not relative duration; final leaderboard frozen

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Campaign ID, end reason (date reached / manual), final participant count, total rewards calculated

**Failure Handling:** Manual end requires authorized actor; auto-end uses scheduler

**Related Events:** ReferralCampaignLaunched, CampaignRewardIssued, LeaderboardUpdated

**Notes:** The frozen leaderboard snapshot at campaign end is immutable.

---

### CampaignRewardIssued

**Purpose:** Records that a campaign reward has been issued to an agent.

**Bounded Context:** Campaign

**Aggregate:** Campaign Reward

**Producer:** Campaign Engine / Reward Engine

**Consumers:** Agent Dashboard, Treasury, Network Engine, Leaderboard, Audit

**Trigger:** Campaign ended; reward calculation completed for the agent

**Preconditions:** Campaign ended; agent is eligible per campaign rules; reward amount within budget

**Postconditions:** Reward credited to agent; Treasury liability recorded; campaign budget reduced; leaderboard updated

**Business Meaning:** An agent has earned a campaign-specific reward in addition to standard commissions.

**Event Category:** Core

**Ordering Requirements:** Per-campaign batch eventual

**Idempotency Requirements:** Keyed by eventId + rewardId; each reward issued at most once

**Replay Requirements:** Replay recomputes campaign rewards from the same conversion data and campaign rules

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Reward ID, agent ID, campaign ID, amount, type, conversion references, budget source

**Failure Handling:** Budget exceeded to AlertRaised; governance approval required for override

**Related Events:** ReferralCampaignLaunched, ReferralConverted, IncentiveCredited, CommissionCalculated

**Notes:** Campaign rewards are separate from standard commissions.

---

### LeaderboardUpdated

**Purpose:** Records that a leaderboard snapshot has been generated or updated.

**Bounded Context:** Campaign

**Aggregate:** Leaderboard

**Producer:** Leaderboard Engine

**Consumers:** Agent Dashboard, Campaign Engine, Reward Engine, Recognition System, AI Copilot, Audit

**Trigger:** New qualifying sale processed; period boundary reached; manual refresh

**Preconditions:** Leaderboard period active; metric data available

**Postconditions:** Leaderboard snapshot generated; rankings recomputed; consumers notified

**Business Meaning:** The relative ranking of agents in a period has been recalculated.

**Event Category:** Business

**Ordering Requirements:** Per-period eventual

**Idempotency Requirements:** Keyed by eventId + snapshotId; snapshots are idempotent projections

**Replay Requirements:** Replay recomputes leaderboard snapshots from qualifying sale data

**Versioning Rules:** Additive fields only

**Security Classification:** Public (aggregated) / Confidential (detailed)

**Retention Classification:** Standard (365 days for period snapshots; Permanent for finalized periods)

**Audit Requirements:** Period identifier, snapshot timestamp, top-N entries (for verification), total participants

**Failure Handling:** Leaderboard computation failure to AlertRaised; previous snapshot retained

**Related Events:** QualificationAchieved, IncentiveCredited, ReferralConverted, RankAchieved

**Notes:** Leaderboard is a read model. The event signals that a new projection is available.

---
## S6 - Property Bounded Context
---

### PropertyCreated

**Purpose:** Records that a new property has been created in the system, in DRAFT status.

**Bounded Context:** Property

**Aggregate:** Property

**Producer:** Property Manager / Admin

**Consumers:** Marketplace (browse), Document Vault, Global Map, Audit

**Trigger:** Property form submitted by Property Manager

**Preconditions:** Actor has Property Manager role; property details complete; SPV reference established

**Postconditions:** Property record created in DRAFT status; not yet visible to investors

**Business Meaning:** A potential investment property has been added to the platform.

**Event Category:** Core

**Ordering Requirements:** Per-property strict

**Idempotency Requirements:** Keyed by propertyId; duplicate creation rejected

**Replay Requirements:** Full replay reconstructs property registry

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Property ID, creator identity, SPV reference, total tokens, token price, jurisdiction

**Failure Handling:** Validation failure to reject before publish

**Related Events:** PropertySubmitted, PropertyApproved, PropertyFundingStarted

**Notes:** Property lifecycle is governed by PROPERTY_STATE_MACHINE.md.

---

### PropertySubmitted

**Purpose:** Records that a property has been submitted for review and compliance approval.

**Bounded Context:** Property

**Aggregate:** Property

**Producer:** Property Manager

**Consumers:** Compliance, Valuation Engine, Document Vault, Audit

**Trigger:** Property Manager submits the property for approval

**Preconditions:** Property is in DRAFT status; all required documents attached; SPV documentation complete

**Postconditions:** Property status becomes REVIEW; compliance queue populated; valuation request initiated

**Business Meaning:** The property is under review.

**Event Category:** Business

**Ordering Requirements:** Per-property; must follow PropertyCreated

**Idempotency Requirements:** Keyed by propertyId; one submission per review cycle

**Replay Requirements:** Replay reconstructs review timeline

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Property ID, submitted documents list, SPV agreement reference, submission timestamp

**Failure Handling:** Missing documents to validation failure; reject before publish

**Related Events:** PropertyApproved, PropertyRejected, PropertyCreated

**Notes:** The REVIEW state is the compliance gate.

---

### PropertyApproved

**Purpose:** Records that a property has passed compliance, valuation, and review and is approved for funding.

**Bounded Context:** Property

**Aggregate:** Property

**Producer:** Compliance / Property Manager

**Consumers:** Marketplace, Global Map, Dividend Center, Audit

**Trigger:** Compliance review passed; valuation report accepted; all conditions satisfied

**Preconditions:** Property is in REVIEW status; KYC/legal/valuation cleared; documents verified

**Postconditions:** Property status becomes APPROVED; eligible for round configuration; visible as upcoming on marketplace

**Business Meaning:** The property has been cleared for investment.

**Event Category:** Core

**Ordering Requirements:** Per-property; must follow PropertySubmitted

**Idempotency Requirements:** Keyed by propertyId; one approval per review cycle

**Replay Requirements:** Replay reconstructs approval decisions from event data

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Property ID, approving actor, valuation reference, compliance checklist, conditions met

**Failure Handling:** Compliance failure to PropertyRejected instead

**Related Events:** PropertySubmitted, PropertyRejected, PropertyFundingStarted, RoundOpened

**Notes:** Approval does not automatically open rounds.

---

### PropertyRejected

**Purpose:** Records that a property failed review and was rejected.

**Bounded Context:** Property

**Aggregate:** Property

**Producer:** Compliance

**Consumers:** Property Manager, Audit

**Trigger:** Compliance or valuation review failed

**Preconditions:** Property is in REVIEW status; review determined disqualification

**Postconditions:** Property returns to DRAFT status; rejection reason recorded; Property Manager notified

**Business Meaning:** The property did not meet the platform standards.

**Event Category:** Business

**Ordering Requirements:** Per-property; must follow PropertySubmitted

**Idempotency Requirements:** Keyed by propertyId; one rejection per review cycle

**Replay Requirements:** Replay reconstructs rejection decisions

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Property ID, rejecting actor, reasons, evidence references

**Failure Handling:** N/A - terminal for the review cycle

**Related Events:** PropertySubmitted, PropertyApproved

**Notes:** Rejection is not final. The property may be revised and resubmitted.

---

### PropertyFundingStarted

**Purpose:** Records that a property funding round has opened and investments are now accepted.

**Bounded Context:** Property

**Aggregate:** Property

**Producer:** Property Manager (via round open)

**Consumers:** Marketplace (active listing), Global Map, Notification, Audit

**Trigger:** At least one round opened on the property; start date reached

**Preconditions:** Property is in APPROVED status; round(s) configured with caps, pricing, and timing; compliance conditions satisfied

**Postconditions:** Property status becomes FUNDING; visible as active on marketplace; investments accepted

**Business Meaning:** The property is now open for investment.

**Event Category:** Core

**Ordering Requirements:** Per-property; must follow PropertyApproved

**Idempotency Requirements:** Keyed by propertyId; funding started at most once per funding period

**Replay Requirements:** Replay reconstructs funding timeline

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Property ID, round details (type, caps, pricing), start timestamp, available tokens

**Failure Handling:** Round misconfiguration to AlertRaised; Property Manager notified

**Related Events:** PropertyApproved, PropertyFunded, PropertyPaused, RoundOpened, InvestmentStarted

**Notes:** Multiple rounds may sequence within a single FUNDING state.

---

### PropertyFunded

**Purpose:** Records that a property has reached its hard cap and is fully funded.

**Bounded Context:** Property

**Aggregate:** Property

**Producer:** Property Engine (investment counting)

**Consumers:** Marketplace, Global Map, Dividend Center, Portfolio, Governance, Valuation Engine, Audit

**Trigger:** sold_tokens equals total_tokens (hard cap reached)

**Preconditions:** Property is in FUNDING status; supply invariant satisfied; no available tokens remaining

**Postconditions:** Property status becomes FUNDED; investment closed; no new reservations or investments accepted

**Business Meaning:** The property raise is complete. The asset can proceed to operational status.

**Event Category:** Core

**Ordering Requirements:** Per-property; must follow PropertyFundingStarted

**Idempotency Requirements:** Keyed by propertyId; property funded at most once

**Replay Requirements:** Replay must compute sold_tokens equals total_tokens from ownership events

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Property ID, total raised, total tokens sold, final token price, timestamp

**Failure Handling:** Oversold detection to ComplianceFlagRaised; emergency pause; manual reconciliation

**Related Events:** PropertyFundingStarted, PropertyOperational, OwnershipMinted, InvestmentAllocated

**Notes:** PropertyFunded is a critical milestone.

---

### PropertyOperational

**Purpose:** Records that a funded property has been activated and is now operational.

**Bounded Context:** Property

**Aggregate:** Property

**Producer:** Property Manager

**Consumers:** Dividend Center, Valuation Engine, Global Map, Document Vault, Portfolio, Audit

**Trigger:** Asset activated; SPV operational; insurance in place

**Preconditions:** Property is in FUNDED status; SPV agreement executed; insurance active; property management in place

**Postconditions:** Property status becomes OPERATIONAL; rental and dividend sub-states may activate

**Business Meaning:** The asset is live and generating economic activity.

**Event Category:** Core

**Ordering Requirements:** Per-property; must follow PropertyFunded

**Idempotency Requirements:** Keyed by propertyId; property activated at most once

**Replay Requirements:** Replay reconstructs activation timeline

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Property ID, activation timestamp, SPV reference, insurance reference, property management agreement

**Failure Handling:** Activation requirements not met to AlertRaised; Property Manager notified

**Related Events:** PropertyFunded, RentalActivated, DividendActivated, PropertyArchived

**Notes:** OPERATIONAL is the steady-state.

---

### PropertyPaused

**Purpose:** Records that a property has been paused (funding or operations frozen).

**Bounded Context:** Property

**Aggregate:** Property

**Producer:** Compliance / Property Manager / Admin

**Consumers:** Marketplace (hide from active listings), Global Map, Investment Engine, Notification, Audit

**Trigger:** Compliance flag, operational issue, or administrative decision

**Preconditions:** Property is in FUNDING, OPERATIONAL, or sub-state; reason documented

**Postconditions:** Property status becomes PAUSED; new investments suspended (if FUNDING); operations suspended (if OPERATIONAL)

**Business Meaning:** The property is temporarily halted.

**Event Category:** Business

**Ordering Requirements:** Per-property; must follow current state

**Idempotency Requirements:** Keyed by propertyId; one pause per pause cycle

**Replay Requirements:** Replay reconstructs pause/resume timeline

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Property ID, pausing actor, reason, pause timestamp, affected operations

**Failure Handling:** Unauthorized actor to reject before publish

**Related Events:** PropertyResumed, PropertyDelisted, ComplianceFlagRaised

**Notes:** Pause is reversible via PropertyResumed.

---

### PropertyResumed

**Purpose:** Records that a paused property has been resumed and returned to its prior state.

**Bounded Context:** Property

**Aggregate:** Property

**Producer:** Compliance / Property Manager / Admin

**Consumers:** Marketplace, Global Map, Investment Engine, Notification, Audit

**Trigger:** Compliance flag resolved; operational issue resolved; administrative decision

**Preconditions:** Property is in PAUSED status; resumption conditions satisfied

**Postconditions:** Property returns to prior state; investments or operations resumed

**Business Meaning:** The property is no longer paused.

**Event Category:** Business

**Ordering Requirements:** Per-property; must follow PropertyPaused

**Idempotency Requirements:** Keyed by propertyId; one resume per pause cycle

**Replay Requirements:** Replay reconstructs resume timeline

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Property ID, resuming actor, reason, prior state

**Failure Handling:** Unauthorized actor to reject before publish

**Related Events:** PropertyPaused

**Notes:** Resume restores the property to its exact prior state.

---

### PropertyDelisted

**Purpose:** Records that a property has been permanently removed from the marketplace.

**Bounded Context:** Property

**Aggregate:** Property

**Producer:** Property Manager / Admin

**Consumers:** Marketplace (hide), Global Map, Portfolio, Document Vault, Audit

**Trigger:** Property lifecycle end; admin decision; compliance mandate

**Preconditions:** Property is not in FUNDING (unless force-delisted); all investments finalized; actor authorized

**Postconditions:** Property status becomes DELISTED; removed from marketplace browse; existing owners retain holdings

**Business Meaning:** The property is no longer available for new investment or trading.

**Event Category:** Business

**Ordering Requirements:** Per-property; must follow current state

**Idempotency Requirements:** Keyed by propertyId; property delisted at most once

**Replay Requirements:** Replay reconstructs delisting timeline

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Property ID, delisting actor, reason, existing owner count, total supply affected

**Failure Handling:** Active investments to delist blocked unless emergency; requires second approver

**Related Events:** PropertyArchived, PropertyPaused

**Notes:** DELISTED is not the terminal state; PropertyArchived is.

---

### PropertyArchived

**Purpose:** Records that a property has been archived and is now a historical record.

**Bounded Context:** Property

**Aggregate:** Property

**Producer:** Admin

**Consumers:** Global Map (historical layer), Audit

**Trigger:** Final closure; all distributions completed; asset disposed

**Preconditions:** Property is in DELISTED or terminal state; all dividends paid; all claims resolved

**Postconditions:** Property status becomes ARCHIVED; read-only historical record; no further state transitions possible

**Business Meaning:** The property lifecycle is complete.

**Event Category:** Business

**Ordering Requirements:** Per-property; terminal event

**Idempotency Requirements:** Keyed by propertyId; archived at most once

**Replay Requirements:** Replay stops at this event; no subsequent events expected

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Property ID, archiving actor, reason, final financial summary, dividend completion references

**Failure Handling:** Outstanding obligations to archive blocked; AlertRaised

**Related Events:** PropertyDelisted

**Notes:** ARCHIVED is the terminal state.

---

### RentalActivated

**Purpose:** Records that rental operations have begun for an operational property.

**Bounded Context:** Property

**Aggregate:** Property

**Producer:** Property Manager

**Consumers:** Dividend Center, Valuation Engine, Cashflow Engine, Portfolio, Audit

**Trigger:** Lease signed; first tenant moved in; rental income stream begins

**Preconditions:** Property is in OPERATIONAL status; lease agreement in place; rental collection mechanism active

**Postconditions:** Rental income sub-state activated; cashflow projections begin; yield calculations become meaningful

**Business Meaning:** The property is generating rental income.

**Event Category:** Business

**Ordering Requirements:** Per-property; must follow PropertyOperational

**Idempotency Requirements:** Keyed by propertyId; rental activated at most once per operational cycle

**Replay Requirements:** Replay reconstructs rental timeline

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Property ID, lease reference, rental terms, expected yield, activation timestamp

**Failure Handling:** No lease to RentalActivated not emitted

**Related Events:** PropertyOperational, DividendActivated, MaintenanceStarted

**Notes:** Rental operational is a sub-state of OPERATIONAL.

---

### MaintenanceStarted / MaintenanceEnded

**Purpose:** Records the start or end of a maintenance period for an operational property.

**Bounded Context:** Property

**Aggregate:** Property

**Producer:** Property Manager

**Consumers:** Dividend Center, Valuation Engine, Portfolio, Notification, Audit

**Trigger:** Maintenance window opened or closed

**Preconditions:** Property is in OPERATIONAL status; maintenance plan documented

**Postconditions:** Maintenance flag toggled; cashflow projections adjusted; investor notification sent

**Business Meaning:** The property is undergoing maintenance.

**Event Category:** Business

**Ordering Requirements:** Per-property; MaintenanceStarted before MaintenanceEnded

**Idempotency Requirements:** Keyed by propertyId + maintenanceId; one start/end per maintenance cycle

**Replay Requirements:** Replay reconstructs maintenance timeline

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard (365 days)

**Audit Requirements:** Property ID, maintenance ID, type, duration, estimated cost, impact assessment

**Failure Handling:** Maintenance overrun to AlertRaised; extended via new MaintenanceStarted

**Related Events:** PropertyOperational, RentalActivated, DividendActivated

**Notes:** Maintenance does not change the primary property status (remains OPERATIONAL).

---
## S7 - Primary Investment Bounded Context
---

### InvestmentStarted

**Purpose:** Records that an investor has initiated a new primary-market investment.

**Bounded Context:** Primary Investment

**Aggregate:** Investment

**Producer:** Marketplace / Investment Engine

**Consumers:** Reservation Engine, Notification, Audit

**Trigger:** Investor submits investment request for an active property

**Preconditions:** Investor KYC approved; property in FUNDING or APPROVED status; requested tokens less than or equal to available tokens; minimum investment met; wallet verified

**Postconditions:** Investment created in PENDING status; reservation process may begin

**Business Meaning:** An investor has expressed intent to purchase tokens.

**Event Category:** Core

**Ordering Requirements:** Per-investment strict

**Idempotency Requirements:** Keyed by eventId + investmentId; duplicate initiation rejected

**Replay Requirements:** Full replay reconstructs all investment lifecycles

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Investor ID, property ID, requested tokens, amount, currency, price per token

**Failure Handling:** Validation failure (KYC, supply, minimum) to reject before publish

**Related Events:** ReservationCreated, InvestmentCancelled, InvestmentComplete

**Notes:** This is the first event in the investment lifecycle.

---

### ReservationCreated

**Purpose:** Records that a token allocation has been temporarily reserved for an investor during a scarce round.

**Bounded Context:** Primary Investment

**Aggregate:** Investment

**Producer:** Investment Engine

**Consumers:** Waiting List, Notification, Portfolio (reserved view), Audit

**Trigger:** Investment round requires reservation; allocation held

**Preconditions:** Investment is in PENDING; round has reservation requirement; available tokens sufficient

**Postconditions:** Investment status becomes RESERVED; tokens held for investor; TTL started

**Business Meaning:** Tokens are provisionally allocated to the investor.

**Event Category:** Business

**Ordering Requirements:** Per-investment; must follow InvestmentStarted

**Idempotency Requirements:** Keyed by eventId + investmentId; one reservation per investment

**Replay Requirements:** Replay must respect TTL from event timestamp, not wall clock

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Investment ID, reserved tokens, TTL, round allocation strategy

**Failure Handling:** Insufficient tokens to reservation rejected; ReservationExpired emitted

**Related Events:** InvestmentStarted, ReservationExpired, WaitingListPromoted

**Notes:** Reservation is optional; direct-pay rounds skip this state.

---

### ReservationExpired

**Purpose:** Records that a token reservation has expired without payment.

**Bounded Context:** Primary Investment

**Aggregate:** Investment

**Producer:** Investment Engine

**Consumers:** Waiting List (promote next), Property (return available_tokens), Notification, Audit

**Trigger:** Reservation TTL passed without payment confirmation

**Preconditions:** Investment is in RESERVED; payment not received within TTL

**Postconditions:** Investment status becomes CANCELLED (reason: expired); reserved tokens returned to available supply; waiting list promoted

**Business Meaning:** The investor did not complete payment within the reservation window.

**Event Category:** Business

**Ordering Requirements:** Per-investment; must follow ReservationCreated

**Idempotency Requirements:** Keyed by eventId + investmentId; one expiration per reservation

**Replay Requirements:** Replay must compute TTL expiry from event timestamps, not wall clock

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Investment ID, reserved tokens expired, TTL duration

**Failure Handling:** Scheduler failure to delayed expiry compensated on next cycle

**Related Events:** ReservationCreated, InvestmentCancelled, WaitingListPromoted

**Notes:** The investor may restart the investment process.

---

### SettlementCompleted

**Purpose:** Records that payment has been received, verified, and settled for an investment.

**Bounded Context:** Primary Investment

**Aggregate:** Payment / Settlement

**Producer:** Payment / Settlement Worker

**Consumers:** Investment Engine (to PAID), Escrow Ledger, Treasury, Commission Engine, Audit

**Trigger:** On-chain transaction confirmed; PSP webhook received; bank transfer reconciled

**Preconditions:** Investment is in AWAITING_PAYMENT; tx_hash verified on-chain; payment amount matches expected

**Postconditions:** Investment status becomes PAID; funds moved to escrow; Transaction appended; compliance review can begin

**Business Meaning:** Payment has been successfully received and verified.

**Event Category:** Core

**Ordering Requirements:** Per-investment; must follow AWAITING_PAYMENT state

**Idempotency Requirements:** Keyed by eventId + paymentId + tx_hash; each payment settled at most once

**Replay Requirements:** Replay must not re-verify on-chain transactions; settlement status restored from snapshot

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Payment ID, investment ID, method, amount, currency, FX snapshot, tx_hash (if on-chain), PSP reference (if fiat)

**Failure Handling:** Payment verification failure to PaymentFailed emitted; retry or refund

**Related Events:** InvestmentStarted, InvestmentAllocated, PaymentFailed, RefundInitiated, TreasuryMovementApproved

**Notes:** Settlement is the critical payment gate.

---

### ComplianceReviewStarted

**Purpose:** Records that an investment has entered compliance review after payment settlement.

**Bounded Context:** Primary Investment

**Aggregate:** Investment

**Producer:** Investment Engine

**Consumers:** Compliance, Audit

**Trigger:** Settlement completed; investment automatically queued for compliance review

**Preconditions:** Investment is in PAID status; payment settled; investor identity verified

**Postconditions:** Investment status becomes COMPLIANCE_REVIEW; compliance officer queue populated

**Business Meaning:** The investment requires KYC, AML, and source-of-funds checks before allocation.

**Event Category:** Business

**Ordering Requirements:** Per-investment; must follow SettlementCompleted

**Idempotency Requirements:** Keyed by investmentId; one compliance review per investment

**Replay Requirements:** Replay reconstructs review timeline

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Investment ID, review scope, auto-pass indicator, risk score at review time

**Failure Handling:** Compliance system unavailable to retry; AlertRaised if backlog exceeds threshold

**Related Events:** SettlementCompleted, InvestmentAllocated, InvestmentRejected, ComplianceApproved, ComplianceRejected

**Notes:** Low-risk investments may be auto-approved.

---

### InvestmentAllocated

**Purpose:** Records that compliance review passed and tokens have been allocated to the investor.

**Bounded Context:** Primary Investment

**Aggregate:** Investment

**Producer:** Investment Engine / Compliance

**Consumers:** Ownership Engine (mint tokens), Treasury (settle funds), Commission Engine, Portfolio, Governance, Dividend Center, Audit

**Trigger:** Compliance review passed (auto or manual)

**Preconditions:** Investment is in COMPLIANCE_REVIEW or APPROVED; KYC/AML/SOF cleared; available tokens sufficient

**Postconditions:** Investment status becomes APPROVED; tokens allocated to investor; OwnershipMinted queued; commission calculated

**Business Meaning:** The investment has passed all gates. The investor becomes a fractional owner.

**Event Category:** Core

**Ordering Requirements:** Per-investment; must follow ComplianceReviewStarted

**Idempotency Requirements:** Keyed by eventId + investmentId; each investment allocated at most once

**Replay Requirements:** Replay must re-evaluate allocation deterministically from compliance state at allocation time

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Investment ID, allocated tokens, price per token, total amount, compliance review reference, risk score

**Failure Handling:** Token supply exhausted to InvestmentRejected; refund initiated

**Related Events:** ComplianceReviewStarted, OwnershipMinted, CommissionCalculated, InvestmentComplete, InvestmentRejected

**Notes:** InvestmentAllocated is the most consequential event in the investment lifecycle.

---

### InvestmentComplete

**Purpose:** Records that all post-allocation processing has finished.

**Bounded Context:** Primary Investment

**Aggregate:** Investment

**Producer:** Investment Engine

**Consumers:** Portfolio, Notification, Document Vault (certificate), Audit

**Trigger:** Ownership allocation confirmed; ledgers updated; all downstream events emitted

**Preconditions:** Investment is in APPROVED status; OwnershipMinted emitted; CommissionCalculated emitted; ledgers written

**Postconditions:** Investment status becomes COMPLETED; investment lifecycle terminal

**Business Meaning:** The investment is fully complete.

**Event Category:** Core

**Ordering Requirements:** Per-investment; terminal event following InvestmentAllocated

**Idempotency Requirements:** Keyed by investmentId; investment completed at most once

**Replay Requirements:** Replay completes at this event for the investment

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Investment ID, ownership reference, commission references, timestamp

**Failure Handling:** Post-allocation failure to InvestmentComplete delayed; AlertRaised

**Related Events:** InvestmentAllocated, OwnershipMinted, CommissionCalculated

**Notes:** This is the successful terminal state for investments.

---

### InvestmentRejected

**Purpose:** Records that an investment failed compliance review and was rejected.

**Bounded Context:** Primary Investment

**Aggregate:** Investment

**Producer:** Compliance / Investment Engine

**Consumers:** Refund Worker, Notification, Audit

**Trigger:** Compliance review failed; risk score too high; KYC/AML/SOF failure

**Preconditions:** Investment is in COMPLIANCE_REVIEW; compliance determined disqualification

**Postconditions:** Investment status becomes REJECTED; refund initiated (if funds were settled)

**Business Meaning:** The investment did not pass compliance.

**Event Category:** Business

**Ordering Requirements:** Per-investment; must follow ComplianceReviewStarted

**Idempotency Requirements:** Keyed by investmentId; one rejection per investment

**Replay Requirements:** Replay reconstructs rejection decision from compliance data

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Investment ID, rejection reason, compliance references, risk score, rejecting actor

**Failure Handling:** N/A - terminal state (except refund)

**Related Events:** ComplianceReviewStarted, RefundInitiated, ComplianceRejected, InvestmentStarted

**Notes:** After rejection and refund, the investor may initiate a new investment.

---

### InvestmentCancelled

**Purpose:** Records that an investment was cancelled before payment or allocation.

**Bounded Context:** Primary Investment

**Aggregate:** Investment

**Producer:** Investor / Investment Engine / Admin

**Consumers:** Reservation Engine (release allocation), Waiting List, Notification, Audit

**Trigger:** Investor cancels; reservation expires; admin cancels; payment TTL expired

**Preconditions:** Investment is in PENDING, RESERVED, or AWAITING_PAYMENT status

**Postconditions:** Investment status becomes CANCELLED; any reservation released; available tokens restored

**Business Meaning:** The investment was terminated before completion.

**Event Category:** Business

**Ordering Requirements:** Per-investment; must be in pre-PAID state

**Idempotency Requirements:** Keyed by investmentId; one cancellation per investment

**Replay Requirements:** Replay reconstructs cancellation timeline

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Investment ID, cancellation reason, cancelling actor, pre-cancellation status

**Failure Handling:** Post-PAID cancellation to must go through refund flow

**Related Events:** InvestmentStarted, ReservationCreated, ReservationExpired, RefundInitiated

**Notes:** Cancellation is only valid before payment.

---

### RefundInitiated

**Purpose:** Records that a refund process has been started for a paid investment.

**Bounded Context:** Primary Investment

**Aggregate:** Payment / Refund

**Producer:** Treasury / Refund Worker

**Consumers:** Investment Engine, Ledger, Notification, Audit

**Trigger:** Investment rejected after payment; Investment cancelled after payment; compliance reversal

**Preconditions:** Investment is in PAID, APPROVED, or COMPLETED status; refund amount determined

**Postconditions:** Refund process initiated; funds queued for return

**Business Meaning:** Funds are being returned to the investor.

**Event Category:** Business

**Ordering Requirements:** Per-investment; must follow a post-PAID state

**Idempotency Requirements:** Keyed by eventId + refundId; refund initiated at most once per investment

**Replay Requirements:** Replay must not re-execute actual refund; refund state restored from snapshot

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Investment ID, refund amount, currency, method, reason, original tx_hash, actor

**Failure Handling:** Insufficient treasury funds to AlertRaised; manual intervention

**Related Events:** InvestmentRejected, InvestmentCancelled, RefundCompleted, CommissionReversed

**Notes:** Refund is a business process, not just a technical reversal.

---

### RefundCompleted

**Purpose:** Records that a refund has been successfully executed and funds returned to the investor.

**Bounded Context:** Primary Investment

**Aggregate:** Payment / Refund

**Producer:** Treasury / Refund Worker

**Consumers:** Investment Engine, Ledger, Ownership (reclaim if allocated), Commission Engine (reversal), Notification, Audit

**Trigger:** On-chain refund confirmed; PSP refund processed; bank transfer completed

**Preconditions:** RefundInitiated exists; funds returned to investor; ownership reclaimed (if allocated)

**Postconditions:** Investment status becomes REFUNDED; ownership balance reduced (if allocated); commissions reversed

**Business Meaning:** The refund is complete.

**Event Category:** Core

**Ordering Requirements:** Per-investment; must follow RefundInitiated

**Idempotency Requirements:** Keyed by eventId + refundId; refund completed at most once

**Replay Requirements:** Replay must restore refund completed state without re-executing the transfer

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Refund ID, investment ID, refund amount, method, tx_hash (if on-chain), ownership adjustment reference, commission reversal references

**Failure Handling:** Refund execution failure to retry policy; AlertRaised on repeated failure

**Related Events:** RefundInitiated, CommissionReversed, InvestmentRejected, OwnershipReclaimed

**Notes:** Refund is the terminal state for reversed investments.

---

### RoundOpened

**Purpose:** Records that a funding round has been opened for investment.

**Bounded Context:** Primary Investment

**Aggregate:** Round

**Producer:** Property Manager

**Consumers:** Marketplace, Investment Engine, Waiting List, Notification, Audit

**Trigger:** Round start date reached; round manually opened by Property Manager

**Preconditions:** Property is in APPROVED or FUNDING status; round terms defined

**Postconditions:** Round is active; investments accepted; allocation strategy activated

**Business Meaning:** A new funding round is available.

**Event Category:** Business

**Ordering Requirements:** Per-property strict; rounds ordered by sequence

**Idempotency Requirements:** Keyed by roundId; round opened at most once

**Replay Requirements:** Replay reconstructs round timeline

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Round ID, property ID, type (private/whitelist/public), soft cap, hard cap, pricing, allocation strategy, dates

**Failure Handling:** Round misconfiguration to open rejected; AlertRaised

**Related Events:** RoundClosed, PropertyFundingStarted, InvestmentStarted

**Notes:** Multiple rounds may be sequenced within a single FUNDING state.

---

### RoundClosed

**Purpose:** Records that a funding round has been closed.

**Bounded Context:** Primary Investment

**Aggregate:** Round

**Producer:** Investment Engine / Property Manager

**Consumers:** Marketplace, Investment Engine, Notification, Audit

**Trigger:** Hard cap reached; end date passed; manually closed

**Preconditions:** Round is active; close condition met

**Postconditions:** Round closed; no new investments accepted

**Business Meaning:** The round is no longer accepting investments.

**Event Category:** Business

**Ordering Requirements:** Per-round; must follow RoundOpened

**Idempotency Requirements:** Keyed by roundId; round closed at most once

**Replay Requirements:** Replay reconstructs round closure from cap/date conditions

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Round ID, property ID, reason (cap reached / expired / manual), total raised in round, final price

**Failure Handling:** Manual close requires authorized actor

**Related Events:** RoundOpened, PropertyFunded

**Notes:** Round closure does not imply property is fully funded.

---

# S8 — Secondary Market

The Secondary Market bounded context governs the resale of fractional property tokens between investors after the primary issuance. It manages listings, offers, escrow, and settlement of secondary trades. All secondary market events are authoritative records of trading activity and must be auditable for market integrity.

---

### MarketplaceListingCreated

**Purpose:** Records that an investor has listed a quantity of fractional tokens for sale on the secondary market.

**Bounded Context:** Secondary Market

**Aggregate:** MarketplaceListing

**Producer:** Marketplace Engine

**Consumers:** Discovery, Watchlist, Portfolio, Notification, Audit

**Trigger:** Investor submits a sell listing

**Preconditions:** Investor owns at least the listed quantity of tokens; property is tradeable (not paused/frozen)

**Postconditions:** Listing created in ACTIVE state; available supply adjusted on order book

**Business Meaning:** A sell-side order has been opened on the secondary market.

**Event Category:** Business

**Ordering Requirements:** Per-listing; no strict ordering constraints

**Idempotency Requirements:** Keyed by listingId; listing created at most once

**Replay Requirements:** Replay reconstructs the listing book from creation events

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Investor ID, property ID, fraction ID, quantity listed, price per token, listing type (limit/market/negotiation), timestamp

**Failure Handling:** Create failure returns funds to available balance; AlertRaised on persistence failure

**Related Events:** MarketplaceListingUpdated, MarketplaceListingCancelled, MarketplaceSaleCompleted

**Notes:** Fractional token listings may be partial (investor retains remaining balance).

---

### MarketplaceListingUpdated

**Purpose:** Records a change to an existing secondary market listing (price, quantity, duration).

**Bounded Context:** Secondary Market

**Aggregate:** MarketplaceListing

**Producer:** Marketplace Engine

**Consumers:** Discovery, Watchlist, Audit

**Trigger:** Seller modifies price, quantity, or duration of an active listing

**Preconditions:** Listing is in ACTIVE state; no active offers pending

**Postconditions:** Listing parameters updated; order book refreshed

**Business Meaning:** The seller has adjusted the terms of their sell order.

**Event Category:** Business

**Ordering Requirements:** Per-listing; sequential updates preserve intent

**Idempotency Requirements:** Keyed by listingId + sequence number

**Replay Requirements:** Replay applies each delta in sequence to reconstruct listing state

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Previous price, new price, previous quantity, new quantity, actor ID

**Failure Handling:** Concurrent update conflicts resolved via optimistic concurrency; retry on conflict

**Related Events:** MarketplaceListingCreated, MarketplaceListingCancelled

**Notes:** Price reductions are unrestricted; price increases may have cooling period per compliance rules.

---

### MarketplaceListingCancelled

**Purpose:** Records that a seller has cancelled an active listing or that a listing has expired.

**Bounded Context:** Secondary Market

**Aggregate:** MarketplaceListing

**Producer:** Marketplace Engine

**Consumers:** Discovery, Watchlist, Portfolio, Notification, Audit

**Trigger:** Seller cancels listing; listing TTL expires; property paused or delisted

**Preconditions:** Listing is in ACTIVE state

**Postconditions:** Listing moved to CANCELLED or EXPIRED state; tokens returned to seller available balance

**Business Meaning:** The sell order has been withdrawn. The listed tokens are no longer available for purchase.

**Event Category:** Business

**Ordering Requirements:** Per-listing; must follow MarketplaceListingCreated

**Idempotency Requirements:** Keyed by listingId; cancelled at most once

**Replay Requirements:** Replay returns listing to cancelled state regardless of prior updates

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Reason code (seller/expired/admin/compliance), actor ID if applicable, timestamp

**Failure Handling:** Cancel failure prevents listing modification; retry with exponential backoff

**Related Events:** MarketplaceListingCreated, MarketplaceListingUpdated

**Notes:** Compliance-forced cancellations must reference the compliance case ID.

---

### OfferCreated

**Purpose:** Records that a buyer has submitted a purchase offer on an active listing.

**Bounded Context:** Secondary Market

**Aggregate:** Offer

**Producer:** Marketplace Engine

**Consumers:** Notification, Seller Dashboard, Audit

**Trigger:** Buyer submits offer on a listing

**Preconditions:** Listing is ACTIVE; buyer KYC approved; buyer available balance sufficient

**Postconditions:** Offer created in PENDING state; buyer funds placed in soft hold; seller notified

**Business Meaning:** A binding意向 to purchase at a specified price has been recorded.

**Event Category:** Business

**Ordering Requirements:** Per-offer; on listing for offer sequencing

**Idempotency Requirements:** Keyed by offerId; offer created at most once

**Replay Requirements:** Replay reconstructs offer book per listing

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Buyer ID, listing ID, offered price, quantity, currency, expiry timestamp, terms hash

**Failure Handling:** Offer creation failure releases soft hold; AlertRaised on system error

**Related Events:** OfferAccepted, OfferWithdrawn, OfferRejected

**Notes:** Offers may be below, at, or above listing price. Sellers may accept, reject, or counter (counter creates new offer).

---

### OfferAccepted

**Purpose:** Records that a seller has accepted a buyer offer, binding both parties to the trade.

**Bounded Context:** Secondary Market

**Aggregate:** Offer

**Producer:** Marketplace Engine

**Consumers:** Escrow Service, Settlement, Notification, Portfolio, Audit

**Trigger:** Seller accepts offer

**Preconditions:** Offer is PENDING; listing is ACTIVE; offer not expired; buyer funds still available

**Postconditions:** Offer moved to ACCEPTED state; escrow initiated; both parties notified

**Business Meaning:** A binding trade agreement has been reached. The settlement process begins.

**Event Category:** Business

**Ordering Requirements:** Per-offer; must follow OfferCreated

**Idempotency Requirements:** Keyed by offerId; accepted at most once

**Replay Requirements:** Replay transitions offer to accepted and triggers escrow settlement

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Seller ID, accepted price, acceptance timestamp, settlement reference

**Failure Handling:** Escrow initiation failure puts offer in PENDING_ESCROW; retry with backoff; AlertRaised if threshold exceeded

**Related Events:** OfferCreated, EscrowHeld, MarketplaceSaleCompleted

**Notes:** Acceptance is irrevocable. Cooling period applies per jurisdiction requirements.

---

### OfferWithdrawn

**Purpose:** Records that a buyer has withdrawn their offer before acceptance.

**Bounded Context:** Secondary Market

**Aggregate:** Offer

**Producer:** Marketplace Engine

**Consumers:** Notification, Seller Dashboard, Audit

**Trigger:** Buyer withdraws offer before seller acceptance

**Preconditions:** Offer is PENDING; not yet accepted

**Postconditions:** Offer moved to WITHDRAWN state; soft hold released; seller notified

**Business Meaning:** The buyer has rescinded their offer. No trade proceeds.

**Event Category:** Business

**Ordering Requirements:** Per-offer; must follow OfferCreated

**Idempotency Requirements:** Keyed by offerId; withdrawn at most once

**Replay Requirements:** Replay marks offer withdrawn and releases hold

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Buyer ID, reason code, withdrawal timestamp

**Failure Handling:** Withdraw failure escalates to admin; user-facing timeout handles edge cases

**Related Events:** OfferCreated, OfferRejected

**Notes:** Withdrawal after acceptance is not permitted; must use cancellation flow.

---

### OfferRejected

**Purpose:** Records that a seller has explicitly rejected a buyer offer.

**Bounded Context:** Secondary Market

**Aggregate:** Offer

**Producer:** Marketplace Engine

**Consumers:** Notification, Buyer Dashboard, Audit

**Trigger:** Seller explicitly rejects offer

**Preconditions:** Offer is PENDING

**Postconditions:** Offer moved to REJECTED state; soft hold released; buyer notified

**Business Meaning:** The seller has declined the offer. No further action.

**Event Category:** Business

**Ordering Requirements:** Per-offer; must follow OfferCreated

**Idempotency Requirements:** Keyed by offerId; rejected at most once

**Replay Requirements:** Replay marks offer rejected

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Seller ID, rejection reason (optional), timestamp

**Failure Handling:** Rejection failure does not block seller; retry on system error

**Related Events:** OfferCreated, OfferWithdrawn

**Notes:** Rejection does not affect the listing; the seller may receive future offers.

---

### EscrowHeld

**Purpose:** Records that buyer funds have been placed in escrow for a secondary market trade.

**Bounded Context:** Secondary Market

**Aggregate:** Escrow

**Producer:** Settlement Service

**Consumers:** Treasury, Ledger, Notification, Audit

**Trigger:** Offer accepted; settlement worker initiates escrow hold

**Preconditions:** Offer is ACCEPTED; buyer funds confirmed available

**Postconditions:** Buyer funds held in escrow; escrow record created in HELD state; ownership transfer pending

**Business Meaning:** Consideration for the trade has been secured in escrow, protecting both parties.

**Event Category:** Core

**Ordering Requirements:** Per-escrow; must follow OfferAccepted

**Idempotency Requirements:** Keyed by escrowId + offerId; hold applied at most once

**Replay Requirements:** Replay creates escrow hold; reconcile with current balance

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Escrow ID, offer ID, amount held, currency, source account, destination account, held timestamp

**Failure Handling:** Insufficient funds leads to OfferFailed; escrow service retries on transient failure; AlertRaised on persistent failure

**Related Events:** OfferAccepted, EscrowReleased, MarketplaceSaleCompleted

**Notes:** Escrow is released on settlement or returned on sale failure.

---

### EscrowReleased

**Purpose:** Records that escrowed funds have been released to the seller upon successful settlement.

**Bounded Context:** Secondary Market

**Aggregate:** Escrow

**Producer:** Settlement Service

**Consumers:** Treasury, Ledger, Portfolio, Commission Engine, Notification, Audit

**Trigger:** Ownership transfer confirmed; settlement completes

**Preconditions:** Escrow is HELD; ownership transfer successful; commission deducted

**Postconditions:** Escrow moved to RELEASED state; funds transferred to seller minus commissions; buyer receives ownership; commission amounts distributed

**Business Meaning:** The trade settlement is complete. Funds have moved from buyer to seller.

**Event Category:** Core

**Ordering Requirements:** Per-escrow; must follow EscrowHeld

**Idempotency Requirements:** Keyed by escrowId; released at most once

**Replay Requirements:** Replay releases escrow and applies fund movements; reconcile with ledger state

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Release amount, seller net amount, commission amounts, commission recipients, transaction hash (if on-chain), released timestamp

**Failure Handling:** Release failure locks funds in escrow; retry with backoff; admin escalation after max retries

**Related Events:** EscrowHeld, MarketplaceSaleCompleted, CommissionCalculated

**Notes:** Commission is deducted at release time per the Commission constitution secondary rate. Net seller amount = sale amount - commission - applicable fees.

---

### MarketplaceSaleCompleted

**Purpose:** Records that a secondary market trade has been fully executed and settled.

**Bounded Context:** Secondary Market

**Aggregate:** MarketplaceSale

**Producer:** Marketplace Engine

**Consumers:** Ownership, Portfolio, Treasury, Commission Engine, Governance, Notification, Audit

**Trigger:** Escrow released and ownership transferred

**Preconditions:** Escrow released; ownership transfer confirmed

**Postconditions:** Sale marked COMPLETED; trade recorded in transaction ledger; both parties have final positions

**Business Meaning:** A secondary market trade has been fully and finally settled. Ownership change is legally effective.

**Event Category:** Core

**Ordering Requirements:** Per-sale; must follow OfferAccepted and EscrowReleased

**Idempotency Requirements:** Keyed by saleId; completed at most once

**Replay Requirements:** Replay completes the sale; verify ownership balance consistency against events

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Sale ID, listing ID, buyer ID, seller ID, property ID, quantity, price per token, total amount, commission total, fees, settlement timestamp, escrow reference, transaction identifier

**Failure Handling:** Completion failure triggers reconciliation; manual intervention may be required; AlertRaised

**Related Events:** OfferAccepted, EscrowHeld, EscrowReleased, OwnershipTransferred, CommissionCalculated

**Notes:** This is the terminal event for a secondary trade. All downstream projections (Portfolio, Governance voting power, Dividend eligibility) update on this event.

---

### MarketplaceSaleCancelled

**Purpose:** Records that a secondary market sale was cancelled before completion.

**Bounded Context:** Secondary Market

**Aggregate:** MarketplaceSale

**Producer:** Marketplace Engine

**Consumers:** Notification, Portfolio (hold release), Treasury (funds return), Audit

**Trigger:** Offer expired; compliance block; mutual cancellation; buyer or seller failure

**Preconditions:** Sale is in PENDING or ACCEPTED state; not yet COMPLETED

**Postconditions:** Sale marked CANCELLED; escrow returned to buyer; listing restored (if applicable)

**Business Meaning:** The trade did not complete. All parties restored to pre-trade positions.

**Event Category:** Business

**Ordering Requirements:** Per-sale; must follow MarketplaceSaleStarted but precede MarketplaceSaleCompleted

**Idempotency Requirements:** Keyed by saleId; cancelled at most once

**Replay Requirements:** Replay cancels the sale and reverses escrow; reconcile balances

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Cancellation reason code, actor ID (if manual), escrow reversal reference, timestamp

**Failure Handling:** Escrow reversal failure requires admin intervention; AlertRaised

**Related Events:** MarketplaceSaleCompleted, EscrowHeld, OfferAccepted

**Notes:** Cancellation after ownership transfer is not possible except through a new trade.

---

### SecondaryPriceUpdated

**Purpose:** Records the current market price for a property token on the secondary market.

**Bounded Context:** Secondary Market

**Aggregate:** SecondaryMarketOverview

**Producer:** Marketplace Engine (derived from activity)

**Consumers:** Portfolio (valuation), Valuation Engine, Discovery, Global Map, Audit

**Trigger:** Trade executed at new price; listing created at new price level

**Preconditions:** Valid trade executed or listing created

**Postconditions:** Market price indicator updated; price history appended

**Business Meaning:** The reference market price for a property token has changed, reflecting current supply and demand.

**Event Category:** Derived

**Ordering Requirements:** Per-property; chronological order

**Idempotency Requirements:** Keyed by propertyId + sequence; derived event can be re-derived

**Replay Requirements:** Replay reconstructs price history from trade events

**Versioning Rules:** Additive fields only

**Security Classification:** Public

**Retention Classification:** Standard

**Audit Requirements:** Property ID, new price, previous price, volume weighted, timestamp, source trade reference

**Failure Handling:** Derived event; recalculation on replay corrects any inconsistency

**Related Events:** MarketplaceSaleCompleted, MarketplaceListingCreated

**Notes:** This is a derived event computed from actual trades, not an authoritative valuation. Official NAV is provided by Valuation Engine.

---

# S9 — Payment and Settlement

The Payment and Settlement bounded context manages the lifecycle of payments from initiation through settlement, escrow, refunds, and reconciliation. It handles all payment methods (BNB, USDT, USDC, RLKO, bank transfer) and ensures every value movement is recorded immutably.

---

### PaymentInitiated

**Purpose:** Records that a payment session has been created for an investment or trade.

**Bounded Context:** Payment and Settlement

**Aggregate:** Payment

**Producer:** Investment Engine / Marketplace Engine

**Consumers:** Treasury, Ledger, Notification, Audit

**Trigger:** Investment confirmed or trade accepted; payment session created

**Preconditions:** Investment or trade in valid state; FX snapshot taken; payment method selected

**Postconditions:** Payment created in INITIATED state; FX rate frozen for the transaction; payment session identifier generated

**Business Meaning:** The system has created a payment obligation. The investor must now fund it.

**Event Category:** Core

**Ordering Requirements:** Per-payment; must follow InvestmentAllocated or OfferAccepted

**Idempotency Requirements:** Keyed by paymentId; initiated at most once

**Replay Requirements:** Replay creates payment in INITIATED state; FX snapshot recomputed from stored rate

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Payment ID, source reference (investment/trade), amount, currency, payment method, FX snapshot reference, investor ID, property ID, timestamp

**Failure Handling:** Initiation failure returns investment/trade to prior state; retry with backoff

**Related Events:** SettlementCompleted, PaymentFailed, PaymentExpired, RefundInitiated

**Notes:** FX rate is frozen at initiation and cannot change during the payment lifecycle. Multi-currency payments use the frozen rate for all conversions.

---

### PaymentPending

**Purpose:** Records that payment confirmation is awaited from the payment provider or blockchain.

**Bounded Context:** Payment and Settlement

**Aggregate:** Payment

**Producer:** Payment Adapter

**Consumers:** Investment Engine, Notification, Audit

**Trigger:** On-chain transaction detected pending; PSP webhook received indicating pending

**Preconditions:** Payment is INITIATED; transaction hash or PSP reference received

**Postconditions:** Payment moved to PENDING state; awaiting final confirmation

**Business Meaning:** The investor has submitted payment. The system is waiting for final settlement confirmation.

**Event Category:** Core

**Ordering Requirements:** Per-payment; must follow PaymentInitiated

**Idempotency Requirements:** Keyed by paymentId; pending state applied at most once per confirmation attempt

**Replay Requirements:** Replay sets payment to pending; on-chain verification must be re-run

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Transaction hash (on-chain) or PSP reference (fiat), method, confirmation blocks required, pending timestamp

**Failure Handling:** Pending expiry triggers PaymentExpired; PSP timeout leads to PaymentFailed

**Related Events:** PaymentInitiated, PaymentSettling, PaymentFailed, PaymentExpired

**Notes:** Pending time varies by payment method (BNB ~30s, bank transfer ~1-3 business days).

---

### PaymentSettling

**Purpose:** Records that funds have been confirmed and are moving through escrow toward settlement.

**Bounded Context:** Payment and Settlement

**Aggregate:** Payment

**Producer:** Settlement Worker

**Consumers:** Treasury, Ledger, Investment Engine, Audit

**Trigger:** On-chain confirmation received (sufficient confirmations); PSP webhook confirms funds available

**Preconditions:** Payment is PENDING; sufficient block confirmations or PSP confirmation received

**Postconditions:** Payment moved to SETTLING state; funds placed in escrow ledger; capital movement initiated

**Business Meaning:** Payment has been confirmed. Funds are being routed through escrow to the capital ledger.

**Event Category:** Core

**Ordering Requirements:** Per-payment; must follow PaymentPending

**Idempotency Requirements:** Keyed by paymentId; settling state applied at most once

**Replay Requirements:** Replay transitions to settling; escrow hold must be reconciled

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Confirmations count, escrow ledger entry, capital ledger pending entry, method-specific confirmation data, settling timestamp

**Failure Handling:** Escrow failure returns to PENDING; retry; AlertRaised on threshold breach

**Related Events:** PaymentPending, SettlementCompleted, PaymentFailed

**Notes:** During SETTLING, funds are in escrow and not yet available for capital deployment. On-chain verification is mandatory per MIGRATION_STRATEGY.md.

---

### SettlementCompleted

**Purpose:** Records that payment has been fully settled and value is available in the capital ledger.

**Bounded Context:** Payment and Settlement

**Aggregate:** Payment

**Producer:** Settlement Worker

**Consumers:** Investment Engine (advance to PAID), Ownership (trigger minting), Treasury, Portfolio, Commission Engine, Notification, Audit

**Trigger:** Escrow release confirmed; capital ledger updated; full settlement achieved

**Preconditions:** Payment is SETTLING; escrow released; capital ledger updated

**Postconditions:** Payment moved to SETTLED state; investment/trade moves to PAID; ownership pipeline triggered; transaction recorded on ledger

**Business Meaning:** The payment has been fully and finally settled. The investor now has a claim to ownership.

**Event Category:** Core

**Ordering Requirements:** Per-payment; must follow PaymentSettling

**Idempotency Requirements:** Keyed by paymentId; settled at most once

**Replay Requirements:** Replay marks payment settled and triggers downstream; reconcile with ledger state

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Final settlement amount, capital ledger entry, escrow release confirmation, settlement timestamp, downstream event references (InvestmentAllocated, OwnershipMinted)

**Failure Handling:** Settlement failure escalates to admin; manual reconciliation may be required; AlertRaised

**Related Events:** PaymentInitiated, PaymentSettling, PaymentFailed, InvestmentAllocated, OwnershipMinted

**Notes:** Settlement is the terminal success state for a payment. It gates the ownership pipeline per the Investment State Machine.

---

### PaymentFailed

**Purpose:** Records that a payment has failed before settlement.

**Bounded Context:** Payment and Settlement

**Aggregate:** Payment

**Producer:** Payment Adapter / Settlement Worker

**Consumers:** Investment Engine (retry or cancel), Treasury, Notification, Audit

**Trigger:** On-chain transaction reverted; PSP declined payment; insufficient funds; network error

**Preconditions:** Payment is INITIATED, PENDING, or SETTLING

**Postconditions:** Payment moved to FAILED state; no funds moved; investment/trade eligible for retry or cancellation

**Business Meaning:** The payment attempt did not succeed. The investor may retry or cancel.

**Event Category:** Core

**Ordering Requirements:** Per-payment; must follow PaymentInitiated

**Idempotency Requirements:** Keyed by paymentId + failure sequence; failed at most once per attempt

**Replay Requirements:** Replay marks payment failed; retry count must be reconciled

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Standard

**Audit Requirements:** Failure reason code, method, transaction hash (if any), PSP error code, retry count, failed timestamp

**Failure Handling:** Max retry exceeded triggers PaymentExpired; partial failure (escrow confirmed but downstream failed) escalates to admin

**Related Events:** PaymentInitiated, PaymentExpired, RefundInitiated

**Notes:** Payment failure does not release FX lock; FX lock released on expiry. Partial fund receipt requires refund flow.

---

### PaymentExpired

**Purpose:** Records that a payment TTL has elapsed without successful settlement.

**Bounded Context:** Payment and Settlement

**Aggregate:** Payment

**Producer:** Scheduler / Settlement Worker

**Consumers:** Investment Engine, Treasury, Notification, Audit

**Trigger:** Payment TTL exceeded; max retries exhausted

**Preconditions:** Payment is INITIATED or PENDING; TTL elapsed

**Postconditions:** Payment moved to EXPIRED state; FX lock released; investment/trade returned to prior state; any partial funds trigger refund

**Business Meaning:** The payment window has closed. The investment/trade opportunity may be released to other investors.

**Event Category:** Core

**Ordering Requirements:** Per-payment; must follow PaymentInitiated

**Idempotency Requirements:** Keyed by paymentId; expired at most once

**Replay Requirements:** Replay marks payment expired and releases holds; reconcile with investment state

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Expiry reason (TTL / max retries), elapsed time, any partial fund reference, expired timestamp

**Failure Handling:** Expiry during settlement window must be prevented; if partial funds received, RefundInitiated must precede expiry

**Related Events:** PaymentInitiated, PaymentFailed, RefundInitiated

**Notes:** Payment TTL is configurable per property and jurisdiction. Standard TTL is 24 hours for crypto, 5 business days for bank transfer.

---

### RefundInitiated

**Purpose:** Records that a refund process has been started for a failed, cancelled, or rejected payment.

**Bounded Context:** Payment and Settlement

**Aggregate:** Refund

**Producer:** Treasury / Refund Worker

**Consumers:** Investment Engine (cancel ownership), Ledger, Notification, Audit

**Trigger:** Investment rejected after settlement; payment cancelled with partial funds; compliance reversal

**Preconditions:** Payment is SETTLED or has partial funds; refund reason validated

**Postconditions:** Refund created in INITIATED state; offsetting transaction prepared; ownership reclaim initiated if applicable

**Business Meaning:** The system has initiated a return of funds to the investor. Refund routing follows original payment method.

**Event Category:** Core

**Ordering Requirements:** Per-refund; must follow (InvestmentRejected or PaymentFailed with partial funds)

**Idempotency Requirements:** Keyed by refundId; initiated at most once

**Replay Requirements:** Replay initiates refund; reconcile with payment and investment state

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Refund ID, original payment ID, amount, currency, refund method, reason code, actor ID (if manual), investment ID, timestamp

**Failure Handling:** Refund routing failure (method unavailable) falls back to alternate method; AlertRaised if all methods fail

**Related Events:** RefundCompleted, InvestmentRejected, PaymentFailed

**Notes:** Refund routes to original payment method where possible. On-chain refunds use the original wallet; bank refunds use the original account.

---

### RefundCompleted

**Purpose:** Records that a refund has been successfully executed and funds returned to the investor.

**Bounded Context:** Payment and Settlement

**Aggregate:** Refund

**Producer:** Treasury / Refund Worker

**Consumers:** Investment Engine, Ledger, Portfolio, Ownership (reclaim confirmed), Notification, Audit

**Trigger:** Refund transaction confirmed; bank transfer completed

**Preconditions:** Refund is INITIATED; refund transaction confirmed

**Postconditions:** Refund moved to COMPLETED state; funds returned to investor; ownership reclaimed (if allocated); offsetting transaction recorded on ledger; investment fully cancelled

**Business Meaning:** The investor has been fully refunded. The investment is nullified.

**Event Category:** Core

**Ordering Requirements:** Per-refund; must follow RefundInitiated

**Idempotency Requirements:** Keyed by refundId; completed at most once

**Replay Requirements:** Replay completes refund and applies all reversals; reconcile with ledger, ownership, and investment

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Refund transaction hash (on-chain) or PSP reference (fiat), refund completion amount, method, ownership reclaim reference, ledger entries (offsetting), completed timestamp

**Failure Handling:** Refund completion failure triggers admin alert; manual intervention required for persistent failures

**Related Events:** RefundInitiated, OwnershipReclaimed, InvestmentCancelled

**Notes:** Refund completion is legally significant. All downstream systems must reflect the reversal. Tax documents may need amendment.

---

### SettlementReconciled

**Purpose:** Records that a periodic reconciliation check has verified settlement ledger consistency.

**Bounded Context:** Payment and Settlement

**Aggregate:** SettlementLedger

**Producer:** Reconciliation Worker

**Consumers:** Treasury, Audit, Admin

**Trigger:** Scheduled reconciliation cycle; manual reconciliation request

**Preconditions:** Reconciliation run triggered

**Postconditions:** Reconciliation result recorded; any discrepancies flagged via ComplianceFlagRaised

**Business Meaning:** The settlement ledger has been verified for consistency. All payments, escrows, and releases balance.

**Event Category:** Derived

**Ordering Requirements:** Per-cycle; chronological

**Idempotency Requirements:** Keyed by runId; result is idempotent

**Replay Requirements:** Replay re-runs reconciliation; discrepancies recalculated

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Standard

**Audit Requirements:** Run ID, properties checked, payments in flight count, total escrowed, total settled, discrepancies found (0 if clean), timestamp

**Failure Handling:** Reconciliation failure does not affect live payments; AlertRaised for investigation

**Related Events:** ComplianceFlagRaised, PaymentInitiated, SettlementCompleted

**Notes:** Reconciliation runs daily. Escrow + Capital + Commission + Refunds == Investment Ledger invariant is verified.

---

# S10 — Ownership

The Ownership bounded context manages the authoritative record of fraction and token ownership across all property investments. It maintains the append-only ownership event log, current balance projections, and ownership snapshots for dividends, governance, valuation, and tax purposes.

---

### OwnershipMinted

**Purpose:** Records that fractional tokens have been minted and allocated to an investor upon successful primary investment settlement.

**Bounded Context:** Ownership

**Aggregate:** OwnershipEvent

**Producer:** Ownership Service

**Consumers:** Portfolio, Governance, Dividend Center, NFT Marketplace, Global Map, Treasury, Audit

**Trigger:** SettlementCompleted confirms payment; investment allocated

**Preconditions:** Payment is SETTLED; compliance approved; InvestmentAllocated event received

**Postconditions:** Ownership balance increased for investor on property; token supply increased; ownership event appended to stream; portfolio updated

**Business Meaning:** The investor has been granted legal-economic ownership of property fractions. This is the foundational ownership event.

**Event Category:** Core

**Ordering Requirements:** Per-(investor, property); must follow SettlementCompleted and InvestmentAllocated

**Idempotency Requirements:** Keyed by eventId + (investorId, propertyId, fractionId, tokens); mint at most once

**Replay Requirements:** Replay mints tokens and recomputes ownership balance; reconcile with total supply invariant

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Investor ID, property ID, fraction ID, token quantity, price per token, total amount paid, investment reference, transaction reference, minted timestamp

**Failure Handling:** Mint failure blocks settlement; retry with backoff; admin escalation if persistent

**Related Events:** SettlementCompleted, InvestmentAllocated, OwnershipTransferred, PortfolioHoldingChanged

**Notes:** This event is the canonical trigger for all downstream ownership-dependent projections (voting power, dividend eligibility, portfolio valuation).

---

### OwnershipTransferred

**Purpose:** Records that fractional tokens have been transferred from one investor to another via secondary market trade.

**Bounded Context:** Ownership

**Aggregate:** OwnershipEvent

**Producer:** Ownership Service

**Consumers:** Portfolio, Governance, Dividend Center, NFT Marketplace, Global Map, Treasury, Commission Engine, Audit

**Trigger:** MarketplaceSaleCompleted confirms secondary trade

**Preconditions:** Escrow released; seller holds sufficient token quantity; sale completed

**Postconditions:** Seller balance decreased; buyer balance increased; TRANSFER_OUT event on seller stream; TRANSFER_IN event on buyer stream; portfolio updated for both parties

**Business Meaning:** Ownership of property fractions has changed hands from seller to buyer via the secondary market.

**Event Category:** Core

**Ordering Requirements:** Per-(investor, property); must follow MarketplaceSaleCompleted and EscrowReleased

**Idempotency Requirements:** Keyed by eventId + saleId; transfer applied at most once

**Replay Requirements:** Replay applies both debit and credit entries; verify supply invariant remains unchanged

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** From investor ID, to investor ID, property ID, fraction ID, quantity transferred, price per token, total amount, sale reference, escrow reference, transferred timestamp

**Failure Handling:** Transfer failure locks funds in escrow; admin intervention required; AlertRaised

**Related Events:** MarketplaceSaleCompleted, EscrowReleased, OwnershipMinted, CommissionCalculated

**Notes:** Total token supply is unchanged by transfer. Only the distribution of ownership changes. Both parties portfolio and voting power update on this event.

---

### OwnershipReclaimed

**Purpose:** Records that tokens have been reclaimed from an investor following a refund or cancellation.

**Bounded Context:** Ownership

**Aggregate:** OwnershipEvent

**Producer:** Ownership Service

**Consumers:** Portfolio, Governance, Dividend Center, Treasury, Audit

**Trigger:** RefundCompleted after investment rejection; investment cancelled after settlement

**Preconditions:** Refund completed or cancellation confirmed; investor holds sufficient tokens

**Postconditions:** Investor balance decreased; reclaimed tokens returned to available pool or burned; portfolio updated

**Business Meaning:** Ownership is being reversed. The investor no longer holds these fractions due to refund or cancellation.

**Event Category:** Core

**Ordering Requirements:** Per-(investor, property); must follow RefundCompleted or InvestmentCancelled

**Idempotency Requirements:** Keyed by eventId + refundId; reclaim at most once

**Replay Requirements:** Replay reclaims tokens and recomputes balances; reconcile with supply

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Investor ID, property ID, fraction ID, quantity reclaimed, reason code, refund reference, cancelled timestamp

**Failure Handling:** Reclaim failure requires manual reconciliation; tax implications must be assessed

**Related Events:** RefundCompleted, InvestmentCancelled, OwnershipBurned

**Notes:** Reclaimed tokens are returned to the property available pool or burned depending on property configuration and regulatory requirements.

---

### OwnershipBurned

**Purpose:** Records that tokens have been permanently removed from circulation upon property lifecycle end or buyback.

**Bounded Context:** Ownership

**Aggregate:** OwnershipEvent

**Producer:** Ownership Service

**Consumers:** Portfolio, Governance, Dividend Center, Treasury, Token Contract, Audit

**Trigger:** Property archived and final distribution complete; buyback and burn executed

**Preconditions:** Property in terminal state; all distributions complete; investor compensated or buyback executed

**Postconditions:** Tokens removed from holder balances; total supply reduced; property marked fully settled

**Business Meaning:** Property fractions have been permanently destroyed. The property investment lifecycle is complete.

**Event Category:** Core

**Ordering Requirements:** Per-(investor, property); must precede PropertyArchived

**Idempotency Requirements:** Keyed by eventId + propertyId; burn at most once

**Replay Requirements:** Replay burns tokens and reduces supply; reconcile with final distribution

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Property ID, fraction ID, quantity burned, remaining holder count, compensation reference, tax distribution reference, burned timestamp, regulatory reference

**Failure Handling:** Burn failure blocks property closure; manual intervention required; legal/compliance notified

**Related Events:** PropertyArchived, BuybackExecuted, FinalDistributionCompleted

**Notes:** Burning is a terminal action. All investor positions must be settled before burn. Tax events are triggered for holders at time of burn.

---

### OwnershipSnapshotTaken

**Purpose:** Records a point-in-time immutable snapshot of ownership balances for a specific context.

**Bounded Context:** Ownership

**Aggregate:** OwnershipSnapshot

**Producer:** Ownership Service (on request from Dividend, Governance, Valuation, Tax)

**Consumers:** Dividend Center, Governance, Valuation Engine, Tax Service, Audit

**Trigger:** Dividend scheduled; governance proposal created; valuation requested; tax period end

**Preconditions:** Snapshot requested by consuming context

**Postconditions:** Ownership balances frozen at snapshot timestamp; snapshot stored and referenced by consuming context

**Business Meaning:** A reproducible record of who owned what at a specific point in time, used for entitlement calculations.

**Event Category:** Derived

**Ordering Requirements:** Per-context (Dividend/Governance/Valuation/Tax); chronological

**Idempotency Requirements:** Keyed by snapshotId + (context, block/timestamp); taken at most once per context instance

**Replay Requirements:** Replay recomputes snapshot from ownership event log at given timestamp

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Snapshot ID, context type (Dividend/Governance/Valuation/Tax), context reference ID, timestamp, holder count, total supply at snapshot, content hash of snapshot data

**Failure Handling:** Snapshot failure delays dependent operations; retry; AlertRaised if snapshot cannot be computed

**Related Events:** DividendScheduled, GovernanceProposalCreated, ValuationRequested, TaxPeriodClosed

**Notes:** Snapshots are derived, not authoritative. The ownership event log is always the source of truth. Snapshots are immutable once taken.

---

# S11 — Portfolio

The Portfolio bounded context provides consolidated investor views of holdings, performance, and value. It subscribes to ownership, valuation, dividend, and trade events to maintain up-to-date projections. Portfolio events are derived read-model indicators, not authoritative business events.

---

### PortfolioHoldingChanged

**Purpose:** Records that an investor portfolio holding quantity has changed due to ownership event.

**Bounded Context:** Portfolio

**Aggregate:** PortfolioHolding

**Producer:** Portfolio Projection Worker

**Consumers:** Portfolio Dashboard, Notification, Audit

**Trigger:** OwnershipMinted, OwnershipTransferred, OwnershipReclaimed, or OwnershipBurned event consumed

**Preconditions:** Ownership event processed and balance recomputed

**Postconditions:** Portfolio holding count updated; cost basis recalculated; portfolio value updated

**Business Meaning:** The investor quantity for a property has changed. The portfolio projection reflects the new balance.

**Event Category:** Derived

**Ordering Requirements:** Per-(investor, property); must follow triggering ownership event

**Idempotency Requirements:** Keyed by holdingId + sequence; derived event can be re-derived from ownership log

**Replay Requirements:** Replay recomputes all holdings from ownership events; corrects any projection drift

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Investor ID, property ID, previous quantity, new quantity, delta, cost basis adjustment, trigger event reference, recomputed timestamp

**Failure Handling:** Projection failure does not affect ownership; retry on next event; AlertRaised if backlog exceeds threshold

**Related Events:** OwnershipMinted, OwnershipTransferred, OwnershipReclaimed, OwnershipBurned

**Notes:** Portfolio holdings are read-model projections. The authoritative balance is always the ownership event log. Full rebuild from log corrects any drift.

---

### PortfolioValueUpdated

**Purpose:** Records that the total value of an investor portfolio has been recalculated.

**Bounded Context:** Portfolio

**Aggregate:** Portfolio

**Producer:** Portfolio Projection Worker

**Consumers:** Portfolio Dashboard, Notification, Agent Dashboard, Audit

**Trigger:** ValuationUpdated consumed; SecondaryPriceUpdated consumed; holding change processed

**Preconditions:** Current valuation or price available for each holding

**Postconditions:** Portfolio total value and per-property value updated; performance metrics recalculated

**Business Meaning:** The investor portfolio has a new total valuation based on latest prices and valuations.

**Event Category:** Derived

**Ordering Requirements:** Per-investor; chronological

**Idempotency Requirements:** Keyed by portfolioId + sequence; derived event recomputed from inputs

**Replay Requirements:** Replay recomputes portfolio value from holding balances and historical prices

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Investor ID, total value before, total value after, properties valued, valuation sources, as-of timestamp

**Failure Handling:** Valuation failure for one property does not block others; AlertRaised if source unavailable

**Related Events:** ValuationUpdated, SecondaryPriceUpdated, PortfolioHoldingChanged, DividendDistributed

**Notes:** Portfolio value is not authoritative for settlement. Official NAV is provided by Valuation Engine. Portfolio value may differ from NAV due to market pricing.

---

### PortfolioRebalanced

**Purpose:** Records that an investor portfolio has triggered rebalancing due to allocation targets.

**Bounded Context:** Portfolio

**Aggregate:** Portfolio

**Producer:** Portfolio Service

**Consumers:** Notification, Agent Dashboard, Audit

**Trigger:** Investor allocation diverges from target by configurable threshold; scheduled rebalance

**Preconditions:** Portfolio value computed; target allocation defined

**Postconditions:** Rebalance event recorded; suggestion generated for investor; no automatic trades executed

**Business Meaning:** The investor portfolio composition has shifted away from target allocation. Rebalancing may be advised.

**Event Category:** Derived

**Ordering Requirements:** Per-investor; chronological

**Idempotency Requirements:** Keyed by portfolioId + cycle; rebalance event is advisory

**Replay Requirements:** Replay recomputes allocation divergence; rebalance suggestion regenerated

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Investor ID, target allocation, current allocation, divergence percentage, suggested actions, timestamp

**Failure Handling:** Rebalance suggestion failure does not affect holdings; AlertRaised on computation error

**Related Events:** PortfolioValueUpdated, PortfolioHoldingChanged

**Notes:** Portfolio rebalancing is advisory only. No automatic trading is executed. The investor must execute secondary market trades to rebalance.

---

### PortfolioAlertTriggered

**Purpose:** Records that a portfolio threshold or condition has triggered an alert for the investor.

**Bounded Context:** Portfolio

**Aggregate:** PortfolioAlert

**Producer:** Portfolio Service

**Consumers:** Notification, Agent Dashboard, Audit

**Trigger:** Concentration threshold exceeded; value drop below threshold; significant holding change; dividend missed

**Preconditions:** Portfolio state evaluated against alert rules

**Postconditions:** Alert recorded; notification queued for delivery

**Business Meaning:** An investor-relevant condition has been detected in their portfolio. Attention may be required.

**Event Category:** Derived

**Ordering Requirements:** Per-investor; chronological

**Idempotency Requirements:** Keyed by alertId; alert at most once for unique condition

**Replay Requirements:** Replay re-evaluates alert conditions; suppresses already-triggered alerts

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Investor ID, alert type, severity, threshold value, current value, property ID (if applicable), condition details, triggered timestamp

**Failure Handling:** Alert evaluation failure does not affect portfolio; AlertRaised on alert engine failure

**Related Events:** PortfolioValueUpdated, PortfolioHoldingChanged, NotificationSent

**Notes:** Alerts are informational and do not trigger automated actions. Alert types and thresholds are configurable per investor.

---

### PortfolioPerformanceUpdated

**Purpose:** Records that portfolio performance metrics (returns, IRR, multiples) have been recalculated.

**Bounded Context:** Portfolio

**Aggregate:** Portfolio

**Producer:** Portfolio Projection Worker

**Consumers:** Portfolio Dashboard, Agent Dashboard, Audit

**Trigger:** PortfolioValueUpdated processed; dividend or distribution received

**Preconditions:** Current portfolio value and cost basis available

**Postconditions:** Performance metrics recalculated and stored

**Business Meaning:** The investor portfolio return metrics have been updated with latest values and distributions.

**Event Category:** Derived

**Ordering Requirements:** Per-investor; chronological

**Idempotency Requirements:** Keyed by portfolioId + sequence; recomputed from source data

**Replay Requirements:** Replay recomputes all performance metrics from historical values and events

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Investor ID, total return, IRR, multiple, time-weighted return, dividend-adjusted return, period, as-of timestamp

**Failure Handling:** Performance computation failure retries on next event; AlertRaised on persistent failure

**Related Events:** PortfolioValueUpdated, DividendDistributed, PortfolioHoldingChanged

**Notes:** Performance is computed using time-weighted return methodology. Cash flows (investments, dividends) are factored into IRR calculation.

---

# S12 — NFT

The NFT bounded context manages non-fungible tokens representing property loyalty, achievements, rank badges, KYC verification, and access entitlements. NFTs complement fractional ownership and operate on a separate ERC721 standard. This section covers the complete NFT lifecycle from creation through minting, trading, evolution, and redemption.

---

### NFTCreated

**Purpose:** Records that a new NFT collection or category has been created in the system.

**Bounded Context:** NFT

**Aggregate:** NFTCollection

**Producer:** Platform / Collection Manager

**Consumers:** Marketplace Engine, Discovery, Audit

**Trigger:** New NFT type defined by platform administration

**Preconditions:** Collection parameters validated; creator authorized

**Postconditions:** NFT collection registered; minting rules established; metadata schema defined

**Business Meaning:** A new class of NFT has been established for issuance. NFTs within this collection share characteristics and rules.

**Event Category:** Business

**Ordering Requirements:** Per-collection; must precede any NFTMinted within collection

**Idempotency Requirements:** Keyed by collectionId; created at most once

**Replay Requirements:** Replay creates collection; minting rules and schema restored

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Collection ID, category, standard family (ERC721/ERC1155), creator ID, verified status, metadata URI, max supply (if any), created timestamp

**Failure Handling:** Creation failure blocks all minting for collection; admin intervention required

**Related Events:** NFTMinted, NFTMetadataUpdated

**Notes:** Collection categories include: RankBadge, Achievement, KYCVerification, PropertyLoyalty, AccessPass, TitleArt, Membership, EventTicket.

---

### NFTMinted

**Purpose:** Records that an NFT has been minted and assigned to an owner.

**Bounded Context:** NFT

**Aggregate:** NFTAsset

**Producer:** Primary Market / System (rank, achievement, KYC, loyalty)

**Consumers:** Portfolio, Network Engine (NFT score), Governance (voting power), Dividend Center (entitlement), Global Map, Document Vault, Audit

**Trigger:** Rank achieved; milestone completed; KYC approved; loyalty threshold met; platform minting

**Preconditions:** NFT collection exists; owner wallet verified; eligibility conditions met

**Postconditions:** NFT minted and assigned to owner; NFT balance updated; collection supply incremented; downstream projections triggered

**Business Meaning:** A non-fungible token has been issued to an owner, carrying the rights and benefits of its category.

**Event Category:** Core

**Ordering Requirements:** Per-asset; must follow NFTCreated

**Idempotency Requirements:** Keyed by eventId + tokenId; minted at most once

**Replay Requirements:** Replay mints NFT and updates balances; reconcile with on-chain state

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Token ID, collection ID, owner ID, NFT type, source reference (rank/milestone/KYC/etc.), metadata content hash, minted timestamp, on-chain transaction hash (if applicable)

**Failure Handling:** Mint failure returns system to prior state; retry; admin escalation for persistent failures

**Related Events:** NFTCreated, NFTTransferred, NFTBurned, RankAchieved, KYCApproved

**Notes:** NFT minting may trigger gas costs on-chain. Minting is batched where possible. Each mint includes metadata pointing to off-chain content.

---

### NFTListed

**Purpose:** Records that an NFT has been listed for sale on the NFT marketplace.

**Bounded Context:** NFT

**Aggregate:** NFTListing

**Producer:** Marketplace Engine

**Consumers:** Discovery, Watchlist, Notification, Audit

**Trigger:** NFT owner submits listing

**Preconditions:** NFT is not frozen; owner holds the NFT; not already listed

**Postconditions:** Listing created in ACTIVE state; NFT discoverable on marketplace

**Business Meaning:** The NFT is offered for sale at a specified price.

**Event Category:** Business

**Ordering Requirements:** Per-listing; no strict ordering constraints

**Idempotency Requirements:** Keyed by listingId; listed at most once

**Replay Requirements:** Replay creates listing; reconcile with NFT state

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Listing ID, token ID, collection ID, owner ID, asking price, currency, listing kind (fixed/auction/negotiation), duration, listed timestamp

**Failure Handling:** Listing failure does not affect NFT ownership; retry; AlertRaised on service failure

**Related Events:** NFTDelisted, NFTSold, NFTMinted

**Notes:** NFT listings may be fixed-price or auction-style. Multiple listing types may be active per collection rules.

---

### NFTDelisted

**Purpose:** Records that an NFT listing has been removed from the marketplace.

**Bounded Context:** NFT

**Aggregate:** NFTListing

**Producer:** Marketplace Engine

**Consumers:** Discovery, Watchlist, Notification, Audit

**Trigger:** Owner cancels listing; listing expired; compliance action; sale executed

**Preconditions:** Listing is ACTIVE

**Postconditions:** Listing moved to CANCELLED or EXPIRED or SOLD state; NFT removed from discoverable listings

**Business Meaning:** The NFT is no longer available for purchase on the marketplace.

**Event Category:** Business

**Ordering Requirements:** Per-listing; must follow NFTListed

**Idempotency Requirements:** Keyed by listingId; delisted at most once

**Replay Requirements:** Replay closes listing; reconcile with NFT state

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Listing ID, token ID, reason code, actor ID (if manual), timestamp

**Failure Handling:** Delist failure does not prevent subsequent listing state changes; retry

**Related Events:** NFTListed, NFTSold, NFTFrozen

---

### NFTOfferCreated

**Purpose:** Records that a buyer has submitted a purchase offer on an NFT listing.

**Bounded Context:** NFT

**Aggregate:** NFTOffer

**Producer:** Marketplace Engine

**Consumers:** Notification, Seller Dashboard, Audit

**Trigger:** Buyer submits offer on an NFT listing

**Preconditions:** Listing is ACTIVE; buyer KYC approved; buyer funds sufficient

**Postconditions:** Offer created in PENDING state; buyer notified; seller notified

**Business Meaning:** A binding offer to purchase the NFT at a specified price has been recorded.

**Event Category:** Business

**Ordering Requirements:** Per-offer; on listing for offer sequencing

**Idempotency Requirements:** Keyed by offerId; offer created at most once

**Replay Requirements:** Replay reconstructs offer book per listing

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Buyer ID, listing ID, token ID, offered price, currency, expiry timestamp, terms

**Failure Handling:** Offer creation failure releases hold; AlertRaised on system error

**Related Events:** NFTOfferAccepted, NFTOfferWithdrawn, NFTSold

**Notes:** Offers may be below, at, or above listing price. Sellers may accept, reject, or counter.

---

### NFTOfferAccepted

**Purpose:** Records that a seller has accepted an offer on an NFT, binding the trade.

**Bounded Context:** NFT

**Aggregate:** NFTOffer

**Producer:** Marketplace Engine

**Consumers:** Notification, Settlement, Portfolio, Audit

**Trigger:** Seller accepts offer

**Preconditions:** Offer is PENDING; listing is ACTIVE; offer not expired

**Postconditions:** Offer moved to ACCEPTED state; sale pipeline initiated; both parties notified

**Business Meaning:** A binding NFT trade agreement has been reached. Settlement proceeds.

**Event Category:** Business

**Ordering Requirements:** Per-offer; must follow NFTOfferCreated

**Idempotency Requirements:** Keyed by offerId; accepted at most once

**Replay Requirements:** Replay transitions offer to accepted and triggers sale

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Seller ID, accepted price, acceptance timestamp, sale reference

**Failure Handling:** Acceptance failure returns offer to PENDING; retry; AlertRaised on threshold

**Related Events:** NFTOfferCreated, NFTSold, NFTTransferred

**Notes:** Acceptance is irrevocable. Cooling period applies per jurisdiction.

---

### NFTOfferWithdrawn

**Purpose:** Records that a buyer has withdrawn their NFT offer before acceptance.

**Bounded Context:** NFT

**Aggregate:** NFTOffer

**Producer:** Marketplace Engine

**Consumers:** Notification, Seller Dashboard, Audit

**Trigger:** Buyer withdraws offer

**Preconditions:** Offer is PENDING; not yet accepted

**Postconditions:** Offer moved to WITHDRAWN state; holds released; seller notified

**Business Meaning:** The buyer has rescinded their offer. No trade proceeds.

**Event Category:** Business

**Ordering Requirements:** Per-offer; must follow NFTOfferCreated

**Idempotency Requirements:** Keyed by offerId; withdrawn at most once

**Replay Requirements:** Replay marks offer withdrawn

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Buyer ID, reason code, withdrawal timestamp

**Failure Handling:** Withdrawal failure escalates to admin

**Related Events:** NFTOfferCreated, NFTOfferAccepted

**Notes:** Withdrawal after acceptance is not permitted.

---

### NFTAuctionStarted

**Purpose:** Records that an auction has been started for an NFT listing.

**Bounded Context:** NFT

**Aggregate:** NFTAuction

**Producer:** Marketplace Engine

**Consumers:** Discovery, Notification, Watchlist, Audit

**Trigger:** Seller starts auction for NFT listing

**Preconditions:** NFT is listed with auction kind; not frozen

**Postconditions:** Auction created in ACTIVE state; bidding window open; reserve price set

**Business Meaning:** The NFT is being sold via auction. Bids are now accepted.

**Event Category:** Business

**Ordering Requirements:** Per-auction; must precede NFTAuctionBid and NFTAuctionEnded

**Idempotency Requirements:** Keyed by auctionId; started at most once

**Replay Requirements:** Replay creates auction; reconcile with bids

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Auction ID, token ID, listing ID, reserve price, currency, start timestamp, end timestamp, minimum bid increment

**Failure Handling:** Auction start failure returns listing to active; retry; AlertRaised

**Related Events:** NFTAuctionBid, NFTAuctionEnded, NFTSold

**Notes:** Auction types include English ascending and Dutch descending. Parameters are set at creation.

---

### NFTAuctionBid

**Purpose:** Records that a bid has been placed on an NFT auction.

**Bounded Context:** NFT

**Aggregate:** NFTAuction

**Producer:** Marketplace Engine

**Consumers:** Notification, Seller Dashboard, Leaderboard, Audit

**Trigger:** Bidder submits bid

**Preconditions:** Auction is ACTIVE; bid exceeds current highest bid or meets reserve; bidder KYC approved; bidder funds sufficient

**Postconditions:** Bid recorded; previous bidder outbid and notified; current price updated

**Business Meaning:** A bid has been placed in the auction. The bidder is the current highest bidder.

**Event Category:** Business

**Ordering Requirements:** Per-auction; chronological bid order

**Idempotency Requirements:** Keyed by auctionId + bidId; bid recorded at most once

**Replay Requirements:** Replay reconstructs bid history and winner determination

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Auction ID, bidder ID, bid amount, currency, previous highest bid, timestamp, bidder IP (anonymized)

**Failure Handling:** Bid failure releases hold; AlertRaised on system error

**Related Events:** NFTAuctionStarted, NFTAuctionEnded, NFTSold

**Notes:** Automatic bidding (max bid) is supported. Bid retractions are not permitted. Sniping protection applies in final minutes.

---

### NFTAuctionEnded

**Purpose:** Records that an NFT auction has ended, with or without a winner.

**Bounded Context:** NFT

**Aggregate:** NFTAuction

**Producer:** Marketplace Engine

**Consumers:** Notification, Seller, Winner, Treasury, Portfolio, Audit

**Trigger:** Auction end time reached; reserve met or not

**Preconditions:** Auction is ACTIVE; end time reached

**Postconditions:** Auction moved to ENDED state; winner determined (if reserve met); sale initiated if applicable; losing bidders notified

**Business Meaning:** The auction window has closed. The highest bidder wins if reserve is met.

**Event Category:** Business

**Ordering Requirements:** Per-auction; must follow NFTAuctionStarted and at least one NFTAuctionBid (if any)

**Idempotency Requirements:** Keyed by auctionId; ended at most once

**Replay Requirements:** Replay ends auction and determines winner from bid history

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Auction ID, winner ID (if any), winning bid, reserve met, total bids, end timestamp

**Failure Handling:** End failure extends auction temporarily; manual intervention may be required; AlertRaised

**Related Events:** NFTAuctionStarted, NFTAuctionBid, NFTSold

**Notes:** If reserve not met, auction closes with no sale. Seller may re-list or negotiate with highest bidder.

---

### NFTSold

**Purpose:** Records that an NFT has been sold via the marketplace.

**Bounded Context:** NFT

**Aggregate:** NFTSale

**Producer:** Marketplace Engine

**Consumers:** Ownership (transfer), Treasury, Portfolio, Commission Engine, Royalty Engine, Notification, Audit

**Trigger:** Offer accepted and settled; auction ended with winning bid and settlement

**Preconditions:** Offer accepted or auction won; payment confirmed; settlement complete

**Postconditions:** Sale recorded; ownership transfer initiated; commissions and royalties queued

**Business Meaning:** An NFT has changed ownership through a marketplace sale.

**Event Category:** Core

**Ordering Requirements:** Per-sale; must follow NFTOfferAccepted or NFTAuctionEnded

**Idempotency Requirements:** Keyed by saleId; sold at most once

**Replay Requirements:** Replay completes sale; reconcile with ownership and treasury

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Sale ID, token ID, collection ID, buyer ID, seller ID, price, currency, sale type (offer/auction/instant), commission amount, royalty amount, settlement timestamp

**Failure Handling:** Sale completion failure locks funds; admin intervention required; AlertRaised

**Related Events:** NFTOfferAccepted, NFTAuctionEnded, NFTTransferred, RoyaltiesPaid

**Notes:** NFTSold triggers the transfer and royalty pipeline. Both buyer and seller portfolio update on this event.

---

### NFTTransferred

**Purpose:** Records that an NFT has been transferred from one owner to another.

**Bounded Context:** NFT

**Aggregate:** NFTAsset

**Producer:** Transfer Model

**Consumers:** Portfolio, Governance, Network Engine, Dividend Center, Global Map, Audit

**Trigger:** NFTSold completed; direct transfer between wallets; system transfer (reclaim/burn)

**Preconditions:** Transfer validated; sender holds the NFT; not frozen

**Postconditions:** NFT owner updated; portfolio updated for both parties; voting power and dividend entitlement recalculated

**Business Meaning:** The NFT has a new owner. All associated rights and benefits transfer.

**Event Category:** Core

**Ordering Requirements:** Per-asset; chronological

**Idempotency Requirements:** Keyed by tokenId + sequence; transfer at most once

**Replay Requirements:** Replay updates ownership; reconcile with portfolio projections

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Token ID, from owner, to owner, transfer kind (sale/gift/system), sale reference (if applicable), transferred timestamp

**Failure Handling:** Transfer failure returns NFT to prior owner; admin intervention for persistent failure

**Related Events:** NFTSold, NFTMinted, NFTBurned

**Notes:** Transfer kind distinguishes economic transfers (sale) from non-economic (gift, system). Voting power and dividend entitlement follow the NFT.

---

### RoyaltiesPaid

**Purpose:** Records that royalties have been paid to the creator and other rights holders from an NFT sale.

**Bounded Context:** NFT

**Aggregate:** RoyaltyPayment

**Producer:** Royalty Engine / Treasury

**Consumers:** Treasury, Network Engine (agent reward), Creator, Audit

**Trigger:** NFT sale completed; royalty calculation executed

**Preconditions:** Sale completed; royalty parameters defined for collection or token

**Postconditions:** Royalty amounts distributed to recipients; treasury fee recorded; transaction journaled

**Business Meaning:** Creator and rights holder royalties from the NFT sale have been distributed.

**Event Category:** Core

**Ordering Requirements:** Per-sale; must follow NFTSold

**Idempotency Requirements:** Keyed by royaltyPaymentId + saleId; paid at most once

**Replay Requirements:** Replay recalculates and distributes royalties from sale price

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Sale ID, token ID, creator amount, agent amount (if applicable), platform fee, treasury amount, total royalty pool, recipient addresses, payment references

**Failure Handling:** Royalty distribution failure blocks settlement; retry; manual intervention if persistent

**Related Events:** NFTSold, TreasuryFunded, CommissionCalculated

**Notes:** Royalty percentages are configured per collection at creation. Secondary sale royalties are mandatory per platform policy.

---

### NFTFrozen

**Purpose:** Records that an NFT has been frozen by security or compliance, preventing transfers.

**Bounded Context:** NFT

**Aggregate:** NFTAsset

**Producer:** Security / Compliance

**Consumers:** Transfer Model (block transfers), Marketplace (hide listing), Admin, Audit

**Trigger:** Security incident; compliance violation; legal hold; fraud detection

**Preconditions:** Asset or owner identified for freezing

**Postconditions:** NFT moved to FROZEN state; all transfers blocked; marketplace listings hidden

**Business Meaning:** The NFT is under restriction. No ownership changes are permitted until unfrozen.

**Event Category:** Security

**Ordering Requirements:** Per-asset; must precede NFTUnfrozen

**Idempotency Requirements:** Keyed by tokenId + freezeId; frozen at most once per freeze event

**Replay Requirements:** Replay freezes NFT and blocks transfers; reconcile with current state

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Token ID, collection ID, owner ID, reason code, compliance case reference, actor ID, frozen timestamp

**Failure Handling:** Freeze failure does not block subsequent attempts; immediate retry; AlertRaised

**Related Events:** NFTUnfrozen, NFTBlacklisted, ComplianceFlagRaised

**Notes:** Freezing does not burn or destroy the NFT. All associated rights are suspended during freeze.

---

### NFTUnfrozen

**Purpose:** Records that a frozen NFT has been restored to normal operation.

**Bounded Context:** NFT

**Aggregate:** NFTAsset

**Producer:** Security / Compliance

**Consumers:** Transfer Model (restore transfers), Marketplace (restore listing), Admin, Audit

**Trigger:** Compliance cleared; legal hold lifted; incident resolved

**Preconditions:** NFT is FROZEN; clearance obtained

**Postconditions:** NFT moved to ACTIVE state; transfers re-enabled; marketplace listing restored (if previously listed)

**Business Meaning:** The restriction on the NFT has been lifted. Normal operations resume.

**Event Category:** Security

**Ordering Requirements:** Per-asset; must follow NFTFrozen

**Idempotency Requirements:** Keyed by tokenId; unfrozen at most once per freeze cycle

**Replay Requirements:** Replay unfreezes NFT; reconcile with listing state

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Token ID, clearance reference, actor ID, unfrozen timestamp

**Failure Handling:** Unfreeze failure retries; manual intervention if persistent

**Related Events:** NFTFrozen, NFTListed

**Notes:** If the freeze was in error, any losses during freeze period are assessed per compensation policy.

---

### NFTBurned

**Purpose:** Records that an NFT has been permanently destroyed and removed from circulation.

**Bounded Context:** NFT

**Aggregate:** NFTAsset

**Producer:** Transfer Model / Owner / Redeem Process

**Consumers:** Portfolio, Governance, Network Engine, Dividend Center, Audit

**Trigger:** Owner burns NFT; system burns on lifecycle end; redemption complete

**Preconditions:** NFT exists; not frozen; owner authorization or system trigger

**Postconditions:** NFT destroyed; supply reduced; portfolio updated; associated rights terminated

**Business Meaning:** The NFT has been permanently removed from circulation. All associated rights and benefits are extinguished.

**Event Category:** Core

**Ordering Requirements:** Per-asset; must follow NFTMinted

**Idempotency Requirements:** Keyed by tokenId; burned at most once

**Replay Requirements:** Replay burns token and reduces collection supply; reconcile with portfolio

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Token ID, collection ID, previous owner, reason code (owner/system/redeem), on-chain burn transaction hash, burned timestamp

**Failure Handling:** Burn failure requires admin intervention; on-chain burn may have gas implications

**Related Events:** NFTMinted, NFTRedeemed, OwnershipBurned

**Notes:** Burning is final and irreversible. NFT achievements (soulbound) are never burned per Network Engine constitution.

---

### NFTRedeemed

**Purpose:** Records that an NFT has been redeemed for a real-world asset or benefit.

**Bounded Context:** NFT

**Aggregate:** NFTAsset

**Producer:** Ownership Model

**Consumers:** SPV / Legal, Audit, Document Vault

**Trigger:** Holder redeems title-art or property-linked NFT for legal claim

**Preconditions:** NFT is redeemable type (title art); holder verified; redemption conditions met

**Postconditions:** NFT moved to REDEEMED state; legal ownership process initiated; NFT scheduled for burn after legal completion

**Business Meaning:** The NFT representing a legal claim has been exercised. The holder pursues legal ownership.

**Event Category:** Core

**Ordering Requirements:** Per-asset; must follow NFTMinted; may precede NFTBurned

**Idempotency Requirements:** Keyed by tokenId; redeemed at most once

**Replay Requirements:** Replay marks NFT redeemed; legal process tracked separately

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Token ID, property ID, SPV ID, redeemer ID, legal reference, redemption timestamp

**Failure Handling:** Redemption failure may require legal intervention; AlertRaised

**Related Events:** NFTMinted, NFTBurned, PropertyArchived

**Notes:** Redemption is only available for specific NFT classes (title art, property-linked). Legal process is outside the platform.

---

### NFTUpgraded

**Purpose:** Records that an NFT has been upgraded to a higher tier or evolved state.

**Bounded Context:** NFT

**Aggregate:** NFTAsset

**Producer:** Royalty Engine / System

**Consumers:** Portfolio, Network Engine (rank score), Notification, Audit

**Trigger:** Tier requirements met; evolution recipe applied; milestone achieved

**Preconditions:** NFT eligible for upgrade; requirements satisfied

**Postconditions:** NFT tier or state updated; metadata refreshed; portfolio and network score updated

**Business Meaning:** The NFT has advanced to a higher tier with enhanced benefits and properties.

**Event Category:** Business

**Ordering Requirements:** Per-asset; must follow NFTMinted

**Idempotency Requirements:** Keyed by tokenId + upgradeId; upgraded at most once

**Replay Requirements:** Replay applies upgrade and updates attributes

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Token ID, previous tier, new tier, upgrade recipe, requirement fulfillment reference, upgraded timestamp

**Failure Handling:** Upgrade failure rolls back to previous state; retry

**Related Events:** NFTMinted, NFTMetadataUpdated, NFTAccessGranted

**Notes:** Upgrades are one-directional. Downgrade is not supported. Upgraded NFTs retain all prior benefits.

---

### NFTFused

**Purpose:** Records that multiple NFTs have been fused into a single higher-tier NFT.

**Bounded Context:** NFT

**Aggregate:** NFTAsset

**Producer:** Royalty Engine / System

**Consumers:** Portfolio, Network Engine, Notification, Audit

**Trigger:** Fusion recipe applied with required component NFTs

**Preconditions:** All component NFTs owned and not frozen; fusion recipe valid

**Postconditions:** Component NFTs burned; fused NFT minted to owner; combined attributes and benefits applied

**Business Meaning:** Multiple NFTs have been combined into a more powerful single NFT.

**Event Category:** Business

**Ordering Requirements:** Per-fusion; must follow NFTMinted for each component

**Idempotency Requirements:** Keyed by fusionId; fused at most once

**Replay Requirements:** Replay burns components and mints fused token; reconcile with portfolio

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Fusion ID, component token IDs (list), resulting token ID, recipe reference, owner ID, fused timestamp

**Failure Handling:** Fusion failure rolls back all operations; AlertRaised

**Related Events:** NFTMinted, NFTBurned, NFTUpgraded

**Notes:** Fused NFTs are immutable post-creation. Component NFTs are permanently burned.

---

### NFTEvolved

**Purpose:** Records that an NFT has evolved based on dynamic on-chain or off-chain conditions.

**Bounded Context:** NFT

**Aggregate:** NFTAsset

**Producer:** Royalty Engine / System

**Consumers:** Portfolio, Network Engine, Notification, Audit

**Trigger:** Evolution condition met (time-based, usage-based, event-based)

**Preconditions:** NFT supports evolution; conditions satisfied

**Postconditions:** NFT state, metadata, or attributes updated

**Business Meaning:** The NFT has transformed based on its environment or usage patterns.

**Event Category:** Business

**Ordering Requirements:** Per-asset; must follow NFTMinted

**Idempotency Requirements:** Keyed by tokenId + evolutionId; evolved at most once per evolution

**Replay Requirements:** Replay evolves NFT; conditions re-evaluated

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Token ID, previous state, new state, evolution trigger, condition data, evolved timestamp

**Failure Handling:** Evolution failure retains prior state; retry on next condition check

**Related Events:** NFTMinted, NFTUpgraded, NFTMetadataUpdated

**Notes:** Evolution is distinct from upgrade: evolution is automatic when conditions are met, while upgrade is intentional.

---

### NFTAccessGranted

**Purpose:** Records that an NFT has granted access to a platform benefit or feature.

**Bounded Context:** NFT

**Aggregate:** NFTAccess

**Producer:** System

**Consumers:** Marketplace (privileges), Governance (multiplier), Global Map, Treasury, Audit

**Trigger:** NFT minted or upgraded with access rights; benefit period started

**Preconditions:** NFT type carries access rights

**Postconditions:** Access right recorded; benefit applied; platform feature unlocked

**Business Meaning:** The NFT holder has been granted a specific platform benefit or access privilege.

**Event Category:** Business

**Ordering Requirements:** Per-asset; must follow NFTMinted or NFTUpgraded

**Idempotency Requirements:** Keyed by accessId + tokenId; granted at most once per benefit period

**Replay Requirements:** Replay grants access rights; reconcile with current NFT state

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Token ID, collection ID, holder ID, benefit type, target reference, grant timestamp, expiry timestamp (if applicable)

**Failure Handling:** Access grant failure does not affect NFT; retry; AlertRaised

**Related Events:** NFTMinted, NFTUpgraded, NFTTransferred (access may transfer)

**Notes:** Access rights may be permanent or time-bound. Certain access rights (voting multipliers) are non-transferable.

---

### NFTMetadataUpdated

**Purpose:** Records that NFT metadata has been updated to a new version.

**Bounded Context:** NFT

**Aggregate:** NFTAsset

**Producer:** Royalty Engine / System

**Consumers:** Discovery, Portfolio, Dividend Center, Audit

**Trigger:** Dynamic metadata change; IPFS content update; evolution metadata change

**Preconditions:** NFT exists; metadata change authorized

**Postconditions:** Metadata URI or content hash updated; new version recorded

**Business Meaning:** The NFT metadata has been refreshed to reflect new content or state.

**Event Category:** Business

**Ordering Requirements:** Per-asset; chronological

**Idempotency Requirements:** Keyed by tokenId + version; updated at most once per version

**Replay Requirements:** Replay applies metadata update; content hash verified

**Versioning Rules:** Additive fields only

**Security Classification:** Public

**Retention Classification:** Standard

**Audit Requirements:** Token ID, previous content hash, new content hash, metadata URI, updated by, updated timestamp

**Failure Handling:** Metadata update failure does not affect NFT ownership; retry

**Related Events:** NFTMinted, NFTUpgraded, NFTEvolved

**Notes:** Metadata updates are non-structural (attributes, images, description). Token identity and ownership are never changed.

---

### NFTBlacklisted

**Purpose:** Records that an NFT or address has been blacklisted from platform interactions.

**Bounded Context:** NFT

**Aggregate:** NFTBlacklist

**Producer:** Security / Compliance

**Consumers:** Transfer Model (block), Admin, Audit

**Trigger:** Compliance violation; sanctioned address; fraud determination

**Preconditions:** Address or NFT identified as violating policy

**Postconditions:** Address or NFT blacklisted; all transfers blocked; marketplace access revoked

**Business Meaning:** The address or NFT is prohibited from platform interaction due to policy violation.

**Event Category:** Security

**Ordering Requirements:** Per-address or per-token; applies immediately

**Idempotency Requirements:** Keyed by target (address/tokenId); blacklisted at most once

**Replay Requirements:** Replay applies blacklist; reconcile with access state

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Target type (address/token), target identifier, reason code, evidence reference, actor ID, blacklisted timestamp

**Failure Handling:** Blacklist failure may allow prohibited activity; immediate retry; AlertRaised

**Related Events:** NFTFrozen, ComplianceFlagRaised, KYCRejected

**Notes:** Blacklisting is more severe than freezing. Blacklisted NFTs cannot be unfrozen without compliance override.

---

# S13 — Dividend

The Dividend bounded context manages the distribution of property income to fractional token holders. It covers dividend calculation, approval, scheduling, distribution, claiming, and tax documentation. Dividends are funded from property net income and distributed proportionally to ownership snapshots.

---

### DividendCalculated

**Purpose:** Records that the dividend pool has been calculated for a property cycle.

**Bounded Context:** Dividend

**Aggregate:** Dividend

**Producer:** Dividend Engine

**Consumers:** Governance (approval), Treasury (funding), Audit

**Trigger:** Dividend cycle evaluation; property net income determined

**Preconditions:** Property operational; net income available for distribution period

**Postconditions:** Dividend created in PENDING state; pool amount computed; eligible holder count determined

**Business Meaning:** The dividend amount available for distribution has been calculated based on property income for the period.

**Event Category:** Core

**Ordering Requirements:** Per-property per-cycle; must precede all other dividend events for the cycle

**Idempotency Requirements:** Keyed by dividendId; calculated at most once per cycle

**Replay Requirements:** Replay recalculates dividend pool from property income data

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Dividend ID, property ID, cycle period, net income, distribution policy percentage, pool amount, eligible holder count, calculation timestamp

**Failure Handling:** Calculation failure delays distribution; retry; AlertRaised if income data unavailable

**Related Events:** DividendApproved, DividendScheduled, DividendDistributed

**Notes:** Dividend calculation uses net income per the property financial statement. Distribution policy is defined per property at activation.

---

### DividendApproved

**Purpose:** Records that the calculated dividend has been approved for distribution.

**Bounded Context:** Dividend

**Aggregate:** Dividend

**Producer:** Governance / Treasury

**Consumers:** Dividend Engine (schedule), Treasury (funding), Audit

**Trigger:** Governance vote passes; treasury multi-sig approves

**Preconditions:** Dividend is PENDING or CALCULATED; approval authority validated

**Postconditions:** Dividend moved to APPROVED state; treasury funding initiated

**Business Meaning:** The dividend distribution has been authorized. Funding may proceed.

**Event Category:** Core

**Ordering Requirements:** Per-dividend; must follow DividendCalculated

**Idempotency Requirements:** Keyed by dividendId; approved at most once

**Replay Requirements:** Replay transitions dividend to approved; governance vote result verified

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Dividend ID, approver ID, approval type (governance/treasury), governance proposal reference (if applicable), approval timestamp

**Failure Handling:** Approval failure returns dividend to PENDING; resubmission required

**Related Events:** DividendCalculated, DividendScheduled, TreasuryFunded

**Notes:** Approval mechanism is determined by dividend size and property governance rules. Larger dividends require full governance approval.

---

### DividendScheduled

**Purpose:** Records that the approved dividend has been scheduled with a distribution date.

**Bounded Context:** Dividend

**Aggregate:** Dividend

**Producer:** Dividend Engine

**Consumers:** Ownership (take snapshot), Portfolio, Notification, Audit

**Trigger:** Treasury funding confirmed; dividend approved

**Preconditions:** Dividend is APPROVED; treasury funded

**Postconditions:** Dividend moved to SCHEDULED state; distribution date set; ownership snapshot taken at scheduling

**Business Meaning:** The dividend distribution date has been set. Ownership is snapshotted for entitlement.

**Event Category:** Core

**Ordering Requirements:** Per-dividend; must follow DividendApproved

**Idempotency Requirements:** Keyed by dividendId; scheduled at most once

**Replay Requirements:** Replay schedules dividend and recomputes ownership snapshot

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Dividend ID, schedule date, distribution date, record date (snapshot), ownership snapshot reference, total eligible units at schedule, scheduled timestamp

**Failure Handling:** Scheduling failure delays distribution; retry; AlertRaised on snapshot failure

**Related Events:** DividendApproved, OwnershipSnapshotTaken, DividendDistributed

**Notes:** The ownership snapshot is taken at scheduling time and is immutable for this dividend cycle. Transfers after scheduling do not affect this distribution.

---

### DividendDistributed

**Purpose:** Records that the dividend has been distributed to eligible holders.

**Bounded Context:** Dividend

**Aggregate:** Dividend

**Producer:** Dividend Engine

**Consumers:** Portfolio (value update), Treasury (movement), Notification, Tax Service, Audit

**Trigger:** Distribution date reached; funds dispersed to holders

**Preconditions:** Dividend is SCHEDULED; distribution date reached; sufficient funds available

**Postconditions:** Dividend moved to DISTRIBUTED state; per-holder payouts recorded; tax documents queued; portfolio values updated

**Business Meaning:** The dividend has been paid out to all eligible token holders at the snapshot.

**Event Category:** Core

**Ordering Requirements:** Per-dividend; must follow DividendScheduled

**Idempotency Requirements:** Keyed by dividendId; distributed at most once

**Replay Requirements:** Replay distributes dividends to all snapshotted holders; reconcile with treasury

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Dividend ID, total distributed amount, holder count, per-unit amount, distribution method, treasury movement reference, tax reporting reference, distributed timestamp

**Failure Handling:** Distribution failure for individual holders does not block others; retry for failed recipients; AlertRaised on systemic failure

**Related Events:** DividendScheduled, DividendClaimed, TaxDocumentIssued, PortfolioValueUpdated

**Notes:** Distribution may be auto-credited to holder wallets or require manual claim. Unclaimed amounts after expiry are recovered.

---

### DividendClaimed

**Purpose:** Records that an eligible holder has claimed their dividend distribution.

**Bounded Context:** Dividend

**Aggregate:** DividendPayment

**Producer:** Dividend Engine / Claim Portal

**Consumers:** Treasury (release), Ledger, Notification, Audit

**Trigger:** Holder claims dividend (auto or manual)

**Preconditions:** Dividend is DISTRIBUTED; holder is eligible per snapshot; not yet claimed

**Postconditions:** Dividend payment moved to CLAIMED state; funds released to holder wallet; transaction recorded

**Business Meaning:** The holder has received their dividend payment.

**Event Category:** Core

**Ordering Requirements:** Per-holder per-dividend; must follow DividendDistributed

**Idempotency Requirements:** Keyed by dividendId + holderId; claimed at most once

**Replay Requirements:** Replay credits holder; reconcile with distribution totals

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Dividend ID, holder ID, claimed amount, claim method (auto/manual), wallet address, transaction reference, claimed timestamp

**Failure Handling:** Claim failure retains entitlement; retry; manual payout if persistent

**Related Events:** DividendDistributed, TaxDocumentIssued

**Notes:** Auto-claim is the default for verified wallets. Manual claim window is configurable (typically 90 days).

---

### DividendRejected

**Purpose:** Records that a proposed dividend has been rejected during approval.

**Bounded Context:** Dividend

**Aggregate:** Dividend

**Producer:** Governance / Treasury

**Consumers:** Dividend Engine, Notification, Audit

**Trigger:** Governance vote fails; treasury declines approval; validation check failure

**Preconditions:** Dividend is PENDING or APPROVED state

**Postconditions:** Dividend moved to REJECTED state; no distribution occurs; funds may be returned or reallocated

**Business Meaning:** The dividend proposal has been declined. Holders will not receive this distribution.

**Event Category:** Core

**Ordering Requirements:** Per-dividend; must follow DividendCalculated

**Idempotency Requirements:** Keyed by dividendId; rejected at most once

**Replay Requirements:** Replay rejects dividend; reconcile with treasury

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Dividend ID, rejection reason, rejecting authority, governance proposal reference (if applicable), rejected timestamp

**Failure Handling:** Rejection is terminal; no retry; new dividend cycle must be initiated

**Related Events:** DividendCalculated, DividendApproved

**Notes:** Rejection reason may include: insufficient income validation, governance vote fail, treasury policy violation, or reconciliation error.

---

### DividendRecovered

**Purpose:** Records that unclaimed dividend amounts have been recovered after the claim window.

**Bounded Context:** Dividend

**Aggregate:** Dividend

**Producer:** Dividend Engine

**Consumers:** Treasury, Portfolio, Audit

**Trigger:** Claim window expired; unclaimed amounts identified

**Preconditions:** Dividend is DISTRIBUTED; claim window elapsed

**Postconditions:** Unclaimed amounts returned to treasury or property reserve; dividend cycle closed

**Business Meaning:** Unclaimed dividends have been recovered. The dividend lifecycle is complete.

**Event Category:** Core

**Ordering Requirements:** Per-dividend; must follow DividendDistributed

**Idempotency Requirements:** Keyed by dividendId; recovered at most once

**Replay Requirements:** Replay recovers unclaimed amounts; reconcile with distribution

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Dividend ID, total unclaimed amount, holders who did not claim count, recovery destination, recovered timestamp

**Failure Handling:** Recovery failure retains unclaimed funds in escrow; admin intervention required

**Related Events:** DividendDistributed, DividendClaimed

**Notes:** Recovery policy is jurisdiction-dependent. Some jurisdictions require unclaimed dividends to be held indefinitely.

---

### TaxDocumentIssued

**Purpose:** Records that a tax document has been generated for a dividend distribution.

**Bounded Context:** Dividend

**Aggregate:** TaxDocument

**Producer:** Tax Service

**Consumers:** Document Vault, Investor, Compliance, Audit

**Trigger:** Dividend distribution completed; tax reporting period

**Preconditions:** Dividend distributed; holder tax profile available

**Postconditions:** Tax document created and stored; investor notified; compliance record updated

**Business Meaning:** A tax record for dividend income has been issued to the holder.

**Event Category:** Derived

**Ordering Requirements:** Per-holder per-dividend; must follow DividendDistributed

**Idempotency Requirements:** Keyed by documentId; issued at most once per holder per dividend

**Replay Requirements:** Replay regenerates tax document from distribution data and holder tax profile

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Document ID, holder ID, dividend ID, amount, tax year, jurisdiction, withholding amount (if applicable), content hash, issued timestamp

**Failure Handling:** Tax document failure does not affect dividend distribution; retry; AlertRaised

**Related Events:** DividendDistributed, DividendClaimed

**Notes:** Tax documents are generated per jurisdiction requirements. Withholding tax is applied where required.

---

# S14 — Reward

The Reward bounded context manages non-commission incentives including periodic bonuses, RLKO token rewards, leadership pool distributions, and milestone recognitions. Rewards complement the commission engine and are governed by treasury-controlled budgets.

---

### IncentiveCredited

**Purpose:** Records that a non-commission incentive has been credited to an agent or investor.

**Bounded Context:** Reward

**Aggregate:** Reward

**Producer:** Rewards Engine

**Consumers:** Treasury (funding), Portfolio, Network Engine, Notification, Audit

**Trigger:** Bonus period evaluated; milestone achieved; leadership pool distributed

**Preconditions:** Eligibility criteria met; reward budget available; incentive program active

**Postconditions:** Incentive credited to recipient; reward recorded; treasury funding initiated

**Business Meaning:** An incentive reward has been awarded outside the commission structure.

**Event Category:** Core

**Ordering Requirements:** Per-recipient per-cycle; chronological

**Idempotency Requirements:** Keyed by rewardId; credited at most once

**Replay Requirements:** Replay credits reward; reconcile with budget and eligibility

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Recipient ID, reward type (bonus/RLKO/leadership/milestone), amount, currency, source program, budget reference, cycle period, credited timestamp

**Failure Handling:** Credit failure retains budget allocation; retry; AlertRaised on budget inconsistency

**Related Events:** RewardPaid, IncentiveProgramActivated, RankAchieved

**Notes:** Rewards are non-commission and do not affect override calculations. RLKO rewards may be subject to vesting.

---

### RewardPaid

**Purpose:** Records that a credited incentive reward has been paid to the recipient.

**Bounded Context:** Reward

**Aggregate:** Reward

**Producer:** Treasury

**Consumers:** Recipient Wallet, Ledger, Notification, Audit

**Trigger:** Settlement completed for reward distribution

**Preconditions:** Incentive credited; payment initiated; settlement confirmed

**Postconditions:** Reward moved to PAID state; funds delivered to recipient; transaction recorded

**Business Meaning:** The incentive reward funds have been transferred to the recipient.

**Event Category:** Core

**Ordering Requirements:** Per-reward; must follow IncentiveCredited

**Idempotency Requirements:** Keyed by rewardId; paid at most once

**Replay Requirements:** Replay pays reward; reconcile with treasury

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Reward ID, payment reference, settlement amount, method, transaction hash (if on-chain), paid timestamp

**Failure Handling:** Payment failure retains credit; retry; manual payout if persistent

**Related Events:** IncentiveCredited, SettlementCompleted

**Notes:** Payment method matches recipient preference (wallet/bank). RLKO rewards are on-chain transfers.

---

### IncentiveProgramActivated

**Purpose:** Records that an incentive program or bonus period has been activated.

**Bounded Context:** Reward

**Aggregate:** IncentiveProgram

**Producer:** Rewards Engine / Admin

**Consumers:** Rewards Engine, Network Engine, Notification, Audit

**Trigger:** Program start date reached; admin activation

**Preconditions:** Program defined and approved; budget allocated

**Postconditions:** Program moved to ACTIVE state; eligibility tracking begins; participants notified

**Business Meaning:** An incentive program is now live and accepting qualifying activity.

**Event Category:** Business

**Ordering Requirements:** Per-program; must precede IncentiveCredited for the program

**Idempotency Requirements:** Keyed by programId; activated at most once

**Replay Requirements:** Replay activates program; eligibility rules restored

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Program ID, program type, start date, end date, budget, eligibility criteria, activated timestamp

**Failure Handling:** Activation failure delays program; retry; AlertRaised

**Related Events:** IncentiveProgramDeactivated, IncentiveCredited

**Notes:** Program types include Monthly Bonus, Quarterly Bonus, Leadership Pool, RLKO Rewards, and Milestone Recognition.

---

### IncentiveProgramDeactivated

**Purpose:** Records that an incentive program has been deactivated or has ended.

**Bounded Context:** Reward

**Aggregate:** IncentiveProgram

**Producer:** Rewards Engine / Admin

**Consumers:** Rewards Engine, Network Engine, Notification, Audit

**Trigger:** Program end date reached; early termination

**Preconditions:** Program is ACTIVE

**Postconditions:** Program moved to DEACTIVATED state; no new rewards credited under this program

**Business Meaning:** The incentive program has concluded. No further rewards will be issued under it.

**Event Category:** Business

**Ordering Requirements:** Per-program; must follow IncentiveProgramActivated

**Idempotency Requirements:** Keyed by programId; deactivated at most once

**Replay Requirements:** Replay deactivates program; reconcile with pending credits

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Program ID, reason (scheduled end/early termination), actor ID (if manual), total rewards issued, deactivated timestamp

**Failure Handling:** Deactivation failure does not prevent new activations; retry

**Related Events:** IncentiveProgramActivated, IncentiveCredited

**Notes:** Early deactivation requires admin authority and may have legal implications for pending rewards.

---

### LeadershipPoolDistributed

**Purpose:** Records that the leadership pool has been distributed to eligible senior agents.

**Bounded Context:** Reward

**Aggregate:** LeadershipPool

**Producer:** Rewards Engine

**Consumers:** Treasury, Network Engine, Notification, Audit

**Trigger:** Quarterly distribution; pool allocation computed

**Preconditions:** Leadership pool funded; eligible recipients identified (Platinum+ ACTIVE)

**Postconditions:** Pool distributed; per-recipient IncentiveCredited events emitted; treasury settlement initiated

**Business Meaning:** The quarterly leadership pool has been shared among eligible senior agents.

**Event Category:** Core

**Ordering Requirements:** Per-quarter; chronological

**Idempotency Requirements:** Keyed by poolId; distributed at most once per quarter

**Replay Requirements:** Replay recomputes distribution from rank and volume data

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Pool ID, quarter, total pool amount, eligible recipient count, distribution weights, per-recipient amounts, treasury reference, distributed timestamp

**Failure Handling:** Distribution failure for individual recipients does not block others; retry; AlertRaised

**Related Events:** IncentiveCredited, RewardPaid, TreasuryFunded

**Notes:** Leadership pool is funded from treasury. Distribution weight is a function of rank tier, qualified team volume, and retention.

---

# S15 — Treasury

The Treasury bounded context manages all platform funds including revenue collection, allocation across domains, yield generation, multi-sig movement approval, and balance reconciliation. It is the authoritative record of all value movement within the platform.

---

### TreasuryDeposit

**Purpose:** Records that funds have been deposited into the treasury from revenue or external sources.

**Bounded Context:** Treasury

**Aggregate:** TreasuryAccount

**Producer:** Treasury Service

**Consumers:** Ledger, AI (health), Audit

**Trigger:** Revenue received; external deposit processed; refund recovery

**Preconditions:** Funds received and verified; source validated

**Postconditions:** Treasury balance increased; deposit recorded in ledger; allocation pipeline triggered

**Business Meaning:** Value has been added to the treasury from an income or funding source.

**Event Category:** Core

**Ordering Requirements:** Per-account; chronological

**Idempotency Requirements:** Keyed by depositId; deposited at most once

**Replay Requirements:** Replay deposits funds; reconcile with external records

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Deposit ID, source type (revenue/external/refund), amount, currency, source reference, ledger entry, deposited timestamp

**Failure Handling:** Deposit failure retains funds at source; retry; manual reconciliation if persistent

**Related Events:** TreasuryAllocated, TreasuryBalanced, TreasuryFunded

**Notes:** All deposits are recorded in the immutable ledger. Source types include property revenue, platform fees, external investment, and refund recovery.

---

### TreasuryWithdrawal

**Purpose:** Records that funds have been withdrawn from the treasury.

**Bounded Context:** Treasury

**Aggregate:** TreasuryAccount

**Producer:** Treasury Service

**Consumers:** Ledger, AI (health), Audit

**Trigger:** Governance execution; operational expense; buyback funding

**Preconditions:** Sufficient balance; authorized by governance or multi-sig

**Postconditions:** Treasury balance decreased; withdrawal recorded in ledger; destination updated

**Business Meaning:** Value has been moved out of the treasury to an external destination.

**Event Category:** Core

**Ordering Requirements:** Per-account; chronological

**Idempotency Requirements:** Keyed by withdrawalId; withdrawn at most once

**Replay Requirements:** Replay withdraws funds; reconcile with destination records

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Withdrawal ID, destination, amount, currency, reason code, authorization reference, governance proposal reference (if applicable), ledger entry, withdrawn timestamp

**Failure Handling:** Withdrawal failure retains funds; retry; AlertRaised on authorization failure

**Related Events:** TreasuryMovementApproved, TreasuryBalanced

**Notes:** All withdrawals require multi-sig approval per the Treasury Security Model. Large withdrawals require governance approval.

---

### TreasuryAllocated

**Purpose:** Records that treasury funds have been allocated across domains per allocation rules.

**Bounded Context:** Treasury

**Aggregate:** TreasuryAllocation

**Producer:** Treasury Service

**Consumers:** Dividend Center, Commission Engine, Reserve Management, Network Engine, AI (health), Ledger, Audit

**Trigger:** Revenue deposited; allocation rule triggered; periodic allocation

**Preconditions:** Treasury funds available; allocation rule active

**Postconditions:** Funds allocated to target domains; per-domain balance updated; allocation rule recorded

**Business Meaning:** Treasury funds have been distributed to operational domains per the allocation policy.

**Event Category:** Core

**Ordering Requirements:** Per-allocation; chronological

**Idempotency Requirements:** Keyed by allocationId; allocated at most once

**Replay Requirements:** Replay allocates funds; reconcile with domain balances

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Allocation ID, rule ID, total amount, splits (domain + amount + percentage), source account, per-domain ledger entries, allocated timestamp

**Failure Handling:** Allocation failure returns funds to unallocated; retry; AlertRaised on rule violation

**Related Events:** TreasuryDeposit, TreasuryFunded, ReserveUpdated

**Notes:** Allocation rules are defined in Treasury policy and may be modified by governance. Standard allocation includes reserves, dividends, commissions, and operations.

---

### TreasuryFunded

**Purpose:** Records that a specific domain has been funded from treasury allocation.

**Bounded Context:** Treasury

**Aggregate:** TreasuryFunding

**Producer:** Treasury Service

**Consumers:** Target domain (Dividend/Commission/Reserve), Ledger, Audit

**Trigger:** TreasuryAllocation executed; target domain funding triggered

**Preconditions:** Allocation completed; target domain identified

**Postconditions:** Target domain balance increased; funding recorded; domain may proceed with operations

**Business Meaning:** A domain has received its allocated funding from the treasury.

**Event Category:** Core

**Ordering Requirements:** Per-funding; must follow TreasuryAllocated

**Idempotency Requirements:** Keyed by fundingId; funded at most once

**Replay Requirements:** Replay funds domain; reconcile with allocation

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Funding ID, target domain, amount, currency, source allocation ID, domain ledger entry, funded timestamp

**Failure Handling:** Funding failure returns funds to allocation pool; retry; AlertRaised

**Related Events:** TreasuryAllocated, DividendApproved, CommissionPaid, ReserveUpdated

**Notes:** Domains include Dividend Treasury, Commission Treasury, Reserve Funds, Operational Budget, and Buyback Treasury.

---

### TreasuryMovementApproved

**Purpose:** Records that a treasury movement has been approved by multi-sig or governance.

**Bounded Context:** Treasury

**Aggregate:** TreasuryMovement

**Producer:** Treasury Service / Multi-sig / Governance

**Consumers:** All value movers, Ledger, Audit

**Trigger:** Movement request submitted; required approvals obtained

**Preconditions:** Movement request valid; sufficient balance; required approvals collected

**Postconditions:** Movement approved; execution queued; approval recorded

**Business Meaning:** A treasury value movement has been authorized. Execution proceeds.

**Event Category:** Core

**Ordering Requirements:** Per-movement; must follow movement request

**Idempotency Requirements:** Keyed by movementId; approved at most once

**Replay Requirements:** Replay approves movement; verify approval signatures

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Movement ID, amount, currency, source domain, destination domain, approver IDs, approval type (multi-sig/governance), governance proposal reference (if applicable), approved timestamp

**Failure Handling:** Approval failure blocks movement; resubmission requires new approvals; AlertRaised on threshold breach

**Related Events:** TreasuryDeposit, TreasuryWithdrawal, TreasuryAllocated, BuybackExecuted, DividendDistributed

**Notes:** Approval thresholds are defined in Treasury Security Model. Movements above threshold require governance approval.

---

### TreasuryRebalanced

**Purpose:** Records that treasury asset weights have been rebalanced to align with policy targets.

**Bounded Context:** Treasury

**Aggregate:** TreasuryPortfolio

**Producer:** Treasury Service

**Consumers:** Ledger, AI (health), Audit

**Trigger:** Periodic rebalance; post-buyback rebalance; allocation rule change

**Preconditions:** Current asset weights diverge from targets; rebalance authorized

**Postconditions:** Asset weights rebalanced; rebalance recorded; new weight targets set

**Business Meaning:** The treasury asset allocation has been adjusted to meet policy targets.

**Event Category:** Core

**Ordering Requirements:** Per-rebalance; chronological

**Idempotency Requirements:** Keyed by rebalanceId; rebalanced at most once per cycle

**Replay Requirements:** Replay rebalances weights; reconcile with asset balances

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Rebalance ID, before weights (domain + percentage), after weights (domain + percentage), total value rebalanced, policy version, rebalanced timestamp

**Failure Handling:** Rebalance failure retains prior weights; retry; AlertRaised on policy violation

**Related Events:** TreasuryAllocated, TreasuryBalanced, BuybackExecuted

**Notes:** Rebalancing never affects locked reserves without governance approval. Target weights are defined in Treasury policy.

---

### TreasuryYieldRealized

**Purpose:** Records that yield has been realized on treasury assets.

**Bounded Context:** Treasury

**Aggregate:** TreasuryYield

**Producer:** Treasury Service

**Consumers:** Ledger, AI (health), Allocation, Audit

**Trigger:** Yield bearing asset generates return; liquidity pool rewards; staking rewards

**Preconditions:** Yield generating position held; return received

**Postconditions:** Yield recorded; treasury balance increased; yield reinvestment or allocation triggered

**Business Meaning:** Investment return has been generated on treasury-held assets.

**Event Category:** Core

**Ordering Requirements:** Per-yield; chronological

**Idempotency Requirements:** Keyed by yieldId; recorded at most once

**Replay Requirements:** Replay records yield; reconcile with external yield source

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Yield ID, source (staking/liquidity/lending), asset type, amount, currency, yield period, reference transaction, realized timestamp

**Failure Handling:** Yield recording failure does not affect underlying asset; retry

**Related Events:** TreasuryDeposit, TreasuryAllocated, TreasuryBalanced

**Notes:** Yield is subject to market conditions and is not guaranteed. Yield allocation follows the same distribution policy as revenue.

---

### TreasuryBalanced

**Purpose:** Records that treasury balance has been verified after a significant movement.

**Bounded Context:** Treasury

**Aggregate:** TreasuryBalance

**Producer:** Treasury Service

**Consumers:** Ledger, AI (health), Audit

**Trigger:** Post-buyback; post-rebalance; post-large movement

**Preconditions:** Significant movement completed

**Postconditions:** Balance verified; health metrics recomputed; alert if out of bounds

**Business Meaning:** Treasury has verified its balance and health after a significant operation.

**Event Category:** Derived

**Ordering Requirements:** Per-domain; chronological

**Idempotency Requirements:** Keyed by balanceId; balanced at most once per cycle

**Replay Requirements:** Replay verifies balance; recompute health metrics

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Standard

**Audit Requirements:** Domain ID, balance before, balance after, movement reference, health metrics, policy compliance check passed, verified timestamp

**Failure Handling:** Balance verification failure does not affect treasury operations; AlertRaised

**Related Events:** BuybackExecuted, TreasuryRebalanced, TreasuryMovementApproved

**Notes:** Treasury balance verification is a safety check, not a reconciliation. Full reconciliation is performed by SettlementReconciled.

---

# S16 — Reserve

The Reserve bounded context manages the seven reserve sub-funds that serve as the platform risk backstop. It covers reserve funding, drawdowns, health monitoring, emergency usage, and insurance claims.

---

### ReserveUpdated

**Purpose:** Records that a reserve fund balance or target has been updated.

**Bounded Context:** Reserve

**Aggregate:** ReserveFund

**Producer:** Reserve Management

**Consumers:** Ledger, AI (reserve health), Alert, Audit

**Trigger:** Funding received; drawdown executed; target allocation changed

**Preconditions:** Reserve fund identified; update validated

**Postconditions:** Reserve balance or target updated; health recomputed; alert if below threshold

**Business Meaning:** A reserve fund has changed in balance or target allocation.

**Event Category:** Core

**Ordering Requirements:** Per-reserve; chronological

**Idempotency Requirements:** Keyed by reserveId + sequence; updated at most once per event

**Replay Requirements:** Replay updates reserve balance; reconcile with treasury movements

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Reserve ID, reserve type (Emergency/Insurance/Liquidity/Operational/Property/Protocol/Risk), balance before, balance after, target BPS, delta amount, source reference, updated timestamp

**Failure Handling:** Update failure does not affect reserve availability; retry; AlertRaised

**Related Events:** TreasuryFunded, EmergencyReserveUsed, InsuranceTriggered

**Notes:** Reserve types are: Emergency, Insurance, Liquidity, Operational, Property, Protocol, and Risk. Each has distinct funding and drawdown rules.

---

### EmergencyReserveUsed

**Purpose:** Records that the emergency reserve has been drawn down for incident response.

**Bounded Context:** Reserve

**Aggregate:** ReserveFund

**Producer:** Reserve / Emergency Treasury

**Consumers:** Ledger, Audit, Alert, AI, Network Engine (override fallback)

**Trigger:** Security incident; platform emergency; critical failure

**Preconditions:** Emergency declared; dual-control authorization obtained

**Postconditions:** Emergency reserve balance reduced; funds deployed; incident response initiated

**Business Meaning:** Emergency funds have been deployed to address a critical platform incident.

**Event Category:** Security

**Ordering Requirements:** Per-incident; chronological

**Idempotency Requirements:** Keyed by incidentId; used at most once per incident

**Replay Requirements:** Replay draws down emergency reserve; reconcile with incident records

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Incident ID, reserve ID, amount drawn, currency, reason code, authorizing actors, deployment destination, incident report reference, drawn timestamp

**Failure Handling:** Drawdown failure escalates to super admin; immediate manual intervention required; AlertRaised

**Related Events:** ReserveUpdated, ComplianceFlagRaised, SystemPaused

**Notes:** Emergency Reserve is the ultimate backstop. Dual-control authorization is mandatory per Treasury Security Model.

---

### InsuranceTriggered

**Purpose:** Records that an insurance claim has been validated and paid from the insurance reserve.

**Bounded Context:** Reserve

**Aggregate:** ReserveFund

**Producer:** Reserve / Insurance Service

**Consumers:** Ledger, Audit, Tax, Notification

**Trigger:** Insurance claim submitted and validated by compliance

**Preconditions:** Claim validated; insurance reserve funded; claim within policy limits

**Postconditions:** Insurance reserve decreased; payout made to beneficiary; claim recorded; tax implications processed

**Business Meaning:** An insurance claim has been approved and the payout has been made.

**Event Category:** Core

**Ordering Requirements:** Per-claim; chronological

**Idempotency Requirements:** Keyed by claimId; triggered at most once per claim

**Replay Requirements:** Replay processes insurance claim; reconcile with reserve balance

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Claim ID, reserve ID, payout amount, currency, beneficiary, claim type, compliance validation reference, policy reference, paid timestamp

**Failure Handling:** Claim payment failure retains reserve balance; retry; manual payout if persistent; AlertRaised

**Related Events:** ReserveUpdated, ComplianceFlagRaised, TaxDocumentIssued

**Notes:** Insurance reserve covers property insurance claims and platform liability claims. Claims above threshold require governance approval.

---

# S17 — Buyback and Burn

The Buyback and Burn bounded context manages the acquisition and permanent removal of RLKO tokens (and future tokens) from circulating supply. It covers buyback programs, execution, burn operations, and supply reduction tracking.

---

### BuybackProgramCreated

**Purpose:** Records that a buyback program has been established.

**Bounded Context:** Buyback and Burn

**Aggregate:** BuybackProgram

**Producer:** Treasury / Governance

**Consumers:** Buyback Engine, Treasury, AI (forecast), Audit

**Trigger:** Governance approval; treasury policy establishment

**Preconditions:** Program parameters defined; funding source identified; governance approved

**Postconditions:** Program created in ACTIVE state; funding allocation begins

**Business Meaning:** A buyback program has been authorized. Token acquisition may commence per program rules.

**Event Category:** Business

**Ordering Requirements:** Per-program; must precede BuybackExecuted

**Idempotency Requirements:** Keyed by programId; created at most once

**Replay Requirements:** Replay creates program; reconcile with treasury

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Program ID, program type (scheduled/market/governance/emergency/revenue), funding source, budget, frequency, max amount per execution, governance proposal reference, created timestamp

**Failure Handling:** Creation failure blocks buyback operations; admin intervention required

**Related Events:** BuybackExecuted, BuybackProgramPaused, TreasuryFunded

**Notes:** Buyback program types: Scheduled (recurring), Market (opportunistic), Governance (DAO-approved), Emergency (incident response), Revenue (% of protocol revenue).

---

### BuybackProgramPaused

**Purpose:** Records that a buyback program has been temporarily paused.

**Bounded Context:** Buyback and Burn

**Aggregate:** BuybackProgram

**Producer:** Treasury / Admin

**Consumers:** Buyback Engine, Treasury, Audit

**Trigger:** Market conditions; treasury policy change; governance vote

**Preconditions:** Program is ACTIVE

**Postconditions:** Program moved to PAUSED state; no new buybacks executed

**Business Meaning:** The buyback program is temporarily suspended. Executions will resume when unpaused.

**Event Category:** Business

**Ordering Requirements:** Per-program; must follow BuybackProgramCreated

**Idempotency Requirements:** Keyed by programId; paused at most once

**Replay Requirements:** Replay pauses program; reconcile with pending executions

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Standard

**Audit Requirements:** Program ID, reason code, actor ID, paused timestamp

**Failure Handling:** Pause failure does not prevent subsequent pause attempts; retry

**Related Events:** BuybackProgramCreated, BuybackProgramResumed

**Notes:** Emergency programs may not be paused once triggered.

---

### BuybackProgramResumed

**Purpose:** Records that a paused buyback program has been resumed.

**Bounded Context:** Buyback and Burn

**Aggregate:** BuybackProgram

**Producer:** Treasury / Admin

**Consumers:** Buyback Engine, Treasury, Audit

**Trigger:** Market conditions improved; treasury policy restored; governance vote

**Preconditions:** Program is PAUSED

**Postconditions:** Program returned to ACTIVE state; buyback executions may resume

**Business Meaning:** The buyback program is active again. Token acquisition may proceed.

**Event Category:** Business

**Ordering Requirements:** Per-program; must follow BuybackProgramPaused

**Idempotency Requirements:** Keyed by programId; resumed at most once

**Replay Requirements:** Replay resumes program; reconcile with schedule

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Standard

**Audit Requirements:** Program ID, reason code, actor ID, resumed timestamp

**Failure Handling:** Resume failure retains paused state; retry

**Related Events:** BuybackProgramPaused, BuybackExecuted

**Notes:** Resumption may include modified parameters (budget, frequency) per governance approval.

---

### BuybackExecuted

**Purpose:** Records that a buyback of tokens has been executed.

**Bounded Context:** Buyback and Burn

**Aggregate:** BuybackExecution

**Producer:** Buyback Engine

**Consumers:** Ledger, Treasury, Supply Model, AI, Audit

**Trigger:** Buyback program trigger conditions met; execution authorized

**Preconditions:** Program active; funding available; market conditions per program rules

**Postconditions:** Tokens acquired; buyback recorded; treasury balanced; tokens moved to buyback custody

**Business Meaning:** Tokens have been purchased on the market or via OTC for buyback purposes.

**Event Category:** Core

**Ordering Requirements:** Per-execution; must follow BuybackProgramCreated

**Idempotency Requirements:** Keyed by buybackId; executed at most once

**Replay Requirements:** Replay executes buyback; reconcile with treasury and token balances

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Buyback ID, program ID, asset, amount, currency, total cost, average price, execution method (market/OTC), source funding reference, treasury movement reference, transaction hash (if on-chain), executed timestamp

**Failure Handling:** Execution failure returns funds to treasury; retry; AlertRaised on market impact concerns

**Related Events:** BuybackProgramCreated, BurnExecuted, TreasuryBalanced, TreasuryMovementApproved

**Notes:** Buyback execution may be split across multiple transactions for market impact minimization. FX snapshot recorded at execution for non-native currency buybacks.

---

### BuybackCancelled

**Purpose:** Records that a buyback execution has been cancelled before completion.

**Bounded Context:** Buyback and Burn

**Aggregate:** BuybackExecution

**Producer:** Buyback Engine / Admin

**Consumers:** Treasury, Notification, Audit

**Trigger:** Market volatility; insufficient liquidity; administrative cancellation; compliance block

**Preconditions:** Buyback is PENDING or IN_PROGRESS

**Postconditions:** Buyback marked CANCELLED; funds returned to treasury; program allocation preserved

**Business Meaning:** The buyback was not completed. No tokens were acquired.

**Event Category:** Business

**Ordering Requirements:** Per-buyback; must follow BuybackExecuted or precede it

**Idempotency Requirements:** Keyed by buybackId; cancelled at most once

**Replay Requirements:** Replay cancels buyback; return funds to treasury

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Buyback ID, reason code, actor ID (if manual), funds returned reference, cancelled timestamp

**Failure Handling:** Cancel failure retains buyback in current state; admin intervention; AlertRaised

**Related Events:** BuybackExecuted, BuybackProgramCreated

**Notes:** Partial buybacks may be cancelled for the unexecuted portion only.

---

### BurnExecuted

**Purpose:** Records that tokens have been permanently burned and removed from supply.

**Bounded Context:** Buyback and Burn

**Aggregate:** BurnExecution

**Producer:** Burn Engine

**Consumers:** Ledger, Supply Model, AI (deflation), Audit

**Trigger:** Buyback custody received; governance approval; scheduled burn

**Preconditions:** Tokens in buyback custody or treasury; burn authorized

**Postconditions:** Tokens permanently destroyed; supply reduced; burn recorded; deflation metrics updated

**Business Meaning:** Tokens have been permanently removed from circulating supply. This is final and irreversible.

**Event Category:** Core

**Ordering Requirements:** Per-execution; must follow BuybackExecuted or governance approval

**Idempotency Requirements:** Keyed by burnId; executed at most once

**Replay Requirements:** Replay burns tokens; reconcile with supply model

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Burn ID, asset, amount, source (buyback reference or direct), authority reference, burn address or mechanism, supply before, supply after, transaction hash (if on-chain), burned timestamp

**Failure Handling:** Burn failure retains tokens; retry; manual intervention if persistent; AlertRaised

**Related Events:** BuybackExecuted, TreasuryBalanced, SupplyReductionUpdated

**Notes:** Burning is final and irreversible. Each burn is recorded in the immutable burn ledger. Burns may be batched for gas efficiency.

---

### BurnCancelled

**Purpose:** Records that a scheduled burn has been cancelled before execution.

**Bounded Context:** Buyback and Burn

**Aggregate:** BurnExecution

**Producer:** Burn Engine / Admin / Governance

**Consumers:** Treasury, Supply Model, Notification, Audit

**Trigger:** Governance vote; policy change; administrative decision

**Preconditions:** Burn is PENDING; not yet executed

**Postconditions:** Burn marked CANCELLED; tokens retained in treasury or buyback custody

**Business Meaning:** The scheduled burn will not proceed. Tokens will not be removed from supply.

**Event Category:** Business

**Ordering Requirements:** Per-burn; must precede BurnExecuted

**Idempotency Requirements:** Keyed by burnId; cancelled at most once

**Replay Requirements:** Replay cancels burn; tokens returned to source

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Burn ID, reason code, actor ID, governance reference (if applicable), cancelled timestamp

**Failure Handling:** Cancel failure retains burn in pending state; admin intervention

**Related Events:** BurnExecuted, BuybackExecuted

**Notes:** Cancelled burns do not affect supply. Tokens may be used for future burns or other purposes.

---

### SupplyReductionUpdated

**Purpose:** Records that the total supply reduction metric has been updated.

**Bounded Context:** Buyback and Burn

**Aggregate:** TokenSupply

**Producer:** Supply Model

**Consumers:** AI (deflation forecast), Portfolio, Governance, Audit

**Trigger:** BurnExecuted processed; minting event processed

**Preconditions:** Burn or mint event validated

**Postconditions:** Supply reduction metric updated; deflation ratio recomputed

**Business Meaning:** The net supply reduction has changed due to burn or mint activity.

**Event Category:** Derived

**Ordering Requirements:** Chronological

**Idempotency Requirements:** Keyed by sequence; recomputed from events

**Replay Requirements:** Replay recomputes supply from burn and mint events

**Versioning Rules:** Additive fields only

**Security Classification:** Public

**Retention Classification:** Permanent

**Audit Requirements:** Total supply before, total burned cumulative, total minted cumulative, net reduction, deflation ratio, event reference, updated timestamp

**Failure Handling:** Derived event; recomputation on replay corrects any inconsistency

**Related Events:** BurnExecuted, TokenMinted (future), BuybackExecuted

**Notes:** Supply reduction = cumulative burned minus cumulative minted. Deflation ratio = total burned / total ever minted.

---

# S18 — Governance

The Governance bounded context manages the decentralized decision-making layer of RELCKO. It handles proposals, voting, execution, parameter changes, and treasury-gated governance actions. Governance events are the authoritative record of community decisions.

---

### GovernanceProposalCreated

**Purpose:** Records that a new governance proposal has been submitted.

**Bounded Context:** Governance

**Aggregate:** Proposal

**Producer:** Governance Module / Eligible Voter

**Consumers:** Governance (voting), Notification, Portfolio, Audit

**Trigger:** Eligible voter or governance manager submits proposal

**Preconditions:** Proposer meets minimum voting power threshold; proposal parameters valid

**Postconditions:** Proposal created in PENDING or ACTIVE state; voting period initialized; eligible voters notified

**Business Meaning:** A governance decision has been proposed for community vote.

**Event Category:** Core

**Ordering Requirements:** Per-proposal; chronological

**Idempotency Requirements:** Keyed by proposalId; created at most once

**Replay Requirements:** Replay creates proposal and restores voting period

**Versioning Rules:** Additive fields only

**Security Classification:** Public

**Retention Classification:** Permanent

**Audit Requirements:** Proposal ID, proposer ID, proposal type, title hash, description hash, voting period, quorum requirement, created timestamp, voting power snapshot reference

**Failure Handling:** Creation failure requires resubmission; AlertRaised on system error

**Related Events:** VoteCast, ProposalExecuted, ProposalDefeated

**Notes:** Proposal types include Treasury Movement, Parameter Change, Governance Rule Change, Property Listing, and Emergency Action.

---

### VoteCast

**Purpose:** Records that a voter has cast their vote on an active proposal.

**Bounded Context:** Governance

**Aggregate:** Vote

**Producer:** Governance Module

**Consumers:** Governance (tally), Notification, Portfolio, Audit

**Trigger:** Eligible voter submits vote

**Preconditions:** Proposal is ACTIVE; voter is eligible (verified identity, sufficient voting power); not already voted

**Postconditions:** Vote recorded; vote weight calculated from voter power at snapshot; tally updated

**Business Meaning:** A governance participant has expressed their decision on a proposal.

**Event Category:** Core

**Ordering Requirements:** Per-proposal per-voter; must follow GovernanceProposalCreated

**Idempotency Requirements:** Keyed by proposalId + voterId; vote cast at most once

**Replay Requirements:** Replay casts vote; vote weight recomputed from governance snapshot

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Proposal ID, voter ID, vote direction (for/against/abstain), vote weight, voting power reference, voter identity verification level, cast timestamp

**Failure Handling:** Vote failure retains voter eligibility; retry; AlertRaised on tally corruption

**Related Events:** GovernanceProposalCreated, VotingPowerUpdated, ProposalExecuted

**Notes:** Vote weight is determined by voting power at proposal snapshot. Vote is irrevocable once cast.

---

### VotingPowerUpdated

**Purpose:** Records that an entity voting power has been recalculated.

**Bounded Context:** Governance

**Aggregate:** VotingPower

**Producer:** Governance Module

**Consumers:** Governance, Portfolio, Network Engine, Audit

**Trigger:** Ownership changed; NFT transferred; delegation changed; governance snapshot taken

**Preconditions:** Source event processed (OwnershipMinted, NFTTransferred, etc.)

**Postconditions:** Voting power recomputed and stored; governance eligibility updated

**Business Meaning:** The voting influence of an entity has changed based on their holdings and participation.

**Event Category:** Derived

**Ordering Requirements:** Per-entity; must follow triggering ownership or delegation event

**Idempotency Requirements:** Keyed by entityId + snapshotId; recomputed at most once per snapshot

**Replay Requirements:** Replay recomputes voting power from ownership state and delegation rules

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Entity ID, voting power before, voting power after, weight breakdown (holdings/delegation/NFT multiplier), as-of timestamp, snapshot reference

**Failure Handling:** Computation failure uses previous power; retry; AlertRaised

**Related Events:** OwnershipMinted, OwnershipTransferred, NFTTransferred, GovernanceProposalCreated

**Notes:** Voting power is a function of fraction ownership, NFT multipliers, and delegation. Snapshot is taken at proposal creation.

---

### ProposalExecuted

**Purpose:** Records that a passed governance proposal has been executed.

**Bounded Context:** Governance

**Aggregate:** Proposal

**Producer:** Governance Module

**Consumers:** Treasury (if financial), Network Engine, Property, Portfolio, Notification, Audit

**Trigger:** Proposal passes; execution conditions met; timelock elapsed

**Preconditions:** Proposal in APPROVED or PASSED state; quorum met; majority achieved; timelock elapsed

**Postconditions:** Proposal executed; actions applied (treasury movement, parameter change, property action); execution recorded

**Business Meaning:** The governance decision has been enacted. The community will is now platform state.

**Event Category:** Core

**Ordering Requirements:** Per-proposal; must follow VoteCast (sufficient votes)

**Idempotency Requirements:** Keyed by proposalId; executed at most once

**Replay Requirements:** Replay executes proposal; actions reapplied from proposal payload

**Versioning Rules:** Additive fields only

**Security Classification:** Public

**Retention Classification:** Permanent

**Audit Requirements:** Proposal ID, final tally, execution actions, treasury movement reference (if applicable), parameter change reference, executed timestamp

**Failure Handling:** Execution failure triggers governance alert; manual intervention via Admin; AlertRaised

**Related Events:** GovernanceProposalCreated, VoteCast, TreasuryMovementApproved, GovernanceParameterChanged

**Notes:** Execution may require multi-sig for treasury actions. Timelock is configurable per proposal type.

---

### ProposalDefeated

**Purpose:** Records that a governance proposal has failed to meet requirements.

**Bounded Context:** Governance

**Aggregate:** Proposal

**Producer:** Governance Module

**Consumers:** Notification, Proposer, Portfolio, Audit

**Trigger:** Voting period ends without quorum; majority not achieved; proposal vetoed

**Preconditions:** Proposal is ACTIVE; voting period ended

**Postconditions:** Proposal moved to DEFEATED state; no execution occurs; proposer notified

**Business Meaning:** The governance community did not approve the proposal. No action is taken.

**Event Category:** Core

**Ordering Requirements:** Per-proposal; must follow GovernanceProposalCreated

**Idempotency Requirements:** Keyed by proposalId; defeated at most once

**Replay Requirements:** Replay marks proposal defeated; reconcile with votes

**Versioning Rules:** Additive fields only

**Security Classification:** Public

**Retention Classification:** Permanent

**Audit Requirements:** Proposal ID, reason (quorum not met / majority not reached / veto), final tally, votes cast count, eligible voter count, defeated timestamp

**Failure Handling:** Defeat is terminal; new proposal may be submitted with revisions

**Related Events:** GovernanceProposalCreated, VoteCast

**Notes:** Defeated proposals may be resubmitted after a cooling period. Veto requires super admin authority.

---

### GovernanceParameterChanged

**Purpose:** Records that a governance parameter has been modified.

**Bounded Context:** Governance

**Aggregate:** GovParameter

**Producer:** Governance Module

**Consumers:** All modules, Notification, Audit

**Trigger:** GovernanceProposalExecuted with parameter change; governance rule update

**Preconditions:** Proposal passed and executed; parameter change authorized

**Postconditions:** Parameter updated; all modules notified of new value

**Business Meaning:** A platform governance parameter has been changed by community decision.

**Event Category:** Core

**Ordering Requirements:** Per-parameter; chronological

**Idempotency Requirements:** Keyed by parameterId + version; changed at most once per version

**Replay Requirements:** Replay applies parameter change; reconcile with dependent systems

**Versioning Rules:** Additive fields only

**Security Classification:** Public

**Retention Classification:** Permanent

**Audit Requirements:** Parameter name, previous value, new value, proposal reference, effective timestamp

**Failure Handling:** Parameter change failure retains old value; retry; AlertRaised on dependent system impact

**Related Events:** ProposalExecuted, GovernanceProposalCreated

**Notes:** Parameter changes include quorum thresholds, voting periods, proposal fees, execution timelocks, and delegation rules.

---

# S19 — Identity and Wallet

The Identity and Wallet bounded context manages user identity, authentication, wallet binding, authorization, and role management. It is the foundation of platform security and access control.

---

### IdentityVerified

**Purpose:** Records that a user identity has been verified through KYC/KYB.

**Bounded Context:** Identity and Wallet

**Aggregate:** Identity

**Producer:** Identity Service / Compliance

**Consumers:** Authorization, Wallet, Portfolio, Notification, Audit

**Trigger:** KYC/KYB approval; identity re-verification

**Preconditions:** Identity documents verified; compliance approved

**Postconditions:** Identity moved to VERIFIED state; unblocked gated actions; wallet binding finalized

**Business Meaning:** The person or entity behind an identity has been verified. They may now invest and transact.

**Event Category:** Core

**Ordering Requirements:** Per-identity; must follow KYCSubmitted

**Idempotency Requirements:** Keyed by identityId; verified at most once

**Replay Requirements:** Replay marks identity verified; restore authorization state

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Identity ID, verification method, verification level (basic/enhanced), compliance reference, verified timestamp

**Failure Handling:** Verification failure blocks gated actions; retry requires new KYC submission

**Related Events:** KYCSubmitted, KYCApproved, WalletLinked

**Notes:** Verification level determines investment limits and access scope.

---

### WalletLinked

**Purpose:** Records that a blockchain wallet has been linked to a verified identity.

**Bounded Context:** Identity and Wallet

**Aggregate:** Wallet

**Producer:** Identity Service

**Consumers:** Authorization, Portfolio, Treasury, Audit

**Trigger:** User submits wallet address; SIWE signature verified

**Preconditions:** Identity exists; wallet address valid; SIWE signature verified; wallet not already linked

**Postconditions:** Wallet linked to identity; wallet enabled for transactions; identity-wallet binding recorded

**Business Meaning:** A cryptocurrency wallet has been bound to a verified identity for platform transactions.

**Event Category:** Core

**Ordering Requirements:** Per-identity; must follow IdentityVerified

**Idempotency Requirements:** Keyed by walletId; linked at most once

**Replay Requirements:** Replay links wallet to identity; reconcile with authorization

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Wallet ID, identity ID, address, blockchain, SIWE signature verification reference, linked timestamp

**Failure Handling:** Link failure leaves wallet unlinked; retry with new signature

**Related Events:** IdentityVerified, WalletVerified

**Notes:** One wallet per identity. Wallet change requires compliance approval per anti-fraud rules.

---

### WalletVerified

**Purpose:** Records that a linked wallet has been verified through SIWE challenge.

**Bounded Context:** Identity and Wallet

**Aggregate:** Wallet

**Producer:** Identity Service

**Consumers:** Authorization, Treasury, Audit

**Trigger:** SIWE verification challenge completed successfully

**Preconditions:** Wallet linked to identity; SIWE signature verified

**Postconditions:** Wallet marked VERIFIED; address integrity confirmed; wallet enabled for value movements

**Business Meaning:** The wallet address ownership has been cryptographically proven.

**Event Category:** Core

**Ordering Requirements:** Per-wallet; must follow WalletLinked

**Idempotency Requirements:** Keyed by walletId; verified at most once

**Replay Requirements:** Replay verifies wallet; signature verification must be re-run

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Standard

**Audit Requirements:** Wallet ID, identity ID, address, verification method, signature reference, verified timestamp

**Failure Handling:** Verification failure retains wallet as unverified; retry required

**Related Events:** WalletLinked

**Notes:** SIWE verification is mandatory before any value movement from the wallet.

---

### PermissionGranted

**Purpose:** Records that a permission, role, or scope has been granted to an identity.

**Bounded Context:** Identity and Wallet

**Aggregate:** Permission

**Producer:** Authorization / Admin

**Consumers:** Authorization, Notification, Audit

**Trigger:** Role assignment; scope grant; temporary delegation

**Preconditions:** Granting authority validated; grant within policy limits

**Postconditions:** Permission applied; identity authorization scope expanded; grant recorded

**Business Meaning:** An identity has been granted additional platform permissions.

**Event Category:** Security

**Ordering Requirements:** Per-identity; chronological

**Idempotency Requirements:** Keyed by grantId; granted at most once

**Replay Requirements:** Replay applies permission grant; reconcile with authorization state

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Grant ID, identity ID, role/scope/permission, grantor ID, duration (if temporary), policy reference, granted timestamp

**Failure Handling:** Grant failure retains current permissions; retry; AlertRaised on policy violation

**Related Events:** PermissionRevoked, IdentityVerified, RoleChanged

**Notes:** Grants may be permanent or temporary. Temporary grants auto-expire.

---

### PermissionRevoked

**Purpose:** Records that a permission, role, or scope has been revoked from an identity.

**Bounded Context:** Identity and Wallet

**Aggregate:** Permission

**Producer:** Authorization / Admin

**Consumers:** Authorization, Notification, Audit

**Trigger:** Role removal; scope revocation; temporary grant expiry

**Preconditions:** Grant exists; revocation authority validated

**Postconditions:** Permission removed; identity authorization scope reduced; revocation recorded

**Business Meaning:** An identity has had their platform permissions reduced or removed.

**Event Category:** Security

**Ordering Requirements:** Per-identity; must follow PermissionGranted

**Idempotency Requirements:** Keyed by grantId; revoked at most once

**Replay Requirements:** Replay revokes permission; reconcile with authorization

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Grant ID, identity ID, role/scope/permission, revoker ID, reason, revocation timestamp

**Failure Handling:** Revoke failure retains permission; retry; AlertRaised

**Related Events:** PermissionGranted, RoleChanged

**Notes:** Revocation may be automatic (expiry) or manual (admin action). Active sessions are invalidated on critical revocations.

---

### RoleChanged

**Purpose:** Records that a user platform role has been changed.

**Bounded Context:** Identity and Wallet

**Aggregate:** Role

**Producer:** Admin

**Consumers:** Authorization, Notification, Audit

**Trigger:** Admin assigns/removes role; governance action

**Preconditions:** Authorized actor; role change within policy

**Postconditions:** Role applied; permissions recalculated; notification sent

**Business Meaning:** A user has been assigned a new platform role with associated permissions.

**Event Category:** Security

**Ordering Requirements:** Per-identity; chronological

**Idempotency Requirements:** Keyed by identityId + sequence; changed at most once per assignment

**Replay Requirements:** Replay applies role change; reconcile with permission model

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Identity ID, previous role, new role, actor ID, reason reference, changed timestamp

**Failure Handling:** Role change failure retains current role; retry

**Related Events:** PermissionGranted, PermissionRevoked, AdminActionLogged

**Notes:** Roles are additive per RBAC model. Role changes are audit-logged and immutable.

---

# S20 — Compliance

The Compliance bounded context manages KYC/KYB, AML, sanctions screening, risk rating, and regulatory reporting. It is the investigative and gating layer that ensures all platform participants meet regulatory requirements.

---

### KYCSubmitted

**Purpose:** Records that a user has submitted KYC documentation for identity verification.

**Bounded Context:** Compliance

**Aggregate:** KYC

**Producer:** Identity Service

**Consumers:** Compliance (review), Document Vault, Notification, Audit

**Trigger:** User submits KYC application with required documents

**Preconditions:** Identity created; required documents uploaded

**Postconditions:** KYC record created in PENDING state; compliance review queue updated; documents stored in vault

**Business Meaning:** A user has initiated the identity verification process.

**Event Category:** Core

**Ordering Requirements:** Per-identity; must precede KYCApproved or KYCRejected

**Idempotency Requirements:** Keyed by kycId; submitted at most once per identity

**Replay Requirements:** Replay creates KYC record; documents restored from vault

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** KYC ID, identity ID, document references, submission timestamp, jurisdiction

**Failure Handling:** Submission failure preserves user draft; retry

**Related Events:** KYCApproved, KYCRejected, IdentityVerified

**Notes:** KYC documents are stored securely in Document Vault with restricted access.

---

### KYCApproved

**Purpose:** Records that KYC verification has been approved by compliance.

**Bounded Context:** Compliance

**Aggregate:** KYC

**Producer:** Compliance Officer

**Consumers:** Identity (verify), Portfolio, Notification, Audit

**Trigger:** Compliance Officer approves KYC after review

**Preconditions:** KYC is PENDING; documents verified; AML check passed; human decision made

**Postconditions:** KYC moved to APPROVED state; identity eligibility granted; user notified

**Business Meaning:** The user identity has been verified and approved. Investing and transactions are now permitted.

**Event Category:** Core

**Ordering Requirements:** Per-KYC; must follow KYCSubmitted

**Idempotency Requirements:** Keyed by kycId; approved at most once

**Replay Requirements:** Replay approves KYC; triggers IdentityVerified

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** KYC ID, identity ID, approving officer ID, compliance case reference, risk rating, approved timestamp

**Failure Handling:** Approval failure retains KYC in PENDING; re-review required

**Related Events:** KYCSubmitted, KYCRejected, IdentityVerified

**Notes:** Human decision is mandatory per compliance architecture. AI may assist but cannot approve.

---

### KYCRejected

**Purpose:** Records that KYC verification has been rejected.

**Bounded Context:** Compliance

**Aggregate:** KYC

**Producer:** Compliance Officer

**Consumers:** Identity, Notification, Audit

**Trigger:** Compliance Officer rejects KYC after review

**Preconditions:** KYC is PENDING; documents insufficient or fraudulent

**Postconditions:** KYC moved to REJECTED state; identity restricted; user notified with reason; appeal path available

**Business Meaning:** The user identity verification has been declined.

**Event Category:** Core

**Ordering Requirements:** Per-KYC; must follow KYCSubmitted

**Idempotency Requirements:** Keyed by kycId; rejected at most once

**Replay Requirements:** Replay rejects KYC; restrict identity

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** KYC ID, identity ID, rejecting officer ID, reason code, evidence reference, rejected timestamp

**Failure Handling:** Rejection is terminal; new KYC submission required after address deficiencies

**Related Events:** KYCSubmitted, KYCApproved

**Notes:** Rejection reasons include insufficient documentation, identity mismatch, sanctions hit, or fraud detection.

---

### ComplianceApproved

**Purpose:** Records that a compliance check has been approved, clearing a gated action.

**Bounded Context:** Compliance

**Aggregate:** ComplianceCase

**Producer:** Compliance Officer

**Consumers:** Source module (Investment/Marketplace/NFT), Notification, Audit

**Trigger:** Compliance Officer reviews and approves a compliance case

**Preconditions:** Compliance case exists; all checks passed; human decision made

**Postconditions:** Case moved to APPROVED state; gated action unblocked; source module notified

**Business Meaning:** A compliance review has been passed. The related action may proceed.

**Event Category:** Core

**Ordering Requirements:** Per-case; must follow ComplianceFlagRaised

**Idempotency Requirements:** Keyed by caseId; approved at most once

**Replay Requirements:** Replay approves case; unblock gated action

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Case ID, source reference, approving officer ID, checks passed, risk rating, approved timestamp

**Failure Handling:** Approval failure retains block; re-review required

**Related Events:** ComplianceRejected, ComplianceFlagRaised, InvestmentAllocated

**Notes:** Compliance approval is distinct from KYC approval. It applies to specific actions (investment, trade, listing).

---

### ComplianceRejected

**Purpose:** Records that a compliance check has been rejected, blocking a gated action.

**Bounded Context:** Compliance

**Aggregate:** ComplianceCase

**Producer:** Compliance Officer

**Consumers:** Source module, Notification, Audit

**Trigger:** Compliance Officer rejects action after review

**Preconditions:** Compliance case exists; checks failed; human decision

**Postconditions:** Case moved to REJECTED state; gated action blocked; source module notified

**Business Meaning:** The compliance review has determined the action cannot proceed.

**Event Category:** Core

**Ordering Requirements:** Per-case; must follow ComplianceFlagRaised

**Idempotency Requirements:** Keyed by caseId; rejected at most once

**Replay Requirements:** Replay rejects case; block action

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Case ID, source reference, rejecting officer ID, reason code, evidence reference, rejected timestamp

**Failure Handling:** Rejection is terminal for this case; new application required

**Related Events:** ComplianceApproved, ComplianceFlagRaised

**Notes:** Rejection may trigger refund or cancellation of the related action.

---

### ComplianceFlagRaised

**Purpose:** Records that a compliance flag has been raised for investigation.

**Bounded Context:** Compliance

**Aggregate:** ComplianceFlag

**Producer:** Compliance / Fraud / Risk Engines

**Consumers:** Compliance Officer (triage), Source module, Notification, Audit

**Trigger:** Suspicious activity detected; threshold breached; AML hit

**Preconditions:** Detection signal received

**Postconditions:** Flag created in OPEN state; compliance queue updated; affected module notified

**Business Meaning:** A potential compliance issue has been detected and requires human investigation.

**Event Category:** Security

**Ordering Requirements:** Per-flag; chronological

**Idempotency Requirements:** Keyed by flagId; raised at most once per incident

**Replay Requirements:** Replay raises flag; reconcile with investigation

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Flag ID, source engine, severity, entity ID, reason code, evidence reference, raised timestamp

**Failure Handling:** Flag raise failure may miss compliance issue; AlertRaised on engine failure

**Related Events:** ComplianceApproved, ComplianceRejected, AMLAlertRaised

**Notes:** Flags are triaged by Compliance Officer. Resolution may be approval, rejection, freeze, or escalation.

---

### AMLAlertRaised

**Purpose:** Records that an AML screening has produced a positive alert.

**Bounded Context:** Compliance

**Aggregate:** AMLAlert

**Producer:** Compliance / Screening Service

**Consumers:** Compliance Officer, Risk Engine, Notification, Audit

**Trigger:** Sanctions match; PEP detection; adverse media; transaction pattern match

**Preconditions:** Screening rule triggered

**Postconditions:** Alert created; compliance queue updated; related entities flagged for review

**Business Meaning:** An anti-money laundering rule has been triggered. Investigation is required.

**Event Category:** Security

**Ordering Requirements:** Per-alert; chronological

**Idempotency Requirements:** Keyed by alertId; raised at most once per hit

**Replay Requirements:** Replay raises alert; re-screening may produce different results

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Alert ID, matched list, entity ID, match type, confidence, evidence reference, raised timestamp

**Failure Handling:** Alert failure may miss compliance obligation; immediate retry; AlertRaised

**Related Events:** ComplianceFlagRaised, ComplianceApproved, ComplianceRejected

**Notes:** AML alerts may require regulatory reporting (SAR/STR). Human decision is mandatory for disposition.

---

# S21 — Security

The Security bounded context manages platform security including incident response, threat detection, emergency lockdown, secrets rotation, and security audit events.

---

### IncidentCreated

**Purpose:** Records that a security incident has been detected and opened.

**Bounded Context:** Security

**Aggregate:** Incident

**Producer:** Incident Response / Security Monitoring

**Consumers:** Security team, Admin, Notification, Audit

**Trigger:** Threat detected; fraud confirmed; security violation; system anomaly

**Preconditions:** Detection signal received and correlated

**Postconditions:** Incident created in OPEN state; response team notified; affected systems identified

**Business Meaning:** A security event requiring investigation and response has been identified.

**Event Category:** Security

**Ordering Requirements:** Per-incident; chronological

**Idempotency Requirements:** Keyed by incidentId; created at most once per incident

**Replay Requirements:** Replay creates incident; reconcile with response timeline

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Incident ID, severity (low/medium/high/critical), source signals, affected domains, affected entities, created timestamp

**Failure Handling:** Incident creation failure may delay response; AlertRaised

**Related Events:** IncidentResolved, EmergencyLockdown, FraudDetected

**Notes:** Incidents may be auto-created from threat detection or manually by security team.

---

### IncidentResolved

**Purpose:** Records that a security incident has been contained and resolved.

**Bounded Context:** Security

**Aggregate:** Incident

**Producer:** Incident Response

**Consumers:** Security team, Admin, Notification, Audit

**Trigger:** Containment confirmed; recovery complete; post-mortem completed

**Preconditions:** Incident is OPEN; root cause identified; containment verified

**Postconditions:** Incident moved to RESOLVED state; post-mortem recorded; evidence preserved

**Business Meaning:** The security incident has been fully addressed. Normal operations resume.

**Event Category:** Security

**Ordering Requirements:** Per-incident; must follow IncidentCreated

**Idempotency Requirements:** Keyed by incidentId; resolved at most once

**Replay Requirements:** Replay resolves incident; evidence preserved

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Incident ID, resolution summary, containment actions, recovery verification, post-mortem reference, resolved timestamp

**Failure Handling:** Resolution failure retains open state; retry; escalation if unresolved

**Related Events:** IncidentCreated, EmergencyLockdown

**Notes:** Post-mortem includes root cause analysis, impact assessment, and preventive measures.

---

### EmergencyLockdown

**Purpose:** Records that an emergency lockdown has been activated, halting value paths.

**Bounded Context:** Security

**Aggregate:** EmergencyState

**Producer:** Super Admin / Emergency Multi-sig

**Consumers:** All modules (halt value movements), Treasury, Marketplace, Notification, Audit

**Trigger:** Critical security incident; platform compromise; regulatory directive

**Preconditions:** Emergency authority validated; dual-control obtained

**Postconditions:** System moved to LOCKDOWN state; all value paths halted; affected domains frozen; alert broadcast

**Business Meaning:** The platform has entered emergency lockdown. All value movements are suspended.

**Event Category:** Security

**Ordering Requirements:** Per-lockdown; must precede EmergencyLockdownLifted

**Idempotency Requirements:** Keyed by lockdownId; activated at most once per incident

**Replay Requirements:** Replay activates lockdown; halt value paths

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Lockdown ID, reason, authorizing actors, affected domains, halt timestamp

**Failure Handling:** Lockdown failure may expose platform to risk; immediate manual intervention; AlertRaised

**Related Events:** EmergencyLockdownLifted, IncidentCreated, SystemPaused

**Notes:** Lockdown is the highest severity action. Only Super Admin or Emergency multi-sig can activate.

---

### EmergencyLockdownLifted

**Purpose:** Records that an emergency lockdown has been lifted and normal operations resume.

**Bounded Context:** Security

**Aggregate:** EmergencyState

**Producer:** Super Admin / Emergency Multi-sig

**Consumers:** All modules (resume operations), Treasury, Marketplace, Notification, Audit

**Trigger:** Incident resolved; recovery verified; authority decision

**Preconditions:** Lockdown active; all clear obtained

**Postconditions:** Lockdown lifted; value paths restored; affected domains unfrozen; notification broadcast

**Business Meaning:** The emergency is over. Platform operations may resume normally.

**Event Category:** Security

**Ordering Requirements:** Per-lockdown; must follow EmergencyLockdown

**Idempotency Requirements:** Keyed by lockdownId; lifted at most once

**Replay Requirements:** Replay lifts lockdown; resume value paths

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Lockdown ID, authorizing actors, recovery verification reference, lifted timestamp

**Failure Handling:** Lift failure retains lockdown; retry; AlertRaised

**Related Events:** EmergencyLockdown, IncidentResolved

**Notes:** Lifting requires the same authority level as activation.

---

### FraudDetected

**Purpose:** Records that fraudulent activity has been detected by the fraud engine.

**Bounded Context:** Security

**Aggregate:** FraudCase

**Producer:** Fraud Engine

**Consumers:** Compliance (investigate), Risk Engine, Notification, Audit

**Trigger:** Fraud pattern detected; preventive control triggered; investigative alert

**Preconditions:** Deterministic rule or ML signal fired

**Postconditions:** Fraud case created; affected entities flagged; compliance notified

**Business Meaning:** Potential fraudulent activity has been identified. Investigation is required.

**Event Category:** Security

**Ordering Requirements:** Per-case; chronological

**Idempotency Requirements:** Keyed by caseId; detected at most once per incident

**Replay Requirements:** Replay detects fraud; reconcile with investigation

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Case ID, vector type, affected entities, evidence reference, confidence score, detected timestamp

**Failure Handling:** Detection failure may miss fraud; immediate retry; AlertRaised

**Related Events:** ComplianceFlagRaised, IncidentCreated, RiskScoreChanged

**Notes:** Fraud detection is advisory. Human investigation determines disposition.

---

### ThreatDetected

**Purpose:** Records that an active threat has been detected by security monitoring.

**Bounded Context:** Security

**Aggregate:** Threat

**Producer:** Risk / Fraud / Security Monitoring

**Consumers:** Incident Response, Security, Admin, Audit

**Trigger:** Anomaly threshold exceeded; attack pattern detected; infrastructure compromise

**Preconditions:** Monitoring signal validated

**Postconditions:** Threat recorded; severity assessed; incident response triggered

**Business Meaning:** An active threat to platform security has been identified.

**Event Category:** Security

**Ordering Requirements:** Per-threat; chronological

**Idempotency Requirements:** Keyed by threatId; detected at most once

**Replay Requirements:** Replay creates threat record

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Standard

**Audit Requirements:** Threat ID, type, severity, affected domain, evidence, detected timestamp

**Failure Handling:** Detection failure may delay response; AlertRaised

**Related Events:** IncidentCreated, EmergencyLockdown, FraudDetected

**Notes:** Threats are triaged for incident correlation. Critical threats may trigger automatic EmergencyLockdown.

---

### SecretRotated

**Purpose:** Records that a cryptographic secret or key has been rotated.

**Bounded Context:** Security

**Aggregate:** Secret

**Producer:** Infrastructure Security

**Consumers:** DR, Auth, Audit

**Trigger:** Scheduled rotation; compromise response; key expiry

**Preconditions:** Old key identified; new key generated

**Postconditions:** New key activated; old key retired; rotation recorded

**Business Meaning:** A platform cryptographic secret has been renewed.

**Event Category:** Security

**Ordering Requirements:** Per-secret; chronological

**Idempotency Requirements:** Keyed by rotationId; rotated at most once per version

**Replay Requirements:** Replay records rotation; key material not recoverable

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Secret ID, type, version, rotated timestamp

**Failure Handling:** Rotation failure retains old key; AlertRaised

**Related Events:** IncidentCreated

**Notes:** Key material is never included in event payload. Rotation is logged for audit compliance.

---

# S22 — Risk

The Risk bounded context manages continuous risk scoring across 12 domains. It produces risk signals that drive adaptive authentication, authorization decisions, and compliance review. Risk events are advisory and never directly block value movement.

---

### RiskScoreChanged

**Purpose:** Records that a risk score has changed for an entity or domain.

**Bounded Context:** Risk

**Aggregate:** RiskScore

**Producer:** Risk Engine

**Consumers:** Authorization (step-up), Compliance (re-rate), Fraud Engine, Observability, Audit

**Trigger:** Risk factor change; periodic recalculation; external signal

**Preconditions:** Score computation triggered

**Postconditions:** Score updated; threshold evaluation; downstream effects (step-up, alert) triggered if threshold crossed

**Business Meaning:** The risk assessment for an entity or domain has changed.

**Event Category:** Derived

**Ordering Requirements:** Per-entity per-domain; chronological

**Idempotency Requirements:** Keyed by entityId + domain; changed at most once per score version

**Replay Requirements:** Replay recomputes score from risk factors

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Standard

**Audit Requirements:** Entity ID, domain (Investor/Property/Agent/Treasury/etc.), score before, score after, band, top drivers, confidence, changed timestamp

**Failure Handling:** Score computation failure retains prior score; retry; AlertRaised

**Related Events:** FraudDetected, ComplianceFlagRaised, AlertRaised

**Notes:** Risk scores are advisory. Threshold actions (step-up, alert) are configured by policy. Scores are recomputed, never stored as source of truth.

---

# S23 — AI

The AI bounded context manages AI-generated recommendations, detection signals, forecasts, knowledge indexing, and model lifecycle. AI events are advisory only and never directly execute value movements.

---

### AIRecommendationGenerated

**Purpose:** Records that the AI has generated a recommendation for human review.

**Bounded Context:** AI

**Aggregate:** AIRecommendation

**Producer:** AI Engine

**Consumers:** Source module (Marketplace/Portfolio/Treasury/Compliance), Notification, Audit

**Trigger:** AI inference completed for a decision support request

**Preconditions:** Model loaded; input data available; explainability envelope generated

**Postconditions:** Recommendation recorded; surfaced to authorized human; human decision awaited

**Business Meaning:** An AI-generated recommendation is available for human decision.

**Event Category:** Advisory

**Ordering Requirements:** Per-recommendation; chronological

**Idempotency Requirements:** Keyed by recommendationId; generated at most once

**Replay Requirements:** Replay regenerates recommendation; inference results may differ

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Recommendation ID, engine type, source module, artifact reference, explainability envelope hash, model version, generated timestamp

**Failure Handling:** Generation failure does not affect platform operations; retry

**Related Events:** AIRecommendationAccepted, AIRecommendationRejected

**Notes:** AI recommendations are advisory only. Human decision is mandatory for value-moving actions per AI governance.

---

### AIRecommendationAccepted

**Purpose:** Records that a human has accepted an AI recommendation.

**Bounded Context:** AI

**Aggregate:** AIRecommendation

**Producer:** Human Reviewer

**Consumers:** AI Engine (feedback), Source module (execute), Audit

**Trigger:** Human accepts AI recommendation

**Preconditions:** Recommendation exists; human authorized

**Postconditions:** Recommendation closed as ACCEPTED; feedback recorded; downstream action initiated through normal gated path

**Business Meaning:** The AI recommendation has been accepted. The source module may act through its gated path.

**Event Category:** Advisory

**Ordering Requirements:** Per-recommendation; must follow AIRecommendationGenerated

**Idempotency Requirements:** Keyed by recommendationId; accepted at most once

**Replay Requirements:** Replay records acceptance; downstream action not re-triggered

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Recommendation ID, reviewer ID, accepted timestamp

**Failure Handling:** Acceptance failure retains recommendation for re-review

**Related Events:** AIRecommendationGenerated, AIRecommendationRejected

**Notes:** Acceptance triggers the normal gated execution path, not AI-authored execution.

---

### AIRecommendationRejected

**Purpose:** Records that a human has rejected an AI recommendation.

**Bounded Context:** AI

**Aggregate:** AIRecommendation

**Producer:** Human Reviewer

**Consumers:** AI Engine (feedback), Audit

**Trigger:** Human rejects AI recommendation

**Preconditions:** Recommendation exists; human authorized

**Postconditions:** Recommendation closed as REJECTED; reason recorded; feedback loop closed

**Business Meaning:** The AI recommendation was declined. No action is taken.

**Event Category:** Advisory

**Ordering Requirements:** Per-recommendation; must follow AIRecommendationGenerated

**Idempotency Requirements:** Keyed by recommendationId; rejected at most once

**Replay Requirements:** Replay records rejection; feedback preserved

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Recommendation ID, reviewer ID, reason, rejected timestamp

**Failure Handling:** Rejection is terminal for this recommendation

**Related Events:** AIRecommendationGenerated, AIRecommendationAccepted

**Notes:** Rejection reason is used for model improvement and audit.

---

### AIFraudDetected

**Purpose:** Records that the AI has detected potential fraudulent activity.

**Bounded Context:** AI

**Aggregate:** AIDetection

**Producer:** Compliance AI / Treasury AI

**Consumers:** Compliance Officer (triage), Fraud Engine, Notification, Audit

**Trigger:** AI model identifies fraud pattern

**Preconditions:** Model inference completed; detection threshold crossed

**Postconditions:** Detection recorded; compliance queue updated; human review required

**Business Meaning:** AI has identified activity that may be fraudulent. Human investigation is required.

**Event Category:** Advisory

**Ordering Requirements:** Per-detection; chronological

**Idempotency Requirements:** Keyed by detectionId; detected at most once per event

**Replay Requirements:** Replay records detection; inference may differ

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Standard

**Audit Requirements:** Detection ID, model version, entities involved, evidence reference, confidence score, detected timestamp

**Failure Handling:** Detection failure does not affect fraud prevention; retry

**Related Events:** AIRecommendationGenerated, ComplianceFlagRaised, FraudDetected

**Notes:** AI fraud detection is advisory. Human decision determines disposition.

---

### AIRiskDetected

**Purpose:** Records that the AI has detected an elevated risk condition.

**Bounded Context:** AI

**Aggregate:** AIDetection

**Producer:** Any AI Engine

**Consumers:** Relevant role, Notification, Audit

**Trigger:** AI model identifies risk above threshold

**Preconditions:** Model inference completed; risk threshold crossed

**Postconditions:** Risk detection recorded; relevant role notified

**Business Meaning:** AI has identified a risk condition that may require attention.

**Event Category:** Advisory

**Ordering Requirements:** Per-detection; chronological

**Idempotency Requirements:** Keyed by detectionId; detected at most once per event

**Replay Requirements:** Replay records detection

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Standard

**Audit Requirements:** Detection ID, risk level, domain, entities, evidence, detected timestamp

**Failure Handling:** Detection failure does not affect risk monitoring; retry

**Related Events:** RiskScoreChanged, AlertRaised

**Notes:** Risk detection is advisory. Actions are determined by human or automated policy.

---

### AIForecastGenerated

**Purpose:** Records that the AI has generated a forecast for a domain.

**Bounded Context:** AI

**Aggregate:** AIForecast

**Producer:** AI Engine

**Consumers:** Portfolio, Treasury, Governance, Notification, Audit

**Trigger:** Forecast request; scheduled generation

**Preconditions:** Historical data available; model loaded

**Postconditions:** Forecast recorded; surfaced to relevant modules

**Business Meaning:** An AI-generated forecast (cashflow, price, voting, revenue) is available.

**Event Category:** Advisory

**Ordering Requirements:** Per-domain; chronological

**Idempotency Requirements:** Keyed by forecastId; generated at most once per cycle

**Replay Requirements:** Replay regenerates forecast; results may differ

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Forecast ID, domain, model version, forecast period, confidence interval, generated timestamp

**Failure Handling:** Forecast failure does not affect operations; retry on next cycle

**Related Events:** AIRecommendationGenerated

**Notes:** Forecasts are advisory and not guaranteed. Multiple models may produce different forecasts.

---

### AIModelUpdated

**Purpose:** Records that an AI model version has been updated.

**Bounded Context:** AI

**Aggregate:** AIModel

**Producer:** Model Registry / Governance

**Consumers:** All AI engines, Observability, Audit

**Trigger:** Model promotion; rollback; new version deployed

**Preconditions:** Model validated; governance approved (if applicable)

**Postconditions:** Model version updated; consumers notified; performance baseline established

**Business Meaning:** The AI model in use has changed to a new version.

**Event Category:** System

**Ordering Requirements:** Per-model; chronological

**Idempotency Requirements:** Keyed by modelId + version; updated at most once per version

**Replay Requirements:** Replay records model version; inference results may differ

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Model ID, previous version, new version, scope, changelog reference, performance delta, updated timestamp

**Failure Handling:** Update failure retains previous model version; retry; AlertRaised

**Related Events:** AIRecommendationGenerated, AIFraudDetected

**Notes:** Model updates are governed by AI Governance Board. Critical models require approval before promotion.

---

### KnowledgeIndexed

**Purpose:** Records that the AI knowledge layer has indexed new information.

**Bounded Context:** AI

**Aggregate:** KnowledgeIndex

**Producer:** Knowledge Layer

**Consumers:** AI Engines, Copilot, Audit

**Trigger:** Batch indexing completed; ecosystem event triggered re-index

**Preconditions:** Source data available

**Postconditions:** Knowledge indexed; searchable by AI engines

**Business Meaning:** New information has been added to the AI knowledge base.

**Event Category:** System

**Ordering Requirements:** Per-index batch; chronological

**Idempotency Requirements:** Keyed by batchId; indexed at most once per batch

**Replay Requirements:** Replay re-indexes from source data

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Batch ID, domain, fact range, provenance reference, record count, indexed timestamp

**Failure Handling:** Index failure retains prior index state; retry; AlertRaised

**Related Events:** AIModelUpdated, AIRecommendationGenerated

**Notes:** Knowledge indexing is asynchronous. Indexed data is available for AI inference after completion.

---

### MemoryUpdated

**Purpose:** Records that the AI memory layer has been updated.

**Bounded Context:** AI

**Aggregate:** AIMemory

**Producer:** Memory Layer

**Consumers:** AI Engines, Copilot, Audit

**Trigger:** User interaction; context change; consolidation cycle

**Preconditions:** Memory change triggered

**Postconditions:** Memory updated; AI context refreshed

**Business Meaning:** Long-term or contextual memory for an entity has been updated.

**Event Category:** System

**Ordering Requirements:** Per-entity; chronological

**Idempotency Requirements:** Keyed by memoryId + sequence; updated at most once per change

**Replay Requirements:** Replay updates memory; context may differ

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Memory ID, entity, class, action (capture/consolidate/forget), timestamp

**Failure Handling:** Memory update failure retains prior state; retry

**Related Events:** KnowledgeIndexed, AIRecommendationGenerated

**Notes:** Memory updates are advisory for context retention. Forgetting is governed by privacy policy.

---

# S24 — Document

The Document bounded context manages the lifecycle of all platform documents including prospectuses, SPV agreements, KYC documents, investment certificates, and tax documents. Documents are stored in the Document Vault with access control.

---

### DocumentUploaded

**Purpose:** Records that a document has been uploaded to the vault.

**Bounded Context:** Document

**Aggregate:** Document

**Producer:** User / System

**Consumers:** Document Vault, Compliance, Notification (if required), Audit

**Trigger:** User uploads document; system generates document

**Preconditions:** Upload authorized; document format valid

**Postconditions:** Document stored in vault; document record created in UPLOADED state; content hash recorded

**Business Meaning:** A new document has been added to the platform document store.

**Event Category:** Core

**Ordering Requirements:** Per-document; chronological

**Idempotency Requirements:** Keyed by documentId; uploaded at most once

**Replay Requirements:** Replay creates document record; content hash verified against stored content

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Document ID, type, category, uploader ID, content hash, document URI, file size, uploaded timestamp

**Failure Handling:** Upload failure retains prior state; retry; AlertRaised on storage failure

**Related Events:** DocumentVerified, DocumentAccessed, AccessGranted

**Notes:** Document categories include: Prospectus, SPV Agreement, Legal, Valuation, Insurance, KYC, Certificate, Tax, Financial.

---

### DocumentVerified

**Purpose:** Records that a document has been verified by compliance.

**Bounded Context:** Document

**Aggregate:** Document

**Producer:** Compliance / Verification Service

**Consumers:** Document Vault, Source module, Audit

**Trigger:** Compliance review passes; automated verification passes

**Preconditions:** Document is UPLOADED; review completed

**Postconditions:** Document moved to VERIFIED state; authenticity confirmed; downstream actions unblocked

**Business Meaning:** The document has been checked and confirmed as authentic and valid.

**Event Category:** Core

**Ordering Requirements:** Per-document; must follow DocumentUploaded

**Idempotency Requirements:** Keyed by documentId; verified at most once

**Replay Requirements:** Replay verifies document; verification result restored

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Document ID, verifier ID, verification method, verification timestamp

**Failure Handling:** Verification failure retains document in UPLOADED state; re-upload required

**Related Events:** DocumentUploaded, DocumentAccessed, KYCApproved

**Notes:** Verification may be automated (hash match, digital signature) or manual (human review). Investment gating depends on document verification.

---

### DocumentAccessed

**Purpose:** Records that a document has been accessed by an authorized party.

**Bounded Context:** Document

**Aggregate:** Document

**Producer:** Document Vault

**Consumers:** Audit, Compliance

**Trigger:** Authorized user views or downloads document

**Preconditions:** User has active AccessGrant; document exists

**Postconditions:** Access recorded in audit log; access timestamp stored

**Business Meaning:** A document was viewed or downloaded by an authorized entity.

**Event Category:** Security

**Ordering Requirements:** Per-document per-entity; chronological

**Idempotency Requirements:** Keyed by accessId; logged at most once per access event

**Replay Requirements:** Replay records access; audit trail preserved

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Standard

**Audit Requirements:** Document ID, accessing identity ID, access type (view/download), timestamp

**Failure Handling:** Access logging failure does not prevent document access; AlertRaised

**Related Events:** AccessGranted, DocumentUploaded

**Notes:** All document access is audited per compliance requirements. PII/KYC documents have restricted access.

---

### AccessGranted

**Purpose:** Records that an entity has been granted access to a document.

**Bounded Context:** Document

**Aggregate:** AccessGrant

**Producer:** Document Vault / Admin

**Consumers:** Document Vault (enforce), Notification, Audit

**Trigger:** Document owner grants access; compliance grants access; system grants access

**Preconditions:** Grantor authorized; grantee identified; document exists

**Postconditions:** Access grant created; grantee may now access document

**Business Meaning:** An entity has been authorized to access a specific document.

**Event Category:** Security

**Ordering Requirements:** Per-grant; must precede DocumentAccessed

**Idempotency Requirements:** Keyed by grantId; granted at most once

**Replay Requirements:** Replay grants access; reconcile with document permissions

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Standard

**Audit Requirements:** Grant ID, document ID, grantee ID, grantor ID, permission level (read-only/download), duration (if temporary), granted timestamp

**Failure Handling:** Grant failure does not affect existing grants; retry

**Related Events:** DocumentAccessed, DocumentUploaded

**Notes:** Access grants may be permanent or time-bound. Temporary grants auto-expire.

---

# S25 — Administration

The Administration bounded context manages platform administration including system configuration, user management, override actions, and observability. Admin events wrap privileged mutations with immutable audit records.

---

### AdminActionLogged

**Purpose:** Records that an administrative action has been performed.

**Bounded Context:** Administration

**Aggregate:** AdminLog

**Producer:** Admin Portal

**Consumers:** Audit, Observability, Notification

**Trigger:** Admin performs privileged action (override, config change, user management)

**Preconditions:** Admin authenticated; action authorized by permission model

**Postconditions:** Action executed; immutable audit record created

**Business Meaning:** A privileged administrative action has been taken and recorded.

**Event Category:** Security

**Ordering Requirements:** Chronological

**Idempotency Requirements:** Keyed by logId; logged at most once

**Replay Requirements:** Replay records action; original side effects not replayed

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Log ID, admin ID, action type, target entity, target ID, previous state hash, new state hash, reason, timestamp

**Failure Handling:** Logging failure does not prevent action; AlertRaised on audit gap

**Related Events:** RoleChanged, SystemPaused, AlertRaised

**Notes:** Admin actions wrap all privileged mutations. The immutable log is the definitive record for compliance and investigation.

---

### SystemPaused

**Purpose:** Records that platform operations have been paused for maintenance or emergency.

**Bounded Context:** Administration

**Aggregate:** SystemState

**Producer:** Admin / Super Admin

**Consumers:** All modules, Notification, Audit

**Trigger:** Scheduled maintenance; emergency lockdown; admin decision

**Preconditions:** Pause authorized; impact assessed

**Postconditions:** System moved to PAUSED state; user-facing operations halted; background processes continue

**Business Meaning:** The platform is temporarily unavailable for user operations.

**Event Category:** System

**Ordering Requirements:** Must precede SystemResumed

**Idempotency Requirements:** Keyed by pauseId; paused at most once

**Replay Requirements:** Replay pauses system; operations halted

**Versioning Rules:** Additive fields only

**Security Classification:** Public

**Retention Classification:** Standard

**Audit Requirements:** Pause ID, reason (maintenance/emergency), authorized actor, affected services, paused timestamp

**Failure Handling:** Pause failure may affect service continuity; AlertRaised

**Related Events:** SystemResumed, EmergencyLockdown

**Notes:** System pause is broadcast to all users. Scheduled maintenance is announced in advance.

---

### SystemResumed

**Purpose:** Records that platform operations have resumed after pause.

**Bounded Context:** Administration

**Aggregate:** SystemState

**Producer:** Admin / Super Admin

**Consumers:** All modules, Notification, Audit

**Trigger:** Maintenance completed; emergency cleared; admin decision

**Preconditions:** System is PAUSED

**Postconditions:** System returned to ACTIVE state; normal operations resume

**Business Meaning:** The platform is fully operational again.

**Event Category:** System

**Ordering Requirements:** Must follow SystemPaused

**Idempotency Requirements:** Keyed by pauseId; resumed at most once

**Replay Requirements:** Replay resumes system; operations restored

**Versioning Rules:** Additive fields only

**Security Classification:** Public

**Retention Classification:** Standard

**Audit Requirements:** Pause ID, authorized actor, resumed timestamp

**Failure Handling:** Resume failure retains paused state; manual intervention required; AlertRaised

**Related Events:** SystemPaused

**Notes:** System resume may include service health verification before full restoration.

---

# S26 — Audit

The Audit bounded context manages the immutable audit log that mirrors all platform events. It provides the definitive record for compliance, investigation, and regulatory reporting.

---

### AuditTrailRecorded

**Purpose:** Records that an audit trail entry has been written to the immutable audit log.

**Bounded Context:** Audit

**Aggregate:** AuditLog

**Producer:** All modules (mirror)

**Consumers:** Compliance, Admin, Regulatory Reporting, Audit

**Trigger:** Any domain event emitted; audit checkpoint reached

**Preconditions:** Source event or action occurred

**Postconditions:** Audit entry appended to immutable log; integrity chain updated

**Business Meaning:** An auditable event has been permanently recorded in the platform audit trail.

**Event Category:** System

**Ordering Requirements:** Chronological global order

**Idempotency Requirements:** Keyed by auditEntryId; recorded at most once

**Replay Requirements:** Replay restores audit log from source events; integrity chain verified

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Audit entry ID, source event ID, event type, aggregate ID, actor ID, timestamp, payload hash, previous entry hash (chain), entry timestamp

**Failure Handling:** Audit recording failure may create gap; immediate retry; AlertRaised on persistent failure

**Related Events:** All events (audit mirrors all events), FinancialAuditCompleted, AuditExported

**Notes:** The audit log is an append-only hash chain. Entries cannot be modified or deleted. Retention follows jurisdictional requirements.

---

### FinancialAuditCompleted

**Purpose:** Records that a periodic financial audit has verified ledger and treasury consistency.

**Bounded Context:** Audit

**Aggregate:** AuditReport

**Producer:** Audit / Reporting Service

**Consumers:** Compliance, Treasury, Admin, AI, Audit

**Trigger:** Scheduled audit cycle; manual audit request

**Preconditions:** Audit run triggered; all required data available

**Postconditions:** Audit report generated; invariants verified; results recorded

**Business Meaning:** The platform financial records have been audited for consistency and integrity.

**Event Category:** Derived

**Ordering Requirements:** Per-cycle; chronological

**Idempotency Requirements:** Keyed by auditId; completed at most once per cycle

**Replay Requirements:** Replay re-runs audit; invariants re-verified

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Audit ID, period, invariants checked, invariants passed, discrepancies found, signature reference, completed timestamp

**Failure Handling:** Audit failure does not affect platform operations; discrepancies may require investigation; AlertRaised

**Related Events:** AuditTrailRecorded, SettlementReconciled

**Notes:** Financial audits verify invariants: Escrow + Capital + Commission + Refunds == Investment Ledger. Discrepancies trigger compliance investigation.

---

### AuditExported

**Purpose:** Records that an audit data subset has been exported for regulatory or legal purposes.

**Bounded Context:** Audit

**Aggregate:** AuditExport

**Producer:** Compliance / Legal

**Consumers:** Compliance, Legal, Regulatory Body, Audit

**Trigger:** Regulatory request; legal proceeding; scheduled export

**Preconditions:** Export authorized; scope defined

**Postconditions:** Audit data exported; export recorded; regulatory body receives data

**Business Meaning:** A regulated audit export has been performed.

**Event Category:** Security

**Ordering Requirements:** Per-export; chronological

**Idempotency Requirements:** Keyed by exportId; exported at most once per request

**Replay Requirements:** Replay records export; data cannot be re-exported identically

**Versioning Rules:** Additive fields only

**Security Classification:** Confidential

**Retention Classification:** Permanent

**Audit Requirements:** Export ID, requesting body, scope definition, date range, entity filter, export destination, authorized actor, exported timestamp

**Failure Handling:** Export failure retains data; retry; legal implications if deadline missed; AlertRaised

**Related Events:** AuditTrailRecorded, FinancialAuditCompleted

**Notes:** Exports are scoped per jurisdictional requirements. PII is handled per privacy policy.

---

# S27 — Map

The Map bounded context manages the global property map, geocoding, region computation, and map layer updates. It provides geographic visualization and region-based analytics.

---

### PropertyGeocoded

**Purpose:** Records that a property has been geocoded with coordinates.

**Bounded Context:** Map

**Aggregate:** GeoProperty

**Producer:** Map Service

**Consumers:** Global Map, Discovery, Audit

**Trigger:** Property approved; address updated; geocoding re-run

**Preconditions:** Property exists; address available

**Postconditions:** Property coordinates stored; map layer updated; property visible on map

**Business Meaning:** The property location has been resolved to geographic coordinates.

**Event Category:** Derived

**Ordering Requirements:** Per-property; chronological

**Idempotency Requirements:** Keyed by propertyId; geocoded at most once per address version

**Replay Requirements:** Replay geocodes property; coordinates recomputed

**Versioning Rules:** Additive fields only

**Security Classification:** Public

**Retention Classification:** Standard

**Audit Requirements:** Property ID, address, latitude, longitude, geocoding source, accuracy, geocoded timestamp

**Failure Handling:** Geocoding failure preserves prior coordinates; retry; AlertRaised on persistent failure

**Related Events:** PropertyPublished, GeoRegionComputed, MapLayerUpdated

**Notes:** Geocoding is performed on property approval and address change. Accuracy varies by region.

---

### GeoRegionComputed

**Purpose:** Records that a geographic region has been computed or updated with property aggregates.

**Bounded Context:** Map

**Aggregate:** GeoRegion

**Producer:** Map Service

**Consumers:** Global Map, Discovery, Valuation, Audit

**Trigger:** Property geocoded within region; region boundary changed; scheduled recompute

**Preconditions:** Region defined; properties within region identified

**Postconditions:** Region aggregates computed (count, value, yield); map layer updated

**Business Meaning:** Region-level property statistics have been updated.

**Event Category:** Derived

**Ordering Requirements:** Per-region; chronological

**Idempotency Requirements:** Keyed by regionId; computed at most once per update cycle

**Replay Requirements:** Replay recomputes region aggregates from property data

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Region ID, property count, total value, average yield, as-of timestamp, computed timestamp

**Failure Handling:** Computation failure retains prior aggregates; retry

**Related Events:** PropertyGeocoded, MapLayerUpdated

**Notes:** Regions are hierarchical (continent/country/state/city/postcode). Aggregates are computed from public property data only.

---

### MapLayerUpdated

**Purpose:** Records that a map visualization layer has been updated.

**Bounded Context:** Map

**Aggregate:** MapLayer

**Producer:** Map Service

**Consumers:** Global Map, Discovery, Audit

**Trigger:** Property geocoded; region computed; layer configuration changed

**Preconditions:** Layer data refreshed

**Postconditions:** Map layer updated; visualization reflects new data

**Business Meaning:** A map layer has been refreshed with current data.

**Event Category:** Derived

**Ordering Requirements:** Per-layer; chronological

**Idempotency Requirements:** Keyed by layerId + version; updated at most once per version

**Replay Requirements:** Replay updates layer; visualization rebuilt

**Versioning Rules:** Additive fields only

**Security Classification:** Public

**Retention Classification:** Standard

**Audit Requirements:** Layer ID, layer type (properties/regions/heatmap), data version, feature count, updated timestamp

**Failure Handling:** Layer update failure retains prior visualization; retry

**Related Events:** PropertyGeocoded, GeoRegionComputed

**Notes:** Layer types include property pins, region boundaries, heat maps, and investor pins (private).

---

# S28 — Valuation

The Valuation bounded context manages property valuation records, NAV computation, and performance metrics. Valuations are an append-only time series used by Portfolio, Governance, Dividend Center, and Treasury.

---

### ValuationRecorded

**Purpose:** Records that a new valuation has been recorded for a property.

**Bounded Context:** Valuation

**Aggregate:** ValuationRecord

**Producer:** Valuation Engine

**Consumers:** Portfolio (NAV update), Governance (voting power weight), Dividend Center, Global Map, Audit

**Trigger:** Independent appraisal; market valuation recalculation; initial valuation at property approval

**Preconditions:** Property exists; valuation computation completed

**Postconditions:** Valuation record appended to time series; NAV recomputed; dependent projections triggered

**Business Meaning:** A new valuation point has been established for the property.

**Event Category:** Derived

**Ordering Requirements:** Per-property; chronological

**Idempotency Requirements:** Keyed by valuationId; recorded at most once

**Replay Requirements:** Replay appends valuation; reconcile with time series

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Permanent

**Audit Requirements:** Valuation ID, property ID, valuation type (initial/market/independent), value, currency, as-of date, source reference, appraiser reference (if independent), recorded timestamp

**Failure Handling:** Recording failure does not affect existing valuations; retry

**Related Events:** ValuationUpdated, PortfolioValueUpdated, PropertyPublished

**Notes:** Valuation types: Initial (at property approval), Market (platform model), Independent (third-party appraiser). Independent valuations require document verification.

---

### ValuationUpdated

**Purpose:** Records that the current valuation for a property has changed.

**Bounded Context:** Valuation

**Aggregate:** PropertyValuation

**Producer:** Valuation Engine

**Consumers:** Portfolio, NFT Marketplace, Global Map, Governance, Audit

**Trigger:** New valuation recorded; market price change; NAV recalculation

**Preconditions:** ValuationRecorded or price change detected

**Postconditions:** Current valuation updated; dependent modules notified

**Business Meaning:** The current reference valuation for the property has changed.

**Event Category:** Derived

**Ordering Requirements:** Per-property; must follow ValuationRecorded

**Idempotency Requirements:** Keyed by propertyId + sequence; updated at most once per valuation

**Replay Requirements:** Replay updates current valuation; recompute derived metrics

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Property ID, previous valuation, new valuation, valuation type, source reference, updated timestamp

**Failure Handling:** Update failure retains prior valuation; retry

**Related Events:** ValuationRecorded, PortfolioValueUpdated, SecondaryPriceUpdated

**Notes:** Valuation update triggers portfolio NAV recalculation. Large changes may trigger compliance review.

---

# S29 — Notification

The Notification bounded context manages the delivery of platform notifications across multiple channels including in-app, email, SMS, and on-chain alerts.

---

### NotificationSent

**Purpose:** Records that a notification has been sent to a recipient.

**Bounded Context:** Notification

**Aggregate:** Notification

**Producer:** Notification Service

**Consumers:** Recipient, Audit

**Trigger:** Domain event triggers notification; scheduled notification; manual notification

**Preconditions:** Recipient identified; notification content prepared; delivery channel available

**Postconditions:** Notification sent; delivery status recorded; retry scheduled if failed

**Business Meaning:** A platform notification has been dispatched to a user.

**Event Category:** System

**Ordering Requirements:** Chronological

**Idempotency Requirements:** Keyed by notificationId; sent at most once

**Replay Requirements:** Replay records notification; delivery not re-triggered

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Notification ID, recipient ID, notification type, channel (in-app/email/SMS/on-chain), source event reference, delivery status, sent timestamp

**Failure Handling:** Delivery failure triggers retry; AlertRaised on persistent failure after max retries

**Related Events:** All events may trigger NotificationSent

**Notes:** Notification delivery is at-least-once. Preferences are configurable per user per channel.

---

### AlertRaised

**Purpose:** Records that a system alert has been raised for monitoring or operations.

**Bounded Context:** Notification

**Aggregate:** Alert

**Producer:** Any module (system health, risk, security, operations)

**Consumers:** Admin, Operations, Notification, Audit

**Trigger:** Threshold breached; anomaly detected; system health degradation; error threshold exceeded

**Preconditions:** Alert condition evaluated and triggered

**Postconditions:** Alert recorded; notification sent to responsible team; escalation timer started

**Business Meaning:** A condition requiring attention has been detected.

**Event Category:** System

**Ordering Requirements:** Chronological

**Idempotency Requirements:** Keyed by alertId; raised at most once per condition

**Replay Requirements:** Replay raises alert; suppression rules re-evaluated

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Alert ID, severity, source module, condition, current value, threshold, entity reference, raised timestamp

**Failure Handling:** Alert failure may miss critical condition; retry; AlertRaised on alert engine failure

**Related Events:** AlertResolved, NotificationSent

**Notes:** Alert severity levels: Info, Warning, Error, Critical. Escalation policy defines response time per severity.

---

### AlertResolved

**Purpose:** Records that a system alert has been resolved.

**Bounded Context:** Notification

**Aggregate:** Alert

**Producer:** Any module / Admin

**Consumers:** Admin, Operations, Audit

**Trigger:** Condition cleared; manual acknowledgement; auto-resolution

**Preconditions:** Alert is OPEN; condition no longer triggered

**Postconditions:** Alert moved to RESOLVED state; escalation timer stopped

**Business Meaning:** The condition that triggered the alert has been addressed.

**Event Category:** System

**Ordering Requirements:** Per-alert; must follow AlertRaised

**Idempotency Requirements:** Keyed by alertId; resolved at most once

**Replay Requirements:** Replay resolves alert; escalation not re-triggered

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Alert ID, resolution type (auto/manual), resolver ID (if manual), resolution notes, resolved timestamp

**Failure Handling:** Resolution failure retains alert in OPEN state; retry

**Related Events:** AlertRaised

**Notes:** Critical alerts require manual resolution. Auto-resolution is available for transient conditions.

---

# S30 — System

The System bounded context manages platform-level concerns including event bus health, schema registry, system configuration, and cross-cutting operational events.

---

### SchemaVersionUpdated

**Purpose:** Records that an event schema version has been registered or updated.

**Bounded Context:** System

**Aggregate:** SchemaRegistry

**Producer:** Schema Registry

**Consumers:** All producers and consumers, Audit

**Trigger:** New event type registered; schema version incremented; schema deprecated

**Preconditions:** Schema change validated; compatibility verified

**Postconditions:** Schema registered; producers and consumers notified of version change

**Business Meaning:** The canonical schema for an event type has changed.

**Event Category:** System

**Ordering Requirements:** Per-event-type; chronological

**Idempotency Requirements:** Keyed by schemaId + version; registered at most once per version

**Replay Requirements:** Replay registers schema version

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Schema ID, event type, version, compatibility mode, schema hash, registered timestamp

**Failure Handling:** Registration failure blocks event production with new schema; AlertRaised

**Related Events:** All events (schema governs their structure)

**Notes:** Schema evolution follows additive-only rules. Breaking changes require new event type.

---

### EventBusHealthChecked

**Purpose:** Records that the event bus health has been verified.

**Bounded Context:** System

**Aggregate:** EventBus

**Producer:** Event Bus Monitoring

**Consumers:** Operations, Admin, Audit

**Trigger:** Scheduled health check; manual check

**Preconditions:** Health check triggered

**Postconditions:** Health status recorded; alert raised if unhealthy

**Business Meaning:** The event bus infrastructure has been verified as operational.

**Event Category:** System

**Ordering Requirements:** Chronological

**Idempotency Requirements:** Keyed by checkId; result is idempotent

**Replay Requirements:** Replay records health check; actual health may differ

**Versioning Rules:** Additive fields only

**Security Classification:** Internal

**Retention Classification:** Standard

**Audit Requirements:** Check ID, status (healthy/degraded/down), latency, throughput, backlog, checked timestamp

**Failure Handling:** Health check failure does not affect event bus; AlertRaised on degradation

**Related Events:** AlertRaised

**Notes:** Health check verifies broker connectivity, consumer lag, and schema registry availability.

---

# Event Dependency Graph

The following describes the causal dependencies between events across bounded contexts. These dependencies define ordering guarantees and replay constraints.

| Downstream Event | Depends On | Bounded Context | Dependency Type |
|-----------------|------------|-----------------|-----------------|
| IdentityVerified | KYCApproved | Identity → Compliance | Strong (must precede) |
| WalletVerified | WalletLinked | Identity → Identity | Strong (must precede) |
| PermissionGranted | IdentityVerified | Identity → Identity | Strong (must precede) |
| AgentActivated | AgentRegistered | Agent → Agent | Strong (must precede) |
| CommissionCalculated | InvestmentAllocated / MarketplaceSaleCompleted | Commission → Investment / Secondary | Strong (must precede) |
| CommissionApproved | CommissionCalculated | Commission → Commission | Strong (must precede) |
| CommissionPaid | CommissionApproved | Commission → Commission | Strong (must precede) |
| InvestmentAllocated | SettlementCompleted | Investment → Payment | Strong (must precede) |
| SettlementCompleted | PaymentSettling | Payment → Payment | Strong (must precede) |
| OwnershipMinted | SettlementCompleted + InvestmentAllocated | Ownership → Payment + Investment | Strong (must precede) |
| OwnershipTransferred | MarketplaceSaleCompleted + EscrowReleased | Ownership → Secondary | Strong (must precede) |
| MarketplaceSaleCompleted | EscrowReleased + OwnershipTransferred | Secondary → Secondary + Ownership | Mutual (events may be concurrent) |
| EscrowHeld | OfferAccepted | Secondary → Secondary | Strong (must precede) |
| DividendDistributed | DividendScheduled | Dividend → Dividend | Strong (must precede) |
| DividendScheduled | DividendApproved + TreasuryFunded | Dividend → Dividend + Treasury | Strong (must precede) |
| TreasuryFunded | TreasuryAllocated | Treasury → Treasury | Strong (must precede) |
| BuybackExecuted | BuybackProgramCreated + TreasuryMovementApproved | Buyback → Buyback + Treasury | Strong (must precede) |
| BurnExecuted | BuybackExecuted (or governance approval) | Burn → Buyback | Strong (must precede) |
| NFTSold | NFTOfferAccepted / NFTAuctionEnded | NFT → NFT | Strong (must precede) |
| NFTTransferred | NFTSold | NFT → NFT | Strong (must precede) |
| ProposalExecuted | VoteCast (sufficient tally) | Governance → Governance | Strong (must precede) |
| VoteCast | GovernanceProposalCreated | Governance → Governance | Strong (must precede) |
| PortfolioHoldingChanged | OwnershipMinted / OwnershipTransferred / OwnershipReclaimed | Portfolio → Ownership | Strong (must precede) |
| PortfolioValueUpdated | ValuationUpdated / SecondaryPriceUpdated | Portfolio → Valuation / Secondary | Weak (best effort) |
| VotingPowerUpdated | OwnershipMinted / NFTTransferred | Governance → Ownership / NFT | Strong (must precede) |
| NotificationSent | Any source event | Notification → Any | Weak (best effort) |
| AuditTrailRecorded | Any source event | Audit → Any | Strong (must precede for completeness) |

---

# Event Production Matrix

The production matrix shows which bounded context produces each event category.

| Bounded Context | Produces |
|----------------|----------|
| S1 Agent | AgentRegistered, AgentActivated, AgentDeactivated, AgentStatusChanged, AgentTaskCompleted, RankAchieved, RankScoreUpdated, TeamChanged, OverrideCompressed |
| S2 Network | ReferralCreated, ReferralConverted, ReferralExpired, ReferralCampaignLaunched, ReferralCampaignEnded, LeaderboardUpdated, AgentPerformanceSnapshot |
| S3 Commission | CommissionCalculated, CommissionApproved, CommissionPaid, CommissionHeld, CommissionReleased, CommissionReversed, CommissionRateChanged, OverrideRouteChanged, BonusCalculated, BonusPaid |
| S4 Qualification | QualifyingSaleVerified, QualifyingCriteriaUpdated, CoolingPeriodEnded, CoolingPeriodExtended |
| S5 Campaign | CampaignCreated, CampaignUpdated, CampaignEnded, CampaignRewardIssued |
| S6 Property | PropertyCreated, PropertyApproved, PropertyPublished, PropertyUpdated, PropertyPaused, PropertyResumed, PropertyDelisted, PropertyArchived, PropertyFundingStarted, PropertyOperational, DividendActivated |
| S7 Primary Investment | InvestmentStarted, InvestmentAllocated, ReservationCreated, ReservationExpired, WaitingListPromoted, RoundOpened, RoundClosed, InvestmentRejected, InvestmentCancelled |
| S8 Secondary Market | MarketplaceListingCreated, MarketplaceListingUpdated, MarketplaceListingCancelled, OfferCreated, OfferAccepted, OfferWithdrawn, OfferRejected, EscrowHeld, EscrowReleased, MarketplaceSaleCompleted, MarketplaceSaleCancelled, SecondaryPriceUpdated |
| S9 Payment and Settlement | PaymentInitiated, PaymentPending, PaymentSettling, SettlementCompleted, PaymentFailed, PaymentExpired, RefundInitiated, RefundCompleted, SettlementReconciled |
| S10 Ownership | OwnershipMinted, OwnershipTransferred, OwnershipReclaimed, OwnershipBurned, OwnershipSnapshotTaken |
| S11 Portfolio | PortfolioHoldingChanged, PortfolioValueUpdated, PortfolioRebalanced, PortfolioAlertTriggered, PortfolioPerformanceUpdated |
| S12 NFT | NFTCreated, NFTMinted, NFTListed, NFTDelisted, NFTOfferCreated, NFTOfferAccepted, NFTOfferWithdrawn, NFTAuctionStarted, NFTAuctionBid, NFTAuctionEnded, NFTSold, NFTTransferred, RoyaltiesPaid, NFTFrozen, NFTUnfrozen, NFTBurned, NFTRedeemed, NFTUpgraded, NFTFused, NFTEvolved, NFTAccessGranted, NFTMetadataUpdated, NFTBlacklisted |
| S13 Dividend | DividendCalculated, DividendApproved, DividendScheduled, DividendDistributed, DividendClaimed, DividendRejected, DividendRecovered, TaxDocumentIssued |
| S14 Reward | IncentiveCredited, RewardPaid, IncentiveProgramActivated, IncentiveProgramDeactivated, LeadershipPoolDistributed |
| S15 Treasury | TreasuryDeposit, TreasuryWithdrawal, TreasuryAllocated, TreasuryFunded, TreasuryMovementApproved, TreasuryRebalanced, TreasuryYieldRealized, TreasuryBalanced |
| S16 Reserve | ReserveUpdated, EmergencyReserveUsed, InsuranceTriggered |
| S17 Buyback and Burn | BuybackProgramCreated, BuybackProgramPaused, BuybackProgramResumed, BuybackExecuted, BuybackCancelled, BurnExecuted, BurnCancelled, SupplyReductionUpdated |
| S18 Governance | GovernanceProposalCreated, VoteCast, VotingPowerUpdated, ProposalExecuted, ProposalDefeated, GovernanceParameterChanged |
| S19 Identity and Wallet | IdentityVerified, WalletLinked, WalletVerified, PermissionGranted, PermissionRevoked, RoleChanged |
| S20 Compliance | KYCSubmitted, KYCApproved, KYCRejected, ComplianceApproved, ComplianceRejected, ComplianceFlagRaised, AMLAlertRaised |
| S21 Security | IncidentCreated, IncidentResolved, EmergencyLockdown, EmergencyLockdownLifted, FraudDetected, ThreatDetected, SecretRotated |
| S22 Risk | RiskScoreChanged |
| S23 AI | AIRecommendationGenerated, AIRecommendationAccepted, AIRecommendationRejected, AIFraudDetected, AIRiskDetected, AIForecastGenerated, AIModelUpdated, KnowledgeIndexed, MemoryUpdated |
| S24 Document | DocumentUploaded, DocumentVerified, DocumentAccessed, AccessGranted |
| S25 Administration | AdminActionLogged, SystemPaused, SystemResumed |
| S26 Audit | AuditTrailRecorded, FinancialAuditCompleted, AuditExported |
| S27 Map | PropertyGeocoded, GeoRegionComputed, MapLayerUpdated |
| S28 Valuation | ValuationRecorded, ValuationUpdated |
| S29 Notification | NotificationSent, AlertRaised, AlertResolved |
| S30 System | SchemaVersionUpdated, EventBusHealthChecked |

---

# Event Consumption Matrix

The consumption matrix shows which events each bounded context subscribes to.

| Bounded Context | Consumes |
|----------------|----------|
| Agent | CommissionCalculated, CommissionPaid, RankScoreUpdated, IncentiveCredited |
| Network | ReferralCreated, ReferralConverted, AgentRegistered, AgentActivated, AgentDeactivated |
| Commission | SettlementCompleted, MarketplaceSaleCompleted, AgentActivated, AgentDeactivated, ReferralConverted, InvestmentAllocated |
| Qualification | SettlementCompleted, PaymentSettled |
| Campaign | ReferralConverted, AgentActivated |
| Property | InvestmentAllocated (updates available supply), SettlementCompleted |
| Primary Investment | PaymentSettled, ComplianceApproved, ReservationExpired |
| Secondary Market | OwnershipMinted (available for secondary), MarketplaceListingCreated, OfferAccepted, EscrowReleased |
| Payment and Settlement | InvestmentAllocated, OfferAccepted, EscrowReleased |
| Ownership | SettlementCompleted, InvestmentAllocated, MarketplaceSaleCompleted, RefundCompleted |
| Portfolio | OwnershipMinted, OwnershipTransferred, OwnershipReclaimed, OwnershipBurned, ValuationUpdated, SecondaryPriceUpdated, DividendDistributed, NFTTransferred |
| NFT | NFTCreated, NFTMinted, NFTSold, NFTTransferred, RoyaltiesPaid, NFTFrozen, NFTBurned |
| Dividend | OwnershipSnapshotTaken, TreasuryFunded, DividendApproved |
| Reward | RankAchieved, LeaderboardUpdated, IncentiveProgramActivated |
| Treasury | SettlementCompleted, CommissionPaid, DividendDistributed, ProposalExecuted, MarketplaceSaleCompleted, BuybackExecuted, BurnExecuted |
| Reserve | TreasuryFunded, TreasuryAllocated |
| Buyback and Burn | TreasuryMovementApproved, TreasuryAllocated |
| Governance | OwnershipMinted, OwnershipTransferred, NFTTransferred, ProposalExecuted |
| Identity and Wallet | KYCApproved, KYCRejected |
| Compliance | FraudDetected, AMLAlertRaised, RiskScoreChanged, KYCSubmitted, DocumentUploaded |
| Security | FraudDetected, ThreatDetected, IncidentCreated |
| Risk | FraudDetected, AMLAlertRaised, RiskScoreChanged |
| AI | All events (read-only advisory consumption) |
| Document | KYCSubmitted, InvestmentComplete, DividendDistributed |
| Administration | All events (observability mirror) |
| Audit | All events (immutable audit log mirror) |
| Map | PropertyPublished, PropertyGeocoded, PropertyUpdated, PropertyPaused, PropertyArchived |
| Valuation | PropertyApproved, PropertyOperational, SecondaryPriceUpdated |
| Notification | All events (trigger notification delivery) |
| System | SchemaVersionUpdated, EventBusHealthChecked |

---

# Cross-Bounded Context Event Flow

## Primary Investment Chain
```
InvestmentStarted (S7)
  → ReservationCreated (S7)
  → PaymentInitiated (S9) → PaymentPending (S9) → PaymentSettling (S9) → SettlementCompleted (S9)
  → ComplianceApproved (S20)
  → InvestmentAllocated (S7)
    → OwnershipMinted (S10)
      → PortfolioHoldingChanged (S11) → PortfolioValueUpdated (S11)
      → VotingPowerUpdated (S18)
      → DividendEligibility (via OwnershipSnapshotTaken S10 → S13)
    → CommissionCalculated (S3) → CommissionApproved (S3) → CommissionPaid (S3)
    → TreasuryFunded (S15)
    → NotificationSent (S29)
```

## Secondary Trade Chain
```
MarketplaceListingCreated (S8)
  → OfferCreated (S8) → OfferAccepted (S8)
    → EscrowHeld (S8)
    → MarketplaceSaleCompleted (S8)
      → EscrowReleased (S8)
      → OwnershipTransferred (S10)
        → PortfolioHoldingChanged (S11) → PortfolioValueUpdated (S11)
        → VotingPowerUpdated (S18)
      → CommissionCalculated (S3) → CommissionApproved (S3) → CommissionPaid (S3)
      → NotificationSent (S29)
```

## NFT Lifecycle Chain
```
NFTCreated (S12) → NFTMinted (S12)
  → PortfolioValueUpdated (S11)
  → VotingPowerUpdated (S18)
  → NFTAccessGranted (S12)
  → (if listed) NFTListed (S12) → NFTOfferCreated (S12) → NFTOfferAccepted (S12) → NFTSold (S12)
    → NFTTransferred (S12)
      → PortfolioHoldingChanged (S11)
      → VotingPowerUpdated (S18)
    → RoyaltiesPaid (S12)
      → TreasuryFunded (S15)
```

## Dividend Chain
```
PropertyOperational (S6) → DividendActivated (S6)
  → DividendCalculated (S13) → DividendApproved (S13)
    → TreasuryFunded (S15)
    → DividendScheduled (S13)
      → OwnershipSnapshotTaken (S10)
      → DividendDistributed (S13)
        → PortfolioValueUpdated (S11)
        → TaxDocumentIssued (S13)
        → DividendClaimed (S13)
        → NotificationSent (S29)
        → (after claim window) DividendRecovered (S13)
```

## Treasury Allocation Chain
```
TreasuryDeposit (S15) → TreasuryAllocated (S15)
  → TreasuryFunded (S15) → (dividend/commission/reserve) 
  → ReserveUpdated (S16)
  → TreasuryBalanced (S15)
```

## Buyback and Burn Chain
```
BuybackProgramCreated (S17) → BuybackExecuted (S17)
  → TreasuryMovementApproved (S15)
  → TreasuryBalanced (S15)
  → BurnExecuted (S17)
    → SupplyReductionUpdated (S17)
    → TreasuryBalanced (S15)
```

## Governance Chain
```
GovernanceProposalCreated (S18)
  → VoteCast (S18) × N
    → ProposalExecuted (S18)
      → TreasuryMovementApproved (S15) (if financial)
      → GovernanceParameterChanged (S18)
      → NotificationSent (S29)
    → ProposalDefeated (S18)
      → NotificationSent (S29)
```

## Compliance/KYC Chain
```
KYCSubmitted (S20) → KYCApproved (S20) → IdentityVerified (S19)
  → PermissionGranted (S19) (if applicable)
  → NotificationSent (S29)
```

## Security Incident Chain
```
FraudDetected (S21) / ThreatDetected (S21)
  → ComplianceFlagRaised (S20)
  → IncidentCreated (S21)
    → EmergencyLockdown (S21) (if critical)
      → SystemPaused (S25)
    → IncidentResolved (S21)
    → EmergencyLockdownLifted (S21)
      → SystemResumed (S25)
```

## AI Recommendation Chain
```
AIRecommendationGenerated (S23)
  → AIRecommendationAccepted (S23) → (module executes via gated path)
  → AIRecommendationRejected (S23) → (no action)
```

---

# High-Risk Events

Events that carry financial value or security sensitivity. These events require heightened monitoring, additional authorization, and mandatory audit.

| Event | Risk Category | Rationale |
|-------|---------------|-----------|
| SettlementCompleted | Financial | Gates ownership transfer; value movement |
| PaymentInitiated | Financial | Creates payment obligation |
| RefundCompleted | Financial | Reverses value movement |
| OwnershipMinted | Financial | Creates property ownership; tax event |
| OwnershipTransferred | Financial | Changes property ownership |
| OwnershipBurned | Financial | Destroys value; tax event |
| CommissionPaid | Financial | Moves value to agents |
| CommissionCalculated | Financial | Determines agent earnings |
| TreasuryWithdrawal | Financial | Moves value out of treasury |
| TreasuryMovementApproved | Financial | Authorizes value movement |
| TreasuryAllocated | Financial | Distributes treasury funds |
| BuybackExecuted | Financial | Uses treasury funds for acquisition |
| BurnExecuted | Financial | Permanently destroys value |
| DividendDistributed | Financial | Distributes property income |
| DividendApproved | Financial | Authorizes distribution |
| MarketplacesaleCompleted | Financial | Secondary value transfer |
| EscrowReleased | Financial | Releases escrowed funds |
| NFTSold | Financial | NFT value transfer |
| RoyaltiesPaid | Financial | Royalty distribution |
| EmergencyLockdown | Security | Halts all value paths |
| EmergencyReserveUsed | Security | Emergency fund deployment |
| IncidentCreated | Security | Security breach indicator |
| FraudDetected | Security | Fraud indicator |
| ComplianceRejected | Security | Blocks user action |
| AMLAlertRaised | Regulatory | Regulatory reporting trigger |

---

# Immutable Events

Events that must never be deleted, modified, or retracted. Only offsetting entries are permitted.

| Event | Immutability Rationale |
|-------|----------------------|
| All S9 Payment Events | Financial transaction records |
| All S10 Ownership Events | Property ownership provenance |
| All S3 Commission Events | Agent earning records |
| All S15 Treasury Events | Treasury movement records |
| All S17 Buyback and Burn Events | Token supply records |
| All S13 Dividend Events | Income distribution records |
| All S8 Secondary Market Events | Trade settlement records |
| All S21 Security Events | Security incident records |
| All S20 Compliance Events | Regulatory compliance records |
| SettlementCompleted | Payment finality |
| OwnershipMinted | Ownership creation |
| OwnershipBurned | Value destruction |
| BurnExecuted | Supply reduction |
| IncidentCreated | Security timeline |
| EmergencyLockdown | Emergency action record |
| All AuditTrailRecorded Events | Audit chain integrity |
| All IdentityVerified Events | Identity verification record |
| All KYCApproved/KYCRejected Events | KYC decision record |

---

# Replay-Critical Events

Events that are essential for system recovery through event replay. Loss or corruption of these events would compromise platform integrity.

| Event | Criticality Rationale |
|-------|----------------------|
| SettlementCompleted | Without replay, payment states lost |
| OwnershipMinted | Without replay, ownership balances lost |
| OwnershipTransferred | Without replay, ownership history lost |
| OwnershipSnapshotTaken | Without replay, dividend/governance snapshots lost |
| InvestmentAllocated | Without replay, investment records lost |
| MarketplaceSaleCompleted | Without replay, trade settlement lost |
| EscrowHeld / EscrowReleased | Without replay, escrow states lost |
| CommissionCalculated | Without replay, agent earnings lost |
| CommissionPaid | Without replay, agent payouts lost |
| TreasuryDeposit / TreasuryWithdrawal | Without replay, treasury balance lost |
| TreasuryAllocated | Without replay, domain funding lost |
| DividendCalculated / DividendDistributed | Without replay, dividend history lost |
| DividendClaimed | Without replay, holder payments lost |
| BuybackExecuted / BurnExecuted | Without replay, supply records lost |
| PropertyPublished / PropertyArchived | Without replay, property lifecycle lost |
| RoundOpened / RoundClosed | Without replay, funding rounds lost |
| GovernanceProposalCreated / VoteCast | Without replay, governance history lost |
| IdentityVerified | Without replay, identity state lost |
| KYCApproved / KYCRejected | Without replay, compliance state lost |
| AuditTrailRecorded | Without replay, audit chain integrity lost |
| All S10 Ownership Events | Foundation of all ownership projections |
| All S9 Payment Events | Foundation of all payment states |
| PortfolioHoldingChanged | Without replay, portfolio projections lost |

---

# Audit-Critical Events

Events that must be retained for regulatory compliance and legal purposes. These events are subject to minimum retention periods defined by jurisdiction.

| Event | Retention Justification |
|-------|------------------------|
| All S9 Payment Events | Financial transaction audit trail (7-10 years typical) |
| All S10 Ownership Events | Property ownership provenance (permanent) |
| All S3 Commission Events | Agent earning records (7 years typical) |
| All S15 Treasury Events | Treasury movement audit (10 years typical) |
| All S13 Dividend Events | Income distribution records (7 years typical) |
| All S17 Buyback and Burn Events | Token supply audit (permanent) |
| All S8 Secondary Market Events | Trade settlement records (7 years typical) |
| All S20 Compliance Events | Regulatory compliance (10+ years typical) |
| All S21 Security Events | Security incident records (7 years typical) |
| All S19 Identity and Wallet Events | Identity verification records (10+ years) |
| All AuditTrailRecorded Events | Master audit trail (permanent) |
| FinancialAuditCompleted | Financial audit records (10 years typical) |
| KYCSubmitted / KYCApproved / KYCRejected | KYC compliance (10+ years) |
| AMLAlertRaised | Regulatory reporting (10+ years) |
| SettlementCompleted | Payment finality record (10 years typical) |
| EmergencyLockdown | Emergency action record (permanent) |

---

# Future Reserved Events

The following event names are reserved for future bounded contexts and must not be used by existing modules without architecture review.

| Reserved Event | Future Bounded Context | Description |
|---------------|----------------------|-------------|
| StakingDeposited | Staking | RLKO tokens deposited for staking |
| StakingWithdrawn | Staking | RLKO tokens withdrawn from staking |
| StakingRewardDistributed | Staking | Staking reward paid to staker |
| StakeDelegated | Staking | Stake delegated to validator |
| InsurancePolicyCreated | Insurance | Insurance policy issued for property |
| InsurancePremiumPaid | Insurance | Insurance premium payment recorded |
| InsuranceClaimFiled | Insurance | Insurance claim filed by holder |
| InsuranceSettled | Insurance | Insurance claim settled |
| LendingPoolCreated | Lending | Lending pool established |
| LoanOriginated | Lending | Loan originated against property |
| LoanRepaid | Lending | Loan repayment received |
| LoanDefaulted | Lending | Loan in default status |
| CreditScoreUpdated | Credit | Credit score recalculated |
| CreditLimitAssigned | Credit | Credit limit assigned to investor |
| CreditLineDrawn | Credit | Credit line drawn by investor |
| CreditLineRepaid | Credit | Credit line repaid |
| PropertyTokenized | Tokenization | Property tokenized on-chain |
| TokenSplit | Tokenization | Token split executed |
| TokenMerged | Tokenization | Tokens merged into larger denomination |
| CrossChainTransferInitiated | CrossChain | Cross-chain transfer started |
| CrossChainTransferCompleted | CrossChain | Cross-chain transfer completed |
| CrossChainTransferFailed | CrossChain | Cross-chain transfer failed |
| OraclePriceUpdated | Oracle | Oracle price feed updated |
| OracleDisputeRaised | Oracle | Oracle price dispute raised |
| OracleDisputeResolved | Oracle | Oracle price dispute resolved |
| IdentityRecovered | Identity | Identity recovered through guardian process |
| IdentityFrozen | Identity | Identity frozen by security action |
| SessionCreated | Session | User session created |
| SessionRevoked | Session | User session revoked |
| APIKeyGenerated | API | API key generated for integration |
| APIKeyRevoked | API | API key revoked |
| WebhookRegistered | Webhook | Webhook endpoint registered |
| WebhookDelivered | Webhook | Webhook delivery confirmed |
| WebhookFailed | Webhook | Webhook delivery failed |
| DataExportRequested | Data | Data export requested by user |
| DataExportCompleted | Data | Data export completed |
| DataDeletionRequested | Data | Data deletion requested (GDPR) |
| DataDeletionCompleted | Data | Data deletion completed |
| SubscriptionCreated | Subscription | Subscription plan created |
| SubscriptionCancelled | Subscription | Subscription cancelled |
| SubscriptionRenewed | Subscription | Subscription renewed |
| WelcomeBonusAwarded | Onboarding | Welcome bonus awarded to new user |
| OnboardingCompleted | Onboarding | User onboarding completed |
| TutorialCompleted | Onboarding | Tutorial step completed |

---

*End of RELCKO Domain Event Catalog v1.0*
