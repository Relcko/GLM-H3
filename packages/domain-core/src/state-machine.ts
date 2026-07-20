import { DomainError } from "@relcko/error";

/**
 * Directional state-machine helper. `allowed` maps each state to the set of
 * states it may transition to. Used by entities whose lifecycle is locked.
 */
export function assertTransition<T extends string>(
  allowed: Readonly<Record<T, readonly T[]>>,
  current: T,
  next: T,
  entity: string,
): void {
  if (current === next) return;
  const permitted = allowed[current] ?? [];
  if (!permitted.includes(next)) {
    throw new DomainError(
      `${entity} transition ${current} -> ${next} is not permitted`,
      "INVALID_STATE_TRANSITION",
      { entity, current, next },
    );
  }
}

/** Apply a directional transition, returning the new state (immutably). */
export function transition<T extends string>(
  allowed: Readonly<Record<T, readonly T[]>>,
  current: T,
  next: T,
  entity: string,
): T {
  assertTransition(allowed, current, next, entity);
  return next;
}
