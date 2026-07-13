# Operations Guide

## Owner Functions

### Stage Management

```solidity
// Add a new stage (starts inactive)
function addStage(price, supply, minPerUser, maxPerUser)

// Activate a stage (deactivates previous)
function activateStage(stageId)

// Update a stage's parameters (only before sold > new supply)
function updateStage(stageId, price, supply, minPerUser, maxPerUser)
```

**Pricing convention:** All prices are in USDT with 18 decimals.  
Example: `price = 1.15 * 1e18 = 1_150_000_000_000_000_000` means 1 RLKO = $1.15.

### Fund Withdrawal

```solidity
// Withdraw USDT or BNB (any time)
function withdrawFunds(tokenAddress)

// Withdraw unsold RLKO (only when NO stage is active)
function withdrawSaleTokens(amount)
```

### Emergency Controls

```solidity
// Pause all purchases (instant)
function pause()

// Resume purchases
function unpause()

// Override Chainlink oracle rate (set to 0 to use oracle again)
function setNativeToUsdtRate(rate)
```

## Purchase Flow

### USDT
1. User approves `PaymentManager` to spend USDT
2. User calls `buyWithToken(usdtAddress, amount)`
3. Contract calculates tokens = `amount / tokenPrice`
4. Contract transfers USDT from user
5. Contract records contribution

### BNB
1. User sends BNB via `buyWithNative{value: amount}()`
2. Contract converts BNB→USDT via Chainlink oracle
3. Same token calculation as USDT path

## Monitoring

### Key Metrics
- `tokenPrice()` — current token price in USDT
- `tokensRemaining()` — supply left in active stage
- `totalRaised()` — USDT raised so far
- `stageCount()` — total stages configured

### Alerts
- Monitor for `StageInactive` errors (stage may have completed)
- Monitor for `OracleUnavailable` errors (Chainlink feed issue)
- Monitor for `StaleOracleData` errors (feed not updated in 2h)

## Maintenance

- **Oracle override**: If Chainlink BNB/USD feed goes down, use `setNativeToUsdtRate()` with a manual rate. Set back to 0 when feed recovers.
- **Stage completion**: When a stage sells out, activate the next stage.
- **Pause**: Use in emergencies only — blocks all purchases.
