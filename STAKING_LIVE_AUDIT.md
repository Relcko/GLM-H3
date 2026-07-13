# Staking Live Contract Audit — RC14.3

## Root Cause

**Transaction `0xd76a...` was sent to the OLD staking contract address (no bytecode), but even if it had reached the NEW contract, the `stake()` call would have reverted due to a `planIndex` vs `durationDays` mismatch.**

There are TWO distinct issues:

---

### Issue 1 — Wrong Target Address (transaction 0xd76a...)

| Field | Value |
|---|---|
| Transaction | `0xd76a766b44fa7698cae94063fa63933caf2d5e08f79cbbaead2e1d2113a3f559` |
| `to` field | `0x720aAe676854f99B4e48C553Ebd7bd15D9a611cB` |
| Matches NEW contract `0x4C6b9E...`? | ❌ **No** |
| Matches OLD contract `0x720aAe...`? | ✅ **Yes** |
| Status | `0x1` (success — no-op, no bytecode at target) |
| Logs | `[]` (empty — no code executed) |
| Gas used | `0x5618` (22040 — value transfer to EOA, no contract execution) |

This transaction was mined **before** the RC14.2 deployment. It called the old address which has no bytecode (confirmed: `eth_getCode` returned `0x`), so the EVM treated it as a no-op success.

---

### Issue 2 — planIndex / durationDays Mismatch (ACTIVE BUG)

Even if the same transaction were sent to the **new** staking contract, it would **revert**.

#### Frontend code (`components/staking/StakePanel/index.tsx:103-108`):

```typescript
writeContract({
  address: stakingContract,
  abi: STAKING_ABI,
  functionName: "stake",
  args: [rawAmount, BigInt(selectedPlan.durationDays)],  // ← BUG
});
```

The frontend passes `selectedPlan.durationDays` (e.g., `30`) as the second argument.

#### Contract code (`contracts/Staking.sol`):

```solidity
function stake(uint256 amount, uint256 planIndex) external {
    require(amount > 0, "amount zero");
    require(planIndex < _plans.length, "invalid plan");  // 30 < 7 → FALSE → REVERT
```

The contract treats the second argument as `planIndex` (0-based index into `_plans[]`).

#### What happens:

| Frontend sends | Contract expects | Result |
|---|---|---|
| `plan = 30` (days) | `planIndex = 0..6` | `require(30 < 7)` → **reverts** |

For every plan selection:
| Selected plan | `durationDays` | `planIndex` checked | Reverts? |
|---|---|---|---|
| 30 Days | 30 | `30 < 7` = false | ✅ Yes |
| 3 Months | 90 | `90 < 7` = false | ✅ Yes |
| 6 Months | 180 | `180 < 7` = false | ✅ Yes |
| 1 Year | 365 | `365 < 7` = false | ✅ Yes |
| 2 Years | 730 | `730 < 7` = false | ✅ Yes |
| 3 Years | 1095 | `1095 < 7` = false | ✅ Yes |
| 4 Years | 1460 | `1460 < 7` = false | ✅ Yes |

**Every single stake attempt would revert** with `"invalid plan"`.

---

### Contract State Verification (on-chain via RPC)

| Function | Result |
|---|---|
| `_token()` | `0xdE27aCe900FB8ae363eBaEE1f18c725d9a13C674` (RLKO) ✅ |
| `_withdrawPenalty()` | `2500` (25%) ✅ |
| `tokenBalanceOf()` | `0` (no RLKO deposited) |
| `getAllPlans()` | `[30,90,180,365,730,1095,1460]` / `[504,550,688,917,1375,1834,3668]` ✅ |
| `getStakesOfUser(buyer)` | `[]` (no stakes exist) |
| `owner()` | ❌ Does not exist in contract — reverts |
| `paused()` | ❌ Does not exist in contract — reverts |
| `totalStaked()` | ❌ Does not exist in contract — reverts |

### RLKO Token State (on-chain)

| Check | Result |
|---|---|
| `balanceOf(buyer)` | `50.212 RLKO` |
| `allowance(buyer → new staking)` | `50.21 RLKO` |
| `allowance(buyer → old staking)` | `50.21 RLKO` |
| Balance ≥ 50.3 RLKO? | ❌ No (50.212 < 50.3) |
| Allowance ≥ 50.3 RLKO? | ❌ No (50.21 < 50.3) |

### Address References in Repository

#### Old address `0x720aAe...` (3 files, all expected)

| File | Line | Reason |
|---|---|---|
| `lib/staking/config.ts` | 6 | Mainnet entry `[CHAIN_IDS.bsc]` — should stay |
| `.opencode/presale-staking-migration.md` | — | Historical documentation |
| `docs/AUDIT_SCOPE.md` | — | Historical documentation |

#### New address `0x4C6b9E...` (3 files, all correct)

| File | Line | Status |
|---|---|---|
| `lib/staking/config.ts` | 5 | `[CHAIN_IDS.bscTestnet]` ✅ |
| `deployments/testnet.json` | 18 | `"staking"` field ✅ |
| `.env` | — | `STAKING_CONTRACT` ✅ |

The frontend reads the contract address via `getStakingContract(chainId)` (`StakePanel/index.tsx:30`) which resolves from `STAKING_CONTRACT[chainId]` (`lib/staking/config.ts:37-39`). Since the testnet entry points to `0x4C6b9E...`, `useWriteContract` and `useReadContract` both use the **correct new address**.

---

## Summary

### What actually happened when the user staked:

1. User entered 50.3 RLKO and selected 30 Days plan
2. Frontend approved the **new staking contract** for 50.21 RLKO (succeeded)
3. Frontend then called `stake(50.3, 30)` — the `to` address was the **old contract** (had no bytecode — no-op success, no stake created)
4. The dashboard `saveTxEntry` saved a "Stake" history entry even though nothing happened on-chain

### What would happen NOW:

Since the config was updated in RC14.2, the frontend now sends transactions to `0x4C6b9E...`. But:
- `stake(amount, 30)` → `require(30 < 7)` → **reverts with "invalid plan"**
- No stake is created
- User sees "Transaction failed" in the UI

### Fix required:

Align the `plan` parameter interpretation between frontend and contract. Either:
- **Option A (recommended):** Change the frontend to pass the plan index:
  ```typescript
  args: [rawAmount, BigInt(STAKING_PLANS.findIndex(p => p.durationDays === selectedPlan.durationDays))]
  ```
- **Option B:** Change the contract to look up plans by duration instead of index:
  ```solidity
  function stake(uint256 amount, uint256 planDays) external { ... }
  ```
