/**
 * Base class for value objects.
 *
 * Value objects have no identity; they are compared structurally through
 * their equality components and must be immutable by construction.
 */
export abstract class ValueObject {
  /**
   * Returns the components that define structural equality, in a stable order.
   *
   * @returns iterable of equality-relevant components
   */
  protected abstract getEqualityComponents(): Iterable<unknown>;

  /**
   * Compares this value object to another by runtime type and components.
   *
   * @param other - value object to compare with (may be null or undefined)
   * @returns true when type and all equality components match (Object.is semantics)
   */
  public equals(other: ValueObject | null | undefined): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (this.constructor !== other.constructor) {
      return false;
    }
    const left = [...this.getEqualityComponents()];
    const right = [...other.getEqualityComponents()];
    if (left.length !== right.length) {
      return false;
    }
    return left.every((component, index) => Object.is(component, right[index]));
  }
}
