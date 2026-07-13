# USDT Funding Report — BSC Testnet

| Field | Value |
|-------|-------|
| **Network** | BNB Smart Chain Testnet (Chain ID 97) |
| **Token** | Mock USDT (`0x701B81ea7F71a3c403cb53A6d465c37D96187E7f`) |
| **Method used** | `transfer()` — deployer already had sufficient balance |
| **Transaction Hash** | `0x2c5c92246926a7726827a98c4c8b2f5b6c076b960da72da3c257ca47a3ee466e` |
| **Block Number** | `118843893` |
| **Sender (deployer)** | `0x4ccE54BFeE344442Af2018fb89A1c185C60D29dc` |
| **Receiver (test wallet)** | `0x2a80fe325c1F14a2f50DAac9F8947c740C7B930d` |
| **Amount Transferred** | 100 USDT (100,000,000,000,000,000,000 wei) |
| **Final USDT Balance (receiver)** | 100 USDT |
| **Transaction Status** | ✅ Success |

### Verification

```bash
cast call 0x701B81ea7F71a3c403cb53A6d465c37D96187E7f \
  "balanceOf(address)(uint256)" \
  0x2a80fe325c1F14a2f50DAac9F8947c740C7B930d \
  --rpc-url https://bsc-testnet-rpc.publicnode.com
# Result: 100000000000000000000 (100 USDT)
```
