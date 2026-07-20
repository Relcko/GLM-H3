import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { InMemoryGovernanceRepository } from "../in-memory-repository";
import { DelegationEngine } from "../delegation/service";
import { DelegationType, ProposalCategory } from "../types";
import { SelfDelegationError } from "../errors";

describe("DelegationEngine", () => {
  let repository: InMemoryGovernanceRepository;
  let events: EventBus;
  let delegationEngine: DelegationEngine;
  const actorId = "actor-1" as never;

  beforeEach(() => {
    repository = new InMemoryGovernanceRepository();
    events = new InMemoryEventBus();
    delegationEngine = new DelegationEngine(repository, events);
  });

  it("creates a delegation", async () => {
    const delegation = await delegationEngine.delegate(
      actorId, "delegator-1" as never, "delegate-1" as never,
      DelegationType.Full, 1000n, ProposalCategory.Governance,
    );

    expect(delegation.delegateId).toBe("delegate-1" as never);
    expect(delegation.active).toBe(true);
  });

  it("prevents self-delegation", async () => {
    await expect(
      delegationEngine.delegate(actorId, "user-1" as never, "user-1" as never, DelegationType.Full, 1000n, ProposalCategory.Governance),
    ).rejects.toThrow(SelfDelegationError);
  });

  it("revokes a delegation", async () => {
    await delegationEngine.delegate(
      actorId, "delegator-1" as never, "delegate-1" as never,
      DelegationType.Full, 1000n, ProposalCategory.Governance,
    );

    await delegationEngine.revoke(actorId, "delegator-1" as never);

    const result = delegationEngine.getDelegation("delegator-1" as never);
    expect(result).toBeUndefined();
  });

  it("redelegates to another", async () => {
    await delegationEngine.delegate(
      actorId, "delegator-1" as never, "delegate-a" as never,
      DelegationType.Full, 1000n, ProposalCategory.Governance,
    );

    const redelegated = await delegationEngine.redelegate(actorId, "delegator-1" as never, "delegate-b" as never);
    expect(redelegated.delegateId).toBe("delegate-b" as never);
  });

  it("lists delegations by delegate", async () => {
    await delegationEngine.delegate(
      actorId, "delegator-1" as never, "delegate-1" as never,
      DelegationType.Full, 1000n, ProposalCategory.Governance,
    );
    await delegationEngine.delegate(
      actorId, "delegator-2" as never, "delegate-1" as never,
      DelegationType.Full, 2000n, ProposalCategory.Governance,
    );

    const list = delegationEngine.listDelegationsByDelegate("delegate-1" as never);
    expect(list).toHaveLength(2);
  });
});
