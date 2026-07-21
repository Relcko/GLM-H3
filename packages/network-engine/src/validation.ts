import { z } from "zod";

export const NetworkValidation = {
  agentCode: z.string().min(4).max(32).regex(/^[A-Za-z0-9_-]+$/),
  entityId: z.string().min(1),
  bigint: z.bigint().nonnegative(),
  money: z.object({ amount: z.bigint().nonnegative(), currency: z.string().min(1) }),
  timestamp: z.string().datetime(),
  commissionRate: z.number().min(0).max(100),
  bps: z.number().int().min(0).max(10000),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  rank: z.enum([
    "associate", "senior_associate", "bronze", "silver", "gold",
    "platinum", "diamond", "elite", "legend",
  ]),
  activeStatus: z.enum(["qualified", "at_risk", "lapsed"]),
  teamRole: z.enum(["founder", "director", "manager", "advisor", "agent", "member"]),
  teamStatus: z.enum(["active", "inactive", "archived", "suspended"]),
};

export const NetworkSchema = {
  registerAgent: z.object({
    userId: NetworkValidation.entityId,
    code: NetworkValidation.agentCode,
    commissionRate: NetworkValidation.commissionRate,
  }),
  linkSponsor: z.object({
    agentId: NetworkValidation.entityId,
    sponsorId: NetworkValidation.entityId,
  }),
  assignCustomer: z.object({
    investorId: NetworkValidation.entityId,
    agentId: NetworkValidation.entityId,
  }),
  recordSale: z.object({
    agentId: NetworkValidation.entityId,
    amount: NetworkValidation.money,
    period: NetworkValidation.period,
  }),
  calculateCommission: z.object({
    agentId: NetworkValidation.entityId,
    amount: NetworkValidation.money,
    sourceId: NetworkValidation.entityId,
    sourceType: z.string(),
    period: NetworkValidation.period,
  }),
  createCampaign: z.object({
    name: z.string().min(1).max(256),
    description: z.string().max(2000),
    rewardType: z.string(),
    startAt: NetworkValidation.timestamp,
    endAt: NetworkValidation.timestamp,
  }),
};

export const TeamSchema = {
  createTeam: z.object({
    name: z.string().min(1).max(128),
    ownerId: NetworkValidation.entityId,
    parentTeamId: NetworkValidation.entityId.optional(),
  }),
  addMember: z.object({
    teamId: NetworkValidation.entityId,
    memberId: NetworkValidation.entityId,
    role: NetworkValidation.teamRole,
  }),
  removeMember: z.object({
    teamId: NetworkValidation.entityId,
    memberId: NetworkValidation.entityId,
  }),
  changeRole: z.object({
    teamId: NetworkValidation.entityId,
    memberId: NetworkValidation.entityId,
    role: NetworkValidation.teamRole,
  }),
  moveTeam: z.object({
    teamId: NetworkValidation.entityId,
    newParentTeamId: NetworkValidation.entityId.optional(),
  }),
};
