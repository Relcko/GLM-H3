import type { UserId } from '../value-objects';

export interface PolicyAttributes {
  readonly userId: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly walletAddresses?: readonly string[];
  readonly organizationIds?: readonly string[];
  readonly custom: Record<string, unknown>;
}

export interface IPolicyAttributeCollector {
  collect(userId: UserId): Promise<PolicyAttributes>;
}
