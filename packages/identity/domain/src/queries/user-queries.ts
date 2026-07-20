import type { EmailAddress, UserId } from '../value-objects';

export interface GetUserQuery {
  readonly userId: UserId;
}

export interface GetUserByEmailQuery {
  readonly email: EmailAddress;
}

export interface ListUsersQuery {
  readonly offset?: number;
  readonly limit?: number;
  readonly status?: string;
}

export interface SearchUsersQuery {
  readonly query: string;
  readonly offset?: number;
  readonly limit?: number;
}
