"use client";

import { useQuery } from "@tanstack/react-query";
import type { AIRecommendation, MarketInsight } from "../types";

const MOCK_RECOMMENDATIONS: AIRecommendation[] = [
  {
    id: "rec-1", type: "buy", title: "Increase Exposure to Industrial",
    description: "Based on current market trends and your portfolio composition, increasing allocation to industrial properties could optimize risk-adjusted returns.",
    confidence: 0.87, impact: "high", timeframe: "medium-term",
    metrics: { currentAllocation: 15.2, targetAllocation: 25.0, projectedReturnUplift: 2.3 },
    reasoning: ["Industrial real estate showing 12% YoY growth", "Your current industrial allocation is below optimal", "Supply constraints driving value appreciation", "E-commerce growth sustaining industrial demand"],
    createdAt: "2026-07-14T08:00:00Z",
  },
  {
    id: "rec-2", type: "rebalance", title: "Rebalance Commercial Holdings",
    description: "Your commercial real estate allocation has grown beyond target due to appreciation. Consider rebalancing to lock in gains and maintain diversification.",
    confidence: 0.82, impact: "medium", timeframe: "short-term",
    metrics: { driftFromTarget: 5.8, recommendedReduction: 180_000, annualTaxSaving: 4_200 },
    reasoning: ["Commercial REIT sector showing signs of plateau", "Portfolio drift exceeds 5% threshold", "Favorable market conditions for exit"],
    createdAt: "2026-07-13T10:30:00Z",
  },
  {
    id: "rec-3", type: "diversify", title: "Geographic Diversification Opportunity",
    description: "Consider expanding into emerging Sun Belt markets to reduce geographic concentration risk in your portfolio.",
    confidence: 0.75, impact: "medium", timeframe: "long-term",
    metrics: { geographicConcentration: 65, recommendedNewMarkets: 3, riskReduction: 0.15 },
    reasoning: ["68% of portfolio concentrated in 2 regions", "Sun Belt markets showing 15% population growth", "Lower property taxes in target markets"],
    createdAt: "2026-07-12T14:00:00Z",
  },
  {
    id: "rec-4", type: "yield-optimize", title: "Yield Optimization via Miami Development",
    description: "The Miami Beachfront development offers above-market yields with strong appreciation potential. Current pre-construction pricing provides entry advantage.",
    confidence: 0.79, impact: "high", timeframe: "short-term",
    metrics: { projectedYield: 10.2, marketAverageYield: 7.5, preConstructionDiscount: 0.12 },
    reasoning: ["Pre-construction pricing 12% below market value", "Miami real estate appreciating at 6.5% annually", "High tourism driving rental demand"],
    createdAt: "2026-07-11T09:15:00Z",
  },
  {
    id: "rec-5", type: "risk-mitigate", title: "Interest Rate Hedge Strategy",
    description: "With projected rate cuts, consider locking in current fixed-rate returns through longer-duration property tokens.",
    confidence: 0.71, impact: "low", timeframe: "medium-term",
    metrics: { rateCutProbability: 0.65, optimalDuration: 5, yieldProtection: 1.8 },
    reasoning: ["Fed signaling potential rate cuts in H2 2026", "Long-duration assets outperform in falling rate environments", "Spread between short and long-term yields widening"],
    createdAt: "2026-07-10T16:45:00Z",
  },
];

const MOCK_INSIGHTS: MarketInsight[] = [
  { id: "ins-1", title: "Commercial Real Estate Resilient Amid Rate Shifts", summary: "Commercial real estate values remain strong as institutional capital continues to flow into the sector despite changing interest rate dynamics.", category: "Market Analysis", sentiment: "bullish", confidence: 0.85, sources: ["CBRE Q2 Report", "JLL Market Outlook"], timestamp: "2026-07-15T06:00:00Z" },
  { id: "ins-2", title: "Tokenized Real Estate AUM Surpasses $15B", summary: "The tokenized real estate market has crossed $15 billion in total assets under management, representing 240% YoY growth.", category: "Industry Trend", sentiment: "bullish", confidence: 0.92, sources: ["Tokenized Asset Coalition", "DLA Piper Report"], timestamp: "2026-07-14T12:00:00Z" },
  { id: "ins-3", title: "Sun Belt Markets Lead Appreciation", summary: "Austin, Nashville, and Charlotte lead property appreciation at 8-12% annually as population migration patterns continue.", category: "Regional Analysis", sentiment: "bullish", confidence: 0.88, sources: ["Zillow Market Report", "Redfin Data"], timestamp: "2026-07-13T10:00:00Z" },
  { id: "ins-4", title: "Regulatory Clarity Boosts Institutional Adoption", summary: "New SEC guidelines on digital asset securities are driving increased institutional participation in tokenized real estate.", category: "Regulatory", sentiment: "bullish", confidence: 0.78, sources: ["SEC Statement", "Sullivan & Cromwell Analysis"], timestamp: "2026-07-12T08:00:00Z" },
  { id: "ins-5", title: "Industrial Property Demand Outpaces Supply", summary: "Industrial real estate vacancy rates hit historic lows below 4%, driving double-digit rent growth across major markets.", category: "Sector Analysis", sentiment: "bullish", confidence: 0.91, sources: ["Cushman & Wakefield Industrial Report", "CBRE Data"], timestamp: "2026-07-11T14:00:00Z" },
];

export function useAIRecommendations() {
  return useQuery({
    queryKey: ["investor", "ai", "recommendations"],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 600));
      return MOCK_RECOMMENDATIONS;
    },
    staleTime: 120_000,
  });
}

export function useMarketInsights() {
  return useQuery({
    queryKey: ["investor", "ai", "insights"],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      return MOCK_INSIGHTS;
    },
    staleTime: 300_000,
  });
}

export function useAIPortfolioAnalysis() {
  return useQuery({
    queryKey: ["investor", "ai", "analysis"],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 800));
      return {
        riskScore: 6.8,
        diversificationScore: 7.2,
        yieldScore: 8.5,
        overallScore: 7.5,
        strengths: ["Strong yield generation", "Good geographic spread", "Quality asset selection"],
        weaknesses: ["Industrial underweight", "Moderate concentration risk", "Limited international exposure"],
        opportunities: ["Miami pre-construction pricing", "Denver tech campus value", "Sun Belt expansion"],
        threats: ["Rate cut timing uncertainty", "Commercial oversupply risk in select markets"],
      };
    },
    staleTime: 300_000,
  });
}
