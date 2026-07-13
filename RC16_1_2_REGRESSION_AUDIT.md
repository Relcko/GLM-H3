# RC16.1.2 — Regression Audit

## Scope
Audit all files touched by the RC16.1 restoration for regressions in:
- Presale Purchase Panel preview calculation
- Staking Panel functionality

No code was modified during this audit (read-only).

---

## Files Examined

| Category | Files |
|----------|-------|
| Presale UI | `components/presale/PresalePurchasePanel.tsx` |
| Staking UI | `components/staking/StakePanel/index.tsx`, `ActiveStakes/index.tsx`, `Portfolio/index.tsx`, `PortfolioSummary/index.tsx`, `RewardsSummary/index.tsx` |
| Config | `lib/presale/config.ts`, `lib/staking/config.ts`, `lib/blockchain/chains.ts` |
| ABI | `lib/presale/abi.ts`, `lib/staking/abi.ts`, `lib/blockchain/erc20.ts` |
| Math | `lib/presale/math.ts` |
| Reads | `lib/presale/services/reads.ts` |
| Wallet hooks | `lib/presale/wallet.tsx`, `lib/blockchain/wallet.tsx` |
| Contract | `contracts/PaymentManager.sol`, `contracts/Staking.sol` |
| Deployment | `script/DeployStaking.s.sol`, `deployments/testnet.json` |
| Page | `app/presale/page.tsx` |
| Beta | `lib/beta.ts` |

---

## Regression 1 — BNB/RLKO Preview Calculation

**Files**: `lib/presale/math.ts` (lines 25-53), `components/presale/PresalePurchasePanel.tsx` (lines 34, 328-338)

**Cause**: `estimateRate()` and `estimateTokensForQuote()` used only `FALLBACK_TOKEN_PRICE` (1.15 USDT/RLKO) and completely ignored the BNB/USD exchange rate. The formula was:

```
// RC15.3 formula (wrong):
tokenAmount = paymentAmount / FALLBACK_TOKEN_PRICE
```

This implicitly assumes `1 BNB = 1 USDT`, producing:

| Input       | Old output        | Correct output  |
|-------------|-------------------|-----------------|
| 0.02 tBNB   | ≈ 0.02 RLKO       | ≈ 10 RLKO       |
| 1 tBNB      | ≈ 0.87 RLKO       | ≈ 504 RLKO      |

**On-chain formula** (from `PaymentManager.sol` lines 496-517, 591-593):
```
usdtAmount    = nativeAmount * bnbUsdPrice / 1e8          // _nativeToUsdt
tokenAmount   = usdtAmount * 1e18 / price                 // _calculateTokenAmount
// Combined: (nativeAmount * bnbUsdPrice * 1e10) / price
```

**Status**: Fixed in RC16.1.2. The primary source is now `usePreviewPurchase()` (identical on-chain `previewPurchase()` call), with `math.ts` as emergency fallback.

**Required fix (already applied)**: Replace hardcoded estimate with on-chain `previewPurchase` read. Update `math.ts` fallbacks to include BNB/USD price.

---

## Regression 2 — DEFAULT_CHAIN_ID Switch

**File**: `lib/blockchain/chains.ts` (line 12)

**Change**: `DEFAULT_CHAIN_ID` changed from `CHAIN_IDS.bsc` (56, mainnet) → `CHAIN_IDS.bscTestnet` (97, testnet).

**Downstream impact**:

| Component | What broke | Why |
|-----------|-----------|-----|
| `PresalePurchasePanel.tsx` line 109 | Wrong-network warning shown on testnet | Was checking `isBSC = chainId === CHAIN_IDS.bsc` (56) |
| `PresalePurchasePanel.tsx` line 445 | Buy form hidden on testnet | Same `isBSC` guard |

**Status**: Fixed in RC16.1.1. Switched to `isDefaultChain = chainId === DEFAULT_CHAIN_ID`.

**Required fix (already applied)**: Replace `isBSC` checks with `isDefaultChain` checks.

---

## Staking — No Code Regression Found

### RC14.4 fix verified preserved (planIndex not durationDays)

**StakePanel line 100-101**:
```ts
const planIndex = STAKING_PLANS.findIndex((p) => p.durationDays === selectedPlan.durationDays);
// ...
args: [rawAmount, BigInt(planIndex)],
```

Correctly passes the plan array index (0-6), not the duration days value. Confirmed against `Staking.sol` line 53:
```solidity
function stake(uint256 amount, uint256 planIndex) external {
    require(planIndex < _plans.length, "invalid plan");
```

### Address verification

| Entity | Expected (deployments/testnet.json) | Config source | Match |
|--------|--------------------------------------|---------------|-------|
| Staking contract (testnet) | `0x4C6b9E0ca47BA6Be452B408DF2a89Cea3CB314B3` | `lib/staking/config.ts` line 5 | ✓ |
| RLKO token (testnet) | `0xdE27aCe900FB8ae363eBaEE1f18c725d9a13C674` | `lib/beta.ts` line 13 → `lib/staking/config.ts` line 10 | ✓ |
| PaymentManager (testnet) | `0x7226E9d67B93DEd05C0D2595E7a5d9022b1Af106` | `lib/presale/config.ts` line 18 | ✓ |

### ABI verification (stake function)

| Property | Contract (`Staking.sol` line 53) | ABI (`lib/staking/abi.ts` lines 2-11) | Match |
|----------|-----------------------------------|---------------------------------------|-------|
| Function | `stake(uint256 amount, uint256 planIndex)` | `stake(amount: uint256, plan: uint256)` | ✓ |
| Args | `(amount, planIndex)` | `[rawAmount, BigInt(planIndex)]` | ✓ |
| Mutability | `external` | `nonpayable` | ✓ |
| Action | `_token.safeTransferFrom` + push to `_stakes` | Approval via `ERC20_ABI` `approve` | ✓ |

### Chain ID verification

**StakePanel line 32**:
```ts
const isBSC = chainId === CHAIN_IDS.bsc || chainId === CHAIN_IDS.bscTestnet;
```

Allows both mainnet (56) and testnet (97). ✓

### Import path verification

| Import | Resolves to | Status |
|--------|-------------|--------|
| `@/lib/blockchain/wallet` | `lib/blockchain/wallet.tsx` — exports `useAccount`, `useReadContract`, etc. from wagmi | ✓ |
| `@/lib/staking/abi` | `lib/staking/abi.ts` — `STAKING_ABI` with full stake/claim/getAllPlans | ✓ |
| `@/lib/staking/config` | `lib/staking/config.ts` — `STAKING_PLANS`, `getStakingContract`, `getRlkoToken` | ✓ |
| `@/lib/blockchain/erc20` | `lib/blockchain/erc20.ts` — `ERC20_ABI` with `allowance`/`approve`/`balanceOf` | ✓ |
| `@/lib/presale/config` | `lib/presale/config.ts` — `SALE_META`, `DEFAULT_CHAIN_ID` | ✓ |
| `@/lib/blockchain/chains` | `lib/blockchain/chains.ts` — `CHAIN_IDS` | ✓ |
| `@/lib/analytics` | `lib/analytics.ts` — `trackEvent` | ✓ |
| `@/lib/blockchain/txHistory` | `lib/blockchain/txHistory.ts` — `saveTxEntry` | ✓ |
| `@rainbow-me/rainbowkit` | `useConnectModal` (available in v2.2.11) | ✓ |

### Sample Plan → Index mapping

| Plan label    | durationDays | planIndex | Contract `_plans[index]` | Match |
|---------------|-------------|-----------|--------------------------|-------|
| 30 Days       | 30          | 0         | 30                       | ✓ |
| 3 Months      | 90          | 1         | 90                       | ✓ |
| 6 Months      | 180         | 2         | 180                      | ✓ |
| 1 Year        | 365         | 3         | 365                      | ✓ |
| 2 Years       | 730         | 4         | 730                      | ✓ |
| 3 Years       | 1095        | 5         | 1095                     | ✓ |
| 4 Years       | 1460        | 6         | 1460                     | ✓ |

Deployment script `script/DeployStaking.s.sol` lines 23-30 deploy plans in the same order as `STAKING_PLANS`.

### Possible runtime causes (not code regressions)

If staking was working after RC14.4 and is now failing, likely runtime causes:

1. **Staking contract state**: `paused`, `_token` balance depleted, or contract has no RLKO to transfer out.
2. **User wallet state**: Insufficient RLKO balance, or the approval allowance was reset/reduced.
3. **Network/RPC**: BSC Testnet RPC instability or stale data.
4. **Deployment mismatch**: If the staking contract was re-deployed with different constructor args (different plans) but the config was not updated — however, the deployment artifact confirms `0x4C6b9E0ca47BA6Be452B408DF2a89Cea3CB314B3` with `stakingToken` matching `rlko`.

---

## Summary

| # | Regression | File | Status |
|---|-----------|------|--------|
| 1 | Preview calculation ignores BNB/USD oracle | `lib/presale/math.ts` | **Fixed in RC16.1.2** |
| 2 | Wrong-network / buy-form on wrong chain after DEFAULT_CHAIN_ID change | `components/presale/PresalePurchasePanel.tsx` | **Fixed in RC16.1.1** |
| 3 | Staking — no code regression found | `components/staking/StakePanel/index.tsx` | See runtime causes above |

No contract files, wagmi hooks, or chain configurations were reverted — all RC14.4 state changes are preserved in RC16.1 code.
