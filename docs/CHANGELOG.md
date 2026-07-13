# Changelog

## v1.0.0 (Audit Preparation)

### Improvements

- **Extracted `AggregatorV3Interface`** to dedicated interface file under `interfaces/`.
- **Replaced magic numbers** with named constants (`ORACLE_STALENESS_THRESHOLD`, `ORACLE_DECIMALS`, `PRECISION_18`).
- **Applied Checks-Effects-Interactions** pattern to `buyWithToken` (moved external call after state updates).
- **Extracted token calculation** into reusable `_calculateTokenAmount()` internal function.
- **Extracted native purchase logic** into `_buyWithNative()` internal function, shared by `buyWithNative()` and `receive()`.
- **Fixed `receive()` function** to forward `msg.value` and preserve `msg.sender`.
- **Added comprehensive NatSpec** to all functions, events, errors, and state variables.
- **Added explicit `import` statements** using named imports.
- **Split events** across multiple lines for readability.

### Security

- ReentrancyGuard on all purchase functions (unchanged).
- CEI pattern enforced (new).
- Oracle staleness threshold as constant (unchanged but documented).
- Zero address validation in constructor (unchanged).

### Project Structure

```
contracts/
  PaymentManager.sol
  interfaces/
    IAggregatorV3Interface.sol
  mocks/
    MockERC20.sol
    MockAggregator.sol
  scripts/
    DeployPaymentManager.s.sol
test/
  PaymentManager.t.sol
docs/
  ARCHITECTURE.md
  SECURITY.md
  DEPLOYMENT.md
  OPERATIONS.md
  CHANGELOG.md
  AUDIT_SCOPE.md
```

### Tests

- All 51 existing tests pass.
- Fixed BNB tests to use `vm.deal()` (callers need ether).
- Fixed `testWithdrawSaleTokens_AfterSale` to create a fresh contract.
- Fixed `testStageCompletion_OversellingPrevention` min-per-user issue.
