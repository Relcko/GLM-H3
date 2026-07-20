import { InvariantViolationError } from '@relcko/errors';
import { describe, expect, it } from 'vitest';

import { Organization } from '../../aggregates/organization';
import {
  OrganizationActivated,
  OrganizationArchived,
  OrganizationCreated,
  OrganizationDeactivated,
  OrganizationDescriptionUpdated,
  OrganizationDisplayNameUpdated,
  OrganizationRenamed,
  OrganizationRestored,
} from '../../events/organization-events';
import { OrganizationId } from '../../value-objects';

import type { EventId } from '@relcko/types';

const nextEventId = (): EventId => crypto.randomUUID() as EventId;
const at = (iso: string): Date => new Date(iso);

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-01-02T00:00:00.000Z';
const T2 = '2026-01-03T00:00:00.000Z';
const T3 = '2026-01-04T00:00:00.000Z';
const T4 = '2026-01-05T00:00:00.000Z';
const T5 = '2026-01-06T00:00:00.000Z';
const T6 = '2026-01-07T00:00:00.000Z';

const validOrgId = (): OrganizationId => new OrganizationId(crypto.randomUUID());

function createOrganization(overrides?: {
  id?: OrganizationId;
  name?: string;
  displayName?: string | null;
  description?: string | null;
}): Organization {
  return Organization.create(
    overrides?.id ?? validOrgId(),
    overrides?.name ?? 'acme-corp',
    overrides?.displayName ?? null,
    overrides?.description ?? null,
    nextEventId(),
    at(T0),
  );
}

function createActiveOrganization(): Organization {
  return createOrganization();
}

function createInactiveOrganization(): Organization {
  const org = createOrganization();
  org.deactivate(nextEventId(), at(T1));
  return org;
}

function createArchivedOrganization(): Organization {
  const org = createOrganization();
  org.archive(nextEventId(), at(T1));
  return org;
}

function createRestoredOrganization(): Organization {
  const org = createOrganization();
  org.archive(nextEventId(), at(T1));
  org.restore(nextEventId(), at(T2));
  return org;
}

describe('Organization Aggregate — Factory: create()', () => {
  it('creates with correct state', () => {
    const id = validOrgId();
    const org = Organization.create(
      id,
      'my-org',
      'My Organization',
      'A sample org',
      nextEventId(),
      at(T0),
    );

    expect(org.id).toBe(id);
    expect(org.name).toBe('my-org');
    expect(org.displayName).toBe('My Organization');
    expect(org.description).toBe('A sample org');
    expect(org.active).toBe(true);
    expect(org.deleted).toBe(false);
    expect(org.archivedAt).toBeNull();
    expect(org.status).toBe('active');
  });

  it('initializes as active', () => {
    const org = createOrganization();
    expect(org.active).toBe(true);
    expect(org.deleted).toBe(false);
    expect(org.status).toBe('active');
  });

  it('initializes timestamps correctly', () => {
    const org = createOrganization();
    expect(org.createdAt).toEqual(at(T0));
    expect(org.updatedAt).toEqual(at(T0));
  });

  it('emits OrganizationCreated event with correct payload', () => {
    const id = validOrgId();
    const org = Organization.create(id, 'my-org', 'Display', 'Description', nextEventId(), at(T0));

    const events = org.getUncommittedEvents();
    expect(events).toHaveLength(1);
    const event = events[0] as OrganizationCreated;
    expect(event).toBeInstanceOf(OrganizationCreated);
    expect(event.eventType).toBe('identity.organization.created');
    expect(event.aggregateType).toBe('Organization');
    expect(event.aggregateVersion).toBe(1);
    expect(event.occurredAt).toEqual(at(T0));
    expect(event.organizationId).toBe(id);
    expect(event.name).toBe('my-org');
    expect(event.displayName).toBe('Display');
    expect(event.description).toBe('Description');
    expect(event.createdAt).toEqual(at(T0));
  });

  it('starts at version 1', () => {
    const org = createOrganization();
    expect(org.version).toBe(1);
  });

  it('trims whitespace from name', () => {
    const org = createOrganization({ name: '  acme  ' });
    expect(org.name).toBe('acme');
  });

  it('trims whitespace from displayName', () => {
    const org = createOrganization({ name: 'acme', displayName: '  Acme Corp  ' });
    expect(org.displayName).toBe('Acme Corp');
  });

  it('trims whitespace from description', () => {
    const org = createOrganization({ name: 'acme', description: '  desc  ' });
    expect(org.description).toBe('desc');
  });

  it('sets null displayName and description', () => {
    const org = createOrganization({ name: 'acme', displayName: null, description: null });
    expect(org.displayName).toBeNull();
    expect(org.description).toBeNull();
  });

  it('throws when name is empty', () => {
    expect(() => {
      createOrganization({ name: '  ' });
    }).toThrow(InvariantViolationError);
  });
});

describe('Organization Aggregate — rename()', () => {
  it('updates the name', () => {
    const org = createOrganization({ name: 'old-name' });
    org.rename('new-name', nextEventId(), at(T1));
    expect(org.name).toBe('new-name');
  });

  it('emits OrganizationRenamed event', () => {
    const org = createOrganization({ name: 'old-name' });
    const eventId = nextEventId();
    org.rename('new-name', eventId, at(T1));

    const events = org.getUncommittedEvents();
    expect(events).toHaveLength(2);
    const event = events[1] as OrganizationRenamed;
    expect(event).toBeInstanceOf(OrganizationRenamed);
    expect(event.eventType).toBe('identity.organization.renamed');
    expect(event.aggregateVersion).toBe(2);
    expect(event.organizationId).toBe(org.id);
    expect(event.oldName).toBe('old-name');
    expect(event.newName).toBe('new-name');
    expect(event.eventId).toBe(eventId);
  });

  it('increments version', () => {
    const org = createOrganization();
    org.rename('new-name', nextEventId(), at(T1));
    expect(org.version).toBe(2);
  });

  it('trims whitespace from new name', () => {
    const org = createOrganization({ name: 'old-name' });
    org.rename('  new-name  ', nextEventId(), at(T1));
    expect(org.name).toBe('new-name');
  });

  it('is a no-op when name is unchanged', () => {
    const org = createOrganization({ name: 'same' });
    org.rename('same', nextEventId(), at(T1));
    expect(org.getUncommittedEvents()).toHaveLength(1);
  });

  it('throws when name is empty', () => {
    const org = createOrganization();
    expect(() => {
      org.rename('  ', nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when archived', () => {
    const org = createArchivedOrganization();
    expect(() => {
      org.rename('new-name', nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('Organization Aggregate — updateDisplayName()', () => {
  it('updates the display name', () => {
    const org = createOrganization({ name: 'acme', displayName: 'Old Display' });
    org.updateDisplayName('New Display', nextEventId(), at(T1));
    expect(org.displayName).toBe('New Display');
  });

  it('emits OrganizationDisplayNameUpdated event', () => {
    const org = createOrganization({ name: 'acme', displayName: 'Old Display' });
    const eventId = nextEventId();
    org.updateDisplayName('New Display', eventId, at(T1));

    const events = org.getUncommittedEvents();
    const event = events[1] as OrganizationDisplayNameUpdated;
    expect(event).toBeInstanceOf(OrganizationDisplayNameUpdated);
    expect(event.eventType).toBe('identity.organization.display_name.updated');
    expect(event.aggregateVersion).toBe(2);
    expect(event.oldDisplayName).toBe('Old Display');
    expect(event.newDisplayName).toBe('New Display');
    expect(event.eventId).toBe(eventId);
  });

  it('sets display name from null to value', () => {
    const org = createOrganization({ name: 'acme', displayName: null });
    org.updateDisplayName('Display', nextEventId(), at(T1));
    expect(org.displayName).toBe('Display');
  });

  it('sets display name to null', () => {
    const org = createOrganization({ name: 'acme', displayName: 'Display' });
    org.updateDisplayName(null, nextEventId(), at(T1));
    expect(org.displayName).toBeNull();
  });

  it('is a no-op when display name is unchanged', () => {
    const org = createOrganization({ name: 'acme', displayName: 'Same' });
    org.updateDisplayName('Same', nextEventId(), at(T1));
    expect(org.getUncommittedEvents()).toHaveLength(1);
  });

  it('is a no-op when both are null', () => {
    const org = createOrganization({ name: 'acme', displayName: null });
    org.updateDisplayName(null, nextEventId(), at(T1));
    expect(org.getUncommittedEvents()).toHaveLength(1);
  });

  it('trims whitespace', () => {
    const org = createOrganization({ name: 'acme', displayName: 'Old' });
    org.updateDisplayName('  New  ', nextEventId(), at(T1));
    expect(org.displayName).toBe('New');
  });

  it('throws when archived', () => {
    const org = createArchivedOrganization();
    expect(() => {
      org.updateDisplayName('Display', nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('Organization Aggregate — updateDescription()', () => {
  it('updates the description', () => {
    const org = createOrganization({ name: 'acme', description: 'old desc' });
    org.updateDescription('new desc', nextEventId(), at(T1));
    expect(org.description).toBe('new desc');
  });

  it('emits OrganizationDescriptionUpdated event', () => {
    const org = createOrganization({ name: 'acme', description: 'old desc' });
    const eventId = nextEventId();
    org.updateDescription('new desc', eventId, at(T1));

    const events = org.getUncommittedEvents();
    const event = events[1] as OrganizationDescriptionUpdated;
    expect(event).toBeInstanceOf(OrganizationDescriptionUpdated);
    expect(event.eventType).toBe('identity.organization.description.updated');
    expect(event.aggregateVersion).toBe(2);
    expect(event.oldDescription).toBe('old desc');
    expect(event.newDescription).toBe('new desc');
    expect(event.eventId).toBe(eventId);
  });

  it('sets description to null', () => {
    const org = createOrganization({ name: 'acme', description: 'desc' });
    org.updateDescription(null, nextEventId(), at(T1));
    expect(org.description).toBeNull();
  });

  it('sets description from null to value', () => {
    const org = createOrganization({ name: 'acme', description: null });
    org.updateDescription('now has desc', nextEventId(), at(T1));
    expect(org.description).toBe('now has desc');
  });

  it('is a no-op when description is unchanged', () => {
    const org = createOrganization({ name: 'acme', description: 'same' });
    org.updateDescription('same', nextEventId(), at(T1));
    expect(org.getUncommittedEvents()).toHaveLength(1);
  });

  it('is a no-op when both are null', () => {
    const org = createOrganization({ name: 'acme', description: null });
    org.updateDescription(null, nextEventId(), at(T1));
    expect(org.getUncommittedEvents()).toHaveLength(1);
  });

  it('trims whitespace', () => {
    const org = createOrganization({ name: 'acme', description: 'old' });
    org.updateDescription('  new  ', nextEventId(), at(T1));
    expect(org.description).toBe('new');
  });

  it('throws when archived', () => {
    const org = createArchivedOrganization();
    expect(() => {
      org.updateDescription('desc', nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('Organization Aggregate — activate()', () => {
  it('marks as active', () => {
    const org = createInactiveOrganization();
    org.activate(nextEventId(), at(T2));
    expect(org.active).toBe(true);
    expect(org.status).toBe('active');
  });

  it('emits OrganizationActivated event', () => {
    const org = createInactiveOrganization();
    const eventId = nextEventId();
    org.activate(eventId, at(T2));

    const events = org.getUncommittedEvents();
    const event = events[2] as OrganizationActivated;
    expect(event).toBeInstanceOf(OrganizationActivated);
    expect(event.eventType).toBe('identity.organization.activated');
    expect(event.aggregateVersion).toBe(3);
    expect(event.eventId).toBe(eventId);
  });

  it('throws when already active', () => {
    const org = createActiveOrganization();
    expect(() => {
      org.activate(nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when archived', () => {
    const org = createArchivedOrganization();
    expect(() => {
      org.activate(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('Organization Aggregate — deactivate()', () => {
  it('marks as inactive', () => {
    const org = createActiveOrganization();
    org.deactivate(nextEventId(), at(T1));
    expect(org.active).toBe(false);
    expect(org.status).toBe('inactive');
  });

  it('emits OrganizationDeactivated event', () => {
    const org = createActiveOrganization();
    const eventId = nextEventId();
    org.deactivate(eventId, at(T1));

    const events = org.getUncommittedEvents();
    const event = events[1] as OrganizationDeactivated;
    expect(event).toBeInstanceOf(OrganizationDeactivated);
    expect(event.eventType).toBe('identity.organization.deactivated');
    expect(event.aggregateVersion).toBe(2);
    expect(event.eventId).toBe(eventId);
  });

  it('throws when already inactive', () => {
    const org = createInactiveOrganization();
    expect(() => {
      org.deactivate(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when archived', () => {
    const org = createArchivedOrganization();
    expect(() => {
      org.deactivate(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('Organization Aggregate — archive()', () => {
  it('marks as deleted and inactive', () => {
    const org = createActiveOrganization();
    org.archive(nextEventId(), at(T1));
    expect(org.deleted).toBe(true);
    expect(org.active).toBe(false);
    expect(org.status).toBe('archived');
    expect(org.archivedAt).toEqual(at(T1));
  });

  it('emits OrganizationArchived event', () => {
    const org = createActiveOrganization();
    const eventId = nextEventId();
    org.archive(eventId, at(T1));

    const events = org.getUncommittedEvents();
    const event = events[1] as OrganizationArchived;
    expect(event).toBeInstanceOf(OrganizationArchived);
    expect(event.eventType).toBe('identity.organization.archived');
    expect(event.aggregateVersion).toBe(2);
    expect(event.eventId).toBe(eventId);
    expect(event.archivedAt).toEqual(at(T1));
  });

  it('increments version', () => {
    const org = createActiveOrganization();
    org.archive(nextEventId(), at(T1));
    expect(org.version).toBe(2);
  });

  it('throws when already archived', () => {
    const org = createArchivedOrganization();
    expect(() => {
      org.archive(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('Organization Aggregate — restore()', () => {
  it('restores an archived organization', () => {
    const org = createArchivedOrganization();
    org.restore(nextEventId(), at(T2));
    expect(org.deleted).toBe(false);
    expect(org.active).toBe(true);
    expect(org.status).toBe('active');
    expect(org.archivedAt).toBeNull();
  });

  it('emits OrganizationRestored event', () => {
    const org = createArchivedOrganization();
    const eventId = nextEventId();
    org.restore(eventId, at(T2));

    const events = org.getUncommittedEvents();
    const event = events[2] as OrganizationRestored;
    expect(event).toBeInstanceOf(OrganizationRestored);
    expect(event.eventType).toBe('identity.organization.restored');
    expect(event.aggregateVersion).toBe(3);
    expect(event.eventId).toBe(eventId);
    expect(event.restoredAt).toEqual(at(T2));
  });

  it('increments version', () => {
    const org = createArchivedOrganization();
    org.restore(nextEventId(), at(T2));
    expect(org.version).toBe(3);
  });

  it('throws when not archived', () => {
    const org = createActiveOrganization();
    expect(() => {
      org.restore(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('throws when active (not archived)', () => {
    const org = createActiveOrganization();
    expect(() => {
      org.restore(nextEventId(), at(T1));
    }).toThrow(InvariantViolationError);
  });

  it('throws when inactive (not archived)', () => {
    const org = createInactiveOrganization();
    expect(() => {
      org.restore(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });
});

describe('Organization Aggregate — Event replay from history', () => {
  it('rebuilds identical state from event history', () => {
    const original = createOrganization({ name: 'org', displayName: 'Org' });
    original.rename('renamed-org', nextEventId(), at(T1));
    original.updateDescription('desc', nextEventId(), at(T2));

    const history = original.getUncommittedEvents();
    const rebuilt = Organization.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.version).toBe(original.version);
    expect(rebuilt.name).toBe('renamed-org');
    expect(rebuilt.displayName).toBe('Org');
    expect(rebuilt.description).toBe('desc');
    expect(rebuilt.active).toBe(true);
    expect(rebuilt.deleted).toBe(false);
  });

  it('rebuilds deactivated state from history', () => {
    const original = createActiveOrganization();
    original.deactivate(nextEventId(), at(T1));

    const history = original.getUncommittedEvents();
    const rebuilt = Organization.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.active).toBe(false);
    expect(rebuilt.status).toBe('inactive');
  });

  it('rebuilds archived state from history', () => {
    const original = createActiveOrganization();
    original.archive(nextEventId(), at(T1));

    const history = original.getUncommittedEvents();
    const rebuilt = Organization.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.deleted).toBe(true);
    expect(rebuilt.active).toBe(false);
    expect(rebuilt.status).toBe('archived');
    expect(rebuilt.archivedAt).toEqual(at(T1));
  });

  it('rebuilds restored state from history', () => {
    const original = createRestoredOrganization();

    const history = original.getUncommittedEvents();
    const rebuilt = Organization.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.deleted).toBe(false);
    expect(rebuilt.active).toBe(true);
    expect(rebuilt.status).toBe('active');
    expect(rebuilt.archivedAt).toBeNull();
  });

  it('rebuilds display name mutations from history', () => {
    const original = createOrganization({ name: 'org', displayName: 'First' });
    original.updateDisplayName('Second', nextEventId(), at(T1));
    original.updateDisplayName(null, nextEventId(), at(T2));

    const history = original.getUncommittedEvents();
    const rebuilt = Organization.reconstitute(original.id);
    rebuilt.loadFromHistory(history);

    expect(rebuilt.displayName).toBeNull();
  });

  it('produces identical state across multiple replays', () => {
    const original = createOrganization({ name: 'org' });
    original.rename('updated', nextEventId(), at(T1));

    const history = original.getUncommittedEvents();
    const first = Organization.reconstitute(original.id);
    first.loadFromHistory(history);
    const second = Organization.reconstitute(original.id);
    second.loadFromHistory(history);

    expect(first.version).toBe(second.version);
    expect(first.name).toBe(second.name);
    expect(first.active).toBe(second.active);
  });
});

describe('Organization Aggregate — Snapshot serialization', () => {
  it('serializes to snapshot and restores identical state', () => {
    const original = createOrganization({
      name: 'my-org',
      displayName: 'My Org',
      description: 'An org',
    });
    original.deactivate(nextEventId(), at(T1));

    const snapshot = original.toSnapshot();
    const restored = Organization.fromSnapshot(snapshot);

    expect(restored.id.toString()).toBe(original.id.toString());
    expect(restored.name).toBe(original.name);
    expect(restored.displayName).toBe(original.displayName);
    expect(restored.description).toBe(original.description);
    expect(restored.active).toBe(original.active);
    expect(restored.deleted).toBe(original.deleted);
    expect(restored.archivedAt).toBeNull();
    expect(restored.createdAt.toISOString()).toBe(original.createdAt.toISOString());
    expect(restored.updatedAt.toISOString()).toBe(original.updatedAt.toISOString());
    expect(restored.version).toBe(original.version);
    expect(restored.status).toBe('inactive');
  });

  it('serializes archived state correctly', () => {
    const original = createArchivedOrganization();

    const snapshot = original.toSnapshot();
    const restored = Organization.fromSnapshot(snapshot);

    expect(restored.deleted).toBe(true);
    expect(restored.active).toBe(false);
    expect(restored.status).toBe('archived');
    expect(restored.archivedAt?.toISOString()).toBe(T1);
  });

  it('serializes restored state correctly', () => {
    const original = createRestoredOrganization();

    const snapshot = original.toSnapshot();
    const restored = Organization.fromSnapshot(snapshot);

    expect(restored.deleted).toBe(false);
    expect(restored.active).toBe(true);
    expect(restored.archivedAt).toBeNull();
  });

  it('serializes active with displayName and description', () => {
    const original = createOrganization({
      name: 'org',
      displayName: 'Display',
      description: 'Description',
    });

    const snapshot = original.toSnapshot();
    const restored = Organization.fromSnapshot(snapshot);

    expect(restored.displayName).toBe('Display');
    expect(restored.description).toBe('Description');
    expect(restored.status).toBe('active');
  });

  it('restores version from snapshot', () => {
    const original = createOrganization();
    original.rename('new', nextEventId(), at(T1));
    original.deactivate(nextEventId(), at(T2));

    const snapshot = original.toSnapshot();
    const restored = Organization.fromSnapshot(snapshot);

    expect(restored.version).toBe(3);
  });
});

describe('Organization Aggregate — Equality', () => {
  it('two organizations with same id are equal', () => {
    const id = validOrgId();
    const a = Organization.create(id, 'org', null, null, nextEventId(), at(T0));
    const b = Organization.reconstitute(id);
    expect(a.equals(b)).toBe(true);
  });

  it('two organizations with different ids are not equal', () => {
    const a = createOrganization();
    const b = createOrganization();
    expect(a.equals(b)).toBe(false);
  });

  it('equals returns false for null', () => {
    const org = createOrganization();
    expect(org.equals(null)).toBe(false);
  });

  it('equals returns false for undefined', () => {
    const org = createOrganization();
    expect(org.equals(undefined)).toBe(false);
  });
});

describe('Organization Aggregate — Uncommitted events lifecycle', () => {
  it('markEventsAsCommitted clears uncommitted events', () => {
    const org = createOrganization({ name: 'org' });
    org.rename('updated', nextEventId(), at(T1));
    expect(org.getUncommittedEvents()).toHaveLength(2);

    org.markEventsAsCommitted();
    expect(org.getUncommittedEvents()).toHaveLength(0);
    expect(org.version).toBe(2);
  });
});

describe('Organization Aggregate — Full lifecycle integration', () => {
  it('supports: create → rename → updateDisplayName → updateDescription → deactivate → activate', () => {
    const org = createOrganization({
      name: 'initial',
      displayName: 'Initial Display',
      description: 'Initial desc',
    });

    expect(org.name).toBe('initial');
    expect(org.active).toBe(true);
    expect(org.status).toBe('active');

    org.rename('advanced', nextEventId(), at(T1));
    expect(org.name).toBe('advanced');

    org.updateDisplayName('Advanced Display', nextEventId(), at(T2));
    expect(org.displayName).toBe('Advanced Display');

    org.updateDescription('Updated desc', nextEventId(), at(T3));
    expect(org.description).toBe('Updated desc');

    org.deactivate(nextEventId(), at(T4));
    expect(org.active).toBe(false);
    expect(org.status).toBe('inactive');

    org.activate(nextEventId(), at(T5));
    expect(org.active).toBe(true);
    expect(org.status).toBe('active');

    expect(org.version).toBe(6);
    expect(org.getUncommittedEvents()).toHaveLength(6);
  });

  it('supports: create → archive → restore, all operations available after restore', () => {
    const org = createOrganization({ name: 'temp' });
    org.archive(nextEventId(), at(T1));

    expect(org.deleted).toBe(true);
    expect(org.active).toBe(false);
    expect(org.status).toBe('archived');

    expect(() => {
      org.rename('n', nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      org.updateDisplayName('d', nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      org.updateDescription('d', nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      org.activate(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      org.deactivate(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);

    org.restore(nextEventId(), at(T2));
    expect(org.deleted).toBe(false);
    expect(org.active).toBe(true);
    expect(org.status).toBe('active');
    expect(org.archivedAt).toBeNull();

    org.rename('restored-name', nextEventId(), at(T3));
    expect(org.name).toBe('restored-name');

    org.deactivate(nextEventId(), at(T4));
    expect(org.active).toBe(false);

    expect(org.version).toBe(5);
  });

  it('supports: create → deactivate → activate → deactivate', () => {
    const org = createActiveOrganization();
    org.deactivate(nextEventId(), at(T1));
    expect(org.active).toBe(false);

    org.activate(nextEventId(), at(T2));
    expect(org.active).toBe(true);

    org.deactivate(nextEventId(), at(T3));
    expect(org.active).toBe(false);

    expect(org.version).toBe(4);
  });

  it('supports: create → archive (all operations blocked)', () => {
    const org = createOrganization({ name: 'temp' });
    org.archive(nextEventId(), at(T1));

    expect(org.deleted).toBe(true);
    expect(org.active).toBe(false);
    expect(org.status).toBe('archived');

    expect(() => {
      org.rename('n', nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      org.updateDisplayName('d', nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      org.updateDescription('d', nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      org.activate(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
    expect(() => {
      org.deactivate(nextEventId(), at(T2));
    }).toThrow(InvariantViolationError);
  });

  it('supports: full create → rename → displayName → description → deactivate → activate → archive → restore → rename → deactivate', () => {
    const org = createOrganization({
      name: 'start',
      displayName: null,
      description: null,
    });

    org.rename('phase-1', nextEventId(), at(T1));
    org.updateDisplayName('Phase 1', nextEventId(), at(T2));
    org.updateDescription('First phase', nextEventId(), at(T3));
    org.deactivate(nextEventId(), at(T4));
    org.activate(nextEventId(), at(T5));
    org.archive(nextEventId(), at(T6));

    expect(org.status).toBe('archived');
    expect(org.version).toBe(7);

    org.restore(nextEventId(), at(T2));
    expect(org.status).toBe('active');
    expect(org.version).toBe(8);

    org.rename('phase-2', nextEventId(), at(T3));
    org.deactivate(nextEventId(), at(T4));

    expect(org.name).toBe('phase-2');
    expect(org.status).toBe('inactive');
    expect(org.version).toBe(10);
    expect(org.getUncommittedEvents()).toHaveLength(10);
  });
});
