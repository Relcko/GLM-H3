# Math Import Fix — RC15.3

## Summary

Fixed two pre-existing build failures:

1. `PresalePurchasePanel.tsx` imported `estimateRate` and `estimateTokensForQuote`
   from `@/lib/presale/math` — neither function existed.
2. `PresalePurchasePanel.tsx` referenced `CHAIN_IDS.ethereum` — no such key in
   the `CHAIN_IDS` constant (supports only `bsc`, `bscTestnet`, `polygon`).

## Root Cause

The two math functions were never implemented in `lib/presale/math.ts`. Per the
comment in `lib/presale/services/reads.ts` (line 7-8), math.ts is the home for
*"optimistic UI estimates while a read is in flight."* The functions needed to
be added there, not refactored elsewhere.

The `CHAIN_IDS.ethereum` reference was a stale entry left over before Ethereum
support was removed from the supported chains list.

## Files Changed

### `lib/presale/math.ts` — Added two functions

| Function | Line | Formula | Purpose |
|---|---|---|---|
| `estimateRate()` | 28-30 | `1e18 / Number(FALLBACK_TOKEN_PRICE)` | Returns tokens per 1 USDT (e.g., ~0.87 RLKO) |
| `estimateTokensForQuote(amount)` | 33-35 | `(amount * 1e18) / Number(FALLBACK_TOKEN_PRICE)` | Returns token count for a payment amount |

A `FALLBACK_TOKEN_PRICE` constant (line 25) is set to `1.15 USDT per RLKO`
matching the testnet deployment value (`deployments/testnet.json` stagePrice).

### `components/presale/PresalePurchasePanel.tsx` — Removed stale key

| Line | Before | After |
|------|--------|-------|
| 55 | `[CHAIN_IDS.ethereum]: "Ethereum",` | *(removed)* |

## Existing Exports in `lib/presale/math.ts` (unchanged)

| Export | Type | Purpose |
|--------|------|---------|
| `formatCountdown` | function | Re-exported from `@/lib/blockchain/format` |
| `PRESALE_START` | number | Presale Unix timestamp |
| `PRESALE_DURATION` | number | 95 days in seconds |
| `TOTAL_STAGES` | number | 95 |
| `elapsedSeconds()` | function | Seconds since presale start |
| `presaleProgress()` | function | 0-1 progress ratio |
| `estimateStage()` | function | Current stage index (0-95) |

## Verification

```
npm run build  →  ✓ Compiled successfully (19.9s)
                 ✓ TypeScript passed (8.5s)
                 ✓ All static pages generated
```

No contracts, wallet hooks, or purchase logic were modified.
