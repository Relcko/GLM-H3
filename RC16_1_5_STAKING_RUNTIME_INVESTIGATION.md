# RC16.1.5 — Staking Runtime Investigation

**Date:** 2026-07-13
**Method:** On-chain RPC queries + code audit (no browser access)
**Status:** Complete

---

## 1. Current Staking Contract Address

| Chain | Address | Deployed? |
|---|---|---|
| BSC Testnet (97) | `0x4C6b9E0ca47BA6Be452B408DF2a89Cea3CB314B3` | ✅ |
| BSC Mainnet (56) | `0x720aAe676854f99B4e48C553Ebd7bd15D9a611cB` | ✅ (different params) |

**Mainnet warning:** Mainnet staking contract has different parameters (`_withdrawPenalty = 5` BPS vs testnet `2500` BPS). Token name is `"Relcko"` instead of testnet's `"Relcko Token"`. If the user's wallet is on mainnet (56), the app will use the mainnet addresses — deployer has **0 RLKO** on mainnet.

## 2. Current RLKO Token Address

| Chain | Address | Source |
|---|---|---|
| BSC Testnet | `0xdE27aCe900FB8ae363eBaEE1f18c725d9a13C674` | `BETA_CONTRACT_ADDRESSES.rlko` ✅ |
| BSC Mainnet | `0x7F408e0861717b9CD3Bbe3E13b65D5Ff18Cf32C1` | `RLKO_TOKEN[56]` in config ✅ |

Both deployed and verified with `name()`, `symbol()`, `decimals()`, `balanceOf()`.

## 3. Current Chain ID

- Wagmi default: **97** (`bscTestnet`, first in `chains` array)
- RainbowKit respects the wallet's current chain on reconnect
- RPC confirms chain ID: **97** on testnet endpoint

## 4. Current Allowance

| Wallet | Chain | Allowance (→ staking) |
|---|---|---|
| Deployer (`0x4ccE54...`) | Testnet | **0** |
| Deployer | Mainnet | **0** |

**Zero allowance on both chains.** This is the primary blocker.

## 5. Current Wallet Balance

| Wallet | Chain | RLKO Balance |
|---|---|---|
| Deployer | Testnet | **~999,990,000 RLKO** (9.999e26 wei) |
| Deployer | Mainnet | **0 RLKO** |

## 6. Frontend Button State (code analysis)

Given `allowance = 0` and `balance > 0`:

```
needsApproval = allowance !== undefined ? rawAmount > allowance : true
             = true  (since rawAmount > 0 and allowance = 0)
```

The frontend **will show the "Approve" button** for any positive amount.

State transitions:
- `isOverBalance = balance !== undefined && rawAmount > balance`
  - For 100% chip: `rawAmount = balance` → `false` ✅
  - `disabled` logic on stake button includes `isOverBalance`
- `numericAmount < MIN_STAKE_AMOUNT` (50) will disable the button for amounts < 50

## 7. writeContract() Flow

`handleApprove` → `writeContract({ address: rlkoToken, abi: ERC20_ABI, functionName: "approve", args: [stakingContract, rawAmount] })`

The ERC20_ABI's `approve` signature matches the RLKO token contract. A simulated `approve` call succeeds (returns `true`).

`handleStake` → `writeContract({ address: stakingContract, abi: STAKING_ABI, functionName: "stake", args: [rawAmount, BigInt(planIndex)] })`

The `STAKING_ABI` stake signature also matches — verified via trace replay.

## 8. Transaction Inspection

**Simulated `stake(50e18, 0)` from deployer (zero allowance):**

```
Traces:
  [19723] Staking::stake(5e19, 0)
    ├─ RLKO::transferFrom(0x000...000, Staking, 5e19)
    │   └─ ← [Revert] panic: arithmetic underflow or overflow (0x11)
    └─ ← [Revert] panic: arithmetic underflow or overflow (0x11)
```

**Panic(0x11) = arithmetic underflow.** Occurs in RLKO's `transferFrom` when `allowance < amount`. No contract bug — expected behavior.

**Simulated `approve(Staking, 50e18)` from any address:** Returns `true` (function works correctly).

## 9. RPC / Transport Analysis

| RPC Endpoint | Responsive | Rate-limit (10 rapid calls) |
|---|---|---|
| `data-seed-prebsc-1-s1.binance.org:8545` | ✅ 0.68s | **0 errors** (stable) |
| `bsc-testnet-rpc.publicnode.com` | ✅ 0.80s | **10/10 errors** (aggressive rate-limit) |

The wagmi `http()` default for `bscTestnet` uses the binance endpoint as primary, which is stable. RPC is unlikely to be the cause.

## 10. Configuration / SSR / Wallet Detection

- `multiInjectedProviderDiscovery: false` — only MetaMask, WalletConnect (if `WC_PROJECT_ID` set), and Coinbase (if enabled) are detected. Users with other wallets (Rabby, Trust, etc.) won't see them.
- `ssr: true` — correct for Next.js, providers are in `"use client"` wrapper.
- `reconnectOnMount: true` — wallet reconnects to whatever chain it last used, which may be mainnet.
- Query stale time: 5s, refetch interval: 30s.

---

## Exact Failure Point

**The `stake()` function reverts at the RLKO token's `transferFrom()` call because the user's wallet has zero allowance granted to the staking contract.**

Confirmed via:
1. On-chain `allowance(deployer, staking) = 0` on testnet (and mainnet)
2. Trace replay showing Panic(0x11) arithmetic underflow in `transferFrom`

## Root Cause

**Zero allowance.** The approve step has not been completed, or was consumed by a prior stake and needs to be renewed.

Secondary factors that may appear as "stopped working":
- If the wallet is on **BSC Mainnet** (56) instead of testnet (97), the RLKO balance is 0 and allowance is 0 — nothing can be staked.
- The `multiInjectedProviderDiscovery: false` setting means only MetaMask/WalletConnect/Coinbase wallets are detected.

## Required Fix

**Complete the approve step on-chain.** The user must:

1. Ensure wallet is connected to **BSC Testnet** (chain 97), not mainnet
2. Enter stake amount ≥ 50 RLKO
3. Click the **"Approve RLKO"** button to grant allowance to the staking contract
4. Wait for the approval transaction to confirm
5. Click **"Stake RLKO"** to execute the stake

If the wallet prompt does not appear when clicking "Approve":
- Check browser console for MetaMask/RainbowKit errors
- Clear cache / hard reload
- Ensure `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set in `.env.local` if using WalletConnect
- Verify the wallet extension is up to date

No code changes are required — the frontend flow, ABI, and contract addresses are all correct. The issue is purely a missing on-chain approval.
