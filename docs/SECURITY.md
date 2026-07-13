# Security Analysis & Threat Model

## Threat Model

### Assets
- **RLKO tokens** in the contract (`SALE_TOKEN` balance)
- **USDT** collected from buyers
- **BNB** collected from buyers
- **Stage configuration** (prices, supplies, limits)

### Trust Assumptions
1. **Owner is trusted** — can set prices, activate stages, withdraw funds, pause, set oracle override
2. **Chainlink oracle is reliable** — price feed returns accurate BNB/USD data within 2 hours
3. **USDT is the canonical stablecoin** — no other ERC20 is accepted

### Threat Scenarios

#### T1: Owner extracts excess value
- **Risk**: Owner could set price to 0, add unlimited supply, or manipulate stage parameters to extract value.
- **Mitigation**: Owner is a single trusted address. On mainnet, consider a multisig or timelock. The contract does not prevent owner from draining funds — this is by design.
- **Severity**: Low (trusted owner model)

#### T2: Oracle manipulation
- **Risk**: Attacker manipulates BNB/USD price feed to buy tokens at a discount.
- **Mitigation**: Chainlink price feed is decentralized. Staleness check (2h) prevents use of outdated data. Emergency override allows owner to bypass a compromised oracle.
- **Severity**: Low

#### T3: Oracle failure (revert or stale)
- **Risk**: Chainlink feed reverts or returns stale data, blocking all BNB purchases.
- **Mitigation**: `try/catch` catches revert → `OracleUnavailable` error. Owner can set override rate.
- **Severity**: Medium (temporary DOS)

#### T4: Reentrancy
- **Risk**: Malicious token calls back into PaymentManager during purchase.
- **Mitigation**: OpenZeppelin `ReentrancyGuard` on both purchase functions. CEI pattern followed.
- **Severity**: Low

#### T5: USDT callback / non-standard ERC20
- **Risk**: USDT may use `safeTransferFrom` which calls `safeTransfer`. No known callback risk.
- **Mitigation**: OpenZeppelin `SafeERC20` handles non-standard ERC20 tokens. USDT on BSC is standard ERC20.
- **Severity**: Low

#### T6: Overselling across stages
- **Risk**: Multiple stages could sell more tokens than the total supply.
- **Mitigation**: Each stage has its own supply cap. Total allocation is tracked. No cross-stage supply enforcement — if the same token is sold in multiple stages, total could exceed actual balance. Owner must ensure `SUM(stage.supply) <= actual RLKO balance`.
- **Severity**: Medium (owner responsibility)

#### T7: Stale price from Chainlink
- **Risk**: Oracle returns stale price (price not updated within 2 hours), allowing underpriced BNB purchases.
- **Mitigation**: `block.timestamp - updatedAt > 7200` → revert. Round validation: `answeredInRound >= roundId`.
- **Severity**: Low

#### T8: receive() bypasses nonReentrant
- **Risk**: `receive()` calls `_buyWithNative()` directly without `nonReentrant`.
- **Mitigation**: `receive()` is the entry point — there is no reentrancy path within it. The function only modifies state once.
- **Severity**: Low

## Security Checklist

| Check | Status | Notes |
|-------|--------|-------|
| Reentrancy protection | ✅ | ReentrancyGuard on both purchase functions |
| Integer overflow protection | ✅ | Solidity 0.8.x built-in; `unchecked` where safe |
| Zero address checks | ✅ | Constructor validates all 3 addresses |
| Oracle validation | ✅ | Positive price, round completion, freshness |
| Ownership restrictions | ✅ | Ownable; `onlyOwner` on admin functions |
| Pause/unpause | ✅ | Pausable; owner only |
| Withdraw restrictions | ✅ | Only owner; sale tokens only when no active stage |
| Stage transition safety | ✅ | Deactivates previous on activation |
| Overselling prevention | ✅ | Per-stage supply cap |
| User limits | ✅ | Per-user min/max per stage |
| Decimal correctness | ✅ | 18-decimal USDT and token amounts; 8-decimal oracle |
| Unsupported token rejection | ✅ | Only USDT accepted |
| CEI pattern | ✅ | All purchase functions follow CEI |
