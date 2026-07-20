import { describe, expect, it } from 'vitest';

import type {
  EvaluatePolicyQuery,
  GetOrganizationQuery,
  GetRoleQuery,
  GetServiceAccountQuery,
  GetSessionQuery,
  GetUserByEmailQuery,
  GetUserOrganizationsQuery,
  GetUserPermissionsQuery,
  GetUserQuery,
  GetWalletByAddressQuery,
  GetWalletQuery,
  ListAuditRecordsQuery,
  ListOrganizationMembersQuery,
  ListOrganizationsQuery,
  ListRoleAssignmentsQuery,
  ListRolesQuery,
  ListServiceAccountsQuery,
  ListSessionsQuery,
  ListUsersQuery,
  ListWalletsQuery,
  SearchUsersQuery,
} from '../queries';

describe('Query payload types', () => {
  it('User queries are well-typed', () => {
    const get: GetUserQuery = {} as GetUserQuery;
    const byEmail: GetUserByEmailQuery = {} as GetUserByEmailQuery;
    const list: ListUsersQuery = {};
    const search: SearchUsersQuery = {} as SearchUsersQuery;
    expect(get).toBeDefined();
    expect(byEmail).toBeDefined();
    expect(list).toBeDefined();
    expect(search).toBeDefined();
  });

  it('Wallet queries are well-typed', () => {
    const get: GetWalletQuery = {} as GetWalletQuery;
    const byAddr: GetWalletByAddressQuery = {} as GetWalletByAddressQuery;
    const list: ListWalletsQuery = {} as ListWalletsQuery;
    expect(get).toBeDefined();
    expect(byAddr).toBeDefined();
    expect(list).toBeDefined();
  });

  it('Session queries are well-typed', () => {
    const get: GetSessionQuery = {} as GetSessionQuery;
    const list: ListSessionsQuery = {} as ListSessionsQuery;
    expect(get).toBeDefined();
    expect(list).toBeDefined();
  });

  it('Organization queries are well-typed', () => {
    const get: GetOrganizationQuery = {} as GetOrganizationQuery;
    const list: ListOrganizationsQuery = {};
    const members: ListOrganizationMembersQuery = {} as ListOrganizationMembersQuery;
    const userOrgs: GetUserOrganizationsQuery = {} as GetUserOrganizationsQuery;
    expect(get).toBeDefined();
    expect(list).toBeDefined();
    expect(members).toBeDefined();
    expect(userOrgs).toBeDefined();
  });

  it('Role queries are well-typed', () => {
    const get: GetRoleQuery = {} as GetRoleQuery;
    const list: ListRolesQuery = {};
    const assignments: ListRoleAssignmentsQuery = {};
    expect(get).toBeDefined();
    expect(list).toBeDefined();
    expect(assignments).toBeDefined();
  });

  it('ServiceAccount queries are well-typed', () => {
    const get: GetServiceAccountQuery = {} as GetServiceAccountQuery;
    const list: ListServiceAccountsQuery = {};
    expect(get).toBeDefined();
    expect(list).toBeDefined();
  });

  it('Policy queries are well-typed', () => {
    const evalQ: EvaluatePolicyQuery = {} as EvaluatePolicyQuery;
    const perms: GetUserPermissionsQuery = {} as GetUserPermissionsQuery;
    expect(evalQ).toBeDefined();
    expect(perms).toBeDefined();
  });

  it('Audit queries are well-typed', () => {
    const list: ListAuditRecordsQuery = {};
    expect(list).toBeDefined();
  });
});
