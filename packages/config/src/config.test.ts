import { describe, expect, it } from "vitest";
import { Currency } from "@relcko/types";
import { EnvLoader, memoryEnvSource } from "@relcko/env";
import { buildRuntimeConfig, InMemorySecretsProvider } from "@relcko/config";

describe("runtime config", () => {
  it("builds a validated config from env", () => {
    const env = new EnvLoader(
      memoryEnvSource({
        NODE_ENV: "production",
        APP_NAME: "relcko",
        CHAIN_IDS: "1,137",
        CHAIN_1_NAME: "ethereum",
        CHAIN_1_RPC: "https://eth",
        CHAIN_1_CONFIRMATIONS: "12",
        CHAIN_137_NAME: "polygon",
        CHAIN_137_RPC: "https://poly",
        CHAIN_137_CONFIRMATIONS: "64",
      } as never),
    );
    const cfg = buildRuntimeConfig({ env, secrets: new InMemorySecretsProvider() });
    expect(cfg.env).toBe("production");
    expect(cfg.chains.size).toBe(2);
    expect(cfg.chains.get(1)?.name).toBe("ethereum");
    expect(cfg.defaultChainId).toBe(1);
  });

  it("rejects empty chain config", () => {
    const env = new EnvLoader(memoryEnvSource({ NODE_ENV: "production", APP_NAME: "relcko", CHAIN_IDS: "1", CHAIN_1_RPC: "" } as never));
    expect(() => buildRuntimeConfig({ env })).toThrow();
  });

  it("secrets provider stores and reads", async () => {
    const secrets = new InMemorySecretsProvider();
    await secrets.set("API_KEY", "xyz");
    expect(await secrets.get("API_KEY")).toBe("xyz");
    expect(await secrets.has("API_KEY")).toBe(true);
  });
});
