import { Currency, type Address, type EntityId } from "@relcko/types";
import { asEntityId } from "@relcko/types";
import {
  createAgent,
  createInvestor,
  createProperty,
  createWallet,
} from "@relcko/domain-core";

const ADDR = "0x0000000000000000000000000000000000000001" as Address;

export const FIXED_IDS = {
  investor: asEntityId("inv_fixture_0001"),
  agent: asEntityId("agent_fixture_0001"),
  property: asEntityId("prop_fixture_0001"),
  fraction: asEntityId("frac_fixture_0001"),
  wallet: asEntityId("wallet_fixture_0001"),
} as const;

/** Reproducible fixtures for tests and local development. */
export function fixtureInvestor(overrides: Partial<{ id: EntityId; email: string; kycApproved: boolean }> = {}) {
  const inv = createInvestor({ name: "Fixture Investor", email: overrides.email ?? "fixture@example.com", walletAddress: ADDR });
  return { ...inv, id: overrides.id ?? FIXED_IDS.investor, kycStatus: overrides.kycApproved ? ("approved" as const) : inv.kycStatus };
}

export function fixtureAgent(userId: EntityId = FIXED_IDS.investor) {
  return createAgent({ userId, code: "FIXTURE1", commissionRate: 5, currency: Currency.USDT });
}

export function fixtureProperty(overrides: Partial<{ id: EntityId; totalTokens: bigint }> = {}) {
  const p = createProperty({
    slug: "fixture-villa", name: "Fixture Villa", description: "fixture", location: "EU",
    assetType: "residential" as never, totalValue: 1_000_000, tokenPrice: 100, totalTokens: overrides.totalTokens ?? 10_000n,
    currency: Currency.USDT, expectedRoi: 8, rentalYield: 5, appreciationRate: 3, minInvestment: 100,
    blockchain: "bsc", contractAddress: ADDR, tokenId: "1",
  });
  return overrides.id ? { ...p, id: overrides.id } : p;
}

export function fixtureWallet(investorId: EntityId = FIXED_IDS.investor) {
  return createWallet({ investorId, address: ADDR, chainId: 1, verified: true });
}
