# Buy Console Layout Report

## Objective
Refactor the Buy RLKO panel into a premium sticky investment console on desktop (≥1280px). Move non-console sidebar widgets into the main content area so the sidebar is dedicated to the sticky panel only.

## Changes Applied

### 1. `components/dashboard/GridLayout.tsx` – Column span rebalance
| Component | Before | After |
|-----------|--------|-------|
| `GridMain` | `xl:col-span-8` | `xl:col-span-7` |
| `GridSidebar` | `xl:col-span-4` | `xl:col-span-5` |

The sidebar gets 5/12 columns (~523px at 1280px viewport) to accommodate the 420–460px console target width.

### 2. `app/presale/page.tsx` – Sidebar deduplication
- **Before**: `GridSidebar` contained `StickyBuyConsole`, `WalletHealth`, `InvestorStats`
- **After**: `GridSidebar` contains only `StickyBuyConsole`. `WalletHealth` and `InvestorStats` moved into `GridMain` below `TransactionTimeline`, wrapped in a 2‑column grid (`<div className="grid gap-6 xl:grid-cols-2">`) — side-by-side on desktop, stacked on mobile.

### 3. `components/dashboard/StickyBuyConsole.tsx` – Width constraints
Added `xl:min-w-[420px]` and `xl:max-w-[460px]` to the wrapper for consistent sizing across desktop screens. Sticky positioning (`xl:sticky xl:top-24`) is preserved and now works correctly because the sidebar contains only one child element — the sticky padding space is no longer fractured by sibling widgets.

## Responsive Behavior
| Breakpoint | Layout | Console Placement |
|-----------|--------|-------------------|
| <1280px (`<xl`) | Single‑column stack | Below WalletHealth + InvestorStats (which sit below timeline) |
| ≥1280px (`xl+`) | Two‑column grid (7/5) | Sticky in right sidebar at `top-24` below navbar, 420–460px wide |

## Verification
- `npx tsc --noEmit` — zero errors
- `npm run build` — passes (Turbopack, static generation)
- No blockchain logic, ABI, contract, routing, or animation code was touched
- All motions (`framer-motion`), hooks (`useBalance`, etc.), and imports remain unchanged
