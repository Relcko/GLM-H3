# Mainnet Preparation Checklist

**Version:** v1.0.0-beta.1 (RC10)
**Status:** ⏳ Pending — Not yet deployed to mainnet

---

## Contract Configuration

### Replace MockUSDT with Production USDT

| Environment | USDT Address | Status |
|---|---|---|
| Testnet | `0x701B81ea7F71a3c403cb53A6d465c37D96187E7f` (MockUSDT) | ✅ Active |
| Mainnet | `0x55d398326f99059ff775485246999027b3197955` (BSC USDT) | ⏳ Pending |

**Action:**
- [ ] Update `lib/presale/config.ts` — `PAYMENT_TOKENS[bsc]` USDT address already set to `0x55d398326f99059ff775485246999027b3197955`
- [ ] Confirm MockUSDT is NOT used in any mainnet deployment script
- [ ] Verify mainnet USDT has 18 decimals (matching testnet MockUSDT)

### Verify Presale Contract Addresses

| Contract | Testnet | Mainnet |
|---|---|---|
| PaymentManager | `0x6B2fa30F5a9aAB5cE78558F3c4EA9217eC21D431` | `0xc8cB05330aa1789bceEfC2AF4d3dEec7c7e4c339` |
| RLKO Token | `0x4359C08b48c2c9dAe6BFB14F08110d264F30A4e5` | `0x7F408e0861717b9CD3Bbe3E13b65D5Ff18Cf32C1` |
| Staking Contract | `0x720aAe676854f99B4e48C553Ebd7bd15D9a611cB` | `0x720aAe676854f99B4e48C553Ebd7bd15D9a611cB` |

**Action:**
- [ ] Verify mainnet PaymentManager address in `lib/presale/config.ts`
- [ ] Verify mainnet RLKO address in `lib/presale/config.ts` and `lib/staking/config.ts`
- [ ] Verify mainnet staking contract address in `lib/staking/config.ts`

---

## Treasury Verification

### Ownership Transfer

The PaymentManager contract uses Ownable2Step. After deployment:

- [ ] Deployer deploys PaymentManager
- [ ] Deployer initiates ownership transfer: `transferOwnership(treasuryAddress)`
- [ ] Treasury accepts ownership: `acceptOwnership()`
- [ ] Verify owner changed: `owner() == treasuryAddress`

### Treasury Address

| Network | Treasury | Status |
|---|---|---|
| Testnet | Deployer (not transferred — `TREASURY` was empty) | ⚠️ Owner = deployer |
| Mainnet | Multisig or secure cold wallet | ⏳ To be configured |

**Action:**
- [ ] Set `TREASURY` in `.env` to multisig address before mainnet deployment
- [ ] Verify `TREASURY` is non-zero in `.env`
- [ ] After deployment, verify `owner()` returns the treasury address
- [ ] Verify `withdrawFunds()` and `withdrawSaleTokens()` are accessible only by treasury

---

## Chainlink Feeds

### BNB/USD Price Feed

| Network | Feed Address | Staleness Threshold |
|---|---|---|
| Testnet | `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526` | 7200s (2 hours) |
| Mainnet | `0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE` | 7200s |

**Action:**
- [ ] Verify mainnet feed address in `.env` (`CHAINLINK_FEED`)
- [ ] Verify mainnet feed address in `lib/presale/config.ts`
- [ ] Test oracle round-trip: call `latestRoundData()` on mainnet feed
- [ ] Confirm feed returns non-stale data (updated within 2 hours)
- [ ] Document emergency override rate procedure

---

## Deployment Scripts

### Deployment Flow (Mainnet)

```bash
# 1. Deploy RLKO token (if not already deployed)
forge script script/DeployRLKO.s.sol \
  --rpc-url $BSC_MAINNET_RPC \
  --private-key $DEPLOYER_PK \
  --verify --broadcast --slow \
  -vvv

# 2. Deploy PaymentManager
forge script script/DeployPaymentManager.s.sol \
  --rpc-url $BSC_MAINNET_RPC \
  --private-key $DEPLOYER_PK \
  --verify --broadcast --slow \
  -vvv

# 3. Fund PaymentManager with presale RLKO supply
# (manual token transfer)

# 4. Configure and activate Stage 1
forge script script/ConfigureStage1.s.sol \
  --rpc-url $BSC_MAINNET_RPC \
  --private-key $DEPLOYER_PK \
  --broadcast --slow \
  -vvv

# 5. Transfer ownership to treasury
# (manual: PaymentManager.transferOwnership(treasury))

# 6. Verify all contracts
forge script script/VerifyContracts.s.sol \
  --rpc-url $BSC_MAINNET_RPC \
  -vvv
```

**Action:**
- [ ] Run `forge build` to confirm contracts compile
- [ ] Test deployment scripts on testnet first
- [ ] Use `--slow` flag for mainnet (rate limiting)
- [ ] Have BSCScan API key ready: `BSCSCAN_API_KEY`
- [ ] Have sufficient BNB for gas in deployer wallet

---

## Environment Variables

### Required Variables

| Variable | Testnet Value | Mainnet Value | Status |
|---|---|---|---|
| `BSC_MAINNET_RPC` | N/A | Provider URL | ⏳ To configure |
| `DEPLOYER_PRIVATE_KEY` | Dev key | Mainnet key | 🔒 Secure storage |
| `TREASURY` | Empty (dev) | Multisig address | ⏳ To configure |
| `CHAINLINK_FEED` | Testnet feed | Mainnet feed | ⏳ To verify |
| `USDT` | MockUSDT | Production USDT | ⏳ To deploy |
| `RLKO_ADDRESS` | Testnet RLKO | Mainnet RLKO | ⏳ To deploy |
| `PAYMENT_MANAGER` | Testnet PM | Mainnet PM | ⏳ To deploy |
| `MOCK_USDT` | `true` | `false` or unset | ⏳ To change |

### Frontend Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project (already set) |
| `NEXT_PUBLIC_BSC_RPC` | Custom BSC RPC (optional override) |

**Action:**
- [ ] Review all env vars before mainnet deployment
- [ ] Ensure `MOCK_USDT` is NOT `true` for mainnet
- [ ] Use a fresh deployer wallet (not the testnet deployer)

---

## Security Checklist

### Pre-Deployment

- [ ] Smart contracts audited (see `docs/AUDIT_SCOPE.md`)
- [ ] All P0 and P1 bugs resolved
- [ ] No console.log, debug code, or commented-out code in production contracts
- [ ] Constructor parameters validated (non-zero addresses)
- [ ] Owner address is a multisig (not EOA) — recommended
- [ ] Treasury address confirmed and tested
- [ ] Emergency pause procedure documented
- [ ] Oracle override procedure documented

### Post-Deployment

- [ ] Contract verified on BSCScan
- [ ] Ownership transferred to treasury multisig
- [ ] Owner function access confirmed (multisig works)
- [ ] Stage 1 configured and activated
- [ ] Presale RLKO tokens transferred to PaymentManager
- [ ] Contract pause/unpause tested by owner
- [ ] Withdraw functions work from owner address
- [ ] BNB purchase path tested with small amount
- [ ] USDT purchase path tested with small amount
- [ ] Oracle override tested (emergency rate set, then cleared)

---

## Rollback Checklist

### If a critical issue is found after deployment:

1. **Pause immediately:**
   ```solidity
   PaymentManager.pause()
   ```

2. **Assess impact:**
   - Which users are affected?
   - How many transactions processed?
   - Is there any fund loss?

3. **Decide: fix in place or redeploy:**
   - **Fix in place** if the contract logic is correct but config is wrong
   - **Redeploy** if the contract logic has a vulnerability

4. **If redeploying:**
   - Transfer remaining RLKO supply from old contract to new
   - Record all user contributions from old contract
   - Update frontend config with new contract address
   - Verify all state in new contract

5. **Communicate:**
   - Announce pause to community
   - Explain timeline for fix
   - Resume after verification

### Rollback Commands

```bash
# Pause
cast send <PAYMENT_MANAGER> "pause()" \
  --rpc-url $BSC_MAINNET_RPC \
  --private-key $OWNER_KEY

# Resume (after fix)
cast send <PAYMENT_MANAGER> "unpause()" \
  --rpc-url $BSC_MAINNET_RPC \
  --private-key $OWNER_KEY

# Withdraw all funds (if redeploying)
cast send <PAYMENT_MANAGER> "withdrawFunds(address)" <USDT> \
  --rpc-url $BSC_MAINNET_RPC \
  --private-key $OWNER_KEY
cast send <PAYMENT_MANAGER> "withdrawFunds(address)" 0x0 \
  --rpc-url $BSC_MAINNET_RPC \
  --private-key $OWNER_KEY
```

---

## Pre-Mainnet Launch Sequence

### T-7 Days
- [ ] Complete all P0/P1 bug fixes
- [ ] Freeze contract code
- [ ] Finalize mainnet treasury address

### T-3 Days
- [ ] Deploy RLKO token to mainnet
- [ ] Verify token on BSCScan
- [ ] Prepare PaymentManager deployment transaction

### T-1 Day
- [ ] Deploy PaymentManager to mainnet
- [ ] Transfer presale RLKO supply
- [ ] Configure and activate Stage 1
- [ ] Transfer ownership to treasury
- [ ] Verify all contracts on BSCScan

### T-0 (Launch Day)
- [ ] Final frontend config check
- [ ] Test purchase with small amount
- [ ] Announce mainnet launch
- [ ] Monitor dashboard for first hour

### T+1 Day
- [ ] Post-launch health check
- [ ] Monitor for any issues
- [ ] Begin normal operations
