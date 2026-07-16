# Deployment Runbook — Relcko V2.15.0-beta-rc1

**Target Environment:** Beta (BSC Testnet)
**Architecture:** V1.9 (frozen)

---

## 1. Pre-Deployment Validation

### 1.1 Source Validation

```bash
# Verify working tree is clean
git status

# Confirm correct tag
git log --oneline -1

# Run full test suite
npm run test

# TypeScript compilation check
npm run typecheck

# Lint check
npm run lint

# Smart contract compilation
forge build
```

### 1.2 Environment Validation

```bash
# Verify .env file exists and has required variables
node -e "
const required = [
  'BSC_TESTNET_RPC',
  'DEPLOYER_PK',
  'RLKO_ADDRESS',
  'PAYMENT_MANAGER',
  'STAKING_ADDRESS'
];
const missing = required.filter(k => !process.env[k]);
if (missing.length) throw new Error('Missing: ' + missing.join(', '));
console.log('All required env vars present');
"
```

### 1.3 Network Validation

```bash
# Confirm testnet connectivity
cast chain-id --rpc-url $BSC_TESTNET_RPC
# Expected: 97

# Check deployer balance
cast balance $DEPLOYER --rpc-url $BSC_TESTNET_RPC
# Must have sufficient BNB for gas
```

---

## 2. Deployment Sequence

### Phase 1: Smart Contracts (if needed)

```bash
# Step 1.1 — Deploy RLKO token (testnet)
forge script script/DeployRLKO.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $DEPLOYER_PK \
  --verify --broadcast --slow -vvv

# Step 1.2 — Deploy PaymentManager
forge script script/DeployPaymentManager.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $DEPLOYER_PK \
  --verify --broadcast --slow -vvv

# Step 1.3 — Configure and activate Stage 1
forge script script/ConfigureStage1.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $DEPLOYER_PK \
  --broadcast --slow -vvv

# Step 1.4 — Update frontend config
node tools/update-testnet-env.mjs
```

### Phase 2: Frontend Build

```bash
# Step 2.1 — Install dependencies
npm ci

# Step 2.2 — Build application
npm run build

# Step 2.3 — Verify build output
ls -la out/  # or .next/
```

### Phase 3: Service Deployment

```bash
# Step 3.1 — Start services in order:
# 1. Event bus infrastructure
# 2. Identity service
# 3. Permissions service
# 4. Marketplace service
# 5. Investment engine
# 6. Portfolio service
# 7. Treasury service
# 8. Governance service
# 9. AI platform
# 10. Administration
# 11. Operations/monitoring

# Each service validates its composition root on startup:
#   createXxxModule(eventBus, logger, audit, flags, performance)
```

---

## 3. Database Migration Order

**Note:** All repositories use `InMemory*` implementations. No database migrations are required for the beta release.

| Migration | Scope | Status | Dependencies |
|-----------|-------|--------|--------------|
| N/A | All packages use in-memory storage | ✅ No DB migrations needed | — |
| Production DB adapter | Future | ⬜ Deferred | Production readiness |

When database adapters are implemented in a future milestone, the migration order will be:

1. Foundation layer — types, events, logging
2. Identity & permissions
3. Domain-core entities
4. Business engines — marketplace, investment, portfolio
5. Financial — treasury, governance
6. AI platform & operations

---

## 4. Service Startup Order

```
Order  │ Service              │ Validates              │ Health endpoint
───────┼──────────────────────┼────────────────────────┼──────────────────
  1    │ Event Bus            │ Envelope validation    │ — (in-process)
  2    │ Identity             │ Auth, session, wallet  │ identity/health
  3    │ Permission           │ Policy matrix          │ permission/health
  4    │ Marketplace          │ Listing, property      │ marketplace/health
  5    │ Investment Engine    │ Eligibility, tx        │ investment/health
  6    │ Portfolio            │ Aggregation            │ portfolio/health
  7    │ Treasury             │ Ledger, allocations    │ treasury/health
  8    │ Governance           │ Proposals, voting      │ governance/health
  9    │ AI Platform          │ Model routing          │ ai-platform/health
 10    │ Administration       │ Admin areas            │ administration/health
 11    │ Operations           │ Monitoring, alerts     │ operations/health
```

Each service must report `Healthy` before the next service starts.

---

## 5. Health Verification

### 5.1 Automated Health Checks

```typescript
// Each service exposes health via @relcko/observability HealthRegistry
const healthReport = await healthRegistry.report();
// {
//   status: 'healthy' | 'degraded' | 'unhealthy',
//   checks: { [serviceName]: HealthCheckResult },
//   timestamp: number
// }
```

### 5.2 Verification Commands

```bash
# Verify all service health endpoints respond 200
curl -f http://localhost:3000/api/health

# Verify smart contract state
cast call $PAYMENT_MANAGER "stageActive(uint256)" 0 \
  --rpc-url $BSC_TESTNET_RPC

# Verify token balance of PaymentManager
cast call $RLKO_TOKEN "balanceOf(address)" $PAYMENT_MANAGER \
  --rpc-url $BSC_TESTNET_RPC

# Verify staking contract is operational
cast call $STAKING "getPlanCount()" \
  --rpc-url $BSC_TESTNET_RPC
```

---

## 6. Smoke Tests

### 6.1 Frontend Smoke Tests

| Test | Expected Result | Command |
|------|----------------|---------|
| Landing page loads | HTTP 200, no console errors | Visit `/` |
| Marketplace page renders | Properties grid visible | Visit `/marketplace` |
| Presale dashboard loads | Purchase panel visible | Visit `/presale` |
| Wallet connection works | RainbowKit modal opens | Click "Connect Wallet" |
| Navigation works | All routes accessible | Click through nav links |

### 6.2 Backend Smoke Tests

```bash
# Run the V2.14 cross-domain integration tests
npx vitest run packages/testing/src/__tests__/v2-14-e2e-flows.test.ts

# Run the event consistency tests
npx vitest run packages/testing/src/__tests__/v2-14-event-consistency.test.ts

# Run full service-layer smoke tests
npx vitest run packages/administration/src/__tests__/smoke.test.ts
```

### 6.3 Smart Contract Smoke Tests

```bash
# Run contract test suite
forge test

# Verify PaymentManager is paused or active
cast call $PAYMENT_MANAGER "paused()" \
  --rpc-url $BSC_TESTNET_RPC

# Verify stage configuration
cast call $PAYMENT_MANAGER "stages(uint256)" 0 \
  --rpc-url $BSC_TESTNET_RPC
```

---

## 7. Rollback Triggers

Any of the following conditions **immediately trigger** rollback:

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Health check failure | Any service reports `unhealthy` | Rollback all services |
| Test failure rate > 5% | Smoke test suite | Rollback to last known good |
| Error rate > 1% | API/service error rate | Rollback affected service |
| Ledger inconsistency | Double-entry imbalance detected | Emergency rollback + audit |
| Security incident | Confirmed breach or exploit | Immediate pause + rollback |
| Data corruption | Any detected data integrity issue | Immediate rollback |
| Performance degradation > 50% | Response times exceed targets | Rollback to previous version |
| Smart contract vulnerability | Confirmed in audit or exploit | Pause contract + rollback frontend |

---

## 8. Rollback Execution

### 8.1 Application Rollback

```bash
# Step 1 — Identify last known good deployment
git log --oneline --decorate

# Step 2 — Revert to previous tag
git checkout tags/<previous-stable-tag>

# Step 3 — Rebuild
npm ci
npm run build

# Step 4 — Redeploy
# Deploy the rebuilt application

# Step 5 — Verify health
# Run health verification commands
```

### 8.2 Smart Contract Rollback

```bash
# Step 1 — Pause the contract immediately
cast send $PAYMENT_MANAGER "pause()" \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $OWNER_KEY

# Step 2 — If redeploying, withdraw funds
cast send $PAYMENT_MANAGER "withdrawFunds(address)" $USDT_ADDRESS \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $OWNER_KEY

# Step 3 — Deploy fixed contract (see Phase 1)
# Step 4 — Transfer assets to new contract
# Step 5 — Verify new contract state
```

---

## 9. Recovery Procedures

### 9.1 Service Recovery

1. **Identify failing service** via health check or alert
2. **Check service logs** for error patterns
3. **Restart service** — `SystemHealthEngine` triggers restart
4. **Verify recovery** — service reports `healthy`
5. **If restart fails**, escalate to rollback

### 9.2 Event Bus Recovery

1. **Check dead letter queue** — `InMemoryEventBus.deadLetters()`
2. **Replay dead letters** — `eventBus.replayDeadLetters()`
3. **Verify event processing resumed**
4. **If replay fails**, investigate individual events

### 9.3 Treasury Recovery

1. **Run reconciliation** — `ReconciliationService` compares on-chain vs ledger
2. **Identify discrepancies** — review mismatch report
3. **Post correction entries** — via `MovementService` with audit trail
4. **Verify balance restoration** — `HealthService` confirms

### 9.4 Data Integrity Recovery

1. **No destructive rollback** — per `CI_CD_RELEASE_STRATEGY.md`
2. **Post correcting entries** — offsetting transactions with full audit
3. **Never edit ledger/audit** — corrections are additive entries
4. **Verify integrity** — reconciliation confirms correction

---

## 10. Post-Deployment Validation

```bash
# Run full validation suite
npm run test
npm run typecheck
npm run lint

# Verify no regressions
# Expected: 698 tests passing, 0 TS errors, 0 lint warnings
```
