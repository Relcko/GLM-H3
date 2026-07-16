import { describe, it, expect, beforeEach } from "vitest";
import { createInMemoryInvestmentEngineRepository } from "../in-memory-repository";
import { InvestmentHistoryService } from "../history/service";

const eid = (s: string) => s as never;

describe("InvestmentHistoryService", () => {
  let repo: ReturnType<typeof createInMemoryInvestmentEngineRepository>;
  let service: InvestmentHistoryService;

  beforeEach(() => {
    repo = createInMemoryInvestmentEngineRepository();
    service = new InvestmentHistoryService(repo);
  });

  it("records a history entry", () => {
    const entry = service.record({
      investmentId: eid("inv_1"),
      investorId: eid("investor_1"),
      propertyId: eid("prop_1"),
      event: "investment.completed",
      txHash: eid("0xtxhash"),
      tokens: 100n,
      amount: 1000n,
      currency: "USDT",
      status: "completed",
    });

    expect(entry).toBeDefined();
    expect(entry.investmentId).toBe("inv_1");
    expect(entry.eventType).toBe("investment.completed");
  });

  it("lists history by investment", () => {
    service.record({
      investmentId: eid("inv_1"),
      investorId: eid("investor_1"),
      propertyId: eid("prop_1"),
      event: "investment.requested",
      tokens: 100n,
      amount: 1000n,
      currency: "USDT",
      status: "pending",
    });

    service.record({
      investmentId: eid("inv_1"),
      investorId: eid("investor_1"),
      propertyId: eid("prop_1"),
      event: "investment.completed",
      txHash: eid("0xtxhash"),
      tokens: 100n,
      amount: 1000n,
      currency: "USDT",
      status: "completed",
    });

    const entries = service.listByInvestment(eid("inv_1"));
    expect(entries.length).toBe(2);
    expect(entries[0].eventType).toBe("investment.requested");
    expect(entries[1].eventType).toBe("investment.completed");
  });
});
