/**
 * Unit of Work contract.
 *
 * Coordinates a single atomic write across repositories so that a use case
 * either persists all of its changes or none. Financial operations rely on
 * this boundary before any projection is updated (Playbook 2.4).
 */
export interface UnitOfWork {
  /** True while a transaction is open. */
  readonly isActive: boolean;

  /** Opens a new transaction. */
  begin(): Promise<void>;

  /** Commits the open transaction. */
  commit(): Promise<void>;

  /** Rolls back the open transaction. */
  rollback(): Promise<void>;

  /**
   * Runs work inside a transaction: begins, commits on success, rolls back
   * on any error and rethrows.
   *
   * @typeParam T - result type of the unit of work
   * @param work - operation to execute transactionally
   * @returns the result of work
   * @throws rethrows the original error after rollback
   */
  execute<T>(work: () => Promise<T>): Promise<T>;
}
