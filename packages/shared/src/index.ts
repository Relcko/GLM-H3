export { Container } from './di';
export type { ServiceFactory, ServiceDefinition } from './di';
export { HealthChecker } from './health';
export type { HealthStatus, HealthCheckResult, HealthCheckable } from './health';

export function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `Unexpected value: ${JSON.stringify(value)}`);
}

export function isNotNullOrUndefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomUUID().slice(0, 8);
  return `${timestamp}-${random}`;
}

export function partition<T>(array: readonly T[], predicate: (item: T) => boolean): [T[], T[]] {
  const pass: T[] = [];
  const fail: T[] = [];
  for (const item of array) {
    if (predicate(item)) {
      pass.push(item);
    } else {
      fail.push(item);
    }
  }
  return [pass, fail];
}

export function groupBy<T, K extends string>(
  array: readonly T[],
  keyFn: (item: T) => K,
): Record<K, T[]> {
  const result = {} as Record<K, T[]>;
  for (const item of array) {
    const key = keyFn(item);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
  }
  return result;
}

export function deepFreeze<T>(object: T): T {
  for (const value of Object.values(object as Record<string, unknown>)) {
    if (typeof value === 'object' && value !== null) {
      deepFreeze(value);
    }
  }
  return Object.freeze(object);
}

export function retry<T>(
  fn: () => Promise<T>,
  options: { maxRetries: number; delayMs: number; backoff?: number },
): Promise<T> {
  const { maxRetries, delayMs, backoff = 2 } = options;

  async function attempt(remaining: number): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (remaining <= 0) {
        throw error;
      }
      await sleep(delayMs * Math.pow(backoff, maxRetries - remaining));
      return attempt(remaining - 1);
    }
  }

  return attempt(maxRetries);
}
