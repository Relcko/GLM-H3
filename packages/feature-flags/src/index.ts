import { Role } from "@relcko/types";

/** Evaluation context for context-aware (ABAC-style) flag targeting. */
export interface FlagContext {
  readonly userId?: string;
  readonly role?: Role;
  readonly region?: string;
  readonly attributes?: Readonly<Record<string, string>>;
}

export interface FlagTargeting {
  readonly roles?: readonly Role[];
  readonly regions?: readonly string[];
  readonly userIds?: readonly string[];
}

export interface FeatureFlagDefinition {
  readonly key: string;
  readonly description: string;
  readonly defaultValue: boolean;
  readonly targeting?: FlagTargeting;
}

export interface FlagProvider {
  isEnabled(key: string, context?: FlagContext): boolean;
  getActiveFlags(context?: FlagContext): ReadonlyArray<string>;
  define(def: FeatureFlagDefinition): void;
  set(key: string, enabled: boolean): void;
}

export class UnknownFlagError extends Error {
  constructor(key: string) {
    super(`Unknown feature flag: ${key}`);
    this.name = "UnknownFlagError";
  }
}

/**
 * In-memory feature flag provider. Supports static enable/disable plus optional
 * targeting rules (role/region/user) layered over the default value.
 */
export class InMemoryFlagProvider implements FlagProvider {
  private readonly defs = new Map<string, FeatureFlagDefinition>();
  private readonly overrides = new Map<string, boolean>();

  define(def: FeatureFlagDefinition): void {
    this.defs.set(def.key, def);
  }

  set(key: string, enabled: boolean): void {
    this.overrides.set(key, enabled);
  }

  isEnabled(key: string, context: FlagContext = {}): boolean {
    const def = this.defs.get(key);
    if (!def) throw new UnknownFlagError(key);
    const base = this.overrides.get(key) ?? def.defaultValue;
    if (!def.targeting) return base;
    const matches = this.matchesTargeting(def.targeting, context);
    // Targeting narrows: only ON when default is on AND context matches.
    return base && matches;
  }

  getActiveFlags(context: FlagContext = {}): ReadonlyArray<string> {
    return [...this.defs.keys()].filter((k) => this.isEnabled(k, context));
  }

  private matchesTargeting(t: FlagTargeting, ctx: FlagContext): boolean {
    if (t.roles && ctx.role && !t.roles.includes(ctx.role)) return false;
    if (t.regions && ctx.region && !t.regions.includes(ctx.region)) return false;
    if (t.userIds && ctx.userId && !t.userIds.includes(ctx.userId)) return false;
    return true;
  }
}

/** Default platform flag registry (framework-level; modules register their own). */
export const DEFAULT_FLAGS: ReadonlyArray<FeatureFlagDefinition> = [
  { key: "observability.enabled", description: "Global observability pipeline", defaultValue: true },
  { key: "audit.mirror", description: "Mirror all events into AuditLog", defaultValue: true },
  { key: "security.twoStageGating", description: "Require second approver for value/control actions", defaultValue: true },
  { key: "compliance.kycRequired", description: "Block investing until KYC approved", defaultValue: false },
];

export function createDefaultFlagProvider(): FlagProvider {
  const provider = new InMemoryFlagProvider();
  for (const def of DEFAULT_FLAGS) provider.define(def);
  return provider;
}
