# Purchase Settlement Audit

## Transaction

```
Hash:   0xe3245da84fe9b46bbd24256c2b0c60d29a5cd67caa2195c8e6f93508a38abdfe
Network: BSC Testnet (chain 97)
Block:   118766410
Status:  SUCCESS
```

## 1. Transaction Decode

| Field | Value |
|-------|-------|
| From (buyer) | `0x2a80fe325c1F14a2f50DAac9F8947c740C7B930d` |
| To (contract) | `0x6B2fa30F5a9aAB5cE78558F3c4EA9217eC21D431` (PaymentManager) |
| Value | 0.02 BNB |
| Function selector | `0x84ecec16` → **`buyWithNative()`** |
| Gas used | 114,386 |

The selector `0x84ecec16` = `keccak256("buyWithNative()")[0..4]` matches the deployed contract.

## 2. Emitted Events (1 log)

**Event:** `TokensPurchased(address indexed buyer, address indexed paymentToken, uint256 paymentAmount, uint256 tokenAmount, uint256 stage)`

Signature hash: `0x377aadedb6b2a771959584d10a6a36eccb5f56b4eb3a48525f76108d2660d8d4`

| Parameter | Value |
|-----------|-------|
| buyer (topic[1]) | `0x2a80fe325c1F14a2f50DAac9F8947c740C7B930d` |
| paymentToken (topic[2]) | `0x0000...0000` (= native BNB) |
| paymentAmount | 11.57474 USDT (USDT-equivalent via oracle) |
| tokenAmount | 10.064991304347826086 RLKO |
| stage | 0 |

**No other events emitted.** Specifically, **no ERC20 Transfer event** from the RLKO token contract (`0x4359C08b48c2c9dAe6BFB14F08110d264F30A4e5`).

## 3. RLKO Transfer Event

**Does NOT exist.** The RLKO token contract emitted zero logs.

## 4. PaymentReceived / TokensPurchased Event

**Exists** (verified above). The contract correctly recorded the sale in its internal state.

## 5. Buyer Address Verified

`0x2a80fe325c1F14a2f50DAac9F8947c740C7B930d` — matches the `from` field and the event's `buyer` topic.

## 6. Transferred RLKO Amount

**Zero.** No RLKO tokens were transferred to the buyer.

## 7. On-Chain balanceOf(buyer)

```
balanceOf(0x2a80fe325c1F14a2f50DAac9F8947c740C7B930d) = 0 RLKO
```

Called directly against RLKO contract (`0x4359C08b48c2c9dAe6BFB14F08110d264F30A4e5`) on BSC Testnet RPC.

## 8. Data Reconciliation

| Source | Value |
|--------|-------|
| Explorer (on-chain `balanceOf`) | 0 RLKO |
| Direct RPC `balanceOf(buyer)` | 0 RLKO |
| Dashboard display | 0 RLKO |

**All three agree: buyer has 0 RLKO.**

## Root Cause

**The PaymentManager contract never transfers RLKO tokens.**

Source: `contracts/PaymentManager.sol`, lines 457–480 (`_buyWithNative()`) and lines 421–446 (`buyWithToken()`):

```solidity
function _buyWithNative(address buyer, uint256 nativeAmount) internal {
    // ...
    // ✅ USDT amount calculated via oracle
    // ✅ Contribution limits enforced
    // ✅ Token amount calculated
    // ✅ Stage supply cap enforced

    // ── Effects ──
    userContributions[buyer][currentStageIndex] = contribution;   // ✅ Recorded
    s.sold += tokenAmount;                                        // ✅ Updated
    totalRaised += usdtAmount;                                    // ✅ Updated
    totalTokensSold += tokenAmount;                               // ✅ Updated

    emit TokensPurchased(buyer, address(0), usdtAmount, tokenAmount, currentStageIndex);  // ✅ Emitted

    // ❌ SALE_TOKEN.transfer(buyer, tokenAmount)  — NEVER CALLED
}
```

Both purchase functions:
1. ✅ Collect payment (USDT `safeTransferFrom` or native BNB)
2. ✅ Update internal accounting (user contribution, stage sold, total raised)
3. ✅ Emit `TokensPurchased` event
4. ❌ **Never call `SALE_TOKEN.transfer(buyer, tokenAmount)`**

The PaymentManager holds **10,000 RLKO** (confirmed on-chain), enough to fulfill the 10.06499 RLKO purchase, but the transfer logic was simply never written.

## How to Fix

Add a `SALE_TOKEN.transfer(buyer, tokenAmount)` call in both `_buyWithNative()` and `buyWithToken()` after the state updates and before/after the event emission. Example patch for `_buyWithNative()` at line 479:

```solidity
// After emission:
SALE_TOKEN.transfer(buyer, tokenAmount);
```

And for `buyWithToken()` at line 445 (before or after the event):

```solidity
// After USDT.safeTransferFrom:
SALE_TOKEN.transfer(msg.sender, tokenAmount);
emit TokensPurchased(msg.sender, paymentToken, paymentAmount, tokenAmount, currentStageIndex);
```

## Contract State Summary

| Metric | Value |
|--------|-------|
| Stage 1 price | 1.15 USDT per RLKO |
| Stage 1 supply | 10,000 RLKO |
| Stage 1 sold | 97.52 RLKO |
| Total raised | 112.15 USDT |
| PM RLKO balance | 10,000 RLKO |
| Buyer RLKO balance | **0 RLKO** |
| Buyer userInvestment | **11.57474 USDT** (correctly recorded) |
