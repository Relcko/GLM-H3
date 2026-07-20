import { InvariantViolationError } from '@relcko/errors';
import { describe, expect, it } from 'vitest';

import { RoleDefinition } from '../../aggregates/role-definition';
import {
  RoleActivated,
  RoleCreated,
  RoleDeactivated,
  RoleDeleted,
  RoleDescriptionChanged,
  RolePermissionAssigned,
  RolePermissionRevoked,
  RoleRenamed,
} from '../../events/role-definition-events';
import { Permission, RoleId } from '../../value-objects';

import type { EventId } from '@relcko/types';

const nextEventId = (): EventId => crypto.randomUUID() as EventId;
const at = (iso: string): Date => new Date(iso);

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-01-02T00:00:00.000Z';
const T2 = '2026-01-03T00:00:00.000Z';
const T3 = '2026-01-04T00:00:00.000Z';
const T4 = '2026-01-05T00:00:00.000Z';
const T5 = '2026-01-06T00:00:00.000Z';

const validRoleId = (): RoleId => new RoleId(crypto.randomUUID());
const perm = (p: string): Permission => new Permission(p);

function createRoleDefinition(overrides?: {
  id?: RoleId;
  name?: string;
  description?: string | null;
  permissions?: readonly Permission[];
}): RoleDefinition {
  return RoleDefinition.create(
    overrides?.id ?? validRoleId(),
    overrides?.name ?? 'admin',
    overrides?.description ?? null,
    overrides?.permissions ?? [],
    nextEventId(),
    at(T0),
  );
}

function createActiveRole(): RoleDefinition {
  return createRoleDefinition();
}

function createInactiveRole(): RoleDefinition {
  const rd = createRoleDefinition();
  rd.deactivate(nextEventId(), at(T1));
  return rd;
}

function createArchivedRole(): RoleDefinition {
  const rd = createRoleDefinition();
  rd.archive(nextEventId(), at(T1));
  return rd;
}

function createRoleWithPermissions(): RoleDefinition {
  return createRoleDefinition({ permissions: [perm('user:read'), perm('user:write')] });
}

describe('RoleDefinition Aggregate — Factory: create()', () => {
  it('creates with correct state', () => {
    const id = validRoleId();
    const rd = RoleDefinition.create(
      id,
      'editor',
      'Can edit content',
      [perm('content:write')],
      nextEventId(),
      at(T0),
    );

    expect(rd.id).toBe(id);
    expect(rd.name).toBe('editor');
    expect(rd.description).toBe('Can edit content');
    expect(rd.permissions).toHaveLength(1);
    expect(rd.permissions[0]?.toString()).toBe('content:write');
    expect(rd.active).toBe(true);
    expect(rd.deleted).toBe(false);
  });

  it('initializes as active', () => {
    const rd = createRoleDefinition();
    expect(rd.active).toBe(true);
    expect(rd.deleted).toBe(false);
  });

  it('initializes timestamps correctly', () => {
    const rd = createRoleDefinition();
    expect(rd.createdAt).toEqual(at(T0));
    expect(rd.updatedAt).toEqual(at(T0));
  });

  it('emits RoleCreated event with correct payload', () => {
    const id = validRoleId();
    const rd = RoleDefinition.create(
      id,
      'moderator',
      'Moderates content',
      [perm('content:read')],
      nextEventId(),
      at(T0),
    );

    const events = rd.getUncommittedEvents();
    expect(events).toHaveLength(1);
    const event = events[0] as RoleCreated;
    expect(event).toBeInstanceOf(RoleCreated);
    expect(event.eventType).toBe('identity.role.created');
    expect(event.aggregateType).toBe('RoleDefinition');
    expect(event.aggregateVersion).toBe(1);
    expect(event.occurredAt).toEqual(at(T0));
    expect(event.roleId).toBe(id);
    expect(event.name).toBe('moderator');
    expect(event.description).toBe('Moderates content');
    expect(event.permissions).toHaveLength(1);
    expect(event.createdAt).toEqual(at(T0));
  });

  it('starts at version 1', () => {
    const rd = createRoleDefinition();
    expect(rd.version).toBe(1);
  });

  it('trims whitespace from name', () => {
    const rd = createRoleDefinition({ name: '  admin  ' });
    expect(rd.name).toBe('admin');
  });

  it('trims whitespace from description', () => {
    const rd = createRoleDefinition({ name: 'admin', description: '  desc  ' });
    expect(rd.description).toBe('desc');
  });

  it('sets null description', () => {
    const rd = createRoleDefinition({ name: 'admin', description: null });
    expect(rd.description).toBeNull();
  });

  it('deduplicates permissions on creation', () => {
    const rd = createRoleDefinition({
      permissions: [perm('user:read'), perm('user:read'), perm('user:write')],
    });
    expect(rd.permissions).toHaveLength(2);
  });

  it('sorts permissions deterministically on creation', () => {
    const rd = createRoleDefinition({
      permissions: [perm('z:access'), perm('a:access')],
    });
    expect(rd.permissions[0]?.toString()).toBe('a:access');
    expect(rd.permissions[1]?.toString()).toBe('z:access');
  });

  it('throws when name is empty', () => {
    expect(() => {
      createRoleDefinition({ name: '  ' });
    }).toThrow(InvariantViolationError);
  });
});

describe('RoleDefinition Aggregate — rename()', () => {
  it('updates the name', () => {
    const rd = createRoleDefinition();
    rd.rename('super-admin', nextEventId(), at(T1));
    expect(rd.name).toBe('super-admin');
  });

  it('emits RoleRenamed event', () => {
    const rd = createRoleDefinition({ name: 'admin' });
    const eventId = nextEventId();
    rd.rename('super-admin', eventId, at(T1));

    const events = rd.getUncommittedEvents();
    expect(events).toHaveLength(2);
    const event = events[1] as RoleRenamed;
    expect(event).toBeInstanceOf(RoleRenamed);
    expect(event.eventType).toBe('identity.role.renamed');
    expect(event.aggregateVersion).toBe(2);
    expect(event.roleId).toBe(rd.id);
    expect(event.oldName).toBe('admin');
    expect(event.newName).toBe('super-admin');
    expect(event.eventId).toBe(eventId);
  });

  it('increments version', () => {
    const rd = createRoleDefinition();
    rd.rename('super-admin', nextEventId(), at(T1));
    expect(rd.version).toBe(2);
  });

  it('trims whitespace from new name', () => {
    const rd = createRoleDefinition({ name: 'admin' });
    rd.rename('  super-admin  ', nextEventId(), at(T1));
    expect(rd.name).toBe('super-admin');
  });

  it('is a no-op when name is unchanged', () => {
    const rd = createRoleDefinition({ name: 'admin' });
    rd.rename('admin', nextEventId(), at(T1));
    expect(rd.getUncommittedEvents()).toHaveLength(1);
  });

  it('throws when name is empty', () => {
    const rd = createRoleDefinition();
    expect(() => {
      rd.rename('  ', nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when deleted', () => {
    const rd = createArchivedRole();
    expect(() => {
      rd.rename('new-name', nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('RoleDefinition Aggregate — changeDescription()', () => {
  it('updates the description', () => {
    const rd = createRoleDefinition({ name: 'admin', description: 'old desc' });
    rd.changeDescription('new desc', nextEventId(), at(T1));
    expect(rd.description).toBe('new desc');
  });

  it('emits RoleDescriptionChanged event', () => {
    const rd = createRoleDefinition({ name: 'admin', description: 'old desc' });
    const eventId = nextEventId();
    rd.changeDescription('new desc', eventId, at(T1));

    const events = rd.getUncommittedEvents();
    const event = events[1] as RoleDescriptionChanged;
    expect(event).toBeInstanceOf(RoleDescriptionChanged);
    expect(event.eventType).toBe('identity.role.description.changed');
    expect(event.aggregateVersion).toBe(2);
    expect(event.oldDescription).toBe('old desc');
    expect(event.newDescription).toBe('new desc');
    expect(event.eventId).toBe(eventId);
  });

  it('sets description to null', () => {
    const rd = createRoleDefinition({ name: 'admin', description: 'desc' });
    rd.changeDescription(null, nextEventId(), at(T1));
    expect(rd.description).toBeNull();
  });

  it('sets description from null to value', () => {
    const rd = createRoleDefinition({ name: 'admin', description: null });
    rd.changeDescription('now has desc', nextEventId(), at(T1));
    expect(rd.description).toBe('now has desc');
  });

  it('is a no-op when description is unchanged', () => {
    const rd = createRoleDefinition({ name: 'admin', description: 'same' });
    rd.changeDescription('same', nextEventId(), at(T1));
    expect(rd.getUncommittedEvents()).toHaveLength(1);
  });

  it('is a no-op when both are null', () => {
    const rd = createRoleDefinition({ name: 'admin', description: null });
    rd.changeDescription(null, nextEventId(), at(T1));
    expect(rd.getUncommittedEvents()).toHaveLength(1);
  });

  it('trims whitespace', () => {
    const rd = createRoleDefinition({ name: 'admin', description: 'old' });
    rd.changeDescription('  new  ', nextEventId(), at(T1));
    expect(rd.description).toBe('new');
  });

  it('throws when deleted', () => {
    const rd = createArchivedRole();
    expect(() => {
      rd.changeDescription('desc', nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('RoleDefinition Aggregate — assignPermission()', () => {
  it('adds a permission', () => {
    const rd = createRoleDefinition();
    rd.assignPermission(perm('user:read'), nextEventId(), at(T1));
    expect(rd.permissions).toHaveLength(1);
    expect(rd.permissions[0]?.toString()).toBe('user:read');
  });

  it('emits RolePermissionAssigned event', () => {
    const rd = createRoleDefinition();
    const eventId = nextEventId();
    rd.assignPermission(perm('user:read'), eventId, at(T1));

    const events = rd.getUncommittedEvents();
    const event = events[1] as RolePermissionAssigned;
    expect(event).toBeInstanceOf(RolePermissionAssigned);
    expect(event.eventType).toBe('identity.role.permission.assigned');
    expect(event.aggregateVersion).toBe(2);
    expect(event.permission.toString()).toBe('user:read');
    expect(event.eventId).toBe(eventId);
  });

  it('maintains sorted order', () => {
    const rd = createRoleDefinition({ permissions: [perm('z:access')] });
    rd.assignPermission(perm('a:access'), nextEventId(), at(T1));
    expect(rd.permissions[0]?.toString()).toBe('a:access');
    expect(rd.permissions[1]?.toString()).toBe('z:access');
  });

  it('throws when permission already assigned', () => {
    const rd = createRoleDefinition({ permissions: [perm('user:read')] });
    expect(() => {
      rd.assignPermission(perm('user:read'), nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when deleted', () => {
    const rd = createArchivedRole();
    expect(() => {
      rd.assignPermission(perm('user:read'), nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('RoleDefinition Aggregate — revokePermission()', () => {
  it('removes a permission', () => {
    const rd = createRoleWithPermissions();
    rd.revokePermission(perm('user:read'), nextEventId(), at(T1));
    expect(rd.permissions).toHaveLength(1);
    expect(rd.permissions[0]?.toString()).toBe('user:write');
  });

  it('emits RolePermissionRevoked event', () => {
    const rd = createRoleWithPermissions();
    const eventId = nextEventId();
    rd.revokePermission(perm('user:read'), eventId, at(T1));

    const events = rd.getUncommittedEvents();
    const event = events[1] as RolePermissionRevoked;
    expect(event).toBeInstanceOf(RolePermissionRevoked);
    expect(event.eventType).toBe('identity.role.permission.revoked');
    expect(event.aggregateVersion).toBe(2);
    expect(event.permission.toString()).toBe('user:read');
    expect(event.eventId).toBe(eventId);
  });

  it('increments version', () => {
    const rd = createRoleWithPermissions();
    rd.revokePermission(perm('user:read'), nextEventId(), at(T1));
    expect(rd.version).toBe(2);
  });

  it('throws when permission not assigned', () => {
    const rd = createRoleDefinition();
    expect(() => {
      rd.revokePermission(perm('user:read'), nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when deleted', () => {
    const rd = createArchivedRole();
    expect(() => {
      rd.revokePermission(perm('user:read'), nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('RoleDefinition Aggregate — activate()', () => {
  it('marks as active', () => {
    const rd = createInactiveRole();
    rd.activate(nextEventId(), at(T2));
    expect(rd.active).toBe(true);
  });

  it('emits RoleActivated event', () => {
    const rd = createInactiveRole();
    const eventId = nextEventId();
    rd.activate(eventId, at(T2));

    const events = rd.getUncommittedEvents();
    const event = events[2] as RoleActivated;
    expect(event).toBeInstanceOf(RoleActivated);
    expect(event.eventType).toBe('identity.role.activated');
    expect(event.aggregateVersion).toBe(3);
    expect(event.eventId).toBe(eventId);
  });

  it('throws when already active', () => {
    const rd = createActiveRole();
    expect(() => {
      rd.activate(nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when deleted', () => {
    const rd = createArchivedRole();
    expect(() => {
      rd.activate(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('RoleDefinition Aggregate — deactivate()', () => {
  it('marks as inactive', () => {
    const rd = createActiveRole();
    rd.deactivate(nextEventId(), at(T1));
    expect(rd.active).toBe(false);
  });

  it('emits RoleDeactivated event', () => {
    const rd = createActiveRole();
    const eventId = nextEventId();
    rd.deactivate(eventId, at(T1));

    const events = rd.getUncommittedEvents();
    const event = events[1] as RoleDeactivated;
    expect(event).toBeInstanceOf(RoleDeactivated);
    expect(event.eventType).toBe('identity.role.deactivated');
    expect(event.aggregateVersion).toBe(2);
    expect(event.eventId).toBe(eventId);
  });

  it('throws when already inactive', () => {
    const rd = createInactiveRole();
    expect(() => {
      rd.deactivate(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when deleted', () => {
    const rd = createArchivedRole();
    expect(() => {
      rd.deactivate(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('RoleDefinition Aggregate — archive()', () => {
  it('marks as deleted and inactive', () => {
    const rd = createActiveRole();
    rd.archive(nextEventId(), at(T1));
    expect(rd.deleted).toBe(true);
    expect(rd.active).toBe(false);
  });

  it('emits RoleDeleted event', () => {
    const rd = createActiveRole();
    const eventId = nextEventId();
    rd.archive(eventId, at(T1));

    const events = rd.getUncommittedEvents();
    const event = events[1] as RoleDeleted;
    expect(event).toBeInstanceOf(RoleDeleted);
    expect(event.eventType).toBe('identity.role.deleted');
    expect(event.aggregateVersion).toBe(2);
    expect(event.eventId).toBe(eventId);
  });

  it('throws when already deleted', () => {
    const rd = createArchivedRole();
    expect(() => {
      rd.archive(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('RoleDefinition Aggregate — Event replay from history', () => {
  it('rebuilds identical state from event history', () => {
    const original = createRoleDefinition({ name: 'mod', permissions: [perm('user:read')] });
    original.rename('moderator', nextEventId(), at(T1));
    original.assignPermission(perm('user:write'), nextEventId(), at(T2));

    const history = original.getUncommittedEvents();
    const rebuilt = RoleDefinition.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.version).toBe(original.version);
    expect(rebuilt.name).toBe('moderator');
    expect(rebuilt.permissions).toHaveLength(2);
    expect(rebuilt.active).toBe(true);
    expect(rebuilt.deleted).toBe(false);
  });

  it('rebuilds deactivated state from history', () => {
    const original = createActiveRole();
    original.deactivate(nextEventId(), at(T1));

    const history = original.getUncommittedEvents();
    const rebuilt = RoleDefinition.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.active).toBe(false);
  });

  it('rebuilds archived state from history', () => {
    const original = createActiveRole();
    original.archive(nextEventId(), at(T1));

    const history = original.getUncommittedEvents();
    const rebuilt = RoleDefinition.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.deleted).toBe(true);
    expect(rebuilt.active).toBe(false);
  });

  it('rebuilds permission mutations from history', () => {
    const original = createRoleWithPermissions();
    original.assignPermission(perm('user:delete'), nextEventId(), at(T1));
    original.revokePermission(perm('user:read'), nextEventId(), at(T2));

    const history = original.getUncommittedEvents();
    const rebuilt = RoleDefinition.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.permissions).toHaveLength(2);
    expect(rebuilt.permissions[0]?.toString()).toBe('user:delete');
    expect(rebuilt.permissions[1]?.toString()).toBe('user:write');
  });

  it('produces identical state across multiple replays', () => {
    const original = createRoleDefinition({ name: 'role' });
    original.rename('updated', nextEventId(), at(T1));

    const history = original.getUncommittedEvents();
    const first = RoleDefinition.reconstitute(original.id);
    first.loadFromHistory(history);
    const second = RoleDefinition.reconstitute(original.id);
    second.loadFromHistory(history);

    expect(first.version).toBe(second.version);
    expect(first.name).toBe(second.name);
    expect(first.active).toBe(second.active);
  });
});

describe('RoleDefinition Aggregate — Snapshot serialization', () => {
  it('serializes to snapshot and restores identical state', () => {
    const original = createRoleDefinition({
      name: 'editor',
      description: 'Can edit',
      permissions: [perm('content:write'), perm('content:read')],
    });
    original.deactivate(nextEventId(), at(T1));

    const snapshot = original.toSnapshot();
    const restored = RoleDefinition.fromSnapshot(snapshot);

    expect(restored.id.toString()).toBe(original.id.toString());
    expect(restored.name).toBe(original.name);
    expect(restored.description).toBe(original.description);
    expect(restored.permissions.map((p) => p.toString())).toEqual(
      original.permissions.map((p) => p.toString()),
    );
    expect(restored.active).toBe(original.active);
    expect(restored.deleted).toBe(original.deleted);
    expect(restored.createdAt.toISOString()).toBe(original.createdAt.toISOString());
    expect(restored.updatedAt.toISOString()).toBe(original.updatedAt.toISOString());
    expect(restored.version).toBe(original.version);
  });

  it('serializes archived state correctly', () => {
    const original = createArchivedRole();

    const snapshot = original.toSnapshot();
    const restored = RoleDefinition.fromSnapshot(snapshot);

    expect(restored.deleted).toBe(true);
    expect(restored.active).toBe(false);
  });

  it('restores version from snapshot', () => {
    const original = createRoleWithPermissions();
    original.assignPermission(perm('user:delete'), nextEventId(), at(T1));
    const snapshot = original.toSnapshot();
    const restored = RoleDefinition.fromSnapshot(snapshot);
    expect(restored.version).toBe(2);
  });
});

describe('RoleDefinition Aggregate — Equality', () => {
  it('two roles with same id are equal', () => {
    const id = validRoleId();
    const a = RoleDefinition.create(id, 'admin', null, [], nextEventId(), at(T0));
    const b = RoleDefinition.reconstitute(id);
    expect(a.equals(b)).toBe(true);
  });

  it('two roles with different ids are not equal', () => {
    const a = createRoleDefinition();
    const b = createRoleDefinition();
    expect(a.equals(b)).toBe(false);
  });

  it('equals returns false for null', () => {
    const rd = createRoleDefinition();
    expect(rd.equals(null)).toBe(false);
  });

  it('equals returns false for undefined', () => {
    const rd = createRoleDefinition();
    expect(rd.equals(undefined)).toBe(false);
  });
});

describe('RoleDefinition Aggregate — Uncommitted events lifecycle', () => {
  it('markEventsAsCommitted clears uncommitted events', () => {
    const rd = createRoleDefinition({ name: 'role' });
    rd.rename('updated', nextEventId(), at(T1));
    expect(rd.getUncommittedEvents()).toHaveLength(2);

    rd.markEventsAsCommitted();
    expect(rd.getUncommittedEvents()).toHaveLength(0);
    expect(rd.version).toBe(2);
  });
});

describe('RoleDefinition Aggregate — Full lifecycle integration', () => {
  it('supports full lifecycle: create → rename → assign → revoke → deactivate → activate', () => {
    const rd = createRoleDefinition({
      name: 'initial',
      description: 'Initial desc',
      permissions: [perm('read:basic')],
    });

    expect(rd.name).toBe('initial');
    expect(rd.active).toBe(true);

    rd.rename('advanced', nextEventId(), at(T1));
    expect(rd.name).toBe('advanced');

    rd.assignPermission(perm('write:data'), nextEventId(), at(T2));
    expect(rd.permissions).toHaveLength(2);

    rd.revokePermission(perm('read:basic'), nextEventId(), at(T3));
    expect(rd.permissions).toHaveLength(1);
    expect(rd.permissions[0]?.toString()).toBe('write:data');

    rd.deactivate(nextEventId(), at(T4));
    expect(rd.active).toBe(false);

    rd.activate(nextEventId(), at(T5));
    expect(rd.active).toBe(true);

    expect(rd.version).toBe(6);
    expect(rd.getUncommittedEvents()).toHaveLength(6);
  });

  it('supports: create → archive, all operations blocked', () => {
    const rd = createRoleDefinition({ name: 'temp', permissions: [perm('read:temp')] });
    rd.archive(nextEventId(), at(T1));

    expect(rd.deleted).toBe(true);
    expect(rd.active).toBe(false);

    expect(() => {
      rd.rename('n', nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      rd.changeDescription('d', nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      rd.assignPermission(perm('x:y'), nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      rd.revokePermission(perm('read:temp'), nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      rd.activate(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      rd.deactivate(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('supports: create → deactivate → activate → deactivate', () => {
    const rd = createActiveRole();
    rd.deactivate(nextEventId(), at(T1));
    expect(rd.active).toBe(false);

    rd.activate(nextEventId(), at(T2));
    expect(rd.active).toBe(true);

    rd.deactivate(nextEventId(), at(T3));
    expect(rd.active).toBe(false);

    expect(rd.version).toBe(4);
  });
});
