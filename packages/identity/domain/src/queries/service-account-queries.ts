import type { ServiceAccountId, UserId } from '../value-objects';

export interface GetServiceAccountQuery {
  readonly serviceAccountId: ServiceAccountId;
}

export interface ListServiceAccountsQuery {
  readonly createdBy?: UserId;
  readonly offset?: number;
  readonly limit?: number;
}
