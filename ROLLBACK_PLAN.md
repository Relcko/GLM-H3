# Rollback Plan — Relcko V2.15.0-beta-rc1

**Architecture:** V1.9 (frozen)

---

## 1. Rollback Conditions

A rollback is triggered when any of the following conditions are met:

### 1.1 Critical Conditions (Immediate Rollback)

| Condition | Detection | Response Time |
|-----------|-----------|---------------|
| **Ledger imbalance** — double-entry journal does not balance | `ReconciliationService.verifyIntegrity()` | Immediate |
| **Security incident** — confirmed unauthorized access, exploit, or breach | Security monitoring / alert | Immediate |
| **Data corruption** — any detected integrity violation | Health check / reconciliation | Immediate |
| **Smart contract vulnerability** — confirmed exploit in deployed contracts | Audit / monitoring | Immediate |
| **Fund loss** — any detected loss of user or platform funds | Transaction monitoring | Immediate |

### 1.2 High Severity Conditions (≤ 15 min)

| Condition | Detection | Threshold |
|-----------|-----------|-----------|
| **Health check failure** — any service reports `unhealthy` | `SystemHealthEngine` | 2 consecutive failures |
| **Error rate spike** — API/service error rate exceeds threshold | `AlertEngine` | > 1% of requests over 5 min |
| **Performance degradation** — response times exceed SLOs | `PerformanceMonitor` | p95 > 2x target for 5 min |
| **Event processing lag** — events not processed within window | `EventMonitoringService` | Lag > 5 min |
| **Test failure rate** — smoke test suite failure rate | Post-deployment validation | > 5% of tests |

### 1.3 Medium Severity Conditions (≤ 1 hour)

| Condition | Detection | Threshold |
|-----------|-----------|-----------|
| **Dead letter queue non-empty** — events failing to process | `InMemoryEventBus.deadLetters()` | Any unprocessed events |
| **Rate limit abuse** — sustained rate limit hits | `RateLimiter` | > 50% of requests rate-limited |
| **Cache degradation** — cache hit ratio drops | `CacheEngine` | Hit ratio < 50% |

---

## 2. Rollback Sequence

### Phase 1: Halt (Immediate)

```bash
# Step 1 — Pause smart contracts (if deployed)
cast send $PAYMENT_MANAGER "pause()" \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $OWNER_KEY

# Step 2 — Disable user-facing features via feature flags
# Set critical feature flags to false
flagProvider.setFlag('marketplace.enabled', false);
flagProvider.setFlag('investment.enabled', false);
flagProvider.setFlag('governance.enabled', false);

# Step 3 — Notify operations team
# Incident created with full details
```

### Phase 2: Assess (≤ 15 min)

```bash
# Step 1 — Determine rollback scope
#   Full rollback: All services revert to previous version
#   Partial rollback: Specific service(s) revert

# Step 2 — Identify last known good version
git log --oneline --decorate -10
# Expected: tags/v2.14.2 or earlier stable commit

# Step 3 — Capture current state for postmortem
# Take snapshot of:
#   - Current logs
#   - Error reports
#   - Health check results
#   - Active incidents
```

### Phase 3: Execute Rollback

#### Full Application Rollback

```bash
# Step 1 — Checkout previous stable version
git checkout tags/<previous-stable-tag>

# Step 2 — Rebuild
npm ci
npm run build

# Step 3 — Redeploy
# Deploy the rebuilt application

# Step 4 — Restore feature flags
# Reset flags to pre-rollback safe values
```

#### Partial Service Rollback

```bash
# Step 1 — Identify affected service
# (e.g., treasury service has a bug)

# Step 2 — Revert specific package
git checkout tags/<previous-stable-tag> -- packages/treasury/

# Step 3 — Verify no conflicts
git diff --name-only -- packages/treasury/

# Step 4 — Rebuild affected package
npm run build  # or targeted build

# Step 5 — Redeploy service
```

#### Smart Contract Rollback

```bash
# Step 1 — Pause contracts (already done in Phase 1)

# Step 2 — If upgrade proxy: deploy previous implementation
# Cast upgrade to previous verified implementation

# Step 3 — If no proxy: redeploy from previous deployment artifact
# Use deployments/<network>.json for previous addresses

# Step 4 — Transfer assets to new/previous contract
cast send $OLD_PAYMENT_MANAGER "withdrawFunds(address)" $USDT_ADDRESS \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $OWNER_KEY

# Step 5 — Verify contract state
cast call $NEW_PAYMENT_MANAGER "paused()(bool)" \
  --rpc-url $BSC_TESTNET_RPC
```

### Phase 4: Verify (≤ 30 min)

```bash
# Step 1 — Run full test suite
npm run test

# Step 2 — Run smoke tests
npx vitest run packages/administration/src/__tests__/smoke.test.ts

# Step 3 — Verify health endpoints
curl -f http://localhost:3000/api/health

# Step 4 — Verify smart contract state (if applicable)
cast call $PAYMENT_MANAGER "paused()(bool)" \
  --rpc-url $BSC_TESTNET_RPC

# Step 5 — Verify event bus state
# Check dead letter queue is empty
# Confirm event processing resumed

# Step 6 — Verify treasury integrity
# Run reconciliation check
# Verify all journals balance
```

### Phase 5: Resume (≤ 1 hour)

```bash
# Step 1 — Unpause smart contracts (if safe)
cast send $PAYMENT_MANAGER "unpause()" \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $OWNER_KEY

# Step 2 — Re-enable feature flags
flagProvider.setFlag('marketplace.enabled', true);
flagProvider.setFlag('investment.enabled', true);

# Step 3 — Verify full platform health
# Health report should show all services healthy

# Step 4 — Resume normal operations
```

---

## 3. Data Recovery

### 3.1 Principles

- **No destructive rollback:** Corrections are always additive, never destructive.
- **Never edit ledger/audit:** Ledger entries and audit logs are append-only.
- **Offsetting corrections:** Use corrective journal entries, never DELETE or UPDATE.
- **Full audit trail:** Every correction is logged with before/after state.

### 3.2 Treasury Data Recovery

```typescript
// Step 1 — Run reconciliation
const report = await reconciliationService.reconcile();
// Identifies discrepancies between on-chain and ledger

// Step 2 — Post correction entries
// Via MovementService with full audit trail
const correction = await movementService.createMovement({
  from: affectedAccount,
  to: correctionAccount,
  amount: discrepancyAmount,
  reason: `Rollback correction: ${incidentId}`,
  auditTrail: { originalState, correctedState }
});

// Step 3 — Verify correction
const updatedReport = await reconciliationService.reconcile();
assert(updatedReport.discrepancies.length === 0);
```

### 3.3 Investment Data Recovery

```typescript
// Step 1 — Identify affected investments (if any)
const affectedInvestments = await investmentRepository.findByStatus('Processing');

// Step 2 — For each affected investment:
for (const investment of affectedInvestments) {
  if (transactionFailed) {
    // Post refund entry via RecoveryEngine
    await recoveryEngine.initiateRecovery(investment.id);
  } else {
    // Complete pending investment
    await settlementOrchestrator.completeSettlement(investment.id);
  }
}
```

### 3.4 Event Recovery

```typescript
// Step 1 — Check dead letter queue
const deadLetters = eventBus.deadLetters();

// Step 2 — Replay failed events
for (const deadLetter of deadLetters) {
  try {
    await eventBus.replayDeadLetter(deadLetter.eventId);
  } catch (error) {
    // Log failure, escalate manually
    logger.error(`Failed to replay event: ${deadLetter.eventId}`, error);
  }
}

// Step 3 — Verify all events processed
assert(eventBus.deadLetters().length === 0);
```

---

## 4. Treasury Protection

| Protection | Mechanism | Trigger |
|------------|-----------|---------|
| **Journal balance check** | Every journal entry verified at write | Automatic, per entry |
| **Account balance limits** | Per-account caps and thresholds | Automatic, per movement |
| **Reserve ratio minimum** | ReserveService enforces minimum | Automatic, per allocation |
| **Movement approval** | Multi-step approval for large movements | Configurable threshold |
| **Reconciliation** | Daily on-chain vs ledger comparison | Scheduled |
| **Audit trail** | All changes recorded with before/after | Automatic, per mutation |

During rollback:
1. All treasury operations are suspended (Phase 1)
2. Ledger integrity is verified before resumption
3. Correction entries are posted with full audit trail
4. Reconciliation confirms integrity before resumption

---

## 5. Governance Protection

| Protection | Mechanism | Trigger |
|------------|-----------|---------|
| **Proposal immutability** | Proposal state cannot be reverted | Design invariant |
| **Vote recording** | Votes are append-only | Automatic |
| **Delegation snapshots** | Voting power frozen at snapshot time | Per proposal |
| **Execution simulation** | No real on-chain impact until V3.0 | Design limitation |

During rollback:
1. Governance operations are suspended
2. Active proposals remain in their current state
3. No vote or proposal data is modified
4. Governance resumes when platform health is verified

---

## 6. Wallet Safety

| Protection | Mechanism | Trigger |
|------------|-----------|---------|
| **Non-custodial** | Wallets are user-controlled | Design invariant |
| **No private keys stored** | Keys never leave user's wallet | Design invariant |
| **Transaction signing** | All transactions require user signature | Automatic |
| **Session management** | Session tokens with expiry | Automatic |

Wallet safety is inherent to the non-custodial design. Platform rollback does not affect user wallet security.

---

## 7. Investor Safety

| Protection | Mechanism | Trigger |
|------------|-----------|---------|
| **Non-custodial** | Investors control their own assets | Design invariant |
| **KYC data protection** | PII redacted in audit logs | Automatic |
| **Investment state machine** | Clear state transitions for every investment | Automatic |
| **Recovery engine** | Failed investments can be recovered | Per request |
| **Idempotency** | All event processing is idempotent | Design invariant |

During rollback:
1. Investor-facing features are disabled (Phase 1)
2. Pending investments are either completed or recovered (Phase 2)
3. No investor data is modified during rollback
4. Investors are notified via platform communication channels

---

## 8. Post-Rollback Validation

### 8.1 Automated Validation

```bash
# Run complete validation suite
npm run test          # 698 tests
npm run typecheck     # 0 TS errors
npm run lint          # 0 warnings

# Verify treasury integrity
# All journals balanced
# All accounts within limits
# All allocations valid

# Verify investment state
# No investments stuck in Processing
# All pending transactions resolved

# Verify event consistency
# All events processed (no dead letters)
# Event replay completed successfully
```

### 8.2 Manual Validation

| Check | Verifier | Method |
|-------|----------|--------|
| All service health checks pass | Operations team | `/api/health` endpoint |
| Frontend loads without errors | QA team | Manual browser testing |
| Wallet connection works | QA team | Connect/disconnect test |
| Marketplace renders correctly | QA team | Browse, search, filter test |
| Investment flow operable | QA team | Complete investment test |
| No data integrity issues | Engineering | Reconciliation report |
| No security incidents | Security team | Security log review |

### 8.3 Postmortem

After successful rollback, a postmortem must be completed within 48 hours:

1. **Incident summary** — What happened, when, impact
2. **Root cause analysis** — Why it happened
3. **Detection** — How it was detected, detection latency
4. **Response** — Rollback execution timeline
5. **Recovery** — Data recovery steps, verification
6. **Prevention** — Changes to prevent recurrence
7. **Action items** — Owner, deadline, tracking
