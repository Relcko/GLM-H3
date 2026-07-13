# Deployment Failure Report

## Summary

`npm run deploy:testnet` ran `forge script` with `--broadcast`, which submitted 6 transactions to BSC Testnet. **All 6 are stuck in the mempool with a gas price of 1 wei (0.000000001 gwei)** — far too low to be mined. No new contracts were deployed.

---

## 1. RPC URL and Chain ID

| Field | Value |
|-------|-------|
| RPC URL | `https://bsc-testnet-rpc.publicnode.com` |
| Chain ID | `97` (BNB Smart Chain Testnet) |
| Forge version | `1.7.1` |
| RPC `eth_gasPrice` response | `100,000,000 wei` (0.1 gwei) |
| RPC `eth_maxPriorityFeePerGas` response | `100,000,000 wei` (0.1 gwei) |

The RPC is functional and responds correctly.

---

## 2. Did `--broadcast` Execute?

**Yes, but transactions were submitted with 1 wei gas price.**

The broadcast file `broadcast/DeployAll.s.sol/97/run-latest.json` contains:
- 6 transaction entries with nonces `0xb` through `0x10` (11–16)
- `"receipts": []` — no confirmations received
- `"pending": [...]` — all 6 hashes listed as pending

All 6 transaction hashes are confirmed present in the BSC Testnet mempool.

---

## 3. Root Cause: Gas Price = 1 wei

Every pending transaction was submitted with EIP-1559 (type 2) fee parameters of **1 wei**:

| Transaction | Nonce | `maxFeePerGas` | `maxPriorityFeePerGas` |
|------------|-------|----------------|------------------------|
| RLKO CREATE | 11 | **1 wei** | **1 wei** |
| RLKO mint | 12 | **1 wei** | **1 wei** |
| RLKO transfer | 14 | **1 wei** | **1 wei** |
| addStage | 15 | **1 wei** | **1 wei** |
| activateStage | 13 | **1 wei** | **1 wei** |
| PaymentManager CREATE | 16 | **1 wei** | **1 wei** |

**1 wei = 0.000000001 gwei.** The RPC recommends 0.1 gwei (100,000,000× higher). These transactions will never be included in a block.

### Why did forge use 1 wei?

The `deploy-testnet.mjs` script does not pass any gas-price flags to forge:

```
forge script script/DeployAll.s.sol --rpc-url ... --private-key ... --broadcast -vvvv
```

No `--with-gas-price`, `--priority-gas-price`, or `--gas-estimate-multiplier`. Forge 1.7.1 should auto-estimate from the RPC, but in this case it defaulted to 1 wei — likely a bug or the RPC returned a zero estimate at the moment of deployment.

---

## 4. Deployer Wallet Nonce State

| Metric | Value |
|--------|-------|
| Address | `0x4ccE54BFeE344442Af2018fb89A1c185C60D29dc` |
| Confirmed nonce (latest block) | **11** |
| Pending nonce (mempool) | **17** |
| Transactions in mempool | **6** (nonces 11–16) |

Nonce gap: old deployment used nonces 0–6. Nonces 7–10 were consumed by other transactions between deployments.

Because nonces 11–16 are occupied by stuck 1-wei transactions, **no new deployment can proceed** until these are cleared.

---

## 5. Deployer Balance

| Balance | Value |
|---------|-------|
| Current balance | **0.003440449 tBNB** |
| Required at 0.1 gwei | ~0.00055 tBNB |
| Required at 1 gwei | ~0.0055 tBNB |
| Required at 3 gwei | ~0.0165 tBNB |

At 3 gwei (more realistic for BSC Testnet), the balance is **insufficient by ~5×**. Additional tBNB is needed from a faucet.

---

## 6. No New Contracts Deployed

Checked on-chain at the addresses from the broadcast artifact:

| Address (new) | Code on-chain | Status |
|---------------|--------------|--------|
| `0x1f04c304...` (new RLKO) | **No code** | Not deployed |
| `0x12DEeb21...` (new PaymentManager) | **No code** | Not deployed |

The old contracts remain intact:
| Address (old) | Code on-chain | Status |
|--------------|--------------|--------|
| `0x4359C08b...` (old RLKO) | Deployed | Still active |
| `0x6B2fa30F...` (old PaymentManager) | Deployed | Still active (pre-RC11) |

---

## 7. Error Chain Summary

```
npm run deploy:testnet
  └─ tools/deploy-testnet.mjs
       └─ forge script script/DeployAll.s.sol --broadcast
            ├─ [SIMULATION] Artifact written to broadcast/ with tx data
            ├─ [BROADCAST] 6 transactions submitted to RPC
            │    └─ maxFeePerGas = 1 wei  ← ROOT CAUSE
            ├─ [MEMPOOL] All 6 accepted by RPC but never mined
            └─ [TIMEOUT] Process killed after 5 min, no receipts received
```

---

## 8. Resolution Steps

### Step 1 — Cancel stuck transactions

Send replacement 0-value transactions from the deployer for each stuck nonce (11–16) with a realistic gas price:

```bash
# For each nonce 11 through 16, send a self-transfer with higher gas:
cast send --rpc-url https://bsc-testnet-rpc.publicnode.com \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --nonce <NONCE> \
  --gas-price 2000000000 \
  0x4ccE54BFeE344442Af2018fb89A1c185C60D29dc \
  --value 0
```

Alternatively, wait for the RPC mempool to drop them (may take hours).

### Step 2 — Fund deployer with tBNB

```
Current: 0.00344 tBNB
Recommended: ≥ 0.02 tBNB
Faucet: https://testnet.bnbchain.org/faucet-smart
```

### Step 3 — Redeploy with explicit gas price

The `deploy-testnet.mjs` script needs to pass gas-price flags. Either edit it or run forge directly:

```bash
forge script script/DeployAll.s.sol \
  --rpc-url https://bsc-testnet-rpc.publicnode.com \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --with-gas-price 1000000000 \
  --priority-gas-price 100000000 \
  --gas-estimate-multiplier 150 \
  -vvvv
```

### Step 4 — After successful deployment

```bash
npm run postdeploy:testnet
```
