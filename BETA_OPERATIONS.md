# Beta Operations Guide

**Version:** v1.0.0-beta.1 (RC10)

---

## Daily Health Checks

### 1. RPC Status

Check that the BSC Testnet RPC is responding.

```
curl -s https://bsc-testnet-rpc.publicnode.com \
  -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

**Expected:** Valid JSON response with a `result` field containing the latest block number in hex. Block number should increase between checks (new block every ~3 seconds).

**If failing:**
- Check [BNB Chain Testnet Status](https://status.bnbchain.org/)
- Try alternate RPC: `https://data-seed-prebsc-1-s1.binance.org:8545/`
- Update `BSC_TESTNET_RPC` in `.env`
- Announce RPC degradation to testers

### 2. Contract Health

Verify all contracts are reachable and return expected data.

| Check | Command (cast) | Expected |
|---|---|---|
| RLKO total supply | `cast call <RLKO> "totalSupply()" --rpc-url <RPC>` | `1000000000000000000000000000` (1B) |
| PaymentManager stage | `cast call <PM> "currentStage()" --rpc-url <RPC>` | Active stage index |
| PaymentManager price | `cast call <PM> "tokenPrice()" --rpc-url <RPC>` | `1150000000000000000` (stage 1) |
| Staking contract | `cast code <STAKING> --rpc-url <RPC>` | Non-empty bytecode |

### 3. Treasury / Owner Wallet

Verify the deployer/owner wallet has sufficient tBNB for gas.

```
cast balance <DEPLOYER_ADDRESS> --rpc-url <RPC>
```

**Expected:** > 0.1 tBNB. If low, refill from [BNB Chain Faucet](https://testnet.bnbchain.org/faucet-smart).

### 4. Frontend

- Navigate to [presale dashboard](https://relcko.io/presale)
- Confirm page loads without console errors
- Confirm wallet connection works (MetaMask, WalletConnect)
- Confirm block number in sidebar is updating
- Confirm testnet banner is visible

### 5. Analytics

- Open Admin Monitor section in dashboard
- Check that event counts are incrementing as testers use the app
- Verify no unexpected error patterns

---

## RPC Monitoring

### Automated Script

Run this daily to check RPC health:

```bash
#!/bin/bash
RPC="https://bsc-testnet-rpc.publicnode.com"

# Check block production
RESULT=$(curl -s $RPC -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}')

BLOCK=$(echo $RESULT | grep -o '"result":"0x[^"]*"' | cut -d'"' -f4)

if [ -z "$BLOCK" ]; then
  echo "[ALERT] RPC not responding"
  exit 1
fi

echo "Block: $((16#${BLOCK#0x}))"
echo "RPC OK"
```

### Fallback RPCs

If primary RPC fails, use these alternatives:

| Provider | URL |
|---|---|
| PublicNode | `https://bsc-testnet-rpc.publicnode.com` |
| Binance | `https://data-seed-prebsc-1-s1.binance.org:8545/` |
| Binance (2) | `https://data-seed-prebsc-2-s1.binance.org:8545/` |

---

## Wallet Monitoring

### Supported Wallets

| Wallet | Status | Notes |
|---|---|---|
| MetaMask | ✅ Verified | Works with BSC Testnet |
| WalletConnect | ✅ Verified | Works with mobile wallets |
| Coinbase Wallet | ✅ Verified | Requires WalletConnect project ID |

### Common Wallet Issues

| Issue | Resolution |
|---|---|
| "Chain ID mismatch" | Switch wallet to BSC Testnet (Chain ID 97) |
| "Transaction underpriced" | Wait and retry — testnet gas usually low |
| "User rejected" | User declined in wallet — no action needed |
| "Already processing" | Wait for pending tx to complete or speed up |

---

## Treasury Verification

### Check Contract Ownership

```bash
cast call <PAYMENT_MANAGER> "owner()(address)" --rpc-url <RPC>
cast call <STAKING_CONTRACT> "owner()(address)" --rpc-url <RPC>
```

**Expected:** Both return the deployer/treasury address.

### Check Contract Balances

```bash
# RLKO balance of PaymentManager (presale supply)
cast call <RLKO> "balanceOf(address)(uint256)" <PAYMENT_MANAGER> --rpc-url <RPC>

# USDT balance of PaymentManager (raised funds)
cast call <USDT> "balanceOf(address)(uint256)" <PAYMENT_MANAGER> --rpc-url <RPC>
```

### Withdraw Funds (Owner Only)

```solidity
// Withdraw USDT
PaymentManager.withdrawFunds(USDT_ADDRESS)

// Withdraw BNB
PaymentManager.withdrawFunds(ZERO_ADDRESS)

// Withdraw unsold RLKO (only when no active stage)
PaymentManager.withdrawSaleTokens(amount)
```

---

## Contract Verification

Verify on BSCScan after any deployment:

```bash
forge verify-contract \
  --chain-id 97 \
  --num-of-optimizations 200 \
  --watch \
  --verifier-url https://api-testnet.bscscan.com/api \
  --etherscan-api-key $BSCSCAN_API_KEY \
  <CONTRACT_ADDRESS> \
  <path:Contract.sol>:<ContractName>
```

### Verified Contracts

| Contract | BSCScan Link |
|---|---|
| RLKO Token | https://testnet.bscscan.com/address/0x4359C08b48c2c9dAe6BFB14F08110d264F30A4e5 |
| MockUSDT | https://testnet.bscscan.com/address/0x701B81ea7F71a3c403cb53A6d465c37D96187E7f |
| PaymentManager | https://testnet.bscscan.com/address/0x6B2fa30F5a9aAB5cE78558F3c4EA9217eC21D431 |

---

## Incident Escalation

### Severity Levels

| Level | Definition | Response Time |
|---|---|---|
| **Critical** | Users cannot purchase RLKO. Contract funds at risk. | Immediate |
| **High** | Staking or claiming broken. Analytics data loss. | 1 hour |
| **Medium** | UI bug, cosmetic issue, incorrect display data. | 24 hours |
| **Low** | Enhancement request, documentation fix. | Next release |

### Escalation Path

```
Tester reports issue
  → Bug report submitted via GitHub Issues
    → Triage: assign priority (P0-P3)
      → P0: Notify team immediately, consider pausing contracts
      → P1: Fix within 1 hour, notify testers of downtime
      → P2: Schedule fix in next RC
      → P3: Log for future release
```

### Communication Channels

| Channel | Purpose |
|---|---|
| GitHub Issues | Bug reports and feature tracking |
| Telegram/Discord | Real-time incident communication |
| Email | Escalation for critical issues |

### Emergency Procedures

1. **Pause Purchase Contracts** (if funds at risk):
   ```solidity
   PaymentManager.pause()
   ```

2. **Notify Testers**: Announce via Telegram/Discord/Email

3. **Assess Impact**: Determine affected users and transactions

4. **Deploy Fix**: Create hotfix branch, follow normal PR process

5. **Resume**: Unpause after fix is verified
   ```solidity
   PaymentManager.unpause()
   ```

6. **Post-Mortem**: Document root cause and prevention

---

## Bug Triage Workflow

1. **Triage**: New issues reviewed within 24 hours
2. **Classify**: Assign priority (P0-P3) and area label
3. **Reproduce**: Attempt to reproduce in testnet
4. **Fix**: Develop fix on branch, test locally
5. **Review**: PR review by at least one other team member
6. **Deploy**: Merge to main, deploy to testnet
7. **Verify**: Confirm fix in testnet, close issue

### Bug Report Template

```markdown
**Browser:** Chrome/Firefox/Safari
**Wallet:** MetaMask/WalletConnect
**Chain ID:** 97
**Error Message:** <error text>
**Transaction Hash:** <optional>
**Console Log:** <optional>
**Description:**
<detailed description>
```

*Bug report dialog in the app auto-generates this format.*
