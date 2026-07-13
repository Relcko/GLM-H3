# Purchase UX Report

## Files Changed

- `components/presale/PresalePurchasePanel.tsx` — all UI/UX improvements

## 1. Live Purchase Summary

Replaced the simple two-line estimate with a full Purchase Summary section showing:

| Field | Source | Description |
|---|---|---|
| **You Pay** | `numericAmount` + `selectedToken.symbol` | The raw amount + token the user entered |
| **≈ USD** | `preview[0]` (usdtAmount) | USD equivalent via contract's native-to-USDT conversion |
| **You Receive** | `preview[1]` (tokenAmount) | Estimated RLKO tokens from `usePreviewPurchase` |
| **Stage** | `usePresaleStage(chainId)` | Current bonding-curve stage (e.g. `3 / 95`) |
| **1 RLKO** | `useTokenPrice(chainId)` | Current token price in `displayPriceUnit` (USDT) |
| **Supply Remaining** | `useTokensRemaining(chainId)` | Tokens left in the current allocation |
| **Est. Gas** | Static estimate | `$0.30–$0.80` — fixed placeholder |

The summary is visible only when `txStage === "idle"` (no active transaction) and a valid amount is entered.

### Enhancement note: Dynamic gas estimation
The Gas line currently shows a static range. It could be made dynamic using:
- `useEstimateFeesPerGas({ chainId })` from wagmi for current gas prices
- `useSimulateContract` for per-transaction gas limit
- `nativeRateOverride` from the contract to convert native gas cost to USD

## 2. Dynamic Buy Button

Changed from static `"Buy RLKO"` to:

- **With estimate:** `"Buy 1,234.56 RLKO"` (shows the exact amount from `usePreviewPurchase`)
- **Without estimate (loading):** `"Buy RLKO"` (falls back gracefully)

The button is disabled when:
- Amount ≤ 0
- No presale contract on current chain
- Transaction in progress (`active`)
- Supply exhausted (`preview[3] === 0n`)
- Validation warnings exist (insufficient balance / exceeds supply)

## 3. Improved Wallet Info

Replaced the cramped 4-column grid (`grid-cols-2 sm:grid-cols-4`) with a spacious vertical layout:

- **Address** — full-width row with label + shortened address
- **Network** — full-width row with label + chain name
- **Balances** — 3-column grid: Native (BNB/tBNB/POL), USDT, **RLKO**

### RLKO Balance
Reads the user's RLKO token balance via `useReadContract` using the address from `getRlkoToken(chainId)` (defined in `lib/staking/config.ts`). Gracefully handles chains where the RLKO token address is unknown (read is disabled via `query.enabled`).

## 4. Validation UX

Inline warning banners appear below the amount input when:

| Condition | Message |
|---|---|
| USDT token balance < entered amount | `"Insufficient USDT balance"` |
| BNB/tBNB/POL balance < entered amount | `"Insufficient {symbol} balance"` |
| Estimated RLKO > remaining supply | `"Requested amount exceeds remaining supply"` |

These warnings also **disable the Buy button** to prevent failed on-chain transactions. The existing supply-exhausted banner (`preview[3] === 0n`) is preserved.

### Min/max purchase notes
The ABI does not expose `minPurchase` / `maxPurchase` per-stage functions. If per-stage limits are added to the contract in the future, they could be surfaced here using additional `useReadContract` calls with the same pattern.

## 5. New Hooks Added

| Hook | Purpose |
|---|---|
| `usePresaleStage(chainId)` | Current stage number |
| `useTokensRemaining(chainId)` | Remaining supply in allocation |
| `useReadContract` (ERC20 balanceOf) | RLKO token balance for connected wallet |
| `getRlkoToken(chainId)` | RLKO token address from staking config |

## Build Status

- **TypeScript:** `npx tsc --noEmit` — zero errors
- **Lint:** `npx eslint components/presale/PresalePurchasePanel.tsx` — zero errors (1 pre-existing warning: useEffect deps)
