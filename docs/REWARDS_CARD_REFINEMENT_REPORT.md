# Rewards Card Refinement Report

## Objective
Promote "Claimable Rewards" from the portfolio KPI row into a dedicated full-width premium rewards card. Keep the top KPI row focused on portfolio metrics only.

## Changes Applied

### 1. `components/dashboard/PortfolioKPI.tsx` – KPI row refocused
- **Removed**: `Claimable Rewards` KPI card (was line 213–223)
- **Replaced with**: `Active Stakes` KPI card — counts active stakes where `!claimed && !emergencyWithdraw`
- **Removed**: `useEffect` / `useState` for `now` timestamp (no longer needed for claimable computation)
- **Simplified**: `useMemo` now returns `{ stakedAmount, activeStakes }` instead of `{ stakedAmount, claimableRewards }`
- KPI row now shows: **Wallet Balance · Total Staked · Active Stakes · Total Invested**

### 2. `components/dashboard/RewardsCard.tsx` – New premium component
Self-contained rewards card placed directly below the KPI row:

| Element | Details |
|---------|---------|
| **Header** | "Claimable Rewards" with accent line |
| **Amount** | Large RLKO figure (`text-success`, 3xl–4xl) with token ticker |
| **USD value** | Approximate USDT value (shown when `> 0`) |
| **Helper text** | Contextual: rewards-ready vs. stake-prompt |
| **CTA button** | "Claim Rewards" (enabled, glowing green when `> 0`) or "No Rewards Available" (disabled, muted) — scrolls to `#staking` section on click |
| **Timestamp** | Relative "Updated X ago" (live via 1s interval) |
| **Empty state** | Connect wallet prompt with icon |

Data fetching:
- `useReadContract(STAKING_ABI.getStakesOfUser)` — same hook as PortfolioKPI (wagmi query cache, no duplicate network request)
- `useTokenPrice(DEFAULT_CHAIN_ID)` — for USD conversion
- Claimable computation: sum of `(totalReturn - amount)` for stakes where `!claimed && !emergencyWithdraw && maturesOn < now`
- 10-second refresh for maturity timestamps

Styling:
- `dashboard-card` wrapper with glassmorphism, cyan accents, matte black background
- Success green for rewards amount and enabled CTA
- Cyan accent line header matching dashboard convention
- Responsive flex layout (stack on mobile, side-by-side on desktop)

### 3. `app/presale/page.tsx` – Layout insertion
- Added import for `RewardsCard` (line 11)
- Inserted `<RewardsCard />` directly after `<PortfolioKPI />` (line 111), before `<InvestorActivity />`

## Verification
- `npx tsc --noEmit` — zero errors
- `npm run build` — passes (Turbopack, static generation)
- No staking logic, hooks, contracts, ABI, or blockchain interactions were modified
- No animation/motion code was modified
