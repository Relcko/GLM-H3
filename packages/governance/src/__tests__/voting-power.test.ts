import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { InMemoryGovernanceRepository } from "../in-memory-repository";
import { VotingPowerCalculator } from "../voting-power/service";
import { DelegationType } from "../types";

describe("VotingPowerCalculator", () => {
  let repository: InMemoryGovernanceRepository;
  let calculator: VotingPowerCalculator;
  const actorId = "actor-1" as never;

  beforeEach(() => {
    repository = new InMemoryGovernanceRepository();
    calculator = new VotingPowerCalculator(repository);
  });

  it("calculates total voting power", () => {
    const result = calculator.calculate(actorId, "voter-1" as never);

    expect(result.totalPower).toBeGreaterThan(0n);
  });

  it("includes RLKO power", () => {
    const result = calculator.calculate(actorId, "voter-1" as never);

    expect(result.rlkoPower).toBe(10000n);
  });

  it("includes delegated power", () => {
    repository.saveDelegation({
      id: "deleg-1" as never,
      delegatorId: "delegator-1" as never,
      delegateId: "voter-1" as never,
      delegationType: DelegationType.Full,
      amount: 5000n,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const result = calculator.calculate(actorId, "voter-1" as never);
    expect(result.delegatedPower).toBeGreaterThan(0n);
  });
});
