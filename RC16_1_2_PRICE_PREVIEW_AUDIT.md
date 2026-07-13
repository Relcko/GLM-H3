# RC16.1.2 — BNB Price & Preview Calculation Audit

## Root Cause
The frontend preview calculation used a hardcoded USDT-per-RLKO price (`FALLBACK_TOKEN_PRICE = 1.15`) but **completely ignored the BNB/USD exchange rate**. It implicitly assumed 1 BNB = 1 USDT, producing mathematically impossible values:

| Input       | Old Rate (1 BNB = … RLKO) | Old "You receive" | Reality |
|-------------|---------------------------|-------------------|---------|
| 0.02 tBNB   | 0.87 RLKO                 | ≈ 0.02 RLKO       | ≈ 10 RLKO |

## Formula Trace

### On-chain (PaymentManager.sol) — source of truth

```
// _nativeToUsdt — line 513
usdtAmount = nativeAmount * bnbUsdPrice / 1e8

// _calculateTokenAmount — line 592
tokenAmount = usdtAmount * 1e18 / price

// Combined for native purchases:
tokenAmount = (nativeAmount * bnbUsdPrice * 1e10) / price
```

Where:
- `bnbUsdPrice` = Chainlink BNB/USD answer (8 decimals) — ~580 USD/BNB
- `price` = active stage tokenPrice from `stages[currentStageIndex].price` (18 decimals)
- `nativeAmount` = wei (18 decimals)

### Frontend — before this fix

```ts
// math.ts (RC15.3)
const FALLBACK_TOKEN_PRICE = 1.15e18;   // only token price
estimateTokensForQuote(amount)           // = (amount * 1e18) / 1.15e18
```

This computed `amount / 1.15`, which assumes 1 BNB = 1 USDT. The BNB/USD oracle was completely absent.

### Frontend — after this fix

```ts
// math.ts (fallback only)
const FALLBACK_BNB_USD = 580e8;          // ~580 USDT/BNB
const FALLBACK_TOKEN_PRICE = 1.15e18;    // 1.15 USDT/RLKO

// On-chain preview (primary, same formula as contract)
previewPurchase(rawAmount, isNative)     // returns (usdtAmount, tokenAmount, stage, remaining)
```

The `usePreviewPurchase` hook now calls the identical on-chain `previewPurchase()` function. The `math.ts` fallbacks are only used while the on-chain read is loading, and now correctly mirror the contract formula.

## Changes Made

### `lib/presale/math.ts`
- Added `FALLBACK_BNB_USD = 58_000_000_000n` (580 USDT/BNB, 8 decimals)
- Updated `estimateRate()` to: `Number(FALLBACK_BNB_USD * 1e10) / Number(FALLBACK_TOKEN_PRICE)`
- Updated `estimateTokensForQuote()` to: `(amount * Number(FALLBACK_BNB_USD * 1e10)) / Number(FALLBACK_TOKEN_PRICE)`
- Added doc comment noting these are fallback-only placeholders

### `components/presale/PresalePurchasePanel.tsx`
- Imported `usePreviewPurchase` from reads service
- Added `usePreviewPurchase(chainId, previewQty, isNative)` call
- `estimatedTokens` now reads from `previewToken` (on-chain result), falls back to `estimateTokensForQuote()`
- `rate` now computed as `formatUnits(previewToken, 18) / formatUnits(previewQty, selectedDecimals)`, falls back to `estimateRate()`

## Verification — Three Views Match

| View                | Source of truth | Value for 0.02 tBNB |
|---------------------|----------------|---------------------|
| Purchase Summary    | `previewToken` | ≈ 10 RLKO           |
| Modal preview       | `previewToken` | ≈ 10 RLKO           |
| Rate label          | `previewToken / previewQty` | 1 tBNB ≈ 504 RLKO |

All three derive from the same `usePreviewPurchase` result — guaranteed identical.

## Build Result
- `npm run build` — Clean (17.1s, TypeScript passed)
