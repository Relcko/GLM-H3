# Monitoring Checklist — Relcko V2.15.0-beta-rc1

---

## 1. Health Endpoints

### Service Health

| Service | Health Check | Expected Status | SLO |
|---------|-------------|----------------|-----|
| Event Bus | Event publishing/subscription | Healthy | 99.99% |
| Identity | Auth, session, wallet, crypto | Healthy | 99.95% |
| Permission | Policy resolution | Healthy | 99.99% |
| Marketplace | Property listing, search | Healthy | 99.95% |
| Investment Engine | Eligibility, reservation, settlement | Healthy | 99.95% |
| Portfolio | Aggregation, performance, ROI | Healthy | 99.95% |
| Treasury | Ledger, allocations, reserves | Healthy | 99.99% |
| Governance | Proposals, voting, execution | Healthy | 99.95% |
| AI Platform | Model routing, advisory | Healthy | 99.90% |
| Administration | Admin operations | Healthy | 99.95% |
| Operations | Monitoring, alerts, telemetry | Healthy | 99.99% |

### Health Check Implementation

```typescript
// Each service registers with HealthRegistry
healthRegistry.register('treasury', async () => {
  const ledgerOk = await ledgerService.verifyIntegrity();
  const allocationOk = await allocationService.verifyAllocations();
  return {
    status: ledgerOk && allocationOk ? 'healthy' : 'degraded',
    details: { ledgerOk, allocationOk }
  };
});
```

### Health Check Commands

```bash
# Get platform-wide health report
curl http://localhost:3000/api/health

# Check individual service
curl http://localhost:3000/api/health/treasury
curl http://localhost:3000/api/health/marketplace
curl http://localhost:3000/api/health/governance
```

---

## 2. Treasury Monitoring

| Metric | Instrument | Threshold | Alert |
|--------|-----------|-----------|-------|
| Ledger balance integrity | `ReconciliationService` | All entries balanced | Immediate alert on imbalance |
| Account balance | `AccountService` | Per-account thresholds | Warning at 90% of limit |
| Reserve ratio | `ReserveService` | Minimum reserve ratio | Critical if below minimum |
| Allocation utilization | `AllocationService` | Per-rule caps | Warning at 85% utilization |
| Movement volume | `MovementService` | Per-period limits | Alert on limit breach |
| Dividend eligibility | `DividendService` | N/A | Monitor eligibility runs |
| Buyback status | `BuybackService` | N/A | Track buyback execution |
| Burn status | `BurnService` | N/A | Track burn execution |
| Cashflow projection | `CashflowProjectionService` | Projected vs actual | Alert on >10% variance |
| Reconciliation | `ReconciliationService` | On-chain vs ledger | Daily report, alert on mismatch |

### Treasury Alert Thresholds

```typescript
const TREASURY_ALERTS = {
  ledgerImbalance: { severity: 'critical', action: 'immediate pause' },
  reserveBelowMinimum: { severity: 'critical', action: 'halt distributions' },
  suspiciousMovement: { severity: 'high', action: 'review + approve' },
  reconciliationMismatch: { severity: 'high', action: 'investigate' },
  allocationCapExceeded: { severity: 'high', action: 'review allocation rules' },
};
```

---

## 3. Investment Monitoring

| Metric | Instrument | Threshold | Alert |
|--------|-----------|-----------|-------|
| Transaction volume | `TransactionEngine` | Per-period capacity | Warning at 80% capacity |
| Transaction success rate | `TransactionMonitor` | < 95% success | Alert on degradation |
| Settlement latency | `SettlementOrchestrator` | > 5 min pending | Alert on backlog |
| Eligibility checks | `EligibilityEngine` | Error rate > 1% | Alert on errors |
| Reservation expiry | `ReservationEngine` | Expired > threshold | Warning on expirations |
| Recovery claims | `RecoveryEngine` | Any failed recovery | Alert on failure |
| Security guard triggers | `SecurityGuard` | Any trigger | Immediate alert |
| Blockchain adapter | `ViemBlockchainAdapter` | Connection drops | Alert on disconnect |

---

## 4. Marketplace Monitoring

| Metric | Instrument | Threshold | Alert |
|--------|-----------|-----------|-------|
| Listing volume | `ListingService` | Per-period count | Warning on anomaly |
| Search latency | `PropertySearch` | p95 > 300ms | Alert on degradation |
| Property views | `PropertyAnalytics` | Per-period | Track trends |
| Investment volume | `InvestmentService` | Per-period | Track trends |
| Collection activity | `CollectionsService` | Per-period | Track trends |
| Authorization failures | `Authorization` | > 1% of requests | Alert on spike |
| Validation errors | `Validation` | > 1% of requests | Alert on spike |

---

## 5. Governance Monitoring

| Metric | Instrument | Threshold | Alert |
|--------|-----------|-----------|-------|
| Proposal creation rate | `ProposalService` | Per-period | Track trends |
| Voting participation | `VotingEngine` | Quorum threshold | Alert approaching deadline |
| Delegation changes | `DelegationEngine` | Per-period | Track trends |
| Execution status | `ExecutionOrchestrator` | Failed execution | Immediate alert |
| Quorum attainment | `QuorumEngine` | Per-proposal | Track progress |
| Voting power changes | `VotingPowerCalculator` | Large changes | Alert on whale movements |
| Governance analytics | `GovernanceAnalytics` | Per-period | Dashboard metrics |

---

## 6. AI Platform Monitoring

| Metric | Instrument | Threshold | Alert |
|--------|-----------|-----------|-------|
| Model response latency | `ModelRouter` | p95 > 2s | Alert on degradation |
| Policy evaluation | `PolicyEngine` | Error rate > 1% | Alert on errors |
| Recommendation accuracy | `RecommendationService` | Downstream metrics | Track quality |
| Memory usage | `MemoryService` | Capacity > 80% | Warning |
| Knowledge query latency | `KnowledgeService` | p95 > 500ms | Alert on degradation |
| Advisor response time | Advisors | p95 > 3s | Alert on degradation |
| Explainability engine | `ExplainabilityEngine` | Error rate > 1% | Alert on errors |

---

## 7. Operational Monitoring

| Metric | Instrument | Threshold | Alert |
|--------|-----------|-----------|-------|
| System health | `SystemHealthEngine` | Any unhealthy service | Immediate alert |
| Event processing lag | `EventMonitoringService` | > 1s under load | Alert on backlog |
| Dead letter queue | `InMemoryEventBus` | Non-empty DLQ | Warning, investigate |
| Alert firing rate | `AlertEngine` | Per-period | Avoid alert fatigue |
| Incident response time | `IncidentTimeline` | SLO per severity | Track SLA |
| Resource utilization | `ResourceMonitor` | CPU/memory > 80% | Warning, scale |
| Queue depth | `QueueMonitor` | > threshold | Warning, backpressure |
| Worker health | `WorkerMonitor` | Failed workers | Alert on failure |

### Alert Severity Levels

| Severity | Response Time | Escalation |
|----------|--------------|------------|
| **Critical** | Immediate (≤ 5 min) | Engineering on-call + SRE |
| **High** | ≤ 15 min | Engineering team |
| **Medium** | ≤ 1 hour | Assignee within business hours |
| **Low** | ≤ 24 hours | Ticket tracked |

---

## 8. Performance Monitoring

| Metric | Instrument | Target | Alert |
|--------|-----------|--------|-------|
| Cache hit ratio | `CacheEngine` | > 80% | Warning < 60% |
| Concurrent operations | `ConcurrencyController` | Per-resource limit | Alert at 90% capacity |
| Rate limit hits | `RateLimiter` | Per-actor limits | Warning on sustained limit |
| Batch processing time | `BatchProcessor` | p95 < 500ms | Alert on degradation |
| Query performance | `QueryOptimizer` | p95 < 100ms | Alert on degradation |
| Pool utilization | `ConnectionPool` | Utilization < 80% | Warning > 80% |
| Event throughput | `EventThroughputMonitor` | Per-period capacity | Warning at 80% |
| Job execution time | `JobScheduler` | Per-job SLO | Alert on timeout |
| Pagination latency | `PaginatedQuery` | p95 < 200ms | Alert on degradation |
| Search performance | `SearchOptimizer` | p95 < 100ms | Alert on degradation |

---

## 9. Infrastructure Monitoring

| Resource | Check | Threshold | Alert |
|----------|-------|-----------|-------|
| CPU utilization | System metric | > 80% sustained | Warning |
| Memory utilization | System metric | > 80% sustained | Warning |
| Disk space | System metric | > 85% | Warning |
| Network latency | Between services | p95 > 50ms | Warning |
| Error rate (5xx) | Application metric | > 0.1% of requests | Alert |
| Request throughput | Application metric | Per-service capacity | Warning at 80% |
| Active users | Application metric | Per-period | Track trends |

---

## 10. Incident Escalation Path

### Tier 1: Automated Response

```
Trigger → AlertEngine evaluates
  ├─ Critical → Page on-call engineer (SMS/call)
  ├─ High → Create incident, notify team chat
  ├─ Medium → Create ticket, assign to team
  └─ Low → Log for daily review
```

### Tier 2: Engineering Response

```
On-call engineer acknowledges alert (≤ 5 min critical, ≤ 15 min high)
  ├─ Diagnose → Check dashboards, logs, traces
  ├─ Mitigate → Apply runbook procedure or rollback
  └─ Resolve → Verify health, document incident
```

### Tier 3: Escalation

```
If unresolved in:
  ├─ 15 min (critical) → Escalate to SRE team lead
  ├─ 30 min (high) → Escalate to engineering manager
  └─ 1 hour (any) → Escalate to CTO / VP Engineering
```

### Escalation Contacts

| Role | Contact | Availability |
|------|---------|-------------|
| SRE On-Call | [PagerDuty/VictorOps integration] | 24/7 |
| Engineering Lead | [Team channel] | Business hours + on-call |
| Security Engineer | [Security channel] | 24/7 for security incidents |
| VP Engineering | [Executive escalation] | As needed |

---

## 11. Dashboard Requirements

| Dashboard | Metrics | Refresh |
|-----------|---------|---------|
| **Platform Overview** | All service health, error rate, throughput | 30s |
| **Treasury** | Ledger balances, allocations, reserves, movements | Real-time |
| **Marketplace** | Listings, investments, search latency, volume | 30s |
| **Governance** | Proposals, votes, participation, execution | 30s |
| **AI Platform** | Request volume, latency, policy evaluations | 60s |
| **Performance** | Cache hit ratio, rate limits, pool utilization | 30s |
| **Operations** | Alerts, incidents, queue depth, workers | Real-time |
| **Security** | Auth failures, permission denials, audit events | Real-time |
