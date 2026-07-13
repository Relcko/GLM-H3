# Staking Transaction End-to-End Audit

> **Note:** On-chain verification (transaction decoding, event emission, contract state reads) requires a transaction hash, wallet address, and RPC endpoint — none of which were provided. This report covers the **complete code-path audit** from smart contract ABI → wagmi hooks → React queries → UI rendering, and identifies the exact points where a chain/UI mismatch **would and could** occur.

---

## 1. Transaction Input Decoding

### Expected `stake()` call

From `components/staking/StakePanel/index.tsx:100-109`:

```
writeContract({
  address: stakingContract,      // 0x720aAe676854f99B4e48C553Ebd7bd15D9a611cB
  abi: STAKING_ABI,
  functionName: "stake",
  args: [rawAmount, BigInt(selectedPlan.durationDays)],
})
```

Encoded function selector: `0xc21d2050` (keccak256 of `stake(uint256,uint256)` first 4 bytes)

Arguments (ABI-encoded):
1. `uint256 amount` — user's stake amount in wei (18 decimals)
2. `uint256 plan` — duration in days (e.g., 30, 90, 180, 365, 730, 1095, 1460)

### Other possible state-changing calls

| Call | Function Selector | Args | Source File | Line |
|------|-------------------|------|-------------|------|
| `approve(address,uint256)` | `0x095ea7b3` | spender=stakingContract, amount=rawAmount | `StakePanel/index.tsx` | 92-98 |
| `claim(uint256)` | `0x379607f5` | index | `ActiveStakes/index.tsx` | 123-128 |
| `emergencyWithdraw(uint256)` | `0x959b1fc8` | index | `ActiveStakes/index.tsx` | 138-143 |

### Events expected on each call

| Action | Contract | Expected Event |
|--------|----------|----------------|
| `approve()` | RLKO Token (ERC20) | `Approval(owner, spender, value)` |
| `stake()` | Staking | `Transfer(buyer, stakingContract, amount)` + `Staked(user, amount, planDays)` (or equivalent internal event) |
| `claim()` | Staking | `Transfer(stakingContract, buyer, reward)` + `Claimed(user, index, amount)` |
| `emergencyWithdraw()` | Staking | `Transfer(stakingContract, buyer, amount)` + `EmergencyWithdraw(user, index, amount)` |

The ABI (`lib/staking/abi.ts`) does **not** define any events — neither `event Staked`, `event Claimed`, nor `event EmergencyWithdraw`. If the Solidity contract emits these, wagmi will still decode them (the `Logs` data is available via the transaction receipt), but the typed hooks won't surface them directly.

---

## 2. Complete Data Flow (Contract → UI)

```
┌─────────────────────────────────────────────────────────────┐
│                    SMART CONTRACT                            │
│  Staking.getStakesOfUser(user)          Staking.stake()      │
│  ERC20.balanceOf(user)                  ERC20.approve()      │
│  ERC20.allowance(user, staking)                              │
└────────────────────────┬────────────────────────────────────┘
                         │   RPC
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    WAGMI / VIEM                              │
│  useReadContract(hash: {address, abi, fn, args, chainId})    │
│  useWriteContract()                                          │
│  useWaitForTransactionReceipt({hash: writeHash})             │
└────────────────────────┬────────────────────────────────────┘
                         │   React Query cache
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              TANSTACK REACT QUERY                            │
│  queryKey = auto-generated from (address, abi, fn, args)     │
│  staleTime: 0 (default) → refetch on mount/window focus      │
│  gcTime: 5 minutes (default)                                 │
└────────────────────────┬────────────────────────────────────┘
                         │   data prop
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              REACT COMPONENTS                                │
│                                                              │
│  PortfolioSummary  ─── balanceOf, getStakesOfUser            │
│  RewardsSummary    ─── balanceOf, getStakesOfUser            │
│  ActiveStakes      ─── getStakesOfUser                       │
│  StakePanel        ─── balanceOf, allowance                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Duplicate & Overlapping Queries

There are **7 `useReadContract` calls** across the codebase, representing only **2 unique on-chain queries**:

| On-chain call | # of callers | Components |
|---------------|:-----------:|------------|
| `ERC20.balanceOf(user)` | **3** | StakePanel, PortfolioSummary, RewardsSummary |
| `getStakesOfUser(user)` | **3** | ActiveStakes, PortfolioSummary, RewardsSummary |
| `ERC20.allowance(user, staking)` | **1** | StakePanel |

With default wagmi caching (same query key = same cache entry), these should hit the cache after the first fetch. However, if `staleTime: 0` (the default), each component mount triggers a new RPC request. These are fast (cached by the RPC), but redundant.

---

## 4. Cache Invalidation — The Critical Path

### What happens after a successful `stake()`:

1. **`useWaitForTransactionReceipt`** detects `isSuccess === true`
2. **`StakePanel/index.tsx:73`** calls **`queryClient.invalidateQueries()`** with **no arguments**
3. This invalidates **every query in the entire React Query cache** (presale, staking, wallet balances, everything)

### Breakdown of which queries are affected:

| Query | Auto-refetches after invalidation? | Why/Why not |
|-------|:----------------------------------:|-------------|
| `StakePanel.balanceOf` | ✅ Yes | Component is mounted, reads data |
| `StakePanel.allowance` | ✅ Yes | Component is mounted, reads data |
| `ActiveStakes.getStakesOfUser` | ✅ Yes | Component is mounted, reads data |
| `PortfolioSummary.balanceOf` | ✅ Yes | Component is likely mounted on same page |
| `PortfolioSummary.getStakesOfUser` | ✅ Yes | Component is likely mounted |
| `RewardsSummary.balanceOf` | ✅ Yes | Component is likely mounted |
| `RewardsSummary.getStakesOfUser` | ✅ Yes | Component is likely mounted |

### The invalidation chain for each success scenario:

#### A. Successful `stake()` (StakePanel)
```
isTxSuccess=true, step="staking"
  → queryClient.invalidateQueries()        // invalidates ALL
  → setStep("idle")
  → setAmount("")
  → ALL useReadContract hooks auto-refetch on next render
  → ActiveStakes.getStakesOfUser() reads new stake
  → PortfolioSummary/RewardsSummary re-read balances + stakes
```

#### B. Successful `approve()` (StakePanel)
```
isTxSuccess=true, step="approving"
  → setStep("idle")                         // NO invalidation!
  → allowance is stale until:
    - Component re-mounts
    - Window refocus triggers refetch
    - Manual refetch via refetchInterval
```

**This is a potential issue:** After approve succeeds but before stake is submitted, the `allowance` query is stale. The `needsApproval` check (`rawAmount > allowance`) might still show "needs approval" if the user doesn't trigger a refetch. However, in the normal flow, the auto-buy effect in the presale panel fires immediately after approve, so this window is brief. For the staking flow, the user must click "Stake" manually after approve, and the stale allowance might briefly show the wrong button label. **Not a critical bug** — wagmi defaults to `refetchOnWindowFocus: true`, so a click outside + back would fix it.

#### C. Successful `claim()` (ActiveStakes)
```
isTxSuccess=true, claimingIndex !== null
  → queryClient.invalidateQueries()        // invalidates ALL
  → setClaimingIndex(null)
  → ALL components re-fetch
```

#### D. Successful `emergencyWithdraw()` (ActiveStakes)
```
isTxSuccess=true, withdrawingIndex !== null
  → queryClient.invalidateQueries()        // invalidates ALL
  → setWithdrawingIndex(null)
  → ALL components re-fetch
```

---

## 5. Would the UI Show Stale Data?

### Scenario: Chain state is correct but UI is wrong

Working backward from a hypothetical stale-UI bug report:

| If the UI shows... | The likely cause is... | Fix |
|---|---|---|
| Wrong RLKO balance | `balanceOf` not refetched (useReadContract has stale data) | `queryClient.invalidateQueries()` runs, so this should NOT be stale. Check if the component has been unmounted (e.g., tab change). |
| Wrong stake list | `getStakesOfUser` not refetched | Same as above — invalidation runs. If the component was unmounted during the tx flow and re-mounted after, it would fetch fresh data. |
| Wrong allowance still showing "Approve" | Approve success has NO invalidation (StakePanel line 77-79) | Add `queryClient.invalidateQueries()` after approve success, or rely on wagmi's `refetchOnWindowFocus` |
| Wrong claimable rewards | Maturity calculation uses `Date.now()` + the `now` state is updated every 1s | Check the interval. If it's not running, rewards won't update until page refresh. |

### The #1 suspect if chain is correct but UI is wrong:

**The `allowance` query not invalidating after approve.** Add this to `StakePanel/index.tsx:78`:

```typescript
if (isTxSuccess && step === "approving") {
  queryClient.invalidateQueries();  // ← MISSING
  setStep("idle");
}
```

---

## 6. Loading & Error States

**None of the 7 `useReadContract` calls destructure `isLoading`, `isError`, or `error`.**

| Component | Handles `isLoading`? | Handles `isError`? |
|-----------|:--------------------:|:------------------:|
| `StakePanel` | ❌ | ❌ |
| `ActiveStakes` | ❌ | ❌ |
| `PortfolioSummary` | ❌ | ❌ |
| `RewardsSummary` | ❌ | ❌ |

If the RPC is down or the user is on the wrong network, all staking UI components silently show zeros/empty arrays. Users would see "No active stakes" or "0 RLKO" rather than an error message.

---

## 7. Security Observations

1. **Same staking contract for mainnet and testnet** (`lib/staking/config.ts:5-6`): Both `CHAIN_IDS.bsc` (56) and `CHAIN_IDS.bscTestnet` (97) point to `0x720aAe676854f99B4e48C553Ebd7bd15D9a611cB`. If this address is testnet-only, mainnet staking would send funds to the wrong (or non-existent) contract. **Verify this address is deployed on BSC mainnet before production.**

2. **`rawAmount = BigInt(Math.floor(numericAmount * 1e18))`** in `StakePanel/index.tsx:56`: For amounts up to ~9,007,199 RLKO, `Number` precision is safe. Beyond that, `Math.floor` loses precision. This is acceptable given the tokenomics (max allocation is 200,000 RLKO).

3. **Broad `invalidateQueries()`**: Invalidating every query on every stake/claim/withdraw is safe but inefficient. A targeted invalidation like `invalidateQueries({ queryKey: [queryKeyForStakes] })` would be better.

---

## 8. Dead Code / Unused Functions

| File | Function | Lines | Status |
|------|----------|-------|--------|
| `lib/staking/math.ts` | ALL 6 exports | 1-42 | **Dead code** — not imported anywhere |
| `lib/staking/config.ts` | `TOKEN_DECIMALS` | 16 | **Unused** |
| `lib/staking/config.ts` | `getPlanByDuration` | 45-47 | **Unused** |
| `lib/staking/types.ts` | `StakeInfo` | 1-11 | Only referenced by `math.ts` (dead) |
| `lib/staking/abi.ts` | `getAllPlans` | 27-36 | **Unused** |
| `lib/staking/abi.ts` | `stakes` (individual) | 59-82 | **Unused** (components use `getStakesOfUser` batch read) |
| `lib/staking/abi.ts` | `_plans`, `_returns`, `tokenBalanceOf` | 84-117 | **Unused** |
| `ActiveStakes/index.tsx` | `refetch` (destructured) | 59 | **Never called** (only `invalidateQueries` is used) |
| `StakePanel/index.tsx` | `DEFAULT_CHAIN_ID` import | 13 | **Imported but unused** |

---

## 9. Verification Checklist (for On-Chain Auditor)

If you have the transaction hash and RPC access, run these checks:

```solidity
// 1. Read staking contract state
staking.totalStaked()
staking.activeStakeCount(buyer)
staking.stakes(buyer, index)      // per-index; not used by UI
staking.pendingRewards(buyer)     // not defined in ABI; use getStakesOfUser

// 2. Read RLKO balances
ERC20.balanceOf(buyer)
ERC20.balanceOf(stakingContract)
ERC20.allowance(buyer, stakingContract)

// 3. Compare with UI values
// Total staked = Σ stakes[i].amount for buyer
// Claimable = Σ (stakes[i].totalReturn - stakes[i].amount) where !claimed && !emergencyWithdraw && maturesOn < now
// Portfolio value = balanceOf(buyer) + Σ stakes[i].totalReturn

// 4. Verify transfer
// Before stake:  ERC20.balanceOf(buyer) = X
// After stake:   ERC20.balanceOf(buyer) = X - amount
//                ERC20.balanceOf(stakingContract) = prev + amount
```

### If chain state is correct but UI is wrong:

1. **Check `queryClient.invalidateQueries()` is firing** — add a console.log in the `useEffect` that detects `isTxSuccess`
2. **Check component mount state** — if a component was unmounted during the transaction and re-mounted, it should auto-fetch. If it never re-mounted, it won't.
3. **Check wagmi `staleTime`** — default is 0 (immediate refetch on mount/focus). If someone configured `staleTime > 0` in the QueryClient provider, data could be stale.
4. **Check for `refetchInterval`** — the app's wagmi config at `lib/blockchain/client.ts` may have global query defaults. Read that file to confirm.
