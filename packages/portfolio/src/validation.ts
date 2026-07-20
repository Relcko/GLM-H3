import { z } from "zod";
import { PortfolioAssetType, ExportFormat } from "./types";

export const portfolioSchema = z.object({
  investorId: z.string().min(1),
});

export const exportRequestSchema = z.object({
  format: z.nativeEnum(ExportFormat),
  investorId: z.string().min(1),
  period: z.string().optional(),
  includeHoldings: z.boolean(),
  includeTransactions: z.boolean(),
  includePerformance: z.boolean(),
  includeTax: z.boolean(),
});

export const searchQuerySchema = z.object({
  query: z.string().optional(),
  assetType: z.nativeEnum(PortfolioAssetType).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  minAmount: z.bigint().optional(),
  maxAmount: z.bigint().optional(),
  sort: z.enum(["date_desc", "date_asc", "amount_desc", "amount_asc"]).optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

export const holdingSchema = z.object({
  investorId: z.string().min(1),
  assetType: z.nativeEnum(PortfolioAssetType),
  assetId: z.string().min(1),
  name: z.string().min(1),
  quantity: z.bigint(),
  costBasis: z.object({ amount: z.bigint(), currency: z.string() }),
  currentValue: z.object({ amount: z.bigint(), currency: z.string() }),
  acquiredAt: z.string().datetime(),
});
