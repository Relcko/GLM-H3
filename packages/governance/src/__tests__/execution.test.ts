import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { InMemoryGovernanceRepository } from "../in-memory-repository";
import { ExecutionOrchestrator } from "../execution/service";
import { ProposalService } from "../proposal/service";
import { ProposalLifecycleEngine } from "../lifecycle/service";
import { ProposalCategory, ProposalStatus, ExecutionStatus } from "../types";

describe("ExecutionOrchestrator", () => {
  let repository: InMemoryGovernanceRepository;
  let events: EventBus;
  let execution: ExecutionOrchestrator;
  let proposalService: ProposalService;
  let lifecycleEngine: ProposalLifecycleEngine;
  const actorId = "actor-1" as never;
  let proposalId: string;

  beforeEach(async () => {
    repository = new InMemoryGovernanceRepository();
    events = new InMemoryEventBus();
    execution = new ExecutionOrchestrator(repository, events);
    proposalService = new ProposalService(repository, events);
    lifecycleEngine = new ProposalLifecycleEngine(repository, events);

    const proposal = await proposalService.create(actorId, {
      title: "Execution Test Proposal",
      description: "Test",
      proposerId: "proposer-1" as never,
      category: ProposalCategory.Governance,
      targetAddress: "0x1234",
      calldata: "0xabcd",
      startBlock: 100n,
      endBlock: 200n,
    });
    await proposalService.submit(actorId, proposal.id);
    await proposalService.review(actorId, proposal.id, true);
    await lifecycleEngine.transition(actorId, proposal.id, ProposalStatus.Succeeded);
    proposalId = proposal.id as string;
  });

  it("queues execution", () => {
    const request = execution.queueExecution(actorId, proposalId as never);

    expect(request.status).toBe(ExecutionStatus.Queued);
  });

  it("executes queued request", () => {
    const queued = execution.queueExecution(actorId, proposalId as never);
    const completed = execution.execute(actorId, queued.id);

    expect(completed.status).toBe(ExecutionStatus.Completed);
  });

  it("fails execution", () => {
    const queued = execution.queueExecution(actorId, proposalId as never);
    const failed = execution.failExecution(actorId, queued.id, "execution reverted");

    expect(failed.status).toBe(ExecutionStatus.Failed);
    expect(failed.error).toBe("execution reverted");
  });

  it("lists pending executions", () => {
    execution.queueExecution(actorId, proposalId as never);

    const pending = execution.listPendingExecutions();
    expect(pending.length).toBeGreaterThanOrEqual(1);
    expect(pending.every(r => r.status === ExecutionStatus.Queued || r.status === ExecutionStatus.Pending)).toBe(true);
  });
});
