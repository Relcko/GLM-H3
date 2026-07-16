"use client";

import { useQuery } from "@tanstack/react-query";
import type { Document } from "../types";

const MOCK_DOCUMENTS: Document[] = [
  { id: "doc-inv-1", title: "Luxury Tower Manhattan - Investment Agreement", type: "agreement", category: "Investment", size: 2_456_000, uploadedAt: "2024-03-15T10:00:00Z", status: "ready", signed: true, propertyId: "prop-1", propertyName: "Luxury Tower Manhattan" },
  { id: "doc-inv-2", title: "Silicon Valley Tech Hub - Purchase Agreement", type: "agreement", category: "Investment", size: 1_890_000, uploadedAt: "2024-01-20T09:00:00Z", status: "ready", signed: true, propertyId: "prop-2", propertyName: "Silicon Valley Tech Hub" },
  { id: "doc-st-1", title: "Q2 2026 Portfolio Statement", type: "statement", category: "Quarterly", size: 890_000, uploadedAt: "2026-07-01T12:00:00Z", status: "ready", signed: false },
  { id: "doc-st-2", title: "Q1 2026 Portfolio Statement", type: "statement", category: "Quarterly", size: 845_000, uploadedAt: "2026-04-01T12:00:00Z", status: "ready", signed: false },
  { id: "doc-tax-1", title: "2025 Tax Statement", type: "tax", category: "Annual", size: 1_200_000, uploadedAt: "2026-02-28T08:00:00Z", status: "ready", signed: false },
  { id: "doc-legal-1", title: "Terms of Service v3.2", type: "legal", category: "Platform", size: 340_000, uploadedAt: "2026-01-01T00:00:00Z", status: "ready", signed: true },
  { id: "doc-rpt-1", title: "Annual Market Report 2025", type: "report", category: "Market Research", size: 4_500_000, uploadedAt: "2026-01-15T10:00:00Z", status: "ready", signed: false },
  { id: "doc-rpt-2", title: "Property Performance Report - H1 2026", type: "report", category: "Performance", size: 2_100_000, uploadedAt: "2026-07-05T14:00:00Z", status: "generating", signed: false },
  { id: "doc-id-1", title: "Government ID - Passport", type: "identity", category: "KYC", size: 560_000, uploadedAt: "2024-02-10T08:30:00Z", status: "ready", signed: false },
  { id: "doc-id-2", title: "Proof of Address - Utility Bill", type: "identity", category: "KYC", size: 230_000, uploadedAt: "2024-02-10T08:35:00Z", status: "ready", signed: false },
];

export function useDocuments() {
  return useQuery({
    queryKey: ["investor", "documents"],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      return MOCK_DOCUMENTS;
    },
    staleTime: 60_000,
  });
}

export function useDocumentCategories() {
  return useQuery({
    queryKey: ["investor", "documents", "categories"],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 200));
      return [
        { id: "all", label: "All Documents", count: 10 },
        { id: "agreement", label: "Agreements", count: 2 },
        { id: "statement", label: "Statements", count: 2 },
        { id: "tax", label: "Tax Documents", count: 1 },
        { id: "legal", label: "Legal", count: 1 },
        { id: "report", label: "Reports", count: 2 },
        { id: "identity", label: "Identity", count: 2 },
      ];
    },
    staleTime: 300_000,
  });
}
