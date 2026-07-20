import { describe, expect, it } from 'vitest';

import {
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  ConfigurationError,
  InfrastructureError,
  InvariantViolationError,
  EventProcessingError,
} from './index';

describe('ValidationError', () => {
  it('creates with message and code', () => {
    const err = new ValidationError('Invalid input');
    expect(err.message).toBe('Invalid input');
    expect(err.name).toBe('ValidationError');
    expect(err.code).toBe('VALIDATION_ERROR');
  });
});

describe('NotFoundError', () => {
  it('creates with entity type and id', () => {
    const err = new NotFoundError('Agent', 'agent-123');
    expect(err.message).toBe('Agent with id agent-123 not found');
    expect(err.name).toBe('NotFoundError');
    expect(err.entityType).toBe('Agent');
    expect(err.entityId).toBe('agent-123');
  });
});

describe('ConflictError', () => {
  it('creates with message', () => {
    const err = new ConflictError('Already exists');
    expect(err.code).toBe('CONFLICT');
  });
});

describe('UnauthorizedError', () => {
  it('uses default message', () => {
    const err = new UnauthorizedError();
    expect(err.message).toBe('Unauthorized');
  });
});

describe('ForbiddenError', () => {
  it('uses default message', () => {
    const err = new ForbiddenError();
    expect(err.message).toBe('Forbidden');
  });
});

describe('ConfigurationError', () => {
  it('creates with message', () => {
    const err = new ConfigurationError('Invalid config');
    expect(err.code).toBe('CONFIGURATION_ERROR');
  });
});

describe('InfrastructureError', () => {
  it('creates with message', () => {
    const err = new InfrastructureError('DB connection failed');
    expect(err.code).toBe('INFRASTRUCTURE_ERROR');
  });
});

describe('InvariantViolationError', () => {
  it('creates with aggregate info', () => {
    const err = new InvariantViolationError('Commission', 'comm-1', 'amount must be positive');
    expect(err.message).toContain('amount must be positive');
    expect(err.aggregateType).toBe('Commission');
  });
});

describe('EventProcessingError', () => {
  it('creates with event info', () => {
    const err = new EventProcessingError('CommissionCalculated', 'evt-1', 'Handler failed');
    expect(err.eventType).toBe('CommissionCalculated');
    expect(err.eventId).toBe('evt-1');
  });
});
