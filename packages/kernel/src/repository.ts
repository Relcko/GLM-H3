import { NotFoundError } from '@relcko/errors';

import type { AggregateRoot } from './aggregate-root';

/**
 * Write-side repository contract for an aggregate type (Playbook 6.1).
 *
 * Implementations persist the aggregate (typically by appending its
 * uncommitted events to the event store) and rebuild it on load.
 * Naming follows Playbook 8.1: interfaces use the `I` prefix.
 *
 * @typeParam TAggregate - aggregate root type managed by the repository
 * @typeParam TId - branded identifier type of the aggregate
 */
export interface IRepository<TAggregate extends AggregateRoot<TId>, TId> {
  /**
   * Loads an aggregate by identifier.
   *
   * @param id - aggregate identifier
   * @returns the aggregate, or null when it does not exist
   */
  findById(id: TId): Promise<TAggregate | null>;

  /**
   * Loads an aggregate by identifier, failing when absent.
   *
   * @param id - aggregate identifier
   * @returns the aggregate
   * @throws {NotFoundError} when the aggregate does not exist
   */
  getById(id: TId): Promise<TAggregate>;

  /**
   * Persists the aggregate and commits its uncommitted events.
   *
   * @param aggregate - aggregate instance to persist
   */
  save(aggregate: TAggregate): Promise<void>;

  /**
   * Removes the aggregate with the given identifier.
   *
   * @param id - aggregate identifier
   */
  delete(id: TId): Promise<void>;
}

/**
 * Read-side repository contract for read models (CQRS query side).
 *
 * @typeParam TReadModel - read model type
 * @typeParam TId - identifier type of the read model
 */
export interface IReadRepository<TReadModel, TId> {
  /**
   * Finds a read model by identifier.
   *
   * @param id - read model identifier
   * @returns the read model, or null when it does not exist
   */
  findById(id: TId): Promise<TReadModel | null>;

  /**
   * Checks whether a read model exists for the given identifier.
   *
   * @param id - read model identifier
   * @returns true when the read model exists
   */
  exists(id: TId): Promise<boolean>;
}

/**
 * Convenience helper implementing the {@link IRepository.getById} contract on
 * top of {@link IRepository.findById} for repository implementations.
 *
 * @param entityType - aggregate type name used in the error
 * @param id - aggregate identifier
 * @param aggregate - result of findById
 * @returns the non-null aggregate
 * @throws {NotFoundError} when the aggregate is null
 */
export function requireAggregate<TAggregate extends AggregateRoot<TId>, TId>(
  entityType: string,
  id: TId,
  aggregate: TAggregate | null,
): TAggregate {
  if (aggregate === null) {
    throw new NotFoundError(entityType, String(id));
  }
  return aggregate;
}
