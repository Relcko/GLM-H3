"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { WalletBalance, WalletTransaction } from "../types";

const MOCK_BALANCE: WalletBalance = {
  rlko: 15_842,
  eth: 12.5,
  usdc: 45_000,
  usdt: 12_500,
  totalUsdValue: 198_420,
};

const MOCK_TRANSACTIONS: WalletTransaction[] = [
  { hash: "0xabc123...def", type: "investment", status: "confirmed", amount: 35_625, token: "USDC", from: "0x742d...bD18", to: "Relcko Protocol", timestamp: "2024-03-15T10:30:00Z", gasUsed: 120_000, gasPrice: 25 },
  { hash: "0xdef456...ghi", type: "dividend", status: "confirmed", amount: 1_425, token: "USDC", from: "Relcko Protocol", to: "0x742d...bD18", timestamp: "2024-06-01T14:00:00Z", gasUsed: 85_000, gasPrice: 22 },
  { hash: "0xghi789...jkl", type: "purchase", status: "confirmed", amount: 5_000, token: "RLKO", from: "0x742d...bD18", to: "Uniswap V3", timestamp: "2024-02-10T09:15:00Z", gasUsed: 150_000, gasPrice: 28 },
  { hash: "0xjkl012...mno", type: "dividend", status: "confirmed", amount: 2_375, token: "USDC", from: "Relcko Protocol", to: "0x742d...bD18", timestamp: "2024-07-20T14:00:00Z", gasUsed: 82_000, gasPrice: 20 },
  { hash: "0xmno345...pqr", type: "transfer", status: "confirmed", amount: 1_000, token: "USDT", from: "0x742d...bD18", to: "0x8ba1...D72", timestamp: "2024-08-05T11:45:00Z", gasUsed: 95_000, gasPrice: 24 },
  { hash: "0xpqr678...stu", type: "stake", status: "confirmed", amount: 2_500, token: "RLKO", from: "0x742d...bD18", to: "Relcko Staking", timestamp: "2024-04-01T08:00:00Z", gasUsed: 130_000, gasPrice: 26 },
  { hash: "0xpqr678...stv", type: "claim", status: "pending", amount: 450, token: "USDC", from: "Relcko Staking", to: "0x742d...bD18", timestamp: new Date().toISOString(), gasUsed: 0, gasPrice: 0 },
];

export function useWalletBalance() {
  return useQuery({
    queryKey: ["investor", "wallet", "balance"],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      return MOCK_BALANCE;
    },
    staleTime: 30_000,
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: ["investor", "wallet", "transactions"],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 500));
      return MOCK_TRANSACTIONS;
    },
    staleTime: 30_000,
  });
}

export function useTransferTokens() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ to, amount, token }: { to: string; amount: number; token: string }) => {
      await new Promise((r) => setTimeout(r, 2000));
      return { to, amount, token, hash: "0x" + Math.random().toString(16).slice(2), status: "confirmed" };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investor", "wallet"] });
    },
  });
}
