# AI Domain Model — Relcko AI Intelligence Platform (V1.7.0)

**Companion to:** `AI_PLATFORM_ARCHITECTURE.md`. Defines the 12 independent AI engines.
**Status:** Architecture only. Framework-agnostic. No implementation, no UI, no APIs, no LLM prompts.

Each engine follows the locked module template: **Purpose · Capabilities · Inputs (read models/events) · Outputs (advisory artifacts) · Consumers · Knowledge dependencies · Events emitted · Human-review triggers · Security scope.**

Engines are **independent**. They share the Knowledge Layer (`AI_KNOWLEDGE_MODEL.md`), Memory Layer (`AI_MEMORY_MODEL.md`), Explainability contract (`AI_EXPLAINABILITY_MODEL.md`), Security Layer (`AI_SECURITY_MODEL.md`), and the Event Bus (`AI_EVENT_EXTENSION.md`). They do **not** call one another.

---

## 1. Investor AI

- **Purpose:** Personal intelligence for an individual Investor over their own holdings and opportunities.
- **Capabilities:**
  - Portfolio analysis (composition, performance attribution, cost basis).
  - ROI analysis (realized/unrealized, annualized).
  - Cashflow forecasting (projected dividends, liquidity needs).
  - Property comparison (side-by-side scoring across properties).
  - Risk scoring (concentration, liquidity, market, SPV jurisdiction).
  - Diversification analysis (sector/geo/asset-type spread).
  - Investment recommendations (new properties matching risk/goal).
  - Exit recommendations (when/how to reduce a position).
  - Dividend forecasting (per property + aggregate, schedule-aware).
  - Tax insights (income characterization, jurisdiction notes — advisory only).
  - Opportunity discovery (screened by eligibility + KYC).
  - Personalized watchlists (auto-curated from behavior + signals).
- **Inputs:** `Ownership`, `Investment`, `Transaction`, `Rewards`, `Property`, `PropertyFraction`, `Portfolio` (read model), `KYC` status, investor memory.
- **Outputs:** recommendations, forecasts, watchlists, risk scores — all wrapped in the explainability contract.
- **Consumers:** Investor (scope `OWN`); Agent (scope `TEAM`, aggregates of referred investors only); AI Copilot.
- **Knowledge dependencies:** Portfolio Knowledge, Property Knowledge, Marketplace Knowledge, Historical Knowledge.
- **Events emitted:** `AIRecommendationGenerated`, `AIForecastGenerated`, `AIRiskDetected` (investor-level), `AIAlertRaised`.
- **Human-review triggers:** none bind automatically; exit/investment recommendations are advisory. Tax insights are explicitly flagged `humanReviewRequired = advisory-only, not tax advice`.
- **Security scope:** strict `OWN` — never crosses to another investor's PII.

---

## 2. Agent AI

- **Purpose:** Performance and growth intelligence for Agents and Senior Agents.
- **Capabilities:**
  - Lead scoring (referral quality + conversion likelihood).
  - Lead prioritization (ranking of pending referrals).
  - Sales forecasting (pipeline → expected investments).
  - Commission forecasting (expected earnings over horizon).
  - Activity monitoring (engagement decay, stale referrals).
  - Performance coaching (actionable improvements vs. benchmark).
  - Pipeline recommendations (which segments/campaigns to push).
  - Network health (downline activity, churn risk).
  - Rank progression (path to next tier, gap analysis).
  - Reactivation recommendations (dormant referrals/downline to re-engage).
- **Inputs:** `Agent`, `Referral`, `Commission`, `Investment`, `AgentTeam`/`CampaignAttribution` (Network Engine), `Leaderboard` (projection), agent memory.
- **Outputs:** lead scores, forecasts, coaching plans, reactivation lists.
- **Consumers:** Agent (`OWN`); Senior Agent (`TEAM` downline aggregates); Network Manager (via Admin, `DISCIPLINE`); AI Copilot.
- **Knowledge dependencies:** Network Knowledge, Portfolio Knowledge, Marketplace Knowledge, Historical Knowledge.
- **Events emitted:** `AIRecommendationGenerated`, `AIForecastGenerated`, `AIAlertRaised`.
- **Human-review triggers:** none bind; commission/sales forecasts are advisory. Reactivation recommendations are suggestions only.
- **Security scope:** `OWN` for self; `TEAM` for Senior Agent (downline aggregates, no cross-team PII).

---

## 3. Marketplace AI

- **Purpose:** Discovery, pricing, and liquidity intelligence for the Marketplace.
- **Capabilities:**
  - Property recommendations (to browsing Investors).
  - Price prediction (primary + secondary fair-value estimates).
  - Demand prediction (absorption, time-to-fill).
  - Market trends (segment-level direction).
  - Liquidity analysis (secondary-market depth per property).
  - Buyer matching (investor ↔ listing fit).
  - Seller matching (listing ↔ buyer fit).
  - Market heatmaps (geo/segment intensity).
  - Category trends (residential/commercial/land).
  - Location intelligence (region-level momentum).
- **Inputs:** `Property`, `PropertyFraction`, `MarketplaceListing`, `MarketplaceSale`, `Investment`, `Ownership`, `GeoRegion`/`PropertyCoordinate` (Global Map), marketplace memory.
- **Outputs:** recommendations, price/demand forecasts, heatmaps, match scores.
- **Consumers:** Investor (personalized), Property Manager (`DISCIPLINE`), AI Copilot, Marketplace UI (read-only projection surface).
- **Knowledge dependencies:** Marketplace Knowledge, Property Knowledge, Network Knowledge, Historical Knowledge.
- **Events emitted:** `AIRecommendationGenerated`, `AIForecastGenerated`, `AIAlertRaised`.
- **Human-review triggers:** price predictions surfaced to Property Manager are advisory; listing price changes remain a human/Property-Manager action.
- **Security scope:** public aggregates safe to show Anonymous; personalized recs scoped `OWN`.

---

## 4. Portfolio AI

- **Purpose:** Cross-asset aggregation and optimization intelligence (extends Investor AI at the portfolio level).
- **Capabilities:**
  - Aggregated performance attribution (by property/segment/geo).
  - Rebalancing advice (target allocation vs. current).
  - Exposure analysis (single-property / single-SPV concentration).
  - Scenario projection (rate/occupancy/yield shocks on portfolio).
  - Blended cashflow + dividend timeline.
  - Benchmark comparison (vs. marketplace index, advisory).
- **Inputs:** `Portfolio` (read model), `Ownership`, `Rewards`, `Transaction`, `Property`, `SPV`, portfolio memory.
- **Outputs:** rebalancing advice, exposure reports, scenario projections.
- **Consumers:** Investor (`OWN`); Agent (`TEAM`, referred aggregates); Executive (`GLOBAL`, anonymized index); AI Copilot.
- **Knowledge dependencies:** Portfolio Knowledge, Property Knowledge, Treasury Knowledge, Historical Knowledge.
- **Events emitted:** `AIRecommendationGenerated`, `AIForecastGenerated`, `AIRiskDetected`, `AIAlertRaised`.
- **Human-review triggers:** rebalancing/exposure advice is advisory; no auto-trade.
- **Security scope:** `OWN` investor; `TEAM` agent; Executive sees only anonymized, aggregated indices.

---

## 5. Treasury AI

- **Purpose:** Financial intelligence for Treasury and Executive over platform + SPV funds.
- **Capabilities:**
  - Treasury health (reserve adequacy, runway).
  - Liquidity forecasting (in/out over horizon).
  - Cashflow forecasting (yield, settlements, payouts).
  - Reserve recommendations (buffer sizing).
  - Fraud detection (movement anomalies — advisory to Compliance).
  - Expense anomalies (category-level drift).
  - Revenue forecasting (fees, yields).
  - Buyback recommendations (advisory to Governance).
  - Burn recommendations (cost control, advisory).
  - Stress testing (scenario shocks on reserves).
- **Inputs:** `TreasuryAccount`, `TreasuryMovement`, `YieldRecord`, `Transaction`, `Payment`, `Commission`, `Rewards`, treasury memory, treasury knowledge.
- **Outputs:** health scores, forecasts, anomaly flags, reserve/buyback/burn *recommendations*.
- **Consumers:** Treasury Manager (`DISCIPLINE`); Executive (`GLOBAL`); Compliance (anomaly feed); AI Copilot.
- **Knowledge dependencies:** Treasury Knowledge, Historical Knowledge, Compliance Knowledge.
- **Events emitted:** `AIForecastGenerated`, `AIRiskDetected`, `AIFraudDetected` (advisory), `AIRecommendationGenerated`, `AIAlertRaised`.
- **Human-review triggers:** **ALL** treasury movement suggestions (`buyback`, `burn`, `reserve reallocation`) are `humanReviewRequired = true` and route to Treasury Manager → Governance multi-sig per `PERMISSION_MODEL.md §6`. AI never emits `TreasuryMovement*` events.
- **Security scope:** `DISCIPLINE` (Treasury) + `GLOBAL` (Executive). Sensitive figures never exposed to non-authorized roles.

---

## 6. Governance AI

- **Purpose:** Decision-support intelligence for Governance and voting Investors.
- **Capabilities:**
  - Proposal summarization (plain-language digest).
  - Impact analysis (effect on treasury/parameters/property).
  - Voting prediction (expected outcome from voting power).
  - Delegation recommendations (who to delegate to, by track record).
  - Risk analysis (proposal risk classification).
  - Treasury impact (quantified $ effect of proposal).
  - Community sentiment (signal aggregation — advisory).
  - Proposal clustering (related/duplicate detection).
  - Governance participation analysis (turnout, apathy pockets).
- **Inputs:** `Proposal`, `Vote`, `VotingPower`, `GovParameter`, `TreasuryMovement` (for impact), `AuditLog`, governance memory.
- **Outputs:** summaries, impact reports, voting predictions, delegation recs.
- **Consumers:** Governance Manager (`DISCIPLINE`); Investor (summaries, `OWN` voting context); Executive; AI Copilot.
- **Knowledge dependencies:** Governance Knowledge, Treasury Knowledge, Historical Knowledge.
- **Events emitted:** `AIRecommendationGenerated`, `AIForecastGenerated` (voting prediction), `AIAlertRaised`.
- **Human-review triggers:** delegation recommendations are advisory; proposal summaries never alter `Proposal` payload (tamper-evident per Governance spec). Execution remains Governance Manager + timelock.
- **Security scope:** public summaries safe; internal impact models `DISCIPLINE`/`GLOBAL`.

---

## 7. Compliance AI

- **Purpose:** Risk and anomaly intelligence for the Compliance Officer.
- **Capabilities:**
  - AML anomaly detection (layering/structuring patterns).
  - KYC risk scoring (applicant risk tiering).
  - Sanctions monitoring (watchlist matching on wallets/entities).
  - Fraud detection (cross-account/transaction fraud).
  - Wallet behavior analysis (clustering, typology).
  - Transaction anomaly detection (velocity/amount/geo deviations).
  - Identity risk (document/identity inconsistency signals).
  - Document verification assistance (assist, not decide — human approves).
  - Policy monitoring (rule drift, new-regex watchlists).
- **Inputs:** `Transaction`, `Wallet`, `KYC`, `Documents`, `Investor`, `AuditLog`, `Referral`, `Commission`, compliance memory.
- **Outputs:** risk scores, anomaly flags, watchlist hits, verification-assist signals.
- **Consumers:** Compliance Officer (`DISCIPLINE`); Treasury (fraud feed); Admin (alerts); AI Copilot (assist only).
- **Knowledge dependencies:** Compliance Knowledge, Network Knowledge, Historical Knowledge.
- **Events emitted:** `AIFraudDetected`, `AIRiskDetected`, `AIAlertRaised`, `AIRecommendationGenerated` (e.g., review recommendation).
- **Human-review triggers:** **ALL** compliance outputs are investigative aids. KYC approval, flag raise, and freeze remain human Compliance Officer actions (`PERMISSION_MODEL.md §7` — Compliance cannot move funds/publish property). AI never emits `ComplianceFlagRaised` as a binding state; it emits `AIFraudDetected`/`AIRiskDetected` for human triage.
- **Security scope:** `DISCIPLINE` (Compliance). Strictest PII handling; outputs themselves are sensitive and access-controlled.

---

## 8. Property AI

- **Purpose:** Asset-level intelligence for Property Manager and investing Investors.
- **Capabilities:**
  - Valuation forecasting (forward fair value).
  - Rental forecasting (yield trajectory).
  - Occupancy prediction (vacancy risk).
  - Maintenance prediction (failure/upkeep timing).
  - Renovation impact (value uplift estimate).
  - Yield optimization (rent vs. appreciation trade-off).
  - Neighborhood intelligence (local momentum).
  - Macroeconomic impact (rate/employment sensitivity).
  - Climate risk (physical-risk scoring).
  - Construction progress analysis (for development assets).
- **Inputs:** `Property`, `PropertyFraction`, `SPV`, `Documents`, `Rewards`, `GeoRegion`/`PropertyCoordinate`, external market feeds (knowledge-ingested), property memory.
- **Outputs:** valuation/rental/occupancy forecasts, risk scores, optimization advice.
- **Consumers:** Property Manager (`DISCIPLINE`); Investor (property pages, `OWN`/public); AI Copilot; Marketplace AI (feeds price prediction).
- **Knowledge dependencies:** Property Knowledge, Marketplace Knowledge, Historical Knowledge, Document Knowledge.
- **Events emitted:** `AIForecastGenerated`, `AIRiskDetected` (climate/occupancy), `AIAlertRaised`, `AIRecommendationGenerated`.
- **Human-review triggers:** valuation/rental forecasts are advisory; publishing/delisting remains Property Manager/Admin per `PERMISSION_MODEL.md`.
- **Security scope:** public aggregates safe; detailed risk models `DISCIPLINE`/`OWN`.

---

## 9. Developer AI

- **Purpose:** Engineering and platform-health intelligence for Developers/Administrators.
- **Capabilities:**
  - Schema/contract drift detection (domain vs. implementation).
  - Event-bus health analysis (lag, poison events, reordering).
  - Integration insight (module coupling warnings vs. `MODULE_DEPENDENCY_MAP`).
  - Anomaly surfacing in logs/metrics (advisory).
  - Documentation/consistency assistance (cross-doc linkage).
  - Migration impact analysis (against `MIGRATION_STRATEGY`).
- **Inputs:** `AuditLog`, event-bus telemetry, module metadata, deployment/version artifacts, developer memory.
- **Outputs:** health reports, drift warnings, migration-impact notes.
- **Consumers:** Developer; Administrator (`GLOBAL`); AI Copilot (assist).
- **Knowledge dependencies:** Domain Knowledge, Historical Knowledge, Document Knowledge.
- **Events emitted:** `AIAlertRaised`, `AIRiskDetected` (platform), `AIRecommendationGenerated`.
- **Human-review triggers:** all outputs advisory; no deploy/permission change.
- **Security scope:** `GLOBAL` (Admin/Dev). Never exposes PII to non-authorized roles.

---

## 10. Administrator AI

- **Purpose:** Operations triage and oversight intelligence for Administrators.
- **Capabilities:**
  - Ops triage (prioritize `AdminActionLogged`/flags).
  - Anomaly surfacing (cross-module outliers).
  - Config drift detection (vs. `GovParameter`/settings intent).
  - Break-glass support (context for emergency actions).
  - User/role queue assistance (suggested routing).
  - Compliance queue assistance (triage only).
- **Inputs:** `AuditLog`, `AdminActionLogged`, `ComplianceFlagRaised`, module read models, admin memory.
- **Outputs:** triage rankings, drift warnings, context packs.
- **Consumers:** Administrator; Super Administrator (`GLOBAL`); AI Copilot.
- **Knowledge dependencies:** Domain Knowledge, Compliance Knowledge, Historical Knowledge.
- **Events emitted:** `AIAlertRaised`, `AIRecommendationGenerated`, `AIRiskDetected`.
- **Human-review triggers:** all advisory; role changes require Super Admin (`PERMISSION_MODEL.md §6`); AI never assigns roles.
- **Security scope:** `GLOBAL` (Admin/Super). Full AuditLog read is Admin/Super/Compliance per permission matrix.

---

## 11. Support AI

- **Purpose:** Assistance intelligence for Support agents and self-serve Investors.
- **Capabilities:**
  - Ticket routing (to correct queue/role).
  - Answer generation (grounded in docs + knowledge).
  - Policy lookup (cite source doc/section).
  - Escalation suggestion (when human needed).
  - Sentiment detection (user frustration signal).
  - Follow-up recommendation.
- **Inputs:** support conversations (memory), `Documents`, knowledge base, `AuditLog` (read, scoped), support memory.
- **Outputs:** suggested replies, routing, citations, escalation flags.
- **Consumers:** Support role; Investor (self-serve, `OWN`); AI Copilot.
- **Knowledge dependencies:** Document Knowledge, Domain Knowledge, Historical Knowledge.
- **Events emitted:** `AIRecommendationGenerated` (routing/reply), `AIAlertRaised` (escalation).
- **Human-review triggers:** suggested replies are drafts; never auto-sent to users without human send. Escalation is a suggestion.
- **Security scope:** `OWN` for the investor's own conversation; Support sees only the conversation in scope; no cross-user PII leakage.

---

## 12. Executive AI

- **Purpose:** Strategic intelligence for Executives and Super Administrators.
- **Capabilities:**
  - Platform health (composite of module health).
  - Revenue dashboards (fees, yields, commissions — aggregated).
  - Growth forecasting (investors, AUM, network size).
  - Market intelligence (external + internal trends).
  - Treasury overview (fed by Treasury AI, anonymized).
  - Network health (agent/referral ecosystem).
  - Risk dashboard (consolidated risk signals).
  - Operational insights (bottlenecks, anomalies).
  - Strategic recommendations (advisory).
- **Inputs:** anonymized aggregates from all engines, `Transaction`, `TreasuryMovement`, `Agent`, `Referral`, `Investment`, `Proposal`, executive memory.
- **Outputs:** dashboards, forecasts, strategic recommendations.
- **Consumers:** Executive; Super Administrator (`GLOBAL`); AI Copilot.
- **Knowledge dependencies:** all knowledge domains (aggregated/anonymized).
- **Events emitted:** `AIForecastGenerated`, `AIRecommendationGenerated`, `AIAlertRaised`, `AIRiskDetected`.
- **Human-review triggers:** strategic recommendations advisory; any execution routes through the owning module's human gate.
- **Security scope:** `GLOBAL`. Built only on anonymized/aggregated data; raw PII never enters Executive AI.

---

## 13. Engine-to-knowledge mapping (consistency)

| Engine | Primary knowledge domains |
|--------|---------------------------|
| Investor AI | Portfolio, Property, Marketplace, Historical |
| Agent AI | Network, Portfolio, Marketplace, Historical |
| Marketplace AI | Marketplace, Property, Network, Historical |
| Portfolio AI | Portfolio, Property, Treasury, Historical |
| Treasury AI | Treasury, Historical, Compliance |
| Governance AI | Governance, Treasury, Historical |
| Compliance AI | Compliance, Network, Historical |
| Property AI | Property, Marketplace, Historical, Document |
| Developer AI | Domain, Historical, Document |
| Administrator AI | Domain, Compliance, Historical |
| Support AI | Document, Domain, Historical |
| Executive AI | All (anonymized) |

All engines emit events per `AI_EVENT_EXTENSION.md` and honor the explainability contract per `AI_EXPLAINABILITY_MODEL.md`.
