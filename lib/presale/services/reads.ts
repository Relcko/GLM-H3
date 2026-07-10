"use client";

/**
 * Read services — the on-chain source of truth.
 *
 * Every live presale value flows through readContract() here. The UI must
 * read from these, never recompute pricing locally. (math.ts exists only
 * for optimistic UI estimates while a read is in flight.)
 *
 * Function names mirror abi.ts and MUST be verified against the deployed
 * contract on BscScan / PolygonScan before mainnet use.
 */

import { useReadContract } from "wagmi";
import { PRESALE_ABI, ERC20_ABI } from "../abi";
import { getPresaleContract, getPaymentTokens } from "../config";

/** Current bonding-curve stage index. */
export function usePresaleStage(chainId: number) {
  const address = getPresaleContract(chainId) ?? undefined;
  return useReadContract({ address, abi: PRESALE_ABI, functionName: "currentStage", chainId });
}

/** Price of 1 token in quote units (e.g. USDT), scaled by token decimals. */
export function useTokenPrice(chainId: number) {
  const address = getPresaleContract(chainId) ?? undefined;
  return useReadContract({ address, abi: PRESALE_ABI, functionName: "tokenPrice", chainId });
}

/** Remaining token supply in the current allocation. */
export function useTokensRemaining(chainId: number) {
  const address = getPresaleContract(chainId) ?? undefined;
  return useReadContract({ address, abi: PRESALE_ABI, functionName: "tokensRemaining", chainId });
}

/** Total raised amount in the quote token. */
export function useTotalRaised(chainId: number) {
  const address = getPresaleContract(chainId) ?? undefined;
  return useReadContract({ address, abi: PRESALE_ABI, functionName: "totalRaised", chainId });
}

/** The connected user's contributed amount (quote units). */
export function useUserInvestment(chainId: number, user: `0x${string}` | undefined) {
  const address = getPresaleContract(chainId) ?? undefined;
  return useReadContract({
    address,
    abi: PRESALE_ABI,
    functionName: "userInvestment",
    args: user ? [user] : undefined,
    chainId,
    query: { enabled: !!address && !!user },
  });
}

/** ERC20 allowance of the payment token granted to the presale contract. */
export function useTokenAllowance(
  chainId: number,
  tokenAddress: `0x${string}` | null,
  owner: `0x${string}` | undefined,
  spender: `0x${string}` | null
) {
  return useReadContract({
    address: tokenAddress ?? undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: owner && spender ? [owner, spender] : undefined,
    chainId,
    query: { enabled: !!tokenAddress && !!owner && !!spender },
  });
}

/** ERC20 balance of the connected user for the selected payment token. */
export function useTokenBalance(
  chainId: number,
  tokenAddress: `0x${string}` | null,
  owner: `0x${string}` | undefined
) {
  return useReadContract({
    address: tokenAddress ?? undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: owner ? [owner] : undefined,
    chainId,
    query: { enabled: !!tokenAddress && !!owner },
  });
}

/** Convenience: returns the payment tokens configured for a chain. */
export function paymentTokensFor(chainId: number) {
  return getPaymentTokens(chainId);
}
