export const AgentStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
  TERMINATED: 'TERMINATED',
} as const;

export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];

export const CommissionStatus = {
  CALCULATED: 'CALCULATED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PAID: 'PAID',
  HELD: 'HELD',
  REVERSED: 'REVERSED',
} as const;

export type CommissionStatus = (typeof CommissionStatus)[keyof typeof CommissionStatus];

export const EventCategory = {
  CORE: 'CORE',
  BUSINESS: 'BUSINESS',
  SECURITY: 'SECURITY',
  SYSTEM: 'SYSTEM',
} as const;

export type EventCategory = (typeof EventCategory)[keyof typeof EventCategory];

export const BoundedContext = {
  S1_AGENT: 'S1_AGENT',
  S2_NETWORK: 'S2_NETWORK',
  S3_COMMISSION: 'S3_COMMISSION',
  S4_QUALIFICATION: 'S4_QUALIFICATION',
  S5_CAMPAIGN: 'S5_CAMPAIGN',
  S6_PROPERTY: 'S6_PROPERTY',
  S7_INVESTMENT: 'S7_INVESTMENT',
  S8_SECONDARY: 'S8_SECONDARY',
  S9_PAYMENT: 'S9_PAYMENT',
  S10_OWNERSHIP: 'S10_OWNERSHIP',
  S11_PORTFOLIO: 'S11_PORTFOLIO',
  S12_NFT: 'S12_NFT',
  S13_DIVIDEND: 'S13_DIVIDEND',
  S14_REWARD: 'S14_REWARD',
  S15_TREASURY: 'S15_TREASURY',
  S16_RESERVE: 'S16_RESERVE',
  S17_BUYBACK: 'S17_BUYBACK',
  S18_GOVERNANCE: 'S18_GOVERNANCE',
  S19_IDENTITY: 'S19_IDENTITY',
  S20_COMPLIANCE: 'S20_COMPLIANCE',
  S21_SECURITY: 'S21_SECURITY',
  S22_RISK: 'S22_RISK',
  S23_AI: 'S23_AI',
  S24_DOCUMENT: 'S24_DOCUMENT',
  S25_ADMIN: 'S25_ADMIN',
  S26_AUDIT: 'S26_AUDIT',
  S27_MAP: 'S27_MAP',
  S28_VALUATION: 'S28_VALUATION',
  S29_NOTIFICATION: 'S29_NOTIFICATION',
  S30_SYSTEM: 'S30_SYSTEM',
} as const;

export type BoundedContext = (typeof BoundedContext)[keyof typeof BoundedContext];

export const RetentionClassification = {
  PERMANENT: 'PERMANENT',
  STANDARD: 'STANDARD',
  EPHEMERAL: 'EPHEMERAL',
} as const;

export type RetentionClassification =
  (typeof RetentionClassification)[keyof typeof RetentionClassification];

export const SecurityClassification = {
  PUBLIC: 'PUBLIC',
  INTERNAL: 'INTERNAL',
  CONFIDENTIAL: 'CONFIDENTIAL',
  RESTRICTED: 'RESTRICTED',
} as const;

export type SecurityClassification =
  (typeof SecurityClassification)[keyof typeof SecurityClassification];
