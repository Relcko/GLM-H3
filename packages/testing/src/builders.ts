import { Currency, type Address, type EntityId } from "@relcko/types";
import {
  createInvestment,
  createProperty,
  type Investment,
  type Property,
} from "@relcko/domain-core";

const ADDR = "0x0000000000000000000000000000000000000001" as Address;

/** Fluent builder for Property, starting from sane defaults. */
export class PropertyBuilder {
  private input: Parameters<typeof createProperty>[0] = {
    slug: "builder-property", name: "Builder Property", description: "d", location: "EU",
    assetType: "residential" as never, totalValue: 1_000_000, tokenPrice: 100, totalTokens: 10_000n,
    currency: Currency.USDT, expectedRoi: 8, rentalYield: 5, appreciationRate: 3, minInvestment: 100,
    blockchain: "bsc", contractAddress: ADDR, tokenId: "1",
  };

  with(partial: Partial<Parameters<typeof createProperty>[0]>): this {
    this.input = { ...this.input, ...partial };
    return this;
  }

  build(): Property {
    return createProperty(this.input);
  }
}

/** Fluent builder for Investment. */
export class InvestmentBuilder {
  private input: Parameters<typeof createInvestment>[0] = {
    investorId: "inv_1" as EntityId, propertyId: "prop_1" as EntityId, fractionId: "frac_1" as EntityId,
    tokens: 10n, amount: 1000, currency: Currency.USDT, kycVerified: true,
  };

  with(partial: Partial<Parameters<typeof createInvestment>[0]>): this {
    this.input = { ...this.input, ...partial };
    return this;
  }

  build(): Investment {
    return createInvestment(this.input);
  }
}

export function aProperty(): PropertyBuilder {
  return new PropertyBuilder();
}
export function anInvestment(): InvestmentBuilder {
  return new InvestmentBuilder();
}
