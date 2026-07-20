export abstract class DomainError extends Error {
  public readonly code: string;
  public readonly context: Record<string, unknown>;

  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context ?? {};
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
    };
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, context);
  }
}

export class NotFoundError extends DomainError {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    context?: Record<string, unknown>,
  ) {
    super('NOT_FOUND', `${entityType} with id ${entityId} not found`, {
      entityType,
      entityId,
      ...context,
    });
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('CONFLICT', message, context);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized', context?: Record<string, unknown>) {
    super('UNAUTHORIZED', message, context);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Forbidden', context?: Record<string, unknown>) {
    super('FORBIDDEN', message, context);
  }
}

export class ConfigurationError extends DomainError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('CONFIGURATION_ERROR', message, context);
  }
}

export class InfrastructureError extends DomainError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('INFRASTRUCTURE_ERROR', message, context);
  }
}

export class InvariantViolationError extends DomainError {
  constructor(
    public readonly aggregateType: string,
    public readonly aggregateId: string,
    public readonly invariant: string,
    context?: Record<string, unknown>,
  ) {
    super('INVARIANT_VIOLATION', `Invariant '${invariant}' violated on ${aggregateType}(${aggregateId})`, {
      aggregateType,
      aggregateId,
      invariant,
      ...context,
    });
  }
}

export class EventProcessingError extends DomainError {
  constructor(
    public readonly eventType: string,
    public readonly eventId: string,
    message: string,
    context?: Record<string, unknown>,
  ) {
    super('EVENT_PROCESSING_ERROR', message, {
      eventType,
      eventId,
      ...context,
    });
  }
}
