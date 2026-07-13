/**
 * Contract ABIs for the presale.
 *
 * NOTE ON ACCURACY: the compiled dist bundle does not expose the on-chain
 * ABI, so function NAMES below follow the most common Solidity presale
 * pattern. Before going live, verify each name/signature against the
 * verified source on BscScan / PolygonScan. Only `inputs`/`outputs`/`stateMutability`
 * need to match for `readContract` / `writeContract` to succeed.
 *
 * Read side (source of truth):
 *   - currentStage()      → number
 *   - tokenPrice()         → number  (price of 1 token in quote units)
 *   - tokensRemaining()    → bigint  (supply left in the current stage / total)
 *   - totalRaised()        → bigint  (amount raised in quote token)
 *   - userInvestment(addr) → bigint  (caller's contributed amount)
 *
 * Write side:
 *   - buyWithToken(token, amount)  → payable purchase using an ERC20
 *   - buyWithNative()              → payable purchase using native coin
 */

export const PRESALE_ABI = [
  // ---- Read: live presale state (on-chain source of truth) ----
  {
    type: "function",
    name: "currentStage",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "tokenPrice",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "tokensRemaining",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "totalRaised",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "userInvestment",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  // ---- View: purchase preview (live calculation) ----
  {
    type: "function",
    name: "previewPurchase",
    stateMutability: "view",
    inputs: [
      { name: "paymentAmount", type: "uint256" },
      { name: "isNative", type: "bool" },
    ],
    outputs: [
      { name: "usdtAmount", type: "uint256" },
      { name: "tokenAmount", type: "uint256" },
      { name: "stage", type: "uint256" },
      { name: "remainingSupply", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "nativeRateOverride",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  // ---- Write: purchase ----
  {
    type: "function",
    name: "buyWithToken",
    stateMutability: "nonpayable",
    inputs: [
      { name: "paymentToken", type: "address" },
      { name: "paymentAmount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "buyWithNative",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
] as const;

export { ERC20_ABI } from "@/lib/blockchain/erc20";
