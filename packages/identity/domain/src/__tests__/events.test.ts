import { describe, expect, it } from 'vitest';

import {
  AuthEventTypeMap,
  EventCatalog,
  OrganizationEventTypeMap,
  PasskeyEventTypeMap,
  PolicyEventTypeMap,
  RecoveryEventTypeMap,
  RoleEventTypeMap,
  ServiceAccountEventTypeMap,
  SessionEventTypeMap,
  UserEventTypeMap,
  WalletEventTypeMap,
} from '../events';

describe('EventCatalog', () => {
  it('contains all event type strings', () => {
    const values = Object.values(EventCatalog);
    expect(values.length).toBeGreaterThan(30);
  });

  it('every event type is a non-empty string starting with identity.', () => {
    for (const value of Object.values(EventCatalog)) {
      expect(typeof value).toBe('string');
      expect(value.startsWith('identity.')).toBe(true);
    }
  });

  it('no duplicate event type values', () => {
    const values = Object.values(EventCatalog);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('no duplicate event type keys', () => {
    const keys = Object.keys(EventCatalog);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});

describe('EventCatalog uniqueness across all aggregate maps', () => {
  const allMaps = [
    UserEventTypeMap,
    WalletEventTypeMap,
    SessionEventTypeMap,
    OrganizationEventTypeMap,
    RoleEventTypeMap,
    ServiceAccountEventTypeMap,
    AuthEventTypeMap,
    RecoveryEventTypeMap,
    PolicyEventTypeMap,
    PasskeyEventTypeMap,
  ];

  it('all event type maps reference catalog values', () => {
    const catalogValues = new Set(Object.values(EventCatalog));
    for (const map of allMaps) {
      for (const value of Object.values(map)) {
        expect(catalogValues.has(value)).toBe(true);
      }
    }
  });

  it('no duplicate values across aggregate maps', () => {
    const allValues: string[] = [];
    for (const map of allMaps) {
      allValues.push(...Object.values(map));
    }
    const unique = new Set(allValues);
    expect(unique.size).toBe(allValues.length);
  });

  it('each map has at least one event type', () => {
    for (const map of allMaps) {
      expect(Object.keys(map).length).toBeGreaterThan(0);
    }
  });
});

describe('Aggregate event type maps', () => {
  it('UserEventTypeMap has user events', () => {
    expect(UserEventTypeMap.registered).toBe('identity.user.registered');
    expect(UserEventTypeMap.deleted).toBe('identity.user.deleted');
  });

  it('WalletEventTypeMap has wallet events', () => {
    expect(WalletEventTypeMap.linked).toBe('identity.wallet.linked');
    expect(WalletEventTypeMap.verified).toBe('identity.wallet.verified');
  });

  it('SessionEventTypeMap has session events', () => {
    expect(SessionEventTypeMap.created).toBe('identity.session.created');
    expect(SessionEventTypeMap.revoked).toBe('identity.session.revoked');
  });

  it('OrganizationEventTypeMap has organization events', () => {
    expect(OrganizationEventTypeMap.created).toBe('identity.organization.created');
    expect(OrganizationEventTypeMap.memberAdded).toBe('identity.organization.member.added');
  });

  it('RoleEventTypeMap has role events', () => {
    expect(RoleEventTypeMap.created).toBe('identity.role.created');
    expect(RoleEventTypeMap.assigned).toBe('identity.role.assigned');
  });

  it('ServiceAccountEventTypeMap has service account events', () => {
    expect(ServiceAccountEventTypeMap.created).toBe('identity.service_account.created');
    expect(ServiceAccountEventTypeMap.activated).toBe('identity.service_account.activated');
  });

  it('AuthEventTypeMap has auth events', () => {
    expect(AuthEventTypeMap.authenticationSucceeded).toBe('identity.authentication.succeeded');
    expect(AuthEventTypeMap.passwordResetInitiated).toBe('identity.password.reset.initiated');
  });

  it('RecoveryEventTypeMap has recovery events', () => {
    expect(RecoveryEventTypeMap.initiated).toBe('identity.recovery.initiated');
    expect(RecoveryEventTypeMap.cancelled).toBe('identity.recovery.cancelled');
  });

  it('PolicyEventTypeMap has policy events', () => {
    expect(PolicyEventTypeMap.evaluated).toBe('identity.policy.evaluated');
  });

  it('PasskeyEventTypeMap has passkey events', () => {
    expect(PasskeyEventTypeMap.registered).toBe('identity.passkey.registered');
    expect(PasskeyEventTypeMap.removed).toBe('identity.passkey.removed');
  });
});
