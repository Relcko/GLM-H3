"use client";

import { useQuery } from "@tanstack/react-query";
import type { TreasurySnapshot } from "../types";

const MOCK_TREASURY: TreasurySnapshot = {
  totalAssets: 48_200_000,
  liquidAssets: 12_500_000,
  investedAssets: 35_700_000,
  pendingDistributions: 1_800_000,
  totalDistributed: 8_400_000,
  lastDistribution: "2026-06-15",
  nextDistribution: "2026-07-15",
  assetBreakdown: [
    { type: "Stablecoins (USDC/USDT)", value: 8_500_000, percentage: 17.6 },
    { type: "ETH", value: 2_800_000, percentage: 5.8 },
    { type: "RLKO Treasury Reserve", value: 1_200_000, percentage: 2.5 },
    { type: "Real Estate Assets", value: 35_700_000, percentage: 74.1 },
  ],
  distributionHistory: [
    { date: "2026-06-15", amount: 450_000, type: "Quarterly Dividend", status: "completed", recipients: 2_845, perToken: 0.045 },
    { date: "2026-03-15", amount: 420_000, type: "Quarterly Dividend", status: "completed", recipients: 2_710, perToken: 0.042 },
    { date: "2025-12-15", amount: 390_000, type: "Quarterly Dividend", status: "completed", recipients: 2_540, perToken: 0.039 },
    { date: "2025-09-15", amount: 360_000, type: "Quarterly Dividend", status: "completed", recipients: 2_380, perToken: 0.036 },
    { date: "2025-06-15", amount: 340_000, type: "Quarterly Dividend", status: "completed", recipients: 2_210, perToken: 0.034 },
  ],
};

export function useTreasurySnapshot() {
  return useQuery({
    queryKey: ["investor", "treasury", "snapshot"],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 500));
      return MOCK_TREASURY;
    },
    staleTime: 60_000,
  });
}
