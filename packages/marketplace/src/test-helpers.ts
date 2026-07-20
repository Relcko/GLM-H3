import { AccountStatus, AccountType, VerificationStatus, type Account } from "@relcko/identity";
import { MfaLevel } from "@relcko/permission";
import { Currency, Role, type EntityId } from "@relcko/types";
import { AssetType } from "@relcko/domain-core";
import { entityIdSchema, addressSchema } from "@relcko/validation";
import { LogLevel, createLogger } from "@relcko/logging";
import { MockEventBus } from "@relcko/testing";
import { createMarketplace, type Marketplace } from "./marketplace";
import { createInMemoryMarketplaceRepository, type MarketplaceRepository } from "./repository";

/** Cast a plain string id to the branded EntityId for tests. */
export const eid = (s: string): EntityId => entityIdSchema.parse(s);

/** Build a test Account with sane defaults for the given role. */
export function makeAccount(role: Role, overrides: Partial<Omit<Account, "id">> & { id?: string } = {}): Account {
  const { id, ...rest } = overrides;
  return {
    id: entityIdSchema.parse(id ?? "acc_test"),
    type: AccountType.Individual,
    status: AccountStatus.Active,
    role,
    emailVerified: true,
    walletIds: [],
    guardianIds: [],
    verification: VerificationStatus.Verified,
    kycStatus: rest.kycStatus ?? ("approved" as Account["kycStatus"]),
    mfaLevel: MfaLevel.None,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...rest,
  };
}

export const ADMIN = (overrides: Partial<Omit<Account, "id">> & { id?: string } = {}) =>
  makeAccount(Role.Administrator, { id: "acc_admin", ...overrides });
export const MANAGER = (overrides: Partial<Omit<Account, "id">> & { id?: string } = {}) =>
  makeAccount(Role.PropertyManager, { id: "acc_mgr", ...overrides });
export const INVESTOR = (overrides: Partial<Omit<Account, "id">> & { id?: string } = {}) =>
  makeAccount(Role.Investor, { id: "acc_investor", ...overrides });
export const ANON = (overrides: Partial<Omit<Account, "id">> & { id?: string } = {}) =>
  makeAccount(Role.Anonymous, { id: "acc_anon", ...overrides });

/** A valid create-property input matching the shared request schema. */
export function makePropertyInput(overrides: Record<string, unknown> = {}) {
  return {
    slug: "sunset-villa",
    name: "Sunset Villa",
    description: "A tokenized villa on the Costa del Sol",
    location: "Spain, Malaga, Costa del Sol",
    assetType: AssetType.Residential,
    totalValue: 1_000_000,
    tokenPrice: 100,
    totalTokens: 10_000n,
    currency: Currency.USDT,
    expectedRoi: 8.5,
    rentalYield: 5.2,
    appreciationRate: 3.1,
    minInvestment: 100,
    blockchain: "ethereum",
    contractAddress: addressSchema.parse("0x0000000000000000000000000000000000000000"),
    tokenId: "42",
    ...overrides,
  };
}

export function makeMarketplace(): { mp: Marketplace; bus: MockEventBus; repository: MarketplaceRepository } {
  const bus = new MockEventBus();
  const repository = createInMemoryMarketplaceRepository();
  const mp = createMarketplace({
    repository,
    eventBus: bus,
    logger: createLogger({ minLevel: LogLevel.Fatal }),
  });
  return { mp, bus, repository };
}

/** Convenience: create + fully activate a property. */
export async function createActiveProperty(mp: Marketplace, actor: Account = MANAGER(), overrides: Record<string, unknown> = {}) {
  const property = await mp.properties.create(actor, makePropertyInput(overrides));
  await mp.properties.publish(actor, property.id);
  return mp.properties.activate(actor, property.id);
}
