import { randomUUID } from 'node:crypto';
import type { IdentityId } from '@relcko/types';

export type EntityId = IdentityId;

export function generateId(prefix?: string): EntityId {
  const id = randomUUID();
  return (prefix ? `${prefix}_${id}` : id) as EntityId;
}

export function generateEventId(): string {
  return randomUUID();
}
