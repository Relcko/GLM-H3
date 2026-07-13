# Relcko Protocol — BNB Testnet Deployment (RC1)

## Prerequisites

- [Foundry](https://book.getfoundry.sh/) installed
- Deployer wallet funded with Testnet BNB (faucet: https://testnet.bnbchain.org/faucet-smart)
- `.env` file configured (see `.env.example`)

## Environment Variables

```bash
# Required
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545
DEPLOYER_PK=<your_deployer_private_key>

# Token addresses (BSC Testnet — known)
USDT_TOKEN=0x7a7B1e43765a5BaC58e73f3c67CcB5548AC08408
BNB_USD_FEED=0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526

# Stage 1 configuration
STAGE1_PRICE=1150000000000000000           # 1.15 USDT (18 decimals)
STAGE1_SUPPLY=10000000000000000000000      # 10,000 RLKO (18 decimals)
STAGE1_MIN_PER_USER=10000000000000000000   # 10 USDT (18 decimals)
STAGE1_MAX_PER_USER=100000000000000000000000 # 100,000 USDT (18 decimals)

# Treasury (multisig recommended)
TREASURY=0x<treasury_address>
```

## Deployment Order

### Step 1: Deploy RLKO Token (Testnet)

```bash
forge script script/DeployRLKO.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $DEPLOYER_PK \
  --verify --broadcast \
  -vvv
```

Saves RLKO address. Set `SALE_TOKEN` in `.env`.

### Step 2: Deploy PaymentManager

```bash
forge script script/DeployPaymentManager.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $DEPLOYER_PK \
  --verify --broadcast \
  -vvv
```

- Constructor validates all three addresses (non-zero).
- If `TREASURY` is set in `.env`, ownership is transferred via `Ownable2Step`.
- Treasury must call `acceptOwnership()` to complete the transfer.

### Step 3: Fund PaymentManager with RLKO

Transfer presale supply from deployer to PaymentManager contract:

```bash
cast send --rpc-url $BSC_TESTNET_RPC \
  --private-key $DEPLOYER_PK \
  <RLKO_ADDRESS> \
  "transfer(address,uint256)" \
  <PAYMENT_MANAGER_ADDRESS> \
  <PRESALE_SUPPLY>
```

### Step 4: Configure Stage 1

```bash
forge script script/ConfigureStage1.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $DEPLOYER_PK \
  --broadcast \
  -vvv
```

- Adds Stage 1 with price=1.15 USDT, supply=10,000 RLKO, min=10 USDT, max=100,000 USDT.
- Activates Stage 0 (first stage).
- Validates all inputs before execution.

### Step 5: Deploy All (Alternative single-script)

```bash
forge script script/DeployAll.s.sol \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $DEPLOYER_PK \
  --verify --broadcast \
  -vvv
```

Runs Steps 1–4 in a single broadcast. Requires all env vars to be set.

## Verification

### Automated (via VerifyContracts script)

```bash
forge script script/VerifyContracts.s.sol
```

Prints the `forge verify-contract` commands for each deployed contract.

### Manual (BscScan)

| Contract | Command |
|----------|---------|
| MockERC20 (RLKO) | `forge verify-contract --chain-id 97 --num-of-optimizations 200 --watch <RLKO_ADDRESS> contracts/mocks/MockERC20.sol:MockERC20` |
| PaymentManager | `forge verify-contract --chain-id 97 --num-of-optimizations 200 --constructor-args $(cast abi-encode "constructor(address,address,address)" <RLKO_ADDRESS> <USDT_ADDRESS> <FEED_ADDRESS>) --watch <PM_ADDRESS> contracts/PaymentManager.sol:PaymentManager` |

## Post-Deployment Checklist

- [ ] RLKO token deployed and verified
- [ ] PaymentManager deployed and verified
- [ ] RLKO balance transferred to PaymentManager (≥ sum of all stage supplies)
- [ ] Stage 1 added and activated
- [ ] User can purchase with USDT (`buyWithToken`)
- [ ] User can purchase with BNB (`buyWithNative`)
- [ ] Oracle override works (`setNativeToUsdtRate`)
- [ ] Pause/unpause works
- [ ] Owner can withdraw USDT and BNB
- [ ] Owner cannot withdraw RLKO during active sale
- [ ] Treasury has accepted ownership (if transferred)

## Rollback Procedure

If deployment fails or produces unexpected results:

1. **RLKO token**: No rollback needed — deploy a new one.
2. **PaymentManager**: Deploy a new instance. Old contract funds can be withdrawn by owner.
3. **Stage configuration**: Call `updateStage()` to fix parameters. Call `deactivateStage` pattern: activate a new empty stage.
4. **Ownership**: Deployer can call `cancelOwnershipTransfer()` if using Ownable2Step and transfer not yet accepted.

## Contract Addresses (Placeholder)

| Contract | Address |
|----------|---------|
| RLKO Token | `0x_After_Deployment` |
| PaymentManager | `0x_After_Deployment` |
| USDT (BSC Testnet) | `0x7a7B1e43765a5BaC58e73f3c67CcB5548AC08408` |
| BNB/USD Feed (BSC Testnet) | `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526` |

## Security Notes

- Deployer key must be kept secret and discarded after ownership transfer.
- On mainnet, use a multisig (e.g., Gnosis Safe) as the treasury/owner.
- Verify all BscScan links match the deployed bytecode.
- Run `forge coverage` to confirm test coverage before mainnet.
