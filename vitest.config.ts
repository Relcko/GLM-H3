import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

const pkg = (name: string) => resolve(__dirname, `packages/${name}/src`);

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/**/*.test.ts", "marketplace/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/**/src/**/*.ts", "marketplace/**/*.ts"],
      exclude: [
        "packages/**/src/**/*.test.ts",
        "packages/**/src/**/index.ts",
        "marketplace/**/*.test.ts",
        "marketplace/**/*.tsx",
        "**/mock/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
      "@relcko/types": pkg("types"),
      "@relcko/utils": pkg("utils"),
      "@relcko/error": pkg("error"),
      "@relcko/identity": pkg("identity"),
      "@relcko/marketplace": pkg("marketplace"),
      "@relcko/domain-core": pkg("domain-core"),
      "@relcko/events": pkg("events"),
      "@relcko/validation": pkg("validation"),
      "@relcko/feature-flags": pkg("feature-flags"),
      "@relcko/env": pkg("env"),
      "@relcko/config": pkg("config"),
      "@relcko/logging": pkg("logging"),
      "@relcko/observability": pkg("observability"),
      "@relcko/permission": pkg("permission"),
      "@relcko/security": pkg("security"),
      "@relcko/audit-contracts": pkg("audit-contracts"),
      "@relcko/notification-contracts": pkg("notification-contracts"),
      "@relcko/testing": pkg("testing"),
      "@relcko/investment-engine": pkg("investment-engine"),
      "@relcko/nft-marketplace": pkg("nft-marketplace"),
      "@relcko/network-engine": pkg("network-engine"),
    "@relcko/portfolio": pkg("portfolio"),
    "@relcko/governance": pkg("governance"),
    "@relcko/treasury": pkg("treasury"),
    "@relcko/ai-platform": pkg("ai-platform"),
    "@relcko/operations": pkg("operations"),
    "@relcko/administration": pkg("administration"),
    "@relcko/performance": pkg("performance"),
    },
  },
});
