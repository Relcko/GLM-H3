# Relcko Protocol — BNB Testnet Deployment Guide

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
- Test BNB from a [BNB Smart Chain Testnet faucet](https://testnet.bnbchain.org/faucet-smart)
- A `.env` file configured (copy `.env.example`)

---

## 1. Obtain Test BNB

Visit one of these faucets and request test BNB to your deployer wallet:

| Faucet | URL |
|--------|-----|
| BNB Chain Official Faucet | <https://testnet.bnbchain.org/faucet-smart> |
| BNB Chain Testnet Faucet | <https://faucet.quicknode.com/binance/bnb-testnet> |
| Chaindrop | <https://chaindrop.org/?chainid=97> |

You need enough BNB for:
- Contract deployment gas (~0.01–0.05 BNB)
- Future purchase tests (~0.1 BNB for `buyWithNative`)

---

## 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```ini
DEPLOYER_PK=your_private_key_here
```

For testnet, the defaults already work:
- `MOCK_USDT=true` — deploys a fresh MockUSDT so you don't need a real USDT address
- `BNB_USD_FEED_TESTNET` — pre-filled with the BSC Testnet Chainlink feed

---

## 3. Deploy Everything (One-Shot)

Run `DeployAll` which performs all steps atomically:

```bash
forge script script/DeployAll.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  --broadcast \
  -vvvv
```

This will:

| Step | Action |
|------|--------|
| 1 | Deploy **RLKO** token (MockERC20, "Relcko Token") |
| 2 | Deploy **MockUSDT** (18 decimals, mintable by owner) |
| 3 | Deploy **PaymentManager** |
| 4 | Transfer presale RLKO supply to PaymentManager |
| 5 | Add + activate **Stage 1** |
| 6 | Verify owners, decimals, feed, stage config |
| 7 | Save addresses to `deployments/testnet.json` |

On success, console output shows every deployed address. The artifact written
to `deployments/testnet.json` contains the full deployment state.

---

## 4. Deploy Step by Step (Alternative)

If preferred, deploy each contract individually:

### 4.1 Deploy RLKO Token

```bash
forge script script/DeployRLKO.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  --broadcast \
  -vvvv
```

### 4.2 Deploy MockUSDT

```bash
# Simulate a dry-run first
forge script script/DeployMockUSDT.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  -vvvv

# Then broadcast to deploy
forge script script/DeployMockUSDT.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  --broadcast \
  -vvvv
```

### 4.3 Deploy PaymentManager

```bash
forge script script/DeployPaymentManager.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  --broadcast \
  -vvvv
```

### 4.4 Configure Stage 1

```bash
forge script script/ConfigureStage1.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  --broadcast \
  -vvvv
```

### 4.5 Verify All Contracts

```bash
forge script script/VerifyContracts.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  -vvvv
```

---

## 5. Mint Mock USDT

After deployment, the deployer (owner of MockUSDT) can mint USDT for testing:

```bash
# Mint 10 000 USDT (18 decimals) to address 0xRECIPIENT
cast send 0xMOCK_USDT_ADDRESS \
  "mint(address,uint256)" \
  0xRECIPIENT \
  10000000000000000000000 \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $DEPLOYER_PK
```

Replace:
- `0xMOCK_USDT_ADDRESS` — the MockUSDT address from the deployment log or `deployments/testnet.json`
- `0xRECIPIENT` — the wallet that will buy RLKO tokens
- `DEPLOYER_PK` — the same private key used for deployment (MockUSDT owner)

---

## 6. Buy RLKO Tokens

### 6.1 Approve USDT

The buyer must first approve the PaymentManager to spend USDT:

```bash
cast send 0xUSDT_ADDRESS \
  "approve(address,uint256)" \
  0xPAYMENT_MANAGER_ADDRESS \
  10000000000000000000000 \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $BUYER_PK
```

### 6.2 Buy with USDT

```bash
cast send 0xPAYMENT_MANAGER_ADDRESS \
  "buyWithToken(address,uint256)" \
  0xUSDT_ADDRESS \
  1150000000000000000 \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $BUYER_PK
```

This buys 1 RLKO at the Stage 1 price of 1.15 USDT.

### 6.3 Buy with Native BNB

```bash
cast send 0xPAYMENT_MANAGER_ADDRESS \
  "buyWithNative()" \
  --value 1000000000000000000 \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $BUYER_PK
```

This sends 1 BNB (converted to USDT via the Chainlink feed) and purchases the
equivalent amount of RLKO.

---

## 7. Verify Balances

### RLKO Balance

```bash
cast call 0xRLKO_ADDRESS \
  "balanceOf(address)" \
  0xRECIPIENT \
  --rpc-url $BSC_TESTNET_RPC
```

### USDT Balance

```bash
cast call 0xUSDT_ADDRESS \
  "balanceOf(address)" \
  0xRECIPIENT \
  --rpc-url $BSC_TESTNET_RPC
```

### PaymentManager Stage Info

```bash
cast call 0xPAYMENT_MANAGER_ADDRESS \
  "currentStageInfo()" \
  --rpc-url $BSC_TESTNET_RPC
```

### User Contribution

```bash
cast call 0xPAYMENT_MANAGER_ADDRESS \
  "userInvestment(address)" \
  0xRECIPIENT \
  --rpc-url $BSC_TESTNET_RPC
```

---

## 8. Useful Cast Commands

```bash
# Read PaymentManager owner
cast call 0xPAYMENT_MANAGER_ADDRESS "owner()" --rpc-url $BSC_TESTNET_RPC

# Read oracle override rate
cast call 0xPAYMENT_MANAGER_ADDRESS "nativeRateOverride()" --rpc-url $BSC_TESTNET_RPC

# Fetch the latest BNB/USD price from the feed
cast call 0xBNB_USD_FEED "latestRoundData()" --rpc-url $BSC_TESTNET_RPC

# Check if PaymentManager is paused
cast call 0xPAYMENT_MANAGER_ADDRESS "paused()" --rpc-url $BSC_TESTNET_RPC
```

---

## Network Details

| Parameter | Value |
|-----------|-------|
| Chain ID | `97` |
| RPC URL | `https://data-seed-prebsc-1-s1.binance.org:8545` |
| Explorer | <https://testnet.bscscan.com> |
| Currency | tBNB |
| Chainlink Feed | `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526` |
