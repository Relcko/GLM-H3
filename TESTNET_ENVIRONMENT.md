# Relcko — BNB Smart Chain Testnet Environment

A **self-configuring** deployment environment for the Relcko presale on BNB
Smart Chain Testnet (chain id **97**). You supply two values; everything else is
resolved, deployed, and wired up automatically.

> Contracts, ABIs, and business logic are untouched. This document only covers
> the environment, deployment orchestration, and post-deploy config sync.

---

## TL;DR

```bash
# 1. Edit .env — set ONLY these two:
#      DEPLOYER_PRIVATE_KEY=0x...
#      TREASURY=0x...            (optional on testnet; blank keeps deployer as owner)

# 2. Deploy + auto-sync everything:
npm run deploy:testnet
```

That single command deploys RLKO, MockUSDT, and PaymentManager, configures
Stage 1, transfers ownership (if `TREASURY` is set), then rewrites `.env`,
`deployments/testnet.json`, and the frontend config with the live addresses.
**No manual copying.**

---

## 1. Environment variables

Legend: **USER** = you must fill in · **AUTO** = pre-filled or written by tooling.

| Variable | Kind | Value / Source |
|----------|------|----------------|
| `DEPLOYER_PRIVATE_KEY` | **USER** | Private key that funds & broadcasts the deployment. Use a throwaway testnet key. Never commit it. |
| `TREASURY` | **USER** | Multisig that receives `PaymentManager` ownership (Ownable2Step). Leave blank to keep ownership on the deployer during testing. |
| `BSC_TESTNET_RPC` | AUTO | Public BNB Testnet RPC — `https://bsc-testnet-rpc.publicnode.com`. |
| `BSC_MAINNET_RPC` | AUTO | Intentionally left **blank** in the testnet environment. |
| `CHAINLINK_FEED` | AUTO | Official Chainlink **BNB/USD** aggregator on BSC Testnet: `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526` (8 decimals). Required by `PaymentManager` for `buyWithNative()`. |
| `MOCK_USDT` | AUTO | `true` — deploys a fresh `MockUSDT` (18 decimals, owner-mintable). |
| `USDT` | AUTO | Written by the post-deploy updater after `MockUSDT` is deployed. **Never edit by hand.** |
| `RLKO_NAME` / `RLKO_SYMBOL` / `RLKO_DECIMALS` / `RLKO_SUPPLY` | AUTO | RLKO token metadata (defaults: Relcko Token / RLKO / 18 / 1,000,000,000). |
| `PRESALE_SUPPLY` | AUTO | RLKO moved into `PaymentManager` for the sale (10,000 RLKO). |
| `STAGE1_PRICE` | AUTO | 1.15 USDT (18 decimals). |
| `STAGE1_SUPPLY` | AUTO | 10,000 RLKO. |
| `STAGE1_MIN_PER_USER` / `STAGE1_MAX_PER_USER` | AUTO | 10 / 100,000 USDT (18 decimals). |
| `RLKO_ADDRESS` | AUTO | Written by the updater after deploy. |
| `PAYMENT_MANAGER` | AUTO | Written by the updater after deploy. |
| `BNB_USD_FEED_MAINNET` | AUTO | Reference-only mainnet feed; unused on testnet. |

Only `DEPLOYER_PRIVATE_KEY` and `TREASURY` require your input. Everything else is
resolved automatically.

### How the scripts resolve values

`script/BaseDeployScript.sol` resolves addresses in this priority order (all
backward-compatible with the legacy variable names):

- **Feed:** `CHAINLINK_FEED` → `BNB_USD_FEED` → `BNB_USD_FEED_TESTNET`.
- **USDT:** artifact `usdt` → `USDT` → `USDT_TOKEN` → `USDT_TOKEN_TESTNET`.
- **Deployer:** `DEPLOYER` → `DEPLOYER_PRIVATE_KEY` → `DEPLOYER_PK` → `msg.sender`.

Because `MOCK_USDT=true` and `deployments/testnet.json` ships with a zero `usdt`,
`DeployAll` always deploys a **fresh** MockUSDT and the updater fills `USDT` for you.

---

## 2. Deployment order

`DeployAll.s.sol` runs atomically, in this order:

| Step | Action | Verification |
|------|--------|--------------|
| 1 | Deploy **RLKO** (MockERC20) and mint total supply to deployer | supply minted, decimals == 18 |
| 2 | Deploy **MockUSDT** (because `MOCK_USDT=true`) | code present, decimals == 18 |
| 3 | Deploy **PaymentManager**(RLKO, USDT, feed) | `SALE_TOKEN`/`USDT`/`BNB_USD_FEED` match, owner == deployer |
| 4 | Transfer `PRESALE_SUPPLY` RLKO into PaymentManager | balance == presale supply |
| 5 | `addStage` + `activateStage` for **Stage 1** | stage count, current stage, price/supply/limits |
| 6 | Verify on-chain state; if `TREASURY` set, initiate 2-step ownership transfer | feed decimals == 8, price > 0, stage config |
| 7 | Persist `deployments/testnet.json` | artifact written |
| 8 | (orchestrator) run `update-testnet-env.mjs` | `.env` + frontend synced |

---

## 3. What gets synced automatically (post-deploy)

`tools/update-testnet-env.mjs` reads the on-chain-verified artifact
`deployments/testnet.json` and propagates addresses to:

1. **`.env`** → `USDT`, `RLKO_ADDRESS`, `PAYMENT_MANAGER`, `CHAINLINK_FEED`.
2. **`deployments/testnet.json`** → written by `DeployAll` (validated by the updater).
3. **`lib/presale/config.ts`** (frontend) →
   - `PRESALE_CONTRACTS[bscTestnet]` = PaymentManager address
   - `PAYMENT_TOKENS[bscTestnet]` USDT address + `decimals: 18` (matches MockUSDT)

The updater is **idempotent** — safe to re-run. It runs automatically as part of
`npm run deploy:testnet`, or on its own via `npm run postdeploy:testnet`.

---

## 4. Step-by-step

### 4.1 Prerequisites
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge` on PATH)
- Node.js 18+
- Test BNB from a faucet: <https://testnet.bnbchain.org/faucet-smart>

### 4.2 Configure
Open `.env` and set:
```ini
DEPLOYER_PRIVATE_KEY=0xyour_testnet_key
TREASURY=0xyour_multisig      # optional on testnet
```

### 4.3 Deploy (one-shot, recommended)
```bash
npm run deploy:testnet
```

### 4.4 Deploy manually (equivalent)
```bash
forge script script/DeployAll.s.sol \
  --rpc-url https://bsc-testnet-rpc.publicnode.com \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast -vvvv

npm run postdeploy:testnet
```

---

## 5. Verification steps

After deploying, confirm the environment is fully wired:

```bash
# Addresses landed in the artifact
type deployments\testnet.json          # Windows
cat  deployments/testnet.json          # macOS/Linux

# .env now has USDT / RLKO_ADDRESS / PAYMENT_MANAGER populated
# lib/presale/config.ts testnet entries point to the new PaymentManager + MockUSDT
```

On-chain sanity checks (replace with your addresses from the artifact):

```bash
# PaymentManager wiring
cast call <PAYMENT_MANAGER> "SALE_TOKEN()(address)"    --rpc-url $BSC_TESTNET_RPC
cast call <PAYMENT_MANAGER> "USDT()(address)"          --rpc-url $BSC_TESTNET_RPC
cast call <PAYMENT_MANAGER> "BNB_USD_FEED()(address)"  --rpc-url $BSC_TESTNET_RPC

# Stage 1 is active
cast call <PAYMENT_MANAGER> "currentStageInfo()" --rpc-url $BSC_TESTNET_RPC

# Chainlink feed is live (8 decimals, price > 0)
cast call $CHAINLINK_FEED "latestRoundData()" --rpc-url $BSC_TESTNET_RPC
```

Optional read-only re-verification via Foundry:
```bash
forge script script/VerifyContracts.s.sol --rpc-url $BSC_TESTNET_RPC -vvvv
```

### If `TREASURY` was set
Ownership transfer is 2-step. The treasury multisig must accept it:
```bash
cast send <PAYMENT_MANAGER> "acceptOwnership()" \
  --rpc-url $BSC_TESTNET_RPC --private-key $TREASURY_SIGNER_KEY
```

---

## 6. Minting test USDT & buying

```bash
# Mint 10,000 MockUSDT (18 decimals) to a buyer
cast send <USDT> "mint(address,uint256)" <BUYER> 10000000000000000000000 \
  --rpc-url $BSC_TESTNET_RPC --private-key $DEPLOYER_PRIVATE_KEY

# Approve + buy 1 RLKO with USDT (Stage 1 price = 1.15 USDT)
cast send <USDT> "approve(address,uint256)" <PAYMENT_MANAGER> 10000000000000000000000 \
  --rpc-url $BSC_TESTNET_RPC --private-key $BUYER_KEY
cast send <PAYMENT_MANAGER> "buyWithToken(address,uint256)" <USDT> 1150000000000000000 \
  --rpc-url $BSC_TESTNET_RPC --private-key $BUYER_KEY

# Or buy with native tBNB (priced via the Chainlink feed)
cast send <PAYMENT_MANAGER> "buyWithNative()" --value 1000000000000000000 \
  --rpc-url $BSC_TESTNET_RPC --private-key $BUYER_KEY
```

---

## Network reference

| Parameter | Value |
|-----------|-------|
| Chain ID | `97` |
| RPC | `https://bsc-testnet-rpc.publicnode.com` |
| Explorer | <https://testnet.bscscan.com> |
| Currency | tBNB |
| Chainlink BNB/USD feed | `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526` |
