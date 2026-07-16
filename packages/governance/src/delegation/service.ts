import type { EntityId } from "@relcko/types";
import { generateId } from "@relcko/utils";
import type { EventBus } from "@relcko/events";
import type { Logger } from "@relcko/logging";
import type { GovernanceRepository } from "../repository";
import type { Delegation, DelegationHistoryEntry, DelegationType, ProposalCategory } from "../types";
import { DelegationType as DelegationTypeEnum } from "../types";
import { GovernanceEventType, publishGovernanceEvent } from "../events";
import { SelfDelegationError, DelegationNotFoundError } from "../errors";

export class DelegationEngine {
  constructor(
    private readonly repository: GovernanceRepository,
    private readonly events: EventBus,
    private readonly logger?: Logger,
  ) {}

  async delegate(
    actorId: EntityId,
    delegatorId: EntityId,
    delegateId: EntityId,
    type: DelegationType,
    amount: bigint,
    category?: ProposalCategory,
  ): Promise<Delegation> {
    if (delegatorId === delegateId) {
      throw new SelfDelegationError();
    }

    const existing = this.repository.getActiveDelegation(delegatorId);
    if (existing) {
      const deactivated: Delegation = { ...existing, active: false, updatedAt: new Date().toISOString() };
      this.repository.saveDelegation(deactivated);
    }

    const delegation: Delegation = {
      id: generateId("delegation") as EntityId,
      delegatorId,
      delegateId,
      delegationType: type,
      category,
      amount,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.repository.saveDelegation(delegation);

    const payload: Record<string, string | undefined> = {
      delegatorId: delegatorId as string,
      delegateId: delegateId as string,
      type: type as string,
      amount: amount.toString(),
      category: category as string | undefined,
    };
    await publishGovernanceEvent(this.events, GovernanceEventType.DelegationCreated, delegatorId, actorId, payload as any);

    this.logger?.info("delegation created", { delegatorId: delegatorId as string, delegateId: delegateId as string });

    return delegation;
  }

  async revoke(actorId: EntityId, delegatorId: EntityId): Promise<void> {
    const delegation = this.repository.getActiveDelegation(delegatorId);
    if (!delegation) {
      throw new DelegationNotFoundError(delegatorId as string);
    }

    const updated: Delegation = { ...delegation, active: false, updatedAt: new Date().toISOString() };
    this.repository.saveDelegation(updated);

    await publishGovernanceEvent(this.events, GovernanceEventType.DelegationRevoked, delegatorId, actorId, {
      delegatorId: delegatorId as string,
      previousDelegateId: delegation.delegateId as string,
    });

    this.logger?.info("delegation revoked", { delegatorId: delegatorId as string });
  }

  async redelegate(
    actorId: EntityId,
    delegatorId: EntityId,
    newDelegateId: EntityId,
  ): Promise<Delegation> {
    if (delegatorId === newDelegateId) {
      throw new SelfDelegationError();
    }

    const existing = this.repository.getActiveDelegation(delegatorId);
    const previousDelegateId = existing?.delegateId;

    if (existing) {
      const deactivated: Delegation = { ...existing, active: false, updatedAt: new Date().toISOString() };
      this.repository.saveDelegation(deactivated);
    }

    const delegation: Delegation = {
      id: generateId("delegation") as EntityId,
      delegatorId,
      delegateId: newDelegateId,
      delegationType: DelegationTypeEnum.Full,
      amount: existing?.amount ?? 0n,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.repository.saveDelegation(delegation);

    const redelegatePayload: Record<string, string | undefined> = {
      delegatorId: delegatorId as string,
      newDelegateId: newDelegateId as string,
      previousDelegateId: previousDelegateId as string | undefined,
    };
    await publishGovernanceEvent(this.events, GovernanceEventType.DelegationRedelegated, delegatorId, actorId, redelegatePayload as any);

    this.logger?.info("delegation redelegated", { delegatorId: delegatorId as string, newDelegateId: newDelegateId as string });

    return delegation;
  }

  getDelegation(delegatorId: EntityId): Delegation | undefined {
    return this.repository.getActiveDelegation(delegatorId);
  }

  listDelegationsByDelegate(delegateId: EntityId): Delegation[] {
    return this.repository.listDelegationsByDelegate(delegateId);
  }

  getDelegationHistory(delegatorId: EntityId): DelegationHistoryEntry[] {
    return this.repository.listDelegationHistory(delegatorId);
  }
}
