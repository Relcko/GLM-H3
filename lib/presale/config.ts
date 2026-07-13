/**
 * Presale configuration — single source of truth.
 *
 * Extracted from the compiled RLKO Presale dist bundle. The blockchain
 * remains the source of truth for live values (stage, rate, raised,
 * remaining); this file only holds static network/contract metadata.
 *
 * Contract addresses and token config are taken verbatim from the bundle.
 * RPC overrides are read from VITE_-style env vars (here: NEXT_PUBLIC_*).
 */

import { CHAIN_IDS, DEFAULT_CHAIN_ID, type SupportedChainId } from "@/lib/blockchain/chains";
export { CHAIN_IDS, DEFAULT_CHAIN_ID };
export type { SupportedChainId };

/** Presale contract addresses keyed by chain id (from dist bundle). */
export const PRESALE_CONTRACTS: Record<number, `0x${string}`> = {
  [CHAIN_IDS.bscTestnet]: "0x7226E9d67B93DEd05C0D2595E7a5d9022b1Af106",
  [CHAIN_IDS.bsc]: "0xc8cB05330aa1789bceEfC2AF4d3dEec7c7e4c339",
  [CHAIN_IDS.polygon]: "0x727548Fe442a036d0D6a0925A43Fc825a4162967",
};

/** Native + stablecoin payment tokens per chain (from dist bundle). */
export interface PaymentToken {
  symbol: string;
  address: `0x${string}` | null; // null = native
  decimals: number;
  name: string;
}

export const PAYMENT_TOKENS: Record<number, PaymentToken[]> = {
  [CHAIN_IDS.bsc]: [
    { symbol: "BNB", address: null, decimals: 18, name: "Binance Coin" },
    {
      symbol: "USDT",
      address: "0x55d398326f99059ff775485246999027b3197955",
      decimals: 18,
      name: "Tether USD",
    },
  ],
  [CHAIN_IDS.bscTestnet]: [
    { symbol: "tBNB", address: null, decimals: 18, name: "Binance Coin" },
    {
      symbol: "USDT",
      address: "0x701B81ea7F71a3c403cb53A6d465c37D96187E7f",
      decimals: 18,
      name: "Tether USD",
    },
  ],
  [CHAIN_IDS.polygon]: [
    { symbol: "POL", address: null, decimals: 18, name: "POL (ex-MATIC)" },
    {
      symbol: "USDT",
      address: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
      decimals: 6,
      name: "Tether USD",
    },
  ],
};

/** RPC overrides (optional) — read from NEXT_PUBLIC_* env vars. */
export const RPC_OVERRIDES: Partial<Record<number, string>> = {
  [CHAIN_IDS.bsc]: process.env.NEXT_PUBLIC_BSC_RPC || "https://bsc-dataseed.binance.org/",
  [CHAIN_IDS.polygon]:
    process.env.NEXT_PUBLIC_POLYGON_RPC || "https://polygon-bor.publicnode.com",
};

/** Tokenomics / sale metadata (from dist bundle). */
export const SALE_META = {
  tokenSymbol: "RLKO",
  tokenName: "RELCKO",
  /** Total allocation shown in tokenomics (from dist bundle `total: 2e5`). */
  totalAllocation: 200_000,
  /** Payment token always shown as the quote currency. */
  displayPriceUnit: "USDT",
} as const;

/** External links (from dist bundle). */
export const LINKS = {
  whitepaper: "https://relcko.b-cdn.net/wp-content/uploads/2023/12/Relcko-Whitepaper-V1.0-Min.pdf",
  telegram: "https://t.me/relckoofficial/",
  twitter: "https://twitter.com/relckocoin/",
} as const;

/** Returns the payment tokens available for a given chain id. */
export function getPaymentTokens(chainId: number): PaymentToken[] {
  return PAYMENT_TOKENS[chainId] ?? [];
}

/** Returns the presale contract for a chain (or null if unsupported). */
export function getPresaleContract(chainId: number): `0x${string}` | null {
  return PRESALE_CONTRACTS[chainId] ?? null;
}
