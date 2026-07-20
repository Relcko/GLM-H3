import { z } from "zod";
import { Currency } from "@relcko/types";
import { TreasuryAccountType, AllocationType, MovementStatus, TreasuryReportType, BuybackType, BurnType } from "./types";

export const createAccountSchema = z.object({
  accountType: z.nativeEnum(TreasuryAccountType),
  name: z.string().min(1).max(128),
  description: z.string().max(500).optional(),
  currency: z.nativeEnum(Currency),
});

export const postJournalSchema = z.object({
  description: z.string().min(1).max(500),
  entries: z.array(z.object({
    accountId: z.string().min(1),
    entryType: z.enum(["debit", "credit"]),
    amount: z.bigint().positive(),
    description: z.string().max(200),
  })).min(2),
  reference: z.string().min(1),
  referenceId: z.string().min(1),
});

export const movementSchema = z.object({
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  amount: z.object({ amount: z.bigint().positive(), currency: z.nativeEnum(Currency) }),
  reason: z.string().min(1).max(500),
});

export const dividendProposalSchema = z.object({
  period: z.string().min(1),
  totalAmount: z.object({ amount: z.bigint().positive(), currency: z.nativeEnum(Currency) }),
  perUnitAmount: z.object({ amount: z.bigint().positive(), currency: z.nativeEnum(Currency) }),
  eligibleUnits: z.bigint().positive(),
});

export const buybackSchema = z.object({
  type: z.nativeEnum(BuybackType),
  amount: z.object({ amount: z.bigint().positive(), currency: z.nativeEnum(Currency) }),
  maxPrice: z.object({ amount: z.bigint().positive(), currency: z.nativeEnum(Currency) }).optional(),
  reason: z.string().min(1).max(500),
});

export const burnSchema = z.object({
  type: z.nativeEnum(BurnType),
  amount: z.bigint().positive(),
  reason: z.string().min(1).max(500),
});
