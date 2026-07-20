import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { InMemoryGovernanceRepository } from "../in-memory-repository";
import { ProposalService } from "../proposal/service";
import { ProposalLifecycleEngine } from "../lifecycle/service";
import { ProposalCategory, ProposalStatus } from "../types";
import { GovernanceError } from "../errors";

describe("ProposalService", () => {
  let repository: InMemoryGovernanceRepository;
  let events: EventBus;
  let proposalService: ProposalService;
  let lifecycleEngine: ProposalLifecycleEngine;
  const actorId = "actor-1" as never;
  const baseInput = {
    title: "Test Proposal",
    description: "A test proposal",
    proposerId: "proposer-1" as never,
    category: ProposalCategory.Governance,
    startBlock: 100n,
    endBlock: 200n,
  };

  beforeEach(() => {
    repository = new InMemoryGovernanceRepository();
    events = new InMemoryEventBus();
    proposalService = new ProposalService(repository, events);
    lifecycleEngine = new ProposalLifecycleEngine(repository, events);
  });

  it("creates a proposal in Draft status", async () => {
    const proposal = await proposalService.create(actorId, baseInput);

    expect(proposal.status).toBe(ProposalStatus.Draft);
    expect(proposal.category).toBe(ProposalCategory.Governance);
  });

  it("submits proposal to Review", async () => {
    const proposal = await proposalService.create(actorId, baseInput);

    const submitted = await proposalService.submit(actorId, proposal.id);
    expect(submitted.status).toBe(ProposalStatus.Review);
  });

  it("reviews and activates proposal", async () => {
    const proposal = await proposalService.create(actorId, baseInput);
    await proposalService.submit(actorId, proposal.id);

    const reviewed = await proposalService.review(actorId, proposal.id, true);
    expect(reviewed.status).toBe(ProposalStatus.Active);
  });

  it("reviews and sends back to Draft", async () => {
    const proposal = await proposalService.create(actorId, baseInput);
    await proposalService.submit(actorId, proposal.id);

    const reviewed = await proposalService.review(actorId, proposal.id, false);
    expect(reviewed.status).toBe(ProposalStatus.Draft);
  });

  it("cancels a proposal", async () => {
    const proposal = await proposalService.create(actorId, baseInput);

    const cancelled = await proposalService.cancel(actorId, proposal.id);
    expect(cancelled.status).toBe(ProposalStatus.Cancelled);
  });

  it("transitions from Active to Succeeded", async () => {
    const proposal = await proposalService.create(actorId, baseInput);
    await proposalService.submit(actorId, proposal.id);
    await proposalService.review(actorId, proposal.id, true);

    const succeeded = await lifecycleEngine.transition(actorId, proposal.id, ProposalStatus.Succeeded);
    expect(succeeded.status).toBe(ProposalStatus.Succeeded);
  });

  it("rejects invalid transitions", async () => {
    const proposal = await proposalService.create(actorId, baseInput);

    await expect(
      lifecycleEngine.transition(actorId, proposal.id, ProposalStatus.Executed),
    ).rejects.toThrow(GovernanceError);
  });

  it("expires proposals past end block", async () => {
    const proposal = await proposalService.create(actorId, {
      ...baseInput,
      startBlock: 0n,
      endBlock: 1n,
    });
    await proposalService.submit(actorId, proposal.id);
    await proposalService.review(actorId, proposal.id, true);

    const count = await lifecycleEngine.expireProposals(actorId);
    expect(count).toBe(1);
  });
});
