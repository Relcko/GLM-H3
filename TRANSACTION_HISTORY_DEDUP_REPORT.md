# Transaction History Deduplication Report

## Problem

React warning: *"Encountered two children with the same key"* in `TransactionTimeline.tsx`.

Root cause: `saveTxEntry()` in `lib/blockchain/txHistory.ts` pushed every entry unconditionally via `txs.unshift(entry)`, allowing duplicate transaction hashes to be stored. Since the timeline component renders `key={tx.hash}`, duplicate hashes produced duplicate React keys.

## Changes Made

### 1. `lib/blockchain/txHistory.ts` — Deduplication guard in `saveTxEntry`

**Line 19:** Added `if (!txs.some((tx) => tx.hash === entry.hash))` before inserting. If an entry with the same hash already exists in sessionStorage, the new entry is silently skipped.

### 2. `lib/blockchain/txHistory.ts` — Deduplication cleanup in `getTxHistory`

**Lines 31–39:** Added a `Set<string>` pass that filters out duplicate hashes (keeping the first/most-recent occurrence). If duplicates were found and removed, the cleaned array is persisted back to sessionStorage so existing corrupted data is repaired on next load.

### 3. No changes to components — `key={tx.hash}` preserved

- `TransactionTimeline.tsx:143` — already uses `key={tx.hash}`
- `TransactionHistory.tsx:105` — already uses `key={tx.hash}`

No index-based keys were introduced.

## Audit of every `saveTxEntry()` call site

| File | Line | Trigger condition | Saves on approve? | Saves in auto-buy? | Only on buy success? |
|------|------|-------------------|:-:|:-:|:-:|
| `PresalePurchasePanel.tsx` | 196 | `txStage === "complete"` **AND** `flowPhase !== "approving"` | No (early return on L194) | No (auto-buy effect on L180 only calls `writeBuy`, never `saveTxEntry`) | Yes |
| `StakePanel/index.tsx` | 65 | `isTxSuccess && step === "staking"` | N/A (approve path on L77 skips save) | N/A | Yes |
| `ActiveStakes/index.tsx` | 86 | `isTxSuccess && claimingIndex !== null` | N/A | N/A | Yes |
| `ActiveStakes/index.tsx` | 102 | `isTxSuccess && withdrawingIndex !== null` | N/A | N/A | Yes |

**Conclusion:** Every call site already guards against saving on approve. No `saveTxEntry` call exists inside any auto-buy effect. All saves fire only after the actual action (buy/stake/claim/withdraw) confirms on-chain.

## Build Result

```
✓ Compiled successfully in 17.5s
  Running TypeScript ...
  Finished TypeScript in 9.2s ...
  Collecting page data using 7 workers ...
  Generating static pages using 7 workers (6/6) in 727ms
```

No TypeScript errors, no lint warnings, build passes cleanly.

## Summary

Two defensive layers were added to `lib/blockchain/txHistory.ts`:

1. **Write guard** — skip `saveTxEntry` if the hash already exists in storage.
2. **Read cleanup** — deduplicate by hash when reading, and persist the cleaned array to fix any existing corrupted data.
