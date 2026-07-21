import { DomainError } from '@relcko/errors';

/**
 * Raised when referencing a projection that is not registered.
 */
export class ProjectionNotFoundError extends DomainError {
  constructor(public readonly projectionName: string) {
    super('PROJECTION_NOT_FOUND', `Projection '${projectionName}' is not registered`, {
      projectionName,
    });
  }
}

/**
 * Raised when registering a projection name that is already in use.
 */
export class ProjectionAlreadyRegisteredError extends DomainError {
  constructor(public readonly projectionName: string) {
    super(
      'PROJECTION_ALREADY_REGISTERED',
      `Projection '${projectionName}' is already registered`,
      { projectionName },
    );
  }
}
