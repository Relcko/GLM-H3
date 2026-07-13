# PaymentManager Architecture

## Overview

PaymentManager is a Solidity smart contract that manages a multi-stage token presale on BNB Smart Chain. It supports purchases in USDT (ERC20) and BNB (native), with automatic BNB→USDT conversion via a Chainlink price feed.

## Contract Diagram

```
┌─────────────────────────────────────────────────────┐
│  PaymentManager                                      │
│  (Ownable, ReentrancyGuard, Pausable)                │
├─────────────────────────────────────────────────────┤
│  immutables:                                         │
│    SALE_TOKEN (RLKO)                                 │
│    USDT                                              │
│    BNB_USD_FEED (Chainlink oracle)                   │
├─────────────────────────────────────────────────────┤
│  storage:                                            │
│    stages[] → Stage struct array                     │
│    currentStageIndex                                 │
│    userContributions[user][stage]                    │
│    totalRaised / totalTokensSold / totalAllocation   │
│    _nativeRateOverride                               │
├─────────────────────────────────────────────────────┤
│  external:                                           │
│    addStage / activateStage / updateStage            │
│    buyWithToken / buyWithNative / receive            │
│    withdrawFunds / withdrawSaleTokens                │
│    pause / unpause                                   │
│    currentStage / tokenPrice / tokensRemaining       │
│    userInvestment / currentStageInfo                 │
│    previewPurchase / nativeRateOverride / stageCount │
└─────────────────────────────────────────────────────┘
```

## Key Design Decisions

### Stage-Based Pricing
- Each stage has its own `price` (USDT per token, 18 decimals), `supply`, and per-user limits.
- Only one stage is active at a time.
- Stage switching deactivates the previous stage.

### Two Payment Paths
1. **USDT** (`buyWithToken`): Payment amount is the USDT value. Tokens = `paymentAmount / price`.
2. **BNB** (`buyWithNative`): BNB is converted to USDT via the Chainlink oracle → tokens calculated same way.

### Checks-Effects-Interactions (CEI)
All state-changing functions follow CEI:
1. Validate inputs and conditions
2. Update state
3. Perform external calls

### Oracle Safety
- 2-hour staleness threshold for Chainlink data
- Emergency owner override rate
- Zero/negative price rejection

## Security Properties

| Property | Mechanism |
|----------|-----------|
| Reentrancy | OpenZeppelin ReentrancyGuard |
| Pause | OpenZeppelin Pausable (owner only) |
| Access control | OpenZeppelin Ownable |
| Over-selling | Supply cap enforcement per stage |
| User limits | Min/max contribution per user per stage |
| Oracle failure | Try/catch with override rate fallback |
| Withdraw safety | Only owner; sale tokens only when no active stage |

## Dependencies

- OpenZeppelin Contracts (v5.x): Ownable, ReentrancyGuard, Pausable, SafeERC20
- Chainlink AggregatorV3Interface: BNB/USD price feed
- Foundry forge-std: Test utilities
