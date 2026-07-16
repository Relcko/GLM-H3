# Known Limitations — Relcko V2.15.0-beta-rc1

**Date:** 2026-07-16
**Architecture:** V1.9 (frozen)

---

## 1. Expected Limitations

These are intentional design decisions, not defects.

### 1.1 Governance Transaction Hash (Synthetic)

**File:** `packages/governance/src/execution/service.ts:93`

The `txHash` on `ExecutionRequest` is a synthetic placeholder:
```typescript
txHash: `0x${generateId("tx").replace(/-/g, "")}`
```
This generates a `0x`-prefixed UUID (with dashes stripped), not a real blockchain keccak256 hash. The entire `execute()` method is simulated — no on-chain governance interaction occurs. No on-chain governance Solidity contracts exist.

**Rationale:** Governance execution will be implemented when on-chain governance contracts are deployed (future milestone). The current implementation validates the execution pipeline without requiring blockchain interaction.

### 1.2 Portfolio Events Adapter (Observational)

**File:** `packages/portfolio/src/events-adapter/adapter.ts`

`PortfolioEventsAdapter` is intentionally observational. It subscribes to 5 external event types and performs only logging and telemetry — no state mutation, portfolio recalculation, or repository access.

**Subscribed Events:**
- `investment.completed`
- `investment.settlement_completed`
- `nft.transferred`
- `nft.mint_completed`
- `network.commission_paid`

**Rationale:** Portfolio recalculation from events is deferred to a future milestone. The adapter establishes the integration seam without introducing risk.

### 1.3 In-Memory Repositories

All 28 packages use `InMemory*` repository implementations by default. Composition roots accept optional repository injection with in-memory fallbacks.

**Affected packages:** All business engine packages (marketplace, investment-engine, portfolio, treasury, governance, ai-platform, network-engine, nft-marketplace, identity, administration, operations, performance)

**Rationale:** Allows independent testing without infrastructure. Production database adapters will replace these when database infrastructure is established.

### 1.4 Simulated Blockchain Interactions

**Files:**
- `packages/investment-engine/src/blockchain/adapter.ts` — `ViemBlockchainAdapter` wraps Viem calls
- `packages/governance/src/execution/service.ts` — simulated execution

All blockchain interactions are through Viem and smart contract calls. The governance execution pipeline is simulated until on-chain governance contracts exist.

**Rationale:** Blockchain integration for investment transactions is real (testnet verified). Governance simulation is an intentional placeholder.

### 1.5 No Multi-Signature Treasury

**File:** `deployments/testnet.json` (treasury: `0x0000...`)

The testnet PaymentManager owner is the deployer EOA, not a multisig. Treasury configuration is pending mainnet preparation.

**Rationale:** Testnet uses simplified ownership. Mainnet deployment will transfer ownership to a multisig treasury.

---

## 2. Deferred Enhancements

These are planned improvements that are out of scope for the beta release.

### 2.1 CI/CD Pipeline

**Status:** Strategy documented (`CI_CD_RELEASE_STRATEGY.md`), not implemented.

CI/CD pipeline stages defined but not automated:
- GitHub Actions workflows not created
- Automated testing gate not implemented
- Deployment automation not built
- Preview environments not configured
- Security scanning not integrated

**Target:** Pre-production milestone

### 2.2 Docker / Container Orchestration

**Status:** Not created.

No Dockerfiles or docker-compose configuration exists. All services run in-process within the Next.js application.

**Target:** Pre-production milestone

### 2.3 Production Database Adapters

**Status:** Deferred.

All packages use in-memory storage. Database adapters (PostgreSQL, or similar) need to be implemented for production data persistence.

**Target:** Pre-production milestone

### 2.4 Automated Portfolio Recalculation

**Status:** Deferred.

PortfolioEventsAdapter is observational. Automated portfolio recalculation from domain events is not yet implemented.

**Target:** V2.16+

### 2.5 On-Chain Governance Contracts

**Status:** Deferred.

Governance execution pipeline is simulated. Solidity contracts for on-chain proposal execution, voting, and timelock are not implemented.

**Target:** V3.0+

### 2.6 Multi-Chain Support

**Status:** ViemBlockchainAdapter supports chain configuration, but only BSC is actively deployed and tested.

**Target:** V3.0+

### 2.7 Mobile Application

**Status:** Not started. Web application is responsive but not optimized as a mobile app.

**Target:** Post-mainnet

### 2.8 Institutional APIs

**Status:** Not started. REST/GraphQL APIs for institutional integration are not implemented.

**Target:** Post-mainnet

---

## 3. Future Production Work

These items are required for mainnet production readiness and are explicitly deferred.

| Item | Priority | Target Milestone | Notes |
|------|----------|-----------------|-------|
| Containerization (Docker) | High | Pre-production | Required for reproducible deployments |
| CI/CD pipeline implementation | High | Pre-production | Required for automated releases |
| Database adapters | High | Pre-production | Required for data persistence |
| Production monitoring & alerting | High | Pre-production | Real-time operations |
| Load testing & performance validation | High | Pre-production | Verify PERFORMANCE_TARGETS.md |
| Security penetration testing | High | Pre-production | Third-party audit |
| Treasury multisig deployment | Critical | Mainnet | Required for fund safety |
| Mainnet smart contract deployment | Critical | Mainnet | Production contract addresses |
| On-chain governance contracts | Medium | V3.0 | Decentralized governance |
| Multi-chain expansion | Low | V3.0+ | Additional blockchain networks |
| Mobile applications | Low | Post-mainnet | iOS/Android native apps |
| Institutional APIs | Low | Post-mainnet | REST/GraphQL endpoints |

---

## 4. Limitations Not Applicable

The following potential concerns have been verified as **not** applicable to this release:

| Concern | Verdict | Evidence |
|---------|---------|----------|
| Burn accounting convention | ✅ Fixed V2.14.2 | All journals balanced, debit=increase convention verified |
| Buyback accounting convention | ✅ Fixed V2.14.2 | Convention verified and fixed |
| AI ReDoS vulnerability | ✅ Fixed V2.14.2 | Pattern/input length bounds + safe compilation |
| Architecture boundary violations | ✅ V1.9 frozen | No cross-package boundary violations |
| Event envelope inconsistency | ✅ All packages conform | Universal `RelckoEventEnvelope` usage verified |
| Missing composition roots | ✅ All packages | All 28 packages have composition roots |
| Untested packages | ✅ All packages tested | 698 tests across all packages |
