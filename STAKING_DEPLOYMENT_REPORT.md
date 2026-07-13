# Staking Deployment Report — BSC Testnet

## Summary

Deployed the Staking contract to BSC Testnet (chainId 97) and integrated it with
the existing Relcko ecosystem. All configuration files have been updated.

## Deployment Details

| Field | Value |
|---|---|
| **Contract** | Staking |
| **Network** | BNB Smart Chain Testnet |
| **Chain ID** | 97 |
| **RPC** | `https://bsc-testnet-rpc.publicnode.com` |
| **New Contract Address** | `0x4C6b9E0ca47BA6Be452B408DF2a89Cea3CB314B3` |
| **Deployment Transaction** | `0xeb240c689cdb194b3193fe8ae01015a5aa0383826ee31987ec55f001e075d422` |
| **Block Number** | `0x7160a02` (118,884,866) |
| **Deployer** | `0x4ccE54BFeE344442Af2018fb89A1c185C60D29dc` |
| **Gas Used** | 2,084,203 |
| **Bytecode Size** | 7,322 bytes |
| **Compiled With** | Solc 0.8.28 via Foundry 1.7.1 |

## Bytecode Verification

```bash
cast call 0x4C6b9E0ca47BA6Be452B408DF2a89Cea3CB314B3 "_token()(address)"
# Returns: 0xdE27aCe900FB8ae363eBaEE1f18c725d9a13C674 (RLKO)

cast call 0x4C6b9E0ca47BA6Be452B408DF2a89Cea3CB314B3 "_withdrawPenalty()(uint256)"
# Returns: 2500 (25% penalty)

cast call 0x4C6b9E0ca47BA6Be452B408DF2a89Cea3CB314B3 "getAllPlans()(uint256[],uint256[])"
# Returns: [30, 90, 180, 365, 730, 1095, 1460], [504, 550, 688, 917, 1375, 1834, 3668]

cast call 0x4C6b9E0ca47BA6Be452B408DF2a89Cea3CB314B3 "tokenBalanceOf()(uint256)"
# Returns: 0 (no tokens deposited yet)
```

## Staking Plans Deployed

| Label | Duration (days) | Return (BPS) | Return (%) |
|---|---|---|---|
| 30 Days | 30 | 504 | 5.04% |
| 3 Months | 90 | 550 | 5.50% |
| 6 Months | 180 | 688 | 6.88% |
| 1 Year | 365 | 917 | 9.17% |
| 2 Years | 730 | 1375 | 13.75% |
| 3 Years | 1095 | 1834 | 18.34% |
| 4 Years | 1460 | 3668 | 36.68% |

Withdraw penalty: 2500 BPS (25%)

## Contract Source

`contracts/Staking.sol` — written to match the existing ABI in `lib/staking/abi.ts`.
Uses OpenZeppelin 5.6.1 (IERC20, SafeERC20).

## Updated Config Files

| File | Change |
|---|---|
| `contracts/Staking.sol` | New — staking contract source |
| `script/DeployStaking.s.sol` | New — deployment script |
| `script/BaseDeployScript.sol` | Added `staking` + `stakingToken` to Deployment struct |
| `deployments/testnet.json` | Added `staking`, `stakingToken` entries |
| `.env` | Added `STAKING_CONTRACT`, `STAKING_RLKO` |
| `lib/staking/config.ts` | `STAKING_CONTRACT[bscTestnet]` → new address |
| `lib/presale/config.ts` | No staking-related changes (unrelated USDT entry updated by post-deploy) |

No frontend logic was modified.

## Build Status

```
npm run build  →  ✓ Compiled successfully in 16.6s
                 ✓ TypeScript passed
                 ✓ All static pages generated
```

## Ecosystem Addresses (BSC Testnet)

| Contract | Address | Status |
|---|---|---|
| RLKO (MockERC20) | `0xdE27aCe900FB8ae363eBaEE1f18c725d9a13C674` | ✅ Deployed |
| MockUSDT | `0x701B81ea7F71a3c403cb53A6d465c37D96187E7f` | ✅ Deployed |
| PaymentManager | `0x7226E9d67B93DEd05C0D2595E7a5d9022b1Af106` | ✅ Deployed |
| **Staking** | **`0x4C6b9E0ca47BA6Be452B408DF2a89Cea3CB314B3`** | **✅ Deployed (new)** |
| Chainlink Feed | `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526` | ✅ Existing |
