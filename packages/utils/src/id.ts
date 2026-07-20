import { randomUUID } from "node:crypto";
import type { EntityId } from "@relcko/types";

/**
 * Identifier generation. Uses cryptographically-random UUIDs (RFC 4122 v4).
 * Stable, sortable time-ordered ids are intentionally avoided to prevent
 * enumeration of entities.
 */
export function generateId(prefix?: string): EntityId {
  const id = randomUUID();
  return (prefix ? `${prefix}_${id}` : id) as EntityId;
}

export function generateEventId(): string {
  return randomUUID();
}

export function generateCorrelationId(): string {
  return randomUUID();
}

export function generateTraceId(): string {
  return randomUUID();
}

export function generateNonce(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
