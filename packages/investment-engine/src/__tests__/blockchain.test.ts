import { describe, it, expect } from "vitest";
import {
  isChainSupported,
  getChainConfig,
  getTokenConfig,
  getExplorerTxUrl,
  SUPPORTED_CHAINS,
  SUPPORTED_TOKENS,
} from "../blockchain/chains";
import { ChainNotSupportedError } from "../errors";

describe("Blockchain Chains", () => {
  it("supports BSC mainnet", () => {
    expect(isChainSupported(56)).toBe(true);
  });

  it("supports BSC testnet", () => {
    expect(isChainSupported(97)).toBe(true);
  });

  it("supports Polygon", () => {
    expect(isChainSupported(137)).toBe(true);
  });

  it("rejects unsupported chain", () => {
    expect(isChainSupported(1)).toBe(false);
    expect(isChainSupported(999)).toBe(false);
  });

  it("gets chain config for supported chains", () => {
    const config = getChainConfig(56);
    expect(config).toBeDefined();
    expect(config!.chainName).toBe("BNB Smart Chain");
    expect(config!.nativeCurrency.symbol).toBe("BNB");

    const testnet = getChainConfig(97);
    expect(testnet!.chainName).toBe("BNB Smart Chain Testnet");
    expect(testnet!.nativeCurrency.symbol).toBe("tBNB");
  });

  it("returns undefined for unsupported chain", () => {
    expect(getChainConfig(1)).toBeUndefined();
  });

  it("provides explorer URL for transactions", () => {
    const url = getExplorerTxUrl(56, "0xabc123");
    expect(url).toContain("bscscan.com");
    expect(url).toContain("0xabc123");
  });

  it("has all supported chains listed", () => {
    expect(SUPPORTED_CHAINS.length).toBeGreaterThanOrEqual(3);
    SUPPORTED_CHAINS.forEach(c => {
      expect(c.chainId).toBeGreaterThan(0);
      expect(c.requiredConfirmations).toBeGreaterThan(0);
      expect(c.confirmationTimeoutMs).toBeGreaterThan(0);
    });
  });
});

describe("Blockchain Tokens", () => {
  it("configures USDT on BSC mainnet", () => {
    const token = getTokenConfig("0x55d398326f99059fF775485246999027B3197955", 56);
    expect(token).toBeDefined();
    expect(token!.symbol).toBe("USDT");
  });

  it("configures RLKO token", () => {
    const token = getTokenConfig("0x337610d27c682E347C9cD60BD4b3b107C9d34dDd", 56);
    expect(token).toBeDefined();
    expect(token!.symbol).toBe("RLKO");
  });

  it("returns undefined for unknown token", () => {
    expect(getTokenConfig("0x0000000000000000000000000000000000000000", 56)).toBeUndefined();
  });

  it("has tokens for all supported chains", () => {
    expect(SUPPORTED_TOKENS.length).toBeGreaterThanOrEqual(6);
  });
});

describe("Blockchain Adapter", () => {
  it("ViemBlockchainAdapter validates chain support", async () => {
    const { ViemBlockchainAdapter } = await import("../blockchain/adapter");
    const adapter = new ViemBlockchainAdapter();

    expect(() => adapter.getChainConfig(97)).not.toThrow();
    expect(() => adapter.getChainConfig(1)).toThrow(ChainNotSupportedError);
  });

  it("ViemBlockchainAdapter returns chain config", async () => {
    const { ViemBlockchainAdapter } = await import("../blockchain/adapter");
    const adapter = new ViemBlockchainAdapter();

    const config = adapter.getChainConfig(97);
    expect(config.chainId).toBe(97);
    expect(config.requiredConfirmations).toBe(6);
  });
});
