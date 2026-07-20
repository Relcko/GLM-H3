import type { EntityId } from "@relcko/types";

export interface EligibleInvestor {
  readonly investorId: EntityId;
  readonly units: bigint;
}

export interface PortfolioAdapter {
  getEligibleInvestors(dividendProposalId: EntityId): Promise<EligibleInvestor[]>;
}

export type PortfolioQuery = (investorIds?: readonly EntityId[]) => Promise<EligibleInvestor[]>;

export class DefaultPortfolioAdapter implements PortfolioAdapter {
  constructor(private readonly query?: PortfolioQuery) {}

  async getEligibleInvestors(_dividendProposalId: EntityId): Promise<EligibleInvestor[]> {
    if (this.query) {
      return this.query();
    }
    return [];
  }
}

export default DefaultPortfolioAdapter;