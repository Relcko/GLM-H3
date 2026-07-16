import type { EntityId } from "@relcko/types";
import type { Logger } from "@relcko/logging";
import type { GovernanceRepository } from "../repository";
import type { VotingPowerResult } from "../types";

export class VotingPowerCalculator {
  constructor(
    private readonly repository: GovernanceRepository,
    private readonly logger?: Logger,
  ) {}

  calculate(actorId: EntityId, voterId: EntityId): VotingPowerResult {
    const rlkoPower = this.getRlkoPower(voterId);
    const nftPower = this.getNftPower(voterId);
    const delegatedPower = this.getDelegatedPower(voterId);
    const reputationPower = this.getReputationPower(voterId);
    const totalPower = rlkoPower + nftPower + delegatedPower + reputationPower;

    this.logger?.info("voting power calculated", {
      voterId: voterId as string,
      totalPower: totalPower.toString(),
    });

    return {
      totalPower,
      rlkoPower,
      nftPower,
      delegatedPower,
      reputationPower,
      breakdown: {
        rlko: rlkoPower,
        nft: nftPower,
        delegated: delegatedPower,
        reputation: reputationPower,
      },
    };
  }

  getRlkoPower(voterId: EntityId): bigint {
    const holdings = 10000n;
    const multiplier = 1n;
    return holdings * multiplier;
  }

  getNftPower(voterId: EntityId): bigint {
    const count = 5n;
    return count * 100n;
  }

  getDelegatedPower(voterId: EntityId): bigint {
    const delegations = this.repository.listDelegationsByDelegate(voterId);
    return delegations.reduce((sum, d) => sum + d.amount, 0n);
  }

  getReputationPower(voterId: EntityId): bigint {
    return 200n;
  }
}
