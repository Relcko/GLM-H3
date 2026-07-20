import type { Address } from "@relcko/types";
import type { ChainConfig, TokenConfig, BlockchainConfig } from "../types";

function addr(s: string): Address {
  return s as unknown as Address;
}

export const SUPPORTED_CHAINS: readonly ChainConfig[] = [
  {
    chainId: 56,
    chainName: "BNB Smart Chain",
    rpcUrl: "https://bsc-dataseed.binance.org",
    explorerUrl: "https://bscscan.com",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    requiredConfirmations: 12,
    confirmationTimeoutMs: 120_000,
  },
  {
    chainId: 97,
    chainName: "BNB Smart Chain Testnet",
    rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545",
    explorerUrl: "https://testnet.bscscan.com",
    nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
    requiredConfirmations: 6,
    confirmationTimeoutMs: 60_000,
  },
  {
    chainId: 137,
    chainName: "Polygon",
    rpcUrl: "https://polygon-rpc.com",
    explorerUrl: "https://polygonscan.com",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    requiredConfirmations: 64,
    confirmationTimeoutMs: 180_000,
  },
];

export const SUPPORTED_TOKENS: readonly TokenConfig[] = [
  { address: addr("0x55d398326f99059fF775485246999027B3197955"), symbol: "USDT", decimals: 18, chainId: 56 },
  { address: addr("0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"), symbol: "USDC", decimals: 18, chainId: 56 },
  { address: addr("0x337610d27c682E347C9cD60BD4b3b107C9d34dDd"), symbol: "RLKO", decimals: 18, chainId: 56 },
  { address: addr("0x337610d27c682E347C9cD60BD4b3b107C9d34dDd"), symbol: "RLKO", decimals: 18, chainId: 97 },
  { address: addr("0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"), symbol: "USDC", decimals: 6, chainId: 137 },
  { address: addr("0xc2132D05D31c914a87C6611C10748AEb04B58e8F"), symbol: "USDT", decimals: 6, chainId: 137 },
];

export const DEFAULT_BLOCKCHAIN_CONFIG: BlockchainConfig = {
  chains: SUPPORTED_CHAINS,
  tokens: SUPPORTED_TOKENS,
  defaultChainId: 97,
  maxRetries: 3,
  retryDelayMs: 5_000,
};

export function getChainConfig(chainId: number): ChainConfig | undefined {
  return SUPPORTED_CHAINS.find(c => c.chainId === chainId);
}

export function isChainSupported(chainId: number): boolean {
  return SUPPORTED_CHAINS.some(c => c.chainId === chainId);
}

export function getTokenConfig(address: string, chainId: number): TokenConfig | undefined {
  return SUPPORTED_TOKENS.find(t => t.address.toLowerCase() === address.toLowerCase() && t.chainId === chainId);
}

export function getExplorerTxUrl(chainId: number, txHash: string): string {
  const chain = getChainConfig(chainId);
  if (!chain) return "";
  return `${chain.explorerUrl}/tx/${txHash}`;
}
