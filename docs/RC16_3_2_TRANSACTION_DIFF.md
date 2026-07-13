# RC16.3.2 — Runtime Transaction Comparison

## Objective

Compare the **exact** transaction object that wagmi passes to MetaMask (logged via `writeContract()` instrumentation) with the **same transaction simulated via Foundry's `cast send --dry-run`**.

Any discrepancy between the two indicates a field that MetaMask is either injecting, overriding, or omitting, which can cause simulation/signing failures.

---

## How to Collect Data

### 1. From the Browser (wagmi → MetaMask)

1. Open the browser DevTools console **before** clicking "Buy" or "Approve".
2. Execute the purchase flow normally.
3. The console will print a structured JSON log prefixed with:
   - `[RC16.3.2] writeContract instrument (native)`
   - `[RC16.3.2] writeContract instrument (token)`
   - `[RC16.3.2] writeContract instrument (approve)`
   - `[RC16.3.2] writeContract instrument (handleBuy native)`
   - `[RC16.3.2] writeContract instrument (handleBuy token)`

4. Right-click the logged JSON → **Copy object** (or copy the console output).
5. Save to a local file, e.g. `wagmi_tx.json`.

> **Note**: If MetaMask shows a simulation failure, **do not confirm** the tx. The log will still contain the exact object wagmi sent.

### 2. From Foundry (`cast send --dry-run`)

Run the following command, replacing placeholders with values from the wagmi log:

```bash
cast send --dry-run \
  --rpc-url <RPC_URL> \
  --from <ACCOUNT> \
  --value <VALUE> \
  --private-key <ANY_KEY> \
  <CONTRACT_ADDRESS> \
  "buyWithNative()" \
  --chain <CHAIN_ID>
```

For token purchases:

```bash
cast send --dry-run \
  --rpc-url <RPC_URL> \
  --from <ACCOUNT> \
  --private-key <ANY_KEY> \
  <CONTRACT_ADDRESS> \
  "buyWithToken(address,uint256)" <TOKEN_ADDRESS> <RAW_AMOUNT> \
  --chain <CHAIN_ID>
```

For approve:

```bash
cast send --dry-run \
  --rpc-url <RPC_URL> \
  --from <ACCOUNT> \
  --private-key <ANY_KEY> \
  <TOKEN_ADDRESS> \
  "approve(address,uint256)" <SPENDER> <RAW_AMOUNT> \
  --chain <CHAIN_ID>
```

**RPC endpoints** (from config):

| Chain | RPC |
|-------|-----|
| BSC (56) | `https://bsc-dataseed.binance.org/` |
| BSC Testnet (97) | (default from wagmi chain config) |
| Polygon (137) | `https://polygon-bor.publicnode.com` |

---

## Fields to Compare

Place the actual values in the table below after collecting both sides.

| # | Field | wagmi/MetaMask | Foundry `cast --dry-run` | Match? |
|---|-------|---------------|--------------------------|--------|
| 1 | **calldata** (`data`) | `0x...` | `0x...` | |
| 2 | **msg.value** (`value`) | `0x...` / `...` wei | `0x...` / `...` wei | |
| 3 | **sender** (`from`) | `0x...` | `0x...` | |
| 4 | **to** (`address`) | `0x...` | `0x...` | |
| 5 | **nonce** | `...` | `...` | |
| 6 | **gas limit** | `...` | `...` | |
| 7 | **gas price / maxFeePerGas** | `...` | `...` | |
| 8 | **maxPriorityFeePerGas** | `...` | `...` | |
| 9 | **access list** | `[]` / `...` | `[]` / `...` | |
| 10 | **chain id** | `...` | `...` | |
| 11 | **type** (0=legacy, 2=EIP-1559) | `...` | `...` | |

---

## Diagnosis

If MetaMask simulation fails:

1. **Identify the FIRST field** in the table above where the values differ.
2. That field is the likely root cause of the simulation failure.
3. Common causes:
   - **`value` mismatch** — MetaMask may interpret `value` differently (e.g., expecting it in the tx params vs. sending 0).
   - **`gas` / `gasLimit`** — wagmi may not pass gas estimates; MetaMask estimates them internally and may compute a different value.
   - **`nonce`** — wagmi leaves nonce unset (MetaMask fills it); if `cast send` gets a different nonce, the simulation context differs.
   - **EIP-1559 fields** — if wagmi omits `maxFeePerGas` / `maxPriorityFeePerGas`, MetaMask injects its own; `cast send` may use legacy gas pricing.
   - **`chainId`** — a mismatch here causes MetaMask to reject the tx outright.

---

## Results

<!-- Fill in after collecting data -->

| # | Field | wagmi Value | Foundry Value | Match |
|---|-------|-------------|---------------|-------|
| 1 | calldata | | | |
| 2 | msg.value | | | |
| 3 | sender | | | |
| 4 | to | | | |
| 5 | nonce | | | |
| 6 | gas limit | | | |
| 7 | maxFeePerGas | | | |
| 8 | maxPriorityFeePerGas | | | |
| 9 | access list | | | |
| 10 | chain id | | | |
| 11 | type | | | |

**First differing field:**  
**Root cause analysis:**  
**Action required:**
