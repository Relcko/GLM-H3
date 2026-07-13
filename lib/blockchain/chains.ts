import { bsc, bscTestnet, polygon } from "wagmi/chains";
import type { Chain } from "wagmi/chains";

export const CHAIN_IDS = {
  bsc: 56,
  bscTestnet: 97,
  polygon: 137,
} as const;

export type SupportedChainId = (typeof CHAIN_IDS)[keyof typeof CHAIN_IDS];

export const DEFAULT_CHAIN_ID = CHAIN_IDS.bscTestnet;

export const CHAIN_NAMES: Record<number, string> = {
  [CHAIN_IDS.bsc]: "BSC",
  [CHAIN_IDS.bscTestnet]: "BSC Testnet",
  [CHAIN_IDS.polygon]: "Polygon",
};

export const SUPPORTED_CHAINS: Chain[] = [bscTestnet, bsc, polygon];

export const SUPPORTED_CHAIN_IDS: number[] = [97, 56, 137];

export function isChainSupported(id: number): boolean {
  return SUPPORTED_CHAIN_IDS.includes(id);
}

export function getChainName(id: number): string {
  return CHAIN_NAMES[id] ?? `Chain ${id}`;
}
