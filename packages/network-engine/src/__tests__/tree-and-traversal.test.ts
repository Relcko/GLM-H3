import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "@relcko/events";
import type { EventBus } from "@relcko/events";
import { Currency } from "@relcko/types";
import { InMemoryNetworkRepository } from "../in-memory-repository";
import { NetworkService } from "../network/service";
import { SponsorService } from "../sponsor/service";
import { NetworkTreeEngine } from "../network-tree/service";
import { TreeTraversalEngine } from "../tree-traversal/service";

describe("NetworkTreeEngine", () => {
  let repository: InMemoryNetworkRepository;
  let treeEngine: NetworkTreeEngine;
  let networkService: NetworkService;
  let sponsorService: SponsorService;
  const events = new InMemoryEventBus();
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryNetworkRepository();
    networkService = new NetworkService(repository, events);
    sponsorService = new SponsorService(repository, events);
    treeEngine = new NetworkTreeEngine(repository);

    await networkService.register(actorId, { userId: "top" as never, code: "TOP", currency: Currency.USDT });
    await networkService.register(actorId, { userId: "mid" as never, code: "MID", currency: Currency.USDT });
    await networkService.register(actorId, { userId: "bot" as never, code: "BOT", currency: Currency.USDT });
  });

  it("builds a tree with correct depth", async () => {
    const top = repository.getAgentByUserId("top" as never)!;
    const mid = repository.getAgentByUserId("mid" as never)!;
    const bot = repository.getAgentByUserId("bot" as never)!;

    await sponsorService.link(actorId, mid.id, top.id);
    await sponsorService.link(actorId, bot.id, mid.id);

    const tree = treeEngine.asyncBuildTree(top.id);
    expect(tree.agentId).toBe(top.id);
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].children).toHaveLength(1);
    expect(tree.branchSize).toBe(2);
  });
});

describe("TreeTraversalEngine", () => {
  let repository: InMemoryNetworkRepository;
  let traversal: TreeTraversalEngine;
  let networkService: NetworkService;
  let sponsorService: SponsorService;
  const events = new InMemoryEventBus();
  const actorId = "actor-1" as never;

  beforeEach(async () => {
    repository = new InMemoryNetworkRepository();
    networkService = new NetworkService(repository, events);
    sponsorService = new SponsorService(repository, events);
    traversal = new TreeTraversalEngine(repository);

    await networkService.register(actorId, { userId: "top" as never, code: "TOP", currency: Currency.USDT });
    await networkService.register(actorId, { userId: "mid" as never, code: "MID", currency: Currency.USDT });
    await networkService.register(actorId, { userId: "bot" as never, code: "BOT", currency: Currency.USDT });
  });

  it("traverses upline correctly", async () => {
    const top = repository.getAgentByUserId("top" as never)!;
    const mid = repository.getAgentByUserId("mid" as never)!;
    const bot = repository.getAgentByUserId("bot" as never)!;

    await sponsorService.link(actorId, mid.id, top.id);
    await sponsorService.link(actorId, bot.id, mid.id);

    const upline = traversal.getUpline(bot.id);
    expect(upline).toHaveLength(2);
    expect(upline[0].agentId).toBe(mid.id);
    expect(upline[1].agentId).toBe(top.id);
  });

  it("traverses downline correctly", async () => {
    const top = repository.getAgentByUserId("top" as never)!;
    const mid = repository.getAgentByUserId("mid" as never)!;
    const bot = repository.getAgentByUserId("bot" as never)!;

    await sponsorService.link(actorId, mid.id, top.id);
    await sponsorService.link(actorId, bot.id, mid.id);

    const downline = traversal.getDownline(top.id);
    expect(downline).toHaveLength(2);
  });

  it("calculates depth correctly", async () => {
    const top = repository.getAgentByUserId("top" as never)!;
    const mid = repository.getAgentByUserId("mid" as never)!;
    const bot = repository.getAgentByUserId("bot" as never)!;

    await sponsorService.link(actorId, mid.id, top.id);
    await sponsorService.link(actorId, bot.id, mid.id);

    expect(traversal.getDepth(top.id)).toBe(0);
    expect(traversal.getDepth(mid.id)).toBe(1);
    expect(traversal.getDepth(bot.id)).toBe(2);
  });

  it("calculates team size", async () => {
    const top = repository.getAgentByUserId("top" as never)!;
    const mid = repository.getAgentByUserId("mid" as never)!;
    const bot = repository.getAgentByUserId("bot" as never)!;

    await sponsorService.link(actorId, mid.id, top.id);
    await sponsorService.link(actorId, bot.id, mid.id);

    expect(traversal.getTeamSize(top.id)).toBe(2);
    expect(traversal.getTeamSize(mid.id)).toBe(1);
  });

  it("compresses upline skipping inactive agents", async () => {
    const top = repository.getAgentByUserId("top" as never)!;
    const mid = repository.getAgentByUserId("mid" as never)!;
    const bot = repository.getAgentByUserId("bot" as never)!;

    await sponsorService.link(actorId, mid.id, top.id);
    await sponsorService.link(actorId, bot.id, mid.id);

    const compressed = traversal.compressUpline(bot.id);
    expect(compressed.length).toBeLessThanOrEqual(traversal.getUpline(bot.id).length);
  });
});
