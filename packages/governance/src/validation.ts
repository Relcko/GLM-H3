import { z } from "zod";
import { ProposalCategory, VoteChoice, DelegationType, ExecutionStatus } from "./types";

export const createProposalSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().min(1).max(10000),
  proposerId: z.string().min(1),
  category: z.nativeEnum(ProposalCategory),
  targetAddress: z.string().optional(),
  calldata: z.string().optional(),
  value: z.object({ amount: z.bigint(), currency: z.string() }).optional(),
  startBlock: z.bigint().positive(),
  endBlock: z.bigint().positive(),
  executionDelay: z.number().int().nonnegative().default(0),
});

export const castVoteSchema = z.object({
  proposalId: z.string().min(1),
  voterId: z.string().min(1),
  choice: z.nativeEnum(VoteChoice),
  reason: z.string().max(1000).optional(),
});

export const delegationSchema = z.object({
  delegatorId: z.string().min(1),
  delegateId: z.string().min(1),
  delegationType: z.nativeEnum(DelegationType).default(DelegationType.Full),
  category: z.nativeEnum(ProposalCategory).optional(),
  amount: z.bigint().positive(),
});

export const governanceSearchSchema = z.object({
  query: z.string().optional(),
  category: z.nativeEnum(ProposalCategory).optional(),
  status: z.string().optional(),
  proposerId: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sort: z.enum(["recent", "oldest", "votes_desc", "votes_asc"]).optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});
