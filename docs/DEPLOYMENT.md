# Deployment Guide

## Prerequisites

- [Foundry](https://book.getfoundry.sh/) installed
- Deployer wallet with BNB for gas
- RPC URL for target network

## Environment Variables

```bash
# Required
SALE_TOKEN=<RLKO token address>
USDT_TOKEN=<USDT token address>
BNB_USD_FEED=<Chainlink BNB/USD feed address>

# For forge script
BSC_TESTNET_RPC=<your BSC testnet RPC>
BSC_MAINNET_RPC=<your BSC mainnet RPC>
DEPLOYER_PK=<deployer private key>
```

## Contract Addresses

### BNB Testnet

| Contract | Address |
|----------|---------|
| USDT | `0x7a7B1e43765a5BaC58e73f3c67CcB5548AC08408` |
| BNB/USD Feed | `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526` |

### BNB Mainnet

| Contract | Address |
|----------|---------|
| RLKO Token | `0x7F408e0861717b9CD3Bbe3E13b65D5Ff18Cf32C1` |
| USDT | `0x55d398326f99059ff775485246999027b3197955` |
| BNB/USD Feed | `0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE` |

## Deploy Script

```bash
# BNB Testnet
forge script script/DeployPaymentManager.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $DEPLOYER_PK \
  --verify --broadcast \
  -vvv

# BNB Mainnet (use --slow for rate limiting)
forge script script/DeployPaymentManager.s.sol \
  --rpc-url $BSC_MAINNET_RPC \
  --private-key $DEPLOYER_PK \
  --verify --broadcast \
  --slow \
  -vvv
```

## Post-Deployment Steps

1. **Transfer RLKO tokens** to the PaymentManager contract for the presale supply.
2. **Add stages** using `addStage(price, supply, minPerUser, maxPerUser)`.
3. **Activate stage 0** using `activateStage(0)`.
4. **Verify contract** on BscScan.

## Constructor Parameters

| Param | Type | Description |
|-------|------|-------------|
| `_saleToken` | address | RLKO token address |
| `_usdt` | address | USDT token address |
| `_bnbUsdFeed` | address | Chainlink BNB/USD feed address |

All three must be non-zero addresses.
