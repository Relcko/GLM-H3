# Audit Scope

## In Scope

| File | Language | Lines | Purpose |
|------|----------|-------|---------|
| `contracts/PaymentManager.sol` | Solidity 0.8.28 | ~580 | Presale payment manager |
| `contracts/interfaces/IAggregatorV3Interface.sol` | Solidity 0.8.28 | 20 | Chainlink oracle interface |
| `test/PaymentManager.t.sol` | Solidity 0.8.28 | 619 | Test suite |

## Out of Scope

| File | Reason |
|------|--------|
| `contracts/mocks/MockERC20.sol` | Test mock, not for production |
| `contracts/mocks/MockAggregator.sol` | Test mock, not for production |
| `script/DeployPaymentManager.s.sol` | Deployment utility |
| External RLKO token contract | Deployed separately at `0x7F408e0861717b9CD3Bbe3E13b65D5Ff18Cf32C1` |
| External staking contract | Deployed separately at `0x720aAe676854f99B4e48C553Ebd7bd15D9a611cB` |
| Frontend code (Next.js) | Not part of the smart contract audit |

## Focus Areas

1. **Payment logic**: Correctness of token amount calculation for both USDT and BNB
2. **Oracle integration**: Safety of native→USDT conversion, staleness handling
3. **Stage management**: Stage transitions, supply tracking, overselling prevention
4. **Access control**: Owner privileges, pause mechanism
5. **Fund safety**: Withdrawal restrictions, reentrancy protection
6. **Integer arithmetic**: Overflow safety, decimal precision

## Known Limitations

1. The `receive()` function bypasses `nonReentrant` (uses internal path instead). This is safe because `receive()` has no reentrancy re-entry point.
2. No cross-stage supply enforcement exists. The owner must ensure `SUM(stage.supply) <= actual RLKO balance` across all stages.
3. The owner has full control over pricing, stages, and fund withdrawal (trusted model).
