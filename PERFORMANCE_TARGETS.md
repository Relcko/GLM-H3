# Performance Targets — Relcko Platform (V1.9.0)

**Companion to:** `UNIFIED_IMPLEMENTATION_BLUEPRINT.md`. Targets per surface. Planning only; values are aspirational SLOs to be ratified by Platform/Architecture board and tuned per environment. No code.

Targets enforce scalability posture: 100M users, global regions, multi-cloud, mobile, institutional APIs (`SECURITY_ARCHITECTURE.md §5`).

All targets assume event-driven, stateless, projection-based architecture (`EVENT_ARCHITECTURE.md`, `RELCKO_ECOSYSTEM_ARCHITECTURE.md §0`).

---

## 1. Frontend

| Metric | Target |
|--------|--------|
| First Contentful Paint (FCP) | ≤ 1.2s (p75) |
| Largest Contentful Paint (LCP) | ≤ 2.0s (p75) |
| Time to Interactive (TTI) | ≤ 3.0s (p75) |
| Bundle (initial, gz) | ≤ 200KB for core shell |
| CLS | ≤ 0.1 |
| a11y | WCAG 2.1 AA pass |

## 2. Backend (services)

| Metric | Target |
|--------|--------|
| API p95 latency (read) | ≤ 150ms |
| API p95 latency (write, gated) | ≤ 400ms |
| Auth (SIWE/MFA) p95 | ≤ 300ms |
| Throughput per service | ≥ 5k req/s (horizontal) |
| Error rate | ≤ 0.1% |
| Permission check overhead | ≤ 5ms |

## 3. Contracts (on-chain)

| Metric | Target |
|--------|--------|
| Gas per primary invest (bounded) | within block gas limit w/ margin |
| Settlement (ERC1155 transfer) | single tx, verified |
| Confirmation (read) | via indexer < 2s |
| Upgrade/execute | respect timelock (minutes, not seconds) |

## 4. API (gateway / public API future)

| Metric | Target |
|--------|--------|
| Gateway p95 latency | ≤ 50ms added |
| Rate-limit enforcement | per-actor + per-tenant |
| Availability | ≥ 99.95% |
| Tenant isolation | hard (no cross-tenant leak) |

## 5. Database / Ledger

| Metric | Target |
|--------|--------|
| Ledger append p95 | ≤ 50ms |
| Read-model recompute (incremental) | ≤ 500ms after event |
| Full projection rebuild | off-peak; no user impact |
| Query p95 (indexed) | ≤ 50ms |
| Connection pool | elastic; no exhaustion under load |

## 6. Workers

| Metric | Target |
|--------|--------|
| Event processing lag (p95) | ≤ 1s under normal load |
| Batch projection window | ≤ 5 min |
| Idempotent replay | no duplicate effect |
| Scale | horizontal; partition by aggregate |

## 7. Search

| Metric | Target |
|--------|--------|
| Index latency (new listing/property) | ≤ 2s |
| Query p95 | ≤ 100ms |
| Relevance | marketplace + NFT; geo-aware |

## 8. Marketplace

| Metric | Target |
|--------|--------|
| Browse grid load (p95) | ≤ 300ms |
| Invest confirm (end-to-end, off-chain) | ≤ 2s pre-chain |
| Concurrent listings indexed | 10M+ |
| Supply-invariant check | O(1) |

## 9. NFT

| Metric | Target |
|--------|--------|
| Mint/list/buy p95 (off-chain) | ≤ 400ms |
| Ownership reconciliation job | daily batch; diff alert |
| Counterfeit scan | continuous; near-dup flagged < 1h |

## 10. Treasury

| Metric | Target |
|--------|--------|
| Movement validation (limit/whitelist) | O(1) |
| Multi-sig init/approve UI | ≤ 500ms |
| Anomaly detection | batch rollups; alert < 15 min |
| Reconciliation (on-chain vs ledger) | daily; mismatch → `AlertRaised` |

## 11. Governance

| Metric | Target |
|--------|--------|
| Proposal list/detail load | ≤ 300ms |
| Vote cast (off-chain intent) | ≤ 400ms |
| Voting power projection | incremental; recompute < 1s |
| Timelock execution | on-chain; observable |

---

## 12. Cross-cutting

- **AI Platform:** recommendation generation (on-demand) p95 ≤ 2s; streaming incremental; millions of recommendations processed in batch windows (`AI_PLATFORM_ARCHITECTURE.md §6`).
- **Security/Observability:** audit write p95 ≤ 50ms; security-event ingest ≤ 1s; dashboards refresh ≤ 30s.
- **DR:** RPO near-zero for ledger/audit; RTO minutes for stateless paths (`DISASTER_RECOVERY_PLAN.md`).

Targets are validated by `TESTING_AND_QA_STRATEGY.md` (Performance/Load) and gated in `CI_CD_RELEASE_STRATEGY.md` (Performance gate).
