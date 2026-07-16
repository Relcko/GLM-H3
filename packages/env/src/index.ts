import { InfrastructureError } from "@relcko/error";

export interface EnvSource {
  get(key: string): string | undefined;
}

export function processEnvSource(): EnvSource {
  return {
    get: (key: string) => (process.env[key] === undefined ? undefined : process.env[key]),
  };
}

export function memoryEnvSource(values: Record<string, string | undefined>): EnvSource {
  return { get: (key: string) => values[key] };
}

export class MissingEnvError extends InfrastructureError {
  constructor(key: string) {
    super(`Missing required environment variable: ${key}`, "ENV_MISSING", { key });
  }
}

export class InvalidEnvError extends InfrastructureError {
  constructor(key: string, value: string, reason: string) {
    super(`Invalid environment variable ${key}=${value}: ${reason}`, "ENV_INVALID", { key, value });
  }
}

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

/** Typed, validated loader over an EnvSource (default: process.env). */
export class EnvLoader {
  constructor(private readonly source: EnvSource = processEnvSource()) {}

  get(key: string): string | undefined {
    return this.source.get(key);
  }

  require(key: string): string {
    const value = this.source.get(key);
    if (value === undefined || value === "") throw new MissingEnvError(key);
    return value;
  }

  optional(key: string, fallback = ""): string {
    return this.source.get(key) ?? fallback;
  }

  requireNumber(key: string): number {
    const raw = this.require(key);
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new InvalidEnvError(key, raw, "not a number");
    return n;
  }

  optionalNumber(key: string, fallback: number): number {
    const raw = this.source.get(key);
    if (raw === undefined || raw === "") return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new InvalidEnvError(key, raw, "not a number");
    return n;
  }

  requireBoolean(key: string): boolean {
    const raw = this.require(key).toLowerCase();
    if (TRUE_VALUES.has(raw)) return true;
    if (FALSE_VALUES.has(raw)) return false;
    throw new InvalidEnvError(key, raw, "not a boolean");
  }

  optionalBoolean(key: string, fallback: boolean): boolean {
    const raw = this.source.get(key);
    if (raw === undefined || raw === "") return fallback;
    const v = raw.toLowerCase();
    if (TRUE_VALUES.has(v)) return true;
    if (FALSE_VALUES.has(v)) return false;
    throw new InvalidEnvError(key, raw, "not a boolean");
  }

  requireEnum<T extends string>(key: string, allowed: readonly T[]): T {
    const raw = this.require(key);
    if (!allowed.includes(raw as T)) throw new InvalidEnvError(key, raw, `not one of ${allowed.join(", ")}`);
    return raw as T;
  }
}
