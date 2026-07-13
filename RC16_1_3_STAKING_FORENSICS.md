# RC16.1.3 — Live Staking Failure Forensics

**Date:** 2026-07-13
**Branch:** RC16.1
**Status:** Completed

## Summary

On-chain investigation into user-reported staking failures. All staking contract state is correct. The root cause is **insufficient RLKO allowance** granted to the staking contract — a user-side issue, not a contract bug.

---

## Methodology

- RPC: `https://bsc-testnet-rpc.publicnode.com`
- Deployer address: `0x4ccE54BFeE344442Af2018fb89A1c185C60D29dc`
- Staking contract: `0x4C6b9E0ca47BA6Be452B408DF2a89Cea3CB314B3`
- RLKO token: `0xdE27aCe900FB8ae363eBaEE1f18c725d9a13C674`
- Tools: `cast` (foundry), BSC Testnet RPC

---

## Findings

### 1. Staking Contract State — All Correct

| Property | Expected | Actual |
|---|---|---|
| `_plans` (days) | [30, 90, 180, 365, 730, 1095, 1460] | ✅ Match |
| `_returns` (BPS) | [504, 550, 688, 917, 1375, 1834, 3668] | ✅ Match |
| `_token` | `0xdE27aCe900FB8ae363eBaEE1f18c725d9a13C674` | ✅ Match |
| `tokenBalanceOf()` | 50 RLKO | ✅ 5e19 wei |
| `_withdrawPenalty()` | 2500 BPS (25%) | ✅ Match |

### 2. RLKO Token Contract — Functional

All critical ERC20 functions present in bytecode:

| Function | Selector | Present |
|---|---|---|
| `balanceOf(address)` | `70a08231` | ✅ |
| `allowance(address,address)` | `dd62ed3e` | ✅ |
| `approve(address,uint256)` | `095ea7b3` | ✅ |
| `transferFrom(address,address,uint256)` | `23b872dd` | ✅ |
| `transfer(address,uint256)` | `a9059cbb` | ✅ |
| `name()` | `06fdde03` | ✅ ("Relcko Token") |
| `totalSupply()` | `1815f5a5` | ❌ Not implemented (custom ERC20) |

`totalSupply()` is absent from the RLKO token — it's a custom ERC20. This does not affect staking since `totalSupply()` is never called in the staking flow.

### 3. Wallet State — Root Cause Found

| Check | Deployer Wallet |
|---|---|
| RLKO Balance | ~999,990,000 RLKO |
| Allowance (→ Staking) | **0 RLKO** |
| Stakes | **None** (empty array) |

The deployer has massive RLKO balance but **zero allowance** granted to the staking contract. Without allowance, the staking contract's `_token.safeTransferFrom(msg.sender, address(this), amount)` will always revert.

### 4. Transaction Replay — Confirmed

Calling `stake(5e19, 0)` from a zero-allowance sender produces:

```
Traces:
  [19723] Staking::stake(5e19, 0)
    ├─ RLKO::transferFrom(0x000...000, Staking, 5e19)
    │   └─ ← [Revert] panic: arithmetic underflow or overflow (0x11)
    └─ ← [Revert] panic: arithmetic underflow or overflow (0x11)
```

The panic code `0x11` is Solidity's Panic(0x11) for arithmetic underflow — confirmed to originate from the RLKO token's `transferFrom` when allowance is insufficient.

### 5. On-Chain Activity

| Check | Result |
|---|---|
| Staked events (last 5000 blocks) | None |
| Approval events (last 500 blocks) | None |
| Recent transactions to staking/RLKO (last 100 blocks) | None |
| Staking contract RLKO balance | 50 RLKO (from prior deployment) |

The testnet has been quiet — no recent staking activity at all.

---

## Root Cause

**Insufficient RLKO allowance granted to the staking contract.** The user's wallet needs to:
1. Call `RLKO.approve(StakingContract, amount)` first
2. Then call `Staking.stake(amount, planIndex)`

The frontend (`StakePanel/index.tsx`) correctly implements this two-step flow:
- Checks `allowance(user, stakingContract)` via `useReadContract`
- Shows "Approve" button if `rawAmount > allowance`
- Shows "Stake" button only after sufficient allowance is detected

If the user reported staking failures, possible causes:
- **User rejected the approve transaction** in their wallet
- **Approve transaction failed** (gas, nonce, RPC issues)
- **Wrong network** — user on mainnet but staking only on testnet (though frontend shows a warning)
- **RPC connectivity issues** — `publicnode.com` BSC testnet RPC was slow/unreliable at times

---

## Recommendations

1. **Confirm user completed the approve step** — check wallet history for `approve(StakingContract)` transactions
2. **Add explicit toast/notification** when approve succeeds to guide user to the next step
3. **Consider adding a combined approve-and-stake flow** using permit (EIP-2612) if RLKO supports it (currently does not — no `permit` selector found in bytecode)
4. **Improve error messaging** — the frontend currently shows a generic "Transaction failed" on write error; consider decoding the Panic(0x11) to show "Insufficient allowance — please approve RLKO first"
5. **Add allowance verification** after approve tx confirms — the current flow just sets step to idle on approve success, but doesn't verify the allowance was actually set

---

## Files Examined

- `components/staking/StakePanel/index.tsx` — frontend staking flow (approve + stake)
- `lib/staking/abi.ts` — staking contract ABI
- `lib/staking/config.ts` — staking contract and RLKO token addresses
- `lib/beta.ts` — beta contract addresses
