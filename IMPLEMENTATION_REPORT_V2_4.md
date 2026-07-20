# Investment Engine V2.4.0 — Implementation Report

## Package

**`@relcko/investment-engine`** — `packages/investment-engine/src/`

A new domain package that owns the complete investment lifecycle, bridging the frozen Marketplace Backend to blockchain settlement.

---

## Packages & Dependencies

| Dependency | Usage |
|---|---|
| `@relcko/domain-core` | Frozen entities: Investment, Ownership, Property, state machines |
| `@relcko/marketplace` | Marketplace domain (reused, not modified) |
| `@relcko/events` | Shared Event Bus, publish/subscribe |
| `@relcko/types` | Branded types: EntityId, Address, TxHash, Money, Currency |
| `@relcko/utils` | ID generation, money arithmetic |
| `@relcko/error` | Canonical error hierarchy |
| `@relcko/logging` | Logger interface |
| `@relcko/testing` | MockEventBus, test helpers |

**No new npm dependencies.**

---

## Services (22 files)

### Core

| File | Lines | Purpose |
|---|---|---|
| `orchestrator.ts` | 136 | InvestmentOrchestrator — composition root, wires all engines |
| `types.ts` | 178 | Enums (InvestmentTxStatus, PaymentMethod, SettlementStatus, RecoveryStatus, LedgerEntryType), interfaces (TransactionRecord, SettlementRecord, etc.) |
| `events.ts` | 63 | 28 canonical InvestmentEventType constants, publishInvestmentEvent() helper |
| `errors.ts` | 123 | 24 typed error classes extending InvestmentEngineError |
| `validation.ts` | 40 | Zod-style runtime validation for InvestmentRequest |
| `repository.ts` | 57 | InvestmentEngineRepository interface (data seam) |
| `in-memory-repository.ts` | 152 | InMemoryInvestmentEngineRepository (default adapter) |
| `index.ts` | 76 | Public API surface |

### Engine Modules

| File | Lines | Purpose |
|---|---|---|
| `eligibility/engine.ts` | 75 | EligibilityEngine — checks property status, supply, amount, min investment |
| `reservation/engine.ts` | 112 | ReservationEngine — creates time-limited reservations, wallet confirmation |
| `transaction/engine.ts` | 156 | TransactionEngine — create/submit/confirm/fail/cancel/retry/expire |
| `transaction/monitor.ts` | 82 | TransactionMonitor — polls chain for confirmations, handles timeouts |
| `settlement/orchestrator.ts` | 87 | SettlementOrchestrator — applies supply, triggers ownership + ledger |
| `ownership/allocator.ts` | 103 | OwnershipAllocator — reuses frozen computeAvgCostBasis, createOwnership |
| `ledger/adapter.ts` | 103 | LedgerAdapter — records investment/refund entries, optional Treasury integration |
| `recovery/engine.ts` | 135 | RecoveryEngine — transaction recovery with reorg detection |
| `history/service.ts` | 47 | InvestmentHistoryService — append-only event log per investment |
| `portfolio/adapter.ts` | 86 | PortfolioAdapter — read-model snapshots, no UI |

### Blockchain Layer

| File | Lines | Purpose |
|---|---|---|
| `blockchain/chains.ts` | 78 | Chain configs (BSC mainnet/testnet, Polygon), token configs (USDT, USDC, RLKO) |
| `blockchain/adapter.ts` | 117 | BlockchainAdapter interface + ViemBlockchainAdapter (production stub) |

### Security

| File | Lines | Purpose |
|---|---|---|
| `security/guard.ts` | 58 | SecurityGuard — replay protection, double-submit prevention, chain verification, signature verification, confirmation verification |

---

## Transaction Flow

```
InvestmentRequest
  → SecurityGuard.checkDoubleSubmit()
  → SecurityGuard.verifyChain()
  → EligibilityEngine.check()
  → EligibilityEngine.assertAndPublish()     [event: eligibility_passed/failed]
  → ReservationEngine.create()               [event: reserved]
  → ReservationEngine.confirmWallet()        [event: wallet_confirmed]
  → TransactionEngine.createTransaction()    [event: transaction_submitted]
  → TransactionMonitor.monitorTransaction()  [polls chain]
  → TransactionEngine.confirmTransaction()   [event: transaction_confirmed]
  → SettlementOrchestrator.settle()          [event: settlement_started]
    → OwnershipAllocator.allocate()          [event: ownership_allocated, ownership_snapshot_generated]
    → LedgerAdapter.recordInvestment()       [event: ledger_recorded]
  → [event: settlement_completed]
  → [event: investment_completed]
  → PortfolioAdapter.updatePortfolio()       [event: portfolio_updated]
  → InvestmentHistoryService.record()
```

## Blockchain Flow

```
1. Client selects chain (BSC 56, BSC Testnet 97, Polygon 137)
2. Client selects payment method: Native Token or ERC-20 (USDT, USDC, RLKO)
3. WalletConnect / MetaMask / Coinbase Wallet signature verification
4. Transaction submitted to chain via wagmi/viem adapter
5. TransactionMonitor polls getTransactionReceipt + confirmations
6. On required confirmations: mark confirmed, proceed to settlement
7. On timeout: retry (up to maxRetries), then expire or recover
```

## Ownership Flow

```
1. Settlement triggers OwnershipAllocator.allocate()
2. Checks existing ownership for (investorId, propertyId)
3. First investment: createOwnership() from frozen domain-core
4. Subsequent: computeAvgCostBasis() weighted average, increase quantity
5. Save ownership snapshot (append-only for provenance)
6. Publish ownership_allocated + ownership_snapshot_generated events
```

## Events Published (28 canonical)

| Event | When |
|---|---|
| `investment.requested` | Investment request received |
| `investment.eligibility_passed` | Eligibility check passed |
| `investment.eligibility_failed` | Eligibility check failed |
| `investment.reserved` | Reservation created |
| `investment.reservation_expired` | Reservation timed out |
| `investment.reservation_cancelled` | Reservation cancelled |
| `investment.wallet_confirmed` | Wallet address confirmed |
| `investment.transaction_submitted` | Transaction submitted to chain |
| `investment.transaction_confirmed` | Transaction confirmed on chain |
| `investment.transaction_failed` | Transaction reverted/failed |
| `investment.transaction_cancelled` | Transaction cancelled |
| `investment.transaction_expired` | Transaction timed out |
| `investment.transaction_recovered` | Transaction recovered |
| `investment.transaction_retried` | Transaction retried |
| `investment.settlement_started` | Settlement initiated |
| `investment.settlement_completed` | Settlement completed |
| `investment.ownership_allocated` | Ownership created/updated |
| `investment.ownership_updated` | Ownership modified |
| `investment.ownership_snapshot_generated` | Snapshot saved |
| `investment.ledger_recorded` | Ledger entry recorded |
| `investment.recovery_started` | Recovery workflow started |
| `investment.recovery_resolved` | Recovery resolved |
| `investment.recovery_failed` | Recovery failed |
| `investment.portfolio_updated` | Portfolio snapshot recomputed |
| `investment.completed` | Full investment lifecycle completed |
| `investment.audit_logged` | Audit entry appended |

## Security

- **Replay protection**: Event IDs tracked in repository; duplicate events rejected with `ReplayError`
- **Double-submit prevention**: Idempotency keys enforced; `DoubleSubmitError` on repeat
- **Confirmation verification**: Required confirmations per chain config, polled via adapter
- **Chain verification**: Expected chain ID from property vs actual from request must match
- **Signature verification**: Adapter pattern for WalletConnect/SIWE signature validation

## Error Recovery

| Scenario | Handling |
|---|---|
| Chain timeout | TransactionMonitor detects timeout, triggers retry |
| RPC failure | Caught in monitor loop, retry on next poll |
| Dropped transaction | RecoveryEngine.startRecovery() |
| Replacement tx | Recovery detects new txHash |
| Reorg detection | Block number mismatch → RecoveryEngine |
| Retry policy | Configurable maxRetries (default 3), exponential backoff |
| Exhausted retries | Transaction expired, Recovery required |

## Tests — 71 tests, 13 files

| Test File | Tests | Coverage |
|---|---|---|
| `blockchain.test.ts` | 14 | Chain configs, token configs, adapter validation |
| `eligibility.test.ts` | 8 | All eligibility rules, event publication |
| `reservation.test.ts` | 7 | Create, conflict, expire, cancel, wallet confirm |
| `transaction.test.ts` | 10 | Create, submit, confirm, fail, cancel, expire, retry, exhaustion |
| `settlement.test.ts` | 2 | Settle confirmed tx, reject unconfirmed |
| `ownership.test.ts` | 4 | First allocation, increase, snapshots, list |
| `ledger.test.ts` | 3 | Record investment, refund, treasury integration |
| `recovery.test.ts` | 3 | Start recovery, attempt & resolve, duplicate prevention |
| `history.test.ts` | 2 | Record entry, list by investment |
| `portfolio.test.ts` | 4 | Build snapshot, empty portfolio, events, multiple holdings |
| `security.test.ts` | 6 | Replay, double-submit, chain verification, signature |
| `events.test.ts` | 3 | Event types, publication, source attribution |
| `integration.test.ts` | 5 | End-to-end flow, canonical events, dedup, chain mismatch, portfolio |

## Quality

- **TypeScript**: `strict: true`, `target: ES2022`, no `any` in production code
- **ESLint**: Passes clean (extends `next/core-web-vitals`)
- **Tests**: 71/71 passing, 51 test files (all existing + 13 new)
- **Regressions**: Zero — all 178 pre-existing tests continue to pass

## Known Issues

1. Blockchain adapter (`ViemBlockchainAdapter`) returns stub values — requires real viem client initialization with RPC URL from chain config
2. Treasury ledger integration is adapter-only — no Treasury implementation exists yet
3. Reservation cleanup is in-memory only — no background expiry sweep
4. Portfolio adapter is in-memory — no persistent storage for snapshots
5. Gas estimation and nonce management are not implemented in the adapter layer

## Remaining Milestones

1. **V2.4.1** — Real viem client with RPC integration, transaction simulation, gas estimation
2. **V2.4.2** — Frontend purchase panel integration (wallet selection, approval, submit)
3. **V2.4.3** — WebSocket-based transaction monitoring (replace polling)
4. **V2.4.4** — Multi-chain support expansion (Ethereum, Arbitrum, Optimism)
5. **V2.4.5** — Fiat payment adapter (on/off ramp)
6. **V2.5** — NFT Marketplace + Governance integration
