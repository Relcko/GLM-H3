"use client";

import { useQuery } from "@tanstack/react-query";
import type { InvestorMetrics } from "../types";

const MOCK_METRICS: InvestorMetrics = {
  totalPortfolioValue: 342_800,
  totalReturn: 58_300,
  returnPercentage: 20.5,
  activeInvestments: 8,
  pendingTransactions: 2,
  unreadNotifications: 5,
  pendingProposals: 3,
  nextDistribution: { amount: 1_425, date: "2026-08-01" },
};

export function useInvestorMetrics() {
  return useQuery({
    queryKey: ["investor", "metrics"],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 300));
      return MOCK_METRICS;
    },
    staleTime: 15_000,
  });
}
