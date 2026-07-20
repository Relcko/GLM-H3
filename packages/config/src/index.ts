import { InfrastructureError } from "@relcko/error";
import { Currency, type ChainId } from "@relcko/types";
import { asChainId } from "@relcko/types";
import { EnvLoader } from "@relcko/env";
import type { FlagProvider } from "@relcko/feature-flags";
import { createDefaultFlagProvider } from "@relcko/feature-flags";

export type AppEnvironment = "development" | "test" | "staging" | "production";

export interface ChainConfig {
  readonly chainId: ChainId;
  readonly name: string;
  readonly rpcUrl: string;
  readonly explorerUrl?: string;
  readonly confirmations: number;
  readonly isTestnet: boolean;
}

export interface RegionalConfig {
  readonly region: string;
  readonly dataResidency: string;
  readonly defaultCurrency: Currency;
  readonly locale: string;
}

export interface SecretsProvider {
  get(name: string): Promise<string | undefined>;
  set(name: string, value: string): Promise<void>;
  has(name: string): Promise<boolean>;
}

/** In-memory secrets store (framework only). Production uses HSM/vault behind this interface. */
export class InMemorySecretsProvider implements SecretsProvider {
  private readonly store = new Map<string, string>();
  async get(name: string): Promise<string | undefined> {
    return this.store.get(name);
  }
  async set(name: string, value: string): Promise<void> {
    this.store.set(name, value);
  }
  async has(name: string): Promise<boolean> {
    return this.store.has(name);
  }
}

export interface RuntimeConfig {
  readonly env: AppEnvironment;
  readonly appName: string;
  readonly chains: ReadonlyMap<number, ChainConfig>;
  readonly defaultChainId: ChainId;
  readonly regions: ReadonlyArray<RegionalConfig>;
  readonly defaultRegion: string;
  readonly flags: FlagProvider;
  readonly secrets: SecretsProvider;
}

export interface BuildConfigInput {
  readonly env: EnvLoader;
  readonly flags?: FlagProvider;
  readonly regions?: ReadonlyArray<RegionalConfig>;
  readonly secrets?: SecretsProvider;
  readonly chains?: ReadonlyArray<ChainConfig>;
}

const REQUIRED_CHAIN_FIELDS: ReadonlyArray<keyof ChainConfig> = ["name", "rpcUrl", "confirmations"];

/** Build & validate the runtime configuration from the environment loader. */
export function buildRuntimeConfig(input: BuildConfigInput): RuntimeConfig {
  const { env } = input;
  const appEnv = env.requireEnum<AppEnvironment>("NODE_ENV", ["development", "test", "staging", "production"]);
  const appName = env.require("APP_NAME");

  const chains = input.chains ?? defaultChains(env);
  validateChains(chains);
  const chainMap = new Map<number, ChainConfig>();
  for (const c of chains) chainMap.set(Number(c.chainId), c);

  const defaultChainId = asChainId(env.optionalNumber("DEFAULT_CHAIN_ID", chains[0] ? Number(chains[0].chainId) : 1));

  const regions = input.regions ?? defaultRegions();
  const defaultRegion = env.optional("DEFAULT_REGION", regions[0]?.region ?? "us");

  return {
    env: appEnv,
    appName,
    chains: chainMap,
    defaultChainId,
    regions,
    defaultRegion,
    flags: input.flags ?? createDefaultFlagProvider(),
    secrets: input.secrets ?? new InMemorySecretsProvider(),
  };
}

function validateChains(chains: ReadonlyArray<ChainConfig>): void {
  if (chains.length === 0) throw new InfrastructureError("At least one chain must be configured", "CONFIG_NO_CHAINS");
  for (const c of chains) {
    for (const field of REQUIRED_CHAIN_FIELDS) {
      const value = c[field];
      if (value === undefined || value === null || value === "")
        throw new InfrastructureError(`Chain ${c.chainId} missing ${String(field)}`, "CONFIG_CHAIN_INVALID", {
          chainId: c.chainId,
          field: String(field),
        });
    }
  }
}

function defaultChains(env: EnvLoader): ChainConfig[] {
  const ids = env.optional("CHAIN_IDS", "1").split(",").map((s) => Number(s.trim())).filter(Boolean);
  return ids.map((id) => {
    const chainId = asChainId(id);
    return {
      chainId,
      name: env.optional(`CHAIN_${id}_NAME`, `chain-${id}`),
      rpcUrl: env.optional(`CHAIN_${id}_RPC`, ""),
      explorerUrl: env.optional(`CHAIN_${id}_EXPLORER`, undefined),
      confirmations: env.optionalNumber(`CHAIN_${id}_CONFIRMATIONS`, 1),
      isTestnet: env.optionalBoolean(`CHAIN_${id}_TESTNET`, false),
    };
  });
}

function defaultRegions(): RegionalConfig[] {
  return [
    { region: "us", dataResidency: "us", defaultCurrency: Currency.USDT, locale: "en-US" },
    { region: "eu", dataResidency: "eu", defaultCurrency: Currency.USDT, locale: "en-IE" },
  ];
}
