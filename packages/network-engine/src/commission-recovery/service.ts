import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { NetworkRepository } from "../repository";
import type { CommissionRecovery } from "../types";
import { CommissionStatus } from "../types";
import { NetworkEventType, publishNetworkEvent } from "../events";
import { CommissionRecoveryError } from "../errors";

export class CommissionRecoveryEngine {
  constructor(
    private readonly repository: NetworkRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  recover(actorId: EntityId, commissionId: EntityId, reason: string): CommissionRecovery {
    const commission = this.repository.getCommission(commissionId);
    if (!commission) throw new CommissionRecoveryError(`Commission ${commissionId} not found`);

    if (commission.status !== CommissionStatus.Paid) {
      throw new CommissionRecoveryError(`Cannot recover commission ${commissionId} with status ${commission.status}`);
    }

    const recovery: CommissionRecovery = {
      id: generateId("cmrecovery") as EntityId,
      commissionId,
      agentId: commission.agentId,
      amount: commission.amount,
      reason,
      reversed: false,
      createdAt: new Date().toISOString(),
    };

    this.repository.saveRecovery(recovery);

    const updated = { ...commission, status: CommissionStatus.Recovered as const, recoveredFrom: recovery.id };
    this.repository.saveCommission(updated);

    publishNetworkEvent(this.events, NetworkEventType.CommissionRecovered, recovery.id, actorId, {
      recoveryId: recovery.id as string,
      commissionId: commissionId as string,
      agentId: commission.agentId as string,
      amount: commission.amount.amount.toString(),
      reason,
    });

    this.logger?.info("commission recovered", { commissionId, amount: commission.amount.amount.toString(), reason });

    return recovery;
  }

  listByAgent(agentId: EntityId): CommissionRecovery[] {
    return this.repository.listRecoveriesByAgent(agentId);
  }

  listByCommission(commissionId: EntityId): CommissionRecovery[] {
    return this.repository.listRecoveriesByCommission(commissionId);
  }
}
