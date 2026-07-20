import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryPortfolioRepository } from "../in-memory-repository";
import { NetworkStatsAdapter } from "../network-stats/adapter";
import type { NetworkStatsEntry } from "../types";
import { Currency } from "@relcko/types";
import { Rank } from "@relcko/network-engine";

describe("NetworkStatsAdapter", () => {
  let repository: InMemoryPortfolioRepository;
  let adapter: NetworkStatsAdapter;
  const investorId = "investor-1" as never;

  beforeEach(() => {
    repository = new InMemoryPortfolioRepository();
    adapter = new NetworkStatsAdapter(repository);
  });

  it("computes and stores network stats", () => {
    const stats: NetworkStatsEntry = {
      rank: Rank.Silver,
      teamSize: 10,
      activeTeam: 8,
      monthlyVolume: 50000n,
      lifetimeVolume: 500000n,
      pendingCommissions: { amount: 2500n, currency: Currency.USDT },
      recoveredCommissions: { amount: 500n, currency: Currency.USDT },
      leaderboardPosition: 3,
      performanceScore: 85,
      computedAt: new Date().toISOString(),
    };

    const result = adapter.computeStats("actor-1" as never, investorId, stats);
    expect(result.rank).toBe(Rank.Silver);
    expect(result.teamSize).toBe(10);
    expect(result.activeTeam).toBe(8);
    expect(result.monthlyVolume).toBe(50000n);
    expect(result.lifetimeVolume).toBe(500000n);
  });

  it("retrieves stored stats", () => {
    const stats: NetworkStatsEntry = {
      rank: Rank.Gold,
      teamSize: 25,
      activeTeam: 20,
      monthlyVolume: 100000n,
      lifetimeVolume: 1000000n,
      pendingCommissions: { amount: 5000n, currency: Currency.USDT },
      recoveredCommissions: { amount: 1000n, currency: Currency.USDT },
      performanceScore: 92,
      computedAt: new Date().toISOString(),
    };

    adapter.computeStats("actor-1" as never, investorId, stats);
    const retrieved = adapter.getStats(investorId);
    expect(retrieved).toBeDefined();
    expect(retrieved!.rank).toBe(Rank.Gold);
    expect(retrieved!.teamSize).toBe(25);
  });

  it("returns rank display string", () => {
    const stats: NetworkStatsEntry = {
      rank: Rank.SeniorAssociate,
      teamSize: 5,
      activeTeam: 4,
      monthlyVolume: 10000n,
      lifetimeVolume: 50000n,
      pendingCommissions: { amount: 500n, currency: Currency.USDT },
      recoveredCommissions: { amount: 100n, currency: Currency.USDT },
      performanceScore: 70,
      computedAt: new Date().toISOString(),
    };

    adapter.computeStats("actor-1" as never, investorId, stats);
    const display = adapter.getRankDisplay(investorId);
    expect(display).toBe("Senior Associate");
  });
});
