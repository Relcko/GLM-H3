# RC16.1.1 — Purchase Panel Layout Fix

## Summary
Fixed the Purchase Panel layout regression introduced in RC16.1. The Wallet section and Purchase controls now display correctly on BSC Testnet (chain 97).

## What Was Fixed

### 1. Wallet Cards — Equal Width / Height / No Wrapping
- Added `items-stretch` to the grid so all cards share equal height
- Added `flex flex-col` to each card for consistent stretching
- Added `truncate whitespace-nowrap` to all value text nodes to prevent wrapping

### 2. Address — Single Line with Ellipsis
- Address value now has `truncate whitespace-nowrap` so it stays on one line

### 3. Network — Displays "BNB Smart Chain Testnet"
- For `chainId === DEFAULT_CHAIN_ID` (97), explicitly displays `"BNB Smart Chain Testnet"` with `truncate whitespace-nowrap`

### 4. Wrong Network Warning
- Condition changed from `!isBSC` (was `chainId !== 56`) to `!isDefaultChain` (now `chainId !== DEFAULT_CHAIN_ID`)
- When connected to chain 97 (BSC Testnet), the warning is hidden
- When connected to any other chain, the warning prompts the user to switch to the default chain

### 5. Purchase Controls — Now Visible on BSC Testnet
- Buy form visibility condition changed from `isBSC` (chain 56) to `isDefaultChain` (chain 97)
- Payment Token selector, balance, amount input, percentage chips, purchase summary, Continue button all restore correctly on BSC Testnet

### 6. 25 / 50 / 75 / MAX Percentage Chips
- Added a row of quick-select buttons between the Payment Token selector and the Amount input
- Each chip sets the input to the corresponding percentage of the user's token balance
- Only visible when `tokenBal` is available and no transaction is active (`!active`)

## Files Modified
- `components/presale/PresalePurchasePanel.tsx`

## Build Result
- `npm run build` — Clean (18s, TypeScript passed)
- All routes generated successfully

## Verification Steps
1. Connect wallet on BSC Testnet (chain 97) → Wallet cards display, no wrong-network warning, buy form visible
2. Wallet cards are equal width/height, address is truncated on one line
3. Network shows "BNB Smart Chain Testnet"
4. 25/50/75/MAX chips set amount correctly
5. Switch to a non-default chain → Wrong network warning appears, buy form hidden
