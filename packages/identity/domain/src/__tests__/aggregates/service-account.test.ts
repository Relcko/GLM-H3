import { InvariantViolationError } from '@relcko/errors';
import { describe, expect, it } from 'vitest';

import { ServiceAccount } from '../../aggregates/service-account';
import {
  ServiceAccountActivated,
  ServiceAccountCreated,
  ServiceAccountDeactivated,
  ServiceAccountRenamed,
} from '../../events/service-account-events';
import { ServiceAccountId, UserId } from '../../value-objects';

import type { EventId } from '@relcko/types';

const nextEventId = (): EventId => crypto.randomUUID() as EventId;
const at = (iso: string): Date => new Date(iso);

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-01-02T00:00:00.000Z';
const T2 = '2026-01-03T00:00:00.000Z';
const T3 = '2026-01-04T00:00:00.000Z';

const validSaId = (): ServiceAccountId => new ServiceAccountId(crypto.randomUUID());
const validUserId = (): UserId => new UserId(crypto.randomUUID());

function createServiceAccount(overrides?: {
  id?: ServiceAccountId;
  name?: string;
  createdBy?: UserId;
}): ServiceAccount {
  return ServiceAccount.create(
    overrides?.id ?? validSaId(),
    overrides?.name ?? 'my-service-account',
    overrides?.createdBy ?? validUserId(),
    nextEventId(),
    at(T0),
  );
}

function createActiveServiceAccount(): ServiceAccount {
  return createServiceAccount();
}

function createInactiveServiceAccount(): ServiceAccount {
  const sa = createServiceAccount();
  sa.deactivate(nextEventId(), at(T1));
  return sa;
}

describe('ServiceAccount Aggregate — Factory: create()', () => {
  it('creates with correct state', () => {
    const id = validSaId();
    const createdBy = validUserId();
    const sa = ServiceAccount.create(id, 'my-sa', createdBy, nextEventId(), at(T0));

    expect(sa.id).toBe(id);
    expect(sa.name).toBe('my-sa');
    expect(sa.createdBy).toBe(createdBy);
    expect(sa.active).toBe(true);
  });

  it('initializes as active', () => {
    const sa = createServiceAccount();
    expect(sa.active).toBe(true);
  });

  it('initializes timestamps correctly', () => {
    const sa = createServiceAccount();
    expect(sa.createdAt).toEqual(at(T0));
    expect(sa.updatedAt).toEqual(at(T0));
  });

  it('emits ServiceAccountCreated event with correct payload', () => {
    const id = validSaId();
    const createdBy = validUserId();
    const sa = ServiceAccount.create(id, 'my-sa', createdBy, nextEventId(), at(T0));

    const events = sa.getUncommittedEvents();
    expect(events).toHaveLength(1);
    const event = events[0] as ServiceAccountCreated;
    expect(event).toBeInstanceOf(ServiceAccountCreated);
    expect(event.eventType).toBe('identity.service_account.created');
    expect(event.aggregateType).toBe('ServiceAccount');
    expect(event.aggregateVersion).toBe(1);
    expect(event.occurredAt).toEqual(at(T0));
    expect(event.serviceAccountId).toBe(id);
    expect(event.name).toBe('my-sa');
    expect(event.createdBy).toBe(createdBy);
    expect(event.createdAt).toEqual(at(T0));
  });

  it('starts at version 1', () => {
    const sa = createServiceAccount();
    expect(sa.version).toBe(1);
  });

  it('trims whitespace from name', () => {
    const sa = createServiceAccount({ name: '  my-sa  ' });
    expect(sa.name).toBe('my-sa');
  });

  it('throws when name is empty', () => {
    expect(() => {
      createServiceAccount({ name: '  ' });
    }).toThrow(InvariantViolationError);
  });
});

describe('ServiceAccount Aggregate — rename()', () => {
  it('updates the name', () => {
    const sa = createServiceAccount({ name: 'old-name' });
    sa.rename('new-name', nextEventId(), at(T1));
    expect(sa.name).toBe('new-name');
  });

  it('emits ServiceAccountRenamed event', () => {
    const sa = createServiceAccount({ name: 'old-name' });
    const eventId = nextEventId();
    sa.rename('new-name', eventId, at(T1));

    const events = sa.getUncommittedEvents();
    expect(events).toHaveLength(2);
    const event = events[1] as ServiceAccountRenamed;
    expect(event).toBeInstanceOf(ServiceAccountRenamed);
    expect(event.eventType).toBe('identity.service_account.renamed');
    expect(event.aggregateVersion).toBe(2);
    expect(event.serviceAccountId).toBe(sa.id);
    expect(event.oldName).toBe('old-name');
    expect(event.newName).toBe('new-name');
    expect(event.eventId).toBe(eventId);
  });

  it('increments version', () => {
    const sa = createServiceAccount();
    sa.rename('new-name', nextEventId(), at(T1));
    expect(sa.version).toBe(2);
  });

  it('trims whitespace from new name', () => {
    const sa = createServiceAccount({ name: 'old-name' });
    sa.rename('  new-name  ', nextEventId(), at(T1));
    expect(sa.name).toBe('new-name');
  });

  it('is a no-op when name is unchanged', () => {
    const sa = createServiceAccount({ name: 'same' });
    sa.rename('same', nextEventId(), at(T1));
    expect(sa.getUncommittedEvents()).toHaveLength(1);
  });

  it('throws when name is empty', () => {
    const sa = createServiceAccount();
    expect(() => {
      sa.rename('  ', nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('allows rename when deactivated', () => {
    const sa = createInactiveServiceAccount();
    sa.rename('new-name', nextEventId(), at(T2));
    expect(sa.name).toBe('new-name');
    expect(sa.active).toBe(false);
  });
});

describe('ServiceAccount Aggregate — activate()', () => {
  it('marks as active', () => {
    const sa = createInactiveServiceAccount();
    sa.activate(nextEventId(), at(T2));
    expect(sa.active).toBe(true);
  });

  it('emits ServiceAccountActivated event', () => {
    const sa = createInactiveServiceAccount();
    const eventId = nextEventId();
    sa.activate(eventId, at(T2));

    const events = sa.getUncommittedEvents();
    const event = events[2] as ServiceAccountActivated;
    expect(event).toBeInstanceOf(ServiceAccountActivated);
    expect(event.eventType).toBe('identity.service_account.activated');
    expect(event.aggregateVersion).toBe(3);
    expect(event.eventId).toBe(eventId);
  });

  it('throws when already active', () => {
    const sa = createActiveServiceAccount();
    expect(() => {
      sa.activate(nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });
});

describe('ServiceAccount Aggregate — deactivate()', () => {
  it('marks as inactive', () => {
    const sa = createActiveServiceAccount();
    sa.deactivate(nextEventId(), at(T1));
    expect(sa.active).toBe(false);
  });

  it('emits ServiceAccountDeactivated event', () => {
    const sa = createActiveServiceAccount();
    const eventId = nextEventId();
    sa.deactivate(eventId, at(T1));

    const events = sa.getUncommittedEvents();
    const event = events[1] as ServiceAccountDeactivated;
    expect(event).toBeInstanceOf(ServiceAccountDeactivated);
    expect(event.eventType).toBe('identity.service_account.deactivated');
    expect(event.aggregateVersion).toBe(2);
    expect(event.eventId).toBe(eventId);
  });

  it('throws when already inactive', () => {
    const sa = createInactiveServiceAccount();
    expect(() => {
      sa.deactivate(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('ServiceAccount Aggregate — Event replay from history', () => {
  it('rebuilds identical state from event history', () => {
    const original = createServiceAccount({ name: 'sa' });
    original.rename('renamed-sa', nextEventId(), at(T1));

    const history = original.getUncommittedEvents();
    const rebuilt = ServiceAccount.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.version).toBe(original.version);
    expect(rebuilt.name).toBe('renamed-sa');
    expect(rebuilt.createdBy.toString()).toBe(original.createdBy.toString());
    expect(rebuilt.active).toBe(true);
  });

  it('rebuilds deactivated state from history', () => {
    const original = createActiveServiceAccount();
    original.deactivate(nextEventId(), at(T1));

    const history = original.getUncommittedEvents();
    const rebuilt = ServiceAccount.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.active).toBe(false);
  });

  it('rebuilds activated state from history', () => {
    const original = createInactiveServiceAccount();
    original.activate(nextEventId(), at(T2));

    const history = original.getUncommittedEvents();
    const rebuilt = ServiceAccount.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.active).toBe(true);
  });

  it('produces identical state across multiple replays', () => {
    const original = createServiceAccount({ name: 'sa' });
    original.rename('updated', nextEventId(), at(T1));

    const history = original.getUncommittedEvents();
    const first = ServiceAccount.reconstitute(original.id);
    first.loadFromHistory(history);
    const second = ServiceAccount.reconstitute(original.id);
    second.loadFromHistory(history);

    expect(first.version).toBe(second.version);
    expect(first.name).toBe(second.name);
    expect(first.active).toBe(second.active);
  });
});

describe('ServiceAccount Aggregate — Snapshot serialization', () => {
  it('serializes to snapshot and restores identical state', () => {
    const original = createServiceAccount({ name: 'my-sa' });
    original.deactivate(nextEventId(), at(T1));

    const snapshot = original.toSnapshot();
    const restored = ServiceAccount.fromSnapshot(snapshot);

    expect(restored.id.toString()).toBe(original.id.toString());
    expect(restored.name).toBe(original.name);
    expect(restored.createdBy.toString()).toBe(original.createdBy.toString());
    expect(restored.active).toBe(original.active);
    expect(restored.createdAt.toISOString()).toBe(original.createdAt.toISOString());
    expect(restored.updatedAt.toISOString()).toBe(original.updatedAt.toISOString());
    expect(restored.version).toBe(original.version);
  });

  it('serializes active state correctly', () => {
    const original = createActiveServiceAccount();

    const snapshot = original.toSnapshot();
    const restored = ServiceAccount.fromSnapshot(snapshot);

    expect(restored.active).toBe(true);
  });

  it('serializes deactivated state correctly', () => {
    const original = createInactiveServiceAccount();

    const snapshot = original.toSnapshot();
    const restored = ServiceAccount.fromSnapshot(snapshot);

    expect(restored.active).toBe(false);
  });

  it('restores version from snapshot', () => {
    const original = createServiceAccount();
    original.rename('new', nextEventId(), at(T1));
    original.deactivate(nextEventId(), at(T2));

    const snapshot = original.toSnapshot();
    const restored = ServiceAccount.fromSnapshot(snapshot);

    expect(restored.version).toBe(3);
  });
});

describe('ServiceAccount Aggregate — Equality', () => {
  it('two service accounts with same id are equal', () => {
    const id = validSaId();
    const a = ServiceAccount.create(id, 'sa', validUserId(), nextEventId(), at(T0));
    const b = ServiceAccount.reconstitute(id);
    expect(a.equals(b)).toBe(true);
  });

  it('two service accounts with different ids are not equal', () => {
    const a = createServiceAccount();
    const b = createServiceAccount();
    expect(a.equals(b)).toBe(false);
  });

  it('equals returns false for null', () => {
    const sa = createServiceAccount();
    expect(sa.equals(null)).toBe(false);
  });

  it('equals returns false for undefined', () => {
    const sa = createServiceAccount();
    expect(sa.equals(undefined)).toBe(false);
  });
});

describe('ServiceAccount Aggregate — Uncommitted events lifecycle', () => {
  it('markEventsAsCommitted clears uncommitted events', () => {
    const sa = createServiceAccount({ name: 'sa' });
    sa.rename('updated', nextEventId(), at(T1));
    expect(sa.getUncommittedEvents()).toHaveLength(2);

    sa.markEventsAsCommitted();
    expect(sa.getUncommittedEvents()).toHaveLength(0);
    expect(sa.version).toBe(2);
  });
});

describe('ServiceAccount Aggregate — Full lifecycle integration', () => {
  it('supports: create → rename → deactivate → activate', () => {
    const sa = createServiceAccount({ name: 'initial' });

    expect(sa.name).toBe('initial');
    expect(sa.active).toBe(true);

    sa.rename('advanced', nextEventId(), at(T1));
    expect(sa.name).toBe('advanced');

    sa.deactivate(nextEventId(), at(T2));
    expect(sa.active).toBe(false);

    sa.activate(nextEventId(), at(T3));
    expect(sa.active).toBe(true);

    expect(sa.version).toBe(4);
    expect(sa.getUncommittedEvents()).toHaveLength(4);
  });

  it('supports: create → deactivate → activate → deactivate', () => {
    const sa = createActiveServiceAccount();
    sa.deactivate(nextEventId(), at(T1));
    expect(sa.active).toBe(false);

    sa.activate(nextEventId(), at(T2));
    expect(sa.active).toBe(true);

    sa.deactivate(nextEventId(), at(T3));
    expect(sa.active).toBe(false);

    expect(sa.version).toBe(4);
  });
});
