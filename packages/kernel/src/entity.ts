/**
 * Base class for domain entities.
 *
 * Entities are compared by identity (type + identifier), never by their
 * mutable attributes (Playbook 8.1 - aggregates and entities are PascalCase).
 *
 * @typeParam TId - branded identifier type of the entity
 */
export abstract class Entity<TId> {
  /** Unique identifier of the entity. Immutable for the entity lifetime. */
  public readonly id: TId;

  /**
   * @param id - unique identifier of the entity
   */
  constructor(id: TId) {
    this.id = id;
  }

  /**
   * Compares this entity to another by runtime type and identifier.
   *
   * @param other - entity to compare with (may be null or undefined)
   * @returns true when both entities share type and identifier
   */
  public equals(other: Entity<TId> | null | undefined): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    return this.constructor === other.constructor && this.id === other.id;
  }
}
