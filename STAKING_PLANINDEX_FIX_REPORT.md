# Staking PlanIndex Fix Report — RC14.4

## Root Cause

The contract `stake(uint256 amount, uint256 planIndex)` expects a 0-based `planIndex` (0–6), but the frontend was sending the plan's `durationDays` value (30–1460). Every call reverted at `require(planIndex < _plans.length)`.

## Changes Made

### File: `components/staking/StakePanel/index.tsx`

#### 1. Plan index resolution (lines 100–101)

Added computation of `planIndex` from the selected plan:
```typescript
const planIndex = STAKING_PLANS.findIndex(
  (p) => p.durationDays === selectedPlan.durationDays
);
const isPlanValid = planIndex !== -1;
```

#### 2. Fixed stake() args (line 111)

Before:
```typescript
args: [rawAmount, BigInt(selectedPlan.durationDays)],
```
After:
```typescript
args: [rawAmount, BigInt(planIndex)],
```

#### 3. Invalid plan guard (line 105, 273–277)

The `handleStake` callback exits early if `planIndex === -1`. A warning message is shown in the UI:
> "Invalid staking plan."

#### 4. Insufficient balance guard (line 102, 256, 291–295)

Added `isOverBalance` check:
```typescript
const isOverBalance = balance !== undefined && rawAmount > balance;
```

The Stake button is disabled when `isOverBalance` is true. A warning message is shown:
> "Insufficient RLKO balance."

## Verification

| Check | Result |
|---|---|
| `npm run build` | ✅ Compiled successfully (18.1s) |
| TypeScript | ✅ No errors (8.3s) |
| Static pages | ✅ All generated |

## Mapping Table

| Selected Plan | `durationDays` | `planIndex` (now) | Contract accepts |
|---|---|---|---|
| 30 Days | 30 | **0** | `_plans[0]` = 30 days ✅ |
| 3 Months | 90 | **1** | `_plans[1]` = 90 days ✅ |
| 6 Months | 180 | **2** | `_plans[2]` = 180 days ✅ |
| 1 Year | 365 | **3** | `_plans[3]` = 365 days ✅ |
| 2 Years | 730 | **4** | `_plans[4]` = 730 days ✅ |
| 3 Years | 1095 | **5** | `_plans[5]` = 1095 days ✅ |
| 4 Years | 1460 | **6** | `_plans[6]` = 1460 days ✅ |
