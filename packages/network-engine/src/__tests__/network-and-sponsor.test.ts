import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { Currency } from "@relcko/types";
import { AgentStatus } from "@relcko/domain-core";
import { InMemoryNetworkRepository } from "../in-memory-repository";
import { NetworkService } from "../network/service";
import { SponsorService } from "../sponsor/service";
import { CustomerOwnershipService } from "../customer-ownership/service";
import { AgentRegistry } from "../agent-registry/service";
import { ActiveStatusValue, Rank } from "../types";

describe("NetworkService", () => {
  let repository: InMemoryNetworkRepository;
  let events: EventBus;
  let networkService: NetworkService;
  const actorId = "actor-1" as never;
  const userId = "user-1" as never;

  beforeEach(() => {
    repository = new InMemoryNetworkRepository();
    events = new InMemoryEventBus();
    networkService = new NetworkService(repository, events);
  });

  it("registers a new agent", async () => {
    const agent = await networkService.register(actorId, {
      userId,
      code: "AGENT01",
      currency: Currency.USDT,
      commissionRate: 10,
    });

    expect(agent.code).toBe("AGENT01");
    expect(agent.status).toBe(AgentStatus.Pending);
    expect(agent.rank).toBe(Rank.Associate);
    expect(agent.activeStatus).toBe(ActiveStatusValue.Lapsed);
    expect(agent.personalSales).toBe(0n);
  });

  it("activates a pending agent", async () => {
    const agent = await networkService.register(actorId, {
      userId, code: "AGENT02", currency: Currency.USDT,
    });

    const activated = await networkService.activate(actorId, agent.id);
    expect(activated.status).toBe(AgentStatus.Active);
  });

  it("suspends and reactivates an agent", async () => {
    const agent = await networkService.register(actorId, {
      userId, code: "AGENT03", currency: Currency.USDT,
    });
    await networkService.activate(actorId, agent.id);

    const suspended = await networkService.suspend(actorId, agent.id);
    expect(suspended.status).toBe(AgentStatus.Suspended);

    const reactivated = await networkService.reactivate(actorId, agent.id);
    expect(reactivated.status).toBe(AgentStatus.Active);
  });

  it("terminates an agent", async () => {
    const agent = await networkService.register(actorId, {
      userId, code: "AGENT04", currency: Currency.USDT,
    });
    await networkService.activate(actorId, agent.id);

    const terminated = await networkService.terminate(actorId, agent.id);
    expect(terminated.status).toBe(AgentStatus.Terminated);
  });
});

describe("SponsorService", () => {
  let repository: InMemoryNetworkRepository;
  let events: EventBus;
  let networkService: NetworkService;
  let sponsorService: SponsorService;
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryNetworkRepository();
    events = new InMemoryEventBus();
    networkService = new NetworkService(repository, events);
    sponsorService = new SponsorService(repository, events);

    await networkService.register(actorId, {
      userId: "sponsor-user" as never, code: "SPONSOR", currency: Currency.USDT,
    });
    await networkService.register(actorId, {
      userId: "agent-user" as never, code: "AGENT", currency: Currency.USDT,
    });
  });

  it("links an agent to a sponsor", async () => {
    const sponsor = repository.getAgentByUserId("sponsor-user" as never)!;
    const agent = repository.getAgentByUserId("agent-user" as never)!;

    const rel = await sponsorService.link(actorId, agent.id, sponsor.id);
    expect(rel.sponsorId).toBe(sponsor.id);
    expect(rel.depth).toBe(1);
  });

  it("prevents self-sponsorship", async () => {
    const agent = repository.getAgentByUserId("agent-user" as never)!;
    await expect(sponsorService.link(actorId, agent.id, agent.id)).rejects.toThrow("cannot sponsor themselves");
  });

  it("prevents duplicate sponsorship", async () => {
    const sponsor = repository.getAgentByUserId("sponsor-user" as never)!;
    const agent = repository.getAgentByUserId("agent-user" as never)!;

    await sponsorService.link(actorId, agent.id, sponsor.id);
    await expect(sponsorService.link(actorId, agent.id, sponsor.id)).rejects.toThrow("already has a sponsor");
  });

  it("prevents circular sponsorship", async () => {
    const agent1 = repository.getAgentByUserId("sponsor-user" as never)!;
    const agent2 = repository.getAgentByUserId("agent-user" as never)!;

    await sponsorService.link(actorId, agent2.id, agent1.id);
    await expect(sponsorService.link(actorId, agent1.id, agent2.id)).rejects.toThrow("Circular sponsorship");
  });
});

describe("CustomerOwnershipService", () => {
  let repository: InMemoryNetworkRepository;
  let events: EventBus;
  let networkService: NetworkService;
  let customerOwnershipService: CustomerOwnershipService;
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryNetworkRepository();
    events = new InMemoryEventBus();
    networkService = new NetworkService(repository, events);
    customerOwnershipService = new CustomerOwnershipService(repository, events);

    await networkService.register(actorId, {
      userId: "agent-user" as never, code: "AGENT", currency: Currency.USDT,
    });
  });

  it("assigns a customer to an agent", async () => {
    const agent = repository.getAgentByUserId("agent-user" as never)!;

    const ownership = await customerOwnershipService.assign(actorId, "investor-1" as never, agent.id);
    expect(ownership.investorId).toBe("investor-1" as never);
    expect(ownership.agentId).toBe(agent.id);
    expect(ownership.permanent).toBe(true);
  });

  it("prevents duplicate customer assignment", async () => {
    const agent = repository.getAgentByUserId("agent-user" as never)!;
    await customerOwnershipService.assign(actorId, "investor-1" as never, agent.id);

    await expect(
      customerOwnershipService.assign(actorId, "investor-1" as never, agent.id),
    ).rejects.toThrow("already has an owning agent");
  });

  it("reassigns a customer to a new agent", async () => {
    const agent = repository.getAgentByUserId("agent-user" as never)!;
    const ownership = await customerOwnershipService.assign(actorId, "investor-1" as never, agent.id);

    await networkService.register(actorId, {
      userId: "agent2-user" as never, code: "AGENT2", currency: Currency.USDT,
    });
    const agent2 = repository.getAgentByUserId("agent2-user" as never)!;

    const reassigned = await customerOwnershipService.reassign(actorId, "investor-1" as never, agent2.id);
    expect(reassigned.agentId).toBe(agent2.id);
  });
});

describe("AgentRegistry", () => {
  let repository: InMemoryNetworkRepository;
  let events: EventBus;
  let networkService: NetworkService;
  let agentRegistry: AgentRegistry;
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryNetworkRepository();
    events = new InMemoryEventBus();
    networkService = new NetworkService(repository, events);
    agentRegistry = new AgentRegistry(repository, events);

    await networkService.register(actorId, {
      userId: "user-1" as never, code: "REG01", currency: Currency.USDT,
    });
  });

  it("finds agent by ID", () => {
    const agent = repository.getAgentByUserId("user-1" as never)!;
    expect(agentRegistry.getAgent(agent.id).code).toBe("REG01");
  });

  it("finds agent by user ID", () => {
    const agent = agentRegistry.getAgentByUserId("user-1" as never);
    expect(agent?.code).toBe("REG01");
  });

  it("finds agent by code", () => {
    const agent = agentRegistry.getAgentByCode("REG01");
    expect(agent?.userId).toBe("user-1" as never);
  });

  it("throws for non-existent agent", () => {
    expect(() => agentRegistry.getAgent("missing" as never)).toThrow("Agent missing not found");
  });

  it("asserts active status", async () => {
    const agent = repository.getAgentByUserId("user-1" as never)!;
    expect(() => agentRegistry.assertActive(agent.id)).toThrow("is not active");
  });
});
