"use client";

import { useQuery } from "@tanstack/react-query";
import type { PortfolioSummary, Investment } from "../types";

const MOCK_PORTFOLIO: PortfolioSummary = {
  totalInvested: 284_500,
  currentValue: 342_800,
  totalReturn: 58_300,
  returnPercentage: 20.5,
  activeInvestments: 8,
  totalProperties: 12,
  diversification: [
    { category: "Commercial Real Estate", value: 142_000, percentage: 41.4, color: "#3b82f6" },
    { category: "Residential", value: 98_000, percentage: 28.6, color: "#10b981" },
    { category: "Industrial", value: 52_000, percentage: 15.2, color: "#f59e0b" },
    { category: "Land Development", value: 38_000, percentage: 11.1, color: "#8b5cf6" },
    { category: "Mixed-Use", value: 12_800, percentage: 3.7, color: "#ec4899" },
  ],
  performanceHistory: Array.from({ length: 24 }, (_, i) => {
    const date = new Date(2024, i, 1);
    const base = 250_000 + i * 5_000 + Math.sin(i * 0.5) * 15_000;
    return { date: date.toISOString().slice(0, 7), value: Math.round(base) };
  }),
};

const MOCK_INVESTMENTS: Investment[] = [
  {
    id: "inv-1", propertyId: "prop-1", propertyName: "Luxury Tower Manhattan", propertyImage: "/images/properties/manhattan.jpg",
    tokensOwned: 250, tokenPrice: 142.50, investedAmount: 35_625, currentValue: 42_750,
    returnAmount: 7_125, returnPercentage: 20.0, status: "active",
    purchaseDate: "2024-03-15", nextDistribution: "2026-08-01",
    distributions: [
      { date: "2024-06-01", amount: 1_425, type: "rental", status: "paid" },
      { date: "2024-09-01", amount: 1_425, type: "rental", status: "paid" },
      { date: "2024-12-01", amount: 1_780, type: "dividend", status: "paid" },
    ],
  },
  {
    id: "inv-2", propertyId: "prop-2", propertyName: "Silicon Valley Tech Hub", propertyImage: "/images/properties/silicon.jpg",
    tokensOwned: 500, tokenPrice: 95.00, investedAmount: 47_500, currentValue: 61_750,
    returnAmount: 14_250, returnPercentage: 30.0, status: "active",
    purchaseDate: "2024-01-20", nextDistribution: "2026-07-15",
    distributions: [
      { date: "2024-04-20", amount: 2_375, type: "rental", status: "paid" },
      { date: "2024-07-20", amount: 2_375, type: "rental", status: "paid" },
    ],
  },
  {
    id: "inv-3", propertyId: "prop-3", propertyName: "Miami Beachfront Residences", propertyImage: "/images/properties/miami.jpg",
    tokensOwned: 180, tokenPrice: 210.00, investedAmount: 37_800, currentValue: 43_470,
    returnAmount: 5_670, returnPercentage: 15.0, status: "active",
    purchaseDate: "2024-05-01", nextDistribution: "2026-08-15",
    distributions: [{ date: "2024-08-01", amount: 1_512, type: "rental", status: "paid" }],
  },
  {
    id: "inv-4", propertyId: "prop-4", propertyName: "Austin Mixed-Use Development", propertyImage: "/images/properties/austin.jpg",
    tokensOwned: 350, tokenPrice: 78.50, investedAmount: 27_475, currentValue: 30_223,
    returnAmount: 2_748, returnPercentage: 10.0, status: "active",
    purchaseDate: "2024-06-10",
    distributions: [],
  },
  {
    id: "inv-5", propertyId: "prop-5", propertyName: "Chicago Logistics Park", propertyImage: "/images/properties/chicago.jpg",
    tokensOwned: 400, tokenPrice: 112.00, investedAmount: 44_800, currentValue: 58_240,
    returnAmount: 13_440, returnPercentage: 30.0, status: "active",
    purchaseDate: "2023-11-05", nextDistribution: "2026-09-01",
    distributions: [
      { date: "2024-02-05", amount: 2_240, type: "rental", status: "paid" },
      { date: "2024-05-05", amount: 2_240, type: "rental", status: "paid" },
      { date: "2024-08-05", amount: 2_800, type: "dividend", status: "paid" },
    ],
  },
];

export function usePortfolioSummary() {
  return useQuery({
    queryKey: ["investor", "portfolio", "summary"],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 600));
      return MOCK_PORTFOLIO;
    },
    staleTime: 30_000,
  });
}

export function useInvestments() {
  return useQuery({
    queryKey: ["investor", "investments"],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 500));
      return MOCK_INVESTMENTS;
    },
    staleTime: 30_000,
  });
}

export function useInvestment(id: string) {
  return useQuery({
    queryKey: ["investor", "investments", id],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 300));
      const inv = MOCK_INVESTMENTS.find((i) => i.id === id);
      if (!inv) throw new Error("Investment not found");
      return inv;
    },
    enabled: !!id,
  });
}
