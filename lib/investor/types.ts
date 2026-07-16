export interface Property {
  id: string;
  slug: string;
  name: string;
  description: string;
  location: Location;
  type: PropertyType;
  status: PropertyStatus;
  valuation: Valuation;
  financials: Financials;
  media: Media;
  features: string[];
  risk: RiskRating;
  createdAt: string;
  updatedAt: string;
}

interface Location {
  address: string;
  city: string;
  state: string;
  country: string;
  coordinates: { lat: number; lng: number };
}

interface Valuation {
  totalValue: number;
  tokenPrice: number;
  totalTokens: number;
  availableTokens: number;
  minimumInvestment: number;
}

interface Financials {
  annualReturn: number;
  occupancyRate: number;
  grossYield: number;
  netYield: number;
  appreciationRate: number;
}

interface Media {
  images: string[];
  virtualTour?: string;
  documents: string[];
}

export type PropertyType = "residential" | "commercial" | "industrial" | "land" | "mixed-use";
export type PropertyStatus = "available" | "partially-funded" | "fully-funded" | "under-development" | "operational" | "sold";
export type RiskRating = "low" | "medium" | "high";

export interface PortfolioSummary {
  totalInvested: number;
  currentValue: number;
  totalReturn: number;
  returnPercentage: number;
  activeInvestments: number;
  totalProperties: number;
  diversification: AssetAllocation[];
  performanceHistory: PerformancePoint[];
}

export interface AssetAllocation {
  category: string;
  value: number;
  percentage: number;
  color: string;
}

export interface PerformancePoint {
  date: string;
  value: number;
}

export interface Investment {
  id: string;
  propertyId: string;
  propertyName: string;
  propertyImage: string;
  tokensOwned: number;
  tokenPrice: number;
  investedAmount: number;
  currentValue: number;
  returnAmount: number;
  returnPercentage: number;
  status: InvestmentStatus;
  purchaseDate: string;
  nextDistribution?: string;
  distributions: Distribution[];
}

export type InvestmentStatus = "active" | "pending" | "settled" | "exited";

export interface Distribution {
  date: string;
  amount: number;
  type: "dividend" | "rental" | "capital-gains";
  status: "paid" | "pending" | "scheduled";
}

export interface NFTCollection {
  id: string;
  name: string;
  symbol: string;
  description: string;
  totalSupply: number;
  floorPrice: number;
  volume24h: number;
  owners: number;
  image: string;
}

export interface NFTProperty {
  id: string;
  name: string;
  image: string;
  collectionName: string;
  collectionId: string;
  tokenId: string;
  owner: string;
  value: number;
  equityShare: number;
  rentalShare: number;
  status: NFTStatus;
  acquired: string;
}

export type NFTStatus = "owned" | "listed" | "fractionalized" | "pending";

export interface Proposal {
  id: string;
  title: string;
  description: string;
  type: ProposalType;
  status: ProposalStatus;
  creator: string;
  createdAt: string;
  endDate: string;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  quorum: number;
  totalVotes: number;
  voterParticipation: number;
  userVote?: VoteChoice;
}

export type ProposalType = "treasury" | "parameter" | "upgrade" | "strategic" | "community";
export type ProposalStatus = "active" | "pending" | "passed" | "rejected" | "executed" | "cancelled";
export type VoteChoice = "for" | "against" | "abstain";

export interface TreasurySnapshot {
  totalAssets: number;
  liquidAssets: number;
  investedAssets: number;
  pendingDistributions: number;
  totalDistributed: number;
  lastDistribution: string;
  nextDistribution: string;
  assetBreakdown: TreasuryAsset[];
  distributionHistory: DistributionEvent[];
}

export interface TreasuryAsset {
  type: string;
  value: number;
  percentage: number;
}

export interface DistributionEvent {
  date: string;
  amount: number;
  type: string;
  status: "completed" | "pending" | "scheduled";
  recipients: number;
  perToken: number;
}

export interface AIRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  confidence: number;
  impact: "high" | "medium" | "low";
  timeframe: "short-term" | "medium-term" | "long-term";
  metrics: Record<string, number>;
  reasoning: string[];
  createdAt: string;
}

export type RecommendationType = "buy" | "sell" | "hold" | "diversify" | "rebalance" | "yield-optimize" | "risk-mitigate";

export interface MarketInsight {
  id: string;
  title: string;
  summary: string;
  category: string;
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  sources: string[];
  timestamp: string;
}

export interface WalletBalance {
  rlko: number;
  eth: number;
  usdc: number;
  usdt: number;
  totalUsdValue: number;
}

export interface WalletTransaction {
  hash: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  token: string;
  from: string;
  to: string;
  timestamp: string;
  gasUsed: number;
  gasPrice: number;
}

export type TransactionType = "transfer" | "investment" | "dividend" | "purchase" | "sale" | "stake" | "unstake" | "claim";
export type TransactionStatus = "pending" | "confirmed" | "failed";

export interface KYCStatus {
  status: KYCLevel;
  verifiedAt?: string;
  expiresAt?: string;
  documents: KYCDocument[];
  verificationSteps: KYCStep[];
}

export type KYCLevel = "unverified" | "basic" | "advanced" | "institutional";

export interface KYCDocument {
  id: string;
  type: string;
  status: "pending" | "approved" | "rejected";
  uploadedAt: string;
  reviewedAt?: string;
}

export interface KYCStep {
  id: string;
  label: string;
  completed: boolean;
  current: boolean;
}

export interface NotificationSettings {
  email: {
    distributions: boolean;
    proposals: boolean;
    security: boolean;
    marketing: boolean;
  };
  push: {
    distributions: boolean;
    proposals: boolean;
    priceAlerts: boolean;
  };
  distributionThreshold: number;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  category: string;
  size: number;
  uploadedAt: string;
  status: "ready" | "generating" | "expired";
  signed: boolean;
  propertyId?: string;
  propertyName?: string;
  url?: string;
}

export type DocumentType = "agreement" | "statement" | "tax" | "legal" | "report" | "identity" | "other";

export interface InvestorMetrics {
  totalPortfolioValue: number;
  totalReturn: number;
  returnPercentage: number;
  activeInvestments: number;
  pendingTransactions: number;
  unreadNotifications: number;
  pendingProposals: number;
  nextDistribution: { amount: number; date: string } | null;
}
