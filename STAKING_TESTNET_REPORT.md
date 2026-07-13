# Staking Testnet Deployment Report

**Date:** July 2026
**Version:** RC9
**Network:** BNB Smart Chain Testnet (Chain ID: 97)

---

## Deployment

The staking contract is deployed on BSC Testnet and configured to accept the testnet RLKO token.

### Deployed Addresses

| Contract | Address | Status |
|---|---|---|
| Staking Contract | `0x720aAe676854f99B4e48C553Ebd7bd15D9a611cB` | Deployed |
| RLKO Token (Testnet) | `0x4359C08b48c2c9dAe6BFB14F08110d264F30A4e5` | Deployed (RC8) |
| MockUSDT | `0x701B81ea7F71a3c403cb53A6d465c37D96187E7f` | Deployed (RC8) |

### Deployment Procedure

1. Deploy staking contract with the testnet RLKO token address as constructor argument
2. Verify on BSCScan (testnet.bscscan.com)
3. Run `node tools/update-testnet-env.mjs` to sync addresses to frontend config

---

## Configuration

### Frontend Config (`lib/staking/config.ts`)

```typescript
export const STAKING_CONTRACT: Record<number, `0x${string}`> = {
  [CHAIN_IDS.bscTestnet]: "0x720aAe676854f99B4e48C553Ebd7bd15D9a611cB",
  [CHAIN_IDS.bsc]: "0x720aAe676854f99B4e48C553Ebd7bd15D9a611cB",
};

export const RLKO_TOKEN: Record<number, `0x${string}`> = {
  [CHAIN_IDS.bscTestnet]: "0x4359C08b48c2c9dAe6BFB14F08110d264F30A4e5",
  [CHAIN_IDS.bsc]: "0x7F408e0861717b9CD3Bbe3E13b65D5Ff18Cf32C1",
};
```

### Update Checklist

- [x] `lib/staking/config.ts` — STAKING_CONTRACT includes `bscTestnet` entry
- [x] `lib/staking/config.ts` — RLKO_TOKEN includes `bscTestnet` entry
- [x] `deployments/testnet.json` — Includes `staking` and `stakingToken` fields
- [x] `tools/update-testnet-env.mjs` — Syncs staking addresses post-deployment
- [x] `.env` — Supports `STAKING_CONTRACT` and `STAKING_RLKO` variables

---

## Reward Settings

| Plan | Duration | Return | Multiplier |
|---|---|---|---|
| 30 Days | 30 days | 5.04% | x1.1 |
| 3 Months | 90 days | 5.50% | x1.2 |
| 6 Months | 180 days | 6.88% | x1.5 |
| 1 Year | 365 days | 9.17% | x2 |
| 2 Years | 730 days | 13.75% | x3 |
| 3 Years | 1095 days | 18.34% | x4 |
| 4 Years | 1460 days | 36.68% | x8 |

### Penalty Configuration

- **Emergency Withdraw Penalty:** 25% (2500 bps) — defined as `WITHDRAW_PENALTY_BPS = 2500` in config
- Penalty only applies to early withdrawal; normal claim has no penalty
- Penalty deducted from staked amount (rewards are forfeited entirely)

---

## Test Results

### Stake Flow
| Test | Result |
|---|---|
| Stake with sufficient balance | Verified |
| Stake below minimum (50 RLKO) | Rejected with warning |
| Approve then stake | Verified |
| Multiple stakes from same wallet | Verified |

### Claim Flow
| Test | Result |
|---|---|
| Claim matured stake | Verified |
| Claim before maturity | Contract reverts |
| Claim already-claimed stake | Contract reverts |

### Emergency Withdraw Flow
| Test | Result |
|---|---|
| Emergency withdraw locked stake | Implemented |
| Emergency withdraw matured stake | Available |
| Penalty display in confirmation | Implemented |
| Early withdraw already-withdrawn stake | Contract reverts |

### UI States
| State | Status |
|---|---|
| Wallet not connected | Shows connect prompt |
| Wrong network (non-BSC) | Shows switch network message |
| Empty stakes | Shows empty state |
| Transaction pending | Shows spinner + status text |
| Transaction success | Shows success message |
| Transaction failed | Shows error message |
| Confirm withdraw dialog | Shows warning with penalty breakdown |

---

## Known Limitations

1. **Penalty is hardcoded** — `WITHDRAW_PENALTY_BPS = 2500` in config matches the on-chain `_withdrawPenalty()` return value. The UI does not read the penalty from the contract dynamically; update config if the contract penalty changes.
2. **No pause detection** — The UI does not check if the staking contract is paused. If paused, transactions will revert with a generic error.
3. **Testnet token supply** — The testnet RLKO token is a MockERC20. On mainnet, the real RLKO token at `0x7F408e0861717b9CD3Bbe3E13b65D5Ff18Cf32C1` will be used.
4. **Staking contract source** — The staking contract source code is not in this repository. The ABI in `lib/staking/abi.ts` is the single source of truth for the contract interface.
