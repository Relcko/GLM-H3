import type { EntityId } from "@relcko/types";

export interface ApprovedProposal {
  readonly proposalId: EntityId;
  readonly data: Record<string, unknown>;
}

export interface GovernanceAdapter {
  getApprovedProposals(type: string): Promise<ApprovedProposal[]>;
}

export type GovernanceQuery = (type: string) => Promise<ApprovedProposal[]>;

export class DefaultGovernanceAdapter implements GovernanceAdapter {
  constructor(private readonly query?: GovernanceQuery) {}

  async getApprovedProposals(type: string): Promise<ApprovedProposal[]> {
    if (this.query) {
      return this.query(type);
    }
    return [];
  }
}

export default DefaultGovernanceAdapter;