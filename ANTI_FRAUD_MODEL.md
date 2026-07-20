# Anti-Fraud Model — Relcko Network Engine (RNE)

**Companion to:** `NETWORK_ENGINE_ARCHITECTURE.md`, `NETWORK_TREE_MODEL.md`,
`DOMAIN_MODEL.md` (KYC, AuditLog). Architecture only.

Enumerates the fraud vectors specific to a lifetime network/commission engine and
the **preventive + detective** controls. RNE inherits the platform's KYC/AML gates
(`DOCUMENT_MANAGEMENT_ARCHITECTURE.md`) and adds network-specific guards. All
controls are deterministic and auditable; none require code here.

---

## 1. Threat vectors

| # | Vector | Description |
|---|--------|-------------|
| F1 | **Self-referral** | agent refers themselves (or a wallet they control) to earn personal commission. |
| F2 | **Circular sponsorship** | A→B→C→A cycle in agent hierarchy to route override artificially. |
| F3 | **Wallet duplication** | one person operating multiple wallets/investors to inflate volume. |
| F4 | **Identity duplication** | one person with multiple KYC identities / agents. |
| F5 | **Wash trading** | agent trades with themselves (primary↔secondary) to generate fake turnover. |
| F6 | **Split purchases** | one large qualifying sale split into many small ones to game rank/recruit metrics. |
| F7 | **Commission abuse** | exploiting override routing (e.g., brief reactivation) to claw compressed override. |
| F8 | **Artificial volume** | coordinated downline pump to cross rank thresholds temporarily. |
| F9 | **Fake KYC** | forged KYC to pass the qualified-sale gate. |
| F10 | **Manual manipulation** | admin/operator tampering with status, rank, or commission records. |

---

## 2. Preventive controls

| Vector | Control |
|--------|---------|
| F1 | Sponsor assignment rejects self-reference; investor wallet must differ from agent wallet; agent↔investor identity linkage checked at `ReferralCreated`. |
| F2 | `sponsorId` assignment rejects any edge that would create a cycle (graph acyclic invariant, `NETWORK_TREE_MODEL.md` §10). |
| F3 | Wallet ↔ Identity binding: one verified wallet per KYC identity; repeated wallet → referral rejected. |
| F4 | One KYC identity per person; duplicate-identity detection across agents/investors at onboarding. |
| F5 | Secondary trades require distinct buyer/seller wallets + identity; self-trade blocked; cooling period + settlement checks. |
| F6 | Minimum ticket + velocity limits; split detection via clustering of same-source funds within window. |
| F7 | Recovery is **forward-only** (no retroactive re-credit), `COMMISSION_ENGINE.md` §5; reactivation does not retro-claim compressed override. |
| F8 | Rank uses **sustained** monthly turnover + lifetime; temporary spikes decay; anomaly flag on volume velocity. |
| F9 | KYC verification by Compliance (`DOCUMENT_MANAGEMENT_ARCHITECTURE.md`); fake KYC → `ComplianceFlagRaised` + sale disqualified. |
| F10 | All admin mutations wrapped in `AdminActionLogged` + dual-control for rank/commission/status overrides; immutable `AuditLog`. |

---

## 3. Detective controls (monitoring)

- **Velocity anomaly**: qualifying-sale rate per agent beyond cohort z-score →
  flag.
- **Override concentration**: override paid to a node far up the tree
  (compressed) beyond expected → review.
- **Recovery spike**: agent inactive→active with immediate large sale → review
  (legit but monitored).
- **Volume decay + rank**: rank achieved then sharp drop → retention review.
- **Wallet/identity graph**: periodic graph analysis for cycles, dupes, shared
  devices/IP (privacy-aware, compliant).
- Any flag → `ComplianceFlagRaised` → manual review → possible `Commission HELD`
  / `REVERSED`.

---

## 4. Disqualification & clawback

- A sale failing the qualified-sale gate (KYC/payment/ownership/cooling/min/refund/
  cancel) yields **zero** credit and is logged in `QualifiedSaleLog` as
  disqualified.
- Paid commission on a later-disqualified sale is **clawed back** via an offsetting
  commission entry (never edited), recorded in `AuditLog`.
- Fraudulent agents may be **suspended** (admin intervention) — sponsor links of
  their customers are **never** reassigned (principle 1); only admin can move a
  customer.

---

## 5. Audit & immutability

- Every control decision (reject, flag, clawback, override) appends `AuditLog`
  (entity 19) with actor, rule, and evidence reference.
- RNE mutations are append-only; corrections are offsetting entries
  (`ENTITY_RELATIONSHIP.md` rule 2).
- Compliance Officer + Auditor roles (`PERMISSION_MODEL.md`) have read access to
  all fraud signals.

---

## 6. Integration

| Module | Anti-fraud touchpoint |
|--------|-----------------------|
| Document Vault / Compliance | KYC/AML verification gate (F9). |
| Marketplace / Payment | settlement + cooling checks (qualified-sale gate). |
| Treasury | clawback settlement. |
| AuditLog | immutable record of all controls. |
| AI Copilot | read-only fraud-signal summaries (scoped to Compliance). |
| Admin Portal | dual-control overrides + `AdminActionLogged`. |

---

## 7. Scalability

- Graph invariants (acyclic, no self/split) checked at write time (O(depth)).
- Anomaly detection runs on pre-aggregated rollups in batch; per-event lightweight
  checks only.
- At 100K agents, graph analysis is partitioned by subtree; flags routed to
  Compliance queue.
