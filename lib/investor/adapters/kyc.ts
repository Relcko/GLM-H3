"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { KYCStatus, KYCDocument } from "../types";

const MOCK_KYC: KYCStatus = {
  status: "basic",
  verifiedAt: "2024-02-15T10:00:00Z",
  documents: [
    { id: "doc-1", type: "Government ID", status: "approved", uploadedAt: "2024-02-10T08:30:00Z", reviewedAt: "2024-02-15T10:00:00Z" },
    { id: "doc-2", type: "Proof of Address", status: "approved", uploadedAt: "2024-02-10T08:35:00Z", reviewedAt: "2024-02-15T10:05:00Z" },
    { id: "doc-3", type: "Source of Funds", status: "pending", uploadedAt: "2024-07-01T12:00:00Z" },
  ],
  verificationSteps: [
    { id: "email", label: "Email Verification", completed: true, current: false },
    { id: "basic", label: "Basic Identity", completed: true, current: false },
    { id: "advanced", label: "Advanced Verification", completed: false, current: true },
    { id: "institutional", label: "Institutional Tier", completed: false, current: false },
  ],
};

export function useKYCStatus() {
  return useQuery({
    queryKey: ["investor", "kyc", "status"],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      return MOCK_KYC;
    },
    staleTime: 60_000,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, file }: { type: string; file: File }) => {
      await new Promise((r) => setTimeout(r, 2000));
      return { id: "doc-" + Date.now(), type, status: "pending" as const, uploadedAt: new Date().toISOString() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investor", "kyc"] });
    },
  });
}

export function useKYCStats() {
  return useQuery({
    queryKey: ["investor", "kyc", "stats"],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 300));
      return {
        totalVerified: 4_520,
        pendingReview: 342,
        averageApprovalTime: "2.4 days",
        tierDistribution: { unverified: 18, basic: 45, advanced: 28, institutional: 9 },
      };
    },
    staleTime: 300_000,
  });
}
