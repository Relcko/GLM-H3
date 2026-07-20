export type Brand<K, T> = K & { __brand: T };

export type AgentId = Brand<string, 'AgentId'>;
export type CustomerId = Brand<string, 'CustomerId'>;
export type PropertyId = Brand<string, 'PropertyId'>;
export type InvestmentId = Brand<string, 'InvestmentId'>;
export type CommissionId = Brand<string, 'CommissionId'>;
export type CommissionRunId = Brand<string, 'CommissionRunId'>;
export type EventId = Brand<string, 'EventId'>;
export type AggregateId = Brand<string, 'AggregateId'>;
export type ReferralId = Brand<string, 'ReferralId'>;
export type CampaignId = Brand<string, 'CampaignId'>;
export type RewardId = Brand<string, 'RewardId'>;
export type TransactionId = Brand<string, 'TransactionId'>;
export type PaymentId = Brand<string, 'PaymentId'>;
export type ProposalId = Brand<string, 'ProposalId'>;
export type IdentityId = Brand<string, 'IdentityId'>;
export type WalletId = Brand<string, 'WalletId'>;
export type KYCId = Brand<string, 'KYCId'>;
export type IncidentId = Brand<string, 'IncidentId'>;
export type NotificationId = Brand<string, 'NotificationId'>;
export type DocumentId = Brand<string, 'DocumentId'>;
export type NFTId = Brand<string, 'NFTId'>;
export type DividendId = Brand<string, 'DividendId'>;
export type TreasuryId = Brand<string, 'TreasuryId'>;
export type ReserveId = Brand<string, 'ReserveId'>;
export type BuybackId = Brand<string, 'BuybackId'>;

export type Timestamp = number;
export type EmailAddress = Brand<string, 'EmailAddress'>;
export type WalletAddress = Brand<string, 'WalletAddress'>;
export type ReferralCode = Brand<string, 'ReferralCode'>;

export type AmountInCents = Brand<number, 'AmountInCents'>;

export type HttpStatusCode = number;
export type CorrelationId = Brand<string, 'CorrelationId'>;
export type SpanId = Brand<string, 'SpanId'>;
export type TraceId = Brand<string, 'TraceId'>;
