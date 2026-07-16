"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Proposal, VoteChoice } from "../types";

const MOCK_PROPOSALS: Proposal[] = [
  {
    id: "prop-1", title: "Treasury Allocation Q3 2026",
    description: "Approve the allocation of 2.5M RLKO from the treasury for strategic property acquisitions in Q3 2026.",
    type: "treasury", status: "active", creator: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
    createdAt: "2026-06-15", endDate: "2026-07-15",
    forVotes: 1_850_000, againstVotes: 420_000, abstainVotes: 120_000,
    quorum: 2_000_000, totalVotes: 2_390_000, voterParticipation: 23.9,
    userVote: "for",
  },
  {
    id: "prop-2", title: "Protocol Upgrade v3.2",
    description: "Implement protocol upgrade including enhanced voting mechanisms, improved dividend distribution, and gas optimization.",
    type: "upgrade", status: "active", creator: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    createdAt: "2026-06-20", endDate: "2026-07-10",
    forVotes: 3_200_000, againstVotes: 180_000, abstainVotes: 50_000,
    quorum: 2_000_000, totalVotes: 3_430_000, voterParticipation: 34.3,
  },
  {
    id: "prop-3", title: "Reduce Minimum Investment Threshold",
    description: "Proposal to reduce the minimum investment threshold from $1,000 to $500 to increase accessibility for retail investors.",
    type: "parameter", status: "passed", creator: "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
    createdAt: "2026-05-01", endDate: "2026-06-01",
    forVotes: 4_500_000, againstVotes: 800_000, abstainVotes: 200_000,
    quorum: 2_500_000, totalVotes: 5_500_000, voterParticipation: 55.0,
    userVote: "for",
  },
  {
    id: "prop-4", title: "Strategic Partnership with GreenBuild REIT",
    description: "Approve strategic partnership and joint investment in sustainable commercial properties across Q4 2026.",
    type: "strategic", status: "active", creator: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
    createdAt: "2026-07-01", endDate: "2026-07-22",
    forVotes: 980_000, againstVotes: 210_000, abstainVotes: 40_000,
    quorum: 1_500_000, totalVotes: 1_230_000, voterParticipation: 12.3,
  },
  {
    id: "prop-5", title: "Community Fund for Educational Programs",
    description: "Establish a community fund allocating 150,000 RLKO annually for real estate investment education and financial literacy programs.",
    type: "community", status: "pending", creator: "0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8",
    createdAt: "2026-07-05", endDate: "2026-07-25",
    forVotes: 0, againstVotes: 0, abstainVotes: 0,
    quorum: 1_000_000, totalVotes: 0, voterParticipation: 0,
  },
  {
    id: "prop-6", title: "Q2 2026 Dividend Distribution Plan",
    description: "Approve the distribution of $1.8M in dividends to all RLKO holders based on Q2 2026 property income.",
    type: "treasury", status: "executed", creator: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
    createdAt: "2026-04-01", endDate: "2026-04-20",
    forVotes: 5_800_000, againstVotes: 150_000, abstainVotes: 50_000,
    quorum: 2_000_000, totalVotes: 6_000_000, voterParticipation: 60.0,
    userVote: "for",
  },
];

export function useProposals() {
  return useQuery({
    queryKey: ["investor", "governance", "proposals"],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 500));
      return MOCK_PROPOSALS;
    },
    staleTime: 30_000,
  });
}

export function useProposal(id: string) {
  return useQuery({
    queryKey: ["investor", "governance", "proposals", id],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 300));
      const p = MOCK_PROPOSALS.find((p) => p.id === id);
      if (!p) throw new Error("Proposal not found");
      return p;
    },
    enabled: !!id,
  });
}

export function useCastVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ proposalId, vote }: { proposalId: string; vote: VoteChoice }) => {
      await new Promise((r) => setTimeout(r, 1000));
      return { proposalId, vote, success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investor", "governance"] });
    },
  });
}

export function useGovernanceStats() {
  return useQuery({
    queryKey: ["investor", "governance", "stats"],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      return {
        totalProposals: 24,
        activeProposals: 3,
        voterParticipation: 34.2,
        userVotingPower: 15_000,
        totalVotingPower: 10_000_000,
        delegatedTo: null as string | null,
        delegatedFrom: 3,
      };
    },
    staleTime: 60_000,
  });
}
