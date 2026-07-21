/**
 * Specification pattern (DDD).
 *
 * Encapsulates a reusable, composable business predicate as an object so
 * rules can be combined with AND / OR / NOT without duplicating logic.
 *
 * @typeParam T - candidate type evaluated by the specification
 */
export abstract class Specification<T> {
  /**
   * Evaluates the specification against a candidate.
   *
   * @param candidate - object to evaluate
   * @returns true when the candidate satisfies the specification
   */
  public abstract isSatisfiedBy(candidate: T): boolean;

  /**
   * Combines this specification with another using logical AND.
   *
   * @param other - specification to combine with
   * @returns composite specification
   */
  public and(other: Specification<T>): Specification<T> {
    return new AndSpecification(this, other);
  }

  /**
   * Combines this specification with another using logical OR.
   *
   * @param other - specification to combine with
   * @returns composite specification
   */
  public or(other: Specification<T>): Specification<T> {
    return new OrSpecification(this, other);
  }

  /**
   * Negates this specification.
   *
   * @returns composite specification
   */
  public not(): Specification<T> {
    return new NotSpecification(this);
  }
}

/** Composite specification evaluating left AND right. */
class AndSpecification<T> extends Specification<T> {
  constructor(
    private readonly left: Specification<T>,
    private readonly right: Specification<T>,
  ) {
    super();
  }

  public isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
}

/** Composite specification evaluating left OR right. */
class OrSpecification<T> extends Specification<T> {
  constructor(
    private readonly left: Specification<T>,
    private readonly right: Specification<T>,
  ) {
    super();
  }

  public isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
  }
}

/** Composite specification evaluating NOT inner. */
class NotSpecification<T> extends Specification<T> {
  constructor(private readonly inner: Specification<T>) {
    super();
  }

  public isSatisfiedBy(candidate: T): boolean {
    return !this.inner.isSatisfiedBy(candidate);
  }
}

/** Specification backed by a plain predicate function. */
class PredicateSpecification<T> extends Specification<T> {
  constructor(private readonly predicate: (candidate: T) => boolean) {
    super();
  }

  public isSatisfiedBy(candidate: T): boolean {
    return this.predicate(candidate);
  }
}

/**
 * Creates a {@link Specification} from a predicate function.
 *
 * @param predicate - boolean predicate over the candidate
 * @returns specification wrapping the predicate
 */
export function specification<T>(predicate: (candidate: T) => boolean): Specification<T> {
  return new PredicateSpecification(predicate);
}
