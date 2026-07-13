# RC16.4 — Mock USDT Mint Report (BSC Testnet)

## Summary

| Field | Value |
|-------|-------|
| **Action** | Mint 1,000 Mock USDT |
| **Network** | BNB Smart Chain Testnet (Chain ID: 97) |
| **RPC Used** | `https://bsc-testnet-rpc.publicnode.com` |

---

## Contract

| Property | Value |
|----------|-------|
| **MockUSDT Address** | `0x701B81ea7F71a3c403cb53A6d465c37D96187E7f` |
| **Source** | `contracts/mocks/MockUSDT.sol` |
| **Decimals** | 18 |
| **Mint Function** | `mint(address to, uint256 amount) external onlyOwner` |
| **Owner** | `0x4ccE54BFeE344442Af2018fb89A1c185C60D29dc` |

---

## Mint Transaction

| Property | Value |
|----------|-------|
| **Function Called** | `mint(address,uint256)` |
| **Recipient** | `0x2a80fe325c1F14a2f50DAac9F8947c740C7B930d` |
| **Amount (raw)** | `1000000000000000000000` |
| **Amount (formatted)** | 1,000 USDT |
| **Sender (deployer)** | `0x4ccE54BFeE344442Af2018fb89A1c185C60D29dc` |
| **Transaction Hash** | `0x2880b0dcb26db662c4845c79203d0a61c4dd3b9239bd68c06823d7f16f64c8f0` |
| **Block Number** | `118938902` |
| **Gas Used** | 57,152 |
| **Gas Price** | 1 gwei (effective) |
| **Tx Type** | 2 (EIP-1559) |
| **Status** | ✅ Success |

---

## Verification (Post-Mint)

| Check | Value |
|-------|-------|
| **Recipient `balanceOf`** | `1000000000000000000000` (1,000 USDT) ✅ |
| **`totalSupply`** | `2000000000000000000000` (2,000 USDT) ✅ |

## Errors Encountered

None. The transaction completed successfully on the first attempt.

---

## Commands Used

```bash
# Check contract code exists
cast codesize 0x701B81ea7F71a3c403cb53A6d465c37D96187E7f --rpc-url https://bsc-testnet-rpc.publicnode.com

# Verify owner
cast call 0x701B81ea7F71a3c403cb53A6d465c37D96187E7f "owner()(address)" --rpc-url https://bsc-testnet-rpc.publicnode.com

# Mint 1,000 USDT
cast send 0x701B81ea7F71a3c403cb53A6d465c37D96187E7f \
  "mint(address,uint256)" \
  0x2a80fe325c1F14a2f50DAac9F8947c740C7B930d \
  1000000000000000000000 \
  --rpc-url https://bsc-testnet-rpc.publicnode.com \
  --private-key <DEPLOYER_PK>

# Verify balance
cast call 0x701B81ea7F71a3c403cb53A6d465c37D96187E7f \
  "balanceOf(address)(uint256)" \
  0x2a80fe325c1F14a2f50DAac9F8947c740C7B930d \
  --rpc-url https://bsc-testnet-rpc.publicnode.com

# Verify total supply
cast call 0x701B81ea7F71a3c403cb53A6d465c37D96187E7f \
  "totalSupply()(uint256)" \
  --rpc-url https://bsc-testnet-rpc.publicnode.com
```
