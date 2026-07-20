# RC20.3 — Quick Amount Chips Missing for Native Token (tBNB)

**Date:** 2026-07-14
**Component:** `components/presale/PresalePurchasePanel.tsx`
**Scope guard honored:** UI / spacing / typography / motion / business logic / purchase calculations unchanged. Only the balance source feeding the existing quick-amount chips was corrected. No duplicated JSX — the same chip component is reused for both payment methods.

---

## Root Cause

The quick-amount chips (25% / 50% / 75% / MAX) were gated on a **single** balance value:

```ts
{tokenBal !== undefined && !active && ( ... chips ... )}
```

`tokenBal` comes from `useTokenBalance(...)` (`lib/presale/services/reads.ts:75`), which wraps `useReadContract` with:

```ts
query: { enabled: !!tokenAddress && !!owner }
```

When the **native** payment token (tBNB, `address === null`) is selected, `tokenAddress` is `null`, so the query is **disabled** and `tokenBal` stays `undefined`. The chip block therefore never rendered for native.

Separately, the on-chain **native** balance was already being fetched:

```ts
const { data: nativeBal } = useBalance({ address });   // line 124
```

…but `nativeBal` was **never wired into the chips** — it was dead/unused. So the native path had no balance to drive the percentages, and the chips disappeared.

## Files Changed

| File | Change |
|---|---|
| `components/presale/PresalePurchasePanel.tsx` | Derived `activeBalance` / `activeDecimals` that select native balance when native, token balance otherwise; rewired the chip render condition + click handlers to use them. |

No other files touched.

## Logic Before

```ts
const { data: nativeBal } = useBalance({ address });          // fetched, never used
const { data: tokenBal }   = useTokenBalance(chainId, selectedToken?.address ?? null, address);

// chips visible ONLY when tokenBal !== undefined  → hidden for native
{tokenBal !== undefined && !active && (
  ... 25/50/75/MAX using formatUnits(tokenBal, selectedDecimals) ...
)}
```

## Logic After

```ts
const { data: nativeBal } = useBalance({ address });
const { data: tokenBal }   = useTokenBalance(chainId, selectedToken?.address ?? null, address);

const isNative = selectedToken?.address === null;

// Pick the balance of the CURRENTLY selected asset.
const activeBalance: bigint | undefined = isNative
  ? (nativeBal?.value ?? undefined)
  : (tokenBal as bigint | undefined);
const activeDecimals = isNative ? 18 : selectedDecimals;

// chips visible for BOTH methods once the selected asset's balance is known
{activeBalance !== undefined && !active && (
  ... 25/50/75/MAX using formatUnits(activeBalance, activeDecimals) ...
)}
```

- **USDT selected** → `activeBalance = tokenBal` (USDT balance, `selectedDecimals` = 18). Percentages computed from USDT balance.
- **Native (tBNB) selected** → `activeBalance = nativeBal.value` (BNB balance, 18 decimals). Percentages computed from native BNB balance.
- `MAX` uses the same `activeBalance` → correct max for the selected asset.
- Switching payment method recomputes `activeBalance` automatically; no layout or JSX change.

## Verification

### TypeScript & Build
- `tsc --noEmit` → ✅ pass (no errors).
- `npm run build` → ✅ pass (routes `/`, `/presale`, `/robots.txt`, `/sitemap.xml` static).
- Scoped lint `eslint components app lib` → 14 pre-existing benign warnings, **0 new**.

### Functional (logic review)
| Scenario | 25% | 50% | 75% | MAX | Calc source |
|---|---|---|---|---|---|
| USDT selected | ✅ | ✅ | ✅ | ✅ | `tokenBal` (USDT) |
| Native (tBNB) selected | ✅ | ✅ | ✅ | ✅ | `nativeBal.value` (BNB) |
| Switch USDT → Native | ✅ recomputes | ✅ | ✅ | ✅ | `activeBalance` switches |
| Switch Native → USDT | ✅ recomputes | ✅ | ✅ | ✅ | `activeBalance` switches |

- No layout regression — JSX structure, classes, and `grid grid-cols-4` unchanged.
- Same component reused for both methods (no duplicated JSX).
- Chips still hide during an active transaction (`!active`), preserving prior behavior.

### Notes
- `nativeBal` (wagmi `useBalance`) returns `value` as a `bigint` with 18 decimals — matches tBNB's `decimals`.
- The fix is symmetric and asset-agnostic: any future payment token (ERC-20 or native) will correctly drive the chips via `activeBalance`.
