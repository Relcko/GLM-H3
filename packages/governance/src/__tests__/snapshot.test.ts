import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { InMemoryGovernanceRepository } from "../in-memory-repository";
import { GovernanceSnapshotEngine } from "../snapshot/service";
import { ProposalService } from "../proposal/service";
import { ProposalCategory } from "../types";

describe("GovernanceSnapshotEngine", () => {
  let repository: InMemoryGovernanceRepository;
  let events: EventBus;
  let snapshotEngine: GovernanceSnapshotEngine;
  let proposalService: ProposalService;
  const actorId = "actor-1" as never;
  let proposalId: string;

  beforeEach(async () => {
    repository = new InMemoryGovernanceRepository();
    events = new InMemoryEventBus();
    snapshotEngine = new GovernanceSnapshotEngine(repository, events);
    proposalService = new ProposalService(repository, events);

    const proposal = await proposalService.create(actorId, {
      title: "Snapshot Test Proposal",
      description: "Test",
      proposerId: "proposer-1" as never,
      category: ProposalCategory.Governance,
      startBlock: 100n,
      endBlock: 200n,
    });
    await proposalService.submit(actorId, proposal.id);
    await proposalService.review(actorId, proposal.id, true);
    proposalId = proposal.id as string;
  });

  it("creates snapshot", () => {
    const snapshot = snapshotEngine.createSnapshot(actorId, proposalId as never);

    expect(snapshot.proposalId).toBe(proposalId as never);
    expect(snapshot.totalVotingPower).toBeGreaterThan(0n);
  });

  it("retrieves by proposal", () => {
    const created = snapshotEngine.createSnapshot(actorId, proposalId as never);
    const retrieved = snapshotEngine.getSnapshotByProposal(proposalId as never);

    expect(retrieved?.id).toBe(created.id);
  });
});
